# 02 — Seguridad e integridad: filtros Área/Departamento y descarga en Productos por planograma

- **Etapa**: 2 (diseño) · **Fecha**: 2026-10-19 · **Commit base**: `b34524e`
- Entradas: `00_solicitud.md` (las **Preguntas resueltas** mandan sobre `01`) y `01_arquitectura.md`.

> Diferencias de `01` que cambian los controles por las respuestas del usuario:
> - **P5**: clave del Pivote = SKU + planograma + **estado** + modo; el 422 es por planograma + tipo + **estado**
>   repetidos (no por planograma + tipo como dice `01` §4.2 regla 2). Las versiones especiales de tienda van solo en la Lista.
> - **P6**: la descarga respeta **también la búsqueda y los filtros por columna** (en `01` el endpoint no los aceptaba).
>   Eso agrega entrada nueva al servidor y es la parte de mayor riesgo de este cambio (controles B4 y B5).
> - **P3**: la Lista lleva Área y Departamento del producto según CATI (fuente nueva en el archivo, control I3).
> - **P4**: los encabezados del Pivote son los del Excel de categorías, **para poder reimportarlo** (control B7).

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoint modificado | `GET /api/v1/implementacion/productos` — nuevos `area`, `departamento`. Hoy se valida con `parsear*` en `implementacion.controller.js:58-66`, sin Joi estricto (DT-46) y **sin limitador**. |
| Endpoint nuevo | `GET /api/v1/implementacion/productos/exportar` — `.xlsx` binario (Lista / Pivote). Si P6 obliga a enviar ids o claves de filas, pasa a `POST` (ver B5). |
| Tablas (solo lectura) | `PlanogramaVersion` (`tipo`, `estado`, `planograma_id`, `version_base_id`), `Planograma`, `Gondola`, `Seccion`, `Nivel`, `Posicion`, `Producto`, accesorios. Sin migración, sin escrituras, sin transacciones. |
| Integraciones | CATI: `listarSkusPorJerarquia` (token de servicio, caché 30 min, `catiClient.js:380`), `obtenerAreas/obtenerDepartamentos`, y la fuente de Área/Departamento por SKU (P3). Inventario CATI solo si la descarga acepta `tiendaId` (P6, filtros de inventario). |
| Roles / permisos | Regla A transitoria (`requiereAnalista`, `implementacion.routes.js:13`, DT-11). El Implementador no entra a `/implementacion/*`; su vista comparte `ProductosVersiones` pero no recibe `controles`. |
| Tiendas | No hay filtro por tienda del usuario (DT-10): cualquier analista ve y descarga versiones de cualquier estado (incluye borradores y especiales de tienda). Aceptado por regla A; se deja explícito. |
| Código compartido que cambia | `construirFilasPorVersion` (`consolidado.entity.js:120`, hoy fija `ESTADOS_MONTABLES` en la línea 143), consultas de estructura extraídas de `consolidado.repository.js` a `baseVersiones.js`, semáforo (`application/consolidado/semaforo.js`, hoy instanciado dentro del controller del consolidado), `listaEnteros`/`PATRON_JERARQUIA` movidos de `consolidado.schemas.js`, `libroXlsx.js` (fila de grupo). |

## 2. Controles requeridos

### Bloqueantes

**B1. Autorización y orden de middlewares del endpoint nuevo.**
- Dónde: `back/src/infrastructure/http/routes/implementacion.routes.js`. La ruta cuelga del router que ya aplica `requiereAnalista`; orden `requiereAnalista → validarQuery(schemaExportar) → exportacionLimiter → controller` (como `consolidado.routes.js:21`). Declararla **antes** de cualquier ruta parametrizada futura de `/productos/:x`.
- Verificación: `back/test/http/rutasProtegidas.test.js` → `GET /implementacion/productos/exportar` sin token = 401; `back/test/http/matrizPermisos.test.js` → fila nueva: usuario solo-implementador (`soloPLA009`/`soloPLA010`) = 403, analista = pasa. Un 403 debe salir **antes** que un 400 (un implementador con query inválida recibe 403, no detalles de validación).

**B2. Query estricta del endpoint nuevo.**
- Dónde: `back/src/application/implementacion/implementacion.schemas.js` con `validarQueryEstricta` (sin `stripUnknown`).
- `versionIds`: `listaEnteros(≈ 600 caracteres, 50)` — **no** reutilizar `filtrosComunes.versionIds` del consolidado (tope 500/5000); `formato`: `valid('LISTA','PIVOTE')`; `area`/`departamento`: `PATRON_JERARQUIA`; parámetro repetido (arreglo) → 400; desconocido → 400.
- El controller usa **el valor devuelto por Joi** (números ya convertidos), no `req.query` crudo.
- Verificación: prueba de esquema en `back/test/application/implementacionSchemas.test.js`: `versionIds=1,1` → 400; 51 ids → 400; `versionIds=1&versionIds=2` → 400; `formato=CSV` → 400; `area=a'b` / `area=` / 21 caracteres → 400; `foo=1` → 400. `consolidadoSchemas.test.js` sigue verde tras mover `listaEnteros`.

**B3. Jerarquía en el listado: validación y falla cerrada.**
- Dónde: `implementacion.controller.js` (`obtenerProductosPorVersion`) y `implementacion.usecases.js:251`.
- `area`/`departamento` se validan con el mismo patrón **antes** de llegar a CATI (el valor se usa como parámetro de CATI y como clave de caché `catalogo:skus:<nivel>:<id>`). Mientras DT-46 siga abierta, al menos estos dos parámetros con Joi o `PATRON_JERARQUIA` explícito; vacío → 400.
- CATI caído o timeout → `503 SERVICE_UNAVAILABLE` **sin** responder la lista sin filtrar (fallar abierto mostraría todos los productos como si fueran del área elegida). Igual en la exportación: nunca archivo sin el filtro pedido.
- Verificación: prueba de caso de uso con `catalogo` falso que lanza → 503 y `repo.listarSkusActivosPorVersion`/`cargarBaseVersiones` no llamados o resultado no devuelto; con jerarquía y SKU fuera del conjunto → la fila no aparece en `data` y `total` coincide con `data.length`.

**B4. Filtros de búsqueda y por columna en la descarga (P6): el cliente solo puede acotar, nunca ampliar.**
- Dónde: `implementacion.schemas.js` + caso de uso `exportarProductosPorVersion`.
- Cualquiera que sea el mecanismo (ver B5), el servidor calcula él mismo el universo `versionIds ∩ jerarquía` y la entrada del cliente solo **intersecta** ese universo. Ningún dato del cliente se escribe en el archivo salvo lo que ya existe en BD.
- Si se envían expresiones de filtro: claves de columna en **lista blanca fija** (rechazar `__proto__`, `constructor`, claves no listadas → 400; nunca `obj[claveDelCliente]` sobre objetos con prototipo); cada valor ≤ 100 caracteres; enumerados de lista permitida; numéricos con la gramática de `parsearFiltroNumerico` del front portada sin construir `RegExp` a partir del texto del usuario (ReDoS); búsqueda `trim().max(100)`, comparada con `includes` normalizado, no como regex ni como `LIKE` en SQL.
- Filtros de columnas de inventario: requieren `tiendaId` validado con `obtenerTiendaActivaOFallar` (404 si no existe/inactiva); sin `tiendaId`, un filtro de inventario → 400 (no se ignora en silencio).
- Verificación: pruebas del esquema (`filtro_<claveInexistente>=x` → 400, `filtro___proto__=x` → 400, valor de 101 caracteres → 400, expresión numérica tipo `(a+)+$` → 400 en < 50 ms) y del caso de uso (con un filtro que excluye todo → archivo con encabezados y 0 filas, no 500).

**B5. Equivalencia de filas entre pantalla y archivo (P6), definida y probada.**
- La tabla filtra **posiciones**; el archivo agrega por versión–SKU–modo. Debe quedar escrito en `PLAN.md` y en el contrato: una fila agregada entra si **al menos una** de sus posiciones pasa los filtros (o la regla que se elija), y sus columnas agregadas (ubicaciones, ganchos, `Varía`) se calculan con **todas** las posiciones del grupo o solo con las que pasaron — una sola regla.
- Si el PLAN opta por enviar claves de filas/posiciones en lugar de expresiones: `POST` con cuerpo Joi (no query string: con miles de ids se rompe el límite de URL y el de 2 100 parámetros de SQL Server), tope explícito de elementos, límite de cuerpo propio de la ruta, cada `versionId` ∈ `versionIds`, `sku` con el patrón del SKU (≤ 50), `modo` enumerado; y el servidor **re-verifica** pertenencia contra su propia base (claves inexistentes se descartan, no se inventan filas). No se pasan los ids a SQL uno por uno: se intersecta en memoria con la base cargada por `versionIds`.
- Si opta por expresiones: la semántica de cada filtro se fija con un **fixture compartido** (mismo literal de casos en `front/src/domain/implementacion/*.test.ts` y `back/test/domain/*.test.js`), para no repetir la deriva de DT-43.
- Verificación: fixture de 3 posiciones del mismo SKU–modo en una versión, dos pasan el filtro y una no → la prueba fija qué fila y qué ubicaciones salen en el archivo.

**B6. Cambio de `construirFilasPorVersion` sin regresión del consolidado.**
- Dónde: `back/src/domain/consolidado/consolidado.entity.js:120-143`.
- El parámetro de estados es opcional y por defecto `ESTADOS_MONTABLES`; el consolidado no lo pasa. Un borrador o `en_desarrollo` que aparezca en el consolidado expondría a Tiendas datos no publicados.
- Verificación: prueba nueva en `back/test/domain/consolidado.test.js`: base con versiones `borrador`, `en_desarrollo`, `piloto`, `publicado` → sin opciones solo salen piloto y publicado; con `{ estados: todos }` salen las cuatro. `consolidadoUsecases.test.js` y `consolidadoRutas.test.js` sin cambios y verdes.

**B7. Pivote reimportable sin corromper una versión (P4, P5).**
- Riesgo: el archivo trae los encabezados del Excel de categorías; si el analista lo reimporta en una versión (`POST /versiones/:id/importar-productos`), `filtrarProductos` (`back/src/domain/importacion/importacion.entity.js:306`) se queda con **la primera fila** de cada SKU y omite las demás ("Repetido en el archivo"). Con filas por estado (piloto y publicado) y por modo (Planograma y Cross del mismo SKU), qué valores se importan depende del orden de filas del archivo.
- Controles: (a) orden del Pivote **determinista y documentado** (SKU, planograma, estado en orden fijo publicado > piloto > en_desarrollo > borrador, modo Planograma > Cross > Impulso), en el dominio y probado; (b) celdas de bloque que el lector trata como cantidades (`Facings_*`, `Min_final_*`, etc.) se escriben como **número** (`tipo: 'numero'`) cuando hay un solo valor, y si el grupo tiene valores distintos el texto `Varía` provoca error bloqueante del lector (falla segura, no un número inventado) — esto debe quedar así, no sustituirse por el primer valor; (c) `Modo` con las etiquetas que reconoce `modo()` del lector (`Planograma`, `Cross`, `Impulso`) y `Decision_final` con `ACTIVO`/`INACTIVO`; (d) columnas comunes nuevas (`Estado`, `Versión`, `Planograma`) con nombres que el lector **ignore** o use solo para aviso (no `Planograma_TM` en un bloque TG: el lector lo trata como error de bloque ajeno).
- Verificación: prueba en `front/src/utils/excelProductosPlanograma.test.ts` con un fixture de filas que replique los encabezados y celdas del Pivote (mismo literal de encabezados que `back/src/domain/implementacion/columnasExportacion.js`, probado en ambos lados): `interpretarHojaProductos(filas, 'GRANDE')` lee solo TG, sin errores para valores únicos, con error bloqueante en una celda `Varía`, y el primer SKU repetido es el de estado publicado.

**B8. Reglas del Pivote en el dominio, con 422 explícito y sin exclusiones silenciosas.**
- Dónde: `exportacionPorVersion.entity.js` (`validarPivote`), no en el controller ni solo en el front.
- Dos versiones elegidas del mismo planograma + tipo + estado → `422 PIVOTE_NO_APLICABLE` con `details.duplicadas`; versión sin `tipo` → 422 con `details.sinTipo`; versiones especiales de tienda (identificadas por el campo de BD que las marca, no por nombre o código) → excluidas del Pivote **y reportadas**: si todas las elegidas son especiales → 422; si solo algunas, el libro incluye una hoja fija `Versiones` (id, código, planograma, tipo, estado, incluida sí/no, motivo) para que el archivo no aparente cubrir versiones que no tiene. La misma hoja en la Lista da trazabilidad de qué se descargó.
- `pivoteAplicable` del front es solo aviso: el back valida igual.
- Verificación: pruebas de dominio: TG piloto + TG publicado del mismo planograma → válido, dos filas por SKU–modo; dos TG borrador del mismo planograma → 422 con ambos ids; una especial + una normal → válido y la especial figura como excluida; solo especiales → 422.

**B9. Semáforo único, tomado antes de la carga y liberado en todo camino.**
- Dónde: `back/src/application/compartido/semaforo.js` con **una** instancia exportada que usan el controller del consolidado y el de implementación (hoy `consolidado.controller.js:103` crea la suya).
- `intentarTomar` antes de `cargarBaseVersiones`; `liberar` en `finally` que cubra: error de repositorio, error de CATI (si la jerarquía se resuelve dentro), 422 de tope, fallo de `escribirLibro`.
- Verificación: prueba de caso de uso con semáforo real `crearSemaforo(1)`: tras cada uno de esos errores, `intentarTomar()` vuelve a dar `true`; con el semáforo tomado por una "exportación del consolidado" → `503 EXPORTACION_EN_CURSO` y `cargarBaseVersiones` no llamado; prueba que `require` de ambos controllers obtiene el mismo objeto.

**B10. Tope de filas antes de generar el libro y respuesta de error nunca binaria.**
- `contarFilas(formato, …)` se compara con `env.consolidado.exportacionMaxFilas` **antes** de `escribirLibro`; las cabeceras `Content-Type`/`Content-Disposition` se fijan solo después de tener el `Buffer`, así un error sale como JSON por `errorHandler` y nunca como archivo truncado.
- Verificación: caso de uso con `maximoFilas = 1` y 2 filas → 422 `EXPORTACION_DEMASIADO_GRANDE` con `details: { filas: 2, maximo: 1 }` y `escribirLibro` no llamado; controller con `escribirLibro` que lanza → respuesta 500 JSON sin `Content-Disposition`.

### Importantes

**I1. Limitador en el listado con jerarquía.** `GET /implementacion/productos` no tiene limitador y con `area` en frío dispara la paginación completa de `/Product/search` en CATI (~10 s, en paralelo). Agregar `crearLimiterPorUsuario` (60/min, como `consolidadoLimiter`) después de `requiereAnalista` en `implementacion.routes.js:19`. Verificación: `back/test/http/rateLimitUsuario.test.js`, 61.ª petición del mismo usuario → 429.

**I2. Códigos de jerarquía que existen.** Antes de `listarSkusPorJerarquia`, comprobar `area` ∈ `obtenerAreas()` y `departamento` ∈ `obtenerDepartamentos(area)` (ambas cacheadas): código inexistente → 400; departamento de otra área → 400 (hoy "manda el más específico" y la pantalla mostraría Área X con productos del Departamento de Y). Evita además llamadas a CATI y entradas de caché con códigos inventados (la caché de `catiClient.js:15` es un `Map` sin tope). Verificación: caso de uso con catálogo falso: `area=999` → 400 y `listarSkusPorJerarquia` no llamado; `area=A&departamento=<de B>` → 400.

**I3. Área y Departamento por SKU en la Lista (P3) sin fan-out a CATI.** Prohibido `obtenerProducto(sku)` por SKU (hasta miles de llamadas por descarga, con el semáforo tomado). Opciones aceptables: inversión de la jerarquía cacheada (`listarSkusPorJerarquia` por área/departamento, ya deduplicada) o, si se usa `Producto.categoria_nivel1/2`, rotular la columna como dato registrado (no CATI) en el contrato. Si la fuente CATI falla, la descarga responde 503; no se entrega un archivo con la columna vacía en silencio. Verificación: caso de uso con catálogo espía → número de llamadas acotado e independiente del número de SKU.

**I4. Consultas de `baseVersiones.js` parametrizadas.** `whereIn('planograma_version_id', versionIds)` o subconsulta Knex (`versionesMontables()`), sin `raw` concatenado; ≤ 50 parámetros. Verificación: revisión del diff (`grep -n "raw" back/src/infrastructure/repositories/baseVersiones.js` sin interpolación) y prueba de que el consolidado devuelve lo mismo antes y después de la extracción (mismo fixture en `consolidadoUsecases.test.js`).

**I5. Nombre de archivo y textos fijos.** `nombreArchivo` solo con `formato` (enumerado) y fecha; nunca códigos de área, búsqueda ni nombres de planograma (inyección en `Content-Disposition`). Encabezados, títulos de grupo TG/TM/TE y nombres de hoja son constantes del dominio; las celdas de datos pasan por `construirCelda`/`sanear` de `libroXlsx.js` (observaciones, nombres de producto y de planograma pueden empezar con `=`, `+`, `-`, `@`: deben quedar como `String`). La fila de grupo nueva usa el mismo `sanear`. Verificación: prueba de `libroXlsx` con fila de grupo y una observación `=HYPERLINK("http://x")` → celda `type: String`; prueba de `nombreArchivo('PIVOTE', fecha)` = patrón fijo.

**I6. Logs sin datos de la query.** El log de exportación solo con `numeroEmpleado`, formato, número de versiones, filas y ms (como `01` §4.2); sin `busqueda`, sin valores de filtros, sin token, sin ids de posición. Verificación: revisión del diff.

### Menores

**M1. Instantánea no transaccional.** `cargarBaseVersiones` hace 6 lecturas sin transacción; una edición concurrente de la versión puede dejar una posición en un nivel que no aparece. Solo lectura y de bajo impacto: documentar en el contrato; no exige `SNAPSHOT`.

**M2. Limitador propio del exportar.** `01` decide instancia propia con el mismo cupo: un usuario puede hacer 5 + 5 descargas por minuto entre consolidado y por planograma. Aceptable porque el semáforo es único; dejarlo escrito en el contrato.

**M3. Front.** El botón Descargar solo se pasa por `controles` desde `ProductosPorVersion` (no aparece en la vista del Implementador); el nombre del archivo guardado lo arma el front con `nombreArchivo` (no se lee de la cabecera); `URL.revokeObjectURL` tras la descarga. Verificación: prueba de `descargaPorVersion.test.ts` para `construirQueryExportacion` (no serializa claves vacías ni filtros de columnas ocultas).

## 3. Pruebas de abuso (el desarrollador las cubre)

| # | Caso | Esperado |
|---|---|---|
| A1 | Usuario solo-implementador llama `GET /implementacion/productos/exportar?versionIds=1&formato=LISTA` | 403 (antes que cualquier 400) |
| A2 | Sin token | 401 |
| A3 | `versionIds` con 51 ids, repetidos, `0`, `-1`, `1e3`, `9007199254740993`, o parámetro repetido | 400 sin tocar la BD ni el limitador |
| A4 | `formato=PIVOTE&formato=LISTA` / `formato=CSV` | 400 |
| A5 | `area=X' OR 1=1--`, `area=../`, `area=` (vacío), 21 caracteres | 400; CATI no llamado |
| A6 | `area=999` inexistente / departamento de otra área | 400 (I2); CATI de SKUs no llamado |
| A7 | CATI devuelve 500 o vence el timeout con `area` presente (listado y exportar) | 503, sin lista sin filtrar ni archivo |
| A8 | Filtro por columna con clave `__proto__`, `constructor` o inexistente | 400 |
| A9 | Expresión numérica patológica o búsqueda de 10 000 caracteres | 400 inmediato |
| A10 | Filtro de inventario sin `tiendaId`, o con `tiendaId` inactiva/inexistente | 400 / 404 |
| A11 | (si el PLAN usa claves de filas) clave con `versionId` fuera de `versionIds` o SKU inexistente | descartada; el archivo nunca incluye filas fuera de `versionIds` |
| A12 | `versionIds` con un id inexistente | 404 con `details.versionIds` |
| A13 | Pivote con TG borrador + TG borrador del mismo planograma | 422 `PIVOTE_NO_APLICABLE` con ambos ids |
| A14 | Pivote con TG piloto + TG publicado del mismo planograma | 200; dos filas por SKU–modo, publicado primero |
| A15 | Pivote solo con versiones especiales de tienda / versión sin tipo | 422 |
| A16 | Exportación del consolidado en curso y llega una por planograma (y viceversa) | 503 `EXPORTACION_EN_CURSO`; base no cargada |
| A17 | Error de BD a mitad de la carga, luego otra descarga | la segunda no recibe 503 (semáforo liberado) |
| A18 | 6.ª descarga en el minuto del mismo usuario | 429 |
| A19 | Observación de posición `=HYPERLINK("http://x","clic")` y nombre con `\x07` | celda texto, sin fórmula ni carácter de control |
| A20 | Consolidado tras el cambio con una versión borrador en la base | el borrador no aparece |
| A21 | Archivo Pivote reimportado en una versión TG | lee solo el bloque TG; `Varía` da error bloqueante; repetidos omitidos y reportados |

## 4. Deuda detectada

| Propuesta | Severidad | Detalle |
|---|---|---|
| Nueva | Media | Caché de `catiClient.js` (`Map` en línea 15) sin tope de entradas ni limpieza activa: cada código de jerarquía distinto agrega una entrada que vive hasta que se vuelva a leer. Mitigado en este cambio con I2; falta un tope (LRU) general. |
| Nueva | Baja | `GET /implementacion/productos` sin limitador antes de este cambio (se corrige con I1 si entra en el PLAN; si no, registrar). |
| Nueva | Baja | Reimportar un Pivote con varias filas por SKU depende del orden ("gana la primera"); el lector no avisa que el archivo mezcla estados. Mitigado con B7 (orden fijo); falta aviso explícito en el importador. |
| Existentes que toca | — | DT-10 / DT-11 (cualquier analista descarga borradores y especiales de cualquier tienda: aceptado), DT-46 (el listado del módulo 16 sigue sin Joi estricto salvo `area`/`departamento`), DT-48 (generación síncrona), DT-53 (este endpoint ya toma el semáforo antes; el consolidado sigue igual), DT-43 (no agravar: B5/B7 piden literales compartidos probados en ambos lados). |
