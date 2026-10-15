# 01 — Arquitectura (impacto) · Importar Excel: varios accesorios por producto (`//`)

## 1. Entendimiento

La importación del Excel de productos a "Por ubicar" rechaza el lote completo (400) porque
`numero()` concatena los dígitos de `22" // 22"` → 2222 > 999. El usuario aclara que `//` en
`Nombre_accesorio_TG` / `Tamano_accesorio_TG` significa **varios accesorios en el mismo producto**.
El cambio pasa de "un accesorio por fila" a "una lista de accesorios por fila", que se guarda como
varias filas de `PosicionAccesorio` (`orden` 1..n) en la misma posición.

Casos de uso: no hay un CU propio de la importación de Excel en `CASOS_DE_USO.md` (ver Deuda). Toca
de forma indirecta **CU-04-09** (agregar accesorio de montaje a posición — "uno o más") y
**CU-04-03 / CU-04-04-05** (mover y copiar posición, que deben conservar todos los accesorios).

## 2. Flujo de proceso

Sin cambios de estados ni de actores. Analista: sube Excel → el front lo interpreta → vista previa →
"Importar a Por ubicar" → `POST /versiones/:id/importar-productos` → posiciones en "Por ubicar" →
las mueve a su lugar (arrastre `PATCH /posiciones/:id/mover`, o `importarLayout` con
`usar_por_ubicar`).

Lo que cambia es la interpretación de la fila (front, `excelProductosPlanograma.ts`):

| Nombre (`//`) | Tamaño (`//`) | Resultado |
|---|---|---|
| `A` | vacío | 1 × A sin tamaño (hoy) |
| `A` | `22"` | 1 × A de 22 (hoy) |
| `A` | `22" // 22"` | 2 × A, cada uno de 22 (regla 1; en general n tamaños → n × A) |
| `A // B` | `22" // 12"` | A de 22, B de 12, emparejados por posición (regla 2) |
| `A // B` | `22"` | A de 22, B de 22 (regla 3) |
| `A // B` | vacío | A y B sin tamaño |
| `A // B` | `22" // 12" // 8"` | **no cuadra** (regla 6) → pregunta abierta P1 |
| vacío | `22"` | sin accesorio (el tamaño se ignora, como hoy) |

Reglas de lectura:
- Separador: `//` con espacios opcionales alrededor (`/\s*\/\/\s*/`). **No** se separa por `/`
  simple: puede ser parte de un código de accesorio. Segmentos vacíos (`A //`) se descartan.
- Cada segmento de tamaño se lee con un `numero()` corregido: toma el **primer número** del
  segmento (`22"`, `22''`, `22.5`, `22,5`); un segmento sin número da tamaño `null`.
- Tamaño fuera de rango (≤ 0 o > 999): el accesorio queda con tamaño `null` y la fila lleva una
  advertencia. Nunca debe volver a tumbar el lote entero.
- Código: `trim` + mayúsculas (igual que hoy). Repetidos permitidos (2 × A es válido).
- Tope de 10 accesorios por fila (más que eso es un error del archivo → advertencia y se truncan).

Persistencia (back): por cada accesorio de la lista que exista en el catálogo se inserta una fila
`PosicionAccesorio { posicion_id, accesorio_id, tamano_pulgadas, orden }`, con `orden` consecutivo
1..k en el orden del Excel (si uno no existe en el catálogo se omite, se advierte y los siguientes se
renumeran).

Confirmado en código que los accesorios **se conservan** al sacar la posición de "Por ubicar":
- `PATCH /posiciones/:id/mover` (`posicion.repository.js` `mover`, l. 230): solo cambia `nivel_id` y
  `orden_horizontal`; los `PosicionAccesorio` siguen colgando de la misma posición.
- `POST /posiciones/:id/copiar` (`copiar`, l. 267): clona todas las filas de `PosicionAccesorio`.
- `importarLayout` con `usar_por_ubicar`: `importacionRepo.posicionesPorUbicar` (l. 156) lee **todos**
  los accesorios ordenados por `orden`; `cruzarConPorUbicar` (`importacion.entity.js` l. 231) copia la
  lista completa a cada espacio; `insertarNiveles` (repo l. 87) inserta la lista entera respetando
  `orden`. Observación (comportamiento previo, no se cambia): si un producto se reparte en varios
  espacios del PDF, cada espacio recibe la lista completa de accesorios — ver P3.

## 3. Impacto por capa

| Capa | Archivo / módulo | Cambio |
|---|---|---|
| Front · utils | `front/src/utils/excelProductosPlanograma.ts` | `numero()` corregido (primer número, decimal `.`/`,`); nueva función pura exportada `accesoriosDeCeldas(nombre, tamano)` → `{ accesorios, advertencia }` con las reglas de §2; `LecturaExcelProductos` gana `advertencias: { fila, motivo }[]` (no excluyen la fila, a diferencia de `filasConError`); el producto lleva `accesorios` en vez de `accesorio_codigo`/`tamano_accesorio_pulgadas`. |
| Front · utils (prueba) | `front/src/utils/excelProductosPlanograma.test.ts` (nuevo) | Vitest de `accesoriosDeCeldas` (todas las filas de la tabla de §2) y de `interpretarHojaProductos` con la fila 197 real (`VDA-22R-PTH`, `22" // 22"`). |
| Front · tipos | `front/src/types/importacionProductos.ts` | `ProductoExcel.accesorios: { codigo: string; tamano_pulgadas: number \| null }[]`; se quitan `accesorio_codigo` y `tamano_accesorio_pulgadas`. |
| Front · componente | `ImportarExcelProductosModal.tsx` | Columna "Accesorio" muestra la lista; `faltantes` recorre todos los códigos (`flatMap`); `tipoSugerido` recibe el tamaño del accesorio concreto; se listan las `advertencias` de lectura; el toast de error muestra el detalle de `ApiError.details` si viene (hoy solo "Datos de entrada inválidos"). |
| Front · utils | `front/src/utils/errors.ts` | Opcional dentro del alcance: `mensajeDeError` añade el primer `details[].message` cuando `code === 'VALIDATION_ERROR'`. Afecta a todo el front → decidir en etapa 3 si se limita al modal. |
| Aplicación (back) | `back/src/application/importacion/importacion.controller.js` | `schemaProductoExcel`: nuevo `accesorios: Joi.array().items({ codigo: string trim 1..50, tamano_pulgadas: number positive max 999 allow null }).max(10).default([])`. Se mantienen `accesorio_codigo`/`tamano_accesorio_pulgadas` como **legado** (ver §4). |
| Dominio (back) | `back/src/domain/importacion/importacion.entity.js` | Nueva función pura `accesoriosDeFila(fila)` que normaliza legado → lista; `posicionDesdeFila(fila, producto, accesorios[])` devuelve `accesorios: [{ accesorio_id, tamano_pulgadas, orden }]` en vez de `accesorio`. |
| Dominio (back) | `back/src/domain/importacion/importacion.usecases.js` | `importarProductos`: el mapa de códigos se arma con `flatMap` de todas las listas; resuelve cada accesorio, omite y advierte los inexistentes, renumera `orden`. |
| Infraestructura (back) | `back/src/infrastructure/repositories/importacion.repository.js` | `insertarPosicionPorUbicar` (l. 236) recibe `accesorios[]` e inserta todas las filas en un solo `insert` (`orden` de la lista). `posicionesPorUbicar`, `insertarNiveles`, `aplicarCruce` sin cambios (ya manejan listas). |
| Back · prueba | `back/test/domain/importacion.test.js` (nuevo) | `node:test`: `accesoriosDeFila` (legado y lista), `posicionDesdeFila` con 0/1/2 accesorios, `importarProductos` con repos falsos (2 × A; A+B con B inexistente → 1 accesorio y advertencia). |
| BD | — | Sin migración. `PosicionAccesorio` no tiene unique `(posicion_id, accesorio_id)` (001) y ya tiene `orden` y `tamano_pulgadas DECIMAL(6,2)` (013). |
| Docs | `Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`, `Arquitectura/ESTADO_MODULOS.md` | Actualizar request, tabla de columnas (regla `//`), regla de negocio 5 y advertencias. Agregar apartado del módulo importación a ESTADO_MODULOS (hoy no existe). |
| Postman | `postman/planogramas-import.postman_collection.json`, carpeta "Importar productos" (l. ~24774) | Casos nuevos: 201 con `accesorios` de 2 elementos (mismo código) y verificación de 2 filas; 201 con formato legado; 400 con `tamano_pulgadas` 1000; 400 con 11 accesorios. |

## 4. Contratos

Existente: `Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`. Se modifica.

`POST /api/v1/versiones/{id}/importar-productos` — guard y permisos sin cambios.

Request — por producto, campo nuevo:

```json
{
  "productos": [{
    "sku": "1111754",
    "facings_horizontal": 2,
    "accesorios": [
      { "codigo": "VDA-22R-PTH", "tamano_pulgadas": 22 },
      { "codigo": "VDA-22R-PTH", "tamano_pulgadas": 22 }
    ]
  }]
}
```

| Campo | Regla |
|---|---|
| `accesorios` | arreglo, máx. 10, default `[]`; orden = `orden` en `PosicionAccesorio` |
| `accesorios[].codigo` | string, trim, 1..50, requerido |
| `accesorios[].tamano_pulgadas` | número > 0, ≤ 999, `null` permitido, default `null` |
| `accesorio_codigo`, `tamano_accesorio_pulgadas` | **legado**, se siguen aceptando con sus reglas actuales; si `accesorios` viene no vacío, se ignoran. Si no viene, se convierten a una lista de 1. |

Razón del legado: front (Static Web App) y back (App Service) se despliegan por separado desde el
mismo push; un front viejo contra un back nuevo con `stripUnknown` perdería los accesorios en
silencio. Se registra su retiro como deuda baja.

Response 201: misma forma. Cambia el texto de advertencia de accesorio inexistente a
`El accesorio "X" no existe en el catálogo; se omitió en los productos que lo traían.` (puede quedar
el producto con los demás accesorios).

Errores: sin códigos nuevos. `400 VALIDATION_ERROR` suma: `accesorios` con más de 10 elementos,
`codigo` vacío o > 50, `tamano_pulgadas` ≤ 0 o > 999. `401`, `403`, `404 NOT_FOUND`, `422
UNPROCESSABLE` iguales.

## 5. Datos

- Migración: **ninguna** (siguiente número disponible sería `017`, no se usa).
- Índices: sin cambios. La lectura de accesorios es `WHERE posicion_id IN (...)` sobre "Por ubicar";
  no hay índice explícito en `PosicionAccesorio.posicion_id` (la FK no lo crea en SQL Server). No es
  nuevo ni bloqueante a este volumen; se anota como deuda baja.
- Retrocompatible: sí. Las posiciones ya importadas tienen 0 o 1 accesorio con `orden = 1`, que es
  un caso válido del nuevo modelo. Los productos del Excel de la versión 103 que fallaron no llegaron
  a guardarse (el 400 corta antes de la transacción): basta reimportar.

## 6. Rendimiento y escalabilidad

- Volumen: ≤ 1000 productos × ≤ 10 accesorios por request; realista 45–200 productos con 1–2.
- Se mantiene una inserción de `Posicion` por fila (ya ocurre hoy para tener el id) y se pasa de
  1 a 1 `insert` multi-fila de `PosicionAccesorio` por posición: sin N+1 nuevo. 10 filas × 5 columnas
  muy por debajo del límite de 2100 parámetros.
- Resolución de códigos: una consulta `buscarPorCodigo` por código **distinto** (no por accesorio),
  igual que hoy.
- Todo dentro de la transacción existente de `importarPorUbicar`.

## 7. Alternativas descartadas y decisión

- Tomar solo el primer número (`PLAN_v0_descartado.md`): pierde el segundo accesorio, contradice al usuario.
- Mandar las celdas crudas y separar `//` en el back: rompe la división actual (el front interpreta el Excel, el back recibe filas estructuradas) y duplica el parseo del Excel.
- Guardar "2 × A" como un accesorio con cantidad: requiere migración y cambiar el detalle de posición; `PosicionAccesorio` ya modela n filas.
- Reemplazar los campos sin legado: arriesga perder accesorios en la ventana de despliegue.

**Decisión recomendada**: el front expande `//` a una lista `accesorios` con función pura probada;
el back acepta la lista (y el formato legado), resuelve cada código e inserta n filas de
`PosicionAccesorio` con `orden` 1..n. `numero()` se corrige para tomar el primer número de la celda
y ningún valor fuera de rango de una fila vuelve a rechazar el lote: se degrada a advertencia en la
vista previa.

## 8. Preguntas abiertas

1. **Regla 6 — cantidades que no cuadran** (n nombres y m tamaños, ambos > 1 y n ≠ m). Opciones:
   (a) **advertencia**: se importa el producto, se emparejan por posición, los nombres sin tamaño
   quedan sin tamaño y los tamaños sobrantes se descartan; (b) **error de fila**: el producto no se
   importa hasta corregir el Excel. Recomendación: **(a)**, porque el producto y sus cantidades
   valen más que el tamaño del accesorio, y el accesorio se corrige luego en el detalle de la posición.
2. **Otras celdas numéricas con dos números** (facings, cantidades, mín./máx., ej. `10 // 12`): ¿se
   toma el primero con advertencia (recomendado), o la fila va a error? El usuario solo aclaró el
   significado de `//` para accesorios.
3. **Producto repartido en varios espacios del PDF** (`usar_por_ubicar`): hoy cada espacio recibe la
   lista completa de accesorios del producto (2 espacios × 2 accesorios = 4 filas). ¿Es lo esperado o
   los accesorios son "por producto" y deberían repartirse? Fuera de alcance si el usuario no pide
   cambiarlo.

## 9. Para UX

1. Cómo mostrar varios accesorios en la columna "Accesorio" de la tabla (lista `A · 22"` / `B · 12"`,
   o agrupado `2 × A · 22"`), sin ensanchar la tabla `xl`.
2. Ubicación y tono de las **advertencias de lectura** (no excluyen la fila) frente a `filasConError`
   (sí la excluyen): deben distinguirse.
3. Bloque "Accesorios que no están en el catálogo": ahora puede haber varios por producto; el tipo
   sugerido usa el tamaño de ese accesorio.
4. Texto del toast de error cuando el back responde 400 con `details` (mostrar el campo y la fila).
5. Que el detalle de la posición (drawer) muestre bien 2 accesorios iguales con su `orden`.

## 10. Para Seguridad

1. Topes del nuevo arreglo (`max(10)` por producto, `max(1000)` productos) frente a carga y
   parámetros SQL por sentencia.
2. Que el formato legado y el nuevo no permitan duplicar o colar campos (`stripUnknown`, prioridad de
   `accesorios`).
3. Atomicidad: un accesorio inexistente no debe dejar posiciones a medias; todo sigue en la
   transacción de `importarPorUbicar`.
4. El parseo del Excel ocurre en el navegador: el back no debe confiar en él (los límites Joi son la
   barrera real); revisar que `codigo` se normalice igual (`normalizarCodigo`) antes de buscar.
5. Guard de la ruta sin cambios (`requiereAnalista` + permiso de edición); confirmar que la fila de
   `matrizPermisos.test.js` sigue vigente.

## 11. Deuda detectada

| Propuesta | Severidad | Detalle |
|---|---|---|
| Módulo importación sin apartado en `ESTADO_MODULOS.md` ni CU en `CASOS_DE_USO.md` | Baja | Las reglas no obvias (Por ubicar, cruce por ganchos, `//`) solo viven en el contrato y el código. Se resuelve en las docs de este cambio si el plan lo incluye. |
| Campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` | Baja | Retirarlos cuando el front nuevo esté en DEV y PROD. |
| `numero()` interpretaba `1,000` como 1 y concatenaba dígitos | Media (se corrige aquí) | Se cierra con este cambio; no registrar si el plan lo cubre. |
| Sin índice en `PosicionAccesorio.posicion_id` | Baja | Revisar si las lecturas del lienzo crecen. |
| Errores 400 del front solo muestran "Datos de entrada inválidos" | Media | `mensajeDeError` ignora `details` en todo el front; aquí se resuelve al menos para el modal. |

---

## 12. Actualización tras la aprobación 1 (2026-10-15)

### 12.1 Accesorio fuera del catálogo → bloqueante

Cambia la decisión de §2/§7: ya **no** se importa un producto sin su accesorio. El aviso "Accesorios
que no están en el catálogo" con "Dar de alta" se mantiene en la vista previa; si al pulsar Importar
sigue faltando alguno, el front no envía nada y muestra la vista de errores (fila, columna
`Nombre_accesorio_*`, motivo "El accesorio X no existe en el catálogo", cómo resolverlo). El back es la
barrera: resuelve los códigos de **todos** los productos del request (no solo de los que se van a
importar) antes de `skusDeVersion` y de cualquier escritura; si falta alguno → `422 UNPROCESSABLE`
con `details: { codigos: [...] }` y nada se escribe. Desaparecen la advertencia "se omitió en los
productos que lo traían" y la renumeración de `orden` tras omitir inexistentes.

Para ubicar fila/columna del accesorio inexistente, el lector del Excel devuelve además
`origenesAccesorio: { fila, columna, letra, codigo }[]` (una entrada por código normalizado y fila) y
una función pura `erroresDeCatalogo(origenes, codigosCatalogo)` arma los `ErrorLectura`.

### 12.2 Ganchos de exhibición (`54E`)

**Hoy.** `Posicion.ganchos` es `NVARCHAR(MAX)` con un arreglo JSON (migración 013). Todos los
productores escriben enteros y varios lectores fuerzan número:

| Punto | Archivo | Comportamiento actual con `54E` |
|---|---|---|
| Lector del Excel | `front/src/utils/excelProductosPlanograma.ts` `numerosGancho` | `/\d+/g` → `54`: se mezcla con el gancho normal 54 (el defecto reportado). |
| Joi | `importacion.controller.js` `schemaPosicion` (l. 29), `schemaProductoExcel` (l. 78); `posiciones.controller.js` crear (l. 35) y editar (l. 61) | `integer().positive()` → un `"54E"` sería 400. |
| Lectura BD | `skuVersion.repository.js` y `importacion.repository.js` (`.map(Number)`), `posicion.repository.js` (sin normalizar) | `Number("54E")` → `NaN`. |
| Numeración | `skuVersion.entity.js` `recorrerVersion` | `usados` es un `Set` comparado con enteros: un `"54E"` no bloquea el 54 calculado (correcto: son distintos). |
| Orden | `importacion.entity.js` `filtrarProductos.primerGancho` (`Math.min`); `front/src/domain/implementacion/columnasProductos.ts` (`Math.min`) | `NaN` con texto. |
| Cruce Por ubicar | `importacion.entity.js` `cruzarConPorUbicar`; `front/.../ExtractorPdfPlanogramaModal/importacionPdf.ts` `indicePorGancho`/`fuentePorUbicar` | Igualdad estricta en `Map`: funciona si la forma es canónica (54 ≠ "54E"). |
| Extractores IA | `extractorPdfPlanograma.js` (`items: integer`, filtro `Number.isInteger`), `extractorImagenNumerada.js` | Solo producen enteros. |
| Presentación | `PosicionLienzo.textoGanchos`, `GondolaEscalaLienzo`, `DetalleGondolaPanel`, `PosicionesSku` (cuatro `dos()` locales), `ProductosImplementacionTable`, `ImportarExcelProductosModal` | `"54E".padStart` funciona, pero la continuidad (`n === prev + 1`) y los tipos TS (`number[]`) no. |
| Edición | `PosicionDrawer` (`.map(Number)` → inválido), `PosicionesSku.ChipsGanchos` (`Number(texto)`, orden `a - b`, `inputMode="numeric"`) | Una posición con `54E` no se podría guardar ni editar sus chips. |

**Representación decidida — gancho canónico.** Arreglo JSON mixto: gancho normal = **número**
(`54`), gancho de exhibición = **texto** `"<n>E"` (`"54E"`, mayúscula, sin ceros a la izquierda ni
espacios). Ej. `[65, "54E"]`. Tipo `Gancho = number | string`.

- **Sin migración de esquema ni de datos**: la columna ya es `NVARCHAR(MAX)` JSON y todos los datos
  existentes son números (forma canónica normal). Retrocompatible.
- La igualdad estricta (`Set`, `Map`, `includes`, Joi `unique`) distingue 54 de "54E" sin cambios en
  el cruce ni en la numeración: basta con que **toda entrada se normalice** (Joi en el back, helper en
  el front) y toda lectura de BD pase por un único `parsearGanchosJson`.
- Numeración (`recorrerVersion`): `usados` solo con los ganchos numéricos; la numeración calculada
  puede asignar 54 aunque exista `54E` (decisión del usuario: son distintos). `totalGanchos` cuenta
  `54E` como un gancho.
- Orden: por número y, a igual número, el normal antes que el de exhibición (`compararGanchos`).
- Cruce con Por ubicar: un espacio del PDF con gancho 54 **no** toma un producto cuyo gancho es
  `54E`. Como el extractor de PDF solo devuelve enteros, los `54E` quedan en "Por ubicar" con la
  advertencia existente "los ganchos 54E no están en el PDF; siguen en Por ubicar" y el analista los
  arrastra a mano. Extender el extractor depende de la pregunta abierta P-E1.
- Joi común: `schemaGanchos` = `Joi.array().items(Joi.alternatives().try(Joi.number().integer().positive(), Joi.string().trim().uppercase().pattern(/^[1-9]\d{0,5}E$/))).max(100).unique()`.
  `"54"` se convierte a `54` (forma canónica); `"54e"` → `"54E"`.

**Alternativas descartadas.**
- Todos como texto (`["54","54E"]`): exige migración de datos y tocar toda la aritmética.
- Columna aparte `ganchos_exhibicion`: duplica lectura, cruce y numeración, y pierde el orden de la celda.
- Objetos `{ numero, exhibicion }`: más explícito pero rompe el contrato de lectura de 5 endpoints y exige migración.

**Impacto por capa (adicional).**

| Capa | Archivo | Cambio |
|---|---|---|
| Dominio back | `back/src/domain/compartido/gancho.js` (nuevo) | `normalizarGancho`, `numeroGancho`, `esGanchoExhibicion`, `compararGanchos`, `parsearGanchosJson` |
| Dominio back | `skuVersion.entity.js`, `importacion.entity.js` | `usados` numérico; `primerGancho` con `numeroGancho` |
| Aplicación | `back/src/application/compartido/ganchos.schema.js` (nuevo); `importacion.schemas.js`; `posiciones.controller.js` | `schemaGanchos` en los 4 esquemas |
| Infraestructura | `skuVersion.repository.js`, `posicion.repository.js`, `importacion.repository.js` | `parsearGanchosJson` en vez de `JSON.parse(...).map(Number)` |
| Front tipos | `front/src/types/gancho.ts` (nuevo); `posicion.ts`, `skuVersion.ts`, `implementacion.ts`, `importacionProductos.ts`, `extractorPdfPlanograma.ts` (`ProductoPorUbicar`) | `Gancho[]` |
| Front dominio | `front/src/domain/ganchos/gancho.ts` (nuevo) | `leerGancho`, `numeroGancho`, `esGanchoExhibicion`, `compararGanchos`, `textoGancho`, `textoGanchos` |
| Front | lector Excel, `PosicionLienzo`, `GondolaEscalaLienzo`, `DetalleGondolaPanel`, `PosicionesSku`, `PosicionDrawer`, `columnasProductos`, `importacionPdf.ts`, modal de importación | usar el helper; editar `54E` |
| BD | — | sin migración; actualizar comentario de `Posicion.ganchos` en `MODELO_DATOS_V3.mmd` |

**Contratos afectados (solo la forma del arreglo `ganchos`, `(number|string)[]`)**:
`POST /versiones/:id/importar-productos`, `POST /versiones/:id/importar-layout`, `POST` y `PATCH` de
posiciones, `GET /versiones/:id/skus` (`ganchos`, `ganchosPorPosicion`), `GET` de productos de
implementación y lecturas de posición.

**Rendimiento.** Sin cambio: mismas lecturas, normalización O(n) en memoria.

**Riesgo de reversión.** Si se revierte el código con datos `"54E"` ya guardados, el código viejo
produciría `NaN`. Mitigación: back y front se publican juntos; si hubiera que revertir, convertir
`"54E"` → `54` con un script puntual (no se prepara ahora).

### 12.3 Preguntas abiertas nuevas

- **P-E1.** ¿El PDF del planograma imprime los ganchos de exhibición (`54E`)? Si sí, el extractor de PDF
  debe aprender a devolverlos (cambio del esquema del modelo, otro plan); si no, los `54E` siempre se
  ubican a mano desde "Por ubicar".
- **P-E2.** ¿Un gancho de exhibición cuenta como facing cuando la columna Facings viene vacía? Se
  mantiene el comportamiento actual (sí cuenta) salvo que el usuario diga lo contrario.

### 12.4 Deuda

| Propuesta | Severidad | Detalle |
|---|---|---|
| Extractor de PDF sin ganchos de exhibición | Baja | Depende de P-E1. |
| Gancho como `number \| string` en vez de tipo explícito | Baja | Si aparecen otras variantes (otras letras), migrar a objeto `{ numero, tipo }` con migración de datos. |
