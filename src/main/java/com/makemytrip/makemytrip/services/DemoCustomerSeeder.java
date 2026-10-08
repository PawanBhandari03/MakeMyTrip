package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.config.CatalogCache;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.Refund;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Creates a handful of made-up customers with a believable history, so the admin area has real-looking activity to
 * show: bookings of every kind, some of them cancelled in full or in part at different refund levels, and refunds that
 * have been paid out. They use fictional addresses ending in {@value #DOMAIN} and nobody can log in as them.
 * The generated customers are replaced every time the demo data is reset; real customers are never touched.
 */
@Service
public class DemoCustomerSeeder {
    public static final String DOMAIN = "@demo.example";
    private static final Logger log = LoggerFactory.getLogger(DemoCustomerSeeder.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private static final String[][] PEOPLE = {
            {"Aarav", "Sharma"}, {"Priya", "Mehta"}, {"Rohan", "Verma"}, {"Ananya", "Iyer"}, {"Vikram", "Singh"},
            {"Sneha", "Patel"}, {"Arjun", "Nair"}, {"Kavya", "Reddy"}, {"Rahul", "Gupta"}, {"Meera", "Joshi"}};

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private RefundRepository refundRepository;
    @Autowired
    private BookingService bookingService;
    @Autowired
    private UserCleanupService userCleanupService;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private CatalogCache catalogCache;

    public boolean needed() {
        return userRepository.findByEmailEndingWith(DOMAIN).isEmpty();
    }

    /** Runs {@link #seed()} on its own thread, so a reset can answer straight away. */
    public void seedInBackground() {
        Thread t = new Thread(() -> {
            try {
                log.info("Created {} demo bookings", seed());
            } catch (RuntimeException e) {
                log.warn("Could not create the demo customers: {}", e.getMessage());
            }
        }, "demo-customers");
        t.setDaemon(true);
        t.start();
    }

    /** Replaces the demo customers with fresh ones. Returns how many bookings were made. */
    public synchronized int seed() {
        for (Users old : userRepository.findByEmailEndingWith(DOMAIN)) userCleanupService.delete(old);

        LocalDateTime now = LocalDateTime.now();
        String from = now.plusHours(8).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        String to = now.plusDays(9).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
        List<Flight> flights = new ArrayList<>();
        for (Flight f : flightRepository.findByDepartureTimeBetween(from, to)) if (f.getAvailableSeats() >= 8) flights.add(f);
        List<Hotel> hotels = new ArrayList<>();
        for (Hotel h : hotelRepository.findAll()) if (h.isDemo() && h.getAvailableRooms() >= 4) hotels.add(h);
        List<Listing> homestays = new ArrayList<>(), holidays = new ArrayList<>(), rail = new ArrayList<>();
        for (Listing l : listingRepository.findAll()) {
            if (!l.isDemo() || (l.getAvailable() >= 0 && l.getAvailable() < 4)) continue;
            switch (l.getCategory()) {
                case "HOMESTAY" -> homestays.add(l);
                case "HOLIDAY" -> holidays.add(l);
                case "TRAIN", "BUS" -> rail.add(l);
                default -> { }
            }
        }
        if (flights.isEmpty() || hotels.isEmpty()) return 0;

        Random rnd = new Random(2026);
        int made = 0;
        for (String[] p : PEOPLE) {
            Users u = new Users();
            u.setFirstName(p[0]);
            u.setLastName(p[1]);
            u.setEmail((p[0] + "." + p[1]).toLowerCase() + DOMAIN);
            u.setPhoneNumber("9" + (100000000 + rnd.nextInt(899999999)));
            u.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            u.setRole("USER");
            u = userRepository.save(u);

            int count = 2 + rnd.nextInt(3);
            for (int i = 0; i < count; i++) {
                try {
                    if (makeBooking(u, rnd, flights, hotels, homestays, holidays, rail)) made++;
                } catch (RuntimeException e) {
                    log.debug("Skipped a demo booking: {}", e.getMessage());
                }
            }
        }
        catalogCache.clear();
        return made;
    }

    private boolean makeBooking(Users u, Random rnd, List<Flight> flights, List<Hotel> hotels, List<Listing> homestays,
                                List<Listing> holidays, List<Listing> rail) {
        int roll = rnd.nextInt(100);
        String category, itemId;
        int qty = 1, nights = 1;
        String travelDate = null;
        LocalDate day = LocalDate.now().plusDays(3 + rnd.nextInt(18));
        if (roll < 42 || (hotels.isEmpty() && homestays.isEmpty())) {
            Flight f = flights.get(rnd.nextInt(flights.size()));
            category = "FLIGHT";
            itemId = f.getId();
            qty = 1 + rnd.nextInt(3);
        } else if (roll < 68) {
            category = "HOTEL";
            itemId = hotels.get(rnd.nextInt(hotels.size())).getId();
            qty = 1 + rnd.nextInt(2);
            nights = 1 + rnd.nextInt(4);
            travelDate = day.format(DAY);
        } else if (roll < 80 && !homestays.isEmpty()) {
            category = "HOMESTAY";
            itemId = homestays.get(rnd.nextInt(homestays.size())).getId();
            nights = 2 + rnd.nextInt(3);
            travelDate = day.format(DAY);
        } else if (roll < 90 && !holidays.isEmpty()) {
            category = "HOLIDAY";
            itemId = holidays.get(rnd.nextInt(holidays.size())).getId();
            qty = 2 + rnd.nextInt(3);
            travelDate = day.plusDays(10).format(DAY);
        } else if (!rail.isEmpty()) {
            Listing l = rail.get(rnd.nextInt(rail.size()));
            category = l.getCategory();
            itemId = l.getId();
            qty = 1 + rnd.nextInt(3);
            travelDate = day.format(DAY);
        } else {
            return false;
        }

        Booking made = bookingService.book(u.getId(), category, itemId, qty, nights, null, travelDate, null, null);
        String reference = made.getReference();

        // spread the bookings over the last few weeks (some made today, so the 50% refund level appears too)
        int daysAgo = rnd.nextInt(100) < 20 ? 0 : 1 + rnd.nextInt(24);
        LocalDateTime bookedAt = LocalDateTime.now().minusDays(daysAgo).minusHours(rnd.nextInt(10) + (daysAgo == 0 ? 1 : 0)).withNano(0);
        Users fresh = userRepository.findById(u.getId()).orElseThrow();
        for (Booking b : fresh.getBookings()) {
            if (reference.equals(b.getReference())) {
                b.setBookedAt(bookedAt.format(TIME));
                b.setDate(bookedAt.toLocalDate().toString());
            }
        }
        userRepository.save(fresh);

        // roughly one booking in three is cancelled, sometimes only one of several seats
        if (rnd.nextInt(100) < 32) {
            int cancelQty = qty > 1 && rnd.nextBoolean() ? 1 : 0;
            String reason = RefundPolicyService.REASONS.get(weightedReason(rnd));
            BookingService.CancelResult r = bookingService.cancel(u.getId(), reference, reason, null, cancelQty);
            if (r.getRefund() != null) payOut(r.getRefund(), bookedAt, rnd);
        }
        return true;
    }

    /** Dates the cancellation a little after the booking and marks the refund as paid out, like an older real one. */
    private void payOut(Refund refund, LocalDateTime bookedAt, Random rnd) {
        LocalDateTime cancelledAt = bookedAt.plusHours(2 + rnd.nextInt(40));
        if (cancelledAt.isAfter(LocalDateTime.now().minusHours(1))) cancelledAt = LocalDateTime.now().minusHours(1 + rnd.nextInt(3));
        refund.setCreatedAt(cancelledAt.format(TIME));
        refund.setProcessedAt(cancelledAt.plusHours(1).format(TIME));
        refund.setCompletedAt(cancelledAt.plusHours(20 + rnd.nextInt(30)).format(TIME));
        refund.setStatus("COMPLETED");
        refund.setExpectedBy(RefundPolicyService.expectedBy(cancelledAt));
        refundRepository.save(refund);

        Users owner = userRepository.findById(refund.getUserId()).orElse(null);
        if (owner == null) return;
        for (Booking b : owner.getBookings()) {
            if (refund.getBookingReference().equals(b.getReference())) b.setCancelledAt(cancelledAt.format(TIME));
        }
        userRepository.save(owner);
    }

    /** Most people give "change of plans"; the others are spread over the remaining reasons. */
    private int weightedReason(Random rnd) {
        int x = rnd.nextInt(100);
        if (x < 34) return 0;          // Change of plans
        if (x < 48) return 1;          // Found a better price elsewhere
        if (x < 60) return 2;          // Medical or personal emergency
        if (x < 72) return 3;          // Booked the wrong dates
        if (x < 84) return 4;          // Flight or schedule changed
        if (x < 92) return 5;          // Documents or visa issue
        return 6;                      // Other
    }
}
