# Contrato: Importar productos del Excel a "Por ubicar"

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{id}/importar-productos`  
**Actor:** Analista  

---

## Descripción

Importa el listado de productos del Excel de un planograma (una fila por SKU) a la góndola
**"Por ubicar"** de la versión: una posición por SKU con todos sus datos de montaje. El analista
después arrastra cada producto a su lugar real en el lienzo (o lo ubica el PDF del layout).

El front lee el Excel (`front/src/utils/excelProductosPlanograma.ts`), valida cada celda y manda las
filas ya interpretadas **solo si todo el archivo es correcto** (todo o nada): con un error de celda o con
un accesorio fuera del catálogo muestra fila, columna y motivo y no envía nada. El back respalda lo mismo
(`400`/`422` antes de escribir). Además, la jerarquía, marca, modelo (se lee de CATI), temporada, fecha, SKU que sustituye,
justificación y código de planograma no se importan.

---

## Request

```json
{
  "productos": [{
    "sku": "125041",
    "descripcion": "PEGA INSTAN LOCTITE 3G ORIGINAL",
    "ganchos": [4, 9, "14E", 19],
    "facings_horizontal": 4,
    "unidades_por_facing": 20,
    "cantidad_apilable": 1,
    "min_estetico": 13,
    "capacidad_maxima": 80,
    "min_final": 65,
    "max_final": 80,
    "perfil_redondeo": "MRP",
    "modo": "PLANOGRAMA",
    "decision": "ACTIVO",
    "accesorios": [
      { "codigo": "R45-12-212P2", "tamano_pulgadas": 12 },
      { "codigo": "R45-12-212P2", "tamano_pulgadas": 12 }
    ],
    "observaciones": null
  }]
}
```

| Columna del Excel | Campo |
|-------------------|-------|
| `SKU` | `sku` (requerido) |
| `Descripcion` | `descripcion` (solo para nombrar el espacio si el SKU no existe) |
| `TG1`…`TG10` | `ganchos` (arreglo mixto: número = gancho normal `54`; texto `"54E"` = gancho de exhibición; sin repetir, máx. 100) |
| `Facings_TG` | `facings_horizontal` (requerido, ≥ 1; si el Excel lo trae vacío, el front usa la cantidad de ganchos **normales**: los `E` no cuentan) |
| `Cantidad_X_facing_TG` | `unidades_por_facing` |
| `Cantidad_facing_vertical_TG` | `cantidad_apilable` |
| `Min_estetico_TG`, `Capacidad_maxima_TG` | `min_estetico`, `capacidad_maxima` (si falta: facings × unidades × apilable) |
| `Min_final_TG`, `Max_final_TG` | `min_final`, `max_final` |
| `Perfil_redondeo_TG` | `perfil_redondeo` (`MRP`/`ZSRE`) |
| `Modo` | `modo` (`PLANOGRAMA`/`CROSS`/`IMPULSO`) |
| `Decision_Final_TG` | `decision` (`ACTIVO`/`INACTIVO`) |
| `Nombre_accesorio_TG`, `Tamano_accesorio_TG` | `accesorios[]` = `{ codigo, tamano_pulgadas }` (ver "Varios accesorios") |
| `Observaciones_TG` | `observaciones` |

Máximo 1000 productos por request; `accesorios` hasta 10 por producto y hasta **200 códigos de accesorio
distintos** por request.

| Campo | Regla |
|-------|-------|
| `ganchos` | Arreglo de hasta 100, sin repetir. Cada ítem se normaliza con una sola regla (`normalizarGancho`): entero 1..999999 (`54`, `"54"` → `54`) o `"<n>E"` (`"54e"`, `"054E"` → `"54E"`). `"5E1"`, `"54E2"`, `"54A"`, `"+54"`, `"54.0"`, `0`, `true`, `null` → `400`. |
| `accesorios[].codigo` | Texto 1..50 (se recorta). |
| `accesorios[].tamano_pulgadas` | `0 < t ≤ 999`, 2 decimales, o `null`. |
| `accesorio_codigo`, `tamano_accesorio_pulgadas` (**legado**) | Se aceptan solo si `accesorios` viene vacío (equivale a una lista de 1). Mandar ambos formatos → `400`. Un tamaño legado sin código se ignora. |
| `accesorio_id`, `orden` | No se aceptan: los calcula el servidor (`orden` 1..k según la celda). |

### Varios accesorios (`//`)

En el Excel, `//` (con espacios opcionales) separa accesorios en `Nombre_accesorio_*` y
`Tamano_accesorio_*`; un `/` simple no separa. Con n nombres y m tamaños: n=0 → sin accesorios (el
tamaño se ignora); n=1, m=0 → 1 sin tamaño; n=1, m≥2 → m accesorios iguales, cada uno con su tamaño
(`A` + `22" // 22"` → 2 × A de 22); n≥2, m=0 → todos sin tamaño; n≥2, m=1 → todos con ese tamaño; n≥2,
m=n → emparejados por posición; n≥2, m≥2, m≠n → **error** (el front lo bloquea). Más de 10 accesorios
en un producto o un tamaño fuera de 1..999 también bloquean.

---

## Reglas de negocio

1. La versión debe estar en un estado editable (`borrador`, `en_desarrollo`, `piloto`).
2. Se omiten (y se informan en `omitidos`) los SKU repetidos en el mismo archivo y los que ya
   tienen una posición en la versión. Reimportar el mismo Excel no duplica nada.
3. La góndola "Por ubicar" (`Gondola.por_ubicar = 1`, una por versión) se crea si no existe, al
   final de la versión. Sus niveles son de relleno: **10 posiciones por nivel**, en orden de primer
   gancho (las filas sin ganchos al final). Se completan los niveles con lugar y se crean los que
   falten; medidas de la góndola y alturas de los niveles se recalculan.
4. Cada SKU se garantiza en el catálogo local (nutriéndolo desde CATI). Si no existe, el producto
   queda como espacio **PENDIENTE** con `nombre_detectado = "SKU x · descripción"` (y sus ganchos)
   y una advertencia. No bloquea.
5. Cada `accesorios[].codigo` se busca en el catálogo sin distinguir mayúsculas ni espacios repetidos
   (`normalizarCodigo`). Los códigos de **todos** los productos del request se resuelven antes de leer
   SKUs o escribir; si falta alguno, **no se importa nada** (`422`, `details.codigos`). Ya no existe
   "importar sin accesorio": hay que darlo de alta (`POST /accesorios`) o corregir el archivo. El
   front lo detecta antes de enviar y muestra la fila y la columna `Nombre_accesorio_*`.
6. Ancho de cada posición: ancho del producto × facings, o 20 cm × facings si no tiene ancho.
7. Los `ganchos` se guardan en `Posicion.ganchos` tal cual (forma canónica: `54` normal, `"54E"`
   exhibición; son distintos) y mandan sobre la numeración calculada (ver `GET /versiones/{id}/skus`).
   Un gancho `"54E"` no reserva el número 54 de la numeración calculada. Las posiciones de "Por
   ubicar" sin ganchos no reciben número.
8. Todo en una transacción. Las filas de `PosicionAccesorio` se insertan en un solo `insert`
   multi-fila. Orden de las validaciones: versión editable → tope de 200 códigos → resolución de
   accesorios (`422`) → recién después lectura de SKUs y escritura.

### Validación del Excel en el front (todo o nada)

Enteros estrictos (facings, cantidad por facing, cantidad vertical, mín. estético, capacidad, mín./máx.
final): dos números, texto, negativos o decimales bloquean. Facings > 100 bloquea. Ganchos: tokens
numéricos o numéricos con `E` (`54 E` se une a `54E`); cualquier otra letra o un decimal bloquea;
`0`/`0E` se ignoran. Con `Facings_*` vacío y solo ganchos `E` → error en Facings. Se **omiten** (no son
error) filas vacías, filas sin SKU y filas sin facings ni ganchos. Los errores se muestran por fila y
columna en el modal y el botón Importar queda deshabilitado.

---

## Response — 201 Created

```json
{
  "gondola": { "id": 815, "creada": true, "totalNiveles": 2 },
  "totalImportados": 13,
  "omitidos": [{ "sku": "961693", "motivo": "Ya está en la versión" }],
  "advertencias": ["El SKU 1234567 no existe en el catálogo; quedó como espacio pendiente."]
}
```

`gondola` es `null` si no se importó ningún producto.

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `id` no es un entero positivo, `productos` vacío, una fila sin `sku` o `facings_horizontal`, ganchos repetidos o inválidos, más de 10 accesorios, `tamano_pulgadas` fuera de rango, mezcla de `accesorios` con `accesorio_codigo` (`details: string[]` de Joi con la ruta, ej. `productos[42].accesorios[0].tamano_pulgadas`), o más de 200 códigos de accesorio distintos (`El archivo trae {n} códigos de accesorio distintos; el máximo por importación es 200.`). |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La versión no existe. |
| `422` | `UNPROCESSABLE` | La versión no es editable (sin `details`). |
| `422` | `UNPROCESSABLE` | Hay accesorios que no existen en el catálogo: `Hay {n} accesorio(s) que no existen en el catálogo: {lista}. Dalos de alta o corrige el archivo y vuelve a cargarlo.` con `details: { codigos: string[] }` (códigos normalizados; `lista` = primeros 20). No se escribe nada. Para distinguirlo del 422 de versión, usar `Array.isArray(details?.codigos)`. |
