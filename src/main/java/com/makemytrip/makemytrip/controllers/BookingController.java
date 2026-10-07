package com.makemytrip.makemytrip.controllers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;

@CrossOrigin("*")
@RestController
@RequestMapping("/booking")
public class BookingController {
    @Autowired
    private BookingService bookingService;

    /** Generic booking for every category (FLIGHT, HOTEL, HOMESTAY, HOLIDAY, TRAIN, BUS, CAB, FOREX, INSURANCE). */
    @PostMapping
    public Users.Booking book(@RequestParam String userId,
                              @RequestParam String category,
                              @RequestParam String itemId,
                              @RequestParam(defaultValue = "1") int quantity,
                              @RequestParam(defaultValue = "1") int nights,
                              @RequestParam(required = false) String promo,
                              @RequestParam(required = false) String travelDate,
                              @RequestParam(required = false) String freezeId,
                              @RequestParam(required = false) Double expectedTotal){
        return bookingService.book(userId, category, itemId, quantity, nights, promo, travelDate, freezeId, expectedTotal);
    }

    @PostMapping("/cancel")
    public Users.Booking cancel(@RequestParam String userId, @RequestParam String reference){
        return bookingService.cancel(userId, reference);
    }

    // The two endpoints below are kept for older clients. Any "price" parameter is ignored:
    // the amount is always calculated on the server.
    @PostMapping("/flight")
    public Users.Booking bookFlight(@RequestParam String userId,@RequestParam String flightId,@RequestParam int seats,@RequestParam(required = false) String promo){
        return bookingService.bookFlight(userId,flightId,seats,promo);
    }
    @PostMapping("/hotel")
    public Users.Booking bookhotel (@RequestParam String userId,@RequestParam String hotelId,@RequestParam int rooms,@RequestParam(defaultValue = "1") int nights,@RequestParam(required = false) String promo){
        return bookingService.bookhotel(userId,hotelId,rooms,nights,promo);
    }
}
