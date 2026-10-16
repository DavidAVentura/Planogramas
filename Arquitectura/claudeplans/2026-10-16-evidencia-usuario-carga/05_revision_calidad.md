# 05 — Revisión de calidad: autor de la carga (código y nombre) en evidencias y adjuntos

Alcance: `git diff aab40fc` + archivos nuevos sin rastrear (worktree `surtido-planogramas-evidencia`),
contra `PLAN.md` y `04_implementacion.md`. Ronda 1.

## Verificación ejecutada por el revisor

- `cd back && npm test`: 204 pruebas, 0 fallos.
- `cd front && npx vitest run src/utils/autorCarga.test.ts`: 8/8. `npx tsc -b`: sin errores.
- `oxlint` sobre los archivos TS/TSX tocados: sin errores. `stylelint` sobre `UsarAdjuntos.css` y
  `VersionResumenModal.css`: los 5 errores de `UsarAdjuntos.css` (líneas 25, 35, 87, 106, 119) son
  preexistentes y ninguno cae en las líneas tocadas (DT-02).
- Confirmado: `validarConJoi` y `validarBody` usan `stripUnknown: true`, así que el body con
  `subido_por`/`subido_por_nombre` de la prueba Postman da 201 y no 400; el middleware
  `autenticacion.js:34` garantiza `numeroEmpleado`, así que `usuarioAuditoria` nunca cae en
  `USUARIO_SISTEMA` con un usuario autenticado; no hay otros llamadores de `agregarEvidencia`,
  `agregarAdjunto` ni `reemplazarAdjunto` con la firma vieja; los `select` de los repositorios de
  evidencias y adjuntos no listan columnas explícitas (la columna nueva llega a `mapEvidencia`/`mapAdjunto`);
  `actualizarArchivo` hace `update(campos)` sin filtrar; la regex de `autor.js` contiene exactamente
  U+200E, U+200F, U+202A–U+202E y U+2066–U+2069; la 018 no choca con la numeración de
  `feat/migracion-prod-por-archivo` ni de `origin/develop` (ambas terminan en 017).
- Los anchos de `.evidencia-foto` y `.montaje-foto` son fijos (152px), así que la elipsis del autor
  funciona; `.visor-imagenes__pie` no tiene `nowrap` y envuelve, como pide el plan.

## Hallazgos

### Bloqueantes

Ninguno.

### Importantes

**I-01 — Criterios de aceptación de T1 y T6 sin verificar**
`back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js`,
`postman/planogramas-import.postman_collection.json:21256, 21418`
- Problema: `04_implementacion.md` dice que la 018 no se aplicó en DEV y que la carpeta 17 de Postman
  no se corrió. Faltan los criterios "migrate → rollback → migrate", "`sys.columns` nvarchar(150) NULL"
  (C-10) y "la carpeta 17 corre completa en DEV".
- Escenario: si el back se despliega a DEV sin la 018, todo `INSERT` de evidencias y adjuntos falla
  por columna inexistente (la subida de fotos y la confirmación de adjuntos quedan rotas).
- Corrección: antes de integrar a `develop`, aplicar la 018 en DEV, correr el ciclo de rollback,
  consultar `sys.columns` y correr la carpeta "17 - Evidencias"; anotar los resultados en
  `04_implementacion.md` y en la tabla de migraciones (DEV) en el cierre. No es un defecto del
  código, pero sin esto la tarea no cumple sus criterios de aceptación.

### Menores

**M-01 — Faltan dos casos de prueba del plan en `adjunto.test.js`**
`back/test/domain/adjunto.test.js`
- Problema: T4 pide "nombre `null` → `subido_por_nombre: null`"; la prueba cubre "nombre igual al
  número", no `null`. Tampoco se prueba C-01 en `reemplazarAdjunto`: el plan solo exige que el reemplazo
  sobrescriba al autor, pero una regresión que tomara el autor de `datos` en el reemplazo no se detectaría.
- Corrección: agregar `{ numero: '100702', nombre: null }` en `agregar` y un caso de `reemplazar` con
  `datos` que traiga `subido_por: '999'` y `subidoPorNombre: 'FALSO'`. El riesgo es bajo porque
  `normalizarAutor` ya cubre `null` en `autor.test.js`.

**M-02 — `formatearAutor` se calcula dos veces por foto en el montaje**
`front/src/components/dominio/modales/MontajeTiendaModal/MontajeTiendaModal.tsx:28` y `:45`
- Problema: `aFoto` ya calcula `autor` para el pie del visor, y `Miniatura` lo vuelve a calcular a partir
  de `foto.evidencia`. Es duplicación menor, sin efecto en el rendimiento.
- Corrección: agregar `autor: string` a `FotoMontaje` en `aFoto` y usar `foto.autor` en `Miniatura`.

**M-03 — `title` del detalle tapa el aviso "Supera el máximo" en `UsarAdjuntos`**
`front/src/components/dominio/UsarAdjuntos/UsarAdjuntos.tsx:99`
- Problema: el `<button>` tiene `title="Supera el máximo de …"` cuando `excede`. Ahora el
  `<span className="usar-adjuntos__detalle" title={detalle}>` hijo tiene su propio `title`, y al pasar el
  cursor sobre esa línea el navegador muestra el detalle en lugar del aviso. El plan pedía ese `title`,
  así que el código lo cumple; esto es solo un efecto de UX.
- Escenario: un adjunto demasiado pesado. Al pasar el cursor sobre la línea de tamaño, fecha y autor no
  aparece el motivo del bloqueo (sí aparece sobre el nombre y sobre "Muy pesado").
- Corrección opcional: poner `title={excede ? undefined : detalle}` en el span, o sumar el aviso al
  texto del `title`.

**M-04 — Saneado del nombre: invisibles fuera de la lista y combinantes en el corte**
`back/src/domain/compartido/autor.js:10, 15`
- Problema: U+200B (espacio de ancho cero), U+FEFF y U+2028 no están en la lista: los primeros pasan
  tal cual y U+2028 se convierte en espacio porque entra en `\s`. Además, el recorte por puntos de código
  puede separar una letra base de su diacrítico combinante (NFD) justo en la posición 150. El código
  sigue exactamente la regla del plan (C-05) y no hay riesgo de seguridad (React escapa el texto).
- Corrección opcional (o deuda Baja): cambiar la clase por `[\p{Cc}\p{Cf}]` y aplicar
  `normalize('NFC')` antes del recorte.

**M-05 — `tipoTitulo` con guiones y apóstrofos**
`front/src/utils/autorCarga.ts:15-19`
- Problema: `MARÍA-JOSÉ` sale como `María-josé` y `O'NEILL` como `O'neill`. Es una limitación de
  la misma clase que la aceptada en el plan (`McDonald`).
- Corrección opcional: capitalizar también después de `-` y `'` (por ejemplo,
  `replace(/(^|[\s'-])(\p{L})/gu, …)`), o documentarlo junto a la limitación aceptada.

**M-06 — Indentación del JSX en `VersionResumenModal`**
`front/src/components/dominio/modales/VersionResumenModal/VersionResumenModal.tsx:201-216`
- Problema: al pasar de retorno implícito a bloque, el `<li>` quedó con la indentación anterior (es una
  desviación declarada). El linter no lo marca, pero deja el bloque desalineado para el próximo que lo lea.
- Corrección opcional: reindentar las líneas 205-215 un nivel.

## Cumplimiento del plan

| Tarea | Resultado |
|---|---|
| T1 Migración 018 | Código conforme (idempotente, reversible, cabecera); verificación en DEV pendiente (I-01) |
| T2 `normalizarAutor` | Conforme con C-02, C-04, C-05 y C-11; pruebas completas |
| T3 Evidencias | Conforme: `normalizarAutor` corre antes de validar y de subir el blob; orden de claves del contrato verificado por prueba (C-07) |
| T4 Adjuntos | Conforme: se quitó el respaldo `'sistema'`; faltan dos casos de prueba (M-01) |
| T5 Controllers y fixture | Conforme: no hay logs nuevos con el nombre (C-08); `listar`/`eliminar` siguen con `usuarioActual` |
| T6 Postman 17 | Asserts conformes; sin correr (I-01) |
| T7 `formatearAutor` | Conforme. La desviación `string \| null \| undefined` está justificada |
| T8 UI | Los cuatro puntos están cubiertos; truncado y `title` correctos; el visor envuelve; sin `dangerouslySetInnerHTML` |
| T9 Docs | Fuera de este diff (cierre) |

Arquitectura: el dominio no depende de Express ni de Knex, el autor se arma en el controller y la
lógica vive en los casos de uso. En el front no hay `fetch` nuevo ni tokens o valores literales nuevos
en el CSS.

## Deuda detectada

No hay deuda nueva además de la que ya lista el plan. Si M-04 no se corrige, registrarla como Baja (back).

## Veredicto

**Aprobado con menores.** El código cumple el plan y no tiene defectos bloqueantes. I-01 es una
verificación operativa (migración en DEV y corrida de Postman) que debe quedar hecha antes de integrar a
`develop`.
