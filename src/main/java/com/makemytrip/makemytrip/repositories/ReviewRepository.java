package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Review;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByCategoryAndItemIdAndStatus(String category, String itemId, String status);
    Optional<Review> findFirstByUserIdAndCategoryAndItemIdAndStatusNot(String userId, String category, String itemId, String status);
    List<Review> findTop200ByStatusOrderByFlagCountDescCreatedAtDesc(String status);
    List<Review> findTop200ByFlagCountGreaterThanOrderByFlagCountDescCreatedAtDesc(int flags);
    List<Review> findTop200ByOrderByCreatedAtDesc();
    long countByStatus(String status);
    long countByDemoTrue();
    void deleteByDemoTrue();
}
