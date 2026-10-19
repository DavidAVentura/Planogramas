# 02 — Seguridad e integridad: migración de datos DEV → PROD

Revisión de diseño sobre `00_solicitud.md` y `01_arquitectura.md`. Código consultado:
`back/knexfile.js`, `back/knexfile.prod.js`, `back/src/infrastructure/storage/blobClient.js`,
`back/src/infrastructure/http/routes/index.js` (rutas `/pruebas`),
`back/src/infrastructure/repositories/pruebas.repository.js`, `.gitignore`,
`.github/workflows/main_planogramas-api-prod.yml`. No se leyó `.env` ni `conexion.prod.json` y no
se escribió en ninguna BD.

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoints | Ninguno nuevo. Indirectamente, todos los de lectura de PROD pasan a servir datos reales. |
| BD destino (escritura) | `db-planogramas`: `DELETE` de las 17 tablas de la app, inserción con `IDENTITY_INSERT`, `DBCC CHECKIDENT`. Se aplica antes la migración 018. |
| BD origen (solo lectura) | `OTB`: 17 tablas de la app, lectura en transacción snapshot. **Contiene además tablas ajenas (Ventas, Presupuesto, Recompra, Transito…) y el trabajo de Carol**: es el activo que más se pierde si el script apunta al revés. |
| Blob | Cuenta `planogramasstorage`: lectura de `adjuntos-dev` (91 blobs, ~430 MB), escritura en `adjuntos`. Credencial: `AZURE_STORAGE_CONNECTION_STRING` del `.env` local (clave de cuenta, vía `env.azureStorage`). |
| Credenciales | `back/conexion.prod.json` (gitignored, `.gitignore:19`), `.env` local (DEV + blob). |
| Datos personales | Nombres y códigos de empleado en `Adjunto`, `EvidenciaImplementacion`, `EdicionAsignacion`, `AsignacionAuditoria`; `subido_por` no numéricos (DT-62). Son datos de la app y es legítimo que vivan en PROD, con los mismos controles de acceso que DEV. |
| Ejecutor | Una persona (David) desde su máquina, una vez. Sin roles de la app involucrados. |

## 2. Controles requeridos

### Protección contra apuntar a la BD equivocada

**C-01 · Bloqueante · Identidad de cada conexión verificada en vivo, no por configuración.**
Dónde: `back/scripts/migracion-dev-prod/index.js` (paso `precondiciones`) y `bd.js`.
Qué: antes de leer o escribir, ejecutar `SELECT DB_NAME() AS bd, @@SERVERNAME AS servidor` en cada
conexión y exigir **constantes en el código**: origen `OTB`, destino `db-planogramas`, ambos en
`comerciales`. `--confirmar=<x>` se compara contra el `DB_NAME()` real del destino (no contra
`conexion.prod.json`). Además, repetir `SELECT DB_NAME()` **sobre el objeto `trx` de PROD** justo
antes del primer `DELETE` (la conexión del pool que ejecuta el borrado es la que cuenta).
Escenario que evita: `.env` local editado para apuntar a `db-planogramas`, o `conexion.prod.json`
con `database: "OTB"` → con solo comparar nombres de config, el script vaciaría `OTB` (DEV).
También: si alguien corre el script desde la consola Kudu del App Service PROD, `knexfile.js` leería
las App Settings de PROD como "origen"; la constante `OTB` lo bloquea.
Verificación: prueba en `back/test/scripts/migracion-dev-prod.test.js` de la función pura
`validarIdentidad({ origen, destino, confirmar })` con los casos: origen = destino → error;
origen `db-planogramas` → error; destino `OTB` → error; `confirmar` distinto (incluye mayúsculas o
espacios) → error; caso correcto → ok.

**C-02 · Bloqueante · La conexión DEV no puede escribir.**
Dónde: `bd.js`. Qué: el objeto de DEV solo se expone a funciones de lectura (`leerTabla`,
`identCurrent`, `esquema`); ninguna función de vaciado/inserción/reseed recibe la conexión DEV como
parámetro genérico "knex" (firmas con nombre explícito, p. ej. `vaciar(trxProd)`), y la transacción
DEV termina siempre en `rollback()`. Escenario: un parámetro intercambiado (`cargar(trxDev, filas)`)
borraría DEV. Verificación: revisión del diff (ninguna llamada `insert/del/raw('DELETE|SET
IDENTITY|DBCC')` alcanzable con el objeto DEV) y aserción de C-01 (`DB_NAME()` del `trx` = destino)
como red de seguridad dentro de `vaciar`, `insertarLotes` y `reseed`.

**C-03 · Importante · Contenido de PROD esperado exacto, no solo "≤ 10 filas".**
Dónde: `index.js` (precondiciones) + `plan.js` (función pura `evaluarContenidoDestino`).
Qué: en ejecución, abortar salvo `--forzar-vaciado` si PROD tiene cualquier fila distinta de las
conocidas (Tienda id 1 `T004`, Accesorio id 1 `G-12-FIXTURE`, resto 0). Mostrar siempre qué se va a
borrar. El conteo debe hacerse **dentro de la transacción de PROD**, inmediatamente antes del
`DELETE`, para que no haya ventana entre el chequeo y el borrado.
Escenario: un usuario prueba PROD hoy y crea un planograma (1 fila) → el umbral de 10 no lo detecta
y se borra sin aviso. Verificación: prueba de `evaluarContenidoDestino` con PROD = fixtures → ok;
PROD con 1 Planograma → aborta; con `--forzar-vaciado` → ok con advertencia.

**C-04 · Importante · Rutas `/pruebas` deshabilitadas en PROD.**
`back/src/infrastructure/http/routes/index.js:47` monta `/pruebas` (fixtures y `limpieza`, que
borra planogramas/tiendas/adjuntos) si `PRUEBAS_HABILITADAS` y `NODE_ENV !== 'production'`.
Verificación manual en el portal antes de la ventana: App Service `planogramas-api-prod` con
`NODE_ENV=production` y sin `PRUEBAS_HABILITADAS=true`. Escenario: si `NODE_ENV` no está fijado en
PROD, una corrida de Postman contra PROD siembra fixtures entre datos reales y su `limpieza` borra
lo que considere suyo.

### Atomicidad, transacción y fallas a la mitad

**C-05 · Bloqueante · Una sola transacción PROD con `SET XACT_ABORT ON`.**
Dónde: `bd.js`, primera sentencia sobre el `trx`. Qué: `trx.raw('SET XACT_ABORT ON')` antes de
vaciar; todo (`DELETE` → inserciones → segunda pasada de autorreferencias → `RESEED` → verificación)
sobre el mismo `trx`; `commit` solo si la verificación (C-11) cuadra completa; cualquier excepción →
`rollback` + `process.exitCode = 1`. Escenario: sin `XACT_ABORT`, ciertos errores de sentencia (p. ej.
violación de FK en un lote) abortan solo esa sentencia y la transacción sigue viva; si un `catch`
intermedio traga el error, el commit deja una tabla con lotes faltantes. Verificación: simulacro con
un lote forzado a fallar (inyección por variable de prueba en `plan.js` o prueba unitaria del
orquestador con un `trx` falso que lanza en la tabla 14) → se llama `rollback`, nunca `commit`,
código de salida 1.

**C-06 · Bloqueante · Interrupción del proceso (Ctrl+C, cierre de la terminal, caída de red).**
Dónde: `index.js`. Qué: manejar `SIGINT`/`SIGTERM` → marcar abortado, `rollback` si la
transacción está abierta y `destroy()` de ambos knex; no hacer commit tras una señal. Si la conexión
se corta, SQL Server revierte la transacción abierta por sí solo: eso es aceptable y debe quedar
documentado en el informe. `SET IDENTITY_INSERT ... OFF` en `finally` por tabla (es por sesión y no se
revierte con el rollback); el pool PROD se destruye al final para no reutilizar una sesión con
`IDENTITY_INSERT` encendido. Verificación: prueba unitaria del orquestador: señal recibida durante
"cargar" → `rollback` llamado, `commit` no llamado.

**C-07 · Importante · Estado ambiguo tras el commit → modo `--verificar` de solo lectura.**
Dónde: `index.js`. Qué: un modo que solo lee DEV y PROD y corre la verificación de C-11 sin abrir
transacción de escritura. Escenario: la red cae justo después de enviar `COMMIT`; el script no sabe
si quedó aplicado. Sin este modo, la única opción es volver a ejecutar con `--forzar-vaciado`.
Verificación: ejecución de `--verificar` tras el commit real como paso 5 del procedimiento, con
salida "todas las tablas cuadran".

**C-08 · Importante · Tiempos de espera y bloqueos.**
Dónde: `bd.js` / config de knex del script. Qué: `requestTimeout` explícito suficiente para el lote
más grande y el `DELETE` (p. ej. 120 s; el default de tedious es 15 s) y `SET LOCK_TIMEOUT` (p. ej.
30 s) en el `trx` para fallar rápido si el App Service PROD tiene una sesión bloqueando, en vez de
quedarse colgado con bloqueos exclusivos. Procedimiento: **detener el App Service
`planogramas-api-prod` durante la ventana** (o confirmar por escrito que nadie lo usa); así nadie lee
datos a medias ni escribe entre el chequeo de C-03 y el `DELETE`. Verificación: el simulacro termina
dentro del tiempo; checklist de la ventana en `DESPLIEGUE_AZURE.md`.

**C-09 · Menor · Efectos del simulacro que no revierte el `ROLLBACK`.**
Los valores de identidad no son transaccionales: tras un simulacro con `IDENTITY_INSERT`, el
`IDENT_CURRENT` de PROD puede quedar avanzado (p. ej. Tienda en 45) aunque las filas se reviertan;
el efecto de `DBCC CHECKIDENT` dentro de una transacción revertida también debe comprobarse. Es inocuo
si después se ejecuta la carga real (que reseedea), pero el informe del simulacro debe mostrar
`IDENT_CURRENT` de PROD **antes y después** para que no sorprenda. Verificación: comparar las dos
columnas en la salida del simulacro.

### Exactitud de la carga y la verificación

**C-10 · Bloqueante · La reescritura de `blob_url` nunca guarda una SAS ni una URL inesperada.**
Dónde: `plan.js` (`reescribirBlob(fila)`) y `blobClient.copiar`. Qué: `blob_url` en PROD se arma como
`https://planogramasstorage.blob.core.windows.net/adjuntos/<blob_path>` (la `url` del cliente
destino sin firma). Abortar si: la URL resultante contiene `?` o `sig=`; el `blob_url` de DEV no
empieza exactamente con `.../adjuntos-dev/` + `blob_path`; o `blob_container` de DEV no es
`adjuntos-dev`. Escenario: si `copiar` devolviera la URL del origen con la SAS de 15 min (el diseño
genera una), quedaría una credencial persistida en PROD y además apuntando a DEV.
Verificación: pruebas de `reescribirBlob`: fila normal → URL esperada; fila con `blob_url` de otro
contenedor → error; URL con query string → error; `blob_path` con espacios/acentos → codificación
igual a la que hace el SDK.

**C-11 · Bloqueante · La verificación lee de vuelta PROD, no compara lo que se acaba de insertar.**
Dónde: `bd.js` (`hashTabla(conexion, tabla)`). Qué: el SHA-256 de PROD se calcula con un `SELECT`
nuevo sobre el `trx` con las mismas conversiones (`CONVERT(varchar(27), …, 121)`, `CAST(… AS
varchar(40))`), no a partir del arreglo en memoria que se insertó. Orden de filas: por PK **ordenado
en Node** (no `ORDER BY` en SQL, para no depender de la intercalación de `Producto.sku` o de la PK
compuesta de `VersionTienda`). Serialización canónica con `JSON.stringify` de un arreglo de valores
en el orden de `sys.columns`, de modo que `null` y la cadena `"null"`/`"NULL"` difieran. Para `Adjunto`
y `EvidenciaImplementacion`, además del hash, comprobar de forma independiente
`blob_url === base + blob_path` y `blob_container === 'adjuntos'` en cada fila de PROD (si no, el hash
de DEV "reescrito" y el de PROD usan la misma función y un error en ella pasaría desapercibido).
Verificación: pruebas de la canonicalización (null vs "null", orden de columnas, fechas con 7
decimales sin truncar, decimales sin pasar por `float`) y una prueba donde dos conjuntos difieren en
una sola fila → hashes distintos.

**C-12 · Importante · Esquema comparado completo, incluida la intercalación.**
Dónde: precondiciones. Qué: al comparar columnas DEV/PROD incluir `collation_name` además de tipo,
longitud, precisión, escala y nulabilidad; y comparar nombres y definición (`filter_definition`) de
índices únicos y nombres de FK. Escenario: si `db-planogramas` se creó con otra intercalación
(p. ej. sensible a mayúsculas), `tienda_codigo_unique` o la PK de `Producto.sku` se comportarían
distinto en PROD y la app tendría reglas de unicidad diferentes a las probadas en DEV. Además,
`knex_migrations` igual en nombres (001–018) y `knex_migrations_lock.is_locked = 0`.
Verificación: salida del simulacro con "esquema idéntico: sí" por tabla.

**C-13 · Importante · FKs confiables y sin desactivar restricciones.**
Confirmado en el diseño: sin `NOCHECK CONSTRAINT`. Mantenerlo: el diff no debe contener `NOCHECK`,
`DISABLE TRIGGER` ni `ALTER TABLE`. Tras la carga, `sys.foreign_keys.is_not_trusted = 0` e
`is_disabled = 0` en todas. Verificación: revisión del diff + línea en el informe.

### Copia de blobs y SAS

**C-14 · Importante · Copia sin SAS si es posible; si se usa, mínima y nunca impresa.**
Dónde: `blobClient.copiar`. Qué: dentro de la misma cuenta, `beginCopyFromURL` admite autorizar el
origen con la misma clave compartida del cliente (Copy Blob asíncrono), por lo que se puede omitir la
SAS; probarlo primero en el simulacro con un blob. Si hace falta SAS: permiso `r` únicamente, alcance
un solo blob (como `generarUrlDescarga`), vigencia ≤ 15 min, nunca de contenedor ni de cuenta.
Errores del SDK: imprimir solo `statusCode`, `code` y `blob_path`; **nunca** el objeto `RestError`
completo ni `err.request` (incluye cabeceras como `x-ms-copy-source`, donde iría la SAS).
Verificación: prueba de la función de formateo de errores del script con un error simulado que
trae una URL con `?sv=…&sig=…` → la salida no contiene `sig=`.

**C-15 · Importante · Dirección y destino de la copia fijos; la copia nunca borra.**
Qué: constantes `ORIGEN = 'adjuntos-dev'`, `DESTINO = 'adjuntos'`, aserción `ORIGEN !== DESTINO`;
el script no llama a `eliminar`/`deleteIfExists` en ningún contenedor. `createIfNotExists` del
destino sin opción `access` (queda privado). Escenario: origen y destino intercambiados → copiaría
desde `adjuntos` (vacío) hacia `adjuntos-dev`; con un `blob_path` coincidente sobrescribiría el
archivo de DEV. Verificación: revisión del diff (grep de `delete`), prueba de la validación de
contenedores.

**C-16 · Importante · Idempotencia por contenido, no solo por tamaño; copia completada.**
Qué: tras `pollUntilDone`, exigir `copyStatus === 'success'`. Para "ya existe, no copio" comparar
`contentLength` **y** `contentMD5` cuando el origen lo tenga (si el origen no tiene MD5, volver a
copiar: es servidor a servidor y barato). Escenario: un blob destino con el mismo tamaño pero
contenido distinto (p. ej. un reintento previo interrumpido o un archivo de prueba) se daría por
bueno. Verificación: informe de blobs con `copiados · ya idénticos · faltan en origen`, y abortar
la carga de BD si algún blob referenciado no está en el destino con el mismo tamaño/MD5.

### Credenciales y salida

**C-17 · Bloqueante · Nada secreto en consola, disco ni repo.**
Qué: nunca imprimir el objeto de configuración de knex, `conexion.prod.json`, `env.db`,
`env.azureStorage` ni la connection string; para identificar destinos usar solo `host`/`DB_NAME()`
(como hace `knexfile.prod.js`). El script no escribe archivos (informe solo por consola). Ningún
valor de conexión en el código del script (todo desde `knexfile*.js` y `env.js`). `conexion.prod.json`
sigue en `.gitignore` y fuera del commit. Errores de tedious/knex: imprimir `err.number`/`err.code`
y un mensaje recortado (≤ 300 caracteres): knex antepone a su mensaje la consulta con los parámetros
sustituidos, y en un lote de 83 filas eso vuelca nombres de empleados a la consola.
Verificación: revisión del diff (grep de `console.*(conexion|config|env\.|connectionString)`) y
prueba del formateador de errores con un mensaje largo de knex → salida recortada.

### Respaldo y vuelta atrás

**C-18 · Bloqueante · Punto de restauración confirmado de ambas bases antes de ejecutar.**
Qué, en el portal de Azure, antes del paso 3:
1. `db-planogramas`: comprobar que "Restauración a un momento dado" muestra un punto de restauración
   más antiguo disponible (una BD recién creada puede no tener todavía su primer respaldo completo).
2. **`OTB` también**: es la que se perdería si fallaran C-01/C-02, y contiene datos ajenos a la app.
   Confirmar su retención PITR y anotar la hora UTC.
3. Anotar la hora UTC de inicio de la ventana en `DESPLIEGUE_AZURE.md`.
4. Opcional, recomendado para `OTB` si la retención es corta: exportar un BACPAC o `CREATE DATABASE …
   AS COPY OF` (costo temporal) antes de la ventana.
Documentar el procedimiento de vuelta atrás: PITR crea una BD nueva con otro nombre; volver
requiere renombrar o cambiar la cadena de conexión del App Service. Verificación: captura/nota con
las horas en el apartado de la operación en `DESPLIEGUE_AZURE.md`.

**C-19 · Menor · Permisos del login PROD.**
`SET IDENTITY_INSERT` y `DBCC CHECKIDENT` requieren `ALTER` sobre la tabla (dueño, `db_ddladmin` o
`db_owner`). Si el login de `conexion.prod.json` es el de la app con permisos mínimos, el simulacro
fallará pronto (bien). No conceder permisos de más al login de la app para esto: usar el login de
administración solo en la máquina de quien migra.

## 3. Pruebas de abuso / fallo que el desarrollador debe cubrir

En `back/test/scripts/migracion-dev-prod.test.js` (lógica pura y orquestador con dobles):

1. `.env` con `DB_NAME=db-planogramas` (origen = destino) → aborta antes de cualquier escritura.
2. `conexion.prod.json` con `database: "OTB"` → aborta (destino ≠ `db-planogramas`).
3. `--ejecutar` sin `--confirmar` o con `--confirmar=DB-Planogramas` → aborta.
4. PROD con un Planograma además de los fixtures, sin `--forzar-vaciado` → aborta y lista lo que habría borrado.
5. Error en el lote de `Posicion` → `rollback`, sin `commit`, código de salida 1, `IDENTITY_INSERT OFF` ejecutado.
6. `SIGINT` durante la carga → `rollback`, sin `commit`.
7. Hash: dos conjuntos que difieren solo en `null` vs `"null"`, o en el 7.º decimal de un `datetime2` → hashes distintos.
8. Fila de `Adjunto` con `blob_url` fuera de `adjuntos-dev` → aborta antes de la transacción.
9. `copiar` que devuelve URL con query string → `reescribirBlob` lanza error.
10. Error del SDK de blob con `sig=` en la URL → la salida formateada no lo contiene.
11. Blob destino con mismo tamaño y MD5 distinto → se vuelve a copiar.
12. Blob referenciado inexistente en `adjuntos-dev` → aborta la carga de BD (no se inserta una fila con archivo faltante).

Manuales en la ventana: simulacro completo en PROD con salida "cuadra" y `IDENT_CURRENT` antes/después
(C-09); ejecución real; `--verificar`; en la app PROD: abrir un planograma, descargar un adjunto y una
evidencia (confirma que `blob_container='adjuntos'` y que el App Service tiene acceso a ese contenedor).

## 4. Deuda detectada

- **DT-69 (propuesta por arquitectura) · Baja**: el script queda en el repo y además **se despliega
  al App Service PROD** (`main_planogramas-api-prod.yml` empaqueta `back/` con `package: .`); desde la
  consola Kudu se podría invocar con las App Settings de PROD. C-01 lo neutraliza, pero conviene
  retirarlo tras confirmar PROD estable.
- **DT-10 / DT-01 (abiertas, alta)**: hasta hoy PROD no tenía datos reales; con esta copia, la falta
  de filtro por tienda del usuario pasa a exponer en PROD los planogramas, asignaciones y evidencias
  de las 45 tiendas a cualquier usuario autenticado con el permiso de lectura. No bloquea la
  migración (el usuario pidió PROD idéntico a DEV), pero sube la prioridad de DT-10.
- **DT-62 (abierta)**: se hereda en PROD tal cual (filas con `subido_por` no numérico).
- **DT-64 (abierta)**: no se arrastra; solo se copian blobs referenciados.
- **Nueva propuesta · Baja · ops**: `/pruebas` depende de `NODE_ENV` correctamente fijado en el App
  Service (C-04); si no está fijado, las rutas destructivas de fixtures quedarían montadas en PROD
  con datos reales. Registrar la verificación en `DESPLIEGUE_AZURE.md` o endurecer la condición
  (p. ej. también exigir `env.db.name !== 'db-planogramas'`).

## Resumen

Bloqueantes: 8 (C-01, C-02, C-05, C-06, C-10, C-11, C-17, C-18). Importantes: 9 (C-03, C-04, C-07,
C-08, C-12, C-13, C-14, C-15, C-16). Menores: 2 (C-09, C-19).
