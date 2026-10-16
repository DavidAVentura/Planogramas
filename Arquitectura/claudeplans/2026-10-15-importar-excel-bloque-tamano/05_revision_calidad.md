# 05 — Revisión de calidad: importar Excel por bloque TG/TM/TE

Diff revisado: `git diff 2a06094` (6 archivos de `front/`, sin archivos de código nuevos). Contra `PLAN.md` y
`04_implementacion.md`.

Comprobado en el worktree: `npx vitest run src/utils/excelProductosPlanograma.test.ts` → 42 pasan;
`npx tsc -b` → sin errores; `oxlint` en los 4 archivos `.ts/.tsx` tocados → sin hallazgos.

## Criterios de aceptación

| Tarea | Resultado |
|---|---|
| T1 | Cumple. Selección por sufijo y gancho exactos, comunes sin sufijo, el bloque gana a la común, bloque ausente devuelve `columnasFaltantes: []`, faltante `Facings_<S>`. Hay una prueba para cada criterio. |
| T2 | Cumple. `siglasEnNombre`, validación de `Planograma_<S>` solo en filas con facings ≥ 1, `bloqueoDeLectura` y `AVISO_SIN_TIPO` con los textos del plan; el recorte a 40 caracteres está probado. Hay un caso borde en la regex (ver I-1). |
| T3 | Cumple. `tipoVersion={version?.tipo}` es la única fuente (S1) en las dos páginas. La burbuja solo se monta con `!cargandoInicial`, así que no aparece un "sin tipo" pasajero mientras cargan las versiones. |
| T4 | Cumple en la revisión de código. Orden de `leer()`, limpieza del aviso al cambiar de archivo y en `cargarOtroArchivo`, botón deshabilitado con `title` sin tipo (S3), `Badge` de `ui/` con `TIPO_TIENDA_META`, sin CSS nuevo. Falta la verificación visual en el navegador (pendiente del usuario, según 04). |
| T5 | Se hizo con el lector y el archivo real, sin DEV. Los tres resultados coinciden con lo esperado. |
| T6 | Pendiente: hay una propuesta redactada en 04 y se aplica en el commit de docs. |

## Hallazgos

### Importante

**I-1 — La regex de siglas trata la Ñ y las vocales con tilde como "no letra" y produce un error bloqueante falso.**
`front/src/utils/excelProductosPlanograma.ts:155` (y la copia en `:558`).
- Problema: el plan define la sigla como palabra "delimitada por no-letras", pero `(?<![A-Za-z])…(?![A-Za-z])` no
  reconoce `Ñ`, `Á`, `É`, etc. como letras.
- Escenario (comprobado con node): `siglasEnNombre('TINTES Y TEÑIDO')` → `['TE']`. Para una versión GRANDE o
  MEDIANA, cada fila con producto da un error en `Planograma_<S>` («…no corresponde al bloque TG») y no se puede
  importar. El ejemplo propuesto también sale mal: «TINTES Y TGÑIDO». Pasa igual con cualquier nombre que tenga
  `te`/`tg`/`tm` junto a una ñ o una vocal con tilde (p. ej. "…ÁTE…").
- Corrección: usar letras Unicode, `/(?<!\p{L})(TG|TM|TE)(?!\p{L})/giu`, guardada en una sola constante para las
  dos líneas. Agregar a la prueba `siglasEnNombre('TINTES Y TEÑIDO')` → `[]`.

### Menor

**M-1 — Regex duplicada.** `excelProductosPlanograma.ts:155` y `:558` repiten el mismo patrón. Conviene una
constante `RE_SIGLA` (o una función `reemplazarSiglas`) para que la corrección de I-1 no quede solo en una de las dos.

**M-2 — El comentario de cabecera quedó incompleto.** `excelProductosPlanograma.ts:10-12`: la línea 10 ahora pasa
de los 170 caracteres. Además, el texto sigue diciendo que la columna planograma "solo se usa para avisar si el
archivo es de otro planograma", pero ahora también genera un error bloqueante. Partir la línea y corregir el texto.

**M-3 — Una columna `Planograma` común (sin sufijo) también se valida contra el bloque.** En
`excelProductosPlanograma.ts:553` se usa `columnas.get('planograma')`, que puede ser la columna común. Si un archivo
de tres bloques trae un solo `Planograma` con «X TG-09», toda importación MEDIANA/EXPRESS falla con N errores. Esto
es coherente con la regla del plan ("columna común vale para cualquier tipo"), pero el motivo dice
"`Planograma`… no corresponde al bloque TM", lo que puede confundir. Es un caso hipotético (el archivo real trae
`Planograma_TG/TM/TE`). Basta con registrarlo como riesgo o validar solo cuando la columna viene del bloque.

**M-4 — Condición redundante en el modal.**
`ImportarExcelProductosModal.tsx:161`: `bloqueo && resultado.errores.length === 0`. `bloqueoDeLectura` ya exige
`errores.length === 0` para el bloque vacío, y el bloque ausente nunca trae errores. No hace daño; se puede
simplificar a `if (bloqueo)`.

**M-5 — Falta una prueba del ejemplo recortado.** La prueba de recorte solo revisa `motivo`. Falta revisar que
`esperado` también se recorte (con un nombre de más de 40 caracteres, el ejemplo con la sigla reemplazada).

**M-6 — Casts innecesarios.** `excelProductosPlanograma.ts:45` y `:171-173` usan `as SiglaBloque` y
`as VersionTipo` porque `SIGLA_TIPO_TIENDA` está tipado como `Record<TipoTienda, string>`. Se pueden quitar ahí, o
invertir el mapa en una constante local tipada. Es opcional.

## Deuda detectada

Coincide con 04: el literal `#7a5900` en `TIPO_TIENDA_META.EXPRESS` y `BloqueoErrores` local en el modal. Si I-1 no
se corrige en esta ronda, registrarlo como deuda (Media, front).

## Veredicto

**Requiere cambios.** Hay que corregir I-1 (regex con letras Unicode y su prueba). Lo demás es menor y opcional;
se recomienda hacer M-1 junto con I-1.

## Ronda 2

Revisé solo lo que se corrigió (`git diff 2a06094`, que ahora incluye `front/src/constants/tiendas.ts`). Comprobado:
`npx vitest run` → 71 pasan; `npx tsc -b` → sin errores; `oxlint` en los archivos tocados → sin hallazgos.

| ID | Estado | Comprobación |
|---|---|---|
| I-1 | Resuelto | `RE_SIGLA = /(?<!\p{L})(TG\|TM\|TE)(?!\p{L})/giu`. Hay prueba de que `'TINTES Y TEÑIDO'` da `[]` y `'ÁTE TG'` da `['TG']`. |
| M-1 | Resuelto | La constante se usa en `siglasEnNombre` y en el ejemplo de `esperado`. Aunque tiene la bandera `g`, solo se usa con `matchAll` y `replace`, que no dejan `lastIndex` sucio; no tiene el problema que tendría con `test`/`exec`. |
| M-2 | Resuelto | La cabecera está en líneas cortas y describe el nuevo uso de la columna planograma. |
| M-3 | Aceptado sin cambio | La justificación es coherente con la regla del plan para columnas comunes; queda como riesgo menor. |
| M-4 | Resuelto | `if (bloqueo)` en el modal. |
| M-5 | Resuelto | La prueba de recorte revisa también `esperado`. |
| M-6 | Resuelto | `SIGLA_TIPO_TIENDA: Record<TipoTienda, 'TG' \| 'TM' \| 'TE'>` solo estrecha el tipo. Sus otros usos (`VersionesPlanograma`, `PlanogramasTiendaModal`, `PublicarVersionModal`, `VersionResumenModal`, `domain/estructura/asignaciones.ts`) lo usan como texto o con `toLowerCase()` y compilan sin cambios. `TIPO_POR_SIGLA` está tipado y sin casts. |

No hay hallazgos nuevos.

### Veredicto final

**Aprobado con menores**: queda solo M-3, aceptado como riesgo menor. Falta la verificación visual del modal en
el navegador (pendiente del usuario) y aplicar T6 en el commit de docs.
