package com.makemytrip.makemytrip.controllers;

import com.makemytrip.makemytrip.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public Map<String, Object> inbox(@RequestParam String userId) {
        return notificationService.inbox(userId);
    }

    /** Mark one notification read, or all of them when no id is given. */
    @PostMapping("/read")
    public ResponseEntity<Void> markRead(@RequestParam String userId, @RequestParam(required = false) String id) {
        notificationService.markRead(userId, id);
        return ResponseEntity.noContent().build();
    }
}
