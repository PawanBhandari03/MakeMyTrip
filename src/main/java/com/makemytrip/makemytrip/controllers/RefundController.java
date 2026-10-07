package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Refund;
import com.makemytrip.makemytrip.services.RefundPolicyService;
import com.makemytrip.makemytrip.services.RefundService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin("*")
@RestController
public class RefundController {
    @Autowired
    private RefundService refundService;

    /** The rules shown on the policy page and in the cancel dialog. */
    @GetMapping("/cancellation/policy")
    public Map<String, Object> policy() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reasons", RefundPolicyService.REASONS);
        out.put("tiers", List.of(
                Map.of("label", "Within 24 hours of booking", "percent", 50),
                Map.of("label", "More than 48 hours before travel", "percent", 25),
                Map.of("label", "Less than 48 hours before travel", "percent", 10),
                Map.of("label", "After travel has started", "percent", 0),
                Map.of("label", "Cancelled by the airline", "percent", 100)));
        out.put("fees", Map.of("FLIGHT", 249, "TRAIN", 35, "BUS", 20));
        return out;
    }

    @GetMapping("/refunds")
    public List<Refund> mine(@RequestParam String userId) {
        return refundService.forUser(userId);
    }

    @GetMapping("/admin/refunds")
    public List<Refund> all() {
        return refundService.all();
    }

    @GetMapping("/admin/refunds/stats")
    public Map<String, Object> stats() {
        return refundService.stats();
    }

    @PostMapping("/admin/refunds/{id}/advance")
    public Refund advance(@PathVariable String id) {
        return refundService.advance(id);
    }
}
