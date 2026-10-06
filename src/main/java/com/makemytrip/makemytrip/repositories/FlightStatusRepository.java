package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.FlightStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FlightStatusRepository extends MongoRepository<FlightStatus, String> {
    Optional<FlightStatus> findByFlightNumber(String flightNumber);
    void deleteByDerivedTrue();
    java.util.List<FlightStatus> findTop12ByDerivedTrueAndScheduledDepartureGreaterThanOrderByScheduledDepartureAsc(String after);
}
