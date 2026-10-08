package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** A traveller's answer to "was this suggestion helpful?". It shapes what they are shown next. */
@Getter
@Setter
@Document(collection = "recommendation_feedback")
@CompoundIndex(name = "one_per_item", def = "{'userId': 1, 'category': 1, 'itemId': 1}", unique = true)
public class RecommendationFeedback {
    @Id
    private String id;
    private String userId;
    private String category;
    private String itemId;
    private String itemName;
    private String destination;
    /** HELPFUL or IRRELEVANT. */
    private String verdict;
    private String at;
}
