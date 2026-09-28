package com.SaaS.Constructora.projects;

import java.time.LocalDateTime;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    String name,
    String clientName,
    String location,
    ProjectStatus status,
    LocalDateTime createdAt
) {
    static ProjectResponse from(Project p) {
        return new ProjectResponse(p.getId(), p.getName(), p.getClientName(),
                p.getLocation(), p.getStatus(), p.getCreatedAt());
    }
}