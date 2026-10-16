# 01 — Arquitectura: ganchos de exhibición (`NNE`) en el extractor de PDF (DT-27)

## 1. Entendimiento

El extractor de PDF descarta todo lo que no sea entero (`SCHEMA_ESPACIO.ganchos: integer[]`
y el filtro `Number.isInteger` de `normalizarEspacios`). Por eso un `54E` impreso llega como `54`
o no llega, y al importar con `usar_por_ubicar` no cruza con el producto del Excel que tiene `"54E"`.
El objetivo es que el agente lea `54E`, lo normalice a la forma canónica (`normalizarGancho`) y que el
front lo envíe tal cual a `importar-layout`.

No hay un CU formal para la importación de PDF (módulo `20_importacion`, sin entrada en
`CASOS_DE_USO.md`). Tampoco se agrega uno: el cambio no altera el proceso.

**Hallazgo clave**: el back de `importar-layout` ya está listo. `schemaPosicion.ganchos` usa
`schemaGanchos` (acepta `"54E"`), `planificarPosiciones` copia los ganchos tal cual y `cruzarConPorUbicar`
ya compara en forma canónica y reparte facings solo con los ganchos normales (tiene prueba en
`back/test/domain/importacion.test.js` l. 140). El trabajo queda en el **agente** (back) y en el
**modal** (front), más pruebas y documentación.

## 2. Flujo de proceso

Sin cambios de proceso ni de estados. El analista sube el PDF, revisa y confirma (con o sin
"Llenar con Por ubicar"), igual que hoy. Lo único que cambia es el dato: un espacio del PDF puede traer
`["54E"]` o `[54, "54E"]`. En la revisión, la columna "Del Excel" marcará ese espacio si en "Por
ubicar" hay un producto con `54E`, porque `fuentePorUbicar` ya usa `Map<Gancho, …>`.

Reglas de negocio que el extractor hereda del plan anterior (ya decididas, no se reabren):
- `54` y `"54E"` son ganchos distintos. Un `54E` no es un repetido de `54`.
- Los ganchos de exhibición **no cuentan como facing**: `facings = max(1, cantidad de ganchos normales)`.
  Un espacio que solo tiene `["54E"]` queda con 1 facing (el back exige ≥ 1). Es la misma regla de
  `cruzarConPorUbicar`.
- Los `E` no reservan número en la numeración calculada (`recorrerVersion`). Esto ya está implementado.

## 3. Impacto por capa

| Capa | Archivo | Cambio |
|---|---|---|
| Agente (back, adaptador IA) | `back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js` | `SCHEMA_ESPACIO.ganchos` pasa a `{ type: 'array', items: { type: 'string' } }`. Se ajusta el prompt (sección ESPACIO). `normalizarEspacios`: lectura con `normalizarGancho`, orden con `numeroGancho` y facings solo con los normales. `advertirGanchosRepetidos`: orden con `compararGanchos`. Nueva advertencia de ganchos ilegibles descartados. Se actualiza el comentario de cabecera. Se exportan las funciones puras que se prueban. |
| Dominio (back) | `back/src/domain/compartido/gancho.js` | Sin cambios. Se reutilizan `normalizarGancho`, `numeroGancho`, `esGanchoExhibicion` y `compararGanchos`. |
| Aplicación (back) | `importacion.schemas.js`, `ganchos.schema.js`, `extractorPdfPlanograma.controller.js` | Sin cambios: `importar-layout` ya valida con `schemaGanchos`. |
| Dominio importación (back) | `importacion.entity.js` (`cruzarConPorUbicar`, `planificarPosiciones`) | Sin cambios de código. Se agrega una prueba de cruce con espacio `["54E"]` solo y con `[54]` frente a `"54E"`. |
| BD | — | Sin migración. |
| Tipos (front) | `front/src/types/extractorPdfPlanograma.ts` | `EspacioPdf.ganchos` (l. 25) y `PosicionImportar.ganchos` (l. 102) pasan a `Gancho[]`. Se actualiza el comentario de `ProductoPorUbicar.ganchos` (l. 147), que hoy dice "el extractor del PDF solo produce enteros". |
| Dominio del modal (front) | `.../ExtractorPdfPlanogramaModal/importacionPdf.ts` | `rangoGanchos` usa `Math.min/max` sobre los ganchos y con `"54E"` da `NaN`: se reescribe. `construirCuerpoImportar` y `datosVision` no cambian de código (pasan `Gancho[]` tal cual). |
| Componentes (front) | `RevisionCuerpoPdf.tsx`, `VistaPreviaLayoutPdf.tsx` | Sin cambios de código: `join(', ')` ya muestra `54E`. Solo se verifica que compilen con el tipo nuevo. |
| Imagen numerada | `extractorImagenNumerada.js`, `ExtractorImagenNumeradaModal.tsx`, `types/extractorImagenNumerada.ts` | **Fuera de alcance** (ver §7). |

### Detalle del agente (decisiones)

- **Esquema del modelo**: los ganchos van como cadenas (`"54"`, `"54E"`). Se descartaron
  `anyOf [integer, string]` (más frágil en modo `strict`) y `pattern` (si el modelo lee `54A`, queremos
  la advertencia, no que el schema lo fuerce a otra cosa). La salida se normaliza siempre en el back.
- **Prompt (ESPACIO → ganchos)**: copiar cada número tal como está impreso, como texto. Si lleva la
  letra **E** pegada (`54E`), es un gancho de exhibición y se conserva la E. `54` y `54E` son ganchos
  distintos y pueden convivir en el mismo nivel; no son un número repetido. No agregar la E si no está
  impresa. Cualquier otra letra se copia tal cual y se reporta en advertencias.
- **Normalización** (función pura nueva en el agente, `ganchosDelEspacio(crudos) → { ganchos, descartados }`):
  1. a cada valor `String(v).replace(/\s+/g, '')` (une `54 E`);
  2. `normalizarGancho`;
  3. los `null` van a `descartados` (texto original recortado a 10 caracteres);
  4. se quitan los repetidos con `Set`.

  Por la igualdad estricta, `54` y `"54E"` sobreviven los dos.
- **Orden de espacios**: el desempate de `normalizarEspacios` pasa de `Math.min(...a.ganchos, Infinity)`
  a `Math.min(...a.ganchos.map(numeroGancho), Infinity)`. Ordena sobre los ganchos crudos del modelo, así
  que primero se normaliza y después se ordena.
- **Facings**: `Math.max(1, ganchos.filter((g) => !esGanchoExhibicion(g)).length)`.
- **Advertencias**:
  - Si hay descartados en un cuerpo, se agrega una advertencia del cuerpo: `Ganchos ilegibles
    descartados: 54A, X1. Revisá esos espacios.` (máximo 20 y `…`).
  - Un espacio que se queda sin ganchos cae en la advertencia existente de "sin número de gancho
    legible".
  - En `advertirGanchosRepetidos`, el orden de la lista pasa a `sort(compararGanchos)`. El `Map` ya
    distingue `54` de `"54E"`.
- **Pruebas**: se exportan `ganchosDelEspacio` y `procesarPdf` (ya exportada). La prueba nueva
  `back/test/agents/extractorPdfPlanograma.test.js` llama a `procesarPdf` con stubs:
  - `openaiClient.completarConArchivo` devuelve un fixture;
  - `catiClient` con `obtenerProducto`/`buscarProductos` que no se invocan, porque `sku_impreso` y
    `descripcion_visual` van en `null`;
  - `accesorios: []`.

  `node --test` ya descubre `test/**`.

### Detalle del front (decisiones)

- `rangoGanchos(nivel)`:
  - ordena los ganchos del nivel con `compararGanchos`;
  - arma el rango `min-max` solo con los **normales** (por `numeroGancho`);
  - agrega los de exhibición separados por coma (`"1-9, 54E"`);
  - si solo hay `E`, los lista (`"54E, 55E"`);
  - si no hay ninguno, `—`;
  - sin padding: se conserva el formato actual, que va a `notas`, con un tope de 200 caracteres.
- No se usa `textoGanchos` en la tabla ni en la vista previa. Agregaría ceros a la izquierda (`05`), un
  cambio visible que no se pidió. `join(', ')` ya muestra `54E` correctamente.
- Prueba nueva `front/src/components/dominio/modales/ExtractorPdfPlanogramaModal/importacionPdf.test.ts`
  (vitest):
  - `rangoGanchos` en los casos de arriba;
  - `fuentePorUbicar` con un espacio `["54E"]` y un producto `[65, "54E"]`: lo toma;
  - un espacio `[54]` frente a un producto `["54E"]`: no lo toma;
  - `construirCuerpoImportar` conserva `ganchos: [54, "54E"]`.

## 4. Contratos

No hay endpoints nuevos y la forma de los endpoints existentes no cambia. Solo cambia el contenido
posible del campo `ganchos`.

- `POST /agente-extractor/pdf-planograma` (`Arquitectura/Contratos/20_importacion/POST_agente_extractor_pdf_planograma.md`):
  - `cuerpos[].niveles[].espacios[].ganchos` pasa de `number[]` a `(number|string)[]` canónico
    (`[65, "54E"]`);
  - `facings` = cantidad de ganchos normales (mínimo 1);
  - advertencia nueva de ganchos ilegibles descartados en `cuerpos[].advertencias`;
  - errores sin cambios (`400` del body; `502`/`500` del modelo, tal como están).

  Hay que actualizar el párrafo "`ganchos`" (l. 63) y el ejemplo.
- `POST /versiones/:id/importar-layout` (`POST_versiones_importar_layout.md`): sin cambios de forma ni
  de validación. En l. 50 se quita "el extractor de PDF hoy solo produce enteros, DT-27" y en la regla 6
  se agrega un ejemplo: un espacio `["54E"]` toma el producto con `54E` y uno `[54]` no.
- Retrocompatibilidad del front con el back: el front nuevo contra un back viejo recibiría solo enteros
  (sin daño). Un back nuevo con un front viejo sí rompe `rangoGanchos` (`NaN` en `notas`). Por eso se
  despliegan juntos (mismo PR, como siempre).

## 5. Datos

- Sin migración. `Posicion.ganchos` (NVARCHAR(MAX) JSON, 013) ya guarda el arreglo mixto.
- Es retrocompatible: los datos existentes son enteros o mixtos del Excel y ya se leen con
  `parsearGanchosJson`.
- `datos_vision.ganchos_pdf` (JSON libre de la posición pendiente) puede traer `"54E"`. No hay ningún
  lector que haga aritmética con él (grep sin consumidores).

## 6. Rendimiento y escalabilidad

No hay impacto. La normalización es O(n) sobre unos pocos cientos de espacios por PDF. No hay consultas
nuevas. El cruce sigue siendo un `Map` en memoria dentro de la misma transacción de `importar-layout`.
El costo del modelo no cambia de forma apreciable: los tokens de salida son similares con cadenas en vez
de enteros.

## 7. Alternativas descartadas y decisión

- *Cambiar `importar-layout` o `cruzarConPorUbicar`*: no hace falta, ya cubren `"54E"` con pruebas.
- *Detectar la E por posprocesamiento* (por ejemplo, con la descripción visual): no es confiable. La E
  está impresa y la debe leer el modelo.
- *`anyOf [integer, string]` o `pattern` en el schema*: es más frágil en modo strict y oculta las
  lecturas inválidas.
- *Mover `ganchosDelEspacio` a `domain/compartido/gancho.js`*: tiene un solo consumidor y sumaría
  duplicación back/front (DT-29). Queda local en el agente.
- *Incluir el extractor de imagen numerada*: **no comparte código** con el de PDF (son agentes, schemas,
  controller, modal y tipo separados). Sus ganchos **nunca se persisten**: el modal los convierte en
  texto para el chat del Agente Extractor (`construirMensajeDesdeExtraccion`) y ese agente no maneja
  `ganchos`. No hay cruce con "Por ubicar" que arreglar. Queda **fuera de alcance** y se registra como
  deuda Baja (ver §10).

**Decisión recomendada**:
- En el agente de PDF: ganchos como texto en el schema, `normalizarGancho` como única regla, facings
  solo con los normales, y advertencia de descartados.
- En el front: el tipo `Gancho[]` en `EspacioPdf`/`PosicionImportar` y un `rangoGanchos` seguro con
  mixtos.
- Se cierra DT-27 en lo que toca al PDF. La imagen numerada pasa a una deuda nueva y separada.
- Tamaño real: **S**. El back de importación no se toca.

## 8. Preguntas abiertas

Ninguna bloqueante. Defaults decididos:
- Una letra distinta de E (`54A`) se descarta con advertencia y no bloquea la extracción. El usuario
  revisa antes de importar, igual que con los números ilegibles.
- Un espacio con solo `E` queda con 1 facing.
- La tabla del modal muestra el gancho sin padding.

**Verificación pendiente, no bloqueante**: probar con un PDF real que tenga `54E` (por ejemplo, el de
TG-26) que el modelo efectivamente lee la E. Es una prueba manual en DEV, no se puede automatizar.

## 9. Para UX y para Seguridad

**UX**: se recomienda **omitir la etapa**. No cambia nada visible salvo que `54E` aparece como texto
donde antes aparecía `54`. Si se ejecuta, revisar:
1. Si la columna "Gancho" de `RevisionCuerpoPdf` y la vista previa deben distinguir visualmente un `E`
   (hoy solo texto).
2. Si el texto de la advertencia de ganchos descartados es claro.
3. Si `notas` del nivel (`"R45 · ganchos 1-9, 54E"`) se lee bien.

**Seguridad**:
1. La salida del modelo es entrada no confiable: confirmar que todo gancho pasa por `normalizarGancho`
   antes de salir del agente, y que el `importar-layout` posterior revalida con `schemaGanchos`.
2. Los tokens descartados que se citan en la advertencia se recortan a 10 caracteres, como máximo 20,
   y se renderizan como texto JSX (sin HTML).
3. El prompt no amplía la superficie: la E solo se toma si está impresa, sin inferencias.
4. No hay `JSON.parse` nuevo de ganchos ni `.map(Number)` / `sort((a, b) => a - b)` sobre ganchos en
   el agente (grep).
5. Postman: `importar-layout` con `"54A"` → 400. Con `["902E"]` y `usar_por_ubicar` cruza; con
   `[902]` no.

## 10. Deuda detectada

- **DT-27 → Cerrada** con este plan, en lo que toca al PDF.
- **Nueva (Baja), extractor de imagen numerada sin ganchos de exhibición**: el schema `integer[]` de
  `extractorImagenNumerada.js` descarta `54E`. Hoy solo afecta el texto que se manda al chat (no se
  persisten ganchos). Hay que atenderla si algún día ese flujo guarda `Posicion.ganchos`. Toma el
  siguiente número libre (DT-39).
- **Postman**: hoy no hay ningún caso de `importar-layout` con `usar_por_ubicar`. Se cubre en este
  plan. Los casos van al final de la carpeta "Importar productos", porque necesitan el producto
  `[901, "902E"]` en "Por ubicar" y el cruce elimina esa posición, lo que rompería los requests
  posteriores que la usan:
  - un layout `NUEVA` con espacios `[901]`, `["902E"]` y `[902]` → `desdePorUbicar === 2`;
  - un `GET /skus` que confirma que el SKU ya no está en "Por ubicar".
