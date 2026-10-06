package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** One change in a flight's life, such as a delay, a gate change or boarding. Shown as the flight's timeline. */
@Getter
@Setter
@Document(collection = "flight_events")
@CompoundIndex(name = "flight_time", def = "{'flightNumber': 1, 'createdAt': -1}")
public class FlightEvent {
    @Id
    private String id;
    private String flightNumber;
    /** DELAY_ANNOUNCED, DELAY_EXTENDED, DELAY_REDUCED, ON_TIME, GATE_CHANGED, BOARDING, DEPARTED, LANDED or CANCELLED. */
    private String type;
    private String title;
    private String message;
    private int delayMinutes;
    private String reason;
    /** ISO date-times (India time) before and after the change; empty when not relevant. */
    private String oldDeparture;
    private String newDeparture;
    private String oldArrival;
    private String newArrival;
    private String createdAt;
}
