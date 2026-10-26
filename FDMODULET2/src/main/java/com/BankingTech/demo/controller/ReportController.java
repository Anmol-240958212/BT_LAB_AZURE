package com.BankingTech.demo.controller;

import com.BankingTech.demo.dto.report.*;
import com.BankingTech.demo.service.FdAuthKafkaClient;
import com.BankingTech.demo.service.ReportingService;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
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
                "productCode,currency,totalAccounts,totalPrincipal,totalInterestAccrued", "FD Account Status Summary");
    }

    @GetMapping("/interest-transactions")
    public ResponseEntity<?> interestHistory(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        officer(authorization); List<InterestTransactionReportDto> data = reports.interestHistory();
        return respond(format, "interest-transaction-history.csv", data, row -> csv(row.accountNo(), row.productCode(), row.currency(), row.principal(), row.interestAmount(), row.postedAt(), row.status()),
                "accountNo,productCode,currency,principal,interestAmount,postedAt,status", "Interest Transaction History");
    }

    @GetMapping("/maturity-summary")
    public ResponseEntity<?> maturitySummary(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        officer(authorization); List<MaturityReportDto> data = reports.maturitySummary();
        return respond(format, "maturity-summary.csv", data, row -> csv(row.maturityDate(), row.currency(), row.totalAccounts(), row.totalPrincipal(), row.accruedInterest()),
                "maturityDate,currency,totalAccounts,totalPrincipal,accruedInterest", "Maturity Summary");
    }

    @GetMapping("/customer-portfolio")
    public ResponseEntity<?> customerPortfolio(@RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(defaultValue = "json") String format) {
        var profile = auth.profile(authorization);
        if (!"CUSTOMER".equalsIgnoreCase(profile.role()) || profile.customerId() == null) forbidden();
        CustomerPortfolioDto portfolio = reports.portfolio(profile.customerId());
        if (!"csv".equalsIgnoreCase(format) && !"pdf".equalsIgnoreCase(format)) {
            return ResponseEntity.ok(portfolio);
        }
        return respond(format, "customer-fd-portfolio.csv", portfolio.accounts(),
                row -> csv(portfolio.customerName(), portfolio.email(), portfolio.phoneNumber(), row.accountNo(), row.productCode(), row.currency(), row.principal(), row.rate(),
                        row.interestGenerated(), row.maturityDate(), row.status(), row.interestFrequency()),
                "customerName,email,phoneNumber,accountNo,productCode,currency,principal,rate,interestGenerated,maturityDate,status,interestFrequency",
                "Customer Fixed Deposit Portfolio");
    }

    private void officer(String authorization) {
        String role = auth.profile(authorization).role();
        if (!"ADMIN".equalsIgnoreCase(role) && !"BANK_OFFICER".equalsIgnoreCase(role)
                && !"STAFF".equalsIgnoreCase(role)) forbidden();
    }
    private void forbidden() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this report"); }
    private <T> ResponseEntity<?> respond(String format, String filename, List<T> data, Function<T, String> mapper, String header, String title) {
        if ("pdf".equalsIgnoreCase(format)) {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename.replace(".csv", ".pdf") + "\"")
                    .body(pdf(title, header, data.stream().map(mapper).toList()));
        }
        if (!"csv".equalsIgnoreCase(format)) return ResponseEntity.ok(data);
        String body = header + "\n" + data.stream().map(mapper).collect(java.util.stream.Collectors.joining("\n"));
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"").body(body);
    }
    private String csv(Object... values) { return java.util.Arrays.stream(values).map(v -> "\"" + String.valueOf(v).replace("\"", "\"\"") + "\"").collect(java.util.stream.Collectors.joining(",")); }
    private byte[] pdf(String title, String header, List<String> rows) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 28, 28, 30, 30);
            PdfWriter.getInstance(document, output); document.open();
            document.add(new com.lowagie.text.Paragraph(title, new Font(Font.HELVETICA, 16, Font.BOLD)));
            document.add(new com.lowagie.text.Paragraph("Generated: " + java.time.LocalDateTime.now()));
            String[] headers = header.split(","); PdfPTable table = new PdfPTable(headers.length); table.setWidthPercentage(100);
            Font heading = new Font(Font.HELVETICA, 8, Font.BOLD); Font body = new Font(Font.HELVETICA, 8);
            for (String value : headers) { PdfPCell cell = new PdfPCell(new Phrase(value, heading)); cell.setBackgroundColor(new java.awt.Color(230, 238, 246)); cell.setPadding(4); table.addCell(cell); }
            for (String row : rows) for (String value : row.replace("\"", "").split(",", -1)) { PdfPCell cell = new PdfPCell(new Phrase(value, body)); cell.setPadding(4); table.addCell(cell); }
            document.add(table); document.close(); return output.toByteArray();
        } catch (Exception error) { throw new IllegalStateException("Unable to generate report PDF", error); }
    }
}
