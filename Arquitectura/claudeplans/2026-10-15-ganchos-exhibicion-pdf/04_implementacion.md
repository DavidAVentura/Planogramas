# 04 — Implementación: ganchos de exhibición en el extractor de PDF (DT-27)

## Tareas

| ID | Estado | Archivos |
|---|---|---|
| T1 | Completa | `back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js` |
| T2 | Completa | `back/test/agents/extractorPdfPlanograma.test.js` (nuevo) |
| T3 | Completa (el caso bloqueado quedó documentando el comportamiento actual, ver Decisión del coordinador) | `back/test/domain/importacion.test.js`, `back/test/application/importacionSchemas.test.js` |
| T4 | Completa | `front/src/types/extractorPdfPlanograma.ts` |
| T5 | Completa | `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/importacionPdf.ts` |
| T6 | Completa | `.../ExtractorPdfPlanogramaModal/importacionPdf.test.ts` (nuevo) |
| T7 | Editada y JSON válido; NO ejecutada contra el back | `postman/planogramas-import.postman_collection.json` |
| T8 | No se hizo (lo hace el coordinador) | — |

## Verificación

- `cd back && npm test`: 112 tests, 112 pass, 0 fail (tras la decisión del coordinador).
- `cd front && npm test`: 8 archivos, 61 tests pass. `npx tsc -b`: sin errores.
- `npm run lint`: oxlint sin errores en mis archivos; los 26 errores y 443 avisos son de stylelint en CSS preexistentes (no toqué CSS).
- `grep -nE "Number\.isInteger|map\(Number\)|a - b"` sobre el agente: sin coincidencias. `grep -rn dangerouslySetInnerHTML front/src`: sin resultados.
- Postman: `JSON.parse` de la colección OK. No pude correr la carpeta `20` (el worktree no tiene `.env` ni BD/servidor), así que el paso 0 (si `404 - Por ubicar quedó vacía` ya fallaba antes) y las dos corridas seguidas quedan **pendientes**.
- Hice `npm install` en `back/` y `front/` del worktree (no existía `node_modules`).

## Desviaciones

- `normalizarEspacios` recibe `descartados = []` por defecto (el plan lo pide sin default) para no romper llamadas sin colector.
- Postman: los nuevos requests 400 usan `"nombre_detectado": "leido del PDF"` (sin tilde) en el cuerpo; no afecta la validación.
- El nuevo `200 - El gancho 902E cruzó...` valida solo `ganchos` y `ubicaciones` (el plan permitía omitir `ganchosPorPosicion` si no se expone; no verifiqué si la respuesta lo expone).

## Bloqueos

- **T3, caso "dos espacios 54E y un solo producto → llenados === 1" (abuso 5)**: falla contra el código real. `cruzarConPorUbicar` (`importacion.entity.js`) llena los dos espacios con el mismo producto (`llenados === 2`); `usados` solo sirve para limpiar "Por ubicar", no para impedir el reuso. El plan prohíbe tocar `importacion.entity.js` y dice que esto es un bug a reportar. El test se dejó como `{ todo: ... }` (no rompe `npm test`) con un comentario. Además contradice la nota de DT-30 del plan ("el cruce lo mitiga con `usados`"): no lo mitiga. Esto afecta cualquier gancho repetido (no solo `E`). Hace falta decisión del coordinador: corregir el cruce (permitir un uso por producto/gancho) o ajustar la expectativa y DT-30.

## Deuda detectada

- El hallazgo anterior sobre `cruzarConPorUbicar` y gancho repetido entre espacios (DT-30): el texto de T8 debe reflejar que hoy no hay mitigación.
- Postman T7 sin ejecutar (ver Verificación).

## Decisión del coordinador (post-implementación)

El bloqueo de T3 (dos espacios `54E` con un solo producto) es comportamiento preexistente que también ocurre con ganchos enteros. La prueba documenta el comportamiento actual (`llenados === 2`) y se registra en DT-30 durante T8. No se toca `importacion.entity.js`.
