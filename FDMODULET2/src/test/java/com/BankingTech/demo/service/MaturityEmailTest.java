package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import com.BankingTech.demo.entity.*;
import com.BankingTech.demo.repository.*;
import com.BankingTech.demo.service.serviceimpl.EmailNotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MaturityEmailTest {
    private final JavaMailSender smtp = mock(JavaMailSender.class);
    private final NotificationLogRepository logs = mock(NotificationLogRepository.class);
    private final FdCustomerRegistryRepository customers = mock(FdCustomerRegistryRepository.class);
    private final EmailNotificationServiceImpl service = new EmailNotificationServiceImpl(smtp, logs, customers, "bank@example.com");
    private final NotificationLogEntity log = new NotificationLogEntity();
    private final FdCustomerRegistry customer = new FdCustomerRegistry("10", "Fresh Test", "ACTIVE", "ACTIVE", null);
    private final FdMaturityEventDto event = new FdMaturityEventDto("MAT-001", "10", "001", new BigDecimal("10700"), LocalDate.now());

    @BeforeEach void setUp() {
        log.setNotificationLogId(event.eventId());
        log.setNotificationLogFdAccountNo("001");
        log.setNotificationLogCustomerId("10");
        log.setNotificationLogSubject("FD matured");
        log.setNotificationLogStatus("PUBLISHED");
        log.setMaturityAmount(new BigDecimal("10700"));
        log.setMaturityDate(LocalDate.now());
        customer.setEmail("customer@example.com");
        when(logs.findById(event.eventId())).thenReturn(Optional.of(log));
        when(customers.findById("10")).thenReturn(Optional.of(customer));
    }

    @Test void mailsKafkaSynchronizedEmailAndSkipsDeliveredReplay() {
        service.deliverMaturityNotification(event);
        service.deliverMaturityNotification(event);
        verify(smtp, times(1)).send(argThat((SimpleMailMessage mail) ->
                mail.getTo()[0].equals("customer@example.com") && mail.getText().contains("10700")));
        assertEquals("SENT", log.getNotificationLogStatus());
        assertNotNull(log.getNotificationLogSentAt());
    }

    @Test void smtpFailurePersistsRetryableFailure() {
        doThrow(new MailSendException("SMTP unavailable")).when(smtp).send(any(SimpleMailMessage.class));
        assertThrows(IllegalStateException.class, () -> service.deliverMaturityNotification(event));
        assertEquals("FAILED", log.getNotificationLogStatus());
        assertNotNull(log.getNextAttemptAt());
        assertEquals("SMTP unavailable", log.getNotificationLogErrorMessage());
        verify(logs).save(log);
    }

    @Test void missingEmailCanBeResynchronizedAndRetried() {
        customer.setEmail(null);
        assertThrows(IllegalStateException.class, () -> service.deliverMaturityNotification(event));
        verifyNoInteractions(smtp);
        customer.setEmail("new@example.com");
        service.deliverMaturityNotification(event);
        assertEquals("SENT", log.getNotificationLogStatus());
        assertEquals("new@example.com", log.getNotificationLogRecipient());
    }

    @Test void queuePersistsPayloadWithoutSendingMail() {
        service.queueMaturityNotification("10", "001", new BigDecimal("10700"), LocalDate.now());
        verify(logs).save(argThat(n -> "QUEUED".equals(n.getNotificationLogStatus())
                && "MAT-001".equals(n.getNotificationLogId()) && n.getMaturityAmount().intValue() == 10700));
        verifyNoInteractions(smtp);
    }
}
