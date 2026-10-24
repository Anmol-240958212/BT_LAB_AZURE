package com.example.auth.service;

public interface NotificationService {

    /**
     * Sends OTP notification to the recipient and logs the notification
     *
     * @param recipient Email address or phone number of the recipient
     * @param otpCode The OTP code to send
     */
    void sendOtpNotification(String recipient, String otpCode, OtpPurpose purpose);
}
