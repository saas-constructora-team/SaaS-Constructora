package com.SaaS.Constructora.projects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository repository;

    public ProjectService(ProjectRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ProjectResponse create(UUID tenantId, CreateProjectRequest req) {
        Project project = new Project(tenantId, req.name(), req.clientName(), req.location());
        Project saved = repository.save(project);
        return ProjectResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(UUID tenantId) {
        return repository.findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(ProjectResponse::from)
                .toList();
    }
}