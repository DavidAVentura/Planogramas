# 04 — Implementación: filtro Área › Departamento y descarga `.xlsx` en Productos por planograma

Rama `feat/productos-planograma-filtros-descarga`, sin commits. T14 (documentación) queda para el coordinador.

## Tareas

| ID | Estado | Archivos tocados |
|---|---|---|
| T1 | Hecha | `back/src/application/compartido/semaforo.js` (movido desde `consolidado/`, + `semaforoExportacion`), `back/src/application/compartido/esquemasComunes.js` (nuevo), `consolidado.schemas.js`, `consolidado.controller.js`; prueba `back/test/application/semaforo.test.js`; se ajustó el `require` del semáforo en `consolidadoUsecases.test.js` y `consolidadoRutas.test.js` |
| T2 | Hecha | `back/src/domain/consolidado/consolidado.entity.js` (`construirFilasPorVersion(base, { estados, skus, posicionIds })`, `tipoVersion`, `esEspecial`, `variaciones`, export `ORDEN_MODO`); pruebas en `back/test/domain/consolidado.test.js` |
| T3 | Hecha | `back/src/infrastructure/repositories/baseVersiones.js` (nuevo), `consolidado.repository.js`, `implementacion.repository.js` (`cargarBaseVersiones`), contrato `domain/implementacion/implementacion.repository.js` |
| T4 | Hecha | `back/src/domain/implementacion/columnasExportacion.js`, `exportacionPorVersion.entity.js`; `back/test/domain/exportacionPorVersion.test.js` |
| T5 | Hecha | `back/src/infrastructure/exportacion/libroXlsx.js` (grupos, anchos, congelado; exporta también `construirHoja`); `back/test/infrastructure/libroXlsx.test.js` |
| T6 | Hecha | `back/src/domain/implementacion/implementacion.usecases.js` (`resolverJerarquia`, `obtenerProductosPorVersion` con jerarquía, `exportarProductosPorVersion`), `back/src/domain/compartido/erroresExportacion.js` (nuevo, movidos desde `consolidado.usecases.js`); `back/test/domain/implementacionUsecases.test.js` |
| T7 | Hecha | `application/implementacion/implementacion.schemas.js`, `middlewares/validarCuerpo.js`, `implementacion.controller.js` (`crearControllerExportacion`), `implementacion.routes.js`, `rateLimit.js`, `app.js`; pruebas `implementacionSchemas.test.js`, `implementacionExportar.test.js`, `matrizPermisos.test.js`, `rateLimitUsuario.test.js` (`rutasProtegidas.test.js` recorre las rutas solo y pasa sin cambios) |
| T8 | Hecha | `front/src/domain/implementacion/descargaPorVersion.ts` y `.test.ts`, `front/src/types/implementacion.ts`, `front/src/utils/excelProductosPlanograma.test.ts` |
| T9 | Hecha | `front/src/services/implementacion.service.ts`, `front/src/hooks/useImplementacion.ts` |
| T10 | Hecha | `front/src/components/ui/IconoDescarga/IconoDescarga.tsx`, `ConsolidadoTiendas.tsx`, `CadenaJerarquia.tsx` (`niveles`) |
| T11 | Hecha | `ProductosVersiones.tsx` (`onFilasFiltradas`; se quitaron los espacios finales de las líneas en blanco) |
| T12 | Hecha | `front/src/components/dominio/implementacion/DescargarProductosVersionModal/*.tsx|css` |
| T13 | Hecha | `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx` y `.css` (`#fff` → `var(--white)`) |
| T14 | No aplica | La hace el coordinador al cierre |
| T15 | Hecha | `postman/planogramas-import.postman_collection.json`, carpeta `16 - Implementación`: 6 escenarios nuevos y un 401 en "Listar productos por versión"; subcarpeta nueva "Descargar productos por versión (POST /implementacion/productos/exportar)" con 22 escenarios. JSON validado |

## Verificación

- `cd back && npm test`: 337 pruebas, 337 correctas.
- `cd front && npm test`: 13 archivos, 151 pruebas correctas.
- `cd front && npx tsc -b`: sin errores.
- `cd front && npm run lint`: oxlint sin errores en los archivos tocados. `lint:css` falla con 29 errores que ya existían (la base daba 469 problemas y 29 errores; ahora 468 y 29: se quitó el `#fff` de `ProductosPorVersion.css`). Los CSS nuevos no aportan errores.
- `cd front && npm run build`: correcto (solo el aviso de tamaño de chunk que ya existía).
- Postman: JSON válido con el comando del estándar. No se corrió el Runner (requiere el entorno DEV con CAO).

## Desviaciones respecto al plan

1. **Inventario con jerarquía (T6)**: el plan dice que, con tienda, el inventario se consulta solo con los SKU filtrados. Pero el resumen `versiones[]` no se filtra y calcula `conInventario` y `implementable` con el mapa de inventario; con un mapa parcial esos valores saldrían mal (SKU sin fila = sin inventario). Se consulta el inventario con los SKU de todas las posiciones de las versiones (como hoy) y solo después se descartan las filas de `data`. `total === data.length` y `versiones[]` completo se cumplen. Cuesta lo mismo que antes de este cambio.
2. **Estado `archivado` (T4/T6)**: se agregó `archivado` a `ETIQUETA_ESTADO_TODOS`, `ORDEN_ESTADO` y a `ESTADOS_EXPORTABLES`. La pantalla permite elegir versiones archivadas que llegan por enlace; sin esto la descarga las dejaba en blanco sin avisar. La etiqueta es `Archivada`.
3. **`cargarBaseVersiones` con versiones incluidas (T6)**: en el Pivote se carga la base solo de las versiones incluidas (sin las especiales), no de todas las elegidas. Es una optimización; la hoja `Versiones` sigue listando todas.
4. **Semáforo movido (T1)**: al borrar `application/consolidado/semaforo.js` hubo que cambiar el `require` en `consolidadoUsecases.test.js` y `consolidadoRutas.test.js` (una línea cada uno; sin cambio de lógica de prueba).
5. **`CLAVES_FILA` del consolidado (T2)**: la prueba `consolidado.test.js` que fija las claves de la fila agregada se actualizó con `tipoVersion`, `esEspecial` y `variaciones` (campos nuevos de la fila).
6. **`departamento` exige `area` también en el esquema Joi de la exportación (T7)**, además de en el caso de uso, para rechazarlo en el middleware antes de gastar cupo.
7. **Botón Descargar (T13)**: se deshabilita también mientras la tabla está cargando (`cargando`), además de sin versiones o sin `productos`. Así los `posicionIds` enviados corresponden a la jerarquía que se ve.
8. **`onFilasFiltradas` (T11)**: el efecto depende de `[filas, hayFiltrosCliente, onFilasFiltradas]` (un booleano derivado en lugar de `busqueda` y `filtros`); el comportamiento es el pedido. La página compara y solo actualiza el estado si cambió algo.
9. **Reimportación (T8)**: el lector del front no descarta SKU repetidos; el que se queda con el primero y reporta el resto es el importador del backend (`importacion.entity.js`, «Repetido en el archivo»). La prueba del front comprueba que el lector entrega las filas en el orden del archivo (la publicada primero).
10. **Literal compartido front/back (B7)**: no hay una prueba que lea el archivo del back desde el front; el literal está duplicado en `descargaPorVersion.ts` y `columnasExportacion.js`, y cada lado lo prueba con el mismo texto (la prueba de reimportación usa el literal del front contra el lector real).
11. **Postman, 422 de Pivote no aplicable**: no se agregó. El Setup solo tiene una versión GRANDE y una MEDIANA en el mismo planograma (tipos distintos), y crear dos del mismo tipo y estado depende de reglas de creación de versiones que no pude probar sin tocar BD. Queda cubierto por `exportacionPorVersion.test.js`, `implementacionUsecases.test.js` y `implementacionExportar.test.js`. Tampoco hay 403 ni 429 (el token de la colección es analista y el límite de 5/min rompería la corrida).
12. **`errorHandler` y 413**: el cuerpo de más de 512 kb responde 413 con `{ error: { code: 'ERROR', message } }` (forma estándar, código genérico), porque el manejador global usa `err.code` y el error de `express.json` no trae uno. No se tocó el manejador global.

## Bloqueos

Ninguno de diseño. Lo que no se pudo ejercer sin entorno real queda sin probar: el Runner de Postman, la lectura real de BD de `cargarBaseVersiones` (consultas calcadas de las del consolidado) y CATI (áreas y departamentos).

## Deuda detectada

Sin cambios respecto a la que ya lista el plan (DT-71 a DT-75). Adicional, para consolidar:

| Propuesta | Severidad | Detalle |
|---|---|---|
| DT-76 | Baja | `errorHandler` responde 413 de `express.json` con `code: 'ERROR'` genérico; conviene un código propio (`PAYLOAD_TOO_LARGE`) para todo el API. |
| DT-77 | Baja | Sin prueba cruzada que compare el literal de encabezados del Pivote entre `columnasExportacion.js` y `descargaPorVersion.ts` (hoy cada lado lo prueba por separado). |
| DT-78 | Baja | `postman/` sin escenario 422 `PIVOTE_NO_APLICABLE`: falta un Setup que cree dos versiones del mismo planograma, tipo y estado. |

## Correcciones ronda 1

| Hallazgo | Corrección | Archivos |
|---|---|---|
| Calidad M1 | `expandirPorTienda` quita `tipoVersion`, `esEspecial` y `variaciones` al armar `grupo.planograma`/`grupo.otras`: `GET /consolidado` queda como antes. El Pivote y la Lista siguen usando las filas completas de `construirFilasPorVersion`. | `back/src/domain/consolidado/consolidado.entity.js` |
| Calidad M4 / Seguridad M1 | `ordenarPivote` desempata por `planogramaId` tras el nombre. Prueba nueva con dos planogramas del mismo nombre (independiente del orden de entrada). | `back/src/domain/implementacion/exportacionPorVersion.entity.js`, `back/test/domain/exportacionPorVersion.test.js` |

Verificación: `cd back && npm test` → 338 pass, 0 fail. Front sin cambios. Sin deuda nueva.

## Correcciones ronda 2 (pedido del usuario al probar)

Problema: en `/por-version`, Tienda, Descargar y la jerarquía quedaban sueltos arriba a la derecha, fuera de la barra de filtros.

- `ProductosVersiones` (compartido) gana props opcionales `filtrosExtra`, `filtrosExtraActivos`, `onLimpiarFiltrosExtra` y `accionesExtra`; se elimina `controles` (solo lo usaba Por versión). Con `filtrosExtra` la barra sigue el patrón del Consolidado: fila de acciones (Columnas, Descargar, `BotonFiltros` con contador, Extender) y debajo la fila horizontal de filtros (Buscar, Planograma versión, Tienda, Área, Departamento, Limpiar) que se colapsa con `hidden` (sin desmontar, para conservar las opciones de la jerarquía). Sin `filtrosExtra` (Implementador) el render es el mismo de antes.
- Componentes reutilizados: `ui/BotonFiltros` y `CadenaJerarquia`; mismo formato que `ConsolidadoFiltros` (etiquetas solo para lector de pantalla, controles de 38px).
- `ProductosPorVersion.tsx`: Tienda, `CadenaJerarquia` y el hint pasan como `filtrosExtra`; Descargar como `accionesExtra`; "Limpiar filtros" también quita tienda y jerarquía.
- CSS: se eliminan `productos-por-version__controles` y `__fila`; `__hint` se conserva (aplica con jerarquía elegida) y `__tienda` se ajusta a 38px.
- No se replicó el modo compacto con chips (`ResumenFiltrosCompacto`) en vista extendida: en Por versión la barra completa se oculta en extendida, como antes. Deuda menor.
- Verificación: `npm test` 151/151, `npx tsc -b` limpio, oxlint y stylelint sin errores en los archivos tocados (quedan advertencias preexistentes de hex/rgb en ProductosVersiones.css).

## Correcciones ronda 3 (pedido del usuario al probar)

- El usuario pidió **deshabilitar el filtro de jerarquía CATI (Área › Departamento) sin borrarlo**: en
  `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx` se agregó la constante
  `MOSTRAR_FILTRO_JERARQUIA = false` y `CadenaJerarquia` solo se renderiza si es `true`. El estado de la
  jerarquía queda vacío, así que el listado y la descarga no envían `area`/`departamento`; el soporte del
  back (validación, CATI, 503) y del front (servicio, hooks, `CadenaJerarquia.niveles`) se conserva.
- Deuda de limpieza: **DT-79** — decidir si se reactiva el filtro (cambiar la constante) o se elimina el
  código muerto (constante, estado y textos de jerarquía en la página, `area`/`departamento` del listado y
  de la exportación en back y front, columnas Área/Departamento de la Lista se mantienen).
- Verificación: `npx tsc -b` limpio, oxlint sin errores, front `npm test` 151/151.
