package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/** A customer's rating and written review of a hotel, stay, flight or other service. */
@Getter
@Setter
@Document(collection = "reviews")
@CompoundIndex(name = "item_time", def = "{'category': 1, 'itemId': 1, 'createdAt': -1}")
public class Review {
    @Id
    private String id;
    private String userId;
    private String userName;
    private String category;
    private String itemId;
    private String itemName;
    /** 1 to 5 stars. */
    private int rating;
    private String title;
    private String text;
    /** Small JPEG data URLs, at most three. */
    private List<String> photos = new ArrayList<>();
    private String createdAt;
    private String updatedAt;
    /** True when the reviewer has a booking of this item. */
    private boolean verified;
    @JsonIgnore
    private List<String> helpfulBy = new ArrayList<>();
    private int helpfulCount;
    /** Votes that came with the demo data, on top of the real ones in {@code helpfulBy}. */
    @JsonIgnore
    private int helpfulBaseline;
    private List<Reply> replies = new ArrayList<>();
    @JsonIgnore
    private List<Flag> flags = new ArrayList<>();
    private int flagCount;
    /** PUBLISHED, UNDER_REVIEW (hidden until a moderator decides) or REMOVED. */
    private String status = "PUBLISHED";
    private String moderationNote;
    private boolean demo;

    @Getter
    @Setter
    public static class Reply {
        private String id;
        private String userId;
        private String userName;
        /** ADMIN replies are shown as coming from the MakeMyTrip team. */
        private String role;
        private String text;
        private String createdAt;
    }

    @Getter
    @Setter
    public static class Flag {
        private String userId;
        private String reason;
        private String createdAt;
    }
}
