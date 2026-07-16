# Inventario de Pantallas y Componentes — Frontend Planogramas Cemaco

Inventario de las pantallas y componentes necesarios para el frontend del sistema formal de
planogramas (módulos 01-11, backend en desarrollo), reconciliado con lo que ya existe construido en
`src/main.jsx` (piloto de captura por foto, hoy con datos simulados/embebidos) **y con el prototipo
visual ya diseñado** en `front/design/Planogramas.dc.html`.

Fuentes: `CASOS_DE_USO.md`, `ENDPOINTS.md`, `Contratos/01_planogramas/` a `11_jerarquia/`,
`SEQ_CU-01` a `SEQ_CU-07`, `FEATURE_captura_foto_planograma.md`, `FEATURE_editar_planograma.md`,
`MODELO_DATOS.mermaid`, `ESTRUCTURA_BACKEND.md`, `ALCANCE_PROYECTO.md`, `MEMORIA_PROYECTO.md`,
`PENDIENTES_PROYECTO.md`, `REUNION_TECNICA.md`, el código actual de `src/main.jsx` / `src/styles.css`,
y el prototipo visual `front/design/Planogramas.dc.html` (más su handoff `front/design/
ESPECIFICACION-PANTALLAS-COMPONENTES.md`, generado junto con el diseño — documento complementario a
este, con el detalle campo-por-campo del editor y el modelo de datos TypeScript sugerido).

---

## 1. Cómo leer este documento

Hay dos capas de producto que **no deben confundirse** al implementar:

1. **MVP formal (CU-01 a CU-07)** — gestión completa de planogramas por catálogo/formulario
   (crear planograma → versión → góndolas → niveles → posiciones → sustituciones → publicar/exportar),
   más la consulta de solo lectura para implementadores. Este es el backend que se está construyendo
   ahora (`back/`, módulos `planogramas`/`versiones`/`gondolas`/`niveles` ya implementados; el resto
   pendiente) y el frontend que se está armando en `front/` (scaffold vacío por ahora, ver
   `ESTRUCTURA_FRONTEND.md`). **Ya existe un prototipo visual completo** de la mayoría de estas
   pantallas en `front/design/Planogramas.dc.html` — es la fuente de verdad de interacción y layout,
   por delante de este documento cuando haya conflicto.
2. **Piloto de captura por foto (CU-08, fuera del MVP formal)** — las 4 vistas ya construidas en
   `src/main.jsx` (Captura/Revisión/Editor/Performance). Captura es funcional, Revisión y Performance
   son simuladas/sintéticas, Editor es funcional pero no persiste. Este flujo **no está conectado**
   al backend de los módulos 01-11 ni al prototipo visual nuevo; su reconciliación con el Editor del
   MVP formal sigue siendo una decisión de producto pendiente (ver §5).

Cada pantalla del MVP formal indica su **estado**, con un valor más que en la versión anterior de
este documento:

- **Nueva** — no existe ni en el piloto ni en el prototipo visual; falta diseñar y construir.
- **Diseñado** — tiene prototipo visual e interacción completos en `Planogramas.dc.html`; falta
  implementar en `front/src` contra el backend real. Es el estado de la gran mayoría de pantallas
  del MVP formal ahora.
- **Adaptar** — existe algo parecido en el piloto (`main.jsx`) y se puede evolucionar.
- **Reusar** — el componente visual ya sirve tal cual, solo cambia el origen de los datos.

---

## 2. Mapa de navegación

El diseño resolvió esto de forma más simple de lo anticipado: **no hay un árbol de navegación
separado por rol**. Analista e Implementador comparten las mismas 3 rutas; el rol es un toggle
transversal (`RoleSwitch`, hoy en la topbar del prototipo, en producción vendría de auth) que oculta
los botones de escritura cuando el rol es Implementador, en vez de llevar a pantallas distintas de
solo consulta. Esto reemplaza el mapa de navegación separado para Implementador que tenía la versión
anterior de este documento (ver gap correspondiente en §5).

```
/planogramas
└─ Listado de planogramas (filtros área/departamento/estado/búsqueda; tabla en desktop, cards en
   móvil; botón "+ Crear planograma" abre PlanogramaFormModal — analista)
   └─ /planogramas/:id — Detalle de planograma
      (metadatos + subcategorías + tabla de versiones con acciones según estado; "Editar" abre
      PlanogramaFormModal precargado, "Archivar" abre ArchivarModal — analista)
      └─ /planogramas/:id/versiones/:versionId/editor — Editor de planograma
         (estructura vertical: barra del editor → tabs de góndola → barra de góndola activa →
         lienzo de niveles con posiciones → toolbar contextual de espacio seleccionado)
         ├─ GondolaModal / NivelModal (agregar-editar, modal)
         ├─ DeleteConfirmModal (eliminar góndola/nivel)
         ├─ PosicionDrawer (doble clic en una posición) → sección Montaje (accesorios)
         ├─ FichaProductoModal (clic derecho en una posición, o botón "Ficha")
         ├─ Modo sustitución (banner + selección múltiple en el lienzo) → SustitucionWizard
         ├─ HistorialSustitucionesModal
         ├─ CrearVersionModal / VersionEspecialWizard / PromoverPilotoModal / TiendasAsignadasModal
         ├─ ExportMenu (JSON/CSV)
         └─ PublicarEditorPanel (validación con errores bloqueantes vs. advertencias)
```

### Piloto de captura (ya construido, ciclo separado)

```
Captura → Revisión → Editor (prototipo) → Performance
```

---

## 3. Inventario de pantallas — MVP formal

### 3.1 Planogramas (módulo 01)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-01-01 | Listado de planogramas | Analista / Implementador | Buscar y filtrar planogramas por área, departamento, estado; acceder al detalle | CU-01-04 | `GET /planogramas` | Diseñado | `PlanogramasTable`, `PlanogramaCard` (móvil), `FiltrosBar`, `EstadoBadge`, `EmptyState` |
| PANT-01-02 | Crear planograma | Analista | Formulario: nombre, área→departamento (cascada), subcategorías (chips) | CU-01-01 | `GET /jerarquia/areas`, `GET /jerarquia/departamentos`, `POST /planogramas` | Diseñado | `PlanogramaFormModal` — **es un modal, no una pantalla/ruta propia** (ver nota de reconciliación en §5 sobre la carpeta `pages/PlanogramaFormulario` ya scaffoldeada) |
| PANT-01-03 | Editar planograma | Analista | Mismo modal que crear, pre-poblado, partial update | CU-01-02 | `PATCH /planogramas/{id}` | Diseñado | Igual a PANT-01-02 (`PlanogramaFormModal`) |
| PANT-01-04 | Detalle de planograma | Analista / Implementador | Metadatos + subcategorías + tabla de versiones con estado/tiendas/conteos; hub de acceso a versiones | CU-01-05, CU-02-06 | `GET /planogramas/{id}`, `GET /planogramas/{id}/versiones` | Diseñado | `Breadcrumb`, `SubcategoriasCard`, `VersionesTable`/`VersionCard`, `EstadoBadge` |
| ACC-01-05 | Confirmar archivar planograma | Analista | Modal de confirmación; bloquea si hay una versión publicada con tiendas asignadas | CU-01-03 | `POST /planogramas/{id}/archivar` | Diseñado | `ArchivarModal` |

### 3.2 Versiones (módulo 02)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| ACC-02-01 | Crear versión | Analista | Modal: tipo (GRANDE/MEDIANA/EXPRESS), notas; genera código `{DEPTO}-T{X}-{nn}` | CU-02-01 | `POST /planogramas/{id}/versiones` | Diseñado | `CrearVersionModal` |
| ACC-02-02 | Crear versión especial por tienda | Analista | Wizard de **2 pasos** (no 3 como se había anticipado): (1) elegir versión base, (2) elegir tienda; clona toda la estructura | CU-02-02 | `POST /planogramas/{id}/versiones` (`versionBaseId`, `tiendaId`) | Diseñado | `VersionEspecialWizard` |
| PANT-02-03 | Detalle de versión / Editor | Analista / Implementador | Ver la versión completa (ver 3.3) | CU-01-05 | `GET /versiones/{id}`, `GET /versiones/{id}/estructura` | Diseñado | Ver Editor de planograma (3.3) |
| ACC-02-04 | Promover a piloto | Analista | Modal: selector múltiple de tiendas piloto | CU-02-03 | `POST /versiones/{id}/promover` | Diseñado | `PromoverPilotoModal` |
| ACC-02-05 | Publicar versión | Analista | Dos puntos de entrada: desde el detalle (`PublicarVersionModal`, confirmación simple) y desde el editor (`PublicarEditorPanel`, corre validación con errores/advertencias, ver 3.5) | CU-02-04 | `GET /versiones/{id}/validar-publicacion`, `POST /versiones/{id}/promover` | Diseñado | `PublicarVersionModal`, `PublicarEditorPanel` |
| PANT-02-06 | Tiendas asignadas a la versión | Analista | Ver/editar tiendas asignadas de una versión piloto/publicada | CU-02-05 | `GET/PUT /versiones/{id}/tiendas` | Diseñado | `TiendasAsignadasModal` |

### 3.3 Editor de planograma — Góndolas, niveles y posiciones (módulos 03/04/05)

Pantalla más grande del sistema. El prototipo la resuelve como **un único flujo vertical que
scrollea junto** (barra del editor → tabs de góndola → barra de la góndola activa → lienzo de
niveles → toolbar contextual), sin paneles flotantes ni layout de sidebar+grid como se había
anticipado. Reemplaza el patrón `EditorView`/`shelf`/`planogram-cell` del piloto por una estructura
nueva con múltiples góndolas reales por versión.

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-03-01 | Editor de planograma (vista principal) | Analista | Tabs de góndola; lienzo de niveles con posiciones como cards; barra de capacidad por nivel; toolbar de espacio seleccionado (facings, duplicar, ficha, quitar); interacciones: 1 clic selecciona, doble clic abre drawer, clic derecho abre ficha, drag&drop mueve/reordena posiciones (dentro y entre niveles) | CU-04-03, CU-04-07, CU-04-10 | `GET /versiones/{id}`, `GET /versiones/{id}/capacidad`, `PATCH /posiciones/{id}/mover`, `PATCH /versiones/{id}/guardar` | Diseñado | `EditorToolbar`, `GondolaTabs`, `GondolaInfoBar`, `EspacioToolbar`, `NivelRow`, `CapacityBar`, `PosicionCard`, `FacingTile` |
| ACC-03-02 | Agregar/editar góndola | Analista | Modal: nombre, ancho/alto/profundidad (cm), ubicación en tienda | CU-03-01, CU-03-02 | `POST/PATCH /versiones/{id}/gondolas`, `/gondolas/{id}` | Diseñado | `GondolaModal` |
| ACC-03-03 | Confirmar eliminar góndola/nivel | Analista | Modal de confirmación genérico (título + mensaje); el prototipo **no** muestra un resumen de conteos (niveles/posiciones afectadas) como se había planeado — solo confirma/cancela | CU-03-04, CU-03-08 | `GET /gondolas/{id}/resumen`, `GET /niveles/{id}/resumen`, `DELETE` | Diseñado, con gap | `DeleteConfirmModal` — evaluar si agregar el resumen de impacto al implementar, ya que el backend sí expone `/resumen` |
| ACC-03-04 | Agregar/editar nivel | Analista | Modal: orden, altura desde piso, tipo y código de accesorio, ancho disponible, notas | CU-03-05, CU-03-06 | `POST/PATCH /gondolas/{id}/niveles`, `/niveles/{id}` | Diseñado | `NivelModal` |
| PANT-03-05 | Panel de edición de posición | Analista | Drawer lateral derecho con 7 secciones: Producto, Espacio y facings, Capacidad, Reposición, Montaje, Clasificación, Desborde (ver detalle campo por campo en `front/design/ESPECIFICACION-PANTALLAS-COMPONENTES.md` §3.5 y en `FEATURE_editar_planograma.md` §4) | CU-04-01, CU-04-02, CU-04-08 | `POST/PATCH /niveles/{id}/posiciones`, `/posiciones/{id}` | Diseñado | `PosicionDrawer` |
| ACC-03-06 | Gestor de accesorios de montaje de posición | Analista | Sub-sección "Montaje" del drawer: lista editable de accesorio (nombre libre) + nota | CU-04-09, CU-04-11 | `GET/POST/DELETE /posiciones/{id}/accesorios` | Diseñado, con gap | El prototipo usa **texto libre** para el nombre del accesorio, no un selector contra el catálogo real (`GET /accesorios`, módulo 08) — reconciliar al implementar: ¿selector con autocompletado sobre el catálogo, o se mantiene el campo libre? |
| ACC-03-07 | Reordenar góndolas / niveles | Analista | Drag&drop de reordenamiento (lista de góndolas o de niveles) | CU-03-03, CU-03-07 | `PATCH .../reordenar` | **Nueva** — no cubierto por el diseño | El prototipo solo tiene drag&drop de posiciones; las tabs de góndola y las filas de nivel no son reordenables. Falta diseñar esta interacción |

### 3.4 Sustitución de SKUs (módulo 06)

El diseño fusionó lo que este documento anticipaba como 3 pantallas de wizard en **un modo dentro
del editor** (banner + selección múltiple directa en el lienzo) más **un modal único** de
sustituto+motivo — no son rutas ni pasos de pantalla completa independientes.

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-04-01 | Activar modo sustitución + selección de alcance | Analista | `SustitucionBanner` en el editor; clic en el lienzo marca/desmarca posiciones del mismo SKU (checkboxes); contador de espacios seleccionados, Cancelar/Continuar | CU-05-01 | `GET /posiciones/por-sku` | Diseñado (fusiona lo que antes eran PANT-04-01/02) | `SustitucionBanner` |
| PANT-04-02/03 | Elegir sustituto y confirmar | Analista | Modal único: buscador de catálogo, SKU sustituto, motivo (obligatorio), alerta si las dimensiones difieren &gt;20%; recalcula facings | CU-05-02, CU-05-03 | `GET /catalog/productos/buscar`, `POST /versiones/{id}/sustituciones` | Diseñado | `SustitucionWizard` |
| PANT-04-04 | Historial de sustituciones | Analista | Tabla: SKU original → sustituto, motivo, fecha, espacios afectados; **es un modal desde el editor, no una pantalla propia** | CU-05-04 | `GET /versiones/{id}/sustituciones` | Diseñado | `HistorialSustitucionesModal` |

### 3.5 Publicación y exportación (módulo 07)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| ACC-05-01 | Guardar borrador | Analista | Acción directa desde `EditorToolbar`, sin pantalla propia | CU-06-01 | `PATCH /versiones/{id}/guardar` | Diseñado | Botón en `EditorToolbar` + `Toast` de confirmación |
| PANT-05-02 | Panel de validación pre-publicación | Analista | Lista de **errores bloqueantes** (fondo/texto `--danger`, deshabilitan "Confirmar publicación") y **advertencias no bloqueantes** (fondo/texto `--warning`) — el gap de color señalado en la versión anterior de este documento **queda resuelto**: son dos tratamientos visuales distintos y con comportamiento distinto (bloquea vs. no bloquea) | CU-06-02 | `GET /versiones/{id}/validar-publicacion` | Diseñado | `PublicarEditorPanel` |
| ACC-05-03 | Exportar planograma | Analista | Popover con "Exportar JSON" / "Exportar CSV", dispara descarga | CU-06-03, CU-06-04 | `GET /versiones/{id}/exportar/json`, `/csv` | Diseñado | `ExportMenu` |

### 3.6 Consulta para implementadores (módulos 02/05/10)

**Cambio de enfoque respecto a la versión anterior de este documento**: el diseño no construyó
pantallas mobile-first separadas para el Implementador (selector de tienda, listado de tienda,
vista de estructura solo lectura). En su lugar, el Implementador usa **las mismas 3 rutas** del
Analista con `RoleSwitch` en modo lectura (botones de mutación ocultos). Esto es más simple de
construir, pero deja abierto si de verdad cubre el caso de uso original — "consulta desde el
teléfono en piso de venta" — ver gap en §5.

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Notas |
|---|---|---|---|---|---|---|---|
| PANT-06-03 | Vista de estructura (solo lectura) | Implementador | Mismo Editor de planograma (3.3), con `RoleSwitch` en modo Implementador: sin edición, sin drag&drop, sin campos de control (`min_final`/`max_final` ocultos) | CU-07-01 | `GET /versiones/{id}/estructura?vistaImplementador=true` | Diseñado (como modo de PANT-03-01, no pantalla propia) | Falta confirmar que el layout del editor (denso, pensado para mouse/desktop) funciona bien en el teléfono — no tiene tratamiento mobile específico en el prototipo |
| PANT-06-04 | Detalle de posición (implementador) | Implementador | Doble clic en una posición abre el mismo `PosicionDrawer`/`FichaProductoModal` que el Analista, en modo lectura | CU-07-02 | `GET /posiciones/{id}/detalle` | Diseñado (mismo componente, modo lectura) | Modo degradado si CATI no responde: sigue sin definirse en el prototipo (dato simulado, no hay llamada real a CATI) |

Las pantallas `PANT-06-01` (selector de tienda) y `PANT-06-02` (listado de planogramas de la
tienda) de la versión anterior de este documento **ya no aplican tal como se planearon**: no hay
selección explícita de tienda en el prototipo, el Implementador ve el mismo listado global que el
Analista. Confirmar si esto es aceptable para el caso de uso real antes de descartarlas del todo
(ver gap en §5).

### 3.7 Piloto de captura por foto — ya construido (CU-08, fuera del MVP formal)

| Código | Pantalla | Actor | Estado real | Notas |
|---|---|---|---|---|
| PILOTO-01 | Captura (`CaptureView`) | Analista | Funcional | Plan de fotos por mueble, análisis real de calidad en navegador |
| PILOTO-02 | Revisión (`ReviewView`) | Analista | Simulado | Detecciones fabricadas por similitud de catálogo, no por contenido real de foto; mantener etiqueta de modo demo |
| PILOTO-03 | Editor (`EditorView` prototipo) | Analista | Funcional, no persiste | Candidato a fusionarse o coexistir con PANT-03-01 — decisión de producto pendiente; el nuevo diseño (PANT-03-01) no lo tuvo en cuenta, así que la reconciliación sigue igual de abierta |
| PILOTO-04 | Performance (`PerformanceView`) | Analista/Comprador | Sintético | Debe mantenerse aislado de Captura/Revisión/Editor; no está en el alcance de los módulos 01-11 |

---

## 4. Inventario de componentes

### 4.1 Componentes del prototipo visual (`front/design/Planogramas.dc.html`) — implementar en `front/src`

Nombres tal como los usa `front/design/ESPECIFICACION-PANTALLAS-COMPONENTES.md` §3 (documento
complementario, con la descripción de cada uno); acá solo se listan agrupados por dónde ya hay
carpeta scaffoldeada en `front/src/components/ui/` (ver `ESTRUCTURA_FRONTEND.md`).

| Genérico (`components/ui/`, ya existe la carpeta vacía) | Uso en el diseño |
|---|---|
| `Button` | Todos los botones de acción |
| `Modal` | Base de todos los modales centrados (`GondolaModal`, `NivelModal`, `CrearVersionModal`, etc.) |
| `ConfirmDialog` | Base de `ArchivarModal` y `DeleteConfirmModal` |
| `Table` | Base de `PlanogramasTable`, `VersionesTable`, `HistorialSustitucionesModal` |
| `Badge` | Base de `EstadoBadge` (colores por estado, ver §4.3) |
| `Toast` | Confirmaciones de guardar/mover/eliminar/publicar |
| `ChipInput` | Subcategorías en `PlanogramaFormModal` |
| `CascadingSelect` | Área → Departamento en `PlanogramaFormModal` |

| Genérico nuevo, falta crear la carpeta | Uso en el diseño |
|---|---|
| `Wizard` | Base de `VersionEspecialWizard` (2 pasos) y `SustitucionWizard` |
| `Drawer` | Base de `PosicionDrawer` (lateral derecho, distinto de `Modal` centrado) |
| `EmptyState` | Listado sin resultados, versión sin góndolas, planograma sin versiones |
| `Popover` | Base de `ExportMenu` |

De dominio (`components/dominio/`, nombres del diseño — ver agrupamiento propuesto en
`ESTRUCTURA_FRONTEND.md`):

`AppTopbar`, `RoleSwitch`, `Breadcrumb`, `EstadoBadge`, `FiltrosBar`, `PlanogramasTable`,
`PlanogramaCard`, `SubcategoriasCard`, `VersionesTable`, `VersionCard`, `PlanogramaFormModal`,
`ArchivarModal`, `CrearVersionModal`, `VersionEspecialWizard`, `PromoverPilotoModal`,
`PublicarVersionModal`, `PublicarEditorPanel`, `TiendasAsignadasModal`, `EditorToolbar`,
`ExportMenu`, `SustitucionBanner`, `GondolaTabs`, `GondolaInfoBar`, `EspacioToolbar`, `NivelRow`,
`CapacityBar`, `PosicionCard`, `FacingTile`, `PosicionDrawer`, `FichaProductoModal`, `GondolaModal`,
`NivelModal`, `DeleteConfirmModal`, `SustitucionWizard`, `HistorialSustitucionesModal`.

### 4.2 Componentes del piloto (`main.jsx`) — no reutilizados por el nuevo diseño

A diferencia de lo que anticipaba la versión anterior de este documento, el prototipo visual nuevo
**no reutiliza** los componentes del piloto de captura (`ProductPack`, `ProductPreview`, `Metric`,
`PhotoQualityCard`, `.catalog-panel`/`.search-box`, `shelf`/`shelf-row`/`planogram-cell`,
`.performance-cell`): construyó su propio vocabulario visual (`PosicionCard`, `FacingTile`,
`CapacityBar`, `NivelRow`) sobre el Cemaco Design System (§4.3), no sobre la paleta navy/lima del
piloto. Esto simplifica la implementación (no hay que adaptar componentes viejos) pero significa
que **no hay nada que rescatar del piloto para el MVP formal** salvo el patrón de interacción
(drag&drop, selección, doble clic) como referencia conceptual.

### 4.3 Sistema visual — Cemaco Design System (reemplaza la paleta navy/lima)

El piloto de captura (`src/styles.css`) usa una paleta navy/lima ad hoc que **no se traslada** al
MVP formal. El prototipo nuevo usa el design system real de Cemaco, con tokens en
`front/design/_ds/.../colors_and_type.css` y `ui_kits/web/cemaco-web.css`:

- **Marca**: verde `--cemaco-green: #94D500` (ahorro, éxito, CTA sobre fondo oscuro) e índigo
  `--cemaco-indigo: #101E8E` (corporativo/confianza, color primario de acciones en web).
- **Semántico** — tres colores distintos y con comportamiento distinto (resuelve el gap de la
  versión anterior de este documento): `--success` (verde), `--warning` (ámbar, no bloquea) y
  `--danger` (rojo, bloquea — ver `editorPublicarBloqueado` en PANT-05-02).
- **Estados de planograma/versión** (`ESTADO_META` en el prototipo): `borrador` → gris (`--ink-100`/
  `--ink-700`), `en_desarrollo` → índigo tenue, `piloto` → ámbar (`--warning`/`--warning-bg`),
  `publicado` → verde, `archivado` → gris apagado (`--fg-3`).
- **Tipografía**: display "Chalet NY" (fuente licenciada, uso interno — ver nota de licencia en
  `ESTRUCTURA_FRONTEND.md`) con fallback "Hanken Grotesk"; cuerpo "Hanken Grotesk"; monoespaciada
  "DM Mono" para SKUs y códigos.
- **Radios/sombras/espaciado**: escala de 4px, radios `4px`–`20px` según componente, sombras
  suaves (`--shadow-xs` a `--shadow-lg`).

---

## 5. Gaps y decisiones abiertas

Gaps de la versión anterior de este documento que **el diseño ya resolvió**:

- ~~No hay un color de error real distinguible de advertencia~~ → resuelto, ver §4.3 y PANT-05-02.
- ~~No existe patrón de tabla de datos~~ → resuelto, `Table`/`PlanogramasTable`/`VersionesTable`.
- ~~No existe patrón de confirmación con impacto~~ → parcialmente resuelto: existe `ConfirmDialog`/
  `DeleteConfirmModal`, pero sin el resumen de conteos que pedían los casos de uso (ver ACC-03-03).
- ~~No existe selector en cascada ni multi-select~~ → resuelto, `CascadingSelect` y
  `PromoverPilotoModal` (multi-select de tiendas).

Gaps que siguen abiertos, más los que introdujo el propio diseño:

- **Modelo de permisos/roles no está definido.** `RoleSwitch` es un toggle manual en la UI, no auth
  real — sigue sin login ni JWT de Entra ID. Al conectar a un backend real, decidir si el rol viene
  del token o se sigue pudiendo togglear (probablemente no, en producción).
- **Consulta del Implementador en el teléfono, en duda.** El diseño unificó Analista/Implementador
  en las mismas 3 rutas (ver §3.6) en vez de un flujo mobile-first separado. El Editor de
  planograma no tiene tratamiento mobile específico — confirmar con el equipo si alcanza para el
  caso de uso real de "consulta en piso de venta desde el teléfono" antes de dar esto por cerrado.
- **`pages/PlanogramaFormulario` ya existe como carpeta vacía en `front/src`** (ver
  `ESTRUCTURA_FRONTEND.md`) pero el diseño lo resuelve como modal (`PlanogramaFormModal`), no como
  pantalla/ruta propia. Decidir si se elimina esa carpeta o se reutiliza para alojar el modal.
- **Accesorios de montaje como texto libre vs. catálogo real.** El drawer de posición (ACC-03-06)
  usa un campo de texto libre para el nombre del accesorio; el backend (módulo 08, `GET
  /accesorios`) expone un catálogo real. Definir si el frontend agrega un selector con
  autocompletado o si el campo libre es intencional.
- **Reordenar góndolas/niveles no está diseñado** (ACC-03-07) — falta definir la interacción.
- **Reconciliación Editor piloto vs. Editor MVP formal** sigue abierta (`PILOTO-03` vs.
  `PANT-03-01`) — el nuevo diseño no tomó ninguna decisión al respecto, ver `REUNION_TECNICA.md`.
- **Licencia de la fuente "Chalet NY".** Uso interno solamente según la nota en
  `colors_and_type.css` — usar el fallback "Hanken Grotesk" en el build de producción salvo que se
  confirme la licencia (ver `ESTRUCTURA_FRONTEND.md`).
