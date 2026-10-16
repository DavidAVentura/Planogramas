# 05 — Revisión de seguridad e integridad del diff

- **Fecha**: 2026-10-16 · **Worktree**: `surtido-planogramas-evidencia` · **Diff**: `git diff aab40fc` + archivos nuevos sin seguimiento
- **Contra**: `02_seguridad.md` (C-01 a C-13) y `PLAN.md`
- **Pruebas corridas**: `back/ npm test` → 204/204 pasan; `front/ npx vitest run src/utils/autorCarga.test.ts` → 8/8 pasan;
  `grep -rn dangerouslySetInnerHTML front/src` → vacío.

## Veredicto

**Aprobado con cambios importantes.** No hay bloqueantes. Los controles C-01, C-02, C-03, C-05, C-06, C-07, C-08 y C-11
están implementados y probados. Quedan dos puntos Importantes: el recorte de C-04 mide en puntos de código, pero la
columna mide en unidades UTF-16 (I-01), y el orden de despliegue de la 018 respecto del back (I-02).

## Bloqueantes

Ninguno.

## Importantes

**I-01. El recorte a 150 cuenta puntos de código, pero `nvarchar(150)` cuenta unidades UTF-16: con un emoji o un carácter
fuera del plano básico el `INSERT` sigue fallando (C-04 incompleto).**
- Ubicación: `back/src/domain/compartido/autor.js:15` (`[...limpio].slice(0, LONGITUD_MAXIMA_NOMBRE_AUTOR)`).
  La propia prueba lo confirma: `back/test/domain/autor.test.js:40-44` espera `'A'.repeat(149) + '😀'`, que son
  **151** unidades UTF-16.
- Escenario: un `username` de CAO de 150 o más puntos de código que incluye al menos un carácter suplementario
  (emoji o CJK extendido) se recorta a 150 puntos de código y ocupa entre 151 y 300 unidades. En SQL Server, `nvarchar(n)`
  limita a `n` pares de bytes y cada carácter suplementario ocupa dos, con o sin collation `_SC`. El `INSERT` da el
  error 2628 (truncamiento) y la respuesta es un 500. En evidencias el blob se borra en el `catch`. En adjuntos
  **no se borra**: el archivo subido por SAS queda huérfano y, en `reemplazarAdjunto`, el archivo nuevo queda sin fila. Ese
  usuario no puede cargar nunca. La probabilidad es baja, porque el nombre lo controla CAO y no quien usa la herramienta, pero
  es justo el caso que C-04 debía cerrar.
- Corrección: recortar por unidades UTF-16 sin partir pares sustitutos. Por ejemplo, acumular puntos de código mientras
  `acumulado.length + cp.length <= 150` y luego aplicar `trim`. Cambiar la prueba para que exija `r.length <= 150`, por ejemplo
  `'A'.repeat(149) + '😀'` → `'A'.repeat(149)`, y que no queden sustitutos sueltos.

**I-02. Si el back sale sin la 018 aplicada, toda carga de evidencias y adjuntos responde 500.**
- Ubicación: `back/src/domain/evidencia/evidencia.usecases.js` (`crear` con `subido_por_nombre`),
  `back/src/domain/adjunto/adjunto.usecases.js` (`crear` y `actualizarArchivo`) y
  `back/src/infrastructure/repositories/pruebas.repository.js:121` (los fixtures de Postman también fallan). Según
  `04_implementacion.md:9,27`, la 018 **no se aplicó en ninguna BD**.
- Escenario: se hace merge a `develop` y se empuja al fork. GitHub Actions despliega `planogramas-api-dev`, pero la 018 no
  está en `OTB`. Todo `POST` de evidencias falla con "Invalid column name 'subido_por_nombre'" y lo mismo pasa con las
  confirmaciones de alta y reemplazo de adjuntos, que además dejan el blob huérfano. Lo mismo ocurre en PROD
  (`db-planogramas` tiene la 017 según `feat/migracion-prod-por-archivo`) si `main` avanza antes que `migrate:prod`. Las
  lecturas no fallan, porque `select *` devuelve el campo como `undefined`.
- Corrección: no es un cambio de código. Hay que aplicar la 018 en DEV y correr `migrate` → `migrate:rollback` → `migrate` más la
  consulta a `sys.columns` de C-10 **antes** de publicar en DEV. También hay que correr la carpeta Postman 17 con la 018 aplicada.
  En PROD, aplicar la 018 con el procedimiento `migrate:prod` antes de avanzar `main`. El coordinador lo deja como
  paso explícito en el cierre y en la tabla de migraciones de `CLAUDE.md`.

## Menores

**M-01. Hay marcas invisibles fuera del saneado de C-05.**
- Ubicación: `back/src/domain/compartido/autor.js:10` (`CARACTERES_INVISIBLES`).
- Escenario: el saneado quita los caracteres `\p{Cc}` y los bidi `U+200E/F`, `U+202A–E` y `U+2066–9`. Deja pasar
  `U+061C` (marca de letra árabe, también bidi), `U+200B–U+200D` (espacios y uniones de ancho cero) y `U+2060`. Un
  `username` con `U+200B` intercalado se muestra igual que otro nombre pero es una cadena distinta. Solo sirve para
  suplantar visualmente, y el origen es CAO. `puedeEliminar` no se ve afectado porque compara por número.
- Corrección: cambiar la clase por `[\p{Cc}\p{Cf}]`, que incluye todos los caracteres de formato bidi y de ancho cero. Agregar
  a `autor.test.js` un caso con `'JU​AN'` → `'JUAN'`.

**M-02. La aserción de Postman mide la longitud con la misma unidad equivocada que I-01.**
- Ubicación: `postman/planogramas-import.postman_collection.json:21256` (`[...x.subido_por_nombre].length` ≤ 150).
- Escenario: un nombre de 150 puntos de código con un emoji pasa la aserción aunque ocupe más de 150 unidades. Con la corrección
  de I-01 no puede llegar a la BD, pero la prueba no lo detectaría si se reintroduce el error.
- Corrección: usar `x.subido_por_nombre.length` ≤ 150.

## Verificación por control

| Control | Estado | Evidencia |
|---|---|---|
| C-01 autor solo del token | Cumple | `usuarioAuditoria(req)` como parámetro separado en `evidencias.controller.js:48` y `adjuntos.controller.js:95,106`. Los esquemas no declaran campos de autor y `stripUnknown` los descarta. Pruebas `evidencia.test.js:52` y `adjunto.test.js:34`, más Postman 201 con `subido_por: "999"` |
| C-02 número sin transformar | Cumple | `autor.js` usa solo `String(numero)`. `usuarioAuditoria` y `usuarioActual` leen el mismo `numeroEmpleado`. Pruebas `autor.test.js:19` y `evidencia.test.js:64` |
| C-03 eliminar solo por número | Cumple | `evidencia.entity.js` no está en el diff. Prueba `evidencia.test.js:78` |
| C-04 recorte a 150 | **Parcial** | I-01 |
| C-05 saneado | Cumple con matiz | Ver M-01 |
| C-06 render como texto | Cumple | Hijos JSX y `title`. Sin `dangerouslySetInnerHTML`. `formatearAutor` devuelve `string` |
| C-07 sin campos de más | Cumple | Solo se agregan `subido_por_nombre` y `subidoPorNombre`. Prueba de claves exactas en `evidencia.test.js:99` |
| C-08 nombre fuera de logs | Cumple | El diff no agrega ni toca ningún `console.*` |
| C-09 exposición a otras tiendas | Aceptado | Se amplía DT-12 en el cierre (docs) |
| C-10 migración 018 | Cumple en código, pendiente en BD | Es idempotente (`hasColumn`), el `down` va en orden inverso, la columna es nullable sin default y no usa `raw`. Falta la verificación manual en DEV (I-02) |
| C-11 sin respaldo `'sistema'` | Cumple | Se quitó `?? 'sistema'`. `normalizarAutor` corre antes de validar y de subir el blob. Prueba `evidencia.test.js:110` |
| C-12 / C-13 | Sin código | Van a deuda y contratos en el cierre |

## Deuda detectada

Es la misma de `02_seguridad.md` §4 y de `PLAN.md` ("Notas para el cierre"), y sigue vigente. I-01 hace más urgente la deuda
de "adjuntos no borran el blob si falla la BD": hoy es el camino por el que un error de `INSERT` deja archivos huérfanos.
