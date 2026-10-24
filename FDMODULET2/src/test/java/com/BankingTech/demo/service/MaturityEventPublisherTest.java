package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import com.BankingTech.demo.entity.NotificationLogEntity;
import com.BankingTech.demo.repository.NotificationLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import static org.mockito.Mockito.*;

class MaturityEventPublisherTest {
    private final NotificationLogRepository logs = mock(NotificationLogRepository.class);
    @SuppressWarnings("unchecked")
    private final KafkaTemplate<String, FdMaturityEventDto> kafka = mock(KafkaTemplate.class);

    private void pending() {
        var log = new NotificationLogEntity();
        log.setNotificationLogId("MAT-001");
        log.setNotificationLogFdAccountNo("001");
        log.setNotificationLogCustomerId("10");
        log.setMaturityAmount(new BigDecimal("10700"));
        log.setMaturityDate(LocalDate.now());
        when(logs.findTop50ByNotificationLogStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(any(), any()))
                .thenReturn(List.of(log));
        when(logs.claimForPublishing(eq("MAT-001"), any(), any())).thenReturn(1);
    }

    @Test void brokerAcknowledgementMarksPublishedConditionally() {
        pending();
        when(kafka.send(eq("fd-maturity-events"), eq("001"), any(FdMaturityEventDto.class)))
                .thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));
        new MaturityEventPublisher(logs, kafka).publishPending();
        verify(logs).markPublished("MAT-001");
        verify(logs, never()).markPublishFailed(any(), any(), any());
    }

    @Test void brokerOutageKeepsNotificationRetryable() {
        pending();
        when(kafka.send(eq("fd-maturity-events"), eq("001"), any(FdMaturityEventDto.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker unavailable")));
        new MaturityEventPublisher(logs, kafka).publishPending();
        verify(logs).markPublishFailed(eq("MAT-001"), eq("Kafka publication failed"), any());
        verify(logs, never()).markPublished(any());
    }
}
