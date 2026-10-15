package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import com.BankingTech.demo.repository.NotificationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class MaturityEventPublisher {
    private static final Logger LOGGER = LoggerFactory.getLogger(MaturityEventPublisher.class);
    private final NotificationLogRepository logs;
    private final KafkaTemplate<String, FdMaturityEventDto> kafka;

    public MaturityEventPublisher(NotificationLogRepository logs,
            @Qualifier("maturityKafkaTemplate") KafkaTemplate<String, FdMaturityEventDto> kafka) {
        this.logs = logs;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelayString = "${banking.notifications.publish-delay-ms:10000}",
            initialDelayString = "${banking.notifications.publish-delay-ms:10000}")
    public void publishPending() {
        var now = LocalDateTime.now();
        for (var log : logs.findTop50ByNotificationLogStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
                List.of("QUEUED", "FAILED", "PUBLISHING", "PUBLISHED"), now)) {
            if (log.getMaturityAmount() == null || log.getMaturityDate() == null) { continue; }
            String id = log.getNotificationLogId();
            if (logs.claimForPublishing(id, now, now.plusMinutes(1)) == 0) { continue; }
            try {
                var event = new FdMaturityEventDto(id, log.getNotificationLogCustomerId(),
                        log.getNotificationLogFdAccountNo(), log.getMaturityAmount(), log.getMaturityDate());
                kafka.send("fd-maturity-events", event.fdAccountNo(), event).get(10, TimeUnit.SECONDS);
                // Do not overwrite SENT/FAILED if the consumer ran before this acknowledgement.
                logs.markPublished(id);
            } catch (Exception failure) {
                logs.markPublishFailed(id, "Kafka publication failed", LocalDateTime.now().plusMinutes(1));
                LOGGER.warn("Kafka maturity publication failed for notification {}", id, failure);
                if (failure instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        }
    }
}
