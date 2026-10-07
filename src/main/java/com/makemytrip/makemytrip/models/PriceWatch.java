package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/** An item whose price is being recorded over time because someone looked at its history, booked it or froze it. */
@Getter
@Setter
@Document(collection = "price_watch")
public class PriceWatch {
    @Id
    private String id;
    @Indexed(unique = true)
    private String key;
    private String category;
    private String itemId;
    private String travelDate;
    private String lastViewedAt;
}
