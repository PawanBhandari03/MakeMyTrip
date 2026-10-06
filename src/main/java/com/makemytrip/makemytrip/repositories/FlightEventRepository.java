package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.FlightEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FlightEventRepository extends MongoRepository<FlightEvent, String> {
    List<FlightEvent> findTop30ByFlightNumberOrderByCreatedAtDesc(String flightNumber);
    void deleteByFlightNumberIn(java.util.Collection<String> flightNumbers);
}
