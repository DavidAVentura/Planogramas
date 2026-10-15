# 02 — Seguridad e integridad: ganchos de exhibición (`NNE`) en el extractor de PDF (DT-27)

Alcance: la salida del modelo (texto libre en `ganchos`), los topes y la validación de `importar-layout`.
Permisos/CAO quedan fuera de alcance.

## 1. Superficie afectada

- `POST /agente-extractor/pdf-planograma`: la salida del modelo pasa de `integer[]` a `string[]` libre.
  Es **entrada no confiable** que llega al front y de ahí a la BD.
- `POST /versiones/:id/importar-layout`: sin cambios de código. Es la **barrera del servidor**
  (`schemaGanchos` en `importacion.schemas.js` l. 24) y además, con `usar_por_ubicar`, **elimina**
  posiciones de "Por ubicar" al cruzar.
- Tablas: `Posicion.ganchos` (JSON) y `Posicion.datos_vision` (JSON libre con `ganchos_pdf` y `moduleId`).
- Front: `importacionPdf.ts` (`rangoGanchos`, `fuentePorUbicar`, `construirCuerpoImportar`), las advertencias
  en `ExtractorPdfPlanogramaModal.tsx` l. 143 y `RevisionCuerpoPdf.tsx` l. 181, y el toast de l. 93.

## 2. Controles requeridos

| # | Severidad | Control | Dónde | Verificación |
|---|---|---|---|---|
| C1 | **Bloqueante** | Ningún gancho sale del agente sin pasar por `normalizarGancho`. Se elimina el filtro `Number.isInteger` (l. 338) y no se agrega ninguna conversión propia (`Number(...)`, `parseInt` sobre crudos, `.map(Number)`, `sort((a,b)=>a-b)`). | `extractorPdfPlanograma.js`, `ganchosDelEspacio` | Prueba unitaria de `ganchosDelEspacio` con `["54E","054e","54E"," 7 ","54A","5E1","1e2","+54","54.0","","0","1000000"]`. Resultado esperado: `ganchos = ["54E", 7]`. Todo lo demás va a `descartados`. Además, grep de `Number.isInteger\|map(Number)\|a - b` en el agente sin coincidencias sobre ganchos. |
| C2 | **Bloqueante** | `importar-layout` sigue validando con `schemaGanchos`, sin relajarlo: nada de `Joi.number()`, `alternatives()` ni `pattern` (ver la cabecera de `ganchos.schema.js`). El back no confía en que el front mande la forma canónica. | `importacion.schemas.js` l. 24 (sin cambios) | Postman en "Importar productos": un espacio con `["54A"]` → 400, con `["5E1"]` → 400, con `[54, "54"]` → 400 (`unique` después de normalizar) y con 101 ganchos → 400. `["902E"]` → 201. |
| C3 | **Bloqueante** | El cruce con "Por ubicar" es exacto en la forma canónica. `[54]` no toma un producto con `"54E"` y `["54E"]` no toma uno con `[54]`. Esto importa porque un cruce erróneo **mueve y borra** la fila de "Por ubicar". | `importacion.entity.js` (`cruzarConPorUbicar`), `importacionPdf.ts` (`fuentePorUbicar`) | Back: `importacion.test.js` con los dos sentidos. Front: `importacionPdf.test.ts` con los mismos casos. Postman (§10 de `01`): `[901]`, `["902E"]` y `[902]` → `desdePorUbicar === 2`, y `[902]` queda sin SKU. |
| C4 | Importante | El colapso de espacios no puede **inventar** un número. `String(v).replace(/\s+/g,'')` convierte `"5 4"` en `54`, un gancho que no está impreso y que después cruzaría con "Por ubicar". Solo se unen los espacios **antes de la E**: `replace(/\s+(?=E$)/i, '')`. El resto lo resuelve `normalizarGancho` (que hace `trim`). | `ganchosDelEspacio` | Caso de prueba: `"5 4"` → descartado. `"54 E"` → `"54E"`. `" 54 "` → `54`. |
| C5 | Importante | Tope de **100 ganchos por espacio** en el agente, el mismo que `schemaGanchos.max(100)`. Hoy el agente no tiene tope: un espacio con más de 100 ganchos (lectura degenerada del modelo) hace que **todo** el `importar-layout` falle con 400. Lo que sobra se descarta con una advertencia del cuerpo. | `ganchosDelEspacio` / `normalizarEspacios` | Prueba con 150 ganchos válidos → 100 ganchos y una advertencia. |
| C6 | Importante | Normalizar **antes** de ordenar. El desempate de `normalizarEspacios` (l. 328) hoy opera sobre los crudos. Con `numeroGancho` sobre texto no canónico (`"abc"` → `NaN`), el `sort` queda indeterminado y cambia el orden horizontal de las posiciones. | `normalizarEspacios` | Prueba con dos espacios del mismo `orden_horizontal` y ganchos `["12"]`, `["3E","x"]` → el orden queda 3E, 12, siempre igual. |
| C7 | Importante | Facings: `max(1, normales)`, y como los ganchos tienen tope (C5), el resultado es ≤ 100. Un espacio solo con `E` queda en 1 (el back exige ≥ 1). | `normalizarEspacios` | Prueba: `["54E"]` → 1, `[1, 2, "3E"]` → 2, 100 normales → 100. |
| C8 | Menor | Advertencia de descartados: cada token se recorta a 10 caracteres, se listan como máximo 20 seguidos de `…` y se quitan los caracteres de control (`/[\p{C}]/gu`) para no romper el toast ni la lista. Se renderiza como texto JSX. Hoy no hay `dangerouslySetInnerHTML` en `front/src` y debe seguir así. | `ganchosDelEspacio`, modal | Prueba: un token de 5.000 caracteres con `\n` da un texto de ≤ 10 caracteres sin saltos de línea. 30 descartados dan 20 + `…`. |
| C9 | Menor | Entrada defensiva: si `e.ganchos` no es un arreglo, se trata como `[]` (no `TypeError` → 500 que pierde la extracción ya pagada al modelo). Si un ítem no es texto ni número, se descarta. | `ganchosDelEspacio` | Prueba con `ganchos: null` y con `[{}, 54, "54E"]`. |
| C10 | Menor | `rangoGanchos` nunca produce `NaN` y respeta el tope de `notas` (200) sin cortar un token a la mitad. Hoy el `.slice(0, 200)` de l. 142 puede dejar `"…, 5"` en lugar de `"54E"`, un gancho falso en la nota. Se recorta por elementos y se agrega `…`. | `importacionPdf.ts` | Prueba vitest: un nivel con 60 ganchos `E` → `notas.length ≤ 200`, termina en un token completo o `…`, y no contiene `NaN`. |
| C11 | Menor | El prompt no habilita inferencias: la E solo se toma si está impresa. | Prompt del agente | Prueba manual en DEV con un PDF real con `54E` (TG-26) y otro sin E: el segundo no debe devolver ningún `E`. |

## 3. Pruebas de abuso

1. El modelo devuelve `"54A"`, `"E54"`, `"5E1"`, `"1e2"`, `"-3"`, `"0"`, `"1000000"` o `"54EE"` → ninguno llega al front y todos aparecen en la advertencia de descartados (C1).
2. El modelo devuelve `"5 4"` → descartado, no `54` (C4).
3. Un cliente salta el front y manda a `importar-layout` `ganchos: ["54a "]` → se acepta y se guarda canónico como `"54E"` (Joi convierte). `["54A"]`, `[54.5]`, `["1e2"]` o `[true]` → 400 sin escritura parcial (C2).
4. `usar_por_ubicar` con el espacio `[54]` y un producto `["54E"]` en "Por ubicar" → el producto **sigue** en "Por ubicar" y el espacio queda como en el PDF (C3).
5. Dos espacios `["54E"]` y un solo producto con `"54E"` → el producto se coloca una sola vez y no hay posición duplicada (verificar con `usados` de `cruzarConPorUbicar`).
6. Un espacio con 150 ganchos que vienen del modelo → la extracción responde 200 con 100 ganchos y una advertencia, y `importar-layout` posterior → 201 (C5).
7. Un nivel con muchos `E` → `importar-layout` no falla por `notas` > 200 (C10).

## 4. Deuda detectada

- **`datos_vision` sin tope** (`importacion.schemas.js` l. 23: `Joi.object().unknown(true)`): `ganchos_pdf` y `moduleId` (`importacionPdf.ts` l. 111/115) no se validan ni tienen límite de tamaño. Hoy no hay ningún lector que haga aritmética con ellos. Severidad Baja. Se propone validar `ganchos_pdf` con `schemaGanchos` y limitar el tamaño del objeto cuando se toque ese esquema.
- **Ganchos repetidos entre espacios** de un mismo `importar-layout`: solo los advierte el agente. Un cliente directo puede mandarlos y el back los acepta. Severidad Baja: lo mitiga la regla de `usados` en el cruce.
- La DT-39 (imagen numerada) propuesta en `01` §10 es correcta desde seguridad: esos ganchos no se persisten.
