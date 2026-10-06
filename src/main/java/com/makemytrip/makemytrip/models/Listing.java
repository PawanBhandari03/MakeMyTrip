package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One bookable item for every category that is not a flight or a hotel:
 * HOMESTAY, HOLIDAY, TRAIN, BUS, CAB, FOREX and INSURANCE.
 * Which fields matter depends on the category (e.g. from/to for TRAIN, location for HOMESTAY).
 */
@Getter
@Setter
@Document(collection = "listings")
public class Listing {
    @Id
    private String id;
    private String category;
    private String name;
    private String provider;
    /** Class / cab type / plan type, e.g. "AC 3 Tier", "SUV", "Gold". */
    private String type;
    private String from;
    private String to;
    /** City or destination (homestays, holidays, insurance region). */
    private String location;
    private String description;
    private double price;
    /** Human readable price unit, e.g. "per night", "per person". */
    private String unit;
    /** Units left. A negative value means unlimited (forex, insurance). */
    private int available;
    private String departureTime;
    private String arrivalTime;
    private String duration;
    private String imageUrl;
    private double rating;
    /** Comma separated amenities / inclusions. */
    private String features;
    /** true for rows created by the dummy-data loader; only those are removed on reload. */
    private boolean demo;
}
