# 01 — Arquitectura: migración de datos DEV → PROD

Esquema inspeccionado en vivo el 2026-10-16 (consultas de solo lectura a `sys.*` en `OTB` y
`db-planogramas`). Ninguna escritura en ninguna BD.

## 1. Entendimiento

Copia única y completa de las 17 tablas de la app desde DEV (`OTB`) a PROD (`db-planogramas`), mismo
servidor Azure SQL, conservando los IDs. PROD se vacía antes (hoy solo tiene la tienda y el accesorio
de prueba). Los 91 archivos referenciados (89 adjuntos + 2 evidencias, ~430 MB) se copian del
contenedor `adjuntos-dev` a `adjuntos`, y en PROD se reescriben `blob_container` y `blob_url`.
No toca ningún caso de uso funcional (`CU-XX`): es una operación de datos con un script de una sola
ejecución. Indirectamente afecta a todos los CU de lectura en PROD (empiezan a ver datos reales).

## 2. Flujo de proceso

Lo ejecuta una persona (David) desde su máquina, en `back/`, una sola vez:

1. **Congelar**: Carol deja de editar en DEV y nadie usa PROD durante la ventana (PROD recién
   publicado, sin usuarios). Se anota la hora UTC (punto de restauración PITR de Azure SQL).
2. **Esquema**: `npm run migrate:prod` aplica `018_autor_nombre_evidencia_adjunto.js` en PROD.
3. **Simulacro**: `npm run migrar:dev-a-prod` (sin flags) — corre la carga completa en PROD dentro
   de una transacción, verifica y hace **ROLLBACK**; para blobs solo comprueba que existan en origen.
   Imprime un informe por tabla.
4. **Ejecutar**: `npm run migrar:dev-a-prod -- --ejecutar --confirmar=db-planogramas` — copia blobs,
   carga la BD en una transacción, verifica dentro de la transacción y hace **COMMIT** solo si todo
   cuadra.
5. **Comprobar**: abrir la app PROD (planograma, descarga de un adjunto, evidencia) y actualizar la
   tabla de migraciones de `CLAUDE.md` (PROD → 018).

Estados del script: `precondiciones → blobs → vaciar → cargar → reseed → verificar → commit|rollback`.
Cualquier falla en un paso antes del commit deja PROD como estaba.

## 3. Impacto por capa

| Capa | Archivos / módulos | Tipo de cambio |
|---|---|---|
| Dominio | — | Ninguno |
| Aplicación | — | Ninguno |
| Infraestructura (storage) | `back/src/infrastructure/storage/blobClient.js` | Nueva función `copiar({ origen:{container,blobPath}, destino:{container,blobPath} })`: SAS de lectura de 15 min del origen + `beginCopyFromURL` + `pollUntilDone`; devuelve `{ url, tamanoBytes }`. Idempotente: si el destino ya existe con el mismo `contentLength`, no copia. |
| Script (nuevo) | `back/scripts/migracion-dev-prod/index.js` | CLI: parseo de flags, conexiones, orquestación de pasos, informe. |
| Script (nuevo) | `back/scripts/migracion-dev-prod/plan.js` | Lógica pura: lista de tablas en orden, columnas autorreferenciadas, tamaño de lote, reescritura de `blob_url`, serialización canónica de filas para el hash. |
| Script (nuevo) | `back/scripts/migracion-dev-prod/bd.js` | Lectura DEV (selección con conversiones), vaciado, inserción por lotes con `IDENTITY_INSERT`, segunda pasada de autorreferencias, `RESEED`, hash por tabla. |
| Configuración | `back/package.json` | Script `"migrar:dev-a-prod": "node scripts/migracion-dev-prod/index.js"`. Sin paquetes nuevos (`knex`, `tedious`, `@azure/storage-blob` ya están). |
| Pruebas | `back/test/scripts/migracion-dev-prod.test.js` | `node:test` sobre `plan.js` (orden, lotes, reescritura de URL, canonicalización). |
| BD | — | Sin migración nueva; se aplica la 018 pendiente en PROD. |
| Front | — | Ninguno |
| Docs | `CLAUDE.md` (tabla de migraciones), `Arquitectura/DESPLIEGUE_AZURE.md` (apartado "Migración de datos DEV → PROD, 2026-10-16"), `MEMORIA_PROYECTO.md` | Registro de la operación. |

Conexiones: DEV con `require('back/knexfile.js')`, PROD con `require('back/knexfile.prod.js')` (lee
`conexion.prod.json`, imprime solo host/BD). Blob con el `blobClient` (connection string del `.env`
vía `env.azureStorage`). El script vive fuera de `src/` porque no es parte de la app desplegada;
`back/scripts/` no se carga desde `index.js`.

## 4. Contratos

No hay endpoints nuevos ni modificados. Contrato del CLI:

| Invocación | Efecto |
|---|---|
| `npm run migrar:dev-a-prod` | Simulacro (por defecto): todo en transacción PROD + ROLLBACK; blobs solo `exists()` en origen. Código de salida 0 si la verificación cuadra. |
| `... -- --ejecutar --confirmar=db-planogramas` | Ejecución real. Si `--confirmar` no coincide exactamente con `database` de la conexión PROD, aborta antes de conectar a escribir. |
| `... -- --solo-blobs --ejecutar --confirmar=db-planogramas` | Reintento solo de la copia de blobs (idempotente), por si falló la red. |

Salida: tabla por tabla `filas DEV · filas PROD · hash igual (sí/no) · IDENT_CURRENT DEV/PROD`, y
resumen de blobs `copiados · ya existían · faltan en origen`. Nunca imprime credenciales, connection
strings ni URLs SAS; las URLs de blob se muestran sin query string.

## 5. Datos

### Precondiciones (abortan si fallan)

- `database` de DEV = `OTB` y de PROD = `db-planogramas`; host igual en ambas (`comerciales...`).
  Si DEV y PROD resolvieran la misma BD, abortar.
- `knex_migrations` de PROD tiene exactamente los mismos nombres que DEV (hoy 001–018 tras el paso 2).
- Esquema idéntico: para cada tabla, mismo conjunto de columnas (nombre, tipo, longitud, precisión,
  escala, nulabilidad) en DEV y PROD.
- PROD sin filas "inesperadas": se informa lo que se va a borrar (hoy Tienda 1, Accesorio 1). En
  ejecución, si alguna tabla de PROD tiene más de 10 filas, abortar salvo `--forzar-vaciado`
  (protege contra correr el script por error cuando PROD ya tenga uso real).
- Todos los blobs referenciados existen en `adjuntos-dev`.

### Esquema real relevante (verificado)

- 17 tablas; 15 con `id int IDENTITY(1,1)`. Sin identity: `Producto` (PK `sku`) y `VersionTienda`
  (PK compuesta). No se copian `knex_migrations` ni `knex_migrations_lock` (las gestiona Knex), ni
  las tablas ajenas de `OTB` (Ventas, Presupuesto, Recompra, Transito, Transitos, EFGDepartamento, msg).
- Sin triggers, sin columnas calculadas, sin `rowversion`, sin CHECK constraints. Los `DEFAULT`
  (`getdate()`, `'borrador'`, etc.) no intervienen: se insertan todos los valores explícitos.
- Índices únicos filtrados: `accesorio_codigo_unique`, `tienda_codigo_unique` y los 4
  `UQ_Version_*` (una versión base por estado por planograma). DEV ya los cumple, así que cargan sin
  conflicto una vez vacío PROD.
- Autorreferencias: `PlanogramaVersion.version_base_id`, `Producto.sku_sustituto`, `Seccion.padre_id`
  (hoy 0 filas usan cada una, pero el script las soporta).
- `datetime2(7)` con fracción por debajo del milisegundo en DEV (53 adjuntos, 39 versiones,
  26 ediciones): **leerlos como `Date` de JS los truncaría**. Se leen como texto
  `CONVERT(varchar(27), col, 121)` y se insertan como texto (SQL Server los convierte exacto).
- `decimal(p,s)` se leen como texto `CAST(col AS varchar(40))` y se insertan como texto, para no
  pasar por `float`.
- `AsignacionAuditoria` guarda `planograma_id`, `tienda_id`, `version_anterior_id`,
  `version_nueva_id` **sin FK**: conservar los IDs es lo que mantiene la auditoría coherente.

### Orden de carga (topológico por FK)

| # | Tabla | Depende de |
|---|---|---|
| 1 | Tienda | — |
| 2 | Accesorio | — |
| 3 | Producto | Producto (`sku_sustituto`, segunda pasada) |
| 4 | Planograma | — |
| 5 | EdicionAsignacion | — |
| 6 | PlanogramaSubcategoria | Planograma |
| 7 | PlanogramaVersion | Planograma, PlanogramaVersion (`version_base_id`, segunda pasada) |
| 8 | VersionTienda | PlanogramaVersion, Tienda |
| 9 | Adjunto | PlanogramaVersion |
| 10 | HistorialSustitucion | PlanogramaVersion |
| 11 | Gondola | PlanogramaVersion |
| 12 | Seccion | Gondola, Seccion (`padre_id`, segunda pasada) |
| 13 | Nivel | Gondola, Seccion, Accesorio |
| 14 | Posicion | Nivel, Producto |
| 15 | PosicionAccesorio | Posicion, Accesorio |
| 16 | EvidenciaImplementacion | PlanogramaVersion, Tienda, Gondola |
| 17 | AsignacionAuditoria | EdicionAsignacion |

**Vaciado**: `DELETE FROM` en orden inverso (17 → 1). No `TRUNCATE` (no se permite con FKs que la
referencian). Las cascadas existentes no estorban porque se borra de hija a padre.

**Autorreferencias**: primera pasada insertando la columna autorreferenciada en `NULL`; al terminar
la tabla, `UPDATE ... SET col = valor` para las filas que la tenían. Sin `NOCHECK CONSTRAINT`: no
se toca DDL ni se arriesga dejar FKs como no confiables.

**Identity**: por tabla, `SET IDENTITY_INSERT [T] ON` → inserción por lotes → `SET IDENTITY_INSERT
[T] OFF`, todo sobre la conexión de la transacción (`trx.raw`), porque `IDENTITY_INSERT` es por
sesión y solo una tabla a la vez. Después, `DBCC CHECKIDENT('[T]', RESEED, n)` con
`n = IDENT_CURRENT` de DEV (no el máximo id), para que PROD no reutilice IDs borrados en DEV que la
auditoría puede seguir citando. Solo cuando `IDENT_CURRENT` de DEV no sea `NULL` y la tabla tenga
filas en DEV; si DEV la tiene vacía y nunca usada (hoy `HistorialSustitucion`), no se reseedea.
Caso `Seccion` (0 filas en DEV, último valor 61): se reseedea a 61; PROD entregará 61 o 62 como
siguiente según la semántica de `CHECKIDENT` en tablas nunca usadas — es inocuo y se acepta.

**Lotes**: tedious admite 2100 parámetros por consulta → `tamañoLote = floor(2000 / nºColumnas)`
(Posicion 24 columnas → 83 filas por lote). `trx.batchInsert` o `trx(T).insert(lote)` en bucle.

**Lectura de DEV consistente**: todas las lecturas dentro de una transacción de DEV con
`isolationLevel: 'snapshot'` (verificado: `snapshot_isolation_state = ON` en `OTB`), para que una
edición tardía de Carol no deje un conjunto incoherente. La transacción de DEV es de solo lectura y
termina en rollback.

**Blobs en PROD**: en `Adjunto` y `EvidenciaImplementacion`, al insertar:
`blob_container = 'adjuntos'`, `blob_url = <url del blob destino>` (la que devuelve `copiar`; en la
práctica `https://planogramasstorage.blob.core.windows.net/adjuntos/<blob_path>`), `blob_path` igual.
Verificado: en DEV el 100 % de las filas cumple `blob_url = .../adjuntos-dev/<blob_path>`.

### Transacción en PROD

Una sola transacción para vaciar + cargar + reseed + verificar (≈6 500 filas, segundos). `DBCC
CHECKIDENT` y `SET IDENTITY_INSERT` son válidos dentro de transacción en Azure SQL. La copia de
blobs ocurre **antes** y fuera de la transacción: así nunca queda una fila de PROD apuntando a un
blob inexistente. Si la carga falla después de copiar blobs, los blobs quedan en `adjuntos` sin
filas (inocuo; el reintento los reaprovecha por idempotencia).

### Verificación (dentro de la transacción, antes del commit)

Por tabla, comparar DEV vs PROD:
1. `COUNT(*)`.
2. SHA-256 calculado en Node sobre las filas leídas con las mismas conversiones a texto, ordenadas
   por PK, serializadas en forma canónica (columnas en orden de `sys.columns`, `NULL` explícito). En
   `Adjunto` y `EvidenciaImplementacion` el hash de DEV se calcula tras aplicar la misma reescritura
   de `blob_container`/`blob_url`.
3. `IDENT_CURRENT` igual al de DEV (tablas reseedeadas).
4. `DBCC CHECKCONSTRAINTS` no es necesario (no se deshabilitaron FKs); se confirma
   `is_not_trusted = 0` en `sys.foreign_keys` de PROD.

Volumen pequeño (máx. 1 819 filas en Posicion): el hash en Node es más fuerte que
`CHECKSUM_AGG(BINARY_CHECKSUM)` y no tiene colisiones prácticas. Cualquier diferencia → rollback y
código de salida ≠ 0. Blobs: para cada uno, `contentLength` destino = origen.

### Retrocompatibilidad y vuelta atrás

No cambia esquema. Vuelta atrás: restauración PITR de `db-planogramas` a la hora anotada en el
paso 1 (Azure SQL, retención por defecto 7 días), o simplemente volver a correr el script. Los
blobs de `adjuntos-dev` no se tocan ni se borran: DEV sigue funcionando igual.

## 6. Rendimiento y escalabilidad

- ~6 500 filas en ~120 lotes → segundos. Sin N+1: una lectura por tabla.
- Blobs: 91 copias servidor a servidor (Azure copia dentro de la misma cuenta, los bytes no pasan por
  la máquina local); concurrencia de 4 copias a la vez. Mayor archivo 36 MB.
- Bloqueos: la transacción de PROD toma bloqueos exclusivos en las 17 tablas unos segundos; por eso
  PROD debe estar sin uso en la ventana.
- No escala ni lo necesita: es de una sola ejecución. Si en el futuro se repite (p. ej. DEV desde
  PROD), el script sirve invirtiendo origen y destino, pero eso queda fuera de alcance.

## 7. Alternativas descartadas y decisión

- Consultas entre bases (`OTB..Tabla`) o `INSERT ... SELECT`: Azure SQL Database no lo permite.
- BACPAC / copia de base completa: arrastraría las tablas ajenas de `OTB` y reemplazaría la BD
  de PROD (nombre, permisos, configuración del App Service).
- Elastic query / Data Sync: configuración de infraestructura desproporcionada para una vez.
- `NOCHECK CONSTRAINT ALL` en vez de orden topológico: oculta en qué tabla falla y requiere revalidar FKs.
- Leer `datetime2`/`decimal` como tipos JS: pierde precisión (verificado con datos reales).
- Descargar y volver a subir los blobs por la máquina local: 430 MB innecesarios; copia servidor a servidor.
- Dejar `blob_container = 'adjuntos-dev'` en PROD: PROD leería del contenedor de DEV; el usuario
  pidió separarlos.

**Decisión**: script Node de un solo uso en `back/scripts/migracion-dev-prod/`, con simulacro por
defecto (carga real en transacción + rollback), ejecución con confirmación explícita del nombre de
la BD, orden topológico con segunda pasada para autorreferencias, `IDENTITY_INSERT` + `RESEED` al
`IDENT_CURRENT` de DEV, lectura snapshot de DEV con fechas y decimales como texto, verificación por
conteo + SHA-256 por tabla antes del commit, y blobs copiados antes de la transacción con
`blobClient.copiar`.

## 8. Preguntas abiertas

1. **Cuenta y contenedor de PROD**: ¿el App Service `planogramas-api-prod` tiene
   `AZURE_STORAGE_CONTAINER_ADJUNTOS = adjuntos` y su `AZURE_STORAGE_CONNECTION_STRING` apunta a la
   misma cuenta `planogramasstorage` que el `.env` local? Si la cuenta fuera otra, el plan agrega
   `azureStorageConnectionString` opcional a `conexion.prod.json` para el destino. (Se puede
   verificar en el portal; el agente no lee la configuración de Azure.)
2. **Ventana**: ¿cuándo deja Carol de editar en DEV? La ejecución real debe ser después de su
   último cambio (la lectura snapshot da coherencia, no "lo último").
3. **Postman en PROD**: ¿se corren las pruebas de Postman contra PROD después? Crearían fixtures
   (`T004`, `G-12-FIXTURE`) entre los datos reales; recomendación: no correrlas contra PROD.

## 9. Para UX y para Seguridad

**UX**: no aplica (sin front). El único "usuario" es quien corre el CLI: mensajes en español,
informe tabular legible.

**Seguridad e integridad**:
1. Protección contra ejecución accidental: simulacro por defecto, `--confirmar=<nombre BD>`, aborto
   si PROD tiene más de 10 filas en alguna tabla sin `--forzar-vaciado`, aborto si origen = destino.
2. Atomicidad: vaciado + carga + verificación en una transacción; blobs antes; criterios de rollback.
3. Exactitud de la verificación (hash canónico, conversiones de `datetime2`/`decimal`, reescritura de URL).
4. Manejo de secretos: no imprimir connection strings, credenciales ni SAS; SAS de 15 min solo lectura
   sobre un blob; el script no persiste nada en disco.
5. Datos que pasan a PROD: `subido_por` no numéricos (DT-62) y nombres de empleados en
   `EdicionAsignacion`/`Adjunto` — confirmar que es aceptable que vivan en PROD.

## 10. Deuda detectada

- **DT-69 (propuesta) · Baja · BD/ops**: el script `back/scripts/migracion-dev-prod/` queda en el
  repo sin uso posterior; retirarlo (o generalizarlo origen/destino) tras confirmar PROD estable.
- **Relacionada**: DT-64 (blobs huérfanos en `adjuntos-dev`) — no se arrastran a PROD porque solo se
  copian blobs referenciados por filas. DT-62 se hereda tal cual en PROD.
