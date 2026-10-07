package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A price a customer has locked in for a limited time. The fee is credited against the booking if the
 * customer books before the freeze expires, and is lost otherwise.
 */
@Getter
@Setter
@Document(collection = "price_freezes")
@CompoundIndex(name = "user_time", def = "{'userId': 1, 'createdAt': -1}")
public class PriceFreeze {
    @Id
    private String id;
    private String userId;
    private String category;
    private String itemId;
    private String itemName;
    /** yyyy-MM-dd, the travel or check-in date the price is for. */
    private String travelDate;
    /** How many seats, rooms or tickets the freeze covers. */
    private int quantity;
    private int nights;
    /** The locked price per unit (per seat, per night, per ticket). */
    private double unitPrice;
    /** The price per unit when the freeze was made, before any later movement. */
    private double baseUnitPrice;
    private double fee;
    private int hours;
    private String createdAt;
    private String expiresAt;
    /** ACTIVE or USED; EXPIRED is worked out from {@code expiresAt}. */
    private String status;
    private String bookingReference;
}
