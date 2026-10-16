# 05 — Revisión de seguridad e integridad del diff

Base: `2a06094` · Worktree `feat/importar-excel-bloque-tamano` · 6 archivos de `front/` (sin cambios en back, BD ni Postman).
Pruebas: `front: npm test` → 71/71 pasan (corrido en esta revisión).

## Veredicto

**Aprobado.** Sin hallazgos bloqueantes ni importantes; 2 menores que no impiden el commit.

## Controles del PLAN

| # | Control | Resultado | Evidencia |
|---|---|---|---|
| S1 | Tipo del bloque solo desde `version.tipo` | Cumple | `EditorPlanograma.tsx:423` y `LienzoPlanograma.tsx` (l. ~850) pasan `tipoVersion={version?.tipo}`; `version` sale de `versiones.find((v) => v.id === versionIdNumerico)` (l. 54 / l. 101), con el mismo `versionId` de la URL que se usa en el POST, así que tipo y destino no pueden quedar desalineados. El lector no deduce la sigla de `Planograma_<S>` ni de los títulos: `siglasEnNombre` solo genera errores, nunca elige el bloque. No hay selector ni valor por defecto. |
| S2 | Ignorar bloques ajenos no reduce la validación del bloque propio | Cumple | Las columnas elegidas (`columnas`, `excelProductosPlanograma.ts:454`) siguen pasando por el mismo bucle de reglas. Las columnas de otros bloques no se leen, así que no pueden aportar datos. Además el reconocimiento es más estricto que antes: `_t[a-z]` → `_(tg\|tm\|te)` y gancho `t[a-z]\d{1,2}` → `(tg\|tm\|te)\d{1,2}`. Prueba "un error en un bloque ajeno no bloquea; en el propio sí". |
| S3 | Sin tipo no se lee ni se envía nada | Cumple | `ImportarExcelProductosModal.tsx:155` hace `return` si falta `!tipoVersion`; el botón queda deshabilitado; `lectura` (lo único que habilita Importar) solo se asigna dentro de `leer()`. Aviso `AVISO_SIN_TIPO` visible al abrir (l. 146). |

Otros puntos revisados sin hallazgo:
- **Salida/XSS**: los valores del archivo que se muestran (`motivo`/`esperado` con «{valor}», `bloquesEnArchivo`) se pintan como texto JSX, sin `dangerouslySetInnerHTML`, y se recortan a 40 caracteres.
- **ReDoS**: `^(.+)_(tg|tm|te)$`, `^(tg|tm|te)\d{1,2}$` y `(?<![A-Za-z])(TG|TM|TE)(?![A-Za-z])` son lineales; no hay riesgo con encabezados o celdas largas.
- **Concurrencia de la UI**: durante `leer()` la zona de archivo y "Usar adjuntos" están `disabled`; elegir otro archivo limpia el aviso (`seleccionar`), y `cargarOtroArchivo` limpia `bloqueoLectura`.
- **Tipo fuera del catálogo**: `siglaBloque` devolvería `undefined`, pero `nombreTamano` lanza una excepción, `leer()` la captura y muestra un toast sin enviar nada (falla cerrado). El back limita `tipo` a GRANDE/MEDIANA/EXPRESS en `version.entity.js`.
- **Acceso**: `POST /versiones/:id/importar-productos` no cambia y sigue con `requiereAnalista, editarContenido` (`versiones.routes.js:82`).

## Hallazgos

### M1 — Menor · `front/src/utils/excelProductosPlanograma.ts:454`
**Escenario**: en un archivo de tres bloques donde un campo propio de cada bloque viene **sin sufijo** en el bloque TG (p. ej. `Observaciones` o `Cantidad`, igual que `Inner`) y no tiene su equivalente `_TM`, una versión MEDIANA toma la columna común. El resultado es que importa datos del bloque TG sin aviso. La precedencia es la que fija el PLAN y T5 lo verificó para ganchos y facings con el archivo real, pero no se verificó para los demás campos.
**Corrección sugerida**: no hace falta cambiar código ahora. Documentar en ESTADO_MODULOS (T6) que, en archivos con bloques, todo campo por bloque debe llevar sufijo. Si aparece un caso real, emitir un aviso cuando `bloquesEnArchivo.length > 1` y un campo de `CAMPOS` distinto de `sku`/`descripcion`/`modo` se resuelva desde la columna común.

### M2 — Menor (deuda preexistente, no la introduce el diff) · `back/` `importar-productos`
**Escenario**: la regla "solo el bloque de la versión" vive únicamente en el front. Un analista con permiso puede llamar al endpoint directamente (Postman, script o una versión vieja del front en caché) y cargar ganchos de otro tamaño. El permiso no se escala porque ese usuario ya puede editar el contenido, pero la regla de integridad no tiene respaldo en el back.
**Corrección sugerida**: ninguna en este cambio; el back queda fuera de alcance. Registrarlo junto a DT-26 (caso de uso de la importación) para que, cuando se haga, valide del lado del servidor lo que pueda (por ejemplo, el `planograma` informado contra `version.tipo`).

## Deuda detectada

- Ver M2: la validación del bloque y del `Planograma_<S>` es solo de cliente. Agregarlo como nota en DT-26; no amerita una DT nueva.
- Las DT de diseño (`#7a5900`, `BloqueoErrores`) ya las propone 04_implementacion; no son de seguridad.
