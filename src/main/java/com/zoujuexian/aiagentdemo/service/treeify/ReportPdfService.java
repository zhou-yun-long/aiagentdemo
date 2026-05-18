package com.zoujuexian.aiagentdemo.service.treeify;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.FailedCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.ReportSummaryDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.TestReportDto;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class ReportPdfService {

    private final ReportService reportService;

    public ReportPdfService(ReportService reportService) {
        this.reportService = reportService;
    }

    public byte[] exportReportPdf(Long reportId) {
        TestReportDto report = reportService.getReport(reportId);
        ReportSummaryDto summary = reportService.getReportSummary(reportId);
        List<FailedCaseDto> failedCases = reportService.getFailedCases(reportId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = createChineseFont(18, Font.BOLD);
            Font headerFont = createChineseFont(12, Font.BOLD);
            Font bodyFont = createChineseFont(10, Font.NORMAL);

            // Title
            Paragraph title = new Paragraph(report.name(), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Summary section
            document.add(new Paragraph("测试报告摘要", headerFont));
            document.add(new Paragraph(" "));

            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(60);
            summaryTable.setHorizontalAlignment(Element.ALIGN_LEFT);
            addSummaryRow(summaryTable, "总用例数", String.valueOf(summary.totalCases()), bodyFont);
            addSummaryRow(summaryTable, "通过", String.valueOf(summary.passedCases()), bodyFont);
            addSummaryRow(summaryTable, "失败", String.valueOf(summary.failedCases()), bodyFont);
            addSummaryRow(summaryTable, "阻塞", String.valueOf(summary.blockedCases()), bodyFont);
            addSummaryRow(summaryTable, "跳过", String.valueOf(summary.skippedCases()), bodyFont);
            addSummaryRow(summaryTable, "通过率", String.format("%.1f%%", summary.passRate()), bodyFont);
            document.add(summaryTable);
            document.add(new Paragraph(" "));

            // Priority distribution
            if (summary.priorityDistribution() != null && !summary.priorityDistribution().isEmpty()) {
                document.add(new Paragraph("优先级分布", headerFont));
                document.add(new Paragraph(" "));
                PdfPTable priorityTable = new PdfPTable(2);
                priorityTable.setWidthPercentage(40);
                priorityTable.setHorizontalAlignment(Element.ALIGN_LEFT);
                for (Map.Entry<String, Integer> entry : summary.priorityDistribution().entrySet()) {
                    addSummaryRow(priorityTable, entry.getKey(), String.valueOf(entry.getValue()), bodyFont);
                }
                document.add(priorityTable);
                document.add(new Paragraph(" "));
            }

            // Failed cases
            List<FailedCaseDto> failedOnly = failedCases.stream()
                    .filter(c -> "fail".equals(c.executionResult()))
                    .toList();
            if (!failedOnly.isEmpty()) {
                document.add(new Paragraph("失败用例", headerFont));
                document.add(new Paragraph(" "));
                document.add(buildCaseTable(failedOnly, bodyFont));
                document.add(new Paragraph(" "));
            }

            // Blocked cases
            List<FailedCaseDto> blockedOnly = failedCases.stream()
                    .filter(c -> "blocked".equals(c.executionResult()))
                    .toList();
            if (!blockedOnly.isEmpty()) {
                document.add(new Paragraph("阻塞用例", headerFont));
                document.add(new Paragraph(" "));
                document.add(buildCaseTable(blockedOnly, bodyFont));
            }

            document.close();
            return out.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new BusinessException(ApiErrorCode.EXPORT_PDF_FAILED, "PDF report generation failed: " + e.getMessage());
        }
    }

    private Font createChineseFont(float size, int style) {
        try {
            BaseFont bf = BaseFont.createFont("STSong-Light", "UniGB-UCS2-H", BaseFont.NOT_EMBEDDED);
            return new Font(bf, size, style);
        } catch (Exception e) {
            // Fallback to default font if Chinese font not available
            return new Font(Font.HELVETICA, size, style);
        }
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font));
        labelCell.setBorder(PdfPCell.NO_BORDER);
        labelCell.setPadding(4);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, font));
        valueCell.setBorder(PdfPCell.NO_BORDER);
        valueCell.setPadding(4);
        table.addCell(valueCell);
    }

    private PdfPTable buildCaseTable(List<FailedCaseDto> cases, Font font) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        try {
            table.setWidths(new float[]{1, 3, 1, 3});
        } catch (DocumentException e) {
            // ignore
        }

        // Header
        Font headerFont = createChineseFont(10, Font.BOLD);
        addCell(table, "用例ID", headerFont, true);
        addCell(table, "用例标题", headerFont, true);
        addCell(table, "优先级", headerFont, true);
        addCell(table, "备注", headerFont, true);

        for (FailedCaseDto c : cases) {
            addCell(table, String.valueOf(c.caseId()), font, false);
            addCell(table, c.caseTitle() != null ? c.caseTitle() : "", font, false);
            addCell(table, c.priority() != null ? c.priority() : "", font, false);
            addCell(table, c.note() != null ? c.note() : "", font, false);
        }

        return table;
    }

    private void addCell(PdfPTable table, String text, Font font, boolean isHeader) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        if (isHeader) {
            cell.setGrayFill(0.85f);
        }
        table.addCell(cell);
    }
}
