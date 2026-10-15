package com.BankingTech.demo.service;

import com.BankingTech.demo.entity.FdCustomerRegistry;
import com.BankingTech.demo.repository.*;
import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import com.BankingTech.demo.service.plugins.accountnumber.AccountNumberGenerator;
import com.BankingTech.demo.service.serviceimpl.FixedDepositAccountServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FdCustomerValidationTest {
    private final FdCustomerRegistryRepository registry = mock(FdCustomerRegistryRepository.class);
    private final FdCustomerValidationService validator = new FdCustomerValidationService(registry);

    @Test void rejectsMissingAndUnsynchronizedCustomers() {
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> validator.requireApprovedCustomer(" ")).getStatusCode().value());
        when(registry.findById("999")).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> validator.requireApprovedCustomer("999")).getStatusCode().value());
    }

    @Test void rejectsInactiveOrUnapprovedCustomers() {
        var customer = new FdCustomerRegistry();
        customer.setCustomerStatus("ACTIVE");
        customer.setKycStatus("KYC_PENDING");
        when(registry.findById("10")).thenReturn(Optional.of(customer));
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> validator.requireApprovedCustomer("10")).getStatusCode().value());
        customer.setKycStatus("ACTIVE");
        customer.setCustomerStatus("LOCKED");
        assertThrows(ResponseStatusException.class, () -> validator.requireApprovedCustomer("10"));
    }

    @Test void acceptsKafkaApprovedCustomer() {
        var customer = new FdCustomerRegistry("10", "Test", "ACTIVE", "ACTIVE", null);
        when(registry.findById("10")).thenReturn(Optional.of(customer));
        assertSame(customer, validator.requireApprovedCustomer("10"));
    }

    @Test void bothCreationRoutesRejectUnknownCustomerBeforeAnyWrite() {
        var accounts = mock(FixedDepositAccountRepository.class);
        var transactions = mock(FDTransactionRepository.class);
        var numbers = mock(AccountNumberGenerator.class);
        var service = new FixedDepositAccountServiceImpl(accounts, numbers, transactions, validator);
        var request = new FixedDepositAccountRequestDTO();
        request.setCustomerId("999");
        when(registry.findById("999")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> service.createAccount(request));
        assertThrows(ResponseStatusException.class, () -> service.createAccountWithTransaction(request));
        verifyNoInteractions(accounts, transactions, numbers);
    }
}
