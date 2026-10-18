package com.bankingtech.product.dto;

import java.time.Instant;

/**
 * Health probe status for Docker / Azure App Service (Lab L23 integration).
 */
public record HealthStatusDto(
        String status,
        String service,
        String version,
        Instant timestamp) {
}
