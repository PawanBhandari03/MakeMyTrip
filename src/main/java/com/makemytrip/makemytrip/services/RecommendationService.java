package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Interaction;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.RecommendationFeedback;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.InteractionRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.RecommendationFeedbackRepository;
import com.makemytrip.makemytrip.repositories.ReviewRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Personalised suggestions.
 *
 * <p>Each candidate (a hotel, homestay, holiday package or flight) is scored on four things:
 * <ul>
 *   <li><b>Your history</b>: places, kinds of trip and amenities you booked, reviewed, searched or viewed;</li>
 *   <li><b>Similar travellers</b>: collaborative filtering, "people who chose X also chose this", from how often
 *       items appear together in different travellers' histories;</li>
 *   <li><b>Quality</b>: ratings, weighed by how many reviews back them;</li>
 *   <li><b>Budget</b>: how close the price is to what you usually pick.</li>
 * </ul>
 * Your "helpful" and "not relevant" answers then raise or lower similar suggestions. Every suggestion carries the
 * reasons behind it, so the page can explain why it was chosen.
 */
@Service
public class RecommendationService {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final Set<String> STAYS = Set.of("HOTEL", "HOMESTAY", "HOLIDAY");
    private static final long CATALOG_TTL_MS = 120_000;
    private static final long MODEL_TTL_MS = 300_000;

    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private InteractionRepository interactionRepository;
    @Autowired
    private RecommendationFeedbackRepository feedbackRepository;

    // ------------------------------------------------------------------ small types

    /** Something that can be suggested. */
    public record Cand(String category, String id, String name, String destination, String location, String imageUrl, double price,
                       String unit, double rating, Set<String> tags, String description, int available, String departureTime) {
        String key() {
            return category + ":" + id;
        }
    }

    /** What we know about one traveller. */
    static class Profile {
        final Map<String, Double> items = new HashMap<>();        // key -> strength
        final Map<String, Double> dest = new HashMap<>();         // destination -> strength
        final Map<String, int[]> evidence = new HashMap<>();      // destination -> [booked, reviewed, searched, viewed]
        final Map<String, Double> cats = new HashMap<>();         // category -> strength
        final Map<String, Double> tokens = new HashMap<>();       // amenity -> strength
        final Map<String, List<Double>> prices = new HashMap<>(); // category -> prices they chose
        final Set<String> avoid = new HashSet<>();                // item keys they rated badly
        boolean booked;

        boolean personalised() {
            return !items.isEmpty() || !dest.isEmpty();
        }
    }

    /** Item-to-item similarity and review statistics, rebuilt every few minutes. */
    static class Model {
        final Map<String, Map<String, double[]>> sim = new HashMap<>(); // key -> key -> [cosine, travellers who chose both]
        final Map<String, double[]> reviews = new HashMap<>();          // key -> [count, average]
        long builtAt;
        int travellers;
    }

    private volatile Map<String, Cand> catalog = Map.of();
    private volatile Map<String, List<Cand>> flightsByDest = Map.of();
    private volatile long catalogAt;
    private volatile Model model = new Model();

    // ------------------------------------------------------------------ catalogue

    private final java.util.concurrent.ExecutorService refresher = java.util.concurrent.Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "recommendation-refresh");
        t.setDaemon(true);
        return t;
    });
    private final java.util.concurrent.atomic.AtomicBoolean refreshingCatalog = new java.util.concurrent.atomic.AtomicBoolean();
    private final java.util.concurrent.atomic.AtomicBoolean refreshingModel = new java.util.concurrent.atomic.AtomicBoolean();

    /**
     * Makes sure a catalogue is available. The very first caller builds it; after that an out-of-date copy is still
     * used straight away while a new one is built in the background, so no visitor waits for a rebuild.
     */
    private void loadCatalog() {
        if (catalog.isEmpty()) {
            rebuildCatalog();
            return;
        }
        if (System.currentTimeMillis() - catalogAt > CATALOG_TTL_MS && refreshingCatalog.compareAndSet(false, true)) {
            refresher.submit(() -> {
                try {
                    rebuildCatalog();
                } catch (RuntimeException ignored) {
                    // keep using the old copy; the next visit tries again
                } finally {
                    refreshingCatalog.set(false);
                }
            });
        }
    }

    private synchronized void rebuildCatalog() {
        Map<String, Cand> c = new LinkedHashMap<>();
        for (Hotel h : hotelRepository.findAll()) {
            if (h.gethotelName() == null) continue;
            Cand x = new Cand("HOTEL", h.getId(), h.gethotelName(), norm(h.getLocation()), h.getLocation(), h.getImageUrl(), h.getPricePerNight(),
                    "per night", h.getRating(), tokens(h.getamenities()), h.getDescription(), h.getAvailableRooms(), null);
            c.put(x.key(), x);
        }
        for (Listing l : listingRepository.findAll()) {
            if (!"HOMESTAY".equals(l.getCategory()) && !"HOLIDAY".equals(l.getCategory())) continue;
            Cand x = new Cand(l.getCategory(), l.getId(), l.getName(), norm(l.getLocation()), l.getLocation(), l.getImageUrl(), l.getPrice(),
                    "HOLIDAY".equals(l.getCategory()) ? "per person" : "per night", l.getRating(), tokens(l.getFeatures()), l.getDescription(),
                    l.getAvailable(), null);
            c.put(x.key(), x);
        }
        // the two cheapest upcoming flights into each place
        Map<String, List<Cand>> byDest = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        List<Flight> flights = flightRepository.findByDepartureTimeBetween(now.plusHours(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")),
                now.plusDays(4).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm")));
        flights.sort(Comparator.comparingDouble(Flight::getPrice));
        for (Flight f : flights) {
            if (f.getTo() == null || f.getAvailableSeats() < 1) continue;
            List<Cand> list = byDest.computeIfAbsent(norm(f.getTo()), k -> new ArrayList<>());
            if (list.size() >= 2 || list.stream().anyMatch(x -> f.getFrom() != null && f.getFrom().equals(x.description()))) continue;
            list.add(new Cand("FLIGHT", f.getId(), f.getFlightName() + " · " + f.getFrom() + " → " + f.getTo(), norm(f.getTo()), f.getTo(), null,
                    f.getPrice(), "per seat", 0, Set.of(), f.getFrom(), f.getAvailableSeats(), f.getDepartureTime()));
            // the origin city is kept in "description" so the same route is not listed twice
        }
        catalog = c;
        flightsByDest = byDest;
        catalogAt = System.currentTimeMillis();
    }

    /** Forgets the cached catalogue and similarity model, for example after the demo data was regenerated. */
    public void refresh() {
        rebuildCatalog();
        buildModel();
    }

    /** Every hotel, homestay and holiday package. */
    public List<Cand> stays() {
        loadCatalog();
        List<Cand> out = new ArrayList<>();
        for (Cand c : catalog.values()) if (isStay(c.category())) out.add(c);
        return out;
    }

    private Cand find(String category, String id) {
        loadCatalog();
        return catalog.get(category + ":" + id);
    }

    // ------------------------------------------------------------------ recording what people do

    /** Remembers that a traveller opened an item or searched a place. Quietly ignores anything it cannot place. */
    public void record(String userId, String category, String itemId, String type, String query, String source) {
        if (userId == null || userId.isBlank() || !userRepository.existsById(userId)) return;
        String cat = category == null ? null : category.toUpperCase(Locale.ROOT);
        String dest = null;
        if ("SEARCH".equals(type)) {
            dest = norm(query);
            if (dest.isEmpty()) return;
        } else {
            if (cat == null || itemId == null) return;
            if ("FLIGHT".equals(cat)) {
                Flight f = flightRepository.findById(itemId).orElse(null);
                if (f == null) return;
                dest = norm(f.getTo());
            } else {
                Cand c = find(cat, itemId);
                if (c == null) return;
                dest = c.destination();
            }
            Interaction last = interactionRepository.findFirstByUserIdAndCategoryAndItemIdAndTypeOrderByAtDesc(userId, cat, itemId, type);
            if (last != null && last.getAt() != null && last.getAt().compareTo(LocalDateTime.now().minusMinutes(30).format(STAMP)) > 0) return;
        }
        Interaction i = new Interaction();
        i.setUserId(userId);
        i.setCategory(cat);
        i.setItemId(itemId);
        i.setType(type);
        i.setDestination(dest);
        i.setQuery(query);
        i.setSource(source);
        i.setAt(LocalDateTime.now().withNano(0).format(STAMP));
        interactionRepository.save(i);
    }

    // ------------------------------------------------------------------ feedback

    public RecommendationFeedback feedback(String userId, String category, String itemId, String verdict) {
        if (!"HELPFUL".equals(verdict) && !"IRRELEVANT".equals(verdict)) throw new RuntimeException("Unknown answer");
        if (!userRepository.existsById(userId)) throw new RuntimeException("Please log in first");
        String cat = category.toUpperCase(Locale.ROOT);
        RecommendationFeedback f = feedbackRepository.findByUserIdAndCategoryAndItemId(userId, cat, itemId).orElseGet(RecommendationFeedback::new);
        Cand c = "FLIGHT".equals(cat) ? null : find(cat, itemId);
        f.setUserId(userId);
        f.setCategory(cat);
        f.setItemId(itemId);
        if (c != null) {
            f.setItemName(c.name());
            f.setDestination(c.destination());
        } else if ("FLIGHT".equals(cat)) {
            flightRepository.findById(itemId).ifPresent(fl -> {
                f.setItemName(fl.getFlightName());
                f.setDestination(norm(fl.getTo()));
            });
        }
        f.setVerdict(verdict);
        f.setAt(LocalDateTime.now().withNano(0).format(STAMP));
        return feedbackRepository.save(f);
    }

    public void clearFeedback(String userId, String category, String itemId) {
        feedbackRepository.findByUserIdAndCategoryAndItemId(userId, category.toUpperCase(Locale.ROOT), itemId).ifPresent(feedbackRepository::delete);
    }

    // ------------------------------------------------------------------ building a profile

    private Profile profile(String userId) {
        loadCatalog();
        Profile p = new Profile();
        if (userId == null || userId.isBlank()) return p;

        Users user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            for (Users.Booking b : user.getBookings()) {
                if (b == null || "CANCELLED".equals(b.getStatus()) || b.getBookingId() == null || b.getCategory() == null) continue;
                p.booked = true;
                if ("FLIGHT".equals(b.getCategory())) {
                    flightRepository.findById(b.getBookingId()).ifPresent(f -> {
                        addDest(p, norm(f.getTo()), 4, 0);
                        add(p.cats, "FLIGHT", 1);
                    });
                } else {
                    Cand c = catalog.get(b.getCategory() + ":" + b.getBookingId());
                    if (c != null) addItem(p, c, 5, 0);
                }
            }
        }
        for (Review r : reviewRepository.findByUserIdAndStatus(userId, "PUBLISHED")) {
            Cand c = catalog.get(r.getCategory() + ":" + r.getItemId());
            if (c == null) continue;
            if (r.getRating() >= 4) addItem(p, c, 3, 1);
            else if (r.getRating() == 3) addItem(p, c, 1, 1);
            else p.avoid.add(c.key());
        }
        for (Interaction i : interactionRepository.findTop300ByUserIdOrderByAtDesc(userId)) {
            switch (i.getType() == null ? "" : i.getType()) {
                case "SEARCH" -> addDest(p, i.getDestination(), 2, 2);
                case "BOOK" -> {
                    Cand c = i.getCategory() == null ? null : catalog.get(i.getCategory() + ":" + i.getItemId());
                    if (c != null) addItem(p, c, 5, 0);
                }
                default -> {
                    double w = "recommendation".equals(i.getSource()) ? 1.5 : 1;
                    Cand c = i.getCategory() == null ? null : catalog.get(i.getCategory() + ":" + i.getItemId());
                    if (c != null) addItem(p, c, w, 3);
                    else if ("FLIGHT".equals(i.getCategory())) addDest(p, i.getDestination(), w, 3);
                }
            }
        }
        return p;
    }

    /** kind: 0 booked, 1 reviewed, 2 searched, 3 viewed */
    private void addItem(Profile p, Cand c, double w, int kind) {
        p.items.merge(c.key(), w, Double::sum);
        addDest(p, c.destination(), w, kind);
        add(p.cats, c.category(), w);
        for (String t : c.tags()) add(p.tokens, t, w);
        if (c.price() > 0) p.prices.computeIfAbsent(c.category(), k -> new ArrayList<>()).add(c.price());
    }

    private void addDest(Profile p, String dest, double w, int kind) {
        if (dest == null || dest.isBlank()) return;
        add(p.dest, dest, w);
        p.evidence.computeIfAbsent(dest, k -> new int[4])[kind]++;
    }

    private static void add(Map<String, Double> m, String k, double w) {
        m.merge(k, w, Double::sum);
    }

    // ------------------------------------------------------------------ the shared model

    /** The similarity model: built by the first caller, then refreshed in the background when it gets old. */
    private Model model() {
        Model current = model;
        if (current.builtAt == 0) return buildModel();
        if (System.currentTimeMillis() - current.builtAt > MODEL_TTL_MS && refreshingModel.compareAndSet(false, true)) {
            refresher.submit(() -> {
                try {
                    buildModel();
                } catch (RuntimeException ignored) {
                    // keep using the old model; the next visit tries again
                } finally {
                    refreshingModel.set(false);
                }
            });
        }
        return current;
    }

    private synchronized Model buildModel() {
        loadCatalog();
        Model m = new Model();

        // review statistics for every item
        Map<String, double[]> sums = new HashMap<>();
        Map<String, Map<String, Double>> byUser = new HashMap<>();
        for (Review r : reviewRepository.findByStatus("PUBLISHED")) {
            String key = r.getCategory() + ":" + r.getItemId();
            double[] s = sums.computeIfAbsent(key, k -> new double[2]);
            s[0]++;
            s[1] += r.getRating();
            if (r.getRating() >= 4 && isStay(r.getCategory())) {
                byUser.computeIfAbsent(r.getUserId(), k -> new HashMap<>()).merge(key, 3.0, Double::sum);
            }
        }
        sums.forEach((k, s) -> m.reviews.put(k, new double[]{s[0], s[1] / s[0]}));

        for (Users u : userRepository.findAll()) {
            for (Users.Booking b : u.getBookings()) {
                if (b == null || "CANCELLED".equals(b.getStatus()) || !isStay(b.getCategory())) continue;
                byUser.computeIfAbsent(u.getId(), k -> new HashMap<>()).merge(b.getCategory() + ":" + b.getBookingId(), 5.0, Double::sum);
            }
        }
        for (Interaction i : interactionRepository.findAll()) {
            if (i.getUserId() == null || i.getCategory() == null || !isStay(i.getCategory()) || "SEARCH".equals(i.getType())) continue;
            double w = "BOOK".equals(i.getType()) ? 5 : 1;
            byUser.computeIfAbsent(i.getUserId(), k -> new HashMap<>()).merge(i.getCategory() + ":" + i.getItemId(), w, Double::sum);
        }
        m.travellers = byUser.size();

        Map<String, Double> norm2 = new HashMap<>();
        Map<String, Map<String, double[]>> dot = new HashMap<>();
        for (Map<String, Double> items : byUser.values()) {
            items.forEach((k, w) -> norm2.merge(k, w * w, Double::sum));
            List<Map.Entry<String, Double>> list = new ArrayList<>(items.entrySet());
            for (int a = 0; a < list.size(); a++) {
                for (int b = 0; b < list.size(); b++) {
                    if (a == b) continue;
                    double[] cell = dot.computeIfAbsent(list.get(a).getKey(), k -> new HashMap<>()).computeIfAbsent(list.get(b).getKey(), k -> new double[2]);
                    cell[0] += list.get(a).getValue() * list.get(b).getValue();
                    cell[1]++;
                }
            }
        }
        dot.forEach((i, row) -> row.forEach((j, cell) -> {
            double cos = cell[0] / Math.sqrt(norm2.get(i) * norm2.get(j));
            m.sim.computeIfAbsent(i, k -> new HashMap<>()).put(j, new double[]{cos, cell[1]});
        }));
        m.builtAt = System.currentTimeMillis();
        model = m;
        return m;
    }

    // ------------------------------------------------------------------ recommending

    public Map<String, Object> recommend(String userId, int limit, String onlyCategory) {
        loadCatalog();
        Model m = model();
        Profile p = profile(userId);
        boolean personal = p.personalised();

        Set<String> excluded = new HashSet<>(p.avoid);
        Map<String, RecommendationFeedback> fb = new HashMap<>();
        Map<String, Integer> destBad = new HashMap<>(), destGood = new HashMap<>(), catBad = new HashMap<>(), catGood = new HashMap<>();
        if (userId != null && !userId.isBlank()) {
            for (RecommendationFeedback f : feedbackRepository.findByUserId(userId)) {
                fb.put(f.getCategory() + ":" + f.getItemId(), f);
                boolean bad = "IRRELEVANT".equals(f.getVerdict());
                if (bad) excluded.add(f.getCategory() + ":" + f.getItemId());
                Map<String, Integer> dm = bad ? destBad : destGood, cm = bad ? catBad : catGood;
                if (f.getDestination() != null) dm.merge(f.getDestination(), 1, Integer::sum);
                cm.merge(f.getCategory(), 1, Integer::sum);
            }
        }
        // anything the traveller has already booked is not suggested again
        p.items.forEach((k, w) -> {
            if (w >= 5) excluded.add(k);
        });

        List<Cand> pool = new ArrayList<>(catalog.values());
        // flights only for the places the traveller cares about most
        p.dest.entrySet().stream().sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(3)
                .forEach(e -> pool.addAll(flightsByDest.getOrDefault(e.getKey(), List.of())));

        double maxDest = p.dest.values().stream().mapToDouble(Double::doubleValue).max().orElse(1);
        double catTotal = p.cats.values().stream().mapToDouble(Double::doubleValue).sum();
        double tokenMax = p.tokens.values().stream().mapToDouble(Double::doubleValue).max().orElse(1);
        List<Scored> scored = new ArrayList<>();

        for (Cand c : pool) {
            if (onlyCategory != null && !onlyCategory.isBlank() && !c.category().equalsIgnoreCase(onlyCategory)) continue;
            if (excluded.contains(c.key()) || c.available() == 0) continue;

            // 1. history
            double destPart = p.dest.getOrDefault(c.destination(), 0.0) / maxDest;
            double catPart = catTotal == 0 ? 0 : p.cats.getOrDefault(c.category(), 0.0) / catTotal;
            double tokenPart = 0;
            List<String> matched = new ArrayList<>();
            if (!c.tags().isEmpty() && !p.tokens.isEmpty()) {
                double s = 0;
                for (String t : c.tags()) {
                    double w = p.tokens.getOrDefault(t, 0.0);
                    if (w > 0) {
                        s += w / tokenMax;
                        matched.add(t);
                    }
                }
                tokenPart = Math.min(1, s / 3);
            }
            double content = Math.min(1, 0.6 * destPart + 0.2 * catPart + 0.2 * tokenPart);

            // 2. similar travellers
            double cf = 0, cfWeight = 0, bestPull = 0;
            String bestSeed = null;
            double bestCo = 0;
            Map<String, double[]> row;
            for (Map.Entry<String, Double> seed : p.items.entrySet()) {
                cfWeight += seed.getValue();
                row = m.sim.get(seed.getKey());
                double[] cell = row == null ? null : row.get(c.key());
                if (cell == null || cell[1] < 2) continue; // one traveller in common is a coincidence, not a pattern
                double pull = seed.getValue() * cell[0];
                cf += pull;
                if (pull > bestPull) {
                    bestPull = pull;
                    bestSeed = seed.getKey();
                    bestCo = cell[1];
                }
            }
            cf = cfWeight == 0 ? 0 : Math.min(1, cf / cfWeight * 1.6);

            // 3. quality
            double[] rv = m.reviews.get(c.key());
            double n = rv == null ? 0 : rv[0];
            double avg = rv == null ? c.rating() : rv[1];
            double quality = avg <= 0 ? 0.5 : (avg * n + 4.0 * 5) / (n + 5) / 5.0;
            double popularity = Math.min(1, Math.log(1 + n) / Math.log(11));

            // 4. budget
            double budget = 0.5;
            boolean haveBudget = false;
            List<Double> chosen = p.prices.get(c.category());
            double medianPrice = 0;
            if (chosen != null && !chosen.isEmpty() && c.price() > 0) {
                List<Double> sorted = new ArrayList<>(chosen);
                sorted.sort(Double::compare);
                medianPrice = sorted.get(sorted.size() / 2);
                budget = 1 - Math.min(1, Math.abs(Math.log(c.price() / medianPrice)) / Math.log(3));
                haveBudget = true;
            }

            double score;
            double[] parts;
            if (personal) {
                parts = new double[]{0.35 * content, 0.30 * cf, 0.20 * quality, 0.15 * budget};
            } else {
                parts = new double[]{0, 0, 0.75 * quality, 0.25 * popularity};
            }
            score = parts[0] + parts[1] + parts[2] + parts[3];

            // 5. what the traveller told us
            double adjust = 0;
            adjust -= Math.min(0.36, 0.12 * destBad.getOrDefault(c.destination(), 0));
            adjust -= Math.min(0.15, 0.05 * catBad.getOrDefault(c.category(), 0));
            double boost = Math.min(0.24, 0.08 * destGood.getOrDefault(c.destination(), 0)) + Math.min(0.09, 0.03 * catGood.getOrDefault(c.category(), 0));
            score += adjust + boost;
            if (fb.containsKey(c.key()) && "HELPFUL".equals(fb.get(c.key()).getVerdict())) score += 0.1;

            // reasons, most meaningful first
            List<Map<String, String>> reasons = new ArrayList<>();
            int[] ev = p.evidence.get(c.destination());
            String place = c.location() == null ? "" : c.location();
            if (personal && destPart > 0.15 && ev != null) {
                if (ev[0] > 0) reasons.add(reason("history", "You booked a trip to " + place));
                else if (ev[1] > 0) reasons.add(reason("history", "You reviewed a place in " + place));
                else if (ev[2] > 0) reasons.add(reason("history", "You searched for " + place));
                else reasons.add(reason("history", "You looked at " + (ev[3] > 1 ? ev[3] + " places" : "a place") + " in " + place));
            }
            if (bestSeed != null && cf > 0.08) {
                Cand seed = catalog.get(bestSeed);
                if (seed != null) {
                    boolean booked = p.items.getOrDefault(bestSeed, 0.0) >= 5;
                    reasons.add(reason("similar", "Travellers who " + (booked ? "booked " : "liked ") + seed.name() + " also chose this"
                            + (bestCo >= 2 ? " (" + (int) bestCo + " travellers)" : "")));
                }
            }
            if (!matched.isEmpty() && tokenPart > 0.2) {
                reasons.add(reason("taste", "Has " + String.join(" and ", matched.subList(0, Math.min(2, matched.size()))).toLowerCase(Locale.ROOT)
                        + ", like places you chose"));
            }
            if (personal && catPart >= 0.5 && p.items.size() >= 3 && !"FLIGHT".equals(c.category())) {
                reasons.add(reason("kind", "You often look at " + kindWord(c.category())));
            }
            if (haveBudget && budget > 0.6) {
                reasons.add(reason("budget", "Fits your usual budget (about ₹" + String.format(Locale.US, "%,.0f", medianPrice) + " " + c.unit() + ")"));
            }
            if (n >= 2 && avg >= 4.2) {
                reasons.add(reason("quality", "Rated " + String.format(Locale.US, "%.1f", avg) + " by " + (int) n + " travellers"));
            } else if (!personal || reasons.isEmpty()) {
                reasons.add(reason("popular", avg >= 4.3 ? "Highly rated at " + String.format(Locale.US, "%.1f", avg) : "Popular with travellers"));
            }
            if (boost > 0) reasons.add(reason("feedback", "You marked similar suggestions as helpful"));

            Scored s = new Scored();
            s.cand = c;
            s.score = score;
            s.parts = parts;
            s.reasons = reasons.size() > 3 ? reasons.subList(0, 3) : reasons;
            s.reviewCount = (int) n;
            s.rating = avg;
            s.personal = personal;
            scored.add(s);
        }

        scored.sort(Comparator.comparingDouble((Scored s) -> s.score).reversed());

        // keep the list varied: no more than three per place and five per kind
        List<Scored> picked = new ArrayList<>();
        Map<String, Integer> perDest = new HashMap<>(), perCat = new HashMap<>();
        int maxDest2 = onlyCategory != null && !onlyCategory.isBlank() ? limit : 3;
        for (Scored s : scored) {
            if (picked.size() >= limit) break;
            if (perDest.getOrDefault(s.cand.destination(), 0) >= maxDest2) continue;
            if (onlyCategory == null && perCat.getOrDefault(s.cand.category(), 0) >= Math.max(5, limit - 4)) continue;
            picked.add(s);
            perDest.merge(s.cand.destination(), 1, Integer::sum);
            perCat.merge(s.cand.category(), 1, Integer::sum);
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Scored s : picked) items.add(view(s));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("personalised", personal);
        out.put("items", items);
        out.put("headline", headline(p, personal));
        out.put("topPlaces", topPlaces(p, 3));
        out.put("signals", p.items.size() + p.dest.size());
        return out;
    }

    private static class Scored {
        Cand cand;
        double score;
        double[] parts;
        List<Map<String, String>> reasons;
        int reviewCount;
        double rating;
        boolean personal;
    }

    private Map<String, Object> view(Scored s) {
        Cand c = s.cand;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("category", c.category());
        m.put("itemId", c.id());
        m.put("name", c.name());
        m.put("location", "FLIGHT".equals(c.category()) ? null : c.location());
        m.put("imageUrl", c.imageUrl());
        m.put("price", c.price());
        m.put("unit", c.unit());
        m.put("rating", Math.round(s.rating * 10) / 10.0);
        m.put("reviewCount", s.reviewCount);
        m.put("departureTime", c.departureTime());
        m.put("path", pathOf(c));
        m.put("score", Math.round(s.score * 100));
        m.put("reasons", s.reasons);
        double total = s.parts[0] + s.parts[1] + s.parts[2] + s.parts[3];
        Map<String, Integer> breakdown = new LinkedHashMap<>();
        if (total > 0) {
            if (s.personal) {
                breakdown.put("Your history", (int) Math.round(s.parts[0] / total * 100));
                breakdown.put("Similar travellers", (int) Math.round(s.parts[1] / total * 100));
                breakdown.put("Ratings", (int) Math.round(s.parts[2] / total * 100));
                breakdown.put("Budget fit", (int) Math.round(s.parts[3] / total * 100));
            } else {
                breakdown.put("Ratings", (int) Math.round(s.parts[2] / total * 100));
                breakdown.put("Popularity", (int) Math.round(s.parts[3] / total * 100));
            }
        }
        m.put("breakdown", breakdown);
        return m;
    }

    private static String pathOf(Cand c) {
        return switch (c.category()) {
            case "HOTEL" -> "/book-hotel/" + c.id() + "?rooms=1&ref=rec";
            case "FLIGHT" -> "/book-flight/" + c.id() + "?qty=1&ref=rec";
            default -> "/book/" + c.id() + "?qty=1&ref=rec";
        };
    }

    private String headline(Profile p, boolean personal) {
        if (!personal) return "Popular with travellers right now";
        List<String> top = topPlaces(p, 2);
        return top.isEmpty() ? "Picked for you" : "Based on your interest in " + String.join(" and ", top);
    }

    private List<String> topPlaces(Profile p, int n) {
        List<String> out = new ArrayList<>();
        p.dest.entrySet().stream().sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(n).forEach(e -> out.add(title(e.getKey())));
        return out;
    }

    // ------------------------------------------------------------------ admin

    /** How the feature is being used, and a look inside one traveller's profile. */
    public Map<String, Object> stats(String inspectUserId) {
        Map<String, Object> out = new LinkedHashMap<>();
        List<RecommendationFeedback> all = feedbackRepository.findAll();
        long helpful = all.stream().filter(f -> "HELPFUL".equals(f.getVerdict())).count();
        out.put("helpful", helpful);
        out.put("irrelevant", all.size() - helpful);
        out.put("fromRecommendations", interactionRepository.countBySource("recommendation"));
        out.put("demoTravellers", interactionRepository.findByDemoTrue().stream().map(Interaction::getUserId).distinct().count());
        Model m = model();
        out.put("modelTravellers", m.travellers);
        out.put("modelPairs", m.sim.values().stream().mapToInt(Map::size).sum());

        Map<String, int[]> byDest = new HashMap<>();
        for (RecommendationFeedback f : all) {
            if (f.getDestination() == null) continue;
            int[] c = byDest.computeIfAbsent(f.getDestination(), k -> new int[2]);
            c["HELPFUL".equals(f.getVerdict()) ? 0 : 1]++;
        }
        List<Map<String, Object>> places = new ArrayList<>();
        byDest.entrySet().stream().sorted((a, b) -> Integer.compare(b.getValue()[0] + b.getValue()[1], a.getValue()[0] + a.getValue()[1])).limit(8)
                .forEach(e -> places.add(Map.of("place", title(e.getKey()), "helpful", e.getValue()[0], "irrelevant", e.getValue()[1])));
        out.put("places", places);

        if (inspectUserId != null && !inspectUserId.isBlank()) {
            Profile p = profile(inspectUserId);
            Map<String, Object> prof = new LinkedHashMap<>();
            prof.put("personalised", p.personalised());
            prof.put("places", topWeights(p.dest, 5));
            prof.put("kinds", topWeights(p.cats, 4));
            prof.put("tastes", topWeights(p.tokens, 6));
            prof.put("itemsKnown", p.items.size());
            out.put("profile", prof);
            out.put("recommendations", recommend(inspectUserId, 6, null).get("items"));
        }
        return out;
    }

    private static List<Map<String, Object>> topWeights(Map<String, Double> m, int n) {
        List<Map<String, Object>> out = new ArrayList<>();
        m.entrySet().stream().sorted(Map.Entry.<String, Double>comparingByValue().reversed()).limit(n)
                .forEach(e -> out.add(Map.of("name", title(e.getKey()), "weight", Math.round(e.getValue() * 10) / 10.0)));
        return out;
    }

    // ------------------------------------------------------------------ helpers

    private static boolean isStay(String category) {
        return category != null && STAYS.contains(category);
    }

    static String norm(String s) {
        return s == null ? "" : s.trim().toLowerCase(Locale.ROOT);
    }

    private static Set<String> tokens(String csv) {
        Set<String> out = new HashSet<>();
        if (csv == null) return out;
        for (String t : csv.split(",")) {
            String x = t.trim().toLowerCase(Locale.ROOT);
            if (!x.isEmpty()) out.add(x);
        }
        return out;
    }

    private static String title(String s) {
        StringBuilder sb = new StringBuilder();
        for (String w : s.split(" ")) {
            if (w.isEmpty()) continue;
            sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1)).append(' ');
        }
        return sb.toString().trim();
    }

    private static String kindWord(String category) {
        return switch (category) {
            case "HOTEL" -> "hotels";
            case "HOMESTAY" -> "homestays";
            case "HOLIDAY" -> "holiday packages";
            default -> "flights";
        };
    }

    private static Map<String, String> reason(String type, String text) {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("text", text);
        return m;
    }
}
