package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.BookingStatusService;
import com.makemytrip.makemytrip.services.BookingStatusService.StatusInfo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/status")
public class BookingStatusController {

    @Autowired
    private BookingStatusService bookingStatusService;

    /** Live status of a booked flight, train or bus. Other categories return 404. */
    @GetMapping("/booking")
    public ResponseEntity<StatusInfo> bookingStatus(@RequestParam String category,
                                                    @RequestParam String itemId,
                                                    @RequestParam(required = false) String travelDate) {
        return bookingStatusService.status(category, itemId, travelDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
