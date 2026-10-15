package com.BankingTech.demo.service;

import java.util.Optional;
import com.BankingTech.demo.entity.FdCustomerRegistry;
import com.BankingTech.demo.repository.FdCustomerRegistryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FdCustomerValidationService {
    private final FdCustomerRegistryRepository registry;
    private final JdbcTemplate jdbcTemplate;

    public FdCustomerValidationService(FdCustomerRegistryRepository registry) {
        this.registry = registry;
        this.jdbcTemplate = null;
    }

    @Autowired
    public FdCustomerValidationService(FdCustomerRegistryRepository registry, Optional<JdbcTemplate> jdbcTemplate) {
        this.registry = registry;
        this.jdbcTemplate = jdbcTemplate != null ? jdbcTemplate.orElse(null) : null;
    }

    public FdCustomerRegistry requireApprovedCustomer(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer ID is required");
        }
        var customerOpt = registry.findById(customerId.trim());
        if (customerOpt.isEmpty()) {
            customerOpt = trySyncFromAuthDatabase(customerId.trim());
        }

        var customer = customerOpt.orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer is not synchronized to FD; complete KYC and wait for Kafka"));
        if (!"ACTIVE".equalsIgnoreCase(customer.getCustomerStatus())
                || !"ACTIVE".equalsIgnoreCase(customer.getKycStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer and KYC must both be ACTIVE to open an FD");
        }
        return customer;
    }

    private Optional<FdCustomerRegistry> trySyncFromAuthDatabase(String customerId) {
        if (jdbcTemplate == null) {
            return Optional.empty();
        }
        try {
            Long cstId = Long.parseLong(customerId.trim());
            String sql = "SELECT cd.CSTID_IDFR, cd.CUST_FULL_NAME, csm.status_code, au.email " +
                    "FROM authandcust.cust_dtl cd " +
                    "LEFT JOIN authandcust.cust_sts_mstr csm ON cd.CUST_STATUS = csm.status_id " +
                    "LEFT JOIN authandcust.auth_usr au ON cd.CSTID_IDFR = au.cstid_idfr " +
                    "WHERE cd.CSTID_IDFR = ?";
            return jdbcTemplate.query(sql, rs -> {
                if (rs.next()) {
                    String statusCode = rs.getString("status_code");
                    if ("ACTIVE".equalsIgnoreCase(statusCode)) {
                        FdCustomerRegistry reg = new FdCustomerRegistry();
                        reg.setCustomerId(String.valueOf(rs.getLong("CSTID_IDFR")));
                        reg.setFullName(rs.getString("CUST_FULL_NAME"));
                        reg.setCustomerStatus("ACTIVE");
                        reg.setKycStatus("ACTIVE");
                        reg.setEmail(rs.getString("email"));
                        reg.setLastUpdatedAt(java.time.LocalDateTime.now());
                        return Optional.of(registry.save(reg));
                    }
                }
                return Optional.empty();
            }, cstId);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
