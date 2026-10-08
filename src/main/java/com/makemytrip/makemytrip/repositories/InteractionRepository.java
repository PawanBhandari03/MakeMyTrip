package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Interaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface InteractionRepository extends MongoRepository<Interaction, String> {
    List<Interaction> findTop300ByUserIdOrderByAtDesc(String userId);
    Interaction findFirstByUserIdAndCategoryAndItemIdAndTypeOrderByAtDesc(String userId, String category, String itemId, String type);
    List<Interaction> findByDemoTrue();
    void deleteByDemoTrue();
    long countByDemoTrue();
    long countBySource(String source);
}
