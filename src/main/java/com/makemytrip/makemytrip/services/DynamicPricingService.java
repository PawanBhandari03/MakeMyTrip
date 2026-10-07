package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.PricingRule;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.PricingRuleRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The dynamic pricing engine. Every price starts from the item's base fare (what the admin set) and is moved by a
 * visible list of adjustments:
 * <ul>
 *   <li><b>Season</b>: admin-managed rules for festivals, long weekends and off-season sales (for example +20%).</li>
 *   <li><b>Weekend</b> travel.</li>
 *   <li><b>Booking window</b>: early-bird discounts and last-minute increases as the trip gets closer.</li>
 *   <li><b>Time of day</b> for flights, trains and buses.</li>
 *   <li><b>Demand</b>: prices rise as seats or rooms run out.</li>
 *   <li><b>Market movement</b>: a small, smooth up-and-down drift that refreshes every 15 minutes.</li>
 * </ul>
 * The total is kept between {@link #MIN_PCT} and {@link #MAX_PCT} so prices stay predictable, and every adjustment is
 * returned to the caller so the customer can see exactly why a price is what it is.
 */
@Service
public class DynamicPricingService {

    static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    static final double MIN_PCT = -15;
    static final double MAX_PCT = 60;
    private static final long RULE_CACHE_MS = 30_000;
    private static final Pattern CLOCK = Pattern.compile("(\\d{1,2}):(\\d{2})");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private PricingRuleRepository ruleRepository;

    private volatile List<PricingRule> rules = List.of();
    private volatile long rulesLoadedAt = 0;

    @Data
    @AllArgsConstructor
    public static class Adjustment {
        private String code;
        private String label;
        private double percent;
        private String detail;
    }

    /** What the engine needs to know about something that can be priced. */
    @Data
    public static class Item {
        private String category;
        private String id;
        private String name;
        private double basePrice;
        /** Seats, rooms or units when it was fully available; 0 when unknown. */
        private int capacity;
        /** Units left; negative means unlimited. */
        private int available;
        private LocalDateTime travelAt;
        /** True when the departure time of day matters (flights, trains, buses). */
        private boolean timed;
    }

    @Data
    public static class Result {
        private String itemId;
        private double basePrice;
        private double price;
        private double adjustmentPct;
        private double previousPrice;
        /** UP, DOWN or STABLE compared with an hour ago. */
        private String trend;
        private List<Adjustment> adjustments = new ArrayList<>();
        /** Short labels for cards, such as "Diwali week +20%". */
        private List<String> tags = new ArrayList<>();
        private String travelDate;
        private int available;
    }

    // ------------------------------------------------------------------ rules

    private List<PricingRule> rules() {
        long now = System.currentTimeMillis();
        if (now - rulesLoadedAt > RULE_CACHE_MS) {
            rules = ruleRepository.findByActiveTrue();
            rulesLoadedAt = now;
        }
        return rules;
    }

    /** Called after an admin changes a rule so the change shows up immediately. */
    public void invalidateRules() {
        rulesLoadedAt = 0;
    }

    // ------------------------------------------------------------------ finding items

    public Optional<Item> resolve(String category, String itemId, LocalDate date) {
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        return switch (cat) {
            case "FLIGHT" -> flightRepository.findById(itemId).map(this::of);
            case "HOTEL" -> hotelRepository.findById(itemId).map(h -> of(h, date));
            default -> listingRepository.findById(itemId).filter(l -> cat.equals(l.getCategory())).map(l -> of(l, date));
        };
    }

    /** Several items of one category at once, keyed by id. */
    public Map<String, Item> resolveAll(String category, List<String> ids, LocalDate date) {
        String cat = category == null ? "" : category.toUpperCase(Locale.ROOT);
        Map<String, Item> out = new HashMap<>();
        switch (cat) {
            case "FLIGHT" -> flightRepository.findAllById(ids).forEach(f -> out.put(f.getId(), of(f)));
            case "HOTEL" -> hotelRepository.findAllById(ids).forEach(h -> out.put(h.getId(), of(h, date)));
            default -> listingRepository.findAllById(ids).stream()
                    .filter(l -> cat.equals(l.getCategory()))
                    .forEach(l -> out.put(l.getId(), of(l, date)));
        }
        return out;
    }

    public Item of(Flight f) {
        Item i = new Item();
        i.setCategory("FLIGHT");
        i.setId(f.getId());
        i.setName(f.getFlightName() + " · " + f.getFrom() + " → " + f.getTo());
        i.setBasePrice(f.getPrice());
        i.setCapacity(f.getCapacity());
        i.setAvailable(f.getAvailableSeats());
        i.setTravelAt(LocalDateTime.parse(f.getDepartureTime(), ISO));
        i.setTimed(true);
        return i;
    }

    public Item of(Hotel h, LocalDate date) {
        Item i = new Item();
        i.setCategory("HOTEL");
        i.setId(h.getId());
        i.setName(h.gethotelName());
        i.setBasePrice(h.getPricePerNight());
        i.setCapacity(h.getCapacity());
        i.setAvailable(h.getAvailableRooms());
        i.setTravelAt(orTomorrow(date).atTime(14, 0));
        return i;
    }

    public Item of(Listing l, LocalDate date) {
        Item i = new Item();
        i.setCategory(l.getCategory());
        i.setId(l.getId());
        i.setName(l.getName());
        i.setBasePrice(l.getPrice());
        i.setCapacity(l.getCapacity());
        i.setAvailable(l.getAvailable());
        LocalDate day = orTomorrow(date);
        LocalTime at = LocalTime.of(12, 0);
        if ("TRAIN".equals(l.getCategory()) || "BUS".equals(l.getCategory())) {
            Matcher m = l.getDepartureTime() == null ? null : CLOCK.matcher(l.getDepartureTime());
            if (m != null && m.find()) at = LocalTime.of(Integer.parseInt(m.group(1)) % 24, Integer.parseInt(m.group(2)));
            i.setTimed(true);
        } else if ("CAB".equals(l.getCategory())) {
            at = LocalTime.of(8, 0);
        }
        i.setTravelAt(day.atTime(at));
        return i;
    }

    private static LocalDate orTomorrow(LocalDate d) {
        return d != null ? d : LocalDate.now(ZONE).plusDays(1);
    }

    // ------------------------------------------------------------------ the engine

    /** The current price, with how it compares to an hour ago. */
    public Result price(Item item) {
        LocalDateTime now = LocalDateTime.now(ZONE);
        Result r = compute(item, now, true);
        r.setPreviousPrice(compute(item, now.minusHours(1), true).getPrice());
        double change = r.getPrice() - r.getPreviousPrice();
        double threshold = Math.max(1, r.getPreviousPrice() * 0.004);
        r.setTrend(change > threshold ? "UP" : change < -threshold ? "DOWN" : "STABLE");
        return r;
    }

    /**
     * The price at a given moment. History and forecasts use this with a different {@code asOf};
     * demand is left out of history because past inventory is not known.
     */
    public Result compute(Item item, LocalDateTime asOf, boolean includeDemand) {
        Result r = new Result();
        r.setItemId(item.getId());
        r.setBasePrice(item.getBasePrice());
        r.setTravelDate(item.getTravelAt() == null ? null : item.getTravelAt().toLocalDate().toString());
        r.setAvailable(item.getAvailable());
        List<Adjustment> adj = r.getAdjustments();
        String cat = item.getCategory();

        if ("INSURANCE".equals(cat)) {
            r.setPrice(item.getBasePrice());
            return r;
        }
        if ("FOREX".equals(cat)) {
            double move = round1(noise(item.getId(), asOf) * 0.4);
            add(adj, "MARKET", "Exchange rate movement", move, "Live rates move a little throughout the day.");
        } else {
            LocalDateTime travel = item.getTravelAt();
            if (travel != null) {
                season(item, adj);
                weekend(item, adj);
                window(item, asOf, adj);
                timeOfDay(item, adj);
            }
            if (includeDemand) demand(item, adj);
            double n = round1(noise(item.getId(), asOf));
            add(adj, "MARKET", "Market movement", n, "Small up-and-down moves, refreshed every 15 minutes.");
        }

        double sum = adj.stream().mapToDouble(Adjustment::getPercent).sum();
        double pct = Math.max(MIN_PCT, Math.min(MAX_PCT, sum));
        if (Math.abs(pct - sum) > 0.04) {
            adj.add(new Adjustment("CAP", "Price protection", round1(pct - sum),
                    "Prices never go more than " + (int) MAX_PCT + "% above or " + (int) -MIN_PCT + "% below the base fare."));
        }
        r.setAdjustmentPct(round1(pct));
        double raw = item.getBasePrice() * (1 + pct / 100.0);
        r.setPrice("FOREX".equals(cat) ? Math.round(raw * 100) / 100.0 : Math.max(10, Math.round(raw / 10.0) * 10.0));
        r.setTags(tags(adj));
        return r;
    }

    // ---- factors

    private void season(Item item, List<Adjustment> adj) {
        LocalDate d = item.getTravelAt().toLocalDate();
        PricingRule best = null;
        for (PricingRule rule : rules()) {
            if (rule.getCategory() != null && !"ALL".equalsIgnoreCase(rule.getCategory()) && !rule.getCategory().equalsIgnoreCase(item.getCategory())) continue;
            try {
                LocalDate from = LocalDate.parse(rule.getStartDate());
                LocalDate to = LocalDate.parse(rule.getEndDate());
                if (d.isBefore(from) || d.isAfter(to)) continue;
            } catch (RuntimeException e) {
                continue; // a rule with a bad date is ignored rather than breaking prices
            }
            if (best == null || Math.abs(rule.getPercent()) > Math.abs(best.getPercent())) best = rule;
        }
        if (best != null) {
            String detail = best.getDescription() != null && !best.getDescription().isBlank()
                    ? best.getDescription()
                    : (best.getPercent() >= 0 ? "Peak travel period." : "Seasonal sale.");
            add(adj, "SEASON", best.getName(), best.getPercent(), detail + " (" + LocalDate.parse(best.getStartDate()).format(DAY)
                    + " – " + LocalDate.parse(best.getEndDate()).format(DAY) + ")");
        }
    }

    private void weekend(Item item, List<Adjustment> adj) {
        DayOfWeek day = item.getTravelAt().getDayOfWeek();
        String cat = item.getCategory();
        boolean transport = cat.equals("FLIGHT") || cat.equals("TRAIN") || cat.equals("BUS") || cat.equals("CAB");
        boolean stay = cat.equals("HOTEL") || cat.equals("HOMESTAY");
        if (transport && (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY)) {
            add(adj, "WEEKEND", "Weekend travel", 6, "Fridays, Saturdays and Sundays are busier.");
        } else if (stay && (day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY)) {
            add(adj, "WEEKEND", "Weekend stay", 8, "Friday and Saturday nights are in higher demand.");
        }
    }

    /** Early-bird discounts and last-minute increases, based on how far away the trip is. */
    private void window(Item item, LocalDateTime asOf, List<Adjustment> adj) {
        long hours = Duration.between(asOf, item.getTravelAt()).toHours();
        if (hours < 0) return;
        double days = hours / 24.0;
        String cat = item.getCategory();
        if (cat.equals("FLIGHT") || cat.equals("TRAIN") || cat.equals("BUS")) {
            if (days >= 45) add(adj, "WINDOW", "Early-bird price", -8, "Booked 45 or more days ahead.");
            else if (days >= 30) add(adj, "WINDOW", "Book-ahead saving", -5, "Booked 30 to 45 days ahead.");
            else if (days >= 15) { /* the normal price */ }
            else if (days >= 8) add(adj, "WINDOW", "Filling up", 4, "Travel is 8 to 15 days away.");
            else if (days >= 4) add(adj, "WINDOW", "Getting close", 9, "Travel is 4 to 8 days away.");
            else if (days >= 2) add(adj, "WINDOW", "Last-minute", 15, "Travel is 2 to 4 days away.");
            else if (days >= 1) add(adj, "WINDOW", "Last-minute", 22, "Travel is tomorrow or the day after.");
            else add(adj, "WINDOW", "Departing within 24 hours", 28, "Very close to departure.");
        } else if (cat.equals("HOTEL") || cat.equals("HOMESTAY") || cat.equals("HOLIDAY")) {
            if (days >= 45) add(adj, "WINDOW", "Early-bird price", -5, "Booked 45 or more days ahead.");
            else if (days < 3) add(adj, "WINDOW", "Last-minute", 8, "Check-in is in less than 3 days.");
            else if (days < 7) add(adj, "WINDOW", "Getting close", 4, "Check-in is less than a week away.");
        }
    }

    private void timeOfDay(Item item, List<Adjustment> adj) {
        if (!item.isTimed()) return;
        int hour = item.getTravelAt().getHour();
        if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 21)) {
            add(adj, "TIME", "Peak-hour departure", 4, "Morning and evening departures are most popular.");
        } else if (hour <= 5) {
            add(adj, "TIME", "Off-peak departure", -7, "Late-night and early-morning departures are cheaper.");
        }
    }

    /** Prices rise as seats or rooms run out. */
    private void demand(Item item, List<Adjustment> adj) {
        if (item.getCapacity() <= 0 || item.getAvailable() < 0) return;
        double ratio = Math.min(1.0, item.getAvailable() / (double) item.getCapacity());
        if (ratio <= 0.08) add(adj, "DEMAND", "Almost sold out", 18, "Only a handful left.");
        else if (ratio <= 0.18) add(adj, "DEMAND", "Selling fast", 12, "Fewer than one in five left.");
        else if (ratio <= 0.35) add(adj, "DEMAND", "High demand", 7, "Fewer than a third left.");
        else if (ratio >= 0.9 && item.getCapacity() >= 20) add(adj, "DEMAND", "Plenty available", -3, "Most of the inventory is still open.");
    }

    /**
     * A smooth drift between about -3% and +3%. It is a slow wave (about four days long) plus a smaller one (about a day and a half),
     * so the price wanders gently instead of jumping, and it moves a little every 15 minutes.
     */
    private static double noise(String id, LocalDateTime asOf) {
        long bucket = asOf.atZone(ZONE).toEpochSecond() / 900;
        double phase = (Math.abs((id == null ? "" : id).hashCode()) % 628) / 100.0;
        return 1.6 * Math.sin(phase + bucket * 0.0151) + 0.9 * Math.sin(phase * 1.7 + bucket * 0.0420);
    }

    // ---- helpers

    private static void add(List<Adjustment> list, String code, String label, double percent, String detail) {
        double p = round1(percent);
        if (p != 0) list.add(new Adjustment(code, label, p, detail));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    static String signed(double pct) {
        String n = Math.abs(pct) % 1 == 0 ? String.valueOf((long) Math.abs(pct)) : String.format(Locale.ENGLISH, "%.1f", Math.abs(pct));
        return (pct >= 0 ? "+" : "−") + n + "%";
    }

    /** The one or two biggest adjustments, as short labels for a price card. */
    private static List<String> tags(List<Adjustment> adj) {
        return adj.stream()
                .filter(a -> !"MARKET".equals(a.getCode()) && !"CAP".equals(a.getCode()) && Math.abs(a.getPercent()) >= 4)
                .sorted(Comparator.comparingDouble((Adjustment a) -> Math.abs(a.getPercent())).reversed())
                .limit(2)
                .map(a -> a.getLabel() + " " + signed(a.getPercent()))
                .toList();
    }
}
