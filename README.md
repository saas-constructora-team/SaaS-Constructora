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

Los proyectos se vinculan automáticamente a la empresa (tenant) del usuario
autenticado. El tenant viaja dentro del JWT: no se envía `X-Tenant-Id`.

Visibilidad de proyectos:
- `ADMIN` ve todos los proyectos de su empresa.
- `MEMBER` ve únicamente los proyectos que tiene asignados.
- Solo `ADMIN` puede listar usuarios y gestionar asignaciones.
- Por ahora no existe un endpoint para crear usuarios: la asignación trabaja
  con usuarios que ya pertenezcan a la empresa.

```bash
# 1. Login: copiar el accessToken de la respuesta
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "Admin123!"}'

TOKEN="<accessToken>"

# 2. Crear proyecto (201 Created) en nombre de la empresa del token
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Edificio Torres del Valle", "clientName": "Inmobiliaria XYZ", "location": "Tuluá, Valle del Cauca"}'

# Datos opcionales de captación:
# contactEmail, contactPhone, projectType y propertyUse
#   (RESIDENTIAL | COMMERCIAL | INDUSTRIAL | MIXED),
# estimatedArea, occupantCount, requiredSpaces, styleReferences,
# budgetRange (UNDER_50M | FROM_50M_TO_100M | FROM_100M_TO_250M |
#   FROM_250M_TO_500M | OVER_500M),
# estimatedStartDate, estimatedDeliveryDate (YYYY-MM-DD),
# lotOwnership (OWNED | IN_PURCHASE | RENTED) y
# hasDeeds, hasTopographicSurvey, hasPreviousPlans, hasSitePhotos (booleanos).

# 3. Listar proyectos de la empresa (200 OK)
curl -X GET http://localhost:8080/api/projects \
  -H "Authorization: Bearer $TOKEN"

PROJECT_ID="<id de la respuesta anterior>"

# 4. Editar proyecto (200 OK)
curl -X PUT http://localhost:8080/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Edificio Torres del Valle - Fase 2", "clientName": "Inmobiliaria XYZ", "location": "Tuluá, Valle del Cauca"}'

# 5. Eliminar proyecto (204 No Content)
curl -X DELETE http://localhost:8080/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"

# Validación: sin nombre (400 Bad Request)
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Cliente", "location": "Bogotá"}'

# Sin token (401 Unauthorized)
curl -X GET http://localhost:8080/api/projects

# Aislamiento multi-tenant: registrar otra empresa y usar su token
# devuelve una lista vacía (cada empresa solo ve sus propios proyectos).
```

### Usuarios y asignaciones de proyectos

Solo un `ADMIN` puede consultar los usuarios de su empresa y administrar las
asignaciones. El `userId` se obtiene del login (`$.user.id`) o del listado de
usuarios.

```bash
# 6. Crear un proyecto nuevo para las pruebas (si el anterior fue eliminado)
#    y guardar el id de la respuesta en PROJECT_ID
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Proyecto con asignaciones", "clientName": "Inmobiliaria XYZ", "location": "Tuluá, Valle del Cauca"}'

PROJECT_ID="<id del proyecto recién creado>"

# 7. Listar usuarios del tenant (solo ADMIN, 200 OK)
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN"

USER_ID="<id de un usuario de la empresa>"

# 8. Asignar un usuario existente al proyecto (solo ADMIN, 201 Created)
curl -X POST http://localhost:8080/api/projects/$PROJECT_ID/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}"

# 9. Listar los asignados al proyecto (solo ADMIN, 200 OK)
curl -X GET http://localhost:8080/api/projects/$PROJECT_ID/assignments \
  -H "Authorization: Bearer $TOKEN"

# 10. Desasignar un usuario (solo ADMIN, 204 No Content)
curl -X DELETE http://localhost:8080/api/projects/$PROJECT_ID/assignments/$USER_ID \
  -H "Authorization: Bearer $TOKEN"

# Asignar dos veces al mismo usuario devuelve 409 Conflict.
# Un proyecto o usuario de otra empresa devuelve 404 Not Found.
```

Cuando un usuario con rol `MEMBER` inicia sesión, `GET /api/projects` solo
devuelve los proyectos que tiene asignados. Un `ADMIN` sigue viendo todos los
proyectos de la empresa.

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

1. `docker compose up -d` levanta PostgreSQL
2.  Backend arranca y Flyway crea tabla `projects`
3.  Frontend muestra formulario (nombre, cliente, ubicación) y lista
4.  Enviar formulario guarda proyecto en PostgreSQL con estado `ACTIVE` y aparece en lista
5.  Sin nombre → backend responde `400` y frontend resalta el campo
6.  Distinto `X-Tenant-Id` → lista vacía (aislamiento multi-tenant)

## Próximos pasos (fuera del skeleton)

- Módulo `identity`: login real, tabla `tenants`, roles (HU-01, HU-03, HU-13)
- Módulo `logbook`: bitácora y notificaciones (HU-05, HU-12)
- Módulo `documents`: planos, renders, versionado (HU-04)
- Módulo `audit`: historial de cambios (HU-07)
- Dashboard (HU-08): consultas de lectura sobre `projects` y `logbook`
