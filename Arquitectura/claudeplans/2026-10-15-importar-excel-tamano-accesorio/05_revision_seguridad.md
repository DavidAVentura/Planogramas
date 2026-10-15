# 05 — Revisión de seguridad e integridad del diff · Importar Excel: varios accesorios y ganchos `54E`

Base: `76dd827` + archivos nuevos sin seguimiento (`git status --short`), sin los `.md` de esta carpeta.
Contrastado con `PLAN.md` (rev. 3) y `02_seguridad.md` (rev. 1 y "Revisión 2"). Permisos/CAO fuera de alcance.
Pruebas ejecutadas: `back` `npm test` → 95/95 OK; `front` `vitest run` → 56/56 OK. No se ejecutó nada contra BD.

## Veredicto

**Aprobado con observaciones.** Sin hallazgos bloqueantes. Hay 1 hallazgo importante: la consulta de la
verificación previa a publicar (S13) debe corregirse antes de correrla. También hay 3 menores, que pueden
quedar como deuda.

## Controles verificados (sin hallazgos)

| Control | Evidencia |
|---|---|
| S11 / R2-1: un solo esquema de ganchos | `back/src/application/compartido/ganchos.schema.js` usa `Joi.any().custom(normalizarGancho)` + `.max(100).unique()`, sin `Joi.number()`, `alternatives` ni `pattern`. Lo usan los 4 contratos: `importacion.schemas.js:24` (layout), `:73` (productos), `posiciones.controller.js:36` y `:62`. Lo comprobé con el Joi del repo: `'5E1'`, `'1e2'`, `'54E2'`, `'+54'`, `'54.0'`, `true`, `null`, `0`, `1000000`, `{}`, `[54]` y `'54 E'` → 400. `'054E'` → `'54E'`, `' 54 '` → `54`. `[54,'54']` y `['54E','54e']` → repetido. `[54,'54E']` es válido. |
| S11 / R2-3: lecturas sin `.map(Number)` | Solo hay un `JSON.parse` de ganchos en `back/src`: `domain/compartido/gancho.js:45` (`parsearGanchosJson`). Se eliminaron los `parsearGanchos` locales de `posicion.repository.js` y `skuVersion.repository.js` y el `.map(Number)` de `importacion.repository.js:173`. El único `.map(Number)` que queda en `back/src` está en `validacion.js:48` (IDs de query) y no tiene relación con ganchos. |
| R2-7: aritmética sobre ganchos | `Math.min` sobre ganchos solo aparece con `numeroGancho` (`importacion.entity.js:319`, `columnasProductos.ts:121`). El orden usa `compararGanchos` (`PosicionesSku.tsx`). `recorrerVersion` reserva solo los ganchos numéricos (`skuVersion.entity.js:36`). El extractor de PDF sigue manejando solo enteros (fuera de alcance, DT-27). |
| S12 / R2-4: orden del caso de uso | `importacion.usecases.js:156` `validarVersionEditable` → `:159` `resolverAccesorios` (tope de 200 → 400 antes de consultar, resolución de todas las claves → 422 con `details.codigos`) → `:161` `skusDeVersion` → `importarPorUbicar`. Las pruebas con contadores lo cubren: 422 sin `skusDeVersion` ni `importarPorUbicar`; más de 200 códigos → 0 consultas; versión publicada → 422 sin `details.codigos` y sin consultar el catálogo. |
| S3 / S6: `accesorio_id` y `orden` del servidor | `accesorio_id` sale solo del `Map` que resuelve `buscarPorCodigo`; `orden = k + 1`; la clave se normaliza con `normalizarCodigo` al indexar y al buscar (`importacion.usecases.js:120-140`, `:173-178`). `Joi.object` explícito con `stripUnknown`: `{codigo:'A', accesorio_id:1, orden:99}` → `{codigo:'A', tamano_pulgadas:null}` (comprobado). |
| S4: inserción en `trx` | `importacion.repository.js:237-249`: la firma desestructura `accesorios = []`, hace un solo `trx(TABLA_POSICION_ACCESORIO).insert([...])` y no inserta nada si la lista está vacía. No hay `db(...)` dentro del flujo. R2-6: no se captura el error de FK, así que hay rollback y 500 genérico. |
| S1 / S2 / S5: barrera del back | `importacion.schemas.js`: el ítem tiene exactamente los límites del PLAN; `.max(10)`; sin `failover`, `slice` ni filtrado. La mezcla de formato legado y nuevo → `producto.accesoriosMixtos` (400); `accesoriosDeFila` nunca combina ambos formatos. `codigo: '   '` → 400. |
| S8: el front no envía con errores | `interpretarHojaProductos` devuelve `productos: []` y `origenesAccesorio: []` cuando hay errores (`excelProductosPlanograma.ts:503-513`). `importar()` sale si hay errores o accesorios faltantes en el catálogo (`ImportarExcelProductosModal.tsx`, `if (!lectura \|\| importando \|\| lectura.errores.length) return;` + `erroresDeCatalogo`). El botón se deshabilita con errores y durante el envío. La vista de errores no tiene un botón Importar activo. |
| S14 / R2-2: normalizador del código | `front/src/domain/accesorios/codigoAccesorio.ts` es idéntico a `normalizarCodigo` del back. Lo usan el lector, `OrigenAccesorio`, el conjunto del catálogo y `faltantes`, y ya no existe la `normalizar` local del modal. |
| S15 / R2-5: distinguir los 422 | El modal reconoce el 422 de catálogo con `traeCodigos(err.details)`, no por el status. El 422 de versión no editable termina en `mensajeDeError`. |
| S10: salida | No hay `dangerouslySetInnerHTML` en `front/src`; los mensajes, `details` y ganchos se muestran como texto JSX. La respuesta 201 no cambia de forma. El `errorHandler` no se modificó. |
| Postman | El diff no tiene tokens ni secretos. |

## Hallazgos

### Importante

**I-1. La consulta de S13 (R2-3) da falsos positivos con ganchos `54E` legítimos y no detecta algunos valores que el parser descarta.**
Dónde: `PLAN.md` "Verificación final" / S13 y `02_seguridad.md` R2-3 (la consulta es mía). No hay archivo de código.
Escenario: en DEV ya puede haber posiciones con `["54E"]` guardadas durante las pruebas de este cambio.
`LIKE '%"%'` y `LIKE '%e%'` (la colación no distingue mayúsculas) marcan esas filas, el control
"0 filas" falla y alguien termina ignorándolo. A la vez, `[0]`, `[1000000]`, `[true]` o `[[54]]` no se detectan,
pero `parsearGanchosJson` los descarta al leer, así que el siguiente `PATCH` del drawer los borraría (el riesgo que R2-3 buscaba cerrar).
Corrección: correr esta versión en DEV y PROD antes de publicar (solo lectura; debe devolver 0 filas):
```sql
SELECT p.id, p.ganchos
FROM Posicion p
WHERE p.ganchos IS NOT NULL
  AND (ISJSON(p.ganchos) = 0
       OR LEFT(LTRIM(p.ganchos), 1) <> '['
       OR EXISTS (
         SELECT 1 FROM OPENJSON(p.ganchos) j
         WHERE NOT (
           (j.[type] = 2 AND j.[value] NOT LIKE '%[^0-9]%' AND j.[value] NOT LIKE '0%' AND LEN(j.[value]) <= 6)
           OR
           (j.[type] = 1 AND j.[value] LIKE '[1-9]%E' AND LEN(j.[value]) <= 7
            AND LEFT(j.[value], LEN(j.[value]) - 1) NOT LIKE '%[^0-9]%')
         )));
```
Anotar aquí el resultado por ambiente:

| Ambiente | Fecha | Filas | Responsable |
|---|---|---|---|
| DEV (`OTB`) | pendiente | — | — |
| PROD (`db-planogramas`) | pendiente | — | — |

### Menor

**M-1. El front no aplica dos topes del back: ganchos por producto (100) y facings implícitos (100).**
Dónde: `front/src/utils/excelProductosPlanograma.ts:432-437` (une ganchos de todas las columnas `TGn` sin tope)
y `:449` (`facings = normales` sin comprobar `MAX_FACINGS`). En el back: `importacion.schemas.js:73-74`.
Escenario: una fila con más de 100 ganchos (o con Facings vacío y más de 100 ganchos normales) pasa la vista
previa sin errores, pero el back responde 400 a todo el lote. El toast muestra el mensaje en inglés de Joi
con el índice del arreglo (`productos[37].ganchos must contain less than or equal to 100 items`), no la fila
de Excel. No hay riesgo de integridad (no se escribe nada), pero front y back no bloquean exactamente lo mismo.
Corrección: en `interpretarHojaProductos`, registrar un `ErrorLectura` en la primera columna de gancho si
`ganchos.length > 100`, y en `Facings` si el valor implícito supera `MAX_FACINGS`. Agregar un caso Vitest para cada uno.

**M-2. Los enteros sin máximo pueden desbordar `INT` y terminar en 500.** Esto ya pasaba antes del cambio, pero ahora el lector los acepta explícitamente.
Dónde: `importacion.schemas.js:68` (`entero()`), `:75-78` (`unidades_por_facing`, `cantidad_apilable`,
`capacidad_maxima`, sin `.max`) y `excelProductosPlanograma.ts:153-176` (`enteroCelda` sin máximo para esas columnas).
Escenario: una celda `Cantidad_x_facing = 3000000000` pasa el front y Joi (es un entero seguro), y el
`insert` en `Posicion` falla dentro de `trx` por desbordamiento de `INT`. Hay rollback completo y 500 genérico: no
queda ningún dato a medias, pero el usuario no recibe fila ni columna.
Corrección: poner un máximo razonable (p. ej. `.max(100000)`) en el back y el mismo máximo en `enteroCelda` para esas columnas. Si no entra en este cambio, registrarlo como deuda.

**M-3. El front sigue convirtiendo en silencio un 0 explícito (contradice parcialmente S8).**
Dónde: `excelProductosPlanograma.ts:489-492` (`unidades || 1`, `apilable || 1`, `capacidad || null`).
Escenario: `Cantidad_x_facing = 0` en el Excel (el back exige `min(1)`) se envía como `1` sin aviso, y `Capacidad = 0`
se envía como `null`. Ya pasaba antes y el riesgo es bajo, pero S8 dice que "el front no convierte valores inválidos".
Corrección: que `0` en esas tres columnas sea un `ErrorLectura` ("debe ser al menos 1") y dejar `?? 1` / `?? null` solo para las celdas vacías.

## Deuda detectada (para consolidar en T10)

| Propuesta | Severidad | Detalle |
|---|---|---|
| Topes de enteros de `Posicion` en importación | Baja | M-2, si no se corrige en este cambio. |
| Ajustar la verificación de ganchos no canónicos | — | I-1: no es deuda si se corre la consulta corregida antes de publicar. |
