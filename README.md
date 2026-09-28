# SaaS Constructora - Walking Skeleton (HU-02)

Monolito modular Spring Boot + Angular para gestión de proyectos de constructoras.

## Stack

- **Backend**: Java 25, Spring Boot 4.1.1, Maven, Spring Data JPA, PostgreSQL 16, Flyway
- **Frontend**: Angular 18+ (standalone components), TypeScript
- **Infraestructura**: Docker Compose (PostgreSQL)

## Requisitos previos

- JDK 25 (ej. Temurin 25 o Corretto 25)
- Node.js 18+ y npm
- Docker y Docker Compose

## Levantar todo

### 1. Base de datos (PostgreSQL)

```bash
docker compose up -d
```

Verificar:
```bash
docker ps  # debe mostrar saas-postgres en puerto 5432
```

### 2. Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run
```

El backend arranca en `http://localhost:8080`.
- Flyway aplica migraciones automáticamente (tabla `projects`, `event_publication`)
- Hibernate valida el esquema (`ddl-auto=validate`)

### 3. Frontend (Angular)

```bash
cd frontend
npm install
npm run start -- --proxy-config proxy.conf.json
```

El frontend abre en `http://localhost:4200` y usa el proxy para llamar a `/api` en el backend.

## Probar la API

```bash
# Crear proyecto (201 Created)
curl -X POST http://localhost:8080/api/projects \
  -H "X-Tenant-Id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"name": "Edificio Torres del Valle", "clientName": "Inmobiliaria XYZ", "location": "Tuluá, Valle del Cauca"}'

# Listar proyectos (200 OK)
curl -X GET http://localhost:8080/api/projects \
  -H "X-Tenant-Id: 11111111-1111-1111-1111-111111111111"

# Validación: sin nombre (400 Bad Request)
curl -X POST http://localhost:8080/api/projects \
  -H "X-Tenant-Id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Cliente", "location": "Bogotá"}'

# Aislamiento multi-tenant: tenant distinto no ve proyectos (lista vacía)
curl -X GET http://localhost:8080/api/projects \
  -H "X-Tenant-Id: 22222222-2222-2222-2222-222222222222"

# Sin header X-Tenant-Id (400 Bad Request)
curl -X GET http://localhost:8080/api/projects
```

## Verificar en base de datos

```bash
docker exec saas-postgres psql -U saas -d saas_constructora -c "SELECT id, name, status FROM projects;"
```

## Estructura del walking skeleton

```
saas-constructora/
├── docker-compose.yml
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/SaaS/Constructora/
│       │   ├── ConstructoraApplication.java
│       │   └── projects/
│       │       ├── Project.java              (entidad)
│       │       ├── ProjectStatus.java        (enum)
│       │       ├── ProjectRepository.java    (package-private)
│       │       ├── ProjectService.java       (público)
│       │       ├── ProjectController.java
│       │       ├── CreateProjectRequest.java (record)
│       │       ├── ProjectResponse.java      (record)
│       │       └── SecurityConfig.java       (permite /api/**)
│       └── resources/
│           ├── application.properties
│           └── db/migration/
│               ├── V1__create_projects.sql
│               └── V2__create_event_publication.sql
└── frontend/
    ├── package.json
    ├── angular.json
    ├── proxy.conf.json
    └── src/app/
        ├── app.config.ts
        ├── app.component.ts
        └── projects/
            ├── project.model.ts
            ├── project.service.ts
            └── tenant.interceptor.ts
```

## Criterios de éxito del skeleton (HU-02)

1. ✅ `docker compose up -d` levanta PostgreSQL
2. ✅ Backend arranca y Flyway crea tabla `projects`
3. ✅ Frontend muestra formulario (nombre, cliente, ubicación) y lista
4. ✅ Enviar formulario guarda proyecto en PostgreSQL con estado `ACTIVE` y aparece en lista
5. ✅ Sin nombre → backend responde `400` y frontend resalta el campo
6. ✅ Distinto `X-Tenant-Id` → lista vacía (aislamiento multi-tenant)

## Próximos pasos (fuera del skeleton)

- Módulo `identity`: login real, tabla `tenants`, roles (HU-01, HU-03, HU-13)
- Módulo `logbook`: bitácora y notificaciones (HU-05, HU-12)
- Módulo `documents`: planos, renders, versionado (HU-04)
- Módulo `audit`: historial de cambios (HU-07)
- Dashboard (HU-08): consultas de lectura sobre `projects` y `logbook`