# 01 — Arquitectura: Consolidado Tiendas

> Etapa 1 **actualizada** (2026-10-15) con el prototipo aprobado (`02_ux.md`, rondas 1–4) y las
> preguntas resueltas de `00_solicitud.md`. Reemplaza a la versión previa al prototipo. Lo que ya no
> aplica de esa versión está al final, en "Superado".

## 1. Entendimiento

Vista nueva **Consolidado Tiendas** (grupo **Mantenimiento** de la barra superior, analista, solo
lectura) con todas las combinaciones **SKU–tienda–versión** de lo que cada tienda monta (versiones
`publicado` y `piloto` asignadas). Tres vistas: **Planograma** (fila por SKU–tienda–versión en modo
PLANOGRAMA, ubicaciones sumadas como el módulo 19; cross/impulso como sub-filas del grupo SKU–tienda;
SKU solo cross/impulso como fila "Sin planograma"), **Solo cross** y **Solo impulso** (esas
apariciones como filas principales). Mismas columnas en filas y sub-filas, reordenables/ocultables.
Rojo si el SKU está en más de un planograma en la tienda, calculado **sin filtros**. Filtros
multiselección (tienda, planograma versión, estado de la versión), jerarquía CATI de 5 niveles (un
valor por nivel), búsqueda y "Solo con más de un planograma". Modo extendido. **Descarga .xlsx** en 3
formatos (Detallado, Min/Max agregado, Hojas separadas 1–3 hojas) que respeta filtros y solo las
columnas visibles en su orden.

Casos de uso nuevos (en CU-10): **CU-10-03 Consultar consolidado SKU–tienda** y **CU-10-04 Descargar
consolidado a Excel**. Se apoyan en CU-02-05 (asignación a tiendas), CU-04-16 (SKU en la versión:
ganchos, mín./máx.) y CU-10-01 (filtro por jerarquía CATI).

## 2. Flujo de proceso

No cambia ningún proceso ni estado: es una consulta derivada de `VersionTienda` → versión montable →
góndolas → niveles → posiciones. Cualquier cambio en Estructura, publicación, lienzo o mín./máx.
(módulo 19) se ve en la siguiente consulta. Nada se edita aquí.

Analista: Mantenimiento → Consolidado Tiendas → elige vista (Planograma / Solo cross / Solo impulso)
→ filtra → expande grupos → (opcional) ajusta columnas → Descargar → elige formato (y hojas) → recibe
el `.xlsx` con las columnas visibles en su orden y los filtros activos (la vista no influye: manda el
formato).

## 3. Impacto por capa

| Capa | Archivo / módulo | Cambio |
|---|---|---|
| Dominio | `back/src/domain/consolidado/consolidado.entity.js` (nuevo) | Funciones puras: `agregarPorSkuYModo(recorrido)` (fila por versión–SKU–modo), `expandirPorTienda`, `contarPlanogramasPorSkuTienda` (sin filtros), `aplicarFiltros`, `agruparPorSkuTienda`, `ordenar`, `paginar`, `sumarMinMaxAgregado`, `construirHojas(formato, hojas, columnas, datos)`. |
| Dominio | `back/src/domain/consolidado/columnas.js` (nuevo) | Lista blanca `COLUMNAS_CONSOLIDADO`: `{ clave, etiqueta, tipo, valor(fila, grupo) }` (24 claves, ver §4.4). Fuente única de las etiquetas del Excel. |
| Dominio | `back/src/domain/consolidado/consolidado.usecases.js` + `consolidado.repository.js` (contrato) | `listarConsolidado({ repo, catalogo }, filtros)`, `exportarConsolidado({ repo, catalogo }, filtros, opciones)`, `obtenerFiltros({ repo })`. |
| Dominio (reuso) | `back/src/domain/skuVersion/skuVersion.entity.js` | **Sin cambios de comportamiento**: se reutiliza `recorrerVersion` tal cual y se exporta `valorComun` (hoy privado). |
| Dominio (reuso) | `back/src/domain/producto/producto.entity.js` | Se reutiliza `nivelJerarquiaMasEspecifico`; puerto `catalogo.listarSkusPorJerarquia` (CATI, caché 30 min) igual que `listarProductos`. |
| Aplicación | `back/src/application/consolidado/consolidado.controller.js` + `consolidado.schemas.js` (nuevos) | Joi de query (filtros comunes + paginación + exportación), respuesta paginada, envío del `.xlsx`. |
| Infraestructura | `back/src/infrastructure/repositories/consolidado.repository.js` (nuevo) | `cargarBase({ tiendaIds })`: 6 consultas masivas (versiones montables asignadas, asignaciones, góndolas, secciones, niveles, posiciones + producto, accesorios) filtradas por **subconsulta**, sin listas de ids. `filtrosDisponibles()`. |
| Infraestructura | `back/src/infrastructure/repositories/skuVersion.repository.js` | Extraer los mapeadores fila→objeto de `cargarVersion` a `mapeadoresVersion.js` compartido (mismas formas para `recorrerVersion`), sin cambio de comportamiento. |
| Infraestructura | `back/src/infrastructure/exportacion/libroXlsx.js` (nuevo) | Adaptador: `escribirLibroXlsx(hojas) → Buffer` con `write-excel-file/node`. Único archivo que conoce la librería. |
| Infraestructura | `back/src/infrastructure/http/routes/consolidado.routes.js` + `routes/index.js`; `middlewares/rateLimit.js` | Rutas con `requiereAnalista`; `exportacionLimiter` (5/min por usuario). |
| Config | `back/src/config/env.js`, `back/package.json` | `CONSOLIDADO_EXPORTACION_MAX_FILAS` (def. 100 000); dependencia `write-excel-file` (exacta). |
| BD | `back/src/infrastructure/db/migrations/017_indices_consolidado.js` | Solo índices (§5). |
| Front — navegación | `front/src/domain/permisos/permisos.ts` (`OpcionNavegacion` con `hijos?`), `constants/navegacion.ts`, `components/dominio/layout/AppTopbar` | Grupo desplegable "Mantenimiento" → "Consolidado Tiendas"; ruta `/mantenimiento/consolidado-tiendas` en `router/routes.tsx`. |
| Front — layout | `components/layout/Layout` (o equivalente) + contexto `ModoExtendidoContext` | Ocultar la barra superior en modo extendido. |
| Front — página | `front/src/pages/ConsolidadoTiendas/` (nuevo) | Página, filtros, modo extendido, paginación (`ui/Paginacion` existente). |
| Front — dominio | `front/src/domain/consolidado/columnasConsolidado.ts` (+ `.test.ts`) | Claves (idénticas a la lista blanca del back), etiquetas, celdas, preferencias (localStorage `consolidado-tiendas:columnas`). |
| Front — reuso | `front/src/domain/implementacion/columnasProductos.ts`, `components/dominio/implementacion/PanelColumnas/` | Generalizar preferencias y panel con genérico `<K extends string>` (Por versión no cambia de comportamiento). |
| Front — reuso | `components/dominio/implementacion/SeleccionVersionesModal/` → **mover** a `components/dominio/modales/SeleccionVersionesModal/` | Sin cambios de props; actualizar import en `ProductosVersiones`. |
| Front — reuso | `components/dominio/productos/ProductosFiltros/` → extraer `components/dominio/productos/CadenaJerarquia/` | Cadena de 5 selects + `NIVELES_JERARQUIA` + hooks `useJerarquia`/`useJerarquiaExploracion`; Productos y Consolidado la comparten. |
| Front — reuso | `components/ui/SeleccionMultipleModal` | Ocultar "Ordenar por" con menos de 2 órdenes (filtro de estado). |
| Front — nuevos | `components/dominio/consolidado/{ConsolidadoTable, ConsolidadoFiltros, DescargarConsolidadoModal}`; `services/consolidado.service.ts`; `hooks/useConsolidado.ts`, `hooks/useFiltrosConsolidado.ts`; `types/consolidado.ts` | Tabla agrupada, barra de filtros, modal de descarga, servicio (incluye descarga como `Blob`), hooks. |
| Docs | `ENDPOINTS.md`, `CASOS_DE_USO.md`, `Contratos/21_consolidado/` (3 contratos), `ESTADO_MODULOS.md`, `ESTRUCTURA_FRONTEND.md` (modales/), Postman carpeta `21 - Consolidado tiendas` | Contratos y pruebas. |

Módulo nuevo **21 `consolidado`** (no en 16 `implementacion`, que es por versión y con inventario).

## 4. Contratos

Ninguno existe en `Arquitectura/Contratos/`. Más cercanos: `16_implementacion/GET_implementacion_versiones.md`
(lista de versiones; aquí se restringe a las asignadas) y `08_catalogo/GET_productos_listar.md`
(misma semántica de jerarquía CATI). Los tres endpoints usan `requiereAnalista`.

### 4.1 Filtros comunes (query; listado y exportación)

| Parámetro | Tipo / regla Joi | Semántica |
|---|---|---|
| `tiendaIds` | csv de enteros > 0, únicos, máx. 200 | O dentro del filtro. Vacío = todas. |
| `versionIds` | csv de enteros > 0, únicos, máx. 500 | Filtra filas y sub-filas por versión. |
| `estados` | csv ⊂ `publicado,piloto` | Vacío = ambos. |
| `area`, `departamento`, `familia`, `categoria`, `subcategoria` | string 1–20, `^[A-Za-z0-9_-]+$`; vacío → 400 | Se usa el más específico (`nivelJerarquiaMasEspecifico`); SKUs resueltos en vivo contra CATI. |
| `busqueda` | string ≤ 100, trim | SKU, nombre o marca (contiene, sin acentos/mayúsculas). |
| `soloDuplicados` | boolean, def. `false` | Solo grupos con `planogramasEnTienda > 1`. `true` con `vista ≠ PLANOGRAMA` → 400. |

Entre filtros, Y. Con filtro de versión/estado, las sub-filas también se filtran; si en un grupo solo
quedan sub-filas, el grupo sale con `planograma: []` (fila "Sin planograma" en el front).

### 4.2 `GET /api/v1/consolidado/tiendas` — listado

Query: filtros comunes + `vista` (`PLANOGRAMA|CROSS|IMPULSO`, def. `PLANOGRAMA`), `page` (≥ 1, def.
1), `pageSize` (`25|50|100|200`, def. 50), `orden` (`sku|producto|tienda|version`, def. `sku`),
`direccion` (`asc|desc`, def. `asc`). Desempate fijo: SKU, código de tienda, código de versión.

Paginación: en `PLANOGRAMA` la unidad es el **grupo SKU–tienda** (un grupo nunca se parte entre
páginas); en `CROSS`/`IMPULSO` la unidad es la fila. `total` cuenta unidades.

```json
{
  "data": [
    {
      "sku": "1200206",
      "producto": { "nombre": "…", "marca": "…", "skuSustituto": null, "nombreSustituto": null },
      "tienda": { "id": 7, "codigo": "101", "nombre": "Cemaco Zona 9", "tipo": "GRANDE", "marca": "Cemaco" },
      "planogramasEnTienda": 3,
      "planograma": [ { "…": "Fila" } ],
      "otras":      [ { "…": "Fila (modo CROSS/IMPULSO)" } ]
    }
  ],
  "total": 3130, "page": 1, "pageSize": 50,
  "resumen": { "filas": 3181, "skus": 1460, "tiendas": 8, "gruposConVariosPlanogramas": 48,
               "conteos": { "PLANOGRAMA": 3163, "CROSS": 18, "IMPULSO": 0, "AGREGADO": 3130 } }
}
```

En `CROSS`/`IMPULSO`, `data` es la misma forma de grupo con `planograma: []` y `otras` = la fila.
`resumen.conteos` son las filas que tendría cada formato/hoja de la descarga con los filtros actuales
(alimenta "Filas estimadas" del modal sin otra llamada).

**Fila** (una por versión–SKU–modo, ubicaciones de la versión sumadas, como el módulo 19):

```json
{
  "versionId": 210, "codigoVersion": "AUTOS 02-TG", "planogramaId": 165, "planogramaNombre": "Autos",
  "estadoVersion": "publicado", "modo": "PLANOGRAMA",
  "ubicaciones": [ { "posicionId": 64, "gondola": "G1", "porUbicar": false, "seccion": 1, "nivel": 3,
                     "orden": 2, "ganchos": [12, 13] } ],
  "accesorios": [ { "codigo": "R45-12", "tamanoPulgadas": 12 } ],
  "facings": 2, "cantidadApilable": 1, "capacidadFacing": 6, "capacidadMaxima": 12,
  "minEstetico": 4, "minFinal": 6, "maxFinal": 12, "minVaria": false, "maxVaria": false,
  "perfil": "MRP", "decision": "ACTIVO", "observaciones": "…",
  "montaje": { "colganteExterno": false, "display": false, "desborda": false, "notaDesborde": null }
}
```

Reglas de agregación: `facings` y `capacidadMaxima` se suman (capacidad `null` si alguna ubicación no
la tiene, igual que `agregarPorSku`); `minFinal`/`maxFinal`/`minEstetico`/`cantidadApilable`/
`capacidadFacing`/`perfil`/`decision` con `valorComun` (`null` + `…Varia` si difieren); `observaciones`
distintas unidas con ` · `; banderas de montaje = alguna ubicación la tiene; `seccion`/`nivel`/
`ganchos` salen de `recorrerVersion` (mismo índice de nivel y numeración que el módulo 19).

Errores: `400 VALIDATION_ERROR` (query inválida, listas sobre el tope, nivel de jerarquía vacío,
`soloDuplicados` fuera de PLANOGRAMA), `401`, `403` (sin regla A), `503 SERVICIO_NO_DISPONIBLE`
(con jerarquía: CATI caído o > 30 s, igual que `GET /catalog/productos`).

### 4.3 `GET /api/v1/consolidado/tiendas/filtros` — opciones de los modales

Sin query. `{ "tiendas": [ { id, codigo, nombre, tipo, marca, totalSkus } ], "versiones": [ VersionElegible ] }`.
Solo tiendas activas con al menos una asignación montable y versiones `publicado`/`piloto` con al menos
una tienda (texto del modal: "Versiones publicadas y en piloto asignadas a tiendas."). `totalSkus` =
SKUs distintos de la tienda (alimenta `conteo` de `SeleccionTiendasModal`); `VersionElegible` es el
tipo existente del front (`totalProductos` = SKUs distintos de la versión). Errores: `401`, `403`.
No se reutiliza `GET /implementacion/versiones`: incluye versiones sin tienda y su contrato es de Por
versión.

### 4.4 `GET /api/v1/consolidado/tiendas/exportar` — descarga .xlsx

**Generación en servidor.** Query: filtros comunes + `formato` (`DETALLADO|AGREGADO|HOJAS`, requerido),
`hojas` (csv ⊂ `PLANOGRAMA,CROSS,IMPULSO`, 1–3, requerido solo con `HOJAS`; prohibido en otros),
`columnas` (csv, requerido, 1–24 claves **de la lista blanca**, únicas; el orden recibido es el orden
del archivo). Sin `vista`, `page`, `orden` de usuario (se exporta ordenado por SKU, tienda, versión).

Lista blanca (claves = las del front, etiquetas = las de la tabla): `sku, producto, tienda, version,
estadoVersion, seccion, gondola, nivel, orden, ganchos, accesorio, montaje, facings, apilable,
capacidadFacing, capacidadMaxima, minEstetico, minFinal, maxFinal, perfil, modo, decision,
observaciones, sustituto`. Una clave fuera de la lista → `400` con `details: { columnasInvalidas }`.

Formatos:
- **DETALLADO** — una hoja "Consolidado": filas PLANOGRAMA, CROSS e IMPULSO (no la fila "Sin
  planograma"). La columna `modo` (etiqueta "Modo") se **agrega al inicio si no viene** en `columnas`:
  sin ella las filas son indistinguibles (única excepción a "solo visibles"; el modal lo dice).
- **AGREGADO** — una fila por SKU–tienda. `minFinal` y `maxFinal` = suma de las filas planograma +
  cross + impulso del grupo, **contando una sola vez cada versión** (en el módulo 19 el mín./máx. es
  único por SKU–versión para todas sus posiciones, sea cual sea el modo: sumar por fila contaría doble
  un cross de la misma versión; en DEV hoy hay 0 casos, así que coincide con "planograma + cross +
  impulso"). Valores `null` no suman; todos `null` → celda vacía. El resto de columnas sale de las
  filas PLANOGRAMA del grupo (si hay varias, valores unidos con ` | ` en orden de versión); SKU sin
  planograma → columnas de montaje vacías (supuesto de la pregunta 18 de UX).
- **HOJAS** — una hoja por tipo elegido ("Planograma", "Cross", "Impulso"), en ese orden fijo; una hoja
  elegida sin filas sale con solo encabezados.

Celdas: listas (góndolas, niveles, ganchos, accesorios) como texto unido con `, `; números como número;
todo texto como celda de texto (nunca fórmula: neutraliza inyección de fórmulas `=`, `+`, `-`, `@`).

Response `200`: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`Content-Disposition: attachment; filename="consolidado-tiendas-{detallado|minmax|hojas}-AAAAMMDD.xlsx"`,
`Cache-Control: no-store`. El front lo pide con `fetch` (Bearer) y lo guarda como `Blob`.

Errores: `400 VALIDATION_ERROR`; `401`; `403`; `422 EXPORTACION_DEMASIADO_GRANDE` con
`details: { filas, maximo }` si las filas del archivo superan `CONSOLIDADO_EXPORTACION_MAX_FILAS`
(se cuenta **antes** de generar); `429` (limitador); `503` (CATI, con jerarquía). Los errores son JSON
con la forma estándar (el front lee el cuerpo si `!res.ok`).

**Librería: `write-excel-file` 4.1.1 (nueva en back)**. Justificación: es la hermana de
`read-excel-file` (ya en el front, mismo autor), una sola dependencia (`fflate`), mantenida (2026),
entrada CommonJS `write-excel-file/node`, varias hojas por libro y tipos de celda explícitos.
Descartadas: `xlsx` (SheetJS) del registro npm está congelada en 0.18.5 con CVE conocidos
(prototype pollution y ReDoS); `exceljs` arrastra 9 dependencias y no publica desde 2023; su ventaja
(escritura en streaming) no hace falta con el tope de filas.

## 5. Datos

- **Sin tablas ni columnas nuevas.**
- Migración **`017_indices_consolidado.js`** (siguiente disponible), solo índices no únicos sobre FKs
  que hoy no tienen índice y que usan las consultas masivas de `cargarBase` y de `cargarVersion`:
  `Gondola(planograma_version_id)`, `Nivel(gondola_id)`, `Posicion(nivel_id)`,
  `PosicionAccesorio(posicion_id)` (**cierra DT-24**), `VersionTienda(tienda_id)`. `down` los elimina.
  Retrocompatible: no toca datos. (Se quita `Posicion(sku)` de la versión previa: esta consulta ya no
  filtra por SKU en SQL.)
- Antes de aplicar 017 en PROD, resolver DT-08 (`npm run migrate:status` contra PROD).
- Supuesto del dominio que el consolidado hereda: una versión por planograma por tienda (solo lo
  garantiza el dominio, no la BD). Si se rompe, el conteo "N planogramas" cuenta versiones distintas
  y lo seguiría marcando en rojo (comportamiento aceptable).

## 6. Rendimiento y escalabilidad

**Decisión: cálculo en memoria en el dominio sobre una base cargada en bloque**, no paginación SQL.

- El dato pesado es **por versión, no por tienda**: las filas SKU–tienda–versión son (filas de la
  versión) × (tiendas que la montan). `cargarBase` trae una vez todas las versiones montables
  asignadas (6 consultas, filtradas por subconsulta `planograma_version_id IN (SELECT … FROM
  VersionTienda JOIN PlanogramaVersion …)`, y por `tiendaIds` en SQL si viene ese filtro), corre
  `recorrerVersion` por versión, agrega por SKU–modo y recién entonces expande por tienda.
- El conteo de planogramas por SKU–tienda (rojo) se calcula antes de los filtros de versión, estado,
  jerarquía y búsqueda; el de tienda no lo altera porque el conteo es por tienda.
- Jerarquía: Set de SKUs de CATI (caché 30 min, páginas de 10 000) cruzado en memoria, como Productos;
  nunca `WHERE sku IN (…)` (2100 parámetros). Un área completa en frío ~10 s (medido en módulo 08).
- Volumen: DEV hoy 39 versiones montables, 79 asignaciones, 8 tiendas, 1 579 posiciones con SKU →
  ~3 200 filas. Estimado en PROD con catálogo completo: ~50 000 posiciones y 10⁵–3·10⁵ filas
  expandidas. Cálculo en memoria esperado < 1 s; objetivo **p95 < 2 s** por página sin jerarquía.
  Sin caché del resultado en esta entrega (los datos deben reflejar ediciones al instante); si en
  PROD se supera el objetivo, la medida es una caché de 60 s de la base (no de la respuesta).
- `recorrerVersion` una vez por versión por request (no por tienda ni por página).
- Exportación: misma tubería sin paginar; tope `CONSOLIDADO_EXPORTACION_MAX_FILAS` = 100 000 filas
  por archivo (suma de hojas), validado antes de generar; libro en memoria (~2,4 M celdas máx.),
  `exportacionLimiter` 5/min por usuario. Generación esperada < 15 s con el tope; muy por debajo del
  límite de 230 s de App Service. Descarga asíncrona: fuera de alcance.
- Solo lectura: sin transacción.

## 7. Alternativas descartadas y decisión

- Paginación SQL en dos pasos (claves SKU–tienda + filas): `recorrerVersion` igual necesita versiones completas, el conteo sin filtros complica el SQL y la jerarquía choca con el límite de 2100 parámetros → descartada.
- Una fila por posición (versión previa): el usuario eligió SKU–tienda–versión sumando ubicaciones → descartada.
- Generar el Excel en el cliente: obliga a bajar todas las filas como JSON (decenas de MB), deja la lista blanca y el tope sin control del servidor → descartada.
- `xlsx` (SheetJS npm) / `exceljs`: CVE sin corregir / dependencias y mantenimiento → descartadas.
- Reutilizar `GET /implementacion/versiones` para el filtro de versión: incluye versiones sin tienda → descartada (se crea `/filtros`).
- Extender `SeleccionPlanogramasModal` o `SeleccionMultipleModal` para versión: el usuario pidió `SeleccionVersionesModal` → descartada.
- Vista materializada / tabla consolidada: sincronización innecesaria → descartada.

**Decisión**: módulo 21 `consolidado`; base cargada en bloque y tubería pura en el dominio
(reusa `recorrerVersion`, `valorComun`, `nivelJerarquiaMasEspecifico` y el puerto CATI); tres
endpoints (`/consolidado/tiendas`, `/filtros`, `/exportar`) con `requiereAnalista`; Excel en servidor
con `write-excel-file` y lista blanca de 24 columnas; front reutiliza y mueve `SeleccionVersionesModal`
a `modales/`, extrae `CadenaJerarquia`, generaliza `PanelColumnas`; migración 017 de índices.

## 8. Preguntas abiertas

Ninguna bloqueante. Dos confirmaciones con valor por defecto ya decidido:
1. **Permiso de la descarga**: queda con la regla A (igual que la vista). ¿Quieres un permiso CAO
   propio (p. ej. `PLA011`) para restringir quién descarga? Exige darlo de alta en CAO.
2. **Detallado sin la columna Modo visible**: se agrega "Modo" al inicio igual (si no, las filas no se
   distinguen). ¿Correcto?

## 9. Para UX y para Seguridad

**UX**
- Texto del modal para la excepción de "Modo" en Detallado y para el 422 de tope (`details.filas`,
  `details.maximo`): mostrarlo antes de pedir (con `resumen.conteos`) y deshabilitar "Descargar".
- Menú "Mantenimiento" como `OpcionNavegacion` con `hijos` en `AppTopbar` (teclado, `aria-expanded`) y
  DT-18 (ancho 1024 px con una píldora más).
- Modo extendido: contexto en el layout para ocultar la barra; si se recuerda entre visitas (pregunta 13
  de UX sin respuesta: por defecto **no** se recuerda).
- Estado de error real (no lista vacía) por DT-17, incluido `503` de CATI con jerarquía ("La jerarquía
  no está disponible…").
- Cómo se ven listas de ubicaciones (góndola "N ubicaciones", nivel/ganchos de varias ubicaciones) y
  `minVaria`/`maxVaria` en la celda.

**Seguridad**
- Autorización de los 3 endpoints con `requiereAnalista` (regla A, DT-11); confirmar que ninguna ruta
  de Implementador expone esto (DT-10).
- Joi estricto: topes de listas, `pageSize` enumerado, `orden` y `columnas` por lista blanca (nunca
  interpoladas), jerarquía con patrón, `stripUnknown: false` → 400.
- DoS: costo por request (base completa en memoria), tope de filas de exportación antes de generar,
  `exportacionLimiter`, CATI con timeout de 30 s.
- Excel: celdas de texto, sin fórmulas (inyección CSV/fórmula); nombre de archivo fijo, sin datos del
  usuario; `Cache-Control: no-store`.
- Nueva dependencia `write-excel-file` (y `fflate`): `npm audit`, versión exacta.

## 10. Deuda detectada

- **DT-24** se cierra con la migración 017.
- **DT nueva (Media, BD)**: FKs sin índice (`Gondola.planograma_version_id`, `Nivel.gondola_id`,
  `Posicion.nivel_id`, `VersionTienda.tienda_id`); se resuelve en esta entrega con 017 (registrar como
  cerrada).
- **DT nueva (Baja, back · front)**: catálogo de columnas del consolidado duplicado: etiquetas y claves
  en el front (tabla) y en el back (Excel). Mitigación: prueba en cada lado contra la misma lista de
  claves del contrato. Mismo tipo que DT-29.
- **DT nueva (Baja, back)**: "una versión por planograma por tienda" solo en el dominio, no en BD.
- **DT nueva (Baja, back)**: el consolidado recalcula toda la base en cada request (sin caché);
  revisar con volumen real de PROD (objetivo p95 < 2 s).
- Toca: DT-08 (aplicar 017 en PROD), DT-10/DT-01 (no se amplía: vista solo de analista, sin filtro
  por tienda del usuario), DT-11 (3 rutas más con regla A transitoria), DT-17/DT-18 (UI), DT-21 (el
  front debe mostrar `details` del 400/422 de la descarga).

---

## Superado (versión previa al prototipo)

- ~~Una fila por posición~~ → fila por SKU–tienda–versión con ubicaciones sumadas (decisión del usuario).
- ~~Paginación SQL en dos pasos~~ → tubería en memoria (§6).
- ~~Filtros `planogramaIds`, `departamento` (columna local), `estadoVersion` simple~~ → `versionIds`,
  jerarquía CATI de 5 niveles, `estados` multi.
- ~~Exportar fuera de alcance~~ → endpoint `/exportar` en 3 formatos.
- ~~Índice `Posicion(sku)`~~ → fuera de 017.
- Preguntas 1–7 de la versión previa: resueltas en `00_solicitud.md`.
