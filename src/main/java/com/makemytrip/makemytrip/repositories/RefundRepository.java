package com.makemytrip.makemytrip.repositories;

import com.makemytrip.makemytrip.models.Refund;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RefundRepository extends MongoRepository<Refund, String> {
    List<Refund> findTop50ByUserIdOrderByCreatedAtDesc(String userId);
    List<Refund> findTop200ByOrderByCreatedAtDesc();
    List<Refund> findByStatusNot(String status);
    List<Refund> findByBookingReference(String bookingReference);
}
