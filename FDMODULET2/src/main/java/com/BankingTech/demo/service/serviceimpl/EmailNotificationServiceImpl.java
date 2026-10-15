package com.BankingTech.demo.service.serviceimpl;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import com.BankingTech.demo.entity.NotificationLogEntity;
import com.BankingTech.demo.repository.FdCustomerRegistryRepository;
import com.BankingTech.demo.repository.NotificationLogRepository;
import com.BankingTech.demo.service.EmailNotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
public class EmailNotificationServiceImpl implements EmailNotificationService {
    private final JavaMailSender mailSender;
    private final NotificationLogRepository logs;
    private final FdCustomerRegistryRepository customers;
    private final String sender;

    public EmailNotificationServiceImpl(JavaMailSender mailSender, NotificationLogRepository logs,
            FdCustomerRegistryRepository customers, @Value("${banking.mail.from:${spring.mail.username:}}") String sender) {
        this.mailSender = mailSender;
        this.logs = logs;
        this.customers = customers;
        this.sender = sender;
    }

    /** Saved with the payout and closure; SMTP and Kafka run only after commit. */
    @Override
    @Transactional
    public void queueMaturityNotification(String customerId, String fdAccountNo, BigDecimal amount, LocalDate maturityDate) {
        var log = new NotificationLogEntity();
        log.setNotificationLogId("MAT-" + fdAccountNo);
        log.setNotificationLogCustomerId(customerId);
        log.setNotificationLogFdAccountNo(fdAccountNo);
        log.setNotificationLogChannel("EMAIL");
        log.setNotificationLogNotificationType("MATURITY_NOTICE");
        log.setNotificationLogRecipient(customers.findById(customerId)
                .map(c -> c.getEmail() == null ? "" : c.getEmail()).orElse(""));
        log.setNotificationLogSubject("Your Fixed Deposit Has Matured Successfully");
        log.setNotificationLogStatus("QUEUED");
        log.setMaturityAmount(amount);
        log.setMaturityDate(maturityDate);
        var now = LocalDateTime.now();
        log.setNextAttemptAt(now);
        log.setCrudValue("CREATE");
        log.setUserId("SYSTEM");
        log.setWsId("FD_SERVICE");
        log.setRuleSystemId("MATURITY_NOTICE");
        log.setHostTs(now);
        log.setLocalTs(now);
        log.setAcptTs(now);
        log.setAcptTsUtcOfst(ZoneId.systemDefault().getRules().getOffset(now).toString());
        log.setUuid(UUID.randomUUID());
        logs.save(log);
    }

    @Override
    @KafkaListener(topics = "fd-maturity-events", groupId = "fd-maturity-mail-group",
            containerFactory = "maturityKafkaListenerContainerFactory")
    public void deliverMaturityNotification(FdMaturityEventDto event) {
        if (event == null || event.eventId() == null) {
            throw new IllegalArgumentException("Maturity event ID is required");
        }
        var log = logs.findById(event.eventId()).orElseThrow(() ->
                new IllegalStateException("No committed notification exists for this maturity event"));
        if ("SENT".equals(log.getNotificationLogStatus())) { return; }
        // Use the committed payout rather than trusting financial values in a replayed message.
        if (!log.getNotificationLogFdAccountNo().equals(event.fdAccountNo())
                || !log.getNotificationLogCustomerId().equals(event.customerId())) {
            throw new IllegalArgumentException("Maturity event does not match its notification");
        }
        try {
            var customer = customers.findById(log.getNotificationLogCustomerId()).orElseThrow(() ->
                    new IllegalStateException("Customer contact has not been synchronized through Kafka"));
            String email = customer.getEmail();
            if (email == null || email.isBlank()) {
                throw new IllegalStateException("Customer email is missing; publish /customer/sync from Auth");
            }
            if (sender.isBlank()) {
                throw new IllegalStateException("Configure BANKING_SMTP_USERNAME or BANKING_MAIL_FROM before sending emails");
            }
            var mail = new SimpleMailMessage();
            mail.setFrom(sender);
            mail.setTo(email);
            mail.setSubject(log.getNotificationLogSubject());
            mail.setText("Dear " + customer.getFullName() + ",\n\nYour Fixed Deposit has matured successfully.\n\n"
                    + "FD Account Number: " + log.getNotificationLogFdAccountNo()
                    + "\nMaturity Date: " + log.getMaturityDate()
                    + "\nMaturity Amount: INR " + log.getMaturityAmount()
                    + "\n\nThank you for banking with us.");
            log.setNotificationLogRecipient(email);
            mailSender.send(mail);
            log.setNotificationLogStatus("SENT");
            log.setNotificationLogSentAt(LocalDateTime.now());
            log.setNotificationLogErrorMessage(null);
        } catch (Exception failure) {
            log.setNotificationLogStatus("FAILED");
            String error = failure.getMessage() == null ? failure.getClass().getSimpleName() : failure.getMessage();
            log.setNotificationLogErrorMessage(error.substring(0, Math.min(error.length(), 1000)));
            log.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
            // No listener DB transaction: the failure log survives Kafka retries.
            logs.save(log);
            throw new IllegalStateException("Maturity email failed; notification remains available for retry", failure);
        }
        logs.save(log);
    }
}
