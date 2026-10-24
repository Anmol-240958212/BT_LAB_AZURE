package com.bankingtech.product.enums;

/**
 * Delivery channel of a product notification.
 *
 * <p>Stored as VARCHAR in {@code product_notification.channel (chk_notification_channel)}; the constant names must match that
 * CHECK constraint exactly.
 */
public enum NotificationChannel {
    EMAIL,
    SMS,
    PUSH,
    WHATSAPP
}
