package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Listing;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ListingRepository extends MongoRepository<Listing, String> {
    List<Listing> findByCategory(String category);
    long countByDemoTrue();
    void deleteByDemoTrue();
}
