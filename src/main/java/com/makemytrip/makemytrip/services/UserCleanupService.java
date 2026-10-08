package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.FlightTracking;
import com.makemytrip.makemytrip.models.Interaction;
import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.models.PriceFreeze;
import com.makemytrip.makemytrip.models.RecommendationFeedback;
import com.makemytrip.makemytrip.models.Refund;
import com.makemytrip.makemytrip.models.Review;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;

/** Removes a customer account together with everything that belongs to it. */
@Service
public class UserCleanupService {
    private static final List<Class<?>> OWNED = List.of(Refund.class, Notification.class, PriceFreeze.class, FlightTracking.class,
            RecommendationFeedback.class, Interaction.class, Review.class);

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private MongoTemplate mongoTemplate;
    @Autowired
    private BookingService bookingService;

    /** Deletes the account, gives back the seats and rooms of its active bookings, and removes its refunds, reviews and activity. */
    public void delete(Users user) {
        bookingService.releaseActiveStock(user);
        clearActivity(user.getId());
        userRepository.delete(user);
    }

    /** Removes everything the account has done (refunds, notifications, freezes, followed flights, answers and reviews), but not the account. */
    public void clearActivity(String userId) {
        Query mine = Query.query(Criteria.where("userId").is(userId));
        for (Class<?> type : OWNED) mongoTemplate.remove(mine, type);
    }
}
