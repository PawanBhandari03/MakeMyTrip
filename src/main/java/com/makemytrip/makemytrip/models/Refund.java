package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** Money going back to a customer after a cancellation. Moves PENDING, PROCESSED, COMPLETED. */
@Getter
@Setter
@Document(collection = "refunds")
@CompoundIndex(name = "user_time", def = "{'userId': 1, 'createdAt': -1}")
public class Refund {
    @Id
    private String id;
    private String userId;
    private String userName;
    private String bookingReference;
    private String title;
    private String category;
    /** How many seats, rooms or tickets were cancelled in this request. */
    private int quantity;
    private double amountPaid;
    private double nonRefundable;
    private int percent;
    private String policyLabel;
    private double amount;
    private String reason;
    private String reasonNote;
    /** PENDING, PROCESSED or COMPLETED. */
    private String status;
    private String createdAt;
    private String processedAt;
    private String completedAt;
    /** Realistic date by which a bank would show the money, shown to the customer. */
    private String expectedBy;
    private String method;
}
