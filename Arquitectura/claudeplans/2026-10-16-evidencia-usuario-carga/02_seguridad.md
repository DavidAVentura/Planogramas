# 02 — Seguridad e integridad: autor (código y nombre) en evidencias y adjuntos

- **Fecha**: 2026-10-16 · **Rama**: `feat/evidencia-usuario-carga` · **Base**: `aab40fc`
- **Insumos**: `00_solicitud.md`, `01_arquitectura.md` y el código citado abajo (leído por fragmentos).

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoints que **escriben** el autor | `POST /tiendas/:tiendaId/versiones/:versionId/evidencias` (`requiereImplementador`, `tiendas.routes.js:42`); `POST /versiones/:id/adjuntos` y `PUT /adjuntos/:id` (confirmación de alta y de reemplazo, regla A de analista) |
| Endpoints que **exponen** el nombre | `GET /tiendas/:tiendaId/versiones/:versionId/evidencias` (`requiereImplementador`, `tiendas.routes.js:39`); `GET /versiones/:id/adjuntos` (`requiereImplementador`, `versiones.routes.js:62`); respuestas 201/200 de los tres endpoints de escritura |
| Sin cambio funcional | `DELETE /evidencias/:id` (`puedeEliminar` por número), `GET /evidencias/:id/descargar`, SAS de adjuntos, `DELETE /adjuntos/:id` |
| Tablas | `EvidenciaImplementacion` y `Adjunto`: columna nueva `subido_por_nombre nvarchar(150) NULL` (migración 018) |
| Origen de la identidad | `caoAuthClient.mapearUsuario` (`back/src/infrastructure/cao/caoAuthClient.js:62-77`): `numeroEmpleado ← user`, `nombre ← primerValor(datos.username, c.username, c.name)`; `autenticacion.js:33-38` rechaza sesiones sin `numeroEmpleado` |
| Helpers | `usuarioActual` y `usuarioAuditoria` (`back/src/application/compartido/validacion.js:86-101`) |
| Roles | Implementador (PLA009/PLA010) sube y lista evidencias, lista adjuntos; Analista (regla A) agrega y reemplaza adjuntos |
| Tiendas | Sin filtro por tienda (DT-10/DT-12 abiertas): un implementador lista evidencias de cualquier tienda |

## 2. Controles requeridos

### Bloqueantes

**C-01. El autor sale solo de `req.usuario`; el body no puede fijarlo.**
- Dónde: `evidencias.controller.js` (`agregar`) y `adjuntos.controller.js` (`agregar`, `reemplazar`).
  El autor se arma con `usuarioAuditoria(req)` y se pasa como argumento separado al caso de uso; nunca
  se mezcla con `datos` ni se hace `{ ...req.body }`. Los esquemas `schemaAgregar` y `schemaConfirmar`
  **no** deben declarar `subido_por`, `subido_por_nombre`, `subidoPor` ni `subidoPorNombre`; hoy
  `validarConJoi`/`validarBody` usan `stripUnknown: true` y los descartan.
- En el dominio (`agregarEvidencia`, `agregarAdjunto`, `reemplazarAdjunto`), los campos de autor del
  objeto que va a `repo.crear`/`repo.actualizarArchivo` se toman **solo** del parámetro `autor`
  (después de `normalizarAutor`), no de `datos`.
- Verificación: prueba de dominio que llama a `agregarEvidencia` con
  `datos = { ...validos, subido_por: '999', subido_por_nombre: 'FALSO' }` y `autor = { numero: '100702', nombre: 'JUAN' }`
  y comprueba que el repositorio falso recibió `subido_por: '100702'`, `subido_por_nombre: 'JUAN'`.
  Lo mismo para `agregarAdjunto` y `reemplazarAdjunto`. En Postman (carpeta 17), POST con
  `subido_por` y `subido_por_nombre` en el body → la respuesta 201 trae los valores del token.

**C-02. El código guardado debe ser idéntico al que usa `puedeEliminar`.**
- Riesgo: `listar`/`eliminar` siguen con `usuarioActual(req)` (sin `trim`), y `agregar` pasa a
  `usuarioAuditoria(req)` + `normalizarAutor`. Si `normalizarAutor` hace `trim` (u otra
  transformación) del número y CAO lo manda con espacios, la fila guarda `"100702"` y la comparación
  es contra `" 100702"`: el autor deja de poder quitar su propia foto y `puedeEliminar` sale `false`.
- Dónde: `back/src/domain/compartido/autor.js`. `normalizarAutor` **no transforma el número** más allá
  de `String(numero)`; el `trim` aplica solo al nombre. Si se quiere normalizar el número, hacerlo una
  sola vez en `caoAuthClient.mapearUsuario` (fuente única de los dos helpers), no en el dominio.
- Verificación: prueba de `autor.test.js` con `numero: '100702'` → `subido_por === '100702'`, y una
  prueba de `evidencia.test.js` que encadena `agregarEvidencia` con el autor `{ numero: 'X' }` y
  `listarEvidencias(..., 'X')` → `puedeEliminar: true`; con otro número → `false`.

**C-03. `puedeEliminar` y `eliminarEvidencia` comparan solo por número.**
- Dónde: `evidencia.entity.js` (`puedeEliminar`) y `eliminarEvidencia`: sin cambios; no se agrega
  ninguna comparación por `subidoPorNombre`.
- Verificación: prueba de dominio donde la evidencia tiene `subidoPor: '100702'`,
  `subidoPorNombre: 'JUAN LÓPEZ'` y el usuario es `'JUAN LÓPEZ'` → `puedeEliminar` es `false` y
  `eliminarEvidencia` lanza 403 `FORBIDDEN`.

**C-04. El nombre nunca supera la columna: recorte en el dominio, antes del `INSERT`.**
- Riesgo: un `username` de CAO de más de 150 caracteres produce un error de truncamiento de SQL
  Server (500). En evidencias el blob se borra en el `catch`, pero la carga falla para ese usuario
  siempre; en **adjuntos** `agregarAdjunto` no borra el blob si `crear` falla (blob huérfano) y en
  `reemplazarAdjunto` el archivo nuevo queda subido sin fila.
- Dónde: `normalizarAutor` recorta a 150 **por puntos de código** (`[...nombre].slice(0, 150).join('')`,
  para no partir un par sustituto en tildes compuestas o emojis) y vuelve a hacer `trim` después del
  recorte.
- Verificación: `autor.test.js` con un nombre de 200 caracteres → longitud ≤ 150; con un nombre que
  tiene un emoji en la posición 150 → no queda un sustituto suelto.

### Importantes

**C-05. Saneado del nombre: sin caracteres de control ni de formato bidireccional.**
- Escenario: un `username` con `‮` (RTL override), `\u0000` o saltos de línea se guarda y se
  muestra invertido o rompe el pie de la miniatura; un `‮` permite que "JUAN" aparezca como otro
  texto en la UI del analista.
- Dónde: `normalizarAutor` elimina `\p{Cc}` y los controles bidi `‎‏‪-‮⁦-⁩`,
  colapsa espacios internos y aplica `trim`; si queda vacío o igual al número → `null` (como dice la
  arquitectura). No se cambia mayúsculas/minúsculas en el back (la presentación es de UX).
- Verificación: `autor.test.js` con `'  JUAN‮ LÓPEZ\n '` → `'JUAN LÓPEZ'`; con `'\u0000‮'` → `null`;
  con nombre igual al número → `null`; con tildes y ñ → se conservan.

**C-06. Render solo como texto en React.**
- Dónde: `front/src/utils/autorCarga.ts` devuelve `string`; `EvidenciaModal.tsx`,
  `MontajeTiendaModal.tsx`, `UsarAdjuntos.tsx`, `VersionResumenModal.tsx` lo pintan como hijo de JSX
  o en `title`/`aria-label`. Prohibido `dangerouslySetInnerHTML` (hoy no hay ninguno en `front/src`) y
  prohibido construir HTML/URL con el nombre.
- Verificación: `autorCarga.test.ts` con `'<img src=x onerror=alert(1)>'` devuelve la cadena tal cual
  (escapar es trabajo de React); revisión del diff: `grep dangerouslySetInnerHTML front/src` vacío.

**C-07. Se expone solo el nombre; nada más del perfil de CAO.**
- Dónde: `formatearEvidencia` agrega únicamente `subido_por_nombre`; `mapAdjunto` agrega únicamente
  `subidoPorNombre`. No se agregan `correo`, `perfiles`, `permisos` ni `tiendas` de `req.usuario`, ni
  se guardan en BD.
- Verificación: prueba de dominio que compara las claves de `formatearEvidencia` contra la lista
  exacta del contrato; assert de Postman (17) de que el elemento no trae `correo`.

**C-08. El nombre no va a los logs.**
- Dónde: los `console.warn` de `evidencias.controller.js:73` y `autorizacion.js:35` siguen registrando
  solo ids y `numeroEmpleado`. No se agrega `nombre` a ningún log nuevo ni al `details` de un error.
- Verificación: revisión del diff (`grep -n "nombre" ` sobre las líneas `console.*` tocadas).

**C-09. Exposición del nombre a otras tiendas: aceptable con registro de deuda.**
- Escenario: con DT-10/DT-12 abiertas, el implementador de la tienda A llama
  `GET /tiendas/{B}/versiones/{v}/evidencias` y ve nombre y código de los empleados de B; cualquier
  implementador ve con `GET /versiones/:id/adjuntos` el nombre de los analistas.
- Evaluación: es una herramienta interna, solo usuarios CAO autenticados, el dato es nombre + número
  de empleado (sin correo ni otros identificadores) y el usuario pidió explícitamente mostrarlo. **Se
  acepta** sin bloquear, pero el texto de **DT-12** se amplía: "además de las fotos, expone el nombre
  completo y el número de empleado de quien las subió". El filtro por tienda de DT-10 cierra ambas.
- Verificación: el coordinador actualiza DT-12 en el commit de docs.

**C-10. Migración 018 reversible, idempotente y segura con datos existentes.**
- Dónde: `back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js`.
  - `up`: por cada tabla, `if (!await knex.schema.hasColumn(tabla, 'subido_por_nombre'))` →
    `alterTable(t => t.string('subido_por_nombre', 150).nullable())`. Sin `default`, sin `NOT NULL`,
    sin relleno (decisión del usuario). En SQL Server agregar una columna nullable sin default es un
    cambio de metadatos: no recorre filas ni bloquea por mucho tiempo.
  - `down`: `hasColumn` y `dropColumn` en orden inverso. El `down` pierde los nombres capturados
    (no se pueden reconstruir): dejarlo dicho en el comentario de cabecera.
  - Sin `knex.raw` con concatenación (no hace falta; si se usa, nombres de tabla constantes).
  - `t.string` en el dialecto `mssql` de Knex crea `nvarchar`; confirmarlo.
  - Una sola migración con las dos tablas: Knex la corre en una transacción y SQL Server revierte el
    DDL si falla la segunda tabla.
- Verificación: en DEV `npm run migrate` → `migrate:rollback` → `migrate` sin errores;
  `SELECT TYPE_NAME(system_type_id), max_length, is_nullable FROM sys.columns WHERE name='subido_por_nombre'`
  → `nvarchar`, 300 (bytes), 1, en las dos tablas. Actualizar la tabla de migraciones de `CLAUDE.md`.
- PROD: la arquitectura la deja pendiente por DT-08. Ojo: la rama `feat/migracion-prod-por-archivo`
  (commits `44cc912` y `0407214`, posteriores a la base `aab40fc`) documenta un procedimiento
  `migrate:prod` y la 017 ya aplicada en PROD. Al integrar, la 018 sigue ese procedimiento y la fila
  de PROD de `CLAUDE.md` se ajusta a lo que diga esa rama; no aplicar a PROD sin pedido explícito.

### Menores

**C-11. Sin respaldo `'sistema'` silencioso.**
- Escenario: si mañana se quita el chequeo S-07 del middleware o un caso de uso se invoca sin autor,
  `usuarioAuditoria` devuelve `USUARIO_SISTEMA` (`{ numero: 'sistema' }`) y la evidencia queda
  atribuida a `sistema` sin que nadie la pueda quitar.
- Dónde: `normalizarAutor` lanza un error (500 interno, mensaje genérico) si `numero` es vacío o
  `'sistema'`; los casos de uso de adjunto quitan `userId ?? 'sistema'` (`adjunto.usecases.js:175` y
  `:202`), como ya propone la arquitectura.
- Verificación: `autor.test.js` con `numero: ''`/`undefined` → lanza.

**C-12. El nombre viene de la respuesta de CAO, no de un claim que el cliente controle.**
- Contexto: `mapearUsuario` completa `nombre` con `c.username`/`c.name` de los claims del JWT,
  decodificados sin verificar firma localmente (`caoAuthClient.js:38-44`). Como el token ya fue
  validado por CAO en `validar_token`, el riesgo es bajo; y `validar_token` hoy devuelve `username`.
- Dónde: sin cambio de código en este plan. La prueba de dominio de C-01 cubre que el nombre llega
  solo por `req.usuario`. Si alguna vez CAO deja de mandar `username`, el nombre caería al claim:
  queda anotado como deuda.

**C-13. Reemplazo de adjunto sobrescribe el autor anterior (pérdida de historia).**
- Es la semántica actual y la aprobó la arquitectura. Se documenta en el contrato
  `PUT_adjuntos_reemplazar.md` que `subidoPor`/`subidoPorNombre` son de quien hizo el último
  reemplazo; no hay auditoría del autor original. Sin cambio de código.

## 3. Pruebas de abuso (el desarrollador las cubre)

| # | Caso | Resultado esperado | Dónde |
|---|---|---|---|
| A-01 | POST evidencia con `subido_por: "999"` y `subido_por_nombre: "OTRO"` en el body | 201 con el número y nombre del token | `evidencia.test.js` + Postman 17 |
| A-02 | POST/PUT de confirmación de adjunto con `subidoPor`, `subido_por`, `subidoPorNombre` en el body | Persiste el autor del token | `adjunto.test.js` |
| A-03 | Usuario cuyo nombre CAO coincide con el `subido_por_nombre` de otra evidencia intenta borrarla | 403 `FORBIDDEN` | `evidencia.test.js` |
| A-04 | `username` de 200 caracteres | Se guarda recortado a 150, la carga responde 201 | `autor.test.js` |
| A-05 | `username` con `‮`, `\u0000`, saltos de línea | Se guarda limpio o `null` | `autor.test.js` |
| A-06 | `username` = `"<script>alert(1)</script>"` | Se muestra como texto literal en los cuatro puntos de la UI | `autorCarga.test.ts` + revisión del diff |
| A-07 | Usuario sin `username` en CAO | `subido_por_nombre: null`, la UI muestra solo el código | `autor.test.js` |
| A-08 | Autor sube evidencia y luego la lista | `puedeEliminar: true`; otro número → `false` | `evidencia.test.js` |
| A-09 | Evidencia o adjunto viejo (`subido_por_nombre` NULL, `subido_por` = nombre completo o `sistema`) | La lista responde 200 con `null`; ninguna lógica asume que `subido_por` es numérico | `evidencia.test.js` |
| A-10 | `migrate` → `rollback` → `migrate` en DEV | Sin errores; columnas `nvarchar(150) NULL` | manual, anotado en el cierre |

## 4. Deuda detectada

- **Ampliar DT-12 (Media)**: la lista de evidencias de otra tienda expone además nombre y número de
  empleado de quien las subió (C-09).
- **Nueva, Baja (back)**: `mapAdjunto` (`adjunto.repository.js:12-25`) devuelve `blobContainer`,
  `blobPath` y `blobUrl` en las respuestas de adjuntos (lista, alta, reemplazo); son datos internos de
  Storage (cuenta y rutas) que el front no necesita para descargar (usa la SAS de `url-descarga`).
  No se corrige aquí; el cambio solo agrega `subidoPorNombre`.
- **Nueva, Baja (back)**: `agregarAdjunto` y `reemplazarAdjunto` no borran el blob recién subido si
  falla la escritura en BD (`adjuntoRepo.crear`/`actualizarArchivo`), a diferencia de
  `agregarEvidencia`. C-04 evita que este cambio lo dispare, pero el hueco existe.
- **Nueva, Baja (back)**: el nombre del usuario puede salir de claims del JWT si CAO no manda
  `username` (C-12).
- Coincide con la arquitectura: filas heredadas con `subido_por` no numérico que nadie puede quitar,
  y `usuarioActual` con respaldos a `usuario`/`id`/`'sistema'`.
