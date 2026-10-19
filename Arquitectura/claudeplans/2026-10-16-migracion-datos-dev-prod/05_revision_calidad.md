# 05 — Revisión de calidad: migración de datos DEV → PROD

Diff revisado: `git diff 2f79752` (`Arquitectura/DESPLIEGUE_AZURE.md`, `back/package.json`) más los
archivos nuevos `back/scripts/migracion-dev-prod/{plan,bd,blobs,orquestador,index}.js` y
`back/test/scripts/migracion-dev-prod.test.js`. Contra `PLAN.md` y `04_implementacion.md`.

`cd back && npm test`: 245 pruebas, 245 OK. No se ejecutó el script ni se tocó ninguna BD o blob.

## Resumen

| Severidad | Cantidad |
|---|---|
| Bloqueante | 0 |
| Importante | 2 |
| Menor | 8 |

Lo que está bien y conviene conservar: el orden topológico coincide con las FK de las migraciones;
todas las tablas tienen PK; `t.datetime` de knex en mssql es `datetime2`, así que la conversión ISO
no depende del idioma del login; `knex.raw` en mssql devuelve el arreglo de filas, como asume `bd.js`;
`pool.max = 1` en PROD no provoca bloqueos porque, con el `trx` abierto, todo pasa por `trxProd`;
el `commit` solo ocurre en `ejecutar`, con la verificación completa y `!estado.abortado`, y cualquier
otro camino termina en rollback o en el cierre de la conexión. Los greps de C-13, C-15 y C-17 no
encuentran nada.

## Hallazgos

### I-1 · Importante — Los errores de SQL se recortan antes de llegar al mensaje real
- **Dónde**: `back/scripts/migracion-dev-prod/plan.js:202-206` (`formatearError`), usado en `index.js:240`.
- **Problema**: knex 3.3 reescribe `err.message` como `formatQuery(sql, bindings) + ' - ' + mensajeOriginal`
  (`node_modules/knex/lib/execution/internal/query-executioner.js:41`). `formatearError` se queda con
  los **primeros** 300 caracteres, así que en cualquier `INSERT` de lote (cientos de valores ya
  sustituidos en el texto) la causa real (FK, truncado, permiso de `IDENTITY_INSERT`/`CHECKIDENT`,
  timeout) queda cortada y nunca se imprime. Además `code` tiene prioridad sobre `number`, así que
  se ve `[EREQUEST]` y no el número de error de SQL Server (547, 8152, 1088…).
- **Escenario**: en O5 el login no tiene `ALTER` sobre `Tienda`. La salida es
  `[EREQUEST] insert into [Tienda] ([id], [codigo], … values (1, N'T001', …` sin el motivo. El plan
  dice en O6 "leer el error", pero el error no se puede leer. Además los 300 caracteres que sí se
  imprimen traen datos de las filas (nombres, notas): no son secretos, pero sobran.
- **Corrección**: si el mensaje contiene `' - '`, quedarse con lo que va después del último
  separador (o recortar por el final, `slice(-300)`), y usar `err.number ?? err.code ?? err.statusCode`.
  Agregar un caso a la prueba 10 con un mensaje con el formato de knex (`'insert into … ' + 'x'.repeat(2000) + ' - The INSERT statement conflicted…'`)
  que exija que el texto final aparezca en la salida.

### I-2 · Importante — `SIGINT`/`SIGTERM` no detiene el flujo antes de la carga, y el rollback del manejador casi nunca surte efecto (C-06)
- **Dónde**: `back/scripts/migracion-dev-prod/index.js:228-234`; `orquestador.js:46-170` (el
  único chequeo de `estado.abortado` antes del cierre está en la línea 169).
- **Problema**:
  1. Si la señal llega durante la lectura de DEV o la copia de blobs, el orquestador sigue: abre el
     `trx` de PROD, ejecuta `prepararSesion`, cuenta, hace `vaciar` (DELETE de todo) e inserta la
     primera tabla, y recién entonces lanza. El rollback lo deja todo bien, pero el operador pidió
     detener y el script toma bloqueos en PROD y sube el identity de `Tienda` con `IDENTITY_INSERT`
     (ese cambio no se revierte).
  2. Durante la carga casi siempre hay una consulta en curso. El `rollback()` de knex para mssql pone
     `_completed = true` y rechaza con "Can't rollback transaction. There is a request in progress"
     (`node_modules/knex/lib/dialects/mssql/transaction.js:84-101`); el `.catch(() => {})` lo oculta.
     Desde ahí el `trx` queda marcado como completo pero la transacción del servidor sigue abierta;
     el `revertir` del orquestador ya no hace nada. Al final, el `destroy()` del pool (o un segundo
     Ctrl+C) cierra la conexión y el servidor revierte. Los datos quedan bien, pero no por el
     mecanismo que el plan describe, y la prueba T4-6 solo simula la bandera.
- **Escenario**: en O6, el operador hace Ctrl+C mientras se copian los blobs porque vio algo raro. Ve
  "Interrumpido: la transacción se revierte", pero el script todavía borra PROD dentro de una
  transacción, inserta `Tienda` y después aborta. Si el Ctrl+C cae a mitad de `Posicion`, la
  transacción sigue abierta (con bloqueos) hasta que el proceso termina.
- **Corrección**: en el manejador, solo poner `estado.abortado = true` (no llamar a `rollback`
  mientras haya una consulta en curso). En el orquestador, revisar `estado.abortado` después de la
  lectura de DEV, después de los blobs (también dentro del callback de `enParalelo`, para no seguir
  copiando) y justo antes de `knexProd.transaction()`, y lanzar `Interrumpido` en cada punto. El
  rollback lo hace el `catch` del orquestador, que es el que sabe que no hay consulta en curso.
  Agregar una prueba: con `abortado` puesto durante la copia de blobs, no se llama `transaction`.

### M-1 · Menor — `ordenarPorPk` con PK vacía produce un hash que depende del orden de lectura
- **Dónde**: `plan.js:134-142`, `orquestador.js:64,95`.
- **Problema**: si una tabla no tuviera PK (`pk = []`), el orden lo daría el `SELECT` sin `ORDER BY`
  y los hashes de DEV y PROD podrían diferir aunque los datos sean iguales. Hoy las 17 tablas tienen
  PK, así que no ocurre.
- **Corrección**: en `compararEsquema` (o en `hashFilas`), rechazar las tablas con `pk.length === 0`.

### M-2 · Menor — `leerEsquema` no filtra por esquema `dbo` ni marca columnas calculadas
- **Dónde**: `bd.js:41-91` (también `ultimosIdentity`, `bd.js:111-119`).
- **Problema**: `sys.tables` se agrupa solo por nombre. Si `OTB` tiene una tabla con el mismo nombre
  en otro esquema (en esa BD hay tablas ajenas), sus columnas se mezclan con las de `dbo`. Una
  columna `is_computed` haría fallar el `INSERT`. En los dos casos el script aborta (es seguro),
  pero con un mensaje confuso.
- **Corrección**: `WHERE SCHEMA_NAME(t.schema_id) = 'dbo'` y abortar si hay `c.is_computed = 1`.

### M-3 · Menor — La URL del blob destino se valida después de copiar y no se valida si el blob ya era idéntico
- **Dónde**: `blobs.js:260-261` y `blobs.js:274`.
- **Problema**: el plan (C-10, T3 paso 4) pide que se exija `url === BASE_URL_DESTINO + blobPath`.
  En el camino `ya-identico` no se valida, y en el camino `copiado` se valida después de la copia.
  `reescribirBlob` y `verificarBlobsFilas` ya cubren la fila de BD, así que el impacto es bajo.
- **Corrección**: validar `blobDestino.url` justo después de `getBlobClient`, antes de las dos ramas.

### M-4 · Menor — En `blobs.copiar` la ruta queda doble en el mensaje y el error se envuelve dos veces
- **Dónde**: `blobs.js:251` y `blobs.js:276-278`.
- **Problema**: un error de `propiedades` ya trae `· blobPath`, y el `catch` de `copiar` lo vuelve a
  envolver: `[ERROR] [403] … · v1/a.pdf · v1/a.pdf`.
- **Corrección**: en el `catch` de `copiar`, relanzar sin cambios los errores que ya vienen formateados,
  o formatear solo en un lugar.

### M-5 · Menor — Lógica de "ya idéntico" duplicada en el simulacro
- **Dónde**: `orquestador.js:75`.
- **Problema**: repite a mano `blobYaIdentico`, aunque ya está en `plan.js` y tiene prueba.
- **Corrección**: `return blobYaIdentico(o, d) ? 'identico' : 'por-copiar';`.

### M-6 · Menor — Si un blob falla, los demás se siguen copiando en segundo plano
- **Dónde**: `plan.js:208-219` (`enParalelo`), usado en `orquestador.js:81`.
- **Problema**: `Promise.all` rechaza al primer error, pero los otros trabajadores siguen tomando
  rutas y copiando mientras el script ya informa el aborto. Como la copia es idempotente, no hace
  daño; solo confunde y alarga la salida.
- **Corrección**: poner una bandera `fallo` que corte el `while` del trabajador (se puede unificar
  con `estado.abortado` de I-2).

### M-7 · Menor — La prueba "destino OTB" no ejercita la regla del destino
- **Dónde**: `back/test/scripts/migracion-dev-prod.test.js:280-284`.
- **Problema**: con `origen = OTB` y `destino = OTB` falla primero por "misma base". Nunca se prueba
  en el orquestador el caso origen correcto y destino equivocado (por ejemplo `otra`).
  `validarIdentidad` sí lo cubre en T1.
- **Corrección**: usar `destino: { bd: 'otra', servidor: 'comerciales' }` y exigir `/destino/`.

### M-8 · Menor — La afirmación sobre `DBCC CHECKIDENT` en la documentación es imprecisa
- **Dónde**: `Arquitectura/DESPLIEGUE_AZURE.md` (párrafo "El reseed de identity…").
- **Problema**: lo que con seguridad no se revierte es el avance del identity que provoca
  `IDENTITY_INSERT` con IDs explícitos. Que el `RESEED` en sí no sea transaccional no está
  verificado. La conclusión práctica (el simulacro puede dejar los identity de PROD distintos; ver
  `IDENT PROD antes/después`) es correcta.
- **Corrección**: redactarlo como "los valores de identity de PROD pueden quedar movidos después
  del simulacro; el informe muestra antes y después", sin afirmar la causa.

## Deuda

No se agrega deuda nueva por esta revisión. Ya están identificadas para el cierre DT-69 (retirar el
script) y la condición de `/pruebas`, que solo depende de `NODE_ENV`.

## Veredicto

**Requiere cambios**: I-1 e I-2 son correcciones acotadas (formatear el error y revisar
`estado.abortado` antes de abrir el `trx`) y conviene tenerlas antes de O4–O6. Las menores son
opcionales.

## Ronda 2

Revisado: lo corregido según "Correcciones ronda 1" de `04_implementacion.md` (`plan.js`,
`orquestador.js`, `index.js`, pruebas, `DESPLIEGUE_AZURE.md`). `cd back && npm test`: 249 pruebas,
249 OK. No se ejecutó el script ni se tocó ninguna BD o blob.

| Hallazgo ronda 1 | Estado |
|---|---|
| I-1 (`formatearError`) | Corregido para los errores de knex (prioridad a `err.number`, se queda con la causa, `slice(-300)`, con prueba). La corrección introduce I-3. |
| I-2 (Ctrl+C) | **Cerrado.** El manejador solo marca `abortado`. `verificarInterrupcion` se revisa en cada tabla de DEV, después de los blobs, antes de `knexProd.transaction()` y antes de `vaciar`. `enParalelo` deja de tomar trabajos con `detener` o tras el primer fallo (también cierra M-6). Los resultados parciales de `enParalelo` no se usan porque `verificarInterrupcion` lanza antes del `filter`. |
| M-5, M-6, M-8 | Cerrados. |
| M-1 a M-4, M-7 | Siguen abiertos (opcionales). |

### I-3 · Importante — El corte en el último `' - '` se aplica a todos los errores, no solo a los de knex
- **Dónde**: `back/scripts/migracion-dev-prod/plan.js` (`formatearError`, `lastIndexOf(' - ')`);
  afecta a `orquestador.js:37` y al `COMMIT dudoso` de `orquestador.js` (bloque del `commit`).
- **Problema**: el script también usa `' - '` en sus propios mensajes, y el corte se aplica a todos.
  - **Esquema distinto (C-12)**: el error es
    `El esquema de DEV y PROD no es idéntico:\n - dif1\n - dif2…`. Después del corte solo queda la
    última diferencia, sin el encabezado.
  - **Commit dudoso (C-07)**: `COMMIT dudoso: ejecutar --verificar … ${err.message}`. Si el mensaje
    del driver trae `' - '` (tedious usa la forma `Connection lost - <causa>` en los cortes de
    conexión), se pierde justo la instrucción de correr `--verificar`, que es lo que hay que hacer
    en ese caso.
- **Escenario**: en O6 se corta la red durante el `COMMIT` y la consola muestra solo
  `[ESOCKET] read ECONNRESET`. Nada indica que el estado es dudoso. En O5 una diferencia de esquema
  se ve como una línea suelta (`Seccion.padre_id: DEV … · PROD …`) sin decir que el script abortó
  por esquema ni cuántas diferencias hay.
- **Corrección**: cortar solo los errores que vienen de knex o del driver, por ejemplo con
  `err.number !== undefined || err.code === 'EREQUEST'`. Para el commit, armar el texto con
  `formatearError(err)` dentro del orquestador, de modo que el error externo sea propio y no se
  corte. Agregar dos pruebas: un `Error` propio con `'\n - a\n - b'` conserva el encabezado, y el
  mensaje del commit dudoso conserva `--verificar` aunque la causa traiga `' - '`.

### Veredicto ronda 2

**Requiere cambios**: I-2 cerrado. I-1 quedó corregido para los errores de knex, pero introdujo
I-3, una corrección de pocas líneas. Sin bloqueantes.
