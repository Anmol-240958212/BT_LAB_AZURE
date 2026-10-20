package com.BankingTech.demo.controller;

import com.BankingTech.demo.entity.NotificationLogEntity;
import com.BankingTech.demo.repository.NotificationLogRepository;
import com.BankingTech.demo.service.FdRoleAuthorization;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/fd/notifications")
@Tag(name = "Maturity notifications", description = "Inspect queued, published, sent and failed maturity emails")
public class NotificationController {
    private final NotificationLogRepository logs;
    private final FdRoleAuthorization roleAuthorization;
    public NotificationController(NotificationLogRepository logs, FdRoleAuthorization roleAuthorization) {
        this.logs = logs;
        this.roleAuthorization = roleAuthorization;
    }

    @GetMapping("/account/{fdAccountNo}")
    @Operation(summary = "View notification delivery status for an FD account")
    public List<NotificationLogEntity> accountNotifications(
            @PathVariable String fdAccountNo,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        roleAuthorization.requireStaffOperation(authorization);
        return logs.findByNotificationLogFdAccountNo(fdAccountNo);
    }
}
