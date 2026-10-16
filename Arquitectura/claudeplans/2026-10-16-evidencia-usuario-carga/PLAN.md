# PLAN — Autor de la carga (código de empleado y nombre) en evidencias y adjuntos

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Rama: `feat/evidencia-usuario-carga` · Base: `aab40fc`. Insumos: `01_arquitectura.md`, `02_ux.md`,
> `02_seguridad.md` (misma carpeta).

## Objetivo

Cada foto de evidencia (módulo 17) y cada adjunto de versión (módulo 13) registran **quién los cargó
con código de empleado y nombre**, tomados del token CAO y fijos al momento de la carga. La UI muestra
`Nombre (#código)` en los cuatro lugares donde hoy aparece solo el número. Los registros viejos
quedan sin nombre y muestran solo `#código`.

## Decisiones

| Decisión | Razón |
|---|---|
| Columna nueva `subido_por_nombre nvarchar(150) NULL` en `EvidenciaImplementacion` y `Adjunto`, en **una** migración `018_autor_nombre_evidencia_adjunto.js` | Mismo concepto en las dos tablas; Knex corre la migración en transacción y SQL Server revierte el DDL si falla la segunda tabla |
| `subido_por` sigue siendo el número de empleado (`user` de CAO = `req.usuario.numeroEmpleado`); no se renombra | Renombrar rompe contratos, `puedeEliminar`, Postman y fixtures sin aportar valor |
| Sin relleno de filas existentes (quedan `NULL`) | Decisión del usuario |
| El autor se arma en el controller con `usuarioAuditoria(req)` (`{ numero, nombre }`) y llega al caso de uso como **parámetro separado** de `datos` | El body nunca puede fijar el autor (C-01) |
| Función pura `normalizarAutor` en `back/src/domain/compartido/autor.js`, usada por los dos módulos | Una sola regla de saneado/recorte; sin duplicar lógica |
| `normalizarAutor` **no transforma el número** (solo `String(numero)`); el saneado aplica solo al nombre | Evita que `puedeEliminar` (que compara contra `usuarioActual(req)` sin `trim`) deje de reconocer al autor (C-02) |
| `normalizarAutor` lanza `Error` sin `status` (→ 500 `INTERNAL_ERROR` por `errorHandler`) si el número es vacío o `'sistema'`; se llama **antes** de subir el blob en evidencias | Sin respaldo `'sistema'` silencioso (C-11) y sin blob huérfano por este motivo |
| Nombre: se eliminan `\p{Cc}` y controles bidi, se colapsan espacios, `trim`, recorte a 150 **por puntos de código**, `trim` otra vez; si queda vacío o igual al número → `null`. No se cambia mayúsculas en el back | C-04, C-05. `usuarioAuditoria` devuelve `nombre = numero` cuando CAO no manda nombre: con esta regla queda `null` |
| Se quita `userId ?? 'sistema'` de `agregarAdjunto` y `reemplazarAdjunto` | La autenticación garantiza el número (S-07) |
| El reemplazo de un adjunto sobrescribe `subido_por` y `subido_por_nombre` con quien reemplaza; no se agrega texto "Reemplazado por…" | Semántica actual: el autor es quien subió el archivo vigente. El front no distingue alta de reemplazo |
| Campo aditivo en respuestas: `subido_por_nombre` (módulo 17, snake_case) y `subidoPorNombre` (módulo 13, camelCase) | Cada módulo conserva su convención; no se unifican aquí |
| `puedeEliminar` y `eliminarEvidencia` no cambian: comparan solo por número | C-03 |
| Formato visible único con `formatearAutor(numero, nombre)` en `front/src/utils/autorCarga.ts`; nombre en **tipo título**; sin componente `Autor` nuevo | UX: cuatro usos de texto inline. Lo guardado no cambia |
| Exponer nombre a implementadores de otras tiendas se **acepta** (DT-10/DT-12 abiertas); se amplía el texto de DT-12 en el cierre | Herramienta interna, usuarios CAO autenticados, el usuario pidió mostrar el dato (C-09) |
| Postman: solo carpeta 17. Adjuntos sigue sin carpeta (DT-07) | El alta de adjuntos sube directo a Azure con SAS, no es repetible en Postman; su cobertura queda en pruebas de dominio |
| El front no agrega el autor al `alt` de las fotos ni al diálogo de quitar | UX: el `figcaption` ya lo asocia a la imagen |

## Fuera de alcance

- Relleno de nombres en filas existentes y limpieza de filas con `subido_por` no numérico (nombre
  completo, `sistema`, fixtures).
- Cambios a `usuarioActual` (sigue con sus respaldos `usuario`/`id`/`'sistema'`) y a `listar`/`eliminar`
  de evidencias.
- Historia de autores de un adjunto (quién lo subió originalmente) y fecha de reemplazo.
- Quitar `blobContainer`/`blobPath`/`blobUrl` de las respuestas de adjuntos; limpieza del blob si falla
  la BD en `agregarAdjunto`/`reemplazarAdjunto` (se registran como deuda).
- Filtro por tienda (DT-10/DT-12) y carpeta Postman de adjuntos (DT-07).
- Aplicar la 018 en PROD. Alinear DT-08 y la tabla de migraciones de `CLAUDE.md` con los commits
  `44cc912` y `0407214` de `feat/migracion-prod-por-archivo` (nota para el cierre, ver "Notas para el
  cierre").
- Agente-extractor, Consolidado e `implementacion.repository.listarGondolasConEvidencias` (no cambian).

## Contratos

Sin rutas, requests, permisos ni errores nuevos. Solo se agrega un campo en las respuestas.

**Módulo 17 — Evidencias** (`Arquitectura/Contratos/17_evidencias/`)

| Método | Ruta | Permiso | Cambio |
|---|---|---|---|
| `GET` | `/api/v1/tiendas/:tiendaId/versiones/:versionId/evidencias` | `requiereImplementador` | Cada elemento de `gondolas[].evidencias[]` agrega `subido_por_nombre: string \| null` |
| `POST` | `/api/v1/tiendas/:tiendaId/versiones/:versionId/evidencias` | `requiereImplementador` | La respuesta 201 agrega `subido_por_nombre`. Si el body trae `subido_por`/`subido_por_nombre`, se descartan (`stripUnknown`) y se usan los del token |
| `GET`/`DELETE` | `/api/v1/evidencias/:id/descargar`, `/api/v1/evidencias/:id` | sin cambio | Sin cambio (`403 FORBIDDEN` si `subido_por` ≠ número del JWT) |

Forma exacta de cada evidencia (orden de claves de `formatearEvidencia`):

```json
{ "id": 12, "nombre_original": "foto.jpg", "tipo_mime": "image/jpeg", "tamano_bytes": 123456,
  "subido_por": "10234", "subido_por_nombre": "JUAN LÓPEZ", "created_at": "2026-10-16T15:00:00.000Z",
  "puedeEliminar": true }
```

La respuesta del POST además lleva `gondolaId` (como hoy). No se agrega ninguna otra clave del perfil
CAO (`correo`, `perfiles`, `permisos`, `tiendas`) — C-07.

**Módulo 13 — Adjuntos** (`Arquitectura/Contratos/13_adjuntos/`)

| Método | Ruta | Cambio |
|---|---|---|
| `GET` | `/api/v1/versiones/:id/adjuntos` | Cada adjunto agrega `subidoPorNombre: string \| null` |
| `POST` | `/api/v1/versiones/:id/adjuntos` (confirmación de alta) | La respuesta agrega `subidoPorNombre` (nombre de CAO del que confirma) |
| `PUT` | `/api/v1/adjuntos/:id` (confirmación de reemplazo) | `subidoPor` y `subidoPorNombre` pasan a ser los de quien reemplaza |
| Resto | solicitar subida, URL de descarga, eliminar | Sin cambio |

**Tipos TS del front**

- `front/src/types/evidencia.ts`: agregar `subido_por_nombre: string | null;` junto a `subido_por`.
- `front/src/types/adjunto.ts`: agregar `subidoPorNombre: string | null;` junto a `subidoPor`.

## Datos

Migración `back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js`:

- `up`: para `['EvidenciaImplementacion', 'Adjunto']`, en ese orden:
  `if (!await knex.schema.hasColumn(tabla, 'subido_por_nombre'))` →
  `await knex.schema.alterTable(tabla, (t) => { t.string('subido_por_nombre', 150).nullable(); })`.
  Sin `default`, sin `NOT NULL`, sin relleno, sin índices, sin `knex.raw`. En `mssql`, `t.string`
  crea `nvarchar`.
- `down`: en orden inverso (`Adjunto`, `EvidenciaImplementacion`): `hasColumn` → `dropColumn('subido_por_nombre')`.
- Comentario de cabecera (estilo de `017_indices_consolidado.js`): qué agrega; retrocompatible (nullable,
  `subido_por` no cambia); sin relleno por decisión del usuario; el `down` pierde los nombres capturados
  (no se pueden reconstruir); no aplicar en PROD sin pedido explícito y siguiendo el procedimiento de
  migraciones de PROD vigente (DT-08).
- Retrocompatible: filas existentes quedan con `NULL`. Agregar columna nullable sin default es cambio de
  metadatos en SQL Server (no recorre filas).

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| C-01 (bloq.) | El autor sale solo de `req.usuario` vía `usuarioAuditoria(req)`, pasado como parámetro `autor` separado; el dominio toma `subido_por`/`subido_por_nombre` **solo** del resultado de `normalizarAutor(autor)`, nunca de `datos`. `schemaAgregar` y `schemaConfirmar` no declaran campos de autor | `evidencias.controller.js`, `adjuntos.controller.js`, `evidencia.usecases.js`, `adjunto.usecases.js` | `evidencia.test.js` y `adjunto.test.js` con `datos` que traen `subido_por: '999'`, `subido_por_nombre: 'FALSO'`, `subidoPor`, `subidoPorNombre` → el repo falso recibe los del `autor`. Postman 17: POST con esos campos en el body → 201 con los del token |
| C-02 (bloq.) | `normalizarAutor` devuelve `subido_por === String(numero)` sin `trim` ni otra transformación | `domain/compartido/autor.js` | `autor.test.js` (`'100702'` → `'100702'`; `' 100702'` → `' 100702'`); `evidencia.test.js`: `agregarEvidencia` con número `X` + `listarEvidencias(..., 'X')` → `puedeEliminar: true`; otro número → `false` |
| C-03 (bloq.) | `puedeEliminar` y `eliminarEvidencia` sin cambios: solo número | `evidencia.entity.js` (no se toca) | `evidencia.test.js`: evidencia `subidoPor: '100702'`, `subidoPorNombre: 'JUAN LÓPEZ'`, usuario `'JUAN LÓPEZ'` → `puedeEliminar` `false` y `eliminarEvidencia` rechaza con `status 403`, `code 'FORBIDDEN'` |
| C-04 (bloq.) | Nombre recortado a 150 por puntos de código antes del `INSERT` | `normalizarAutor` | `autor.test.js`: nombre de 200 caracteres → `[...r].length <= 150`; emoji en la posición 150 → sin sustituto suelto (`/[\uD800-\uDFFF]/` solo en pares válidos: el resultado termina en el emoji completo o antes de él) |
| C-05 | Saneado: quitar `\p{Cc}` y bidi `‎‏‪-‮⁦-⁩`, colapsar espacios, `trim`; vacío o igual al número → `null`; tildes y ñ se conservan | `normalizarAutor` | `autor.test.js`: `'  JUAN‮ LÓPEZ\n '` → `'JUAN LÓPEZ'`; `'\u0000‮'` → `null`; `'100702'` con número `'100702'` → `null`; `'MUÑOZ ÁLVAREZ'` intacto |
| C-06 | Render solo como texto (hijo JSX o `title`); prohibido `dangerouslySetInnerHTML` y construir HTML/URL con el nombre | `autorCarga.ts` y los 4 componentes | `autorCarga.test.ts`: `'<img src=x onerror=alert(1)>'` sale literal (en tipo título); `grep -rn dangerouslySetInnerHTML front/src` vacío |
| C-07 | Solo se agrega `subido_por_nombre` / `subidoPorNombre`; nada más del perfil CAO, en respuesta ni en BD | `formatearEvidencia`, `mapAdjunto` | `evidencia.test.js`: `Object.keys` de cada evidencia listada = lista exacta del contrato; Postman 17: el elemento no trae `correo` |
| C-08 | El nombre no va a logs ni a `details` de errores | controllers tocados | Revisión del diff: ningún `console.*` nuevo o tocado incluye `nombre` |
| C-10 | Migración reversible e idempotente | `018_autor_nombre_evidencia_adjunto.js` | En DEV: `npm run migrate` → `npm run migrate:rollback` → `npm run migrate` sin errores; `sys.columns` → `nvarchar`, `max_length` 300, `is_nullable` 1 en las dos tablas |
| C-11 | Sin respaldo `'sistema'`: `normalizarAutor` lanza si el número es `undefined`/`null`/`''`/`'sistema'`; se quita `?? 'sistema'` de adjuntos | `autor.js`, `adjunto.usecases.js` | `autor.test.js`: esos cuatro casos lanzan; `evidencia.test.js`: con autor `{ numero: 'sistema' }` lanza y `blobStorage.subir` **no** se llamó |

C-09 (exposición a otras tiendas aceptada), C-12 (nombre puede venir de claims si CAO no manda
`username`) y C-13 (reemplazo sobrescribe autor) no generan código: van a docs/deuda en el cierre.

## UX (resumen para implementar)

Sin pantallas, componentes visuales, tokens ni estados nuevos. Solo cambia el texto del autor.

**`formatearAutor(numero: string, nombre: string | null): string`** en `front/src/utils/autorCarga.ts`:

| Caso | Resultado |
|---|---|
| `nombre` útil (no `null`, no vacío tras `trim`, distinto de `numero`) y `numero` solo dígitos (`/^\d+$/`) | `` `${tipoTitulo(nombre)} (#${numero})` `` → `Juan López (#10234)` |
| `nombre` útil y `numero` no son solo dígitos | `` `${tipoTitulo(nombre)} (${numero})` `` |
| Sin nombre útil y `numero` solo dígitos | `` `#${numero}` `` → `#10234` |
| Sin nombre útil y `numero` no son solo dígitos (fila heredada) | `numero` tal cual → `sistema` |

`tipoTitulo(nombre)` (privada, mismo archivo): colapsa espacios, `toLocaleLowerCase('es')`, separa por
espacio y capitaliza la primera letra de cada palabra con `toLocaleUpperCase('es')`, excepto las
partículas `de, del, la, las, los, y, e` cuando no son la primera palabra. `JUAN DE LA CRUZ` →
`Juan de la Cruz`; `MUÑOZ ÁLVAREZ` → `Muñoz Álvarez`. Limitación aceptada: `McDonald` → `Mcdonald`.
El `title` usa el mismo texto que se muestra.

**Puntos de la UI**

| Archivo | Cambio |
|---|---|
| `front/src/components/dominio/implementacion/EvidenciaModal/EvidenciaModal.tsx:57` | `const autor = formatearAutor(evidencia.subido_por, evidencia.subido_por_nombre);` → `<span className="evidencia-foto__autor" title={autor}>{autor}</span>` |
| `front/src/components/dominio/modales/MontajeTiendaModal/MontajeTiendaModal.tsx:50` (miniatura) | Igual sobre `.montaje-foto__autor` con `foto.evidencia` |
| `MontajeTiendaModal.tsx:34` (pie de `VisorImagenes`) | `<strong>{gondola}</strong> · {fecha} · {autor}`; **sin truncado** (envuelve, es donde se lee el nombre largo en táctil) |
| `front/src/components/dominio/UsarAdjuntos/UsarAdjuntos.tsx:98` | `{formatearPeso(a.tamanoBytes)} · {formatearFecha(a.createdAt)} · {autor}` con `autor = formatearAutor(a.subidoPor, a.subidoPorNombre)`; agregar `title={…texto completo de la línea…}` al elemento `.usar-adjuntos__detalle` |
| `front/src/components/dominio/modales/VersionResumenModal/VersionResumenModal.tsx:205` | `<span className="version-resumen__detalle" title={detalle}>{detalle}</span>` con `detalle = \`${tamano(a.tamanoBytes)} · ${formatearAutor(a.subidoPor, a.subidoPorNombre)}\`` |

**CSS** (sin tokens ni valores literales nuevos; se conserva lo existente):

- `EvidenciaModal.css` / `MontajeTiendaModal.css`: `.evidencia-foto__autor` y `.montaje-foto__autor` ya
  truncan (`nowrap` + `ellipsis`): no se cambian. Verificar que el contenedor tenga ancho acotado.
- `UsarAdjuntos.css`: en `.usar-adjuntos__detalle` agregar `overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; min-width: 0;`. En la fila (`grid-template-columns: 1fr auto;`, línea 70) cambiar a
  `minmax(0, 1fr) auto` para que un nombre de 150 caracteres no empuje "Usar".
- `VersionResumenModal.css`: nueva clase `.version-resumen__detalle` dentro del bloque de
  `.version-resumen__adjunto` con `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`.
- Si alguno de estos CSS está en la lista *legacy* de stylelint, no se migra (DT-02) salvo que el linter
  falle por las líneas tocadas.

**Estados**: sin cambios. Sin nombre → `#10234` sin texto adicional (no debe parecer error). Autor
heredado no numérico → valor tal cual. El botón "Quitar" sigue dependiendo de `puedeEliminar`.

**Consistencia**: hoy el front no pinta `usuario_nombre` de `EdicionAsignacion` (verificado en `aab40fc`:
no hay usos en `front/src`), así que no hay un segundo formato que unificar.

## Tareas

### T1 — Migración 018: columna `subido_por_nombre`
- **Archivos**: crear `back/src/infrastructure/db/migrations/018_autor_nombre_evidencia_adjunto.js`
- **Qué hacer**: según "Datos". Referencias de estilo: `011_evidencia_implementacion.js` (uso de
  `t.string`) y `017_indices_consolidado.js` (cabecera). `exports.up = async function (knex) {…}` y
  `exports.down = async function (knex) {…}` con un arreglo `const TABLAS = ['EvidenciaImplementacion', 'Adjunto'];`.
- **Criterios de aceptación**:
  - [ ] `npm run migrate` en DEV aplica la 018; `migrate:rollback` la revierte; un segundo `migrate` la aplica sin error.
  - [ ] Correr `up` con la columna ya existente no falla (idempotente por `hasColumn`).
  - [ ] Las dos columnas son `nvarchar(150) NULL` (consulta a `sys.columns` de C-10).
  - [ ] No se aplica en PROD.
- **Pruebas**: manual en DEV (A-10); anotar el resultado en el entregable de desarrollo.
- **Depende de**: —

### T2 — Dominio compartido: `normalizarAutor`
- **Archivos**: crear `back/src/domain/compartido/autor.js` · crear `back/test/domain/autor.test.js`
- **Qué hacer**:
  - Exportar `LONGITUD_MAXIMA_NOMBRE_AUTOR = 150` y
    `normalizarAutor({ numero, nombre }) → { subido_por: string, subido_por_nombre: string | null }`.
  - Si `numero` es `undefined`, `null`, `String(numero).trim() === ''` o `String(numero) === 'sistema'`:
    `throw new Error('La carga no tiene número de empleado del usuario autenticado')` (sin `status`: el
    `errorHandler` responde 500 `INTERNAL_ERROR`).
  - `subido_por = String(numero)` sin más transformación (C-02).
  - Nombre: si no es string → `null`. Si no, `replace(/[\p{Cc}‎‏‪-‮⁦-⁩]/gu, ' ')`,
    `replace(/\s+/g, ' ')`, `trim()`, `[...s].slice(0, LONGITUD_MAXIMA_NOMBRE_AUTOR).join('')`, `trim()`.
    Si queda `''` o `=== subido_por` → `null`. Sin cambiar mayúsculas.
  - Sin dependencias de Express ni Knex. JSDoc en español.
- **Criterios de aceptación**:
  - [ ] Cumple C-02, C-04, C-05 y C-11 tal como se describen en "Seguridad".
- **Pruebas** (`autor.test.js`, `node:test`): número y nombre normales; número con espacios se conserva
  igual; nombre `null`/`undefined` → `null` (A-07); nombre igual al número → `null`; 200 caracteres →
  ≤ 150 puntos de código (A-04); emoji en el límite sin sustituto suelto; `'  JUAN‮ LÓPEZ\n '` →
  `'JUAN LÓPEZ'`; `'\u0000‮'` → `null` (A-05); tildes y ñ intactas; número `undefined`/`null`/`''`/`'sistema'` lanza.
- **Depende de**: —

### T3 — Evidencias: dominio y repositorio
- **Archivos**: modificar `back/src/domain/evidencia/evidencia.usecases.js`,
  `back/src/domain/evidencia/evidencia.repository.js` (JSDoc), `back/src/infrastructure/repositories/evidencia.repository.js`
  · crear `back/test/domain/evidencia.test.js`
- **Qué hacer**:
  - Nueva firma: `agregarEvidencia(evidenciaRepo, implementacionRepo, blobStorage, tiendaId, versionId, datos, autor)`
    con `autor: { numero: string, nombre: string }`. **Primera línea** del caso de uso:
    `const { subido_por, subido_por_nombre } = normalizarAutor(autor);` (antes de validar y de subir el
    blob). En `evidenciaRepo.crear({...})` usar `subido_por, subido_por_nombre` de ahí; ningún campo de
    autor sale de `datos`. Para `formatearEvidencia` del resultado usar `subido_por` como usuario.
  - `formatearEvidencia`: agregar `subido_por_nombre: evidencia.subidoPorNombre ?? null` justo después de
    `subido_por`. Nada más.
  - `listarEvidencias`, `descargarEvidencia`, `eliminarEvidencia`, `evidencia.entity.js`: sin cambios.
  - Repositorio de dominio: JSDoc de `crear` incluye `subido_por_nombre`.
  - Infra: `mapEvidencia` agrega `subidoPorNombre: row.subido_por_nombre`. Revisar que los `select` del
    archivo (si listan columnas explícitas) incluyan `subido_por_nombre`.
- **Criterios de aceptación**:
  - [ ] C-01, C-02, C-03, C-07 y C-11 cubiertos en pruebas.
  - [ ] Si `normalizarAutor` lanza, no se llama `blobStorage.subir`.
- **Pruebas** (`evidencia.test.js`, repos falsos en memoria inyectados al estilo de
  `back/test/domain/planograma.test.js`; `implementacionRepo` falso que devuelve tienda activa y versión
  asignada; `blobStorage` falso con `container`, `subir`, `eliminar`): A-01 (datos con autor falso →
  repo recibe el del parámetro); A-03/C-03 (nombre como usuario → `puedeEliminar false`, `eliminarEvidencia`
  rechaza 403 `FORBIDDEN`); A-08 (agregar con `X` y listar con `X` → `true`, con `Y` → `false`); A-09
  (fila con `subidoPor: 'sistema'`, `subidoPorNombre: null` → lista con `subido_por_nombre: null`);
  claves exactas de cada evidencia listada (C-07); autor `{ numero: 'sistema' }` lanza sin subir blob.
- **Depende de**: T2

### T4 — Adjuntos: dominio y repositorio
- **Archivos**: modificar `back/src/domain/adjunto/adjunto.usecases.js`,
  `back/src/domain/adjunto/adjunto.repository.js` (JSDoc), `back/src/infrastructure/repositories/adjunto.repository.js`
  · crear `back/test/domain/adjunto.test.js`
- **Qué hacer**:
  - Nuevas firmas: `agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, autor)` y
    `reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, id, datos, autor)`, con
    `autor: { numero, nombre }`. Primera línea de cada uno: `const { subido_por, subido_por_nombre } = normalizarAutor(autor);`.
    Usar ambos en `adjuntoRepo.crear` / `adjuntoRepo.actualizarArchivo`. Quitar `userId ?? 'sistema'`.
    Actualizar JSDoc (`@param {{ numero: string, nombre: string }} autor`).
  - JSDoc del repositorio de dominio: `crear` y `actualizarArchivo` con `subido_por_nombre`.
  - Infra: `mapAdjunto` agrega `subidoPorNombre: row.subido_por_nombre` después de `subidoPor`.
    `actualizarArchivo` escribe el objeto recibido (verificar que no filtre columnas; si lo hace, incluir
    `subido_por_nombre`).
- **Criterios de aceptación**:
  - [ ] `agregarAdjunto` y `reemplazarAdjunto` persisten número y nombre del parámetro `autor`; el reemplazo sobrescribe ambos.
  - [ ] No queda la cadena `'sistema'` como respaldo en `adjunto.usecases.js`.
- **Pruebas** (`adjunto.test.js`, repos y blob falsos; `verificarBlobSubido` depende de
  `blobStorage`/`adjuntoRepo`: el falso debe devolver el blob como existente con `tamanoBytes` y `url`):
  A-02 (datos con `subidoPor`, `subido_por`, `subidoPorNombre` falsos → persiste el autor);
  reemplazo con otro autor → `actualizarArchivo` recibe el nuevo número y nombre; nombre `null` →
  `subido_por_nombre: null`; autor sin número lanza antes de escribir.
- **Depende de**: T2

### T5 — Controllers y fixture de pruebas
- **Archivos**: modificar `back/src/application/evidencias/evidencias.controller.js`,
  `back/src/application/adjuntos/adjuntos.controller.js`,
  `back/src/infrastructure/repositories/pruebas.repository.js`
- **Qué hacer**:
  - `evidencias.controller.js`: importar `usuarioAuditoria`; en `agregar` pasar `usuarioAuditoria(req)`
    como último argumento de `agregarEvidencia`. `listar` y `eliminar` siguen con `usuarioActual(req)`.
    `schemaAgregar` no cambia.
  - `adjuntos.controller.js`: importar `usuarioAuditoria`; `agregar` y `reemplazar` pasan
    `usuarioAuditoria(req)` en lugar de `usuarioActual(req)`. Si `usuarioActual` queda sin uso, quitar su
    import. `schemaConfirmar` no cambia.
  - `pruebas.repository.js` (insert de `evidenciaIdDeOtroUsuario`, ~línea 110): agregar
    `subido_por_nombre: 'FIXTURE OTRO USUARIO'`.
  - Ningún log nuevo con el nombre (C-08).
- **Criterios de aceptación**:
  - [ ] El body nunca se esparce hacia el caso de uso como autor (C-01).
  - [ ] `npm test` en `back/` pasa, incluida `back/test/http/matrizPermisos.test.js` sin cambios.
- **Pruebas**: cubiertas por T3/T4 y Postman (T6).
- **Depende de**: T1, T3, T4

### T6 — Postman carpeta "17 - Evidencias"
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único archivo editable de
  `postman/`; seguir `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`)
- **Qué hacer**:
  - "200 - Góndolas de la versión con sus fotos (incluye la que no tiene)": assert de que cada evidencia
    tiene la propiedad `subido_por_nombre` y que es `null` o `string` de longitud ≤ 150; que no tiene
    `correo`.
  - "201 - Subir foto PNG de la góndola 1": agregar al body `"subido_por": "999"` y
    `"subido_por_nombre": "FALSO"`; asserts: `subido_por !== '999'`, `subido_por_nombre !== 'FALSO'`,
    propiedad `subido_por_nombre` presente, sin `correo`, `puedeEliminar === true`.
- **Criterios de aceptación**:
  - [ ] La carpeta 17 corre completa en DEV (con la 018 aplicada) sin fallos y es repetible.
- **Pruebas**: corrida de la carpeta 17.
- **Depende de**: T5

### T7 — Front: tipos y `formatearAutor`
- **Archivos**: modificar `front/src/types/evidencia.ts`, `front/src/types/adjunto.ts` · crear
  `front/src/utils/autorCarga.ts`, `front/src/utils/autorCarga.test.ts`
- **Qué hacer**: tipos según "Contratos"; `export function formatearAutor(numero: string, nombre: string | null): string`
  según "UX". Sin dependencias nuevas.
- **Criterios de aceptación**:
  - [ ] `npx tsc -b` señala todos los usos que deben cambiar y ninguno más.
- **Pruebas** (`autorCarga.test.ts`, Vitest): nombre + número → `Juan López (#10234)`; nombre `null` →
  `#10234`; nombre vacío/espacios → `#10234`; nombre igual al número → `#10234`; número `sistema` sin
  nombre → `sistema`; nombre con número no numérico → `Nombre (codigo)`; `JUAN DE LA CRUZ` →
  `Juan de la Cruz`; `DE LA ROSA PEREZ` → `De la Rosa Perez`; tildes y ñ (`MUÑOZ ÁLVAREZ`); cadena
  `<img src=x onerror=alert(1)>` se devuelve como texto (C-06, A-06).
- **Depende de**: —

### T8 — Front: mostrar el autor en los cuatro puntos
- **Archivos**: modificar `EvidenciaModal.tsx` + `EvidenciaModal.css` (solo si hace falta),
  `MontajeTiendaModal.tsx`, `UsarAdjuntos.tsx` + `UsarAdjuntos.css`, `VersionResumenModal.tsx` +
  `VersionResumenModal.css` (rutas en "UX")
- **Qué hacer**: exactamente la tabla "Puntos de la UI" y los ajustes de CSS de "UX".
- **Criterios de aceptación**:
  - [ ] Los cuatro puntos muestran `Nombre (#código)` para cargas nuevas y `#código` para filas viejas.
  - [ ] Un nombre de 150 caracteres se trunca con elipsis en el pie de foto, en `UsarAdjuntos` (sin
        desplazar "Usar") y en `VersionResumenModal`; en el visor ampliado se ve completo y envuelve.
  - [ ] `title` con el texto completo en los elementos truncados.
  - [ ] `grep -rn dangerouslySetInnerHTML front/src` vacío (C-06).
  - [ ] `npx tsc -b && npm run lint` sin errores.
- **Pruebas**: lógica cubierta por T7; prueba manual (ver "Verificación final").
- **Depende de**: T7

### T9 — Documentación (commit de docs aparte)
- **Archivos**: modificar `Arquitectura/Contratos/17_evidencias/README.md`, `GET_evidencias_lista.md`,
  `POST_evidencias_agregar.md`; `Arquitectura/Contratos/13_adjuntos/GET_adjuntos_lista.md`,
  `POST_adjuntos_agregar.md`, `PUT_adjuntos_reemplazar.md`; `Arquitectura/MODELO_DATOS_V3.mmd`;
  `Arquitectura/ESTADO_MODULOS.md` (módulos 13 y 17); `Arquitectura/CASOS_DE_USO.md`;
  `Arquitectura/DISENO_SISTEMA.md` (sección 5)
- **Qué hacer**:
  - Contratos 17: campo `subido_por_nombre`; `README.md` dice `req.usuario.numeroEmpleado` (el `user` de
    CAO), no `req.usuario.usuario`; ejemplos con número de empleado (no `"jlopez"`); el body no acepta
    campos de autor.
  - Contratos 13: campo `subidoPorNombre`; ejemplos con número de empleado (no `"sistema"` ni correo); en
    `PUT_adjuntos_reemplazar.md`, que autor y nombre son de quien hizo el último reemplazo, sin historia (C-13).
  - `MODELO_DATOS_V3.mmd`: `subido_por_nombre` en `EvidenciaImplementacion` y `Adjunto`.
  - `CASOS_DE_USO.md`: en CU-07-03/04 y en los de CU-09 (agregar, reemplazar, listar), que se registra y
    muestra código y nombre del autor.
  - `DISENO_SISTEMA.md` §5: regla "autor = `Nombre (#código)` vía `formatearAutor`; sin nombre `#código`".
  - No tocar la tabla de migraciones de `CLAUDE.md` ni DT-08 (ver "Notas para el cierre").
- **Criterios de aceptación**:
  - [ ] Docs en un commit separado del código.
- **Depende de**: T1–T8

## Verificación final

- `cd back && npm test`
- `cd front && npm test && npx tsc -b && npm run lint`
- `cd back && npm run migrate` → `npm run migrate:rollback` → `npm run migrate` (solo DEV) y `npm run migrate:status`.
- Postman: carpeta `17 - Evidencias` completa.
- Prueba manual:
  1. Como implementador, subir una foto en `EvidenciaModal` → el pie muestra `Tu Nombre (#tu-número)` y
     aparece "Quitar".
  2. Como analista, abrir montaje de la tienda (`MontajeTiendaModal`) → miniatura con el mismo texto
     truncado y visor ampliado con el texto completo.
  3. Una evidencia vieja → `#número` (o el valor heredado tal cual) sin textos de error.
  4. Agregar y luego reemplazar un adjunto con otro usuario → `UsarAdjuntos` y `VersionResumenModal`
     muestran a quien reemplazó.
  5. En móvil (ancho ~375px), revisar que el pie y la línea de adjuntos no desborden.

## Riesgos

- Un `username` de CAO con más de 150 caracteres o caracteres raros rompía el `INSERT` → `normalizarAutor`
  recorta y sanea antes de escribir (C-04, C-05).
- Desfase entre el número guardado y el comparado en `puedeEliminar` → el número no se transforma (C-02),
  con prueba de ida y vuelta.
- Front desplegado antes que la migración/back → el campo llega `undefined`; `formatearAutor` lo trata
  como sin nombre (`#código`). Back desplegado sin la 018 → el `INSERT` falla: la 018 se aplica en el
  ambiente antes de desplegar el back.
- Exposición del nombre a otras tiendas (DT-10/DT-12) → aceptada; se amplía DT-12.

## Notas para el cierre (coordinador)

- **Migraciones y DT-08**: el checkout actual está en `feat/migracion-prod-por-archivo` (commits
  `44cc912`, `0407214`: procedimiento `migrate:prod` y 017 aplicada en PROD), posteriores a la base
  `aab40fc`. Al integrar, alinear DT-08 y la tabla de migraciones de `CLAUDE.md` con esos commits y
  agregar la 018 como pendiente (aplicada en DEV si T1 la aplicó; pendiente en PROD hasta pedido
  explícito, con el procedimiento de esa rama).
- **Deuda a registrar** en `Arquitectura/DEUDA_TECNICA.md`:
  - Ampliar **DT-12**: la lista de evidencias de otra tienda expone además nombre y número de quien las subió (C-09).
  - Nueva, Media (datos/back): filas de `EvidenciaImplementacion` y `Adjunto` con `subido_por` no numérico
    (nombre, `sistema`, fixtures); no atribuibles y, en evidencias, nadie las puede quitar.
  - Nueva, Baja (back): `usuarioActual` mantiene respaldos `usuario`/`id`/`'sistema'` aunque el middleware garantiza `numeroEmpleado`.
  - Nueva, Baja (back): `mapAdjunto` expone `blobContainer`/`blobPath`/`blobUrl` en las respuestas.
  - Nueva, Baja (back): `agregarAdjunto`/`reemplazarAdjunto` no borran el blob nuevo si falla la BD.
  - Nueva, Baja (back): el nombre puede salir de claims del JWT si CAO no manda `username` (C-12).
  - Nueva, Baja (docs) — se cierra en T9: módulo 17 sin casos de uso y contratos con `req.usuario.usuario`.
  - Relacionadas: DT-07 (adjuntos sin Postman) sigue abierta.
