package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin("*")
@RestController
public class RecommendationController {
    @Autowired
    private RecommendationService recommendationService;

    /** Suggestions for a traveller; without a user id the most popular items are returned. */
    @GetMapping("/recommendations")
    public Map<String, Object> recommend(@RequestParam(required = false) String userId,
                                         @RequestParam(defaultValue = "8") int limit,
                                         @RequestParam(required = false) String category) {
        return recommendationService.recommend(userId, Math.min(Math.max(limit, 1), 24), category);
    }

    /** verdict is HELPFUL or IRRELEVANT. */
    @PostMapping("/recommendations/feedback")
    public Map<String, Object> feedback(@RequestParam String userId, @RequestParam String category,
                                        @RequestParam String itemId, @RequestParam String verdict) {
        recommendationService.feedback(userId, category, itemId, verdict);
        return Map.of("saved", true);
    }

    @DeleteMapping("/recommendations/feedback")
    public Map<String, Object> clear(@RequestParam String userId, @RequestParam String category, @RequestParam String itemId) {
        recommendationService.clearFeedback(userId, category, itemId);
        return Map.of("cleared", true);
    }

    /** The page tells us what the traveller opened (type VIEW) or searched (type SEARCH). */
    @PostMapping("/activity")
    public Map<String, Object> activity(@RequestParam String userId, @RequestParam String type,
                                        @RequestParam(required = false) String category,
                                        @RequestParam(required = false) String itemId,
                                        @RequestParam(required = false) String query,
                                        @RequestParam(required = false) String source) {
        if (!"VIEW".equals(type) && !"SEARCH".equals(type)) return Map.of("recorded", false);
        recommendationService.record(userId, category, itemId, type, query, source);
        return Map.of("recorded", true);
    }

    @GetMapping("/admin/recommendations/stats")
    public Map<String, Object> stats(@RequestParam(required = false) String inspectUserId) {
        return recommendationService.stats(inspectUserId);
    }
}
