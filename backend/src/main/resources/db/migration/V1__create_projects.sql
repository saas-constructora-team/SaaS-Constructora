CREATE TABLE projects (
    id           UUID PRIMARY KEY,
    tenant_id    UUID NOT NULL,
    name         VARCHAR(200) NOT NULL,
    client_name  VARCHAR(200),
    location     VARCHAR(300),
    status       VARCHAR(30) NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);