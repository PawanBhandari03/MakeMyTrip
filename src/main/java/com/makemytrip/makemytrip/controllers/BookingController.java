package com.makemytrip.makemytrip.controllers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.services.BookingService;
import com.makemytrip.makemytrip.services.RefundPolicyService;
import java.util.LinkedHashMap;
import java.util.Map;

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

    /** Cancels a booking, or only some of its seats, rooms or tickets, and opens a refund. */
    @PostMapping("/cancel")
    public Map<String, Object> cancel(@RequestParam String userId, @RequestParam String reference,
                                      @RequestParam(required = false) String reason,
                                      @RequestParam(required = false) String note,
                                      @RequestParam(defaultValue = "0") int quantity){
        BookingService.CancelResult r = bookingService.cancel(userId, reference, reason, note, quantity);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("booking", r.getBooking());
        out.put("refund", r.getRefund());
        out.put("summary", r.getPreview());
        return out;
    }

    /** The refund the customer would get, and why, before they confirm. */
    @GetMapping("/cancel/preview")
    public RefundPolicyService.Preview preview(@RequestParam String userId, @RequestParam String reference,
                                               @RequestParam(defaultValue = "0") int quantity){
        return bookingService.previewCancel(userId, reference, quantity);
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
