# Graph Report - SaaS-Constructora  (2026-10-20)

## Corpus Check
- 27 files · ~10,965 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .css 2, .ico 1)

## Summary
- 305 nodes · 401 edges · 20 communities (15 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c8a1310`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.service.ts
- Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras
- frontend
- package.json
- schematics
- AGENTS.md — Reglas de Contexto e Instrucciones para Agentes de IA y Desarrolladores
- AuthComponent
- SaaS Constructora - Walking Skeleton (HU-02)
- dependencies
- devDependencies
- generate-env.mjs
- LoginComponent
- RegisterComponent
- scripts
- angular.json
- Frontend
- PULL_REQUEST_TEMPLATE.md
- auth.config.ts
- ResetPasswordComponent
- AuthComponent

## God Nodes (most connected - your core abstractions)
1. `AuthService` - 14 edges
2. `Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras` - 13 edges
3. `LoginComponent` - 12 edges
4. `@angular/common` - 10 edges
5. `@angular/core` - 10 edges
6. `authErrorMessage()` - 10 edges
7. `RegisterComponent` - 10 edges
8. `schematics` - 9 edges
9. `options` - 9 edges
10. `scripts` - 9 edges

## Surprising Connections (you probably didn't know these)
- `11. Referencia futura: entidades del MVP por módulo (NO implementar ahora)` --references--> `Project`  [INFERRED]
  docs/walking-skeleton.md → frontend/src/app/projects/project.model.ts
- `6.3 Entidad `Project`` --references--> `Project`  [INFERRED]
  docs/walking-skeleton.md → frontend/src/app/projects/project.model.ts
- `9. Reglas de negocio mínimas (del backlog)` --references--> `Project`  [INFERRED]
  docs/walking-skeleton.md → frontend/src/app/projects/project.model.ts
- `7.3 Servicio (puerta de entrada pública del módulo)` --references--> `ProjectService`  [INFERRED]
  docs/walking-skeleton.md → frontend/src/app/projects/project.service.ts
- `3.2 Tres reglas para que sea realmente modular` --references--> `Project`  [INFERRED]
  docs/walking-skeleton.md → frontend/src/app/projects/project.model.ts

## Import Cycles
- None detected.

## Communities (20 total, 5 thin omitted)

### Community 0 - "auth.service.ts"
Cohesion: 0.10
Nodes (21): AuthView, AuthUser, ForgotPasswordRequest, GoogleAuthRequest, GoogleAuthResponse, GoogleCredentialResponse, GoogleIdentityApi, GoogleTenant (+13 more)

### Community 1 - "Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras"
Cohesion: 0.06
Nodes (37): 10. Instrucciones de montaje para el agente, 11. Referencia futura: entidades del MVP por módulo (NO implementar ahora), 12. Anexo: cambios respecto al documento de Hipótesis, 1. Alcance del skeleton, 2. Stack y versiones, 3.1 Módulos definidos, 3.2 Tres reglas para que sea realmente modular, 3.3 Dependencias entre módulos (+29 more)

### Community 2 - "frontend"
Cohesion: 0.08
Nodes (32): build, extract-i18n, serve, test, builder, configurations, defaultConfiguration, options (+24 more)

### Community 3 - "package.json"
Cohesion: 0.10
Nodes (20): name, private, version, @angular/animations, @angular/cli, @angular/compiler, @angular/compiler-cli, @angular-devkit/build-angular (+12 more)

### Community 4 - "schematics"
Cohesion: 0.12
Nodes (17): schematics, skipTests, skipTests, skipTests, skipTests, skipTests, skipTests, skipTests (+9 more)

### Community 5 - "AGENTS.md — Reglas de Contexto e Instrucciones para Agentes de IA y Desarrolladores"
Cohesion: 0.12
Nodes (15): 1. Propósito y Contexto del Proyecto, 2.1. Patrón Arquitectónico: Monolito Modular, 2.2. Estructura de Directorios del Backend, 2.3. Estructura Interna de un Módulo (Clean Architecture), 2.4. Reglas Innegociables del Backend, 2. Repositorio Backend (`saas-backend`), 3.1. Patrón Arquitectónico: Feature-Driven Architecture, 3.2. Estructura de Directorios del Frontend (+7 more)

### Community 6 - "AuthComponent"
Cohesion: 0.32
Nodes (4): AppComponent, appConfig, tenantInterceptor(), @angular/platform-browser

### Community 7 - "SaaS Constructora - Walking Skeleton (HU-02)"
Cohesion: 0.15
Nodes (12): 1. Base de datos (PostgreSQL), 2. Backend (Spring Boot), 3. Frontend (Angular), Criterios de éxito del skeleton (HU-02), Estructura del walking skeleton, Levantar todo, Probar la API, Próximos pasos (fuera del skeleton) (+4 more)

### Community 8 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @angular/animations, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/platform-browser, @angular/platform-browser-dynamic (+4 more)

### Community 9 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, jasmine-core, karma, karma-chrome-launcher, karma-coverage (+4 more)

### Community 10 - "generate-env.mjs"
Cohesion: 0.18
Nodes (7): entries, envCandidates, envPath, frontendRoot, outputPath, PUBLIC_ENV_KEYS, toCamelCase()

### Community 13 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, ng, prebuild, prestart, prewatch, start, test (+1 more)

### Community 14 - "angular.json"
Cohesion: 0.15
Nodes (12): cli, analytics, packageManager, prefix, projectType, root, sourceRoot, newProjectRoot (+4 more)

### Community 15 - "Frontend"
Cohesion: 0.25
Nodes (7): Build, Code scaffolding, Development server, Frontend, Further help, Running end-to-end tests, Running unit tests

### Community 16 - "PULL_REQUEST_TEMPLATE.md"
Cohesion: 0.33
Nodes (5): Checklist, Evidencia (opcional), Issue relacionada, Qué cambia, Tipo de cambio

## Knowledge Gaps
- **17 isolated node(s):** `@angular/animations`, `@angular/compiler`, `@angular/platform-browser-dynamic`, `@angular/router`, `tslib` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 184 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `auth.service.ts` to `Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras`, `package.json`, `AuthComponent`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `@angular/animations`, `@angular/compiler`, `@angular/platform-browser-dynamic` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10101010101010101 - nodes in this community are weakly interconnected._
- **Why does `@angular/common` connect `auth.service.ts` to `Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras`, `package.json`, `AuthComponent`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `Walking Skeleton: SaaS de Gestión de Proyectos para Constructoras` be split into smaller, more focused modules?**
  _Cohesion score 0.059800664451827246 - nodes in this community are weakly interconnected._
- **Should `frontend` be split into smaller, more focused modules?**
  _Cohesion score 0.07661290322580645 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._