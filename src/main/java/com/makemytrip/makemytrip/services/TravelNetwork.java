package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Builds a believable travel network from real city coordinates.
 * Distances decide which places are connected, how long a trip takes and what it costs,
 * so adding a city to {@link #CITY_ROWS} automatically gives it flights, trains, buses and cabs.
 */
final class TravelNetwork {

    private TravelNetwork() {}

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    static final int FLIGHT_DAYS = 14;

    /** name | latitude | longitude | country | services: A airport, T train, B bus, C cab, H hotels, S homestays */
    private static final String[] CITY_ROWS = {
            // --- India: metros and big cities
            "Delhi|28.61|77.21|India|ATBCH", "Mumbai|19.08|72.88|India|ATBCH", "Bengaluru|12.97|77.59|India|ATBCH",
            "Kolkata|22.57|88.36|India|ATBCH", "Chennai|13.08|80.27|India|ATBCH", "Hyderabad|17.39|78.49|India|ATBCH",
            "Pune|18.52|73.86|India|ATBCH", "Ahmedabad|23.02|72.57|India|ATBCH", "Jaipur|26.91|75.79|India|ATBCHS",
            "Goa|15.50|73.83|India|ATBCHS", "Lucknow|26.85|80.95|India|ATBCH", "Varanasi|25.32|82.97|India|ATBCHS",
            "Kochi|9.93|76.27|India|ATBCHS", "Thiruvananthapuram|8.52|76.94|India|ATBCH", "Visakhapatnam|17.69|83.22|India|ATBCH",
            "Indore|22.72|75.86|India|ATBCH", "Bhopal|23.26|77.41|India|ATBCH", "Nagpur|21.15|79.09|India|ATBCH",
            "Surat|21.17|72.83|India|ATBCH", "Amritsar|31.63|74.87|India|ATBCH", "Patna|25.59|85.14|India|ATBCH",
            "Guwahati|26.14|91.74|India|ATBCH", "Coimbatore|11.02|76.96|India|ATBCH", "Madurai|9.93|78.12|India|ATBCH",
            "Mangaluru|12.91|74.86|India|ATBCH", "Bhubaneswar|20.30|85.82|India|ATBCH", "Ranchi|23.34|85.31|India|ATBCH",
            "Chandigarh|30.73|76.78|India|ATBCH", "Jodhpur|26.24|73.02|India|ATBCH", "Raipur|21.25|81.63|India|ATBCH",
            "Dehradun|30.32|78.03|India|ATBCHS", "Udaipur|24.58|73.71|India|ATBCHS", "Agra|27.18|78.02|India|TBCH",
            // --- India: hills, beaches and smaller towns
            "Srinagar|34.08|74.80|India|ABCHS", "Leh|34.15|77.58|India|ACHS", "Shimla|31.10|77.17|India|BCHS",
            "Manali|32.24|77.19|India|BCHS", "Rishikesh|30.09|78.27|India|TBCHS", "Mysuru|12.30|76.64|India|TBCHS",
            "Munnar|10.09|77.06|India|BCHS", "Alleppey|9.49|76.34|India|TBCHS", "Ooty|11.41|76.70|India|BCHS",
            "Pondicherry|11.93|79.83|India|BCHS", "Darjeeling|27.04|88.26|India|BCHS", "Coorg|12.34|75.81|India|BCHS",
            "Warangal|17.97|79.60|India|TBC", "Saputara|20.58|73.75|India|BCHS", "Port Blair|11.62|92.73|India|AHS",
            // --- International
            "Dubai|25.20|55.27|United Arab Emirates|AH", "Abu Dhabi|24.45|54.38|United Arab Emirates|AH",
            "London|51.51|-0.13|United Kingdom|AH", "Singapore|1.35|103.82|Singapore|AH", "Bangkok|13.76|100.50|Thailand|AH",
            "New York|40.71|-74.01|United States|AH", "San Francisco|37.77|-122.42|United States|AH",
            "Los Angeles|34.05|-118.24|United States|AH", "Honolulu|21.31|-157.86|United States|AH",
            "Paris|48.86|2.35|France|AH", "Tokyo|35.68|139.69|Japan|AH", "Kathmandu|27.72|85.32|Nepal|AH",
            "Kuala Lumpur|3.14|101.69|Malaysia|AH", "Doha|25.29|51.53|Qatar|AH", "Muscat|23.59|58.41|Oman|AH",
            "Colombo|6.93|79.86|Sri Lanka|AH", "Male|4.18|73.51|Maldives|AH", "Dhaka|23.81|90.41|Bangladesh|AH",
            "Hong Kong|22.32|114.17|Hong Kong|AH", "Sydney|-33.87|151.21|Australia|AH", "Toronto|43.65|-79.38|Canada|AH",
            "Frankfurt|50.11|8.68|Germany|AH", "Istanbul|41.01|28.98|Turkey|AH", "Bali|-8.65|115.22|Indonesia|AH",
    };

    private static final class City {
        final String name;
        final double lat;
        final double lon;
        final String country;
        final String services;

        City(String row) {
            String[] c = row.split("\\|");
            name = c[0];
            lat = Double.parseDouble(c[1]);
            lon = Double.parseDouble(c[2]);
            country = c[3];
            services = c[4];
        }

        boolean has(char service) {
            return services.indexOf(service) >= 0;
        }

        boolean indian() {
            return "India".equals(country);
        }
    }

    private static final List<City> CITIES = new ArrayList<>();
    private static final Map<String, City> BY_NAME = new LinkedHashMap<>();

    static {
        for (String row : CITY_ROWS) {
            City c = new City(row);
            CITIES.add(c);
            BY_NAME.put(c.name, c);
        }
    }

    private static final List<String> CORE_HUBS = List.of("Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chennai", "Hyderabad");
    private static final List<String> SECOND_HUBS = List.of("Pune", "Ahmedabad", "Jaipur", "Goa");
    private static final List<String> RAIL_HUBS = List.of("Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad",
            "Pune", "Ahmedabad", "Jaipur", "Lucknow");

    // ------------------------------------------------------------------ helpers

    private static double km(City a, City b) {
        double r = 6371;
        double dLat = Math.toRadians(b.lat - a.lat);
        double dLon = Math.toRadians(b.lon - a.lon);
        double x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(a.lat)) * Math.cos(Math.toRadians(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    private static List<City> withService(char service, boolean indianOnly) {
        List<City> out = new ArrayList<>();
        for (City c : CITIES) {
            if (c.has(service) && (!indianOnly || c.indian())) out.add(c);
        }
        return out;
    }

    private static List<City> nearest(City from, List<City> candidates, int n, double maxKm) {
        return candidates.stream()
                .filter(c -> !c.name.equals(from.name) && km(from, c) <= maxKm)
                .sorted(Comparator.comparingDouble(c -> km(from, c)))
                .limit(n)
                .toList();
    }

    private static String key(String a, String b) {
        return a.compareTo(b) < 0 ? a + "|" + b : b + "|" + a;
    }

    /** Unordered city pairs, e.g. "Delhi|Mumbai". */
    private static Set<String> pairSet() {
        return new LinkedHashSet<>();
    }

    private static String clock(LocalDateTime t) {
        return String.format("%02d:%02d", t.getHour(), t.getMinute());
    }

    private static String arrivalClock(LocalDateTime dep, long minutes) {
        LocalDateTime arr = dep.plusMinutes(minutes);
        long days = java.time.temporal.ChronoUnit.DAYS.between(dep.toLocalDate(), arr.toLocalDate());
        return clock(arr) + (days > 0 ? " +" + days : "");
    }

    private static String durationText(long minutes) {
        return (minutes / 60) + "h " + String.format("%02d", minutes % 60) + "m";
    }

    private static double roundTo(double value, int step) {
        return Math.max(step, Math.round(value / step) * step);
    }

    private static Listing base(String category, String name, double price, String unit, int available) {
        Listing l = new Listing();
        l.setCategory(category);
        l.setName(name);
        l.setPrice(price);
        l.setUnit(unit);
        l.setAvailable(available);
        l.setDemo(true);
        return l;
    }

    // ------------------------------------------------------------------ flights

    static List<Flight> flights() {
        List<City> air = withService('A', false);
        List<City> hubs = new ArrayList<>();
        for (String n : CORE_HUBS) hubs.add(BY_NAME.get(n));
        List<City> bigHubs = new ArrayList<>(hubs);
        for (String n : SECOND_HUBS) bigHubs.add(BY_NAME.get(n));
        List<City> core = hubs;

        Set<String> corePairs = pairSet();
        Set<String> domestic = pairSet();
        Set<String> international = pairSet();

        for (int i = 0; i < core.size(); i++)
            for (int j = i + 1; j < core.size(); j++) corePairs.add(key(core.get(i).name, core.get(j).name));
        domestic.addAll(corePairs);
        for (int i = 0; i < bigHubs.size(); i++)
            for (int j = i + 1; j < bigHubs.size(); j++) domestic.add(key(bigHubs.get(i).name, bigHubs.get(j).name));

        for (City c : air) {
            if (c.indian()) {
                if (bigHubs.stream().noneMatch(h -> h.name.equals(c.name))) {
                    for (City h : nearest(c, bigHubs, 3, 3000)) domestic.add(key(c.name, h.name));
                }
            } else {
                for (City h : nearest(c, core, 3, 20000)) international.add(key(c.name, h.name));
                if (c.country.equals("United Arab Emirates") || c.country.equals("Qatar") || c.country.equals("Oman")) {
                    international.add(key(c.name, "Goa"));
                    international.add(key(c.name, "Kochi"));
                }
            }
        }

        String[][] domesticCarriers = {{"IndiGo", "6E"}, {"Air India", "AI"}, {"Vistara", "UK"}, {"SpiceJet", "SG"}, {"Akasa Air", "QP"}};
        String[][] intlCarriers = {{"Air India", "AI"}, {"Emirates", "EK"}, {"Singapore Airlines", "SQ"},
                {"British Airways", "BA"}, {"Qatar Airways", "QR"}, {"IndiGo", "6E"}, {"Lufthansa", "LH"}, {"Etihad", "EY"}};
        int[][] windows = {{6, 9}, {12, 15}, {18, 22}};

        Random rnd = new Random(42);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime today = now.withMinute(0).withSecond(0).withNano(0);
        List<Flight> out = new ArrayList<>();
        int[] number = {120};

        for (String pair : domestic) {
            String[] p = pair.split("\\|");
            City a = BY_NAME.get(p[0]);
            City b = BY_NAME.get(p[1]);
            boolean trunk = corePairs.contains(pair);
            addFlights(out, rnd, today, now, a, b, number, domesticCarriers, trunk ? windows : null, windows, false);
        }
        for (String pair : international) {
            String[] p = pair.split("\\|");
            addFlights(out, rnd, today, now, BY_NAME.get(p[0]), BY_NAME.get(p[1]), number, intlCarriers, null, new int[][]{{0, 23}}, true);
        }
        return out;
    }

    private static void addFlights(List<Flight> out, Random rnd, LocalDateTime today, LocalDateTime now, City a, City b,
                                   int[] number, String[][] carriers, int[][] allWindows, int[][] pickFrom, boolean intl) {
        double dist = km(a, b);
        double basePrice = intl ? 7000 + dist * 4.2 : 1800 + dist * 3.3;
        long duration = Math.round(intl ? 70 + dist / 12.5 : 45 + dist / 11.5);
        for (int dir = 0; dir < 2; dir++) {
            City from = dir == 0 ? a : b;
            City to = dir == 0 ? b : a;
            int[][] windows = allWindows != null ? allWindows : new int[][]{pickFrom[rnd.nextInt(pickFrom.length)]};
            for (int day = 0; day < FLIGHT_DAYS; day++) {
                for (int[] w : windows) {
                    LocalDateTime dep = today.plusDays(day).withHour(w[0] + rnd.nextInt(w[1] - w[0] + 1)).withMinute(5 * rnd.nextInt(12));
                    if (dep.isBefore(now.plusHours(2))) continue; // never create flights that already left
                    String[] airline = carriers[rnd.nextInt(carriers.length)];
                    Flight f = new Flight();
                    f.setFlightName(airline[0] + " " + airline[1] + "-" + (100 + ((number[0] += 3 + rnd.nextInt(7)) % 8900)));
                    f.setFrom(from.name);
                    f.setTo(to.name);
                    f.setDepartureTime(dep.format(FMT));
                    f.setArrivalTime(dep.plusMinutes(duration + rnd.nextInt(15)).format(FMT));
                    f.setPrice(roundTo(basePrice * (0.85 + rnd.nextDouble() * 0.35), 10));
                    f.setAvailableSeats(40 + rnd.nextInt(140));
                    f.setDemo(true);
                    out.add(f);
                }
            }
        }
    }

    // ------------------------------------------------------------------ trains

    static void addTrains(List<Listing> out) {
        List<City> rail = withService('T', true);
        Set<String> hubPairs = pairSet();
        Set<String> pairs = pairSet();
        for (int i = 0; i < RAIL_HUBS.size(); i++) {
            for (int j = i + 1; j < RAIL_HUBS.size(); j++) {
                String k = key(RAIL_HUBS.get(i), RAIL_HUBS.get(j));
                hubPairs.add(k);
                pairs.add(k);
            }
        }
        for (City c : rail) {
            for (City n : nearest(c, rail, 4, 1100)) pairs.add(key(c.name, n.name));
        }

        Random rnd = new Random(7);
        int serial = 12000;
        for (String pair : pairs) {
            String[] p = pair.split("\\|");
            City a = BY_NAME.get(p[0]);
            City b = BY_NAME.get(p[1]);
            double railKm = km(a, b) * 1.25;
            boolean hub = hubPairs.contains(pair);
            int trains = hub ? 2 : 1;
            for (int t = 0; t < trains; t++) {
                String kind;
                double speed;
                String[][] classes;
                if (railKm <= 750 && t == 0) {
                    kind = "Shatabdi Express";
                    speed = 75;
                    classes = new String[][]{{"Chair Car", "CC"}, {"Executive Chair", "EC"}};
                } else if (hub && t == 0) {
                    kind = "Rajdhani Express";
                    speed = 82;
                    classes = new String[][]{{"AC 3 Tier", "3A"}, {"AC 2 Tier", "2A"}, {"AC First", "1A"}};
                } else if (hub) {
                    kind = "Duronto Express";
                    speed = 72;
                    classes = new String[][]{{"AC 3 Tier", "3A"}, {"AC 2 Tier", "2A"}};
                } else {
                    kind = "Superfast Express";
                    speed = 58;
                    classes = new String[][]{{"Sleeper", "SL"}, {"AC 3 Tier", "3A"}, {"AC 2 Tier", "2A"}};
                }
                long minutes = Math.round(railKm / speed * 60);
                for (int dir = 0; dir < 2; dir++) {
                    City from = dir == 0 ? a : b;
                    City to = dir == 0 ? b : a;
                    LocalDateTime dep = LocalDateTime.now().withHour(rnd.nextInt(24)).withMinute(5 * rnd.nextInt(12));
                    serial += 1 + rnd.nextInt(4);
                    String name = from.name + " " + kind + " (" + serial + ")";
                    for (String[] cls : classes) {
                        double fare = switch (cls[1]) {
                            case "SL" -> 120 + railKm * 0.45;
                            case "3A" -> 240 + railKm * 1.15;
                            case "2A" -> 330 + railKm * 1.65;
                            case "1A" -> 500 + railKm * 2.8;
                            case "CC" -> 180 + railKm * 1.35;
                            default -> 320 + railKm * 2.5; // EC
                        };
                        Listing l = base("TRAIN", name, roundTo(fare, 5), "per ticket", 30 + rnd.nextInt(130));
                        l.setType(cls[0]);
                        l.setFrom(from.name);
                        l.setTo(to.name);
                        l.setDepartureTime(clock(dep));
                        l.setArrivalTime(arrivalClock(dep, minutes));
                        l.setDuration(durationText(minutes));
                        l.setProvider("Indian Railways");
                        l.setFeatures("Runs daily");
                        l.setRating(Math.round((3.7 + rnd.nextDouble() * 1.1) * 10) / 10.0);
                        out.add(l);
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------ buses

    static void addBuses(List<Listing> out) {
        List<City> road = withService('B', true);
        String[] operators = {"Orange Travels", "VRL Travels", "SRS Travels", "Neeta Travels", "Zingbus", "IntrCity SmartBus", "Paulo Travels", "KSRTC Airavat"};
        String[] types = {"Volvo AC Sleeper (2+1)", "AC Seater (2+2)", "Scania AC Semi-Sleeper (2+2)", "Multi-Axle AC Sleeper"};
        Set<String> pairs = pairSet();
        for (City c : road) {
            for (City n : nearest(c, road, 3, 750)) pairs.add(key(c.name, n.name));
        }
        Random rnd = new Random(11);
        for (String pair : pairs) {
            String[] p = pair.split("\\|");
            City a = BY_NAME.get(p[0]);
            City b = BY_NAME.get(p[1]);
            double roadKm = km(a, b) * 1.3;
            long minutes = Math.round(roadKm / 52 * 60);
            int services = roadKm > 200 ? 2 : 1;
            for (int s = 0; s < services; s++) {
                String operator = operators[rnd.nextInt(operators.length)];
                String type = types[rnd.nextInt(types.length)];
                boolean sleeper = type.contains("Sleeper");
                for (int dir = 0; dir < 2; dir++) {
                    City from = dir == 0 ? a : b;
                    City to = dir == 0 ? b : a;
                    int hour = roadKm > 380 ? 19 + rnd.nextInt(4) : 6 + rnd.nextInt(12);
                    LocalDateTime dep = LocalDateTime.now().withHour(hour).withMinute(5 * rnd.nextInt(12));
                    Listing l = base("BUS", operator, roundTo(sleeper ? 320 + roadKm * 1.5 : 220 + roadKm * 1.1, 10), "per seat", 12 + rnd.nextInt(30));
                    l.setProvider(operator);
                    l.setType(type);
                    l.setFrom(from.name);
                    l.setTo(to.name);
                    l.setDepartureTime(clock(dep));
                    l.setArrivalTime(arrivalClock(dep, minutes));
                    l.setDuration(durationText(minutes));
                    l.setFeatures("Live tracking, Charging point, Water bottle");
                    l.setRating(Math.round((3.7 + rnd.nextDouble() * 1.1) * 10) / 10.0);
                    out.add(l);
                }
            }
        }
    }

    // ------------------------------------------------------------------ cabs

    static void addCabs(List<Listing> out) {
        List<City> road = withService('C', true);
        Set<String> pairs = pairSet();
        for (City c : road) {
            for (City n : nearest(c, road, 3, 480)) pairs.add(key(c.name, n.name));
        }
        String[] types = {"Hatchback (Swift or similar)", "Sedan (Dzire or similar)", "SUV (Innova or similar)"};
        String[] seats = {"4 seats", "4 seats", "6 seats"};
        double[] perKm = {11, 13, 17};
        Random rnd = new Random(23);
        for (String pair : pairs) {
            String[] p = pair.split("\\|");
            City a = BY_NAME.get(p[0]);
            City b = BY_NAME.get(p[1]);
            double roadKm = km(a, b) * 1.3;
            long minutes = Math.round(roadKm / 48 * 60);
            for (int dir = 0; dir < 2; dir++) {
                City from = dir == 0 ? a : b;
                City to = dir == 0 ? b : a;
                for (int i = 0; i < 3; i++) {
                    Listing l = base("CAB", types[i].split(" \\(")[0] + " cab", roundTo(450 + roadKm * perKm[i], 50), "per cab", 10 + rnd.nextInt(20));
                    l.setType(types[i]);
                    l.setProvider("MakeMyTrip Clone Cabs");
                    l.setFrom(from.name);
                    l.setTo(to.name);
                    l.setDuration(durationText(minutes));
                    l.setFeatures(seats[i] + ", AC, Driver included, Fuel included, Free cancellation");
                    l.setRating(4.0 + i * 0.2);
                    out.add(l);
                }
            }
        }
    }

    // ------------------------------------------------------------------ hotels and homestays

    private static final String[] HOTEL_IMAGES = {
            "1566073771259-6a8506099945", "1582719478250-c89cae4dc85b", "1566665797739-1674de7a421a", "1571896349842-33c89424de2d",
            "1542314831-068cd1dbfeeb", "1551882547-ff40c63fe5fa", "1564501049412-61c2a3083791", "1445019980597-93fa8acb246c",
            "1520250497591-112f2f40a3f4", "1455587734955-081b22074882", "1584132967334-10e028bd69f7", "1590490360182-c33d57733427",
            "1611892440504-42a792e24d32", "1578683010236-d716f9a3f461", "1496417263034-38ec4f0b665a", "1618773928121-c32242e63f39"};
    private static final String[] STAY_IMAGES = {
            "1512453979798-5ea266f8880c", "1506905925346-21bda4d32df4", "1544735716-392fe2489ffa", "1626621341517-bbf3d9990a23",
            "1593181629936-11c609b8db9b", "1469474968028-56623f02e42e", "1506744038136-46273834b3fb", "1477587458883-47145ed94245",
            "1493246507139-91e8fad9978e", "1507525428034-b723cf961d3e", "1520454974749-611b7248ffdb"};

    private static String img(String id) {
        return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=800&q=80";
    }

    /** Adds hotels so that every city that supports hotels has at least {@code minimum} of them. */
    static void addHotels(List<Hotel> out) {
        String[] names = {"Grand %s", "%s Residency", "Hotel %s Palace", "The %s Heritage", "%s Comfort Inn", "Royal %s Suites", "%s Plaza", "Hotel %s Central"};
        String[] amenities = {"Wi-Fi, Gym, Restaurant, Power Backup", "Wi-Fi, Pool, Restaurant, Bar", "Wi-Fi, Breakfast Included, Airport Shuttle",
                "Wi-Fi, Pool, Spa, Restaurant", "Wi-Fi, Restaurant, Garden, Power Backup", "Wi-Fi, Gym, Breakfast Included, Rooftop Cafe"};
        Random rnd = new Random(99);
        for (City c : CITIES) {
            if (!c.has('H')) continue;
            long existing = out.stream().filter(h -> c.name.equalsIgnoreCase(h.getLocation())).count();
            int minimum = c.indian() ? 4 : 2;
            double tier = c.indian() ? (c.has('A') && !c.has('S') ? 1.0 : 0.8) : 2.4;
            for (long i = existing; i < minimum; i++) {
                Hotel h = new Hotel();
                h.sethotelName(String.format(names[rnd.nextInt(names.length)], c.name));
                h.setLocation(c.name);
                h.setPricePerNight(roundTo((2800 + rnd.nextInt(9000)) * tier, 100));
                h.setAvailableRooms(20 + rnd.nextInt(70));
                h.setRating(Math.round((3.7 + rnd.nextDouble() * 1.1) * 10) / 10.0);
                h.setamenities(amenities[rnd.nextInt(amenities.length)]);
                h.setDescription("A comfortable stay in " + c.name + " with well-kept rooms, friendly service and easy access to the main sights.");
                h.setImageUrl(img(HOTEL_IMAGES[rnd.nextInt(HOTEL_IMAGES.length)]));
                h.setDemo(true);
                out.add(h);
            }
        }
    }

    static void addHomestays(List<Listing> out) {
        String[] names = {"%s Heritage Home", "%s Hillside Cottage", "The %s Retreat", "%s Garden Villa", "Casa %s"};
        String[] features = {"Home-cooked Meals, Garden, Wi-Fi, Bonfire", "Mountain View, Breakfast Included, Wi-Fi", "Private Kitchen, Courtyard, Wi-Fi, Parking",
                "Local Guide, Home-cooked Meals, Terrace, Wi-Fi"};
        Random rnd = new Random(5);
        for (City c : CITIES) {
            if (!c.has('S')) continue;
            long existing = out.stream().filter(l -> "HOMESTAY".equals(l.getCategory()) && c.name.equalsIgnoreCase(l.getLocation())).count();
            for (long i = existing; i < 3; i++) {
                Listing l = base("HOMESTAY", String.format(names[rnd.nextInt(names.length)], c.name), roundTo(2200 + rnd.nextInt(5200), 100), "per night", 3 + rnd.nextInt(9));
                l.setLocation(c.name);
                l.setType("Entire home");
                l.setProvider("Hosted stay");
                l.setRating(Math.round((4.0 + rnd.nextDouble() * 0.9) * 10) / 10.0);
                l.setFeatures(features[rnd.nextInt(features.length)]);
                l.setDescription("A welcoming local home in " + c.name + " where the hosts cook, guide and make you feel part of the family.");
                l.setImageUrl(img(STAY_IMAGES[rnd.nextInt(STAY_IMAGES.length)]));
                out.add(l);
            }
        }
    }
}
