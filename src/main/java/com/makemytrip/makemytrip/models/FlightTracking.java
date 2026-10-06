package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** A flight a user follows. Booked flights are followed automatically. */
@Getter
@Setter
@Document(collection = "flight_tracking")
@CompoundIndex(name = "user_flight", def = "{'userId': 1, 'flightNumber': 1}", unique = true)
public class FlightTracking {
    @Id
    private String id;
    private String userId;
    private String flightNumber;
    private String flightId;
    /** MANUAL when the user added it, BOOKING when it came from a booking. */
    private String source;
    private String createdAt;
}
