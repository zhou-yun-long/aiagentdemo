-- V1 baseline: create all existing tables

CREATE TABLE treeify_project (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    description      VARCHAR(2000),
    status           VARCHAR(32) NOT NULL,
    traceability_json CLOB,
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL
);

CREATE TABLE treeify_test_case (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id       BIGINT NOT NULL,
    parent_id        BIGINT,
    title            VARCHAR(255) NOT NULL,
    precondition     VARCHAR(2000),
    steps            VARCHAR(4000),
    expected         VARCHAR(2000),
    priority         VARCHAR(8),
    tags             VARCHAR(2000),
    source           VARCHAR(32),
    execution_status VARCHAR(32),
    layout           VARCHAR(2000),
    version          INTEGER NOT NULL,
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL
);

CREATE TABLE treeify_generation_task (
    task_id          VARCHAR(36) PRIMARY KEY,
    project_id       BIGINT NOT NULL,
    mode             VARCHAR(16) NOT NULL,
    input_text       CLOB,
    selected_node_id VARCHAR(128),
    context_case_ids VARCHAR(2000),
    status           VARCHAR(32) NOT NULL,
    current_stage    VARCHAR(32),
    stream_url       VARCHAR(128),
    critic_score     INTEGER,
    e1_result        VARCHAR(4000),
    e2_result        VARCHAR(4000),
    feedback         VARCHAR(2000),
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL,
    completed_at     TIMESTAMP
);

CREATE TABLE treeify_generation_event (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id    VARCHAR(36) NOT NULL,
    event_name VARCHAR(32) NOT NULL,
    stage      VARCHAR(16),
    sequence   BIGINT NOT NULL,
    payload    CLOB,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE treeify_mindmap_node (
    id               VARCHAR(128) PRIMARY KEY,
    project_id       BIGINT NOT NULL,
    parent_id        VARCHAR(128),
    case_id          VARCHAR(128),
    title            VARCHAR(500) NOT NULL,
    kind             VARCHAR(32) NOT NULL,
    priority         VARCHAR(8),
    tags             VARCHAR(2000),
    status           VARCHAR(32),
    execution_status VARCHAR(32),
    source           VARCHAR(32),
    version          INTEGER NOT NULL,
    lane             VARCHAR(32),
    depth            INTEGER NOT NULL,
    node_order       INTEGER NOT NULL,
    font_family      VARCHAR(500),
    font_size        INTEGER,
    font_weight      INTEGER,
    layout           VARCHAR(2000),
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL
);

CREATE TABLE treeify_project_share (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    share_token VARCHAR(64) NOT NULL,
    active      BOOLEAN NOT NULL,
    created_at  TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX uk_share_token ON treeify_project_share(share_token);

CREATE TABLE treeify_project_summary (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    content    VARCHAR(4000) NOT NULL,
    version    INTEGER NOT NULL,
    current    BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE treeify_case_snapshot (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id  BIGINT NOT NULL,
    name        VARCHAR(200),
    description VARCHAR(2000),
    case_count  INTEGER NOT NULL,
    format      VARCHAR(16) NOT NULL,
    data        CLOB NOT NULL,
    created_at  TIMESTAMP NOT NULL
);

CREATE TABLE treeify_knowledge_document (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    title      VARCHAR(255) NOT NULL,
    content    VARCHAR(4000) NOT NULL,
    source     VARCHAR(64),
    created_at TIMESTAMP NOT NULL
);
