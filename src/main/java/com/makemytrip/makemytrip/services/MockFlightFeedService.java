package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Random;

/**
 * The mock airline feed. It plays the part of a real-time operations system:
 * flights move from scheduled to boarding to departed to landed on their own as time passes, and every so often
 * something happens, such as a delay being announced, getting longer or shorter, or the gate changing.
 * Each change is written to the flight's timeline and sent to the users who track that flight.
 * <p>
 * The same operations can be triggered by hand (see MockFlightApiController), which is how an operator
 * or a reviewer can watch the notifications arrive without waiting for a random event.
 */
@Service
public class MockFlightFeedService {

    private static final Logger log = LoggerFactory.getLogger(MockFlightFeedService.class);

    // Chances per 10-second tick for a flight that has not left yet and departs within 6 hours.
    private static final double P_DELAY = 0.0001;
    private static final double P_EXTEND = 0.0003;
    private static final double P_REDUCE = 0.0002;
    private static final double P_GATE = 0.00015;

    @Autowired
    private FlightStatusRepository repo;
    @Autowired
    private FlightEventService events;

    private final Random random = new Random();

    @Scheduled(fixedDelay = 10000, initialDelay = 20000)
    public void tick() {
        LocalDateTime now = LocalDateTime.now();
        String from = now.minusHours(10).format(FlightStatusService.ISO);
        String to = now.plusHours(8).format(FlightStatusService.ISO);
        for (FlightStatus s : repo.findByScheduledDepartureBetween(from, to)) {
            try {
                advance(s, now, true);
            } catch (RuntimeException e) {
                log.warn("Could not update flight {}: {}", s.getFlightNumber(), e.getMessage());
            }
        }
    }

    /** Moves one flight forward: time-driven phase changes first, then (optionally) random operational events. */
    void advance(FlightStatus s, LocalDateTime now, boolean allowRandom) {
        String phase = s.getPhase();
        if ("CANCELLED".equals(phase) || "LANDED".equals(phase)) return;

        boolean changed = false;
        LocalDateTime estDep = LocalDateTime.parse(s.getEstimatedDeparture(), FlightStatusService.ISO);
        LocalDateTime estArr = LocalDateTime.parse(s.getEstimatedArrival(), FlightStatusService.ISO);

        if (!now.isBefore(estArr)) {
            s.setPhase("LANDED");
            FlightStatusService.refresh(s);
            events.recordLanded(s, true);
            changed = true;
        } else if (!now.isBefore(estDep)) {
            if (!"DEPARTED".equals(phase)) {
                s.setPhase("DEPARTED");
                FlightStatusService.refresh(s);
                events.recordDeparted(s, true);
                changed = true;
            }
        } else if (!now.isBefore(estDep.minusMinutes(40)) && "SCHEDULED".equals(phase)) {
            s.setPhase("BOARDING");
            FlightStatusService.refresh(s);
            events.recordBoarding(s, true);
            changed = true;
        }

        long minutesToDeparture = java.time.Duration.between(now, estDep).toMinutes();
        if (allowRandom && !changed && minutesToDeparture > 0 && minutesToDeparture <= 360
                && ("SCHEDULED".equals(s.getPhase()) || "BOARDING".equals(s.getPhase()))) {
            double r = random.nextDouble();
            if (s.getDelayMinutes() == 0 && r < P_DELAY) {
                int[] options = {20, 30, 45, 60, 90};
                setDelay(s, options[random.nextInt(options.length)], pickReason(), now);
                changed = true;
            } else if (s.getDelayMinutes() > 0 && r < P_EXTEND) {
                setDelay(s, s.getDelayMinutes() + (random.nextBoolean() ? 15 : 30), s.getDelayReason(), now);
                changed = true;
            } else if (s.getDelayMinutes() > 0 && r < P_EXTEND + P_REDUCE) {
                setDelay(s, Math.max(0, s.getDelayMinutes() - 15), s.getDelayReason(), now);
                changed = true;
            } else if (random.nextDouble() < P_GATE) {
                changeGate(s, randomGate(s.getGate()));
                changed = true;
            }
        }
        if (changed) repo.save(s);
    }

    // ------------------------------------------------------------------ operations (random and manual)

    /** Sets the total delay and records the right kind of event. */
    private void setDelay(FlightStatus s, int newDelay, String reason, LocalDateTime now) {
        int old = s.getDelayMinutes();
        String oldDeparture = s.getEstimatedDeparture();
        s.setDelayMinutes(newDelay);
        boolean hasNewReason = reason != null && !reason.isBlank();
        boolean hasOldReason = s.getDelayReason() != null && !s.getDelayReason().isBlank();
        s.setDelayReason(newDelay == 0 ? "" : hasNewReason ? reason : (old > 0 && hasOldReason ? s.getDelayReason() : pickReason()));
        // A longer delay can push boarding back
        if ("BOARDING".equals(s.getPhase()) && newDelay > old) s.setPhase("SCHEDULED");
        FlightStatusService.refresh(s);
        FlightStatusService.advanceByClock(s, now);
        if (newDelay == 0) events.recordDelay(s, "ON_TIME", oldDeparture, 0, null, true);
        else if (old == 0) events.recordDelay(s, "DELAY_ANNOUNCED", oldDeparture, newDelay, s.getDelayReason(), true);
        else if (newDelay > old) events.recordDelay(s, "DELAY_EXTENDED", oldDeparture, newDelay, s.getDelayReason(), true);
        else if (newDelay < old) events.recordDelay(s, "DELAY_REDUCED", oldDeparture, newDelay, s.getDelayReason(), true);
    }

    private void changeGate(FlightStatus s, String gate) {
        String old = s.getGate();
        s.setGate(gate);
        FlightStatusService.refresh(s);
        events.recordGateChange(s, old, true);
    }

    /**
     * Manual control of the feed.
     *
     * @param type DELAY (set the total delay), ADD_DELAY, CLEAR_DELAY, GATE_CHANGE, BOARDING or CANCEL
     */
    public Optional<FlightStatus> operate(String flightNumber, String type, Integer minutes, String reason, String gate) {
        Optional<FlightStatus> found = repo.findByFlightNumber(FlightStatusService.normalize(flightNumber));
        if (found.isEmpty()) return found;
        FlightStatus s = found.get();
        if ("LANDED".equals(s.getPhase()) || "CANCELLED".equals(s.getPhase())) {
            throw new RuntimeException("This flight is already " + s.getStatus().toLowerCase(Locale.ROOT) + ", so it cannot be changed.");
        }
        LocalDateTime now = LocalDateTime.now();
        String kind = type == null ? "" : type.toUpperCase(Locale.ROOT);
        switch (kind) {
            case "DELAY" -> {
                if (minutes == null || minutes < 0 || minutes > 600) throw new RuntimeException("Delay must be between 0 and 600 minutes");
                guardNotDeparted(s);
                setDelay(s, minutes, reason, now);
            }
            case "ADD_DELAY" -> {
                if (minutes == null || minutes <= 0) throw new RuntimeException("Enter the number of minutes to add");
                guardNotDeparted(s);
                setDelay(s, Math.min(600, s.getDelayMinutes() + minutes), reason, now);
            }
            case "CLEAR_DELAY" -> {
                guardNotDeparted(s);
                setDelay(s, 0, null, now);
            }
            case "GATE_CHANGE" -> changeGate(s, gate == null || gate.isBlank() ? randomGate(s.getGate()) : gate.trim().toUpperCase(Locale.ROOT));
            case "BOARDING" -> {
                guardNotDeparted(s);
                s.setPhase("BOARDING");
                FlightStatusService.refresh(s);
                events.recordBoarding(s, true);
            }
            case "CANCEL" -> {
                guardNotDeparted(s);
                s.setPhase("CANCELLED");
                s.setDelayReason(reason == null || reason.isBlank() ? "Operational reasons" : reason);
                FlightStatusService.refresh(s);
                events.recordCancelled(s, s.getDelayReason(), true);
            }
            default -> throw new RuntimeException("Unknown operation: " + type);
        }
        return Optional.of(repo.save(s));
    }

    private static void guardNotDeparted(FlightStatus s) {
        if ("DEPARTED".equals(s.getPhase())) throw new RuntimeException("This flight has already departed.");
    }

    private String pickReason() {
        return FlightStatusService.DELAY_REASONS[random.nextInt(FlightStatusService.DELAY_REASONS.length)];
    }

    private String randomGate(String current) {
        String gate;
        do {
            gate = (char) ('A' + random.nextInt(6)) + String.valueOf(1 + random.nextInt(9));
        } while (gate.equals(current));
        return gate;
    }

    /** Flights that are about to depart or have just left, for the operator's console. */
    public List<FlightStatus> board() {
        LocalDateTime now = LocalDateTime.now();
        return repo.findByScheduledDepartureBetween(now.minusHours(3).format(FlightStatusService.ISO), now.plusHours(36).format(FlightStatusService.ISO))
                .stream()
                .sorted((a, b) -> a.getScheduledDeparture().compareTo(b.getScheduledDeparture()))
                .limit(60)
                .toList();
    }
}
