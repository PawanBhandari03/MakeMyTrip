package com.makemytrip.makemytrip.controllers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.models.Listing;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import com.makemytrip.makemytrip.repositories.ListingRepository;
import com.makemytrip.makemytrip.services.DummyDataService;
import com.makemytrip.makemytrip.services.FlightStatusService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*")
public class AdminController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private ListingRepository listingRepository;

    @Autowired
    private DummyDataService dummyDataService;

    @Autowired
    private FlightStatusService flightStatusService;
    @Autowired
    private com.makemytrip.makemytrip.services.UserCleanupService userCleanupService;

    @GetMapping("/users")
    public ResponseEntity<List<Users>> getallusers(){
        List<Users> users=userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/user/{id}/role")
    public ResponseEntity<Users> changeRole(@PathVariable String id, @RequestParam String role){
        String r = role.toUpperCase(Locale.ROOT);
        if (!r.equals("ADMIN") && !r.equals("USER")) {
            throw new RuntimeException("Role must be ADMIN or USER");
        }
        return userRepository.findById(id).map(u -> {
            u.setRole(r);
            return ResponseEntity.ok(userRepository.save(u));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Deletes a customer and everything that belongs to the account. Administrator accounts cannot be deleted. */
    @DeleteMapping("/user/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id){
        Users u = userRepository.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        if ("ADMIN".equals(u.getRole())) {
            throw new RuntimeException("Administrator accounts cannot be deleted. Make the account a customer first.");
        }
        userCleanupService.delete(u);
        return ResponseEntity.noContent().build();
    }

    // ---- flights
    @PostMapping("/flight")
    public Flight addflight(@RequestBody Flight flight){
        flight.setId(null);
        flight.setDemo(false);
        if (flight.getCapacity() < flight.getAvailableSeats()) flight.setCapacity(flight.getAvailableSeats());
        return flightRepository.save(flight);
    }

    @PutMapping("flight/{id}")
    public ResponseEntity<Flight> editflight(@PathVariable String id, @RequestBody Flight updatedFlight){
        if (!flightRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        updatedFlight.setId(id);
        if (updatedFlight.getCapacity() < updatedFlight.getAvailableSeats()) updatedFlight.setCapacity(updatedFlight.getAvailableSeats());
        return ResponseEntity.ok(flightRepository.save(updatedFlight));
    }

    @DeleteMapping("flight/{id}")
    public ResponseEntity<Void> deleteFlight(@PathVariable String id){
        if (!flightRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        flightRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- hotels
    @PostMapping("/hotel")
    public Hotel addhotel(@RequestBody Hotel hotel){
        hotel.setId(null);
        hotel.setDemo(false);
        if (hotel.getCapacity() < hotel.getAvailableRooms()) hotel.setCapacity(hotel.getAvailableRooms());
        return hotelRepository.save(hotel);
    }

    @PutMapping("hotel/{id}")
    public ResponseEntity<Hotel> editHotel (@PathVariable String id, @RequestBody Hotel updatedHotel){
        if (!hotelRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        updatedHotel.setId(id);
        if (updatedHotel.getCapacity() < updatedHotel.getAvailableRooms()) updatedHotel.setCapacity(updatedHotel.getAvailableRooms());
        return ResponseEntity.ok(hotelRepository.save(updatedHotel));
    }

    @DeleteMapping("hotel/{id}")
    public ResponseEntity<Void> deleteHotel(@PathVariable String id){
        if (!hotelRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        hotelRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- listings (homestays, holidays, trains, buses, cabs, forex, insurance)
    @PostMapping("/listing")
    public Listing addListing(@RequestBody Listing listing){
        listing.setId(null);
        listing.setDemo(false);
        if (listing.getAvailable() > 0 && listing.getCapacity() < listing.getAvailable()) listing.setCapacity(listing.getAvailable());
        if (listing.getCategory() != null) {
            listing.setCategory(listing.getCategory().toUpperCase(Locale.ROOT));
        }
        return listingRepository.save(listing);
    }

    @PutMapping("listing/{id}")
    public ResponseEntity<Listing> editListing(@PathVariable String id, @RequestBody Listing updated){
        if (!listingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        updated.setId(id);
        if (updated.getAvailable() > 0 && updated.getCapacity() < updated.getAvailable()) updated.setCapacity(updated.getAvailable());
        if (updated.getCategory() != null) {
            updated.setCategory(updated.getCategory().toUpperCase(Locale.ROOT));
        }
        return ResponseEntity.ok(listingRepository.save(updated));
    }

    @DeleteMapping("listing/{id}")
    public ResponseEntity<Void> deleteListing(@PathVariable String id){
        if (!listingRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        listingRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---- demo data
    /** Loads demo data. With reset=true all previous demo rows are replaced; admin-created rows are kept. */
    @PostMapping("/seed")
    public Map<String, Object> seed(@RequestParam(defaultValue = "false") boolean reset){
        Map<String, Object> result = new LinkedHashMap<>(dummyDataService.load(reset));
        result.put("flightStatuses", flightStatusService.syncFromFlights().size());
        result.put("reset", reset);
        return result;
    }

    // ---- dashboard
    @GetMapping("/stats")
    public Map<String, Object> stats(){
        List<Users> users = userRepository.findAll();
        long confirmed = 0, cancelled = 0;
        double revenue = 0;
        Map<String, Double> revenueByType = new LinkedHashMap<>();
        List<Map<String, Object>> recent = new ArrayList<>();
        for (Users u : users) {
            for (Users.Booking b : u.getBookings()) {
                if (b == null) continue;
                if ("CANCELLED".equals(b.getStatus())) {
                    cancelled++;
                    continue;
                }
                confirmed++;
                revenue += b.getTotalPrice();
                revenueByType.merge(b.getType() == null ? "Other" : b.getType(), b.getTotalPrice(), Double::sum);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("reference", b.getReference());
                row.put("title", b.getTitle());
                row.put("type", b.getType());
                row.put("customer", (u.getFirstName() == null ? "" : u.getFirstName()) + " " + (u.getLastName() == null ? "" : u.getLastName()));
                row.put("email", u.getEmail());
                row.put("totalPrice", b.getTotalPrice());
                row.put("bookedAt", b.getBookedAt() != null ? b.getBookedAt() : b.getDate());
                recent.add(row);
            }
        }
        recent.sort(Comparator.comparing((Map<String, Object> r) -> String.valueOf(r.get("bookedAt"))).reversed());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("users", users.size());
        out.put("admins", users.stream().filter(u -> "ADMIN".equals(u.getRole())).count());
        out.put("flights", flightRepository.count());
        out.put("hotels", hotelRepository.count());
        out.put("listings", listingRepository.count());
        out.put("bookingsConfirmed", confirmed);
        out.put("bookingsCancelled", cancelled);
        out.put("revenue", revenue);
        out.put("revenueByType", revenueByType);
        out.put("recentBookings", recent.subList(0, Math.min(8, recent.size())));
        return out;
    }
}
