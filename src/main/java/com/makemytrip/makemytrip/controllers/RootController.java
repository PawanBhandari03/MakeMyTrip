package com.makemytrip.makemytrip.controllers;
import com.makemytrip.makemytrip.models.Flight;
import com.makemytrip.makemytrip.models.Hotel;
import com.makemytrip.makemytrip.repositories.FlightRepository;
import com.makemytrip.makemytrip.repositories.HotelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.makemytrip.makemytrip.config.CatalogCache;
import java.util.List;

@RestController
@CrossOrigin(origins = "*")
public class RootController {
    @Autowired
    private HotelRepository hotelRepository;

    @Autowired
    private FlightRepository flightRepository;
    @Autowired
    private CatalogCache catalogCache;

    @GetMapping("/")
    public String home() {
        return "✅ It's running on port 8080!";
    }

    @GetMapping("/hotel")
    public ResponseEntity<byte[]> getallhotel(){
        return catalogCache.get("hotels", hotelRepository::findAll);
    }

    @GetMapping("/hotel/{id}")
    public ResponseEntity<Hotel> getHotel(@PathVariable String id){
        return hotelRepository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/flight")
    public ResponseEntity<byte[]> getallflights(){
        return catalogCache.get("flights", flightRepository::findAll);
    }

    @GetMapping("/flight/{id}")
    public ResponseEntity<Flight> getFlight(@PathVariable String id){
        return flightRepository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

}
