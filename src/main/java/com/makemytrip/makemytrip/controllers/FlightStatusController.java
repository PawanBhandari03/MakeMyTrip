package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.services.FlightStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/flight-status")
public class FlightStatusController {

    @Autowired
    private FlightStatusService flightStatusService;

    /** The next flights about to depart; used for search suggestions. */
    @GetMapping("/upcoming")
    public List<FlightStatus> upcoming() {
        return flightStatusService.upcoming();
    }

    @GetMapping("/{flightNumber}")
    public ResponseEntity<FlightStatus> getFlightStatus(@PathVariable String flightNumber) {
        Optional<FlightStatus> status = flightStatusService.getFlightStatusByNumber(flightNumber);
        return status.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/seed")
    public ResponseEntity<List<FlightStatus>> seedData() {
        return ResponseEntity.ok(flightStatusService.seedMockData());
    }
}
