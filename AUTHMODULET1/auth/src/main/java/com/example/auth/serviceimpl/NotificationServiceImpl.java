package com.example.auth.serviceimpl;

import com.example.auth.entity.NotificationLogEntity;
import com.example.auth.repository.NotificationRepository;
import com.example.auth.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final JavaMailSender javaMailSender;

    @Autowired
    public NotificationServiceImpl(NotificationRepository notificationRepository, JavaMailSender javaMailSender) {
        this.notificationRepository = notificationRepository;
        this.javaMailSender = javaMailSender;
    }

    @Override
    public void sendOtpNotification(String recipient, String otpCode) {
        // Create notification log entity
        NotificationLogEntity notificationLog = new NotificationLogEntity(
                "OTP",
                "EMAIL",
                recipient,
                "SENT",
                "Your OTP is: " + otpCode,
                null  // customerId — not available during registration
        );
        notificationLog.setSentAt(LocalDateTime.now());

        // Save to database
        notificationRepository.save(notificationLog);

        // Send email
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(recipient);
        message.setSubject("Your OTP for Login");
        message.setText("Your OTP is: " + otpCode + " (valid 5 minutes)");

        try {
            javaMailSender.send(message);
        } catch (Exception e) {
            // Log failure but don't block OTP verification
            System.err.println("Failed to send OTP email to " + recipient + ": " + e.getMessage());
        }
    }
}