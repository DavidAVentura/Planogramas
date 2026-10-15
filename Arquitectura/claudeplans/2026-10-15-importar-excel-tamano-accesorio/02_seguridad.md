# 02 — Seguridad e integridad · Importar Excel: varios accesorios por producto (`//`)

Base: `76dd827`. Fuentes: `00_solicitud.md`, `01_arquitectura.md` y el código citado (por fragmentos).

## 0. Discrepancia que hay que resolver en el PLAN antes de implementar

`01_arquitectura.md` §2 y §7 proponen que un tamaño fuera de rango (≤ 0 o > 999) se degrade a
`null` con advertencia y que más de 10 accesorios "se trunquen". El usuario respondió en P1/P2
(`00_solicitud.md`) lo contrario: **error bloqueante con fila, columna, motivo y formato esperado, y
no se importa nada**. Este documento asume la respuesta del usuario (todo o nada). Si el PLAN
conserva la degradación a `null`/truncado, el control 1 cambia y debe volver a revisión.

Queda como pregunta para el coordinador (no es de seguridad, pero afecta el "todo o nada"): el
accesorio **inexistente en el catálogo** hoy se omite con advertencia (`importacion.usecases.js:139`).
No es un error de formato del archivo, así que este documento lo deja como advertencia; confirmarlo
en la aprobación.

## 1. Superficie afectada

| Elemento | Detalle |
|---|---|
| Endpoint | `POST /api/v1/versiones/:id/importar-productos` (`versiones.routes.js:82`), guard `requiereAnalista` + `editarContenido` (`EDITAR_VERSION` o `EDITAR_LIENZO`). Sin cambios de guard. |
| Tablas (escritura) | `Gondola` (crea/actualiza "Por ubicar"), `Nivel`, `Posicion`, `PosicionAccesorio` (pasa de 0..1 a 0..10 filas por posición). Todo dentro de `importarPorUbicar` (`importacion.repository.js:250`, `db.transaction`). |
| Tablas (lectura) | `PlanogramaVersion` (estado editable), `Accesorio` (`buscarPorCodigo`, parametrizado con `whereRaw(..., [?])` — correcto), `Producto`/CATI. |
| Roles | Analista con `EDITAR_VERSION`/`EDITAR_LIENZO`. Usuario de tienda: debe recibir 403. |
| Tiendas | No aplica: las versiones no se filtran por tienda en endpoints de analista (DT-10 cubre solo los endpoints I). |
| Front | `excelProductosPlanograma.ts` (parseo y validación bloqueante), `ImportarExcelProductosModal.tsx` (botón Importar, muestra de `details`). |
| Integraciones | CATI vía `productoRepo.asegurarExistencia` (sin cambio). |

## 2. Controles requeridos

1. **Bloqueante — El back es la barrera del "todo o nada"; nunca degradar ni filtrar filas inválidas.**
   Dónde: `importacion.controller.js` (`validarBody` con `abortEarly: false`, l. 111-115) y
   `importacion.usecases.js`. Cualquier valor fuera de contrato en cualquier producto (tamaño > 999 o
   ≤ 0, `codigo` vacío o > 50, más de 10 accesorios, tipo incorrecto) debe responder
   `400 VALIDATION_ERROR` para el lote completo **antes** de abrir la transacción, con cero filas
   escritas. Prohibido: `Joi.number().max(999).failover(null)`, `.empty()` sobre valores numéricos
   inválidos, `array().max(10)` sustituido por `slice(0, 10)` en el dominio, o filtrar filas inválidas
   en el caso de uso. Verificación: prueba en `back/test/domain/importacion.test.js` (o del
   controller/esquema exportado) que valide un payload de 45 productos donde solo `productos[42]`
   trae `tamano_pulgadas: 2222` → error con `path` `['productos', 42, 'accesorios', 0, 'tamano_pulgadas']`
   y que el repositorio falso de `importarPorUbicar` **no** fue llamado.

2. **Bloqueante — Esquema Joi del ítem de accesorio cerrado y con límites.** Dónde:
   `importacion.controller.js`, `schemaProductoExcel` (l. 75-92). Debe ser exactamente:
   `accesorios: Joi.array().items(Joi.object({ codigo: Joi.string().trim().min(1).max(50).required(), tamano_pulgadas: Joi.number().positive().max(999).precision(2).allow(null).default(null) })).max(10).default([])`.
   - `Joi.object({...})` explícito (no objeto literal suelto en `items`) para que `stripUnknown`
     elimine claves coladas por el cliente (`accesorio_id`, `orden`, `posicion_id`, `nota_libre`).
   - `max(50)` coincide con `Accesorio.codigo` `string(50)` (`001_esquema_inicial.js:15`).
   - `precision(2)` alinea con `PosicionAccesorio.tamano_pulgadas DECIMAL(6,2)` (`013`, l. 18).
   Verificación: pruebas del esquema con 11 accesorios → 400; `codigo: ''` y `codigo` de 51
   caracteres → 400; `tamano_pulgadas: 0`, `-1`, `1000`, `'22" // 22"'` → 400; ítem con
   `accesorio_id: 1, orden: 99` → validado sin esas claves.

3. **Bloqueante — `accesorio_id` y `orden` los calcula el servidor, nunca vienen del request.** Dónde:
   `importacion.usecases.js` (resolución por código) y `importacion.entity.js` (`posicionDesdeFila`).
   `accesorio_id` sale solo de `accesorioRepo.buscarPorCodigo`; `orden` es 1..k consecutivo en el
   orden de la lista tras omitir los inexistentes. Escenario de falla si no: un cliente manda
   `accesorio_id` arbitrario → FK válida a otro accesorio o colisión de `orden`. Verificación: prueba
   de `importarProductos` con repos falsos: `[A, X(inexistente), A]` → posición con
   `[{accesorio_id: idA, orden: 1}, {accesorio_id: idA, orden: 2}]` y una advertencia por X.

4. **Bloqueante — Todas las filas de `PosicionAccesorio` se insertan con `trx` dentro de
   `importarPorUbicar`.** Dónde: `importacion.repository.js`, `insertarPosicionPorUbicar` (l. 236-248).
   El `insert` multi-fila debe usar `trx(TABLA_POSICION_ACCESORIO)`, no `db(...)`, y la firma debe
   desestructurar `accesorios` (hoy desestructura `accesorio`): si se renombra solo en el dominio,
   `accesorios` cae dentro de `...posicion` y se intenta insertar en `Posicion` como columna →
   error SQL a mitad del lote (la transacción revierte, pero el usuario recibe un 500). Si
   `accesorios` está vacío no se ejecuta el `insert` (Knex con arreglo vacío genera SQL inválido en
   SQL Server). Verificación: revisión del diff (etapa 5) + prueba manual Postman "201 con 2
   accesorios" y consulta de `PosicionAccesorio` con 2 filas `orden` 1 y 2; caso con un SKU cuyo
   `insert` falle (p. ej. forzar error en DEV) no deja `Posicion` huérfanas.

5. **Importante — Formato legado sin ambigüedad.** Dónde: `importacion.controller.js` (esquema) y la
   función pura del dominio `accesoriosDeFila`. Reglas: si `accesorios` trae ≥ 1 elemento **y**
   `accesorio_codigo` no es vacío → `400` (Joi `.custom` o `.when`), en vez de ignorar uno en
   silencio; si `accesorios` está vacío y `accesorio_codigo` no es vacío → lista de 1 con
   `tamano_accesorio_pulgadas`; `tamano_accesorio_pulgadas` sin código se ignora (como hoy). Nunca se
   combinan ambos (evita duplicar el accesorio). Verificación: pruebas de `accesoriosDeFila` para los
   cuatro casos y del esquema para el caso mixto → 400.

6. **Importante — Normalizar el código igual al buscar y al indexar.** Dónde:
   `importacion.usecases.js` l. 135-144. Hoy el mapa se indexa por el código crudo y se busca con
   `normalizarCodigo(codigo)`. Con listas, la clave del `Map` y la búsqueda posterior deben usar
   `normalizarCodigo` en ambos lados; si no, `vda-22r-pth` y `VDA-22R-PTH` del mismo lote producen
   dos consultas y, si en algún punto se compara con la clave cruda, un accesorio existente puede
   quedar "inexistente". Verificación: prueba con `['vda-22r-pth', 'VDA-22R-PTH ']` → una sola
   llamada a `buscarPorCodigo` y ambos resueltos al mismo id.

7. **Importante — Tope de consultas al catálogo por request.** Dónde: `importacion.usecases.js`.
   Con 1000 productos × 10 accesorios el cliente puede mandar hasta 10 000 códigos distintos, y hoy
   se resuelven con un `await` secuencial por código (l. 136-140) **fuera** de la transacción →
   10 000 consultas por request de un usuario autenticado. Opciones: (a) agregar al repo
   `buscarPorCodigos(codigos[])` con `whereIn` en lotes de ≤ 500 parámetros; o (b) rechazar con 400
   más de 200 códigos distintos por lote (un Excel real trae pocos). Verificación: prueba de caso de
   uso que cuente las llamadas al repo falso con 300 códigos distintos.

8. **Importante — La validación bloqueante del front no se puede saltar desde el propio front.**
   Dónde: `front/src/utils/excelProductosPlanograma.ts` y `ImportarExcelProductosModal.tsx`. El botón
   Importar queda deshabilitado con errores **y** la función que arma el payload devuelve/lanza sin
   enviar si `errores.length > 0` (defensa ante un `onClick` por teclado o un re-render). El front
   no convierte valores inválidos en `null` para "pasar" el back. Además, el botón se deshabilita
   mientras la petición está en curso (doble clic = doble importación, ver control 10).
   Verificación: Vitest de `interpretarHojaProductos` con la fila `22" // 22" // 8"` y nombre `A // B`
   → error bloqueante con fila y columna, y el arreglo de productos a enviar no se genera.

9. **Importante — Matriz de permisos incluye la ruta.** Dónde: `back/test/http/matrizPermisos.test.js`
   l. 83-95: `['POST', '/versiones/1/importar-productos']` **no está** en `PROHIBIDAS_TIENDA` (sí
   `importar-layout`). Agregarla para que un usuario de tienda y uno sin permisos reciban 403.
   Verificación: `cd back && npm test`.

10. **Menor — Doble importación concurrente.** Dónde: `importacion.usecases.js` l. 128-130:
    `validarVersionEditable` y `skusDeVersion` se leen fuera de la transacción. Dos requests
    simultáneos (doble clic, dos pestañas) importan los mismos SKUs dos veces, ahora con hasta 10
    accesorios cada uno. Preexistente; con el control 8 (botón deshabilitado en vuelo) basta para
    este cambio. Registrar como deuda (sección 4).

11. **Menor — Salida y mensajes.** Dónde: modal (`ImportarExcelProductosModal.tsx`) y
    `front/src/utils/errors.ts`. Las advertencias del back incluyen el `codigo` enviado por el
    usuario (`El accesorio "X" ...`) y los `details` de Joi incluyen rutas: renderizar solo como
    texto JSX (nada de `dangerouslySetInnerHTML`). El back no debe agregar a la respuesta 201 ids de
    `PosicionAccesorio` ni datos del catálogo; la forma de la respuesta no cambia. El `errorHandler`
    sigue sin exponer SQL: un error del `insert` multi-fila debe llegar como 500 genérico.
    Verificación: revisión del diff.

## 3. Pruebas de abuso

| # | Caso | Esperado |
|---|---|---|
| A1 | 45 productos, `productos[42].accesorios[0].tamano_pulgadas = 2222` | 400 `VALIDATION_ERROR` con la ruta exacta; 0 filas nuevas en `Posicion`/`PosicionAccesorio` |
| A2 | Un producto con 11 accesorios | 400; nada escrito |
| A3 | `accesorios: [{ codigo: 'A', accesorio_id: 1, orden: 99, posicion_id: 5 }]` | 201; la fila guardada tiene el `accesorio_id` del catálogo para `A` y `orden: 1` |
| A4 | `accesorios: [{codigo:'A'}]` y `accesorio_codigo: 'B'` en el mismo producto | 400 (no se guarda A+B ni solo uno en silencio) |
| A5 | Front viejo: solo `accesorio_codigo: 'A'`, `tamano_accesorio_pulgadas: 22` | 201; una fila `PosicionAccesorio` con 22 y `orden: 1` |
| A6 | `[A, X(inexistente), A]` | 201; 2 filas `orden` 1 y 2 y una advertencia por X |
| A7 | `codigo: '   '` | 400 (trim → vacío) |
| A8 | `tamano_pulgadas: '22" // 22"'` (cadena cruda) | 400 (Joi no la convierte a número) |
| A9 | 1000 productos con 10 códigos distintos cada uno | 400 por tope de códigos distintos o resolución en lote (control 7); nunca 10 000 consultas |
| A10 | Usuario de tienda (`TOKEN_CAO_TIENDA`) llama el endpoint | 403 |
| A11 | Versión en estado `publicado` | 422 sin escribir nada (sin cambio, confirmar que sigue) |
| A12 | Archivo con un error de formato en la fila 197 (front) | Modal de errores con fila/columna/motivo; botón Importar deshabilitado; no sale la petición |

## 4. Deuda detectada

| Propuesta | Severidad | Detalle |
|---|---|---|
| Importación concurrente duplica SKUs | Media | `importarProductos` valida estado y SKUs existentes fuera de la transacción (`importacion.usecases.js:126-130`); dos requests simultáneos insertan duplicados. Mover `skusDeVersion` y el chequeo de estado dentro de `importarPorUbicar` o bloquear la góndola "Por ubicar" (`UPDLOCK`). |
| Resolución de accesorios N consultas secuenciales | Baja (si el control 7 se resuelve con tope) | Si se elige la opción (b) del control 7, queda pendiente el `buscarPorCodigos` en lote. |
| `importar-productos` faltaba en `matrizPermisos.test.js` | — | Se cierra con el control 9; no registrar si el PLAN lo incluye. |
| Campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` | Baja | Ya propuesta por el arquitecto; al retirarlos, quitar también la regla del control 5. |
| Sin auditoría de quién importó | Baja | `importarProductos` no recibe `req.usuario` ni registra autor; las posiciones creadas no tienen trazabilidad. Preexistente. |

---

## Revisión 2 (2026-10-15) — ganchos de exhibición y 422 por accesorio fuera del catálogo

Alcance: solo lo nuevo de `00_solicitud.md` ("Cambios pedidos en la aprobación 1"), §12 de `01_arquitectura.md`
y la rev. 2 de `PLAN.md` (T2, T11-T15). Permisos y CAO quedan fuera por pedido del usuario: se retiran el caso A10 y
el control 9 de la revisión 1. El caso A6 queda **reemplazado** por R2-A3, porque ya no hay 201 con
advertencia por accesorio inexistente.

### R2.1 Superficie afectada

- Endpoints que **escriben** ganchos: `POST /versiones/:id/importar-productos`, `POST /versiones/:id/importar-layout`,
  `POST` de posiciones y `PATCH /posiciones/:id` (los 4 pasan a usar `schemaGanchos`).
- Endpoints que **leen** ganchos: `GET /versiones/:id/skus`, productos de implementación (los consultan
  usuarios de tienda) y lecturas de posición.
- Tablas: `Posicion.ganchos` (`NVARCHAR(MAX)`, JSON), sin migración; `PosicionAccesorio`, con FK de `accesorio_id` hacia
  `Accesorio` (migración 001, l. 171-172). El clonado de versiones (`version.repository.js` l. 160) copia el
  texto tal cual, así que no le afecta.

### R2.2 Controles

R2-1. **Importante — cambia el PLAN (T12 y "Esquema común de ganchos").** El esquema propuesto
acepta notación científica y formas no canónicas. Lo comprobé con el Joi del repo:
`["5E1"] → [50]`, `["1e2"] → [100]`, `["+54"] → [54]`, `["54.0"] → [54]`, `["054"] → [54]`; en cambio,
`["054E"]` da error. Escenario: un cliente (Postman, un front futuro o un error de tipeo como `54E2`)
manda un gancho de exhibición mal escrito y el back lo guarda **en silencio como el gancho normal 5400 o 50**.
Es justo la confusión 54 ↔ 54E que este plan busca eliminar. Además, la regla del back no coincide con
`normalizarGancho` (T11) ni con `leerGancho` (T14), que rechazan `5E1`, `+54` y `54.0` y aceptan `054E`.
**Corrección**: una sola regla. En `back/src/application/compartido/ganchos.schema.js`:
```js
const { normalizarGancho } = require('../../domain/compartido/gancho');
const schemaGancho = Joi.any().custom((v, h) => {
  const g = normalizarGancho(v);
  return g === null ? h.error('any.invalid') : g;
}).messages({ 'any.invalid': '{{#label}} debe ser un número de gancho entero (1-999999) o de exhibición como 54E' });
const schemaGanchos = Joi.array().items(schemaGancho).max(100).unique();
```
Verificación (agregar a los criterios de T12): dan error `'5E1'`, `'1e2'`, `'54E2'`, `'+54'`, `'54.0'` y los ítems `true` y `null`;
`'054E'` → `'54E'`; `[54, '54']` y `['54E','54e']` siguen contando como repetidos (comprobado: Joi aplica la unicidad
sobre los valores ya convertidos).

R2-2. **Importante — cambia el PLAN (T7).** El código de accesorio se normaliza distinto en front y back.
El back (`normalizarCodigo` en `accesorio.entity.js`) y el modal (`normalizar` en `ImportarExcelProductosModal.tsx`,
l. 27) colapsan los espacios internos (`/\s+/g → ' '`), pero T7 define el código de
`accesoriosDeCeldas` y de `OrigenAccesorio.codigo` solo como `trim().toUpperCase()`. Escenario: la celda dice
`VDA-22R  PTH` (doble espacio) y el catálogo tiene `VDA-22R PTH`. El aviso "Accesorios que no están en el catálogo"
no lo lista (usa `normalizar`), pero `erroresDeCatalogo` compara `'VDA-22R  PTH'` contra el conjunto normalizado
y lo marca como error bloqueante, sin botón "Dar de alta". El usuario queda atascado aunque el back lo
aceptaría, y front y back ya no "bloquean exactamente lo mismo", como exige el PLAN.
**Corrección**: un único helper exportado (ej. `normalizarCodigoAccesorio` en `front/src/domain/` o en el
lector) con `trim().replace(/\s+/g, ' ').toUpperCase()`, usado en `accesoriosDeCeldas`, en `OrigenAccesorio`,
en el conjunto del catálogo y en `faltantes`. Verificación: caso Vitest en T7 con doble espacio; `erroresDeCatalogo`
debe quedar vacío si el catálogo tiene el código con un solo espacio.

R2-3. **Importante — agrega un paso a "Verificación final".** `parsearGanchosJson` descarta en silencio
los valores no canónicos al leer. Si en algún ambiente hay filas con `"54"` (texto), decimales, ceros o
JSON inválido, el drawer las mostraría ya filtradas y el siguiente `PATCH`, que manda la lista completa
desde `posicion.ganchos`, **las borraría para siempre**. Hoy todos los productores escriben enteros,
pero PROD no está verificado (DT-08). **Control**: antes de publicar, correr en DEV y PROD esta consulta
de solo lectura, que debe devolver 0 filas, y anotar el resultado en `06_revision_seguridad.md`:
```sql
SELECT id, ganchos FROM Posicion
WHERE ganchos IS NOT NULL
  AND (ISJSON(ganchos) = 0 OR ganchos LIKE '%"%' OR ganchos LIKE '%.%' OR ganchos LIKE '%-%' OR ganchos LIKE '%e%');
```
Si devuelve filas, no se publica hasta decidir qué hacer (normalizarlas con un script o ampliar el parser). Además,
`parsearGanchosJson` debe ser la **única** lectura: `grep -rn "JSON.parse" back/src | grep -i gancho` solo
puede encontrarlo en `domain/compartido/gancho.js`. Este grep amplía el de `.map(Number)` del PLAN, que no detecta
un `JSON.parse` crudo como el que hoy está en la l. 48 de `posicion.repository.js`.

R2-4. **Importante — ya está en el PLAN; confirmar en la revisión del diff.** El orden en
`importarProductos` debe ser: `validarVersionEditable` → tope de 200 (400) → resolución de **todas** las claves →
422 → y recién después `skusDeVersion`/`importarPorUbicar`. Verificación: el criterio de T2 con contadores
(0 llamadas a `importarPorUbicar` cuando hay un código inexistente, aunque el SKU ya esté en la versión). El
`errorHandler` ya devuelve `details` cuando existe `err.status` (l. 25-31), así que no necesita cambios.

R2-5. **Menor.** El mismo endpoint tiene dos 422 con el mismo `code: 'UNPROCESSABLE'` (versión no editable y
accesorio inexistente). T8 debe distinguirlos con `Array.isArray(err.details?.codigos)` y no por el status.
Si no, una versión publicada dispararía "catálogo recargado" con un mensaje engañoso. Verificación: en
la revisión del diff de `ImportarExcelProductosModal.tsx`.

R2-6. **Menor (sin cambio de PLAN).** Hay una carrera entre la verificación del catálogo (fuera de la transacción)
y el `insert` en `PosicionAccesorio`. Si otro usuario elimina el accesorio en ese intervalo (`eliminarAccesorio`
lo permite porque todavía tiene 0 usos), la FK de la migración 001 hace fallar el `insert` dentro de `trx`:
rollback completo y `500` genérico. No queda ningún dato a medias, así que es aceptable. No se debe quitar la FK
ni capturar el error para "seguir sin accesorio".

R2-7. **Menor (sin cambio de PLAN).** Numeración y cruce: con R2-1 y R2-3, toda entrada y toda lectura quedan
en forma canónica. Así, `usados` filtrado por `typeof g === 'number'` (T13), el `Map` de `cruzarConPorUbicar`
y el de `importacionPdf.ts` distinguen `54` de `"54E"` sin más cambios. Riesgo residual: que algún consumidor
nuevo use `Math.min(...ganchos)` o `a - b` sin `numeroGancho`/`compararGanchos`, lo que da `NaN` y rompe el orden.
Verificación en el diff: `grep -rn "Math.min(\.\.\..*ganchos\|ganchos.*sort((a, b) => a - b)" back/src front/src`
sin resultados fuera de los helpers y del extractor de PDF (que solo maneja enteros).

R2-8. **Menor (salida).** Los ganchos llegan a la consulta de implementadores. Como `parsearGanchosJson`
solo devuelve números o `"<n>E"` (máx. 7 caracteres), no hay forma de inyectar texto arbitrario en la
UI. Hay que mantener el render como texto JSX (control S10).

### R2.3 Pruebas de abuso nuevas

| # | Caso | Esperado |
|---|---|---|
| R2-A1 | `PATCH /posiciones/:id` con `ganchos: ["5E1"]` o `["54E2"]` | `400` (con el esquema actual del PLAN se guardaría `50` o `5400`) |
| R2-A2 | `PATCH` con `ganchos: [54, "54"]` o `["54E", "54e"]` | `400` por repetido |
| R2-A3 | `importar-productos` con 3 productos; el 3.º trae `accesorios: [{ codigo: "ZZZ-NO-EXISTE" }]` y su SKU ya está en la versión | `422` con `details.codigos = ["ZZZ-NO-EXISTE"]`; 0 filas nuevas en `Posicion`/`PosicionAccesorio`; los productos 1 y 2 tampoco se importan |
| R2-A4 | `importar-productos` con `codigo: "zzz-no-existe "` y `"ZZZ-NO-EXISTE"` en dos productos | Un solo código (normalizado) en `details.codigos` y una sola consulta |
| R2-A5 | Excel con `Nombre_accesorio_TG = "VDA-22R  PTH"` (doble espacio) y catálogo `VDA-22R PTH` | Vista previa sin aviso de faltante; Importar envía y responde `201` |
| R2-A6 | `importar-layout` con una posición `ganchos: ["54E"]` enviada a mano | `201`; el cruce no la confunde con el `54` de Por ubicar |
| R2-A7 | Posición con `[65, "54E"]`: abrir el drawer y guardar sin cambios | `PATCH` con `[65, "54E"]`; la lectura devuelve lo mismo, sin pérdida |
| R2-A8 | Versión `publicado` + accesorio inexistente | `422` de versión no editable (no el de catálogo); el modal no recarga el catálogo |

### R2.4 Cambios al PLAN que exige esta revisión

1. **T12 / Contratos, "Esquema común de ganchos"**: reemplazar las alternativas `Joi.number()` /
   `Joi.string().pattern()` por `Joi.any().custom(normalizarGancho)` (R2-1) y agregar los casos de error
   `'5E1'`, `'1e2'`, `'54E2'`, `'+54'`, `'54.0'` y el caso válido `'054E'` → `'54E'`.
2. **T7**: normalizar el código de accesorio colapsando los espacios internos, igual que el back y el
   modal, con un solo helper (R2-2), y agregar su caso Vitest.
3. **Verificación final**: agregar la consulta SQL de solo lectura de R2-3 en DEV y PROD antes de
   publicar, y el grep de `JSON.parse` sobre ganchos.

### R2.5 Deuda detectada

| Propuesta | Severidad | Detalle |
|---|---|---|
| Ganchos repetidos entre posiciones de la misma versión | Baja | El back solo valida la unicidad dentro del arreglo de cada posición, así que dos posiciones pueden guardar el mismo `54` (o `54E`). Solo el front (`PosicionesSku.ChipsGanchos`) lo impide, y únicamente en los chips; el drawer y la API no. Preexistente. |
| Accesorio eliminado entre la verificación y el `insert` → 500 | Baja | Ver R2-6; si llega a ocurrir en la práctica, mapear el error de FK a `409`. |
