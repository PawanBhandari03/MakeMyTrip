package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.repositories.PriceFreezeRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.services.DynamicPricingService.Item;
import com.makemytrip.makemytrip.services.DynamicPricingService.Result;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Price freeze: for a small fee a customer can lock today's price for 6, 24 or 48 hours.
 * If the price then goes up they still pay the frozen price; if it goes down they pay the lower one.
 * The fee is credited against the booking, so booking in time costs nothing extra.
 */
@Service
public class PriceFreezeService {

    private static final int[] HOURS = {6, 24, 48};
    private static final double[] FEE_PERCENT = {1.0, 2.0, 3.5};
    private static final double MIN_FEE = 49;
    private static final double MAX_FEE = 1500;
    private static final int MAX_ACTIVE = 5;

    @Autowired
    private PriceFreezeRepository repository;
    @Autowired
    private DynamicPricingService dynamicPricing;
    @Autowired
    private UserRepository userRepository;

    @Data
    public static class Option {
        private int hours;
        private String label;
        private double fee;
        private double unitPrice;
        /** What the total fare is right now, so the customer sees what the freeze protects. */
        private double protectedAmount;
    }

    @Data
    public static class View {
        private String id;
        private String category;
        private String itemId;
        private String itemName;
        private String travelDate;
        private int quantity;
        private int nights;
        private double unitPrice;
        private double fee;
        private int hours;
        private String createdAt;
        private String expiresAt;
        /** ACTIVE, USED or EXPIRED. */
        private String status;
        private String bookingReference;
        private long secondsLeft;
        /** What the engine charges per unit now; the difference to {@code unitPrice} is the saving or the loss. */
        private double currentUnitPrice;
        private double savingsPerUnit;
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(DynamicPricingService.ZONE).withNano(0);
    }

    /** What a freeze would cost right now for this booking. */
    public List<Option> options(String category, String itemId, int quantity, int nights, String travelDate) {
        Item item = resolve(category, itemId, travelDate);
        Result price = dynamicPricing.price(item);
        int n = nightsFor(category, nights);
        double total = price.getPrice() * Math.max(1, quantity) * n;
        List<Option> out = new ArrayList<>();
        for (int i = 0; i < HOURS.length; i++) {
            Option o = new Option();
            o.setHours(HOURS[i]);
            o.setLabel(HOURS[i] + " hours");
            o.setFee(feeFor(total, FEE_PERCENT[i]));
            o.setUnitPrice(price.getPrice());
            o.setProtectedAmount(Math.round(total));
            out.add(o);
        }
        return out;
    }

    public View create(String userId, String category, String itemId, int quantity, int nights, String travelDate, int hours) {
        if (userId == null || userRepository.findById(userId).isEmpty()) throw new RuntimeException("Please log in to freeze a price.");
        int index = -1;
        for (int i = 0; i < HOURS.length; i++) if (HOURS[i] == hours) index = i;
        if (index < 0) throw new RuntimeException("Choose a freeze of 6, 24 or 48 hours.");
        if (quantity < 1 || quantity > 20) throw new RuntimeException("Quantity must be between 1 and 20");

        String cat = category.toUpperCase(Locale.ROOT);
        if (cat.equals("FOREX") || cat.equals("INSURANCE")) throw new RuntimeException("This item has a fixed price, so there is nothing to freeze.");
        Item item = resolve(cat, itemId, travelDate);
        String date = item.getTravelAt().toLocalDate().toString();

        // one live freeze per item and date; a limit on how many a person can hold
        for (PriceFreeze f : repository.findByUserIdAndCategoryAndItemIdAndStatus(userId, cat, itemId, "ACTIVE")) {
            if (!isExpired(f) && date.equals(f.getTravelDate())) {
                throw new RuntimeException("You already have an active price freeze for this. It is locked until " + f.getExpiresAt().replace('T', ' ') + ".");
            }
        }
        long active = repository.findTop30ByUserIdOrderByCreatedAtDesc(userId).stream()
                .filter(f -> "ACTIVE".equals(f.getStatus()) && !isExpired(f)).count();
        if (active >= MAX_ACTIVE) throw new RuntimeException("You can hold up to " + MAX_ACTIVE + " price freezes at a time. Let one expire or use it first.");

        Result price = dynamicPricing.price(item);
        int n = nightsFor(cat, nights);
        PriceFreeze f = new PriceFreeze();
        f.setUserId(userId);
        f.setCategory(cat);
        f.setItemId(itemId);
        f.setItemName(item.getName());
        f.setTravelDate(date);
        f.setQuantity(quantity);
        f.setNights(n);
        f.setUnitPrice(price.getPrice());
        f.setBaseUnitPrice(price.getBasePrice());
        f.setFee(feeFor(price.getPrice() * quantity * n, FEE_PERCENT[index]));
        f.setHours(hours);
        f.setCreatedAt(now().toString());
        f.setExpiresAt(now().plusHours(hours).toString());
        f.setStatus("ACTIVE");
        return view(repository.save(f));
    }

    public List<View> list(String userId) {
        return repository.findTop30ByUserIdOrderByCreatedAtDesc(userId).stream().map(this::view).toList();
    }

    /** The customer's live freeze for this exact booking, if there is one. */
    public Optional<View> active(String userId, String category, String itemId, String travelDate) {
        String cat = category.toUpperCase(Locale.ROOT);
        LocalDate wanted = PricingService.parseDate(travelDate);
        return repository.findByUserIdAndCategoryAndItemIdAndStatus(userId, cat, itemId, "ACTIVE").stream()
                .filter(f -> !isExpired(f))
                .filter(f -> cat.equals("FLIGHT") || wanted == null || wanted.toString().equals(f.getTravelDate()))
                .findFirst()
                .map(this::view);
    }

    /** Marks a freeze as used by a booking. */
    public void markUsed(String freezeId, String bookingReference) {
        repository.findById(freezeId).ifPresent(f -> {
            f.setStatus("USED");
            f.setBookingReference(bookingReference);
            repository.save(f);
        });
    }

    // ------------------------------------------------------------------ helpers

    private Item resolve(String category, String itemId, String travelDate) {
        return dynamicPricing.resolve(category, itemId, PricingService.parseDate(travelDate))
                .orElseThrow(() -> new RuntimeException("We could not find that item."));
    }

    private static int nightsFor(String category, int nights) {
        String c = category.toUpperCase(Locale.ROOT);
        return c.equals("HOTEL") || c.equals("HOMESTAY") ? Math.max(1, Math.min(nights, 30)) : 1;
    }

    private static double feeFor(double total, double percent) {
        return Math.round(Math.max(MIN_FEE, Math.min(MAX_FEE, total * percent / 100.0)));
    }

    private static boolean isExpired(PriceFreeze f) {
        return f.getExpiresAt() != null && LocalDateTime.parse(f.getExpiresAt()).isBefore(now());
    }

    private View view(PriceFreeze f) {
        View v = new View();
        v.setId(f.getId());
        v.setCategory(f.getCategory());
        v.setItemId(f.getItemId());
        v.setItemName(f.getItemName());
        v.setTravelDate(f.getTravelDate());
        v.setQuantity(f.getQuantity());
        v.setNights(f.getNights());
        v.setUnitPrice(f.getUnitPrice());
        v.setFee(f.getFee());
        v.setHours(f.getHours());
        v.setCreatedAt(f.getCreatedAt());
        v.setExpiresAt(f.getExpiresAt());
        v.setBookingReference(f.getBookingReference());
        boolean expired = isExpired(f);
        v.setStatus("USED".equals(f.getStatus()) ? "USED" : expired ? "EXPIRED" : "ACTIVE");
        v.setSecondsLeft("ACTIVE".equals(v.getStatus()) ? Math.max(0, Duration.between(now(), LocalDateTime.parse(f.getExpiresAt())).getSeconds()) : 0);
        if ("ACTIVE".equals(v.getStatus())) {
            dynamicPricing.resolve(f.getCategory(), f.getItemId(), PricingService.parseDate(f.getTravelDate())).ifPresent(item -> {
                double current = dynamicPricing.price(item).getPrice();
                v.setCurrentUnitPrice(current);
                v.setSavingsPerUnit(Math.round(current - f.getUnitPrice()));
            });
        }
        return v;
    }
}
