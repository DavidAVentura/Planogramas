# 02 — Seguridad e integridad: Consolidado Tiendas

> Etapa 2 (diseño). Fuentes: `00_solicitud.md`, `01_arquitectura.md` (actualizada; "Superado" no
> aplica), `02_ux.md` y el código citado. Módulo nuevo 21 `consolidado`, solo lectura.

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoints nuevos | `GET /api/v1/consolidado/tiendas`, `GET /api/v1/consolidado/tiendas/filtros`, `GET /api/v1/consolidado/tiendas/exportar` |
| Permiso | Regla A (`requiereAnalista`, PLA001–PLA008, transitoria DT-11). Implementadores (PLA009/PLA010) sin acceso. |
| Tiendas | **Todas** las tiendas activas con asignación montable; sin filtro por tienda del usuario (DT-10). Aceptable solo porque la vista es de analista. |
| Tablas (lectura) | `VersionTienda`, `PlanogramaVersion`, `Planograma`, `Tienda`, `Gondola`, `Seccion`, `Nivel`, `Posicion`, `PosicionAccesorio`, `Accesorio`, producto/catálogo local. Escritura: ninguna. |
| Migración | `017_indices_consolidado.js` (solo índices). |
| Integraciones | CATI `/Product/search` por jerarquía (caché 30 min). |
| Dependencia nueva | `write-excel-file@4.1.1` → `fflate@^0.8.2`. |

## 2. Controles requeridos

### Acceso

1. **Bloqueante** — Los 3 endpoints con `requiereAnalista` vía `router.use(requiereAnalista)` en
   `back/src/infrastructure/http/routes/consolidado.routes.js`, con el comentario `// A transitoria (DT-11)`.
   Verifica: `back/test/http/rutasProtegidas.test.js` debe pasar con las rutas nuevas montadas (detecta
   `reglaAutorizacion`); prueba nueva: usuario solo con PLA009/PLA010 → 403 en los tres; sin token → 401.
2. **Bloqueante** — El limitador de exportación va **después** de autenticación y autorización y su
   clave es el usuario, no la IP: `keyGenerator: (req) => req.usuario.numeroEmpleado` en
   `middlewares/rateLimit.js` (hoy `crearLimiter` limita por IP y `app.js` no define `trust proxy`;
   detrás de App Service todos los usuarios comparten IP del proxy → un analista bloquearía a todos,
   y `express-rate-limit` 8 emite el error de validación `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`).
   Orden de la ruta: `requiereAnalista` → `exportacionLimiter` → controller (un 403 no consume cupo).
   Verifica: prueba con dos usuarios distintos: el 6.º request del usuario A en 1 min → 429; el 1.º del
   usuario B → 200.
3. **Importante** — Front: el grupo "Mantenimiento" y la ruta `/mantenimiento/consolidado-tiendas` solo
   para analista (misma regla que `front/src/domain/permisos/permisos.ts`); acceso directo por URL sin
   permiso → pantalla "No tienes permiso…" (no lista vacía, DT-17). El back igual rechaza (control 1).
   Verifica: prueba Vitest de la navegación filtrada por permisos.

### Entrada

4. **Bloqueante** — Esquemas Joi propios en `back/src/application/consolidado/consolidado.schemas.js`
   validados con `{ abortEarly: false, allowUnknown: false, stripUnknown: false }`. **No usar
   `validarConJoi`** de `application/compartido/validacion.js` tal cual: pasa `stripUnknown: true` y
   descartaría parámetros desconocidos en silencio (contradice §9 de arquitectura). Agregar una opción o
   un helper nuevo. Verifica: `?foo=1` → 400 `VALIDATION_ERROR`.
5. **Bloqueante** — Listas csv: tope de longitud del string **antes** de `split` (p. ej. `tiendaIds`
   ≤ 2 000 caracteres, `versionIds` ≤ 5 000), cada elemento `^[1-9]\d*$` y `Number.isSafeInteger`,
   únicos, máx. 200/500 elementos. Parámetro repetido (`?tiendaIds=1&tiendaIds=2`, que Express 5 entrega
   como arreglo) → decidir y probar: aceptarlo uniéndolo (como `parsearListaEnterosPositivos`) o 400;
   nunca dejar que un arreglo llegue a la tubería sin validar. Verifica: 201 ids → 400; `1,,2` → 400;
   `1,abc` → 400; `0` → 400; arreglo repetido → comportamiento probado.
6. **Bloqueante** — Valores enumerados por lista permitida, nunca interpolados: `vista`, `orden`
   (`sku|producto|tienda|version`), `direccion`, `pageSize` (`25|50|100|200`), `estados`
   (⊂ `publicado,piloto`), `formato`, `hojas`, `columnas` (24 claves de `domain/consolidado/columnas.js`).
   `orden`/`columnas` se usan solo como clave de un mapa de funciones, jamás como nombre de columna SQL ni
   propiedad dinámica sobre objetos arbitrarios (evita `__proto__`/`constructor`). Verifica:
   `columnas=__proto__` → 400 con `details.columnasInvalidas`; `orden=1;drop` → 400; `pageSize=10000` → 400.
7. **Bloqueante** — `estados` filtra dentro de lo montable; el repositorio restringe **siempre** en SQL a
   `estado IN ('publicado','piloto')` y a tiendas activas, independiente del query. Un `versionIds` de un
   borrador o en desarrollo produce cero filas (no 404, no error que revele existencia). Verifica:
   prueba de dominio/repositorio falso con una versión borrador asignada → no aparece en listado,
   `/filtros` ni exportación.
8. **Importante** — `busqueda` (≤ 100, trim) se compara con `includes` sobre texto normalizado; **nunca**
   `new RegExp(busqueda)` (ReDoS / errores con `(`). Jerarquía: `^[A-Za-z0-9_-]{1,20}$`, vacío → 400.
   Verifica: `busqueda=(((((a` → 200 sin excepción.
9. **Importante** — Paginación: `page` entero ≥ 1 con tope (p. ej. ≤ 10 000); página fuera de rango →
   `data: []` con `total` correcto, no error. Verifica: `page=999999` → 200 vacío; `page=1.5` → 400.
10. **Importante** — Exportación: `hojas` requerido solo con `HOJAS` y prohibido en otros formatos
    (`Joi.when`), sin duplicados; `columnas` 1–24 únicas; `soloDuplicados=true` con `vista≠PLANOGRAMA`
    → 400. Verifica: casos de 400 en prueba de esquemas.

### Costo, memoria y tiempo (DoS)

11. **Bloqueante** — Tope de filas de exportación contado **antes** de construir celdas/libro
    (`CONSOLIDADO_EXPORTACION_MAX_FILAS`, def. 100 000, leído en `config/env.js` con validación entero
    > 0 y máximo duro, p. ej. 200 000, para que una variable mal puesta no lo anule). Superado → `422`
    `EXPORTACION_DEMASIADO_GRANDE` `details: { filas, maximo }` con `err.status = 422` explícito.
    Verifica: prueba de caso de uso con repositorio falso y tope 10 → 422 sin llamar a `escribirLibroXlsx`
    (espía).
12. **Importante** — Concurrencia global de exportación: la generación del libro es síncrona y bloquea el
    event loop (hasta ~2,4 M celdas). El límite 5/min por usuario no evita que N analistas exporten a la
    vez. Agregar un semáforo de proceso (máx. 1–2 exportaciones simultáneas; excedente → `429` o `503`
    con mensaje "Hay otra descarga en curso…") en `consolidado.controller.js` o el caso de uso.
    Verifica: prueba con dos llamadas concurrentes al caso de uso y generador lento simulado.
13. **Importante** — Listado sin limitador: cada request carga la base completa en memoria. Agregar
    `consolidadoLimiter` por usuario (p. ej. 60/min) en `GET /consolidado/tiendas` y registrar en log
    tiempo y filas por request (sin valores del query) para medir el p95 en PROD. Verifica: 61.º request
    en 1 min → 429.
14. **Importante** — Repositorio: columnas explícitas en cada `select` (nada de `select *`), sin campos
    de auditoría ni internos (`usuario_*`, blobs, rutas de adjuntos). Las 6 consultas filtran por
    subconsulta, sin listas `whereIn` construidas desde datos (límite de 2 100 parámetros); `tiendaIds`
    del usuario (≤ 200) sí puede ir en `whereIn` parametrizado. Sin `knex.raw` con concatenación.
    Verifica: revisión del diff + prueba de forma de respuesta (claves exactas de `Fila`).

### CATI

15. **Importante** — Con jerarquía, el peor caso es 30 s (primera página) + 30 s (resto en paralelo)
    = 60 s por `listarSkusPorJerarquia` (`back/src/infrastructure/cati/catiClient.js:380`). Aceptable bajo
    230 s, pero: (a) fallo o timeout → `503 SERVICIO_NO_DISPONIBLE` JSON, sin datos parciales ni mensaje de
    CATI; (b) en exportación, CATI se resuelve **antes** de cargar la base y generar; (c) recomendado:
    deduplicar llamadas en vuelo por clave (`Map` de promesas) para que varios usuarios en frío no
    disparen la misma paginación en paralelo. La caché es por `nivel:id`, datos de catálogo no
    dependientes del usuario: compartirla entre usuarios es correcto. Verifica: catálogo falso que
    rechaza → 503 en listado y exportación; con jerarquía caída y sin filtro de jerarquía → 200 (CATI no
    se llama).

### Salida y exportación .xlsx

16. **Bloqueante** — Inyección de fórmulas: en `back/src/infrastructure/exportacion/libroXlsx.js`
    toda celda de texto con `type: String` explícito y **ningún** uso de `type: 'Formula'`; números solo
    si `Number.isFinite` (si no, celda vacía). Verifica: prueba que genera un libro con
    `observaciones = '=HYPERLINK("http://x","a")'`, `'+1'`, `'-1'`, `'@SUM(A1)'`, lo descomprime (`fflate`
    `unzipSync`, solo en la prueba) y comprueba que `sheet1.xml` no contiene `<f>`.
17. **Importante** — Texto saneado antes de escribir: quitar caracteres de control no válidos en XML
    (`[\x00-\x08\x0B\x0C\x0E-\x1F]`; un `\x00` en `observaciones` deja el archivo "dañado") y truncar
    celdas a 32 767 caracteres (límite de Excel; `observaciones` unidas con ` · ` y valores unidos con
    ` | ` pueden crecer). Verifica: prueba con `\u0000` y con un texto de 40 000 caracteres.
18. **Bloqueante** — Lista blanca de columnas como única fuente de etiquetas y extractores
    (`domain/consolidado/columnas.js`); la etiqueta del encabezado nunca viene del query. Excepción
    documentada: `modo` al inicio en DETALLADO. Verifica: prueba de que el encabezado es exactamente
    `columnas.map(etiqueta)` (+ "Modo").
19. **Bloqueante** — Generar el `Buffer` completo **antes** de fijar cabeceras y responder; si algo falla,
    el `errorHandler` aún responde JSON estándar (no un `.xlsx` truncado con 200). Cabeceras:
    `Content-Type` xlsx, `Content-Disposition: attachment; filename="consolidado-tiendas-<formato>-AAAAMMDD.xlsx"`
    con `<formato>` de un mapa fijo y fecha del servidor (sin datos del usuario), `Cache-Control: no-store`,
    `Content-Length`. Nombres de hoja fijos ("Consolidado", "Planograma", "Cross", "Impulso").
    Verifica: prueba del controller con generador que lanza → 500 JSON sin stack.
20. **Menor** — Si el front lee el nombre de `Content-Disposition`, hay que exponerlo en CORS
    (`exposedHeaders: ['Content-Disposition']` en `app.js`); si no, el front arma el nombre con el formato.
    Elegir uno y documentarlo en el contrato.
21. **Menor** — Trazabilidad: log de cada exportación con `numeroEmpleado`, formato, hojas, número de
    filas y duración (sin token ni valores de búsqueda). Datos internos de surtido salen de la app.

### Integridad

22. **Importante** — Las 6 consultas de `cargarBase` corren sin transacción: una edición concurrente
    (borrar góndola/nivel entre consultas) puede dejar posiciones cuyo nivel o góndola no se cargó. El
    mapeo debe **descartar huérfanos sin lanzar** (o correr las 6 dentro de una transacción de solo
    lectura con `SNAPSHOT` si la BD lo permite). Verifica: prueba del dominio con una posición cuyo
    `nivel_id` no existe en la base → se omite, sin excepción.
23. **Importante** — Extraer los mapeadores de `skuVersion.repository.js` a `mapeadoresVersion.js` y
    exportar `valorComun` **sin cambio de comportamiento**: las pruebas actuales del módulo 19 deben
    seguir verdes sin tocarlas. El conteo de planogramas (rojo) se calcula antes de filtros (prueba
    explícita con filtro de versión que deja una sola fila y `planogramasEnTienda = 2`).
24. **Importante** — AGREGADO: mín./máx. sumados contando cada versión una sola vez por SKU–tienda;
    `null` no suma; todos `null` → vacío. Verifica: prueba con un SKU en planograma y cross de la misma
    versión → no se duplica.

### Migración 017

25. **Importante** — Índices con **nombre explícito** (`IX_Gondola_version`, `IX_Nivel_gondola`,
    `IX_Posicion_nivel`, `IX_PosicionAccesorio_posicion`, `IX_VersionTienda_tienda`) y `down` que los
    elimina por ese nombre, en orden inverso. Comprobar antes que ninguno exista ya (p. ej. creado a mano en
    PROD) o envolver cada uno en `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = '…')` (raw sin
    datos de usuario). Verifica: `npm run migrate` → `npm run migrate:rollback` → `npm run migrate` en DEV
    sin error; `migrate:status` limpio.
26. **Bloqueante (para PROD)** — No aplicar 017 en PROD hasta resolver DT-08 (`migrate:status` contra
    `db-planogramas`). Las migraciones no corren en el CD, así que publicar el código sin 017 en PROD
    funciona (solo más lento); actualizar la tabla de migraciones de `CLAUDE.md` al aplicar en DEV.

### Dependencia

27. **Importante** — `write-excel-file@4.1.1` (sin scripts de instalación; 1 dependencia: `fflate@^0.8.2`).
    `fflate` **0.8.0–0.8.2 tiene GHSA-px8p-9vwx-vf98** (moderada, bucle infinito en `unzipSync` con ZIP64
    malformado; no afecta la escritura, pero `npm audit` lo marcará). Exigir que `back/package-lock.json`
    resuelva `fflate@0.8.3` (como ya resuelve el front) y que `npm audit --omit=dev` en `back/` quede sin
    hallazgos nuevos. `write-excel-file` exacta en `package.json`. Verifica: `npm ls fflate` → 0.8.3.

## 3. Pruebas de abuso

| # | Caso | Esperado |
|---|---|---|
| A1 | Usuario con solo PLA009 (implementador) pide cualquiera de los 3 endpoints | 403 `FORBIDDEN` |
| A2 | Sin token / token vencido | 401 |
| A3 | `?tiendaIds=` con 201 ids, con `0`, con `1,,2`, con 5 000 caracteres | 400 |
| A4 | `?columnas=sku,__proto__` / `?columnas=sku,sku` | 400 (`columnasInvalidas` / duplicado) |
| A5 | `?orden=sku;DROP TABLE Posicion` / `?pageSize=100000` / `?estados=borrador` | 400 |
| A6 | `?versionIds=<id de una versión borrador asignada>` | 200 con 0 filas; nunca aparece en `/filtros` |
| A7 | `?foo=bar` | 400 (sin `stripUnknown`) |
| A8 | `?busqueda=((((` | 200, sin excepción |
| A9 | `?area=` (vacío) / `?area=A%20B` | 400 |
| A10 | Exportar con filas > tope | 422 `EXPORTACION_DEMASIADO_GRANDE` con `details.filas/maximo`; el generador no se invoca |
| A11 | 6 exportaciones en 1 min del mismo usuario; 1 de otro usuario | 6.ª → 429; la del otro → 200 |
| A12 | Dos exportaciones simultáneas (semáforo) | la segunda → 429/503 con mensaje, no bloqueo |
| A13 | `observaciones` con `=cmd|' /C calc'!A0`, `@SUM(…)`, `\u0000`, 40 000 caracteres | celda de texto, sin `<f>`, archivo abre, truncado |
| A14 | CATI caído con filtro de jerarquía (listado y exportación) | 503 JSON, sin datos parciales ni texto de CATI |
| A15 | Falla al generar el libro | 500 JSON estándar sin stack (no un `.xlsx` corrupto con 200) |
| A16 | Posición huérfana (nivel borrado entre consultas) | se omite, 200 |
| A17 | `?formato=DETALLADO&hojas=CROSS` / `?formato=HOJAS` sin `hojas` | 400 |
| A18 | Preferencias de columnas manipuladas en `localStorage` (`consolidado-tiendas:columnas` con claves ajenas) | el front las ignora y no envía claves fuera de la lista (sin 400 en la descarga) |

## 4. Deuda detectada y relación con abiertas

- **DT-01 / DT-10** (abiertas): la vista expone **todas** las tiendas a cualquier analista. Se acepta
  porque es regla A; al resolver DT-10, el consolidado **no** debe abrirse a implementadores sin el filtro
  por `req.usuario.tiendas` en el repositorio (`cargarBase({ tiendaIds })` ya admite el filtro: intersecar
  con las tiendas del usuario). Anotarlo en DT-10.
- **DT-11** (abierta): +3 rutas con regla A transitoria; registrar `consolidado` en la matriz de
  `Arquitectura/SEGURIDAD_PERMISOS.md`. La exportación saca datos de surtido de la app; si negocio quiere
  restringirla, permiso propio (p. ej. `PLA011`, pregunta 1 de arquitectura). Recomendación: decidirlo
  ahora; si no, dejarlo como parte de DT-11.
- **DT-08** (abierta): bloquea aplicar 017 en PROD (control 26).
- **DT-24**: se cierra con 017.
- **Nueva (Media, back)** — `validarConJoi` fuerza `stripUnknown: true`: los parámetros desconocidos se
  descartan en silencio en todos los módulos que lo usan (16, 17). Este módulo no lo usará tal cual
  (control 4).
- **Nueva (Media, back)** — Los limitadores (`rateLimit.js`) son por IP y `app.js` no define
  `trust proxy`: en App Service `vozLimiter` agrupa a todos los usuarios bajo la IP del proxy. Se corrige
  para la exportación con `keyGenerator` por usuario (control 2); `vozLimiter` queda pendiente.
- **Nueva (Baja, back)** — `listarSkusPorJerarquia` sin deduplicación de llamadas en vuelo (control 15c,
  si no se hace en esta entrega).
- **Nueva (Baja, back)** — Exportación síncrona en el event loop; si el tope sube o crece el uso,
  mover a worker o descarga asíncrona.
