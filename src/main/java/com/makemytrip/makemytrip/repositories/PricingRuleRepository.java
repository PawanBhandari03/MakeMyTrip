package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.PricingRule;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PricingRuleRepository extends MongoRepository<PricingRule, String> {
    List<PricingRule> findByActiveTrue();
    long countByDemoTrue();
    void deleteByDemoTrue();
}
