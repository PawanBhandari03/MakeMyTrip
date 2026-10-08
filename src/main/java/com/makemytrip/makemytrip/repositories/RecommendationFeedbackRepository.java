package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.RecommendationFeedback;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RecommendationFeedbackRepository extends MongoRepository<RecommendationFeedback, String> {
    List<RecommendationFeedback> findByUserId(String userId);
    Optional<RecommendationFeedback> findByUserIdAndCategoryAndItemId(String userId, String category, String itemId);
}
