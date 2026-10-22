# Frontend Guidelines (`saas-frontend`)

## 1. Patrón Arquitectónico y Estructura
* **Patrón:** Feature-Driven Architecture. Organizado por capacidades/módulos del negocio (*features*) para mantener alta cohesión.
* **Estructura de Directorios:**
  * `src/app/`: Rutas y vistas de la aplicación (Next.js App Router / React Router).
  * `src/features/`: Módulos funcionales (`identity`, `projects`, `site-log`, `documents`).
  * `src/shared/`: UI Library genérica (`components/`, `api/` con cliente configurado e interceptores JWT, `utils/`).
  * `src/types/`: Tipos globales e interfaces compartidas.

## 2. Reglas Innegociables del Frontend
1. **Tipado Estricto derivado del Contrato:** Los tipos de datos de las peticiones y respuestas en el frontend (`DTOs/Interfaces`) deben ser idénticos a los definidos en el contrato de la API.
2. **Componentes UI Desacoplados:** Los componentes de `shared/components` deben ser puros e independientes del estado global o de llamadas directas a la API.
3. **Manejo Elegante de Errores HTTP:** Capturar las respuestas `400`, `403`, `404` y `409` del backend para mostrar retroalimentación clara al usuario mediante notificaciones o alertas en interfaz.

## 3. Grafo de Conocimiento (graphify)

Este repositorio **no** tiene grafo propio: usa el grafo raíz del proyecto, en
`../graphify-out/`, que cubre frontend (Angular) y backend en un solo grafo.
La función `graphify` del shell lo encuentra automáticamente hacia arriba, así
que los comandos funcionan igual dentro de cualquier subcarpeta.

Reglas:
- Si `../graphify-out/graph.json` existe, ejecuta `graphify query "<pregunta>"` **antes** del primer `grep`, búsqueda o lectura de código fuente para preguntas sobre el código. Pasa esta regla en el prompt de todo subagente que explore código.
- Usa `graphify path "<A>" "<B>"` para relaciones entre símbolos y `graphify explain "<concepto>"` para conceptos puntuales. Si el nombre es ambiguo, usa el `node id` completo que muestra el error.
- Lee archivos fuente solo para las líneas que el grafo (o una lectura previa) ya localizó. Revisa `../graphify-out/GRAPH_REPORT.md` solo para arquitectura general.
- Para actualizar el grafo, ejecútalo **desde la raíz del proyecto** (`Software como Servicio`), nunca desde esta carpeta: `cd .. && graphify update .` (solo AST, sin costo de API).