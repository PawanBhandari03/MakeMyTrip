package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightEvent;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.FlightTracking;
import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.FlightEventRepository;
import com.makemytrip.makemytrip.repositories.FlightTrackingRepository;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Writes the events that make up a flight's timeline and, for important ones, sends a notification
 * to every user who is tracking that flight.
 */
@Service
public class FlightEventService {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS");

    @Autowired
    private FlightEventRepository eventRepository;
    @Autowired
    private FlightTrackingRepository trackingRepository;
    @Autowired
    private NotificationRepository notificationRepository;

    public static String delayText(int minutes) {
        if (minutes < 60) return minutes + " min";
        int h = minutes / 60;
        int m = minutes % 60;
        return m == 0 ? h + "h" : h + "h " + m + "m";
    }

    public static String clock(String iso) {
        return iso == null || iso.length() < 16 ? "" : LocalDateTime.parse(iso, FlightStatusService.ISO).format(FlightStatusService.CLOCK);
    }

    private static String label(FlightStatus s) {
        return (s.getFlightName() + " " + s.getFlightNumber()).trim();
    }

    // ------------------------------------------------------------------ delays

    /**
     * @param type   DELAY_ANNOUNCED, DELAY_EXTENDED, DELAY_REDUCED or ON_TIME
     * @param oldDep estimated departure before the change (ISO), or null for a brand-new delay
     */
    public FlightEvent recordDelay(FlightStatus s, String type, String oldDep, int delay, String reason, boolean notify) {
        String newDep = clock(s.getEstimatedDeparture());
        String eta = clock(s.getEstimatedArrival());
        String scheduled = clock(s.getScheduledDeparture());
        String why = reason == null || reason.isBlank() ? "" : "Reason: " + reason + ". ";
        String title;
        String message;
        switch (type) {
            case "DELAY_EXTENDED" -> {
                title = label(s) + ": delay extended to " + delayText(delay);
                message = why + "New departure " + newDep + " (scheduled " + scheduled + "). Estimated arrival " + eta + ".";
            }
            case "DELAY_REDUCED" -> {
                title = label(s) + ": delay reduced to " + delayText(delay);
                message = "Good news. New departure " + newDep + " (scheduled " + scheduled + "). Estimated arrival " + eta + ".";
            }
            case "ON_TIME" -> {
                title = label(s) + " is back on time";
                message = "Departure is back to the scheduled " + scheduled + ". Estimated arrival " + eta + ".";
            }
            default -> {
                title = label(s) + " delayed by " + delayText(delay);
                message = why + "New departure " + newDep + " (scheduled " + scheduled + "). Estimated arrival " + eta + ".";
            }
        }
        return save(s, type, title, message, delay, reason, oldDep, notify);
    }

    public FlightEvent recordCancelled(FlightStatus s, String reason, boolean notify) {
        String why = reason == null || reason.isBlank() ? "" : " Reason: " + reason + ".";
        return save(s, "CANCELLED", label(s) + " has been cancelled",
                "This flight from " + s.getFrom() + " to " + s.getTo() + " has been cancelled." + why
                        + " You can cancel your booking from My Trips for a refund.",
                0, reason, null, notify);
    }

    public FlightEvent recordGateChange(FlightStatus s, String oldGate, boolean notify) {
        return save(s, "GATE_CHANGED", label(s) + ": gate changed to " + s.getGate(),
                "Please go to gate " + s.getGate() + (oldGate == null ? "" : " (it was " + oldGate + ")") + ", terminal " + s.getTerminal() + ".",
                0, null, null, notify);
    }

    public FlightEvent recordBoarding(FlightStatus s, boolean notify) {
        return save(s, "BOARDING", label(s) + " is now boarding",
                "Boarding has started at gate " + s.getGate() + ", terminal " + s.getTerminal() + ". Departure " + clock(s.getEstimatedDeparture()) + ".",
                s.getDelayMinutes(), null, null, notify);
    }

    public FlightEvent recordDeparted(FlightStatus s, boolean notify) {
        return save(s, "DEPARTED", label(s) + " has departed",
                "Took off from " + s.getFrom() + " at " + clock(s.getEstimatedDeparture()) + ". Estimated arrival in " + s.getTo() + " " + clock(s.getEstimatedArrival()) + ".",
                s.getDelayMinutes(), null, null, notify);
    }

    public FlightEvent recordLanded(FlightStatus s, boolean notify) {
        return save(s, "LANDED", label(s) + " has landed",
                "Landed in " + s.getTo() + " at " + clock(s.getEstimatedArrival()) + ".",
                s.getDelayMinutes(), null, null, notify);
    }

    // ------------------------------------------------------------------ storage

    private FlightEvent save(FlightStatus s, String type, String title, String message, int delay, String reason, String oldDep, boolean notify) {
        String now = LocalDateTime.now().format(STAMP);
        FlightEvent e = new FlightEvent();
        e.setFlightNumber(s.getFlightNumber());
        e.setType(type);
        e.setTitle(title);
        e.setMessage(message);
        e.setDelayMinutes(delay);
        e.setReason(reason);
        e.setOldDeparture(oldDep);
        e.setNewDeparture(s.getEstimatedDeparture());
        e.setNewArrival(s.getEstimatedArrival());
        e.setCreatedAt(now);
        eventRepository.save(e);

        if (notify) {
            List<Notification> out = new ArrayList<>();
            for (FlightTracking t : trackingRepository.findByFlightNumber(s.getFlightNumber())) {
                Notification n = new Notification();
                n.setUserId(t.getUserId());
                n.setType(type);
                n.setTitle(title);
                n.setMessage(message);
                n.setFlightNumber(s.getFlightNumber());
                n.setCreatedAt(now);
                out.add(n);
            }
            if (!out.isEmpty()) notificationRepository.saveAll(out);
        }
        return e;
    }

    public List<FlightEvent> timeline(String flightNumber) {
        return eventRepository.findTop30ByFlightNumberOrderByCreatedAtDesc(flightNumber);
    }
}
