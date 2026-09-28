package com.SaaS.Constructora.projects;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    private UUID id;

    // Referencia por ID al tenant (módulo identity). NO usar @ManyToOne.
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "client_name", length = 200)
    private String clientName;

    @Column(length = 300)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProjectStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Project() { } // requerido por JPA

    public Project(UUID tenantId, String name, String clientName, String location) {
        this.id = UUID.randomUUID();
        this.tenantId = tenantId;
        this.name = name;
        this.clientName = clientName;
        this.location = location;
        this.status = ProjectStatus.ACTIVE; // criterio HU-02: nace "Activo"
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getName() { return name; }
    public String getClientName() { return clientName; }
    public String getLocation() { return location; }
    public ProjectStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}