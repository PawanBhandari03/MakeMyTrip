package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Interaction;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.InteractionRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.services.RecommendationService.Cand;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.Set;

/**
 * Creates demo travellers so "travellers like you" has something to learn from on a fresh database.
 * Sixty made-up people fall into five groups of tastes (beach, mountains, heritage, big cities, abroad); each has
 * booked or looked at a handful of places that fit their group. The demo customer account also gets a short history,
 * so a tester sees personal suggestions straight after logging in.
 */
@Service
public class RecommendationSeeder {
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private static final String[][] THEMES = {
            {"goa", "kochi", "pondicherry", "port blair", "gokarna", "varkala", "kovalam", "alleppey", "munnar", "mahabalipuram"},
            {"manali", "shimla", "mussoorie", "darjeeling", "leh", "gangtok", "nainital", "srinagar", "dehradun", "rishikesh", "kasol"},
            {"jaipur", "udaipur", "jodhpur", "agra", "varanasi", "hampi", "jaisalmer", "pushkar", "amritsar", "khajuraho"},
            {"delhi", "mumbai", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "gurgaon"},
            {"dubai", "singapore", "bangkok", "london", "paris", "maldives", "bali", "tokyo", "new york", "abu dhabi", "honolulu"}};

    @Autowired
    private RecommendationService recommendationService;
    @Autowired
    private InteractionRepository interactionRepository;
    @Autowired
    private UserRepository userRepository;

    public synchronized boolean needed() {
        return interactionRepository.countByDemoTrue() == 0;
    }

    /** Replaces every demo traveller with fresh ones that match the current catalogue. */
    public synchronized int seed() {
        interactionRepository.deleteByDemoTrue();
        recommendationService.refresh();
        List<Cand> stays = new ArrayList<>();
        for (Cand c : recommendationService.stays()) stays.add(c);
        if (stays.isEmpty()) return 0;

        Random rnd = new Random(42);
        List<Interaction> out = new ArrayList<>();
        int person = 0;
        for (String[] theme : THEMES) {
            List<Cand> fits = new ArrayList<>();
            for (Cand c : stays) {
                for (String place : theme) {
                    if (c.destination().equals(place) || c.destination().startsWith(place)) {
                        fits.add(c);
                        break;
                    }
                }
            }
            if (fits.size() < 4) fits = new ArrayList<>(stays);
            // the best-rated places are chosen most often, as they would be in real life
            fits.sort(Comparator.comparingDouble(Cand::rating).reversed());
            for (int n = 0; n < 12; n++) {
                person++;
                String user = "demo-traveller-" + person;
                int picks = 4 + rnd.nextInt(4);
                Set<String> done = new java.util.HashSet<>();
                for (int k = 0; k < picks; k++) {
                    Cand c = fits.get(biased(rnd, fits.size()));
                    if (!done.add(c.key())) continue;
                    out.add(make(user, c, rnd.nextInt(100) < 55 ? "BOOK" : "VIEW", rnd));
                }
                // everyone strays a little, so tastes overlap between groups
                Cand stray = stays.get(rnd.nextInt(stays.size()));
                if (done.add(stray.key())) out.add(make(user, stray, "VIEW", rnd));
            }
        }
        interactionRepository.saveAll(out);
        seedDemoUser();
        recommendationService.refresh();
        return out.size();
    }

    /** Gives the demo customer a beach-and-hills history so the first screen already looks personal. */
    public synchronized void seedDemoUser() {
        Users demo = userRepository.findByEmail("user@makemytrip.com");
        if (demo == null) return;
        if (!interactionRepository.findTop300ByUserIdOrderByAtDesc(demo.getId()).isEmpty()) return;
        recommendationService.refresh();
        List<Cand> beach = new ArrayList<>();
        for (Cand c : recommendationService.stays()) {
            if (c.destination().equals("goa") || c.destination().startsWith("kochi") || c.destination().equals("pondicherry")) beach.add(c);
        }
        beach.sort(Comparator.comparingDouble(Cand::rating).reversed());
        Random rnd = new Random(7);
        List<Interaction> out = new ArrayList<>();
        for (int i = 0; i < Math.min(4, beach.size()); i++) out.add(make(demo.getId(), beach.get(i), "VIEW", rnd));
        Interaction search = new Interaction();
        search.setUserId(demo.getId());
        search.setType("SEARCH");
        search.setDestination("goa");
        search.setQuery("Goa");
        search.setAt(LocalDateTime.now().minusDays(1).withNano(0).format(STAMP));
        search.setDemo(true);
        out.add(search);
        interactionRepository.saveAll(out);
    }

    private Interaction make(String user, Cand c, String type, Random rnd) {
        Interaction i = new Interaction();
        i.setUserId(user);
        i.setCategory(c.category());
        i.setItemId(c.id());
        i.setType(type);
        i.setDestination(c.destination());
        i.setAt(LocalDateTime.now().minusDays(1 + rnd.nextInt(60)).withNano(0).format(STAMP));
        i.setDemo(true);
        return i;
    }

    /** Leans towards the start of a list: a random index with a bias for small values. */
    private static int biased(Random rnd, int size) {
        double x = rnd.nextDouble();
        return Math.min(size - 1, (int) (x * x * size));
    }
}
