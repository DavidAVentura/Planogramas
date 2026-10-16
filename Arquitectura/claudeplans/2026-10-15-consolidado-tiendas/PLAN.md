# PLAN — Consolidado Tiendas (Mantenimiento)

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Fuentes consolidadas: `00_solicitud.md`, `01_arquitectura.md`, `02_ux.md`, `02_seguridad.md` y el
> artboard `prototipo_ConsolidadoTiendas.dc.html` (solo como referencia visual; sus datos son ficticios).

## Objetivo

Vista nueva **Consolidado Tiendas** en un grupo nuevo **Mantenimiento** de la barra superior (solo
analista, solo lectura): todas las combinaciones SKU–tienda–versión de lo que cada tienda monta
(versiones `publicado` y `piloto` asignadas), con cross/impulso como sub-filas, rojo para SKU en más
de un planograma en la tienda, filtros, columnas configurables, modo extendido y descarga `.xlsx` en
tres formatos generada en el servidor. Módulo nuevo **21 `consolidado`**.

## Decisiones

| # | Decisión | Razón |
|---|---|---|
| D1 | **(Revisable)** La descarga usa el mismo permiso que la vista: regla A (`requiereAnalista`). Sin permiso CAO propio (`PLA011`). | Valor por defecto confirmado por el coordinador; un permiso propio exige alta en CAO. Queda dentro de DT-11. |
| D2 | **(Revisable)** En DETALLADO la columna `modo` ("Modo") se antepone al inicio si no está en `columnas`, aunque esté oculta en la tabla. | Sin ella las filas planograma/cross/impulso son indistinguibles. El modal lo avisa. |
| D3 | Cálculo en memoria en el dominio sobre una base cargada en bloque (7 consultas por subconsulta), no paginación SQL. | `recorrerVersion` necesita la versión completa; el conteo "sin filtros" y la jerarquía CATI (límite 2100 parámetros) complican el SQL. |
| D4 | Fila = versión–SKU–modo con ubicaciones de la versión sumadas (reglas del módulo 19). Posiciones con `sku` nulo o `modo = 'PENDIENTE'` se excluyen. | Decisión del usuario; `PENDIENTE` no es una aparición. |
| D5 | `planogramasEnTienda` = número de versiones distintas con fila PLANOGRAMA del SKU en la tienda, calculado **antes** de los filtros de versión, estado, jerarquía, búsqueda y `soloDuplicados`. Rojo si > 1. | Pedido del usuario: el rojo no depende de los filtros. |
| D6 | Paginación en PLANOGRAMA por grupo SKU–tienda (un grupo nunca se parte); en CROSS/IMPULSO por fila. | Contrato de arquitectura §4.2. |
| D7 | Excel generado en el servidor con `write-excel-file@4.1.1` (exacta). `back/package-lock.json` debe resolver `fflate@0.8.3`. | `xlsx` (SheetJS npm) tiene CVE sin corregir; `exceljs` arrastra 9 dependencias sin mantenimiento. `fflate` 0.8.0–0.8.2 tiene GHSA-px8p-9vwx-vf98. |
| D8 | Tope de exportación `CONSOLIDADO_EXPORTACION_MAX_FILAS` (def. 100 000, máximo duro 200 000), contado antes de construir celdas. | Seguridad 11. |
| D9 | Concurrencia de exportación por proceso = **1**. La segunda simultánea → `503 EXPORTACION_EN_CURSO`. | Seguridad 12: la generación bloquea el event loop; con un solo App Service, 1 es suficiente y predecible. |
| D10 | Limitadores **por usuario** (`req.usuario.numeroEmpleado`), montados **después** de `requiereAnalista`: exportación 5/min, listado 60/min. `/filtros` sin limitador. | Seguridad 2 y 13: por IP, detrás del proxy de App Service, todos comparten cupo. |
| D11 | Query validada con Joi estricto (`allowUnknown: false`, `stripUnknown: false`) mediante un helper nuevo `validarQueryEstricta`; `validarConJoi` no se usa ni se modifica. | Seguridad 4; cambiar `validarConJoi` afectaría los módulos 16/17 (se registra deuda). |
| D12 | Parámetro repetido (`?tiendaIds=1&tiendaIds=2`, que Express 5 entrega como arreglo) → `400 VALIDATION_ERROR`. | Seguridad 5: el front siempre manda csv; un arreglo nunca llega a la tubería. |
| D13 | El nombre del archivo lo arma el front con la misma regla del servidor (`consolidado-tiendas-{detallado\|minmax\|hojas}-AAAAMMDD.xlsx`); no se expone `Content-Disposition` en CORS. | Seguridad 20: evita tocar CORS. |
| D14 | `resumen.maximoExportacion` viaja en la respuesta del listado para que el modal deshabilite "Descargar" antes de pedir. | UX: avisar antes de un 422. |
| D15 | AGREGADO: mín./máx. = suma por versión distinta del grupo; por versión se toma el valor de la primera fila en orden PLANOGRAMA → CROSS → IMPULSO. `null` no suma; todos `null` → celda vacía. Resto de columnas desde las filas PLANOGRAMA (varias → unidas con ` \| ` en orden de código de versión); sin planograma → vacías. | Arquitectura §4.4 y pregunta 18 de UX (supuesto aceptado). |
| D16 | Modo extendido con el patrón existente de `ProductosVersiones` (estado local, `{!extendida && <AppTopbar/>}`, Escape sale). No se recuerda entre visitas. **No** se crea `ModoExtendidoContext`. | Cada página monta su propio `AppTopbar`; el patrón ya existe. Pregunta 13 de UX: por defecto no se recuerda. |
| D17 | `SeleccionVersionesModal` se **mueve** a `components/dominio/modales/`; la cadena de jerarquía se extrae a `components/dominio/productos/CadenaJerarquia/`; `PanelColumnas` y las funciones de preferencias se generalizan con genérico `<K extends string>`. | Evitar duplicar componentes; Por versión y Productos no cambian de comportamiento. |
| D18 | `Paginacion` gana props opcionales `pageSizes` y `onPageSizeChange` (25/50/100/200). No se crea `ui/Paginador`. | El componente ya existe; extensión mínima. |
| D19 | Preferencias de columnas del consolidado en `localStorage` con la clave `planogramas.consolidado.columnas` (mismo estilo que `planogramas.implementador.productos.columnas`). | Consistencia con las claves existentes. |
| D20 | Deduplicación de llamadas en vuelo en `catiClient.listarSkusPorJerarquia` (`Map` de promesas por clave). | Seguridad 15c; cambio de pocas líneas, evita paginaciones paralelas en frío. |
| D21 | Las celdas de montaje en tabla y Excel: `montaje` = accesorios + banderas (`Colgante externo`, `Display`, `Desborda la góndola[: nota]`) unidos con `, `. Mín./máx. que varían entre ubicaciones → texto `Varía`. | Prototipo y regla `valorComun`. |
| D22 | 017 se aplica en DEV dentro de esta entrega; **no** en PROD hasta resolver DT-08. Publicar el código sin 017 en PROD es seguro (solo más lento). | Seguridad 26. |
| D23 | Respuestas de la UX sin respuesta explícita, con su valor por defecto: la descarga ignora la vista (manda el formato); DETALLADO no incluye la fila "Sin planograma"; un SKU solo en un borrador no aparece; "Solo con más de un planograma" deshabilitado en Solo cross/impulso; SKU sin planograma se muestra con la fila "Sin planograma". | `02_ux.md` preguntas 7, 9, 10, 12, 15. |

## Fuera de alcance

- Inventario por tienda en el consolidado.
- Descarga asíncrona o en streaming; caché del resultado o de la base (se revisa con datos de PROD, DT nueva).
- Permiso CAO propio para la descarga (D1) y filtro por tiendas del usuario (DT-10): la vista es solo de analista.
- Aplicar 017 en PROD (bloqueado por DT-08).
- Cambiar `validarConJoi` en los módulos 16/17 y los limitadores por IP existentes (`vozLimiter`): se registran como deuda.
- `Modal` base con Escape/trampa de foco, extraer `ui/SegmentedControl`, `ui/ChipsSeleccion`, `ui/MenuNav`, tokens `--danger-bg-hover`/`--row-sub-bg`, y los colores literales listados en `02_ux.md` → deuda.
- Ordenar por otras columnas que no sean SKU, Producto, Tienda y Planograma versión; filtros por columna.
- Resolver DT-18 (ancho 1024 px de la barra).

## Contratos

Los tres endpoints montados en `/api/v1/consolidado` con `requiereAnalista` (regla A transitoria, DT-11).
Errores siempre `{ error: { code, message, details? } }`.

### Filtros comunes (query del listado y de la exportación)

| Parámetro | Regla | Semántica |
|---|---|---|
| `tiendaIds` | string ≤ 2 000 caracteres; csv de `^[1-9]\d*$`, `Number.isSafeInteger`, únicos, ≤ 200 | O dentro del filtro. Ausente = todas. |
| `versionIds` | string ≤ 5 000; csv igual, ≤ 500 | Filtra filas y sub-filas. |
| `estados` | csv ⊂ `publicado,piloto`, únicos | Ausente = ambos. |
| `area`, `departamento`, `familia`, `categoria`, `subcategoria` | `^[A-Za-z0-9_-]{1,20}$`; vacío → 400 | Se usa el más específico (`nivelJerarquiaMasEspecifico`); SKUs de CATI. |
| `busqueda` | string trim ≤ 100 (vacío permitido = sin filtro) | SKU, nombre o marca; `includes` sobre texto sin acentos ni mayúsculas. Nunca `RegExp`. |
| `soloDuplicados` | boolean, def. `false` | Solo grupos con `planogramasEnTienda > 1`. |

Entre filtros, Y. Con filtro de versión/estado las sub-filas también se filtran; si en un grupo solo
quedan sub-filas, el grupo sale con `planograma: []`. Cualquier parámetro desconocido → 400. Un
parámetro repetido (arreglo) → 400.

### `GET /api/v1/consolidado/tiendas` — listado (CU-10-03)

Query: filtros comunes + `vista` (`PLANOGRAMA|CROSS|IMPULSO`, def. `PLANOGRAMA`), `page` (entero 1–10 000,
def. 1), `pageSize` (`25|50|100|200`, def. 50), `orden` (`sku|producto|tienda|version`, def. `sku`),
`direccion` (`asc|desc`, def. `asc`). `soloDuplicados=true` con `vista ≠ PLANOGRAMA` → 400.
Desempate fijo: SKU, código de tienda, código de versión. Página fuera de rango → `data: []` con `total` correcto.

```json
{
  "data": [{
    "sku": "1200206",
    "producto": { "nombre": "…", "marca": "…", "skuSustituto": null, "nombreSustituto": null },
    "tienda": { "id": 7, "codigo": "101", "nombre": "Cemaco Zona 9", "tipo": "GRANDE", "marca": "Cemaco" },
    "planogramasEnTienda": 3,
    "planograma": [ Fila ],
    "otras": [ Fila ]
  }],
  "total": 3130, "page": 1, "pageSize": 50,
  "resumen": {
    "filas": 3181, "skus": 1460, "tiendas": 8, "gruposConVariosPlanogramas": 48,
    "conteos": { "PLANOGRAMA": 3163, "CROSS": 18, "IMPULSO": 0, "AGREGADO": 3130 },
    "maximoExportacion": 100000
  }
}
```

- En `CROSS`/`IMPULSO`: cada elemento de `data` es un grupo con `planograma: []` y `otras: [la fila]`; `total` cuenta filas.
- `resumen` se calcula sobre todo lo filtrado (no solo la página): `filas` = PLANOGRAMA + CROSS + IMPULSO,
  `skus`/`tiendas` distintos, `gruposConVariosPlanogramas` = grupos filtrados con `planogramasEnTienda > 1`,
  `conteos.AGREGADO` = grupos SKU–tienda filtrados (incluye los "sin planograma").
- `otras` ordenadas por modo (CROSS, IMPULSO) y luego código de versión; `planograma` por código de versión.

**Fila** (claves exactas; ninguna otra):

```json
{
  "versionId": 210, "codigoVersion": "AUTOS 02-TG", "planogramaId": 165, "planogramaNombre": "Autos",
  "estadoVersion": "publicado", "modo": "PLANOGRAMA",
  "ubicaciones": [ { "posicionId": 64, "gondola": "G1", "porUbicar": false, "seccion": 1, "nivel": 3, "orden": 2, "ganchos": [12, 13] } ],
  "accesorios": [ { "codigo": "R45-12", "tamanoPulgadas": 12 } ],
  "facings": 2, "cantidadApilable": 1, "capacidadFacing": 6, "capacidadMaxima": 12,
  "minEstetico": 4, "minFinal": 6, "maxFinal": 12, "minVaria": false, "maxVaria": false,
  "perfil": "MRP", "decision": "ACTIVO", "observaciones": "…",
  "montaje": { "colganteExterno": false, "display": false, "desborda": false, "notaDesborde": null }
}
```

Agregación por versión–SKU–modo: `facings` suma; `capacidadMaxima` suma (`null` si alguna ubicación es `null`);
`cantidadApilable`, `capacidadFacing` (= `unidades_por_facing`), `minEstetico`, `minFinal`, `maxFinal` con
`valorComun` (`minVaria`/`maxVaria` = su `varia`); `perfil` y `decision` = valor común de texto o `null`;
`observaciones` distintas no vacías unidas con ` · ` (o `null`); `montaje.*` = alguna ubicación la tiene
(`colganteExterno` ← `cross_externo`, `display` ← `montar_en_display`, `desborda` ← `desborda_gondola`,
`notaDesborde` = notas distintas unidas con ` · `); `accesorios` = únicos por `codigo`+`tamanoPulgadas`
en orden de aparición; `seccion`/`nivel`/`ganchos` salen de `recorrerVersion`; `orden` = `orden_horizontal`.

Errores: `400 VALIDATION_ERROR` · `401` · `403 FORBIDDEN` · `429 RATE_LIMITED` · `503 SERVICIO_NO_DISPONIBLE` (con jerarquía y CATI caído; sin datos parciales).

### `GET /api/v1/consolidado/tiendas/filtros` — opciones de los modales

Sin query (cualquier parámetro → 400).

```json
{
  "tiendas":   [ { "id": 7, "codigo": "101", "nombre": "…", "tipo": "GRANDE", "marca": "Cemaco", "totalSkus": 812 } ],
  "versiones": [ { "versionId": 210, "codigo": "AUTOS 02-TG", "estado": "publicado", "nombre": "Autos", "descripcion": null, "departamento": "…", "totalProductos": 54 } ]
}
```

Solo tiendas activas con al menos una asignación a versión `publicado`/`piloto`, y versiones `publicado`/`piloto`
con al menos una tienda activa. `totalSkus` = SKUs distintos de la tienda (excluye `PENDIENTE`); `totalProductos`
= SKUs distintos de la versión. Errores: `400`, `401`, `403`.

### `GET /api/v1/consolidado/tiendas/exportar` — descarga .xlsx (CU-10-04)

Query: filtros comunes + `formato` (`DETALLADO|AGREGADO|HOJAS`, requerido) + `hojas` (csv ⊂
`PLANOGRAMA,CROSS,IMPULSO`, 1–3 únicos; **requerido** con `HOJAS`, **prohibido** en otros) + `columnas`
(csv, requerido, 1–24 claves únicas de la lista blanca; el orden recibido es el del archivo). Prohibidos:
`vista`, `page`, `pageSize`, `orden`, `direccion`. Orden fijo del archivo: SKU, código de tienda, código de versión
(y en DETALLADO, dentro de cada grupo: PLANOGRAMA, CROSS, IMPULSO).

Lista blanca (clave → etiqueta del encabezado):

| Clave | Etiqueta | Clave | Etiqueta |
|---|---|---|---|
| `sku` | SKU | `facings` | Facing horizontal |
| `producto` | Producto | `apilable` | Cantidad apilable |
| `tienda` | Tienda | `capacidadFacing` | Capacidad del facing |
| `version` | Planograma versión | `capacidadMaxima` | Capacidad máxima |
| `estadoVersion` | Estado de la versión | `minEstetico` | Mín. estético |
| `seccion` | Sección | `minFinal` | Mín. final |
| `gondola` | Góndola | `maxFinal` | Máx. final |
| `nivel` | Nivel | `perfil` | Perfil de redondeo |
| `orden` | Posición en nivel | `modo` | Modo |
| `ganchos` | Ganchos | `decision` | Decisión |
| `accesorio` | Accesorio de montaje | `observaciones` | Observaciones |
| `montaje` | Montaje | `sustituto` | SKU sustituto |

Clave fuera de la lista → `400 VALIDATION_ERROR` con `details: { columnasInvalidas: [...] }`; duplicada → 400.

Formatos:
- **DETALLADO** — hoja "Consolidado": filas PLANOGRAMA, CROSS e IMPULSO (nunca la fila "Sin planograma"). `modo` al inicio si no viene (D2).
- **AGREGADO** — hoja "Min-Max agregado": una fila por grupo SKU–tienda (regla D15).
- **HOJAS** — una hoja por tipo elegido, orden fijo "Planograma", "Cross", "Impulso"; hoja sin filas = solo encabezados.

Celdas (texto de cada clave, mismo en tabla y Excel):
`sku` → SKU; `producto` → `nombre · marca` (sin marca, solo nombre); `tienda` → `codigo · nombre`;
`version` → `codigoVersion · planogramaNombre`; `estadoVersion` → `Publicada`/`Piloto`;
`seccion`/`gondola`/`nivel`/`orden` → valores de las ubicaciones unidos con `, ` (góndola: nombres distintos);
`ganchos` → todos los ganchos (`número` con 2 dígitos, exhibición tal cual, p. ej. `05, 54E`);
`accesorio` → `codigo (tamaño")` unidos con `, `; `montaje` → D21; `modo` → `Planograma`/`Cross`/`Impulso`;
`decision` → `Activo`/`Inactivo`; `perfil` → valor; `sustituto` → `skuSustituto · nombreSustituto` o vacío;
numéricos → número (`Number.isFinite`), `null` → vacío, varía → `Varía`. Todo texto como celda de texto, nunca fórmula.

Response 200: cuerpo binario con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
`Content-Disposition: attachment; filename="consolidado-tiendas-{detallado|minmax|hojas}-AAAAMMDD.xlsx"` (fecha del
servidor, mapa fijo), `Cache-Control: no-store`, `Content-Length`.

Errores: `400 VALIDATION_ERROR` · `401` · `403` · `422 EXPORTACION_DEMASIADO_GRANDE` `details: { filas, maximo }` ·
`429 RATE_LIMITED` · `503 SERVICIO_NO_DISPONIBLE` (CATI) · `503 EXPORTACION_EN_CURSO` (mensaje
`Hay otra descarga en curso. Inténtalo en unos segundos.`) · `500 INTERNAL_ERROR` (JSON, nunca un .xlsx truncado).

### Tipos TS del front (`front/src/types/consolidado.ts`, nuevo)

```ts
export type VistaConsolidado = 'PLANOGRAMA' | 'CROSS' | 'IMPULSO';
export type ModoFila = VistaConsolidado;
export type FormatoDescarga = 'DETALLADO' | 'AGREGADO' | 'HOJAS';
export type EstadoVersionMontable = 'publicado' | 'piloto';
export type OrdenConsolidado = 'sku' | 'producto' | 'tienda' | 'version';
export interface UbicacionConsolidado { posicionId: number; gondola: string; porUbicar: boolean; seccion: number | null; nivel: number; orden: number; ganchos: Gancho[]; }
export interface FilaConsolidado { versionId: number; codigoVersion: string; planogramaId: number; planogramaNombre: string; estadoVersion: EstadoVersionMontable; modo: ModoFila; ubicaciones: UbicacionConsolidado[]; accesorios: { codigo: string; tamanoPulgadas: number | null }[]; facings: number; cantidadApilable: number | null; capacidadFacing: number | null; capacidadMaxima: number | null; minEstetico: number | null; minFinal: number | null; maxFinal: number | null; minVaria: boolean; maxVaria: boolean; perfil: string | null; decision: string | null; observaciones: string | null; montaje: { colganteExterno: boolean; display: boolean; desborda: boolean; notaDesborde: string | null }; }
export interface GrupoConsolidado { sku: string; producto: { nombre: string | null; marca: string | null; skuSustituto: string | null; nombreSustituto: string | null }; tienda: { id: number; codigo: string; nombre: string; tipo: TipoTienda; marca: string | null }; planogramasEnTienda: number; planograma: FilaConsolidado[]; otras: FilaConsolidado[]; }
export interface ResumenConsolidado { filas: number; skus: number; tiendas: number; gruposConVariosPlanogramas: number; conteos: Record<'PLANOGRAMA' | 'CROSS' | 'IMPULSO' | 'AGREGADO', number>; maximoExportacion: number; }
export interface RespuestaConsolidado { data: GrupoConsolidado[]; total: number; page: number; pageSize: number; resumen: ResumenConsolidado; }
export interface TiendaFiltroConsolidado extends TiendaSeleccionable { totalSkus: number; }
export interface FiltrosDisponiblesConsolidado { tiendas: TiendaFiltroConsolidado[]; versiones: VersionElegible[]; }
export interface FiltrosConsolidado { tiendaIds: number[]; versionIds: number[]; estados: EstadoVersionMontable[]; busqueda: string; soloDuplicados: boolean; }
```

`Gancho` de `types/gancho.ts`, `TipoTienda` de `types/tienda.ts`, `TiendaSeleccionable` de
`components/dominio/modales/SeleccionTiendasModal/SeleccionTiendasModal.tsx`, `VersionElegible` de `types/implementacion.ts`,
`FiltroJerarquia` de `types/producto.ts`.

## Datos

Migración **`back/src/infrastructure/db/migrations/017_indices_consolidado.js`** — solo índices no únicos, sin tablas
ni columnas nuevas, retrocompatible:

| Nombre | Tabla(columna) |
|---|---|
| `IX_Gondola_version` | `Gondola(planograma_version_id)` |
| `IX_Nivel_gondola` | `Nivel(gondola_id)` |
| `IX_Posicion_nivel` | `Posicion(nivel_id)` |
| `IX_PosicionAccesorio_posicion` | `PosicionAccesorio(posicion_id)` (cierra DT-24) |
| `IX_VersionTienda_tienda` | `VersionTienda(tienda_id)` |

`up`: por cada índice, `knex.raw("IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_…' AND object_id = OBJECT_ID('Tabla')) CREATE INDEX IX_… ON Tabla(columna)")` (texto fijo, sin datos de usuario).
`down`: en orden inverso, `DROP INDEX IF EXISTS IX_… ON Tabla`. Se aplica en DEV; **no en PROD hasta DT-08**.

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| S1 | `router.use(requiereAnalista)` antes de las 3 rutas, comentario `// A transitoria (DT-11)` | `consolidado.routes.js` | `back/test/http/rutasProtegidas.test.js` verde; prueba de rutas: PLA009/PLA010 → 403, sin `req.usuario` → 401 (T12) |
| S2 | Limitadores por `numeroEmpleado`, después de `requiereAnalista`: `exportacionLimiter` 5/min, `consolidadoLimiter` 60/min; `validate: { xForwardedForHeader: false }` | `middlewares/rateLimit.js`, `consolidado.routes.js` | Usuario A: 6.ª exportación → 429; usuario B → 200; 61.º listado → 429 (T11) |
| S3 | Joi estricto sin `stripUnknown`; `?foo=1` → 400 | `consolidado.schemas.js`, `validarQueryEstricta` | T10 |
| S4 | CSV con tope de longitud antes de `split`, elementos `^[1-9]\d*$` seguros, únicos, topes 200/500; arreglo → 400 | `consolidado.schemas.js` | T10 (201 ids, `1,,2`, `1,abc`, `0`, 5 000 caracteres, repetido) |
| S5 | Enumerados por lista permitida; `orden`/`columnas` solo como clave de mapa (`Object.hasOwn` sobre objetos congelados), nunca SQL ni propiedad dinámica | schemas, `columnas.js`, `consolidado.entity.js` | `columnas=__proto__` → 400 con `columnasInvalidas`; `orden=1;drop` → 400; `pageSize=10000` → 400 |
| S6 | Repositorio restringe siempre en SQL a `estado IN ('publicado','piloto')` y `Tienda.estado = 'activo'`; un `versionIds` de un borrador produce 0 filas | `consolidado.repository.js`, caso de uso | Prueba con repo falso (borrador no aparece en listado, filtros ni exportación) + Postman |
| S7 | `busqueda` con `includes` sobre texto normalizado; nunca `RegExp` | `consolidado.entity.js` | `busqueda=(((((a` → sin excepción (T5, T10) |
| S8 | `page` 1–10 000; fuera de rango → `data: []` | schemas, `paginar` | T5/T10 |
| S9 | `hojas` con `Joi.when` (requerido/prohibido); `soloDuplicados` con vista ≠ PLANOGRAMA → 400 | schemas | T10 |
| S10 | Tope de filas antes de construir celdas; env con entero > 0 y máximo duro 200 000; 422 `EXPORTACION_DEMASIADO_GRANDE` `details: { filas, maximo }` | `config/env.js`, caso de uso | Repo falso con tope 10 → 422 y espía de `escribirLibro` sin llamadas (T7) |
| S11 | Semáforo de exportación (máx. 1) → `503 EXPORTACION_EN_CURSO`; se libera en `finally` | `application/consolidado/semaforo.js`, caso de uso | Dos llamadas concurrentes con generador lento → la segunda 503; tras terminar, una tercera pasa (T7) |
| S12 | Log por request: listado (`ms`, `filas`, `grupos`) y exportación (`numeroEmpleado`, formato, hojas, filas, `ms`); nunca token ni valores de query | `consolidado.controller.js` | Revisión del diff |
| S13 | Columnas explícitas en cada `select`; sin `select *`, sin auditoría ni blobs; filtros por subconsulta; `tiendaIds` ≤ 200 en `whereIn` parametrizado; sin `knex.raw` con concatenación | `consolidado.repository.js` | Revisión del diff + prueba de claves exactas de `Fila` (T5) |
| S14 | Con jerarquía: CATI se resuelve **antes** de cargar la base; falla → 503 sin datos parciales; sin jerarquía, CATI no se llama | caso de uso | Catálogo falso que rechaza → 503 en listado y exportación; sin jerarquía → no se invoca (T7) |
| S15 | Inyección de fórmulas: toda celda de texto con `type: String`; ningún `Formula`; números solo si `Number.isFinite` | `infrastructure/exportacion/libroXlsx.js` | Prueba que descomprime con `fflate.unzipSync` y verifica que ninguna hoja contiene `<f>` con `=HYPERLINK(…)`, `+1`, `-1`, `@SUM(A1)`, `=cmd\|' /C calc'!A0` (T9) |
| S16 | Texto saneado: quitar `[\x00-\x08\x0B\x0C\x0E-\x1F]`, truncar a 32 767 caracteres | `libroXlsx.js` | Prueba con `\u0000` y 40 000 caracteres (T9) |
| S17 | Encabezados solo desde la lista blanca (`columnas.map(etiqueta)`, + "Modo" en DETALLADO); nombres de hoja fijos | `columnas.js`, `construirHojas` | T6 |
| S18 | Buffer completo antes de fijar cabeceras; si falla, `next(err)` → 500 JSON sin stack | controller | Prueba con generador que lanza → 500 `INTERNAL_ERROR` sin `stack` (T12) |
| S19 | Posiciones huérfanas (nivel/góndola no cargados) se omiten sin lanzar | `consolidado.entity.js` | T5 |
| S20 | `write-excel-file` exacta; `npm ls fflate` → 0.8.3; `npm audit --omit=dev` sin hallazgos nuevos | `back/package.json`, `package-lock.json` | T2 |
| S21 | Front: grupo y ruta solo para analista; URL directa sin permiso → pantalla de "sin permiso" de `RequierePermiso` | `constants/navegacion.ts`, `router/routes.tsx` | Vitest de `opcionesVisibles` (T15) |
| S22 | Front: preferencias de `localStorage` validadas; nunca se envía una clave fuera de la lista | `domain/consolidado/columnasConsolidado.ts` | Vitest con claves ajenas (T18) |
| S23 | 017 con nombres explícitos e `IF NOT EXISTS`; no aplicar en PROD hasta DT-08 | migración | `migrate` → `migrate:rollback` → `migrate` en DEV (T1) |

## UX (resumen para implementar)

**Página** `front/src/pages/ConsolidadoTiendas/` — ruta `/mantenimiento/consolidado-tiendas`, `AppTopbar titulo="Consolidado Tiendas"`.
Estructura: encabezado como Productos (título, "Solo lectura", resumen `N filas · N SKU · N tiendas · N con más de un planograma`);
tarjeta de herramientas (conteo, botón `Columnas`, botón `Descargar` `outline` con icono de descarga, `BotonFiltros`
embudo con contador, botón de modo extendido con `aria-pressed`); barra de filtros; tabla con scroll propio;
franja de paginación `Mostrando 1–50 de N grupos SKU–tienda · M filas` (en Solo cross/impulso: `de N filas`) con 25/50/100/200.

**Navegación**: píldora "Mantenimiento" con menú desplegable (`<button aria-expanded aria-haspopup="true" aria-controls>`), Escape
y clic fuera lo cierran; dentro `NavLink` "Consolidado Tiendas" (`aria-current="page"` lo pone `NavLink`). La píldora queda activa en `/mantenimiento/*`. Cerrado por defecto.

**Filtros** (`ConsolidadoFiltros`, barra de 38 px como `ProductosFiltros`):
- Búsqueda `SKU, nombre o marca`.
- Tienda: `BotonSeleccionMultiple` (`textoVacio="Todas las tiendas"`, `plural="tiendas"`, `ariaLabel="Filtrar por tienda"`) + `SeleccionTiendasModal` con `conteo` = `totalSkus` (meta `N productos`).
- Planograma versión: disparador con las clases y el marcado de `.productos-versiones__selector` (copiar de `ProductosVersiones`, alto 38 px), texto `Todas las versiones` / `CÓDIGO · planograma` / códigos separados por coma, contador pill con 2+. Abre `SeleccionVersionesModal` con textos: `ayuda` `Versiones publicadas y en piloto asignadas a tiendas.`, `notaSinSeleccion` `Sin selección se muestran todas las versiones.`, `aplicarSinSeleccion` `Mostrar todas`, `sinVersiones` `No hay versiones publicadas ni en piloto asignadas a tiendas.`, `sinCoincidencias` `Ninguna versión coincide con la búsqueda.` (y `titulo`, si el tipo lo tiene: `Filtrar por planograma versión`). Chips con 2+ versiones como `.productos-versiones__chips` (`Mostrando productos de:`, ✕ `aria-label="Quitar <código> del filtro"`).
- Estado de la versión: `BotonSeleccionMultiple` (`Publicada y piloto`, `plural="estados"`) + `SeleccionMultipleModal` titulado `Filtrar por estado de la versión`, elementos `Publicada`/`Piloto`, `textoVacio="No hay estados"`, una sola orden "Nombre" (el modal oculta "Ordenar por").
- Jerarquía: `CadenaJerarquia` (rótulo `JERARQUÍA`, `role="group"` `aria-label="Jerarquía CATI"`, 5 selects, textos `Todas las áreas`…`Todas las subcategorías`, `Cargando…`).
- `TIPO DE APARICIÓN`: `role="radiogroup"` con radios nativos `Planograma` / `Solo cross` / `Solo impulso` a la derecha de la jerarquía. No cuenta en el embudo ni lo limpia "Limpiar filtros".
- Casilla `Solo con más de un planograma`; deshabilitada fuera de Planograma con `title="Solo aplica en la vista Planograma"`.
- Chips de tiendas con 2+ (`--cemaco-indigo-100`, texto `--cemaco-indigo`, `--radius-pill`, ✕ `aria-label="Quitar <nombre>"`), en `ul` con `aria-label`.
- Embudo: cuenta cada filtro una vez (tienda, versión, estado, jerarquía, búsqueda, solo duplicados). `Limpiar filtros` vacía todos.

**Modo extendido** (D16): oculta `AppTopbar`, título, "Solo lectura" y resumen; márgenes 8/12 px; celdas con 6 px de relleno vertical.
La barra se colapsa a una fila: conteo + chips de filtros activos (`Tienda: 101 · Cemaco Zona 9`; con 3+ valores `Tiendas: 4` con `title` y ✕ que quita todos; `Jerarquía: A › B › C`; vista como chip gris sin ✕ `Vista: Solo cross`; sin filtros `Sin filtros aplicados`) + `Mostrar filtros`. Siempre visibles: `Columnas`, `Descargar`, `Salir del modo extendido`. Toast al entrar `Vista extendida · Esc para salir`. Los filtros no cambian.

**Tabla** (`ConsolidadoTable`): columnas visibles en el orden de las preferencias; encabezados ordenables solo SKU, Producto, Tienda y Planograma versión (`aria-sort`). Fila principal con chevron (`aria-expanded`, `aria-controls`) en Planograma; sub-filas cross/impulso con mismas columnas, sangría 32 px, badge de tipo con texto (colores de `MODO_APARICION_META`), fondo indigo al 4 % (capa translúcida, sin token nuevo). Grupo sin sub-filas expandido: `Sin apariciones cross ni impulso en esta tienda.` Duplicado (`planogramasEnTienda > 1`): fondo `--danger-bg`, barra izquierda 4 px `--danger`, badge `N planogramas` con `title` `Este SKU está en N planogramas distintos en esta tienda; los filtros dejan ver M`. "Sin planograma": chip punteado en la columna Planograma versión y resto vacío; sin rojo. En Solo cross/impulso, filas sin chevron. Góndola con 2+ ubicaciones: nombres y subtítulo `N ubicaciones`. Montaje: accesorio + chips `Colgante externo`, `Display`, `Desborda la góndola`. Mín./máx. que varían: `Varía`.

**Panel de columnas**: `PanelColumnas` generalizado, 360 px, `--shadow-lg`, con nota `La descarga a Excel incluye solo las columnas marcadas, en este orden.` Visibles por defecto: `sku, producto, tienda, version, estadoVersion, gondola, nivel, montaje, minFinal, maxFinal`.

**Modal Descargar** (`DescargarConsolidadoModal`, `Modal ancho="lg"`, título `Descargar consolidado`): radios en tarjetas (`aria-labelledby`):
- `Detallado` — `Una fila por SKU–tienda–versión de planograma, una por cada cross y una por cada impulso.` + `Incluye la columna Modo al inicio aunque esté oculta.` (cuando `modo` no está visible).
- `Min/Max agregado` — `Una fila por SKU–tienda. El mín. y el máx. son la suma de planograma + cross + impulso. Las columnas de montaje (góndola, nivel, accesorio…) salen de la fila de planograma, solo si están visibles en el selector de columnas y en su orden.`
- `Hojas separadas` — `Una hoja por tipo de aparición.` con `fieldset`/`legend` `Hojas` y casillas `Planograma (N)`, `Cross (N)`, `Impulso (N)` (todas marcadas al abrir).
Caja resumen: `Filas estimadas: N`; `Se descargan las N columnas visibles, en el orden de la tabla.` (singular `1 columna visible`) + botón de texto `Elegir columnas` (cierra el modal y abre el panel); en Min/Max: `Las columnas de montaje salen de la fila de planograma; si el SKU no tiene planograma en la tienda, quedan vacías.`
Validación (`role="alert"`, `--danger`, "Descargar" deshabilitado): `Elige al menos una hoja para descargar.` · `No hay filas para descargar con los filtros actuales.` · `La descarga tendría N filas y el máximo es M. Ajusta los filtros.`
Pie: `Cancelar` (`ghost`) + `Descargar (.xlsx)`; durante la petición `Generando…` con spinner y botones deshabilitados.
Éxito: cierra el modal, toast `success` `Descarga lista: <archivo>.xlsx`. Errores (toast `error`, modal abierto): 422 → `La descarga tendría {details.filas} filas y el máximo es {details.maximo}. Ajusta los filtros.`; 429 → `Hiciste muchas descargas seguidas. Espera un minuto e inténtalo de nuevo.`; 503 `EXPORTACION_EN_CURSO` → su `message`; 503 CATI → `La jerarquía no está disponible en este momento. Quita el filtro de jerarquía o inténtalo más tarde.`; otro → `No se pudo generar la descarga. Inténtalo de nuevo.`

**Estados** (texto exacto):
- Cargando: `Cargando consolidado…`, esqueleto de 8 filas, tabla con `aria-busy="true"`.
- Vacío con filtros: Planograma `No hay combinaciones SKU–tienda con esos filtros`; cross `No hay productos como cross con estos filtros`; impulso `No hay productos como impulso con estos filtros`; detalle `Ajusta la tienda, el planograma, la jerarquía o el estado de la versión.` + `Limpiar filtros`.
- Vacío sin datos: `Aún no hay productos asignados a tiendas` / `Cuando una versión publicada o en piloto se asigne a una tienda, sus productos aparecerán aquí.`
- Error: `No se pudo cargar el consolidado` / `Revisa tu conexión e inténtalo de nuevo.` + `Reintentar` (con 503 de CATI, detalle `La jerarquía no está disponible en este momento. Quita el filtro de jerarquía o inténtalo más tarde.`; con 400, mostrar `message` y `details` si existen — DT-21).
- Sin permiso: lo resuelve `RequierePermiso` (`No tienes permiso para ver el consolidado de tiendas.` si la pantalla admite texto propio).

**Tokens**: `--danger-bg`, `--danger`, `--ink-*`, `--fg-1/2/3`, `--border`, `--border-subtle`, `--cemaco-indigo`, `--cemaco-indigo-50/100/200`, `--success`, `--shadow-lg`, `--radius-sm/md/lg/pill`, `--font-display/body/mono`. **Sin literales de color nuevos** (stylelint).

## Tareas

Orden de implementación: back de adentro hacia afuera (T1–T13), luego front (T14–T22), docs al final (T23, commit aparte).

### T1 — Migración 017 de índices
- **Archivos**: crear `back/src/infrastructure/db/migrations/017_indices_consolidado.js`
- **Qué hacer**: según "Datos". Comentario de cabecera como en 016 (propósito, cierra DT-24, no aplicar en PROD hasta DT-08).
- **Criterios de aceptación**:
  - [ ] En DEV: `npm run migrate` → `npm run migrate:rollback` → `npm run migrate` sin error; `npm run migrate:status` sin pendientes.
  - [ ] Los 5 índices existen con esos nombres (`SELECT name FROM sys.indexes WHERE name LIKE 'IX_%'`).
  - [ ] Fila DEV de la tabla de migraciones de `CLAUDE.md` actualizada (se hace en T23).
- **Pruebas**: manual (DEV).
- **Depende de**: —

### T2 — Dependencia y configuración
- **Archivos**: modificar `back/package.json`, `back/package-lock.json`, `back/src/config/env.js`, `back/.env.example` (si existe; nunca `.env`)
- **Qué hacer**:
  - `cd back && npm install write-excel-file@4.1.1` (queda exacta por `.npmrc`). Si `npm ls fflate` no da `0.8.3`, agregar `"overrides": { "fflate": "0.8.3" }` en `back/package.json` y reinstalar.
  - En `env.js` agregar `consolidado: { exportacionMaxFilas: leerEnteroAcotado(process.env.CONSOLIDADO_EXPORTACION_MAX_FILAS, 100000, 200000) }` con una función local `leerEnteroAcotado(valor, defecto, maximo)`: entero > 0 → `Math.min(valor, maximo)`; si no, `defecto`.
- **Criterios de aceptación**:
  - [ ] `write-excel-file` exacta `4.1.1` en `dependencies`; `npm ls fflate` → `fflate@0.8.3`.
  - [ ] `npm audit --omit=dev` en `back/` sin hallazgos nuevos respecto de `main`.
  - [ ] `CONSOLIDADO_EXPORTACION_MAX_FILAS=abc` → 100 000; `=999999` → 200 000; `=50` → 50.
- **Pruebas**: `back/test/config/env.test.js` solo si `leerEnteroAcotado` se exporta; si no, cubrir en T7 vía dependencias inyectadas.
- **Depende de**: —

### T3 — Reuso del dominio y mapeadores compartidos (sin cambio de comportamiento)
- **Archivos**: modificar `back/src/domain/skuVersion/skuVersion.entity.js`, `back/src/domain/compartido/gancho.js`, `back/src/infrastructure/repositories/skuVersion.repository.js`; crear `back/src/infrastructure/repositories/mapeadoresVersion.js`
- **Qué hacer**:
  - Exportar `valorComun` en `skuVersion.entity.js` (sin cambiarla).
  - Agregar a `gancho.js`: `textoGancho(g) → string` (`number` → `String(g).padStart(2, '0')`; texto tal cual) y exportarla.
  - `mapeadoresVersion.js`: `mapearGondola(row)`, `mapearSeccion(row)`, `mapearNivel(row)` con las mismas formas que hoy produce `cargarVersion`, y `mapearPosicionBase(row)` (id, nivelId, ordenHorizontal, sku, nombre, facings, capacidadMaxima, minFinal, maxFinal, ganchos). `cargarVersion` los usa.
- **Criterios de aceptación**:
  - [ ] `back/test/domain/skuVersion.test.js` sigue verde **sin modificarlo**.
  - [ ] `cargarVersion` devuelve exactamente las mismas claves que antes.
- **Pruebas**: agregar a `back/test/domain/gancho.test.js` casos de `textoGancho` (`5` → `05`, `'54E'` → `54E`).
- **Depende de**: —

### T4 — Lista blanca de columnas (dominio)
- **Archivos**: crear `back/src/domain/consolidado/columnas.js`
- **Qué hacer**: `CLAVES_COLUMNAS_CONSOLIDADO` (arreglo congelado con las 24 claves en el orden de la tabla de Contratos: `sku, producto, tienda, version, estadoVersion, seccion, gondola, nivel, orden, ganchos, accesorio, montaje, facings, apilable, capacidadFacing, capacidadMaxima, minEstetico, minFinal, maxFinal, perfil, modo, decision, observaciones, sustituto`) y `COLUMNAS_CONSOLIDADO`: objeto congelado creado con `Object.create(null)` → `{ etiqueta, tipo: 'texto'|'numero', valor(fila, grupo) }` según "Celdas" de Contratos. Exportar `esClaveColumna(clave)` (`Object.hasOwn`), `columnasInvalidas(claves) → string[]`, `etiquetaColumna(clave)`, `textoMontaje(fila)`, `textoAccesorios(fila)`.
- **Criterios de aceptación**:
  - [ ] `esClaveColumna('__proto__')`, `('constructor')`, `('toString')` → `false`.
  - [ ] Etiquetas idénticas a la tabla de Contratos.
- **Pruebas**: `back/test/domain/consolidadoColumnas.test.js`: igualdad exacta de `CLAVES_COLUMNAS_CONSOLIDADO` con un literal de las 24 claves (mismo literal que la prueba del front, DT nueva); claves peligrosas; `valor` de cada clave sobre una fila de ejemplo (incluye `Varía`, `null` → `null`, montaje con nota, ganchos `05, 54E`).
- **Depende de**: T3

### T5 — Tubería del consolidado (dominio puro)
- **Archivos**: crear `back/src/domain/consolidado/consolidado.entity.js`
- **Qué hacer** (funciones puras, sin Express/Knex):
  - `construirFilasPorVersion(base) → Map<versionId, Fila[]>`: agrupa góndolas/secciones/niveles/posiciones por versión; **descarta huérfanos** (posición sin nivel cargado, nivel sin góndola cargada) sin lanzar; corre `recorrerVersion` una vez por versión; agrupa por `sku`+`modo` (excluye `sku` nulo y `PENDIENTE`) y aplica las reglas de agregación de Contratos (usa `valorComun`).
  - `expandirPorTienda(filasPorVersion, base) → Grupo[]`: por cada asignación (versión, tienda) agrega las filas al grupo `sku|tiendaId`; separa `planograma` (modo PLANOGRAMA) y `otras`; completa `producto` y `tienda`.
  - `contarPlanogramasPorGrupo(grupos)`: fija `planogramasEnTienda` = versiones distintas en `planograma` (antes de filtrar).
  - `aplicarFiltros(grupos, { versionIds, estados, skusJerarquia: Set|null, busqueda, soloDuplicados }) → Grupo[]`: filtra filas de `planograma` y `otras` por versión/estado; descarta grupos sin filas; filtra por jerarquía, búsqueda (`normalizarTexto` = NFD sin diacríticos, minúsculas; `includes` sobre sku, nombre y marca) y `soloDuplicados`.
  - `normalizarTexto(texto) → string`.
  - `calcularResumen(grupos, maximoExportacion) → Resumen`.
  - `unidadesDeVista(grupos, vista) → Grupo[]`: PLANOGRAMA → los grupos; CROSS/IMPULSO → un grupo por fila de `otras` de ese modo con `planograma: []`.
  - `ordenar(unidades, orden, direccion)`: claves desde un mapa congelado `{ sku, producto, tienda, version }` (`version` = código de la primera fila de `planograma` u `otras`); desempate SKU, código de tienda, código de versión; comparación con `localeCompare('es', { numeric: true, sensitivity: 'base' })`.
  - `paginar(unidades, page, pageSize) → { data, total, page, pageSize }`.
- **Criterios de aceptación**:
  - [ ] Dos ubicaciones de la misma versión y SKU en PLANOGRAMA → una fila con `facings` sumados y dos `ubicaciones`.
  - [ ] SKU en planograma y cross de la misma versión → una fila en `planograma` y una en `otras`.
  - [ ] Filtro de versión que deja una sola fila → `planogramasEnTienda` sigue en 2.
  - [ ] Grupo solo con cross → `planograma: []`.
  - [ ] Posición huérfana → se omite sin excepción.
  - [ ] `busqueda='(((((a'` → sin excepción.
  - [ ] Página fuera de rango → `data: []` con `total` correcto; un grupo nunca se parte entre páginas.
  - [ ] Claves de cada `Fila` exactamente las del contrato.
- **Pruebas**: `back/test/domain/consolidado.test.js` con todos los criterios anteriores + `minVaria`, `capacidadMaxima` nula, `observaciones` unidas, banderas de montaje, orden y desempate, conteos del resumen.
- **Depende de**: T3, T4

### T6 — Construcción de hojas de exportación (dominio puro)
- **Archivos**: modificar `back/src/domain/consolidado/consolidado.entity.js`
- **Qué hacer**:
  - `contarFilasExportacion(grupos, formato, hojas) → number`: DETALLADO = filas PLANOGRAMA + CROSS + IMPULSO; AGREGADO = grupos; HOJAS = suma de las hojas elegidas.
  - `sumarMinMaxAgregado(grupo) → { minFinal, maxFinal }` (regla D15).
  - `construirHojas(grupos, formato, hojas, columnas) → Array<{ nombre, encabezados: string[], filas: Array<Array<{ tipo: 'texto'|'numero', valor }>> }>`: encabezados = `columnas.map(etiquetaColumna)`, en DETALLADO con `modo` antepuesto si falta; nombres fijos `Consolidado`, `Min-Max agregado`, `Planograma`, `Cross`, `Impulso`; orden de filas fijo. En AGREGADO las columnas de fila se arman con los valores de las filas PLANOGRAMA unidos con ` | ` (un solo valor numérico conserva tipo número; varios → texto) y `minFinal`/`maxFinal` desde `sumarMinMaxAgregado`.
- **Criterios de aceptación**:
  - [ ] Encabezado exactamente `columnas.map(etiqueta)` (+ "Modo" al inicio en DETALLADO si falta; si viene, no se duplica).
  - [ ] AGREGADO con planograma y cross de la misma versión → mín./máx. contados una vez; versiones distintas → sumados; todos `null` → vacío.
  - [ ] AGREGADO sin planograma → columnas de fila vacías; `sku`/`producto`/`tienda`/`sustituto` llenas.
  - [ ] HOJAS con una hoja sin filas → solo encabezados.
- **Pruebas**: en `back/test/domain/consolidado.test.js`.
- **Depende de**: T5

### T7 — Contrato del repositorio y casos de uso
- **Archivos**: crear `back/src/domain/consolidado/consolidado.repository.js` (contrato documentado, como `domain/implementacion/implementacion.repository.js`), `back/src/domain/consolidado/consolidado.usecases.js`, `back/src/application/consolidado/semaforo.js`
- **Qué hacer**:
  - Contrato: `cargarBase({ tiendaIds }) → Promise<{ versiones, asignaciones, tiendas, gondolas, secciones, niveles, posiciones, accesorios, productos }>` y `filtrosDisponibles() → Promise<{ tiendas, versiones }>`.
  - `semaforo.js`: `crearSemaforo(maximo) → { intentarTomar(): boolean, liberar(): void }`.
  - `listarConsolidado({ repo, catalogo, maximoExportacion }, filtros, { vista, page, pageSize, orden, direccion })`: si hay jerarquía, `catalogo.listarSkusPorJerarquia` **antes** de `repo.cargarBase`; luego tubería T5 y `resumen`.
  - `obtenerFiltros({ repo })` → `repo.filtrosDisponibles()`.
  - `exportarConsolidado({ repo, catalogo, escribirLibro, semaforo, maximoFilas }, filtros, { formato, hojas, columnas }) → { buffer, filas }`: jerarquía → base → filtros → `contarFilasExportacion`; si supera `maximoFilas` → error `status 422`, `code 'EXPORTACION_DEMASIADO_GRANDE'`, `details: { filas, maximo }`; si `!semaforo.intentarTomar()` → `status 503`, `code 'EXPORTACION_EN_CURSO'`, mensaje de Contratos; si no, `construirHojas` + `await escribirLibro(hojas)` en `try/finally` que libera.
- **Criterios de aceptación**:
  - [ ] Sin jerarquía, `catalogo` no se invoca; con jerarquía y catálogo que rechaza con `status 503` → el error se propaga y `cargarBase` no se llama.
  - [ ] Tope 10 con 11 filas → 422 y `escribirLibro` sin llamadas.
  - [ ] Dos exportaciones concurrentes con `escribirLibro` lento → la segunda 503; al terminar la primera, otra pasa; si `escribirLibro` lanza, el semáforo se libera.
  - [ ] Una versión `borrador` en la base falsa (simulando un repo defectuoso) no aparece: el caso de uso filtra también por `estado ∈ {publicado, piloto}` como defensa (S6).
- **Pruebas**: `back/test/domain/consolidadoUsecases.test.js` con repo, catálogo y `escribirLibro` falsos (espías con `t.mock.fn`).
- **Depende de**: T5, T6

### T8 — Repositorio SQL y deduplicación en CATI
- **Archivos**: crear `back/src/infrastructure/repositories/consolidado.repository.js`; modificar `back/src/infrastructure/cati/catiClient.js`
- **Qué hacer**:
  - Subconsulta base `versionesMontables(tiendaIds)`: `SELECT DISTINCT VersionTienda.planograma_version_id FROM VersionTienda JOIN PlanogramaVersion … JOIN Tienda … WHERE PlanogramaVersion.estado IN ('publicado','piloto') AND Tienda.estado = 'activo' [AND VersionTienda.tienda_id IN (?…)]`.
  - `cargarBase({ tiendaIds })`: 7 consultas con columnas explícitas, todas filtradas con `whereIn(col, subconsulta)`: versiones (+ `Planograma.id/nombre`), asignaciones con tienda (`id, codigo, nombre, tipo, marca`), góndolas (`id, planograma_version_id, nombre, orden, ancho_cm, alto_cm, por_ubicar`), secciones (columnas que usa `mapearSeccion`), niveles (`id, gondola_id, seccion_id, orden`), posiciones (join `Nivel`/`Gondola`; `id, nivel_id, orden_horizontal, sku, facings_horizontal, cantidad_apilable, unidades_por_facing, capacidad_maxima, min_estetico, min_final, max_final, perfil_redondeo, modo, decision, observaciones, cross_externo, montar_en_display, desborda_gondola, nota_desborde, ganchos`; `whereNotNull('sku')`, `modo <> 'PENDIENTE'`; left join `Producto` y sustituto para `nombre, marca, sku_sustituto, sustituto_nombre`), accesorios (`PosicionAccesorio.posicion_id, orden, Accesorio.codigo, tamano_pulgadas`, join hasta `Gondola` con la misma subconsulta, sin listas de ids). Mapear con `mapeadoresVersion.js`.
  - `filtrosDisponibles()`: tiendas activas con asignación montable + `totalSkus` (`COUNT(DISTINCT Posicion.sku)`), versiones montables con tienda (forma `VersionElegible`, `totalProductos` = `COUNT(DISTINCT sku)`).
  - `catiClient.listarSkusPorJerarquia`: `Map` módulo `enVuelo` por `clave`; si existe, devolver esa promesa; borrar en `finally`. Sin cambio de contrato.
- **Criterios de aceptación**:
  - [ ] Ningún `select *` ni `knex.raw` con concatenación; sin columnas de auditoría.
  - [ ] Contra DEV, `cargarBase({})` devuelve ~3 200 filas tras la tubería (volumen de §6 de arquitectura) en < 2 s.
  - [ ] Dos llamadas simultáneas a `listarSkusPorJerarquia` con la misma clave hacen una sola paginación.
- **Pruebas**: cubierto por T7 (repo falso) y Postman T13; la deduplicación con una prueba en `back/test/infrastructure/catiJerarquia.test.js` solo si `get` es inyectable; si no, verificación manual y revisión.
- **Depende de**: T1, T3, T7

### T9 — Adaptador del libro .xlsx
- **Archivos**: crear `back/src/infrastructure/exportacion/libroXlsx.js`
- **Qué hacer**: `escribirLibroXlsx(hojas) → Promise<Buffer>` con `require('write-excel-file/node')` (único archivo que conoce la librería). Cada celda de texto `{ type: String, value: sanear(valor) }`; numérica `{ type: Number, value }` solo si `Number.isFinite`, si no `null`; nunca `Formula`. Encabezados en negrita. `sanear(texto)`: quitar `/[\x00-\x08\x0B\x0C\x0E-\x1F]/g` y truncar a 32 767. Varias hojas con el arreglo de datos y `sheets: hojas.map((h) => h.nombre)`; salida en buffer (verificar la opción exacta en el README de 4.1.1 instalado).
- **Criterios de aceptación**:
  - [ ] Ninguna hoja del zip contiene `<f>` para `=HYPERLINK("http://x","a")`, `+1`, `-1`, `@SUM(A1)`, `=cmd|' /C calc'!A0`.
  - [ ] `\u0000` se elimina; 40 000 caracteres → 32 767.
  - [ ] `NaN`/`Infinity` → celda vacía.
- **Pruebas**: `back/test/infrastructure/libroXlsx.test.js` (descomprime con `require('fflate').unzipSync`, solo en la prueba).
- **Depende de**: T2

### T10 — Validación estricta y esquemas
- **Archivos**: modificar `back/src/application/compartido/validacion.js`; crear `back/src/application/consolidado/consolidado.schemas.js`
- **Qué hacer**:
  - `validarQueryEstricta(schema, datos)`: `schema.validate(datos, { abortEarly: false, allowUnknown: false, stripUnknown: false, convert: true })`; relanza el error de Joi. `validarConJoi` no se toca.
  - `consolidado.schemas.js`: helper `listaEnteros(maxCaracteres, maxElementos)` (`Joi.string().max(n).pattern(/^[1-9]\d*(,[1-9]\d*)*$/)` + `custom` que hace `split`, verifica `Number.isSafeInteger`, duplicados y tope; devuelve `number[]`), `listaEnum(valores, min, max)` igual para `estados`/`hojas`/`columnas` (en `columnas` el error lleva `details.columnasInvalidas` lanzando `errorValidacion` desde el controller tras validar con `columnasInvalidas`). Exportar `schemaListado`, `schemaFiltros` (`Joi.object({})`), `schemaExportar`, con las reglas de Contratos (`Joi.when` para `hojas` y para `soloDuplicados` vs `vista`).
- **Criterios de aceptación**: todos los casos A3–A9 y A17 de seguridad → 400; `?tiendaIds=1&tiendaIds=2` → 400; valores por defecto aplicados.
- **Pruebas**: `back/test/application/consolidadoSchemas.test.js`: `?foo=1`, 201 ids, `1,,2`, `1,abc`, `0`, 5 000 caracteres, arreglo, `columnas=sku,__proto__` (→ `columnasInvalidas`), `columnas=sku,sku`, `orden=sku;DROP TABLE Posicion`, `pageSize=100000`, `estados=borrador`, `area=`, `area=A B`, `page=1.5`, `page=10001`, `formato=DETALLADO&hojas=CROSS`, `formato=HOJAS` sin `hojas`, `soloDuplicados=true&vista=CROSS`, `vista` en exportar.
- **Depende de**: T4

### T11 — Limitadores por usuario
- **Archivos**: modificar `back/src/infrastructure/http/middlewares/rateLimit.js`
- **Qué hacer**: `crearLimiterPorUsuario({ windowMs, limit, mensaje })` con `keyGenerator: (req) => String(req.usuario.numeroEmpleado)`, `validate: { xForwardedForHeader: false }` y el mismo `handler` 429 (`RATE_LIMITED`, mensaje propio). Exportar `exportacionLimiter` (60 s, 5, `Demasiadas descargas, espera un minuto e inténtalo de nuevo`) y `consolidadoLimiter` (60 s, 60). `vozLimiter` sin cambios.
- **Criterios de aceptación**: usuario A: 6.ª exportación en 1 min → 429; usuario B → 200; 61.º listado → 429.
- **Pruebas**: `back/test/http/rateLimitUsuario.test.js`: app Express efímera (`app.listen(0)` + `fetch`) con un middleware que fija `req.usuario` desde una cabecera de prueba.
- **Depende de**: —

### T12 — Controller y rutas
- **Archivos**: crear `back/src/application/consolidado/consolidado.controller.js`, `back/src/infrastructure/http/routes/consolidado.routes.js`; modificar `back/src/infrastructure/http/routes/index.js`
- **Qué hacer**:
  - Controller (inyecta `consolidadoRepo`, `catiClient`, `escribirLibroXlsx`, un semáforo de módulo `crearSemaforo(1)`, `env.consolidado.exportacionMaxFilas`): `listar`, `filtros`, `exportar`. Validar con `validarQueryEstricta`; `columnas` inválidas → `errorValidacion('Columnas no permitidas', { columnasInvalidas })`. En `exportar`: obtener el `buffer` completo **antes** de `res.set(...)`; cabeceras de Contratos con `formato` → `{ DETALLADO: 'detallado', AGREGADO: 'minmax', HOJAS: 'hojas' }` y fecha del servidor `AAAAMMDD`; `res.send(buffer)`. Logs S12 con `console.info`.
  - Rutas: `router.use(requiereAnalista); // A transitoria (DT-11)`; `router.get('/tiendas/filtros', controller.filtros)`; `router.get('/tiendas/exportar', exportacionLimiter, controller.exportar)`; `router.get('/tiendas', consolidadoLimiter, controller.listar)`.
  - `index.js`: `router.use('/consolidado', require('./consolidado.routes'));`
- **Criterios de aceptación**:
  - [ ] `rutasProtegidas.test.js` verde con el archivo nuevo.
  - [ ] Generador que lanza → 500 `INTERNAL_ERROR` JSON sin `stack` ni cabeceras de xlsx.
  - [ ] 200 de exportar con `Content-Type`, `Content-Disposition`, `Cache-Control: no-store`, `Content-Length`.
- **Pruebas**: `back/test/http/consolidadoRutas.test.js`: PLA009/PLA010 → 403 y sin usuario → 401 en las 3 rutas (patrón de `autorizacion.test.js` sobre las capas del router); `exportar` con dependencias falsas que lanzan → 500 (llamar al handler con `req/res` simulados y pasar el error a `errorHandler`). Para inyectar falsos, exportar del controller una fábrica `crearControllerConsolidado(deps)` y el objeto por defecto construido con las dependencias reales.
- **Depende de**: T7, T8, T9, T10, T11

### T13 — Postman, carpeta `21 - Consolidado tiendas`
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único editable; no tocar el resto de `postman/`)
- **Qué hacer**: según `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`, carpeta antes de "99 - Limpieza": listado 200 (forma `{ data, total, page, pageSize, resumen }`, claves exactas de `Fila`), cada vista, `soloDuplicados`, paginación fuera de rango, filtros 200, exportar 200 en los 3 formatos (cabeceras), y los 400 (A3–A9, A17), 401 sin token, 422 (con `CONSOLIDADO_EXPORTACION_MAX_FILAS` bajo solo si el estándar lo permite; si no, documentar como manual), versión borrador de los fixtures → 0 filas y ausente en `/filtros`.
- **Criterios de aceptación**: la carpeta corre completa contra local/DEV y es repetible.
- **Pruebas**: la propia colección.
- **Depende de**: T12

### T14 — Front: tipos, cliente HTTP y servicio
- **Archivos**: crear `front/src/types/consolidado.ts`, `front/src/services/consolidado.service.ts`; modificar `front/src/services/httpClient.ts`
- **Qué hacer**:
  - `httpClient.getBinario(path, query?)`: `requestBinario` acepta `query` y lo pasa a `enviar` (sin cambiar los usos actuales).
  - Servicio: `listar(query): Promise<RespuestaConsolidado>` (`GET /consolidado/tiendas`), `obtenerFiltros(): Promise<FiltrosDisponiblesConsolidado>`, `descargar(query): Promise<Blob>` (`getBinario('/consolidado/tiendas/exportar', query)`).
- **Criterios de aceptación**: `npx tsc -b` sin errores; usos existentes de `getBinario` intactos.
- **Pruebas**: —
- **Depende de**: T12 (contrato)

### T15 — Front: navegación "Mantenimiento" y ruta
- **Archivos**: modificar `front/src/domain/permisos/permisos.ts`, `front/src/domain/permisos/permisos.test.ts`, `front/src/constants/navegacion.ts`, `front/src/components/dominio/layout/AppTopbar/AppTopbar.tsx`, `AppTopbar.css`, `front/src/router/routes.tsx`
- **Qué hacer**:
  - `OpcionNavegacion` con `hijos?: readonly OpcionNavegacion[]`. Nueva `opcionesVisibles(opciones, usuario)`: filtra por regla, filtra hijos y quita grupos sin hijos visibles. `rutaInicio` usa la ruta del primer hijo cuando la opción es un grupo.
  - `navegacion.ts` (analista, al final): `{ etiqueta: 'Mantenimiento', ruta: '/mantenimiento', regla: REGLAS.analista, hijos: [{ etiqueta: 'Consolidado Tiendas', ruta: '/mantenimiento/consolidado-tiendas', regla: REGLAS.analista }] }`.
  - `AppTopbar`: usar `opcionesVisibles`; grupo como botón desplegable (UX); activo si `pathname.startsWith(ruta + '/')`.
  - Ruta: `<Route path="/mantenimiento/consolidado-tiendas" element={protegida(REGLAS.analista, 'analista', <ConsolidadoTiendas />)} />`.
- **Criterios de aceptación**:
  - [ ] Implementador no ve "Mantenimiento"; URL directa sin capacidad de analista → pantalla de `RequierePermiso`.
  - [ ] Menú operable con teclado; Escape y clic fuera lo cierran; `aria-expanded` correcto.
- **Pruebas**: `permisos.test.ts`: `opcionesVisibles` con analista (grupo con hijo), implementador (sin grupo), grupo cuyo único hijo no cumple regla (se quita); `rutaInicio` con grupo primero.
- **Depende de**: —

### T16 — Front: preferencias de columnas y `PanelColumnas` genéricos
- **Archivos**: crear `front/src/domain/columnas/preferenciasColumnas.ts` (+ `.test.ts`); modificar `front/src/domain/implementacion/columnasProductos.ts`, `front/src/components/dominio/implementacion/PanelColumnas/PanelColumnas.tsx`, `ProductosVersiones.tsx`
- **Qué hacer**:
  - Genéricos: `interface PreferenciasOrdenVisibilidad<K extends string> { orden: K[]; ocultas: K[] }`; `validarOrdenVisibilidad<K>(crudo, claves: readonly K[], ocultasIniciales: K[]) → PreferenciasOrdenVisibilidad<K>`; `moverColumna<K>`, `soltarColumna<K>`, `alternarVisibilidadBase<K>`, `columnasVisibles<K>` (mover la lógica actual sin cambiarla).
  - `columnasProductos.ts`: sus funciones exportadas conservan firma y comportamiento delegando en las genéricas (`alternarVisibilidad` sigue quitando el criterio de orden).
  - `PanelColumnas<K extends string>`: props `prefs: PreferenciasOrdenVisibilidad<K>`, `etiqueta: (clave: K) => string`, `nota?: string` y los callbacks tipados con `K`. `ProductosVersiones` pasa `etiqueta={(c) => columnaProducto(c).etiqueta}`.
- **Criterios de aceptación**: Por versión se comporta igual (manual: ocultar, mover con teclado y arrastre, restablecer).
- **Pruebas**: `preferenciasColumnas.test.ts`: claves desconocidas descartadas, columnas nuevas al final, no ocultar todas, `moverColumna` fuera de rango, `soltarColumna` izquierda/derecha.
- **Depende de**: —

### T17 — Front: reubicar y extraer componentes compartidos
- **Archivos**: mover `front/src/components/dominio/implementacion/SeleccionVersionesModal/` → `front/src/components/dominio/modales/SeleccionVersionesModal/` (actualizar import en `ProductosVersiones.tsx`); crear `front/src/components/dominio/productos/CadenaJerarquia/CadenaJerarquia.tsx` (+ `.css`); modificar `ProductosFiltros.tsx`, `ProductosFiltros.css`, `front/src/components/ui/SeleccionMultipleModal/SeleccionMultipleModal.tsx`, `front/src/components/ui/Paginacion/Paginacion.tsx` (+ `.css`)
- **Qué hacer**:
  - `CadenaJerarquia({ jerarquia: FiltroJerarquia, onChange: (j: FiltroJerarquia) => void, deshabilitado?: boolean })`: mueve `NIVELES_JERARQUIA` (exportado desde aquí; `ProductosFiltros` lo reimporta), los hooks `useJerarquia`/`useJerarquiaExploracion`, `elegirNivel` y el marcado de la cadena. Expone `limpiar` por `ref` o recibe un `key` para reiniciar (elegir `key` del padre: más simple). `ProductosFiltros` la usa sin cambio visual.
  - `SeleccionMultipleModal`: ocultar el bloque "Ordenar por" si `ordenes.length < 2`.
  - `Paginacion`: props opcionales `pageSizes?: number[]`, `onPageSizeChange?: (n: number) => void`; con ambas, un `select` con etiqueta `Filas por página` (sin ellas, igual que hoy).
- **Criterios de aceptación**: Productos y Por versión sin cambio visual ni funcional; `npx tsc -b` y lint verdes.
- **Pruebas**: manual en Productos (cadena) y Por versión (modal de versiones).
- **Depende de**: —

### T18 — Front: dominio del consolidado (lógica pura)
- **Archivos**: crear `front/src/domain/consolidado/columnasConsolidado.ts` (+ `.test.ts`), `front/src/domain/consolidado/filtrosConsolidado.ts` (+ `.test.ts`), `front/src/config/preferenciasConsolidado.ts`
- **Qué hacer**:
  - `columnasConsolidado.ts`: `CLAVES_COLUMNA_CONSOLIDADO` (las 24, mismo orden que el back), `ClaveColumnaConsolidado`, `COLUMNAS_CONSOLIDADO` (`clave, etiqueta, ancho, numerica, ordenable` — ordenables `sku, producto, tienda, version` → `OrdenConsolidado`), `OCULTAS_INICIALES` (todas menos las 10 visibles por defecto), `textoCelda(clave, fila | null, grupo) → { principal: string; secundario?: string }` con las reglas de "Celdas" (usa `textoGancho`, `MODO_APARICION_META`, `Varía`), `validarPreferenciasConsolidado(crudo)` vía `validarOrdenVisibilidad`.
  - `preferenciasConsolidado.ts`: `cargar/guardarPreferenciasConsolidado` con clave `planogramas.consolidado.columnas` (mismo patrón `leerJson/escribir` de `preferenciasImplementador.ts`).
  - `filtrosConsolidado.ts`: `FILTROS_CONSOLIDADO_INICIALES`; `construirQueryListado(filtros, jerarquia, vista, page, pageSize, orden, direccion)` y `construirQueryExportacion(filtros, jerarquia, formato, hojas, columnas)` → `Record<string, string | number | boolean | undefined>` (csv, omite vacíos y defaults; `soloDuplicados` solo en PLANOGRAMA; `columnas` filtradas por `CLAVES_COLUMNA_CONSOLIDADO`); `contarFiltrosActivos(filtros, jerarquia)`; `chipsFiltrosActivos(...)` (reglas de modo extendido); `filasEstimadas(formato, hojas, conteos)`; `nombreArchivo(formato, fecha: Date)`; `mensajeErrorDescarga(error: ApiError) → string` (textos de UX).
- **Criterios de aceptación**: claves del front idénticas al literal del back; la query nunca contiene claves fuera de la lista ni parámetros prohibidos por formato.
- **Pruebas**: `columnasConsolidado.test.ts` (literal de 24 claves igual al de T4; preferencias con claves ajenas `__proto__`/`inventario` → ignoradas; `textoCelda` de montaje, ganchos, varía, sin planograma); `filtrosConsolidado.test.ts` (query con listas vacías, jerarquía, `soloDuplicados` fuera de PLANOGRAMA omitido, `hojas` solo en HOJAS, `filasEstimadas` de los 3 formatos, `nombreArchivo` `consolidado-tiendas-minmax-20261015.xlsx`, contador del embudo, chips con 3+ tiendas agrupados, `mensajeErrorDescarga` para 422/429/503/otro).
- **Depende de**: T14, T16

### T19 — Front: hooks
- **Archivos**: crear `front/src/hooks/useConsolidado.ts`, `front/src/hooks/useFiltrosConsolidado.ts`
- **Qué hacer**:
  - `useFiltrosConsolidado()` → `{ opciones, cargando, error, recargar }` (una llamada a `obtenerFiltros` al montar).
  - `useConsolidado(query)` → `{ datos: RespuestaConsolidado | null, cargando, error: ApiError | null, recargar }`; descarta respuestas obsoletas (contador de petición) cuando cambia la query; `busqueda` con debounce de 300 ms en la página.
- **Criterios de aceptación**: cambiar filtros reinicia `page` a 1; una respuesta vieja nunca pisa a una nueva.
- **Pruebas**: — (lógica pura cubierta en T18).
- **Depende de**: T14, T18

### T20 — Front: barra de filtros y tabla
- **Archivos**: crear `front/src/components/dominio/consolidado/ConsolidadoFiltros/ConsolidadoFiltros.tsx` (+ `.css`), `front/src/components/dominio/consolidado/ConsolidadoTable/ConsolidadoTable.tsx` (+ `.css`)
- **Qué hacer**:
  - `ConsolidadoFiltros({ id, visible, compacta, filtros, jerarquia, vista, opciones, onChange, onJerarquiaChange, onVistaChange, onLimpiar, onMostrarFiltros })` según "UX › Filtros" y "Modo extendido".
  - `ConsolidadoTable({ grupos, vista, columnas: ClaveColumnaConsolidado[], orden, direccion, onOrdenar, cargando, compacta })` según "UX › Tabla"; estado de expansión local por `sku|tiendaId` (se reinicia al cambiar de página).
- **Criterios de aceptación**: textos, `aria-*` y tokens exactamente los de la sección UX; stylelint sin literales de color.
- **Pruebas**: manual (ver Verificación final).
- **Depende de**: T15, T16, T17, T18, T19

### T21 — Front: modal de descarga
- **Archivos**: crear `front/src/components/dominio/consolidado/DescargarConsolidadoModal/DescargarConsolidadoModal.tsx` (+ `.css`)
- **Qué hacer**: `DescargarConsolidadoModal({ abierto, onClose, columnasVisibles, conteos, maximo, generando, onDescargar: (o: { formato: FormatoDescarga; hojas: VistaConsolidado[] }) => void, onElegirColumnas })` según "UX › Modal Descargar"; usa `filasEstimadas`.
- **Criterios de aceptación**: "Descargar (.xlsx)" deshabilitado con 0 hojas, 0 filas o filas > máximo; textos exactos; `role="alert"` en validaciones.
- **Pruebas**: lógica en T18; manual.
- **Depende de**: T18

### T22 — Front: página Consolidado Tiendas
- **Archivos**: crear `front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx` (+ `.css`)
- **Qué hacer**: compone `AppTopbar` (oculta en extendido, D16), encabezado y resumen, `ConsolidadoFiltros`, `PanelColumnas<ClaveColumnaConsolidado>` con la nota de descarga, `ConsolidadoTable`, `Paginacion` con `pageSizes`, `DescargarConsolidadoModal`. Descarga: `descargar(construirQueryExportacion(...))` → `URL.createObjectURL(blob)` + `<a download={nombreArchivo(formato, new Date())}>` + `revokeObjectURL`; éxito → toast `Descarga lista: <archivo>`; error → toast `mensajeErrorDescarga`. Estados de carga, vacío y error de "UX › Estados".
- **Criterios de aceptación**: todos los textos de estados; Escape sale del modo extendido salvo con modal o panel abiertos (mismo criterio que `ProductosVersiones`).
- **Pruebas**: manual.
- **Depende de**: T15, T19, T20, T21

### T23 — Documentación (commit separado)
- **Archivos**: crear `Arquitectura/Contratos/21_consolidado/GET_consolidado_tiendas.md`, `GET_consolidado_tiendas_filtros.md`, `GET_consolidado_tiendas_exportar.md`; modificar `Arquitectura/ENDPOINTS.md`, `Arquitectura/CASOS_DE_USO.md` (CU-10-03, CU-10-04), `Arquitectura/ESTADO_MODULOS.md` (módulo 21: reglas no obvias — conteo antes de filtros, una vez por versión en AGREGADO, D2), `Arquitectura/ESTRUCTURA_FRONTEND.md` (`dominio/consolidado/`, `SeleccionVersionesModal` en `modales/`, `CadenaJerarquia`, `domain/columnas/`), `Arquitectura/SEGURIDAD_PERMISOS.md` (3 rutas regla A), `Arquitectura/DEUDA_TECNICA.md`, `CLAUDE.md` (estado de módulos: 21 implementado; tabla de migraciones DEV → `017_indices_consolidado.js` con fecha de `migrate:status`; PROD sin verificar, 017 pendiente).
- **Qué hacer**: contratos con el texto de la sección Contratos; en `DEUDA_TECNICA.md`: DT-24 → Resuelta (017, ampliada a las FKs de `Gondola`, `Nivel`, `Posicion`, `VersionTienda`), nota en DT-10 (el consolidado no se abre a implementadores sin intersecar `cargarBase({ tiendaIds })` con `req.usuario.tiendas`), nota en DT-11 (+3 rutas; D1 revisable) y las deudas nuevas de la tabla siguiente.
- **Criterios de aceptación**: docs coherentes con el código final; commit `docs:` separado del de código.
- **Depende de**: T1–T22

**Deudas nuevas a registrar** (siguientes IDs disponibles):

| ID | Descripción | Severidad | Área |
|---|---|---|---|
| DT-43 | Catálogo de columnas del consolidado duplicado back (Excel) / front (tabla); mitigado con el mismo literal de 24 claves en una prueba de cada lado (como DT-29) | Baja | back · front |
| DT-44 | "Una versión por planograma por tienda" solo la garantiza el dominio, no la BD | Baja | back · BD |
| DT-45 | El consolidado recalcula toda la base en cada request (sin caché); medir p95 en PROD (objetivo < 2 s) y, si se supera, caché de 60 s de la base | Baja | back |
| DT-46 | `validarConJoi` fuerza `stripUnknown: true`: los parámetros desconocidos se descartan en silencio en los módulos 16 y 17 | Media | back |
| DT-47 | Limitadores por IP sin `trust proxy`: en App Service `vozLimiter` agrupa a todos los usuarios bajo la IP del proxy | Media | back |
| DT-48 | Exportación síncrona en el event loop (mitigada con tope y semáforo de 1); si crece el uso, worker o descarga asíncrona | Baja | back |
| DT-49 | `ui/Modal` sin Escape, foco inicial, trampa de foco ni devolución del foco al disparador | Media | front |
| DT-50 | Colores literales en `Modal.css`, `SeleccionMultipleModal.css`, `BotonSeleccionMultiple.css`, `SeleccionVersionesModal.css` (`#f7f8fe`), `ProductosVersiones.css`, `ProductosFiltros.css` (incl. `999px`), `constants/tiendas.ts` y `ESTADO_VERSION_IMPLEMENTACION_META` | Baja | front |

## Verificación final

- `cd back && npm test` (incluye `rutasProtegidas`, `skuVersion` sin cambios y las pruebas nuevas de T3–T12)
- `cd back && npm ls fflate && npm audit --omit=dev`
- `cd back && npm run migrate:status` (DEV: 017 aplicada)
- `cd front && npm test && npx tsc -b && npm run lint`
- Postman: carpeta `21 - Consolidado tiendas`
- Prueba manual: como analista, Mantenimiento → Consolidado Tiendas; filtrar por tienda, versión, estado, jerarquía y búsqueda; expandir un grupo con cross; ver un SKU en 2 planogramas en rojo y mantener el rojo con el filtro de una sola versión; cambiar a Solo cross / Solo impulso; ocultar y reordenar columnas; modo extendido (chips, Escape); descargar los 3 formatos y abrir cada archivo en Excel (columnas visibles en orden, "Modo" al inicio en Detallado, hojas elegidas, mín./máx. sumados); como implementador, comprobar que no ve el grupo y que la URL directa muestra "sin permiso"; Productos y Por versión sin cambios (cadena de jerarquía, panel de columnas, modal de versiones).

## Riesgos

- Volumen de PROD (10⁵–3·10⁵ filas expandidas) supera el p95 de 2 s → logs de duración (S12) y DT-45 (caché de 60 s de la base).
- Generación del libro bloquea el event loop varios segundos con el tope → semáforo de 1, tope de 100 000, `exportacionLimiter`; DT-48.
- CATI lento en frío con jerarquía (hasta 60 s) → 503 sin datos parciales, caché de 30 min y deduplicación en vuelo (D20).
- PROD sin 017 → consultas más lentas pero correctas; aplicar al resolver DT-08.
- Opción de buffer de `write-excel-file` distinta a la esperada → el adaptador es el único punto de contacto; la prueba de T9 lo detecta.
- Generalizar `PanelColumnas`/preferencias o extraer `CadenaJerarquia` rompe Por versión/Productos → firmas públicas conservadas y prueba manual explícita.
- Contradicción UX/Seguridad: ninguna relevante; la única tensión ("solo columnas visibles" vs. "Modo" en Detallado) se resuelve con D2.
