# 05 — Revisión de calidad (ronda 1)

Diff revisado: `git diff 76dd827` más los archivos nuevos sin seguimiento (`back/src/domain/compartido/gancho.js`,
`back/src/application/compartido/ganchos.schema.js`, `back/src/application/importacion/importacion.schemas.js`,
`back/test/**` nuevos, `front/src/domain/ganchos/`, `front/src/domain/accesorios/`, `front/src/types/gancho.ts`,
`front/src/utils/excelProductosPlanograma.test.ts`). Contra `PLAN.md` revisión 3 y `04_implementacion.md`.

Comprobado localmente: `back npm test` 95/95; `front vitest` 56/56; `npx tsc -b` sin errores; `oxlint src` sin
hallazgos en archivos tocados; stylelint del `.css` del modal limpio. Greps de la Verificación final: el único
`JSON.parse` de ganchos está en `domain/compartido/gancho.js`; no hay `map(Number)` sobre ganchos; los dos
`Math.min(...)` restantes usan `numeroGancho` (más el extractor de PDF, exento). Postman: con `--patience` el
diff es +775/−3 (el inflado del diff por defecto se debe al algoritmo, no a finales de línea); se cubren los
casos 1 a 9 de T9.

## Hallazgos

### B1. Bloqueante: el lienzo real oculta o desplaza los ganchos de exhibición
`front/src/components/dominio/lienzoEditor/GondolaEscalaLienzo/GondolaEscalaLienzo.tsx:529-537` (y `:501`)

- **Problema**: la única vista de lienzo que renderiza `LienzoPlanograma.tsx:649` es `GondolaEscalaLienzo`.
  `GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no se montan en ninguna página: solo se importa
  el tipo de props. Por eso el badge `65, 54E` de `PosicionLienzo`, que es el que cita el criterio de T15,
  nunca aparece. La vista a escala asigna un gancho por facing (`ganchos[i]` para `i < facings`). Como los
  `E` no cuentan como facings (P-E2), cualquier gancho `E` queda fuera del rango de facings o le quita el
  lugar a un gancho normal.
- **Escenarios**:
  - Posición `[65, "54E"]` con 1 facing (el caso implícito del plan): con "Mostrar ganchos" se ve solo `65`.
    El `54E` no aparece en ningún lado del lienzo, y el `title` de la posición tampoco lista ganchos.
  - Excel con `TG1 = 54E` y `TG2 = 65`: se guarda `["54E", 65]` en el orden del archivo y el facing muestra
    `54E`, mientras el gancho real del facing (`65`) queda oculto.
  - SKU 852312 de TG-26 (`[54, 94, 64, 95, 65, "54E", 66, 88, …]`, 12 facings): el `54E` ocupa el facing 6,
    todos los ganchos siguientes se corren un lugar y el último normal no se muestra.
- **Incumple**: el objetivo 3 ("se muestran tal cual... en el lienzo"), el criterio de T15 y el paso 2 de la
  prueba manual.
- **Corrección sugerida**: en `PosicionEscala`, repartir por facing solo los ganchos normales
  (`ganchos.filter((g) => !esGanchoExhibicion(g))`). Mostrar los `E` aparte, por ejemplo con un
  `gondola-escala__gancho` adicional en el último facing o en un contenedor de la posición, y agregar
  `textoGanchos(ganchos)` al `title`. Aplicar lo mismo a la rama de espacio pendiente (`:501`). Sin estilos
  nuevos: se reutiliza la clase existente. Conviene anotar en `DEUDA_TECNICA.md` que
  `GondolaFrameLienzo`/`NivelFilaLienzo`/`PosicionLienzo` parecen código muerto.

### B2. Bloqueante: un decimal o un negativo escrito como texto en una celda de gancho se lee en silencio como otros ganchos
`front/src/utils/excelProductosPlanograma.ts:193-195` (`ganchosCelda`)

- **Problema**: el split `/[^0-9A-Z]+/` trata `.` y `-` como separadores. Una celda de texto `"54.5"` da
  `[54, 5]` y `"-3"` da `[3]`, sin error. Es la desviación que `04_implementacion.md` reporta como
  "deuda detectada", pero el plan sí lo decide, y en dos lugares:
  - Decisiones, fila de "Celda de gancho": "un número decimal/negativo → **error bloqueante**".
  - La tabla "Textos de error por celda" pone `54.5` y `-3` como ejemplos de "Gancho inválido".
  La prueba de T7 solo cubre el número `54.5`, no el texto.
- **Escenario**: celda con formato de texto `54.5 | 65` → producto con ganchos `[54, 5, 65]`. El gancho 5 es
  real: el producto se cruza con el espacio 5 del PDF y la numeración calculada reserva el 5. Es la misma
  clase de error silencioso que este plan corrige para `22" // 22"` → 2222.
- **Corrección sugerida**: antes del split, devolver `invalido(...)` con el token si el texto tiene un decimal
  (`/\d\.\d/`) o si empieza con un signo negativo (`/^\s*-\s*\d/`). Así `166-167` y `168,169` siguen como
  hoy; la coma se mantiene como separador, según el plan. Agregar a la prueba `ganchosCelda('54.5')`,
  `ganchosCelda('-3')` y `ganchosCelda('54.5 | 65')` → error. Otra salida: si el coordinador prefiere
  conservar el comportamiento actual, el usuario debe aceptarlo explícitamente y hay que corregir el plan y
  el contrato. Mientras tanto, el código contradice el plan aprobado.

### I1. Importante: el cruce con "Por ubicar" reparte facings contando los ganchos `E`
`back/src/domain/importacion/importacion.entity.js:216` y `:250` (`cruzarConPorUbicar`)

- **Problema**: el reparto proporcional usa `fuente.ganchos.length` como denominador, y ahí ya entran los `E`.
  Con P-E2 (los `E` no son facings), el producto ubicado recibe menos facings de los que tiene. El plan
  decía "sin cambios de código"; el hueco viene del plan, pero el defecto lo trae este cambio, porque antes
  no existían ganchos `E`.
- **Escenarios**:
  - Por ubicar `{ ganchos: [65, 66, "54E"], facings: 2 }` (facings implícitos = 2) y espacio del PDF
    `[65, 66]` → `round(2·2/3) = 1` facing en el lienzo, cuando el Excel dice 2. El resto `["54E"]` queda con
    1 facing.
  - SKU 852312 con 12 facings, 12 normales y 1 `E`: un espacio con los 12 normales recibe
    `round(144/13) = 11`.
- **Corrección sugerida**: usar como denominador la cantidad de ganchos normales de la fuente
  (`fuente.ganchos.filter((g) => typeof g === 'number').length || fuente.ganchos.length`), y contar solo los
  normales de `pos.ganchos` y de `resto`. Si el resto solo tiene `E`, dejar `max(1, …)` como hoy. Agregar el
  caso a `back/test/domain/importacion.test.js`.

### I2. Importante: con el catálogo de accesorios cargando o con error, el modal bloquea por "accesorio inexistente" y ofrece dar de alta códigos que sí existen
`front/src/components/dominio/modales/ImportarExcelProductosModal/ImportarExcelProductosModal.tsx:130`, `:158`, `:170`

- **Problema**: `useAccesorios()` expone `cargando`, pero el modal no lo usa. Mientras `accesorios` es `[]`,
  sea porque la carga no terminó o porque falló (el hook solo muestra un toast), `faltantes` lista todos los
  códigos del archivo e `importar()` abre la vista de errores de catálogo con "no existe en el catálogo".
  Antes de este cambio, ese mismo caso solo mostraba un aviso.
- **Escenario**: el `GET` del catálogo falla (red, 401 por expiración, 500). El usuario lee un Excel válido,
  ve todos los accesorios como faltantes y no puede importar. Si pulsa "Dar de alta" sobre un código
  existente, el alta falla por duplicado. El mensaje es falso y no hay forma de avanzar.
- **Corrección sugerida**: tomar `cargando` del hook. Mientras carga, no mostrar faltantes y deshabilitar
  Importar. Si la carga falló, saltar la verificación del front y dejar que el back decida (el back ya es la
  barrera: 422 con `details.codigos`, que el modal ya maneja). Otra opción: mostrar un estado de error con
  "Reintentar" que llame a `recargarAccesorios`.

### M1. Menor: la justificación de no ordenar en `textoGanchos` no es correcta, aunque la decisión sí lo es
`front/src/domain/ganchos/gancho.ts:41` · `04_implementacion.md`, desviación 2

- No ordenar es lo correcto. El criterio de T14 espera `textoGanchos([65, '54E'])` → `65, 54E`, que es el orden
  de entrada (ordenado sería `54E, 65`). Además, la vista a escala depende del orden posición a posición
  (ver B1).
- Lo que no es cierto es "el back ya devuelve los ganchos ordenados". Los ganchos guardados conservan el orden
  del Excel (SKU 852312: `[54, 94, 64, 95, 65, "54E", …]`) y el drawer guarda en el orden en que se teclean.
  Consecuencia: el rango `04–07` solo aparece si los ganchos ya vienen continuos en el orden guardado, y la
  vista previa del modal lista los ganchos en el orden del archivo. No se arma ningún rango falso: un rango
  solo sale si los ganchos son consecutivos en el orden recibido.
- **Sugerencia**: corregir la nota en `04_implementacion.md` y en `ESTADO_MODULOS.md` (T10): "los ganchos se
  muestran en el orden guardado". Si se quiere el orden de la Decisión "por número; el normal antes que el
  de exhibición", aplicarlo solo en la vista previa del modal (`[...p.ganchos].sort(compararGanchos)`) y nunca
  en el lienzo a escala.

### M2. Menor: los chips no aceptan `54 E` con espacio, a diferencia del drawer y del Excel
`front/src/components/dominio/lienzoEditor/DetalleGondolaPanel/PosicionesSku.tsx:256`

- `leerGancho('54 e')` → `null` y muestra "Número entero mayor que 0, o de exhibición como 54E". En cambio,
  `leerListaGanchos` (drawer) y `ganchosCelda` (Excel) unen `54 E` → `54E`. No incumple ningún criterio (el
  plan pide `54e`).
- **Sugerencia**: `leerGancho(texto.replace(/(\d)\s+E$/i, '$1E'))`, o reutilizar
  `leerListaGanchos(texto)` y exigir exactamente un gancho.

### M3. Menor: `leerListaGanchos` une `\d\s+E` sin el lookahead que usa `ganchosCelda`
`front/src/domain/ganchos/gancho.ts` (`leerListaGanchos`)

- `ganchosCelda` usa `/(\d)\s+E(?![A-Z])/`; el drawer usa `/(\d)\s+E/gi`. Por ejemplo, `4 EX` en el drawer pasa
  a `4EX` (inválido, lo cual está bien); en el Excel queda `4` + `EX` (también inválido). No se pierden datos,
  pero son dos reglas distintas para lo mismo.
- **Sugerencia**: compartir la regla de unión en un helper de `domain/ganchos/gancho.ts`.

## Fuera de la revisión de calidad (para seguridad-integridad o el coordinador)

- S13 (consulta SQL de ganchos no canónicos en DEV y PROD) sigue pendiente y es bloqueante antes de publicar.
- T10 (documentación) queda para el coordinador, junto con la nota de M1.
- Deuda sugerida: los componentes `GondolaFrameLienzo`/`NivelFilaLienzo`/`PosicionLienzo` no se renderizan
  en ninguna página (ver B1). Se suman los 26 errores preexistentes de stylelint que reporta el desarrollador.

## Conteo

| Severidad | Cantidad |
|---|---|
| Bloqueante | 2 (B1, B2) |
| Importante | 2 (I1, I2) |
| Menor | 3 (M1, M2, M3) |

## Veredicto

**Requiere cambios.** Hay que corregir B1 y B2 (los dos en el front, cambios acotados con su prueba) y
conviene resolver I1 e I2 en la misma ronda. Por lo demás, la implementación cumple el plan: back con orden
S12 y pruebas con contadores, esquema único de ganchos sin `Joi.number()`, un solo `insert` multi-fila con
`trx`, normalizador único de código, vista de errores con foco y `aria-*`, CSS migrado a tokens y Postman
completo.

---

# Ronda 2

Revisadas solo las correcciones de "Correcciones ronda 1" (`04_implementacion.md`) sobre `git diff 76dd827`:
`GondolaEscalaLienzo.tsx`, `excelProductosPlanograma.ts` y su prueba, `importacion.entity.js` y
`back/test/domain/importacion.test.js`, `useAccesorios.ts` y `ImportarExcelProductosModal.tsx`. Comprobado
localmente: back `npm test` 96/96, front `vitest` 56/56 y `npx tsc -b` sin errores.

## Estado de los hallazgos de la ronda 1

| Hallazgo | Estado | Comentario |
|---|---|---|
| B1 | **Abierto (parcial)** | El reparto por facing ya usa solo los normales, el `title` lista todos los ganchos y la rama pendiente muestra `textoGanchos(ganchos)`. Pero el badge de los `E` se dibuja encima del badge normal del último facing (ver B1-R2). |
| B2 | Cerrado | `ganchosCelda` rechaza `54.5`, `-3` y `54.5 \| 65` antes del split. `166-167` y `168,169` no se ven afectados. Las tres pruebas están en `excelProductosPlanograma.test.ts:83-85`. |
| I1 | Cerrado | El numerador (`normales(pos.ganchos)`, `normales(resto)`) y el denominador (`normales(fuente) \|\| length`) cuentan solo los normales, y `max(1, …)` se conserva. Un espacio o un resto con solo `E` recibe 1. La prueba nueva cubre `[65, 66, "54E"]` → 2 y resto 1. La expectativa ajustada de la prueba anterior es correcta. |
| I2 | Cerrado | `useAccesorios` expone `fallo` y lo reinicia en cada carga. Mientras el catálogo carga no se listan faltantes, `importar()` sale sin hacer nada y el botón queda deshabilitado. Si la carga falló, se omite la verificación del front y el 422 con `codigos` del back recarga el catálogo. El campo nuevo del hook no rompe a los demás consumidores. |

## Hallazgos nuevos

### B1-R2. Bloqueante: el badge de exhibición tapa el gancho normal del último facing
`front/src/components/dominio/lienzoEditor/GondolaEscalaLienzo/GondolaEscalaLienzo.tsx:540-543` · `GondolaEscalaLienzo.css:302-306`

- **Problema**: `.gondola-escala__gancho` usa `position: absolute; top: 1px; left: 50%; translateX(-50%)`.
  En el último facing se renderizan dos spans con esa misma clase (el normal `normales[i]` y el de
  exhibición), así que quedan exactamente en el mismo punto. El segundo (`54E`) es más ancho, va después en
  el DOM y fondo `--ink-900` opaco, por lo que tapa por completo al primero.
- **Escenario**: es el caso base del plan, `[65, "54E"]` con 1 facing. Con "Mostrar ganchos" se ve solo
  `54E` y el `65` desaparece: el mismo defecto de B1, ahora con el gancho normal. Con 852312 (12 facings),
  el facing 12 muestra `54E` en lugar de su gancho normal. Solo el `title` muestra los dos.
- **Origen**: mi sugerencia de la ronda 1 ("sin estilos nuevos: se reutiliza la clase existente") no tuvo en
  cuenta que la clase está posicionada en absoluto. La corrección necesita un ajuste de CSS mínimo.
- **Corrección sugerida**: agregar un modificador con un desplazamiento distinto, sin tokens nuevos. Por
  ejemplo, `.gondola-escala__gancho--exhibicion { top: auto; bottom: 1px; }`, aplicado al span de los `E`.
  Otra opción: un solo span por facing con `[normal, ...E].map(textoGancho).join(', ')` en el último facing.
  Cualquiera de las dos deja visibles ambos ganchos.

### M4. Menor: varios `E` en un facing angosto se recortan
Mismo lugar. `.gondola-escala__facing` tiene `overflow: hidden`, así que `54E, 55E, 56E` en un facing
estrecho se corta. El `title` ya lista todos, así que no se pierde la información. Se puede aceptar tal cual
o resolverlo junto con B1-R2 (por ejemplo, mostrar `+2E` cuando haya más de uno).

### M5. Menor: `54. 5` (con espacio después del punto) todavía se parte en `[54, 5]`
`front/src/utils/excelProductosPlanograma.ts:194`. `/\d\.\d/` exige que el punto esté pegado a los dos dígitos.
Es un caso raro y es opcional: `/\d\s*\.\s*\d/` también lo cubre.

## Conteo ronda 2

| Severidad | Cantidad |
|---|---|
| Bloqueante | 1 (B1-R2, B1 sigue abierto) |
| Importante | 0 |
| Menor | 2 nuevos (M4, M5) + M2, M3 de la ronda 1 sin cambios |

## Veredicto ronda 2

**Requiere cambios.** B2, I1 e I2 quedan cerrados y no introducen regresiones. B1 queda a medias: los
badges se superponen en el último facing y ocultan el gancho normal en el caso base `[65, "54E"]`. La
corrección es de una línea de CSS (un modificador) más la clase en el span. Al ser un cambio tan acotado, el
coordinador puede verificarlo sin otra ronda completa.
