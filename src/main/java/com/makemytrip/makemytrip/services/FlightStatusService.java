package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class FlightStatusService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("hh:mm a");
    /** Flights departing within this many days get a status entry. */
    private static final int DAYS_AHEAD = 3;

    @Autowired
    private FlightStatusRepository flightStatusRepository;
    @Autowired
    private FlightRepository flightRepository;

    /** "ai-101", "AI 101" and "AI101" all find the same flight. */
    public static String normalize(String flightNumber) {
        return flightNumber == null ? "" : flightNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    public Optional<FlightStatus> getFlightStatusByNumber(String flightNumber) {
        return flightStatusRepository.findByFlightNumber(normalize(flightNumber));
    }

    /** The next flights about to depart, handy as search suggestions. */
    public List<FlightStatus> upcoming() {
        return flightStatusRepository.findTop12ByDerivedTrueAndScheduledDepartureGreaterThanOrderByScheduledDepartureAsc(
                LocalDateTime.now().format(ISO));
    }

    public List<FlightStatus> seedMockData() {
        flightStatusRepository.deleteAll(); // Clear existing for a clean slate

        FlightStatus f1 = new FlightStatus("AI101", "Air India", "On Time", "10:00 AM", "12:30 PM", "A1", "T1", "");
        FlightStatus f2 = new FlightStatus("IN202", "IndiGo", "Boarding", "11:15 AM", "02:00 PM", "B3", "T2", "");
        FlightStatus f3 = new FlightStatus("SJ303", "SpiceJet", "Delayed", "01:00 PM", "03:45 PM", "C2", "T1", "Weather conditions");
        FlightStatus f4 = new FlightStatus("UK404", "Vistara", "On Time", "04:30 PM", "06:15 PM", "D4", "T3", "");

        List<FlightStatus> saved = new ArrayList<>(flightStatusRepository.saveAll(List.of(f1, f2, f3, f4)));
        saved.addAll(syncFromFlights());
        return saved;
    }

    /**
     * Creates a status entry for every flight leaving in the next few days, so the live-status page
     * works for any flight a customer has seen in search. Only entries flagged {@code derived} are replaced.
     */
    public List<FlightStatus> syncFromFlights() {
        flightStatusRepository.deleteByDerivedTrue();
        String now = LocalDateTime.now().format(ISO);
        String until = LocalDateTime.now().plusDays(DAYS_AHEAD).format(ISO);
        List<FlightStatus> out = new ArrayList<>();
        for (Flight f : flightRepository.findByDepartureTimeBetween(now, until)) {
            String number = normalize(lastWord(f.getFlightName()));
            if (number.isEmpty() || flightStatusRepository.findByFlightNumber(number).isPresent()) continue;
            Random rnd = new Random(number.hashCode());
            LocalDateTime dep = LocalDateTime.parse(f.getDepartureTime(), ISO);
            LocalDateTime arr = LocalDateTime.parse(f.getArrivalTime(), ISO);

            String status = "On Time";
            String reason = "";
            int roll = rnd.nextInt(100);
            if (roll < 12) {
                status = "Delayed";
                String[] reasons = {"Weather conditions", "Air traffic", "Technical issue", "Late incoming aircraft"};
                reason = reasons[rnd.nextInt(reasons.length)];
            } else if (roll < 14) {
                status = "Cancelled";
                reason = "Operational reasons";
            } else if (dep.isBefore(LocalDateTime.now().plusHours(1))) {
                status = "Boarding";
            }

            FlightStatus s = new FlightStatus(number, airlineName(f.getFlightName()), status,
                    dep.format(CLOCK), arr.format(CLOCK),
                    (char) ('A' + rnd.nextInt(6)) + String.valueOf(1 + rnd.nextInt(9)),
                    "T" + (1 + rnd.nextInt(3)), reason);
            s.setFrom(f.getFrom());
            s.setTo(f.getTo());
            s.setScheduledDeparture(f.getDepartureTime());
            s.setDerived(true);
            out.add(s);
        }
        return flightStatusRepository.saveAll(out);
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

    // Mock real-time updates every 15 seconds
    @Scheduled(fixedRate = 15000)
    public void mockRealTimeUpdates() {
        long total = flightStatusRepository.count();
        if (total == 0) return;

        Random random = new Random();
        String[] statuses = {"On Time", "On Time", "On Time", "Boarding", "Delayed", "Cancelled", "Landed"};
        String[] reasons = {"", "", "Weather conditions", "Technical issue", "Air traffic"};

        // Update one random flight's status to simulate live changes
        int randomIndex = random.nextInt((int) Math.min(total, Integer.MAX_VALUE));
        List<FlightStatus> page = flightStatusRepository.findAll(PageRequest.of(randomIndex, 1)).getContent();
        if (page.isEmpty()) return;
        FlightStatus flightToUpdate = page.get(0);

        String newStatus = statuses[random.nextInt(statuses.length)];
        flightToUpdate.setStatus(newStatus);

        if ("Delayed".equals(newStatus) || "Cancelled".equals(newStatus)) {
            flightToUpdate.setDelayReason(reasons[random.nextInt(reasons.length)]);
        } else {
            flightToUpdate.setDelayReason("");
        }

        flightStatusRepository.save(flightToUpdate);
    }
}
