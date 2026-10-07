package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.Users.Booking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The cancellation rules, in one place. The same code answers "what would I get back?" before a customer
 * cancels and decides the refund when they do, so the two can never disagree.
 */
@Service
public class RefundPolicyService {

    public static final List<String> REASONS = List.of(
            "Change of plans",
            "Found a better price elsewhere",
            "Medical or personal emergency",
            "Booked the wrong dates",
            "Flight or schedule changed",
            "Documents or visa issue",
            "Other");
    public static final String AIRLINE_CANCELLED = "Cancelled by the airline";

    private static final Map<String, Double> FALLBACK_FEES = Map.of("FLIGHT", 249.0, "TRAIN", 35.0, "BUS", 20.0);

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private FlightStatusService flightStatusService;

    @Getter
    @Setter
    public static class Preview {
        private String reference;
        private String title;
        private int quantity;          // units that would be cancelled
        private int remainingQuantity; // units still active before this cancellation
        private double amountPaid;     // what was paid for those units
        private double nonRefundable;  // booking fee share, never returned
        private int percent;
        private String policyLabel;
        private String explanation;
        private double refund;
        private double deduction;      // what the customer does not get back
        private boolean airlineCancelled;
        private boolean cancellable = true;
        private String message;
        private String travelAt;
        private long hoursToTravel;
        private long hoursSinceBooking;
        private String expectedBy;
        private List<String> steps = new ArrayList<>();
    }

    public Preview preview(Booking b, int quantity) {
        return preview(b, quantity, LocalDateTime.now());
    }

    public Preview preview(Booking b, int quantity, LocalDateTime now) {
        int remaining = b.getQuantity() - b.getCancelledQuantity();
        Preview p = new Preview();
        p.setReference(b.getReference());
        p.setTitle(b.getTitle());
        p.setRemainingQuantity(remaining);
        p.setQuantity(quantity);
        if ("CANCELLED".equals(b.getStatus()) || remaining <= 0) {
            p.setCancellable(false);
            p.setMessage("This booking is already cancelled.");
            return p;
        }
        if (quantity < 1 || quantity > remaining) {
            p.setCancellable(false);
            p.setMessage("Choose between 1 and " + remaining + " to cancel.");
            return p;
        }

        LocalDateTime booked = parse(b.getBookedAt());
        LocalDateTime travel = travelTime(b);
        p.setTravelAt(travel == null ? null : travel.toString());
        long sinceBooking = booked == null ? 9999 : Duration.between(booked, now).toHours();
        long toTravel = travel == null ? 9999 : Duration.between(now, travel).toHours();
        p.setHoursSinceBooking(Math.max(0, sinceBooking));
        p.setHoursToTravel(toTravel);

        double share = (double) quantity / b.getQuantity();
        double fee = (b.getFees() > 0 ? b.getFees() : FALLBACK_FEES.getOrDefault(b.getCategory(), 0.0));
        fee = Math.min(fee, b.getTotalPrice());
        double paid = Math.round(b.getTotalPrice() * share);
        double nonRefundable = Math.round(fee * share);

        int percent;
        String label;
        String why;
        if (isAirlineCancelled(b)) {
            p.setAirlineCancelled(true);
            percent = 100;
            nonRefundable = 0;
            label = "Full refund";
            why = "The airline cancelled this flight, so everything you paid is returned, including the booking fee.";
        } else if (travel != null && !now.isBefore(travel)) {
            percent = 0;
            label = "No refund";
            why = "Travel has already started, so the fare cannot be refunded.";
        } else if (sinceBooking < 24) {
            percent = 50;
            label = "Within 24 hours of booking";
            why = "You are cancelling within 24 hours of booking, so 50% of the fare is returned.";
        } else if (toTravel >= 48) {
            percent = 25;
            label = "More than 48 hours before travel";
            why = "Cancelling more than 48 hours before travel returns 25% of the fare.";
        } else {
            percent = 10;
            label = "Less than 48 hours before travel";
            why = "Cancelling within 48 hours of travel returns 10% of the fare.";
        }

        double refundable = Math.max(0, paid - nonRefundable);
        double refund = Math.round(refundable * percent / 100.0);
        p.setAmountPaid(paid);
        p.setNonRefundable(nonRefundable);
        p.setPercent(percent);
        p.setPolicyLabel(label);
        p.setExplanation(why);
        p.setRefund(refund);
        p.setDeduction(Math.max(0, paid - refund));
        p.setExpectedBy(expectedBy(now));
        p.getSteps().add("Cancellation confirmed now");
        p.getSteps().add("Refund processed within minutes in this demo (usually 1 to 2 business days)");
        p.getSteps().add("Money reaches your original payment method by " + p.getExpectedBy());
        return p;
    }

    /** A bank shows a refund after 5 to 7 business days; this returns the 7th business day. */
    public static String expectedBy(LocalDateTime from) {
        LocalDate d = from.toLocalDate();
        int added = 0;
        while (added < 7) {
            d = d.plusDays(1);
            if (d.getDayOfWeek().getValue() < 6) added++;
        }
        return d.toString();
    }

    private boolean isAirlineCancelled(Booking b) {
        if (!"FLIGHT".equals(b.getCategory())) return false;
        Flight f = flightRepository.findById(b.getBookingId()).orElse(null);
        if (f == null) return false;
        return flightStatusService.getFlightStatusByNumber(FlightStatusService.flightNumberOf(f))
                .map(FlightStatus::getPhase).filter("CANCELLED"::equals).isPresent();
    }

    /** When the trip starts: a flight's departure, otherwise the start of the travel or check-in day. */
    private LocalDateTime travelTime(Booking b) {
        if (b.getTravelDate() == null || b.getTravelDate().isBlank()) return null;
        return parse(b.getTravelDate());
    }

    private LocalDateTime parse(String text) {
        if (text == null || text.length() < 10) return null;
        try {
            if (text.length() >= 16) return LocalDateTime.parse(text.substring(0, 16), DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
            return LocalDate.parse(text.substring(0, 10)).atStartOfDay();
        } catch (RuntimeException e) {
            return null;
        }
    }
}
