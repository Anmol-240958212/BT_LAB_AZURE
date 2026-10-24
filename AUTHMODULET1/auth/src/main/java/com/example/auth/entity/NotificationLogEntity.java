package com.example.auth.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications_log")
public class NotificationLogEntity {

    @Id
    @Column(name = "notification_id", length = 100)
    private String notificationId;

    @Column(name = "notification_type", length = 50)
    private String notificationType;

    @Column(name = "channel", length = 20, nullable = false)
    private String channel;

    @Column(name = "recipient", length = 255, nullable = false)
    private String recipient;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "message_content", columnDefinition = "TEXT")
    private String messageContent;

    @Column(name = "customer_id", length = 30)
    private String customerId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    // Constructors
    public NotificationLogEntity() {
        this.notificationId = "NOTIF-" + UUID.randomUUID();
    }

    public NotificationLogEntity(String notificationType, String channel, String recipient, String status, String messageContent, String customerId) {
        this();
        this.notificationType = notificationType;
        this.channel = channel;
        this.recipient = recipient;
        this.status = status;
        this.messageContent = messageContent;
        this.customerId = customerId;
    }

    // Getters and setters
    public String getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(String notificationId) {
        this.notificationId = notificationId;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public String getMessageContent() {
        return messageContent;
    }

    public void setMessageContent(String messageContent) {
        this.messageContent = messageContent;
    }

    public String getCustomerId() {
        return customerId;
    }

    public void setCustomerId(String customerId) {
        this.customerId = customerId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
