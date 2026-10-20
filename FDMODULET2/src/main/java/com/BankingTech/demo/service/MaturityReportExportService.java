package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.report.FdMaturityReportDto;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

/** Renders an already-authorized maturity report without storing the generated file. */
@Service
public class MaturityReportExportService {
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] pdf(FdMaturityReportDto report) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 28, 28, 30, 30);
            PdfWriter.getInstance(document, output);
            document.open();
            Font title = new Font(Font.HELVETICA, 17, Font.BOLD);
            Font heading = new Font(Font.HELVETICA, 11, Font.BOLD);
            document.add(new Paragraph("Fixed Deposit Maturity Report", title));
            document.add(new Paragraph("Account " + report.fdAccount().accountNo() + " | Generated " + DATE_TIME.format(report.reportGeneratedAt())));
            document.add(new Paragraph(" "));
            section(document, "Customer and account", heading);
            table(document, new String[]{"Customer", "Product", "Currency", "Principal", "Term", "Maturity date"}, new String[][]{{
                    value(report.customer().fullName()), value(report.fdAccount().productCode()), value(report.fdAccount().currency()),
                    money(report.fdAccount().principal(), report.fdAccount().currency()), report.fdAccount().termMonths() + " months",
                    value(report.fdAccount().maturityDate())}});
            document.add(new Paragraph("Customer status: " + value(report.customer().customerStatus()) + " | KYC: " + value(report.customer().kycStatus())));
            document.add(new Paragraph(" "));
            section(document, "Maturity settlement", heading);
            table(document, new String[]{"Gross payout", "Principal", "Interest", "Penalty", "Net payout", "Processed"}, new String[][]{{
                    money(report.maturity().grossPayout(), report.fdAccount().currency()), money(report.maturity().principalComponent(), report.fdAccount().currency()),
                    money(report.maturity().interestComponent(), report.fdAccount().currency()), money(report.maturity().penaltyAmount(), report.fdAccount().currency()),
                    money(report.maturity().netPayout(), report.fdAccount().currency()), dateTime(report.maturity().processedAt())}});
            document.add(new Paragraph(" "));
            section(document, "Interest postings", heading);
            table(document, new String[]{"Date", "Amount", "Status"}, report.interestTransactions().stream()
                    .map(tx -> new String[]{dateTime(tx.postedAt()), money(tx.amount(), report.fdAccount().currency()), value(tx.status())}).toArray(String[][]::new));
            document.add(new Paragraph(" "));
            section(document, "Transactions", heading);
            table(document, new String[]{"Date", "Type", "Amount", "Penalty", "Remarks"}, report.transactions().stream()
                    .map(tx -> new String[]{dateTime(tx.occurredAt()), value(tx.type()), money(tx.amount(), report.fdAccount().currency()),
                            money(tx.penaltyAmount(), report.fdAccount().currency()), value(tx.remarks())}).toArray(String[][]::new));
            document.add(new Paragraph(" "));
            section(document, "Notifications", heading);
            table(document, new String[]{"Type", "Channel", "Recipient", "Status", "Sent"}, report.notifications().stream()
                    .map(note -> new String[]{value(note.type()), value(note.channel()), value(note.maskedRecipient()), value(note.status()), dateTime(note.sentAt())}).toArray(String[][]::new));
            document.close();
            return output.toByteArray();
        } catch (Exception exception) { throw new IllegalStateException("Unable to create PDF report", exception); }
    }

    public byte[] excel(FdMaturityReportDto report) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle header = header(workbook); CellStyle money = money(workbook); String currency = report.fdAccount().currency();
            Sheet summary = workbook.createSheet("Maturity report");
            row(summary, 0, "Fixed Deposit Maturity Report", report.fdAccount().accountNo());
            row(summary, 2, "Customer", report.customer().fullName()); row(summary, 3, "Customer status", report.customer().customerStatus());
            row(summary, 4, "Product", report.fdAccount().productCode()); row(summary, 5, "Currency", currency);
            row(summary, 6, "Opening date", report.fdAccount().openedAt()); row(summary, 7, "Maturity date", report.fdAccount().maturityDate());
            row(summary, 9, "Gross payout", report.maturity().grossPayout(), money); row(summary, 10, "Principal", report.maturity().principalComponent(), money);
            row(summary, 11, "Interest", report.maturity().interestComponent(), money); row(summary, 12, "Penalty", report.maturity().penaltyAmount(), money);
            row(summary, 13, "Net payout", report.maturity().netPayout(), money); summary.autoSizeColumn(0); summary.autoSizeColumn(1);
            Sheet interest = workbook.createSheet("Interest postings"); header(interest, header, "Interest ID", "Date", "Amount (" + currency + ")", "Status");
            int interestRow = 1; for (var tx : report.interestTransactions()) { Row row = interest.createRow(interestRow++); cell(row, 0, tx.id()); cell(row, 1, dateTime(tx.postedAt())); cell(row, 2, tx.amount(), money); cell(row, 3, tx.status()); } size(interest, 4);
            Sheet transactions = workbook.createSheet("Transactions"); header(transactions, header, "Transaction ID", "Date", "Type", "Amount (" + currency + ")", "Penalty (" + currency + ")", "Remarks");
            int transactionRow = 1; for (var tx : report.transactions()) { Row row = transactions.createRow(transactionRow++); cell(row, 0, tx.id()); cell(row, 1, dateTime(tx.occurredAt())); cell(row, 2, tx.type()); cell(row, 3, tx.amount(), money); cell(row, 4, tx.penaltyAmount(), money); cell(row, 5, tx.remarks()); } size(transactions, 6);
            Sheet notifications = workbook.createSheet("Notifications"); header(notifications, header, "ID", "Type", "Channel", "Recipient", "Status", "Sent");
            int notificationRow = 1; for (var note : report.notifications()) { Row row = notifications.createRow(notificationRow++); cell(row, 0, note.id()); cell(row, 1, note.type()); cell(row, 2, note.channel()); cell(row, 3, note.maskedRecipient()); cell(row, 4, note.status()); cell(row, 5, dateTime(note.sentAt())); } size(notifications, 6);
            workbook.write(output); return output.toByteArray();
        } catch (Exception exception) { throw new IllegalStateException("Unable to create Excel report", exception); }
    }

    private void section(Document document, String title, Font heading) throws Exception { document.add(new Paragraph(title, heading)); }
    private void table(Document document, String[] headers, String[][] values) throws Exception { PdfPTable table = new PdfPTable(headers.length); table.setWidthPercentage(100); Font headerFont = new Font(Font.HELVETICA, 8, Font.BOLD); Font bodyFont = new Font(Font.HELVETICA, 8); for (String header : headers) { PdfPCell cell = new PdfPCell(new Phrase(header, headerFont)); cell.setBackgroundColor(new java.awt.Color(230, 238, 246)); cell.setPadding(3); table.addCell(cell); } for (String[] row : values) for (String value : row) { PdfPCell cell = new PdfPCell(new Phrase(value, bodyFont)); cell.setPadding(3); table.addCell(cell); } document.add(table); }
    private CellStyle header(Workbook workbook) { CellStyle style = workbook.createCellStyle(); style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex()); style.setFillPattern(FillPatternType.SOLID_FOREGROUND); org.apache.poi.ss.usermodel.Font font = workbook.createFont(); font.setColor(IndexedColors.WHITE.getIndex()); font.setBold(true); style.setFont(font); return style; }
    private CellStyle money(Workbook workbook) { CellStyle style = workbook.createCellStyle(); style.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00")); return style; }
    private void header(Sheet sheet, CellStyle style, String... values) { Row row = sheet.createRow(0); for (int i = 0; i < values.length; i++) { Cell cell = row.createCell(i); cell.setCellValue(values[i]); cell.setCellStyle(style); } }
    private void row(Sheet sheet, int index, String label, Object value) { row(sheet, index, label, value, null); }
    private void row(Sheet sheet, int index, String label, Object value, CellStyle style) { Row row = sheet.createRow(index); cell(row, 0, label); cell(row, 1, value, style); }
    private void cell(Row row, int index, Object value) { cell(row, index, value, null); }
    private void cell(Row row, int index, Object value, CellStyle style) { Cell cell = row.createCell(index); if (value instanceof BigDecimal number) cell.setCellValue(number.doubleValue()); else cell.setCellValue(value == null ? "" : String.valueOf(value)); if (style != null) cell.setCellStyle(style); }
    private void size(Sheet sheet, int columns) { for (int i = 0; i < columns; i++) sheet.autoSizeColumn(i); }
    private String money(BigDecimal value, String currency) { return (currency == null ? "" : currency + " ") + (value == null ? "0.00" : value.setScale(2, java.math.RoundingMode.HALF_UP)); }
    private String dateTime(java.time.LocalDateTime value) { return value == null ? "-" : DATE_TIME.format(value); }
    private String value(Object value) { return value == null ? "-" : String.valueOf(value); }
}
