package com.example.auth.serviceimpl;

import com.example.auth.dto.CustomerBenefitResponseDto;
import com.example.auth.dto.CustomerBenefitUpdateRequestDto;
import com.example.auth.entity.CustDtl;
import com.example.auth.repository.AuthUsrRepository;
import com.example.auth.repository.CustDtlRepository;
import com.example.auth.service.CustomerBenefitService;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerBenefitServiceImpl implements CustomerBenefitService {
    private final CustDtlRepository customers;
    private final AuthUsrRepository users;

    public CustomerBenefitServiceImpl(CustDtlRepository customers, AuthUsrRepository users) {
        this.customers = customers;
        this.users = users;
    }

    @Override
    @Transactional
    public CustomerBenefitResponseDto update(Long customerId, CustomerBenefitUpdateRequestDto request, String actorUsername) {
        var actor = users.findByUsername(actorUsername)
                .orElseThrow(() -> new AccessDeniedException("Authenticated administrator not found"));
        String role = actor.getRole() == null ? "" : actor.getRole().getRoleCode();
        if (!"ADMIN".equals(role) && !"HEAD_ADMIN".equals(role)) {
            throw new AccessDeniedException("Only administrators may assign customer pricing benefits");
        }
        CustDtl customer = customers.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        customer.setBankEmployee(request.bankEmployee());
        customer.setPremiumWealthCustomer(request.premiumWealthCustomer());
        return response(customers.save(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerBenefitResponseDto get(Long customerId) {
        return response(customers.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found")));
    }

    /** DOB is evaluated at request time, so the senior benefit starts on the customer's 60th birthday. */
    public static List<String> categoriesFor(CustDtl customer) {
        List<String> categories = new ArrayList<>();
        if (customer.getDateOfBirth() != null
                && Period.between(customer.getDateOfBirth(), LocalDate.now()).getYears() >= 60) {
            categories.add("SENIOR_CITIZEN");
        }
        if (customer.isBankEmployee()) categories.add("EMPLOYEE");
        if (customer.isPremiumWealthCustomer()) categories.add("PREMIUM_WEALTH_CUSTOMER");
        return List.copyOf(categories);
    }

    private CustomerBenefitResponseDto response(CustDtl customer) {
        return new CustomerBenefitResponseDto(customer.getCustomerIdentifier(), customer.isBankEmployee(),
                customer.isPremiumWealthCustomer(), categoriesFor(customer));
    }
}
