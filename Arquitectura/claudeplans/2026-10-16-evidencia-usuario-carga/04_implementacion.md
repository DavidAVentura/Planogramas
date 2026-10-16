# 04 — Implementación: autor de la carga (código y nombre) en evidencias y adjuntos

Rama `feat/evidencia-usuario-carga` (worktree `surtido-planogramas-evidencia`), base `aab40fc`. Sin commits.

## Tareas

| ID | Estado | Archivos |
|---|---|---|
| T1 | Hecha (no aplicada a ninguna BD) | `back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js` |
| T2 | Hecha | `back/src/domain/compartido/autor.js`, `back/test/domain/autor.test.js` |
| T3 | Hecha | `back/src/domain/evidencia/evidencia.usecases.js`, `.../evidencia.repository.js` (JSDoc), `back/src/infrastructure/repositories/evidencia.repository.js`, `back/test/domain/evidencia.test.js` |
| T4 | Hecha | `back/src/domain/adjunto/adjunto.usecases.js`, `.../adjunto.repository.js` (JSDoc), `back/src/infrastructure/repositories/adjunto.repository.js`, `back/test/domain/adjunto.test.js` |
| T5 | Hecha | `back/src/application/evidencias/evidencias.controller.js`, `back/src/application/adjuntos/adjuntos.controller.js`, `back/src/infrastructure/repositories/pruebas.repository.js` |
| T6 | Hecha (sin correr en DEV: falta la 018) | `postman/planogramas-import.postman_collection.json` |
| T7 | Hecha | `front/src/types/evidencia.ts`, `front/src/types/adjunto.ts`, `front/src/utils/autorCarga.ts`, `front/src/utils/autorCarga.test.ts` |
| T8 | Hecha | `EvidenciaModal.tsx`, `MontajeTiendaModal.tsx`, `UsarAdjuntos.tsx` + `.css`, `VersionResumenModal.tsx` + `.css` |
| T9 | No corresponde (docs, va en el cierre) | — |

## Verificación

- `cd back && npm test`: 204 pruebas, 0 fallos (incluye `matrizPermisos.test.js` sin cambios).
- `cd front && npm test`: 110 pruebas, 0 fallos. `npx tsc -b`: sin errores.
- `npm run lint`: 469 problemas (29 errores, 440 avisos), igual que sin mis cambios (`git stash`);
  los errores de `UsarAdjuntos.css` (líneas 25, 35, 87, 106, 119) son preexistentes y no están en las líneas tocadas.
- `grep -rn dangerouslySetInnerHTML front/src`: vacío.
- Postman: JSON válido tras la edición (comando de la sección 1 del estándar).
- Pendiente (necesita BD DEV): `migrate` → `migrate:rollback` → `migrate` y consulta a `sys.columns` (C-10),
  y correr la carpeta "17 - Evidencias". No se aplicó la migración, por instrucción.

## Desviaciones del plan

- `formatearAutor` acepta `nombre: string | null | undefined` (el plan decía `string | null`): cubre el
  caso "front desplegado antes que el back" del apartado Riesgos (el campo llega `undefined`).
- `VersionResumenModal.tsx`: el `map` de adjuntos pasó de retorno implícito a bloque con `return` para
  calcular `detalle` (indentación del JSX interno sin reformatear, para no inflar el diff).
- Prueba del emoji (C-04): además del caso "emoji dentro del límite" se probó el emoji que empieza justo
  en el punto 150 (se descarta completo).

## Bloqueos

Ninguno.

## Deuda detectada

Sin deuda nueva respecto a la ya listada en "Notas para el cierre" del plan. Observaciones:
- `UsarAdjuntos.css` conserva 5 errores de stylelint preexistentes (DT-02, CSS legacy).
- `evidencia.usecases.js`: la clave `subido_por_nombre:` rompe la alineación de columnas de
  `formatearEvidencia` (estético; el plan fija el orden de claves).

## Correcciones ronda 1

| Hallazgo | Corrección | Archivos |
|---|---|---|
| I-01 (seguridad) | El recorte del nombre cuenta unidades UTF-16 (`.length`, como `nvarchar(150)`) y no parte pares sustitutos: se acumulan puntos de código mientras `recorte.length + caracter.length <= 150`. Pruebas: `'A'*149 + 😀` → `'A'*149`; `'A'*148 + 😀` se conserva (150 unidades); `😀*200` → 150 unidades sin sustitutos sueltos. | `back/src/domain/compartido/autor.js`, `back/test/domain/autor.test.js` |
| M-01 (seguridad) / M-04 (calidad) | Saneado con `\p{Cf}` (se eliminan: ancho cero, bidi, BOM; así `JU​AN` da `JUAN`) y `\p{Cc}` (se vuelve espacio, para no pegar palabras separadas por tab o salto de línea). Prueba nueva con U+200B, U+061C y U+FEFF. | mismos |
| M-02 (seguridad) | La aserción de Postman usa `x.subido_por_nombre.length`. | `postman/planogramas-import.postman_collection.json` |

Verificación: `back npm test` 205/205; `front npm test` 110/110. I-02 (aplicar la 018 antes de publicar) sigue siendo paso del cierre; no se aplicaron migraciones.
