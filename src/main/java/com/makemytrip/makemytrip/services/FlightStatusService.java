package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightEventRepository;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

/**
 * Keeps one live status record per upcoming flight. The record is later moved along by
 * {@link MockFlightFeedService}, which plays the part of an airline's real-time feed.
 */
@Service
public class FlightStatusService {

    static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
    /** Flights departing within this many days (and those that left in the last hours) get a status entry. */
    private static final int DAYS_AHEAD = 3;
    private static final int HOURS_BEHIND = 8;
    static final String[] DELAY_REASONS = {
            "Air traffic congestion", "Weather conditions", "Late arrival of the incoming aircraft",
            "Technical check", "Crew availability", "Runway maintenance"};

    @Autowired
    private FlightStatusRepository flightStatusRepository;
    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private FlightEventRepository flightEventRepository;
    @Autowired
    private FlightEventService flightEventService;

    /** "ai-101", "AI 101" and "AI101" all find the same flight. */
    public static String normalize(String flightNumber) {
        return flightNumber == null ? "" : flightNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    public static String flightNumberOf(Flight f) {
        return normalize(lastWord(f.getFlightName()));
    }

    public Optional<FlightStatus> getFlightStatusByNumber(String flightNumber) {
        String number = normalize(flightNumber);
        Optional<FlightStatus> found = flightStatusRepository.findByFlightNumber(number);
        if (found.isPresent() || number.length() < 3) return found;
        // A flight further ahead than the live window: create its status the first time someone asks for it.
        String hyphenated = number.substring(0, 2) + "-" + number.substring(2);
        return flightRepository.findByFlightNameEndingWith(hyphenated).stream()
                .filter(f -> f.getDepartureTime() != null && f.getDepartureTime().compareTo(LocalDateTime.now().minusHours(HOURS_BEHIND).format(ISO)) >= 0)
                .findFirst()
                .map(this::ensureStatus);
    }

    /** The status of this flight, creating it if it does not exist yet. */
    public synchronized FlightStatus ensureStatus(Flight f) {
        String number = flightNumberOf(f);
        return flightStatusRepository.findByFlightNumber(number).orElseGet(() -> flightStatusRepository.save(create(f, true)));
    }

    /** The next flights about to depart, handy as search suggestions. */
    public List<FlightStatus> upcoming() {
        return flightStatusRepository.findTop12ByDerivedTrueAndScheduledDepartureGreaterThanOrderByScheduledDepartureAsc(
                LocalDateTime.now().format(ISO));
    }

    /** Rebuilds every status from scratch. */
    public synchronized List<FlightStatus> seedMockData() {
        flightStatusRepository.deleteAll();
        flightEventRepository.deleteAll();
        return syncFromFlights();
    }

    /**
     * Brings the statuses in line with the flight list without losing history: flights that are gone are removed,
     * flights in the live window that have no status yet get one, and everything else is left alone.
     */
    public synchronized List<FlightStatus> syncFromFlights() {
        LocalDateTime now = LocalDateTime.now();
        Map<String, Flight> wanted = new HashMap<>();
        for (Flight f : flightRepository.findByDepartureTimeBetween(
                now.minusHours(HOURS_BEHIND).format(ISO), now.plusDays(DAYS_AHEAD).format(ISO))) {
            String number = flightNumberOf(f);
            if (!number.isEmpty()) wanted.putIfAbsent(number, f);
        }

        Set<String> stale = new HashSet<>();
        Set<String> existing = new HashSet<>();
        for (FlightStatus s : flightStatusRepository.findByDerivedTrue()) {
            Flight f = wanted.get(s.getFlightNumber());
            boolean old = s.getScheduledDeparture() != null
                    && s.getScheduledDeparture().compareTo(now.minusHours(HOURS_BEHIND + 4).format(ISO)) < 0;
            if (f == null || s.getFlightId() == null || !s.getFlightId().equals(f.getId()) || old) {
                stale.add(s.getFlightNumber());
            } else {
                existing.add(s.getFlightNumber());
            }
        }
        if (!stale.isEmpty()) {
            flightStatusRepository.deleteByFlightNumberIn(stale);
            flightEventRepository.deleteByFlightNumberIn(stale);
        }

        List<FlightStatus> created = new ArrayList<>();
        for (Map.Entry<String, Flight> e : wanted.entrySet()) {
            if (existing.contains(e.getKey())) continue;
            if (flightStatusRepository.findByFlightNumber(e.getKey()).isPresent()) continue;
            created.add(create(e.getValue(), false));
        }
        List<FlightStatus> saved = flightStatusRepository.saveAll(created);
        // A small history so the timeline of an already-delayed flight is not empty.
        for (FlightStatus s : saved) {
            if (s.getDelayMinutes() > 0 && !"CANCELLED".equals(s.getPhase())) {
                flightEventService.recordDelay(s, "DELAY_ANNOUNCED", null, s.getDelayMinutes(), s.getDelayReason(), false);
            } else if ("CANCELLED".equals(s.getPhase())) {
                flightEventService.recordCancelled(s, s.getDelayReason(), false);
            }
        }
        return saved;
    }

    /** Builds the initial live record for a flight. A few flights start out delayed or cancelled, like real life. */
    private FlightStatus create(Flight f, boolean freshLookup) {
        String number = flightNumberOf(f);
        Random rnd = new Random(number.hashCode());
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime dep = LocalDateTime.parse(f.getDepartureTime(), ISO);

        FlightStatus s = new FlightStatus();
        s.setFlightNumber(number);
        s.setFlightName(airlineName(f.getFlightName()));
        s.setFlightId(f.getId());
        s.setFrom(f.getFrom());
        s.setTo(f.getTo());
        s.setScheduledDeparture(f.getDepartureTime());
        s.setScheduledArrival(f.getArrivalTime());
        s.setGate((char) ('A' + rnd.nextInt(6)) + String.valueOf(1 + rnd.nextInt(9)));
        s.setTerminal("T" + (1 + rnd.nextInt(3)));
        s.setDerived(true);
        s.setPhase("SCHEDULED");

        int roll = rnd.nextInt(100);
        if (dep.isAfter(now.plusHours(1)) && roll < 2) {
            s.setPhase("CANCELLED");
            s.setDelayReason("Operational reasons");
        } else if (roll < 14) {
            int[] options = {20, 30, 40, 45, 60, 75, 90, 120};
            s.setDelayMinutes(options[rnd.nextInt(options.length)]);
            s.setDelayReason(DELAY_REASONS[rnd.nextInt(DELAY_REASONS.length)]);
        }
        s.setUpdatedAt(now.format(ISO));
        refresh(s);
        advanceByClock(s, now);
        return s;
    }

    /** Sets the phase a flight should be in at this moment, without recording events (used for new records). */
    static void advanceByClock(FlightStatus s, LocalDateTime now) {
        if ("CANCELLED".equals(s.getPhase())) return;
        LocalDateTime estDep = LocalDateTime.parse(s.getEstimatedDeparture(), ISO);
        LocalDateTime estArr = LocalDateTime.parse(s.getEstimatedArrival(), ISO);
        if (!now.isBefore(estArr)) s.setPhase("LANDED");
        else if (!now.isBefore(estDep)) s.setPhase("DEPARTED");
        else if (!now.isBefore(estDep.minusMinutes(40))) s.setPhase("BOARDING");
        else s.setPhase("SCHEDULED");
        refresh(s);
    }

    /** Recomputes everything derived from the phase and the delay: estimated times, status text, display times. */
    public static void refresh(FlightStatus s) {
        LocalDateTime dep = LocalDateTime.parse(s.getScheduledDeparture(), ISO);
        LocalDateTime arr = LocalDateTime.parse(s.getScheduledArrival(), ISO);
        int delay = Math.max(0, s.getDelayMinutes());
        s.setEstimatedDeparture(dep.plusMinutes(delay).format(ISO));
        s.setEstimatedArrival(arr.plusMinutes(delay).format(ISO));
        s.setDepartureTime(dep.plusMinutes(delay).format(CLOCK));
        s.setArrivalTime(arr.plusMinutes(delay).format(CLOCK));
        String phase = s.getPhase() == null ? "SCHEDULED" : s.getPhase();
        s.setStatus(switch (phase) {
            case "CANCELLED" -> "Cancelled";
            case "LANDED" -> "Landed";
            case "DEPARTED" -> "Departed";
            case "BOARDING" -> "Boarding";
            default -> delay > 0 ? "Delayed" : "On Time";
        });
        s.setUpdatedAt(LocalDateTime.now().format(ISO));
    }

    private static String lastWord(String name) {
        if (name == null) return "";
        String[] parts = name.trim().split("\\s+");
        return parts[parts.length - 1];
    }

    private static String airlineName(String flightName) {
        if (flightName == null) return "";
        String last = lastWord(flightName);
        return flightName.substring(0, flightName.length() - last.length()).trim();
    }
}
