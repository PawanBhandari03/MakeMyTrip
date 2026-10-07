package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import com.makemytrip.makemytrip.services.DynamicPricingService.Adjustment;
import com.makemytrip.makemytrip.services.DynamicPricingService.Item;
import com.makemytrip.makemytrip.services.DynamicPricingService.Result;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Single source of truth for what something costs. The price per unit comes from the dynamic pricing engine,
 * then taxes, fees, a promo code and any price-freeze credit are applied. The browser asks for a quote to show
 * the price, and the booking endpoints recompute the same quote, so the amount charged can never be tampered with.
 */
@Service
public class PricingService {

    public static final Set<String> CATEGORIES = Set.of(
            "FLIGHT", "HOTEL", "HOMESTAY", "HOLIDAY", "TRAIN", "BUS", "CAB", "FOREX", "INSURANCE");

    @Autowired
    private DynamicPricingService dynamicPricing;
    @Autowired
    private PriceFreezeRepository freezeRepository;

    @Data
    public static class Quote {
        private String category;
        private String itemId;
        private String itemName;
        /** Price per seat, night or ticket right now (or the frozen price if that is lower). */
        private double unitPrice;
        /** The fare the admin set, before any adjustment. */
        private double baseUnitPrice;
        /** What the engine charges per unit right now, ignoring any freeze. */
        private double currentUnitPrice;
        private double previousUnitPrice;
        private double adjustmentPct;
        private String trend;
        private List<Adjustment> adjustments = new ArrayList<>();
        private List<String> tags = new ArrayList<>();
        private String travelDate;
        private String quotedAt;
        private int quantity;
        private int nights;
        private double base;
        private double taxes;
        private double fees;
        private double discount;
        private double total;
        private String promoCode;
        private boolean promoApplied;
        private String promoMessage;
        private boolean frozen;
        private String freezeId;
        private double freezeCredit;
        private double freezeSavings;
        private String freezeMessage;
    }

    @Data
    public static class Promo {
        private final String code;
        private final String description;
        private final boolean percent;
        private final double value;
        private final double maxDiscount;
        private final double minAmount;
        private final Set<String> categories;
    }

    private static final List<Promo> PROMOS = List.of(
            new Promo("TRIP10", "Extra 10% off on any booking (up to ₹1,500)", true, 10, 1500, 1000, CATEGORIES),
            new Promo("WELCOME500", "Flat ₹500 off on bookings above ₹2,000", false, 500, 500, 2000, CATEGORIES),
            new Promo("FLY20", "20% off on domestic flights (up to ₹1,000)", true, 20, 1000, 3000, Set.of("FLIGHT")),
            new Promo("MMTSECURE", "Flat ₹299 off on flights with Trip Secure", false, 299, 299, 3000, Set.of("FLIGHT")),
            new Promo("SPECIALUPI", "Flat ₹362 off on flights when you pay via UPI", false, 362, 362, 2500, Set.of("FLIGHT")),
            new Promo("LUXE15", "15% off on luxury hotels worldwide (up to ₹3,000)", true, 15, 3000, 4000, Set.of("HOTEL", "HOMESTAY")),
            new Promo("HOLIDAY20", "20% off on holiday packages (up to ₹6,000)", true, 20, 6000, 10000, Set.of("HOLIDAY")),
            new Promo("ROADTRIP", "12% off on trains, buses and cabs (up to ₹400)", true, 12, 400, 500, Set.of("TRAIN", "BUS", "CAB")),
            new Promo("INSURE10", "10% off on travel insurance (up to ₹500)", true, 10, 500, 300, Set.of("INSURANCE"))
    );

    public List<Promo> promos(String category) {
        if (category == null || category.isBlank()) return PROMOS;
        String c = category.toUpperCase(Locale.ROOT);
        return PROMOS.stream().filter(p -> p.getCategories().contains(c)).toList();
    }

    public static LocalDate parseDate(String text) {
        if (text == null || text.length() < 10) return null;
        try {
            return LocalDate.parse(text.substring(0, 10));
        } catch (RuntimeException e) {
            return null;
        }
    }

    public Quote quote(String category, String itemId, int quantity, int nights, String promoCode) {
        return quote(category, itemId, quantity, nights, promoCode, null, null, null);
    }

    /**
     * @param travelDate  travel or check-in date (yyyy-MM-dd); flights use their own departure date
     * @param userId      needed only to apply a price freeze
     * @param freezeId    a price freeze to apply, if any
     */
    public Quote quote(String category, String itemId, int quantity, int nights, String promoCode,
                       String travelDate, String userId, String freezeId) {
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(cat)) throw new RuntimeException("Unknown category: " + category);
        int maxQty = cat.equals("FOREX") ? 100000 : 20;
        if (quantity < 1 || quantity > maxQty) throw new RuntimeException("Quantity must be between 1 and " + maxQty);
        boolean perNight = cat.equals("HOTEL") || cat.equals("HOMESTAY");
        int n = perNight ? Math.max(1, Math.min(nights, 30)) : 1;

        Item item = dynamicPricing.resolve(cat, itemId, parseDate(travelDate))
                .orElseThrow(() -> new RuntimeException(switch (cat) {
                    case "FLIGHT" -> "Flight not found";
                    case "HOTEL" -> "Hotel not found";
                    default -> "Item not found";
                }));
        Result price = dynamicPricing.price(item);

        Quote q = new Quote();
        q.setCategory(cat);
        q.setItemId(itemId);
        q.setItemName(item.getName());
        q.setQuantity(quantity);
        q.setNights(n);
        q.setBaseUnitPrice(price.getBasePrice());
        q.setCurrentUnitPrice(price.getPrice());
        q.setPreviousUnitPrice(price.getPreviousPrice());
        q.setAdjustmentPct(price.getAdjustmentPct());
        q.setAdjustments(price.getAdjustments());
        q.setTags(price.getTags());
        q.setTrend(price.getTrend());
        q.setTravelDate(price.getTravelDate());
        q.setQuotedAt(LocalDateTime.now(DynamicPricingService.ZONE).withNano(0).toString());

        double unit = price.getPrice();
        double credit = 0;
        if (freezeId != null && !freezeId.isBlank()) {
            PriceFreeze fz = freezeRepository.findById(freezeId).orElse(null);
            String problem = freezeProblem(fz, userId, cat, itemId, price.getTravelDate(), quantity);
            if (problem == null) {
                unit = Math.min(fz.getUnitPrice(), price.getPrice());
                credit = fz.getFee();
                q.setFrozen(true);
                q.setFreezeId(fz.getId());
                q.setFreezeSavings(Math.max(0, price.getPrice() - unit) * quantity * n);
            } else {
                q.setFreezeMessage(problem);
            }
        }
        q.setUnitPrice(unit);

        double base = unit * quantity * n;
        double taxes;
        double fees = 0;
        switch (cat) {
            case "FLIGHT" -> { taxes = base * 0.12; fees = 249; }
            case "HOTEL", "HOMESTAY" -> taxes = base * (unit <= 7500 ? 0.12 : 0.18);
            case "TRAIN" -> { taxes = base * 0.05; fees = 35; }
            case "BUS" -> { taxes = base * 0.05; fees = 20; }
            case "FOREX" -> taxes = base * 0.005;
            case "INSURANCE" -> taxes = base * 0.18;
            default -> taxes = base * 0.05; // HOLIDAY, CAB
        }
        q.setBase(Math.round(base));
        q.setTaxes(Math.round(taxes));
        q.setFees(fees);

        if (promoCode != null && !promoCode.isBlank()) {
            q.setPromoCode(promoCode.trim().toUpperCase(Locale.ROOT));
            applyPromo(q);
        }
        double beforeCredit = q.getBase() + q.getTaxes() + q.getFees() - q.getDiscount();
        double applied = Math.min(credit, Math.max(0, beforeCredit));
        q.setFreezeCredit(applied);
        q.setTotal(beforeCredit - applied);
        return q;
    }

    /** Why a freeze cannot be used for this booking, or null when it can. */
    private String freezeProblem(PriceFreeze fz, String userId, String cat, String itemId, String travelDate, int quantity) {
        if (fz == null) return "That price freeze could not be found.";
        if (userId == null || !userId.equals(fz.getUserId())) return "That price freeze belongs to a different account.";
        if ("USED".equals(fz.getStatus())) return "That price freeze has already been used for a booking.";
        if (fz.getExpiresAt() != null && LocalDateTime.parse(fz.getExpiresAt()).isBefore(LocalDateTime.now(DynamicPricingService.ZONE))) {
            return "Your price freeze has expired, so today's price applies.";
        }
        if (!cat.equals(fz.getCategory()) || !itemId.equals(fz.getItemId())) return "That price freeze is for a different booking.";
        if (!cat.equals("FLIGHT") && fz.getTravelDate() != null && !fz.getTravelDate().equals(travelDate)) {
            return "That price freeze is for " + fz.getTravelDate() + ", not the date you picked.";
        }
        if (quantity > fz.getQuantity()) return "Your freeze covers up to " + fz.getQuantity() + " " + (fz.getQuantity() == 1 ? "unit" : "units") + ".";
        return null;
    }

    /** Current prices for several items at once, for search results that update live. */
    public Map<String, Result> prices(String category, List<String> ids, String date) {
        Map<String, Result> out = new HashMap<>();
        dynamicPricing.resolveAll(category, ids, parseDate(date)).forEach((id, item) -> out.put(id, dynamicPricing.price(item)));
        return out;
    }

    private void applyPromo(Quote q) {
        Promo promo = PROMOS.stream().filter(p -> p.getCode().equals(q.getPromoCode())).findFirst().orElse(null);
        if (promo == null) {
            q.setPromoMessage("Invalid promo code");
            return;
        }
        if (!promo.getCategories().contains(q.getCategory())) {
            q.setPromoMessage(promo.getCode() + " is not valid for this booking");
            return;
        }
        if (q.getBase() < promo.getMinAmount()) {
            q.setPromoMessage("Minimum booking amount of ₹" + Math.round(promo.getMinAmount()) + " required for " + promo.getCode());
            return;
        }
        double off = promo.isPercent() ? q.getBase() * promo.getValue() / 100.0 : promo.getValue();
        off = Math.min(off, promo.getMaxDiscount());
        off = Math.min(off, q.getBase());
        q.setDiscount(Math.round(off));
        q.setPromoApplied(true);
        q.setPromoMessage(promo.getCode() + " applied — you save ₹" + Math.round(off));
    }
}
