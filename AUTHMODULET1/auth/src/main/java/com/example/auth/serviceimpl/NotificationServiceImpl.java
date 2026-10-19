package com.example.auth.serviceimpl;

import com.example.auth.entity.NotificationLogEntity;
import com.example.auth.repository.NotificationRepository;
import com.example.auth.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender javaMailSender;
    private final String sender;

    @Autowired
    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            JavaMailSender javaMailSender,
            @Value("${banking.mail.from:${spring.mail.username:}}") String sender) {
        this.notificationRepository = notificationRepository;
        this.javaMailSender = javaMailSender;
        this.sender = sender;
    }

    @Override
    public void sendOtpNotification(String recipient, String otpCode) {
        // Create notification log entity
        NotificationLogEntity notificationLog = new NotificationLogEntity(
                "OTP",
                "EMAIL",
                recipient,
                "PENDING",
                "Your OTP is: " + otpCode,
                null  // customerId — not available during registration
        );
        notificationRepository.save(notificationLog);

        // Send email
        SimpleMailMessage message = new SimpleMailMessage();
        if (sender != null && !sender.isBlank()) {
            message.setFrom(sender);
        }
        message.setTo(recipient);
        message.setSubject("Your password reset OTP");
        message.setText("Your password reset OTP is: " + otpCode
                + "\n\nThis OTP is valid for 5 minutes and can be used only once.");

        try {
            javaMailSender.send(message);
            notificationLog.setStatus("SENT");
            notificationLog.setSentAt(LocalDateTime.now());
            notificationRepository.save(notificationLog);
        } catch (Exception e) {
            notificationLog.setStatus("FAILED");
            notificationRepository.save(notificationLog);
            throw new IllegalStateException("Unable to send the OTP email", e);
        }
    }
}
