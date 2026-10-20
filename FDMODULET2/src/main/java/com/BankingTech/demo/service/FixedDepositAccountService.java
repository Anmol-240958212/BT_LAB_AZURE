package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import com.BankingTech.demo.dto.responsedto.FDAccountCreationResponseDTO;
import com.BankingTech.demo.dto.responsedto.FixedDepositAccountResponseDTO;

import java.util.List;
import java.time.LocalDate;

public interface FixedDepositAccountService {

        FixedDepositAccountResponseDTO createAccount(
                        FixedDepositAccountRequestDTO request);

        FixedDepositAccountResponseDTO getAccount(
                        String fdAccountNo);

        List<FixedDepositAccountResponseDTO> getAccountsByCustomer(
                        String customerId);

        List<FixedDepositAccountResponseDTO> getAccountsByStatus(
                        String status);

        List<FixedDepositAccountResponseDTO> getCustomerAccountsByStatus(
                        String customerId,
                        String status);

        FDAccountCreationResponseDTO createAccountWithTransaction(
                        FixedDepositAccountRequestDTO request);

        FixedDepositAccountResponseDTO adjustAccountDates(String fdAccountNo, LocalDate openingDate, LocalDate maturityDate);

}
