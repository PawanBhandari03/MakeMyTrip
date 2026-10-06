package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.PricingService;
import com.makemytrip.makemytrip.services.PricingService.Promo;
import com.makemytrip.makemytrip.services.PricingService.Quote;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*")
public class PricingController {

    @Autowired
    private PricingService pricingService;

    /** Price breakdown for an item, optionally with a promo code applied. */
    @GetMapping("/pricing/quote")
    public Quote quote(@RequestParam String category,
                       @RequestParam String itemId,
                       @RequestParam(defaultValue = "1") int quantity,
                       @RequestParam(defaultValue = "1") int nights,
                       @RequestParam(required = false) String promo) {
        return pricingService.quote(category, itemId, quantity, nights, promo);
    }

    /** Promo codes that can be used, optionally only those valid for one category. */
    @GetMapping("/promos")
    public List<Promo> promos(@RequestParam(required = false) String category) {
        return pricingService.promos(category);
    }
}
