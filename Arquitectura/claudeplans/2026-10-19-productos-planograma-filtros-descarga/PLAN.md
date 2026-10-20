# PLAN — Filtro Área › Departamento y descarga `.xlsx` en Productos por planograma

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Fuentes: `00_solicitud.md` (las "Preguntas resueltas" mandan), `01_arquitectura.md`, `02_diseno_ux.md`,
> `02_seguridad.md`. Rama `feat/productos-planograma-filtros-descarga`, commit base `b34524e`. Tamaño M.

## Objetivo

En **Productos → Por planograma** (`/por-version`, `front/src/pages/ProductosPorVersion/`) el Analista podrá
filtrar la tabla por **Área › Departamento** (jerarquía CATI, en servidor) y **descargar** un `.xlsx` con los SKU
de las versiones elegidas, respetando versiones, jerarquía, búsqueda y filtros por columna, en dos formatos:
**Lista** (una fila por SKU–versión–modo) y **Pivote por versión** (una fila por SKU–planograma–estado–modo con
bloques TG / TM / TE reimportables como Excel de categorías). La tabla en pantalla no cambia de granularidad
(sigue una fila por posición). Casos de uso nuevos: **CU-10-05** (consultar productos por planograma con
jerarquía) y **CU-10-06** (descargar productos por planograma).

## Decisiones

| # | Decisión | Razón |
|---|---|---|
| D1 | La tabla sigue con **una fila por posición**; la agregación SKU–versión–modo existe solo en el archivo. | P1. |
| D2 | Modos: **Planograma, Cross, Impulso** (el "consolidado" de la solicitud es Cross). Se excluyen posiciones sin SKU y `PENDIENTE`. | P2; misma regla que el consolidado (`construirFilasPorVersion`). |
| D3 | **Regla P6 (filas pantalla ↔ archivo)**: el front envía los **`posicionIds` de las filas que quedan visibles** tras la búsqueda y los filtros por columna, **solo cuando hay alguno activo** (sin filtros de cliente el campo se omite). El servidor calcula su propio universo (`versionIds` ∩ jerarquía CATI) e **intersecta** con esos ids; ids ajenos al universo se descartan sin error. Una fila agregada (versión–SKU–modo) entra si **al menos una** de sus posiciones pasó, y **todas sus columnas agregadas** (ubicaciones, facings, capacidades, ganchos, accesorios, `Varía`) se calculan **solo con las posiciones que pasaron**. La numeración de ganchos se sigue calculando con la versión completa (`recorrerVersion` antes de filtrar). | Es lo más simple y seguro: el servidor no reimplementa la búsqueda ni los 20+ filtros por columna (sin deriva tipo DT-43, sin ReDoS, sin lista blanca de claves, sin necesitar `tiendaId` para filtros de inventario), el cliente solo puede **acotar**, y "lo que ves es lo que descargas". |
| D4 | Por D3 el endpoint de exportación es **`POST /api/v1/implementacion/productos/exportar`** con cuerpo JSON (no query string): hasta 30 000 ids no caben en una URL. Límite de cuerpo propio de 512 kb. Los ids **nunca** se pasan a SQL: la base se carga por `versionIds` (≤ 50) y se intersecta en memoria. | B5 de seguridad; límite de URL y de 2 100 parámetros de SQL Server. |
| D5 | Jerarquía del listado y de la descarga: solo **Área** y **Departamento**; `departamento` exige `area`; ambos se validan con `PATRON_JERARQUIA` y contra los catálogos cacheados de CATI (`obtenerAreas`, `obtenerDepartamentos(area)`); código inexistente o departamento de otra área → 400. CATI caído → 503 **sin** datos sin filtrar. El nivel que se filtra es el más específico. | B3, I2. |
| D6 | **Área y Departamento por SKU en la Lista** (P3) salen de `Producto.categoria_nivel1/2` (copiados de CATI `erpInformation.area/departamento` al registrar el SKU). No se consulta CATI por SKU. El contrato lo dice explícitamente ("dato de CATI registrado en el SKU"). | I3: sin fan-out a CATI; invertir la jerarquía completa en vivo costaría decenas de paginaciones. Se registra deuda por posible desfase (DT nueva). |
| D7 | **Pivote**: clave de fila = SKU + planograma + **estado de la versión** + modo (P5). Bloques en orden **TG, TM, TE** (GRANDE → TG, MEDIANA → TM, EXPRESS → TE). Encabezados del Excel de categorías (`Facings_TG`, …) para poder reimportar (P4). | P4, P5. |
| D8 | Validación del Pivote en el **dominio del back** (`validarPivote`): versiones especiales de tienda (`version_base_id` no nulo, `esEspecial`) se **excluyen** y se reportan; si todas las elegidas son especiales → 422; versión no especial sin `tipo` → 422; dos versiones no especiales del mismo planograma + tipo + estado → 422. Todo con `422 PIVOTE_NO_APLICABLE`. El front replica la regla solo para avisar. | B8. |
| D9 | Ambos formatos llevan una hoja fija **`Versiones`** (después de la hoja principal) con cada versión elegida: incluida sí/no y motivo. La hoja principal va **primera** (el lector de categorías lee la primera hoja). | B8; trazabilidad; reimportación. |
| D10 | Orden del Pivote determinista: SKU → nombre del planograma → estado (publicado, piloto, en_desarrollo, borrador) → modo (Planograma, Cross, Impulso). Lista: SKU → código de versión → modo. | B7(a): al reimportar gana la primera fila del SKU. |
| D11 | En el Pivote, una cantidad con valores distintos entre las posiciones del grupo se escribe como texto `Varía` (el lector la rechaza: falla segura). Nunca se sustituye por el primer valor. | B7(b). |
| D12 | Un único semáforo de 1 para **todas** las exportaciones `.xlsx` del proceso (`application/compartido/semaforo.js` → `semaforoExportacion`), usado por el consolidado y por planograma. En la exportación nueva se toma **después** de resolver CATI y **antes** de `cargarBaseVersiones`; se libera en `finally`. El orden del consolidado no cambia (DT-53 sigue abierta). | B9; no retener el semáforo durante la paginación de CATI (~10 s). |
| D13 | Limitadores: exportación con instancia propia `exportacionPorVersionLimiter` (5/min por usuario); listado `GET /implementacion/productos` con `productosPorVersionLimiter` (60/min por usuario). | M2, I1. |
| D14 | Columnas **fijas** por formato (sin selector de columnas). La exportación no incluye inventario ni acepta `tiendaId`. | 01 §7; D3 ya cubre los filtros de inventario vía `posicionIds`. |
| D15 | `ProductosVersiones` (compartido con el Implementador) recibe **una sola prop opcional nueva** `onFilasFiltradas`. El Implementador no la pasa: su vista no cambia. | P6 exige saber qué filas pasan los filtros, y el estado de búsqueda/filtros vive dentro de ese componente. Se prefiere esto a subir el estado de filtros a la página. |
| D16 | Estado de la jerarquía local a la página (no en la URL), como en el consolidado. | 02_diseno_ux §3. |
| D17 | `IconoDescarga` se extrae a `front/src/components/ui/IconoDescarga/` y lo usan consolidado y por planograma (se aprueba junto con este PLAN). | Evita copiar el SVG; 02_diseno_ux §8. |
| D18 | Nombre del archivo: `productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx`, construido solo con el formato enumerado y la fecha. | I5. |

## Fuera de alcance

- Cambiar la granularidad de la tabla en pantalla.
- CSV u otros formatos; selector de columnas en la descarga; inventario en el archivo.
- Familia, categoría y subcategoría en este filtro (solo Área y Departamento).
- Vista del Implementador (no cambia).
- Mover el semáforo del consolidado antes de la carga (DT-53), Joi estricto en todo el listado del módulo 16
  (DT-46; aquí solo `area`/`departamento`), `ganchosPorPosicion` en serie y `accesoriosDePosiciones` (deuda nueva).
- Aviso en el importador cuando el archivo mezcla estados (deuda nueva).
- Propuestas al sistema de diseño marcadas "requieren aprobación".

## Contratos

### C1 — Modificado: `GET /api/v1/implementacion/productos`

Permiso: Analista (regla A, `requiereAnalista`, DT-11). Middlewares: `requiereAnalista → productosPorVersionLimiter → controller`.

Query nueva (el resto igual: `versionIds` csv 1–50, `tiendaId` opcional):

| Parámetro | Regla |
|---|---|
| `area` | opcional; `^[A-Za-z0-9_-]{1,20}$`; vacío o arreglo → 400; debe existir en `obtenerAreas()` → si no, 400. |
| `departamento` | opcional; mismo patrón; exige `area` (si no, 400); debe existir en `obtenerDepartamentos(area)` → si no, 400. |

Semántica: con jerarquía se resuelve `catalogo.listarSkusPorJerarquia(nivel, id)` (nivel más específico) **antes**
de leer posiciones; `data` y `total` quedan filtrados a esos SKU (`total === data.length`); el inventario (si hay
tienda) se consulta solo con los SKU filtrados. `versiones[]` (resumen) **no** se filtra. Sin jerarquía no se
llama a CATI.

Errores nuevos: `400 VALIDATION_ERROR` (jerarquía mal formada o inexistente), `429 RATE_LIMITED`,
`503 SERVICE_UNAVAILABLE` (CATI).

### C2 — Nuevo: `POST /api/v1/implementacion/productos/exportar`

Permiso: Analista (regla A). Middlewares, en este orden: `express.json({ limit: '512kb' })` (montado en `app.js`
para esta ruta antes del parser global) → `requiereAnalista` (router) → `validarCuerpo(schemaExportar)` →
`exportacionPorVersionLimiter` → `controller.exportar`. 403 sale antes que 400.

Cuerpo (Joi estricto, `validarQueryEstricta` sobre `{ ...req.body }`; clave desconocida → 400):

```json
{
  "versionIds": [12, 15],          // requerido; enteros positivos seguros, únicos, 1..50
  "formato": "LISTA",              // requerido; "LISTA" | "PIVOTE"
  "area": "A01",                   // opcional; como en C1
  "departamento": "D05",           // opcional; exige area; como en C1
  "posicionIds": [881, 882]        // opcional; enteros positivos seguros, únicos, 0..30000 (D3)
}
```

Reglas (orden de evaluación):
1. Versiones: `repo.listarVersiones({ estados: [], incluirIds: versionIds })`; faltantes → `404 NOT_FOUND` con `details.versionIds`.
2. `PIVOTE` → `validarPivote(versiones)` → `422 PIVOTE_NO_APLICABLE` con
   `details: { sinTipo: number[], duplicadas: [{ planogramaId, tipo, estado, versionIds }], soloEspeciales: boolean }`.
3. Jerarquía: validación contra catálogos (400) y `listarSkusPorJerarquia` (503 si falla).
4. `semaforoExportacion.intentarTomar()` → si no, `503 EXPORTACION_EN_CURSO`.
5. `repo.cargarBaseVersiones(versionIds)` → `construirFilasPorVersion(base, { estados: todos, skus, posicionIds })`.
6. `contarFilas` > `env.consolidado.exportacionMaxFilas` → `422 EXPORTACION_DEMASIADO_GRANDE` con `details: { filas, maximo }`; `escribirLibro` no se llama.
7. `escribirLibro(hojas)` → liberar semáforo en `finally`.

Respuesta 200: binario; cabeceras fijadas **solo después** de tener el `Buffer`:
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`Content-Disposition: attachment; filename="productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx"`,
`Cache-Control: no-store`, `Content-Length`. Con 0 filas → libro con encabezados y hoja `Versiones` (200).

Errores (JSON `{ error: { code, message, details? } }`, nunca archivo truncado): `400 VALIDATION_ERROR`, `401`,
`403 FORBIDDEN`, `404 NOT_FOUND`, `422 PIVOTE_NO_APLICABLE`, `422 EXPORTACION_DEMASIADO_GRANDE`, `429 RATE_LIMITED`,
`503 SERVICE_UNAVAILABLE` (CATI), `503 EXPORTACION_EN_CURSO`, `500 INTERNAL_ERROR`.

Log único: `[implementacion] exportacion numeroEmpleado=… formato=… versiones=N filtroCliente=si|no filas=… ms=…`
(sin ids, sin códigos de jerarquía, sin token).

Instantánea no transaccional (M1): 6 lecturas sin transacción; una edición concurrente puede dejar una posición
fuera. Se documenta en el contrato.

### C3 — Libro

**Hoja `Lista`** (primera). Fila 1 = encabezados, congelada. Columnas en este orden:
SKU · Producto · Área · Departamento · Planograma · Versión · Tipo (TG/TM/TE) · Estado de la versión ·
Especial de tienda (Sí/No) · Modo · Góndola · Sección · Nivel · Posición en nivel · Ganchos · Accesorio de montaje ·
Montaje · Facing horizontal · Cantidad apilable · Capacidad del facing · Capacidad máxima · Mín. estético ·
Mín. final · Máx. final · Perfil de redondeo · Decisión · Observaciones · SKU sustituto.
Las celdas comparten el texto de `COLUMNAS_CONSOLIDADO` (`back/src/domain/consolidado/columnas.js`) donde existe
la misma clave. Estados: Borrador, En desarrollo, Piloto, Publicada.

**Hoja `Pivote por versión`** (primera). Fila 1 = grupo (título `TG`, `TM`, `TE` combinado con `columnSpan` sobre su
bloque; vacía sobre las comunes); fila 2 = encabezados; congeladas 2 filas y las 6 columnas comunes.
- Comunes (encabezados exactos): `SKU` · `Descripcion` · `Nombre_planograma` · `Estado_version` · `Modo` · `SKU_sustituto`.
  (`Nombre_planograma`, `Estado_version` y `SKU_sustituto` no son campos del lector: se ignoran al reimportar.)
- Bloque por sigla `S` ∈ TG, TM, TE (encabezados exactos, en este orden):
  `Planograma_S` (código de la versión) · `Facings_S` · `Cantidad_x_facing_S` · `Cantidad_facing_vertical_S` ·
  `Min_estetico_S` · `Capacidad_maxima_S` · `Nombre_accesorio_S` · `Tamano_accesorio_S` · `Perfil_redondeo_S` ·
  `Min_final_S` · `Max_final_S` · `Decision_final_S` · `Observaciones_S` · `S1` … `Sn`
  (n = máximo de ganchos de una fila en ese bloque; 0 columnas si ningún SKU tiene ganchos).
- Valores: `Modo` = `Planograma|Cross|Impulso`; `Decision_final` = `ACTIVO|INACTIVO`; `Perfil_redondeo` = `MRP|ZSRE`;
  `Facings` = suma (número); `Capacidad_maxima` = suma o vacío si alguna es nula; `Cantidad_x_facing`
  (`unidades_por_facing`), `Cantidad_facing_vertical` (`cantidad_apilable`), `Min_estetico`, `Min_final`,
  `Max_final`: número si es único, `Varía` si difiere (D11); `Perfil_redondeo`/`Decision_final`: valor único o `Varía`;
  `Nombre_accesorio` = códigos distintos unidos con ` // `; `Tamano_accesorio` = tamaños `22"` unidos con ` // ` si
  todos los accesorios tienen tamaño, vacío si ninguno, `Varía` si unos sí y otros no; ganchos = un gancho por
  columna (número si es normal, texto `54E` si es de exhibición), en el orden de las ubicaciones.
- Bloque vacío si el SKU no está con ese modo en la versión de ese tipo y estado.

**Hoja `Versiones`** (segunda en ambos formatos): Id · Código · Planograma · Tipo · Estado · Especial de tienda ·
Incluida (Sí/No) · Motivo (`Especial de tienda: no va en el Pivote` o vacío).

Anchos (caracteres): SKU 14, Producto/Descripcion 36, Planograma 28, Versión 18, Tipo 8, Estado 14, Modo 12,
ubicaciones 14, numéricas 12, Observaciones 40.

### C4 — Tipos TS del front

```ts
// front/src/types/implementacion.ts
export type FormatoDescargaPorVersion = 'LISTA' | 'PIVOTE';
export interface CuerpoExportacionPorVersion {
  versionIds: number[];
  formato: FormatoDescargaPorVersion;
  area?: string;
  departamento?: string;
  posicionIds?: number[];
}
```

## Datos

Sin cambios de BD. Sin migración (la siguiente libre sigue siendo `019`). Lecturas sobre `PlanogramaVersion`
(`tipo`, `estado`, `planograma_id`, `version_base_id`), `Planograma`, `Gondola`, `Seccion`, `Nivel`, `Posicion`,
`PosicionAccesorio`, `Accesorio`, `Producto` (`nombre`, `marca`, `sku_sustituto`, `categoria_nivel1`,
`categoria_nivel2`). Índices de la `017` cubren `planograma_version_id IN (…)`. Retrocompatible: el listado sin
`area`/`departamento` responde igual que hoy.

## Seguridad (controles obligatorios — bloqueantes)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| B1 | Ruta nueva bajo `requiereAnalista`; orden `requiereAnalista → validarCuerpo → limitador → controller`; 403 antes que 400. | `implementacion.routes.js` | `back/test/http/rutasProtegidas.test.js` (sin token → 401); `back/test/http/matrizPermisos.test.js` fila nueva (solo-implementador → 403, también con cuerpo inválido; analista pasa). |
| B2 | Cuerpo estricto: `versionIds` 1–50 únicos y seguros; `formato` enumerado; `area`/`departamento` con patrón; `posicionIds` ≤ 30 000 únicos; clave desconocida → 400. El controller usa el valor devuelto por Joi. | `implementacion.schemas.js` | `back/test/application/implementacionSchemas.test.js` (casos de T7). |
| B3 | Jerarquía validada antes de CATI; CATI caído → 503 sin datos sin filtrar (listado y exportación). | usecases | `back/test/domain/implementacionUsecases.test.js`. |
| B4/B5 | El cliente solo acota: universo = `versionIds` ∩ jerarquía calculado en servidor; `posicionIds` solo intersecta; ids ajenos se descartan; ningún dato del cliente se escribe en el archivo; regla D3 fijada con fixture de 3 posiciones. | `consolidado.entity.js`, usecases | `back/test/domain/consolidado.test.js`, `implementacionUsecases.test.js`. |
| B6 | `construirFilasPorVersion` sin opciones = solo montables (el consolidado no cambia). | `consolidado.entity.js` | `consolidado.test.js`; `consolidadoUsecases.test.js` y `consolidadoRutas.test.js` verdes sin cambios. |
| B7 | Pivote reimportable: orden D10, números como `numero`, `Varía` donde difiere, `Modo`/`Decision_final` reconocidos, comunes ignorados por el lector; literal de encabezados idéntico en back y front. | `columnasExportacion.js`, `exportacionPorVersion.entity.js` | `back/test/domain/exportacionPorVersion.test.js` + `front/src/utils/excelProductosPlanograma.test.ts`. |
| B8 | `validarPivote` en dominio; especiales excluidas y reportadas en hoja `Versiones`; solo especiales → 422. | `exportacionPorVersion.entity.js` | `exportacionPorVersion.test.js`. |
| B9 | Semáforo único; tomado antes de `cargarBaseVersiones`; liberado en todo camino. | `application/compartido/semaforo.js`, usecases | `implementacionUsecases.test.js` (semáforo real `crearSemaforo(1)`), prueba de identidad de instancia. |
| B10 | Tope de filas antes de `escribirLibro`; cabeceras solo con `Buffer`; error nunca binario. | usecases, controller | `implementacionUsecases.test.js` (`maximoFilas = 1`), `back/test/http/implementacionExportar.test.js` (escribirLibro lanza → 500 JSON sin `Content-Disposition`). |
| I1 | Limitador 60/min en el listado. | routes, `rateLimit.js` | `back/test/http/rateLimitUsuario.test.js` (61.ª → 429). |
| I2 | Códigos de jerarquía existentes; departamento de otra área → 400; `listarSkusPorJerarquia` no llamado. | usecases | `implementacionUsecases.test.js`. |
| I3 | Sin llamadas a CATI por SKU. | usecases | Catálogo espía: llamadas acotadas e independientes del número de SKU. |
| I4 | Consultas Knex parametrizadas (`whereIn` / subconsulta), sin `raw` interpolado. | `baseVersiones.js` | Revisión del diff + `consolidadoUsecases.test.js` verde. |
| I5 | Nombre de archivo, hojas, encabezados y títulos de grupo son constantes; celdas por `construirCelda`/`sanear`, incluida la fila de grupo. | `libroXlsx.js`, dominio | `back/test/infrastructure/libroXlsx.test.js` (`=HYPERLINK(...)` → `String`; `\x07` eliminado); `nombreArchivo`. |
| I6 | Log sin datos de la petición (D-C2). | controller | Revisión del diff. |
| M3 | Front: botón solo en `ProductosPorVersion`; nombre del archivo armado en el front; `URL.revokeObjectURL`. | front | `descargaPorVersion.test.ts`. |

Pruebas de abuso A1–A21 de `02_seguridad.md` §3 aplican, con dos ajustes por D3/D4: A3/A4 se expresan sobre el
cuerpo JSON (arreglos repetidos/no numéricos/51 elementos → 400), A8–A10 se sustituyen por: `posicionIds` con 30 001
elementos, con `0`, `-1`, `"x"`, repetidos → 400; ids de posición de una versión no elegida → descartados (A11).

## UX (resumen para implementar)

- Ubicación: dentro de `controles` de `ProductosVersiones`, contenedor `productos-por-version__controles`
  (flex, `flex-wrap: wrap`, `justify-content: flex-end`, `gap: 12px`), dos filas:
  1. Selector de tienda existente + botón **Descargar** (`Button variante="outline"`, `IconoDescarga` + texto).
  2. `CadenaJerarquia niveles={2}` + hint (`<p className="productos-por-version__hint">`, 12px, `--fg-3`) solo con
     jerarquía activa: `El resumen por versión muestra la versión completa; la tabla solo los productos de {Área} › {Departamento}.`
     (con solo Área: `… de {Área}.`).
- Botón Descargar deshabilitado si no hay versiones elegidas o `productos` es `null`; `title="Elige al menos una versión para descargar."`.
- Vacío con jerarquía: título `Ningún producto de las versiones elegidas pertenece a esa jerarquía`, hint
  `Prueba con otra área o departamento, o quita la jerarquía.`
- Modal nuevo `DescargarProductosVersionModal` (`Modal ancho="lg"`), título **Descargar productos por planograma**;
  `radiogroup` `aria-label="Formato de la descarga"`, tarjetas:
  1. **Lista** (por defecto) — `Una fila por SKU, versión y modo de aparición (planograma, cross o impulso). Un SKU aparece una vez por cada versión en la que está; si está en planograma y en cross de la misma versión, son dos filas.`
  2. **Pivote por versión** — `Una fila por SKU, planograma, estado de la versión y modo. Tres bloques en horizontal (TG, TM y TE) con los mismos encabezados del Excel de categorías (por ejemplo Facings_TG), para poder volver a cargarlo. Las versiones especiales de tienda no se incluyen.`
- Resumen (caja `--ink-50`, 13px `--fg-2`): `Versiones: {n} · {cód}, {cód}, {cód}` (+ ` y {k} más`);
  `Alcance: {Área} › {Departamento}` o `Alcance: todas las áreas y departamentos`; si hay filtros de cliente:
  `Se aplican la búsqueda y los filtros de columna de la tabla.` Sin "filas estimadas".
- Aviso previo del Pivote (`pivoteAplicable`): la tarjeta no se deshabilita; con Pivote elegido y no aplicable el botón
  Descargar se deshabilita y se muestra `role="alert"` (estilo error):
  - sin tipo: `El Pivote necesita que todas las versiones tengan tipo (TG, TM o TE). Sin tipo: {códigos}.`
  - duplicadas: `Hay dos versiones del mismo planograma, tipo y estado: {código} y {código} ({planograma}, {tipo}). Quita una para descargar el Pivote.`
  - solo especiales: `Las versiones elegidas son todas especiales de tienda; el Pivote no las incluye. Usa la Lista.`
  - especiales parciales (no bloquea, `role="status"`, `--warning-bg`/`--warning`): `Las versiones especiales de tienda no se incluyen en el Pivote: {códigos}.`
- Generando: botón `Generando…` con spinner (`currentcolor`, `border-radius: 50%`, `prefers-reduced-motion`), radios y
  Cancelar deshabilitados, Esc y clic fuera ignorados.
- Éxito: cierra el modal, `Toast` success `Descarga lista: {archivo}`; foco vuelve al botón Descargar.
- Errores (función `mensajeErrorDescargaPorVersion`): 422 `PIVOTE_NO_APLICABLE` en el modal →
  `El Pivote no se puede generar con estas versiones. Revisa que cada una tenga tipo y que no haya dos del mismo planograma, tipo y estado.`;
  422 `EXPORTACION_DEMASIADO_GRANDE` en el modal → `La descarga tendría {filas} filas y el máximo es {maximo}. Elige menos versiones o filtra por Área y Departamento.`;
  Toast: 429 `Hiciste muchas descargas seguidas. Espera un minuto e intenta de nuevo.`; 503 `EXPORTACION_EN_CURSO`
  `Hay otra descarga en curso. Intenta de nuevo en unos segundos.`; 503 otro `No se pudo consultar la jerarquía en CATI. Intenta de nuevo en unos minutos.`;
  404 `Alguna de las versiones elegidas ya no existe. Vuelve a elegirlas.`; 403 `No tienes permiso para esta acción.`;
  otro `No se pudo generar el archivo. Intenta de nuevo.` En toasts el modal queda abierto salvo éxito.
- Tokens: tarjeta `1px solid var(--border)`, `--radius-md`, `--white`; elegida `--cemaco-indigo` / `--cemaco-indigo-50`;
  error `--danger-bg` / `--danger` 13px/600; aviso `--warning-bg` / `--warning` (existen en `tokens.css`);
  espaciado solo 4/8/12/16/24 px. Sin `#fff` (usar `var(--white)`; migrar el de `ProductosPorVersion.css:15`).

## Tareas

### T1 — Compartidos del back: semáforo único y fragmentos de validación
- **Archivos**: crear `back/src/application/compartido/semaforo.js` (mover desde `application/consolidado/semaforo.js`
  y borrar el original) · crear `back/src/application/compartido/esquemasComunes.js` · modificar
  `back/src/application/consolidado/consolidado.schemas.js`, `back/src/application/consolidado/consolidado.controller.js`.
- **Qué hacer**:
  - `semaforo.js` exporta `crearSemaforo(maximo)` (igual que hoy) y `semaforoExportacion = crearSemaforo(1)`.
  - `esquemasComunes.js` exporta `PATRON_JERARQUIA`, `listaEnteros(maxCaracteres, maxElementos)`, `nivelJerarquia()` movidos
    tal cual de `consolidado.schemas.js`; este los importa.
  - `consolidado.controller.js` usa `semaforoExportacion` en el controller por defecto (sin cambiar su orden interno).
- **Criterios de aceptación**:
  - [ ] Ambos controllers (`consolidado` y, tras T7, `implementacion`) obtienen el mismo objeto semáforo.
  - [ ] `consolidadoSchemas.test.js`, `consolidadoRutas.test.js`, `consolidadoUsecases.test.js` verdes sin cambios.
- **Pruebas**: `back/test/application/semaforo.test.js`: `require` desde dos rutas → mismo objeto; tomar/liberar.
- **Depende de**: —

### T2 — Dominio: `construirFilasPorVersion` parametrizable y variaciones
- **Archivos**: modificar `back/src/domain/consolidado/consolidado.entity.js`.
- **Qué hacer**:
  - Firma: `construirFilasPorVersion(base, { estados = ESTADOS_MONTABLES, skus = null, posicionIds = null } = {})`.
    `skus: Set<string> | null`, `posicionIds: Set<number> | null`. Recorrer la versión completa con `recorrerVersion`
    (numeración de ganchos intacta) y **después** descartar los ítems cuyo `sku` no esté en `skus` o cuyo
    `posicion.id` no esté en `posicionIds` (cuando el conjunto no es `null`), antes de agrupar por `sku|modo`.
  - Agregar a la fila de `construirFila`: `tipoVersion: version.tipo ?? null`, `esEspecial: Boolean(version.esEspecial)`
    y `variaciones: { cantidadApilable, capacidadFacing, minEstetico, perfil, decision }` (booleanos: hay > 1 valor
    distinto, nulos incluidos como en `valorComun`/`textoComun`). Exportar `ORDEN_MODO`.
- **Criterios de aceptación**:
  - [ ] Sin opciones: base con `borrador`, `en_desarrollo`, `piloto`, `publicado` → solo piloto y publicado.
  - [ ] Con `{ estados: ['borrador','en_desarrollo','piloto','publicado'] }` → las cuatro.
  - [ ] Fixture D3: 3 posiciones del mismo SKU–modo en una versión, `posicionIds` con 2 → una fila con 2 ubicaciones,
        facings = suma de esas 2, ganchos con la numeración de la versión completa; con `posicionIds` vacío → sin filas.
  - [ ] Con `skus` que excluye el SKU → sin fila.
- **Pruebas**: `back/test/domain/consolidado.test.js` (casos anteriores).
- **Depende de**: —

### T3 — Infraestructura: `baseVersiones.js` y `cargarBaseVersiones`
- **Archivos**: crear `back/src/infrastructure/repositories/baseVersiones.js` · modificar
  `back/src/infrastructure/repositories/consolidado.repository.js`,
  `back/src/infrastructure/repositories/implementacion.repository.js`,
  `back/src/domain/implementacion/implementacion.repository.js` (contrato).
- **Qué hacer**:
  - `baseVersiones.js`: `cargarEstructura(filtroVersiones)` donde `filtroVersiones` es una subconsulta Knex o un
    arreglo de ≤ 50 ids, usado como `whereIn('…planograma_version_id', filtroVersiones)`. Devuelve
    `{ gondolas, secciones, niveles, posiciones, accesorios, productos }` con las 5 consultas y los mapeos que hoy están
    en `cargarBase` de `consolidado.repository.js` (mismo `mapearPosicionBase`, mismos campos). Agregar en la consulta de
    posiciones `producto.categoria_nivel1 as area` y `producto.categoria_nivel2 as departamento`, y en `productos`
    los campos `area`, `departamento`.
  - `consolidado.repository.js` → `cargarBase` usa `cargarEstructura(montables())`; versiones y asignaciones siguen ahí. Sin cambio funcional.
  - `implementacion.repository.js` → `cargarBaseVersiones(versionIds)` = `cargarEstructura(versionIds)`.
  - Contrato del dominio: documentar `cargarBaseVersiones(versionIds: number[]): Promise<{ gondolas, secciones, niveles, posiciones, accesorios, productos }>`.
- **Criterios de aceptación**:
  - [ ] Sin `raw` con interpolación; ≤ 50 parámetros por consulta.
  - [ ] El consolidado responde igual (pruebas existentes verdes).
- **Pruebas**: `consolidadoUsecases.test.js` verde; revisión del diff (I4).
- **Depende de**: —

### T4 — Dominio: columnas y hojas de la exportación por planograma
- **Archivos**: crear `back/src/domain/implementacion/columnasExportacion.js`,
  `back/src/domain/implementacion/exportacionPorVersion.entity.js`.
- **Qué hacer**:
  - `columnasExportacion.js`: `COLUMNAS_LISTA` (orden de C3, reutilizando definiciones de `COLUMNAS_CONSOLIDADO` por
    clave y agregando `area`, `departamento`, `planograma`, `versionCodigo`, `tipo`, `estadoVersion` con
    `ETIQUETA_ESTADO_TODOS = { borrador: 'Borrador', en_desarrollo: 'En desarrollo', piloto: 'Piloto', publicado: 'Publicada' }`,
    `especial`); `SIGLAS_BLOQUE = ['TG','TM','TE']`, `TIPO_POR_SIGLA = { TG: 'GRANDE', TM: 'MEDIANA', TE: 'EXPRESS' }`;
    `ENCABEZADOS_COMUNES_PIVOTE = ['SKU','Descripcion','Nombre_planograma','Estado_version','Modo','SKU_sustituto']`;
    `CAMPOS_BLOQUE_PIVOTE = ['Planograma','Facings','Cantidad_x_facing','Cantidad_facing_vertical','Min_estetico','Capacidad_maxima','Nombre_accesorio','Tamano_accesorio','Perfil_redondeo','Min_final','Max_final','Decision_final','Observaciones']`;
    `encabezadosBloque(sigla, nGanchos)`; `ORDEN_ESTADO = { publicado: 0, piloto: 1, en_desarrollo: 2, borrador: 3 }`;
    `ENCABEZADOS_VERSIONES`. Todas congeladas (`Object.freeze`).
  - `exportacionPorVersion.entity.js` (puro, sin dependencias externas):
    - `validarPivote(versiones) → { incluidas: Version[], excluidas: Array<{ version, motivo }> }`; lanza error
      `{ status: 422, code: 'PIVOTE_NO_APLICABLE', details: { sinTipo, duplicadas, soloEspeciales } }` según D8.
    - `ordenarLista(filas)`, `ordenarPivote(filasPivote)` (D10).
    - `construirHojaLista(filasPorVersion, productos) → { nombre: 'Lista', encabezados, filas, anchos, congelarFilas: 1 }`.
    - `construirHojaPivote(filasPorVersion, versionesIncluidas, productos) → { nombre: 'Pivote por versión', grupos: [{ titulo, desde, hasta }], encabezados, filas, anchos, congelarFilas: 2, congelarColumnas: 6 }`;
      agrupa por `sku|planogramaId|estadoVersion|modo`; celdas según C3 (`{ tipo: 'numero'|'texto', valor }`; `Varía` desde `variaciones`/`minVaria`/`maxVaria`).
    - `construirHojaVersiones(versiones, excluidas) → { nombre: 'Versiones', … }`.
    - `contarFilas(formato, filasPorVersion, versionesIncluidas) → number`.
    - `nombreArchivo(formato, fecha) → 'productos-por-planograma-lista-AAAAMMDD.xlsx' | '…-pivote-…'`.
- **Criterios de aceptación**:
  - [ ] TG piloto + TG publicado del mismo planograma → válido; dos filas por SKU–modo, publicado primero.
  - [ ] Dos TG borrador del mismo planograma → 422 con ambos ids en `duplicadas`.
  - [ ] Una especial + una normal → válido; la especial en `excluidas` y en hoja `Versiones` con `Incluida = No`.
  - [ ] Solo especiales → 422 `soloEspeciales: true`; versión normal sin tipo → 422 `sinTipo`.
  - [ ] SKU cross solo en TG → fila Cross con bloque TG lleno y TM/TE vacíos.
  - [ ] `Min_final` distinto entre posiciones → celda `Varía` (texto); único → `numero`.
  - [ ] Encabezados del Pivote = literal compartido con el front (ver T8).
  - [ ] `nombreArchivo('PIVOTE', new Date(2026, 9, 19))` = `productos-por-planograma-pivote-20261019.xlsx`.
- **Pruebas**: `back/test/domain/exportacionPorVersion.test.js` (casos anteriores + orden + hoja `Versiones` +
  ganchos `TG1..TGn` con `54E` como texto).
- **Depende de**: T2

### T5 — `libroXlsx.js`: fila de grupo, anchos y congelado
- **Archivos**: modificar `back/src/infrastructure/exportacion/libroXlsx.js`.
- **Qué hacer**: `construirHoja({ nombre, grupos?, encabezados, filas, anchos?, congelarFilas?, congelarColumnas? })`:
  si hay `grupos`, primera fila con la celda de título en `desde` (`{ type: String, value: sanear(titulo), fontWeight: 'bold', columnSpan: hasta - desde + 1, align: 'center' }`) y `null` en el resto;
  `columns: anchos.map((width) => ({ width }))`, `stickyRowsCount`, `stickyColumnsCount` (API de `write-excel-file@4.1.1`, por hoja). Sin paquete nuevo. Hojas sin estos campos se escriben igual que hoy.
- **Criterios de aceptación**:
  - [ ] El consolidado produce el mismo libro (sus hojas no traen campos nuevos).
  - [ ] Títulos de grupo pasan por `sanear`.
- **Pruebas**: `back/test/infrastructure/libroXlsx.test.js`: hoja con grupos → fila 1 con `columnSpan`; celda
  `=HYPERLINK("http://x","clic")` → `type: String`; `\x07` eliminado.
- **Depende de**: —

### T6 — Casos de uso del módulo 16
- **Archivos**: modificar `back/src/domain/implementacion/implementacion.usecases.js`.
- **Qué hacer**:
  - `resolverJerarquia(catalogo, { area, departamento }) → Promise<Set<string> | null>`: sin `area` → `null` sin llamar
    a CATI; `departamento` sin `area` → 400; `area` ∉ `obtenerAreas()` → 400; `departamento` ∉ `obtenerDepartamentos(area)` → 400;
    luego `listarSkusPorJerarquia(nivel, id)` con el nivel más específico (`nivelJerarquiaMasEspecifico` de
    `domain/producto/producto.entity`). Errores de CATI se propagan (503).
  - `obtenerProductosPorVersion(repo, inventarioPort, { versionIds, tiendaId, area, departamento }, skuRepo, catalogo)`:
    resuelve jerarquía **primero**; `armarFilasProductos` recibe un filtro opcional de SKU y filtra las filas **antes** de
    consultar inventario; `total = data.length`; `versiones[]` sin filtrar.
  - `exportarProductosPorVersion({ repo, catalogo, escribirLibro, semaforo, maximoFilas, ahora }, { versionIds, formato, area, departamento, posicionIds }) → Promise<{ buffer, filas, nombre }>`
    con el orden de C2 (404 → 422 Pivote → jerarquía → semáforo → base → filas → tope → libro → `finally` liberar).
    Versiones de `repo.listarVersiones` se adaptan a la forma de `base.versiones`
    (`{ versionId, codigo, estado, tipo, esEspecial, planogramaId, planogramaNombre: nombre }`); en Pivote solo las incluidas.
    Reutilizar `errorExportacionDemasiadoGrande` y `errorExportacionEnCurso` (exportarlos desde `consolidado.usecases.js` o moverlos a `domain/compartido/erroresExportacion.js`; moverlos).
- **Criterios de aceptación**:
  - [ ] Catálogo que lanza → 503 y ni `listarPosicionesConProducto` ni `cargarBaseVersiones` se llaman.
  - [ ] `area=999` → 400 y `listarSkusPorJerarquia` no se llama; departamento de otra área → 400.
  - [ ] Con jerarquía, SKU fuera del conjunto no aparece y `total === data.length`.
  - [ ] Semáforo tomado → 503 `EXPORTACION_EN_CURSO` y `cargarBaseVersiones` no llamado.
  - [ ] Tras error de repo, error de `escribirLibro` y 422 de tope, `semaforo.intentarTomar()` vuelve a ser `true`.
  - [ ] `maximoFilas = 1` con 2 filas → 422 `{ filas: 2, maximo: 1 }`, `escribirLibro` no llamado.
  - [ ] `posicionIds` con ids de una versión no pedida → descartados; filtro que excluye todo → libro con 0 filas.
  - [ ] Catálogo espía: llamadas a CATI independientes del número de SKU (I3).
- **Pruebas**: crear `back/test/domain/implementacionUsecases.test.js` con repositorio y catálogo falsos (patrón de `consolidadoUsecases.test.js`).
- **Depende de**: T1, T2, T3, T4

### T7 — Aplicación y HTTP
- **Archivos**: crear `back/src/application/implementacion/implementacion.schemas.js`,
  `back/src/infrastructure/http/middlewares/validarCuerpo.js` · modificar
  `back/src/application/implementacion/implementacion.controller.js`,
  `back/src/infrastructure/http/routes/implementacion.routes.js`,
  `back/src/infrastructure/http/middlewares/rateLimit.js`, `back/src/infrastructure/http/app.js`.
- **Qué hacer**:
  - `schemaExportar = Joi.object({ versionIds: Joi.array().items(Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER)).unique().min(1).max(50).required(), formato: Joi.string().valid('LISTA','PIVOTE').required(), area: nivelJerarquia(), departamento: nivelJerarquia(), posicionIds: Joi.array().items(<igual>).unique().max(30000) })`.
  - `validarCuerpo(schema)`: igual a `validarQuery.js` pero sobre `{ ...(req.body ?? {}) }`.
  - Controller: `obtenerProductosPorVersion` lee `area`/`departamento` (string no vacía con `PATRON_JERARQUIA`; arreglo, vacío o mal formado → 400) e inyecta `catiClient`. Nueva fábrica `crearControllerExportacion({ repo, catalogo, escribirLibro, semaforo, maximoFilas, ahora })` → `exportar(req, res, next)`: valida con `validarQueryEstricta(schemaExportar, { ...req.body })`, llama al caso de uso, registra el log de C2 y fija cabeceras después del `Buffer`. Por defecto: `implementacionRepo`, `catiClient`, `escribirLibroXlsx`, `semaforoExportacion`, `env.consolidado.exportacionMaxFilas`. Exportar la fábrica para pruebas.
  - `rateLimit.js`: `exportacionPorVersionLimiter` (5/min) y `productosPorVersionLimiter` (60/min) con `crearLimiterPorUsuario`.
  - Rutas: `router.get('/productos', productosPorVersionLimiter, controller.obtenerProductosPorVersion)`;
    `router.post('/productos/exportar', validarCuerpo(schemaExportar), exportacionPorVersionLimiter, controller.exportar)`.
  - `app.js`: `app.use('/api/v1/implementacion/productos/exportar', express.json({ limit: '512kb' }))` antes de `express.json({ limit: '8mb' })`.
- **Criterios de aceptación**:
  - [ ] Esquema: `versionIds` `[1,1]`, 51 ids, `[0]`, `[-1]`, `["x"]`, `[9007199254740993]` → 400; `formato: 'CSV'` → 400;
        `area: "a'b"`, `""`, 21 caracteres → 400; `foo: 1` → 400; `posicionIds` con 30 001 → 400.
  - [ ] Sin token → 401; solo-implementador → 403 (también con cuerpo inválido); analista → pasa.
  - [ ] 6.ª exportación del minuto → 429; 61.ª consulta del listado → 429; los 400 no gastan cupo.
  - [ ] Cuerpo > 512 kb → 413 con forma de error estándar.
  - [ ] `escribirLibro` que lanza → 500 JSON sin `Content-Disposition`.
- **Pruebas**: crear `back/test/application/implementacionSchemas.test.js`, `back/test/http/implementacionExportar.test.js`; modificar `back/test/http/rutasProtegidas.test.js`, `back/test/http/matrizPermisos.test.js`, `back/test/http/rateLimitUsuario.test.js`.
- **Depende de**: T6

### T8 — Front: dominio de la descarga y prueba de reimportación
- **Archivos**: crear `front/src/domain/implementacion/descargaPorVersion.ts` y `.test.ts` · modificar `front/src/types/implementacion.ts` (C4), `front/src/utils/excelProductosPlanograma.test.ts`.
- **Qué hacer**:
  - `pivoteAplicable(versiones: VersionPorVersion[]) → { aplicable: boolean; sinTipo: VersionPorVersion[]; duplicadas: VersionPorVersion[][]; especiales: VersionPorVersion[] }` (misma regla que D8).
  - `construirCuerpoExportacion({ versionIds, formato, jerarquia, posicionIds, hayFiltrosCliente }) → CuerpoExportacionPorVersion` (no serializa claves vacías; `posicionIds` solo si `hayFiltrosCliente`).
  - `nombreArchivoPorVersion(formato, fecha)` (mismo patrón D18); `mensajeErrorDescargaPorVersion(error: ApiError) → { texto: string; enModal: boolean }` con los textos de la sección UX.
  - `excelProductosPlanograma.test.ts`: fixture con fila de grupo + encabezados del Pivote (literal idéntico a `ENCABEZADOS_COMUNES_PIVOTE` + `encabezadosBloque` del back) → `interpretarHojaProductos(filas, 'GRANDE')` lee solo TG sin errores con valores únicos; `Varía` en `Min_final_TG` → error bloqueante; SKU repetido (publicado y piloto) → se queda el primero (publicado) y el otro se reporta.
- **Criterios de aceptación**: [ ] casos de `pivoteAplicable` iguales a T4; [ ] cuerpo sin `posicionIds` cuando no hay filtros; [ ] literal de encabezados idéntico al del back.
- **Pruebas**: las indicadas.
- **Depende de**: T4

### T9 — Front: servicio y hooks
- **Archivos**: modificar `front/src/services/implementacion.service.ts`, `front/src/hooks/useImplementacion.ts`.
- **Qué hacer**: `productosPorVersion(versionIds, tiendaId, jerarquia: { area?: string; departamento?: string })`
  (agrega `area`/`departamento` solo si tienen valor); `descargarProductosPorVersion(cuerpo: CuerpoExportacionPorVersion) => httpClient.postBinario('/implementacion/productos/exportar', cuerpo)`.
  `useProductosPorVersion(versionIds, tiendaId, jerarquia)` incluye la jerarquía en la clave del efecto.
- **Criterios de aceptación**: [ ] sin jerarquía la petición es idéntica a la actual; [ ] `npx tsc -b` limpio.
- **Pruebas**: cubiertas por T8 y verificación manual.
- **Depende de**: T8

### T10 — Front: `IconoDescarga` en `ui/` y `CadenaJerarquia` con `niveles`
- **Archivos**: crear `front/src/components/ui/IconoDescarga/IconoDescarga.tsx` · modificar `front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx` (usarlo, borrar la función local), `front/src/components/dominio/productos/CadenaJerarquia/CadenaJerarquia.tsx`.
- **Qué hacer**: mover el SVG tal cual (`aria-hidden`). `CadenaJerarquia` prop `niveles?: number` (def. 5): recorta `NIVELES_JERARQUIA.slice(0, niveles)` en render, cargadores y `onChange`.
- **Criterios de aceptación**: [ ] consolidado y Productos sin cambio visual; [ ] con `niveles={2}` solo Área y Departamento.
- **Depende de**: —

### T11 — Front: `ProductosVersiones.onFilasFiltradas`
- **Archivos**: modificar `front/src/components/dominio/implementacion/ProductosVersiones/ProductosVersiones.tsx`.
- **Qué hacer**: prop opcional `onFilasFiltradas?: (estado: { posicionIds: number[]; hayFiltrosCliente: boolean }) => void`;
  `useEffect` sobre `[filas, busqueda, filtros]` que la invoca con `filas.map((f) => f.posicionId)` y
  `hayFiltrosCliente = busqueda.trim() !== '' || Object.values(filtros).some((v) => v?.trim())`. Quitar el espacio final de la línea ~353.
- **Criterios de aceptación**: [ ] el Implementador no pasa la prop y no cambia; [ ] sin bucles de render (la página guarda el estado con `useState` y compara).
- **Depende de**: —

### T12 — Front: `DescargarProductosVersionModal`
- **Archivos**: crear `front/src/components/dominio/implementacion/DescargarProductosVersionModal/DescargarProductosVersionModal.tsx` y `.css`.
- **Qué hacer**: props de `02_diseno_ux.md` §3 con `versiones: VersionPorVersion[]` y `errorServidor: string | null`;
  composición `Modal ancho="lg"` + `Button`; tarjetas radio, resumen, avisos y estados de la sección UX; CSS BEM
  `descargar-productos-version__*` con tokens; se monta solo abierto (vuelve a "Lista").
- **Criterios de aceptación**: [ ] accesibilidad de `02_diseno_ux.md` §6; [ ] stylelint sin errores; [ ] espaciados 4/8/12/16/24.
- **Depende de**: T8, T10

### T13 — Front: integración en la página
- **Archivos**: modificar `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx`, `ProductosPorVersion.css`.
- **Qué hacer**: estado `jerarquia`/`nombres`, `filasFiltradas`, `modalAbierto`, `generando`, `errorServidor`; `controles`
  con el contenedor de dos filas; `vacio` según jerarquía; `descargar(formato)`: arma el cuerpo, `postBinario`,
  `URL.createObjectURL` + enlace con `nombreArchivoPorVersion` + `URL.revokeObjectURL`, toasts y errores según
  `mensajeErrorDescargaPorVersion`. Clases nuevas `productos-por-version__controles`, `productos-por-version__hint`; `#fff` → `var(--white)`.
- **Criterios de aceptación**: [ ] la tabla se recarga al cambiar la jerarquía; [ ] descarga Lista y Pivote con y sin filtros de cliente; [ ] `npx tsc -b && npm run lint` limpio.
- **Depende de**: T9, T10, T11, T12

### T14 — Documentación (commit separado)
- **Archivos**: crear `Arquitectura/Contratos/16_implementacion/POST_implementacion_productos_exportar.md` · modificar `Arquitectura/Contratos/16_implementacion/GET_implementacion_productos_por_version.md`, `Arquitectura/ENDPOINTS.md` (sección 16 nueva), `Arquitectura/CASOS_DE_USO.md` (CU-10-05, CU-10-06), `Arquitectura/ESTADO_MODULOS.md` (módulos 16 y 21: semáforo compartido, `construirFilasPorVersion` con opciones, `baseVersiones.js`).
- **Criterios de aceptación**: [ ] contratos con C1, C2, C3, D3, D6 y M1 escritos.
- **Depende de**: T7

### T15 — Postman
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único editable), carpeta `16 - Implementación`.
- **Qué hacer**: según `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`: listado con `area` válida (200, `total` = `data.length`), `area=` (400), `departamento` sin `area` (400); exportar LISTA y PIVOTE (200, `Content-Type` xlsx), cuerpo con clave desconocida (400), `versionIds` inexistente (404), Pivote con dos versiones del mismo planograma+tipo+estado (422 si el setup lo permite), sin token (401).
- **Depende de**: T7

## Migraciones

Ninguna.

## Controles de seguridad bloqueantes

B1–B10 de la tabla "Seguridad" son criterios de aceptación de T1–T7 y T8 (B7). I1–I6 y M3 también entran en
este plan. Ningún hallazgo bloqueante queda sin tarea.

## Componentes y tokens nuevos de UX

- Componente nuevo: `front/src/components/dominio/implementacion/DescargarProductosVersionModal/`.
- Componente movido a base: `front/src/components/ui/IconoDescarga/` (D17).
- Prop nueva: `CadenaJerarquia.niveles?: number`; `ProductosVersiones.onFilasFiltradas?`.
- Clases nuevas: `productos-por-version__controles`, `productos-por-version__hint`, `descargar-productos-version__*`.
- Tokens nuevos: ninguno (se usan `--warning`, `--warning-bg` existentes).

## Propuestas al sistema de diseño (requieren aprobación — no se implementan en este plan)

1. Extraer a `ui/ModalDescarga` el esqueleto común (tarjetas de formato, resumen, error, "Generando…") de
   `DescargarConsolidadoModal` y `DescargarProductosVersionModal`. **Requiere aprobación.**
2. Prop `filtrosExtra?: ReactNode` en `ProductosVersiones` para ubicar filtros en `productos-versiones__barra`. **Requiere aprobación.**
3. Escala de espaciado `--space-1…5` y regla stylelint contra literales de `px` en `padding`/`gap` (DT-04). **Requiere aprobación.**

## Deuda nueva (la consolida el coordinador en `DEUDA_TECNICA.md` al cierre; siguiente ID libre DT-71)

| Propuesta | Severidad | Detalle |
|---|---|---|
| DT-71 | Media | Caché de `catiClient.js` (`Map` sin tope ni limpieza). Mitigado por D5 (solo códigos existentes); falta LRU. |
| DT-72 | Baja | `ganchosPorPosicion` del listado Por versión carga cada versión en serie (`skuRepo.cargarVersion` × ≤ 50); migrar a `cargarBaseVersiones` + `recorrerVersion`. |
| DT-73 | Baja | `accesoriosDePosiciones(posicionIds)` pasa ids de posición como parámetros; con muchas versiones puede rozar el límite de 2 100. |
| DT-74 | Baja | Área/Departamento del archivo vienen de `Producto.categoria_nivel1/2` (registrado), pueden diferir del filtro CATI en vivo (D6). |
| DT-75 | Baja | El importador de categorías no avisa cuando el archivo trae varias filas del mismo SKU con estados distintos (gana la primera). |
| Existentes | — | DT-10/DT-11 (cualquier analista descarga borradores y especiales: aceptado), DT-43 (no se agrava: D3 evita duplicar filtros), DT-46 (parcial), DT-48/DT-53 (sin cambio en consolidado). `ENDPOINTS.md` sin sección 16 se corrige en T14. |

## Verificación final

- `cd back && npm test`
- `cd front && npm test && npx tsc -b && npm run lint`
- Postman: carpeta `16 - Implementación`.
- Prueba manual: Productos → Por planograma → elegir 2–3 versiones (incluir TG piloto y TG publicada del mismo
  planograma) → Área y Departamento (la tabla se acota y aparece el hint) → buscar un texto → Descargar Lista
  (filas = SKU–versión–modo de lo visible) → Descargar Pivote (bloques TG/TM/TE, fila publicada antes que piloto,
  hoja `Versiones`) → reimportar el Pivote en una versión TG de prueba (lee solo TG). Verificar que el consolidado
  sigue descargando y que dos descargas simultáneas (consolidado + por planograma) dan 503 a la segunda.

## Riesgos

- Regresión del consolidado al extraer `baseVersiones.js` y parametrizar `construirFilasPorVersion` → pruebas existentes sin cambios + B6.
- Libro Pivote mal reimportado → literal compartido probado en ambos lados (T4/T8) y `Varía` como falla segura.
- `posicionIds` grandes → tope 30 000, límite de cuerpo 512 kb, intersección en memoria.
- CATI lento con área en frío (~10 s) → limitador del listado, caché y deduplicación existentes; el semáforo no se retiene durante CATI (D12).
