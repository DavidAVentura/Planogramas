# 05 — Revisión de seguridad e integridad del diff

- **Etapa**: 5 · **Fecha**: 2026-10-19 · **Base**: `b34524e` + archivos nuevos sin seguimiento (sin `.claude/launch.json`).
- Contra: `PLAN.md` (B1–B10, I1–I6, M3) y `02_seguridad.md`.
- Pruebas corridas: `cd back && npm test` → 337/337; `npx vitest run` de `descargaPorVersion.test.ts` y
  `excelProductosPlanograma.test.ts` → 63/63.

## Veredicto

**Aprobado.** Sin hallazgos Bloqueantes ni Importantes. Quedan 6 Menores (ninguno exige otra ronda; 3 ya están
como deuda propuesta en `04_implementacion.md`).

## Comprobación de controles

| # | Estado | Evidencia |
|---|---|---|
| B1 | Cumple | `implementacion.routes.js:16` `router.use(requiereAnalista)` antes de `router.post('/productos/exportar', validarCuerpo → exportacionPorVersionLimiter → controller.exportar)` (línea 27). `matrizPermisos.test.js`: `soloPLA009` con cuerpo `{}` → 403; sin sesión → 401. Ver Menor M6 (parser JSON antes del 403). |
| B2 | Cumple | `implementacion.schemas.js:17-28`: `Joi.number().strict()` (sin conversión desde texto), `unique`, 1–50 / ≤ 30 000, `formato` en `FORMATOS_DESCARGA`, `departamento` prohibido sin `area`; `validarQueryEstricta` sin `stripUnknown`. El controller usa `q` devuelto por Joi (`implementacion.controller.js:170-175`). Prueba de `__proto__` incluida. |
| B3 | Cumple | Listado: `parsearCodigoJerarquia` (`implementacion.controller.js:62-68`) rechaza arreglo, vacío y patrón inválido antes de CATI. `resolverJerarquia` se ejecuta antes de leer posiciones (`implementacion.usecases.js:308`) y no captura errores: CATI caído → 503 (`catiClient.js:17-23`), nunca lista sin filtrar. Igual en exportar (antes del semáforo). |
| B4/B5 | Cumple | Universo = `versionIds` (cargados por el servidor) ∩ `skus` de CATI; `posicionIds` solo intersecta en memoria (`consolidado.entity.js:175-176`), nunca va a SQL. `posicionIds: []` → 0 filas (no "todo"): el front envía el arreglo vacío cuando hay filtros (`descargaPorVersion.ts:79`). Regla D3 probada (`consolidado.test.js`, `implementacionUsecases.test.js`). |
| B6 | Cumple | `construirFilasPorVersion(base, { estados = ESTADOS_MONTABLES, … } = {})`; el consolidado no pasa opciones; prueba "sin opciones: solo piloto y publicado". Pruebas del consolidado solo cambian el `require` del semáforo. |
| B7 | Cumple (con M4) | Orden D10 en `ordenarPivote`; cantidades como `numero` y `Varía` como texto (`exportacionPorVersion.entity.js:180-200`); `Modo`/`Decision_final` con etiquetas del lector; prueba del lector real con fila de grupo y `Varía` → error bloqueante. Literal duplicado sin prueba cruzada (M4). |
| B8 | Cumple | `validarPivote` en dominio (`exportacionPorVersion.entity.js:54-80`), especial = `version_base_id` no nulo (`implementacion.repository.js:58`), 422 con `sinTipo`/`duplicadas`/`soloEspeciales`; hoja `Versiones` con Incluida/Motivo. |
| B9 | Cumple | Instancia única `semaforoExportacion` (`application/compartido/semaforo.js`) en ambos controllers (prueba de identidad); tomado después de CATI y antes de `cargarBaseVersiones`, liberado en `finally` (`implementacion.usecases.js:501-519`); pruebas tras error de repo, de libro y de tope. |
| B10 | Cumple | `contarFilas` antes de `escribirLibro`; cabeceras fijadas tras el `Buffer` (`implementacion.controller.js:182-188`); prueba "generador lanza → 500 JSON sin `Content-Disposition`". |
| I1 | Cumple | `productosPorVersionLimiter` 60/min tras `requiereAnalista` (`implementacion.routes.js:23`); prueba 61.ª → 429. |
| I2 | Cumple | `area` ∈ `obtenerAreas()` y `departamento` ∈ `obtenerDepartamentos(area)` antes de `listarSkusPorJerarquia` (`implementacion.usecases.js:406-421`); solo se crean entradas de caché con códigos válidos. |
| I3 | Cumple | Área/Departamento de la Lista desde `Producto.categoria_nivel1/2` (`baseVersiones.js:80-81`); 3 llamadas máx. a CATI por petición, probado con espía. |
| I4 | Cumple | `baseVersiones.js`: solo `whereIn` con subconsulta o ≤ 50 ids; sin `raw`. |
| I5 | Cumple | `nombreArchivo` solo con formato enumerado y fecha; títulos de grupo por `sanear` (`libroXlsx.js:59`), prueba con `=HYPERLINK(...)\u0007`; celdas por `construirCelda`. |
| I6 | Cumple | Log (`implementacion.controller.js:177-180`): `numeroEmpleado`, formato, nº de versiones, `filtroCliente` si/no, filas, ms. Sin ids, jerarquía ni token. |
| M3 | Cumple | Botón solo en `ProductosPorVersion`; nombre armado en el front; `URL.revokeObjectURL`; `onFilasFiltradas` opcional (el Implementador no la pasa). |

## Hallazgos

### Bloqueantes
Ninguno.

### Importantes
Ninguno.

### Menores

**M1. Orden del Pivote no determinista entre planogramas con el mismo nombre.**
- `back/src/domain/implementacion/exportacionPorVersion.entity.js:92-96` desempata por `planogramaNombre` y luego
  estado y modo, sin `planogramaId`.
- Escenario: SKU 123 en "PINTURAS" (id 4) y en otro planograma también llamado "PINTURAS" (id 9), ambos TG
  publicados. El orden de las dos filas depende del orden de llegada desde SQL (sin `ORDER BY`); al reimportar en
  una versión TG gana la primera, así que el resultado puede cambiar entre dos descargas iguales (contradice B7(a)).
- Corrección: agregar `|| a.planogramaId - b.planogramaId` después del nombre (y en `ordenarLista`, `versionId`
  después del código).

**M2. Más de 30 000 filas visibles con filtros → error genérico.**
- `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx:143` envía `filasVisibles.posicionIds` sin tope; el
  esquema lo rechaza (`implementacion.schemas.js:27`) con 400 y el usuario ve "No se pudo generar el archivo".
- Escenario: 50 versiones grandes + búsqueda amplia que deja 31 000 posiciones. Falla segura (no se descarga nada
  de más), solo es un mensaje confuso.
- Corrección: si `posicionIds.length > 30000`, deshabilitar Descargar con un `title` explicativo, o mapear el 400 a
  "Acota la búsqueda o elige menos versiones".

**M3. `details` del 503 de CATI con `causa.message` ahora alcanzable desde el listado y la descarga.**
- `back/src/infrastructure/cati/catiClient.js:21` (preexistente, igual que DT-15 en CAO). Con `area` presente, un
  fallo de red devuelve al navegador `details` con el mensaje interno de `fetch` (p. ej. `connect ECONNREFUSED <ip>:443`).
- Corrección (fuera de este cambio): no copiar `causa.message` a `details`; registrarlo en el log. Ampliar DT-15 o
  registrar deuda nueva.

**M4. Literal de encabezados del Pivote duplicado sin prueba cruzada** (`columnasExportacion.js:28-43` y
`front/src/domain/implementacion/descargaPorVersion.ts`). Un cambio en un solo lado rompe la reimportación sin que
falle ninguna prueba. Ya propuesto como DT-77.

**M5. 413 con `code: 'ERROR'`** (`errorHandler.js:28`; el error de `express.json` no trae `code`). Forma estándar
correcta y sin detalle interno; ya propuesto como DT-76.

**M6. El parser JSON responde antes que la autorización.**
- `back/src/infrastructure/http/app.js:32` (y el parser global) corre antes de `autenticacion`/`requiereAnalista`:
  un solo-implementador con JSON mal formado o cuerpo > 512 kb recibe 400/413 en lugar de 403. No expone detalles de
  validación del esquema (el 403 sí gana sobre el 400 de Joi), así que B1 se cumple en lo esencial. Aceptable;
  dejarlo dicho en el contrato.

## Deuda detectada

- Confirmo DT-71 a DT-77 propuestas en `PLAN.md` y `04_implementacion.md`.
- Nueva (Baja): M3 — `catiClient` expone `causa.message` en `details` del 503 (equivalente a DT-15 para CATI).
- M1 y M2 se pueden corregir en este mismo cambio (una línea cada uno); si no, registrarlos como deuda Baja.
