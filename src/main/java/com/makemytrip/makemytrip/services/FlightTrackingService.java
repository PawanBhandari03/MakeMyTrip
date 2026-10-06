package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightEvent;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.FlightTracking;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.FlightTrackingRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** The flights each user follows, with their live status for the My Flights dashboard. */
@Service
public class FlightTrackingService {

    /** Most flights one user may follow at once. */
    private static final int MAX_TRACKED = 25;

    @Autowired
    private FlightTrackingRepository trackingRepository;
    @Autowired
    private FlightStatusService statusService;
    @Autowired
    private FlightEventService eventService;
    @Autowired
    private FlightRepository flightRepository;

    @Data
    public static class TrackedFlight {
        private String flightNumber;
        private String airline;
        private String from;
        private String to;
        private String status;
        private String phase;
        private int delayMinutes;
        private String delayReason;
        private String gate;
        private String terminal;
        private String scheduledDeparture;
        private String scheduledArrival;
        private String estimatedDeparture;
        private String estimatedArrival;
        /** Minutes until take-off and landing as of {@code updatedAt}; negative once passed. */
        private long minutesToDeparture;
        private long minutesToArrival;
        private int progress;
        private String updatedAt;
        private boolean tracked;
        /** MANUAL or BOOKING; null when not tracked. */
        private String source;
        private List<FlightEvent> events = new ArrayList<>();
    }

    public TrackedFlight view(FlightStatus s, FlightTracking t, boolean withEvents) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime estDep = LocalDateTime.parse(s.getEstimatedDeparture(), FlightStatusService.ISO);
        LocalDateTime estArr = LocalDateTime.parse(s.getEstimatedArrival(), FlightStatusService.ISO);

        TrackedFlight v = new TrackedFlight();
        v.setFlightNumber(s.getFlightNumber());
        v.setAirline(s.getFlightName());
        v.setFrom(s.getFrom());
        v.setTo(s.getTo());
        v.setStatus(s.getStatus());
        v.setPhase(s.getPhase());
        v.setDelayMinutes(s.getDelayMinutes());
        v.setDelayReason(s.getDelayReason());
        v.setGate(s.getGate());
        v.setTerminal(s.getTerminal());
        v.setScheduledDeparture(s.getScheduledDeparture());
        v.setScheduledArrival(s.getScheduledArrival());
        v.setEstimatedDeparture(s.getEstimatedDeparture());
        v.setEstimatedArrival(s.getEstimatedArrival());
        v.setMinutesToDeparture(Duration.between(now, estDep).toMinutes());
        v.setMinutesToArrival(Duration.between(now, estArr).toMinutes());
        v.setUpdatedAt(now.withNano(0).toString());
        v.setTracked(t != null);
        v.setSource(t == null ? null : t.getSource());

        int progress = 0;
        if ("LANDED".equals(s.getPhase())) {
            progress = 100;
        } else if ("DEPARTED".equals(s.getPhase())) {
            long total = Duration.between(estDep, estArr).toMinutes();
            long done = Duration.between(estDep, now).toMinutes();
            progress = total <= 0 ? 0 : (int) Math.max(0, Math.min(99, Math.round(done * 100.0 / total)));
        }
        v.setProgress(progress);
        if (withEvents) v.setEvents(eventService.timeline(s.getFlightNumber()));
        return v;
    }

    public List<TrackedFlight> list(String userId) {
        List<TrackedFlight> out = new ArrayList<>();
        for (FlightTracking t : trackingRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
            statusService.getFlightStatusByNumber(t.getFlightNumber())
                    .ifPresent(s -> out.add(view(s, t, true)));
        }
        // soonest departure first; finished flights sink to the bottom
        out.sort((a, b) -> {
            boolean doneA = "LANDED".equals(a.getPhase()) || "CANCELLED".equals(a.getPhase());
            boolean doneB = "LANDED".equals(b.getPhase()) || "CANCELLED".equals(b.getPhase());
            if (doneA != doneB) return doneA ? 1 : -1;
            return a.getEstimatedDeparture().compareTo(b.getEstimatedDeparture());
        });
        return out;
    }

    /** One flight as seen by one user, including whether they follow it. */
    public Optional<TrackedFlight> one(String userId, String flightNumber) {
        String number = FlightStatusService.normalize(flightNumber);
        Optional<FlightStatus> status = statusService.getFlightStatusByNumber(number);
        if (status.isEmpty()) return Optional.empty();
        FlightTracking t = userId == null || userId.isBlank() ? null
                : trackingRepository.findByUserIdAndFlightNumber(userId, number).orElse(null);
        return Optional.of(view(status.get(), t, true));
    }

    public TrackedFlight track(String userId, String flightNumber, String source) {
        String number = FlightStatusService.normalize(flightNumber);
        FlightStatus s = statusService.getFlightStatusByNumber(number)
                .orElseThrow(() -> new RuntimeException("We could not find flight " + flightNumber + ". Check the number and try again."));
        if ("LANDED".equals(s.getPhase())) throw new RuntimeException("Flight " + s.getFlightNumber() + " has already landed.");
        FlightTracking existing = trackingRepository.findByUserIdAndFlightNumber(userId, s.getFlightNumber()).orElse(null);
        if (existing != null) return view(s, existing, true);
        if (trackingRepository.findByUserIdOrderByCreatedAtDesc(userId).size() >= MAX_TRACKED) {
            throw new RuntimeException("You can follow up to " + MAX_TRACKED + " flights at once. Remove one to add another.");
        }
        FlightTracking t = new FlightTracking();
        t.setUserId(userId);
        t.setFlightNumber(s.getFlightNumber());
        t.setFlightId(s.getFlightId());
        t.setSource(source);
        t.setCreatedAt(LocalDateTime.now().withNano(0).toString());
        trackingRepository.save(t);
        return view(s, t, true);
    }

    /** Called when a flight is booked, so the traveller is told about changes without having to ask. */
    public void trackBooked(String userId, String flightId) {
        Flight f = flightRepository.findById(flightId).orElse(null);
        if (f == null) return;
        try {
            track(userId, FlightStatusService.flightNumberOf(f), "BOOKING");
        } catch (RuntimeException ignored) {
            // tracking is a convenience; a booking must never fail because of it
        }
    }

    public void untrack(String userId, String flightNumber) {
        trackingRepository.deleteByUserIdAndFlightNumber(userId, FlightStatusService.normalize(flightNumber));
    }
}
