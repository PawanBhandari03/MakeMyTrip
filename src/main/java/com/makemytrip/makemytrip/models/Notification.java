package com.makemytrip.makemytrip.models;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/** A message for one user, for example "Flight 6E-126 delayed by 1h". */
@Getter
@Setter
@Document(collection = "notifications")
@CompoundIndex(name = "user_time", def = "{'userId': 1, 'createdAt': -1}")
public class Notification {
    @Id
    private String id;
    private String userId;
    private String type;
    private String title;
    private String message;
    private String flightNumber;
    private boolean read;
    private String createdAt;
}
