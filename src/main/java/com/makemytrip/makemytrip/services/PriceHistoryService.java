package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.PriceSnapshot;
import com.makemytrip.makemytrip.models.PriceWatch;
import com.makemytrip.makemytrip.repositories.PriceSnapshotRepository;
import com.makemytrip.makemytrip.repositories.PriceWatchRepository;
import com.makemytrip.makemytrip.services.DynamicPricingService.Item;
import com.makemytrip.makemytrip.services.DynamicPricingService.Result;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Price history for the graphs.
 * <p>
 * Prices are recorded for items people are looking at, booking or freezing, every 15 minutes. The first time an item
 * is viewed there is no past yet, so earlier points are rebuilt from the same pricing rules (season, booking window,
 * time of day and market movement) and marked ESTIMATED; everything after that is recorded as LIVE.
 * A short forecast shows where the price is heading if demand stays as it is.
 */
@Service
public class PriceHistoryService {

    private static final Logger log = LoggerFactory.getLogger(PriceHistoryService.class);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);
    private static final int BACKFILL_DAYS = 35;
    private static final int BACKFILL_STEP_HOURS = 6;

    @Autowired
    private DynamicPricingService dynamicPricing;
    @Autowired
    private PriceSnapshotRepository snapshots;
    @Autowired
    private PriceWatchRepository watches;

    @Data
    public static class Point {
        private String at;
        private double price;
        /** LIVE, ESTIMATED or FORECAST. */
        private String source;
    }

    @Data
    public static class Summary {
        private double current;
        private double lowest;
        private double highest;
        private double average;
        /** Change compared with about a week ago, in percent; null when there is not enough history. */
        private Double changeWeekPct;
        /** BOOK_NOW, WAIT or STABLE. */
        private String recommendation;
        private String message;
    }

    @Data
    public static class History {
        private String category;
        private String itemId;
        private String itemName;
        private String travelDate;
        private double basePrice;
        private int days;
        private List<Point> points = new ArrayList<>();
        private List<Point> forecast = new ArrayList<>();
        private Summary summary = new Summary();
        private List<DynamicPricingService.Adjustment> adjustments = new ArrayList<>();
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(DynamicPricingService.ZONE).withNano(0).withSecond(0);
    }

    private static String keyOf(Item item) {
        return item.getCategory() + ":" + item.getId() + ":" + item.getTravelAt().toLocalDate();
    }

    public Optional<History> history(String category, String itemId, LocalDate date, int days) {
        Optional<Item> found = dynamicPricing.resolve(category, itemId, date);
        if (found.isEmpty()) return Optional.empty();
        Item item = found.get();
        if ("INSURANCE".equals(item.getCategory())) return Optional.empty();

        LocalDateTime now = now();
        String key = keyOf(item);
        int window = Math.max(3, Math.min(days, 60));

        if (snapshots.countByKey(key) < 12) backfill(key, item, now);
        Result current = dynamicPricing.compute(item, now, true);
        recordLive(key, item, current, now);
        watch(key, item);

        History h = new History();
        h.setCategory(item.getCategory());
        h.setItemId(item.getId());
        h.setItemName(item.getName());
        h.setTravelDate(item.getTravelAt().toLocalDate().toString());
        h.setBasePrice(item.getBasePrice());
        h.setDays(window);
        h.setAdjustments(current.getAdjustments());

        List<PriceSnapshot> stored = snapshots.findByKeyAndAtGreaterThanEqualOrderByAtAsc(key, now.minusDays(window).format(STAMP));
        for (PriceSnapshot s : thin(stored, 160)) {
            Point p = new Point();
            p.setAt(s.getAt());
            p.setPrice(s.getPrice());
            p.setSource(s.getSource());
            h.getPoints().add(p);
        }
        h.setForecast(forecast(item, now));
        h.setSummary(summarise(item, current, stored, h.getForecast(), now));
        return Optional.of(h);
    }

    // ------------------------------------------------------------------ recording

    private void backfill(String key, Item item, LocalDateTime now) {
        List<PriceSnapshot> out = new ArrayList<>();
        LocalDateTime start = now.minusDays(BACKFILL_DAYS).withMinute(0);
        for (LocalDateTime t = start; t.isBefore(now); t = t.plusHours(BACKFILL_STEP_HOURS)) {
            if (!t.isBefore(item.getTravelAt())) break;
            Result r = dynamicPricing.compute(item, t, false);
            out.add(snapshot(key, item, r, t, "ESTIMATED"));
        }
        snapshots.saveAll(out);
    }

    private void recordLive(String key, Item item, Result r, LocalDateTime now) {
        // at most one live point every 10 minutes
        boolean recent = snapshots.findByKeyAndAtGreaterThanEqualOrderByAtAsc(key, now.minusMinutes(10).format(STAMP))
                .stream().anyMatch(s -> "LIVE".equals(s.getSource()));
        if (!recent && now.isBefore(item.getTravelAt())) snapshots.save(snapshot(key, item, r, now, "LIVE"));
    }

    private PriceSnapshot snapshot(String key, Item item, Result r, LocalDateTime at, String source) {
        PriceSnapshot s = new PriceSnapshot();
        s.setKey(key);
        s.setPrice(r.getPrice());
        s.setBasePrice(item.getBasePrice());
        s.setAdjustmentPct(r.getAdjustmentPct());
        s.setAt(at.format(STAMP));
        s.setSource(source);
        return s;
    }

    private void watch(String key, Item item) {
        PriceWatch w = watches.findByKey(key).orElseGet(PriceWatch::new);
        w.setKey(key);
        w.setCategory(item.getCategory());
        w.setItemId(item.getId());
        w.setTravelDate(item.getTravelAt().toLocalDate().toString());
        w.setLastViewedAt(now().format(STAMP));
        try {
            watches.save(w);
        } catch (RuntimeException e) {
            // two people opened the same item at the same moment; the other one saved it
        }
    }

    /** Keeps the graphs growing for items that people are watching. */
    @Scheduled(fixedRate = 900_000, initialDelay = 120_000)
    public void recordWatched() {
        LocalDateTime now = now();
        for (PriceWatch w : watches.findByLastViewedAtGreaterThan(now.minusHours(48).format(STAMP))) {
            try {
                dynamicPricing.resolve(w.getCategory(), w.getItemId(), LocalDate.parse(w.getTravelDate())).ifPresent(item -> {
                    if (now.isBefore(item.getTravelAt())) recordLive(w.getKey(), item, dynamicPricing.compute(item, now, true), now);
                });
            } catch (RuntimeException e) {
                log.warn("Could not record price for {}: {}", w.getKey(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 30 3 * * *")
    public void cleanUp() {
        snapshots.deleteByAtLessThan(now().minusDays(60).format(STAMP));
        watches.deleteByLastViewedAtLessThan(now().minusDays(7).format(STAMP));
    }

    // ------------------------------------------------------------------ forecast and summary

    /** Where the price is heading, twice a day, assuming demand stays as it is now. */
    private List<Point> forecast(Item item, LocalDateTime now) {
        List<Point> out = new ArrayList<>();
        LocalDateTime end = now.plusDays(14);
        if (item.getTravelAt().isBefore(end)) end = item.getTravelAt();
        for (LocalDateTime t = now.plusHours(12); !t.isAfter(end); t = t.plusHours(12)) {
            Point p = new Point();
            p.setAt(t.format(STAMP));
            p.setPrice(dynamicPricing.compute(item, t, true).getPrice());
            p.setSource("FORECAST");
            out.add(p);
        }
        return out;
    }

    private Summary summarise(Item item, Result current, List<PriceSnapshot> stored, List<Point> forecast, LocalDateTime now) {
        Summary s = new Summary();
        double price = current.getPrice();
        s.setCurrent(price);
        List<Double> prices = new ArrayList<>(stored.stream().map(PriceSnapshot::getPrice).toList());
        prices.add(price);
        s.setLowest(prices.stream().mapToDouble(Double::doubleValue).min().orElse(price));
        s.setHighest(prices.stream().mapToDouble(Double::doubleValue).max().orElse(price));
        s.setAverage(Math.round(prices.stream().mapToDouble(Double::doubleValue).average().orElse(price)));

        String weekAgo = now.minusDays(7).format(STAMP);
        stored.stream().filter(p -> p.getAt().compareTo(weekAgo) >= 0).findFirst().ifPresent(p -> {
            if (p.getPrice() > 0) s.setChangeWeekPct(Math.round((price - p.getPrice()) / p.getPrice() * 1000) / 10.0);
        });

        long hoursLeft = java.time.Duration.between(now, item.getTravelAt()).toHours();
        List<Point> week = forecast.stream().filter(p -> p.getAt().compareTo(now.plusDays(7).format(STAMP)) <= 0).toList();
        Point peak = week.stream().max((a, b) -> Double.compare(a.getPrice(), b.getPrice())).orElse(null);
        Point trough = week.stream().min((a, b) -> Double.compare(a.getPrice(), b.getPrice())).orElse(null);

        if (hoursLeft < 24) {
            s.setRecommendation("BOOK_NOW");
            s.setMessage("This is very close to departure, so prices are at their highest and will not come down. Book now if you plan to go.");
        } else if (peak != null && peak.getPrice() >= price * 1.05) {
            long rise = Math.round((peak.getPrice() / price - 1) * 100);
            s.setRecommendation("BOOK_NOW");
            s.setMessage("Prices are expected to rise about " + rise + "% by " + LocalDateTime.parse(peak.getAt()).format(DAY)
                    + ". Book now, or freeze today's price.");
        } else if (trough != null && trough.getPrice() <= price * 0.95) {
            long dip = Math.round((1 - trough.getPrice() / price) * 100);
            s.setRecommendation("WAIT");
            s.setMessage("The price may dip about " + dip + "% around " + LocalDateTime.parse(trough.getAt()).format(DAY)
                    + ". You can wait, or freeze today's price in case it rises.");
        } else {
            s.setRecommendation("STABLE");
            s.setMessage("Prices look steady for the next week, so there is no rush.");
        }
        return s;
    }

    /** Keeps graphs light: at most {@code max} points, always including the first and last. */
    private static List<PriceSnapshot> thin(List<PriceSnapshot> list, int max) {
        if (list.size() <= max) return list;
        List<PriceSnapshot> out = new ArrayList<>();
        double step = (list.size() - 1) / (double) (max - 1);
        for (int i = 0; i < max; i++) out.add(list.get((int) Math.round(i * step)));
        return out;
    }
}
