package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FixedDepositAccountEntity;
import com.BankingTech.demo.repository.FixedDepositAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Authorizes an early closure using the authenticated profile resolved by Auth over Kafka. */
@Service
public class FdWithdrawalAuthorization {
    private final FdAuthKafkaClient authClient;
    private final FixedDepositAccountRepository accountRepository;

    public FdWithdrawalAuthorization(FdAuthKafkaClient authClient, FixedDepositAccountRepository accountRepository) {
        this.authClient = authClient;
        this.accountRepository = accountRepository;
    }

    public void authorize(String authorization, String fdAccountNo) {
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.substring(7).isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to withdraw a fixed deposit");
        }

        FdCreationAuthorization.Profile profile = authClient.profile(authorization);
        if (profile == null || profile.role() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account role is unavailable");
        }
        if ("ADMIN".equals(profile.role()) || "BANK_OFFICER".equals(profile.role())) return;
        if (!"CUSTOMER".equals(profile.role()) || profile.customerId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "A customer profile is required");
        }

        FixedDepositAccountEntity account = accountRepository.findByFdAccountNo(fdAccountNo.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FD account not found"));
        if (!profile.customerId().toString().equals(account.getFdAccountCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only withdraw your own fixed deposits");
        }
    }
}
