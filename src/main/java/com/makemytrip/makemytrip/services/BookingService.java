package com.makemytrip.makemytrip.services;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.Refund;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.services.PricingService.Quote;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Service
public class BookingService {
    private static final String REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Map<String, String> TYPE_LABELS = Map.of(
            "FLIGHT", "Flight", "HOTEL", "Hotel", "HOMESTAY", "Homestay", "HOLIDAY", "Holiday",
            "TRAIN", "Train", "BUS", "Bus", "CAB", "Cab", "FOREX", "Forex", "INSURANCE", "Insurance");

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private PricingService pricingService;
    @Autowired
    private MongoTemplate mongoTemplate;
    @Autowired
    private FlightTrackingService flightTrackingService;
    @Autowired
    private PriceFreezeService priceFreezeService;
    @Autowired
    private RefundPolicyService refundPolicyService;
    @Autowired
    private RefundService refundService;
    @Autowired
    private com.makemytrip.makemytrip.config.CatalogCache catalogCache;

    private final SecureRandom random = new SecureRandom();

    public Booking book(String userId, String category, String itemId, int quantity, int nights, String promo, String travelDate) {
        return book(userId, category, itemId, quantity, nights, promo, travelDate, null, null);
    }

    /**
     * Books any category. The price is always recomputed on the server.
     *
     * @param freezeId      a price freeze to use; the booking is refused (with the reason) if it cannot be applied
     * @param expectedTotal the total the customer saw; if the price has moved since, nothing is booked and the
     *                      customer is asked to confirm the new total
     */
    public Booking book(String userId, String category, String itemId, int quantity, int nights, String promo, String travelDate,
                        String freezeId, Double expectedTotal) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Quote quote = pricingService.quote(category, itemId, quantity, nights, promo, travelDate, userId, freezeId);
        String cat = quote.getCategory();

        if (freezeId != null && !freezeId.isBlank() && !quote.isFrozen()) {
            throw new RuntimeException(quote.getFreezeMessage() == null ? "That price freeze cannot be used for this booking." : quote.getFreezeMessage());
        }
        if (expectedTotal != null && Math.abs(quote.getTotal() - expectedTotal) > 1) {
            throw new PriceChangedException(expectedTotal, quote.getTotal());
        }

        String title = quote.getItemName();
        String when = travelDate;
        switch (cat) {
            case "FLIGHT" -> when = flightRepository.findById(itemId).map(Flight::getDepartureTime).orElse(travelDate);
            case "HOTEL" -> title = hotelRepository.findById(itemId).map(h -> h.gethotelName() + ", " + h.getLocation()).orElse(title);
            default -> {
                Listing l = listingRepository.findById(itemId).orElse(null);
                if (l != null && l.getFrom() != null && !l.getFrom().isBlank() && l.getTo() != null && !l.getTo().isBlank()) {
                    title = l.getName() + " · " + l.getFrom() + " → " + l.getTo();
                } else if (l != null && (cat.equals("HOMESTAY") || cat.equals("HOLIDAY")) && l.getLocation() != null && !l.getLocation().isBlank()) {
                    title = l.getName() + ", " + l.getLocation();
                }
            }
        }

        reserveStock(cat, itemId, quantity);

        Booking booking = new Booking();
        booking.setType(TYPE_LABELS.get(cat));
        booking.setCategory(cat);
        booking.setBookingId(itemId);
        booking.setReference("MMT" + randomRef(8));
        booking.setTitle(title);
        booking.setStatus("CONFIRMED");
        booking.setDate(LocalDate.now().toString());
        booking.setBookedAt(LocalDateTime.now().withNano(0).toString());
        booking.setTravelDate(when);
        booking.setQuantity(quantity);
        booking.setNights(quote.getNights());
        booking.setDiscount(quote.getDiscount());
        booking.setTotalPrice(quote.getTotal());
        booking.setUnitPrice(quote.getUnitPrice());
        booking.setBasePrice(quote.getBaseUnitPrice());
        booking.setAdjustmentPct(quote.getAdjustmentPct());
        booking.setPriceFrozen(quote.isFrozen());
        booking.setFreezeCredit(quote.getFreezeCredit());
        booking.setFees(quote.getFees());
        try {
            user.getBookings().add(booking);
            userRepository.save(user);
        } catch (RuntimeException e) {
            releaseStock(cat, itemId, quantity);
            throw e;
        }
        if (quote.isFrozen() && freezeId != null) {
            priceFreezeService.markUsed(freezeId, booking.getReference());
        }
        catalogCache.markStale();
        if ("FLIGHT".equals(cat)) {
            // follow the flight automatically, so delay and gate notifications reach the traveller
            flightTrackingService.trackBooked(userId, itemId);
        }
        return booking;
    }

    /** What cancelling would return, without cancelling anything. */
    public RefundPolicyService.Preview previewCancel(String userId, String reference, int quantity) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Booking booking = find(user, reference);
        int remaining = booking.getQuantity() - booking.getCancelledQuantity();
        return refundPolicyService.preview(booking, quantity <= 0 ? remaining : quantity);
    }

    public Booking cancel(String userId, String reference) {
        return cancel(userId, reference, "Other", null, 0).getBooking();
    }

    @lombok.Getter
    @lombok.AllArgsConstructor
    public static class CancelResult {
        private final Booking booking;
        private final Refund refund;
        private final RefundPolicyService.Preview preview;
    }

    /**
     * Cancels {@code quantity} units of a booking (all that remain when 0), works out the refund from the policy
     * and opens a refund the customer can follow.
     */
    public CancelResult cancel(String userId, String reference, String reason, String note, int quantity) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Booking booking = find(user, reference);
        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException("Booking is already cancelled");
        }
        int remaining = booking.getQuantity() - booking.getCancelledQuantity();
        int qty = quantity <= 0 ? remaining : quantity;

        RefundPolicyService.Preview p = refundPolicyService.preview(booking, qty);
        if (!p.isCancellable()) throw new RuntimeException(p.getMessage());
        String why = p.isAirlineCancelled() ? RefundPolicyService.AIRLINE_CANCELLED : reason;
        if (why == null || why.isBlank()) throw new RuntimeException("Please choose a reason for cancelling");
        if (!p.isAirlineCancelled() && !RefundPolicyService.REASONS.contains(why)) {
            throw new RuntimeException("Please choose a reason from the list");
        }

        booking.setCancelledQuantity(booking.getCancelledQuantity() + qty);
        booking.setRefundAmount(booking.getRefundAmount() + p.getRefund());
        booking.setCancelReason(why);
        booking.setCancelledAt(LocalDateTime.now().withNano(0).toString());
        if (booking.getCancelledQuantity() >= booking.getQuantity()) booking.setStatus("CANCELLED");
        releaseStock(booking.getCategory(), booking.getBookingId(), qty);
        userRepository.save(user);
        catalogCache.markStale();

        Refund refund = p.getRefund() > 0 ? refundService.create(user, booking, p, why, note) : null;
        return new CancelResult(booking, refund, p);
    }

    /** Gives back the seats, rooms and tickets of every booking that is still active (used when an account is deleted). */
    public void releaseActiveStock(Users user) {
        for (Booking b : user.getBookings()) {
            if (b == null || "CANCELLED".equals(b.getStatus())) continue;
            int left = b.getQuantity() - b.getCancelledQuantity();
            if (left > 0) releaseStock(b.getCategory(), b.getBookingId(), left);
        }
        catalogCache.markStale();
    }

    private Booking find(Users user, String reference) {
        return user.getBookings().stream()
                .filter(b -> b != null && reference.equals(b.getReference()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    // Kept for older clients; the price argument is ignored.
    public Booking bookFlight(String userId, String flightId, int seats, String promo) {
        return book(userId, "FLIGHT", flightId, seats, 1, promo, null);
    }

    public Booking bookhotel(String userId, String hotelId, int rooms, int nights, String promo) {
        return book(userId, "HOTEL", hotelId, rooms, nights, promo, null);
    }

    /** Atomically takes {@code quantity} units, failing if there are not enough left. */
    private void reserveStock(String category, String itemId, int quantity) {
        Class<?> type;
        String field;
        switch (category) {
            case "FLIGHT" -> { type = Flight.class; field = "availableSeats"; }
            case "HOTEL" -> { type = Hotel.class; field = "availableRooms"; }
            default -> {
                Listing l = listingRepository.findById(itemId).orElseThrow(() -> new RuntimeException("Item not found"));
                if (l.getAvailable() < 0) return; // unlimited
                type = Listing.class;
                field = "available";
            }
        }
        Object updated = mongoTemplate.findAndModify(
                Query.query(Criteria.where("_id").is(itemId).and(field).gte(quantity)),
                new Update().inc(field, -quantity), type);
        if (updated == null) {
            throw new RuntimeException("Not enough " + stockWord(category) + " available");
        }
    }

    private void releaseStock(String category, String itemId, int quantity) {
        if (category == null || itemId == null) return;
        String cat = category.toUpperCase(Locale.ROOT);
        switch (cat) {
            case "FLIGHT" -> mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(itemId)),
                    new Update().inc("availableSeats", quantity), Flight.class);
            case "HOTEL" -> mongoTemplate.updateFirst(Query.query(Criteria.where("_id").is(itemId)),
                    new Update().inc("availableRooms", quantity), Hotel.class);
            default -> mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(itemId).and("available").gte(0)),
                    new Update().inc("available", quantity), Listing.class);
        }
    }

    private String stockWord(String category) {
        return switch (category) {
            case "FLIGHT" -> "seats";
            case "HOTEL", "HOMESTAY" -> "rooms";
            case "HOLIDAY" -> "slots";
            default -> "units";
        };
    }

    private String randomRef(int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) sb.append(REF_CHARS.charAt(random.nextInt(REF_CHARS.length())));
        return sb.toString();
    }
}
