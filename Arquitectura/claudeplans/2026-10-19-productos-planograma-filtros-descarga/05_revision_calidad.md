# 05 — Revisión de calidad: filtro Área › Departamento y descarga `.xlsx` en Productos por planograma

Diff revisado: `git diff b34524e` más los archivos nuevos sin seguimiento (sin `.claude/launch.json`), comparado con
`PLAN.md` y `04_implementacion.md`.

## Verificación ejecutada

- `cd back && npm test`: 337/337 en verde.
- `cd front && npx vitest run`: en verde. `npx tsc -b`: sin errores. `oxlint src`: solo avisos que ya existían, en archivos que este cambio no toca.
- Postman: el JSON es válido (`JSON.parse`).
- `write-excel-file@4.1.1` acepta `columns`, `stickyRowsCount` y `stickyColumnsCount` por hoja en el modo de varias hojas (lo confirmé en el README y en `commonjs/xlsx/features/stickyRowsOrColumns.js`).

## Criterios de aceptación (resumen)

T1–T13 y T15 cumplen sus criterios. Lo comprobé en el código y en las pruebas: semáforo único con prueba de identidad; `construirFilasPorVersion` con `estados/skus/posicionIds` y la regla D3 con la numeración de ganchos de la versión completa; `baseVersiones.js` parametrizado con `whereIn` y sin `raw`; orden C2 (404 → 422 Pivote → CATI → semáforo → base → tope → libro, con `finally`); cabeceras fijadas solo después del `Buffer`; esquema estricto; orden `requiereAnalista → validarCuerpo → limitador`; limitadores 5/min y 60/min; parser propio de 512 kb; `CadenaJerarquia niveles={2}`; `onFilasFiltradas` opcional, sin bucle (la página compara antes de actualizar); modal con avisos previos del Pivote y errores según `mensajeErrorDescargaPorVersion`.

Las desviaciones 1–12 de `04_implementacion.md` están justificadas. Lo más relevante:
- **Inventario completo con jerarquía (desv. 1)**: corrige un defecto que el plan habría introducido en `versiones[]`.
- **`archivado` exportable (desv. 2)**: evita bloques vacíos sin aviso.
- **`departamento` exige `area` también en Joi (desv. 6)**.

T14 (documentación) sigue pendiente; la hace el coordinador.

## Hallazgos

### Bloqueantes

Ninguno.

### Importantes

Ninguno.

### Menores

**M1 — Campos nuevos de la fila agregada que se filtran a la respuesta del consolidado, uno de ellos engañoso.**
`back/src/domain/consolidado/consolidado.entity.js:84-85` y `:109-115`.
- **Problema.** `construirFila` agrega `tipoVersion`, `esEspecial` y `variaciones`. Esas filas se meten tal cual en `grupo.planograma` / `grupo.otras` (`:217-222`), que es lo que devuelve `GET /consolidado`.
- **Escenario.** `consolidado.repository.cargarBase` no lee `tipo` ni `version_base_id`. Por eso, en el consolidado, toda fila sale con `tipoVersion: null` y `esEspecial: false`, también cuando la versión montada es especial de tienda. Hoy ningún cliente lo usa, pero cambia el contrato del módulo 21 (B6 pedía que el consolidado no cambiara) y deja un dato falso a la vista.
- **Corrección.** Una de dos:
  - completar `tipo` y `esEspecial` en `cargarBase` (`PlanogramaVersion.tipo`, `version_base_id IS NOT NULL`);
  - o quitar `tipoVersion`, `esEspecial` y `variaciones` al armar los grupos del consolidado.

  Si se deja como está, documentarlo en `Contratos/21_*` en T14.

**M2 — Más de 30 000 filas visibles con filtros de cliente terminan en un toast genérico.**
`front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx:143`.
- **Problema.** Con búsqueda o filtros de columna activos se mandan todos los `posicionIds` visibles. El esquema rechaza más de 30 000 con `400 VALIDATION_ERROR`, y `mensajeErrorDescargaPorVersion` lo convierte en "No se pudo generar el archivo. Intenta de nuevo."
- **Escenario.** 50 versiones grandes y una búsqueda amplia (por ejemplo "a"). Reintentar no sirve y el usuario no sabe por qué falla.
- **Corrección.** En el front, si `posicionIds.length > 30000`, mostrar en el modal un aviso específico ("Demasiadas filas filtradas para la descarga; acota con Área y Departamento o con menos versiones"). Otra opción: no mandar `posicionIds` y avisar. El tope puede vivir junto a `construirCuerpoExportacion`.

**M3 — Lógica de descarga de `Blob` duplicada por tercera vez.**
`front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx:147-153`. El mismo bloque está en `ConsolidadoTiendas.tsx:174-180` y en `ModalExportarLienzo.tsx:28`.
- **Problema.** Las tres copias hacen lo mismo: `createObjectURL` → enlace → `click` → `revokeObjectURL`.
- **Corrección.** Extraer `descargarBlob(blob, nombre)` a `front/src/utils/` y usarlo en los tres sitios. Puede quedar como deuda si no se quiere tocar el consolidado en este cambio.

**M4 — Orden del Pivote sin desempate por planograma.**
`back/src/domain/implementacion/exportacionPorVersion.entity.js:92-97`.
- **Problema.** `ordenarPivote` ordena por SKU → `planogramaNombre` → estado → modo.
- **Escenario.** Dos planogramas distintos con el mismo nombre: sus filas del mismo SKU pueden quedar intercaladas por estado (A-publicado, B-publicado, A-piloto…). El orden sigue siendo determinista (viene del orden de `listarVersiones`), pero no agrupa por planograma.
- **Corrección.** Agregar `|| a.planogramaId - b.planogramaId` después del nombre.

**M5 — Literal `13` repetido.**
`back/src/domain/implementacion/exportacionPorVersion.entity.js:181`.
- **Problema.** `Array.from({ length: 13 + nGanchos }, …)` repite a mano la longitud de `CAMPOS_BLOQUE_PIVOTE`. Si se agrega un campo al bloque, los bloques vacíos quedan desalineados con el encabezado.
- **Corrección.** Usar `CAMPOS_BLOQUE_PIVOTE.length`.

**M6 — Accesorios del Pivote: nombres sin repetir y tamaños sin deduplicar.**
`back/src/domain/implementacion/exportacionPorVersion.entity.js:165-178`.
- **Problema.** `Nombre_accesorio` une los códigos distintos y `Tamano_accesorio` une un tamaño por accesorio.
- **Escenario.** Con accesorios `{A,22}`, `{B,12}`, `{A,12}`, el archivo trae `A // B` y `22" // 12" // 12"`. Al reimportar, el lector (`accesoriosDeCeldas`) da error "2 nombres y 3 tamaños". Es una falla segura (no asigna mal), pero la fila no se puede reimportar.
- **Corrección.** Escribir un código por accesorio (con repetidos), alineado con los tamaños, cuando no todos los tamaños son iguales. O documentarlo como limitación en el contrato C3.

**M7 — Resumen del modal con 0 versiones mientras cargan las elegibles.**
`front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx:118-124`.
- **Problema.** `versionesElegidas` sale de `versiones ?? []`. El botón Descargar no espera a `versiones`: solo mira `productos` y `cargando`.
- **Escenario.** Si `useVersionesPorVersion` tarda más que la consulta de productos, el modal muestra "Versiones: 0 ·" y no puede avisar del Pivote antes de pedirlo. El servidor sigue validando, así que no hay error de datos.
- **Corrección.** Agregar `versiones === null` a `descargaDeshabilitada`.

**M8 — Doble validación del cuerpo.**
`back/src/infrastructure/http/middlewares/validarCuerpo.js` y `implementacion.controller.js:105`.
- **Problema.** Hasta 30 000 ids se validan dos veces con Joi por petición. Es intencional (los 400 no gastan cupo y el controller usa el valor devuelto por Joi) y el costo es bajo.
- **Corrección (opcional).** Que `validarCuerpo` guarde el valor validado (por ejemplo en `res.locals.cuerpo`) y que el controller lo reutilice.

### Deuda

Sin deuda nueva aparte de la que el plan y `04_implementacion.md` ya proponen (DT-71 a DT-78). Si M1 o M3 no se corrigen ahora, conviene registrarlos.

## Veredicto

**Aprobado con menores.** 0 bloqueantes, 0 importantes, 8 menores.
