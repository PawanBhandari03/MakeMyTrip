package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.repositories.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/** Creates believable demo reviews for hotels, homestays and holiday packages, and sets their rating from them. */
@Service
public class ReviewSeeder {
    private static final String[] NAMES = {"Aarav S.", "Priya M.", "Rohan K.", "Ananya R.", "Vikram P.", "Sneha D.", "Arjun T.", "Kavya N.",
            "Rahul G.", "Meera J.", "Karan B.", "Ishita V.", "Siddharth L.", "Neha A.", "Aditya C.", "Pooja H.", "Manish Y.", "Divya Q.",
            "Harsh W.", "Tanvi F.", "Nikhil Z.", "Riya O.", "Sanjay U.", "Shruti E."};

    private static final String[][] STAY_TITLES = {
            {"Not worth it", "Disappointing stay", "Needs improvement", "Expected much better", "Would not return"},
            {"Average stay", "Okay for the price", "Decent but dated", "Fine for one night", "Nothing special"},
            {"Good stay", "Comfortable and clean", "Nice location", "Solid value", "Pleasant overall"},
            {"Great stay!", "Really enjoyed it", "Would stay again", "Lovely property", "Highly recommended"},
            {"Perfect getaway", "Exceeded expectations", "Loved every minute", "Superb in every way", "Five stars, easily"}};
    // Each tier is a pool of sentences; a review is two or three of them, so no two read alike.
    private static final String[][] STAY_TEXT = {
            {"The room was not as clean as shown in the photos.", "Check-in took far too long and nobody seemed to know why.", "It was noisy at night and we barely slept.",
                    "The air conditioning struggled and was never properly fixed.", "Staff tried to help, but little actually got sorted.", "Hard to recommend at this price.",
                    "Breakfast was cold and the choice was very limited."},
            {"The location is convenient, but the rooms feel a little tired.", "Breakfast was average and the coffee was weak.", "Clean enough and the staff were polite.",
                    "The wifi kept dropping through the evening.", "It does the job for a short trip.", "Bathroom could use a refresh, otherwise no real complaints.",
                    "Fair for what we paid, though I would look at other options next time."},
            {"Clean room, comfortable bed and a helpful front desk.", "Breakfast had good variety and was served on time.", "Easy to reach and quiet at night.",
                    "The staff arranged a late check-out without any fuss.", "A couple of small things could be better, but we were happy overall.", "Good value for money.",
                    "The room was a bit small, but spotless and well kept."},
            {"Friendly staff who made us feel welcome from the first minute.", "The room was spotless and the view was great.", "Food at the restaurant was tasty and reasonably priced.",
                    "Quick check-in and a spacious room.", "The pool was clean and rarely crowded.", "We had a very pleasant stay and would happily come back.",
                    "Great location with plenty to eat and see nearby."},
            {"Everything was spot on: the room, the food and the service.", "The staff remembered our names and went out of their way for us.", "Spotless rooms and a wonderful breakfast spread.",
                    "The best hospitality we have had in a long time.", "The surroundings are beautiful and very peaceful.", "Booking was easy and check-in took two minutes.",
                    "We are already planning our next visit."}};
    private static final String[][] HOLIDAY_TEXT = {
            {"The itinerary was rushed and the hotels were not what was promised.", "We lost half a day waiting for transport.", "Too many hours on the road and very little time at the sights.",
                    "Communication from the operator was poor.", "Meals were repetitive and the guide was hard to reach."},
            {"Some parts were good, some were disorganised.", "The guide was friendly, but timings often slipped.", "Hotels were fine, though meals were repetitive.",
                    "A couple of stops felt skippable.", "An okay trip for the price."},
            {"A well planned trip with comfortable hotels and a helpful guide.", "A few timings were tight, but we saw everything we wanted.", "Pickups were on time and the drivers were careful.",
                    "Good package for the price.", "The itinerary had a nice balance of sightseeing and rest."},
            {"The guide knew the places well and kept everyone engaged.", "Hotels were great and everything ran on time.", "Great for families, our kids enjoyed every day.",
                    "Smooth, well organised and good value.", "The driver was careful and courteous throughout."},
            {"Every detail was taken care of and the experiences were unforgettable.", "Beautiful places, wonderful hosts and not a single hiccup.", "The best holiday we have taken in years.",
                    "We are already planning another trip with them.", "Worth every rupee."}};
    private static final String[] REPLIES = {
            "Thank you for your feedback! We are glad you enjoyed your stay and hope to welcome you again soon.",
            "Thanks for sharing this. We are sorry it fell short and have passed your comments to the team so we can do better.",
            "We really appreciate your kind words. Looking forward to hosting you again!"};

    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;

    public synchronized boolean needed() {
        return reviewRepository.countByDemoTrue() == 0;
    }

    public synchronized int seed() {
        reviewRepository.deleteByDemoTrue();
        List<Review> out = new ArrayList<>();

        List<Hotel> hotels = new ArrayList<>();
        for (Hotel h : hotelRepository.findAll()) {
            if (!h.isDemo()) continue;
            List<Review> rs = reviewsFor("HOTEL", h.getId(), h.gethotelName() + ", " + h.getLocation(), h.getRating(), false);
            if (!rs.isEmpty()) h.setRating(average(rs));
            out.addAll(rs);
            hotels.add(h);
        }
        hotelRepository.saveAll(hotels);

        List<Listing> listings = new ArrayList<>();
        for (Listing l : listingRepository.findAll()) {
            if (!l.isDemo() || !("HOMESTAY".equals(l.getCategory()) || "HOLIDAY".equals(l.getCategory()))) continue;
            List<Review> rs = reviewsFor(l.getCategory(), l.getId(), l.getName(), l.getRating(), "HOLIDAY".equals(l.getCategory()));
            if (!rs.isEmpty()) l.setRating(average(rs));
            out.addAll(rs);
            listings.add(l);
        }
        listingRepository.saveAll(listings);

        reviewRepository.saveAll(out);
        return out.size();
    }

    private List<Review> reviewsFor(String category, String itemId, String itemName, double target, boolean holiday) {
        Random rnd = new Random(itemId.hashCode() * 31L + 7);
        int count = 3 + rnd.nextInt(6);
        if (target <= 0) target = 4.2;
        List<Review> list = new ArrayList<>();
        int usedName = rnd.nextInt(NAMES.length);
        for (int i = 0; i < count; i++) {
            int stars = (int) Math.round(target + rnd.nextGaussian() * 0.75);
            stars = Math.max(1, Math.min(5, stars));
            int tier = stars - 1;
            String[] texts = holiday ? HOLIDAY_TEXT[tier] : STAY_TEXT[tier];
            Review r = new Review();
            r.setUserId("demo-user-" + ((usedName + i * 5) % NAMES.length));
            r.setUserName(NAMES[(usedName + i * 5) % NAMES.length]);
            r.setCategory(category);
            r.setItemId(itemId);
            r.setItemName(itemName);
            r.setRating(stars);
            r.setTitle(STAY_TITLES[tier][rnd.nextInt(STAY_TITLES[tier].length)]);
            r.setText(compose(texts, rnd));
            LocalDateTime when = LocalDateTime.now().minusDays(2 + rnd.nextInt(170)).withNano(0).withSecond(0);
            r.setCreatedAt(when.toString());
            r.setUpdatedAt(when.toString());
            r.setVerified(rnd.nextInt(10) < 8);
            r.setHelpfulBaseline(stars >= 4 ? rnd.nextInt(26) : rnd.nextInt(12));
            r.setHelpfulCount(r.getHelpfulBaseline());
            r.setDemo(true);
            if (rnd.nextInt(4) == 0) {
                Review.Reply reply = new Review.Reply();
                reply.setId(UUID.randomUUID().toString().substring(0, 8));
                reply.setUserId("demo-admin");
                reply.setUserName("MakeMyTrip team");
                reply.setRole("ADMIN");
                reply.setText(REPLIES[stars <= 2 ? 1 : rnd.nextInt(2) * 2]);
                reply.setCreatedAt(when.plusDays(1 + rnd.nextInt(3)).toString());
                r.getReplies().add(reply);
            }
            list.add(r);
        }
        return list;
    }

    /** Two or three different sentences from the pool, in a random order. */
    private static String compose(String[] pool, Random rnd) {
        List<String> all = new ArrayList<>(List.of(pool));
        java.util.Collections.shuffle(all, rnd);
        int n = Math.min(all.size(), 2 + rnd.nextInt(2));
        return String.join(" ", all.subList(0, n));
    }

    private static double average(List<Review> rs) {
        return Math.round(rs.stream().mapToInt(Review::getRating).average().orElse(4) * 10) / 10.0;
    }
}
