package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.FlightTrackingService;
import com.makemytrip.makemytrip.services.FlightTrackingService.TrackedFlight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The flights a user follows. */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/tracking")
public class FlightTrackingController {

    @Autowired
    private FlightTrackingService trackingService;

    @GetMapping
    public List<TrackedFlight> list(@RequestParam String userId) {
        return trackingService.list(userId);
    }

    /** One flight with its timeline; {@code tracked} says whether this user follows it. */
    @GetMapping("/flight")
    public ResponseEntity<TrackedFlight> one(@RequestParam(required = false) String userId, @RequestParam String flightNumber) {
        return trackingService.one(userId, flightNumber).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public TrackedFlight track(@RequestParam String userId, @RequestParam String flightNumber) {
        return trackingService.track(userId, flightNumber, "MANUAL");
    }

    @DeleteMapping
    public ResponseEntity<Void> untrack(@RequestParam String userId, @RequestParam String flightNumber) {
        trackingService.untrack(userId, flightNumber);
        return ResponseEntity.noContent().build();
    }
}
