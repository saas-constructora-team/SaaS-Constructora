package com.SaaS.Constructora.projects;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
class ProjectController {

    private final ProjectService service;

    ProjectController(ProjectService service) { this.service = service; }

    @PostMapping
    ResponseEntity<ProjectResponse> create(
            @RequestHeader("X-Tenant-Id") UUID tenantId,
            @Valid @RequestBody CreateProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(tenantId, request));
    }

    @GetMapping
    List<ProjectResponse> list(@RequestHeader("X-Tenant-Id") UUID tenantId) {
        return service.list(tenantId);
    }
}