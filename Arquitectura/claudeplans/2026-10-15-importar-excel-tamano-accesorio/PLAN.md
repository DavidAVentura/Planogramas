# PLAN — Importar Excel de productos: varios accesorios (`//`), errores bloqueantes y ganchos de exhibición

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Revisión 2 (2026-10-15): incorpora los cambios pedidos en la aprobación 1 (`00_solicitud.md`):
> accesorio fuera del catálogo bloqueante, enteros estrictos y ganchos de exhibición `54E`.
> Detalle del análisis de ganchos en `01_arquitectura.md` §12.
> Revisión 3 (2026-10-15): respuestas P-E1, P-E2 y P-E3 (`00_solicitud.md`) y controles R2-1 a R2-8 de
> `02_seguridad.md` ("Revisión 2"). Sin preguntas abiertas.

## Objetivo

Al importar el Excel de productos a "Por ubicar":
1. El separador `//` en `Nombre_accesorio_*` / `Tamano_accesorio_*` se interpreta como **varios
   accesorios en el mismo producto** (hoy concatena `22" // 22"` → 2222 y el back rechaza el lote).
2. Cualquier celda mal formada o fuera de rango, y cualquier accesorio que siga sin existir en el
   catálogo al pulsar Importar, se muestra con fila, columna, motivo y cómo resolverlo, y **no se
   importa nada**. El back respalda el "todo o nada" (`400`/`422` antes de escribir).
3. Los ganchos de exhibición (`54E`) se guardan y muestran **tal cual**, distintos del gancho `54`, en
   la importación, el lienzo, la vista de SKU, la consulta del implementador, el cruce con "Por ubicar"
   y la edición de la posición.

## Decisiones

| Decisión | Razón |
|---|---|
| `//` (con espacios opcionales, regex `/\s*\/\/\s*/`) separa accesorios; `/` simple no separa. Segmentos vacíos se descartan. | Aclaración del usuario; `/` puede ser parte de un código. |
| Reglas nombre × tamaño (n nombres, m tamaños): n=0 → sin accesorios (el tamaño se ignora, sin validarlo); n=1,m=0 → `[A sin tamaño]`; n=1,m=1 → `[A t]`; n=1,m≥2 → m × A con su tamaño; n≥2,m=0 → todos sin tamaño; n≥2,m=1 → todos con ese tamaño; n≥2,m=n → emparejados por posición; n≥2,m≥2,m≠n → **error bloqueante**. | Reglas 1-5 de la solicitud + respuesta P1 del usuario. |
| Tamaño fuera de rango (≤ 0 o > 999), sin número o mal formado → **error bloqueante**. Más de 10 accesorios → **error bloqueante**, no se trunca. | Respuestas P1/P2; control de seguridad 1. |
| Facings, cantidad por facing, cantidad vertical, mín. estético, capacidad, mín./máx. final son **enteros estrictos**: dos números, texto, negativos o decimales → **error bloqueante**. | Decisión 2 del usuario en la aprobación 1. |
| **Accesorio que no existe en el catálogo**: la vista previa mantiene el aviso con "Dar de alta". Si al pulsar Importar sigue faltando alguno, el front **no envía** y muestra la vista de errores (una fila por fila del Excel y código). El back resuelve los códigos de **todos** los productos del request antes de cualquier lectura de SKUs o escritura y, si falta alguno, responde `422 UNPROCESSABLE` con `details.codigos`. Ya no existe "importar sin accesorio". | Decisión 1 del usuario en la aprobación 1. 422 porque el request es válido en forma pero referencia entidades inexistentes (convención de `CLAUDE.md`). Se validan todos los productos (no solo los que se importan) para que front y back bloqueen exactamente lo mismo. |
| **Gancho canónico**: arreglo JSON mixto en `Posicion.ganchos`; gancho normal = número (`54`), de exhibición = texto `"<n>E"` (`"54E"`, mayúscula, sin ceros a la izquierda). Ej. `[65, "54E"]`. Rango numérico 1..999999. | Retrocompatible con los datos existentes (todos números), sin migración; la igualdad estricta (`Set`/`Map`/Joi `unique`) ya distingue `54` de `"54E"`. Ver `01_arquitectura.md` §12.2. |
| Toda entrada de ganchos se normaliza con **una sola regla**: `normalizarGancho` (T11). El Joi común es `Joi.any().custom(normalizarGancho)` (sin `Joi.number()` ni `pattern`); el front usa `leerGancho` con la misma semántica. Toda lectura de BD pasa por `parsearGanchosJson`; es el único `JSON.parse` de ganchos en `back/src`. Prohibido `.map(Number)`, `Math.min(...ganchos)` y `sort((a, b) => a - b)` sobre ganchos. | R2-1: `Joi.number()` convertía `"5E1"` → 50 y `"54E2"` → 5400 en silencio. R2-3 y R2-7. |
| Código de accesorio en el front: un único helper `normalizarCodigoAccesorio` (`trim()`, `replace(/\s+/g, ' ')`, `toUpperCase()`), idéntico a `normalizarCodigo` del back, usado en el lector, en `OrigenAccesorio`, en el conjunto del catálogo y en `faltantes`. Se borra la `normalizar` local del modal. | R2-2: con solo `trim().toUpperCase()` un doble espacio bloqueaba en el front lo que el back acepta. |
| En el modal, el 422 de accesorio inexistente se reconoce por `Array.isArray(err.details?.codigos)`, no por el status (el 422 de versión no editable comparte `code`). | R2-5. |
| Numeración calculada (`recorrerVersion`): solo los ganchos **numéricos** guardados se reservan; un `54E` no impide que otra posición reciba el 54 calculado. | El usuario: `54E` es distinto de `54`. |
| Orden de ganchos: por número; a igual número, el normal antes que el de exhibición. | Orden estable y legible (`54, 54E, 65`). |
| Cruce con "Por ubicar": un espacio del PDF con gancho 54 **no** toma un producto con `54E`. El extractor de PDF sigue devolviendo solo enteros (sin cambios); los `54E` quedan en "Por ubicar" con la advertencia existente y se arrastran a mano. | P-E1: el PDF sí imprime `54E`, pero el alcance pedido es el Excel y los accesorios `//`; el extractor se registra como deuda DT-27 (Media) para un plan aparte. |
| Celda de gancho en el Excel: tokens separados por cualquier carácter que no sea dígito ni letra (`,` `|` `/` `-` espacio, como hoy); `54 E` se une a `54E`; cada token debe ser `\d+` o `\d+E` (sin distinguir mayúsculas); `0`/`0E` se ignoran como hoy; cualquier otro token (ej. `54A`, `E`) o un número decimal/negativo → **error bloqueante**. | Decisión 2 del usuario; P-E3: solo la letra `E` es válida, cualquier otra letra bloquea. |
| **Facings implícitos**: si `Facings_*` viene vacío, facings = cantidad de ganchos **normales** de la fila; los `E` no cuentan. Si viene vacío y la fila solo tiene ganchos `E` → **error bloqueante** en la columna Facings (no se omite: el producto sí está en el planograma y el back exige facings ≥ 1). | P-E2 ("no cuenta"). Error y no omisión para no perder en silencio un producto de exhibición. |
| Siguen **omitiéndose** (no son error): filas vacías, filas sin SKU y filas sin facings (vacío o 0 y sin ganchos). `filasConError` → `filasOmitidas`. | No son errores de formato. |
| P3: un producto repartido en varios espacios del PDF lleva la lista completa de accesorios en cada espacio. Sin cambios de código (`cruzarConPorUbicar`). | Respuesta P3. |
| El request lleva `accesorios: [{ codigo, tamano_pulgadas }]`; los campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` se aceptan **solo si `accesorios` viene vacío**; mandar ambos → `400`. | Front y back se despliegan por separado; mezclar formatos sería ambiguo. |
| `accesorio_id` y `orden` los calcula el servidor; Joi `stripUnknown` con `Joi.object` explícito elimina claves coladas. | Control S3. |
| Tope de **200 códigos de accesorio distintos** por request (`400`). | Control S7; la consulta en lote queda como deuda. |
| Esquemas Joi de importación en `back/src/application/importacion/importacion.schemas.js`; esquema común de ganchos en `back/src/application/compartido/ganchos.schema.js`. Ninguno importa repositorios. | Probarlos con `node:test`; reutilizar `schemaGanchos` en importación y posiciones. |
| Helpers de gancho: back `back/src/domain/compartido/gancho.js`, front `front/src/domain/ganchos/gancho.ts` (+ tipo en `front/src/types/gancho.ts`). Las cuatro funciones `dos()` locales del lienzo se reemplazan por `textoGancho`. | Una sola regla de formato/orden por lado; elimina duplicación. |
| El toast de 400 con `details` se resuelve **solo en el modal**; `mensajeDeError` global no se toca. | Alcance M; el global queda como deuda. |
| Con errores, `interpretarHojaProductos` devuelve `productos: []`; el payload nunca se arma. | Control S8. |
| Una sola vista por estado en el mismo `Modal`; con errores no se muestra la tabla de vista previa. | `02_ux.md` §1. |
| Los 3 textos en voseo del modal pasan a tuteo; el `.css` del modal se migra a tokens y sale de la lista legacy de stylelint. | `02_ux.md` §9; `DISENO_SISTEMA` §2. |

## Fuera de alcance

- Permisos/CAO: no se modifica `matrizPermisos.test.js`, middlewares ni guards.
- Extractor de PDF e imagen numerada con ganchos de exhibición (P-E1: el PDF sí los imprime; plan aparte, DT-27).
- Unicidad de ganchos entre posiciones de la misma versión (preexistente; DT-30).
- Componente base `ui/Aviso`, botón "Copiar/Descargar errores", tokens de escala tipográfica (`02_ux.md` §8).
- Cambiar `mensajeDeError` global para mostrar `details`.
- Consulta en lote `buscarPorCodigos`; mover `skusDeVersion`/estado dentro de la transacción.
- Retirar los campos legado; auditoría de quién importó; índice en `PosicionAccesorio.posicion_id`.
- Repartir accesorios entre espacios del PDF; validar perfil/modo/decisión inválidos (siguen como `null`).
- Script de reversión de `"54E"` → `54` (solo si hubiera que revertir; ver Riesgos).

## Contratos

### `POST /api/v1/versiones/{id}/importar-productos` (modificado)

Permiso: sin cambios. Request por producto:

```json
{
  "productos": [{
    "sku": "1111754",
    "ganchos": [65, "54E"],
    "facings_horizontal": 2,
    "accesorios": [
      { "codigo": "VDA-22R-PTH", "tamano_pulgadas": 22 },
      { "codigo": "VDA-22R-PTH", "tamano_pulgadas": 22 }
    ]
  }]
}
```

| Campo | Regla Joi exacta |
|---|---|
| `ganchos` | `schemaGanchos.default([])` (ver "Esquema común de ganchos") |
| `accesorios` | `Joi.array().items(Joi.object({ codigo: Joi.string().trim().min(1).max(50).required(), tamano_pulgadas: Joi.number().positive().max(999).precision(2).allow(null).default(null) })).max(10).default([])` |
| `accesorio_codigo` (legado) | sin cambios: `Joi.string().trim().max(50).allow(null, '').default(null)` |
| `tamano_accesorio_pulgadas` (legado) | sin cambios: `Joi.number().positive().max(999).allow(null).default(null)` |
| producto | `.custom` de objeto: si `accesorios.length > 0` **y** `accesorio_codigo` no vacío → error `producto.accesoriosMixtos`, mensaje `"accesorios" y "accesorio_codigo" no se pueden enviar juntos` |

Response `201` sin cambios de forma: `{ gondola, totalImportados, omitidos, advertencias }`. Ya no
hay advertencia de accesorio inexistente (ahora es 422). `advertencias` sigue con "SKU no existe".

Errores (`{ error: { code, message, details? } }`), todos antes de cualquier escritura:
- `400 VALIDATION_ERROR` `Datos de entrada inválidos`, `details: string[]` (Joi): `accesorios` > 10, `codigo` vacío/> 50, `tamano_pulgadas` ≤ 0/> 999/no numérico, mezcla legado + nuevo, gancho inválido o repetido.
- `400 VALIDATION_ERROR` `El archivo trae {n} códigos de accesorio distintos; el máximo por importación es 200.`
- `422 UNPROCESSABLE` `Hay {n} accesorio(s) que no existen en el catálogo: {lista}. Dalos de alta o corrige el archivo y vuelve a cargarlo.` con `details: { codigos: string[] }` (`lista` = primeros 20 códigos normalizados separados por `, ` y `…` si hay más; `codigos` = todos).
- `401`, `403`, `404 NOT_FOUND`, `422 UNPROCESSABLE` (versión no editable): sin cambios.

### Esquema común de ganchos (afecta 4 contratos)

`back/src/application/compartido/ganchos.schema.js`:

```js
const Joi = require('joi');
const { normalizarGancho } = require('../../domain/compartido/gancho');

// Única regla de gancho (R2-1): la misma función que normaliza las lecturas de BD.
const schemaGancho = Joi.any().custom((valor, helpers) => {
  const gancho = normalizarGancho(valor);
  return gancho === null ? helpers.error('any.invalid') : gancho;
}).messages({ 'any.invalid': '{{#label}} debe ser un número de gancho entero (1-999999) o de exhibición como 54E' });

const schemaGanchos = Joi.array().items(schemaGancho).max(100).unique();
module.exports = { schemaGanchos };
```

Prohibido agregar `Joi.number()`, `Joi.alternatives()` o `pattern` a este esquema: convierten `"5E1"`,
`"1e2"`, `"+54"` o `"54.0"` en números en silencio. `unique()` se aplica sobre los valores ya convertidos.

Se usa en: `importar-productos` (`schemaGanchos.default([])`), `importar-layout` `schemaPosicion`
(`schemaGanchos.default([])`), `POST` de posiciones y `PATCH /posiciones/:id`
(`schemaGanchos.allow(null).optional()`). `"54"` llega como `54`; `"54e"` y `"054E"` como `"54E"`;
`[54, "54"]` y `["54E", "54e"]` son repetidos; `[54, "54E"]` es válido; `"5E1"`, `"1e2"`, `"54E2"`, `"+54"`,
`"54.0"`, `true` y `null` como ítem → `400`.

Lecturas que devuelven ganchos (forma `(number|string)[]`, sin otros cambios): `GET /versiones/:id/skus`
(`skus[].ganchos`, `skus[].ubicaciones[].ganchos`, `ganchosPorPosicion`), productos de implementación
(`data[].ganchos`), lecturas de posición (`ganchos`).

### Tipos TS del front

`front/src/types/gancho.ts`:
```ts
/** Número de gancho: número = gancho normal (54); texto "<n>E" = gancho de exhibición ("54E"). */
export type Gancho = number | string;
```

`front/src/types/importacionProductos.ts`:
```ts
export interface AccesorioExcel {
  codigo: string;                 // normalizarCodigoAccesorio (trim, espacios colapsados, mayúsculas)
  tamano_pulgadas: number | null; // 0 < t ≤ 999, 2 decimales
}
// ProductoExcel: ganchos: Gancho[]; se quitan accesorio_codigo y tamano_accesorio_pulgadas;
//   se agrega accesorios: AccesorioExcel[];
```

`LecturaExcelProductos` (en `excelProductosPlanograma.ts`):
```ts
export interface ErrorLectura {
  fila: number;      // fila de Excel (1-based, como hoy numeroFila)
  columna: string;   // encabezado tal como viene en el archivo, ej. "Tamano_accesorio_TG"
  letra: string;     // letra de la columna, ej. "AB"
  motivo: string;
  esperado: string;
}
export interface OrigenAccesorio {
  fila: number; columna: string; letra: string; // de la celda Nombre_accesorio_*
  codigo: string;                               // normalizarCodigoAccesorio
}
export interface LecturaExcelProductos {
  productos: ProductoExcel[];            // [] si errores.length > 0
  planogramas: string[];
  columnasFaltantes: string[];
  errores: ErrorLectura[];               // bloqueantes; ordenados por fila y luego por índice de columna
  filasOmitidas: { fila: number; motivo: string }[]; // antes filasConError
  origenesAccesorio: OrigenAccesorio[];  // una por (fila, código distinto) de productos sin errores
}
```

Se cambia `number[]` → `Gancho[]` en: `types/posicion.ts` (l. 51 y 125), `types/skuVersion.ts`
(l. 12, 32 y `ganchosPorPosicion: Record<string, Gancho[]>` l. 40), `types/implementacion.ts` (l. 93),
`types/extractorPdfPlanograma.ts` solo `ProductoPorUbicar.ganchos` (l. 146). `EspacioPdf` y la
posición del layout (l. 24 y 101) siguen `number[]` (el extractor solo produce enteros).
`types/extractorImagenNumerada.ts` no cambia.

## Datos

Sin migración. `Posicion.ganchos` ya es `NVARCHAR(MAX)` con JSON (013) y admite `[65,"54E"]`; los datos
existentes son todos números (forma canónica). `PosicionAccesorio` ya admite varias filas por
posición con `orden` y `tamano_pulgadas DECIMAL(6,2)` (001, 013). El lote de la versión 103 no se
guardó (el 400 cortó antes): basta reimportar. T10 actualiza el comentario de `Posicion.ganchos` en
`Arquitectura/MODELO_DATOS_V3.mmd`. La tabla de migraciones de `CLAUDE.md` no cambia.

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| S1 | El back es la barrera del todo o nada: cualquier valor fuera de contrato en cualquier producto → `400` del lote antes de la transacción; cualquier accesorio inexistente → `422` antes de `skusDeVersion`. Prohibido `failover`, `.empty()` sobre numéricos, truncar con `slice`, filtrar filas inválidas u omitir accesorios en el dominio. | `importacion.schemas.js`, `importacion.usecases.js` | T4: `productos[42].accesorios[0].tamano_pulgadas = 2222` → `details[].path` `['productos', 42, 'accesorios', 0, 'tamano_pulgadas']`. T2: con un código inexistente o el tope excedido, `skusDeVersion` e `importarPorUbicar` no se llaman. |
| S2 | Ítem de accesorio con `Joi.object` explícito y límites exactos. | `importacion.schemas.js` | T4 (casos de Contratos). |
| S3 | `accesorio_id` sale solo de `accesorioRepo.buscarPorCodigo`; `orden` = 1..k en el orden de la celda. | `importacion.usecases.js`, `importacion.entity.js` | T2: `[A, B, A]` → `orden` 1, 2, 3 con los ids de A, B, A. |
| S4 | Todas las filas de `PosicionAccesorio` con `trx` en un solo `insert`; firma desestructura `accesorios`; lista vacía no ejecuta `insert`. | `importacion.repository.js` | Revisión del diff + Postman. |
| S5 | Legado sin ambigüedad: mezcla → 400; solo legado → lista de 1; tamaño legado sin código → se ignora. | `importacion.schemas.js`, `accesoriosDeFila` | T1 y T4. |
| S6 | `normalizarCodigo` en la clave del `Map`, en la búsqueda y en `details.codigos`. | `importacion.usecases.js` | T2. |
| S7 | Tope de 200 códigos distintos por request. | `importacion.usecases.js` | T2. |
| S8 | El front no envía con errores ni con accesorios fuera del catálogo: botón deshabilitado con errores, `importar()` sale si hay errores o faltantes, `productos: []` con errores, botón deshabilitado en vuelo. El front no convierte inválidos en `null`. | `excelProductosPlanograma.ts`, modal | T7 y T8. |
| S10 | Mensajes del back, `details` y ganchos se renderizan solo como texto JSX (sin `dangerouslySetInnerHTML`); la respuesta 201 no gana campos; el `errorHandler` no expone SQL. | modal, lienzo, back | Revisión del diff. |
| S11 | Ganchos: forma canónica obligatoria en toda entrada (`schemaGanchos` = `Joi.any().custom(normalizarGancho)` en los 4 esquemas, R2-1) y lectura de BD tolerante (`parsearGanchosJson` descarta valores no canónicos en vez de devolver `NaN` o texto arbitrario). Cadena máxima por gancho: 7 caracteres. | `ganchos.schema.js`, `gancho.js`, 3 repositorios | T11 y T12; grep de `JSON.parse` (Verificación final). |
| S12 | Orden en `importarProductos` (R2-4): `validarVersionEditable` → tope de 200 (`400`) → resolución de **todas** las claves → `422` → recién después `skusDeVersion`/`importarPorUbicar`. | `importacion.usecases.js` | T2 con contadores. |
| S13 | Antes de publicar, consulta SQL de solo lectura de ganchos no canónicos en DEV y PROD = 0 filas (R2-3); si hay filas, no se publica. Resultado anotado en `06_revision_seguridad.md`. | BD DEV y PROD | Verificación final. |
| S14 | Un solo normalizador de código de accesorio en el front, igual al del back (R2-2). | `front/src/domain/accesorios/codigoAccesorio.ts` | T16 y T7. |
| S15 | Los 422 se distinguen por `details.codigos` (R2-5). La carrera "accesorio eliminado entre la verificación y el `insert`" termina en rollback y `500` (R2-6): no se quita la FK ni se captura el error para seguir sin accesorio. | modal, `importacion.repository.js` | Revisión del diff; Postman T9 caso 7. |

## UX (resumen para implementar)

Archivo: `front/src/components/dominio/modales/ImportarExcelProductosModal/ImportarExcelProductosModal.tsx` (+ `.css`).
Componentes base: `Modal` (`ancho="xl"`), `Button`, `Table`. Sin componentes nuevos.

**Flujo**: paso 1 (sin cambios) → "Leer archivo" → si `columnasFaltantes` → toast (sin cambios);
si `errores.length > 0` → **vista de errores (origen: archivo)**; si `productos.length === 0` → toast
`El archivo no tiene productos para importar`; si no → **vista previa**. En la vista previa, al pulsar
Importar: si hay accesorios fuera del catálogo → **vista de errores (origen: catálogo)**, sin petición;
si no → petición.

**Vista de errores** (`Modal ancho="xl"`), común a los dos orígenes:
- Título: `Errores del archivo · {archivo.name}`.
- Bloque `.importar-excel__bloqueo` con `id="importar-excel-bloqueo"`, `role="alert"`, `tabIndex={-1}` y foco al montar (`ref` + `useEffect`):
  - `<strong>No se importó nada</strong>`
  - Origen archivo: `Encontramos {n} error(es) en {m} fila(s). Para importar, todas las filas del archivo deben estar correctas. Corrige el archivo en Excel, cárgalo de nuevo y luego importa.`
  - Origen catálogo: `{k} accesorio(s) del archivo no existen en el catálogo ({m} fila(s)). Dalos de alta desde la vista previa o corrige el nombre en el archivo y cárgalo de nuevo.` (`k` = códigos distintos).
- `Table<ErrorLectura>` en `.importar-excel__tabla`, `rowKey={(e) => \`${e.fila}-${e.letra}-${e.motivo}\`}`, primeros 100 errores:
  | key | header | render | alinear |
  |---|---|---|---|
  | `fila` | `Fila` | `<span className="mono">{e.fila}</span>` | right |
  | `columna` | `Columna` | `` `${e.columna} (${e.letra})` `` | left |
  | `motivo` | `Motivo` | `<span className="importar-excel__motivo">` | left |
  | `esperado` | `Cómo debe venir` | `<span className="importar-excel__esperado">` | left |
- Más de 100: `<p className="importar-excel__ayuda">Se muestran los primeros 100 de {N} errores. Corrige estos y vuelve a cargar el archivo para ver el resto.</p>`
- Nota de omitidas al pie (si hay).
- Footer origen archivo, en orden: `Cancelar` (`outline`, `onClose`) · `Importar a "Por ubicar"` (`outline`, `disabled`, `aria-describedby="importar-excel-bloqueo"`, `title="Corrige los errores del archivo para poder importar"`) · `Cargar otro archivo` (`primary`; `setLectura(null)`, `setArchivo(null)`, `setErroresCatalogo(null)`).
- Footer origen catálogo, en orden: `Cancelar` (`outline`) · `Cargar otro archivo` (`outline`, mismo handler) · `Volver a la vista previa` (`primary`; `setErroresCatalogo(null)`), para poder pulsar "Dar de alta".

**Vista previa** (sin errores): bloques en orden: ayuda → faltantes → nota de omitidas → tabla.
- Ayuda (tuteo): `... con todos sus datos; después los arrastras a su lugar en el lienzo. ...`
- Columna "Ganchos": `p.ganchos.length ? textoGanchos(p.ganchos) : '—'` (helper de T14; `54E` se ve como `54E`).
- Columna "Accesorio": `<ul className="importar-excel__accesorios">` con `agruparAccesorios(p.accesorios)`; cada `<li>`: `{cantidad > 1 ? `${cantidad} × ` : ''}<span className="mono">{codigo}</span>{tamano ? ` · ${tamano}"` : ''}`. Máximo 3 grupos; si hay más, `<li aria-label="{n} accesorios más">+{n} más</li>` y `title` del `<ul>` con la lista completa (`\n`). Sin accesorios: `—`.
- Faltantes (`role="note"`, mismo bloque `.importar-excel__faltantes`): `<strong>Accesorios que no están en el catálogo</strong>` y texto nuevo `Dalos de alta antes de importar. Si alguno sigue faltando, no se importará nada.` Un `<li>` por código normalizado distinto con "Dar de alta" (`tipoSugerido(codigo, tamaño del primer accesorio con ese código)`).
- Botón importar: `Importar a "Por ubicar" ({n})`, `disabled={importando || lectura.errores.length > 0}` (habilitado con faltantes: el clic lleva a la vista de errores de catálogo).

**Nota de omitidas** (ambas vistas, solo si `filasOmitidas.length`): `<div className="importar-excel__omitidas">` con `{n} fila(s) se omiten (sin SKU o sin facings); no es un error.` y `<details><summary>Ver filas</summary><ul>` con `Fila {f}: {motivo}`.

**Error del servidor** (el modal no se cierra):
- `ApiError` 400 con `details` arreglo de strings → toast `No se pudo importar: {err.details[0]}. Corrige el archivo y vuelve a cargarlo.`
- `ApiError` con `Array.isArray(err.details?.codigos)` (no se decide por el status) → `recargarAccesorios()` y toast con `err.message` (el catálogo cambió entre la vista previa y el envío).
- `ApiError` 422 sin `details.codigos` (versión no editable) → `mensajeDeError(err, 'No se pudo importar el Excel')`, sin recargar el catálogo.
- Otro → `mensajeDeError(err, 'No se pudo importar el Excel')`.

**Tuteo**: `Verificá` → `Verifica`, `Subí` → `Sube`, `arrastrás` → `arrastras`.

**Textos de error por celda** (`{valor}` = texto literal de la celda):

| Caso | Columna | Motivo | Cómo debe venir |
|---|---|---|---|
| Nombres y tamaños no cuadran | Tamano | `Hay {n} nombres de accesorio ("{nombres}") y {m} tamaños ("{valor}").` | `Usa la misma cantidad separada por //, por ejemplo: nombre "A // B" y tamaño "22" // 12"". Si todos miden igual, escribe un solo tamaño: "22"".` |
| Segmento de tamaño sin dígitos | Tamano | `El tamaño "{valor}" no contiene un número.` | `Un número entre 1 y 999, con o sin comillas: 22 o 22". Para varios accesorios, sepáralos con //: 22" // 12".` |
| Segmento con dígitos mal formado (`22-24`, `22 x 3`) | Tamano | `El tamaño "{valor}" no es un número válido.` | igual que la fila anterior |
| Tamaño ≤ 0 o > 999 | Tamano | `El tamaño {valor} está fuera del rango permitido (1 a 999).` | `Un número entre 1 y 999 pulgadas: 22 o 22".` |
| Más de 10 accesorios | la de más segmentos (Nombre si n ≥ m) | `La celda trae {n} accesorios y el máximo es 10.` | `Hasta 10 accesorios por producto, separados con //. Si repites uno, usa su nombre una vez y un tamaño por cada unidad: "A" y "22" // 22"".` |
| Nombre de accesorio > 50 | Nombre | `El accesorio "{segmento}" tiene {len} caracteres y el máximo es 50.` | `Hasta 50 caracteres por accesorio; separa varios con //.` |
| **Accesorio fuera del catálogo** (al pulsar Importar) | Nombre | `El accesorio "{codigo}" no existe en el catálogo.` | `Dalo de alta con el botón "Dar de alta" de la vista previa, o corrige el nombre en el archivo y vuelve a cargarlo.` |
| Celda numérica con más de un número | la columna | `La celda trae más de un número: "{valor}".` | `Un solo número entero, por ejemplo: 10.` |
| Celda numérica no numérica / negativa / decimal | la columna | `El valor "{valor}" no es un número válido.` | `Un número entero mayor o igual a 0, por ejemplo: 10.` |
| Facings > 100 | la columna | `El valor {valor} está fuera del rango permitido (0 a 100).` | `Un número entero entre 1 y 100, por ejemplo: 4.` |
| Facings vacío y solo ganchos de exhibición | Facings | `Facings está vacío y la fila solo tiene ganchos de exhibición ({ganchos}); esos ganchos no cuentan como facings.` | `Escribe la cantidad de facings, por ejemplo: 2.` |
| **Gancho inválido** (`54A` u otra letra distinta de `E`, `E`, `54.5`, `-3`, > 999999) | la columna TG | `El gancho "{token}" no es válido.` | `Números de gancho enteros separados por coma, \| o espacio; los de exhibición llevan E al final: 54, 65 \| 54E.` |
| SKU > 50 | SKU | `El SKU "{valor}" tiene más de 50 caracteres.` | `El código del SKU, hasta 50 caracteres.` |
| Descripción / Observaciones > 500 | la columna | `El texto tiene {len} caracteres y el máximo es 500.` | `Hasta 500 caracteres.` |

**Ganchos fuera del modal** (T15): se muestran con `textoGancho` (`5` → `05`, `"5E"` → `05E`, `"54E"` → `54E`); `title` del badge del lienzo `Gancho 65, 54E`; un rango continuo solo se arma entre ganchos normales (`04–07`); con algún `E` se listan separados por coma. Sin estilos nuevos.

**Estilo** (`.css`, solo `var(--token)`; tamaños 12/13/14px; espaciado 4/8/12/16px):

| Selector | Estilo |
|---|---|
| `.importar-excel__bloqueo` | `display:flex; flex-direction:column; gap:4px; padding:12px; border-left:3px solid var(--danger); border-radius:var(--radius-md); background:var(--danger-bg); color:var(--fg-2); font-size:13px;` `strong` 14px |
| `.importar-excel__motivo` | 13px, `color: var(--fg-2)` |
| `.importar-excel__esperado` | 13px, `color: var(--fg-3)` |
| `.importar-excel__omitidas` | 12px, `color: var(--fg-3)`, sin borde de color |
| `.importar-excel__accesorios` | `list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; font-size:12px` |
| `.importar-excel__faltantes` | `gap: 8px`; `padding: 12px`; `li`: `padding: 4px 4px 4px 12px`, `background: var(--bg-elevated)` (quita `#fff`) |
| `.importar-excel__advertencias` | se elimina (reemplazado por `__omitidas`) |

## Tareas

Orden de ejecución (de adentro hacia afuera): **T11 → T1 → T2 → T13 → T3 → T12 → T4 → T14 → T16 → T6 → T7 → T15 → T8 → T9 → T10**.

### T11 — Dominio back: helper de ganchos
- **Archivos**: crear `back/src/domain/compartido/gancho.js` · crear `back/test/domain/gancho.test.js`
- **Qué hacer**: exportar, sin dependencias:
  - `normalizarGancho(valor) → number | string | null`: `typeof valor === 'number'`, `Number.isInteger` y 1..999999 → igual; `typeof valor === 'string'` → `trim().toUpperCase()` que cumpla `/^0*([1-9]\d{0,5})(E?)$/` → número (`Number(m[1])`) si no hay `E`, o `` `${Number(m[1])}E` ``; cualquier otro tipo o texto (`true`, `null`, objetos, `'5E1'`, `'+54'`, `'54.0'`) → `null`. Es la única regla de gancho del back (la usa también `schemaGanchos`, T12).
  - `numeroGancho(g) → number` (`typeof g === 'number' ? g : parseInt(g, 10)`).
  - `esGanchoExhibicion(g) → boolean` (`typeof g === 'string'`).
  - `compararGanchos(a, b)`: `numeroGancho(a) - numeroGancho(b)` y, si empatan, el normal primero.
  - `parsearGanchosJson(texto) → Gancho[] | null`: `null`/vacío/JSON inválido/no arreglo → `null`; si no, `map(normalizarGancho)`, descartar `null`, quitar repetidos (`new Set`); `[]` → `null`.
- **Criterios de aceptación**:
  - [ ] `normalizarGancho`: `54`→`54`, `'54'`→`54`, `'054'`→`54`, `'054E'`→`'54E'`, `'54e'`→`'54E'`, `' 54E '`→`'54E'`; `0`, `'0E'`, `-1`, `54.5`, `'54A'`, `'E'`, `'1234567'`, `'5E1'`, `'1e2'`, `'54E2'`, `'+54'`, `'54.0'`, `true`, `null` → `null`.
  - [ ] `parsearGanchosJson('[65,"54E",54]')` → `[65, '54E', 54]`; `'[4,9]'` → `[4, 9]`; `'x'`, `'{}'`, `'[]'`, `null` → `null`.
  - [ ] `[65, '54E', 54, '5E'].sort(compararGanchos)` → `['5E', 54, '54E', 65]`.
- **Pruebas**: `back/test/domain/gancho.test.js` (`node:test`).
- **Depende de**: —

### T1 — Dominio: `accesoriosDeFila` y `posicionDesdeFila` con lista
- **Archivos**: modificar `back/src/domain/importacion/importacion.entity.js` · crear `back/test/domain/importacion.test.js`
- **Qué hacer**:
  - Exportar `accesoriosDeFila(fila) → { codigo, tamano_pulgadas }[]`: si `fila.accesorios?.length` → esa lista; si no, si `fila.accesorio_codigo` no vacío → `[{ codigo: fila.accesorio_codigo, tamano_pulgadas: fila.tamano_accesorio_pulgadas ?? null }]`; si no → `[]`. Nunca combina ambos.
  - `posicionDesdeFila(fila, producto, accesorios)` con `accesorios: { accesorio_id, tamano_pulgadas, orden }[]`; la salida reemplaza `accesorio` por `accesorios` (default `[]`). Actualizar JSDoc.
  - `filtrarProductos`: `primerGancho = (f) => (f.ganchos?.length ? Math.min(...f.ganchos.map(numeroGancho)) : Infinity)` (importar de `../compartido/gancho`).
- **Criterios de aceptación**:
  - [ ] `accesoriosDeFila`: solo lista; solo legado; legado con tamaño sin código → `[]`; nada → `[]`.
  - [ ] `posicionDesdeFila` devuelve `accesorios` con 0, 1 y 2 elementos; no existe la clave `accesorio`; `ganchos: [65, '54E']` pasa tal cual.
  - [ ] `filtrarProductos` con filas de ganchos `['54E']`, `[10]`, `[]` → orden `[10]`, `['54E']`, `[]`.
- **Pruebas**: `back/test/domain/importacion.test.js` (patrón de `back/test/domain/posicion.test.js`).
- **Depende de**: T11

### T2 — Caso de uso `importarProductos`: varios accesorios y accesorio inexistente bloqueante
- **Archivos**: modificar `back/src/domain/importacion/importacion.usecases.js` (función `importarProductos`, l. ~115-157) · ampliar `back/test/domain/importacion.test.js`
- **Qué hacer**, en este orden y antes de `skusDeVersion`:
  1. Tras `validarVersionEditable` (primer paso; orden obligatorio S12): `listas = datos.productos.map(accesoriosDeFila)`; `claves = new Set(listas.flat().map((a) => normalizarCodigo(a.codigo)))`. Si `claves.size > MAX_CODIGOS_ACCESORIO` (constante `200` en el archivo) → `throw errorBadRequest(\`El archivo trae ${claves.size} códigos de accesorio distintos; el máximo por importación es ${MAX_CODIGOS_ACCESORIO}.\`)` (exportar `errorBadRequest` desde `importacion.entity.js` si no lo está).
  2. Resolver **todas** las claves: `Map` clave → accesorio, una llamada secuencial `accesorioRepo.buscarPorCodigo(clave)` por clave. `inexistentes = claves sin accesorio` (en orden de aparición). Si hay → `throw errorUnprocessable(\`Hay ${n} accesorio(s) que no existen en el catálogo: ${lista}. Dalos de alta o corrige el archivo y vuelve a cargarlo.\`, { codigos: inexistentes })` usando `errorUnprocessable` de `importacion.entity.js` (acepta `details`); `lista` = primeros 20 unidos por `, ` + `…` si hay más.
  3. Después: `skusDeVersion`, `filtrarProductos`, `validarProducto` como hoy. Por fila: `accesoriosDeFila(fila).map((a, i) => ({ accesorio_id: mapa.get(normalizarCodigo(a.codigo)).id, tamano_pulgadas: a.tamano_pulgadas ?? null, orden: i + 1 }))` → `posicionDesdeFila`.
  4. Quitar la advertencia de accesorio inexistente y actualizar el JSDoc (“No bloquea por datos faltantes” pasa a: los SKU inexistentes quedan PENDIENTE; los accesorios inexistentes bloquean con 422).
- **Criterios de aceptación**:
  - [ ] `[A, B, A]` → 3 accesorios `orden` 1, 2, 3 con ids de A, B, A; `advertencias` sin texto de accesorio.
  - [ ] Un producto con `X` inexistente (aunque su SKU ya esté en la versión) → error `status 422`, `code 'UNPROCESSABLE'`, `details.codigos` `['X']`; `skusDeVersion` e `importarPorUbicar` no se llaman.
  - [ ] `['vda-22r-pth', 'VDA-22R-PTH ']` en dos productos → 1 llamada a `buscarPorCodigo`.
  - [ ] 201 códigos distintos → `status 400`, `code 'VALIDATION_ERROR'`; 0 llamadas a `buscarPorCodigo`, `skusDeVersion` e `importarPorUbicar`.
  - [ ] Versión `publicado` + código inexistente → el 422 de versión no editable (sin `details.codigos`); 0 llamadas a `buscarPorCodigo`.
  - [ ] Legado (`accesorio_codigo: 'A'`, `tamano_accesorio_pulgadas: 22`) → 1 accesorio con 22 y `orden 1`.
- **Pruebas**: repos falsos (`versionRepo.buscarPorId` → `{ estado: 'borrador' }`, `importacionRepo.skusDeVersion` con contador → `[]`, `importacionRepo.importarPorUbicar` que captura, `accesorioRepo.buscarPorCodigo` con contador, `productoRepo` como lo espera `validarProducto` en el mismo archivo).
- **Depende de**: T1

### T13 — Numeración y lectura de ganchos (back)
- **Archivos**: modificar `back/src/domain/skuVersion/skuVersion.entity.js`, `back/src/infrastructure/repositories/skuVersion.repository.js`, `back/src/infrastructure/repositories/posicion.repository.js`, `back/src/infrastructure/repositories/importacion.repository.js` · crear `back/test/domain/skuVersion.test.js` · ampliar `back/test/domain/importacion.test.js`
- **Qué hacer**:
  - `recorrerVersion` (l. 35): `usados = new Set(posiciones.flatMap((p) => p.ganchos ?? []).filter((g) => typeof g === 'number'))`. Actualizar el comentario de cabecera (excepciones de la migración 013): los ganchos de exhibición (`"54E"`) se usan tal cual y no reservan número.
  - Repositorios: borrar los `parsearGanchos` locales de `skuVersion.repository.js` (l. 14) y `posicion.repository.js` (l. 45) y usar `parsearGanchosJson` de `../../domain/compartido/gancho`; en `importacion.repository.js` `posicionesPorUbicar` (l. 172) `ganchos: parsearGanchosJson(f.ganchos) ?? []`. Actualizar el comentario de `serializarGanchos` (l. 39): arreglo JSON de ganchos canónicos (número o `"<n>E"`). La serialización (`JSON.stringify`) no cambia.
  - `cruzarConPorUbicar`: sin cambios de código; actualizar su JSDoc (los ganchos se comparan en forma canónica; `54` ≠ `"54E"`).
- **Criterios de aceptación**:
  - [ ] `recorrerVersion` con 3 posiciones de 1 facing sin ganchos guardados y una con `['2E']` → las calculadas reciben 1, 2, 3 y la otra `['2E']`; con `[2]` guardado → reciben 1, 3, 4.
  - [ ] `cruzarConPorUbicar` con Por ubicar `{ id: 1, ganchos: [65, '54E'], facings_horizontal: 2, ... }` y un espacio PDF con `ganchos: [65]` → el espacio toma el producto con facings 1; `actualizar` deja `ganchos: ['54E']` y hay advertencia `los ganchos 54E no están en el PDF`. Un espacio con `[54]` no toma ese producto.
  - [ ] Ningún `.map(Number)` sobre ganchos queda en `back/src`, y `JSON.parse` sobre ganchos solo aparece en `domain/compartido/gancho.js` (incluye quitar el de `posicion.repository.js` l. 48) (`grep`, ver Verificación final).
- **Pruebas**: `back/test/domain/skuVersion.test.js` (requiere solo `skuVersion.entity.js`; datos planos `{ gondolas, secciones: [], niveles, posiciones }` con una góndola sin secciones) y casos de cruce en `importacion.test.js`.
- **Depende de**: T11

### T3 — Repositorio: insertar la lista de accesorios
- **Archivos**: modificar `back/src/infrastructure/repositories/importacion.repository.js` (`insertarPosicionPorUbicar`, l. 236) · JSDoc en `back/src/domain/importacion/importacion.repository.js` (l. ~44)
- **Qué hacer**: firma `insertarPosicionPorUbicar(trx, nivelId, ordenHorizontal, { accesorios = [], ganchos, ...posicion })`. Tras insertar la `Posicion`, si `accesorios.length` → `await trx(TABLA_POSICION_ACCESORIO).insert(accesorios.map((a) => ({ posicion_id: id, accesorio_id: a.accesorio_id, tamano_pulgadas: a.tamano_pulgadas, orden: a.orden })))`. Siempre `trx`. No tocar `insertarNiveles` ni `aplicarCruce`.
- **Criterios de aceptación**:
  - [ ] `accesorios` no llega al `insert` de `Posicion`; lista vacía → sin `insert` en `PosicionAccesorio`; un solo `insert` multi-fila dentro de la transacción.
- **Pruebas**: Postman (T9) + revisión del diff.
- **Depende de**: T1

### T12 — Aplicación: esquema común de ganchos
- **Archivos**: crear `back/src/application/compartido/ganchos.schema.js` · modificar `back/src/application/posiciones/posiciones.controller.js` (l. 35 y 61) · crear `back/test/application/ganchosSchema.test.js`
- **Qué hacer**: el archivo de la sección "Esquema común de ganchos", tal cual (R2-1: `Joi.any().custom(normalizarGancho)` como única regla). En `posiciones.controller.js` reemplazar ambos `ganchos:` por `schemaGanchos.allow(null).optional()`. (Importación se cambia en T4.)
- **Criterios de aceptación**:
  - [ ] Válidos y su valor: `[54, '54E']` → `[54, '54E']`; `['54']` → `[54]`; `['54e']` → `['54E']`; `['054E']` → `['54E']`; `[]`.
  - [ ] Error: `[54, '54']`, `['54E', '54e']`, `[0]`, `['0E']`, `['54A']`, `['E']`, `[54.5]`, `[1000000]`, `['5E1']`, `['1e2']`, `['54E2']`, `['+54']`, `['54.0']`, `[true]`, `[null]`, 101 elementos.
  - [ ] El mensaje de error contiene `de exhibición como 54E`.
  - [ ] El archivo no usa `Joi.number()`, `Joi.alternatives()` ni `pattern`.
- **Pruebas**: `back/test/application/ganchosSchema.test.js` (`schemaGanchos.validate(...)`).
- **Depende de**: —

### T4 — Aplicación: esquemas de importación en archivo propio, `accesorios` y ganchos
- **Archivos**: crear `back/src/application/importacion/importacion.schemas.js` · modificar `back/src/application/importacion/importacion.controller.js` · crear `back/test/application/importacionSchemas.test.js`
- **Qué hacer**:
  - Mover `schemaSeccion`, `schemaNivel`, `schemaPosicion`, `schemaCuerpo`, `schemaImportar`, `entero`, `schemaProductoExcel` y `schemaImportarProductos` (y los `require` de dominio que usan) a `importacion.schemas.js`; exportar `{ schemaImportar, schemaImportarProductos, validarBody }` (`validarBody(schema, body)` con `abortEarly: false, stripUnknown: true`, misma implementación de hoy). Sin repositorios.
  - `schemaPosicion.ganchos` y `schemaProductoExcel.ganchos` → `schemaGanchos.default([])` (de `../compartido/ganchos.schema`).
  - `schemaProductoExcel`: agregar `accesorios` (regla exacta de Contratos) y el `.custom` `producto.accesoriosMixtos` con su `.messages`.
  - El controller importa de `importacion.schemas.js`; handlers sin cambios.
- **Criterios de aceptación**:
  - [ ] 45 productos con `productos[42].accesorios[0].tamano_pulgadas = 2222` → un `detail.path` igual a `['productos', 42, 'accesorios', 0, 'tamano_pulgadas']`.
  - [ ] Error con: 11 accesorios; `codigo` `''`, `'   '`, 51 caracteres; `tamano_pulgadas` 0, -1, 1000, `'22" // 22"'`; mezcla `accesorios` + `accesorio_codigo`; `ganchos: ['54A']`.
  - [ ] Ítem `{ codigo: 'a', accesorio_id: 1, orden: 99, posicion_id: 5 }` → valor `{ codigo: 'a', tamano_pulgadas: null }`.
  - [ ] Sin `accesorios` → `[]`; legado solo → válido; `ganchos: [65, '54e']` → `[65, '54E']`.
  - [ ] `schemaImportar` acepta una posición con `ganchos: [3, 4]` (importar-layout sin regresión).
- **Pruebas**: `back/test/application/importacionSchemas.test.js` (requiere solo `importacion.schemas.js`).
- **Depende de**: T12

### T5 — (retirada)
- Fuera de alcance por pedido del usuario: este cambio no toca permisos ni CAO.

### T14 — Front: tipo y helper de ganchos
- **Archivos**: crear `front/src/types/gancho.ts` (tipo de Contratos) · crear `front/src/domain/ganchos/gancho.ts` · crear `front/src/domain/ganchos/gancho.test.ts`
- **Qué hacer**: exportar, con la misma semántica que T11:
  - `leerGancho(valor: unknown): Gancho | null`: misma regla exacta que `normalizarGancho` (T11), incluido el rechazo de `'5E1'`, `'1e2'`, `'54E2'`, `'+54'`, `'54.0'`, `true` y `null`, y `'054E'` → `'54E'`.
  - `numeroGancho(g)`, `esGanchoExhibicion(g)`, `compararGanchos(a, b)`.
  - `textoGancho(g): string` → número con `padStart(2, '0')` y, si es de exhibición, `E` al final (`5` → `05`, `'5E'` → `05E`, `'54E'` → `54E`, `132` → `132`).
  - `textoGanchos(ganchos: Gancho[]): string` (mueve la lógica de `PosicionLienzo.textoGanchos`): 1 → `textoGancho`; todos normales y continuos → `04–07`; si no → `map(textoGancho).join(', ')`.
  - `leerListaGanchos(texto: string): { ganchos: Gancho[]; invalidos: string[] }`: separa por `/[\s,;|]+/` tras unir `(\d)\s+E` → `$1E`; cada token con `leerGancho`; inválidos en `invalidos`; repetidos se marcan como inválidos (`'54 (repetido)'`).
- **Criterios de aceptación**:
  - [ ] Mismos casos que T11 (lista completa, incluidos los de R2-1) para `leerGancho` y `compararGanchos`.
  - [ ] `textoGanchos([4,5,6])` → `04–06`; `textoGanchos([4,'5E'])` → `04, 05E`; `textoGanchos([65,'54E'])` → `65, 54E`.
  - [ ] `leerListaGanchos('4, 9 54 e')` → `{ ganchos: [4, 9, '54E'], invalidos: [] }`; `'4, x, 4'` → inválidos `['x', '4 (repetido)']`.
- **Pruebas**: `front/src/domain/ganchos/gancho.test.ts` (Vitest).
- **Depende de**: —

### T16 — Front: normalizador único del código de accesorio
- **Archivos**: crear `front/src/domain/accesorios/codigoAccesorio.ts` · crear `front/src/domain/accesorios/codigoAccesorio.test.ts`
- **Qué hacer**: exportar `normalizarCodigoAccesorio(codigo: string): string` = `codigo.trim().replace(/\s+/g, ' ').toUpperCase()` (misma regla que `normalizarCodigo` en `back/src/domain/accesorio/accesorio.entity.js`; comentario JSDoc que lo diga). Es el único normalizador de código de accesorio del front (lo usan T7 y T8).
- **Criterios de aceptación**:
  - [ ] `' vda-22r  pth '` → `'VDA-22R PTH'`; `'A\tB'` → `'A B'`; `''` → `''`.
- **Pruebas**: `front/src/domain/accesorios/codigoAccesorio.test.ts` (Vitest).
- **Depende de**: —

### T6 — Tipos del front
- **Archivos**: modificar `front/src/types/importacionProductos.ts`, `posicion.ts`, `skuVersion.ts`, `implementacion.ts`, `extractorPdfPlanograma.ts` (solo `ProductoPorUbicar`)
- **Qué hacer**: según "Tipos TS del front" (Contratos). El servicio `front/src/services/importacionProductos.service.ts` no cambia.
- **Criterios de aceptación**:
  - [ ] `npx tsc -b` solo falla en los archivos que T7, T8 y T15 corrigen.
- **Depende de**: T14

### T7 — Lector del Excel: `//`, enteros estrictos, ganchos `E` y errores por celda
- **Archivos**: modificar `front/src/utils/excelProductosPlanograma.ts` · crear `front/src/utils/excelProductosPlanograma.test.ts`
- **Qué hacer**:
  - Exportar `ErrorLectura`, `OrigenAccesorio` y la nueva `LecturaExcelProductos`. Al leer encabezados, guardar texto original e índice de cada `Campo` y de cada columna de gancho.
  - Exportar `letraColumna(indice)` (0 → `A`, 25 → `Z`, 26 → `AA`, 27 → `AB`).
  - Tipo interno `ResultadoCelda<T> = { ok: true; valor: T } | { ok: false; motivo: string; esperado: string }`.
  - Reemplazar `numero()`/`entero()` por `enteroCelda(valor, maximo?)`: vacío → `null`; `number` válido si finito, ≥ 0 y entero (tolerancia `1e-9`, devuelve `Math.round`); texto válido solo si `/^\d+$/` tras `trim`; con `//` o más de un grupo `/\d+/g` → "más de un número"; si no → "no es un número válido"; `> maximo` → "fuera del rango".
  - Reemplazar `numerosGancho` por exportada `ganchosCelda(valor: Celda): ResultadoCelda<Gancho[]>`: vacío → `[]`; `number`: entero > 0 → `[n]`, `0` → `[]`, decimal/negativo/> 999999 → error; texto: `t = texto.toUpperCase().replace(/(\d)\s+E(?![A-Z])/g, '$1E')`, tokens = `t.split(/[^0-9A-Z]+/).filter(Boolean)`; token que cumpla `/^0+E?$/` → se ignora; `leerGancho(token)` (T14) `null` → error con ese token (primer inválido de la celda); repetidos se descartan. Textos en "Textos de error por celda" (Gancho inválido). Por fila, unir los ganchos de todas las columnas TG sin repetidos (`54` y `'54E'` son distintos).
  - Exportar `accesoriosDeCeldas(nombre, tamano)` (reglas de Decisiones): nombres por `/\s*\/\/\s*/`, cada segmento con `normalizarCodigoAccesorio` (T16), sin vacíos; 0 nombres → sin accesorios y sin validar tamaño; nombre > 50 → error `nombre_accesorio`; tamaños: `number` → `[tamano]`, texto → segmentos por `//` validados con `/^(\d+(?:[.,]\d+)?)\s*(?:"|''|”|″|pulg(?:adas)?\.?|in\.?)?$/i` (coma → punto; sin dígitos → "no contiene un número"; con dígitos sin coincidir → "no es un número válido"; ≤ 0 o > 999 → "fuera del rango"; 2 decimales). Total > 10 → error en la columna con más segmentos (`nombre_accesorio` si empatan). n≥2, m≥2, m≠n → error en `tamano_accesorio`.
  - Exportar `agruparAccesorios(accesorios)` (agrupa iguales consecutivos por código y tamaño).
  - Exportar `erroresDeCatalogo(origenes: OrigenAccesorio[], codigosCatalogo: Set<string>): ErrorLectura[]`: un error por origen cuyo `codigo` no esté en el set, con motivo/esperado de "Accesorio fuera del catálogo"; ordenados por fila.
  - `interpretarHojaProductos`: por fila con SKU validar SKU (≤ 50), ganchos, facings (`enteroCelda(v, 100)`), `cantidad_x_facing`, `cantidad_facing_vertical`, `min_estetico`, `capacidad_maxima`, `min_final`, `max_final`, `descripcion`/`observaciones` (≤ 500) y `accesoriosDeCeldas`; acumular **todos** los errores. Sin SKU → `filasOmitidas` (`Sin SKU`). Facings vacío → cantidad de ganchos **normales** (`ganchos.filter((g) => !esGanchoExhibicion(g)).length`); los `E` no cuentan (P-E2). Facings vacío y la fila solo con ganchos `E` → `ErrorLectura` en la columna Facings (texto "Facings vacío y solo ganchos de exhibición"). Sin errores y facings `null`/0 y sin ganchos → `filasOmitidas` (`SKU {codigo}: sin facings`). Defaults como hoy (`unidades_por_facing`/`cantidad_apilable` 0 o vacío → 1; `capacidad_maxima` 0 o vacío → `null`). Por cada producto sin errores con accesorios: un `OrigenAccesorio` por código distinto con la fila y la columna `Nombre_accesorio_*`. Si `errores.length > 0` → `productos: []` y `origenesAccesorio: []`. Errores ordenados por fila y columna.
  - Actualizar el comentario de cabecera (regla `//` y ganchos `E`).
- **Criterios de aceptación**:
  - [ ] `accesoriosDeCeldas` cumple cada regla (`A` + `22" // 22"` → 2 × A 22; `A // B` + `22"` → A 22, B 22; `A // B` + `22" // 12"`; `A // B` + vacío; vacío + `22"` → `[]`); `A // B` + `22" // 22" // 8"` → error `tamano_accesorio`; 11 tamaños con 1 nombre → error; `22.5`, `22,5`, `22''`, `22 pulg` válidos; `abc`, `0`, `1000` → error.
  - [ ] `ganchosCelda`: `'65 | 54E'` → `[65, '54E']`; `'54 e'` → `['54E']`; `'132 | 146'`, `'168,169'`, `'166-167'` como hoy; `54` (number) → `[54]`; `0` → `[]`; `'54A'` → error con token `54A`; `54.5` → error.
  - [ ] Fila `1111754 | 2 | VDA-22R-PTH | 22" // 22"` → producto con 2 accesorios de 22, `errores: []`, un `OrigenAccesorio` con `codigo: 'VDA-22R-PTH'`.
  - [ ] Fila con `TG1 = 54` y `TG2 = 54E` → `ganchos: [54, '54E']`.
  - [ ] `Facings_TG = "10 // 12"` → `ErrorLectura` con columna y letra correctas y `productos: []`.
  - [ ] Fila sin facings y sin ganchos → `filasOmitidas`.
  - [ ] Facings vacío con `TG1 = 65` y `TG2 = 54E` → `facings_horizontal: 1`; Facings vacío con solo `54E` → `ErrorLectura` en la columna Facings y `productos: []`.
  - [ ] Nombre `VDA-22R  PTH` (doble espacio) → código `VDA-22R PTH`; `erroresDeCatalogo` con catálogo `{'VDA-22R PTH'}` → `[]` (R2-2).
  - [ ] `erroresDeCatalogo` con orígenes `X` (fila 5) y `A` (fila 7) y catálogo `{A}` → 1 error fila 5 columna `Nombre_accesorio_TG`.
  - [ ] `letraColumna(27) === 'AB'`; `agruparAccesorios([A22, A22, B12, A22])` → `[2×A22, 1×B12, 1×A22]`.
- **Pruebas**: `front/src/utils/excelProductosPlanograma.test.ts` (Vitest).
- **Depende de**: T6, T14, T16

### T15 — Front: mostrar y editar ganchos de exhibición
- **Archivos**: modificar
  `front/src/components/dominio/lienzoEditor/PosicionLienzo/PosicionLienzo.tsx`,
  `front/src/components/dominio/lienzoEditor/GondolaEscalaLienzo/GondolaEscalaLienzo.tsx`,
  `front/src/components/dominio/lienzoEditor/GondolaFrameLienzo/GondolaFrameLienzo.tsx` (l. 38, tipo),
  `front/src/components/dominio/lienzoEditor/NivelFilaLienzo/NivelFilaLienzo.tsx` (l. 37, tipo),
  `front/src/components/dominio/lienzoEditor/DetalleGondolaPanel/DetalleGondolaPanel.tsx`,
  `front/src/components/dominio/lienzoEditor/DetalleGondolaPanel/PosicionesSku.tsx`,
  `front/src/components/dominio/modales/PosicionDrawer/PosicionDrawer.tsx`,
  `front/src/domain/implementacion/columnasProductos.ts`,
  `front/src/components/dominio/implementacion/ProductosImplementacionTable/ProductosImplementacionTable.tsx`,
  `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/importacionPdf.ts`,
  `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/RevisionCuerpoPdf.tsx` (tipo `Map`),
  `front/src/components/dominio/editor/AgenteExtractorBubble/AgenteExtractorBubble.tsx` (solo tipos si `tsc` lo pide)
- **Qué hacer**:
  - Borrar las cuatro `dos()` locales y usar `textoGancho`/`textoGanchos` de `front/src/domain/ganchos/gancho.ts`. `resolverGanchos` y la prop `ganchos` pasan a `Gancho[]`.
  - `PosicionesSku.ChipsGanchos`: `calculados`, `ganchosPorPosicion`, `onAplicar` con `Gancho`; `agregar()` usa `leerGancho(texto)` (`null` → error `Número entero mayor que 0, o de exhibición como 54E`); `includes` y búsqueda en otras posiciones sin cambios (forma canónica); orden con `compararGanchos`; `inputMode="text"`; `key={String(g)}`; mensajes con `textoGancho(g)`.
  - `PosicionDrawer` (l. 150-152, 431): `const { ganchos: ganchosLeidos, invalidos } = leerListaGanchos(ganchosTexto)`; `ganchosInvalidos = invalidos.length > 0`; el campo editable se sigue llenando con `posicion.ganchos?.join(', ')` (ya canónico: `65, 54E`). Mensaje: `Los ganchos deben ser números enteros positivos (los de exhibición llevan E, como 54E), sin repetir.`
  - `columnasProductos.ts` (l. 119-120): `texto: (f) => f.ganchos.map(textoGancho).join(', ')`; `orden: (f) => (f.ganchos.length ? Math.min(...f.ganchos.map(numeroGancho)) : null)`.
  - `ProductosImplementacionTable.tsx` (l. 51): `f.ganchos.map(textoGancho).join(', ')`.
  - `importacionPdf.ts`: `indicePorGancho` y `fuentePorUbicar` con `Map<Gancho, ProductoPorUbicar>`; sin cambio de lógica.
- **Criterios de aceptación**:
  - [ ] Posición con ganchos `[65, '54E']`: badge del lienzo `65, 54E`; vista de SKU y tabla del implementador `54E` visible y distinto de `54`.
  - [ ] Drawer: guardar `4, 54E` → `PATCH` con `ganchos: [4, '54E']`; `54A` deshabilita Guardar con el mensaje.
  - [ ] Chips: agregar `54e` → chip `54E`; agregar `54` si otra posición tiene `54E` → se permite.
  - [ ] `npx tsc -b` y `npm run lint` sin errores.
- **Pruebas**: lógica cubierta en T14; prueba manual (Verificación final).
- **Depende de**: T6, T14

### T8 — Modal: vista de errores (archivo y catálogo), accesorios en lista, toasts y CSS
- **Archivos**: modificar `ImportarExcelProductosModal.tsx` y `ImportarExcelProductosModal.css` (`front/src/components/dominio/modales/ImportarExcelProductosModal/`) · modificar `front/.stylelintrc.json` (quitar el `.css` del modal de la lista legacy, l. 90)
- **Qué hacer**:
  - Estado nuevo `erroresCatalogo: ErrorLectura[] | null`.
  - `leer()`: columnas faltantes → errores (`setLectura`) → sin productos (toast) → `setLectura`.
  - Borrar la `normalizar` local (l. 27) e importar `normalizarCodigoAccesorio` (T16); usarlo en `codigosCatalogo` (`new Set(accesorios.map((a) => normalizarCodigoAccesorio(a.codigo)))`) y en `faltantes`.
  - `faltantes`: `flatMap` sobre `p.accesorios`; clave `normalizarCodigoAccesorio(codigo)`; `tipoSugerido` con el tamaño del primer accesorio con ese código.
  - `importar()`: `if (!lectura || importando || lectura.errores.length) return;` luego `const errs = erroresDeCatalogo(lectura.origenesAccesorio, codigosCatalogo); if (errs.length) { setErroresCatalogo(errs); return; }` y recién entonces la petición. Manejo de 400/422 según UX: el caso "catálogo" se decide con `Array.isArray(err.details?.codigos)`, nunca solo por `err.status === 422`.
  - Render: `erroresCatalogo` → vista de errores origen catálogo; `lectura.errores.length` → origen archivo; si no → vista previa. Textos, orden de botones, foco y `aria-*` según UX. Tras "Dar de alta" (`onGuardado`) se recarga el catálogo como hoy.
  - Columna "Ganchos" con `textoGanchos`; columna "Accesorio" con `agruparAccesorios`; tuteo; CSS solo con tokens.
- **Criterios de aceptación**:
  - [ ] Archivo con un error → vista "Errores del archivo", foco en el bloque, Importar deshabilitado, sin petición.
  - [ ] Archivo correcto con un accesorio fuera del catálogo → vista previa con el aviso; Importar → vista de errores de catálogo con fila y columna `Nombre_accesorio_*`, sin petición; "Volver a la vista previa" → "Dar de alta" → Importar envía.
  - [ ] "Cargar otro archivo" vuelve al paso 1 con el selector vacío.
  - [ ] Vista previa: `2 × VDA-22R-PTH · 22"` en una línea; ganchos `65, 54E`.
  - [ ] 400 simulado con `details: ['...']` → toast `No se pudo importar: ... Corrige el archivo y vuelve a cargarlo.`; 422 con `details.codigos` → toast con el mensaje y catálogo recargado; 422 sin `details.codigos` (versión publicada) → toast de error sin recargar el catálogo; el modal sigue abierto.
  - [ ] En el `.tsx` no queda ninguna función local de normalización de código.
  - [ ] `npm run lint` y `npx tsc -b` sin errores.
- **Pruebas**: manual; la lógica pura está en T7 y T14.
- **Depende de**: T7, T14, T16

### T9 — Postman
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (carpeta "Importar productos (POST /versiones/:id/importar-productos)", l. ~24774, y la carpeta de posiciones). No tocar el resto de `postman/`.
- **Qué hacer** (según `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`, con SKUs/accesorios de DEV y datos repetibles):
  1. `201` con `accesorios` de 2 elementos (mismo código, 22) y `ganchos: [901, "902E"]` → `totalImportados` 1; verificar 2 accesorios `orden` 1 y 2 y `ganchos` `[901, "902E"]` en la lectura de la posición.
  2. `201` formato legado → 1 accesorio.
  3. `400` `tamano_pulgadas: 1000`; `400` con 11 accesorios; `400` `ganchos: ["54A"]`.
  4. `400` mezcla `accesorios` + `accesorio_codigo`.
  5. `422` con un accesorio inexistente → `details.codigos` contiene el código y no se creó ninguna posición (repetir la petición da el mismo 422).
  6. `PATCH /posiciones/:id` con `ganchos: [4, "54e"]` → `200` y `ganchos` `[4, "54E"]`; `GET /versiones/:id/skus` lo devuelve en `ganchosPorPosicion`.
  7. `PATCH /posiciones/:id` con `ganchos: ["5E1"]`, `["54E2"]`, `[54, "54"]` y `["54E", "54e"]` → `400` cada uno (R2-A1, R2-A2).
  8. `422` con dos productos `codigo: "zzz-no-existe "` y `"ZZZ-NO-EXISTE"` → `details.codigos` con un solo código (R2-A4).
  9. Versión publicada + accesorio inexistente → `422` sin `details.codigos` (R2-A8).
- **Criterios de aceptación**:
  - [ ] Los casos pasan contra DEV y se pueden repetir.
- **Depende de**: T2, T3, T4, T12, T13

### T10 — Documentación (commit de docs separado)
- **Archivos**: modificar `Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`, `Arquitectura/Contratos/20_importacion/POST_versiones_importar_layout.md`, `Arquitectura/Contratos/05_posiciones/PATCH_posiciones_editar.md`, `Arquitectura/Contratos/19_skus/GET_skus_listar.md`, `Arquitectura/Contratos/16_implementacion/GET_implementacion_productos.md`, `Arquitectura/MODELO_DATOS_V3.mmd`, `Arquitectura/ESTADO_MODULOS.md`, `Arquitectura/DEUDA_TECNICA.md`
- **Qué hacer**:
  - Contrato de importar-productos: `accesorios`, regla `//`, legado, 422 de accesorio inexistente, tope de 200, validación bloqueante del front, ganchos `E`.
  - Los demás contratos y el `.mmd`: `ganchos` es `(number|string)[]`, `"54E"` = exhibición, distinto de `54`; no reserva número en la numeración calculada.
  - `ESTADO_MODULOS.md`: apartado de importación (Por ubicar, cruce por ganchos canónicos, `//`, accesorio inexistente bloqueante, esquemas en `importacion.schemas.js`) y nota en "SKU en la versión" sobre ganchos de exhibición; helpers `domain/compartido/gancho.js` y `front/src/domain/ganchos/gancho.ts` como única regla de ganchos.
  - `DEUDA_TECNICA.md`: registrar la deuda consolidada.
- **Criterios de aceptación**:
  - [ ] Ningún documento describe `ganchos` como "arreglo de enteros" ni `accesorio_codigo` como único formato, ni dice que un accesorio inexistente "se omite".
- **Depende de**: T1-T16

## Deuda consolidada (registrar en T10)

| ID propuesto | Deuda | Severidad | Área | Origen |
|---|---|---|---|---|
| DT-20 | Importación concurrente duplica SKUs: estado y `skusDeVersion` se leen fuera de la transacción. Mitigado por el botón deshabilitado en vuelo. | Media | back | 02_seguridad |
| DT-21 | `mensajeDeError` ignora `details` de los 400 en todo el front (solo se resolvió en este modal). | Media | front | 01_arquitectura, 02_ux |
| DT-22 | Campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas`: retirarlos cuando el front nuevo esté en DEV y PROD. | Baja | back | 01_arquitectura, 02_seguridad |
| DT-23 | Resolución de accesorios con una consulta por código (tope de 200); falta `buscarPorCodigos` en lote. | Baja | back | 02_seguridad |
| DT-24 | Sin índice en `PosicionAccesorio.posicion_id`. | Baja | BD | 01_arquitectura |
| DT-25 | `importarProductos` no registra quién importó. | Baja | back | 02_seguridad |
| DT-26 | Importación de Excel sin caso de uso en `CASOS_DE_USO.md`. | Baja | docs | 01_arquitectura |
| DT-27 | Extractores de PDF e imagen numerada solo devuelven ganchos enteros: el PDF sí imprime `54E` (P-E1) y hoy se lee como 54 o no se cruza con "Por ubicar"; se ubica a mano. Plan aparte. | Media | back · IA | 00_solicitud P-E1, 01_arquitectura §12 |
| DT-28 | `Gancho = number \| string` (forma mixta) en vez de un tipo explícito; si aparecen otras variantes de gancho, migrar a `{ numero, tipo }` con migración de datos. | Baja | back · front | 01_arquitectura §12 |
| DT-29 | Reglas duplicadas entre back y front (por lenguaje): ganchos (`domain/compartido/gancho.js` ↔ `front/src/domain/ganchos/gancho.ts`) y código de accesorio (`normalizarCodigo` ↔ `normalizarCodigoAccesorio`). Mismas pruebas en ambos lados. | Baja | back · front | 01_arquitectura §12, 02_seguridad R2-2 |
| DT-30 | La unicidad de ganchos solo se valida dentro de cada posición: dos posiciones de la misma versión pueden guardar el mismo `54`/`54E` (solo los chips del front lo impiden). Preexistente. | Baja | back | 02_seguridad R2.5 |
| DT-31 | Accesorio eliminado entre la verificación de catálogo y el `insert` → rollback y `500` genérico; si ocurre en la práctica, mapear el error de FK a `409`. | Baja | back | 02_seguridad R2-6 |

Se cierran con este plan (no se registran): `numero()` que concatenaba dígitos; `normalizar` local del modal duplicada (T16); ganchos `54E` leídos como `54`; `.css` del modal en la lista legacy; voseo del modal; cuatro `dos()` duplicadas en el lienzo.

## Verificación final

- `cd back && npm test`
- `cd front && npm test && npx tsc -b && npm run lint`
- `grep -rn "map(Number)" back/src | grep -i gancho` sin resultados.
- `grep -rn "JSON.parse" back/src | grep -i gancho` solo encuentra `back/src/domain/compartido/gancho.js` (R2-3).
- `grep -rn "Math.min(\.\.\..*ganchos\|ganchos.*sort((a, b) => a - b)" back/src front/src` sin resultados fuera de los helpers de gancho y del extractor de PDF (R2-7).
- **Antes de publicar (bloqueante, S13)**: correr en DEV (`OTB`) y en PROD (`db-planogramas`) esta consulta de solo lectura; debe devolver 0 filas en ambos. Anotar el resultado en `06_revision_seguridad.md`. Si devuelve filas, no se publica hasta decidir (script de normalización o ampliar el parser) en un paso aprobado por el usuario.
  ```sql
  SELECT id, ganchos FROM Posicion
  WHERE ganchos IS NOT NULL
    AND (ISJSON(ganchos) = 0 OR ganchos LIKE '%"%' OR ganchos LIKE '%.%' OR ganchos LIKE '%-%' OR ganchos LIKE '%e%');
  ```
- Postman: carpetas de importar productos y posiciones (T9).
- Prueba manual en DEV:
  1. `/planogramas/83/versiones/103/lienzo` → "Importar Excel" con `Análisis - Planograma LIMPIEZA TG-12.xlsx`: vista previa con 45 productos y SKU 1111754 con `2 × VDA-22R-PTH · 22"`; importar → 201; el drawer muestra 2 accesorios. Si el archivo trae celdas que ahora bloquean, la vista de errores las señala con fila y columna (registrar cuáles en la revisión).
  2. Excel TG-26 con `54E` y `65 | 54E`: vista previa con `54E` y `65, 54E` (facings implícitos sin contar los `E`); importar; con "Mostrar ganchos" el lienzo y la vista de SKU muestran `54E` distinto de `54`; la consulta del implementador lo lista igual.
  3. Copia del archivo con un accesorio inventado `ZZZ-NO-EXISTE`: aviso en la vista previa; Importar → vista de errores de catálogo con su fila; "Volver a la vista previa" → "Dar de alta" → Importar → 201.
  4. Copia con `Tamano_accesorio_TG = 22" // 22" // 8"` + nombre `A // B` en una fila y `Facings_TG = 10 // 12` en otra: 2 errores, Importar deshabilitado, sin petición en Red.
  5. Importar layout de PDF con "Llenar con Por ubicar" sobre la versión del paso 2: el espacio 65 toma el producto; `54E` sigue en "Por ubicar" con la advertencia.
  6. Drawer de una posición: guardar `4, 54E` y recargar; queda igual. Abrir una posición con `[65, "54E"]` y guardar sin cambios → `PATCH` con `[65, "54E"]` (R2-A7).
  7. Copia con `VDA-22R  PTH` (doble espacio) en el nombre: sin aviso de faltante; Importar → 201 (R2-A5).

## Riesgos

- Archivos reales con celdas que antes se aceptaban por redondeo (decimales en enteros, `10 u.`, ganchos con letras distintas de `E`) ahora bloquean → los mensajes indican la celda exacta; validar con los archivos TG-12 y TG-26 antes de publicar.
- Front nuevo contra back viejo o al revés (ventana de despliegue): el back viejo descarta `accesorios` y rechaza `"54E"` con 400; el front viejo mostraría `NaN` en ganchos `E` → publicar back y front en el mismo push y verificar en DEV antes de PROD.
- Ganchos no canónicos ya guardados en algún ambiente: `parsearGanchosJson` los descarta al leer y el siguiente `PATCH` los borraría → consulta S13 antes de publicar (PROD sin verificar, DT-08).
- Reversión con datos `"54E"` guardados: el código viejo los leería como `NaN`. Si hubiera que revertir, convertir `"<n>E"` → `<n>` con un script SQL puntual (fuera de alcance; anotarlo en la revisión).
- Mover los esquemas de importación puede romper `importar-layout` → criterio de T4 y caso Postman existente.
- `insertarPosicionPorUbicar` sin desestructurar `accesorios` intentaría insertar la columna en `Posicion` (500) → criterio de T3.
- El 422 de accesorio inexistente cambia el comportamiento para cualquier cliente que dependía de "importar sin accesorio" (solo el modal lo usa) → contrato actualizado en T10.

## Preguntas abiertas

Ninguna. P-E1, P-E2 y P-E3 quedaron respondidas en `00_solicitud.md` y aplicadas en Decisiones, T7, Fuera de alcance y Deuda.
