package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.StringJoiner;

@Service
public class ExcelExportService {

    private static final String[] HEADERS = {
            "用例名称", "优先级", "状态", "前置条件", "执行步骤", "预期结果", "标签", "来源"
    };

    private final TreeifyTestCaseRepository testCaseRepository;

    public ExcelExportService(TreeifyTestCaseRepository testCaseRepository) {
        this.testCaseRepository = testCaseRepository;
    }

    public byte[] exportProjectCasesToExcel(Long projectId) {
        List<TreeifyTestCase> cases = testCaseRepository.findAllByProjectIdOrderById(projectId);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("测试用例");

            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            // Header row
            XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                XSSFCell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            for (TreeifyTestCase tc : cases) {
                XSSFRow row = sheet.createRow(rowNum++);
                setCellValueOrEmpty(row.createCell(0), tc.getTitle(), dataStyle);
                setCellValueOrEmpty(row.createCell(1), tc.getPriority(), dataStyle);
                setCellValueOrEmpty(row.createCell(2), tc.getExecutionStatus(), dataStyle);
                setCellValueOrEmpty(row.createCell(3), tc.getPrecondition(), dataStyle);
                setCellValueOrEmpty(row.createCell(4), joinSteps(tc.getSteps()), dataStyle);
                setCellValueOrEmpty(row.createCell(5), tc.getExpected(), dataStyle);
                setCellValueOrEmpty(row.createCell(6), joinList(tc.getTags()), dataStyle);
                setCellValueOrEmpty(row.createCell(7), tc.getSource(), dataStyle);
            }

            // Auto-size columns
            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException(ApiErrorCode.INTERNAL_ERROR, "Excel export failed: " + e.getMessage());
        }
    }

    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorder(style);
        return style;
    }

    private CellStyle createDataStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setVerticalAlignment(VerticalAlignment.TOP);
        style.setWrapText(true);
        applyBorder(style);
        return style;
    }

    private void applyBorder(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    private void setCellValueOrEmpty(XSSFCell cell, String value, CellStyle style) {
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private String joinSteps(List<String> steps) {
        if (steps == null || steps.isEmpty()) return "";
        StringJoiner joiner = new StringJoiner("\n");
        for (int i = 0; i < steps.size(); i++) {
            joiner.add((i + 1) + ". " + steps.get(i));
        }
        return joiner.toString();
    }

    private String joinList(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(", ", list);
    }
}
