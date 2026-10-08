package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One thing a traveller did that says what they like: opened an item, searched a place, or (for the demo
 * travellers who stand in for other customers) booked something. Real bookings and reviews are read from their own
 * collections, so they are not copied here.
 */
@Getter
@Setter
@Document(collection = "interactions")
@CompoundIndex(name = "user_time", def = "{'userId': 1, 'at': -1}")
public class Interaction {
    @Id
    private String id;
    private String userId;
    /** HOTEL, HOMESTAY, HOLIDAY, FLIGHT ... empty for a plain place search. */
    private String category;
    private String itemId;
    /** VIEW, SEARCH or BOOK. */
    private String type;
    /** Lower-case place the interaction was about, for example "goa". */
    private String destination;
    /** What was typed, for a search. */
    private String query;
    /** Where the traveller came from, for example "recommendation". */
    private String source;
    private String at;
    /** True for the generated demo travellers. */
    private boolean demo;
}
