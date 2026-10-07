package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.PriceWatch;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PriceWatchRepository extends MongoRepository<PriceWatch, String> {
    Optional<PriceWatch> findByKey(String key);
    List<PriceWatch> findByLastViewedAtGreaterThan(String at);
    void deleteByLastViewedAtLessThan(String at);
}
