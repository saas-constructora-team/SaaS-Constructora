# AGENTS.md — Reglas de Contexto e Instrucciones para Agentes de IA y Desarrolladores

> **Proyecto:** SaaS de Gestión y Trazabilidad de Proyectos Arquitectónicos  
> **Modelo de Arquitectura:** Monolito Modular (Backend) + Feature-Driven Architecture (Frontend)  
> **Estructura de Repositorios:** Dos repositorios independientes (`saas-backend` y `saas-frontend`)

---

## 1. Propósito y Contexto del Proyecto

Este proyecto es una plataforma SaaS B2B multitenant orientada a la industria de la construcción y arquitectura. Su objetivo principal es resolver la dispersión de información (hojas de cálculo desconectadas, bitácoras en papel y chats informales), centralizando la gestión de obras, el seguimiento de etapas, la bitácora de campo con fotos, el versionado de planos técnicos y la trazabilidad/auditoría.

**Cualquier código generado por desarrolladores o asistentes de IA debe cumplir estrictamente con los límites arquitectónicos y las reglas definidas en este documento.**

---

## 2. Repositorio Backend (`saas-backend`)

### 2.1. Patrón Arquitectónico: Monolito Modular
* El backend se despliega como una única unidad ejecutable, pero el código está estrictamente dividido en **módulos de dominio independientes**.
* Queda **estrictamente prohibido** el acoplamiento cruzado directo entre bases de datos de distintos módulos.

### 2.2. Estructura de Directorios del Backend
```text
saas-backend/
├── src/
│   ├── modules/                  # Módulos del Monolito Modular
│   │   ├── identity/             # Autenticación, Usuarios, Tenants y Roles (HU-01)
│   │   ├── projects/             # Proyectos, Etapas, Tareas y Tablero Kanban (HU-02, HU-03, HU-09)
│   │   ├── site-log/             # Bitácora de Campo y Novedades (HU-05)
│   │   ├── documents/            # Versionado de Planos y Visor 3D/Renders (HU-04, HU-10)
│   │   └── audit/                # Trazabilidad y Logs de Auditoría (HU-07)
│   │
│   ├── shared/                   # Elementos transversales reutilizables
│   │   ├── database/             # Conexión central, ORM y migraciones
│   │   ├── guards/               # Guards/Middlewares de JWT y TenantIsolation
│   │   ├── interceptors/         # Transformación de respuestas HTTP
│   │   └── errors/               # Excepciones e interfaces de error universales
│   │
│   └── main.ts                   # Punto de entrada de la aplicación API
```

### 2.3. Estructura Interna de un Módulo (Clean Architecture)
Cada módulo en `src/modules/{module-name}/` debe mantener la siguiente separación interna:
```text
src/modules/site-log/
├── interface/                    # Controladores HTTP y DTOs (Validación Estructural)
│   ├── site-log.controller.ts
│   └── dto/
│       ├── create-site-log.dto.ts
│       └── site-log-response.dto.ts
├── application/                  # Casos de Uso y Servicios de Aplicación (Validación Contextual)
│   ├── create-site-log.use-case.ts
│   └── ports/                    # Interfaces de repositorios y servicios externos
├── domain/                       # Entidades y Reglas de Negocio (Validación de Dominio)
│   ├── site-log.entity.ts
│   └── value-objects/
└── infrastructure/               # Implementación de Repositorios y Persistencia
    ├── site-log.repository.ts
    └── site-log.orm-entity.ts
```

### 2.4. Reglas Innegociables del Backend
1. **Propiedad de Datos (Data Ownership):** Un módulo **NUNCA** ejecuta `SQL JOIN` ni consultas directas sobre las tablas de otro módulo. Si el módulo `site-log` necesita validar un usuario, debe invocar la interfaz/contrato expuesto por `identity`.
2. **Validación en 3 Niveles:**
   * **Estructural (Capa Interface/DTO):** Formato de datos, campos requeridos, UUIDs, ISO dates (vía Pipes/Decoradores).
   * **Contextual (Capa Application):** Verificación de existencia de entidades relacionadas y aislamiento del `tenantId`.
   * **De Negocio (Capa Domain):** Reglas puras del dominio (ej. "no se pueden registrar bitácoras en etapas cerradas").
3. **Manejo Semántico de Códigos HTTP:**
   * `200 OK` / `201 Created` para respuestas exitosas.
   * `400 Bad Request` para fallos de validación estructural.
   * `401 Unauthorized` / `403 Forbidden` para autenticación y aislamiento multitenant.
   * `404 Not Found` para recursos inexistentes.
   * `409 Conflict` para violaciones de reglas de negocio.

---

## 3. Repositorio Frontend (`saas-frontend`)

### 3.1. Patrón Arquitectónico: Feature-Driven Architecture
* Organizado por capacidades/módulos del negocio (*features*) para mantener alta cohesión y coincidir visualmente con los módulos del backend.

### 3.2. Estructura de Directorios del Frontend
```text
saas-frontend/
├── src/
│   ├── app/                      # Rutas y vistas de la aplicación (Next.js App Router / React Router)
│   │   ├── (auth)/login/
│   │   └── dashboard/
│   │       ├── projects/
│   │       ├── site-logs/
│   │       └── documents/
│   │
│   ├── features/                 # Módulos funcionales del dominio
│   │   ├── identity/             # Formularios de login, hooks de sesión y auth state
│   │   ├── projects/             # Componentes de proyectos, etapas y Tablero Kanban
│   │   ├── site-log/             # Formulario de bitácora, captura de fotos y feeds
│   │   └── documents/            # Lista de planos, modal de versiones y visor de renders
│   │
│   ├── shared/                   # UI Library genérica
│   │   ├── components/           # Botones, Modales, Tablas, Inputs, Badges
│   │   ├── api/                  # Cliente HTTP Axios/Fetch configurado con interceptores JWT
│   │   └── utils/                # Formateadores de fecha, moneda y validadores
│   │
│   └── types/                    # Tipos globales e interfaces compartidas
```

### 3.3. Reglas Innegociables del Frontend
1. **Tipado Estricto derivado del Contrato:** Los tipos de datos de las peticiones y respuestas en el frontend (`DTOs/Interfaces`) deben ser idénticos a los definidos en el contrato de la API.
2. **Componentes UI Desacoplados:** Los componentes de `shared/components` deben ser puros e independientes del estado global o de llamadas directas a la API.
3. **Manejo Elegante de Errores HTTP:** Capturar las respuestas `400`, `403`, `404` y `409` del backend para mostrar retroalimentación clara al usuario mediante notificaciones o alertas en interfaz.

---

## 4. Metodología de Desarrollo: Contract-First & Vertical Slices

### 4.1. Estrategia Contract-First
Antes de escribir cualquier línea de código funcional en el backend o frontend para una Historia de Usuario:
1. Se debe definir y consensuar el **Contrato de Operación**:
   * Endpoint HTTP (`METHOD /path`).
   * Actor y permisos requeridos.
   * Precondiciones.
   * DTO de entrada (Inputs).
   * Invariantes y reglas de validación.
   * Estructura de respuesta exitosa (Output) y códigos de error HTTP.
2. Con el contrato definido, el desarrollo del Frontend y Backend puede avanzar en paralelo utilizando datos de prueba (*mocks*).

### 4.2. Desarrollo por Vertical Slice
* **No implementar capas completas a la vez** (ej. "hacer todos los modelos de DB del sistema primero").
* Cada tarea o Pull Request debe entregar una **rebanada vertical completa** para una Historia de Usuario específica (ej. `HU-05: Bitácora de Campo`):
  1. Tabla y migración en base de datos.
  2. Entidad, Caso de Uso y Controlador en `saas-backend`.
  3. Prueba de integración del Endpoint.
  4. Formulario y vista correspondiente en `saas-frontend`.

---

## 5. Instrucciones Directas para Agentes de IA (Coding Assistants)

Al solicitar la generación o refactorización de código a un agente de IA, este debe cumplir las siguientes pautas:

1. **Contexto Obligatorio:** Antes de proponer cambios, el agente debe verificar en cuál módulo (`backend`) o *feature* (`frontend`) se encuentra la tarea.
2. **Sin Generación de Deuda Técnica:** No crear archivos genéricos de "utilidades" (`utils.js` o `helpers.ts` masivos). Ubicar la lógica en el módulo correspondiente.
3. **Protección de Multi-tenancy:** Toda consulta o filtro en base de datos **DEBE** incluir explícitamente el `tenantId` correspondiente al contexto del usuario autenticado.
4. **Commits y PRs Pequeños:** Generar código modular, mantenible y acompañado de sus tipos e interfaces correspondientes.
