package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.FlightTracking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface FlightTrackingRepository extends MongoRepository<FlightTracking, String> {
    List<FlightTracking> findByUserIdOrderByCreatedAtDesc(String userId);
    List<FlightTracking> findByFlightNumber(String flightNumber);
    Optional<FlightTracking> findByUserIdAndFlightNumber(String userId, String flightNumber);
    void deleteByUserIdAndFlightNumber(String userId, String flightNumber);
}
