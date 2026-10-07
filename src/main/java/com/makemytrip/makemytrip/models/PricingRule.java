package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * A seasonal rule such as "Diwali week: +20%" or "Monsoon saver: -10%".
 * It applies to trips whose travel date falls between {@code startDate} and {@code endDate} (inclusive).
 * Admins manage these from the Pricing tab.
 */
@Getter
@Setter
@Document(collection = "pricing_rules")
public class PricingRule {
    @Id
    private String id;
    private String name;
    /** Shown to customers when the rule changes their price. */
    private String description;
    /** ALL, or one category such as FLIGHT, HOTEL, TRAIN. */
    private String category;
    /** yyyy-MM-dd */
    private String startDate;
    private String endDate;
    /** Percentage added to the base price; negative for a sale. */
    private double percent;
    private boolean active = true;
    /** true for rows created by the dummy-data loader. */
    private boolean demo;
}
