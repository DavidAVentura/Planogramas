# 21 — Consolidado Tiendas

Vista de **solo lectura, solo analista** con todas las combinaciones SKU–tienda–versión de lo que
cada tienda monta: versiones `publicado` y `piloto` asignadas a tiendas activas. Las apariciones
`CROSS`/`IMPULSO` se ven como sub-filas del grupo SKU–tienda, y un SKU que está en más de un
planograma en la misma tienda se marca en rojo. Incluye descarga `.xlsx` generada en el servidor en
tres formatos. En el front es **Productos → Por tienda** (`/mantenimiento/consolidado-tiendas`).

Plan: `Arquitectura/claudeplans/2026-10-15-consolidado-tiendas/PLAN.md`. Casos de uso CU-10-03 y CU-10-04.

| Archivo | Endpoint |
|---------|----------|
| [GET_consolidado_tiendas.md](GET_consolidado_tiendas.md) | `GET /consolidado/tiendas` |
| [GET_consolidado_tiendas_filtros.md](GET_consolidado_tiendas_filtros.md) | `GET /consolidado/tiendas/filtros` |
| [GET_consolidado_tiendas_exportar.md](GET_consolidado_tiendas_exportar.md) | `GET /consolidado/tiendas/exportar` |

## Sin tabla nueva

Todo se calcula en memoria en el dominio (`back/src/domain/consolidado/consolidado.entity.js`) sobre
una base cargada en bloque (`cargarBase`: 7 consultas filtradas por una subconsulta de versiones
montables, sin listas de ids). La migración `017_indices_consolidado.js` solo agrega 5 índices no
únicos sobre las FK que se recorren.

## Tubería (en este orden)

1. **Jerarquía CATI** (si viene un nivel): se piden los SKUs del nivel más específico **antes** de
   cargar la base. Si CATI falla → `503` sin datos parciales. Sin jerarquía no se llama a CATI.
2. **Base**: versiones montables, asignaciones, góndolas, secciones, niveles, posiciones (sin `sku`
   nulo ni `modo = 'PENDIENTE'`) y accesorios. Las posiciones huérfanas se omiten sin error.
3. **Filas por versión** (`construirFilasPorVersion`): `recorrerVersion` del módulo 19 una vez por
   versión; una fila por versión–SKU–modo con sus ubicaciones agregadas (reglas en el contrato del listado).
4. **Grupos por tienda** (`expandirPorTienda`): cada asignación versión–tienda reparte las filas en
   grupos `sku|tiendaId`, separadas en `planograma` (modo PLANOGRAMA) y `otras` (CROSS, IMPULSO).
5. **`planogramasEnTienda`** (`contarPlanogramasPorGrupo`): versiones distintas con fila PLANOGRAMA del
   grupo, calculado **antes de los filtros**. El rojo no cambia al filtrar por versión o estado.
6. **Filtros** (`aplicarFiltros`), todos con Y: tienda, versión y estado (filtran filas y sub-filas;
   un grupo sin filas sale), jerarquía, búsqueda (`includes` sobre texto sin acentos ni mayúsculas,
   nunca `RegExp`) y `soloDuplicados` (`planogramasEnTienda > 1`).
7. **Vista, orden y página** (listado) o **hojas** (exportación).

## Controles comunes

- Orden de capas de las rutas: `requiereAnalista` (router) → `validarQuery(schema)` → limitador por
  usuario → controller. La validación va antes del limitador para que un `400` no gaste cupo; toda
  petición válida lo gasta, aunque el cliente la aborte. `/filtros` no tiene limitador ni `validarQuery`
  (lo valida el controller).
- Limitadores por `req.usuario.numeroEmpleado` (no por IP): listado 60/min, exportación 5/min. Superado
  el cupo → `429 RATE_LIMITED`.
- Query validada con Joi estricto (`validarQueryEstricta`: sin `stripUnknown`). Un parámetro desconocido
  o repetido (`?tiendaIds=1&tiendaIds=2`, que Express 5 entrega como arreglo) → `400 VALIDATION_ERROR`.
  El controller vuelve a validar como defensa.
- El SQL restringe siempre a `PlanogramaVersion.estado IN ('publicado','piloto')` y `Tienda.estado = 'activo'`;
  el dominio vuelve a filtrar por estado. Un `versionIds` de un borrador da 0 filas.
- Ningún valor de la query se usa como SQL ni como propiedad dinámica: `orden` y `columnas` se buscan con
  `Object.hasOwn` en objetos congelados sin prototipo.

## Filtros comunes (query del listado y de la exportación)

| Parámetro | Regla | Semántica |
|---|---|---|
| `tiendaIds` | string ≤ 2 000 caracteres; csv de `^[1-9]\d*$`, enteros seguros, únicos, ≤ 200 | O dentro del filtro. Ausente = todas. |
| `versionIds` | string ≤ 5 000; csv igual, ≤ 500 | Filtra filas y sub-filas. |
| `estados` | csv ⊂ `publicado,piloto`, únicos | Ausente = ambos. |
| `area`, `departamento`, `familia`, `categoria`, `subcategoria` | `^[A-Za-z0-9_-]{1,20}$`; vacío → 400 | Se usa el más específico; SKUs de CATI. |
| `busqueda` | string trim ≤ 100 (vacío = sin filtro) | SKU, nombre o marca. |
| `soloDuplicados` | boolean, def. `false` | Solo grupos con `planogramasEnTienda > 1`. En el listado, `true` con `vista ≠ PLANOGRAMA` → 400. |

Con filtro de versión o estado, si en un grupo solo quedan sub-filas, el grupo sale con `planograma: []`.

## Pruebas

- Back: `test/domain/consolidado.test.js`, `consolidadoColumnas.test.js`, `consolidadoUsecases.test.js`,
  `test/application/consolidadoSchemas.test.js`, `test/infrastructure/libroXlsx.test.js`,
  `test/http/rateLimitUsuario.test.js`, `test/http/consolidadoRutas.test.js`.
- Front: `domain/consolidado/columnasConsolidado.test.ts`, `filtrosConsolidado.test.ts`.
- Postman: carpeta `21 - Consolidado tiendas` (listado, filtros y exportar). Reutiliza los fixtures de
  `16 - Implementación`: corre después de esa carpeta. Sin escenarios 403 ni 429.
