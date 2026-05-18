-- V3: add task_kind column to treeify_generation_task
ALTER TABLE treeify_generation_task ADD COLUMN task_kind VARCHAR(32);
