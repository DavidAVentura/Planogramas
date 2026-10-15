# PLAN — Reemplazar productos importados del Excel y recargar las versiones de Limpieza (back + script)

> ⏸ **PENDIENTE — no implementar todavía.** Sin aprobación 1. Antes de desarrollar: diseño de front y
> actualización de este plan (ver "Estado" en `00_solicitud.md`).

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Trabajar solo en el worktree `.claude/worktrees/importar-excel-bloque-tamano` (rama
> `feat/reemplazar-productos-excel`). No leer ni editar `.env`.

## Objetivo

Las versiones cargadas con el lector anterior tienen en "Por ubicar" datos del bloque equivocado (TG
mezclado, o TG en lugar de TM/TE), y reimportar no las corrige porque se omiten los SKU que ya están
en la versión. Este cambio agrega al back: (1) la bandera `reemplazar` en `POST /versiones/:id/importar-productos`
(vacía "Por ubicar" y carga de nuevo en una sola transacción) y (2) una **recarga masiva por departamento**
que descarga el `.xlsx` adjunto de cada versión, lo lee en el back con las mismas reglas del front y
reemplaza "Por ubicar". La recarga se usa desde un **script de terminal** (simulación y ejecución) y queda
como servicio reutilizable para la pantalla que construirá la feature siguiente. **Este cambio no toca el front.**

## Decisiones

| Decisión | Razón |
|---|---|
| El lector del Excel se **porta al back** (`domain/importacion/excelProductos.js`, JS puro) como espejo de `front/src/utils/excelProductosPlanograma.ts`, con **todas** las pruebas del front portadas. | El usuario pidió todo en el back y ejecución por terminal. La paridad se protege con pruebas espejo (control S16). Cambia la recomendación de `01_arquitectura.md` (herramienta en el front). |
| Paquete nuevo en `back`: **`read-excel-file` `9.3.10`** (misma versión exacta del front), en `dependencies`, entrada `read-excel-file/node` cargada con `require` **perezoso** dentro de la función de lectura. | Mismo parseo de celdas que el lector ya probado en el front → paridad. El paquete expone una entrada CommonJS (`exports["./node"].require = ./node/index.cjs`), así que no hace falta `import()` dinámico. Se descarta `exceljs` (más dependencias, otro parseo de tipos). Va en `dependencies` porque la feature siguiente lo usará desde un endpoint y el workflow instala con `--omit=dev`. |
| La lectura del archivo (librería) vive en infraestructura (`infrastructure/excel/lectorExcel.js`); la interpretación de la hoja es dominio puro. | Hexagonal: el dominio no depende de la librería; las pruebas no cargan `read-excel-file`. |
| `reemplazar` por HTTP **respeta la regla de versión editable** (`borrador`, `en_desarrollo`, `piloto`); `publicado`/`archivado` → 422 sin borrar. | Control S5. La excepción para publicadas no es alcanzable por HTTP. |
| La recarga masiva usa un **caso de uso distinto**, `recargarVersion`, con la lista cerrada `ESTADOS_RECARGA_MASIVA = ['borrador','en_desarrollo','piloto','publicado']`. `archivado` siempre prohibido; planogramas `archivado` excluidos. Ningún controller ni ruta lo importa en este cambio. | El usuario pidió recargar también publicadas y piloto (respuesta a preguntas abiertas); Seguridad exige que la excepción no sea un campo del body. |
| El borrado se limita a **todas** las góndolas `por_ubicar = 1` de la versión: se conserva la de menor id (vaciada), las demás se vacían y eliminan; si al final no hay posiciones que insertar, se elimina también la conservada. | Controles S2 y S4; idempotencia aunque DT-20 haya dejado dos "Por ubicar". |
| Dentro de la transacción del reemplazo: primero `PlanogramaVersion` con `forUpdate()` (UPDLOCK) y revalidación del estado; luego respaldo (si se pidió); luego vaciado; luego `skusUbicados` (góndolas `por_ubicar = 0`) y filtrado; luego inserción; luego `updated_at` de la versión. | Controles S1, S3, S13. Serializa reemplazos concurrentes y mitiga DT-20 en este camino. |
| En modo reemplazo, los SKU que están **solo** en "Por ubicar" ya no se omiten; los que están en góndolas reales se omiten con el motivo **"Ya está ubicado en la versión"**. Repetidos en el archivo: igual que hoy ("Repetido en el archivo"). | Es la corrección que se busca: recargar lo que está en "Por ubicar" sin duplicar lo ya ubicado. |
| `reemplazar: Joi.boolean().strict().default(false)`. | Control S20: bandera destructiva, booleano real (`"true"`, `1` → 400). |
| El script exige **token CAO por stdin** (sin eco), lo valida con `caoAuthClient.validarToken` y exige `esAnalista(usuario)` (que incluye PLA005 y PLA006); corre todo dentro de `ejecutarConContexto`. | Control S6: identidad del operador y JWT para CATI (`asegurarExistencia`). `esAnalista` es la misma regla que `requiereAnalista` + `editarContenido` de la ruta HTTP. |
| `--ambiente=dev|prod` obligatorio, sin default, con tabla constante `dev → OTB / adjuntos-dev`, `prod → db-planogramas / adjuntos`; con `prod` además `--confirmar-bd=db-planogramas` y confirmación interactiva `PROD`. | Control S7. PROD queda fuera de este cambio pero la herramienta es permanente. |
| **Simulación por defecto**; escribe un archivo de plan JSON. La ejecución solo procesa el plan (`--ejecutar --plan=<archivo>`) y revalida cada versión (ambiente/BD, departamento, estado, adjunto, SHA-256). | Controles S8 y S9. |
| "Varios Excel" no se ejecuta salvo `--adjunto=<versionId>:<adjuntoId>` en la **simulación** (queda en el plan). La simulación informa con el más reciente pero marca `VARIOS_EXCEL`. | Control S9: el adjunto elegido se revisa antes de borrar. |
| Si la columna `Planograma_XX` trae valores y ninguno coincide (normalizado: trim, espacios colapsados, mayúsculas) con `PlanogramaVersion.codigo`, la versión queda `CON_ERRORES` (motivo `PLANOGRAMA_DISTINTO`), salvo `--aceptar-planograma=<versionId>` en la simulación. Si la versión no tiene código o el archivo no trae la columna, no se compara. | Control S15 lo exige bloqueante; el formato del código en DEV es variable (`AUTOS TG-03`), por eso existe la aceptación explícita por versión. |
| La validación de los productos leídos pasa por `validarBody(schemaImportarProductos, { productos })` antes del caso de uso (el servicio de recarga vive en `application/`, que puede usar Joi). | Control S15: el script no pasa por el controller. |
| Respaldo antes de borrar: el repositorio llama a un `respaldar(contenido)` inyectado **dentro** de la transacción, después del bloqueo y antes del vaciado; si falla, rollback y la versión no se toca. Archivos en `back/scripts/salidas/` (en `.gitignore`). | Control S13: se respalda exactamente lo que se borra. |
| Sin endpoints nuevos para la recarga en este cambio. El servicio y la forma del reporte quedan estables y documentados para la feature siguiente. | El usuario pidió solo back + script; exponer la escritura en publicadas por HTTP requiere su propia revisión de seguridad. |
| Sin migración. El índice único filtrado de "Por ubicar" se registra como deuda. | No cambia el esquema; la limpieza de duplicados es previa a ese índice. |

## Fuera de alcance

- **Front (feature siguiente)**: casilla "Reemplazar productos" en `ImportarExcelProductosModal` (con
  `ConfirmDialog`, conteo previo y `eliminados` en el resultado; tipos en `front/src/types/importacionProductos.ts`
  y servicio `importacionProductos.service.ts`), pantalla de recarga por departamento (simular → elegir
  adjunto → ejecutar secuencial), endpoints HTTP que envuelvan `recargaExcel.service.js` (con su revisión de
  seguridad y UX), y delegar la lectura del Excel del modal al back para eliminar la duplicación (DT-29).
- Ejecutar la recarga en **PROD** (requiere confirmación explícita del usuario y verificar DT-08).
- Índice único `por_ubicar` por versión, auditoría de usuario en el camino HTTP (DT-25), DT-20 en el camino
  normal (`reemplazar: false`).
- Corregir DT-33/DT-38 en el lector: se portan **tal como se comportan hoy**.

## Contratos

### `POST /api/v1/versiones/{id}/importar-productos` — modificado, retrocompatible

Permisos sin cambios: `requiereAnalista` + `editarContenido` (PLA005/PLA006). Contrato existente:
`Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`.

Request (se agrega `reemplazar`):
```json
{ "productos": [ /* igual que hoy, 1..1000 */ ], "reemplazar": false }
```
- `reemplazar`: booleano estricto, opcional, por defecto `false`. `"true"`, `1`, `"si"` → 400.
- Claves desconocidas (`permitir_no_editable`, `estados_permitidos`, …) se descartan (`stripUnknown`).

Response `201`:
```json
{
  "gondola": { "id": 812, "creada": false, "totalNiveles": 7 },
  "totalImportados": 64,
  "eliminados": 61,
  "omitidos": [{ "sku": "123", "motivo": "Ya está ubicado en la versión" }],
  "advertencias": []
}
```
- `eliminados`: número de posiciones quitadas de "Por ubicar" (siempre `0` con `reemplazar: false`). Nunca ids ni contenido.
- `gondola`: `null` si no quedó nada que insertar (con `reemplazar: true` además se eliminó "Por ubicar").
- `omitidos[].motivo`: `"Repetido en el archivo"`, `"Ya está en la versión"` (modo normal) o `"Ya está ubicado en la versión"` (modo reemplazo).

Errores (`{ error: { code, message, details? } }`): `400` validación; `401`; `403` sin permiso; `404` versión;
`422` versión no editable (`details.estadoActual`) o accesorios inexistentes (`details.codigos`) — **ambos
antes de borrar**; `422` también si el estado cambió a no editable dentro de la transacción (rollback).

### Servicio de recarga (sin ruta) — forma estable del reporte

Documentar en `Arquitectura/Contratos/20_importacion/RECARGA_EXCEL_servicio.md` (nuevo). Forma del plan de
simulación (`version: 1` para poder evolucionar):

```json
{
  "version": 1,
  "generadoEn": "2026-10-15T18:00:00.000Z",
  "ambiente": "dev", "servidor": "<host>", "bd": "OTB", "contenedor": "adjuntos-dev",
  "departamento": "LIMPIEZA",
  "usuario": { "id": "…", "correo": "…" },
  "resumen": { "total": 40, "porEstado": { "LISTA": 31, "SIN_EXCEL": 3, "VARIOS_EXCEL": 2, "CON_ERRORES": 3, "NO_PERMITIDA": 1 },
               "publicadasATocar": 12, "tiendasAfectadas": 87 },
  "versiones": [{
    "versionId": 101, "planogramaId": 7, "planogramaNombre": "…", "versionCodigo": "LIMPIEZA TG-01",
    "tipo": "GRANDE", "bloque": "TG", "estadoVersion": "publicado", "tiendasAsignadas": 9,
    "estado": "LISTA",
    "motivos": [{ "codigo": "PLANOGRAMA_DISTINTO", "mensaje": "…" }],
    "adjunto": { "id": 55, "nombre": "x.xlsx", "blobPath": "versiones/101/…", "tamanoBytes": 81234, "sha256": "…", "elegidoExplicitamente": false },
    "adjuntosExcel": [{ "id": 55, "nombre": "x.xlsx", "createdAt": "…" }],
    "aceptarPlanograma": false,
    "lectura": { "bloquesEnArchivo": ["TG","TM","TE"], "productosLeidos": 64, "filasOmitidas": 2,
                 "errores": [ /* primeros 20 ErrorLectura */ ], "totalErrores": 0, "columnasFaltantes": [], "planogramas": ["LIMPIEZA TG-01"] },
    "accesoriosFueraDeCatalogo": [],
    "skusNoLocales": 3,
    "porUbicarActual": 61,
    "skusUbicados": 0
  }]
}
```

Estados de simulación (`estado`): `LISTA` (ejecutable), `SIN_EXCEL`, `VARIOS_EXCEL`, `CON_ERRORES`,
`NO_PERMITIDA` (versión `archivado`). Códigos de `motivos`: `SIN_EXCEL`, `VARIOS_EXCEL`, `FORMATO_NO_SOPORTADO`
(`.xls` u otro), `EXCEDE_TAMANO`, `NO_ES_XLSX` (sin firma ZIP), `BLOB_INEXISTENTE`, `BLOB_AJENO`
(`blob_path` o contenedor de otra versión/ambiente), `DESCARGA_FALLIDA` (con código HTTP de Azure, sin volcar el error),
`EXCEDE_FILAS`, `BLOQUE_AUSENTE`, `BLOQUE_VACIO`, `COLUMNAS_FALTANTES`, `ERRORES_DE_CELDA`, `PLANOGRAMA_DISTINTO`,
`ACCESORIOS_FUERA_DE_CATALOGO`, `VALIDACION` (Joi: >1000 productos, SKU >50, etc.), `ESTADO_NO_PERMITIDO`.

Resultado de ejecución por versión: `{ versionId, resultado: 'RECARGADA'|'OMITIDA'|'FALLIDA', motivos, totalImportados, eliminados, omitidos, advertencias, respaldo: '<ruta>' | null }`.
`OMITIDA` con motivo `CAMBIO_DESDE_SIMULACION` cuando la revalidación no coincide.

## Datos

Sin cambios de BD (la siguiente migración libre sigue siendo `017`). Qué borra el reemplazo, solo de las
góndolas `por_ubicar = 1` de **esa** versión: `PosicionAccesorio` → `Posicion` → `Nivel` → `Seccion`
(helper `vaciarGondola` existente) y, si corresponde, la fila `Gondola` (las "Por ubicar" no tienen
`EvidenciaImplementacion`: `evidencia.repository.js` las excluye). No toca góndolas reales, `Adjunto`,
`HistorialSustitucion`. Actualiza `PlanogramaVersion.updated_at`. Las filas de `Producto` creadas desde CATI
(`asegurarExistencia`) se insertan fuera de la transacción (inocuo; se registra como deuda). Retrocompatible:
sin `reemplazar` el comportamiento es idéntico al actual.

## Seguridad (controles obligatorios)

Los números `S#` corresponden a `02_seguridad.md`. Todos los **bloqueantes** son criterio de aceptación.

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| S1 (bloq.) | Borrado + inserción en una sola `db.transaction`; ninguna llamada a `db(...)` fuera de `trx` en ese flujo; validaciones (versión, estado, accesorios, Joi, tope 1000) antes de abrir la transacción | `infrastructure/repositories/importacion.repository.js` (`reemplazarPorUbicar`), `importacion.usecases.js` | Prueba de caso de uso con repo falso que lanza en la escritura → resultado de error y sin cambios en el estado falso; Postman 422 sin borrado |
| S2 (bloq.) | Vaciar **todas** las góndolas `where({ planograma_version_id, por_ubicar: true })`; nunca recibir ids de góndola desde fuera | mismo repositorio | Revisión del diff + Postman con SKU en góndola real intacto |
| S3 | `forUpdate()` sobre `PlanogramaVersion` como primera sentencia y revalidación del estado con la regla del llamador (`validarEstado`); `skusUbicados` dentro de la transacción | mismo repositorio | Prueba: repo falso cuyo estado bloqueado es `archivado` → 422 y `respaldar`/vaciado no llamados |
| S4 | Eliminar la góndola "Por ubicar" solo con la regla de `aplicarCruce` (vacía) | mismo repositorio | Revisión del diff |
| S5 (bloq.) | Camino HTTP sigue con `validarVersionEditable`; `recargarVersion` aparte, con `ESTADOS_RECARGA_MASIVA` en dominio; el controller no lo importa | `importacion.usecases.js`, `importacion.controller.js` | Pruebas a–e (ver T2, T7, T10) + Postman |
| S6 | Token CAO por stdin sin eco, nunca por argumento ni `.env`; `validarToken` + `esAnalista`; todo dentro de `ejecutarConContexto`; token nunca impreso ni guardado | `back/scripts/recargaExcel.js` | Prueba de `autorizarOperador` con validador falso sin permisos → error antes de leer BD/Blob; `parsearArgumentos(['--token=x'])` → error |
| S7 (bloq.) | Guarda de ambiente con tabla constante; aborta antes de cualquier consulta; `prod` exige `--confirmar-bd` y confirmación interactiva; sin `--yes` | `back/scripts/recargaExcel/ambiente.js` | Pruebas de `verificarAmbiente` (5 casos de T9) |
| S8 (bloq.) | Simulación sin escrituras: no llama `reemplazarPorUbicar`, `asegurarExistencia`, `subir`, `eliminar`, `generarUrlSubida` | `application/recargaExcel/recargaExcel.service.js` | Prueba con fakes cuyos métodos de escritura lanzan → simulación termina y ninguno fue llamado |
| S9 | Ejecución solo del plan; revalidación por versión (ambiente/BD/contenedor, departamento, planograma no archivado, estado, adjunto id, SHA-256); `--adjunto` valida que el adjunto pertenece a la versión | servicio + script | Prueba de `revalidarEntrada` con hash distinto → `CAMBIO_DESDE_SIMULACION` |
| S10 | `--departamento` obligatorio, comparación exacta parametrizada; si no existe, abortar listando los existentes; `--version=<id>` repetible acota (y debe pertenecer al departamento) | servicio (`resolverAlcance`) | Prueba: departamento inexistente → error con lista |
| S11 | Script en `back/scripts/` con `if (require.main === module)`; lógica en `src/`; `db.destroy()` al final; `index.js` y `routes/` no lo importan | script | `npm test` sin conexiones; T10 |
| S12 | Una versión = una transacción; fallo en N no detiene N+1; repetir deja el mismo contenido | servicio + repositorio | Prueba con repo en memoria: dos recargas → mismo contenido, `eliminados` 2.ª = `totalImportados` 1.ª |
| S13 | Respaldo JSON por versión dentro de la transacción antes de vaciar; sin respaldo no se ejecuta; `back/scripts/salidas/` en `.gitignore`; `updated_at` de la versión | repositorio + script | Prueba de `armarRespaldo` (forma estable) y de `respaldar` que lanza → `reemplazarPorUbicar` no vacía |
| S14 | Reporte y resumen marcan cuántas publicadas se tocan y cuántas tiendas tienen asignadas | servicio + consola | Revisión de la simulación en DEV (T13) |
| S15 (bloq.) | Productos leídos → `validarBody(schemaImportarProductos, …)` antes del caso de uso; >1000 = error (no truncar); bloqueos del lector, `PLANOGRAMA_DISTINTO` y accesorios fuera de catálogo → `CON_ERRORES` | servicio | Prueba con lector falso: 1001 productos y SKU de 51 caracteres → `CON_ERRORES`, cero escrituras |
| S16 | Paridad del lector: pruebas del front portadas **completas** | `back/test/domain/excelProductos.test.js` | `npm test` |
| S17 | `read-excel-file@9.3.10` exacto, `require` perezoso, `npm audit --omit=dev` anotado en el entregable | `back/package.json`, `lectorExcel.js` | Revisión del diff + salida de audit |
| S18 | Adjunto solo del registro `Adjunto` de la versión; `validarBlobPathDeVersion`; contenedor del registro = contenedor del ambiente; `.xlsx` por extensión **y** MIME; ≤10 MB por propiedades **y** al leer el stream; firma `PK\x03\x04`; timeout 30 s; tope 5000 filas; error de Azure resumido | servicio, `blobClient.js`, `lectorExcel.js` | Pruebas de T6 y T8 |
| S19 | Código de salida ≠ 0 si algo falló/abortó; nunca imprimir contraseña, connection string, token CAO ni accessToken CATI; mensajes en español | script | Revisión del diff |
| S20 | `reemplazar` booleano estricto | `importacion.schemas.js` | `importacionSchemas.test.js` |
| S21 | `eliminados` solo número | controller/contrato | Revisión |

## UX (resumen para implementar)

Sin cambios de UI. La salida de consola del script está en español, con un encabezado (ambiente, servidor,
BD, contenedor, usuario, modo **SIMULACIÓN**/**EJECUCIÓN**), una tabla por versión (planograma, código,
estado versión, estado simulación, productos leídos, en "Por ubicar", motivos) y un resumen por estado con
publicadas a tocar y tiendas afectadas.

## Tareas

### T1 — Lector del Excel en el dominio del back (espejo del front) + pruebas espejo
- **Archivos**: crear `back/src/domain/importacion/excelProductos.js` · crear `back/test/domain/excelProductos.test.js` · modificar `back/src/domain/compartido/gancho.js` (agregar `textoGancho`).
- **Qué hacer**:
  - Portar a CommonJS, función por función y con los mismos mensajes, `front/src/utils/excelProductosPlanograma.ts`
    (leerlo completo, 630 líneas) **excepto** `leerExcelProductos` (la lectura del archivo va en T6). Exportar:
    `siglaBloque(tipo)`, `siglasEnNombre(nombre)`, `bloqueoDeLectura(lectura)`, `AVISO_SIN_TIPO`, `letraColumna(indice)`,
    `ganchosCelda(valor)`, `accesoriosDeCeldas(nombre, tamano)`, `agruparAccesorios(accesorios)`,
    `erroresDeCatalogo(origenes, codigosCatalogo)`, `interpretarHojaProductos(filas, tipo)`.
  - Dependencias equivalentes del back: `leerGancho` → `normalizarGancho`, `esGanchoExhibicion` y `numeroGancho` de
    `domain/compartido/gancho.js`; `normalizarCodigoAccesorio` → `normalizarCodigo` de `domain/accesorio/accesorio.entity.js`;
    `SIGLA_TIPO_TIENDA` y las etiquetas `Grande`/`Mediana`/`Express` de `TIPO_TIENDA_META` como constantes locales congeladas.
  - `textoGancho(g)` en `gancho.js`: `String(numeroGancho(g)).padStart(2, '0') + (esGanchoExhibicion(g) ? 'E' : '')` (igual que `front/src/domain/ganchos/gancho.ts:36`).
  - Encabezado del archivo: "Espejo de `front/src/utils/excelProductosPlanograma.ts`. Cualquier cambio de reglas se hace en ambos y en sus dos pruebas (DT-29)." El front no se toca: la nota recíproca en el archivo del front queda para la feature siguiente.
  - Mantener DT-33 y DT-38 tal como están (no corregir).
- **Criterios de aceptación**:
  - [ ] `back/test/domain/excelProductos.test.js` contiene **todos** los `describe`/`it` de `front/src/utils/excelProductosPlanograma.test.ts` (mismas entradas, mismas salidas esperadas, con `node:test` + `assert/strict`; `expect(x).toEqual(y)` → `assert.deepEqual`).
  - [ ] Ninguna dependencia de infraestructura ni de `read-excel-file` en `excelProductos.js`.
  - [ ] Prueba de `textoGancho` agregada en `back/test/domain/gancho.test.js` (`5` → `"05"`, `"54E"` → `"54E"`).
- **Pruebas**: las portadas + `textoGancho`.
- **Depende de**: —

### T2 — Casos de uso: reemplazo por HTTP y recarga de una versión
- **Archivos**: modificar `back/src/domain/importacion/importacion.entity.js`, `back/src/domain/importacion/importacion.usecases.js`, `back/src/domain/importacion/importacion.repository.js` (contrato) · modificar `back/test/domain/importacion.test.js`.
- **Qué hacer**:
  - `importacion.entity.js`: `filtrarProductos(filas, skusEnVersion, { motivoExistente = 'Ya está en la versión' } = {})`.
    Agregar `MOTIVO_YA_UBICADO = 'Ya está ubicado en la versión'`, `ESTADOS_RECARGA_MASIVA = Object.freeze(['borrador','en_desarrollo','piloto','publicado'])`
    y `validarEstadoRecarga(estado)` (lanza `errorUnprocessable('La versión no admite recarga', { estadoActual })` si no está en la lista). Exportarlos.
  - `importacion.usecases.js`:
    - Extraer `prepararPosiciones({ accesorioRepo, productoRepo }, productos, skusExcluidos)` → `{ posiciones, omitidos, advertencias }`
      con la lógica actual (resolverAccesorios sobre **todos** los productos, `filtrarProductos`, `validarProducto` en paralelo, `posicionDesdeFila`).
    - Privada `reemplazar(repos, versionId, productos, { validarEstado, respaldar })`: `prepararPosiciones` con `new Set()` (solo descarta repetidos),
      luego `importacionRepo.reemplazarPorUbicar(versionId, posiciones, { validarEstado, respaldar, motivoYaUbicado: MOTIVO_YA_UBICADO })`;
      devuelve `{ gondola, totalImportados: posiciones.length - r.omitidos.length, eliminados: r.eliminados, omitidos: [...omitidos, ...r.omitidos], advertencias }`
      (las advertencias de SKU inexistente solo de las posiciones realmente insertadas).
    - `importarProductos(repos, versionId, datos)`: igual que hoy; si `datos.reemplazar === true` → tras `validarVersionEditable`, `reemplazar(..., { validarEstado: validarVersionEditable })`.
      El camino normal devuelve además `eliminados: 0`. **No** leer ninguna otra clave de `datos`; la firma no gana un cuarto argumento.
    - `recargarVersion(repos, versionId, { productos }, { respaldar })`: busca la versión (404), `validarEstadoRecarga`, luego `reemplazar(..., { validarEstado: validarEstadoRecarga, respaldar })`.
    - `module.exports = { importarLayout, importarProductos, recargarVersion }`.
  - Contrato del repositorio: documentar `skusUbicados(versionId)` (opcional fuera de transacción, para la simulación),
    `contenidoPorUbicar(versionId)` y `reemplazarPorUbicar(versionId, posiciones, { validarEstado, respaldar, motivoYaUbicado })`
    → `Promise<{ gondola: { id, creada, totalNiveles } | null, eliminados: number, omitidos: { sku, motivo }[] }>` con el orden de pasos de la tabla de Decisiones.
- **Criterios de aceptación**:
  - [ ] `importarProductos` con `reemplazar: true` sobre `publicado` → 422 y cero llamadas a `reemplazarPorUbicar` (S5-b).
  - [ ] `recargarVersion` sobre `archivado` → 422 y cero escrituras; sobre `publicado` → llama `reemplazarPorUbicar` con `validarEstado === validarEstadoRecarga` (S5-c).
  - [ ] Accesorio inexistente con `reemplazar: true` → 422 antes de `reemplazarPorUbicar`.
  - [ ] Si `reemplazarPorUbicar` lanza, el error se propaga (sin resultado parcial).
  - [ ] Camino normal sin cambios de comportamiento (pruebas existentes en verde) y con `eliminados: 0`.
- **Pruebas** (`back/test/domain/importacion.test.js`, ampliar `armarRepos` con `reemplazarPorUbicar` y un repo en memoria):
  `filtrarProductos` con `motivoExistente`; los cinco criterios de arriba; idempotencia (S12): repo en memoria que guarda la lista de "Por ubicar" → dos `recargarVersion` iguales dejan el mismo contenido y `eliminados` de la 2.ª = `totalImportados` de la 1.ª; `omitidos` del repo se suman al resultado.
- **Depende de**: —

### T3 — Funciones puras de la recarga
- **Archivos**: crear `back/src/domain/importacion/recargaExcel.entity.js` · crear `back/test/domain/recargaExcel.test.js`.
- **Qué hacer** (sin I/O, sin `process.env`):
  - `MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`, `MAX_BYTES_EXCEL = 10 * 1024 * 1024`, `MAX_FILAS_EXCEL = 5000`, `MAX_ERRORES_REPORTE = 20`, `ESTADOS_SIMULACION`, `CODIGOS_MOTIVO` (lista del contrato).
  - `esAdjuntoXlsx(adjunto)` → extensión `.xlsx` (sin distinguir mayúsculas) **y** `tipoMime === MIME_XLSX`.
  - `elegirAdjuntoExcel(adjuntos, adjuntoIdElegido?)` → `{ adjunto | null, adjuntosExcel, motivo: null | 'SIN_EXCEL' | 'VARIOS_EXCEL' | 'FORMATO_NO_SOPORTADO', elegidoExplicitamente }`:
    0 `.xlsx` → `SIN_EXCEL` (o `FORMATO_NO_SOPORTADO` si hay `.xls`); 1 → ese; >1 → el de `createdAt` más reciente + `VARIOS_EXCEL`, salvo `adjuntoIdElegido` presente en la lista (sin motivo, `elegidoExplicitamente: true`); un `adjuntoIdElegido` que no es de la versión → error `BLOB_AJENO`.
  - `esZip(buffer)` → primeros 4 bytes `50 4B 03 04`.
  - `normalizarCodigoPlanograma(texto)` y `planogramaCoincide(planogramasDelArchivo, versionCodigo)` → `true` si la versión no tiene código, el archivo no trae valores o alguno coincide normalizado.
  - `clasificarSimulacion({ estadoVersion, eleccion, lectura, bloqueo, accesoriosFueraDeCatalogo, errorValidacion, planogramaOk, aceptarPlanograma, motivosArchivo })` → `{ estado, motivos }` con prioridad: `NO_PERMITIDA` > `SIN_EXCEL`/`FORMATO_NO_SOPORTADO` (→ `SIN_EXCEL`) > errores de archivo (`CON_ERRORES`) > `VARIOS_EXCEL` > lectura/validación/catálogo/planograma (`CON_ERRORES`) > `LISTA`.
  - `revalidarEntrada(entrada, actual)` → `null` si coinciden ambiente, bd, contenedor, departamento, planograma no archivado, `estadoVersion`, `adjunto.id`, `adjunto.sha256`; si no, `{ codigo: 'CAMBIO_DESDE_SIMULACION', mensaje }` con el campo que cambió.
  - `armarRespaldo({ contexto, entrada, contenido, fecha })` → `{ version: 1, fecha, ambiente, bd, contenedor, usuario: { id, correo }, versionId, estadoVersion, adjunto: { id, blobPath, sha256 }, contenido }` (sin token).
  - `resumirSimulacion(versiones)` → `resumen` del contrato (`publicadasATocar` y `tiendasAfectadas` cuentan solo `LISTA` con `estadoVersion === 'publicado'`).
- **Criterios de aceptación**:
  - [ ] Cada función con al menos un caso feliz y uno de rechazo; `revalidarEntrada` con hash distinto → `CAMBIO_DESDE_SIMULACION` (S9).
  - [ ] `armarRespaldo` no incluye ninguna clave `token`/`tokenCAO` (prueba con contexto que la trae).
- **Pruebas**: `back/test/domain/recargaExcel.test.js`.
- **Depende de**: T2 (constantes de estado)

### T4 — Repositorio: `reemplazarPorUbicar`, `skusUbicados`, `contenidoPorUbicar`
- **Archivos**: modificar `back/src/infrastructure/repositories/importacion.repository.js`.
- **Qué hacer**:
  - Extraer el cuerpo de `importarPorUbicar` (pasos 1–3) a `llenarPorUbicar(trx, gondolaId, posiciones)` → `{ totalNiveles }`; `importarPorUbicar` queda como `obtenerOCrearPorUbicar` + `llenarPorUbicar`. Corregir `Math.max(...)` sin niveles: `Math.max(0, ...niveles.map((n) => n.ancho))`.
  - `skusUbicadosEn(conn, versionId)` (privada, recibe `db` o `trx`): como `skusDeVersion` + `Gondola.por_ubicar = false`. Exportar `skusUbicados(versionId)` = `skusUbicadosEn(db, versionId)`.
  - `contenidoPorUbicarEn(conn, versionId)` → `{ gondolas, secciones, niveles, posiciones, posicionAccesorios }` (filas crudas de las góndolas `por_ubicar = true` de la versión). Exportar `contenidoPorUbicar(versionId)` y `contarPorUbicar` no hace falta (existe `versionRepo.contarPosicionesPorUbicar`).
  - `reemplazarPorUbicar(versionId, posiciones, { validarEstado, respaldar, motivoYaUbicado })` en **un** `db.transaction(async (trx) => …)`:
    1. `const version = await trx('PlanogramaVersion').where('id', versionId).forUpdate().first('id', 'estado')`; si no existe → error 404 (`code: 'NOT_FOUND'`); `validarEstado(version.estado)`.
    2. `gondolas = await trx('Gondola').where({ planograma_version_id: versionId, por_ubicar: true }).orderBy('id').select('id')`.
    3. Si `respaldar`: `await respaldar(await contenidoPorUbicarEn(trx, versionId))` (si lanza, rollback).
    4. `eliminados` = conteo de posiciones de esas góndolas (antes de borrar); `vaciarGondola(trx, id)` para cada una; borrar la fila `Gondola` de todas menos la primera.
    5. `ubicados = await skusUbicadosEn(trx, versionId)`; separar `posiciones` con `sku` en `ubicados` → `omitidos` (`{ sku, motivo: motivoYaUbicado }`).
    6. Si quedan posiciones: usar la primera góndola o `obtenerOCrearPorUbicar(trx, versionId)` si no había; `llenarPorUbicar`. Si no quedan: borrar la góndola conservada (si existía) y `gondola = null`.
    7. `await trx('PlanogramaVersion').where('id', versionId).update({ updated_at: trx.fn.now() })`.
    8. Devolver `{ gondola, eliminados, omitidos }`.
  - Ninguna llamada a `db(...)` dentro del flujo; todo con `trx`.
- **Criterios de aceptación**:
  - [ ] Revisión: todas las sentencias dentro de `trx`; `forUpdate()` es la primera; no hay `.first()` al buscar las "Por ubicar" (S1, S2, S3).
  - [ ] `importarPorUbicar` conserva su comportamiento (Postman de importación existente en verde).
- **Pruebas**: cubiertas por T2 (repos falsos) y Postman (T11). Sin prueba de BD real.
- **Depende de**: T2

### T5 — Repositorios de consulta para la recarga
- **Archivos**: modificar `back/src/infrastructure/repositories/planograma.repository.js`, `back/src/infrastructure/repositories/version.repository.js` y sus contratos en `back/src/domain/planograma/` y `back/src/domain/version/` (si tienen archivo de contrato).
- **Qué hacer**:
  - `planogramaRepo.listarDepartamentos()` → `string[]` distintos de `Planograma.departamento`, ordenados.
  - `planogramaRepo.listarPorDepartamento(departamento)` → `[{ id, nombre, departamento, estado }]` con `where('departamento', departamento).whereNot('estado', 'archivado')`, sin paginar (comparación exacta parametrizada, sin `LIKE`/`raw`).
  - `versionRepo.contarTiendasAsignadas(versionId)` → `number` desde `VersionTienda` (reutilizar si ya existe algo equivalente en `version.repository.js`; buscar `TABLA_VERSION_TIENDA`).
  - Usar los existentes: `versionRepo.listarPorPlanograma(planogramaId, { incluirArchivadas: true })` (las archivadas se reportan `NO_PERMITIDA`), `versionRepo.buscarPorId`, `versionRepo.contarPosicionesPorUbicar`, `adjuntoRepo.listarPorVersion`, `productoRepo.existe`, `accesorioRepo.buscarPorCodigo`.
- **Criterios de aceptación**:
  - [ ] Consultas parametrizadas; sin `raw`.
- **Pruebas**: indirectas (servicio con fakes, T8).
- **Depende de**: —

### T6 — Infraestructura: paquete, lector de archivo y descarga acotada del Blob
- **Archivos**: modificar `back/package.json` y `back/package-lock.json` (`cd back && npm install read-excel-file@9.3.10`) · crear `back/src/infrastructure/excel/lectorExcel.js` · modificar `back/src/infrastructure/storage/blobClient.js` · crear `back/test/infrastructure/blobLimite.test.js`.
- **Qué hacer**:
  - `lectorExcel.leerPrimeraHoja(buffer, { maxFilas })` → `Promise<Celda[][]>`: `const { readSheet } = require('read-excel-file/node')` **dentro** de la función; `readSheet(buffer)`; si `filas.length > maxFilas` lanza error con `code: 'EXCEDE_FILAS'`; errores de la librería → error `code: 'NO_SE_PUDO_LEER'` con mensaje en español (sin pila en el reporte).
  - `blobClient`:
    - `obtenerPropiedades` agrega `etag` al resultado (aditivo).
    - Exportar helper puro `leerStreamConLimite(stream, maxBytes)` → `Promise<Buffer>`; acumula chunks y, al superar `maxBytes`, destruye el stream y lanza `code: 'EXCEDE_TAMANO'`.
    - `descargarConLimite({ container, blobPath, maxBytes, timeoutMs })` → `{ buffer, sha256, etag } | null` (null si 404): `download(0, undefined, { abortSignal: AbortSignal.timeout(timeoutMs) })`, `leerStreamConLimite`, `sha256` con `node:crypto`. Errores del SDK → `errorServicioNoDisponible` existente con `statusCode` de Azure, sin URL ni cabeceras en el mensaje.
  - Anotar en el entregable del desarrollador la salida de `cd back && npm audit --omit=dev`.
- **Criterios de aceptación**:
  - [ ] `back/package.json` tiene `"read-excel-file": "9.3.10"` en `dependencies` (exacto).
  - [ ] `index.js`/arranque de la API no cargan `read-excel-file` (solo se requiere dentro de `leerPrimeraHoja`).
- **Pruebas**: `blobLimite.test.js`: `Readable.from` de 11 MB con `maxBytes` 10 MB → `EXCEDE_TAMANO`; 1 KB → buffer igual. (El SDK no se prueba.)
- **Depende de**: —

### T7 — Esquema y controller del endpoint
- **Archivos**: modificar `back/src/application/importacion/importacion.schemas.js` · revisar `back/src/application/importacion/importacion.controller.js` · modificar `back/test/application/importacionSchemas.test.js`.
- **Qué hacer**: `schemaImportarProductos` agrega `reemplazar: Joi.boolean().strict().default(false)`. El controller no cambia (pasa `datos` validado a `usecases.importarProductos`); verificar que no importa `recargarVersion` ni el servicio de recarga.
- **Criterios de aceptación**:
  - [ ] `reemplazar` `"true"`, `1`, `"si"` → error; `true` → ok; ausente → `false` (S20).
  - [ ] Body con `permitir_no_editable: true` y `estados_permitidos: ['publicado']` → el valor validado no contiene esas claves (S5-a).
- **Pruebas**: `importacionSchemas.test.js` con esos casos.
- **Depende de**: T2

### T8 — Servicio de recarga (simulación y ejecución por versión)
- **Archivos**: crear `back/src/application/recargaExcel/recargaExcel.service.js` · crear `back/test/application/recargaExcel.service.test.js`.
- **Qué hacer**: todas las dependencias inyectadas en `deps = { planogramaRepo, versionRepo, adjuntoRepo, importacionRepo, accesorioRepo, productoRepo, blobStorage, lectorExcel, contenedor }` (sin `require` de infraestructura en este archivo). Funciones:
  - `resolverAlcance(deps, { departamento, versionIds })` → `[{ planograma, version }]`. Departamento inexistente → error `code: 'DEPARTAMENTO_INEXISTENTE'` con `details.existentes` (S10). `versionIds` que no pertenecen al departamento → error.
  - `leerAdjuntoDeVersion(deps, version, adjunto)` → `{ buffer, sha256 } | { motivo }`: `validarBlobPathDeVersion(version.id, adjunto.blobPath)` (de `domain/adjunto/adjunto.entity.js`) → `BLOB_AJENO`; `adjunto.blobContainer !== deps.contenedor` → `BLOB_AJENO`; `obtenerPropiedades` null → `BLOB_INEXISTENTE`; `tamanoBytes > MAX_BYTES_EXCEL` → `EXCEDE_TAMANO` (sin descargar); `descargarConLimite({ maxBytes: MAX_BYTES_EXCEL, timeoutMs: 30000 })`; `!esZip(buffer)` → `NO_ES_XLSX`; error del SDK → `DESCARGA_FALLIDA` con `statusCode`.
  - `analizarVersion(deps, { planograma, version }, opciones)` → entrada del plan: elige adjunto (`elegirAdjuntoExcel` con `opciones.adjuntos[versionId]`), lee, `interpretarHojaProductos(filas, version.tipo)`, `bloqueoDeLectura`, accesorios fuera de catálogo con `accesorioRepo.buscarPorCodigo` sobre `origenesAccesorio`, `validarBody(schemaImportarProductos, { productos })` (captura `isJoi` → `VALIDACION` con los primeros 20 mensajes), `planogramaCoincide`, y solo lecturas para el reporte: `contarPosicionesPorUbicar`, `importacionRepo.skusUbicados` (conteo de SKU del Excel ya ubicados), `productoRepo.existe` por SKU (→ `skusNoLocales`), `contarTiendasAsignadas`. Clasifica con `clasificarSimulacion`.
  - `simular(deps, { departamento, versionIds, adjuntos, aceptarPlanograma, contexto })` → plan completo del contrato (`version: 1`, `resumen` con `resumirSimulacion`). Secuencial. **No** llama `asegurarExistencia`, `reemplazarPorUbicar`, `subir`, `eliminar`, `generarUrlSubida` (S8).
  - `ejecutarVersion(deps, { plan, entrada, contexto, escribirRespaldo })` → resultado del contrato: solo si `entrada.estado === 'LISTA'`; vuelve a leer versión, planograma y adjunto; `revalidarEntrada` (S9) → `OMITIDA`; re-lee el Excel y re-valida (Joi, catálogo, planograma) → si ya no es `LISTA`, `OMITIDA`; llama `recargarVersion({ importacionRepo, versionRepo, accesorioRepo, productoRepo }, versionId, { productos }, { respaldar })` donde `respaldar = (contenido) => escribirRespaldo(armarRespaldo({ contexto, entrada, contenido, fecha }))`. Cualquier error → `FALLIDA` con mensaje resumido (sin objeto de error completo).
- **Criterios de aceptación**:
  - [ ] Simulación con fakes cuyos métodos de escritura lanzan termina bien y no los llama (S8).
  - [ ] Lector falso con 1001 productos, o SKU de 51 caracteres → `CON_ERRORES`/`VALIDACION`; en `ejecutarVersion` no se llama `reemplazarPorUbicar` (S15).
  - [ ] Adjunto `.xls` → `SIN_EXCEL` con motivo `FORMATO_NO_SOPORTADO`, sin descargar; `tamanoBytes` 11 MB → `EXCEDE_TAMANO` sin descargar; `blobPath` de otra versión → `BLOB_AJENO`; buffer sin firma ZIP → `NO_ES_XLSX` (S18).
  - [ ] Versión `archivado` → `NO_PERMITIDA`; `publicado` → puede quedar `LISTA`.
  - [ ] `ejecutarVersion` con SHA-256 distinto al del plan → `OMITIDA` `CAMBIO_DESDE_SIMULACION`, sin escrituras.
  - [ ] Departamento inexistente → error con la lista de existentes.
  - [ ] `escribirRespaldo` que lanza → `FALLIDA` y el repo falso no registra vaciado.
- **Pruebas**: `recargaExcel.service.test.js` con los casos de arriba (repos, `blobStorage` y `lectorExcel` falsos; el lector falso devuelve filas que pasan por `interpretarHojaProductos` real).
- **Depende de**: T1, T2, T3, T5, T6, T7

### T9 — Script de terminal
- **Archivos**: crear `back/scripts/recargaExcel.js` · crear `back/scripts/recargaExcel/argumentos.js`, `back/scripts/recargaExcel/ambiente.js`, `back/scripts/recargaExcel/consola.js` · crear `back/test/scripts/recargaExcel.test.js` · modificar `back/package.json` (script `"recarga-excel": "node scripts/recargaExcel.js"`) · modificar `.gitignore` (raíz: `back/scripts/salidas/`).
- **Qué hacer**:
  - `argumentos.parsearArgumentos(argv)` → `{ ambiente, departamento, versionIds, adjuntos: { [versionId]: adjuntoId }, aceptarPlanograma: number[], ejecutar, plan, confirmarBd }`.
    Opciones: `--ambiente=dev|prod` (obligatoria), `--departamento=<texto>` (obligatoria en simulación), `--version=<id>` (repetible), `--adjunto=<versionId>:<adjuntoId>` (repetible), `--aceptar-planograma=<versionId>` (repetible), `--ejecutar`, `--plan=<ruta>` (obligatoria con `--ejecutar`), `--confirmar-bd=<nombre>`. Cualquier otra opción (incluidas `--token`, `--yes`, `-y`) → error.
  - `ambiente.AMBIENTES = Object.freeze({ dev: { bd: 'OTB', contenedor: 'adjuntos-dev' }, prod: { bd: 'db-planogramas', contenedor: 'adjuntos' } })` y `verificarAmbiente({ ambiente, confirmarBd }, env)` (recibe `env` de `config/env.js`; no lee `process.env`): ambiente ausente/desconocido, `env.db.name` o `env.azureStorage.container` distintos de la fila → error; `prod` sin `confirmarBd === 'db-planogramas'` → error.
  - `recargaExcel.js` (`main` bajo `if (require.main === module)`), en este orden:
    1. `parsearArgumentos` → `verificarAmbiente` (antes de cualquier consulta). Con `prod`, pedir por TTY que se escriba `PROD` (si no hay TTY → abortar).
    2. Leer token CAO por stdin: con TTY, prompt `Token CAO: ` sin eco (readline con salida silenciada); sin TTY, leer stdin completo. Nunca de argumentos ni `.env`.
    3. `autorizarOperador(token, { validarToken })` (exportada, inyectable): `validarToken` de `infrastructure/cao/caoAuthClient.js`; exigir `esAnalista(usuario)` de `domain/compartido/permisos.js`; si no → error antes de leer BD/Blob.
    4. Imprimir encabezado: ambiente, `env.db.host`, `env.db.name`, contenedor, usuario (correo), modo. Nunca contraseña, connection string ni token.
    5. Todo lo demás dentro de `ejecutarConContexto({ tokenCAO, usuario }, …)` (`infrastructure/http/contextoSolicitud.js`).
    6. Simulación: `servicio.simular(...)` → escribir `back/scripts/salidas/plan-<AAAAMMDD-HHmmss>-<ambiente>.json` y mostrar tabla + resumen (publicadas a tocar y tiendas afectadas). Código de salida 0.
    7. Ejecución: leer el plan; si su `ambiente`/`bd`/`contenedor` no coinciden con los actuales → abortar. Procesar **secuencialmente** las entradas `LISTA`; antes de cada versión llamar `mantenerSesionActiva(token)`; `escribirRespaldo` escribe síncrono `back/scripts/salidas/respaldo-<fecha>-v<versionId>.json` (crear carpeta si falta). Al final, `resultado-<fecha>.json` y resumen. Ctrl+C: la primera vez termina la versión en curso y se detiene; la segunda sale de inmediato (la transacción en curso hace rollback).
    8. `finally`: `db.destroy()` (`infrastructure/db/connection.js`).
    9. Códigos de salida: 0 todo bien; 1 abortado por validación/ambiente/permisos; 2 alguna versión `FALLIDA`; 130 interrumpido.
  - `consola.js`: formateo de tablas y resumen (puro, recibe el plan/resultados y devuelve texto).
- **Criterios de aceptación**:
  - [ ] `verificarAmbiente`: `dev` + `OTB`/`adjuntos-dev` → ok; `dev` + `db-planogramas` → error; `dev` + `OTB`/`adjuntos` → error; `prod` sin `--confirmar-bd` → error; sin `--ambiente` → error (S7).
  - [ ] `parsearArgumentos(['--token=x', ...])` y `--yes` → error (S6).
  - [ ] `autorizarOperador` con usuario sin PLA005/PLA006 (o token inválido) → error y el fake de BD/Blob no fue llamado.
  - [ ] Sin `--ejecutar` el script no escribe en BD ni Blob (S8).
  - [ ] `back/scripts/salidas/` ignorado por git.
- **Pruebas**: `back/test/scripts/recargaExcel.test.js` (importa solo `argumentos.js`, `ambiente.js`, `consola.js` y `autorizarOperador`; ninguna conexión).
- **Depende de**: T8

### T10 — Aislamiento de la recarga respecto de HTTP
- **Archivos**: modificar `back/test/http/rutasProtegidas.test.js` (o crear `back/test/http/recargaNoExpuesta.test.js`).
- **Qué hacer**: prueba que lee el texto de `back/src/infrastructure/http/routes/*.js`, `back/src/application/**/*.controller.js` e `back/index.js` y verifica que ninguno contiene `recargarVersion`, `recargaExcel` ni `scripts/` (S5-e, S11).
- **Criterios de aceptación**: [ ] la prueba falla si se agrega un `require` del servicio de recarga a una ruta o controller.
- **Pruebas**: la descrita.
- **Depende de**: T8

### T11 — Postman
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único archivo editable de `postman/`), carpeta `20 - Importación (layout y productos)` → subcarpeta `Importar productos (POST /versiones/:id/importar-productos)`. Seguir `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md`.
- **Qué hacer** (después de las solicitudes existentes, sobre `{{versionIdImportacionProductos}}`):
  1. `201 - Reemplazar productos de Por ubicar`: mismo cuerpo que la importación previa + `"reemplazar": true` → `eliminados > 0`, `totalImportados` > 0, sin omitidos "Ya está en la versión".
  2. `201 - Reemplazar de nuevo es idempotente`: mismo cuerpo → mismos `totalImportados`; `eliminados` = `totalImportados` de la anterior (guardar en variable).
  3. `400 - reemplazar no booleano`: `"reemplazar": "true"` → 400 `VALIDATION_ERROR`.
  4. `422 - reemplazar en versión publicada (con claves ajenas)`: `{{versionIdGondolasPublicada}}` (u otra publicada sembrada) con `{ productos, reemplazar: true, permitir_no_editable: true, estados_permitidos: ["publicado"] }` → 422; luego `GET` de su estructura/conteo confirma que "Por ubicar" no cambió.
  5. `201 - reemplazar omite SKU ubicado en góndola real`: si el setup de la carpeta deja un SKU fixture en una góndola real de una versión editable, reemplazar con ese SKU → `omitidos` con `"Ya está ubicado en la versión"`; si no existe ese estado, crearlo en el setup de la carpeta con los endpoints de posiciones.
  6. `422 - reemplazar con accesorio inexistente` → 422 y conteo de "Por ubicar" sin cambio.
- **Criterios de aceptación**: [ ] la carpeta corre completa dos veces seguidas en DEV sin pasos manuales.
- **Depende de**: T7, T4

### T12 — Documentación y deuda
- **Archivos**: `Arquitectura/Contratos/20_importacion/POST_versiones_importar_productos.md`, crear `Arquitectura/Contratos/20_importacion/RECARGA_EXCEL_servicio.md`, `Arquitectura/ENDPOINTS.md`, `Arquitectura/ESTADO_MODULOS.md` (apartado importación: reemplazo, excepción de publicadas solo por script, lector espejo), `Arquitectura/ESTRUCTURA_BACKEND.md` (árbol: `back/scripts/`, `infrastructure/excel/`, `application/recargaExcel/`), `Arquitectura/DESPLIEGUE_AZURE.md` (sección "Recarga de productos desde adjuntos": uso, quién puede correrla en PROD y con qué banderas), `Arquitectura/DEUDA_TECNICA.md`.
- **Qué hacer en deuda**:
  - DT-20: nota "mitigada en el camino `reemplazar`/recarga (UPDLOCK y lectura dentro de la transacción); abierta en el camino normal".
  - DT-25: severidad **Media**; nota: el script deja respaldo con usuario, el HTTP no.
  - DT-29: severidad **Media**; ahora también el lector del Excel completo está duplicado; objetivo: el front delega la lectura al back en la feature siguiente.
  - Nuevas: **DT-43** (Media, BD) sin índice único filtrado de una "Por ubicar" por versión; **DT-44** (Media, back · proceso) excepción permanente "versión publicada se recarga" por script fuera de la API, con clave de cuenta del Blob; **DT-45** (Baja, back) `Producto` de CATI insertado fuera de la transacción del reemplazo; **DT-46** (Baja, back) la simulación no consulta CATI: SKU no locales se conocen solo al ejecutar.
- **Criterios de aceptación**: [ ] commit de docs separado del de código.
- **Depende de**: T1–T11

### T13 — Recarga en DEV (operación, con el usuario)
- **Qué hacer**: tras la aprobación del código: (1) `cd back && npm run recarga-excel -- --ambiente=dev --departamento="<valor exacto>"` (el usuario pega su token CAO); si el departamento no existe, el script lista los valores y se elige el de Limpieza con el usuario. (2) Presentar al usuario el resumen y las versiones `VARIOS_EXCEL`/`CON_ERRORES`/`PLANOGRAMA_DISTINTO`; re-simular con `--adjunto`/`--aceptar-planograma` según lo que decida. (3) **Solo con su visto bueno**: `npm run recarga-excel -- --ambiente=dev --ejecutar --plan=scripts/salidas/plan-….json`. (4) Reportar `resultado-….json` (recargadas, omitidas, fallidas) y conservar los respaldos fuera del repo.
- **Criterios de aceptación**: [ ] ninguna ejecución sin simulación revisada por el usuario; [ ] nada en PROD.
- **Depende de**: T1–T11

## Verificación final

- `cd back && npm test` (incluye las pruebas espejo del lector, dominio, servicio, script y aislamiento HTTP).
- `cd back && node --check scripts/recargaExcel.js` y `npm audit --omit=dev` (anotar resultado).
- Front: sin cambios (no aplica `npm test`/`tsc`/`lint` del front, salvo confirmar que no hay diff en `front/`).
- Postman: carpeta `20 - Importación (layout y productos)` completa, dos corridas seguidas.
- Prueba manual: simulación en DEV con `--version=<id>` de una versión de prueba → revisar plan; ejecución de esa sola versión → comparar "Por ubicar" con el Excel (bloque correcto del tipo de la versión) y que el respaldo existe.

## Riesgos

- El lector del back diverge del front → pruebas espejo completas (T1) y nota DT-29; cualquier cambio futuro de reglas toca ambos.
- Valores de `departamento` en DEV distintos de lo esperado → el script aborta listando los existentes; `--version` permite acotar.
- `PLANOGRAMA_DISTINTO` masivo por formato de código → aceptación explícita por versión tras revisarlo con el usuario.
- Sesión CAO vence a mitad de una corrida larga → `mantenerSesionActiva` antes de cada versión; si CATI responde 401, la versión queda `FALLIDA` y se reintenta con un plan nuevo (idempotente).
- Recargar publicadas cambia lo que ven las tiendas de inmediato → el resumen muestra publicadas y tiendas afectadas y la ejecución requiere el visto bueno del usuario (T13).
- `read-excel-file` con un ZIP que expande mucho → tope de 10 MB comprimido, timeout de descarga y tope de 5000 filas.
