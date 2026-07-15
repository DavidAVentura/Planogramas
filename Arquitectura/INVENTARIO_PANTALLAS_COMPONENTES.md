# Inventario de Pantallas y Componentes — Frontend Planogramas Cemaco

Inventario de las pantallas y componentes necesarios para diseñar el frontend del sistema formal de
planogramas (módulos 01-11, backend en desarrollo), reconciliado con lo que ya existe construido en
`src/main.jsx` (piloto de captura por foto, hoy con datos simulados/embebidos).

Fuentes: `CASOS_DE_USO.md`, `ENDPOINTS.md`, `Contratos/01_planogramas/` a `11_jerarquia/`,
`SEQ_CU-01` a `SEQ_CU-07`, `FEATURE_captura_foto_planograma.md`, `FEATURE_editar_planograma.md`,
`MODELO_DATOS.mermaid`, `ESTRUCTURA_BACKEND.md`, `ALCANCE_PROYECTO.md`, `MEMORIA_PROYECTO.md`,
`PENDIENTES_PROYECTO.md`, `REUNION_TECNICA.md`, y el código actual de `src/main.jsx` / `src/styles.css`.

---

## 1. Cómo leer este documento

Hay dos capas de producto que **no deben confundirse** al diseñar:

1. **MVP formal (CU-01 a CU-07)** — gestión completa de planogramas por catálogo/formulario
   (crear planograma → versión → góndolas → niveles → posiciones → sustituciones → publicar/exportar),
   más la consulta de solo lectura para implementadores. Este es el backend que se está construyendo
   ahora (`back/`, módulos `planogramas`/`versiones`/`gondolas`/`niveles` ya implementados; el resto
   pendiente). **Las pantallas de este documento son mayormente nuevas** — hoy no existen en el
   frontend.
2. **Piloto de captura por foto (CU-08, fuera del MVP formal)** — las 4 vistas ya construidas en
   `src/main.jsx` (Captura/Revisión/Editor/Performance). Captura es funcional, Revisión y Performance
   son simuladas/sintéticas, Editor es funcional pero no persiste. Este flujo **no está conectado**
   al backend de los módulos 01-11 y su reconciliación (¿el Editor del piloto se fusiona con el
   Editor del MVP formal, o quedan separados?) es una decisión de producto pendiente, no algo que
   este inventario resuelva.

Cada pantalla del MVP formal indica su **estado frente al prototipo actual**: `Nueva` (no existe hoy),
`Adaptar` (existe algo parecido en el piloto y se puede evolucionar), o `Reusar` (el componente visual
ya sirve tal cual, solo cambia el origen de los datos).

---

## 2. Mapa de navegación propuesto

### Analista (uso principal: escritorio)

```
Login (pendiente Entra ID)
└─ Planogramas (listado, filtros área/departamento/estado/búsqueda)
   └─ Detalle de planograma (metadatos + subcategorías + tabla de versiones)
      ├─ Crear versión / Crear versión especial por tienda (modal)
      └─ Detalle de versión
         ├─ Editor de planograma (góndolas → niveles → posiciones, drag&drop)
         │  ├─ Agregar/editar góndola (modal)
         │  ├─ Agregar/editar nivel (modal)
         │  ├─ Panel de edición de posición (drawer)
         │  │  └─ Gestor de accesorios de montaje (sección del drawer)
         │  └─ Sustitución de SKU (wizard de 3 pasos)
         ├─ Tiendas asignadas (asignar/promover a piloto/publicar)
         ├─ Validar publicación (panel de errores/advertencias)
         ├─ Historial de sustituciones (tabla)
         └─ Exportar (JSON/CSV)
```

### Implementador (uso principal: teléfono en tienda)

```
Selector de tienda
└─ Listado de planogramas publicados de la tienda (filtro por departamento)
   └─ Vista de estructura (solo lectura, góndolas/niveles/posiciones activas)
      └─ Detalle de posición (imagen, marca, precio, instrucciones de montaje)
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
| PANT-01-01 | Listado de planogramas | Analista / Implementador | Buscar y filtrar planogramas por área, departamento, estado; acceder al detalle | CU-01-04 | `GET /planogramas` | Nueva | Tabla de datos, filtros en cascada, buscador, badge de estado |
| PANT-01-02 | Crear planograma | Analista | Formulario: nombre, área→departamento (cascada CATI), subcategorías (chips) | CU-01-01 | `GET /jerarquia/areas`, `GET /jerarquia/departamentos`, `POST /planogramas` | Nueva | Selector en cascada, chip input |
| PANT-01-03 | Editar planograma | Analista | Mismo formulario que crear, pre-poblado, partial update | CU-01-02 | `PATCH /planogramas/{id}` | Nueva | Igual a PANT-01-02 |
| PANT-01-04 | Detalle de planograma | Analista / Implementador | Metadatos + subcategorías + tabla de versiones con estado/tiendas/conteos; hub de acceso a versiones | CU-01-05, CU-02-06 | `GET /planogramas/{id}`, `GET /planogramas/{id}/versiones` | Nueva | Tabla de versiones, badges de estado, acciones condicionadas al estado |
| ACC-01-05 | Confirmar archivar planograma | Analista | Modal de confirmación; advierte si hay versiones publicadas con tiendas asignadas | CU-01-03 | `POST /planogramas/{id}/archivar` | Nueva | ConfirmDialog con resumen de impacto |

### 3.2 Versiones (módulo 02)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| ACC-02-01 | Crear versión | Analista | Modal: tipo (GRANDE/MEDIANA/EXPRESS), notas | CU-02-01 | `POST /planogramas/{id}/versiones` | Nueva | Modal simple con select + textarea |
| ACC-02-02 | Crear versión especial por tienda | Analista | Wizard corto: elegir versión base + tienda (filtrada: mismo tipo, sin versión especial ya derivada); advierte que clona toda la estructura | CU-02-02 | `POST /planogramas/{id}/versiones` (`versionBaseId`, `tiendaId`) | Nueva | Selector de tienda con filtro, aviso de operación pesada |
| PANT-02-03 | Detalle de versión / Editor | Analista / Implementador | Ver la versión completa (ver 3.3) | CU-01-05 | `GET /versiones/{id}`, `GET /versiones/{id}/estructura` | Nueva | Ver Editor de planograma (3.3) |
| ACC-02-04 | Promover a piloto | Analista | Modal: selector multi-tienda para asignar como piloto | CU-02-03 | `POST /versiones/{id}/promover` | Nueva | Multi-select de tiendas (checkboxes) |
| ACC-02-05 | Publicar versión | Analista | Modal: corre validación, muestra resumen de errores/advertencias antes de confirmar; archiva automáticamente la versión publicada previa | CU-02-04 | `GET /versiones/{id}/validar-publicacion`, `POST /versiones/{id}/promover` | Nueva | Panel de validación + ConfirmDialog |
| PANT-02-06 | Tiendas asignadas a la versión | Analista | Panel de dos columnas: tiendas asignadas / disponibles, agregar-quitar | CU-02-05 | `GET/PUT /versiones/{id}/tiendas` | Nueva | Lista de doble panel con transferencia |

### 3.3 Editor de planograma — Góndolas, niveles y posiciones (módulos 03/04/05)

Esta es la pantalla más grande del sistema: visualización tipo cuadrícula (filas = niveles de abajo
hacia arriba, columnas = posiciones), con separadores sutiles entre módulos físicos de góndola.
Reutiliza el patrón visual de `EditorView`/`shelf`/`planogram-cell` del prototipo actual, pero
necesita evolucionar de "una góndola sintética" a soportar múltiples góndolas reales por versión,
con persistencia real y las validaciones de la tabla de la sección 4.2 de `FEATURE_editar_planograma.md`.

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-03-01 | Editor de planograma (vista principal) | Analista | Cuadrícula de góndolas/niveles/posiciones; drag&drop; barra de capacidad en tiempo real por nivel; toolbar (guardar, publicar, exportar, deshacer/rehacer, historial de sustituciones) | CU-04-03, CU-04-07, CU-04-10 | `GET /versiones/{id}`, `GET /versiones/{id}/capacidad`, `PATCH /posiciones/{id}/mover`, `PATCH /versiones/{id}/guardar` | Adaptar (`EditorView`) | PlanogramGrid, CapacityBar, Toolbar, Toast |
| ACC-03-02 | Agregar/editar góndola | Analista | Modal: nombre, ancho/alto/profundidad, posición en tienda | CU-03-01, CU-03-02 | `POST/PATCH /versiones/{id}/gondolas`, `/gondolas/{id}` | Nueva | Modal con inputs numéricos + recálculo en cascada |
| ACC-03-03 | Confirmar eliminar góndola/nivel | Analista | Modal con resumen de conteos (niveles/posiciones afectadas); variante simple si está vacío | CU-03-04, CU-03-08 | `GET /gondolas/{id}/resumen`, `GET /niveles/{id}/resumen`, `DELETE` | Nueva | ConfirmDialog con resumen de impacto (reusar de ACC-01-05) |
| ACC-03-04 | Agregar/editar nivel | Analista | Modal: orden, altura desde piso (manual), tipo y código de accesorio, ancho disponible, notas; advertencia no bloqueante si cambia el tipo con posiciones existentes | CU-03-05, CU-03-06 | `POST/PATCH /gondolas/{id}/niveles`, `/niveles/{id}` | Nueva | Modal con selector de accesorio (`GET /accesorios`) |
| PANT-03-05 | Panel de edición de posición | Analista | Drawer/modal lateral con secciones: Producto, Espacio y facings, Capacidad, Reposición, Montaje, Clasificación, Desborde (ver detalle de campos en `FEATURE_editar_planograma.md` §4) | CU-04-01, CU-04-02, CU-04-08 | `POST/PATCH /niveles/{id}/posiciones`, `/posiciones/{id}` | Nueva | PositionEditorPanel (secciones colapsables), buscador de producto |
| ACC-03-06 | Gestor de accesorios de montaje de posición | Analista | Sub-sección del drawer de posición: lista editable de accesorio + nota libre | CU-04-09, CU-04-11 | `GET/POST/DELETE /posiciones/{id}/accesorios` | Nueva | AccessoryPicker + lista editable |
| ACC-03-07 | Reordenar góndolas / niveles | Analista | Drag&drop de reordenamiento (lista de góndolas o de niveles) | CU-03-03, CU-03-07 | `PATCH .../reordenar` | Nueva | Lista reordenable (misma interacción que drag&drop de posiciones) |

### 3.4 Sustitución de SKUs (módulo 06)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-04-01 | Sustitución de SKU — paso 1: alcance | Analista | Selecciona una o más posiciones con el mismo SKU (desde el editor); confirma cuántas posiciones se verán afectadas | CU-05-01 | `GET /posiciones/por-sku` | Nueva | Wizard (paso 1/3), lista de posiciones afectadas |
| PANT-04-02 | Sustitución de SKU — paso 2: sustituto | Analista | Buscador de catálogo con el `sku_sustituto` recomendado resaltado; alerta si las dimensiones difieren &gt;20% | CU-05-02 | `GET /catalog/productos/buscar` | Nueva | Wizard (paso 2/3), buscador de catálogo (reusar `search-box`) |
| PANT-04-03 | Sustitución de SKU — paso 3: confirmar | Analista | Motivo obligatorio (≥10 caracteres) + confirmación; recalcula ancho/unidades derivadas | CU-05-03 | `POST /versiones/{id}/sustituciones` | Nueva | Wizard (paso 3/3), textarea validado |
| PANT-04-04 | Historial de sustituciones | Analista | Tabla: SKU original → sustituto, motivo, fecha, usuario, posiciones afectadas | CU-05-04 | `GET /versiones/{id}/sustituciones` | Nueva | Tabla de datos paginada |

### 3.5 Publicación y exportación (módulo 07)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| ACC-05-01 | Guardar borrador | Analista | Acción directa desde el toolbar del editor, sin pantalla propia | CU-06-01 | `PATCH /versiones/{id}/guardar` | Adaptar (botón "Guardar" ya existe) | Toast de confirmación |
| PANT-05-02 | Panel de validación pre-publicación | Analista | Lista de errores bloqueantes (impiden publicar) y advertencias (no bloquean), con enlace directo a la posición/nivel afectado | CU-06-02 | `GET /versiones/{id}/validar-publicacion` | Nueva | Lista de alertas con severidad (ver gap de color en §6) |
| ACC-05-03 | Exportar planograma | Analista | Menú/modal con opciones JSON / CSV, dispara descarga | CU-06-03, CU-06-04 | `GET /versiones/{id}/exportar/json`, `/csv` | Adaptar (export ya existe en `EditorView`) | Menú de acciones |

### 3.6 Consulta para implementadores (módulos 02/05/10)

| Código | Pantalla | Actor | Propósito | CU | Endpoints | Estado | Componentes clave |
|---|---|---|---|---|---|---|---|
| PANT-06-01 | Selector de tienda | Implementador | Elegir explícitamente la tienda al abrir la app (no se infiere del JWT) | CU-07-01 | `GET /tiendas` | Nueva | Buscador/lista de tiendas, mobile-first |
| PANT-06-02 | Listado de planogramas de la tienda | Implementador | Planogramas publicados, filtro por departamento; mensaje vacío si no hay asignados | CU-07-01 | `GET /tiendas/{id}/planogramas` | Nueva | Lista de tarjetas, mobile-first |
| PANT-06-03 | Vista de estructura (solo lectura) | Implementador | Góndolas/niveles/posiciones activas, sin campos de control (`min_final`/`max_final` ocultos) | CU-07-01 | `GET /versiones/{id}/estructura?vistaImplementador=true` | Adaptar (grid visual de `EditorView`, en modo solo-lectura) | PlanogramGrid (modo lectura) |
| PANT-06-04 | Detalle de posición (implementador) | Implementador | Imagen, nombre, marca, precio (vía CATI), facings, accesorios de montaje, notas de desborde/observaciones; modo degradado si CATI no responde | CU-07-02 | `GET /posiciones/{id}/detalle` | Adaptar (`ProductPreview`, modo `construction` ya existe) | ProductPreview (modo implementador) |

### 3.7 Piloto de captura por foto — ya construido (CU-08, fuera del MVP formal)

| Código | Pantalla | Actor | Estado real | Notas |
|---|---|---|---|---|
| PILOTO-01 | Captura (`CaptureView`) | Analista | Funcional | Plan de fotos por mueble, análisis real de calidad en navegador |
| PILOTO-02 | Revisión (`ReviewView`) | Analista | Simulado | Detecciones fabricadas por similitud de catálogo, no por contenido real de foto; mantener etiqueta de modo demo |
| PILOTO-03 | Editor (`EditorView` prototipo) | Analista | Funcional, no persiste | Candidato a fusionarse o coexistir con PANT-03-01 — decisión de producto pendiente |
| PILOTO-04 | Performance (`PerformanceView`) | Analista/Comprador | Sintético | Debe mantenerse aislado de Captura/Revisión/Editor; no está en el alcance de los módulos 01-11 |

---

## 4. Inventario de componentes

### 4.1 Componentes existentes en `main.jsx` — reusar tal cual o con datos reales

| Componente | Uso actual | Reuso propuesto |
|---|---|---|
| `ProductPack` | Tarjeta compacta de producto en la cuadrícula (imagen, marca, nombre, GTIN, placeholder "sin match") | Igual, en PANT-03-01 y PANT-06-03 |
| `ProductPreview` | Modal de detalle de producto (modo `construction` vs `performance`) | Base para PANT-06-04 (detalle de posición) y para el buscador de catálogo en PANT-04-02 |
| `Metric` | Icono + label + valor (KPI) | Reusar en cabeceras de listados (conteos) y en el panel de validación |
| `PhotoQualityCard` | Badge de estado ok/warning/checking con checks | Reusar patrón de "badge con detalle" para el panel de validación pre-publicación (PANT-05-02) |
| Toast | Notificación flotante inferior | Reusar para confirmaciones de guardar/mover/eliminar en todo el MVP formal |
| `.step` / `.workflow` (tabs numerados) | Navegación entre Captura/Revisión/Editor/Performance | Adaptar como componente de **Wizard genérico** para PANT-04-01/02/03 (sustitución) y ACC-02-02 (versión especial por tienda) |
| `.catalog-panel` / `.catalog-list` / `.search-box` | Buscador de catálogo en el editor prototipo | Reusar en el buscador de producto de PANT-03-05 y PANT-04-02 |
| `shelf` / `shelf-row` / `planogram-cell` | Cuadrícula de niveles/posiciones | Base de `PlanogramGrid`, extender con: separador de módulo físico, barra de capacidad, drag&drop real a backend |
| `.performance-cell` (heatmap con variable `--heat`) | Mapa de calor de ventas | Patrón reutilizable para **CapacityBar** (intensidad = % ocupado del nivel) |

### 4.2 Componentes nuevos requeridos (no existen hoy en el prototipo)

| Componente | Pantallas que lo usan | Por qué es nuevo |
|---|---|---|
| **Tabla de datos** (columnas, orden, paginación) | Listado de planogramas, tabla de versiones, historial de sustituciones, listado de tiendas | El prototipo actual solo usa listas de tarjetas (`catalog-list`, `detected-list`); no existe un patrón de tabla tabular con encabezados/orden/paginación |
| **ConfirmDialog con resumen de impacto** | Archivar planograma, eliminar góndola/nivel, publicar versión | Hoy no hay ningún diálogo de confirmación en el prototipo; varios casos de uso lo requieren explícitamente con conteos (`resumen`) antes de confirmar |
| **Selector en cascada** (Área → Departamento) | Crear/editar planograma | No existe hoy; los datos vienen de CATI vía `/jerarquia/areas` y `/jerarquia/departamentos` |
| **Multi-select con checkboxes** (tiendas) | Promover a piloto, tiendas asignadas a versión | No existe hoy un patrón de selección múltiple con checkboxes |
| **Wizard genérico de pasos** | Sustitución de SKU (3 pasos), versión especial por tienda | El componente `.step`/`.workflow` existe pero está atado a las 4 vistas fijas del piloto; requiere generalizarse a N pasos configurables |
| **PositionEditorPanel** (drawer con secciones colapsables) | Panel de edición de posición | Es el componente más grande y nuevo: agrupa ~7 secciones de atributos (producto, espacio/facings, capacidad, reposición, montaje, clasificación, desborde) descritas en `FEATURE_editar_planograma.md` §4; nada parecido existe en el prototipo (que solo edita SKU y facings desde la barra lateral) |
| **AccessoryPicker** | Gestor de accesorios de montaje (posición y nivel) | No existe hoy selector de accesorios; el catálogo de accesorios (`GET /accesorios`) es nuevo |
| **CapacityBar / indicador de capacidad por nivel** | Editor de planograma, panel de posición | El prototipo no calcula capacidad real contra ancho disponible; es cálculo nuevo derivado de `GET /versiones/{id}/capacidad` |
| **Panel de alertas por severidad** (error bloqueante vs. advertencia) | Validación pre-publicación, edición de posición (desborde, min&gt;max) | Ver gap de color en §5 — hoy no hay distinción visual clara entre "bloqueante" y "advertencia" |
| **Breadcrumbs** (Planograma › Versión › Góndola) | Todas las pantallas anidadas del Analista | El prototipo es de navegación plana (4 tabs); el MVP formal tiene jerarquía profunda que necesita orientar al usuario |
| **Selector de tienda para implementador** | PANT-06-01 | Flujo nuevo, mobile-first, sin equivalente en el prototipo actual |

### 4.3 Sistema visual a mantener (design tokens de `styles.css`)

- **Paleta**: fondo azul marino (`#080f3f`, gradiente `#060d35→#0a1250→#111a64`), acento lima `--lime:
  #9be000` (CTAs, estados activos/éxito), texto `#f7f8ff` con `--muted: #aeb8e8` para texto secundario,
  ámbar `#ffcf5b` para advertencias.
- **Radios**: `8px` en paneles/botones/inputs; `999px` en pills/badges/círculos de paso.
- **Tipografía**: Inter, `font-weight: 500` base, `850` en elementos destacados (CTAs, eyebrows).
- **Botones**: `.primary` (fondo lima), `.secondary` (blanco translúcido 8%), `.icon-btn`; `min-height:
  42px`, transición `transform/border-color/background/box-shadow`, `active: scale(0.98)`.
- **Layout**: contenedor `min(1480px, calc(100vw - 32px))`; grids de 2 columnas (sidebar 310px + panel
  principal) que colapsan a 1 columna en `≤1100px`; barra de navegación se vuelve fija inferior en
  `≤680px`.
- **Componentes de tarjeta**: borde `rgba(255,255,255,0.12)` + fondo `rgba(255,255,255,0.06)` +
  `border-radius: 8px`, patrón repetido en todos los paneles (`.control-panel`, `.fixture-card`,
  `.quality-list`, `.selection-card`).

---

## 5. Gaps de diseño detectados (a resolver antes o durante el diseño visual)

- **No hay un color de error real distinguible de advertencia.** El sistema actual solo tiene lima
  (éxito/activo) y ámbar (advertencia); un coral aparece una sola vez (`.performance-cell.danger`).
  `FEATURE_editar_planograma.md` exige distinguir explícitamente **error bloqueante** (ej. `min_final
  > max_final`, SKU inactivo) de **advertencia no bloqueante** (ej. desborde, capacidad insuficiente) —
  se necesita un tercer color/tratamiento dedicado a "bloqueante".
- **No existe patrón de tabla de datos.** Los listados nuevos (planogramas, versiones, historial de
  sustituciones, tiendas) requieren tabla con columnas/orden/paginación; el prototipo solo resuelve
  listados como tarjetas verticales.
- **No existe patrón de confirmación con impacto.** Varios casos de uso (archivar, eliminar góndola/
  nivel) requieren mostrar un resumen de conteos antes de confirmar una acción destructiva.
- **No existe selector en cascada ni multi-select.** Ambos son necesarios desde la primera pantalla
  (crear planograma) y no tienen equivalente visual hoy.
- **Reconciliación Editor piloto vs. Editor MVP formal.** `PILOTO-03` y `PANT-03-01` son, en la
  práctica, la misma idea de pantalla en dos estados de madurez distintos (datos embebidos/no
  persistentes vs. backend real). Antes de diseñar hay que decidir si son la misma pantalla que
  evoluciona o dos productos separados — ver nota en `REUNION_TECNICA.md` sobre la discrepancia entre
  el backend documentado (SQL Server/Node hexagonal) y la arquitectura objetivo de integraciones
  (n8n + Postgres).
- **Modelo de permisos/roles no está definido.** No hay pantalla de login ni lógica de roles
  (Analista vs. Implementador) más allá de la mención a JWT de Entra ID "pendiente" — afecta el diseño
  del punto de entrada de la app y de qué acciones se muestran/ocultan.
- **Mobile-first solo aplica hoy al piloto de captura.** Las pantallas del Analista (MVP formal) son
  de uso principalmente de escritorio (edición densa de datos); las del Implementador (consulta) son
  mobile-first. Definir breakpoints y densidad de información por separado para cada perfil.
