-- V4: defect tracking, case review, CI/CD integration

-- Defect tracking
CREATE TABLE treeify_defect (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    title       VARCHAR(500) NOT NULL,
    description CLOB,
    severity    VARCHAR(16) NOT NULL DEFAULT 'medium',
    status      VARCHAR(32) NOT NULL DEFAULT 'open',
    case_id     BIGINT,
    plan_id     BIGINT,
    reporter    VARCHAR(128),
    assignee    VARCHAR(128),
    resolution  CLOB,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_defect_project ON treeify_defect(project_id, status);
CREATE INDEX idx_defect_case ON treeify_defect(case_id);
CREATE INDEX idx_defect_severity ON treeify_defect(severity);

-- Case review
CREATE TABLE treeify_case_review (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    case_id     BIGINT NOT NULL,
    reviewer    VARCHAR(128) NOT NULL,
    status      VARCHAR(32) NOT NULL DEFAULT 'pending',
    comment     CLOB,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_case_review_case ON treeify_case_review(case_id);
CREATE INDEX idx_case_review_status ON treeify_case_review(status);

ALTER TABLE treeify_test_case ADD COLUMN review_status VARCHAR(32) DEFAULT 'pending';

-- CI/CD integration
CREATE TABLE treeify_api_token (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id   BIGINT NOT NULL,
    token        VARCHAR(128) NOT NULL,
    name         VARCHAR(128) NOT NULL,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP
);
CREATE UNIQUE INDEX uk_api_token ON treeify_api_token(token);
CREATE INDEX idx_api_token_project ON treeify_api_token(project_id);

CREATE TABLE treeify_webhook_log (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_id    BIGINT,
    endpoint    VARCHAR(255) NOT NULL,
    payload     CLOB,
    status_code INTEGER,
    error       CLOB,
    created_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_webhook_log_token ON treeify_webhook_log(token_id);
