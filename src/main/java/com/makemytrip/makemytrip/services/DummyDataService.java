package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Loads demo data so every page has something to show.
 * Everything created here is flagged {@code demo = true}. Reloading only removes those rows,
 * so flights, hotels or listings added by an admin are never touched.
 */
@Service
public class DummyDataService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private HotelRepository hotelRepository;
    @Autowired
    private ListingRepository listingRepository;

    private static String img(String id) {
        return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=800&q=80";
    }

    /**
     * @param reset when true, all previous demo rows are removed and regenerated;
     *              when false, only missing or outdated demo data is created.
     */
    public Map<String, Object> load(boolean reset) {
        Map<String, Object> result = new LinkedHashMap<>();

        boolean flightsOutdated = true;
        Flight latest = flightRepository.findFirstByDemoTrueOrderByDepartureTimeDesc();
        if (latest != null && latest.getDepartureTime() != null) {
            flightsOutdated = latest.getDepartureTime().compareTo(LocalDateTime.now().plusDays(3).format(FMT)) < 0;
        }
        if (reset || flightsOutdated) {
            flightRepository.deleteByDemoTrue();
            result.put("flights", flightRepository.saveAll(buildFlights()).size());
        }
        if (reset || hotelRepository.countByDemoTrue() == 0) {
            hotelRepository.deleteByDemoTrue();
            result.put("hotels", hotelRepository.saveAll(buildHotels()).size());
        }
        if (reset || listingRepository.countByDemoTrue() == 0) {
            listingRepository.deleteByDemoTrue();
            result.put("listings", listingRepository.saveAll(buildListings()).size());
        }
        return result;
    }

    // ------------------------------------------------------------------ flights

    private List<Flight> buildFlights() {
        return TravelNetwork.flights();
    }

    // ------------------------------------------------------------------ hotels

    private List<Hotel> buildHotels() {
        // name | city | price per night | rooms | rating | amenities | description | image id
        String[] rows = {
                "The Grand Capital|Delhi|12500|35|4.6|Wi-Fi, Pool, Spa, Airport Shuttle, Restaurant|A five-star landmark minutes from Connaught Place with a rooftop pool and award-winning dining.|1566073771259-6a8506099945",
                "Comfort Inn Karol Bagh|Delhi|4800|55|4.0|Wi-Fi, Gym, Breakfast Included, Power Backup|A reliable business hotel close to the metro with spacious rooms and a free breakfast.|1582719478250-c89cae4dc85b",
                "Heritage Haveli Delhi|Delhi|8200|28|4.4|Wi-Fi, Restaurant, Garden, Heritage Walks|A restored 1920s haveli with courtyard dining and old-Delhi charm.|1551882547-ff40c63fe5fa",
                "Luxury Palace|Mumbai|15000|40|4.7|Wi-Fi, Pool, Spa, Restaurant, Bar|A seafront palace hotel with a spa, three restaurants and views of the Arabian Sea.|1520250497591-112f2f40a3f4",
                "Sea View Residency|Mumbai|7500|60|4.2|Wi-Fi, Sea View, Restaurant, Gym|Modern rooms on Marine Drive with sunset views over the promenade.|1566665797739-1674de7a421a",
                "Juhu Beach Stay|Mumbai|5600|45|3.9|Wi-Fi, Beach Access, Breakfast Included|A relaxed stay a short walk from Juhu beach, ideal for short city breaks.|1564501049412-61c2a3083791",
                "Garden City Suites|Bengaluru|6500|70|4.3|Wi-Fi, Gym, Workspace, Breakfast Included|Business-friendly suites in the heart of MG Road with a garden terrace.|1587474260584-136574528ed5",
                "Tech Park Hotel|Bengaluru|5200|90|4.0|Wi-Fi, Workspace, Restaurant, Power Backup|Practical rooms next to the tech corridor, with fast Wi-Fi and a 24-hour cafe.|1455587734955-081b22074882",
                "The Leela Gardens|Bengaluru|11800|32|4.7|Wi-Fi, Pool, Spa, Fine Dining, Airport Shuttle|A luxury garden resort with a spa and an all-day dining room.|1445019980597-93fa8acb246c",
                "Seaside Resort|Goa|12000|45|4.6|Beach Access, Pool, Bar, Water Sports, Restaurant|A beachfront resort with private cabanas, water sports and a beach bar.|1520454974749-611b7248ffdb",
                "Candolim Retreat|Goa|6800|50|4.2|Wi-Fi, Pool, Restaurant, Power Backup|A friendly pool resort ten minutes from Candolim beach.|1571896349842-33c89424de2d",
                "Palolem Beach Huts|Goa|3900|25|4.1|Beach Access, Restaurant, Yoga Deck|Simple beach huts steps from the sand with a sunset yoga deck.|1507525428034-b723cf961d3e",
                "Rambagh Heritage|Jaipur|14200|30|4.8|Wi-Fi, Pool, Spa, Heritage Tours, Restaurant|A former royal residence turned palace hotel with manicured gardens.|1542314831-068cd1dbfeeb",
                "Pink City Inn|Jaipur|3800|48|3.9|Wi-Fi, Breakfast Included, Rooftop Cafe|A budget stay near Hawa Mahal with a rooftop cafe.|1584132967334-10e028bd69f7",
                "Amber View Hotel|Jaipur|7100|36|4.3|Wi-Fi, Pool, Restaurant, Fort Views|Comfortable rooms with views of Amber Fort and a pool terrace.|1590490360182-c33d57733427",
                "Marina Bay Hotel|Chennai|6100|65|4.1|Wi-Fi, Pool, Restaurant, Gym|A sea-facing hotel on the Marina with an outdoor pool.|1611892440504-42a792e24d32",
                "Coromandel Suites|Chennai|4500|58|4.0|Wi-Fi, Breakfast Included, Airport Shuttle|Clean, central suites with a free airport shuttle.|1578683010236-d716f9a3f461",
                "Heritage Haveli Kolkata|Kolkata|5600|30|4.2|Wi-Fi, Restaurant, Heritage Tours|A colonial-era mansion with period interiors and Bengali cuisine.|1496417263034-38ec4f0b665a",
                "Howrah Bridge Inn|Kolkata|3400|52|3.8|Wi-Fi, Breakfast Included, Power Backup|A simple and affordable stay close to the station and the river.|1618773928121-c32242e63f39",
                "Park Street Grand|Kolkata|8400|38|4.4|Wi-Fi, Pool, Bar, Restaurant, Gym|A stylish city hotel on Park Street, near the best cafes.|1455587734955-081b22074882",
                "Nizam Palace|Hyderabad|9800|34|4.6|Wi-Fi, Pool, Spa, Biryani Kitchen, Restaurant|A palace-style hotel serving legendary Hyderabadi biryani.|1566073771259-6a8506099945",
                "HITEC City Stay|Hyderabad|5400|80|4.1|Wi-Fi, Gym, Workspace, Restaurant|Smart rooms in the tech district with a rooftop gym.|1587474260584-136574528ed5",
                "Charminar Lodge|Hyderabad|2900|40|3.7|Wi-Fi, Breakfast Included|A no-frills lodge in the old city, minutes from Charminar.|1584132967334-10e028bd69f7",
                "Mountain View Hotel|Shimla|10000|30|4.5|Wi-Fi, Fireplace, Restaurant, Valley Views|Wood-panelled rooms with valley views and a log fireplace lounge.|1626621341517-bbf3d9990a23",
                "The Mall Road Residency|Shimla|6200|44|4.1|Wi-Fi, Heating, Breakfast Included|On Mall Road with easy access to shops and the Ridge.|1551882547-ff40c63fe5fa",
                "Deodar Cottages|Shimla|4400|20|4.3|Wi-Fi, Bonfire, Garden, Home-cooked Meals|Cosy cottages among deodar trees with a nightly bonfire.|1593181629936-11c609b8db9b",
                "Lake Palace View|Udaipur|13500|26|4.8|Wi-Fi, Pool, Lake Views, Spa, Restaurant|Rooms overlooking Lake Pichola with sunset boat rides on request.|1520250497591-112f2f40a3f4",
                "Udai Haveli|Udaipur|5200|32|4.3|Wi-Fi, Rooftop Restaurant, Heritage Tours|A family-run haveli with a rooftop restaurant and lake views.|1564501049412-61c2a3083791",
                "City Palace Inn|Udaipur|3600|40|3.9|Wi-Fi, Breakfast Included, Rooftop Cafe|Budget rooms five minutes from City Palace.|1618773928121-c32242e63f39",
                "Burj View Hotel|Dubai|14500|40|4.6|Wi-Fi, Pool, Spa, Restaurant, Airport Shuttle|Skyline views, a rooftop pool and a short ride from Dubai Mall.|1566073771259-6a8506099945",
                "Marina Sands Dubai|Dubai|8200|55|4.2|Wi-Fi, Pool, Gym, Breakfast Included|A comfortable marina-side stay with an infinity pool.|1520250497591-112f2f40a3f4",
                "Marina Bay View|Singapore|16500|45|4.7|Wi-Fi, Pool, Spa, Fine Dining, Gym|High-floor rooms overlooking Marina Bay and the Gardens.|1445019980597-93fa8acb246c",
                "Little India Inn|Singapore|7400|60|4.0|Wi-Fi, Breakfast Included, Rooftop Cafe|A compact, friendly hotel near the MRT and street food.|1584132967334-10e028bd69f7",
                "Sukhumvit Grand|Bangkok|6800|70|4.3|Wi-Fi, Pool, Restaurant, Gym|A modern city hotel next to the skytrain with a rooftop pool.|1455587734955-081b22074882",
                "Thames Riverside Hotel|London|19500|35|4.5|Wi-Fi, Restaurant, Bar, Concierge|Classic rooms by the river within walking distance of the sights.|1551882547-ff40c63fe5fa",
                "Soho Square Stay|London|13800|42|4.2|Wi-Fi, Breakfast Included, Bar|A stylish boutique hotel in the middle of the West End.|1564501049412-61c2a3083791",
                "Manhattan Central|New York|24500|50|4.4|Wi-Fi, Gym, Restaurant, Concierge|A midtown hotel steps from Times Square and Central Park.|1542314831-068cd1dbfeeb",
                "Seine Boutique Hotel|Paris|21500|30|4.5|Wi-Fi, Breakfast Included, Bar, Concierge|A charming hotel a short walk from the river and the Louvre.|1564501049412-61c2a3083791",
                "Montmartre Stay|Paris|14800|38|4.1|Wi-Fi, Breakfast Included, Rooftop Cafe|A cosy stay in the artists' quarter with city views.|1584132967334-10e028bd69f7",
                "Shibuya Sky Hotel|Tokyo|17500|48|4.6|Wi-Fi, Restaurant, Gym, Spa|A modern hotel minutes from Shibuya crossing.|1455587734955-081b22074882",
                "Asakusa Ryokan Inn|Tokyo|11800|22|4.4|Wi-Fi, Breakfast Included, Garden|A small traditional-style inn near the temples of Asakusa.|1618773928121-c32242e63f39",
                "Petronas View Hotel|Kuala Lumpur|7200|65|4.3|Wi-Fi, Pool, Gym, Restaurant|Rooms with views of the twin towers and a rooftop pool.|1566665797739-1674de7a421a",
                "Victoria Harbour Hotel|Hong Kong|18800|40|4.5|Wi-Fi, Gym, Restaurant, Harbour Views|A harbour-front hotel on the Kowloon side.|1445019980597-93fa8acb246c",
                "Opera House Stay|Sydney|23500|36|4.5|Wi-Fi, Pool, Restaurant, Harbour Views|A waterfront hotel with views of the harbour and bridge.|1551882547-ff40c63fe5fa",
                "Thamel Heritage Hotel|Kathmandu|4800|40|4.2|Wi-Fi, Breakfast Included, Mountain Views|A quiet courtyard hotel in the heart of Thamel.|1626621341517-bbf3d9990a23",
                "Doha Corniche Hotel|Doha|13500|45|4.4|Wi-Fi, Pool, Spa, Restaurant|A waterfront hotel along the Corniche.|1520250497591-112f2f40a3f4",
        };
        List<Hotel> out = new ArrayList<>();
        for (String row : rows) {
            String[] c = row.split("\\|");
            Hotel h = new Hotel();
            h.sethotelName(c[0]);
            h.setLocation(c[1]);
            h.setPricePerNight(Double.parseDouble(c[2]));
            h.setAvailableRooms(Integer.parseInt(c[3]));
            h.setRating(Double.parseDouble(c[4]));
            h.setamenities(c[5]);
            h.setDescription(c[6]);
            h.setImageUrl(img(c[7]));
            h.setDemo(true);
            out.add(h);
        }
        TravelNetwork.addHotels(out);
        return out;
    }

    // ------------------------------------------------------------------ listings

    private List<Listing> buildListings() {
        List<Listing> out = new ArrayList<>();
        addHomestays(out);
        TravelNetwork.addHomestays(out);
        addHolidays(out);
        addMoreHolidays(out);
        TravelNetwork.addTrains(out);
        TravelNetwork.addBuses(out);
        TravelNetwork.addCabs(out);
        addForex(out);
        addMoreForex(out);
        addInsurance(out);
        return out;
    }

    private Listing listing(String category, String name, double price, String unit, int available) {
        Listing l = new Listing();
        l.setCategory(category);
        l.setName(name);
        l.setPrice(price);
        l.setUnit(unit);
        l.setAvailable(available);
        l.setDemo(true);
        return l;
    }

    private void addHomestays(List<Listing> out) {
        // name | city | price per night | units | rating | features | description | image id
        String[] rows = {
                "Palm Grove Villa|Goa|7800|6|4.7|Private Pool, Kitchen, Garden, Wi-Fi|A private three-bedroom villa surrounded by coconut palms, ten minutes from the beach.|1507525428034-b723cf961d3e",
                "Snow Peak Cottage|Shimla|4200|8|4.5|Fireplace, Home-cooked Meals, Valley View, Wi-Fi|A cosy wooden cottage on the hillside with a fireplace and apple orchard.|1626621341517-bbf3d9990a23",
                "Misty Hills Homestay|Ooty|3600|7|4.4|Tea Estate Walks, Home-cooked Meals, Bonfire|Stay with a local family in a tea estate bungalow with misty mountain mornings.|1544735716-392fe2489ffa",
                "Saputara Sunrise Stay|Saputara|2900|6|4.2|Lake View, Garden, Home-cooked Meals|A quiet hill-station homestay overlooking Saputara lake, popular for sunrise views.|1506905925346-21bda4d32df4",
                "Coorg Coffee Plantation|Coorg|4800|9|4.6|Plantation Tour, Bonfire, Home-cooked Meals, Wi-Fi|A heritage planter's bungalow inside a working coffee estate.|1593181629936-11c609b8db9b",
                "Manali Pine Lodge|Manali|3900|10|4.3|Mountain View, Heater, Breakfast Included|Pine-wood rooms with views of the snow peaks and a riverside deck.|1469474968028-56623f02e42e",
                "Alleppey Houseboat Stay|Alleppey|9500|5|4.8|Backwater Cruise, All Meals, AC Bedrooms|A private houseboat on the Kerala backwaters with a chef onboard.|1506744038136-46273834b3fb",
                "Udaipur Lake Haveli|Udaipur|5400|6|4.5|Lake View, Rooftop Dining, Heritage Decor|A family haveli with a rooftop overlooking Lake Pichola.|1477587458883-47145ed94245",
                "Jaipur Courtyard Home|Jaipur|3300|8|4.2|Courtyard, Home-cooked Meals, Wi-Fi|A traditional courtyard home in the old city, run by a local family.|1512453979798-5ea266f8880c",
                "Rishikesh Riverside Camp|Rishikesh|2700|12|4.1|River View, Yoga Deck, Bonfire, Breakfast Included|Tented stays on the banks of the Ganga with morning yoga.|1493246507139-91e8fad9978e",
                "Darjeeling Tea Cottage|Darjeeling|4100|6|4.5|Tea Garden Views, Fireplace, Home-cooked Meals|A colonial cottage inside a tea garden with a view of Kanchenjunga.|1544735716-392fe2489ffa",
                "Munnar Cloud Cottage|Munnar|4500|7|4.6|Mountain View, Tea Walks, Home-cooked Meals|Wooden cottages above the clouds in the heart of the tea hills.|1469474968028-56623f02e42e",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("HOMESTAY", c[0], Double.parseDouble(c[2]), "per night", Integer.parseInt(c[3]));
            l.setLocation(c[1]);
            l.setRating(Double.parseDouble(c[4]));
            l.setFeatures(c[5]);
            l.setDescription(c[6]);
            l.setImageUrl(img(c[7]));
            l.setType("Entire home");
            l.setProvider("Hosted stay");
            out.add(l);
        }
    }

    private void addHolidays(List<Listing> out) {
        // name | destination | price per person | slots | rating | duration | inclusions | description | image id
        String[] rows = {
                "Goa Beach Escape|Goa|18500|40|4.5|4 Nights / 5 Days|Flights, 4-star Hotel, Breakfast, Airport Transfers, Sightseeing|Sun, sand and seafood with a North and South Goa sightseeing tour.|1520454974749-611b7248ffdb",
                "Kerala Backwaters & Hills|Kerala|27500|30|4.7|5 Nights / 6 Days|Flights, Hotels, Houseboat Stay, Breakfast & Dinner, Cab|Munnar tea gardens, Thekkady wildlife and a night on a houseboat.|1506744038136-46273834b3fb",
                "Royal Rajasthan Tour|Rajasthan|32000|25|4.6|6 Nights / 7 Days|Hotels, Breakfast, Private Cab, Guide, Camel Safari|Jaipur, Jodhpur and Udaipur with palace stays and a desert camp.|1477587458883-47145ed94245",
                "Kashmir Paradise|Kashmir|29900|20|4.8|5 Nights / 6 Days|Flights, Hotels, Shikara Ride, Breakfast & Dinner, Cab|Srinagar, Gulmarg and Pahalgam with a night in a Dal Lake houseboat.|1469474968028-56623f02e42e",
                "Andaman Island Break|Andaman|34500|18|4.7|5 Nights / 6 Days|Flights, Resort, Ferry Transfers, Breakfast, Water Sports|Havelock and Neil islands with snorkelling and sunset beaches.|1507525428034-b723cf961d3e",
                "Shimla Manali Delight|Himachal|21500|35|4.4|6 Nights / 7 Days|Hotels, Breakfast & Dinner, Volvo Transfers, Sightseeing|Hill stations, Solang Valley and a Rohtang excursion.|1626621341517-bbf3d9990a23",
                "Dubai City & Desert|Dubai|56000|22|4.6|5 Nights / 6 Days|Flights, Hotel, Visa, Desert Safari, City Tour, Breakfast|Burj Khalifa, desert safari and a Dhow dinner cruise.|1512453979798-5ea266f8880c",
                "Bali Tropical Retreat|Bali|62000|16|4.8|6 Nights / 7 Days|Flights, Villa, Breakfast, Airport Transfers, Temple Tour|Ubud rice terraces, beach days in Seminyak and a Nusa Penida day trip.|1537996194471-e657df975ab4",
                "Thailand Bangkok & Phuket|Thailand|38500|28|4.5|5 Nights / 6 Days|Flights, Hotels, Breakfast, Island Tour, Transfers|Bangkok temples and street food, then Phuket beaches and Phi Phi islands.|1552733407-5d5c46c3bb3b",
                "Singapore Family Fun|Singapore|58000|20|4.6|4 Nights / 5 Days|Flights, Hotel, Universal Studios, Gardens by the Bay, Breakfast|Theme parks, night safari and the Marina Bay skyline.|1525625293386-3f8f99389edd",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("HOLIDAY", c[0], Double.parseDouble(c[2]), "per person", Integer.parseInt(c[3]));
            l.setLocation(c[1]);
            l.setRating(Double.parseDouble(c[4]));
            l.setDuration(c[5]);
            l.setFeatures(c[6]);
            l.setDescription(c[7]);
            l.setImageUrl(img(c[8]));
            l.setType("Package");
            l.setProvider("MakeMyTrip Clone Holidays");
            out.add(l);
        }
    }

    private void addMoreHolidays(List<Listing> out) {
        // name | destination | price per person | slots | rating | duration | inclusions | description | image id
        String[] rows = {
                "Leh Ladakh Adventure|Ladakh|36500|18|4.8|6 Nights / 7 Days|Hotels, Breakfast & Dinner, Permits, Cab, Monastery Tours|High passes, Pangong Lake and monasteries in the land of high passes.|1469474968028-56623f02e42e",
                "Golden Triangle Classic|Delhi|19500|40|4.4|4 Nights / 5 Days|Hotels, Breakfast, Private Cab, Guide|Delhi, Agra and Jaipur in one easy week with the Taj Mahal sunrise.|1477587458883-47145ed94245",
                "Varanasi & Ayodhya Pilgrimage|Varanasi|14500|35|4.5|3 Nights / 4 Days|Hotels, Breakfast, Cab, Ganga Aarti, Guide|Evening aarti on the ghats and the temple trails of the sacred cities.|1512453979798-5ea266f8880c",
                "Darjeeling & Gangtok Hills|Darjeeling|23500|25|4.5|5 Nights / 6 Days|Hotels, Breakfast & Dinner, Toy Train, Cab|Tea gardens, toy train rides and sunrise over Kanchenjunga.|1544735716-392fe2489ffa",
                "Coorg Coffee Trail|Coorg|12500|30|4.4|2 Nights / 3 Days|Plantation Stay, All Meals, Guided Walks|A relaxed weekend in the coffee hills with waterfalls and local food.|1593181629936-11c609b8db9b",
                "Andaman Scuba Special|Port Blair|42000|14|4.7|6 Nights / 7 Days|Flights, Resort, Ferries, Scuba Dive, Breakfast|Island hopping with certified beginner scuba sessions.|1507525428034-b723cf961d3e",
                "Maldives Luxury Escape|Male|98000|10|4.9|4 Nights / 5 Days|Flights, Water Villa, All Meals, Speedboat Transfers|Overwater villas, snorkelling and sandbank picnics.|1520454974749-611b7248ffdb",
                "Singapore & Malaysia Combo|Singapore|64500|20|4.6|6 Nights / 7 Days|Flights, Hotels, Breakfast, Sightseeing, Transfers|Singapore city, Sentosa and Kuala Lumpur in a single trip.|1525625293386-3f8f99389edd",
                "Nepal Himalayan Retreat|Kathmandu|28500|22|4.5|5 Nights / 6 Days|Flights, Hotels, Breakfast, Sightseeing, Cab|Kathmandu temples, Pokhara lakes and mountain flights.|1626621341517-bbf3d9990a23",
                "Sri Lanka Coast & Culture|Colombo|39500|20|4.5|5 Nights / 6 Days|Flights, Hotels, Breakfast, Cab, Safari|Beaches, tea country and ancient temples.|1506744038136-46273834b3fb",
                "Tokyo & Kyoto Discovery|Tokyo|165000|12|4.8|7 Nights / 8 Days|Flights, Hotels, Breakfast, Rail Pass, Guides|Neon cities, temples and the bullet train.|1537996194471-e657df975ab4",
                "Paris & Swiss Dream|Paris|185000|12|4.7|8 Nights / 9 Days|Flights, Hotels, Breakfast, Rail Passes, Sightseeing|Paris, the Alps and lake towns on a classic Europe loop.|1552733407-5d5c46c3bb3b",
                "London & Scotland Highlights|London|172000|12|4.6|7 Nights / 8 Days|Flights, Hotels, Breakfast, Coach Tours, Sightseeing|City sights, castles and the Scottish Highlands.|1512100356356-de1b84283e18",
                "Abu Dhabi & Dubai Luxe|Abu Dhabi|68000|18|4.6|5 Nights / 6 Days|Flights, 5-star Hotels, Breakfast, Desert Safari, Transfers|The Grand Mosque, Ferrari World and a luxury desert camp.|1512453979798-5ea266f8880c",
                "Bali Honeymoon Special|Bali|72000|14|4.8|6 Nights / 7 Days|Flights, Private Pool Villa, Breakfast, Candlelight Dinner|Romantic villas, temples and sunset cruises.|1537996194471-e657df975ab4",
                "Munnar & Thekkady Escape|Munnar|18500|30|4.5|3 Nights / 4 Days|Hotels, Breakfast, Cab, Spice Plantation Tour|Misty tea estates and a wildlife boat safari.|1469474968028-56623f02e42e",
                "Rann of Kutch Festival|Ahmedabad|21500|24|4.4|3 Nights / 4 Days|Tent Stay, All Meals, Cab, Cultural Evenings|White desert nights and Gujarati food under the stars.|1477587458883-47145ed94245",
                "Udaipur & Jodhpur Royal|Udaipur|24500|26|4.6|4 Nights / 5 Days|Heritage Hotels, Breakfast, Cab, Boat Ride|Lakes, palaces and blue-city lanes.|1477587458883-47145ed94245",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("HOLIDAY", c[0], Double.parseDouble(c[2]), "per person", Integer.parseInt(c[3]));
            l.setLocation(c[1]);
            l.setRating(Double.parseDouble(c[4]));
            l.setDuration(c[5]);
            l.setFeatures(c[6]);
            l.setDescription(c[7]);
            l.setImageUrl(img(c[8]));
            l.setType("Package");
            l.setProvider("MakeMyTrip Clone Holidays");
            out.add(l);
        }
    }

    private void addMoreForex(List<Listing> out) {
        // currency name | code | INR per unit | description
        String[] rows = {
                "Saudi Riyal|SAR|22.70|For Saudi Arabia.",
                "Qatari Riyal|QAR|23.40|For Qatar.",
                "Omani Rial|OMR|221.50|For Oman.",
                "Malaysian Ringgit|MYR|19.30|For Malaysia.",
                "New Zealand Dollar|NZD|50.60|For New Zealand.",
                "Hong Kong Dollar|HKD|10.95|For Hong Kong.",
                "Chinese Yuan|CNY|11.75|For mainland China.",
                "South African Rand|ZAR|4.70|For South Africa.",
                "Sri Lankan Rupee|LKR|0.28|For Sri Lanka.",
                "Nepalese Rupee|NPR|0.63|For Nepal.",
                "Indonesian Rupiah|IDR|0.0053|For Indonesia (Bali).",
                "Turkish Lira|TRY|2.45|For Turkey.",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("FOREX", c[0] + " (" + c[1] + ")", Double.parseDouble(c[2]), "per 1 " + c[1], -1);
            l.setType(c[1]);
            l.setLocation(c[1]);
            l.setProvider("MakeMyTrip Clone Forex");
            l.setDescription(c[3]);
            l.setFeatures("Cash, Forex card, Doorstep delivery");
            out.add(l);
        }
    }

    private void addForex(List<Listing> out) {
        // currency name | code | INR per unit | description
        String[] rows = {
                "US Dollar|USD|85.40|Most widely accepted currency worldwide.",
                "Euro|EUR|92.80|Valid across the Eurozone countries.",
                "British Pound|GBP|109.50|For the United Kingdom.",
                "UAE Dirham|AED|23.30|For Dubai, Abu Dhabi and the UAE.",
                "Singapore Dollar|SGD|63.90|For Singapore.",
                "Thai Baht|THB|2.45|For Thailand.",
                "Australian Dollar|AUD|55.80|For Australia.",
                "Canadian Dollar|CAD|61.20|For Canada.",
                "Japanese Yen|JPY|0.56|For Japan.",
                "Swiss Franc|CHF|98.10|For Switzerland.",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("FOREX", c[0] + " (" + c[1] + ")", Double.parseDouble(c[2]), "per 1 " + c[1], -1);
            l.setType(c[1]);
            l.setLocation(c[1]);
            l.setProvider("MakeMyTrip Clone Forex");
            l.setDescription(c[3]);
            l.setFeatures("Cash, Forex card, Doorstep delivery");
            out.add(l);
        }
    }

    private void addInsurance(List<Listing> out) {
        // name | region | price per traveller | cover | features | description
        String[] rows = {
                "Domestic Trip Secure|Domestic|199|₹1 lakh|Trip cancellation, Baggage loss, Medical emergency|Basic cover for trips within India.",
                "Domestic Trip Plus|Domestic|349|₹3 lakh|Trip cancellation, Baggage loss, Medical emergency, Flight delay|Higher cover and flight delay compensation for domestic trips.",
                "International Silver|International|899|$50,000|Medical emergency, Baggage loss, Passport loss, Trip delay|Essential cover for international trips.",
                "International Gold|International|1499|$100,000|Medical emergency, Trip cancellation, Baggage loss, Passport loss, Flight delay|Balanced cover for most international trips.",
                "International Platinum|International|2499|$250,000|Medical evacuation, Trip cancellation, Baggage loss, Adventure sports, Flight delay|Premium cover including emergency evacuation.",
                "Student Abroad Plan|International|2999|$150,000|Medical emergency, Study interruption, Sponsor protection, Baggage loss|Designed for students studying overseas.",
                "Senior Citizen Plan|International|3499|$100,000|Pre-existing conditions, Medical emergency, Trip cancellation, Baggage loss|Cover tailored for travellers aged 60 and above.",
                "Adventure Sports Cover|Domestic|599|₹5 lakh|Adventure sports, Medical emergency, Search and rescue|For trekking, rafting, skiing and other adventure trips.",
        };
        for (String row : rows) {
            String[] c = row.split("\\|");
            Listing l = listing("INSURANCE", c[0], Double.parseDouble(c[2]), "per traveller", -1);
            l.setLocation(c[1]);
            l.setType(c[3] + " cover");
            l.setProvider("MakeMyTrip Clone Insurance");
            l.setFeatures(c[4]);
            l.setDescription(c[5]);
            l.setRating(4.2);
            out.add(l);
        }
    }
}
