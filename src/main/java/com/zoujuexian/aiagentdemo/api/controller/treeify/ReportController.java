package com.zoujuexian.aiagentdemo.api.controller.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.ApiResponse;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.FailedCaseDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.ReportSummaryDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.report.TestReportDto;
import com.zoujuexian.aiagentdemo.service.treeify.ExcelExportService;
import com.zoujuexian.aiagentdemo.service.treeify.ReportPdfService;
import com.zoujuexian.aiagentdemo.service.treeify.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ReportController {

    private final ReportService reportService;
    private final ReportPdfService reportPdfService;
    private final ExcelExportService excelExportService;

    public ReportController(
            ReportService reportService,
            ReportPdfService reportPdfService,
            ExcelExportService excelExportService
    ) {
        this.reportService = reportService;
        this.reportPdfService = reportPdfService;
        this.excelExportService = excelExportService;
    }

    @PostMapping("/plans/{planId}/reports")
    public ResponseEntity<ApiResponse<TestReportDto>> createReport(
            @PathVariable Long planId,
            @RequestParam Long projectId
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(reportService.createReport(projectId, planId)));
    }

    @GetMapping("/projects/{projectId}/reports")
    public ApiResponse<List<TestReportDto>> listReports(@PathVariable Long projectId) {
        return ApiResponse.ok(reportService.listReports(projectId));
    }

    @GetMapping("/reports/{reportId}")
    public ApiResponse<TestReportDto> getReport(@PathVariable Long reportId) {
        return ApiResponse.ok(reportService.getReport(reportId));
    }

    @GetMapping("/reports/{reportId}/summary")
    public ApiResponse<ReportSummaryDto> getReportSummary(@PathVariable Long reportId) {
        return ApiResponse.ok(reportService.getReportSummary(reportId));
    }

    @GetMapping("/reports/{reportId}/failed-cases")
    public ApiResponse<List<FailedCaseDto>> getFailedCases(@PathVariable Long reportId) {
        return ApiResponse.ok(reportService.getFailedCases(reportId));
    }

    @GetMapping("/reports/{reportId}/export")
    public ResponseEntity<byte[]> exportReport(
            @PathVariable Long reportId,
            @RequestParam(defaultValue = "excel") String format
    ) {
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] content = reportPdfService.exportReportPdf(reportId);
            TestReportDto report = reportService.getReport(reportId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    "report-" + reportId + ".pdf");
            headers.setContentLength(content.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(content);
        } else if ("excel".equalsIgnoreCase(format)) {
            TestReportDto report = reportService.getReport(reportId);
            byte[] content = excelExportService.exportProjectCasesToExcel(report.projectId());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment",
                    "report-" + reportId + ".xlsx");
            headers.setContentLength(content.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(content);
        } else {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST,
                    "不支持的导出格式: " + format + "，支持 excel 或 pdf");
        }
    }
}
