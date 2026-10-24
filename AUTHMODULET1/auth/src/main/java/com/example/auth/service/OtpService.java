package com.example.auth.service;

public interface OtpService {

    void generateAndSendOtp(String identifier, OtpPurpose purpose);

    boolean verifyOtp(String identifier, String enteredOtp);
}
