package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.report.FdMaturityReportDto;
import com.BankingTech.demo.service.FdAuthKafkaClient;
import com.BankingTech.demo.service.MaturityReportExportService;
import com.BankingTech.demo.service.ReportingService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** A detailed report for a completed FD maturity settlement. */
@RestController
@RequestMapping("/api/fd/reports")
public class FdMaturityReportController {
    private final ReportingService reports;
    private final FdAuthKafkaClient auth;
    private final MaturityReportExportService exports;
    public FdMaturityReportController(ReportingService reports, FdAuthKafkaClient auth, MaturityReportExportService exports) {
        this.reports = reports; this.auth = auth; this.exports = exports;
    }

    @GetMapping("/maturity/{fdAccountNo}")
    public ResponseEntity<?> maturityReport(@PathVariable String fdAccountNo,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "json") String format) {
        var profile = auth.profile(authorization);
        if (!"ADMIN".equalsIgnoreCase(profile.role()) && !"BANK_OFFICER".equalsIgnoreCase(profile.role())
                && (!"CUSTOMER".equalsIgnoreCase(profile.role()) || profile.customerId() == null
                || !String.valueOf(profile.customerId()).equals(reports.accountCustomerId(fdAccountNo)))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this FD report");
        }
        FdMaturityReportDto report = reports.maturityReport(fdAccountNo);
        String normalized = format == null ? "json" : format.trim().toLowerCase(java.util.Locale.ROOT);
        if ("pdf".equals(normalized)) return attachment(fdAccountNo, "pdf", MediaType.APPLICATION_PDF, exports.pdf(report));
        if ("xlsx".equals(normalized) || "excel".equals(normalized)) {
            return attachment(fdAccountNo, "xlsx", MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), exports.excel(report));
        }
        if (!"json".equals(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Supported formats are json, pdf, and xlsx");
        return ResponseEntity.ok(report);
    }

    private ResponseEntity<byte[]> attachment(String accountNo, String extension, MediaType mediaType, byte[] body) {
        String filename = "fd-maturity-report-" + accountNo + "." + extension;
        return ResponseEntity.ok().contentType(mediaType).contentLength(body.length)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString()).body(body);
    }
}
