package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.report.*;
import com.BankingTech.demo.service.FdAuthKafkaClient;
import com.BankingTech.demo.service.ReportingService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Function;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/report")
public class ReportController {
    private final ReportingService reports;
    private final FdAuthKafkaClient auth;
    public ReportController(ReportingService reports, FdAuthKafkaClient auth) { this.reports = reports; this.auth = auth; }

    @GetMapping("/fd-summary")
    public ResponseEntity<?> fdSummary(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        officer(authorization); List<FDReportDto> data = reports.fdSummary();
        return respond(format, "fd-account-status-summary.csv", data, row -> csv(row.productCode(), row.currency(), row.totalAccounts(), row.totalPrincipal(), row.totalInterestAccrued()),
                "productCode,currency,totalAccounts,totalPrincipal,totalInterestAccrued");
    }

    @GetMapping("/interest-transactions")
    public ResponseEntity<?> interestHistory(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        officer(authorization); List<InterestTransactionReportDto> data = reports.interestHistory();
        return respond(format, "interest-transaction-history.csv", data, row -> csv(row.accountNo(), row.productCode(), row.currency(), row.interestAmount(), row.postedAt(), row.status()),
                "accountNo,productCode,currency,interestAmount,postedAt,status");
    }

    @GetMapping("/maturity-summary")
    public ResponseEntity<?> maturitySummary(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        officer(authorization); List<MaturityReportDto> data = reports.maturitySummary();
        return respond(format, "maturity-summary.csv", data, row -> csv(row.maturityDate(), row.currency(), row.totalAccounts(), row.totalPrincipal(), row.accruedInterest()),
                "maturityDate,currency,totalAccounts,totalPrincipal,accruedInterest");
    }

    @GetMapping("/customer-portfolio")
    public CustomerPortfolioDto customerPortfolio(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var profile = auth.profile(authorization);
        if (!"CUSTOMER".equalsIgnoreCase(profile.role()) || profile.customerId() == null) forbidden();
        return reports.portfolio(profile.customerId());
    }

    private void officer(String authorization) {
        String role = auth.profile(authorization).role();
        if (!"ADMIN".equalsIgnoreCase(role) && !"BANK_OFFICER".equalsIgnoreCase(role)
                && !"STAFF".equalsIgnoreCase(role)) forbidden();
    }
    private void forbidden() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this report"); }
    private <T> ResponseEntity<?> respond(String format, String filename, List<T> data, Function<T, String> mapper, String header) {
        if (!"csv".equalsIgnoreCase(format)) return ResponseEntity.ok(data);
        String body = header + "\n" + data.stream().map(mapper).collect(java.util.stream.Collectors.joining("\n"));
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").body(body);
    }
    private String csv(Object... values) { return java.util.Arrays.stream(values).map(v -> "\"" + String.valueOf(v).replace("\"", "\"\"") + "\"").collect(java.util.stream.Collectors.joining(",")); }
}
