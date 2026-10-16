# 05 — Revisión de seguridad del diff · Consolidado Tiendas

> Etapa 5. Base `2a06094`, rama `feat/consolidado-tiendas` (sin commits): `git diff 2a06094` más los
> archivos nuevos sin seguimiento (sin `claudeplans/`). Contrastado con `02_seguridad.md` (controles 1–27),
> `PLAN.md` (S1–S23) y `04_implementacion.md`. `cd back && npm test` → 181/181 OK; `npm ls fflate` → 0.8.3.

## Veredicto

**Aprobado con 1 corrección Importante** (I1, la evasión del limitador). No hay bloqueantes abiertos.
Todos los controles bloqueantes de diseño se cumplen. I1 se puede corregir en esta misma ronda con un
cambio de pocas líneas. Si no, debe quedar registrado como deuda antes del merge.

## Hallazgos

### Bloqueante

Ninguno.

### Importante

**I1 — Se puede evadir el limitador por usuario cancelando la petición** (S2 / controles 2 y 13).
- Ubicación: `back/src/infrastructure/http/middlewares/rateLimit.js:39-40` (`skipFailedRequests: true` +
  `requestWasSuccessful`).
- Escenario: con `skipFailedRequests`, `express-rate-limit` 8.7.0 (`dist/index.cjs:1026-1029`) también
  devuelve el cupo en el evento `close` **cuando la respuesta no terminó**, y no consulta
  `requestWasSuccessful`. Un analista que corta la conexión a los ~50 ms (script, `curl --max-time`,
  `AbortController`) recupera el cupo en cada petición. El servidor sigue haciendo todo el trabajo: las
  7 consultas de `cargarBase`, la tubería en memoria y, en la exportación, el libro. Lo reproduje con
  `crearLimiterPorUsuario({ limit: 5 })` y un handler de 300 ms: 20 peticiones cortadas se ejecutaron
  todas y la petición 21 (completa) devolvió **200**, no 429. En el listado no hay semáforo, así que los
  topes de 60/min y 5/min no protegen de nada.
- Corrección sugerida: quitar `skipFailedRequests` y `requestWasSuccessful`. Si se quiere que los 400 no
  gasten cupo, validar la query **antes** del limitador: un middleware `validarQuery(schema)` en
  `consolidado.routes.js` que deje `req.consultaValidada`, en el orden `requiereAnalista` → validación →
  limitador → controller. También sirve `skip` con una validación barata. Agregar a
  `test/http/rateLimitUsuario.test.js` un caso con peticiones abortadas: la 6.ª, aunque las anteriores se
  hayan cortado, responde 429.

### Menor

**M1 — Cargar la base de la exportación no pasa por el semáforo** (S11).
`back/src/domain/consolidado/consolidado.usecases.js:73-77`. `obtenerGruposFiltrados` (todas las
posiciones montables en memoria) corre antes de `semaforo.intentarTomar()`. N exportaciones simultáneas
cargan N copias de la base y solo la generación del libro queda en serie. Es el orden que pidió el
PLAN (422 → 503), así que no se cuenta como desviación. Sumado a I1, el pico de memoria no tiene tope.
Sugerencia: tomar el semáforo antes de `obtenerGruposFiltrados` y liberarlo en `finally`, para que el
503 llegue antes de cargar nada, o anotarlo en la deuda de "exportación síncrona".

**M2 — `GET /consolidado/tiendas/filtros` no tiene limitador.**
`back/src/infrastructure/http/routes/consolidado.routes.js:17`. `filtrosDisponibles`
(`consolidado.repository.js:197-234`) hace 4 consultas, dos de ellas `COUNT(DISTINCT sku)` sobre todas
las posiciones montables. Un analista puede llamarla sin límite. Sugerencia: montar
`consolidadoLimiter` también en esta ruta. Tiene su propia instancia, así que no comparte cupo con el
listado.

**M3 — El `down` de 017 borra índices que la migración no creó.**
`back/src/infrastructure/db/migrations/017_indices_consolidado.js:29`. El `up` se salta un índice que
ya existe por nombre (`IF NOT EXISTS`), pero el `down` hace `DROP INDEX IF EXISTS` igual. Si en PROD
existía `IX_Posicion_nivel` creado a mano, un rollback lo elimina. Además, el chequeo es solo por
nombre: un índice equivalente con otro nombre queda duplicado. Sugerencia: antes de aplicar en PROD
(DT-08), revisar `sys.indexes` de esas 5 tablas por columna y anotarlo en la migración. El `knex.raw`
interpola solo constantes del arreglo `INDICES`, no datos de usuario: no hay riesgo de inyección.

**M4 — Fallo compartido en la deduplicación de CATI.**
`back/src/infrastructure/cati/catiClient.js:385-389`. Si la primera llamada en frío falla (timeout de
30 s), todas las que esperaban la misma clave reciben el mismo 503. Es aceptable, porque el token es de
servicio (`tokenManager`) y no del usuario, así que no se mezclan identidades. Solo se anota.

**M5 — Documentación de migraciones** (para el coordinador, T23). La 017 no está aplicada. Hay que
anotarla en "Pendientes" de DEV y de PROD en la tabla de `CLAUDE.md`, y dejar explícito en PROD
"no aplicar hasta DT-08".

## Verificación de controles (02_seguridad.md → PLAN S#)

| # | Control (sev.) | Estado | Evidencia |
|---|---|---|---|
| 1 / S1 | `requiereAnalista` en las 3 rutas (Bloq.) | Cumple | `consolidado.routes.js:14` con `// A transitoria (DT-11)`; `test/http/consolidadoRutas.test.js:24-40` (PLA009/PLA010 → 403, sin usuario → 401); `rutasProtegidas.test.js` verde |
| 2 / S2 | Limitador después de la autorización, con clave del usuario (Bloq.) | Cumple, pero se puede evadir (I1) | `rateLimit.js:36` `keyGenerator` con `numeroEmpleado`, `validate.xForwardedForHeader:false`; orden en `consolidado.routes.js:14,20,23`; `rateLimitUsuario.test.js:26-42` |
| 3 / S21 | Front: grupo y ruta solo para analista (Imp.) | Cumple | `constants/navegacion.ts` (grupo con `regla: REGLAS.analista` y también en el hijo); `permisos.ts` `opcionesVisibles`; `router/routes.tsx` `protegida(REGLAS.analista, …)`; `permisos.test.ts` |
| 4 / S3 | Joi estricto sin `stripUnknown` (Bloq.) | Cumple | `validacion.js:71-75` `validarQueryEstricta`; `consolidadoSchemas.test.js:35`, `consolidadoRutas.test.js:86` |
| 5 / S4 | csv con tope antes de `split`, enteros seguros, únicos, topes; arreglo → 400 (Bloq.) | Cumple | `consolidado.schemas.js:28-42` (`max` + patrón lineal sin ReDoS + `isSafeInteger` + `Set` + tope); `:79-80` (2000/200, 5000/500); un arreglo no es string → 400 (`consolidadoSchemas.test.js:49`) |
| 6 / S5 | Enumerados por lista permitida; `orden`/`columnas` solo como clave de mapa (Bloq.) | Cumple | `schemas.js:98-101,108-118`; `entity.js:295` y `columnas.js:93-96` con `Object.hasOwn` sobre un objeto `Object.create(null)` congelado; `verificarColumnas` acota el eco a 40 caracteres |
| 7 / S6 | Siempre `publicado/piloto` y tienda activa en SQL, con defensa en el dominio (Bloq.) | Cumple | `consolidado.repository.js:32-41,60-62,201-206`; `entity.js:143`; `consolidadoUsecases.test.js:78,160` |
| 8 / S7 | `busqueda` con `includes`, sin `RegExp`; jerarquía con patrón (Imp.) | Cumple | `entity.js:242`; `schemas.js:25,72-74` (Joi rechaza el vacío); `consolidadoSchemas.test.js:75,83` |
| 9 / S8 | `page` 1–10 000; fuera de rango → `[]` (Imp.) | Cumple | `schemas.js:97`; `entity.js:303-306` |
| 10 / S9 | `hojas` con `Joi.when`; `soloDuplicados` según la vista (Imp.) | Cumple | `schemas.js:93-96,113-117`; pruebas `:90,115` |
| 11 / S10 | Tope de filas antes del libro; variable de entorno acotada; 422 con `details` (Bloq.) | Cumple | `env.js:9-12,72-74` (entero > 0, máximo 200 000); `usecases.js:74-75,15-21`; `consolidadoUsecases.test.js:120` (espía sin llamadas) |
| 12 / S11 | Semáforo de exportación → 503, liberado en `finally` (Imp.) | Cumple (ver M1) | `semaforo.js`; `usecases.js:77-83`; pruebas `:139,153,168` |
| 13 / S2 | `consolidadoLimiter` 60/min en el listado + log (Imp.) | Parcial (I1) | `consolidado.routes.js:23`; log en `controller.js:49` sin valores de la query |
| 14 / S13 | `select` explícito, sin auditoría ni blobs, subconsultas, sin `raw` (Imp.) | Cumple | `consolidado.repository.js`: todos los `select` con columnas listadas, sin `usuario_*` ni adjuntos; solo `tiendaIds` (≤ 200) en `whereIn` parametrizado; ningún `knex.raw` |
| 15 / S14 | CATI antes de la base; falla → 503 sin datos parciales; sin jerarquía no se llama (Imp.) | Cumple | `usecases.js:36-41`; `consolidadoUsecases.test.js:63,70,131`; deduplicación en `catiClient.js:385-389` (M4) |
| 16 / S15 | Sin fórmulas: `type: String`; números finitos (Bloq.) | Cumple | `libroXlsx.js:22-29`, sin uso de `Formula`; `libroXlsx.test.js:24` descomprime y comprueba que no hay `<f>` |
| 17 / S16 | Quitar caracteres de control y truncar a 32 767 (Imp.) | Cumple | `libroXlsx.js:13-18`, también en los encabezados; `libroXlsx.test.js:37` |
| 18 / S17 | Encabezados solo de la lista blanca; hojas con nombre fijo (Bloq.) | Cumple | `entity.js:362-389` (`columnas.map(etiquetaColumna)`, `modo` agregado en DETALLADO) |
| 19 / S18 | Buffer completo antes de las cabeceras; un fallo responde JSON sin stack (Bloq.) | Cumple | `controller.js:68-90`; nombre armado de `NOMBRE_POR_FORMATO` y la fecha del servidor; `no-store`, `Content-Length`; `consolidadoRutas.test.js:112` |
| 20 | Nombre de archivo y CORS (Menor) | Cumple | El front arma el nombre (`ConsolidadoTiendas.tsx:177`, `nombreArchivo`); no hace falta `exposedHeaders` |
| 21 / S12 | Log de cada exportación (Menor) | Cumple | `controller.js:76-79`: `numeroEmpleado`, formato, hojas, filas, ms; sin token ni búsqueda |
| 22 / S19 | Posiciones huérfanas se omiten sin lanzar error (Imp.) | Cumple | `entity.js:132-138`; `consolidado.test.js:85` |
| 23 | Mapeadores extraídos sin cambiar el comportamiento (Imp.) | Cumple | `mapeadoresVersion.js` es idéntico al bloque quitado de `skuVersion.repository.js`; pruebas del módulo 19 verdes y sin cambios |
| 24 | AGREGADO: cada versión cuenta una sola vez (Imp.) | Cumple | `entity.js:318-330` (`Map` por `versionId`; `null` no suma) |
| 25 / S23 | 017 con nombres explícitos, `IF NOT EXISTS`, `down` en orden inverso (Imp.) | Cumple (ver M3) | `017_indices_consolidado.js:10-31`; no se pudo correr `migrate`/`rollback` (sin conexión a la BD, `04_implementacion.md`) |
| 26 | No aplicar 017 en PROD hasta DT-08 (Bloq. para PROD) | Cumple | La migración no se aplicó en ningún ambiente; comentario en el encabezado (ver M5) |
| 27 / S20 | `write-excel-file` exacta; `fflate` 0.8.3; sin hallazgos nuevos de audit (Imp.) | Cumple | `package.json` `"write-excel-file": "4.1.1"`; `npm ls fflate` → 0.8.3; los 5 hallazgos de `npm audit` son previos |
| S22 | Front: preferencias de `localStorage` validadas (Imp.) | Cumple | `preferenciasColumnas.ts:13-31` (descarta claves ajenas o repetidas); `columnasConsolidado.ts:118-120`; `config/preferenciasConsolidado.ts` con try/catch |

Otras comprobaciones:
- Los mensajes de Joi que vuelven en `details` no repiten valores largos: los patrones tienen mensaje propio y las claves desconocidas solo repiten el nombre.
- `errorHandler` no expone el stack fuera de `development`.
- La colección Postman no trae tokens ni secretos.
- `httpClient.getBinario` solo agrega `query`, sin cambios en el manejo de errores.

## Deuda detectada

- **I1**, si no se corrige en esta ronda: registrar como Alta en el back ("los limitadores con
  `skipFailedRequests` devuelven el cupo cuando el cliente aborta").
- **M1/M2**: sumarlas a la deuda prevista de "exportación síncrona en el event loop" (base sin semáforo,
  `/filtros` sin limitador).
- **M3**: anotarlo junto a DT-08 (antes de aplicar 017 en PROD, revisar los índices existentes por
  columna).
- Sin cambios respecto de lo ya previsto: DT-10 (el consolidado muestra todas las tiendas, aceptado por
  ser regla A), DT-11 (+3 rutas con la regla A transitoria) y `validarConJoi` con `stripUnknown`
  (pendiente en otros módulos).

## Ronda 1

> Re-revisión limitada a la corrección de I1: `rateLimit.js`, `validarQuery.js` (nuevo),
> `consolidado.routes.js`, `test/http/rateLimitUsuario.test.js` y `test/http/consolidadoRutas.test.js`.
> `cd back && npm test` → 183/183 OK.

### Resultado de I1: corregido

- `rateLimit.js:30-44`: `crearLimiterPorUsuario` ya no usa `skipFailedRequests` ni `requestWasSuccessful`.
  Toda petición que llega al limitador gasta cupo, incluso si el cliente la aborta.
- Reproducción, igual que en la etapa 5: limitador de 5/min con `validarQuery(schemaListado)` delante
  y un handler de 300 ms. Corté 20 peticiones a los 50 ms. Solo **5** handlers se ejecutaron y la
  petición 21 (completa) devolvió **429**. Antes de la corrección se ejecutaban las 20 y la 21 devolvía 200.
  Las peticiones inválidas (`?foo=1`, `?pageSize=999999`) siguen respondiendo 400 con el cupo agotado.
- Prueba nueva `rateLimitUsuario.test.js:51-61`: aborta 5 peticiones y la 6.ª responde 429. Con la
  configuración anterior habría fallado (devolvía el cupo), así que la prueba sí protege contra la regresión.

### La validación previa no abre un hueco

- Orden (`consolidado.routes.js:16,23,26`): `router.use(requiereAnalista)` → `validarQuery(schema)` →
  limitador → controller. El limitador sigue después de la autorización, así que `req.usuario` siempre
  existe y un usuario sin permiso recibe 403 antes de validar nada. La autenticación se monta antes, en
  `routes/index.js:19`.
- La validación previa es la misma estricta. `validarQuery.js:9-18` llama a `validarQueryEstricta`
  (`allowUnknown: false`, `stripUnknown: false`) con el mismo `schemaListado`/`schemaExportar` y la misma
  copia `{ ...req.query }` que el controller (`consolidado.controller.js:37,42,67`). Las dos validaciones
  aceptan y rechazan exactamente lo mismo: nada pasa la primera y falla la segunda, ni al revés. El
  controller conserva su propia validación como defensa.
- Los 400 no gastan cupo, pero salen baratos. Los `max` de los csv se revisan antes del `split`, los
  patrones son lineales y no hay E/S. Mandar peticiones inválidas sin límite no le carga la BD ni CATI.
- Un error de Joi llega a `errorHandler` por `next(err)`, con la misma forma `{ error: { code, message, details } }`
  y sin stack.

### S2 / control 13

**Cumple.** `exportacionLimiter` (5/min) y `consolidadoLimiter` (60/min) usan como clave `numeroEmpleado`,
van después de `requiereAnalista` y ya no se pueden evadir. Los 400 no consumen cupo. Esto también
cierra la desviación M3 de calidad.

### Hallazgos nuevos

**Menor**

**R1-M1 — La prueba de rutas no verifica el orden de las capas.** En `consolidadoRutas.test.js:45-46`
solo se comprueba que haya 3 capas (`length`). Si alguien pusiera el limitador antes de `validarQuery`,
la prueba seguiría pasando y los 400 volverían a gastar cupo. Además, `rateLimitUsuario.test.js:16`
prueba con un `rechazaX` simulado y no con `validarQuery` real. No es un riesgo de seguridad (gastar
cupo de más es lo conservador), pero la regla del contrato queda sin protección. Sugerencia: verificar
el orden con algo como `route.stack.map(l => l.handle)`, comparando contra `requiereAnalista`/`exportacionLimiter`
importados, o montar `validarQuery(schemaExportar)` en la prueba del limitador.

Siguen abiertos de la ronda anterior, sin cambios y fuera de esta re-revisión: M1 (base de la exportación
fuera del semáforo), M2 (`/filtros` sin limitador), M3 (`down` de la 017), M4 y M5.

### Veredicto final

**Aprobado.** No hay bloqueantes ni importantes abiertos. Quedan 1 Menor nuevo (R1-M1) y los Menores
M1–M5 de la ronda anterior, que deben quedar registrados como deuda en el cierre (ver "Deuda detectada").
