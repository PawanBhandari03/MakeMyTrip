package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Single source of truth for prices. The browser asks for a quote and the booking endpoints
 * recompute the same quote, so the amount charged can never be tampered with from the client.
 */
@Service
public class PricingService {

    public static final Set<String> CATEGORIES = Set.of(
            "FLIGHT", "HOTEL", "HOMESTAY", "HOLIDAY", "TRAIN", "BUS", "CAB", "FOREX", "INSURANCE");

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;

    @Data
    public static class Quote {
        private String category;
        private String itemId;
        private String itemName;
        private double unitPrice;
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

    public Quote quote(String category, String itemId, int quantity, int nights, String promoCode) {
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(cat)) throw new RuntimeException("Unknown category: " + category);
        int maxQty = cat.equals("FOREX") ? 100000 : 20;
        if (quantity < 1 || quantity > maxQty) throw new RuntimeException("Quantity must be between 1 and " + maxQty);
        boolean perNight = cat.equals("HOTEL") || cat.equals("HOMESTAY");
        int n = perNight ? Math.max(1, Math.min(nights, 30)) : 1;

        Quote q = new Quote();
        q.setCategory(cat);
        q.setItemId(itemId);
        q.setQuantity(quantity);
        q.setNights(n);

        switch (cat) {
            case "FLIGHT" -> {
                Flight f = flightRepository.findById(itemId).orElseThrow(() -> new RuntimeException("Flight not found"));
                q.setItemName(f.getFlightName() + " · " + f.getFrom() + " → " + f.getTo());
                q.setUnitPrice(f.getPrice());
            }
            case "HOTEL" -> {
                Hotel h = hotelRepository.findById(itemId).orElseThrow(() -> new RuntimeException("Hotel not found"));
                q.setItemName(h.gethotelName());
                q.setUnitPrice(h.getPricePerNight());
            }
            default -> {
                Listing l = listingRepository.findById(itemId).orElseThrow(() -> new RuntimeException("Item not found"));
                if (!cat.equals(l.getCategory())) throw new RuntimeException("Item does not belong to " + cat);
                q.setItemName(l.getName());
                q.setUnitPrice(l.getPrice());
            }
        }

        double base = q.getUnitPrice() * quantity * n;
        double taxes;
        double fees = 0;
        switch (cat) {
            case "FLIGHT" -> { taxes = base * 0.12; fees = 249; }
            case "HOTEL", "HOMESTAY" -> taxes = base * (q.getUnitPrice() <= 7500 ? 0.12 : 0.18);
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
        q.setTotal(q.getBase() + q.getTaxes() + q.getFees() - q.getDiscount());
        return q;
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
