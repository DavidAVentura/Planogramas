# Contrato: Descargar consolidado (.xlsx)

**Método:** `GET`  
**Ruta:** `/api/v1/consolidado/tiendas/exportar`  
**Actor:** Analista  
**Permiso:** A (`requiereAnalista`, transitoria — DT-11). Sin permiso CAO propio (decisión D1, revisable).  
**Caso de uso:** CU-10-04  

---

## Descripción

Genera en el servidor un libro `.xlsx` (`write-excel-file@4.1.1`) con lo filtrado, en uno de tres
formatos, con las columnas elegidas y en su orden. El libro se genera completo en memoria antes de
fijar cabeceras: si algo falla, la respuesta es JSON, nunca un archivo truncado.

Capas: `requiereAnalista` → `validarQuery(schemaExportar)` → `exportacionLimiter` (5/min por usuario) → controller.

Orden dentro del caso de uso (`exportarConsolidado`): jerarquía CATI → base → filtros → conteo de
filas (`422` si supera el tope) → semáforo (`503` si hay otra en curso) → construir hojas → escribir
libro → liberar semáforo en `finally`.

---

## Parámetros de entrada (query)

Filtros comunes del [README](README.md) (`tiendaIds`, `versionIds`, `estados`, jerarquía, `busqueda`,
`soloDuplicados`) más:

| Parámetro | Tipo | Requerido | Regla |
|-----------|------|-----------|-------|
| `formato` | `DETALLADO \| AGREGADO \| HOJAS` | Sí | |
| `hojas` | csv ⊂ `PLANOGRAMA,CROSS,IMPULSO`, 1–3 únicos | Solo con `HOJAS` | Requerido con `HOJAS`; prohibido con los otros formatos. |
| `columnas` | csv ≤ 600 caracteres, 1–24 claves únicas | Sí | Lista blanca abajo; el orden recibido es el del archivo. |

Prohibidos (→ 400): `vista`, `page`, `pageSize`, `orden`, `direccion` y cualquier otro. En exportar,
`soloDuplicados` se acepta con cualquier formato.

### Lista blanca de columnas (clave → encabezado)

| Clave | Encabezado | Clave | Encabezado |
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

Fuente única: `back/src/domain/consolidado/columnas.js` (el front la duplica, DT-39). Clave fuera de
la lista → `400 VALIDATION_ERROR` con `details: { columnasInvalidas: [...] }` (cada valor recortado a
40 caracteres); clave repetida → 400.

---

## Formatos

Orden fijo de filas en todos: SKU, código de tienda, código de versión.

- **DETALLADO** — hoja `Consolidado`: una fila por cada fila PLANOGRAMA, CROSS e IMPULSO (dentro del
  grupo, en ese orden). Si `columnas` no trae `modo`, se antepone al inicio (decisión D2); si la trae,
  no se duplica.
- **AGREGADO** — hoja `Min-Max agregado`: una fila por grupo SKU–tienda.
  - `minFinal` / `maxFinal`: suma **por versión distinta** del grupo; por versión se toma la primera
    fila en orden PLANOGRAMA → CROSS → IMPULSO (un SKU en planograma y cross de la misma versión cuenta
    una vez). `null` no suma; todos `null` → celda vacía. Si la fila de alguna versión tiene
    `minVaria`/`maxVaria`, esa columna sale `Varía` (no una suma parcial); la otra columna sigue sumando.
  - `minEstetico` / `capacidadMaxima`: suma de **todas** las filas del grupo (planograma + cross +
    impulso), sin deduplicar por versión, porque son valores físicos de cada posición. Las filas sin
    valor no aportan; si ninguna tiene valor, vacío.
  - `sku`, `producto`, `tienda`, `sustituto`: del grupo.
  - Resto de columnas: de las filas PLANOGRAMA; varias se unen con ` | ` en orden de código de versión
    (un solo valor numérico conserva el tipo número). Sin planograma en la tienda → vacías.
- **HOJAS** — una hoja por tipo elegido, en orden fijo `Planograma`, `Cross`, `Impulso`. Una hoja sin
  filas lleva solo los encabezados.

Conteo para el tope: DETALLADO = filas PLANOGRAMA + CROSS + IMPULSO; AGREGADO = grupos; HOJAS = suma de
las hojas elegidas. Es el mismo cálculo que `resumen.conteos` del listado.

## Celdas

Mismo texto en la tabla del front y en el Excel:

| Clave | Texto |
|---|---|
| `producto` | `nombre · marca` (sin marca, solo nombre) |
| `tienda` | `codigo · nombre` |
| `version` | `codigoVersion · planogramaNombre` |
| `estadoVersion` | `Publicada` / `Piloto` |
| `seccion`, `nivel`, `orden` | Valores de las ubicaciones unidos con `, ` |
| `gondola` | Nombres distintos de las ubicaciones unidos con `, ` |
| `ganchos` | Todos los ganchos; número con 2 dígitos, exhibición tal cual (`05, 54E`) |
| `accesorio` | `codigo (tamaño")` unidos con `, ` |
| `montaje` | Accesorios + `Colgante externo`, `Display`, `Desborda la góndola[: nota]`, unidos con `, ` |
| `modo` | `Planograma` / `Cross` / `Impulso` |
| `decision` | `Activo` / `Inactivo` |
| `sustituto` | `skuSustituto · nombreSustituto` o vacío |
| Numéricas | Número si `Number.isFinite`; `null` → vacío; varía → texto `Varía` |

Seguridad del libro (`infrastructure/exportacion/libroXlsx.js`): toda celda de texto es `type: String`
(nunca fórmula, así `=HYPERLINK(…)`, `+1`, `@SUM(A1)` quedan como texto); se quitan los caracteres de
control `[\x00-\x08\x0B\x0C\x0E-\x1F]` y se trunca a 32 767 caracteres; encabezados solo de la lista
blanca y nombres de hoja fijos.

---

## Response — 200 OK

Cuerpo binario, con:

| Cabecera | Valor |
|---|---|
| `Content-Type` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `Content-Disposition` | `attachment; filename="consolidado-tiendas-{detallado\|minmax\|hojas}-AAAAMMDD.xlsx"` (fecha del servidor) |
| `Cache-Control` | `no-store` |
| `Content-Length` | Tamaño del buffer |

El front arma el mismo nombre por su cuenta (`nombreArchivo`); `Content-Disposition` no se expone en CORS.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Query inválida, parámetro prohibido o repetido, `hojas` faltante/sobrante, columnas inválidas (`details.columnasInvalidas`). No gasta cupo. |
| `401` | — | JWT ausente o inválido. |
| `403` | `FORBIDDEN` | El usuario no cumple la regla A. |
| `422` | `EXPORTACION_DEMASIADO_GRANDE` | Las filas superan `CONSOLIDADO_EXPORTACION_MAX_FILAS` (def. 100 000, máx. 200 000). `details: { filas, maximo }`. Se contesta antes de construir celdas. |
| `429` | `RATE_LIMITED` | Más de 5 descargas por minuto del mismo usuario (`Demasiadas descargas, espera un minuto e inténtalo de nuevo`). |
| `503` | `SERVICE_UNAVAILABLE` | Con filtro de jerarquía y CATI caído. |
| `503` | `EXPORTACION_EN_CURSO` | Otra descarga en curso en el proceso (semáforo de 1). Mensaje `Hay otra descarga en curso. Inténtalo en unos segundos.` |
| `500` | `INTERNAL_ERROR` | Falló la generación del libro. JSON sin stack, sin cabeceras de xlsx. |

---

## Logs

`[consolidado] exportacion numeroEmpleado=… formato=… hojas=… filas=… ms=…`. Nunca el token ni valores
de la query.
