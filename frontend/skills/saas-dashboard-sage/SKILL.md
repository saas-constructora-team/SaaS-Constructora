---
name: saas-dashboard-sage
description: Diseña e implementa pantallas y componentes UX/UI para aplicaciones web SaaS en Angular siguiendo el sistema de diseño Sage (fondo cálido, superficies blancas, navegación oscura y acentos salvia). Úsala al crear o modificar dashboards, tarjetas KPI, gráficos, listas/tablas de actividad, barras de búsqueda, navegación lateral o tokens de este sistema. No usar para landing pages comerciales fuera del sistema ni para cambios globales de identidad no autorizados.
---

# SaaS Dashboard Sage (Angular)

## 1. Propósito y alcance
Actúa como especialista UX/UI y desarrollador frontend en Angular para aplicaciones web SaaS. Diseña e implementa pantallas y componentes coherentes con la referencia **Sage**, sin imponer su contenido inmobiliario de ejemplo a dominios distintos.

- **Reutiliza antes de recrear:** conserva datos, idioma, convenciones y arquitectura del producto destino. No alteres originales, tokens base ni componentes principales sin autorización explícita.
- **Alcance de ejecución:** guía el diseño y la implementación en Angular según la solicitud del usuario y las capacidades disponibles. No instales fuentes ni añadas librerías externas sin necesidad; implementa cambios de código o estilos únicamente cuando se solicite y con evidencia real de lo ejecutado.

## 2. Fuentes de verdad y prioridad
Archivo de referencia: `tmGWO5Z3VpppPEMQWjxjaU`.
- **Dashboard:** frame `19:221`, página `5:3`.
- **Tipografía:** frame `13:768`, página `13:19`.
- **Colores:** frame `13:836`, página `13:19`.
- **Componentes:** página `5:4`; Card `10:1727`, Chart `14:1637`, Last transaction `14:2376`, Search `10:1832`, Pie chart `10:1849` y Sidebar `9:920`.

**Orden de prioridad:**
1. Petición explícita del usuario.
2. Fundamentos de tipografía y color.
3. Definición del componente utilizado.
4. Composición del dashboard.

Cuando las fuentes de diseño sean accesibles, revisa su estado actual. No supongas acceso entre archivos ni disponibilidad de paquetes o estilos. Si faltan fuentes o datos, trabaja con esta especificación y declara explícitamente la limitación. Los nombres semánticos propuestos aquí no prueban la existencia de variables publicadas en el repositorio.

## 3. Identidad visual
Interfaz clara y serena: fondo cálido, superficies blancas, bordes/radios amplios en contenedores principales, navegación oscura y acentos salvia. Gráficos en tonos suaves/pastel, iconografía fina y avatares circulares.

- **Evita:** degradados decorativos, colores saturados ajenos al sistema, sombras pesadas y efectos de cristal (*glassmorphism*).
- **No confundas** el fondo de una página de documentación o presentación con el fondo de la aplicación.

## 4. Colores primitivos y tokens semánticos

### Paleta primitiva (muestras reales, 8 bits)
| Familia | Nombre original | Valor hex |
|---|---|---|
| Base | Black 300 | `#000000` *(nota: su rótulo indica `#121212`, pero la muestra usa `#000000`; consérvalo para reproducción fiel)* |
| Base | Black 200 | `#201F23` |
| Base | Grey 300 | `#45515C` |
| Base | Grey 200 | `#596269` |
| Base | White | `#FFFFFF` |
| Green | Army | `#395917` |
| Green | Dark Green 300 | `#4C6C5A` |
| Green | Dark Green 200 | `#617C6C` |
| Green | Soft Green 200 | `#A4C8AE` |
| Green | Soft Green 00 | `#E6EFEA` |
| Purple | Purple 300 | `#595D75` |
| Purple | Purple 200 | `#B8BED5` |
| Purple | Purple 100 | `#E3E4EA` |
| Beige | Beige 300 | `#A39170` |
| Beige | Beige 200 | `#E5D6B8` |
| Tosca | Tosca | `#C1D8DA` |
| Red | Red | `#98140B` |

### Asignación semántica
- `surface.default` → `#FFFFFF` (`White`)
- `text.primary` y `navigation.active-background` → `#201F23` (`Black 200`)
- `text.secondary` → `#596269` (`Grey 200`)
- `text.chart` → `#45515C` (`Grey 300`)
- `accent.primary` e importes positivos → `#4C6C5A` (`Dark Green 300`)
- `status.positive-text` → `#395917` (`Army`)
- `status.negative-text` → `#98140B` (`Red`)
- `surface.accent-soft` y barras neutras → `#E6EFEA` (`Soft Green 00`)
- `chart.sage` → `#A4C8AE` (`Soft Green 200`)
- `chart.lavender` → `#B8BED5` (`Purple 200`)
- `chart.sand` → `#E5D6B8` (`Beige 200`)
- `chart.tosca` → `#C1D8DA` (`Tosca`)
- `tooltip.background` → `#E3E4EA` (`Purple 100`)

### Extensiones observadas en el dashboard (no son rampas globales)
- Lienzo / canvas: `#EAE9E3`
- Texto tenue: `#8F8E96`
- Separadores: `#D9D9D9`
- Verde suave alternativo: `#E7EEE9`
- Acento negativo: `#FC6767`

Mantén estos valores en su contexto existente; no los conviertas en nuevas escalas globales sin justificación.

### Convenciones de color y accesibilidad
- Usa alias semánticos vinculados a primitivos; evita valores hex dispersos en plantillas o componentes.
- Reutiliza variables/tokens del proyecto antes de crear equivalentes.
- Nombra primitivos por familia/nivel y alias por función/estado.
- No inventes niveles intermedios ni colores nuevos si la paleta cubre la necesidad. Si falta un caso real, propón una extensión explícita y no la presentes como original.
- `transparent` significa ausencia de relleno (`transparent`), nunca negro ni modo oscuro. Las variantes sin fondo no equivalen a un tema oscuro.
- Conserva las asociaciones categoría-color entre gráficos.
- Nunca comuniques estados únicamente mediante color.
- Verifica contraste sobre el fondo real (WCAG AA: `4.5:1` para texto normal, `3:1` para texto grande y controles/elementos de interfaz pertinentes). Los tonos pastel son principalmente para superficies y series, no para textos pequeños.

## 5. Tipografía
Familias: **General Sans** (principal), **Inter** (indicadores compactos y montos) y **Plus Jakarta Sans** (metadatos).
Pesos: Regular `400`, Medium `500`, Semibold `600`.

| Token | Familia | Peso | Tamaño | Interlineado (`line-height`) | Tracking (`letter-spacing`) | Uso principal |
|---|---|---|---|---|---|---|
| `heading-1` | General Sans | Medium (500) | `32px` | `auto` (`normal` en web) | `0` (`0em`) | Título de página *(nota: en la referencia figura menor que `heading-2`; respeta el token si aplica, o valida jerarquía semántica `<h1>`–`<h6>`)* |
| `heading-2` | General Sans | Regular (400) | `36px` | `auto` (`normal` en web) | `0` (`0em`) | Cifras destacadas |
| `heading-3` | General Sans | Semibold (600) | `24.575px` | `140%` (`1.4`) | `0.03em` (`3%`) | Total de gráfico *(rotulado `24px` en origen; conserva `24.575px`)* |
| `heading-4` | General Sans | Medium (500) | `20px` | `auto` (`normal` en web) | `0` (`0em`) | Títulos de tarjeta |
| `body-1` | General Sans | Regular (400) | `20px` | `auto` (`normal` en web) | `0.03em` (`3%`) | Introducción |
| `body-2` | General Sans | Regular (400) | `16px` | `32px` *(fijo)* | `0.03em` (`3%`) | Búsqueda |
| `body-3` | General Sans | Medium (500) | `16px` | `140%` (`1.4`) | `0.03em` (`3%`) | Acciones y texto secundario |
| `body-4` | Inter | Medium (500) | `14px` | `140%` (`1.4`) | `0.005em` (`0.5%`) | Badges *(rotulado con interlineado `180%` en origen; usa `140%`)* |
| `meta` | Plus Jakarta Sans | Medium (500) | `12px` | `auto` (`normal` en web) | `0` (`0em`) | Fechas e identificadores *(distinguido de las dos muestras "Body 5")* |
| `caption` | General Sans | Medium (500) | `12px` | `20px` *(fijo)* | `0` (`0em`) | Leyendas *(distinguido de las dos muestras "Body 5")* |

### Excepciones verificadas en el dashboard
- **KPI:** General Sans Medium, `36px`, line-height `normal`/`auto`, letter-spacing `0`.
- **Texto principal de filas:** General Sans Medium, `16px` / `24px` (`line-height: 24px` o `1.5`), letter-spacing `0`.
- **Importes de transacción:** Inter Semibold (600), `20px`, line-height `normal`/`auto`, letter-spacing `0`.
- **Descripciones compactas:** General Sans Medium, `14px` / `24px` (`line-height: 24px`), letter-spacing `0`.
- **Tooltip:** General Sans Medium, `12px` / `140%`, letter-spacing `0.005em` (`0.5%`).

No normalices ni renombres tokens originales sin autorización. Reutiliza estilos existentes, no confundas la numeración de tokens con etiquetas semánticas HTML (`h1`–`h6`), no sustituyas familias ni simules pesos tipográficos sin indicarlo, y verifica fuentes y licencias antes de usarlas.

## 6. Composición y medidas
Referencia de escritorio: `1440 × 1024 px`.
- **Márgenes:** izquierdo `40px`, derecho `48px`, vertical `44px`.
- **Navegación lateral:** `76px`; separación hacia el contenido: `40px`.
- **Encabezado a contenido:** `32px`.
- **Separación principal entre tarjetas:** `12px`.
- **Padding de tarjetas:** `24px–28px`.
- **Radios:** habitual `27px`; mantenimiento `32px`; compacto `8px`; píldoras y círculos `9999px` / `50%`.

Composición orientativa: navegación lateral, encabezado, tres KPI, gráficos en proporción aproximada `2:1` y listas operativas. No fuerces este esquema si la tarea requiere otra distribución. Prefiere layouts flexibles (Flexbox/CSS Grid) y altura según contenido sobre dimensiones fijas o coordenadas absolutas; no impongas una retícula de `8px` que elimine medidas propias como `12px`, `18px` o `27px`.

## 7. Inventario y variantes de referencia
- **Card:** `404 × 171px`, padding `28px`, gap `18px`, radio `27px`. Variantes: `1 | 2 | 3` *(no representan tamaños ni estados interactivos)* y fondo `With background | Outline`.
- **Chart:** `816 × 322px`, radio `27px`. Fondo: `With background | No background`.
- **Pie chart:** `408 × 322px`, radio `27px`. Fondo: `With background | No background`.
- **Last transaction:** `566 × 309px`, padding `24px`, gap `24px`, radio `27px`. Fondo: `With background | No backgroundf` *(conserva el nombre exacto con error tipográfico solo al mapear ese origen; no lo propagues a componentes nuevos)*.
- **Search:** `425 × 70px`; padding superior/derecho/inferior `7px` e izquierdo `22px`; acción circular de `56px` e icono de `24px`. Fondo: `With background | No background` y texto de búsqueda configurable.
- **Sidebar:** `76 × 547px`, radio `54px`, celdas de `60px` e iconos de `24px`. Fondo: `With background | No background`.

Los bordes de variantes transparentes varían según la pieza (~`0.2px` en Card y gráficos, `0.5px` en Search, `1px` en Last transaction); no fuerces un grosor único en controles nuevos. Los encabezados, fondos o pies de documentación/presentación no son componentes funcionales de la aplicación.

## 8. Crear y extender componentes
1. Revisa primero si existe un componente o subpieza reutilizable en el proyecto.
2. Define propósito, datos/entradas, acciones, tamaños necesarios y estados.
3. Mantén la estructura base: contenedor, encabezado, contenido y acción o pie cuando aplique.
4. Reutiliza tokens de color, tipografía, radios, espaciados e iconografía del sistema.
5. Nombra por función o dominio del producto, nunca por contenido de ejemplo ni nombres genéricos (`Frame 123`, `Group 24`, etc.).
6. Para variantes/estados nuevos, usa nombres descriptivos (por ejemplo, superficie `filled | outline | transparent` o estados `default | hover | focus | pressed | disabled`), distinguiendo claramente lo verificado de lo propuesto.
7. Parametriza textos, visibilidad y contenido intercambiable mediante inputs/slots en lugar de multiplicar variantes rígidas.
8. Define crecimiento, anchos mínimos, truncamiento o salto de línea ante textos largos, y comportamiento con valores cortos, largos, cero, negativos o nulos/ausentes.

## 9. Gráficos, listas y calidad
- Mantén títulos claros, unidades consistentes, leyendas legibles y correspondencia exacta entre datos, cifras y proporciones. No presentes gráficos estáticos como conectados a datos o interactivos.
- En listas/tablas de actividad, alinea importes a la derecha, usa miniaturas circulares y separadores discretos. Permite altura adaptable, paginación o desplazamiento explícito según la tarea; no copies recortes accidentales de las muestras como regla.

## 10. Extensiones propuestas (no documentadas en la referencia)
Etiqueta explícitamente como propuestas cuando las implementes:
- Estados interactivos: `hover`, `focus`, `pressed` y `disabled`.
- Estados de datos: `loading`, `empty` y `error`.
- Diseño responsive y navegación móvil: en tablet reorganiza según anchos legibles; en móvil apila elementos y adapta la navegación sin escalar proporcionalmente toda la pantalla, conservando acceso a acciones y datos clave.
- Accesibilidad: foco visible, etiquetas/nombres accesibles y objetivos táctiles preferentemente de `44 × 44px` cuando aplique.

## 11. Implementación en Angular y entrega
- Inspecciona primero la estructura, estilos globales (`styles.scss` / CSS custom properties), librerías de gráficos/iconos y convenciones de Angular del proyecto (componentes standalone o módulos, señales/inputs, estilos encapsulados).
- Centraliza los tokens como CSS custom properties (`--sage-*`) y separa la lógica/datos de la presentación. No añadas dependencias si no son necesarias.
- Traduce porcentajes de tracking a `em` (`3%` → `0.03em`, `0.5%` → `0.005em`), distingue interlineado fijo (`px`) de proporcional (`1.4`), y valida cómo renderiza el navegador frente a `auto` en diseño.

### Flujo y reporte final obligatorio
Sigue este orden:
1. Identifica alcance, destino y datos/fuentes disponibles.
2. Revisa tokens y componentes existentes en Angular.
3. Decide qué reutilizar y qué crear o extender.
4. Aplica tokens y reglas sin tocar lo que está fuera de alcance.
5. Revisa contraste, alineación, desbordamiento, estados, responsive y coherencia de datos.

Al finalizar cada tarea, entrega un resumen breve con:
- **Reutilizado y creado/extendido** en el proyecto Angular.
- **Desviaciones y extensiones propuestas** (qué se adaptó o propuso y por qué).
- **Limitaciones o pendientes no verificados** (por falta de acceso, fuentes o ejecución).