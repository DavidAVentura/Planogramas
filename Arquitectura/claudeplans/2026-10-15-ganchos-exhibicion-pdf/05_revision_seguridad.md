# 05 — Revisión de seguridad del diff: ganchos de exhibición en el extractor de PDF (DT-27)

Alcance revisado: `git diff b5efe60` (6 archivos) más los archivos sin seguimiento
`back/test/agents/extractorPdfPlanograma.test.js` e `importacionPdf.test.ts`, contrastados con `02_seguridad.md`,
`PLAN.md` y la "Decisión del coordinador" de `04_implementacion.md`.

## Resultado

**0 Bloqueantes, 2 Importantes (son verificaciones pendientes, no defectos del código) y 3 Menores.** El código cumple
los controles C1 a C10.

## Verificación de controles

| # | Estado | Evidencia |
|---|---|---|
| C1 | Cumple | `extractorPdfPlanograma.js:345-369`: todo gancho pasa por `normalizarGancho`. `grep -nE "Number\.isInteger\|map\(Number\)\|a - b\|parseInt"` sobre el agente no devuelve nada. La prueba de `ganchosDelEspacio` con los 12 tokens de `02` da `[7, "54E"]` y 7 descartados. |
| C2 | Cumple | `importacion.schemas.js` y `ganchos.schema.js` no cambian. Las pruebas unitarias nuevas (`importacionSchemas.test.js:84-99`) pasan. Con un script validé los 4 cuerpos 400 nuevos de Postman contra `schemaImportar`: el único error está en `...posiciones.0.ganchos`, y con `[54, "54E"]` el cuerpo es válido. Eso descarta un 400 falso por otro campo. |
| C3 | Cumple | Back: `importacion.test.js:174-186` prueba los dos sentidos. Front: `importacionPdf.test.ts`, bloque `fuentePorUbicar`, prueba los tres casos. El `Map<Gancho,…>` distingue `54` de `"54E"` porque los tipos difieren. |
| C4 | Cumple | `extractorPdfPlanograma.js:357`: `/\s+(?=E$)/i`. Prueba: `"5 4"` → descartado. |
| C5 | Cumple | `MAX_GANCHOS_ESPACIO = 100` y el `slice` de l. 368. La advertencia del nivel está en l. 376. |
| C6 | Cumple | Se normaliza en l. 372 antes del `sort` de l. 381. El comparador devuelve `0` cuando las dos claves son `Infinity` (l. 386), así que no da `NaN`. |
| C7 | Cumple | l. 399. |
| C8 | Cumple | `citarGancho` (l. 334-338). La advertencia llega a los `<li>{a}</li>` de `ExtractorPdfPlanogramaModal.tsx:143` y `RevisionCuerpoPdf.tsx:181`, y al toast como texto. `grep -rn dangerouslySetInnerHTML front/src` no devuelve nada. |
| C9 | Cumple | l. 346 y l. 349-352. |
| C10 | Cumple | `importacionPdf.ts`, `rangoGanchos` y `notasNivel`. La reserva de `', …'` garantiza que `texto + ', …' ≤ maxLargo`. Cuando `prefijo.length ≤ 198`, `maxLargo` es al menos 2, así que el `'…'` final siempre entra. |
| C11 | **Pendiente** | Ver I-1. |

Pruebas: `cd back && npm test` da 112/112 pass y 0 todo. El caso de DT-30 ya no está en `todo`: ahora documenta
`llenados === 2`. `npx vitest run .../ExtractorPdfPlanogramaModal` da 5/5 pass.

## Hallazgos

### Importante

**I-1. C11 sin verificar: la prueba manual en DEV con un PDF real es obligatoria antes del merge.**
- Dónde: el prompt de `extractorPdfPlanograma.js:167-173` y la Verificación final de `PLAN.md`.
- Escenario: el modelo agrega una `E` que no está impresa. Por ejemplo, lee `54` como `"54E"`. En ese caso el espacio
  cruza con el producto `"54E"` de "Por ubicar". Al importar con `usar_por_ubicar`, el producto **se mueve** y su fila
  de "Por ubicar" **se borra**, y el gancho `54` real queda vacío. Ningún control del back lo detecta, porque `"54E"`
  es canónico.
- Corrección: antes del merge, correr los pasos 1 a 3 de la Verificación final (un PDF con `54E`, como TG-26, y uno
  sin `E`) y dejar el resultado en `04_implementacion.md`.

**I-2. Postman T7 sin ejecutar (paso 0 y las dos corridas seguidas).**
- Dónde: `postman/planogramas-import.postman_collection.json`, el request
  `201 - Llena los espacios con los productos del Excel por gancho` (`desdePorUbicar` 7, `totalPosiciones` 8) y el
  nuevo `200 - El gancho 902E cruzó con su producto y el 902 no`.
- Escenario: si el producto `[901, "902E"]` no llega a "Por ubicar" de `versionIdImportacionProductos` en ese orden de
  la colección, `desdePorUbicar` queda en 5. Entonces fallan el 201 y el `404 - Por ubicar quedó vacía`. Además, C3
  queda verificado de punta a punta solo en las pruebas unitarias y no contra la BD. Como `desdePorUbicar === 7`
  (y no 8) es la única aserción de que `[902]` **no** cruzó, ese 201 tiene que correr de verdad.
- Corrección: correr la carpeta `20` dos veces contra DEV antes del merge y anotar en `04` el resultado del paso 0.

### Menor

**M-1. Abuso 5 de `02_seguridad.md`: un gancho repetido entre espacios coloca el mismo producto dos veces. Hay
mitigación parcial y la deuda queda aceptada.**
- Dónde: `importacion.entity.js:207-240` (no se toca) y `importacion.test.js:189-195`.
- Escenario: el PDF (mal leído) trae dos espacios `["54E"]`. `cruzarConPorUbicar` llena los dos con el mismo SKU,
  copia `min/max`, `capacidad_maxima` y `accesorios` en las dos posiciones y borra una sola vez la fila de "Por
  ubicar". El planograma queda con el producto duplicado. `usados` **no** lo impide. La afirmación de `02` §4 y de
  `PLAN.md` T8 ("el cruce lo mitiga con `usados`") es incorrecta. La mitigación real es otra: la advertencia
  "Números de gancho repetidos" del agente, que ahora sí distingue `54` de `"54E"`, y la revisión del usuario.
- Decisión aceptada (coordinador): es comportamiento previo y pasa igual con enteros. Este cambio no lo agrava: antes,
  un `54E` leído como `54` podía chocar con el `54` real. La prueba fija el comportamiento actual.
- Corrección: en T8, el texto de DT-30 debe decir que **no hay mitigación en el cruce**, solo la advertencia del
  agente. También debe cubrir al cliente directo de `importar-layout`, que no pasa por esa advertencia.

**M-2. Una cita de descartados con coma se lee como dos ganchos.**
- Dónde: `extractorPdfPlanograma.js:336` (`citarGancho`) y l. 467 (`join(', ')`).
- Escenario: el modelo devuelve el token `"54,55"` (dos números en un solo ítem). La advertencia dice
  `Ganchos ilegibles descartados: 54,55, 7A.`, y el usuario entiende que se descartaron `54` y `55` por separado, no que
  hubo un token mal formado. Es solo un efecto visual: nada se persiste.
- Corrección opcional: citar cada token entre comillas (`"54,55"`) o reemplazar `,` por `·` en `citarGancho`.

**M-3. `datos_vision.ganchos_pdf` y `moduleId` ahora pueden llevar texto, y siguen sin validarse en el back.**
- Dónde: `importacionPdf.ts`, `datosVision` (sin cambios), y `importacion.schemas.js`
  (`Joi.object().unknown(true)`).
- Escenario: un cliente directo manda `datos_vision.ganchos_pdf: ["54A", "x".repeat(1e5)]`, que se guarda sin
  normalizar. Hoy nadie lo lee para cruzar ni hacer cálculos, así que no hay impacto. El tope de 100 del agente baja
  el tamaño en el flujo normal.
- Corrección: ya está planificada como DT-40 en T8. Confirmar que quede registrada.

## Deuda detectada

- Corregir DT-30 según M-1. `02_seguridad.md` §4 queda superado por esta revisión en ese punto.
- DT-40 (M-3) y DT-39 (extractor de imagen numerada), como propone T8.
