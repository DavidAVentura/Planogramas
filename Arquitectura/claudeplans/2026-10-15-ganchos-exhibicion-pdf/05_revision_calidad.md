# 05 — Revisión de calidad: ganchos de exhibición en el extractor de PDF (DT-27)

Alcance: `git diff b5efe60` y los archivos sin seguimiento (`back/test/agents/extractorPdfPlanograma.test.js`,
`front/.../importacionPdf.test.ts`), revisados contra `PLAN.md` y `04_implementacion.md`, incluida la "Decisión del
coordinador". T8 (docs) queda fuera a propósito.

Verificado localmente:
- `cd back && npm test`: 112 pass, 0 fail, 0 todo.
- `vitest` del importador de PDF: 5 pass.
- `npx tsc -b`: sin errores.
- `oxlint` sobre los archivos tocados: sin hallazgos.

## Resumen por tarea

| Tarea | Estado |
|---|---|
| T1 | Cumple los pasos 1 a 10 y los controles C1, C4, C5, C6, C7, C8 y C9. El `grep` de C1 no tiene coincidencias. `SCHEMA_ESPACIO` sigue siendo válido para modo strict. |
| T2 | Cubre los casos a–h. En el caso h falta una aserción (ver M2). |
| T3 | Cubre C2 y C3. El caso "abuso 5" quedó como `llenados === 2`, según la decisión del coordinador. |
| T4 | Cumple. |
| T5 | Cumple. `rangoGanchos` nunca devuelve `NaN`. `notas` queda en 200 caracteres como máximo, sin cortar tokens (el cálculo de la reserva `', …'` es correcto). |
| T6 | Cumple, con un caso extra de tope en `rangoGanchos`. |
| T7 | Está editado y es coherente con los datos de la colección, pero **no se ejecutó** (ver I1). |

## Hallazgos

### Importante

**I1 — Postman T7 sin ejecutar: tres criterios de aceptación sin verificar**
- **Dónde**: `postman/planogramas-import.postman_collection.json` (requests nuevos cerca de l. 24532-24718, l. 26299 y l. 26391).
- **Problema**: no se corrió la carpeta `20 - Importación`. Quedan sin comprobar:
  - el paso 0 (si `404 - Por ubicar quedó vacía` ya fallaba);
  - las dos corridas seguidas;
  - `desdePorUbicar === 7`.

  Por análisis estático, el resultado esperado es consistente:
  - `[901]` y `["902E"]` cruzan con el producto `[901, "902E"]`.
  - `[902]` no cruza con nada: el único producto con `902` (`skuExistente`) está en un request 422, que no importa nada.
  - Con eso "Por ubicar" se vacía.
  - El agregado de `/skus` debería devolver `[901, '902E']` con 2 ubicaciones.

  Aun así, `ubicaciones.length === 2` depende de cómo `skuVersion` agrega las posiciones, y eso no se probó contra la BD.
- **Escenario**: si `cruzarConPorUbicar` o `/skus` se comportan distinto de lo previsto, la colección queda en rojo en CI/manual. Además, `404 - Por ubicar quedó vacía` podría seguir fallando sin que nadie lo note.
- **Corrección**: antes del merge, correr dos veces seguidas la carpeta `20` contra DEV. Anotar el resultado en `04_implementacion.md`, incluido el paso 0.

**I2 — El texto previsto para DT-30 en T8 contradice el comportamiento real**
- **Dónde**: `PLAN.md`, T8, punto 3 (DT-30): "el cruce lo mitiga con `usados`". El comportamiento real está en `back/test/domain/importacion.test.js:190-195`.
- **Problema**: la prueba nueva demuestra que `usados` **no** impide reusar el producto. Dos espacios `["54E"]` se llenan los dos con el mismo SKU, y lo mismo pasa con ganchos enteros. Si T8 copia el texto del plan, la deuda queda documentada de forma falsa.
- **Escenario**: alguien lee DT-30, asume que el cruce ya está mitigado y no prioriza el arreglo. Un cliente directo de `importar-layout`, o una mala lectura del modelo, duplica el producto en el layout.
- **Corrección**: en T8, redactar DT-30 así: "hoy `cruzarConPorUbicar` llena todos los espacios que repiten un gancho con el mismo producto; `usados` solo limpia Por ubicar; la prueba `importacion.test.js` 'hoy llena ambos (DT-30)' documenta el comportamiento". No requiere cambio de código en este PR.

### Menor

**M1 — El desempate de espacios con el mismo `orden_horizontal` sigue dependiendo del orden de entrada**
- **Dónde**: `back/src/agents/extractorPdfPlanograma/extractorPdfPlanograma.js:380-387`
- **Problema**: el desempate usa solo `numeroGancho`, así que no es determinista en dos casos:
  - `[3]` contra `["3E"]` (mismo número);
  - dos espacios sin ganchos (`Infinity` contra `Infinity`).

  En los dos, el comparador devuelve `0` y el orden queda como venía del modelo. La prueba "es independiente del orden de entrada" solo cubre números distintos.
- **Escenario**: dos lecturas del mismo PDF con el modelo devolviendo los espacios en distinto orden. `54` y `54E` intercambian `orden_horizontal` en la importación.
- **Corrección**: como `l.ganchos` ya viene ordenado, desempatar con `compararGanchos(a.ganchos[0], b.ganchos[0])` cuando ambos tienen ganchos. Agregar el caso `[54]`/`["54E"]` invertido a la prueba.

**M2 — La prueba e2e no verifica que CATI no se llamó**
- **Dónde**: `back/test/agents/extractorPdfPlanograma.test.js:30-38` y `:104-115`
- **Problema**: los stubs lanzan error si se los llama, pero `identificarProductos` atrapa los errores de CATI (`.catch(...)`) y solo suma una advertencia general. El criterio "los stubs de CATI no se llamaron" (T2-h) no se comprueba: si se los llamara, la prueba seguiría pasando.
- **Corrección**: usar un contador en los stubs (`assert.equal(llamadas, 0)`), o asertar que `r.advertencias` no contiene `No se pudo consultar CATI`.

**M3 — La advertencia de ganchos descartados no dice en qué nivel están**
- **Dónde**: `extractorPdfPlanograma.js:465-469`
- **Problema**: "Ganchos ilegibles descartados: 54A. Revisá esos espacios." no indica el nivel. La advertencia de exceso sí lo hace (`${etiquetaNivel}: ...`). En un cuerpo con muchos niveles, el usuario tiene que buscar a mano. El texto lo fija el plan, así que es una mejora opcional para un siguiente cambio.
- **Corrección**: más adelante, citar como `Nivel N: 54A`, o agrupar por nivel.

**M4 — `04_implementacion.md` quedó desactualizado**
- **Dónde**: `04_implementacion.md`, tabla de tareas (T3) y "Verificación".
- **Problema**: el archivo dice "1 todo" y "111 pass". Tras la decisión del coordinador, la prueba ya no es `todo` y el resultado real es 112 pass / 0 todo.
- **Corrección**: actualizar esas dos líneas al cerrar la etapa.

## Veredicto

**Aprobado con menores, condicionado a I1**. El código cumple los criterios de T1-T6 y no hay bloqueantes. Antes del merge:
- correr la carpeta `20` de Postman dos veces seguidas (I1);
- hacer la prueba manual C11 con un PDF real;
- redactar DT-30 en T8 según I2.
