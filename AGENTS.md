# AGENTS.md

Contexto permanente del proyecto para agentes de código. Léelo completo antes de escribir código, y mantenlo actualizado cuando cambie el estado del proyecto.

## 1. Qué es este proyecto

SaaS multi-tenant de gestión de proyectos para **constructoras y equipos de arquitectura**, algo parecido a Jira pero adaptado a obra. Proyecto académico de la asignatura *Software como Servicio* (Universidad del Valle, Sede Tuluá).

**Problema que resuelve:** hoy la información de cada proyecto (planos, etapas, renders, avances, novedades) está dispersa en Excel, papel, WhatsApp y computadores locales. No hay trazabilidad ni forma de comparar etapas o proyectos.

**Solución:** una plataforma donde el equipo centraliza proyectos, etapas, tareas, documentos con versiones y una bitácora digital de obra, con trazabilidad de quién hizo qué.

**Usuarios:** Director de Proyectos, Arquitectos (el principal crea proyectos), Ingenieros y Contratistas, Trabajadores de obra y Administradores. **Cliente que compra:** la constructora (el *tenant*).

**Flujo crítico:** el arquitecto registra el proyecto → define etapas y asigna roles → carga documentación → el personal en campo llena la bitácora → el director monitorea el avance.

## 2. Stack

- **Backend:** Java 25, Spring Boot 4.1.1, Maven, Spring Data JPA (Hibernate 7), PostgreSQL 16, Flyway, Spring Security con JWT (Nimbus), Lombok, Spring Modulith.
- **Frontend:** Angular 18+ con standalone components, TypeScript.
- **Proyecto:** group `com.SaaS`, artifact `Constructora`, paquete base `com.SaaS.Constructora`, empaquetado Jar, configuración en `application.properties`.
- **Infraestructura local:** Docker Compose (solo PostgreSQL).

**Ojo con Spring Boot 4** (cambió respecto a Boot 3):
- Se usa `spring-boot-starter-webmvc`, no `spring-boot-starter-web`.
- Flyway requiere `spring-boot-starter-flyway`.
- Los starters de prueba son por tecnología (`spring-boot-starter-webmvc-test`, etc.).
- Si algo de tu memoria sobre Boot 3 choca con esto, manda lo de este documento y el `pom.xml`.

## 3. Arquitectura: monolito modular

Una sola aplicación Spring Boot. Cada módulo es un paquete directo bajo `com.SaaS.Constructora`.

| Módulo | Contiene | Historias |
|---|---|---|
| `identity` | Tenant (organización), usuarios, roles, membresía usuario↔proyecto, login, recuperación de contraseña | HU-01, HU-13, parte de HU-03 |
| `projects` | Proyectos, etapas, tareas, hitos, presupuesto, prioridad, requisitos del cliente, cálculo de avance | HU-02, 03, 06, 09, 10, 11, 14, 15 |
| `logbook` | Bitácora de obra, novedades y notificaciones | HU-05, HU-12 |
| `documents` | Planos, renders, versionado, almacenamiento externo | HU-04 |
| `audit` | Historial de quién cambió qué | HU-07 |

El dashboard (HU-08) no es un módulo: son consultas de lectura sobre `projects` y `logbook`.

**Dependencias permitidas:**

```
identity  ←  projects  ←  logbook
                       ←  documents

audit escucha eventos (ApplicationEventPublisher); ningún módulo depende de audit
```

### Las tres reglas de modularidad (obligatorias)

1. **Un paquete por módulo, con todo su contenido adentro.** Controladores, servicios, repositorios, entidades y DTOs viven bajo `com.SaaS.Constructora.<modulo>`. Prohibidos los paquetes globales tipo `controllers/` o `entities/`.
2. **Otros módulos solo llaman al servicio público del módulo, nunca a su repositorio ni a sus entidades.** Los repositorios se declaran sin `public` (visibilidad de paquete) para que el compilador lo haga cumplir.
3. **Las referencias entre módulos son por ID, no por `@ManyToOne`.** Ejemplo: `LogbookEntry` guarda `projectId` y `userId` como `UUID`. Las relaciones JPA solo se permiten dentro de un mismo módulo (`Stage` → `Project`).

Además: no se permiten dependencias circulares. Si dos módulos se necesitan mutuamente, probablemente deban ser uno solo. Debe existir un test con Spring Modulith que ejecute `ApplicationModules.of(ConstructoraApplication.class).verify()` para detectar violaciones; si no existe, créalo.

## 4. Convenciones de código

- **Multi-tenant por columna:** una sola base de datos, `tenant_id` (`UUID`) en toda tabla de negocio.
- **Todo query de datos de negocio filtra por `tenantId`.** Nunca usar `findAll()` en un servicio.
- **IDs `UUID`** generados por la aplicación.
- **Flyway gestiona el esquema**, con `spring.jpa.hibernate.ddl-auto=validate`. Nunca `update` ni `create`. Cada cambio de esquema es una migración nueva `V<n>__descripcion.sql`; no se editan migraciones ya aplicadas.
- **Entidades JPA:** constructor sin argumentos `protected` y `@PrePersist` para `createdAt`. **Nunca `@Data` ni `@EqualsAndHashCode` en entidades.** Se permite `@Getter`.
- **DTOs como `record`.** Validación con Bean Validation (`@NotBlank`, `@Size`, ...) en los DTOs de entrada.
- **Errores:** respuestas HTTP correctas (`400` validación, `403` sin permiso, `404` no encontrado). Nunca revelar detalles de seguridad en errores de login.
- **Comentarios y mensajes de usuario en español.** Nombres de clases, métodos y variables en inglés.
- **Frontend:** un feature por carpeta bajo `src/app/`, standalone components, `HttpClient` con interceptor para el tenant/token.

## 5. Comandos

```bash
# Base de datos
docker compose up -d

# Backend (desde /backend)
./mvnw spring-boot:run
./mvnw test

# Frontend (desde /frontend)
npm install
ng serve --proxy-config proxy.conf.json    # http://localhost:4200
```

Backend en `http://localhost:8080`. Base de datos: `saas_constructora`, usuario `saas`, contraseña `saas` (solo desarrollo local).

## 6. Estado actual

- [ ] **Walking skeleton** (HU-02: crear y listar proyectos, con `tenant_id` como columna `UUID` y el tenant enviado por el header `X-Tenant-Id`). Ver `docs/walking-skeleton.md`. **Es lo primero que hay que construir.**
- [ ] `identity`: login real, tabla `tenants`, roles (HU-01, HU-03, HU-13)
- [ ] `logbook`: bitácora y notificaciones (HU-05, HU-12)
- [ ] `documents` (HU-04)
- [ ] `audit` (HU-07)

Orden de construcción: skeleton → `identity` → `logbook` → `documents` → `audit`. Actualiza esta lista al terminar cada bloque.

## 7. Alcance del MVP (resumen del MoSCoW)

- **Must:** autenticación; crear proyectos; crear etapas y vincular tareas; registrar usuarios y vincularlos a un proyecto; cambiar estado y progreso de tareas y etapas.
- **Should:** tablero kanban; importar archivos y documentación; permisos por rol o usuario; dashboard directivo (HU-08).
- **Could:** app móvil/tablet; visualización de renders 3D; mensajes a clientes por WhatsApp.
- **Won't (por ahora):** IA para redactar documentos; registro contable por proyecto; que los clientes vean el avance.

**Contrato de operación de HU-05 (bitácora), ya definido:** actor trabajador de obra; precondiciones: proyecto existente, trabajador vinculado al proyecto y al tenant, actividad activa; input: `proyectoId`, `etapaId`, `usuarioId`, `tipoEvento`, `descripcion`, `ubicacion`, `fechaOcurrencia`, `evidencia`; reglas: fecha actual o pasada, descripción de 1 a 3 frases, la etapa debe pertenecer al proyecto, el trabajador debe estar vinculado al proyecto, tipo de evento obligatorio, máximo 3 fotos de evidencia. El campo "Resultado" del contrato está incompleto en la hipótesis.

## 8. Decisiones pendientes (NO decidir por tu cuenta)

Estos puntos requieren reunión con el equipo. **Si tu tarea depende de alguno, no improvises: usa la suposición de trabajo indicada, márcala en el código con `// TODO(pendiente): <tema>` y avisa en tu respuesta.**

1. **¿Dónde se guardan los archivos del módulo `documents`?** (planos, renders, presupuestos, fotos de evidencia). La hipótesis solo dice "sistema de almacenamiento externo". Opciones a evaluar: almacenamiento compatible con S3 (AWS S3, MinIO), otro servicio en la nube, o disco local solo para desarrollo.
   *Suposición de trabajo:* definir una interfaz `FileStorage` dentro de `documents` y una implementación local en disco para desarrollo. No añadir el SDK de S3 al `pom.xml` hasta que se decida.

2. **¿Qué parte del dashboard entra en el MVP?** El MoSCoW pone "gráficos y métricas de avance" en *Won't*, pero HU-08 (porcentaje global de avance y alertas) es *Should*. Hay contradicción.
   *Suposición de trabajo:* no construir el dashboard todavía. Sí calcular el porcentaje de avance en `projects` (lo exige HU-06).

3. **HU-12 (notificaciones): formalizar en el MoSCoW.** El equipo (vía el estudiante que lo coordina) decidió que **entra en el MVP**, pero el documento de hipótesis aún lista "enviar notificaciones al personal" en *Won't*. Falta corregir el MoSCoW.
   *Suposición de trabajo:* HU-12 está dentro del MVP, en el módulo `logbook`.

4. **Ajustes de diseño hechos respecto a la hipótesis, aún sin validar con todo el equipo:**
   - Fusión de "Autenticación" y "Administración de roles y acceso" en un solo módulo `identity`.
   - Nombres de módulos en inglés (`identity`, `projects`, `logbook`, `documents`, `audit`), traducidos de los de la hipótesis.
   - Alcance ampliado de `projects` (presupuesto, hitos, prioridad, requisitos del cliente).
   - Paquete base con mayúsculas (`com.SaaS.Constructora`), que rompe la convención de Java (minúsculas).
   *Suposición de trabajo:* se mantienen como están.

## 9. Documentos del repo

- `docs/hipotesis.md`: documento original del equipo (hipótesis de valor, flujos, MoSCoW, backlog de HU-01 a HU-15, arquitectura C4). Consúltalo para el detalle de una historia concreta; no hace falta leerlo completo en cada sesión.
- `docs/walking-skeleton.md`: guía paso a paso del primer esqueleto funcional, con código de referencia.
- `backend/pom.xml`: dependencias del MVP completo.
