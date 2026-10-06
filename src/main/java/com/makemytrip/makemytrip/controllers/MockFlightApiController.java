package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.FlightEvent;
import com.makemytrip.makemytrip.models.FlightStatus;
import com.makemytrip.makemytrip.services.FlightEventService;
import com.makemytrip.makemytrip.services.FlightStatusService;
import com.makemytrip.makemytrip.services.MockFlightFeedService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * The mock airline operations API. A real system would receive these updates from an airline;
 * here the feed simulates them, and this API lets an operator (or a reviewer) trigger them by hand.
 */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/mock-api/flights")
public class MockFlightApiController {

    @Autowired
    private MockFlightFeedService feed;
    @Autowired
    private FlightStatusService statusService;
    @Autowired
    private FlightEventService eventService;

    /** Flights about to depart or just departed, for the operator's console. */
    @GetMapping("/board")
    public List<FlightStatus> board() {
        return feed.board();
    }

    @GetMapping("/{flightNumber}")
    public ResponseEntity<FlightStatus> status(@PathVariable String flightNumber) {
        return statusService.getFlightStatusByNumber(flightNumber).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** The flight's timeline, newest first. */
    @GetMapping("/{flightNumber}/events")
    public List<FlightEvent> events(@PathVariable String flightNumber) {
        return eventService.timeline(FlightStatusService.normalize(flightNumber));
    }

    /**
     * Triggers an operational change. Body: {"type": "DELAY|ADD_DELAY|CLEAR_DELAY|GATE_CHANGE|BOARDING|CANCEL",
     * "minutes": 60, "reason": "Weather conditions", "gate": "B4"}.
     */
    @PostMapping("/{flightNumber}/events")
    public ResponseEntity<FlightStatus> trigger(@PathVariable String flightNumber, @RequestBody Map<String, Object> body) {
        Integer minutes = body.get("minutes") == null ? null : Integer.valueOf(String.valueOf(body.get("minutes")));
        return feed.operate(flightNumber, String.valueOf(body.get("type")), minutes,
                        body.get("reason") == null ? null : String.valueOf(body.get("reason")),
                        body.get("gate") == null ? null : String.valueOf(body.get("gate")))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
