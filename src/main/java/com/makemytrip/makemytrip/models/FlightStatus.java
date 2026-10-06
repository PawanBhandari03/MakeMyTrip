package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "flight_status")
public class FlightStatus {
    @Id
    private String id;
    @Indexed(unique = true)
    private String flightNumber;
    private String flightName;
    private String status; // On Time, Boarding, Delayed, Cancelled, Landed
    private String departureTime;
    private String arrivalTime;
    private String gate;
    private String terminal;
    private String delayReason;
    @Getter @Setter
    private String from;
    @Getter @Setter
    private String to;
    /** ISO date-time of the scheduled departure, used for ordering. */
    @Getter @Setter
    private String scheduledDeparture;
    /** true when generated from a row of the flight collection (see FlightStatusService#syncFromFlights). */
    @Getter @Setter
    private boolean derived;
    @Getter @Setter
    private String flightId;
    /** ISO date-times in India time. The "estimated" ones include the current delay. */
    @Getter @Setter
    private String scheduledArrival;
    @Getter @Setter
    private String estimatedDeparture;
    @Getter @Setter
    private String estimatedArrival;
    @Getter @Setter
    private int delayMinutes;
    /** SCHEDULED, BOARDING, DEPARTED, LANDED or CANCELLED. */
    @Getter @Setter
    private String phase;
    @Getter @Setter
    private String updatedAt;

    public FlightStatus() {
    }

    public FlightStatus(String flightNumber, String flightName, String status, String departureTime, String arrivalTime, String gate, String terminal, String delayReason) {
        this.flightNumber = flightNumber;
        this.flightName = flightName;
        this.status = status;
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.gate = gate;
        this.terminal = terminal;
        this.delayReason = delayReason;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFlightNumber() {
        return flightNumber;
    }

    public void setFlightNumber(String flightNumber) {
        this.flightNumber = flightNumber;
    }

    public String getFlightName() {
        return flightName;
    }

    public void setFlightName(String flightName) {
        this.flightName = flightName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDepartureTime() {
        return departureTime;
    }

    public void setDepartureTime(String departureTime) {
        this.departureTime = departureTime;
    }

    public String getArrivalTime() {
        return arrivalTime;
    }

    public void setArrivalTime(String arrivalTime) {
        this.arrivalTime = arrivalTime;
    }

    public String getGate() {
        return gate;
    }

    public void setGate(String gate) {
        this.gate = gate;
    }

    public String getTerminal() {
        return terminal;
    }

    public void setTerminal(String terminal) {
        this.terminal = terminal;
    }

    public String getDelayReason() {
        return delayReason;
    }

    public void setDelayReason(String delayReason) {
        this.delayReason = delayReason;
    }
}
