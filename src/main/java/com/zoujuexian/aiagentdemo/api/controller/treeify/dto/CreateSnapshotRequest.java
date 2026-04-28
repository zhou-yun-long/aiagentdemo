package com.zoujuexian.aiagentdemo.api.controller.treeify.dto;

public record CreateSnapshotRequest(
        String name,
        String description,
        String data
) {
}
