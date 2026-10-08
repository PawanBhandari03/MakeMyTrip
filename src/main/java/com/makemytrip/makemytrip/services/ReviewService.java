package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import com.makemytrip.makemytrip.repositories.ReviewRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Ratings and reviews for every kind of item: stars, text, photos, helpful votes, replies and flagging.
 * A review flagged by {@link #HIDE_AFTER_FLAGS} different people is hidden until an admin decides.
 */
@Service
public class ReviewService {
    public static final int HIDE_AFTER_FLAGS = 3;
    public static final List<String> FLAG_REASONS = List.of("Spam or fake", "Offensive language", "Not about this item", "Personal information", "Other");
    private static final int MAX_PHOTOS = 3;
    private static final int MAX_PHOTO_CHARS = 450_000;
    private static final Set<String> BLOCKED = Set.of("idiot", "stupid", "scam artist", "fuck", "shit", "bastard", "bitch");

    @Autowired
    private ReviewRepository repository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private MongoTemplate mongoTemplate;
    @Autowired
    private com.makemytrip.makemytrip.config.CatalogCache catalogCache;

    /** A review as the viewer sees it. */
    @Getter
    @Setter
    public static class View {
        private Review review;
        private boolean mine;
        private boolean helpfulByMe;
        private boolean flaggedByMe;
    }

    // ------------------------------------------------------------------ reading

    public Map<String, Object> list(String category, String itemId, String sort, int page, int size, String viewerId) {
        String cat = category.toUpperCase(Locale.ROOT);
        List<Review> all = new ArrayList<>(repository.findByCategoryAndItemIdAndStatus(cat, itemId, "PUBLISHED"));
        Comparator<Review> byNewest = Comparator.comparing(Review::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())).reversed();
        Comparator<Review> order = switch (sort == null ? "helpful" : sort) {
            case "newest" -> byNewest;
            case "highest" -> Comparator.comparingInt(Review::getRating).reversed().thenComparing(Comparator.comparingInt(Review::getHelpfulCount).reversed()).thenComparing(byNewest);
            case "lowest" -> Comparator.comparingInt(Review::getRating).thenComparing(byNewest);
            default -> Comparator.comparingInt(Review::getHelpfulCount).reversed().thenComparing(byNewest);
        };
        all.sort(order);

        int from = Math.min(Math.max(0, page) * size, all.size());
        List<View> items = new ArrayList<>();
        for (Review r : all.subList(from, Math.min(all.size(), from + size))) items.add(view(r, viewerId));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("summary", summary(all));
        out.put("items", items);
        out.put("total", all.size());
        out.put("page", page);
        out.put("hasMore", from + size < all.size());
        if (viewerId != null && !viewerId.isBlank()) {
            repository.findFirstByUserIdAndCategoryAndItemIdAndStatusNot(viewerId, cat, itemId, "REMOVED")
                    .ifPresent(r -> out.put("mine", view(r, viewerId)));
        }
        return out;
    }

    private Map<String, Object> summary(List<Review> published) {
        int[] dist = new int[6];
        double sum = 0;
        int photos = 0;
        for (Review r : published) {
            dist[Math.min(5, Math.max(1, r.getRating()))]++;
            sum += r.getRating();
            if (r.getPhotos() != null && !r.getPhotos().isEmpty()) photos++;
        }
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("count", published.size());
        s.put("average", published.isEmpty() ? 0 : Math.round(sum / published.size() * 10) / 10.0);
        Map<String, Integer> d = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) d.put(String.valueOf(i), dist[i]);
        s.put("distribution", d);
        s.put("withPhotos", photos);
        return s;
    }

    private View view(Review r, String viewerId) {
        View v = new View();
        v.setReview(r);
        boolean has = viewerId != null && !viewerId.isBlank();
        v.setMine(has && viewerId.equals(r.getUserId()));
        v.setHelpfulByMe(has && r.getHelpfulBy().contains(viewerId));
        v.setFlaggedByMe(has && r.getFlags().stream().anyMatch(f -> viewerId.equals(f.getUserId())));
        return v;
    }

    // ------------------------------------------------------------------ writing

    /** Adds a review, or replaces the customer's earlier review of the same item. */
    public Review save(String userId, String category, String itemId, int rating, String title, String text, List<String> photos) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Please log in to write a review"));
        String cat = category.toUpperCase(Locale.ROOT);
        String itemName = itemName(cat, itemId);

        if (rating < 1 || rating > 5) throw new RuntimeException("Please choose 1 to 5 stars");
        String t = title == null ? "" : title.trim();
        String body = text == null ? "" : text.trim();
        if (body.length() < 10) throw new RuntimeException("Please write at least a sentence (10 characters) about your experience");
        if (body.length() > 1500) throw new RuntimeException("Please keep your review under 1,500 characters");
        if (t.length() > 80) throw new RuntimeException("Please keep the title under 80 characters");
        checkLanguage(t + " " + body);
        List<String> pics = new ArrayList<>();
        if (photos != null) {
            for (String p : photos) {
                if (p == null || p.isBlank()) continue;
                if (!p.startsWith("data:image/")) throw new RuntimeException("Only image files can be attached");
                if (p.length() > MAX_PHOTO_CHARS) throw new RuntimeException("One of the photos is too large");
                pics.add(p);
            }
            if (pics.size() > MAX_PHOTOS) throw new RuntimeException("You can attach up to " + MAX_PHOTOS + " photos");
        }

        Review r = repository.findFirstByUserIdAndCategoryAndItemIdAndStatusNot(userId, cat, itemId, "REMOVED").orElse(null);
        String now = now();
        if (r == null) {
            r = new Review();
            r.setUserId(userId);
            r.setCategory(cat);
            r.setItemId(itemId);
            r.setCreatedAt(now);
        }
        r.setUserName(displayName(user));
        r.setItemName(itemName);
        r.setRating(rating);
        r.setTitle(t);
        r.setText(body);
        r.setPhotos(pics);
        r.setUpdatedAt(now);
        r.setVerified(hasBooking(user, cat, itemId));
        r = repository.save(r);
        syncRating(cat, itemId);
        return r;
    }

    public void delete(String userId, String reviewId) {
        Review r = get(reviewId);
        Users user = userRepository.findById(userId).orElse(null);
        boolean admin = user != null && "ADMIN".equals(user.getRole());
        if (!admin && !userId.equals(r.getUserId())) throw new RuntimeException("You can only delete your own review");
        repository.delete(r);
        syncRating(r.getCategory(), r.getItemId());
    }

    /** Adds the customer's "helpful" vote, or takes it back if they had already voted. */
    public Review toggleHelpful(String userId, String reviewId) {
        Review r = get(reviewId);
        if (userId.equals(r.getUserId())) throw new RuntimeException("You cannot vote on your own review");
        if (!r.getHelpfulBy().remove(userId)) r.getHelpfulBy().add(userId);
        r.setHelpfulCount(r.getHelpfulBy().size() + r.getHelpfulBaseline());
        return repository.save(r);
    }

    public Review reply(String userId, String reviewId, String text) {
        Users user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Please log in to reply"));
        String body = text == null ? "" : text.trim();
        if (body.length() < 2) throw new RuntimeException("Please write a reply");
        if (body.length() > 600) throw new RuntimeException("Please keep replies under 600 characters");
        checkLanguage(body);
        Review r = get(reviewId);
        boolean admin = "ADMIN".equals(user.getRole());
        Review.Reply reply = new Review.Reply();
        reply.setId(UUID.randomUUID().toString().substring(0, 8));
        reply.setUserId(userId);
        reply.setUserName(admin ? "MakeMyTrip team" : displayName(user));
        reply.setRole(admin ? "ADMIN" : "USER");
        reply.setText(body);
        reply.setCreatedAt(now());
        r.getReplies().add(reply);
        repository.save(r);
        if (!userId.equals(r.getUserId())) {
            notify(r.getUserId(), "REVIEW_REPLY", "New reply to your review",
                    reply.getUserName() + " replied to your review of " + r.getItemName() + ": \"" + shorten(body, 90) + "\"", pathOf(r.getCategory(), r.getItemId()));
        }
        return r;
    }

    /** Reports a review. Enough different reports hide it until a moderator looks at it. */
    public Review flag(String userId, String reviewId, String reason) {
        userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Please log in to report a review"));
        Review r = get(reviewId);
        if (userId.equals(r.getUserId())) throw new RuntimeException("You cannot report your own review");
        if (r.getFlags().stream().anyMatch(f -> userId.equals(f.getUserId()))) throw new RuntimeException("You have already reported this review");
        Review.Flag f = new Review.Flag();
        f.setUserId(userId);
        f.setReason(reason == null || reason.isBlank() ? "Other" : reason);
        f.setCreatedAt(now());
        r.getFlags().add(f);
        r.setFlagCount(r.getFlags().size());
        if ("PUBLISHED".equals(r.getStatus()) && r.getFlagCount() >= HIDE_AFTER_FLAGS) {
            r.setStatus("UNDER_REVIEW");
        }
        repository.save(r);
        if ("UNDER_REVIEW".equals(r.getStatus())) syncRating(r.getCategory(), r.getItemId());
        return r;
    }

    // ------------------------------------------------------------------ moderation

    public List<Map<String, Object>> queue(String filter) {
        List<Review> rows = switch (filter == null ? "FLAGGED" : filter) {
            case "ALL" -> repository.findTop200ByOrderByCreatedAtDesc();
            case "REMOVED" -> repository.findTop200ByStatusOrderByFlagCountDescCreatedAtDesc("REMOVED");
            case "HIDDEN" -> repository.findTop200ByStatusOrderByFlagCountDescCreatedAtDesc("UNDER_REVIEW");
            default -> repository.findTop200ByFlagCountGreaterThanOrderByFlagCountDescCreatedAtDesc(0);
        };
        List<Map<String, Object>> out = new ArrayList<>();
        for (Review r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("review", r);
            m.put("flags", r.getFlags());
            out.add(m);
        }
        return out;
    }

    /** action: KEEP (dismiss the reports), REMOVE (take it down) or RESTORE (put a removed review back). */
    public Review moderate(String reviewId, String action, String note) {
        Review r = get(reviewId);
        switch (action == null ? "" : action.toUpperCase(Locale.ROOT)) {
            case "KEEP" -> {
                r.setStatus("PUBLISHED");
                r.getFlags().clear();
                r.setFlagCount(0);
                r.setModerationNote("Reports reviewed: the review follows our guidelines");
            }
            case "REMOVE" -> {
                r.setStatus("REMOVED");
                r.setModerationNote(note == null || note.isBlank() ? "Removed by a moderator" : note.trim());
                notify(r.getUserId(), "REVIEW_REMOVED", "Your review was removed",
                        "Your review of " + r.getItemName() + " was taken down because it did not follow our review guidelines.", pathOf(r.getCategory(), r.getItemId()));
            }
            case "RESTORE" -> {
                r.setStatus("PUBLISHED");
                r.getFlags().clear();
                r.setFlagCount(0);
                r.setModerationNote("Restored by a moderator");
            }
            default -> throw new RuntimeException("Unknown moderation action");
        }
        repository.save(r);
        syncRating(r.getCategory(), r.getItemId());
        return r;
    }

    public Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", repository.count());
        m.put("published", repository.countByStatus("PUBLISHED"));
        m.put("hidden", repository.countByStatus("UNDER_REVIEW"));
        m.put("removed", repository.countByStatus("REMOVED"));
        m.put("flagged", repository.findTop200ByFlagCountGreaterThanOrderByFlagCountDescCreatedAtDesc(0).size());
        return m;
    }

    // ------------------------------------------------------------------ helpers

    /** Keeps the rating shown on search cards equal to the average of the published reviews. */
    public void syncRating(String category, String itemId) {
        List<Review> published = repository.findByCategoryAndItemIdAndStatus(category, itemId, "PUBLISHED");
        if (published.isEmpty()) return;
        double avg = Math.round(published.stream().mapToInt(Review::getRating).average().orElse(0) * 10) / 10.0;
        Query q = Query.query(Criteria.where("_id").is(itemId));
        Update u = new Update().set("rating", avg);
        catalogCache.markStale();
        switch (category) {
            case "HOTEL" -> mongoTemplate.updateFirst(q, u, Hotel.class);
            case "FLIGHT" -> { /* flights have no rating field */ }
            default -> mongoTemplate.updateFirst(q, u, Listing.class);
        }
    }

    private static String pathOf(String category, String itemId) {
        String base = switch (category) {
            case "HOTEL" -> "/book-hotel/";
            case "FLIGHT" -> "/book-flight/";
            default -> "/book/";
        };
        return base + itemId + "#reviews";
    }

    private Review get(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Review not found"));
    }

    private String itemName(String category, String itemId) {
        return switch (category) {
            case "HOTEL" -> hotelRepository.findById(itemId).map(h -> h.gethotelName() + ", " + h.getLocation()).orElseThrow(() -> new RuntimeException("We could not find that hotel"));
            case "FLIGHT" -> flightRepository.findById(itemId).map(f -> f.getFlightName() + " · " + f.getFrom() + " → " + f.getTo()).orElseThrow(() -> new RuntimeException("We could not find that flight"));
            default -> listingRepository.findById(itemId).map(Listing::getName).orElseThrow(() -> new RuntimeException("We could not find that item"));
        };
    }

    private boolean hasBooking(Users user, String category, String itemId) {
        return user.getBookings().stream().anyMatch(b -> b != null && itemId.equals(b.getBookingId()) && category.equalsIgnoreCase(b.getCategory())
                && !"CANCELLED".equals(b.getStatus()));
    }

    private void checkLanguage(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        for (String bad : BLOCKED) {
            if (lower.contains(bad)) throw new RuntimeException("Please keep your review respectful and free of abusive language");
        }
    }

    public static String displayName(Users u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last = u.getLastName() == null ? "" : u.getLastName().trim();
        String name = (first + (last.isEmpty() ? "" : " " + last.charAt(0) + ".")).trim();
        return name.isEmpty() ? "Traveller" : name;
    }

    private void notify(String userId, String type, String title, String message, String ref) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setFlightNumber(ref);
        n.setCreatedAt(now());
        notificationRepository.save(n);
    }

    private static String shorten(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static String now() {
        return LocalDateTime.now().withNano(0).toString();
    }
}
