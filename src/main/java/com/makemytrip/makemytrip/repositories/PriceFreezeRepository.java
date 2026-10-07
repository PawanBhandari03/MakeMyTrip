package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.PriceFreeze;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PriceFreezeRepository extends MongoRepository<PriceFreeze, String> {
    List<PriceFreeze> findTop30ByUserIdOrderByCreatedAtDesc(String userId);
    List<PriceFreeze> findByUserIdAndCategoryAndItemIdAndStatus(String userId, String category, String itemId, String status);
    long countByUserIdAndStatus(String userId, String status);
}
