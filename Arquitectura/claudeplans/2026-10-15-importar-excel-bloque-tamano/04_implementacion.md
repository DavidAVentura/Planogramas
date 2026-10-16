# 04 — Implementación: importar Excel por bloque TG/TM/TE

## Tareas

| ID | Estado | Archivos |
|---|---|---|
| T1 | Completa | `front/src/utils/excelProductosPlanograma.ts` |
| T2 | Completa | `front/src/utils/excelProductosPlanograma.ts`, `front/src/utils/excelProductosPlanograma.test.ts` |
| T3 | Completa | `AgenteExtractorBubble.tsx`, `EditorPlanograma.tsx`, `LienzoPlanograma.tsx` |
| T4 | Completa (verificación manual del modal pendiente, ver T5) | `ImportarExcelProductosModal.tsx` |
| T5 | Completa con el lector contra el archivo real (sin navegador/DEV) | script temporal, no queda en el repo |
| T6 | Propuesta redactada abajo (no se editó ESTADO_MODULOS ni DEUDA_TECNICA) | — |

## Verificación

- `back: npm test` → 96 pasan, 0 fallan.
- `front: npm test` → 71 pasan (7 archivos). `npx tsc -b` → sin errores.
- `front: npm run lint` → 0 problemas en los archivos tocados (los 26 errores / 443 avisos restantes son preexistentes, en CSS y otros archivos).
- Postman: no aplica.

## T5 — Lector contra el archivo real (plano.xlsx, SUAVIZANTES Y LIQUIDO PLANCHAR LIMPIEZA 09)

Encabezado con los tres bloques (`bloquesEnArchivo = TG, TM, TE`).

| Versión | Productos | Errores | Resultado |
|---|---|---|---|
| GRANDE (TG) | 42 (2693 filas omitidas) | 0 | Vista previa del planograma "LIMPIEZA TG-09"; ganchos solo de TG (ej. `[62,63]`, `[60,61]`, `[64..67]`) |
| MEDIANA (TM) | 0 | 42, todos en `Planograma_TM` (columna AO), desde la fila 6: «LIMPIEZA TG-09» no corresponde al bloque TM; esperado «LIMPIEZA TM-09» | Vista "Errores del archivo", importar deshabilitado |
| EXPRESS (TE) | 0 (2735 omitidas) | 0 | `bloqueoDeLectura` = "El bloque TE (Tienda express) no tiene productos: todas sus filas están vacías o en 0…" |

Pendiente a mano por el usuario: ver los textos y el Badge en el navegador (no se levantó DEV).

## Desviaciones

- Ninguna de fondo. Detalle menor: las columnas faltantes ya no devuelven `'facings'` sino `Facings_<S>` (según el plan).
- `README`/CSS: sin cambios; el Badge usa `TIPO_TIENDA_META` (incluye el `#7a5900` preexistente de EXPRESS).

## Bloqueos

Ninguno.

## Deuda detectada

- `TIPO_TIENDA_META.EXPRESS.color` usa el literal `#7a5900` en vez de un token.
- `BloqueoErrores` vive dentro del modal; candidato a extraer a `components/ui/`.
- Riesgo conocido: un nombre de planograma con "TE" como palabra (p. ej. té) daría un falso error bloqueante.

## T6 — Propuesta de documentación (pendiente de aplicar en commit de docs)

**ESTADO_MODULOS.md, módulo 20, viñeta "Front"**: la importación lee solo el bloque del tipo de la versión
(`version.tipo`: GRANDE → TG, MEDIANA → TM, EXPRESS → TE; nunca del archivo). Columnas por sufijo exacto
`_tg|_tm|_te` y gancho exacto `^(tg|tm|te)\d{1,2}$`; las de otros bloques se ignoran. Columna sin sufijo es
común; si hay con sufijo del bloque gana esta. Bloque ausente (el archivo trae bloques y no el de la versión)
o vacío (sin productos) → aviso en el paso 1, no se importa. `Planograma_<S>` con sigla TG/TM/TE ajena (como
palabra) es error bloqueante, solo en filas que serían producto. Versión sin tipo: no se lee. Nota: versiones TG
importadas antes del 2026-10-15 desde archivos de tres bloques pueden tener ganchos TM mezclados; se reimportan
a mano.

**DEUDA_TECNICA.md**: nueva DT (Baja, front): `TIPO_TIENDA_META.EXPRESS` usa el color literal `#7a5900` en vez
de un token. (Opcional: extraer `BloqueoErrores` a `ui/`.)

## Correcciones ronda 1

Hallazgos de `05_revision_calidad.md`:

| ID | Estado | Cambio |
|---|---|---|
| I-1 | Corregido | `RE_SIGLA = /(?<!\p{L})(TG\|TM\|TE)(?!\p{L})/giu` (letras Unicode). Pruebas nuevas: `siglasEnNombre('TINTES Y TEÑIDO')` → `[]` y `'ÁTE TG'` → `['TG']`. |
| M-1 | Corregido | Una sola constante `RE_SIGLA`, usada por `siglasEnNombre` y por el ejemplo de `esperado`. |
| M-2 | Corregido | Comentario de cabecera partido en líneas cortas y texto de la columna planograma actualizado. |
| M-3 | Sin cambio (decisión) | El PLAN (fila 23) define la validación sobre `Planograma_<S>` y la columna común sin sufijo "vale para cualquier tipo"; mantener la validación sobre la columna efectiva es coherente con el plan. Es un caso hipotético (el archivo real trae `Planograma_TG/TM/TE`). Se registra como riesgo menor, sin deuda nueva. |
| M-4 | Corregido | Modal: `if (bloqueo)`. |
| M-5 | Corregido | La prueba de recorte revisa también `esperado`. |
| M-6 | Corregido | `SIGLA_TIPO_TIENDA` tipado como `Record<TipoTienda, 'TG'\|'TM'\|'TE'>` (`constants/tiendas.ts`); `siglaBloque` sin cast; `nombreTamano` usa el mapa local `TIPO_POR_SIGLA` en vez de `find(...) as VersionTipo`. |

Verificación: `npm test` 71 pasan; `npx tsc -b` sin errores; oxlint de los archivos tocados sin hallazgos.
