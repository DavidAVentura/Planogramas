# 04 — Implementación

Plan: `PLAN.md` revisión 3. Rama `feat/importar-excel-tamano-accesorio` (base `76dd827`). Sin commits. T10 (documentación) queda para el coordinador. No se ejecutó nada contra BD ni Postman.

## Tareas

| ID | Estado | Archivos |
|---|---|---|
| T11 | Hecha | `back/src/domain/compartido/gancho.js` · `back/test/domain/gancho.test.js` |
| T1 | Hecha | `back/src/domain/importacion/importacion.entity.js` (`accesoriosDeFila`, `posicionDesdeFila` con lista, `filtrarProductos`, exporta `errorBadRequest`) · `back/test/domain/importacion.test.js` |
| T2 | Hecha | `back/src/domain/importacion/importacion.usecases.js` (`resolverAccesorios`; tope 200; 422 con `details.codigos`; usa los errores de `importacion.entity`) · `back/test/domain/importacion.test.js` |
| T13 | Hecha | `back/src/domain/skuVersion/skuVersion.entity.js` · repos `skuVersion`, `posicion`, `importacion` (usan `parsearGanchosJson`) · JSDoc de `cruzarConPorUbicar` · `back/test/domain/skuVersion.test.js` |
| T3 | Hecha | `back/src/infrastructure/repositories/importacion.repository.js` (`insertarPosicionPorUbicar`, un solo `insert` multi-fila) · JSDoc en `back/src/domain/importacion/importacion.repository.js` |
| T12 | Hecha | `back/src/application/compartido/ganchos.schema.js` · `back/src/application/posiciones/posiciones.controller.js` · `back/test/application/ganchosSchema.test.js` |
| T4 | Hecha | `back/src/application/importacion/importacion.schemas.js` (nuevo) · `importacion.controller.js` (queda solo con handlers) · `back/test/application/importacionSchemas.test.js` |
| T14 | Hecha | `front/src/types/gancho.ts` · `front/src/domain/ganchos/gancho.ts` + `.test.ts` |
| T16 | Hecha | `front/src/domain/accesorios/codigoAccesorio.ts` + `.test.ts` |
| T6 | Hecha | `front/src/types/{importacionProductos,posicion,skuVersion,implementacion,extractorPdfPlanograma}.ts` |
| T7 | Hecha | `front/src/utils/excelProductosPlanograma.ts` + `.test.ts` |
| T15 | Hecha | `PosicionLienzo`, `GondolaEscalaLienzo`, `GondolaFrameLienzo`, `NivelFilaLienzo`, `DetalleGondolaPanel`, `PosicionesSku`, `PosicionDrawer`, `columnasProductos.ts`, `ProductosImplementacionTable`, `importacionPdf.ts`, `RevisionCuerpoPdf.tsx` (ver rutas en `git status`) |
| T8 | Hecha | `ImportarExcelProductosModal.tsx` y `.css` · `front/.stylelintrc.json` (el `.css` sale de la lista legacy) |
| T9 | Hecha (sin correr) | `postman/planogramas-import.postman_collection.json` |
| T10 | No corresponde (la hace el coordinador) | — |
| T5 | Retirada en el plan | — |

## Verificación

- `cd back && npm test`: 95 pruebas, 95 ok, 0 fallas (nuevas: gancho, ganchosSchema, importacionSchemas, importacion, skuVersion).
- `cd front && npm test`: 7 archivos, 56 pruebas ok. `npx tsc -b`: sin errores.
- `cd front && npm run lint`: oxlint sin hallazgos; stylelint termina con 26 errores y 443 advertencias, todos en CSS ajenos a este cambio (`usar-adjuntos`, `zona-arrastre`, `asignar-sku-modal`, `ResumenBorradorModal`, etc.). Ninguno en archivos tocados; el CSS del modal ya pasa sin la excepción legacy.
- Postman: el JSON es válido (`JSON.parse`). La colección conserva el formato (indentación 2, CRLF). Con `git diff --patience` el cambio es +775/-3 líneas (el diff por defecto lo muestra inflado).
- Greps: no hay `map(Number)` sobre ganchos en `back/src`. El único `JSON.parse` de ganchos está en `domain/compartido/gancho.js`. Los dos `Math.min(...ganchos.map(numeroGancho))` restantes (`importacion.entity.js`, `columnasProductos.ts`) usan el helper, como pide R2-7; el extractor de PDF queda exento.
- Prueba con datos reales (solo lectura, vía `interpretarHojaProductos`):
  - TG-12: 45 productos, 0 errores, planograma `LIMPIEZA TG-12`. El SKU 1111754 sale con `2 × VDA-22R-PTH · 22"`. Hay 45 orígenes de accesorio. Se omiten 2689 filas por no traer facings ni ganchos.
  - TG-26: 73 productos, 0 errores. Los ganchos de exhibición se leen bien. SKU 852312: `[54, 94, 64, 95, 65, "54E", 66, 88, …]` con facings 12 (la fila trae Facings, los `E` no cuentan). SKU 1046638: `[41, "41E"]` con facings 1.
  - Ninguno de los dos archivos tiene celdas que ahora bloqueen; el riesgo de "archivos que antes pasaban" no se materializó con ellos.

## Consulta SQL pendiente (S13, bloqueante antes de publicar)

No se ejecutó. Correr en DEV (`OTB`) y en PROD (`db-planogramas`); debe devolver 0 filas en ambos. Consulta corregida por seguridad (I-1 de `05_revision_seguridad.md`; la anterior daba falsos positivos con `54E`). Anotar el resultado en `06_revision_seguridad.md`.

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

## Desviaciones respecto al plan

1. `enteroCelda`: un texto decimal (`10.5`, `10,5`) devuelve "no es un número válido" y no "más de un número". La regla literal (más de un grupo de dígitos) lo habría etiquetado mal, y la tabla de textos del plan lo pide como "no es un número válido". Un `10 // 12` o `10 y 12` sí sigue como "más de un número".
2. `textoGanchos` (front) no ordena antes de armar el rango; conserva la lógica original de `PosicionLienzo` (el rango solo si vienen continuos y normales, en el orden recibido). El plan decía "mueve la lógica"; los ganchos se muestran en el orden guardado (el back los conserva en el orden del Excel o del drawer), de modo que el rango `04–07` solo sale si ya vienen continuos.
3. `importacion.usecases.js` borra su `errorUnprocessable` local y usa el de `importacion.entity.js`, que acepta `details` (el plan lo indica en T2). Se exportó `errorBadRequest` desde la entidad.
4. Postman (T9):
   - El primer request de la carpeta usaba `accesorio_codigo: "NO-EXISTE-PM"` y esperaba advertencia. Ahora sería 422, así que se quitó ese accesorio. Esa fila sigue en formato legado, con el accesorio real. El test de advertencias ahora comprueba solo el SKU inexistente y que no haya advertencia de accesorio.
   - El caso 6 (`GET /skus` con `ganchosPorPosicion`) se verifica en la carpeta de importar productos, con la posición que ese flujo crea. En `PATCH /posiciones/:id` no hay `versionId` del flujo.
   - Los casos 1 y 6 usan `skuSinDimensiones` y ganchos `[901, "902E"]`. Los 422 se ejecutan antes de importar ese SKU, de modo que el `GET /skus` posterior comprueba que no se creó nada.
   - Se agregó la variable de colección `posicionIdImportacionProductos` (se llena en la corrida).
   - En `PATCH /posiciones/:id` se agregó un último request que restaura los ganchos `[4, 9, 14, 19]`, para no alterar escenarios posteriores.
   - Casos agregados: ver los 11 requests nuevos en la carpeta de importar productos y 6 en la de PATCH. La carpeta de importar productos sigue la numeración existente de 4xx.
5. Se usó el helper `ed.js` en `scratchpad` para respetar los finales de línea CRLF de los archivos existentes. Los archivos nuevos del front y del back son LF; los reescritos (`excelProductosPlanograma.ts` y el modal `.tsx`) se devolvieron a CRLF para no ensuciar el diff.

## Bloqueos

Ninguno.

## Deuda detectada

Las deudas DT-20 a DT-31 ya están consolidadas en el plan para T10. Además:
- Stylelint tiene 26 errores y 443 advertencias preexistentes fuera de este cambio (ver Verificación); no hay ID asignado en `DEUDA_TECNICA.md` (el coordinador puede decidir si lo registra).
- (Resuelta en la ronda 1, B2.) El texto decimal o negativo en una celda de gancho ahora es error.

## Pruebas manuales pendientes (Verificación final del plan)

Quedan por hacer en DEV por una persona: los pasos 1 a 7 de "Prueba manual en DEV" (modal con los Excel reales, vista de errores, "Dar de alta", importar layout con Por ubicar, drawer con `4, 54E`) y la corrida de Postman completa contra DEV.

## Correcciones ronda 1

| Hallazgo | Cambio |
|---|---|
| B1 (calidad) | `GondolaEscalaLienzo.tsx` (`PosicionEscala`): se reparte por facing solo `ganchos` normales; los de exhibición (`E`) se muestran juntos en el último facing con la misma clase `gondola-escala__gancho`. El `title` de la posición (colocada y pendiente) agrega `· ganchos <textoGanchos>`. La rama pendiente muestra `textoGanchos(todos)` en vez de solo el primero. Sin CSS nuevo. |
| B2 (calidad) | `ganchosCelda` (`excelProductosPlanograma.ts`): antes del split, un texto con decimal (`/\d\.\d/`) o que empieza con signo negativo (`/^\s*-\s*\d+/`) devuelve "Gancho inválido". `166-167` y `168,169` siguen igual. Prueba: `ganchosCelda('54.5')`, `('-3')` y `('54.5 \| 65')` → error (`excelProductosPlanograma.test.ts`). |
| I1 (calidad) | `cruzarConPorUbicar` (`importacion.entity.js`): el reparto de facings cuenta solo ganchos normales (numéricos) en `pos.ganchos`, `resto` y el denominador (`normales(fuente) \|\| fuente.length`); `max(1, …)` se mantiene. Prueba nueva en `back/test/domain/importacion.test.js` (`[65, 66, "54E"]`, 2 facings, espacio `[65, 66]` → 2 facings; el resto `["54E"]` queda con 1). Se corrigió la expectativa de la prueba existente (espacio `[65]` con `[65, "54E"]` y 2 facings ahora recibe 2, antes 1 por el defecto). |
| I2 (calidad) | `useAccesorios` expone también `fallo`. `ImportarExcelProductosModal.tsx`: mientras el catálogo carga no se listan faltantes y Importar queda deshabilitado; si falló, se omite la verificación del front y decide el back (422 con `details.codigos`, que el modal ya maneja). |
| I-1 (seguridad) | La consulta S13 de este archivo se reemplazó por la versión con `OPENJSON` de seguridad. |
| M1 (natural) | Corregida la nota de la desviación 2 (orden guardado). Falta reflejarlo en `ESTADO_MODULOS.md` (T10, coordinador). |

Deuda a registrar en T10: `GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no se montan en ninguna página (la única vista es `GondolaEscalaLienzo`); revisar si son código muerto.

Resultados: `cd back && npm test` 96/96 ok. `cd front && npm test` 56/56 ok. `npx tsc -b` sin errores. `npx oxlint` sin errores (solo advertencias preexistentes en archivos ajenos).

## Corrección final (coordinador, tras ronda 2)

- **B1-R2** (`05_revision_calidad.md`, Ronda 2): la etiqueta de ganchos de exhibición tapaba la del gancho normal en el último facing. Se agregó el modificador `.gondola-escala__gancho--exhibicion { top: auto; bottom: 1px; }` en `GondolaEscalaLienzo.css` y se aplica al span de los `E` en `GondolaEscalaLienzo.tsx`. Aprobado por el usuario para aplicarse sin otra ronda.
- Verificación: `npx tsc -b` sin errores; front 56/56; back 96/96; oxlint sin errores; stylelint del CSS sin errores (25 advertencias preexistentes, ninguna en las líneas nuevas).
- No verificado visualmente en el navegador: no hay posiciones con ganchos `E` en DEV hasta importar el Excel TG-26.
