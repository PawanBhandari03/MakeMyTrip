package com.makemytrip.makemytrip.repositories;
import com.makemytrip.makemytrip.models.Flight;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface FlightRepository  extends MongoRepository<Flight,String>{
    long countByDemoTrue();
    void deleteByDemoTrue();
    Flight findFirstByDemoTrueOrderByDepartureTimeDesc();
    java.util.List<Flight> findByDepartureTimeBetween(String from, String to);
    java.util.List<Flight> findByFlightNameEndingWith(String suffix);
}
