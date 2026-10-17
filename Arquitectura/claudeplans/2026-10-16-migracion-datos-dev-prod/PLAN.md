# PLAN — Migración de datos DEV (`OTB`) → PROD (`db-planogramas`)

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Fuentes: `00_solicitud.md`, `01_arquitectura.md`, `02_seguridad.md` (misma carpeta). Sin etapa UX.

## Objetivo

Dejar PROD idéntico a DEV en las 17 tablas de la app, con los mismos IDs, y con los 91 archivos de
adjuntos y evidencias copiados de `adjuntos-dev` a `adjuntos` (misma cuenta `planogramasstorage`).
Se hace con un script Node de un solo uso, con simulacro por defecto, que corre desde la máquina de
quien migra. El desarrollador escribe el script y sus pruebas; **la ejecución contra PROD la hace el
coordinador en los pasos operativos O1–O7, solo tras la aprobación del usuario.**

## Decisiones

| Decisión | Razón |
|---|---|
| Script en `back/scripts/migracion-dev-prod/` (fuera de `src/`), sin tocar código de la app | Es de un solo uso; retirarlo después es borrar la carpeta (DT-69). Tampoco se agrega `copiar` a `src/infrastructure/storage/blobClient.js`: el script tiene su propio `blobs.js`. |
| Sin paquetes nuevos (`knex`, `tedious`, `@azure/storage-blob`, `node:crypto`) | Ya están. |
| Lectura completa de DEV en memoria primero (transacción `snapshot`, termina en rollback) y **se destruye la conexión DEV antes de abrir la transacción de PROD** | ~6 500 filas; elimina por construcción la posibilidad de escribir en DEV (C-02). |
| Una sola transacción PROD con `SET XACT_ABORT ON` y `SET LOCK_TIMEOUT 30000`: chequeo de contenido → vaciado → carga → autorreferencias → reseed → verificación → commit/rollback | Atomicidad (C-03, C-05, C-08). |
| Orden topológico fijo y `DELETE` en orden inverso; sin `NOCHECK`, sin `ALTER TABLE`, sin `TRUNCATE` | FKs siguen confiables (C-13). |
| Autorreferencias: insertar la columna en `NULL` y `UPDATE` por fila al terminar la tabla | Sin desactivar FKs. |
| `datetime2`/`datetime`/`date` leídos con `CONVERT(varchar(27), col, 121)` y `decimal`/`numeric` con `CAST(col AS varchar(40))`; se insertan como texto | No perder precisión (verificado con datos reales). Cualquier otro tipo fuera de la lista soportada aborta. |
| Reseed a `sys.identity_columns.last_value` de DEV cuando no es `NULL`; si es `NULL` (tabla nunca usada, hoy `HistorialSustitucion`) no se reseedea | Una sola regla que cubre `Seccion` (0 filas, último 61) y no reutiliza IDs que la auditoría pueda citar. |
| Copia de blobs **sin SAS**: `beginCopyFromURL(urlOrigenSinFirma)` autorizado con la clave compartida de la misma cuenta | C-14: no hay credencial que filtrar. Si Azure rechaza la copia, falla en O4 (paso solo de blobs), antes de tocar la BD. |
| `blob_url` en PROD = `https://planogramasstorage.blob.core.windows.net/adjuntos/` + `blob_path`; se exige que en DEV `blob_url === 'https://planogramasstorage.blob.core.windows.net/adjuntos-dev/' + blob_path` y `blob_container === 'adjuntos-dev'`, y que la `url` del cliente destino sea exactamente el valor calculado | Verificado al 100 % en DEV; evita ambigüedad de codificación y que se persista una URL inesperada (C-10). |
| Hash SHA-256 por tabla: PROD se **vuelve a leer** del `trx` con las mismas conversiones; filas ordenadas por PK en Node; cada fila `JSON.stringify([valores en orden de sys.columns])` | C-11. Para DEV se usa lo leído en memoria tras aplicar `reescribirBlob`. |
| Constantes en código: origen `OTB`, destino `db-planogramas`, servidor `comerciales`, cuenta `planogramasstorage`, contenedores `adjuntos-dev` → `adjuntos` | Identidad verificada en vivo, no por configuración (C-01, C-15). |
| La regla de contenido esperado de PROD (C-03) aplica igual en simulacro y en ejecución | El simulacro anticipa el aborto real. |
| Modos: simulacro (default), `--ejecutar`, `--solo-blobs --ejecutar`, `--verificar` | `--solo-blobs` se corre antes de la carga real (O4) para separar el riesgo de blobs; `--verificar` resuelve el estado ambiguo tras el commit (C-07). |
| App Service `planogramas-api-prod` **detenido** durante la ventana | Nadie lee datos a medias ni bloquea tablas (C-08). PROD aún no tiene usuarios. |
| Errores se imprimen con `formatearError`: código + mensaje recortado a 300 caracteres y query strings reemplazados por `?<oculto>`; nunca el objeto de error completo | C-14, C-17. |
| Postman no se corre contra PROD | Respuesta del usuario. |

## Fuera de alcance

- Endurecer la condición de `/pruebas` en `back/src/infrastructure/http/routes/index.js` (se verifica
  `NODE_ENV` en el portal en O1; queda como deuda propuesta).
- Generalizar el script (PROD → DEV u otros destinos) y retirarlo del repo (DT-69, después de que
  PROD esté estable).
- Copiar tablas ajenas de `OTB` (Ventas, Presupuesto, Recompra, Transito, Transitos, EFGDepartamento,
  msg), `knex_migrations` y `knex_migrations_lock`.
- Borrar o limpiar blobs (ni en `adjuntos-dev` ni en `adjuntos`); DT-64 no se arrastra porque solo se
  copian blobs referenciados.
- Corregir DT-62 (`subido_por` no numéricos) y DT-10/DT-01 (filtro por tienda): se heredan tal cual.
- Cambios de front, endpoints o Postman.

## Contratos

Sin endpoints. Contrato del CLI (desde `back/`):

| Invocación | Efecto |
|---|---|
| `npm run migrar:dev-a-prod` | **Simulacro**: precondiciones, lectura DEV, existencia de blobs en origen (y si ya están en destino), carga completa en la transacción PROD, verificación y **ROLLBACK** siempre. Sale con 0 si todo cuadra. |
| `npm run migrar:dev-a-prod -- --solo-blobs --ejecutar --confirmar=db-planogramas` | Solo copia blobs (idempotente) y verifica el destino. No abre transacción en PROD. |
| `npm run migrar:dev-a-prod -- --ejecutar --confirmar=db-planogramas [--forzar-vaciado]` | **Ejecución real**: blobs (idempotente) → transacción PROD → **COMMIT** solo si la verificación cuadra completa. |
| `npm run migrar:dev-a-prod -- --verificar` | Solo lectura de DEV y PROD: compara conteos, hashes, `IDENT_CURRENT`, FKs y blobs destino. Sin transacción de escritura. |

Reglas de argumentos: `--confirmar` es obligatorio con `--ejecutar` y se compara **exacto** (sin
`trim`, sensible a mayúsculas) con el `DB_NAME()` real de PROD; `--solo-blobs` y `--forzar-vaciado`
solo valen con `--ejecutar`; `--verificar` no admite otros flags; flag desconocido → error.
Código de salida: `0` si terminó y cuadra; `1` en cualquier otro caso (aborto, error, señal).

Salida en español por consola (nada a disco): identidad (`host / DB_NAME()`), esquema idéntico por
tabla, lo que se va a borrar de PROD, tabla por tabla `filas DEV · filas PROD · hash igual ·
IDENT DEV · IDENT PROD antes · IDENT PROD después`, resumen de blobs `copiados · ya idénticos ·
faltan en origen`, FKs confiables, y resultado `COMMIT`/`ROLLBACK`. Nunca credenciales, connection
strings, configuración de knex ni URLs con query string.

## Datos

Sin migración nueva. En PROD se aplica la pendiente `018_autor_nombre_evidencia_adjunto.js` (O2)
antes de cualquier corrida; el script aborta si `knex_migrations` de PROD no tiene exactamente los
mismos nombres que DEV.

Orden de carga (constante `ORDEN_TABLAS` en `plan.js`; el vaciado usa el inverso):

| # | Tabla | Autorreferencia (segunda pasada) |
|---|---|---|
| 1 | Tienda | — |
| 2 | Accesorio | — |
| 3 | Producto (PK `sku`, sin identity) | `sku_sustituto` |
| 4 | Planograma | — |
| 5 | EdicionAsignacion | — |
| 6 | PlanogramaSubcategoria | — |
| 7 | PlanogramaVersion | `version_base_id` |
| 8 | VersionTienda (PK compuesta, sin identity) | — |
| 9 | Adjunto | — |
| 10 | HistorialSustitucion | — |
| 11 | Gondola | — |
| 12 | Seccion | `padre_id` |
| 13 | Nivel | — |
| 14 | Posicion | — |
| 15 | PosicionAccesorio | — |
| 16 | EvidenciaImplementacion | — |
| 17 | AsignacionAuditoria | — |

Vuelta atrás: PITR de `db-planogramas` a la hora UTC anotada en O3 (crea una BD nueva; volver exige
renombrar o cambiar la cadena del App Service), o volver a correr el script con `--forzar-vaciado`.
Los blobs de `adjuntos-dev` no se tocan.

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| C-01 ⛔ | `SELECT DB_NAME() AS bd, @@SERVERNAME AS servidor` en cada conexión; exigir origen `OTB`, destino `db-planogramas`, ambos `comerciales`, origen ≠ destino; `--confirmar` exacto contra el `DB_NAME()` real; repetir `DB_NAME()` sobre el `trx` antes del primer `DELETE` | `plan.validarIdentidad`, `orquestador`, `bd.asegurarDestino` | Pruebas T1 (casos 1–3) y T4 |
| C-02 ⛔ | DEV solo pasa por funciones de lectura; funciones de escritura reciben `trxProd` con nombre explícito y llaman `asegurarDestino(trxProd)`; conexión DEV destruida antes de abrir el `trx` PROD; transacción DEV siempre en rollback | `bd.js`, `orquestador.js` | Prueba T4 (orden de llamadas: `destruirDev` antes de `abrirTransaccionProd`); revisión del diff |
| C-03 | Contenido de PROD exacto (Tienda id 1 `T004`, Accesorio id 1 `G-12-FIXTURE`, resto 0) contado **dentro del `trx`**, justo antes del `DELETE`; si difiere, abortar salvo `--forzar-vaciado` y listar siempre lo que se borra | `plan.evaluarContenidoDestino`, `orquestador` | Pruebas T1 caso 4 |
| C-04 | `planogramas-api-prod` con `NODE_ENV=production` y sin `PRUEBAS_HABILITADAS=true` | Portal (O1) | Checklist O1 |
| C-05 ⛔ | `SET XACT_ABORT ON` como primera sentencia del `trx`; todo sobre el mismo `trx`; commit solo si la verificación cuadra; cualquier excepción → rollback y salida 1 | `bd.prepararSesion`, `orquestador` | Prueba T4 caso 5 |
| C-06 ⛔ | `SIGINT`/`SIGTERM` → `estado.abortado = true`, rollback del `trx` abierto, `destroy()` de ambos knex; `commit` se niega si `estado.abortado`; `SET IDENTITY_INSERT … OFF` en `finally` por tabla; pool PROD destruido al final | `index.js`, `orquestador`, `bd.insertarTabla` | Prueba T4 caso 6 |
| C-07 | Modo `--verificar` de solo lectura | `orquestador` | O7 |
| C-08 | `requestTimeout: 120000` en ambas conexiones; `SET LOCK_TIMEOUT 30000` en el `trx`; App Service PROD detenido | `bd.crearConexiones`, `bd.prepararSesion`, O3 | Simulacro (O5) termina dentro del tiempo |
| C-09 | Informe muestra `IDENT_CURRENT` PROD antes y después (también tras el rollback del simulacro) | `orquestador` | Salida de O5 |
| C-10 ⛔ | `reescribirBlob` valida contenedor y URL de DEV, arma la URL destino, aborta si contiene `?` o `sig=`; en la copia, `url` del cliente destino debe ser igual a la calculada | `plan.reescribirBlob`, `blobs.copiar` | Pruebas T1 casos 8–9 |
| C-11 ⛔ | Hash de PROD con un `SELECT` nuevo sobre el `trx`; orden por PK en Node; serialización canónica; verificación independiente de `blob_container === 'adjuntos'` y `blob_url === BASE_PROD + blob_path` por fila en PROD | `plan.hashFilas`, `plan.verificarBlobsFilas`, `bd.leerTabla` | Pruebas T1 caso 7 y diferencia de una fila |
| C-12 | Esquema comparado: columnas (nombre, tipo, longitud, precisión, escala, nulabilidad, `collation_name`), PK, índices únicos con `filter_definition`, nombres de FK; `knex_migrations` igual; `knex_migrations_lock.is_locked = 0` | `bd.leerEsquema`, `plan.compararEsquema` | Prueba T1; salida de O5 "esquema idéntico: sí" |
| C-13 | Sin `NOCHECK`, `DISABLE TRIGGER`, `ALTER TABLE`, `TRUNCATE`; tras la carga, `is_not_trusted = 0` e `is_disabled = 0` en todas las FKs de PROD | `bd.fksConfiables` | Revisión del diff (grep) + línea del informe |
| C-14 | Copia sin SAS; errores del SDK solo con `statusCode`, `code`, `blob_path` vía `formatearError`; nunca `err.request` | `blobs.js`, `plan.formatearError` | Prueba T1 caso 10 |
| C-15 | Constantes `ORIGEN='adjuntos-dev'`, `DESTINO='adjuntos'`, aserción `ORIGEN !== DESTINO`; cuenta del cliente = `planogramasstorage`; ninguna llamada a `delete*`; `createIfNotExists()` sin `access` | `blobs.js` | Revisión del diff (grep `delete`) |
| C-16 | Idempotencia: destino ya idéntico si mismo `contentLength` **y** mismo `contentMD5` (si origen no tiene MD5, se copia de nuevo); tras `pollUntilDone` exigir `copyStatus === 'success'` y tamaño/MD5 iguales; cualquier blob faltante o distinto aborta antes de la BD | `plan.blobYaIdentico`, `blobs.copiar` | Pruebas T1 caso 11; T4 caso 12 |
| C-17 ⛔ | Nada secreto en consola, disco ni repo: no imprimir config de knex, `conexion.prod.json`, `env.*`; identificar solo con host/`DB_NAME()`; mensajes de error recortados a 300 caracteres; el script no escribe archivos; sin valores de conexión en el código | Todo el script | Prueba T1 caso 10b; revisión del diff (grep `console.*(conexion|config|env\.|connectionString)`) |
| C-18 ⛔ | Punto de restauración PITR confirmado de `db-planogramas` **y de `OTB`**, hora UTC anotada | Portal (O3) | Nota en `DESPLIEGUE_AZURE.md` |
| C-19 | Login de administración solo en `conexion.prod.json` local; no ampliar permisos del login de la app | O1 | Checklist O1 |

⛔ = bloqueante.

## UX (resumen para implementar)

Sin cambios de UI. Mensajes de consola en español, informe con `console.table`.

## Tareas

### T1 — Lógica pura: `plan.js` y sus pruebas
- **Archivos**: crear `back/scripts/migracion-dev-prod/plan.js` · crear `back/test/scripts/migracion-dev-prod.test.js`
- **Qué hacer** (CommonJS, sin `require` de knex, env ni Azure):
  - Constantes exportadas: `BD_ORIGEN = 'OTB'`, `BD_DESTINO = 'db-planogramas'`, `SERVIDOR = 'comerciales'`,
    `CUENTA_BLOB = 'planogramasstorage'`, `CONTENEDOR_ORIGEN = 'adjuntos-dev'`, `CONTENEDOR_DESTINO = 'adjuntos'`,
    `BASE_URL_ORIGEN`/`BASE_URL_DESTINO` (`https://planogramasstorage.blob.core.windows.net/<contenedor>/`),
    `ORDEN_TABLAS` (tabla de Datos), `AUTORREFERENCIAS = { Producto: 'sku_sustituto', PlanogramaVersion: 'version_base_id', Seccion: 'padre_id' }`,
    `TABLAS_CON_BLOB = ['Adjunto', 'EvidenciaImplementacion']`,
    `FIXTURES_DESTINO = { Tienda: [{ id: 1, codigo: 'T004' }], Accesorio: [{ id: 1, codigo: 'G-12-FIXTURE' }] }`,
    `TIPOS_TEXTO_FECHA = ['datetime2','datetime','date']`, `TIPOS_TEXTO_DECIMAL = ['decimal','numeric']`,
    `TIPOS_DIRECTOS` (`int`, `bigint`, `smallint`, `tinyint`, `bit`, `nvarchar`, `varchar`, `nchar`, `char`).
  - `parsearArgs(argv: string[]) → { modo: 'simulacro'|'ejecutar'|'solo-blobs'|'verificar', confirmar: string|null, forzarVaciado: boolean }`; lanza `Error` con mensaje en español según las reglas de Contratos.
  - `validarIdentidad({ origen: {bd, servidor}, destino: {bd, servidor}, confirmar, modo }) → void`; lanza si: `origen.bd === destino.bd`, `origen.bd !== BD_ORIGEN`, `destino.bd !== BD_DESTINO`, algún servidor `!== SERVIDOR`, o modo `ejecutar`/`solo-blobs` con `confirmar !== destino.bd` (comparación estricta).
  - `expresionSelect(columna: {nombre, tipo}) → string` (`CONVERT(varchar(27), [c], 121) AS [c]`, `CAST([c] AS varchar(40)) AS [c]`, o `[c]`); lanza si el tipo no está en las listas soportadas.
  - `compararEsquema(dev, prod) → string[]` (diferencias legibles; vacío = idéntico). `esquema` = `{ [tabla]: { columnas: [{nombre,tipo,longitud,precision,escala,nulable,collation}], pk: string[], unicos: [{nombre, columnas, filtro}], fks: string[], identity: boolean } }`. Las 17 de `ORDEN_TABLAS` deben existir en ambos; PROD no debe tener otras tablas fuera de `knex_migrations*`.
  - `tamanoLote(numColumnas) → Math.floor(2000 / numColumnas)`.
  - `ordenarPorPk(filas, pk) → filas` (copia ordenada; números numéricamente, cadenas por comparación ordinal `<`, tupla para PK compuesta).
  - `hashFilas(filas, columnas: string[], pk: string[]) → string` (hex SHA-256 con `node:crypto` sobre `filas ordenadas.map(f => JSON.stringify(columnas.map(c => f[c] ?? null))).join('\n')`).
  - `reescribirBlob(fila) → fila nueva` con `blob_container = CONTENEDOR_DESTINO` y `blob_url = BASE_URL_DESTINO + blob_path`; lanza si `blob_container !== CONTENEDOR_ORIGEN`, si `blob_path` vacío, si `blob_url !== BASE_URL_ORIGEN + blob_path`, o si la URL resultante contiene `?` o `sig=`.
  - `verificarBlobsFilas(filasProd) → string[]` (errores por fila si `blob_container !== 'adjuntos'` o `blob_url !== BASE_URL_DESTINO + blob_path`). Implementación propia, **sin** llamar a `reescribirBlob`.
  - `evaluarContenidoDestino(conteos: {[tabla]: number}, filasFixture: {Tienda: [{id,codigo}], Accesorio: [...]}, forzarVaciado) → { ok: boolean, aBorrar: string[], advertencia: string|null }`.
  - `blobYaIdentico(origen: {tamanoBytes, md5}, destino: {tamanoBytes, md5}|null) → boolean` (false si destino null, si origen sin MD5, o si difieren tamaño o MD5; MD5 comparado en base64).
  - `formatearError(err) → string`: `[código] mensaje` con código = `err.code ?? err.number ?? err.statusCode`; mensaje recortado a 300 caracteres; reemplaza `/\?[^\s'"]*/g` por `?<oculto>`; nunca lee `err.request` ni `err.response`.
  - `enParalelo(items, limite, fn) → Promise<resultados[]>` (pool simple de `limite` promesas).
- **Criterios de aceptación**:
  - [ ] `plan.js` no tiene `require` fuera de `node:crypto`.
  - [ ] Todas las funciones listadas exportadas con esas firmas.
- **Pruebas** (`node:test`, en `back/test/scripts/migracion-dev-prod.test.js`):
  1. `validarIdentidad`: origen = destino → error; origen `db-planogramas` → error; destino `OTB` → error.
  2. Servidor distinto de `comerciales` → error; caso correcto → no lanza.
  3. `parsearArgs`/`validarIdentidad`: `--ejecutar` sin `--confirmar`, `--confirmar=DB-Planogramas`, `--confirmar=" db-planogramas"` → error; `--forzar-vaciado` sin `--ejecutar` → error; flag desconocido → error.
  4. `evaluarContenidoDestino`: solo fixtures → ok; fixtures + 1 Planograma → no ok y `aBorrar` lo lista; mismo caso con `forzarVaciado` → ok con advertencia; Tienda id 1 con otro código → no ok.
  5. `compararEsquema`: diferencia de `collation` o de `filter_definition` → reportada; tabla faltante en PROD → reportada; idéntico → `[]`.
  6. `expresionSelect`: datetime2, decimal, int; tipo `varbinary` → error. `tamanoLote(24) === 83`.
  7. `hashFilas`: `null` vs `"null"` → distinto; `'2026-10-01 10:00:00.1234567'` vs `'…1234560'` → distinto; mismo conjunto en otro orden de filas → igual; una fila distinta → distinto; PK compuesta y PK de texto ordenan estable.
  8. `reescribirBlob`: fila normal → URL esperada y contenedor `adjuntos`; `blob_url` de otro contenedor → error; `blob_container` distinto de `adjuntos-dev` → error.
  9. `reescribirBlob` con `blob_path` que contiene `?sig=` → error. `verificarBlobsFilas` detecta una fila con `adjuntos-dev`.
  10. `formatearError` con mensaje que trae `https://…/x.pdf?sv=1&sig=abc` → la salida no contiene `sig=`; 10b: mensaje de 2 000 caracteres → salida ≤ 300 + prefijo.
  11. `blobYaIdentico`: mismo tamaño y MD5 distinto → false; origen sin MD5 → false; iguales → true; destino null → false.
  12. `enParalelo` respeta el límite (contador de concurrentes ≤ 4) y conserva el orden de resultados.
- **Depende de**: —

### T2 — Acceso a BD del script: `bd.js`
- **Archivos**: crear `back/scripts/migracion-dev-prod/bd.js`
- **Qué hacer**:
  - `crearConexiones() → { knexDev, knexProd }`: `knexDev = knex({ ...require('../../knexfile'), connection: { ...base.connection, options: { ...base.connection.options, requestTimeout: 120000 } } })`; igual para `require('../../knexfile.prod')` con `pool: { min: 0, max: 1 }`. No imprime nada propio (el `console.error` de destino de `knexfile.prod.js` se conserva).
  - Solo lectura (aceptan `knexDev`, `trxDev`, `knexProd` o `trxProd`):
    - `identidad(conexion) → { bd, servidor }` (`SELECT DB_NAME() AS bd, @@SERVERNAME AS servidor`).
    - `leerEsquema(conexion, tablas) → esquema` (forma de T1) desde `sys.tables`, `sys.columns`, `sys.types`, `sys.indexes` (`is_primary_key`, `is_unique`, `filter_definition`), `sys.index_columns`, `sys.foreign_keys`, `sys.identity_columns`; columnas en orden de `column_id`. Incluye la lista completa de tablas de usuario para el chequeo de "tablas extra" en PROD.
    - `leerMigraciones(conexion) → { nombres: string[], bloqueado: boolean }`.
    - `abrirLecturaDev(knexDev) → trxDev` con `knexDev.transaction(undefined, { isolationLevel: 'snapshot' })`.
    - `leerTabla(conexion, tabla, columnas) → filas` con `SELECT ${columnas.map(expresionSelect)} FROM [tabla]` (sin `ORDER BY`).
    - `ultimosIdentity(conexion) → { [tabla]: number|null }` (`sys.identity_columns.last_value`) e `identCurrent(conexion, tablas) → { [tabla]: number|null }` (`IDENT_CURRENT('[T]')`).
    - `contarFilas(conexion, tablas) → { [tabla]: number }` y `filasFixture(conexion) → { Tienda: [{id,codigo}], Accesorio: [{id,codigo}] }`.
    - `fksConfiables(conexion) → string[]` (nombres con `is_not_trusted = 1` o `is_disabled = 1`).
  - Escritura (primer parámetro `trxProd`; cada función llama primero `asegurarDestino(trxProd)`):
    - `asegurarDestino(trxProd) → void`: `DB_NAME()` del `trx` debe ser `BD_DESTINO`; si no, lanza.
    - `prepararSesion(trxProd)`: `SET XACT_ABORT ON; SET LOCK_TIMEOUT 30000;` y luego `asegurarDestino`.
    - `vaciar(trxProd, tablas)`: `DELETE FROM [T]` en orden inverso de `ORDEN_TABLAS`.
    - `insertarTabla(trxProd, { tabla, columnas, filas, identity, autorreferencia })`: si `identity`, `SET IDENTITY_INSERT [T] ON` y en `finally` `OFF` (error del `OFF` se ignora); filas con la autorreferencia en `null`; inserción en lotes de `tamanoLote(columnas.length)` con `trxProd(tabla).insert(lote)`; después `UPDATE [T] SET [col] = ? WHERE <pk> = ?` por cada fila que tenía la autorreferencia.
    - `reseed(trxProd, { [tabla]: valor })`: `DBCC CHECKIDENT('[T]', RESEED, valor)` solo para valores no `null`.
  - Los nombres de tabla y columna vienen siempre de `ORDEN_TABLAS` o de `sys.columns`, nunca de argumentos de la CLI; se envuelven en `[...]`.
- **Criterios de aceptación**:
  - [ ] Ninguna función de escritura acepta un parámetro llamado `knex`/`conexion`; todas reciben `trxProd` y llaman `asegurarDestino`.
  - [ ] El diff no contiene `NOCHECK`, `DISABLE TRIGGER`, `ALTER TABLE`, `TRUNCATE`.
  - [ ] Ningún `console.*` en `bd.js`.
- **Pruebas**: lógica pura cubierta en T1; integración en el simulacro (O5).
- **Depende de**: T1

### T3 — Copia de blobs del script: `blobs.js`
- **Archivos**: crear `back/scripts/migracion-dev-prod/blobs.js`
- **Qué hacer**:
  - `crearClienteBlobs() → { cuenta, propiedades, copiar }` con `BlobServiceClient.fromConnectionString(require('../../src/config/env').azureStorage.connectionString)`; aserción `CONTENEDOR_ORIGEN !== CONTENEDOR_DESTINO` y `serviceClient.accountName === CUENTA_BLOB` (si no, lanza).
  - `propiedades(contenedor, blobPath) → { tamanoBytes, md5 (base64)|null } | null` (404 → `null`).
  - `copiar(blobPath) → { estado: 'copiado'|'ya-identico', url }`:
    1. `origen = propiedades(CONTENEDOR_ORIGEN, blobPath)`; si `null`, lanza `faltante en origen`.
    2. `destino = propiedades(CONTENEDOR_DESTINO, blobPath)`; si `blobYaIdentico(origen, destino)` → `ya-identico`.
    3. Si no: `createIfNotExists()` del contenedor destino (sin `access`, una vez), `destBlob.beginCopyFromURL(origenBlob.url)` sin SAS, `pollUntilDone()`, exigir `copyStatus === 'success'`, releer propiedades destino y exigir tamaño (y MD5 si el origen lo tiene) iguales.
    4. Exigir `destBlob.url === BASE_URL_DESTINO + blobPath` (C-10); devolver `url` (sin query string).
  - Errores: relanzar `new Error(formatearError(err) + ' · ' + blobPath)`; nunca adjuntar el error original.
  - Ninguna llamada a `delete`, `deleteIfExists` ni `setAccessPolicy`.
- **Criterios de aceptación**:
  - [ ] `grep -n "delete\|generateSas\|sig=" back/scripts/migracion-dev-prod/blobs.js` sin resultados.
  - [ ] No modifica `back/src/infrastructure/storage/blobClient.js`.
- **Pruebas**: `blobYaIdentico` y `formatearError` en T1; integración en O4.
- **Depende de**: T1

### T4 — Orquestador y CLI: `orquestador.js`, `index.js`, script npm
- **Archivos**: crear `back/scripts/migracion-dev-prod/orquestador.js` · crear `back/scripts/migracion-dev-prod/index.js` · modificar `back/package.json` (script `"migrar:dev-a-prod": "node scripts/migracion-dev-prod/index.js"`) · ampliar `back/test/scripts/migracion-dev-prod.test.js`
- **Qué hacer**:
  - `orquestador.js` exporta `migrar({ opciones, bd, blobs, conexiones: { knexDev, knexProd }, log, estado }) → Promise<{ ok: boolean }>`; no hace `require` de `bd.js`, `blobs.js`, knex ni env (todo inyectado). Pasos:
    1. **Identidad**: `bd.identidad` en ambos → `validarIdentidad` (C-01).
    2. **Esquema y migraciones**: `leerEsquema` + `compararEsquema` (aborta si hay diferencias), `leerMigraciones` iguales y `bloqueado === false` (C-12).
    3. **Lectura DEV**: `trxDev = abrirLecturaDev`; por tabla `leerTabla(trxDev, …)`; `ultimosIdentity(trxDev)`; `trxDev.rollback()` en `finally`; luego `knexDev.destroy()` (C-02). Aplicar `reescribirBlob` a las filas de `TABLAS_CON_BLOB` (aborta antes de cualquier escritura). Calcular hash DEV por tabla.
    4. **Blobs**: simulacro → `propiedades` en origen y destino, informa `faltan en origen`/`ya idénticos`/`por copiar` y aborta si falta alguno en origen; `ejecutar`/`solo-blobs` → `enParalelo(paths, 4, blobs.copiar)`, aborta si alguno falla. `solo-blobs` termina aquí.
    5. **Verificar** (modo `--verificar`): leer PROD con `knexProd` (sin `trx`) y saltar al paso 7.
    6. **Transacción PROD** (simulacro y ejecutar): `identCurrent` antes; `trxProd = await knexProd.transaction()`; `estado.trx = trxProd`; `prepararSesion`; `contarFilas` + `filasFixture` dentro del `trx` → `evaluarContenidoDestino` (imprime `aBorrar`; aborta si `!ok`); `vaciar`; `insertarTabla` en `ORDEN_TABLAS`; `reseed(ultimosIdentity DEV)`.
    7. **Verificación** (C-11, C-13): por tabla `contarFilas` y `hashFilas(leerTabla(trxProd|knexProd))` vs DEV; `identCurrent` igual a DEV en tablas con filas en DEV; `verificarBlobsFilas` en `TABLAS_CON_BLOB`; `fksConfiables` vacío; en `--verificar` además `blobs.propiedades` destino de cada `blob_path` con tamaño igual al origen.
    8. **Cierre**: si `estado.abortado` → rollback; simulacro → rollback siempre; ejecutar → `commit` solo si todo cuadra y `!estado.abortado`, si no rollback. `identCurrent` después (C-09). Cualquier excepción en 6–8 → rollback (si el `trx` sigue abierto) y relanzar. `estado.trx = null` al cerrar.
    9. Informe con `log` (`console.table` en producción): ver Contratos.
  - `index.js`: `parsearArgs(process.argv.slice(2))`; `crearConexiones()`, `crearClienteBlobs()`; `estado = { abortado: false, trx: null }`; `process.once('SIGINT'|'SIGTERM', …)` → `estado.abortado = true`, `estado.trx?.rollback()`, imprime "Interrumpido: la transacción se revierte"; `migrar(...)`; `catch` → `console.error(formatearError(err))`; `finally` → `destroy()` de ambos knex; `process.exitCode = ok ? 0 : 1`. No escribe archivos.
- **Criterios de aceptación**:
  - [ ] `npm run migrar:dev-a-prod` sin flags nunca llama `commit`.
  - [ ] Con DEV o PROD mal apuntados, aborta antes de `abrirLecturaDev` y de `abrirTransaccion`.
  - [ ] `knexDev.destroy()` ocurre antes de `knexProd.transaction()`.
  - [ ] `grep -nE "console\.[a-z]+\(.*(conexion|config|env\.|connectionString)" back/scripts/migracion-dev-prod/` sin resultados.
- **Pruebas** (en el mismo archivo de T1, con dobles en memoria de `bd`, `blobs`, `conexiones` y un `trx` falso que registra `commit`/`rollback`):
  1. Origen = destino (ambos `db-planogramas`) → `{ ok: false }`/rechazo, sin `abrirLecturaDev` ni `transaction`.
  2. Destino `OTB` → aborta sin escrituras.
  3. Modo `ejecutar` con `confirmar` `DB-Planogramas` → aborta sin escrituras.
  4. PROD con 1 Planograma extra sin `forzarVaciado` → rollback, sin `vaciar`; con `forzarVaciado` → continúa.
  5. `insertarTabla` lanza en `Posicion` → `rollback` llamado, `commit` nunca, la promesa rechaza.
  6. `estado.abortado = true` puesto durante `insertarTabla` → `rollback`, sin `commit`.
  7. Simulacro con todo correcto → `rollback`, sin `commit`, `{ ok: true }`.
  8. Ejecutar con todo correcto → `commit` una vez; con un hash distinto en una tabla → `rollback`.
  9. Orden: `knexDev.destroy` antes de `knexProd.transaction`.
  10. Fila de `Adjunto` con `blob_url` fuera de `adjuntos-dev` → aborta antes de `transaction` y de copiar blobs.
  11. `blobs.copiar` lanza para un blob (faltante en origen) → aborta sin abrir `transaction`.
  12. `solo-blobs` → copia y no abre `transaction`; `verificar` → no abre `transaction` ni llama funciones de escritura.
- **Depende de**: T1, T2, T3

### T5 — Documentación del procedimiento
- **Archivos**: modificar `Arquitectura/DESPLIEGUE_AZURE.md` (nuevo apartado dentro de "4. Publicar a PROD", después de "Migraciones en PROD": "Migración de datos DEV → PROD (2026-10-16)")
- **Qué hacer**: describir el script, los cuatro modos, el checklist O1–O7 de abajo, la vuelta atrás por PITR (BD nueva con otro nombre → renombrar o cambiar la cadena del App Service) y un espacio para anotar las horas UTC del punto de restauración de `db-planogramas` y `OTB`. Commit de docs separado del de código.
- **Criterios de aceptación**:
  - [ ] El apartado no contiene credenciales, hosts con usuario ni connection strings.
- **Pruebas**: —
- **Depende de**: T4

## Pasos operativos (los ejecuta el coordinador, no el desarrollador, solo tras la aprobación del usuario y con T1–T4 revisados)

| # | Paso | Criterio para continuar |
|---|---|---|
| O1 | En el portal: `planogramas-api-prod` con `NODE_ENV=production`, sin `PRUEBAS_HABILITADAS=true`, `AZURE_STORAGE_CONTAINER_ADJUNTOS=adjuntos` en la cuenta `planogramasstorage` (C-04). `conexion.prod.json` local con el login de administración (C-19). Confirmar con el usuario que Carol no edita DEV. | Todo confirmado por el usuario. |
| O2 | `cd back && npm run migrate:prod` (aplica `018_autor_nombre_evidencia_adjunto.js`) y `npm run migrate:prod:status`. | PROD sin pendientes. |
| O3 | El usuario confirma en el portal el punto de restauración más antiguo disponible de `db-planogramas` **y de `OTB`** y se anota la hora UTC de inicio de la ventana (C-18). Detener el App Service `planogramas-api-prod` (C-08). | Horas anotadas; App Service detenido. |
| O4 | `npm run migrar:dev-a-prod -- --solo-blobs --ejecutar --confirmar=db-planogramas`. | 91 blobs `copiados` o `ya idénticos`, 0 faltantes, salida 0. |
| O5 | Simulacro: `npm run migrar:dev-a-prod`. | Esquema idéntico, solo se borran los fixtures, todas las tablas con hash igual, FKs confiables, `ROLLBACK`, salida 0; revisar `IDENT PROD antes/después` (C-09). |
| O6 | Ejecución real: `npm run migrar:dev-a-prod -- --ejecutar --confirmar=db-planogramas`. | `COMMIT`, salida 0. Si falla: no reintentar a ciegas; leer el error y, si el commit es dudoso, ir a O7. |
| O7 | `npm run migrar:dev-a-prod -- --verificar`; iniciar el App Service; en la app PROD abrir un planograma, descargar un adjunto y una evidencia. Actualizar la tabla de migraciones de `CLAUDE.md` (PROD → `018`, fecha) y las horas en `DESPLIEGUE_AZURE.md`. | "Todas las tablas cuadran"; descargas funcionan. |

## Verificación final

- `cd back && npm test`
- Front: sin cambios (no aplica).
- Postman: no aplica (no hay endpoints; no se corre contra PROD).
- Revisión del diff: greps de C-13, C-15, C-17 (criterios de T2–T4).
- Prueba manual: pasos O4–O7.

## Riesgos

- Azure rechaza la copia sin SAS dentro de la misma cuenta → falla en O4 sin tocar la BD; se agrega en `blobs.js` una SAS de lectura de un solo blob, ≤ 15 min, nunca impresa (requiere ronda de revisión).
- El login de `conexion.prod.json` no tiene `ALTER` para `IDENTITY_INSERT`/`CHECKIDENT` → falla en el simulacro O5; usar el login de administración (C-19), no ampliar el de la app.
- Corte de red justo tras el `COMMIT` → estado dudoso; se resuelve con `--verificar` (O7).
- `RESEED` de `Seccion` (0 filas) puede entregar 61 o 62 como siguiente ID → inocuo, aceptado.
- El script se despliega con `back/` al App Service PROD → C-01 lo neutraliza (desde Kudu el origen sería `db-planogramas`); retirarlo después (DT-69).
- Con datos reales en PROD, DT-10/DT-01 (sin filtro por tienda) pasan a exponer las 45 tiendas a cualquier usuario con permiso de lectura → no bloquea; sube la prioridad de DT-10.
- Deuda a registrar en el cierre: DT-69 (retirar el script, baja) y nueva baja de ops (condición de `/pruebas` depende solo de `NODE_ENV`).
