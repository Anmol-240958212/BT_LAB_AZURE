package com.BankingTech.demo.controller;

import com.BankingTech.demo.entity.NotificationLogEntity;
import com.BankingTech.demo.repository.NotificationLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/fd/notifications")
@Tag(name = "Maturity notifications", description = "Inspect queued, published, sent and failed maturity emails")
public class NotificationController {
    private final NotificationLogRepository logs;
    public NotificationController(NotificationLogRepository logs) { this.logs = logs; }

    @GetMapping("/account/{fdAccountNo}")
    @Operation(summary = "View notification delivery status for an FD account")
    public List<NotificationLogEntity> accountNotifications(@PathVariable String fdAccountNo) {
        return logs.findByNotificationLogFdAccountNo(fdAccountNo);
    }
}
