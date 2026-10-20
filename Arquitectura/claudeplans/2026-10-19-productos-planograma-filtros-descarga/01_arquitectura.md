# 01 — Arquitectura: filtros Área/Departamento y descarga en Productos por planograma

- **Etapa**: 1 (impacto) · **Tamaño**: M · **Fecha**: 2026-10-19 · **Commit base**: `b34524e`

## 1. Entendimiento

En **Productos → Por planograma** (ruta `/por-version`, página `front/src/pages/ProductosPorVersion/`,
endpoint `GET /api/v1/implementacion/productos`) se agrega un filtro **Área › Departamento** (jerarquía CATI)
y un botón **Descargar** que genera un `.xlsx` de los SKU de las versiones elegidas en dos formatos:
**Lista** (una fila por SKU–versión–modo: planograma, cross, impulso) y **Pivote por versión** (una fila por
SKU–planograma–modo con tres bloques horizontales TG / TM / TE, como el Excel de categorías que se importa).

Referencias identificadas:
- **Productos por tienda** = Consolidado Tiendas (módulo 21, `/mantenimiento/consolidado-tiendas`): ya tiene
  filtro de jerarquía CATI (`CadenaJerarquia`), fila por versión–SKU–modo (`construirFilasPorVersion` en
  `back/src/domain/consolidado/consolidado.entity.js`) y exportación `.xlsx` en servidor (`libroXlsx.js`,
  semáforo, limitador 5/min, tope de filas). Es el patrón a reutilizar.
- **Excel de categorías** = archivo que lee `front/src/utils/excelProductosPlanograma.ts`: columnas comunes
  (`SKU`, `Descripcion`, `Modo`…) y un bloque por tamaño con sufijo `_TG|_TM|_TE` (`Facings_TG`,
  `Nombre_accesorio_TG`, `Tamano_accesorio_TG`, `Min_final_TG`…, ganchos `TG1..TGn`). Bloque ↔ `PlanogramaVersion.tipo`:
  GRANDE → TG, MEDIANA → TM, EXPRESS → TE.

Casos de uso: el contrato de Por versión dice "CU pendiente de registrar". Se registran **CU-10-05**
(Consultar productos por planograma, con filtro de jerarquía) y **CU-10-06** (Descargar productos por planograma).
Relacionados: CU-10-03/04 (consolidado), CU-10-01 (filtro de jerarquía CATI).

## 2. Flujo de proceso

Actor único: **Analista** (regla A, `requiereAnalista`). Solo lectura; no hay estados ni transiciones nuevas.

1. El analista elige versiones (modal existente, ≤ 50, en la URL `?versiones=`), opcionalmente una tienda (inventario).
2. **Nuevo**: elige Área y, dentro de ella, Departamento. La tabla se vuelve a pedir al servidor con la jerarquía;
   solo quedan las posiciones cuyos SKU pertenecen al nivel elegido según CATI. Búsqueda y filtros por columna
   siguen siendo del cliente, sobre ese resultado.
3. **Nuevo**: pulsa **Descargar** → modal con el formato (Lista | Pivote por versión) → el servidor genera el
   `.xlsx` con las versiones elegidas y la jerarquía, y el navegador lo guarda.
   - **Lista**: una fila por versión–SKU–modo (si el SKU está en varias posiciones de la versión con el mismo modo,
     una sola fila con sus ubicaciones agregadas, igual que el consolidado). Un SKU en planograma y cross de la
     misma versión da dos filas.
   - **Pivote por versión**: clave de fila = SKU + planograma + modo. Cada bloque (TG, TM, TE) se llena con la
     versión elegida de ese planograma y de ese tipo; si el SKU no está con ese modo en esa versión, el bloque queda
     vacío (ej. cross solo en TG). Requiere a lo sumo **una** versión elegida por planograma y tipo, y que todas
     tengan tipo (ver §4 y preguntas).

Diferencia a tener presente: la tabla en pantalla es **una fila por posición**; la descarga es **una fila por
versión–SKU–modo** (Lista) o por SKU–planograma–modo (Pivote). La tabla no cambia de granularidad (ver P1).

## 3. Impacto por capa

| Capa | Archivo / módulo | Cambio |
|---|---|---|
| Dominio | `back/src/domain/consolidado/consolidado.entity.js` | `construirFilasPorVersion(base, { estados })`: hoy descarta lo no montable (`ESTADOS_MONTABLES`); recibe opcionalmente los estados admitidos (por defecto los montables, el consolidado no cambia). Las filas incluyen `tipoVersion`. |
| Dominio | `back/src/domain/implementacion/exportacionPorVersion.entity.js` (nuevo) | `construirHojaLista(filas, productos)`, `construirHojaPivote(filas, versiones, productos)`, `validarPivote(versiones)` (sin tipo / duplicadas por planograma+tipo), `contarFilas(formato, …)`, `nombreArchivo`. Puro, con pruebas. |
| Dominio | `back/src/domain/implementacion/columnasExportacion.js` (nuevo) | Columnas fijas de Lista y del bloque del Pivote. Reusa `COLUMNAS_CONSOLIDADO` (mismo texto de celda: ganchos, montaje, `Varía`) y agrega `planograma`, `tipo`, `estadoVersion` con etiquetas para todos los estados (`borrador`, `en_desarrollo`, `piloto`, `publicado`). |
| Dominio | `back/src/domain/implementacion/implementacion.usecases.js` | `obtenerProductosPorVersion` recibe `catalogo` y `jerarquia`: resuelve SKUs CATI **antes** de leer posiciones y filtra `data` (y los SKU que van a inventario). Nuevo `exportarProductosPorVersion` (orden: validar versiones 404 → pivote 422 → jerarquía CATI → semáforo → base → filas → tope 422 → libro → liberar). |
| Dominio | `back/src/domain/implementacion/implementacion.repository.js` | Contrato: `cargarBaseVersiones(versionIds)`. |
| Aplicación | `back/src/application/implementacion/implementacion.schemas.js` (nuevo) | `schemaExportar` Joi estricto (`validarQueryEstricta`, sin `stripUnknown`); fragmentos `listaEnteros` y `PATRON_JERARQUIA` se mueven de `consolidado.schemas.js` a `application/compartido/` y ambos los importan. |
| Aplicación | `back/src/application/implementacion/implementacion.controller.js` | `obtenerProductosPorVersion` lee `area`/`departamento` (mismo patrón); nuevo `exportar` (cabeceras como el consolidado). Inyecta `catiClient`, `escribirLibroXlsx`, semáforo compartido. |
| Aplicación | `back/src/application/consolidado/semaforo.js` → `application/compartido/semaforo.js` + instancia única `semaforoExportacion` | Un solo semáforo de 1 para **todas** las exportaciones `.xlsx` del proceso (consolidado y por planograma), porque ambas bloquean el event loop. |
| Infraestructura | `back/src/infrastructure/repositories/baseVersiones.js` (nuevo) | Extrae de `consolidado.repository.js` las 5 consultas de estructura (góndolas, secciones, niveles, posiciones+producto, accesorios) parametrizadas por una subconsulta o lista de ids. `consolidado.repository.js` lo usa con `versionesMontables()`; sin cambio funcional. |
| Infraestructura | `back/src/infrastructure/repositories/implementacion.repository.js` | `cargarBaseVersiones(versionIds)` (≤ 50 ids como parámetros): versiones con `tipo`, `estado`, `planograma_id`, `version_base_id`, más la estructura de `baseVersiones.js`. |
| Infraestructura | `back/src/infrastructure/exportacion/libroXlsx.js` | Soporte opcional de una fila de encabezado de grupo (títulos TG/TM/TE sobre su bloque) para el Pivote. Si `write-excel-file@4.1.1` no permite `span`, se repite el título en cada celda del bloque. Sin paquete nuevo. |
| Infraestructura | `back/src/infrastructure/http/routes/implementacion.routes.js` | `GET /productos/exportar` con `validarQuery(schemaExportar)` → `exportacionLimiter` → controller (el router ya tiene `requiereAnalista`). |
| BD | — | Sin migración. |
| Front | `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx` | En `controles`: `CadenaJerarquia` limitada a 2 niveles y botón Descargar (deshabilitado sin versiones elegidas). Estado de jerarquía local (no en la URL, igual que el consolidado). |
| Front | `front/src/components/dominio/productos/CadenaJerarquia/CadenaJerarquia.tsx` | Prop `niveles?: number` (def. 5) para mostrar solo Área y Departamento. El consolidado no cambia. |
| Front | `front/src/components/dominio/implementacion/DescargarProductosVersionModal/` (nuevo) | Elegir formato; aviso si el Pivote no aplica (sin tipo o dos versiones del mismo planograma y tipo); estados cargando / error (422, 429, 503). |
| Front | `front/src/services/implementacion.service.ts`, `front/src/hooks/useImplementacion.ts` | `productosPorVersion(ids, tiendaId, jerarquia)`; `descargarProductosPorVersion(query)` con `httpClient.getBinario`. |
| Front | `front/src/domain/implementacion/descargaPorVersion.ts` (+ `.test.ts`) | `construirQueryExportacion`, `nombreArchivo`, `pivoteAplicable(versiones)` (misma regla que el back, para avisar antes de pedir). |
| Front | `ProductosVersiones` (compartido con el Implementador) | Sin cambio: todo entra por la prop `controles`. La vista del Implementador no cambia. |
| Docs | `Contratos/16_implementacion/`, `ENDPOINTS.md` (sección 16 no existe hoy), `CASOS_DE_USO.md`, `ESTADO_MODULOS.md` | Contrato nuevo de exportación, diferencias del listado, CU-10-05/06. |
| Postman | carpeta `16 - Implementación` | Casos de jerarquía y de exportar (ver §4). |

## 4. Contratos

### 4.1 Modificado — `GET /api/v1/implementacion/productos` (`Contratos/16_implementacion/GET_implementacion_productos_por_version.md`)

Diferencias con el contrato vigente:

| Parámetro | Regla | Semántica |
|---|---|---|
| `area` | `^[A-Za-z0-9_-]{1,20}$`, opcional; vacío → 400 | Código CATI del área. |
| `departamento` | mismo patrón, opcional | Código CATI del departamento. Si vienen ambos, manda el más específico (`nivelJerarquiaMasEspecifico`). |

- Con jerarquía: los SKU del nivel se piden a CATI (`catiClient.listarSkusPorJerarquia`, con caché y deduplicación
  en vuelo) **antes** de leer posiciones. CATI caído → `503 SERVICE_UNAVAILABLE` sin datos parciales. Sin jerarquía
  no se llama a CATI (como hoy).
- `data` y `total` quedan filtrados. `versiones[]` (resumen por versión: `totalProductos`, inventario, evidencias)
  **no** se filtra: describe la versión completa.
- Errores nuevos: `400 VALIDATION_ERROR` (jerarquía mal formada), `503 SERVICE_UNAVAILABLE`.

### 4.2 Nuevo — `GET /api/v1/implementacion/productos/exportar` (`Contratos/16_implementacion/GET_implementacion_productos_exportar.md`)

Actor Analista, regla A (DT-11). Capas: `requiereAnalista` → `validarQuery(schemaExportar)` → `exportacionLimiter`
(5/min por usuario, **mismo** contador que el consolidado si se reutiliza la instancia; decisión: instancia propia
con el mismo cupo) → controller.

Query (estricta; desconocido o repetido → 400):

| Parámetro | Regla |
|---|---|
| `versionIds` | csv de enteros positivos únicos, 1–50 (mismo tope que el listado). Requerido. |
| `formato` | `LISTA \| PIVOTE`. Requerido. |
| `area`, `departamento` | Como en 4.1. |

No acepta `tiendaId`, `busqueda` ni filtros por columna (ver P5, P6).

Reglas:
1. Cada `versionId` debe existir (cualquier estado) → si no, `404 NOT_FOUND` con `details.versionIds`.
2. `PIVOTE`: todas las versiones con `tipo` y a lo sumo una por `planograma_id` + `tipo` → si no,
   `422 PIVOTE_NO_APLICABLE` con `details: { sinTipo: [ids], duplicadas: [{ planogramaId, tipo, versionIds }] }`.
3. Filas: posiciones con `sku` no nulo y `modo` ≠ `PENDIENTE`, agregadas por versión–SKU–modo con las reglas del
   consolidado (`construirFila`: ubicaciones, ganchos, accesorios, `Varía`). Se incluyen `ACTIVO` e `INACTIVO`
   (columna Decisión).
4. Orden: Lista → SKU, código de versión, modo (Planograma, Cross, Impulso). Pivote → SKU, nombre del planograma, modo.
5. Columnas fijas (propuesta, a confirmar en P3/P4):
   - **Lista** (hoja `Lista`): SKU, Producto, Planograma, Versión, Tipo (TG/TM/TE), Estado de la versión, Modo,
     Góndola, Sección, Nivel, Posición en nivel, Ganchos, Accesorio de montaje, Montaje, Facing horizontal, Cantidad
     apilable, Capacidad del facing, Capacidad máxima, Mín. estético, Mín. final, Máx. final, Perfil de redondeo,
     Decisión, Observaciones, SKU sustituto.
   - **Pivote** (hoja `Pivote por versión`): comunes SKU, Producto, Planograma, Modo, SKU sustituto; luego bloques
     **TG, TM, TE** (orden del Excel de categorías, ver P4), cada uno con: Versión, Estado, Ganchos, Accesorio de
     montaje, Facing horizontal, Cantidad apilable, Capacidad del facing, Capacidad máxima, Mín. estético, Mín. final,
     Máx. final, Perfil de redondeo, Decisión, Observaciones. Fila de grupo con el título del bloque.
6. Tope de filas: el de `env.consolidado.exportacionMaxFilas` (def. 100 000) → `422 EXPORTACION_DEMASIADO_GRANDE`
   con `details: { filas, maximo }`. Con 50 versiones es prácticamente inalcanzable; se mantiene como defensa.
7. Semáforo compartido de 1 → `503 EXPORTACION_EN_CURSO`. A diferencia del consolidado (DT-53), el semáforo se toma
   **antes** de cargar la base.
8. Seguridad del libro: la de `libroXlsx.js` (texto siempre `String`, sin fórmulas, sin caracteres de control,
   encabezados y nombres de hoja fijos).

Respuesta 200: binario `.xlsx`, `Content-Type` de spreadsheetml, `Content-Disposition: attachment;
filename="productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx"`, `Cache-Control: no-store`, `Content-Length`.
Errores: `400 VALIDATION_ERROR`, `401`, `403 FORBIDDEN`, `404 NOT_FOUND`, `422 PIVOTE_NO_APLICABLE`,
`422 EXPORTACION_DEMASIADO_GRANDE`, `429 RATE_LIMITED`, `503 SERVICE_UNAVAILABLE` (CATI), `503 EXPORTACION_EN_CURSO`,
`500 INTERNAL_ERROR` (JSON, nunca archivo truncado). Log: `[implementacion] exportacion numeroEmpleado=… formato=… versiones=N filas=… ms=…`.

## 5. Datos

- **Sin migración** (siguiente número disponible sería `019`). Todo sale de `PlanogramaVersion` (`tipo`, `estado`,
  `planograma_id`, `version_base_id`), estructura de góndolas y `Producto`.
- Índices: los de la `017` (FK de góndola/sección/nivel/posición/accesorio) cubren las consultas por
  `planograma_version_id IN (…)`. Nada nuevo.
- Retrocompatible: el listado sin `area`/`departamento` responde igual que hoy. Versiones sin `tipo` (posibles en
  datos antiguos) se aceptan en Lista (columna Tipo vacía) y bloquean el Pivote con 422 explícito.
- `Producto.categoria_nivel1/2` (texto "solo para mostrar") **no** se usa para filtrar (ver §7).

## 6. Rendimiento y escalabilidad

- Volumen: ≤ 50 versiones por consulta; una versión tiene decenas a pocos cientos de posiciones → Lista ≲ 25 000
  filas, Pivote menos. Sin paginación (igual que el listado actual).
- Exportación: 6 consultas en bloque (`cargarBaseVersiones`) con ≤ 50 parámetros, sin N+1. `recorrerVersion` una vez
  por versión en memoria.
- Listado: hoy `ganchosPorPosicion` llama `skuRepo.cargarVersion` **una vez por versión, en serie** (hasta 50 viajes
  × varias consultas). No se toca en este cambio; se registra como deuda (§10). Con jerarquía, filtrar las filas
  antes de consultar inventario reduce la llamada a CATI de inventario.
- `accesoriosDePosiciones(posicionIds)` del listado pasa ids como parámetros: con 50 versiones grandes puede acercarse
  al límite de 2 100 de SQL Server. La exportación no lo usa (subconsulta/ids de versión). Deuda (§10).
- Generación síncrona del libro en el event loop (DT-48), mitigada con semáforo compartido y tope.
- Sin transacciones: todo es lectura.

## 7. Alternativas descartadas y decisión

- Filtrar por `Producto.categoria_nivel1/2` en el cliente: es texto congelado al registrar el SKU ("solo para
  mostrar"), puede estar desactualizado o vacío y no coincide con el filtro CATI del consolidado y de Productos.
- Generar el `.xlsx` en el front: no hay librería de escritura en el front (`read-excel-file` solo lee); duplicaría la
  sanitización de celdas que hoy vive solo en `libroXlsx.js`.
- CSV: no admite los bloques horizontales con título ni tipos de celda; el consolidado ya fijó `.xlsx`.
- Columnas elegibles por el usuario (como el consolidado): el Pivote necesita estructura fija y elegir columnas
  agrega una segunda lista blanca duplicada en el front (agrava DT-43).
- Pivote eligiendo automáticamente "la mejor" versión por tipo (publicado > piloto > …): esconde versiones que el
  analista eligió; se prefiere un 422 explícito y el aviso previo en el modal.
- Endpoint en el módulo 21: el consolidado está atado a versiones montables y a tiendas; Por planograma es módulo 16.

**Decisión recomendada**: filtro de jerarquía CATI en servidor sobre el listado existente; exportación `.xlsx` en un
endpoint nuevo del módulo 16 que reutiliza la tubería de filas del consolidado (`construirFilasPorVersion`
parametrizada por estados), la carga de estructura extraída a `baseVersiones.js`, `libroXlsx.js` y un semáforo único
para todas las exportaciones. Columnas fijas por formato.

## 8. Preguntas abiertas (para el usuario)

1. **Tabla en pantalla**: ¿"un producto planograma versión por fila, una fila por modo" describe la **descarga** o
   también quieren que la **tabla** de Por planograma pase de una fila por posición a una por SKU–versión–modo?
   (Recomendado: solo la descarga.)
2. **"Consolidado"**: en "planograma, consolidado e impulso", ¿"consolidado" es **Cross**? (Los modos que existen son
   Planograma, Cross e Impulso.)
3. **Columnas de la Lista**: ¿sirve la lista propuesta en §4.2 regla 5? ¿Incluir Área y Departamento del producto?
   ¿Incluir inventario cuando hay tienda elegida?
4. **Bloques del Pivote**: ¿qué columnas lleva cada bloque TG/TM/TE (¿igual al Excel de categorías: facings, cantidad
   por facing, vertical, mín. estético, capacidad máx., accesorio y tamaño, perfil, mín./máx. final, observaciones,
   ganchos?) y en qué orden van los bloques (TG, TM, TE como el archivo, o TG, TE, TM)? ¿Los encabezados deben ser los
   del Excel de categorías (`Facings_TG`, …) para poder reimportarlo, o etiquetas legibles?
5. **Versiones del Pivote**: si el analista elige dos versiones del mismo planograma y tipo (p. ej. TG publicada y TG
   piloto, o una especial de tienda), ¿se bloquea el Pivote (recomendado) o se toma una por prioridad (cuál)?
   ¿Las versiones especiales por tienda entran en el Pivote?
6. **Alcance de la descarga**: ¿respeta solo versiones + Área/Departamento (recomendado), o también la búsqueda y los
   filtros por columna de la tabla?
7. **Formato**: `.xlsx` (recomendado); ¿se necesita además CSV?

## 9. Para UX y para Seguridad

**Para UX**
1. Ubicación del filtro Área › Departamento y del botón Descargar dentro de `controles` de `ProductosVersiones`,
   sin romper la vista del Implementador que comparte el componente.
2. Modal de descarga: elección Lista / Pivote con explicación corta de cada uno; Pivote deshabilitado con motivo
   (versión sin tipo, dos versiones del mismo planograma y tipo).
3. Qué pasa con el resumen por versión (no filtrado) frente a la tabla filtrada por jerarquía: cómo comunicarlo.
4. Estados: cargando la jerarquía, CATI caído (503), descarga en curso, 422 de tope, 429, 503 en curso.
5. Diseño del Pivote en Excel: fila de grupo TG/TM/TE, anchos y legibilidad de un libro de ~45 columnas.

**Para Seguridad**
1. Query estricta del endpoint nuevo (Joi sin `stripUnknown`, parámetros repetidos, topes de csv) y validación de
   `area`/`departamento` en el listado, que hoy usa los helpers `parsear*` (DT-46).
2. Inyección de fórmulas y caracteres de control en celdas (nombres, observaciones, notas de desborde) vía `libroXlsx.js`.
3. Semáforo compartido tomado antes de cargar la base; limitador por usuario; tope de filas; consumo de memoria.
4. Autorización: regla A transitoria (DT-11), fila nueva en `matrizPermisos.test.js`, `rutasProtegidas.test.js`;
   versiones en cualquier estado (borradores) descargables por cualquier analista.
5. Errores CATI (503 sin datos parciales) y logs sin token ni valores de la query.

## 10. Deuda detectada

| Propuesta | Severidad | Detalle |
|---|---|---|
| Nueva | Baja | Listado Por versión: `ganchosPorPosicion` carga cada versión en serie (`skuRepo.cargarVersion` × hasta 50). Migrar a `cargarBaseVersiones` + `recorrerVersion`. |
| Nueva | Baja | `accesoriosDePosiciones(posicionIds)` pasa ids de posición como parámetros; con muchas versiones puede rozar el límite de 2 100. |
| Nueva | Baja (docs) | `ENDPOINTS.md` no tiene sección del módulo 16 (implementación); el contrato de Por versión cita un CU no registrado. Se corrige en este cambio. |
| Existentes que toca | — | DT-11 (regla A), DT-43 (no se agrava: columnas solo en el back), DT-46 (módulo 16 sin Joi estricto en el listado), DT-48/DT-53 (exportación síncrona; el endpoint nuevo toma el semáforo antes de la base), DT-52 (tablas duplicadas; no se agrava). |
