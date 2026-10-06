package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository repository;

    /** Latest notifications plus how many are unread. */
    public Map<String, Object> inbox(String userId) {
        List<Notification> items = repository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
        return Map.of("items", items, "unread", repository.countByUserIdAndReadFalse(userId));
    }

    /** Marks one notification, or all of the user's notifications when {@code id} is empty, as read. */
    public void markRead(String userId, String id) {
        if (id == null || id.isBlank()) {
            List<Notification> unread = repository.findByUserIdAndReadFalse(userId);
            unread.forEach(n -> n.setRead(true));
            repository.saveAll(unread);
            return;
        }
        repository.findById(id).filter(n -> userId.equals(n.getUserId())).ifPresent(n -> {
            n.setRead(true);
            repository.save(n);
        });
    }
}
