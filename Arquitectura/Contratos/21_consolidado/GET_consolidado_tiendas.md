# Contrato: Listar consolidado de tiendas

**Método:** `GET`  
**Ruta:** `/api/v1/consolidado/tiendas`  
**Actor:** Analista  
**Permiso:** A (`requiereAnalista`, transitoria — DT-11)  
**Caso de uso:** CU-10-03  

---

## Descripción

Lista paginada de las combinaciones SKU–tienda–versión de lo que montan las tiendas (versiones
`publicado` y `piloto` asignadas a tiendas activas). En la vista `PLANOGRAMA` cada elemento es un
grupo SKU–tienda con sus filas de planograma y sus sub-filas cross/impulso; en `CROSS`/`IMPULSO`
cada elemento es una sola fila de ese modo. Ver la tubería y los controles comunes en el
[README del módulo](README.md).

Capas: `requiereAnalista` → `validarQuery(schemaListado)` → `consolidadoLimiter` (60/min por usuario) → controller.

---

## Parámetros de entrada (query)

Filtros comunes del README (`tiendaIds`, `versionIds`, `estados`, `area`…`subcategoria`, `busqueda`,
`soloDuplicados`) más:

| Parámetro | Tipo | Requerido | Regla |
|-----------|------|-----------|-------|
| `vista` | `PLANOGRAMA \| CROSS \| IMPULSO` | No (def. `PLANOGRAMA`) | `soloDuplicados=true` con `CROSS`/`IMPULSO` → 400. |
| `page` | entero 1–10 000 | No (def. 1) | Fuera de rango → `data: []` con `total` correcto. |
| `pageSize` | `25 \| 50 \| 100 \| 200` | No (def. 50) | Cualquier otro → 400. |
| `orden` | `sku \| producto \| tienda \| version` | No (def. `sku`) | `version` = código de la primera fila del grupo. |
| `direccion` | `asc \| desc` | No (def. `asc`) | |

Cualquier otro parámetro → 400. Un parámetro repetido → 400.

---

## Reglas de negocio

1. Fila = versión–SKU–modo. Posiciones con `sku` nulo o `modo = 'PENDIENTE'` no aparecen.
2. `planogramasEnTienda` = versiones distintas con fila PLANOGRAMA del SKU en la tienda, calculado
   **antes** de los filtros de versión, estado, jerarquía, búsqueda y `soloDuplicados`. El front lo
   pinta en rojo si es > 1.
3. Paginación en `PLANOGRAMA` por grupo SKU–tienda (un grupo nunca se parte entre páginas); en
   `CROSS`/`IMPULSO` por fila (`data[i]` es un grupo con `planograma: []` y `otras: [la fila]`; `total` cuenta filas).
4. Orden con `Intl.Collator('es', { numeric: true, sensitivity: 'base' })`; desempate fijo: SKU,
   código de tienda, código de versión.
5. `planograma` va ordenado por código de versión; `otras` por modo (CROSS, IMPULSO) y luego código de versión.
6. `resumen` se calcula sobre todo lo filtrado (no solo la página):
   - `filas` = filas PLANOGRAMA + CROSS + IMPULSO.
   - `skus` y `tiendas` = distintos.
   - `gruposConVariosPlanogramas` = grupos filtrados con `planogramasEnTienda > 1`.
   - `conteos.AGREGADO` = grupos SKU–tienda filtrados (incluye los que solo tienen cross/impulso).
   - `maximoExportacion` = tope de filas de la descarga (`CONSOLIDADO_EXPORTACION_MAX_FILAS`, def. 100 000, máx. 200 000).

### Agregación de una fila (por versión–SKU–modo)

| Campo | Regla |
|---|---|
| `facings` | Suma de `facings_horizontal`. |
| `capacidadMaxima` | Suma; `null` si alguna ubicación es `null`. |
| `cantidadApilable`, `capacidadFacing` (= `unidades_por_facing`), `minEstetico`, `minFinal`, `maxFinal` | Valor común a las ubicaciones (`valorComun` del módulo 19); `null` si varía. `minVaria`/`maxVaria` indican que varía (el front muestra `Varía`). |
| `perfil`, `decision` | Valor común de texto o `null`. |
| `observaciones` | Distintas no vacías unidas con ` · `, o `null`. |
| `montaje.colganteExterno` / `display` / `desborda` | Alguna ubicación tiene `cross_externo` / `montar_en_display` / `desborda_gondola`. |
| `montaje.notaDesborde` | Notas distintas unidas con ` · `. |
| `accesorios` | Únicos por `codigo` + `tamanoPulgadas`, en orden de aparición. |
| `ubicaciones[]` | `seccion`/`nivel`/`ganchos` salen de `recorrerVersion`; `orden` = `orden_horizontal`. |

---

## Response — 200 OK

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

`ganchos` tiene la forma mixta del módulo 19 (`54` normal, `"54E"` exhibición).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Parámetro desconocido, repetido o fuera de regla (no gasta cupo del limitador). |
| `401` | — | JWT ausente o inválido. |
| `403` | `FORBIDDEN` | El usuario no cumple la regla A. |
| `429` | `RATE_LIMITED` | Más de 60 listados por minuto del mismo usuario. |
| `503` | `SERVICE_UNAVAILABLE` | Con filtro de jerarquía y CATI caído (sin datos parciales). |

---

## Logs

`[consolidado] listado ms=… filas=… grupos=…`. Nunca el token ni valores de la query.
