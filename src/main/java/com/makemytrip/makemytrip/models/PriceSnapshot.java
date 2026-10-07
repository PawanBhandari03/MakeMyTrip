package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** The price of one item for one travel date at one moment: one point on a price history graph. */
@Getter
@Setter
@Document(collection = "price_snapshots")
@CompoundIndex(name = "key_time", def = "{'key': 1, 'at': 1}")
public class PriceSnapshot {
    @Id
    private String id;
    /** category:itemId:travelDate */
    private String key;
    private double price;
    private double basePrice;
    private double adjustmentPct;
    /** ISO date-time, India time. */
    private String at;
    /** LIVE for a recorded price, ESTIMATED for earlier history rebuilt from past demand patterns. */
    private String source;
}
