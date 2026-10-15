# 02 — Seguridad e integridad: reemplazar productos del Excel y recarga masiva por script

Base: `00_solicitud.md` (con las respuestas que cambian la recomendación: **todo en el back + script de
terminal, sin front; la recarga masiva también escribe en versiones `publicado`/`piloto`**) y
`01_arquitectura.md`. Código revisado: `importacion.usecases.js`, `importacion.repository.js`
(infraestructura), `importacion.schemas.js`, `versiones.routes.js:80-82`, `gondola.entity.js:8,40`,
`blobClient.js`, `adjunto.entity.js`, `tokenManager.js`, `contextoSolicitud.js`, `caoAuthClient.js`,
`config/env.js`, `implementacion.repository.js:204`.

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoint HTTP | `POST /api/v1/versiones/:id/importar-productos` (`requiereAnalista` + `editarContenido` = PLA005/PLA006). Gana `reemplazar` (boolean). **Debe seguir rechazando versiones no editables (422).** |
| Script de terminal (nuevo) | `back/scripts/…` (nombre lo fija el plan). Corre con las credenciales del `.env` local: **no pasa por autenticación, autorización, `express.json` ni Joi del controller**. Es la superficie nueva más sensible. |
| Tablas que se borran | `PosicionAccesorio` → `Posicion` → `Nivel` → `Seccion` de las góndolas `por_ubicar = 1` de la versión; eventualmente la fila `Gondola` "Por ubicar" si queda vacía. |
| Tablas que se escriben | Las mismas (inserción) + `Producto` (alta desde CATI en `asegurarExistencia`, **fuera** de la transacción). |
| Tablas que se leen | `Planograma` (filtro `departamento`, excluye archivados), `PlanogramaVersion` (estado), `Adjunto` (blob_path, tipo, fecha), `Accesorio`. |
| Integraciones | Azure Blob (contenedor del `.env`: `adjuntos-dev` en DEV, `adjuntos` en PROD) con la **clave de cuenta** (permisos totales). CATI (`obtenerProducto`) — exige un JWT CAO en el contexto (`tokenManager.js`), que el script no tiene. |
| Permisos | HTTP: PLA005/PLA006. Script: hoy ninguno (ver control 6). |
| Tiendas | No se filtra por tienda (rutas de analista; DT-10 no aplica). **Pero** las posiciones de "Por ubicar" de versiones publicadas sí las ven los implementadores de las tiendas asignadas (`implementacion.repository.js:204`, `porUbicar` en la consulta): recargar una versión `publicado` cambia lo que ven las tiendas en el acto. |
| Ambientes | DEV (`OTB` + `adjuntos-dev`) ahora; PROD (`db-planogramas` + `adjuntos`) después, con confirmación explícita. El `.env` local apunta a DEV. |

## 2. Controles requeridos

### A. Atomicidad y alcance del borrado

1. **Bloqueante — Borrado + inserción en una sola transacción.** Dónde:
   `infrastructure/repositories/importacion.repository.js`, nuevo `reemplazarPorUbicar(versionId, posiciones)`
   con un único `db.transaction`: vaciar "Por ubicar" y llamar al `llenarPorUbicar(trx, …)` extraído de
   `importarPorUbicar` (líneas 251-291). Ninguna llamada a `db(...)` fuera de `trx` dentro de ese flujo.
   Todas las validaciones que pueden fallar (versión existe, regla de estado, `resolverAccesorios`,
   tope 1000, Joi) van **antes** de abrir la transacción. Verificación: prueba de repositorio o de caso
   de uso con un repo falso que lanza en la inserción → el falso registra que no hubo commit; prueba
   Postman "reemplazar en versión publicada" → 422 y el conteo de "Por ubicar" no cambia.
2. **Bloqueante — Alcance del borrado limitado a "Por ubicar" de esa versión.** Dónde: mismo repositorio.
   Las góndolas a vaciar se obtienen con `where({ planograma_version_id: versionId, por_ubicar: true })`
   — **todas**, no `.first()` (no hay índice único que impida dos "Por ubicar" por versión; DT-20 puede
   haber creado una segunda: con `.first()` quedaría la otra con datos viejos y el reemplazo no sería
   idempotente). Se reutiliza una, las demás se vacían y eliminan. Nunca recibir ids de góndola desde
   fuera. Verificación: prueba con versión que tiene una góndola real con el mismo SKU → sus posiciones
   siguen intactas; prueba con dos góndolas `por_ubicar` → ambas vacías antes de insertar.
3. **Importante — Concurrencia y estado leídos dentro de la transacción.** Dónde: `reemplazarPorUbicar`.
   Primera sentencia de la transacción: releer `PlanogramaVersion` con `forUpdate()` (en mssql genera
   `WITH (UPDLOCK)`) y revalidar el estado con la misma regla que decidió el caso de uso (control 5);
   luego vaciar; luego leer `skusUbicados` (§6 de arquitectura) y filtrar. Así dos reemplazos simultáneos
   de la misma versión (script + analista en el modal futuro) se serializan y una publicación/archivado
   intermedio se respeta. Verificación: prueba de caso de uso con repo falso cuyo `buscarPorId` dentro
   de la transacción devuelve `archivado` → 422 sin borrado.
4. **Menor — No eliminar la góndola "Por ubicar" si tiene filas dependientes.** `EvidenciaImplementacion`
   cuelga de `Gondola` con `ON DELETE CASCADE` (`011_evidencia_implementacion.js:28`); hoy el repositorio
   de evidencias excluye `por_ubicar` (`evidencia.repository.js:35,45`), pero el borrado de la góndola
   vacía debe seguir la misma regla de `aplicarCruce` y no ampliarse. Verificación: revisión del diff.

### B. Excepción de versiones no editables (solo script)

5. **Bloqueante — La excepción no es alcanzable por HTTP.** Dónde: `domain/importacion/importacion.usecases.js`.
   - El camino HTTP (`importarProductos` con `reemplazar`) sigue llamando `validarVersionEditable`
     sin cambios (`borrador`, `en_desarrollo`, `piloto`).
   - La recarga que admite `publicado` es un **caso de uso distinto** (p. ej. `recargarProductosDesdeExcel`)
     o una opción en un **cuarto argumento** que solo el script construye; **nunca** un campo del body
     ni de `datos` (el body se valida con `stripUnknown`, pero un futuro `Joi.object().unknown()` o un
     `...req.body` lo abriría).
   - Lista cerrada y explícita en dominio: `ESTADOS_RECARGA_MASIVA = ['borrador','en_desarrollo','piloto','publicado']`.
     **`archivado` sigue prohibido** y planogramas archivados se excluyen.
   - `importacion.controller.js` no importa el caso de uso de recarga ni pasa el cuarto argumento.
   Verificación (pruebas obligatorias):
   a) `test/application/importacionSchemas.test.js`: body con `permitir_no_editable: true`,
      `estados_permitidos: [...]` o similar → el valor validado no contiene esas claves.
   b) `test/domain/importacion.test.js`: `importarProductos` con `reemplazar: true` sobre versión
      `publicado` → 422 y el repo falso registra **cero** llamadas a `reemplazarPorUbicar`.
   c) Recarga sobre `archivado` → error y cero escrituras; sobre `publicado` → sí escribe.
   d) Postman: `POST importar-productos` con `{ reemplazar: true, permitir_no_editable: true }` a una
      versión publicada → 422.
   e) `test/http/rutasProtegidas.test.js` (o equivalente): ninguna ruta montada apunta al caso de uso de
      recarga.

### C. Script de terminal: identidad, ambiente, simulación

6. **Importante — El script exige la sesión CAO de un analista con permiso de edición.** Motivo doble:
   (i) `asegurarExistencia` → `catiClient` → `tokenManager.js` lanza 401 sin JWT en el contexto, así que
   cualquier SKU que no esté en `Producto` local tumba la versión; (ii) es la única forma de que el script
   no sea "escritura anónima con credenciales de BD" y de saber quién lo corrió. Dónde: el script lee el
   token CAO **por stdin** (prompt sin eco o tubería), **nunca** por argumento de línea de comandos
   (queda en el historial y en la lista de procesos) ni del `.env`; lo valida con
   `caoAuthClient.validarToken`; exige `tieneAlguno(usuario, [EDITAR_VERSION, EDITAR_LIENZO])` (más
   estricto si el plan quiere: solo PLA005 para tocar publicadas); y ejecuta todo dentro de
   `ejecutarConContexto({ tokenCAO, usuario }, …)`. El token no se imprime ni se escribe en el reporte.
   Verificación: prueba con `validarToken` falso que devuelve usuario sin PLA005/PLA006 → el script
   termina con código ≠ 0 antes de leer Blob o BD; revisión de que `process.argv` no tiene opción de token.
7. **Bloqueante — Protección contra el ambiente equivocado.** Dónde: módulo del script (lógica pura
   probable en `back/src/…/recargaExcel.ambiente.js` o similar, sin `process.env`: recibe `env`).
   - Bandera **obligatoria** `--ambiente=dev|prod`, sin valor por defecto.
   - Tabla constante en código: `dev → { bd: 'OTB', contenedor: 'adjuntos-dev' }`,
     `prod → { bd: 'db-planogramas', contenedor: 'adjuntos' }`. Si `env.db.name` **o**
     `env.azureStorage.container` no coinciden con la fila elegida → aborta (código ≠ 0) antes de abrir
     conexión de escritura. Esto también atrapa un `.env` mezclado (BD de PROD con blob de DEV).
   - Con `--ambiente=prod` además: `--confirmar-bd=db-planogramas` escrito a mano **y** confirmación
     interactiva (`escribe PROD para continuar`). No se acepta `--yes`/`-y` que salte esto.
   - Al iniciar imprime host, BD, contenedor, ambiente, usuario CAO y modo (SIMULACIÓN/EJECUCIÓN).
   - Lectura solo vía `config/env.js` (regla del repo); el script no lee `.env` por su cuenta.
   Verificación: pruebas `node:test` de la función de guarda: `dev` con `OTB`/`adjuntos-dev` → ok;
   `dev` con `db-planogramas` → error; `dev` con `OTB`/`adjuntos` → error; `prod` sin `--confirmar-bd` →
   error; sin `--ambiente` → error.
8. **Bloqueante — Simulación por defecto y sin escrituras reales.** Dónde: script + caso de uso de
   simulación. Sin `--ejecutar`, el script **no escribe nada**: no llama `reemplazarPorUbicar` **ni
   `asegurarExistencia`** (este inserta en `Producto`; en simulación usar solo `productoRepo.existe` /
   `buscarPorSku` y reportar "no está en el catálogo local, se consultará a CATI al ejecutar").
   Tampoco escribe en Blob (`subir`, `eliminar`, `generarUrlSubida` prohibidos en el script).
   Verificación: prueba del caso de uso de simulación con repos y `blobStorage` falsos cuyos métodos de
   escritura lanzan → la simulación termina bien y ninguno fue llamado.
9. **Importante — Lo que se ejecuta es lo que se simuló.** Dónde: script. La simulación escribe un
   archivo de plan (JSON) con, por versión: `versionId`, `estado`, `adjuntoId`, `blob_path`, ETag o
   SHA-256 del `.xlsx`, conteo en "Por ubicar", productos leídos, estado final (Lista / Sin Excel /
   Varios Excel / Con errores / No permitido) y el ambiente/BD. `--ejecutar --plan=<archivo>` solo
   procesa las versiones "Lista" de ese plan y **revalida** antes de cada una: mismo ambiente/BD, mismo
   ETag/hash del adjunto, mismo estado de versión; si algo cambió, la marca "Cambió desde la simulación"
   y no la toca. "Varios Excel" no se ejecuta salvo elección explícita por versión
   (`--adjunto <versionId>=<adjuntoId>` validando que el adjunto pertenece a esa versión). Así un filtro
   `--departamento` mal escrito o un adjunto cambiado no se convierte en borrado no revisado.
   Verificación: prueba de la función de revalidación con plan cuyo hash difiere → versión omitida.
10. **Importante — Filtro de departamento exacto y acotado.** `--departamento` obligatorio, comparación
    exacta y parametrizada (`planograma.repository.js:20` ya usa `where('departamento', …)`; sin `LIKE` ni
    `raw`). Si el valor no existe en `Planograma.departamento`, abortar listando los existentes (no "0
    versiones, todo ok"). Opción `--version=<id>` (repetible) para correr una sola versión. Verificación:
    prueba de la función que arma el alcance: departamento inexistente → error.
11. **Importante — El script no se carga desde la app ni desde las pruebas.** Archivo en `back/scripts/`
    (fuera de `src/`), lógica reutilizable en `src/domain`/`src/application`, `main` protegido con
    `if (require.main === module)`, `db.destroy()` al terminar. `index.js` y `routes/` no lo importan.
    Verificación: `npm test` no abre conexiones (las pruebas importan solo las funciones puras).

### D. Idempotencia y auditoría

12. **Importante — Idempotencia.** Una versión = una transacción; un fallo en la versión N no deshace
    las N−1 ya hechas y no impide seguir con N+1 (se reporta). Repetir la ejecución con el mismo Excel
    deja el mismo contenido. Verificación: prueba de caso de uso con repo falso en memoria: dos
    ejecuciones seguidas → mismo conjunto de posiciones en "Por ubicar", `eliminados` de la segunda =
    `totalImportados` de la primera; Postman (camino HTTP con `reemplazar`): dos envíos idénticos → mismos
    totales.
13. **Importante — Registro de lo borrado antes de borrar.** No hay tabla de auditoría para posiciones y
    el endpoint no guarda usuario (DT-25). Compensación para el script: antes de ejecutar cada versión,
    escribir a disco (JSON por corrida) el **contenido completo de "Por ubicar"** que se va a borrar
    (`Posicion.*` + sus `PosicionAccesorio`, ids de nivel/sección) junto con ambiente, BD, `versionId`,
    estado, adjunto usado (id, blob_path, hash), usuario CAO (id/correo), fecha y resultado. Si no se
    puede escribir el respaldo, **no** se ejecuta esa versión. Carpeta de salida fuera del control de
    versiones (agregar a `.gitignore`, p. ej. `back/scripts/salidas/`). Sin tokens ni cadenas de conexión.
    Además, dentro de la transacción, actualizar `PlanogramaVersion.updated_at` (columna existente,
    `002_version_timestamps.js`) para que el cambio sea visible en la versión. Verificación: prueba de la
    función que arma el respaldo (forma estable); revisión del diff de `.gitignore`.
14. **Importante — Versiones publicadas: visibilidad inmediata en tiendas.** La recarga de una `publicado`
    cambia lo que ven los implementadores (consulta de implementación incluye "Por ubicar",
    `implementacion.repository.js:204`). El reporte de simulación debe marcar explícitamente cuántas
    publicadas se tocarán y con cuántas tiendas asignadas, y el resumen final repetirlo. Verificación:
    revisión del reporte en la simulación de DEV antes de ejecutar.

### E. Excel y Blob en el back

15. **Bloqueante — Validación del Excel leído en el back por el mismo esquema del endpoint.** La salida del
    lector portado pasa por `validarBody(schemaImportarProductos, { productos, reemplazar: true })`
    **antes** de llamar al caso de uso (el script no pasa por el controller). Más de 1000 productos →
    error de la versión, no truncar. Los bloqueos del lector (`bloqueoDeLectura`: columnas faltantes,
    errores de celda, bloque TG/TM/TE ausente, `Planograma_XX` distinto del código de la versión) y los
    accesorios fuera de catálogo dejan la versión en "Con errores" y no se ejecuta. Verificación: prueba
    del orquestador con lector falso que devuelve 1001 productos / un SKU de 51 caracteres → error y cero
    llamadas a escritura.
16. **Importante — Paridad del lector back/front.** Portar ~600 líneas de reglas recién cambiadas
    (DT-29) es el mayor riesgo de dato inconsistente: si el back lee distinto del front, la recarga
    "corrige" con otro error. Las pruebas de `front/src/utils/excelProductosPlanograma.test.ts` (305
    líneas) se portan **completas** a `back/test/…` con las mismas entradas y salidas esperadas (incluidos
    TG/TM/TE, ganchos `54E`, varios accesorios, DT-33/DT-38 tal como se comportan hoy). Verificación:
    `npm test` en back con esas pruebas; el plan debe listar qué funciones se portan.
17. **Importante — Paquete nuevo: `read-excel-file` exactamente `9.3.10`** (la misma versión del front,
    entrada `read-excel-file/node`). Justificación: misma librería y mismo parseo de celdas que el lector
    probado; descartar `exceljs` (más dependencias y otro parseo de tipos). Es ESM: cargarlo con
    `await import()` perezoso solo desde el lector del back (no en el arranque de la API). Va en
    `dependencies` (la feature siguiente lo usará desde un endpoint y el workflow DEV instala con
    `--omit=dev`). Correr `npm audit --omit=dev` y anotar el resultado en el plan; las dependencias
    transitivas (`fflate`, `saxen`, `unzipper-esm`, `worker-f`) quedan fijadas por el `package-lock.json`.
18. **Importante — Descarga del adjunto acotada.** Dónde: servicio/caso de uso de descarga que usa
    `blobClient`:
    - El adjunto se toma **del registro `Adjunto` de esa versión** (`adjuntoRepo.listarPorVersion`),
      nunca de una ruta recibida por argumento; revalidar `validarBlobPathDeVersion(versionId, blob_path)`
      (`adjunto.entity.js:57`) para que un registro mal formado no lea el blob de otra versión.
    - Solo `.xlsx`: extensión del nombre **y** `tipo_mime` = `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
      `.xls` (permitido como adjunto) → "Formato no soportado", no se intenta leer.
    - Tamaño: `obtenerPropiedades` antes de descargar y rechazar > 10 MB (mismo `MAX_BYTES_EXCEL` del modal);
      al leer el stream de `descargar`, cortar si se superan los 10 MB (el `contentLength` lo declara quien
      subió). Firma ZIP `PK\x03\x04` en los primeros bytes.
    - Tiempo: `abortSignal` con timeout en la descarga (p. ej. 30 s) y tope de filas leídas (p. ej. 5000)
      como defensa ante un ZIP que expande a algo enorme.
    - Errores del SDK: el reporte muestra "No se pudo descargar el adjunto <id>" y el código HTTP de
      Azure; no volcar el objeto de error completo (puede traer URL y cabeceras).
    Verificación: pruebas con `blobStorage` falso: adjunto `.xls` → no descarga; `tamanoBytes` 11 MB → no
    descarga; stream de 11 MB con `contentLength` falso de 1 MB → error "excede"; `blob_path` de otra
    versión → error.
19. **Menor — Salida de consola y código de salida.** Código de salida ≠ 0 si alguna versión falló o se
    abortó; nunca imprimir `env.db.password`, `AZURE_STORAGE_CONNECTION_STRING`, token CAO ni accessToken
    de CATI. Mensajes en español.

### F. Camino HTTP (`reemplazar` en el endpoint)

20. **Importante — `reemplazar` como `Joi.boolean().strict()`.** Sin `strict`, Joi convierte el texto `"true"` en `true`;
    para una bandera destructiva, exigir booleano real
    (`reemplazar: "true"` → 400). Dónde: `importacion.schemas.js`. Verificación:
    `importacionSchemas.test.js` con `"true"`, `1`, `"si"` → error; `true` → ok; ausente → `false`.
21. **Menor — Respuesta sin datos de más.** `eliminados` es un número; no devolver ids ni contenido de lo
    borrado por HTTP. Verificación: revisión del contrato y del controller.

## 3. Pruebas de abuso

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | `POST /versiones/{publicada}/importar-productos` con `{ reemplazar: true, permitir_no_editable: true, estados_permitidos: ["publicado"] }` | 422, "Por ubicar" intacta |
| 2 | `POST …/importar-productos` con `reemplazar: "true"` / `1` | 400 |
| 3 | Usuario sin PLA005/PLA006 (token de tienda) con `reemplazar: true` | 403, sin borrado |
| 4 | `reemplazar: true` con un accesorio inexistente en el lote | 422, sin borrado (validación antes de la transacción) |
| 5 | `reemplazar: true` con fallo en la inserción (repo falso que lanza a mitad) | Error, "Por ubicar" con el contenido anterior |
| 6 | Versión con góndola real que contiene el SKU X y "Por ubicar" con X | X de la góndola real intacto; X omitido con "Ya está ubicado en la versión" |
| 7 | Versión con dos góndolas `por_ubicar` | Ambas vaciadas; queda una sola con el Excel |
| 8 | Script sin `--ambiente` | Aborta, código ≠ 0, sin conexión de escritura |
| 9 | Script `--ambiente=dev` con `.env` apuntando a `db-planogramas` (o a contenedor `adjuntos`) | Aborta antes de leer |
| 10 | Script `--ambiente=prod` sin `--confirmar-bd` o con confirmación interactiva distinta de `PROD` | Aborta |
| 11 | Script sin `--ejecutar` | Reporte completo; cero escrituras en BD (incluida `Producto`) y Blob |
| 12 | Script con token CAO de un usuario sin PLA005/PLA006, o token inválido | Aborta antes de leer Blob/BD |
| 13 | Script con token pasado como argumento (`--token=…`) | Opción inexistente / rechazada |
| 14 | `--ejecutar --plan` cuyo adjunto cambió (hash/ETag) o cuya versión pasó a `archivado` desde la simulación | Versión omitida "Cambió desde la simulación" |
| 15 | Versión `archivado` o planograma archivado dentro del departamento | Excluida; nunca escrita |
| 16 | Adjunto `.xls`, adjunto de 11 MB, adjunto con `contentLength` falso, adjunto cuyo `blob_path` es de otra versión | "Formato no soportado" / "Excede" / "No pertenece a la versión"; no se lee |
| 17 | Excel con 1001 productos, SKU de 51 caracteres, `Planograma_XX` distinto del código | "Con errores"; no se ejecuta |
| 18 | Ejecutar dos veces seguidas la misma versión | Mismo contenido final; segunda corrida `eliminados` = importados de la primera |
| 19 | Corte del proceso (Ctrl+C) a mitad de la corrida | Versiones terminadas confirmadas; la en curso, sin cambios (rollback); respaldo JSON de las terminadas presente |
| 20 | Script y analista reemplazando la misma versión a la vez | Se serializan (UPDLOCK); sin SKU duplicados ni dos "Por ubicar" |
| 21 | Departamento inexistente o con mayúsculas distintas | Aborta listando los departamentos existentes |

## 4. Deuda detectada

- **DT-20** (Media): el reemplazo la agrava; se mitiga en este camino con los controles 2 y 3. El camino
  normal (`reemplazar: false`) sigue abierto.
- **DT-25** (Baja → **Media**): con borrado masivo y escritura en publicadas, no registrar quién reemplazó
  pesa más. El respaldo local del script (control 13) compensa solo el script; el camino HTTP sigue sin
  usuario auditado.
- **DT-29** (Baja → **Media**): el lector de Excel pasa a existir en back y front; cualquier cambio de
  reglas futuro debe hacerse dos veces. Mitigación: pruebas espejo (control 16); objetivo: que el front
  delegue la lectura al back en la feature siguiente.
- **Nueva (Media, BD):** no hay índice único filtrado que garantice una sola góndola `por_ubicar` por
  versión (`013_montaje_y_por_ubicar.js` solo agrega la columna). Sugerido: `UNIQUE (planograma_version_id)
  WHERE por_ubicar = 1` en una migración futura, previa limpieza de duplicados.
- **Nueva (Media, back · proceso):** el script es un camino de escritura fuera de la API (sin rate-limit,
  sin middleware de errores, con la clave de cuenta del Blob). La identidad se compensa con el token CAO
  (control 6), pero queda una excepción permanente a "versión publicada no se edita": documentarla en
  `ESTADO_MODULOS.md` y en `DESPLIEGUE_AZURE.md` (quién puede correrla en PROD y cómo).
- **Nueva (Baja, back):** los productos dados de alta desde CATI (`asegurarExistencia`) se insertan fuera
  de la transacción del reemplazo; un rollback deja esas filas de `Producto` (inocuo, pero no atómico).
- **DT-37** (Baja): enteros sin máximo; en el script se traducen en fallo de la versión con rollback, no
  en corrupción. Sin cambio de severidad.
