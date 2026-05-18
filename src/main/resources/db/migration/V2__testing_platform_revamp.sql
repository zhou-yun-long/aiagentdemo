-- V2: testing platform revamp — new tables + ALTERs

-- New tables
CREATE TABLE treeify_test_plan (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    name        VARCHAR(200) NOT NULL,
    description CLOB,
    status      VARCHAR(16) NOT NULL DEFAULT 'draft',
    start_date  TIMESTAMP,
    end_date    TIMESTAMP,
    owner_id    BIGINT,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);
CREATE INDEX idx_treeify_test_plan_project ON treeify_test_plan(project_id, status);

CREATE TABLE treeify_plan_case (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    plan_id          BIGINT NOT NULL,
    case_id          BIGINT NOT NULL,
    assignee_id      BIGINT,
    execution_result VARCHAR(16),
    note             CLOB,
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL,
    CONSTRAINT uq_plan_case UNIQUE (plan_id, case_id)
);
CREATE INDEX idx_plan_case_plan ON treeify_plan_case(plan_id);
CREATE INDEX idx_plan_case_case ON treeify_plan_case(case_id);

CREATE TABLE treeify_test_report (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id   BIGINT NOT NULL,
    plan_id      BIGINT NOT NULL,
    name         VARCHAR(200) NOT NULL,
    summary_json CLOB NOT NULL,
    created_at   TIMESTAMP NOT NULL,
    created_by   BIGINT
);
CREATE INDEX idx_treeify_test_report_project ON treeify_test_report(project_id, plan_id);

CREATE TABLE treeify_attachment (
    attachment_id VARCHAR(40) PRIMARY KEY,
    project_id    BIGINT NOT NULL,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(128) NOT NULL,
    size          BIGINT NOT NULL,
    storage_path  VARCHAR(512) NOT NULL,
    purpose       VARCHAR(32) NOT NULL DEFAULT 'requirement',
    created_at    TIMESTAMP NOT NULL
);
CREATE INDEX idx_treeify_attachment_project ON treeify_attachment(project_id, purpose);

-- ALTERs on existing tables
ALTER TABLE treeify_generation_task ADD COLUMN config_json CLOB;
ALTER TABLE treeify_test_case ADD COLUMN granularity VARCHAR(8);
ALTER TABLE treeify_test_case ADD COLUMN platforms VARCHAR(512);
ALTER TABLE treeify_test_case ADD COLUMN scenario_tags VARCHAR(512);
