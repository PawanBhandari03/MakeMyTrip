package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Live status for something a customer has booked (flight, train or bus).
 * Flights use the flight-status feed. Trains and buses have no real feed in this demo, so their
 * status is simulated from the schedule and the current time: it is stable for a given journey
 * and only changes in 15-minute steps, which makes it feel live without jumping around.
 */
@Service
public class BookingStatusService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
    private static final Pattern ARRIVAL = Pattern.compile("(\\d{1,2}):(\\d{2})(?:\\s*\\+(\\d+))?");

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private FlightStatusRepository flightStatusRepository;
    @Autowired
    private ListingRepository listingRepository;

    @Data
    public static class StatusInfo {
        private String category;
        private String title;
        /** SCHEDULED, BOARDING, IN_TRANSIT, ARRIVED, DELAYED or CANCELLED. */
        private String state;
        private String label;
        /** good, warn, bad or info; the page uses it to pick a colour. */
        private String tone;
        private int delayMinutes;
        private int progress;
        private String departure;
        private String arrival;
        private Map<String, String> details = new LinkedHashMap<>();
        private String updatedAt;
    }

    public Optional<StatusInfo> status(String category, String itemId, String travelDate) {
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        StatusInfo info = switch (cat) {
            case "FLIGHT" -> flightStatus(itemId);
            case "TRAIN", "BUS" -> groundStatus(cat, itemId, travelDate);
            default -> null;
        };
        if (info == null) return Optional.empty();
        info.setCategory(cat);
        info.setUpdatedAt(LocalDateTime.now().withNano(0).toString());
        return Optional.of(info);
    }

    // ------------------------------------------------------------------ flights

    private StatusInfo flightStatus(String itemId) {
        Flight f = flightRepository.findById(itemId).orElse(null);
        if (f == null) return null;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime dep = LocalDateTime.parse(f.getDepartureTime(), ISO);
        LocalDateTime arr = LocalDateTime.parse(f.getArrivalTime(), ISO);

        StatusInfo s = new StatusInfo();
        s.setTitle(f.getFlightName() + " · " + f.getFrom() + " → " + f.getTo());
        s.setDeparture(f.getDepartureTime());
        s.setArrival(f.getArrivalTime());
        s.getDetails().put("Departs", dep.format(CLOCK));
        s.getDetails().put("Arrives", arr.format(CLOCK));

        FlightStatus fs = flightStatusRepository
                .findByFlightNumber(FlightStatusService.normalize(lastWord(f.getFlightName())))
                .orElse(null);
        if (fs != null) {
            if (fs.getGate() != null && !fs.getGate().isBlank()) s.getDetails().put("Gate", fs.getGate());
            if (fs.getTerminal() != null && !fs.getTerminal().isBlank()) s.getDetails().put("Terminal", fs.getTerminal());
        }

        if (!now.isBefore(arr)) {
            return finish(s, "ARRIVED", "Landed", "good", 100, 0);
        }
        if (!now.isBefore(dep)) {
            s.getDetails().put("Arrives in", humanize(Duration.between(now, arr)));
            return finish(s, "IN_TRANSIT", "In the air", "info", progress(dep, arr, now), 0);
        }

        String raw = fs == null ? "On Time" : fs.getStatus();
        long minutesToGo = Duration.between(now, dep).toMinutes();
        if ("Cancelled".equalsIgnoreCase(raw)) {
            if (fs != null && fs.getDelayReason() != null && !fs.getDelayReason().isBlank()) {
                s.getDetails().put("Reason", fs.getDelayReason());
            }
            return finish(s, "CANCELLED", "Cancelled", "bad", 0, 0);
        }
        if ("Delayed".equalsIgnoreCase(raw)) {
            int delay = 20 + Math.abs((itemId + "d").hashCode()) % 70;
            if (fs != null && fs.getDelayReason() != null && !fs.getDelayReason().isBlank()) {
                s.getDetails().put("Reason", fs.getDelayReason());
            }
            s.getDetails().put("New departure", dep.plusMinutes(delay).format(CLOCK));
            return finish(s, "DELAYED", "Delayed by " + delay + " min", "warn", 0, delay);
        }
        s.getDetails().put("Departs in", humanize(Duration.between(now, dep)));
        if ("Boarding".equalsIgnoreCase(raw) || minutesToGo <= 60) {
            return finish(s, "BOARDING", "Boarding", "good", 0, 0);
        }
        return finish(s, "SCHEDULED", "On time", "good", 0, 0);
    }

    // ------------------------------------------------------------------ trains and buses

    private StatusInfo groundStatus(String cat, String itemId, String travelDate) {
        Listing l = listingRepository.findById(itemId).orElse(null);
        if (l == null) return null;

        LocalDate day = LocalDate.now();
        if (travelDate != null && travelDate.length() >= 10) {
            try {
                day = LocalDate.parse(travelDate.substring(0, 10));
            } catch (RuntimeException ignored) {
                // fall back to today
            }
        }
        LocalDateTime dep = day.atTime(parseTime(l.getDepartureTime(), LocalTime.of(8, 0)));
        LocalDateTime arr = parseArrival(day, l.getArrivalTime(), dep.plusHours(4));
        if (!arr.isAfter(dep)) arr = dep.plusHours(1);
        LocalDateTime now = LocalDateTime.now();

        // stable for a given journey, changing only every 15 minutes
        int seed = Math.abs((itemId + day + (now.getHour() * 4 + now.getMinute() / 15)).hashCode());
        int delay = seed % 100 < 62 ? 0 : 10 + (seed / 7) % 50;
        int slot = 1 + Math.abs((itemId + day).hashCode()) % 9;

        StatusInfo s = new StatusInfo();
        boolean train = cat.equals("TRAIN");
        s.setTitle(l.getName() + " · " + l.getFrom() + " → " + l.getTo());
        s.setDeparture(dep.format(ISO));
        s.setArrival(arr.format(ISO));
        s.getDetails().put("Departs", dep.format(CLOCK));
        s.getDetails().put("Arrives", arr.plusMinutes(delay).format(CLOCK));
        if (l.getType() != null && !l.getType().isBlank()) s.getDetails().put(train ? "Class" : "Bus type", l.getType());

        LocalDateTime effectiveDep = dep.plusMinutes(delay);
        LocalDateTime effectiveArr = arr.plusMinutes(delay);

        if (!now.isBefore(effectiveArr)) {
            s.getDetails().put("Arrived at", effectiveArr.format(CLOCK));
            return finish(s, "ARRIVED", "Arrived", "good", 100, delay);
        }
        if (!now.isBefore(effectiveDep)) {
            s.getDetails().put("Arrives in", humanize(Duration.between(now, effectiveArr)));
            String label = delay > 0 ? "Running late by " + delay + " min" : "Running on time";
            return finish(s, "IN_TRANSIT", label, delay > 0 ? "warn" : "good", progress(effectiveDep, effectiveArr, now), delay);
        }

        long minutesToDep = Duration.between(now, dep).toMinutes();
        if (minutesToDep > 180) {
            s.getDetails().put("Departs in", humanize(Duration.between(now, dep)));
            return finish(s, "SCHEDULED", "Scheduled", "info", 0, 0);
        }
        s.getDetails().put(train ? "Platform" : "Boarding point", train ? String.valueOf(slot) : "Bay " + slot);
        s.getDetails().put("Departs in", humanize(Duration.between(now, effectiveDep)));
        if (delay > 0) {
            s.getDetails().put("New departure", effectiveDep.format(CLOCK));
            return finish(s, "DELAYED", "Delayed by " + delay + " min", "warn", 0, delay);
        }
        if (minutesToDep <= 45) {
            return finish(s, "BOARDING", "Boarding now", "good", 0, 0);
        }
        return finish(s, "SCHEDULED", "On time", "good", 0, 0);
    }

    // ------------------------------------------------------------------ helpers

    private static StatusInfo finish(StatusInfo s, String state, String label, String tone, int progress, int delay) {
        s.setState(state);
        s.setLabel(label);
        s.setTone(tone);
        s.setProgress(progress);
        s.setDelayMinutes(delay);
        return s;
    }

    private static int progress(LocalDateTime from, LocalDateTime to, LocalDateTime now) {
        long total = Duration.between(from, to).toMinutes();
        if (total <= 0) return 0;
        long done = Duration.between(from, now).toMinutes();
        return (int) Math.max(0, Math.min(100, Math.round(done * 100.0 / total)));
    }

    private static String humanize(Duration d) {
        long minutes = Math.max(0, d.toMinutes());
        long days = minutes / 1440;
        long hours = (minutes % 1440) / 60;
        long mins = minutes % 60;
        if (days > 0) return days + "d " + hours + "h";
        if (hours > 0) return hours + "h " + mins + "m";
        return mins + " min";
    }

    private static LocalTime parseTime(String text, LocalTime fallback) {
        if (text == null) return fallback;
        Matcher m = ARRIVAL.matcher(text);
        if (!m.find()) return fallback;
        return LocalTime.of(Integer.parseInt(m.group(1)) % 24, Integer.parseInt(m.group(2)));
    }

    /** Arrival texts look like "08:35 +1", meaning 08:35 on the following day. */
    private static LocalDateTime parseArrival(LocalDate day, String text, LocalDateTime fallback) {
        if (text == null) return fallback;
        Matcher m = ARRIVAL.matcher(text);
        if (!m.find()) return fallback;
        int plusDays = m.group(3) == null ? 0 : Integer.parseInt(m.group(3));
        return day.plusDays(plusDays).atTime(Integer.parseInt(m.group(1)) % 24, Integer.parseInt(m.group(2)));
    }

    private static String lastWord(String name) {
        if (name == null) return "";
        String[] parts = name.trim().split("\\s+");
        return parts[parts.length - 1];
    }
}
