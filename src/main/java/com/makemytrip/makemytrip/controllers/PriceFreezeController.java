package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.PriceFreezeService;
import com.makemytrip.makemytrip.services.PriceFreezeService.Option;
import com.makemytrip.makemytrip.services.PriceFreezeService.View;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Price freeze: lock a price for a limited time. */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/price-freeze")
public class PriceFreezeController {

    @Autowired
    private PriceFreezeService freezeService;

    /** What a freeze would cost for this booking, for 6, 24 and 48 hours. */
    @GetMapping("/options")
    public List<Option> options(@RequestParam String category,
                                @RequestParam String itemId,
                                @RequestParam(defaultValue = "1") int quantity,
                                @RequestParam(defaultValue = "1") int nights,
                                @RequestParam(required = false) String travelDate) {
        return freezeService.options(category, itemId, quantity, nights, travelDate);
    }

    @PostMapping
    public View create(@RequestParam String userId,
                       @RequestParam String category,
                       @RequestParam String itemId,
                       @RequestParam(defaultValue = "1") int quantity,
                       @RequestParam(defaultValue = "1") int nights,
                       @RequestParam(required = false) String travelDate,
                       @RequestParam int hours) {
        return freezeService.create(userId, category, itemId, quantity, nights, travelDate, hours);
    }

    @GetMapping
    public List<View> list(@RequestParam String userId) {
        return freezeService.list(userId);
    }

    /** The customer's live freeze for exactly this booking, or 404. */
    @GetMapping("/active")
    public ResponseEntity<View> active(@RequestParam String userId,
                                       @RequestParam String category,
                                       @RequestParam String itemId,
                                       @RequestParam(required = false) String travelDate) {
        return freezeService.active(userId, category, itemId, travelDate)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
