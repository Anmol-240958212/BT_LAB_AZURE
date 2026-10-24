package com.bankingtech.product.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.bankingtech.product.entity.enums.NotificationChannel;
import com.bankingtech.product.entity.enums.RecordStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Table {@code product_notification} - which notifications a product sends,
 * on which trigger event, over which channel. Consumed by the batch /
 * notification labs (L18); no endpoint of this module writes it yet, it is
 * mapped so the schema is complete and validated.
 * <p>
 * {@code notification_type} and {@code trigger_event} stay Strings because
 * later labs define new events; the well-known types are constants.
 * <p>
 * UNIQUE (product_id, notification_type, channel): one configuration per
 * event per channel.
 */
@Entity
@Table(name = "product_notification",
       uniqueConstraints = @UniqueConstraint(name = "uq_notification_product_type_channel",
                                             columnNames = {"product_id", "notification_type", "channel"}))
public class ProductNotification extends AuditableEntity {

    public static final String TYPE_FD_CREATED    = "FD_CREATED";
    public static final String TYPE_INTEREST_PAID = "INTEREST_PAID";
    public static final String TYPE_MATURITY      = "MATURITY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long notificationId;

    /** FK product_id -> product (ON DELETE CASCADE). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false,
                foreignKey = @ForeignKey(name = "fk_notification_product"))
    private Product product;

    @Column(name = "notification_type", nullable = false, length = 30)
    private String notificationType;

    /** Business event that fires it, e.g. "ACCOUNT_OPENED", "MATURITY_DATE_REACHED". */
    @Column(name = "trigger_event", nullable = false, length = 100)
    private String triggerEvent;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "channel", nullable = false, length = 30)
    private NotificationChannel channel;

    /** Name / id of the message template in the notification service. */
    @Column(name = "template_reference", length = 255)
    private String templateReference;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 30)
    private RecordStatus status = RecordStatus.ACTIVE;

    public ProductNotification() {
    }

    public ProductNotification(String notificationType, String triggerEvent, NotificationChannel channel,
                               String templateReference) {
        this.notificationType = notificationType;
        this.triggerEvent = triggerEvent;
        this.channel = channel;
        this.templateReference = templateReference;
    }

    public Long getNotificationId() {
        return notificationId;
    }

    public void setNotificationId(Long notificationId) {
        this.notificationId = notificationId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(String notificationType) {
        this.notificationType = notificationType;
    }

    public String getTriggerEvent() {
        return triggerEvent;
    }

    public void setTriggerEvent(String triggerEvent) {
        this.triggerEvent = triggerEvent;
    }

    public NotificationChannel getChannel() {
        return channel;
    }

    public void setChannel(NotificationChannel channel) {
        this.channel = channel;
    }

    public String getTemplateReference() {
        return templateReference;
    }

    public void setTemplateReference(String templateReference) {
        this.templateReference = templateReference;
    }

    public RecordStatus getStatus() {
        return status;
    }

    public void setStatus(RecordStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "ProductNotification{notificationId=" + notificationId
                + ", notificationType='" + notificationType + "', triggerEvent='" + triggerEvent
                + "', channel=" + channel + ", status=" + status + "}";
    }
}
