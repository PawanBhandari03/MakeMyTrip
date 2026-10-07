package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.PricingRule;
import com.makemytrip.makemytrip.repositories.PricingRuleRepository;
import com.makemytrip.makemytrip.services.DynamicPricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/** Seasonal pricing rules, managed from the admin Pricing tab. A change applies to prices within seconds. */
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/admin/pricing-rules")
public class PricingRuleController {

    @Autowired
    private PricingRuleRepository repository;
    @Autowired
    private DynamicPricingService dynamicPricing;

    @GetMapping
    public List<PricingRule> list() {
        return repository.findAll();
    }

    @PostMapping
    public PricingRule add(@RequestBody PricingRule rule) {
        rule.setId(null);
        rule.setDemo(false);
        return save(rule);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PricingRule> edit(@PathVariable String id, @RequestBody PricingRule rule) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        rule.setId(id);
        return ResponseEntity.ok(save(rule));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        dynamicPricing.invalidateRules();
        return ResponseEntity.noContent().build();
    }

    private PricingRule save(PricingRule rule) {
        if (rule.getName() == null || rule.getName().isBlank()) throw new RuntimeException("Give the rule a name");
        try {
            LocalDate from = LocalDate.parse(rule.getStartDate());
            LocalDate to = LocalDate.parse(rule.getEndDate());
            if (to.isBefore(from)) throw new RuntimeException("The end date must not be before the start date");
        } catch (java.time.format.DateTimeParseException e) {
            throw new RuntimeException("Dates must look like 2026-12-25");
        }
        if (rule.getPercent() < -50 || rule.getPercent() > 100) throw new RuntimeException("The percentage must be between -50 and 100");
        rule.setCategory(rule.getCategory() == null || rule.getCategory().isBlank() ? "ALL" : rule.getCategory().toUpperCase(Locale.ROOT));
        PricingRule saved = repository.save(rule);
        dynamicPricing.invalidateRules();
        return saved;
    }
}
