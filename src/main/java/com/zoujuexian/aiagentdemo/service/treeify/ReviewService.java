package com.zoujuexian.aiagentdemo.service.treeify;

import com.zoujuexian.aiagentdemo.api.common.ApiErrorCode;
import com.zoujuexian.aiagentdemo.api.common.BusinessException;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review.ReviewDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review.ReviewStatsDto;
import com.zoujuexian.aiagentdemo.api.controller.treeify.dto.review.SubmitReviewRequest;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyCaseReview;
import com.zoujuexian.aiagentdemo.domain.entity.TreeifyTestCase;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyCaseReviewRepository;
import com.zoujuexian.aiagentdemo.domain.repository.TreeifyTestCaseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class ReviewService {

    private static final Set<String> VALID_REVIEW_STATUSES = Set.of("approved", "rejected", "needs_revision");

    private final TreeifyCaseReviewRepository reviewRepository;
    private final TreeifyTestCaseRepository testCaseRepository;
    private final TreeifyPersistenceService persistenceService;

    public ReviewService(TreeifyCaseReviewRepository reviewRepository,
                         TreeifyTestCaseRepository testCaseRepository,
                         TreeifyPersistenceService persistenceService) {
        this.reviewRepository = reviewRepository;
        this.testCaseRepository = testCaseRepository;
        this.persistenceService = persistenceService;
    }

    @Transactional
    public ReviewDto submitReview(Long caseId, SubmitReviewRequest request) {
        TreeifyTestCase testCase = testCaseRepository.findById(caseId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId));

        String status = request.status();
        if (status == null || !VALID_REVIEW_STATUSES.contains(status)) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "评审状态不合法: " + status);
        }

        String reviewer = request.reviewer();
        if (reviewer == null || reviewer.isBlank()) {
            throw new BusinessException(ApiErrorCode.BAD_REQUEST, "评审人不能为空");
        }

        String currentReviewStatus = testCase.getReviewStatus();
        if ("approved".equals(currentReviewStatus) && !"needs_revision".equals(status)) {
            throw new BusinessException(ApiErrorCode.REVIEW_INVALID_STATE, "已通过的用例只能重新评审为 needs_revision");
        }

        TreeifyCaseReview review = new TreeifyCaseReview();
        review.setCaseId(caseId);
        review.setReviewer(reviewer.trim());
        review.setStatus(status);
        review.setComment(request.comment());
        reviewRepository.save(review);

        testCase.setReviewStatus(status);
        testCaseRepository.save(testCase);

        return toDto(review, testCase.getTitle());
    }

    public List<ReviewDto> getReviewHistory(Long caseId) {
        testCaseRepository.findById(caseId)
                .orElseThrow(() -> new BusinessException(ApiErrorCode.NOT_FOUND, "用例不存在: " + caseId));

        String caseTitle = testCaseRepository.findById(caseId)
                .map(TreeifyTestCase::getTitle)
                .orElse("");

        return reviewRepository.findByCaseIdOrderByIdDesc(caseId).stream()
                .map(review -> toDto(review, caseTitle))
                .toList();
    }

    public ReviewStatsDto getReviewStats(Long projectId) {
        List<TreeifyTestCase> cases = testCaseRepository.findAllByProjectIdOrderById(projectId);
        long pending = 0;
        long approved = 0;
        long rejected = 0;
        long needsRevision = 0;
        for (TreeifyTestCase c : cases) {
            String rs = c.getReviewStatus();
            if (rs == null) rs = "pending";
            switch (rs) {
                case "approved" -> approved++;
                case "rejected" -> rejected++;
                case "needs_revision" -> needsRevision++;
                default -> pending++;
            }
        }
        return new ReviewStatsDto(pending, approved, rejected, needsRevision);
    }

    private ReviewDto toDto(TreeifyCaseReview review, String caseTitle) {
        return new ReviewDto(
                review.getId(),
                review.getCaseId(),
                caseTitle,
                review.getReviewer(),
                review.getStatus(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
