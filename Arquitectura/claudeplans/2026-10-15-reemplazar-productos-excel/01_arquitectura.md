# 01 — Arquitectura: reemplazar productos del Excel y recargar las versiones de Limpieza

## 1. Entendimiento

Las versiones cargadas con el lector anterior tienen en "Por ubicar" datos de un bloque equivocado (TG
mezclado o TG en lugar de TM/TE). Reimportar no corrige porque `filtrarProductos` omite los SKU que ya
están en la versión. Se pide: (1) una opción permanente **"Reemplazar productos"** en el modal de
importación y (2) una recarga **ahora**, solo en DEV, de todas las versiones de Limpieza desde su Excel
adjunto, con simulación previa.

Casos de uso: importación de Excel a "Por ubicar" (sin `CU-XX` propio, **DT-26**), `CU` de adjuntos de
versión (módulo 13, solo lectura/descarga) y edición de contenido de la versión (permiso
`EDITAR_VERSION`/`EDITAR_LIENZO`).

## 2. Flujo de proceso

**Importación con reemplazo (por versión, analista):**
1. El analista abre "Importar Excel", elige archivo o adjunto, lee y revisa la vista previa (igual que hoy).
2. Marca **"Reemplazar productos de 'Por ubicar'"**. El modal muestra cuántos productos hay hoy en
   "Por ubicar" y cuántos SKU ya están ubicados en góndolas reales (estos no se tocan).
3. Confirma. El back, en **una sola transacción**: vacía la góndola "Por ubicar" e inserta los productos
   del Excel. Si algo falla, no cambia nada.
4. Respuesta: importados, eliminados, omitidos (ahora con motivo "Ya está ubicado en la versión") y
   advertencias.

Estados: solo versiones editables (`borrador`, `en_desarrollo`, `piloto`); `publicado`/`archivado` → 422,
como hoy. La versión no cambia de estado.

**Recarga masiva (una vez en DEV, analista con permiso de edición):**
1. Elige departamento (Limpieza) → la herramienta lista planogramas no archivados y sus versiones.
2. **Simulación** (obligatoria, sin escribir): por versión descarga el `.xlsx` adjunto, lo lee con el
   lector del front para el bloque de su tipo y arma un reporte.
3. El analista revisa el reporte, corrige el adjunto elegido donde haga falta y pulsa **Ejecutar** sobre
   las versiones "listas". Se procesan **de una en una**, cada una atómica; el reporte final marca
   éxito/fallo por versión. Repetir es seguro (idempotente: reemplaza de nuevo).

## 3. Impacto por capa

| Capa | Archivo / módulo | Cambio |
|---|---|---|
| Dominio | `back/src/domain/importacion/importacion.entity.js` | `filtrarProductos(filas, skusEnVersion, { motivoExistente })` — mensaje distinto en modo reemplazo ("Ya está ubicado en la versión"). Lógica pura, con prueba. |
| Dominio | `back/src/domain/importacion/importacion.usecases.js` | `importarProductos` acepta `datos.reemplazar`: usa `skusUbicados` en lugar de `skusDeVersion` y llama `reemplazarPorUbicar`. Devuelve `eliminados`. |
| Dominio | `back/src/domain/importacion/importacion.repository.js` (contrato) | Documentar `skusUbicados(versionId)` y `reemplazarPorUbicar(versionId, posiciones)`. |
| Infraestructura | `back/src/infrastructure/repositories/importacion.repository.js` | `skusUbicados` (igual a `skusDeVersion` + `Gondola.por_ubicar = 0`). `reemplazarPorUbicar`: en una transacción, `vaciarGondola` de la "Por ubicar" existente (helper ya existe) + llenado (extraer el cuerpo de `importarPorUbicar` a `llenarPorUbicar(trx, …)` y reutilizarlo en ambos); si no hay posiciones que insertar, elimina la góndola vacía (misma regla que `aplicarCruce`). Devuelve `{ id, creada, totalNiveles, eliminados }`. Cuidar `Math.max()` sin niveles. |
| Aplicación | `back/src/application/importacion/importacion.schemas.js` | `reemplazar: Joi.boolean().default(false)` en `schemaImportarProductos`. |
| Aplicación / ruta | `importacion.controller.js`, `versiones.routes.js` | Sin cambios (misma ruta, mismos permisos). |
| BD | — | Sin migración. |
| Front · tipos/servicio | `front/src/types/importacionProductos.ts`, `front/src/services/importacionProductos.service.ts` | `importar(versionId, productos, { reemplazar })`; `eliminados` en el resultado. |
| Front · modal | `ImportarExcelProductosModal.tsx` | Casilla "Reemplazar productos", conteo previo y confirmación. Mensajes de resultado. |
| Front · utilidades | `front/src/utils/recargaExcel.ts` (nuevo) + `.test.ts` | Lógica pura de la recarga: elegir adjunto (`elegirAdjuntoExcel`), clasificar resultado de lectura (`estadoSimulacion`), aviso de planograma ajeno. Reutiliza `interpretarHojaProductos`/`leerExcelProductos`, `bloqueoDeLectura`, `erroresDeCatalogo`, `descargarAdjuntoComoArchivo`. |
| Front · hook/página | `front/src/hooks/useRecargaExcel.ts`, `front/src/pages/RecargaExcel/` (nuevo) + ruta | Herramienta de recarga por departamento: simular → ejecutar secuencial. Solo visible con permiso de edición. |
| Docs | `Contratos/20_importacion/POST_versiones_importar_productos.md`, `ENDPOINTS.md`, `ESTADO_MODULOS.md` | Flag `reemplazar`, `eliminados`, nuevo motivo de omitido. |
| Postman | `postman/planogramas-import.postman_collection.json` | Casos con `reemplazar: true` (ver §4). |

## 4. Contratos

`POST /api/v1/versiones/{id}/importar-productos` — **modificado, retrocompatible** (contrato existente en
`Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`).

Request: igual + `"reemplazar": false` (opcional, por defecto `false`).

Response `201`:
```json
{ "gondola": { "id": 812, "creada": false, "totalNiveles": 7 } | null,
  "totalImportados": 64, "eliminados": 61,
  "omitidos": [{ "sku": "123", "motivo": "Ya está ubicado en la versión" }],
  "advertencias": [] }
```
- `eliminados`: posiciones quitadas de "Por ubicar" (0 si `reemplazar` es `false`).
- Con `reemplazar: true`, los SKU que estaban **solo** en "Por ubicar" ya no se omiten; los que están en
  góndolas reales se omiten con el motivo nuevo. Repetidos en el archivo: igual que hoy.
- `gondola: null` si al final "Por ubicar" quedó vacía y se eliminó (o no existía y no hay nada que importar).

Errores (sin cambios de código): `400` validación (incluye `reemplazar` no booleano), `401`, `403` sin
`EDITAR_VERSION`/`EDITAR_LIENZO`, `404` versión, `422` versión no editable o accesorios inexistentes (se
valida **antes** de borrar: todo o nada).

No hay endpoints nuevos: la recarga masiva orquesta en el front endpoints existentes
(`GET /planogramas?departamento=`, `GET /planogramas/:id/versiones`, `GET /versiones/:id/adjuntos`,
`GET /adjuntos/:id/url-descarga`, `GET /versiones/:id/skus` o `/gondolas` para el conteo, y el `POST` de arriba).

Postman (carpeta Importación): reemplazar en versión con "Por ubicar" (verifica `eliminados` > 0 y que
un segundo envío idéntico da los mismos totales), reemplazar con SKU ubicado (motivo nuevo),
`reemplazar: "si"` → 400, reemplazar en versión publicada → 422 sin borrar.

## 5. Datos

- **Sin migración** (siguiente libre sería `017`). No cambia el esquema.
- Qué se borra con `reemplazar: true` — **solo el contenido de la góndola `por_ubicar = 1` de la versión**:
  `PosicionAccesorio` de sus posiciones → `Posicion` → `Nivel` → `Seccion` (con `vaciarGondola`). La fila
  `Gondola` "Por ubicar" **se conserva y se reutiliza** (mismo id), salvo que quede vacía al final.
- No se tocan: góndolas reales y sus posiciones (aunque tengan el mismo SKU), `EvidenciaImplementacion`
  (cuelga de góndola con CASCADE: conservar la fila evita borrarlas), `HistorialSustitucion` (sin FK a
  `Posicion`; el módulo 06 no está implementado), `Adjunto`.
- Retrocompatible: sin el flag el comportamiento es idéntico al actual.
- Índices: sin cambios. `PosicionAccesorio.posicion_id` sin índice (**DT-24**) hace más lento el borrado;
  aceptable con ≤ 1000 productos por versión.

## 6. Rendimiento y escalabilidad

- Borrado: 4–5 sentencias por subconsulta, sin N+1. Inserción: igual que hoy (una por posición con
  accesorios, en lotes de 100 sin ellos). ≤ 1000 productos por request (tope actual).
- Transacción: el borrado y la inserción van en la misma `db.transaction`. La lectura de `skusUbicados`
  y del estado de la versión sigue fuera de la transacción (**DT-20**): si alguien mueve un producto de
  "Por ubicar" a una góndola real durante el reemplazo, ese SKU puede quedar duplicado. Se mitiga
  leyendo `skusUbicados` **dentro** de la transacción de `reemplazarPorUbicar` y filtrando ahí las
  posiciones (el repositorio recibe las posiciones y descarta las de SKU ubicado, devolviéndolas como
  omitidas). Decisión: hacerlo así en el camino `reemplazar` (no cierra DT-20 para el camino normal).
- Recarga masiva: secuencial, una versión a la vez (evita bloqueos y la ráfaga a CATI por
  `asegurarExistencia`). Volumen esperado: decenas de versiones; cada una ≤ unos segundos. Sin
  rate-limit en estas rutas. Si el usuario cierra la pestaña a mitad, lo hecho queda hecho y lo
  pendiente se reintenta (idempotente).

## 7. Alternativas descartadas y decisión

Dónde leer el Excel de la recarga masiva:
- **Portar el lector al back** (con `exceljs`/`read-excel-file/node`): duplica ~600 líneas de reglas que
  acaban de cambiar y agrava DT-29. Descartada.
- **Script Node en `front/` que importe el lector TS** (con `tsx` o Vitest como runner): reutiliza el
  lector, pero exige un paquete nuevo o abusar de Vitest, manejar un JWT de CAO fuera del navegador y
  duplicar la orquestación de errores del modal. Descartada.
- **Script directo contra BD + Blob** (credenciales del `.env`): salta permisos, auditoría y las
  validaciones del endpoint. Descartada.
- **Solo la opción del modal, versión por versión**: suficiente si son pocas versiones, pero el usuario
  pidió recargar todas ahora y con simulación; se queda como respaldo manual.

**Decisión recomendada:**
1. Flag `reemplazar` en el endpoint existente, borrado acotado a "Por ubicar", todo en una transacción.
2. Recarga masiva como **herramienta en el front** ("Recargar productos desde adjuntos", filtrada por
   departamento) que reutiliza `UsarAdjuntos`/`descargarAdjuntoComoArchivo`, `leerExcelProductos`,
   `bloqueoDeLectura` y `erroresDeCatalogo`, y llama al mismo endpoint con `reemplazar: true`. Cero
   duplicación de lectura, sin paquetes nuevos, usa la sesión y permisos CAO del analista, y sirve igual
   para PROD cuando se decida (sin código adicional, solo ejecutarla allá).
3. **Simulación** en el front (no escribe): por versión → planograma, código, tipo/bloque, estado,
   adjunto usado, productos leídos, filas omitidas, errores de celda, accesorios fuera de catálogo,
   productos hoy en "Por ubicar", SKU ya ubicados (se omitirán), aviso si la columna `Planograma_XX` no
   coincide con el código, y estado final: **Lista**, **Sin Excel**, **Varios Excel (elegir)**,
   **Con errores**, **No editable**. Solo las "Lista" se pueden ejecutar.
4. Elección de adjunto: filtrar `.xlsx` (mismo `cumpleAccept`); 0 → "Sin Excel" (se salta); 1 → ese;
   >1 → por defecto el más reciente (`createdAt`), marcado "Varios Excel" y con selector para cambiarlo;
   no se ejecuta hasta que el analista lo confirma.
5. "Limpieza" = valor de `Planograma.departamento` elegido en un filtro (no se cablea en código).
   Planogramas archivados se excluyen; versiones `publicado`/`archivado` se reportan "No editable" y no
   se tocan.

## 8. Preguntas abiertas

1. Versiones de Limpieza **publicadas** con datos erróneos: ¿se dejan como están (recomendado: la regla
   de editable no se rompe; se corrigen con una versión nueva) o hay que tratarlas aparte?
2. ¿La herramienta de recarga queda **permanente** en el menú del analista (recomendado, sirve para
   PROD) o se retira tras usarla en DEV?
3. Valor exacto de `departamento` para Limpieza en DEV (ej. `LIMPIEZA` vs. código + nombre): se
   confirma en la simulación; si hay planogramas de Limpieza con otro valor de departamento, hay que
   saberlo.

## 9. Para UX y para Seguridad

**UX:**
1. Casilla "Reemplazar productos" en el modal: texto que deje claro que solo se vacía "Por ubicar" y que
   los SKU ya ubicados no se tocan; conteo previo y confirmación con `ConfirmDialog` (acción destructiva).
2. Mensaje de resultado con importados / eliminados / omitidos (motivo nuevo).
3. Página de recarga: tabla de simulación (estados como `Badge`, detalle expandible de errores),
   selector de adjunto cuando hay varios, selección de filas "Lista".
4. Progreso de la ejecución secuencial (versión actual, n de N) y reporte final exportable/copiable.
5. Dónde vive el acceso (menú del analista o enlace desde el listado de planogramas) y estados vacíos.

**Seguridad e integridad:**
1. Mismo control de permisos (`requiereAnalista` + `editarContenido`) para `reemplazar`; la página de
   recarga se oculta sin permiso, pero la autoridad es el back.
2. Atomicidad: validaciones (versión editable, accesorios, tope) **antes** de borrar; borrado + inserción
   en la misma transacción; `skusUbicados` dentro de ella (§6).
3. Alcance del borrado: solo la góndola `por_ubicar` de **esa** versión (filtrar por
   `planograma_version_id`); nunca evidencias ni góndolas reales.
4. Descarga de adjuntos con SAS de solo lectura ya existente; validar `.xlsx` y `MAX_BYTES_EXCEL` antes
   de leer; un archivo malicioso solo afecta al navegador del analista.
5. Trazabilidad: el reemplazo borra datos sin registrar quién (**DT-25**); valorar si sube de severidad.

## 10. Deuda detectada

- **DT-20** (Media): el reemplazo la agrava (borra y reinserta); se mitiga en ese camino (§6); el camino
  normal sigue abierto.
- **DT-25** (Baja → sugerida **Media**): con borrado masivo, no saber quién reemplazó pesa más.
- **DT-26** (Baja): sigue sin `CU` la importación; conviene redactarlo al documentar este cambio.
- Nueva sugerida (Baja): el resultado de la simulación no valida la existencia de SKU en CATI (solo lo
  hace el `POST`); los SKU inexistentes aparecen como advertencias al ejecutar, no en la simulación.
