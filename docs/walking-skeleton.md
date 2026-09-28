# Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras

> Documento pensado para que un agente (o un desarrollador) monte el proyecto localmente de principio a fin.
> **Objetivo:** demostrar que el camino completo funciona, no construir el producto.
> **Arquitectura:** monolito modular (Spring Boot). En el skeleton solo se implementa el módulo `projects`; los demás módulos se crean cuando les toque.

## 1. Alcance del skeleton

**Historia elegida:** HU-02, Registro de nuevo proyecto arquitectónico.

**Camino de extremo a extremo:**

```
Browser → Angular → POST /api/projects → ProjectController → ProjectService → ProjectRepository (JPA/Hibernate) → PostgreSQL
                                                                                                                    ↓
                                  Angular (lista actualizada) ← 201 Created / 200 OK ← respuesta JSON ←─────────────┘
```

**Criterio de éxito (definición de "terminado"):**

1. `docker compose up -d` levanta PostgreSQL.
2. El backend Spring Boot arranca y Flyway crea la tabla `projects`.
3. El frontend Angular muestra un formulario (nombre, cliente, ubicación) y una lista de proyectos.
4. Al enviar el formulario, el proyecto se guarda en PostgreSQL con estado `ACTIVE` y aparece en la lista.
5. Si falta el nombre, el backend responde `400` y el frontend resalta el campo.
6. Una consulta con un `X-Tenant-Id` distinto NO devuelve los proyectos del primer tenant (aislamiento multi-tenant).

### Fuera de alcance (NO implementar todavía)

- Login real / JWT / Spring Security (HU-01, HU-13). El tenant llega por header fijo.
- Tabla `tenants` y usuarios. En el skeleton `tenant_id` es solo una columna `UUID`.
- Roles, permisos y membresías (HU-03).
- Etapas, tareas, kanban, hitos, presupuestos (HU-03, 06, 09, 10, 14, 15).
- Documentos y almacenamiento externo (HU-04).
- Bitácora y notificaciones (HU-05, HU-12), auditoría (HU-07), dashboard (HU-08).
- Manejo de errores personalizado, CORS, tests de integración. Se usan los valores por defecto de Spring.
- Estilos elaborados. La UI puede ser fea.

## 2. Stack y versiones

| Capa | Tecnología |
|---|---|
| Backend | Java 25, Spring Boot 4.1.1, Maven |
| Proyecto | Group `com.SaaS`, Artifact `Constructora`, paquete base `com.SaaS.Constructora`, empaquetado **Jar**, configuración en **`application.properties`** |
| Starters Spring (Boot 4) | `spring-boot-starter-webmvc`, `spring-boot-starter-validation`, `spring-boot-starter-data-jpa`, `spring-boot-starter-flyway` + `flyway-database-postgresql`, driver `org.postgresql:postgresql` (runtime) |
| ORM | Hibernate 7 (vía Spring Data JPA) |
| Base de datos | PostgreSQL 16 (Docker) |
| Frontend | Angular 18+ (standalone components, sin NgModules), TypeScript, HttpClient, Reactive Forms |
| Orquestación local | Docker Compose (solo PostgreSQL) |

> **Notas sobre Spring Boot 4.x (importante para el agente):**
> - `spring-boot-starter-web` se llama ahora `spring-boot-starter-webmvc`. Los nombres antiguos están deprecados.
> - Flyway necesita `spring-boot-starter-flyway`; con `flyway-core` solo ya no se autoconfigura.
> - Los starters de prueba también son por tecnología (`spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, ...).
> - Java 25 está soportado de forma nativa por Spring Boot 4.1. Usar un JDK 25 (por ejemplo Temurin 25) tanto en el IDE como en `JAVA_HOME`.
> - El `pom.xml` completo del MVP se entrega aparte. Para el skeleton basta con un subconjunto: los starters de la tabla anterior.

**Decisiones de diseño:**

- **Monolito modular:** una sola app Spring Boot, un paquete por módulo (ver sección 3).
- **Multi-tenant por columna:** una sola base de datos, `tenant_id` en cada tabla de negocio.
- **Getters explícitos y `record` para DTOs** en los ejemplos de este documento. Lombok está incluido en el `pom.xml` del MVP y puede usarse (`@Getter`, `@NoArgsConstructor(access = PROTECTED)`), pero **nunca `@Data` en entidades JPA**.
- **IDs `UUID`** generados por la aplicación.
- **Esquema gestionado por Flyway**, con `spring.jpa.hibernate.ddl-auto=validate`. Nunca `update`.

## 3. Módulos del monolito modular

### 3.1 Módulos definidos

| Módulo | Contiene | Historias | Estado |
|---|---|---|---|
| **identity** | Tenant (organización), usuarios, roles, membresía usuario↔proyecto, login, recuperación de contraseña | HU-01, HU-13, parte de roles de HU-03 | Después del skeleton |
| **projects** | Proyectos, etapas, tareas, hitos, presupuesto, prioridad, requisitos del cliente, cálculo de avance | HU-02, 03, 06, 09, 10, 11, 14, 15 | **Skeleton: solo HU-02** |
| **logbook** | Bitácora de obra, novedades y notificaciones | HU-05, HU-12 | Después de identity |
| **documents** | Planos, renders, versionado, almacenamiento externo | HU-04 | Después |
| **audit** | Historial de quién cambió qué | HU-07 | Después |

El dashboard (HU-08) no es un módulo: son consultas de lectura sobre `projects` y `logbook`.

### 3.2 Tres reglas para que sea realmente modular

Estas reglas son las que distinguen un monolito modular de un monolito con carpetas. Deben respetarse desde el primer día.

1. **Un paquete por módulo, con todo su contenido adentro.** Controladores, servicios, repositorios, entidades y DTOs de un módulo viven bajo su paquete (`com.SaaS.Constructora.<modulo>`). Nada de paquetes globales tipo `controllers/` o `entities/` que mezclen módulos.
2. **Los otros módulos solo llaman a su servicio, nunca a su repositorio ni a sus entidades.** El servicio público del módulo es su única puerta de entrada. Para que el compilador lo haga cumplir, los repositorios se declaran sin `public` (visibilidad de paquete). Ejemplo: `logbook` puede llamar a `ProjectService`, pero no a `ProjectRepository`.
3. **Las referencias entre módulos se hacen por ID, no por `@ManyToOne`.** Por ejemplo, `LogbookEntry` guarda `projectId` y `userId` como `UUID`, no como objetos `Project` o `User`. Así cada módulo es dueño de sus tablas, y si algún día se separa un módulo no hay relaciones JPA que deshacer. Las únicas relaciones JPA permitidas son las internas de un mismo módulo (por ejemplo, `Stage` → `Project`, ambos en `projects`).

### 3.3 Dependencias entre módulos

```
identity  ←  projects  ←  logbook
                       ←  documents

audit escucha eventos (ApplicationEventPublisher); ningún módulo depende de audit
```

- Una flecha `A ← B` significa que B usa el servicio de A.
- No se permiten dependencias circulares. Si dos módulos se necesitan mutuamente, es señal de que deberían ser uno solo (por eso `identity` fusiona autenticación y roles).
- Para que `audit` no acople a los demás, los módulos publican eventos y `audit` los escucha.

### 3.4 Orden de construcción

1. **Skeleton:** solo `projects` (HU-02).
2. **identity:** login y tenant real (HU-01). Aquí se crea la tabla `tenants` y `tenant_id` pasa a ser una referencia real.
3. **logbook:** bitácora (HU-05, que ya tiene contrato de operación) y notificaciones (HU-12).
4. **documents** y **audit**.

## 4. Estructura del repositorio (monorepo)

Solo se crea lo necesario para el skeleton:

```
saas-constructora/
├── README.md
├── WALKING_SKELETON.md              ← este archivo
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd / .mvn/
│   └── src/main/
│       ├── java/com/SaaS/Constructora/
│       │   ├── ConstructoraApplication.java
│       │   └── projects/                       ← ÚNICO módulo del skeleton
│       │       ├── Project.java                (entidad)
│       │       ├── ProjectStatus.java          (enum)
│       │       ├── ProjectRepository.java      (sin "public": visibilidad de paquete)
│       │       ├── ProjectService.java         (public: puerta de entrada del módulo)
│       │       ├── ProjectController.java
│       │       ├── CreateProjectRequest.java   (record)
│       │       └── ProjectResponse.java        (record)
│       └── resources/
│           ├── application.properties
│           └── db/migration/
│               └── V1__create_projects.sql
└── frontend/
    ├── package.json
    ├── angular.json
    ├── proxy.conf.json
    └── src/app/
        ├── app.component.ts                    (formulario + lista en un solo componente)
        ├── app.config.ts
        └── projects/
            ├── project.model.ts
            ├── project.service.ts
            └── tenant.interceptor.ts
```

**No crear** carpetas ni paquetes vacíos para `identity`, `logbook`, `documents` o `audit`. Se crean cuando se construya cada módulo.

**Cuando el módulo `projects` crezca** (más de ~8 clases), se subdivide internamente en `domain/`, `service/`, `web/` y `repository/`, sin cambiar las tres reglas de la sección 3.2.

## 5. Infraestructura local

### 5.1 `docker-compose.yml` (raíz)

```yaml
services:
  postgres:
    image: postgres:16
    container_name: saas-postgres
    environment:
      POSTGRES_DB: saas_constructora
      POSTGRES_USER: saas
      POSTGRES_PASSWORD: saas
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 5.2 `backend/src/main/resources/application.properties`

```properties
spring.application.name=Constructora

# Base de datos
spring.datasource.url=jdbc:postgresql://localhost:5432/saas_constructora
spring.datasource.username=saas
spring.datasource.password=saas

# JPA / Hibernate (el esquema lo gestiona Flyway)
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false

# Flyway
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration

# Servidor
server.port=8080
```

## 6. Modelo de datos del skeleton

Una sola tabla. `tenant_id` es una columna `UUID` sin llave foránea, porque la tabla `tenants` pertenece al módulo `identity` y aún no existe.

```
┌──────────────────────────┐
│         projects         │
├──────────────────────────┤
│ id (UUID, PK)            │
│ tenant_id (UUID, NOT NULL)│
│ name (varchar, NOT NULL) │
│ client_name              │
│ location                 │
│ status                   │
│ created_at               │
└──────────────────────────┘
```

### 6.1 Migración: `V1__create_projects.sql`

```sql
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
```

### 6.2 Enum `ProjectStatus`

```java
package com.SaaS.Constructora.projects;

public enum ProjectStatus {
    ACTIVE
}
```

> Se agregan más estados (`ON_HOLD`, `COMPLETED`, `CANCELLED`) cuando se implemente HU-06.

### 6.3 Entidad `Project`

```java
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
```

## 7. Backend: capas y contrato de la API

### 7.1 Repositorio (visibilidad de paquete, regla 2)

```java
package com.SaaS.Constructora.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
```

> **Regla de aislamiento:** toda consulta de proyectos DEBE filtrar por `tenantId`. Nunca usar `findAll()` en el servicio.

### 7.2 DTOs (records)

```java
// CreateProjectRequest.java
public record CreateProjectRequest(
    @NotBlank(message = "El nombre del proyecto es obligatorio")
    @Size(max = 200) String name,
    @Size(max = 200) String clientName,
    @Size(max = 300) String location
) { }

// ProjectResponse.java
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
```

### 7.3 Servicio (puerta de entrada pública del módulo)

`ProjectService` es una clase `public` anotada con `@Service`, con dos métodos `@Transactional`:

- `ProjectResponse create(UUID tenantId, CreateProjectRequest req)`: crea `new Project(tenantId, ...)`, lo guarda y devuelve el DTO.
- `List<ProjectResponse> list(UUID tenantId)`: usa `findByTenantIdOrderByCreatedAtDesc`.

### 7.4 Controlador

```java
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
```

### 7.5 Errores

Se usan los valores por defecto de Spring: `400 Bad Request` si falla `@Valid` o falta el header `X-Tenant-Id`. No se crea un `GlobalExceptionHandler` todavía.

### 7.6 Contrato de la API

**`POST /api/projects`**

```http
POST /api/projects
X-Tenant-Id: 11111111-1111-1111-1111-111111111111
Content-Type: application/json

{ "name": "Edificio Torres del Valle", "clientName": "Inmobiliaria XYZ", "location": "Tuluá, Valle del Cauca" }
```

Respuesta `201 Created`:

```json
{
  "id": "b7c1f0e2-...",
  "name": "Edificio Torres del Valle",
  "clientName": "Inmobiliaria XYZ",
  "location": "Tuluá, Valle del Cauca",
  "status": "ACTIVE",
  "createdAt": "2026-09-28T10:15:00"
}
```

**`GET /api/projects`**: devuelve `200 OK` con un arreglo de `ProjectResponse`, solo del tenant indicado en el header, ordenado por fecha descendente.

## 8. Frontend Angular

Angular con **standalone components**:

```bash
npm install -g @angular/cli
ng new frontend --routing=false --style=css --ssr=false
```

### 8.1 Proxy (evita CORS en desarrollo)

**`proxy.conf.json`:**

```json
{
  "/api": { "target": "http://localhost:8080", "secure": false }
}
```

Levantar con `ng serve --proxy-config proxy.conf.json`.

### 8.2 Archivos

| Archivo | Responsabilidad |
|---|---|
| `projects/tenant.interceptor.ts` | `HttpInterceptorFn` que agrega el header `X-Tenant-Id` a toda petición a `/api`. El tenant va como constante en el archivo: `11111111-1111-1111-1111-111111111111`. Registrarlo en `app.config.ts` con `provideHttpClient(withInterceptors([...]))`. |
| `projects/project.model.ts` | Interfaces `Project` y `CreateProjectRequest`. |
| `projects/project.service.ts` | `list()` y `create(req)` con `HttpClient`, apuntando a `/api/projects`. |
| `app.component.ts` | Un único componente con Reactive Form (`name` requerido, `clientName`, `location`) y la lista de proyectos debajo. |

### 8.3 Comportamiento esperado de la UI

1. Al cargar, `GET /api/projects` y se pinta la lista.
2. Al enviar el formulario válido, `POST /api/projects`, se limpia el formulario y se recarga la lista.
3. Con el nombre vacío, el campo se resalta y no se hace la petición.

## 9. Reglas de negocio mínimas (del backlog)

| Regla | Origen | Dónde se aplica |
|---|---|---|
| El proyecto nace en estado `ACTIVE` | HU-02 | Constructor de `Project` |
| El nombre es obligatorio; sin él no se guarda | HU-02 | `@NotBlank` + `400` |
| Un tenant solo ve sus proyectos | HU-01 (criterio del tenant) | `findByTenantId...` en el repositorio |

## 10. Instrucciones de montaje para el agente

Ejecutar en orden y verificar cada paso antes de continuar:

1. **Crear el repo** `saas-constructora/` con las carpetas `backend/` y `frontend/`.
2. **Infraestructura:** crear `docker-compose.yml` y ejecutar `docker compose up -d`. Verificar con `docker ps` que `saas-postgres` está corriendo.
3. **Backend:** generar el proyecto Spring Boot con estos datos: Maven, Java **25**, Spring Boot **4.1.1**, Group `com.SaaS`, Artifact `Constructora`, paquete base `com.SaaS.Constructora`, Packaging **Jar**, Configuration **Properties**, y los starters de la sección 2. Crear únicamente el paquete `projects` (sección 4), sin paquetes vacíos.
4. Crear `application.properties` (5.2) y la migración `V1__create_projects.sql` (6.1).
5. Crear enum, entidad, repositorio, DTOs, servicio y controlador (secciones 6 y 7), respetando las tres reglas de la sección 3.2.
6. **Arrancar el backend** (`./mvnw spring-boot:run`). Confirmar en los logs que Flyway aplicó `V1` y que Hibernate valida sin errores.
7. **Probar la API** con `curl` o Postman:
   - `POST` válido con tenant `1111...` → `201`.
   - `POST` sin `name` → `400`.
   - `GET` con tenant `1111...` → lista con el proyecto creado.
   - `GET` con tenant `2222...` → lista vacía (aislamiento).
   - `GET` sin header → `400`.
8. **Frontend:** crear la app Angular (sección 8), con interceptor, modelo, servicio y el componente único.
9. **Prueba de extremo a extremo** en `http://localhost:4200`: crear un proyecto desde el formulario y verlo aparecer en la lista. Confirmar en la BD:
   ```bash
   docker exec -it saas-postgres psql -U saas -d saas_constructora -c "SELECT id, name, status FROM projects;"
   ```
10. Crear un `README.md` con los comandos para levantar todo (Postgres, backend, frontend).

## 11. Referencia futura: entidades del MVP por módulo (NO implementar ahora)

Sirve para no tomar decisiones en el skeleton que luego estorben. Todas las tablas de negocio llevarán `tenant_id`.

| Módulo | Entidades | Historias | Notas |
|---|---|---|---|
| identity | `Tenant`, `User`, `Role`, `ProjectMember` | HU-01, 03, 13 | Email único por tenant; password con hash. `ProjectMember` relaciona usuario, `projectId` (UUID) y rol |
| projects | `Project`, `Stage`, `Task`, `Milestone`, `Budget` | HU-02, 03, 06, 09, 10, 11, 14, 15 | Relaciones JPA solo internas (`Stage` → `Project`). Asignación de tarea a usuario por `userId` (UUID) |
| logbook | `LogbookEntry`, `Notification`, `NotificationPreference` | HU-05, HU-12 | `LogbookEntry`: `tipoEvento`, `descripcion`, `ubicacion`, `fechaOcurrencia`, evidencia (máx. 3). `NotificationPreference`: qué tipos de novedad notificar (configurable por administradores) |
| documents | `Document`, `DocumentVersion` | HU-04 | Puntero a la versión vigente + historial; archivo en almacenamiento externo |
| audit | `AuditLog` | HU-07 | Usuario, acción, entidad afectada, fecha/hora. Se alimenta por eventos |

## 12. Anexo: cambios respecto al documento de Hipótesis

Ajustes de diseño hechos al pasar de la hipótesis a la arquitectura del monolito modular.

| # | Hipótesis original | Cambio | Razón |
|---|---|---|---|
| 1 | Módulos separados: **Autenticación** y **Administración de roles y acceso** | Se **fusionan en `identity`**, junto con Tenant, usuarios y membresías | Están acoplados: asignar un rol requiere el usuario y hacer login requiere sus roles. Separarlos generaría dependencias circulares |
| 2 | El **Tenant** no tenía módulo dueño | El Tenant (organización) vive en `identity` | Es la organización a la que pertenecen los usuarios |
| 3 | **HU-12 (Notificaciones)** está en el backlog, pero "Enviar notificaciones al personal" aparece en **Won't** del MoSCoW, y el módulo de Bitácora las menciona | **HU-12 entra en el MVP**, dentro del módulo `logbook`. Debe moverse de *Won't* a *Must/Should* en el MoSCoW | Elimina la contradicción entre el backlog, el MoSCoW y la descripción de módulos |
| 4 | **Módulo de Proyectos y Etapas** cubría proyectos, etapas y tareas | Se mantiene como `projects` pero con alcance ampliado: presupuesto (HU-09), asignación de tareas (HU-10), requisitos del cliente (HU-11), priorización (HU-14) e hitos (HU-15) | Esas historias no tenían módulo asignado y giran alrededor de proyectos, etapas y tareas |
| 5 | **Dashboard directivo** (HU-08) | No es un módulo propio; son consultas de lectura sobre `projects` y `logbook` | No tiene datos propios y es *Should Have* |
| 6 | Sin reglas de modularidad explícitas | Se añaden las **tres reglas** de la sección 3.2 (paquete por módulo, solo vía servicio, referencias por ID) | Para que la separación en módulos sea real y no solo de carpetas |
| 7 | Skeleton no definido | Skeleton limitado a HU-02 en el módulo `projects`, con `tenant_id` como columna `UUID` (sin tabla `tenants`) | Mínimo necesario para probar el camino completo; la tabla `tenants` llega con `identity` |

### Pendiente por decidir

- **Otra posible contradicción:** el MoSCoW pone "Visualización de gráficos y métricas del avance" en *Won't*, pero HU-08 (dashboard con porcentaje global de avance y alertas) es *Should*. Conviene aclarar qué parte del dashboard entra en el MVP.
