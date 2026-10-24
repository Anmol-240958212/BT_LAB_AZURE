package com.bankingtech.product.entity.enums;

/**
 * Delivery channel of a product_notification.
 * Mirrors {@code chk_notification_channel} in V1__init_schema.sql.
 */
public enum NotificationChannel {
    EMAIL,
    SMS,
    WHATSAPP,
    PUSH
}
