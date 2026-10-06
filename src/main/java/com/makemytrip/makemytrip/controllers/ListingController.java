package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

/** Public read access to homestays, holidays, trains, buses, cabs, forex and insurance. */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/listing")
public class ListingController {

    @Autowired
    private ListingRepository listingRepository;

    @GetMapping
    public List<Listing> list(@RequestParam(required = false) String category) {
        if (category == null || category.isBlank()) {
            return listingRepository.findAll();
        }
        return listingRepository.findByCategory(category.toUpperCase(Locale.ROOT));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Listing> get(@PathVariable String id) {
        return listingRepository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
