package com.makemytrip.makemytrip.services;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
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

    private final SecureRandom random = new SecureRandom();

    /** Books any category. The price is always recomputed on the server. */
    public Booking book(String userId, String category, String itemId, int quantity, int nights, String promo, String travelDate) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Quote quote = pricingService.quote(category, itemId, quantity, nights, promo);
        String cat = quote.getCategory();

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
        try {
            user.getBookings().add(booking);
            userRepository.save(user);
        } catch (RuntimeException e) {
            releaseStock(cat, itemId, quantity);
            throw e;
        }
        return booking;
    }

    public Booking cancel(String userId, String reference) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Booking booking = user.getBookings().stream()
                .filter(b -> b != null && reference.equals(b.getReference()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException("Booking is already cancelled");
        }
        booking.setStatus("CANCELLED");
        releaseStock(booking.getCategory(), booking.getBookingId(), booking.getQuantity());
        userRepository.save(user);
        return booking;
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
