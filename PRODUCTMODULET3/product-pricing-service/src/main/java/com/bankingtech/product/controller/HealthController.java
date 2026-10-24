package com.bankingtech.product.controller;

import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.bankingtech.product.dto.HealthStatusDto;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Health probe controller for container orchestration and cloud monitoring (Lab L23).
 */
@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Service health and readiness check")
public class HealthController {

    @GetMapping
    @Operation(summary = "Service health probe", description = "Returns UP status and timestamp for container readiness/liveness probes.")
    public ResponseEntity<HealthStatusDto> checkHealth() {
        return ResponseEntity.ok(new HealthStatusDto("UP", "product-pricing-service", "1.0.0", Instant.now()));
    }
}
