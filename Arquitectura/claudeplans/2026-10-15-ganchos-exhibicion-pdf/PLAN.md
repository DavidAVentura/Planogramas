# PLAN — Ganchos de exhibición (`NNE`) en el extractor de PDF (DT-27)

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.

## Objetivo

El agente que lee el PDF del planograma hoy descarta todo gancho que no sea entero, así que un `54E` impreso
llega como `54` o se pierde, y al importar con "Llenar con Por ubicar" no cruza con el producto del Excel que
tiene `"54E"`. Con este cambio el agente lee `54E`, lo normaliza a la forma canónica y el front lo envía tal cual
a `importar-layout`, que ya sabe cruzarlo. Se cierra DT-27 en lo que respecta al PDF.

## Decisiones

| Decisión | Razón |
|---|---|
| El schema del modelo pide los ganchos como **texto** (`items: { type: 'string' }`). La salida siempre se normaliza en el back con `normalizarGancho`. | `anyOf [integer, string]` es frágil en modo strict. Un `pattern` ocultaría las lecturas inválidas (`54A`), y queremos que se reporten como advertencia. |
| La única regla de gancho es `normalizarGancho` (`back/src/domain/compartido/gancho.js`). Queda prohibido `Number(...)`, `parseInt` sobre crudos, `.map(Number)` y `sort((a, b) => a - b)` sobre ganchos en el agente (C1). | Hay una sola regla canónica, la misma que usan `schemaGanchos` y la lectura de BD. |
| Solo se une el espacio **antes de una E final** (`/\s+(?=E$)/i`). No se quitan todos los espacios (C4). | `"5 4"` → `54` inventaría un gancho que no está impreso y que podría cruzar con "Por ubicar" y borrar la fila de ahí. |
| Hay un tope de **100 ganchos por espacio** en el agente. Lo que sobra se descarta con una advertencia del nivel (C5). | Es el mismo tope que `schemaGanchos.max(100)`. Sin tope, una lectura degenerada hace fallar todo el `importar-layout` con 400. |
| Se normaliza **antes** de ordenar los espacios (C6). | El desempate de hoy opera sobre los crudos: un `NaN` deja el orden indeterminado. |
| `facings = max(1, cantidad de ganchos normales)`. Un espacio con solo `["54E"]` queda con 1. | Es la regla del plan anterior: los `E` no cuentan como facing, y el back exige `facings ≥ 1`. Coincide con `cruzarConPorUbicar`. |
| Dentro de un espacio, los ganchos salen ordenados con `compararGanchos` y sin repetidos (`[7, "54E"]`). | La salida es determinista. `54` y `"54E"` son distintos y sobreviven los dos. |
| Las letras distintas de E (`54A`) y los tokens ilegibles se **descartan con advertencia**; la extracción no se bloquea. Las cadenas vacías se ignoran sin citarlas. Los ítems que no son texto ni número se citan como `?`. | El usuario revisa antes de importar, igual que con los números ilegibles. |
| `ganchosDelEspacio` queda **local** en el agente y no va a `domain/compartido`. | Tiene un solo consumidor, y moverla sumaría duplicación back/front (DT-29). |
| En el front, `rangoGanchos` arma el rango `min-max` solo con los normales y agrega los `E` aparte. **No** se usa `textoGanchos` (padding `05`). | Agregar ceros a la izquierda sería un cambio visible que no se pidió. `join(', ')` ya muestra `54E`. |
| `notas` del nivel se recorta **por elementos** con `…`, nunca a mitad de un token (C10). | El `.slice(0, 200)` actual puede dejar `"…, 5"`, que se lee como un gancho falso. |
| Back y front se despliegan juntos (mismo PR). | Un back nuevo con un front viejo da `NaN` en `rangoGanchos`. |
| El caso Postman de cruce con `E` se agrega al request **existente** `201 - Llena los espacios con los productos del Excel por gancho`, sumando los espacios `[901]`, `["902E"]` y `[902]`. | El producto `[901, "902E"]` ya está en "Por ubicar" de esa versión cuando corre ese request. Si no se consume ahí, el `404 - Por ubicar quedó vacía` siguiente no se cumple. Hacerlo en el mismo request mantiene la colección repetible. |
| Sin etapa UX. | No cambia nada visible salvo que `54E` aparece como texto. |

## Fuera de alcance

- Extractor de **imagen numerada** (`extractorImagenNumerada.js`, `ExtractorImagenNumeradaModal.tsx`,
  `types/extractorImagenNumerada.ts`). No comparte código con el de PDF y sus ganchos no se persisten. Queda como
  deuda nueva **DT-39**.
- Cambios de código en `importar-layout`, `importacion.schemas.js`, `ganchos.schema.js` e `importacion.entity.js`
  (`cruzarConPorUbicar`, `planificarPosiciones`). Ya soportan `"54E"`; solo se agregan pruebas.
- Distinguir visualmente un `E` en la tabla de revisión o en la vista previa.
- Validar o acotar `datos_vision` (deuda nueva **DT-40**).
- Permisos/CAO.
- Migraciones.

## Contratos

No hay endpoints nuevos ni cambios de forma. Solo cambia el contenido posible de `ganchos`.

**`POST /agente-extractor/pdf-planograma`** (contrato: `Arquitectura/Contratos/20_importacion/POST_agente_extractor_pdf_planograma.md`)
- `cuerpos[].niveles[].espacios[].ganchos`: pasa de `number[]` a `Gancho[]` canónico (número `1..999999` o texto
  `"<n>E"`), sin repetidos, ordenado con `compararGanchos`, con 100 como máximo. Ejemplo: `[65, "54E"]`.
- `facings`: cantidad de ganchos **normales**, con un mínimo de 1.
- `cuerpos[].advertencias` suma dos textos nuevos:
  - `Ganchos ilegibles descartados: 54A, 5E1. Revisá esos espacios.` Se citan como máximo 20, seguidos de `…`
    si hay más. Cada token va sin caracteres de control y con 10 caracteres como máximo.
  - `<Nivel N (sección k)>: un espacio traía 150 ganchos; se conservaron los primeros 100. Revisalo.`
- `advertencias` general: la lista de "Números de gancho repetidos en el PDF" se ordena con `compararGanchos` y
  distingue `54` de `"54E"`.
- Errores sin cambios (400 del body; 502/500 del modelo).

**`POST /versiones/:id/importar-layout`** (`POST_versiones_importar_layout.md`): sin cambios de forma ni de
validación. Sigue validando con `schemaGanchos`: `["54A"]`, `["5E1"]`, `[54, "54"]` y 101 ganchos → **400**
`VALIDATION_ERROR`; `["54e "]` se acepta y se guarda como `"54E"`.

**Tipos del front** (`front/src/types/extractorPdfPlanograma.ts`):
- `EspacioPdf.ganchos` (l. 25): `number[]` → `Gancho[]`.
- `PosicionImportar.ganchos` (l. 102): `number[]` → `Gancho[]`.
- Comentario de `ProductoPorUbicar.ganchos` (l. 147): `/** Puede traer ganchos de exhibición ("54E"), igual que
  los espacios del PDF. */`
- `Gancho` se importa de `./gancho` (ya está importado en l. 4).

## Datos

Sin cambios de BD. `Posicion.ganchos` (JSON, migración 013) ya guarda el arreglo mixto. Es retrocompatible: los
datos existentes son enteros o mixtos del Excel y se leen con `parsearGanchosJson`.

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| C1 | Ningún gancho sale del agente sin pasar por `normalizarGancho`. Se elimina el filtro `Number.isInteger` y no se agrega ninguna conversión propia. | `extractorPdfPlanograma.js` → `ganchosDelEspacio` | Prueba T2-a. Además, `grep -nE "Number\.isInteger\|map\(Number\)\|a - b" back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js` no tiene coincidencias sobre ganchos. |
| C2 | `importar-layout` sigue validando con `schemaGanchos`, sin `Joi.number()`, `alternatives()` ni `pattern`. | `importacion.schemas.js` (no se toca) | T3 (unitarias del schema) + T7 (Postman, 4 casos 400). |
| C3 | El cruce es exacto en la forma canónica en los dos sentidos: `[54]` no toma `"54E"` y `["54E"]` no toma `[54]`. | `cruzarConPorUbicar` (back), `fuentePorUbicar` (front) | T3, T6 y T7 (`[902]` no se llena). |
| C4 | Solo se une el espacio antes de la E final: `"5 4"` → descartado, `"54 E"` → `"54E"`, `" 54 "` → `54`. | `ganchosDelEspacio` | T2-b. |
| C5 | Tope de 100 ganchos por espacio, con advertencia del nivel. | `ganchosDelEspacio` + `normalizarEspacios` | T2-c: 150 válidos → 100 + advertencia; T2-h con `procesarPdf`. |
| C6 | Se normaliza antes de ordenar, y el desempate usa `numeroGancho` sobre ganchos canónicos. | `normalizarEspacios` | T2-d: `["12"]` y `["3E","x"]` con igual `orden_horizontal` → 3E, 12. |
| C7 | `facings = max(1, normales)` ≤ 100. | `normalizarEspacios` | T2-e: `["54E"]` → 1; `["1","2","3E"]` → 2; 100 normales → 100. |
| C8 | Los tokens descartados se citan sin `\p{C}`, con 10 caracteres como máximo, hasta 20 y luego `…`. Se renderizan como texto JSX y en `front/src` sigue sin haber `dangerouslySetInnerHTML`. | `citarGancho`, `advertirGanchosDescartados` | T2-f. `grep -rn dangerouslySetInnerHTML front/src` sin resultados. |
| C9 | Si `ganchos` no es un arreglo, se trata como `[]`. Los ítems que no son texto ni número se descartan. | `ganchosDelEspacio` | T2-g: `null` → `[]`; `[{}, 54, "54E"]` → `[54, "54E"]` con `?` descartado. |
| C10 | `rangoGanchos` nunca devuelve `NaN`, y `notas` ≤ 200 sin cortar un token. | `importacionPdf.ts` | T6: 60 ganchos `E` → `notas.length ≤ 200`, termina en `…`, sin `NaN`. |
| C11 | El prompt no permite inferir la E: solo se toma si está impresa. | Prompt (T1) | Prueba manual en DEV (Verificación final). |

## UX (resumen para implementar)

Sin cambios de UI. Los componentes `RevisionCuerpoPdf.tsx` y `VistaPreviaLayoutPdf.tsx` no se tocan: siguen
mostrando `espacio.ganchos.join(', ')`, que ya muestra `54E`. La cabecera del nivel en `RevisionCuerpoPdf.tsx`
l. 164 sigue llamando a `rangoGanchos(n)` sin tope y muestra, por ejemplo, `ganchos 1-9, 54E`.

## Tareas

### T1 — Agente de PDF: leer y normalizar ganchos `NNE`
- **Archivos**: modificar `back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js`
- **Qué hacer**:
  1. Importar `const { normalizarGancho, numeroGancho, esGanchoExhibicion, compararGanchos } = require('../../domain/compartido/gancho');`
     y agregar la constante `const MAX_GANCHOS_ESPACIO = 100;`.
  2. Cambiar `SCHEMA_ESPACIO.ganchos` (l. 44) a `{ type: 'array', items: { type: 'string' } }`.
  3. En el prompt, sección ESPACIO, reemplazar la viñeta `ganchos:` (l. 164-166) por:
     ```
       - ganchos: los números impresos que identifican ese espacio, como texto (normalmente uno; varios solo
         si el mismo producto ocupa varios números contiguos). Copia cada número tal como está impreso.
         Si el número lleva la letra E pegada (ej. "54E"), es un gancho de exhibición: conserva la E.
         "54" y "54E" son ganchos distintos y pueden estar en el mismo nivel; no son un número repetido.
         No agregues la E si no está impresa. Si ves otra letra, cópiala tal cual y repórtalo en
         advertencias. Respeta exactamente los números del PDF, aunque parezcan tener un error (ej. un
         número repetido); repórtalo en advertencias.
     ```
  4. Agregar dos funciones puras antes de `normalizarEspacios`:
     ```js
     /** Texto seguro para citar un gancho descartado en una advertencia (sin caracteres de control, ≤ 10). */
     function citarGancho(valor) // → string
     //   (typeof valor === 'string' || typeof valor === 'number')
     //     ? String(valor).replace(/[\p{C}]/gu, '').trim().slice(0, 10) || '?'
     //     : '?'

     /**
      * Normaliza los ganchos crudos de un espacio leídos por el modelo.
      * @param {unknown} crudos
      * @returns {{ ganchos: Array<number|string>, descartados: string[], excedentes: number }}
      */
     function ganchosDelEspacio(crudos)
     ```
     Pasos de `ganchosDelEspacio`:
     - a. Usar `lista = Array.isArray(crudos) ? crudos : []`.
     - b. Por cada `v`:
       - si no es `string` ni `number`, `descartados.push('?')`;
       - si es `string`, calcular `texto = v.trim().replace(/\s+(?=E$)/i, '')`. Si `texto === ''`, se ignora.
         Si no, `g = normalizarGancho(texto)`;
       - si es `number`, `g = normalizarGancho(v)`;
       - si `g === null`, `descartados.push(citarGancho(v))`. Si no, se agrega a la lista.
     - c. Quitar los repetidos con `[...new Set(lista)]` y ordenar con `.sort(compararGanchos)`.
     - d. Si quedan más de `MAX_GANCHOS_ESPACIO`, guardar `excedentes = largo - 100` y quedarse con los primeros 100.
       Si no, `excedentes = 0`.
  5. Reescribir `normalizarEspacios(espacios, anchoDisponible, etiquetaNivel, advertir, descartados)`. El nuevo
     parámetro `descartados: string[]` es un colector del cuerpo.
     - Primero normalizar: `const leidos = espacios.map((e) => ({ e, ...ganchosDelEspacio(e.ganchos) }));`.
       Por cada uno, `descartados.push(...l.descartados)`. Si `l.excedentes > 0`, llamar a
       `advertir(\`${etiquetaNivel}: un espacio traía ${l.ganchos.length + l.excedentes} ganchos; se conservaron los primeros ${MAX_GANCHOS_ESPACIO}. Revisalo.\`)`.
     - Después ordenar `leidos` por `e.orden_horizontal` y desempatar con
       `menor(l) = Math.min(...l.ganchos.map(numeroGancho), Infinity)`. El comparador devuelve `0` cuando los dos
       son iguales, incluido `Infinity` contra `Infinity` (nunca `NaN`).
     - El cálculo de anchos usa `l.e.ancho_cm` igual que hoy.
     - Cada espacio devuelve `ganchos: l.ganchos` y
       `facings: Math.max(1, l.ganchos.filter((g) => !esGanchoExhibicion(g)).length)`. El resto de los campos queda igual (desde `l.e`).
     - Se elimina el filtro `Number.isInteger` (l. 338).
  6. `normalizarNiveles(niveles, hojas, accesorios, advertir, descartados)`: recibe el colector y lo pasa a
     `normalizarEspacios`.
  7. Agregar `advertirGanchosDescartados(descartados, advertir)`. Si hay descartados, llamar a
     `advertir(\`Ganchos ilegibles descartados: ${descartados.slice(0, 20).join(', ')}${descartados.length > 20 ? '…' : ''}. Revisá esos espacios.\`)`.
     En `normalizarCuerpo`:
     - crear `const descartados = []` y pasarlo a `normalizarNiveles`;
     - llamar a `advertirGanchosDescartados(descartados, advertir)` antes de `advertirEspaciosSinGancho`.
  8. `advertirGanchosRepetidos`: cambiar `.sort((a, b) => a - b)` por `.sort(compararGanchos)` y el comentario
     `// gancho → nombre del primer cuerpo que lo usa`.
  9. Actualizar el comentario de cabecera (l. 20-24):
     - los ganchos impresos pueden ser normales (`54`) o de exhibición (`"54E"`);
     - se normalizan con `normalizarGancho`;
     - `facings` = cantidad de ganchos normales del espacio (mínimo 1).
  10. `module.exports = { procesarPdf, SCHEMA_RESPUESTA, ganchosDelEspacio, normalizarEspacios };`
- **Criterios de aceptación**:
  - [ ] `grep -nE "Number\.isInteger\|map\(Number\)\|\(a, b\) => a - b" back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js` no devuelve ninguna línea que opere sobre ganchos.
  - [ ] `SCHEMA_RESPUESTA` sigue siendo válido para modo strict (todas las propiedades en `required`, `additionalProperties: false`).
  - [ ] Ningún valor de `ganchos` en la salida de `procesarPdf` queda fuera de la forma canónica.
- **Pruebas**: en T2.
- **Depende de**: —

### T2 — Pruebas del agente de PDF
- **Archivos**: crear `back/test/agents/extractorPdfPlanograma.test.js` (`node:test` + `node:assert/strict`, mismo estilo que `back/test/domain/gancho.test.js`)
- **Qué hacer**: escribir los casos de abajo. Para `procesarPdf`, usar estos stubs:
  - `openaiClient = { completarConArchivo: async () => fixture }`;
  - `catiClient = { obtenerProducto: async () => { throw new Error('no debe llamarse'); }, buscarProductos: async () => { throw new Error('no debe llamarse'); } }`;
  - `accesorios: []`, `modelo: 'test'`.

  El fixture tiene un cuerpo sin secciones (`secciones: []`), con medidas válidas y un nivel `GANCHO`. Todos los
  espacios llevan `sku_impreso: null` y `descripcion_visual: null`. La forma del fixture se toma de
  `SCHEMA_RESPUESTA`.
- **Casos**:
  - a. (C1) `ganchosDelEspacio(["54E","054e","54E"," 7 ","54A","5E1","1e2","+54","54.0","","0","1000000"])` → `ganchos` `[7, "54E"]`, `descartados` `["54A","5E1","1e2","+54","54.0","0","1000000"]`, `excedentes` 0.
  - b. (C4) `["5 4"]` → `ganchos []`, `descartados ["5 4"]`; `["54 E"]` → `["54E"]`; `["54 e"]` → `["54E"]`; `[" 54 "]` → `[54]`.
  - c. (C5) 150 ganchos válidos (`"1"`..`"150"`) → 100 ganchos (`1..100`) y `excedentes` 50.
  - d. (C6) `normalizarEspacios` con dos espacios de `orden_horizontal` 1 y ganchos `["12"]` y `["3E","x"]` → el primero queda con `["3E"]` y el segundo con `[12]`. Se corre dos veces con la entrada en orden inverso y el resultado es el mismo.
  - e. (C7) facings: `["54E"]` → 1; `["1","2","3E"]` → 2; 100 normales → 100.
  - f. (C8) un token de 5.000 caracteres con `\n` en medio → `descartados[0].length ≤ 10` y sin `\n`. Con `normalizarEspacios` y 30 espacios de un gancho inválido cada uno, más `advertirGanchosDescartados` vía `procesarPdf` → la advertencia cita 20 tokens y termina en `…. Revisá esos espacios.`
  - g. (C9) `ganchosDelEspacio(null)` → `{ ganchos: [], descartados: [], excedentes: 0 }`; `[{}, 54, "54E"]` → `ganchos [54, "54E"]`, `descartados ["?"]`.
  - h. `procesarPdf` de punta a punta, con espacios `["54"]`, `["54E"]`, `["54A"]` y uno de 150 ganchos:
    - `espacios[0].ganchos` `[54]` y `espacios[1].ganchos` `["54E"]` con facings 1;
    - `cuerpos[0].advertencias` incluye `Ganchos ilegibles descartados: 54A` y `se conservaron los primeros 100`;
    - las advertencias generales **no** incluyen "repetidos" por `54`/`"54E"`;
    - los stubs de CATI no se llamaron.
- **Criterios de aceptación**:
  - [ ] `cd back && npm test` pasa, incluido el archivo nuevo (`node --test` descubre `test/**`).
- **Depende de**: T1

### T3 — Pruebas de dominio y schema del cruce con `E`
- **Archivos**: modificar `back/test/domain/importacion.test.js` (bloque `describe('cruzarConPorUbicar con ganchos de exhibición')`, l. 140) · modificar `back/test/application/importacionSchemas.test.js` (bloque `describe('schemaImportar (layout)')`, l. 60)
- **Qué hacer**:
  - En `importacion.test.js`, agregar estos casos:
    - (C3) `planDe(["54E"])` con `porUbicar()` (`[65, "54E"]`) → `llenados === 1`; la posición queda con el SKU `'111'` y `facings_horizontal >= 1`.
    - (C3) un producto con `ganchos: [54]` frente a `planDe(["54E"])` → `llenados === 0`.
    - (abuso 5) dos espacios `["54E"]` en el mismo plan y un solo producto con `"54E"` → el producto se coloca una sola vez (`llenados === 1`; solo una posición queda con SKU).
  - En `importacionSchemas.test.js`, agregar con un helper `layoutCon(ganchos)` (mismo cuerpo que el caso existente):
    - (C2) `["54A"]`, `["5E1"]`, `[54, "54"]` y 101 ganchos → `error` definido;
    - `["54e "]` → `value...ganchos` igual a `["54E"]`;
    - `[54, "54E"]` → válido.
- **Criterios de aceptación**:
  - [ ] `cd back && npm test` pasa sin tocar `importacion.entity.js`, `importacion.schemas.js` ni `ganchos.schema.js` (si alguno falla, es un bug a reportar, no una prueba a ajustar).
- **Depende de**: —

### T4 — Tipos del front
- **Archivos**: modificar `front/src/types/extractorPdfPlanograma.ts`
- **Qué hacer**: `EspacioPdf.ganchos: Gancho[]` (l. 25), `PosicionImportar.ganchos: Gancho[]` (l. 102) y el comentario de `ProductoPorUbicar.ganchos` (l. 147), como se indica en Contratos.
- **Criterios de aceptación**:
  - [ ] `cd front && npx tsc -b` compila. Si un consumidor hace aritmética con `ganchos`, el error aparece aquí y se corrige en T5. `RevisionCuerpoPdf.tsx` y `VistaPreviaLayoutPdf.tsx` compilan sin cambios.
- **Depende de**: —

### T5 — `rangoGanchos` seguro con mixtos y `notas` sin cortar tokens
- **Archivos**: modificar `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/importacionPdf.ts`
- **Qué hacer**:
  1. Importar `compararGanchos`, `esGanchoExhibicion` y `numeroGancho` de `'../../../../domain/ganchos/gancho'`.
  2. Reescribir `export function rangoGanchos(nivel: NivelPdf, maxLargo = Infinity): string`:
     - Tomar los ganchos del nivel sin repetidos (`[...new Set(nivel.espacios.flatMap((e) => e.ganchos))]`) y
       ordenarlos con `compararGanchos`.
     - Calcular `normales` = los no exhibición y `exhibicion` = los `E`.
     - Armar los tokens:
       - si hay normales, uno de rango: `String(min)` si `min === max`, si no `${min}-${max}`, con `min`/`max` de
         `numeroGancho` sobre los normales (ya ordenados: primero y último);
       - después, uno por cada `E` (`"54E"`).
     - Sin tokens → `'—'`.
     - Unir con `', '` y agregar token por token mientras el texto acumulado más `', …'` quepa en `maxLargo`.
       Si no caben todos, terminar en `'…'` (por ejemplo, `"1-9, 54E, …"`). Nunca se corta un token.
  3. En `construirCuerpoImportar`, reemplazar el cálculo de `notas` (l. 142) por un helper
     `notasNivel(nivel: NivelPdf): string | null`:
     - Si no hay `codigo_accesorio`, devuelve `null`.
     - Si no, arma `prefijo = \`${nivel.codigo_accesorio} · ganchos \``:
       - si `prefijo.length >= 199`, devuelve `nivel.codigo_accesorio.slice(0, 200)`;
       - si no, devuelve `prefijo + rangoGanchos(nivel, 200 - prefijo.length)`.
  4. `fuentePorUbicar`, `indicePorGancho` y `datosVision` no cambian.
- **Criterios de aceptación**:
  - [ ] `rangoGanchos` nunca devuelve una cadena que contenga `NaN`.
  - [ ] `notas` siempre tiene 200 caracteres como máximo y nunca termina en un token parcial.
  - [ ] La cabecera del nivel en `RevisionCuerpoPdf.tsx` (l. 164, `rangoGanchos(n)` sin tope) sigue mostrando la lista completa.
- **Pruebas**: en T6.
- **Depende de**: T4

### T6 — Pruebas del front del importador de PDF
- **Archivos**: crear `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/importacionPdf.test.ts` (vitest; mismo estilo que `front/src/domain/ganchos/gancho.test.ts`)
- **Qué hacer**: armar fixtures mínimos de `CuerpoPdf`/`NivelPdf`/`EspacioPdf` (helpers `espacio(ganchos)` y `nivel(espacios, codigo?)`).
- **Casos**:
  - `rangoGanchos`:
    - `[1..9]` → `"1-9"`;
    - `[1..9]` + `["54E"]` → `"1-9, 54E"`;
    - `[54, "54E"]` → `"54, 54E"`;
    - solo `["54E","55E"]` → `"54E, 55E"`;
    - sin ganchos → `"—"`;
    - `[7]` → `"7"`.
  - (C10) un nivel con `codigo_accesorio` y 60 espacios `["<n>E"]` (n = 100..159) → `construirCuerpoImportar(...).niveles[0].notas`:
    - tiene `length ≤ 200`;
    - termina en `"…"`;
    - no contiene `"NaN"`;
    - cada token antes del `…` coincide con `/^\d+E$/`.
  - (C3) `fuentePorUbicar(espacio(["54E"]), indicePorGancho([producto([65, "54E"])]))` devuelve el producto.
  - (C3) `fuentePorUbicar(espacio([54]), indicePorGancho([producto(["54E"])]))` → `null`.
  - (C3) `fuentePorUbicar(espacio(["54E"]), indicePorGancho([producto([54])]))` → `null`.
  - `construirCuerpoImportar` conserva `ganchos: [54, "54E"]` en la posición.
- **Criterios de aceptación**:
  - [ ] `cd front && npm test` pasa.
  - [ ] `npx tsc -b` y `npm run lint` sin errores nuevos.
- **Depende de**: T5

### T7 — Postman: `importar-layout` con ganchos `E` y casos 400 de ganchos
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único archivo editable de `postman/`; estándar en `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`)
- **Qué hacer**:
  0. **Antes de editar**, correr la carpeta `20 - Importación (layout y productos)` y anotar si
     `404 - Por ubicar quedó vacía y se eliminó` ya falla hoy (el producto `[901, "902E"]` de
     `201 - Importa un producto con 2 accesorios y ganchos de exhibición` queda en "Por ubicar"). Dejarlo dicho en
     el reporte de entrega.
  1. En la sub-carpeta `Importar layout (POST /versiones/:id/importar-layout)`, después de
     `400 - misma gondola reemplazada dos veces`, agregar cuatro requests:
     - `400 - gancho con letra distinta de E`, `400 - gancho en notación científica` (`["5E1"]`),
       `400 - ganchos repetidos tras normalizar` (`[54, "54"]`) y `400 - más de 100 ganchos en un espacio`
       (101 ganchos, `1..101`).
     - URL: `{{HOST}}/api/v1/versiones/{{versionIdImportacion}}/importar-layout`.
     - Body: un cuerpo `NUEVA` válido con un nivel y una posición, donde solo cambia `ganchos`. Se toma como base
       el cuerpo de `201 - Crear gondola nueva con secciones, niveles y posiciones`, reducido a un nivel sin
       secciones.
     - Script, el mismo de los 400 existentes: `Status 400` y `error.code = VALIDATION_ERROR`.
  2. En la sub-carpeta `Importar layout usando Por ubicar`, modificar
     `201 - Llena los espacios con los productos del Excel por gancho`:
     - agregar al último nivel (el de `[19]` y `[55]`) tres posiciones más, con `orden_horizontal` 3, 4 y 5 y el
       mismo formato: `"ganchos": [901]`, `"ganchos": ["902E"]` y `"ganchos": [902]`;
     - actualizar los tests: `desdePorUbicar` → `7`, `totalPosiciones` → `8`, y los títulos de los `pm.test`
       ("Los 7 espacios se llenaron desde Por ubicar", "Crea la góndola del layout con 8 posiciones").
  3. Después de `200 - El SKU del Excel quedó en el layout con sus ganchos y datos`, agregar
     `200 - El gancho 902E cruzó con su producto y el 902 no`, con
     `GET {{HOST}}/api/v1/versiones/{{versionIdImportacionProductos}}/skus`:
     - `const sku = b.skus.find((s) => s.sku === pm.collectionVariables.get('skuSinDimensiones'));`
     - `pm.expect(sku.ganchos).to.eql([901, '902E'])`;
     - `sku.ubicaciones.length === 2` y todas con `porUbicar === false`;
     - ninguna entrada de `b.ganchosPorPosicion` es igual a `[902]` y tiene a la vez un SKU asignado. Si la
       respuesta no expone la posición pendiente, basta con lo anterior más el `desdePorUbicar === 7` del paso 2.
  4. Validar el JSON de la colección con el comando de la sección 1 del estándar.
- **Criterios de aceptación**:
  - [ ] La carpeta `20` corre completa dos veces seguidas sin edición manual.
  - [ ] Los 4 casos 400 responden `VALIDATION_ERROR`.
  - [ ] `desdePorUbicar === 7` y `404 - Por ubicar quedó vacía` pasa.
- **Depende de**: — (no requiere T1-T6; valida el back existente)

### T8 — Documentación y deuda técnica (commit de docs aparte)
- **Archivos**:
  - modificar `Arquitectura/Contratos/20_importacion/POST_agente_extractor_pdf_planograma.md`;
  - modificar `Arquitectura/Contratos/20_importacion/POST_versiones_importar_layout.md`;
  - modificar `Arquitectura/DEUDA_TECNICA.md`.
- **Qué hacer** (en un commit **separado** del código, con mensaje `docs: ganchos de exhibición en el extractor de PDF (cierra DT-27)`):
  1. `POST_agente_extractor_pdf_planograma.md`:
     - en el ejemplo (l. 50) agregar un espacio con `"ganchos": ["54E"], "facings": 1`;
     - reescribir el párrafo `ganchos` (l. 63) con la forma canónica, el orden, el tope de 100 y la regla de
       `facings` (solo normales, mínimo 1);
     - documentar las dos advertencias nuevas con su texto exacto (ver Contratos).
  2. `POST_versiones_importar_layout.md`:
     - en l. 50, quitar `el extractor de PDF hoy solo produce enteros, DT-27`;
     - en la regla 6 (cruce con "Por ubicar"), agregar: "Un espacio `["54E"]` toma el producto que tiene `54E`;
       un espacio `[54]` no lo toma, y al revés tampoco."
  3. `DEUDA_TECNICA.md`:
     - **DT-27**: estado `Resuelta 2026-10-15 · plan 2026-10-15-ganchos-exhibicion-pdf`, en la tabla y en el
       detalle. En el detalle, anotar que el extractor de imagen numerada pasa a DT-39.
     - **DT-39** (Baja · back · IA · Abierta): "El extractor de imagen numerada (`extractorImagenNumerada.js`,
       schema `integer[]`) descarta los ganchos `54E`. Hoy solo afecta el texto que se manda al chat del Agente
       Extractor (no se persisten ganchos). Atender si ese flujo llega a guardar `Posicion.ganchos`: reutilizar
       `ganchosDelEspacio` del extractor de PDF."
     - **DT-40** (Baja · back · Abierta): "`datos_vision` en `importar-layout` (`importacion.schemas.js`,
       `Joi.object().unknown(true)`) no tiene tope de tamaño, y `ganchos_pdf`/`moduleId` no se validan. Validar
       `ganchos_pdf` con `schemaGanchos` y limitar el tamaño del objeto cuando se toque ese esquema."
     - **DT-30**: agregar al detalle que un cliente directo de `importar-layout` puede mandar el mismo gancho en
       dos espacios. Hoy solo lo advierte el agente; el cruce lo mitiga con `usados`.
- **Criterios de aceptación**:
  - [ ] Ningún archivo de código en el commit de docs y ningún `.md` en el commit de código.
  - [ ] DT-39 y DT-40 tienen fila en la tabla y sección de detalle. DT-27 no se borra.
- **Depende de**: T1-T7

## Verificación final

- `cd back && npm test`
- `cd front && npm test && npx tsc -b && npm run lint`
- `grep -rn dangerouslySetInnerHTML front/src` sin resultados.
- Postman: carpeta `20 - Importación (layout y productos)`, dos corridas seguidas.
- Prueba manual en DEV (C11):
  1. Subir en "Leer PDF" un PDF real con `54E` (por ejemplo, TG-26). En la revisión, la columna "Gancho" muestra
     `54E` y la cabecera del nivel muestra `ganchos 1-9, 54E`, o lo que corresponda.
  2. Con un producto `54E` en "Por ubicar", la columna "Del Excel" marca ese espacio. Importar con "Llenar con Por
     ubicar" y verificar que el producto pasó al layout.
  3. Subir un PDF **sin** ganchos `E` y verificar que la extracción no devuelve ningún `E`.

## Riesgos

- El modelo no lee la E, o la inventa → mitigación: el prompt es explícito (C11), la prueba manual con un PDF real
  es obligatoria antes del merge, y el usuario revisa la tabla antes de importar.
- Con ganchos como texto, el modelo puede devolver formatos raros (`"#54"`, `"54-55"`) → mitigación: se descartan
  con advertencia visible (C1/C8) y el espacio sin ganchos cae en la advertencia de "sin número legible".
- Back nuevo con front viejo da `NaN` en `notas` → mitigación: mismo PR y mismo despliegue.
- La colección Postman puede estar fallando hoy en `404 - Por ubicar quedó vacía` → mitigación: T7 paso 0 lo
  verifica y el paso 2 lo corrige consumiendo el producto `[901, "902E"]`.
