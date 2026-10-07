package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.DynamicPricingService.Result;
import com.makemytrip.makemytrip.services.PriceHistoryService;
import com.makemytrip.makemytrip.services.PriceHistoryService.History;
import com.makemytrip.makemytrip.services.PricingService;
import com.makemytrip.makemytrip.services.PricingService.Promo;
import com.makemytrip.makemytrip.services.PricingService.Quote;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class PricingController {

    @Autowired
    private PricingService pricingService;
    @Autowired
    private PriceHistoryService historyService;

    /** Price breakdown for an item, optionally with a promo code and a price freeze applied. */
    @GetMapping("/pricing/quote")
    public Quote quote(@RequestParam String category,
                       @RequestParam String itemId,
                       @RequestParam(defaultValue = "1") int quantity,
                       @RequestParam(defaultValue = "1") int nights,
                       @RequestParam(required = false) String promo,
                       @RequestParam(required = false) String travelDate,
                       @RequestParam(required = false) String userId,
                       @RequestParam(required = false) String freezeId) {
        return pricingService.quote(category, itemId, quantity, nights, promo, travelDate, userId, freezeId);
    }

    /**
     * Live prices for the items on screen, so search results stay current. {@code ids} is a comma separated list
     * (up to 60); {@code date} is the travel or check-in date for items whose price depends on it.
     */
    @GetMapping("/pricing/prices")
    public Map<String, Result> prices(@RequestParam String category,
                                      @RequestParam String ids,
                                      @RequestParam(required = false) String date) {
        List<String> list = Arrays.stream(ids.split(",")).map(String::trim).filter(s -> !s.isEmpty()).distinct().limit(60).toList();
        return pricingService.prices(category, list, date);
    }

    /** Price history and forecast for one item and travel date. */
    @GetMapping("/pricing/history")
    public ResponseEntity<History> history(@RequestParam String category,
                                           @RequestParam String itemId,
                                           @RequestParam(required = false) String date,
                                           @RequestParam(defaultValue = "30") int days) {
        return historyService.history(category, itemId, PricingService.parseDate(date), days)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Promo codes that can be used, optionally only those valid for one category. */
    @GetMapping("/promos")
    public List<Promo> promos(@RequestParam(required = false) String category) {
        return pricingService.promos(category);
    }
}
