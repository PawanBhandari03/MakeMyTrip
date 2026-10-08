package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.services.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin("*")
@RestController
public class ReviewController {
    @Autowired
    private ReviewService reviewService;

    /** Reviews of one item, with the rating summary. sort: helpful, newest, highest or lowest. */
    @GetMapping("/reviews")
    public Map<String, Object> list(@RequestParam String category, @RequestParam String itemId,
                                    @RequestParam(defaultValue = "helpful") String sort,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "6") int size,
                                    @RequestParam(required = false) String userId) {
        return reviewService.list(category, itemId, sort, page, Math.min(Math.max(size, 1), 20), userId);
    }

    @PostMapping("/reviews")
    public Review save(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> photos = body.get("photos") instanceof List<?> l ? (List<String>) l : null;
        return reviewService.save(
                String.valueOf(body.get("userId")),
                String.valueOf(body.get("category")),
                String.valueOf(body.get("itemId")),
                body.get("rating") instanceof Number n ? n.intValue() : 0,
                (String) body.get("title"),
                (String) body.get("text"),
                photos);
    }

    @DeleteMapping("/reviews/{id}")
    public void delete(@PathVariable String id, @RequestParam String userId) {
        reviewService.delete(userId, id);
    }

    @PostMapping("/reviews/{id}/helpful")
    public Map<String, Object> helpful(@PathVariable String id, @RequestParam String userId) {
        Review r = reviewService.toggleHelpful(userId, id);
        return Map.of("helpfulCount", r.getHelpfulCount(), "helpfulByMe", r.getHelpfulBy().contains(userId));
    }

    @PostMapping("/reviews/{id}/reply")
    public Review reply(@PathVariable String id, @RequestParam String userId, @RequestBody Map<String, String> body) {
        return reviewService.reply(userId, id, body.get("text"));
    }

    @PostMapping("/reviews/{id}/flag")
    public Map<String, Object> flag(@PathVariable String id, @RequestParam String userId, @RequestParam(required = false) String reason) {
        Review r = reviewService.flag(userId, id, reason);
        return Map.of("flagged", true, "hidden", !"PUBLISHED".equals(r.getStatus()));
    }

    @GetMapping("/reviews/flag-reasons")
    public List<String> flagReasons() {
        return ReviewService.FLAG_REASONS;
    }

    // ---- moderation (admin page)

    @GetMapping("/admin/reviews")
    public List<Map<String, Object>> queue(@RequestParam(defaultValue = "FLAGGED") String filter) {
        return reviewService.queue(filter);
    }

    @GetMapping("/admin/reviews/stats")
    public Map<String, Object> stats() {
        return reviewService.stats();
    }

    @PostMapping("/admin/reviews/{id}/moderate")
    public Review moderate(@PathVariable String id, @RequestParam String action, @RequestParam(required = false) String note) {
        return reviewService.moderate(id, action, note);
    }
}
