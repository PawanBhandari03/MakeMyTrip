package com.makemytrip.makemytrip.services;

import com.makemytrip.makemytrip.models.Notification;
import com.makemytrip.makemytrip.models.Refund;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.NotificationRepository;
import com.makemytrip.makemytrip.repositories.RefundRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Keeps track of refunds. A real bank takes days; the demo moves a refund PENDING, PROCESSED (after
 * {@link #PROCESS_AFTER_SECONDS}), COMPLETED (after a further {@link #COMPLETE_AFTER_SECONDS}) so the whole journey
 * can be seen. Admins can also move a refund forward by hand.
 */
@Service
public class RefundService {
    static final long PROCESS_AFTER_SECONDS = 90;
    static final long COMPLETE_AFTER_SECONDS = 150;

    @Autowired
    private RefundRepository repository;
    @Autowired
    private NotificationRepository notificationRepository;

    public Refund create(Users user, Users.Booking b, RefundPolicyService.Preview p, String reason, String note) {
        Refund r = new Refund();
        r.setUserId(user.getId());
        r.setUserName(((user.getFirstName() == null ? "" : user.getFirstName()) + " " + (user.getLastName() == null ? "" : user.getLastName())).trim());
        r.setBookingReference(b.getReference());
        r.setTitle(b.getTitle());
        r.setCategory(b.getCategory());
        r.setQuantity(p.getQuantity());
        r.setAmountPaid(p.getAmountPaid());
        r.setNonRefundable(p.getNonRefundable());
        r.setPercent(p.getPercent());
        r.setPolicyLabel(p.getPolicyLabel());
        r.setAmount(p.getRefund());
        r.setReason(reason);
        r.setReasonNote(note);
        r.setStatus("PENDING");
        r.setCreatedAt(now());
        r.setExpectedBy(p.getExpectedBy());
        r.setMethod("Original payment method");
        r = repository.save(r);
        notify(r, "REFUND_PENDING", "Refund initiated",
                "₹" + money(r.getAmount()) + " for " + r.getTitle() + " (" + r.getBookingReference()
                        + ") is on its way. Expected by " + r.getExpectedBy() + ".");
        return r;
    }

    public List<Refund> forUser(String userId) {
        return repository.findTop50ByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Refund> all() {
        return repository.findTop200ByOrderByCreatedAtDesc();
    }

    /** Moves a refund one step forward; a completed refund is returned unchanged. */
    public Refund advance(String id) {
        Refund r = repository.findById(id).orElseThrow(() -> new RuntimeException("Refund not found"));
        return step(r);
    }

    @Scheduled(fixedDelay = 15000, initialDelay = 20000)
    public void tick() {
        LocalDateTime now = LocalDateTime.now();
        for (Refund r : repository.findByStatusNot("COMPLETED")) {
            try {
                if ("PENDING".equals(r.getStatus()) && age(r.getCreatedAt(), now) >= PROCESS_AFTER_SECONDS) {
                    step(r);
                } else if ("PROCESSED".equals(r.getStatus()) && age(r.getProcessedAt(), now) >= COMPLETE_AFTER_SECONDS) {
                    step(r);
                }
            } catch (RuntimeException ignored) {
                // one bad row must not stop the others
            }
        }
    }

    private synchronized Refund step(Refund r) {
        if ("PENDING".equals(r.getStatus())) {
            r.setStatus("PROCESSED");
            r.setProcessedAt(now());
            repository.save(r);
            notify(r, "REFUND_PROCESSED", "Refund processed",
                    "Your refund of ₹" + money(r.getAmount()) + " for " + r.getBookingReference() + " has been approved and sent to your bank.");
        } else if ("PROCESSED".equals(r.getStatus())) {
            r.setStatus("COMPLETED");
            r.setCompletedAt(now());
            repository.save(r);
            notify(r, "REFUND_COMPLETED", "Refund completed",
                    "₹" + money(r.getAmount()) + " has been credited to your original payment method for " + r.getBookingReference() + ".");
        }
        return r;
    }

    /** Totals and the cancellation reasons, for the admin dashboard. */
    public Map<String, Object> stats() {
        List<Refund> all = repository.findAll();
        double pending = 0, processed = 0, completed = 0;
        Map<String, Integer> reasons = new LinkedHashMap<>();
        for (Refund r : all) {
            switch (r.getStatus()) {
                case "PENDING" -> pending += r.getAmount();
                case "PROCESSED" -> processed += r.getAmount();
                default -> completed += r.getAmount();
            }
            reasons.merge(r.getReason() == null ? "Other" : r.getReason(), 1, Integer::sum);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("count", all.size());
        out.put("pendingAmount", pending);
        out.put("processedAmount", processed);
        out.put("completedAmount", completed);
        out.put("reasons", reasons);
        return out;
    }

    private void notify(Refund r, String type, String title, String message) {
        Notification n = new Notification();
        n.setUserId(r.getUserId());
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setCreatedAt(now());
        notificationRepository.save(n);
    }

    private static long age(String iso, LocalDateTime now) {
        if (iso == null) return 0;
        return Duration.between(LocalDateTime.parse(iso), now).getSeconds();
    }

    private static String now() {
        return LocalDateTime.now().withNano(0).toString();
    }

    private static String money(double v) {
        return String.format(Locale.US, "%,.0f", v);
    }
}
