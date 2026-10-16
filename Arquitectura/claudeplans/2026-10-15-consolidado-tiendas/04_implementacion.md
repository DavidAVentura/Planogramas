# 04 — Implementación · Consolidado Tiendas

Rama `feat/consolidado-tiendas`, sin commits (base `2a06094`). T23 (documentación) queda para el coordinador.
Esta corrida terminó T22 y repasó T1–T21 contra el PLAN.

## Tareas

| ID | Estado | Archivos principales |
|---|---|---|
| T1 | Hecha, **migración sin aplicar** | `back/src/infrastructure/db/migrations/017_indices_consolidado.js` (5 índices, `IF NOT EXISTS`, `down` inverso) |
| T2 | Hecha | `back/package.json` (`write-excel-file` 4.1.1 exacta), `package-lock.json`, `src/config/env.js` (`consolidado.exportacionMaxFilas`), `.env.example`. `npm ls fflate` → 0.8.3 sin `overrides` |
| T3 | Hecha | `skuVersion.entity.js` (exporta `valorComun`), `domain/compartido/gancho.js` (`textoGancho`), `skuVersion.repository.js`, `repositories/mapeadoresVersion.js`, `test/domain/gancho.test.js` |
| T4 | Hecha | `back/src/domain/consolidado/columnas.js`, `test/domain/consolidadoColumnas.test.js` |
| T5 | Hecha | `domain/consolidado/consolidado.entity.js`, `test/domain/consolidado.test.js` |
| T6 | Hecha | mismo `consolidado.entity.js` y su prueba |
| T7 | Hecha | `domain/consolidado/consolidado.repository.js`, `consolidado.usecases.js`, `application/consolidado/semaforo.js`, `test/domain/consolidadoUsecases.test.js` |
| T8 | Hecha | `infrastructure/repositories/consolidado.repository.js`, `infrastructure/cati/catiClient.js` (deduplicación en vuelo) |
| T9 | Hecha | `infrastructure/exportacion/libroXlsx.js`, `test/infrastructure/libroXlsx.test.js` |
| T10 | Hecha | `application/compartido/validacion.js` (`validarQueryEstricta`), `application/consolidado/consolidado.schemas.js`, `test/application/consolidadoSchemas.test.js` |
| T11 | Hecha | `http/middlewares/rateLimit.js`, `test/http/rateLimitUsuario.test.js` |
| T12 | Hecha | `application/consolidado/consolidado.controller.js`, `http/routes/consolidado.routes.js`, `routes/index.js`, `test/http/consolidadoRutas.test.js` |
| T13 | Hecha | `postman/planogramas-import.postman_collection.json`: carpeta `21 - Consolidado tiendas` (JSON válido; 3 subcarpetas: 27 pruebas de listado, 3 de filtros, 15 de exportar). Solo se tocó el archivo editable |
| T14 | Hecha | `front/src/types/consolidado.ts`, `services/consolidado.service.ts`, `services/httpClient.ts` (`getBinario` con `query`) |
| T15 | Hecha | `domain/permisos/permisos.ts` y `.test.ts`, `constants/navegacion.ts`, `AppTopbar.tsx/.css`, `router/routes.tsx` |
| T16 | Hecha | `domain/columnas/preferenciasColumnas.ts` (+ test), `domain/implementacion/columnasProductos.ts`, `PanelColumnas.tsx/.css`, `ProductosVersiones.tsx` |
| T17 | Hecha | `SeleccionVersionesModal` movido a `components/dominio/modales/`; `productos/CadenaJerarquia/`; `ProductosFiltros`, `SeleccionMultipleModal`, `Paginacion` |
| T18 | Hecha | `domain/consolidado/columnasConsolidado.ts` y `filtrosConsolidado.ts` (+ tests), `config/preferenciasConsolidado.ts` |
| T19 | Hecha | `hooks/useConsolidado.ts`, `hooks/useFiltrosConsolidado.ts` |
| T20 | Hecha | `components/dominio/consolidado/ConsolidadoFiltros/` (incluye `ResumenFiltrosCompacto`), `ConsolidadoTable/` |
| T21 | Hecha | `components/dominio/consolidado/DescargarConsolidadoModal/` |
| T22 | Hecha | `pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx/.css`; ruta `/mantenimiento/consolidado-tiendas` en `router/routes.tsx` con `protegida(REGLAS.analista, 'analista', …)` |
| T23 | No se hace aquí | Lo hace el coordinador en el cierre |

T22: la ruta estaba completa. La página ya estaba completa (estados de carga/vacío/error, panel de columnas con nota, modo extendido, paginación con `pageSizes`, descarga con `createObjectURL` + `revokeObjectURL`, toasts). No hizo falta cambiarla.
La página reutiliza `ProductosVersionesPagina` (patrón de modo extendido, D16: `AppTopbar` oculta, Escape).

Repaso de T1–T21 contra el PLAN: se contrastaron los criterios verificables por inspección (dependencia y `fflate`, env, migración, montaje de ruta, carpeta Postman, módulos citados) y por las pruebas. No se encontró nada que faltara.

## Verificación

| Comando | Resultado |
|---|---|
| `cd back && npm test` | 181 pruebas, 33 suites, **181 OK, 0 fallos** |
| `cd front && npm test` | 10 archivos, **102 pruebas OK** |
| `cd front && npx tsc -b` | sin errores |
| `cd front && npm run build` | OK (3,09 s); aviso conocido de chunk > 500 kB |
| `cd front && npm run lint` | 469 problemas (29 errores, 440 avisos), **todos preexistentes** en CSS ajenos (UsarAdjuntos, AsignarSku, etc.). El único error en un archivo que toqué es `SeleccionVersionesModal.css` (3 errores de literales: `0 0 0 3px`, `6px`, `#f7f8fe`), contenido movido sin cambios (git lo ve como renombre puro) y ya cubierto por DT-50. Los archivos nuevos solo dan un aviso: `CadenaJerarquia.tsx:6` (`react(only-export-components)`, por exportar `NIVELES_JERARQUIA` como pide T17). |
| `npm ls fflate` | `write-excel-file@4.1.1` → `fflate@0.8.3` |
| `npm audit --omit=dev` | 5 hallazgos (joi, proxy-addr, qs, sprintf-js y otro), todos de dependencias previas; ninguno de `write-excel-file` ni `fflate` |
| `npm run migrate:status` | no se pudo ejecutar: `Failed to connect to comerciales.database.windows.net:1433` (sin acceso a la BD desde esta sesión). No se tocó la BD |
| Postman | JSON de la colección válido; no se ejecutó la carpeta (requiere API y BD) |

## Desviaciones del plan

- Ninguna funcional. Los artefactos extra son `ResumenFiltrosCompacto.tsx` (parte de `ConsolidadoFiltros`, modo extendido) y helpers en `filtrosConsolidado.ts` (`filtrosEfectivos`, `quitarDeFiltros`, `detalleErrorListado`) que la página usa.
- La carpeta Postman quedó antes de `voz` y `99 - Limpieza`, en lugar de justo antes de 99 (orden cosmético).

## Bloqueos

- No se verificó contra la BD: migración 017 sin aplicar (a decidir por el usuario, solo DEV), criterio de volumen de T8 (~3 200 filas en < 2 s), ni la carpeta Postman contra una API en marcha. Tampoco hubo prueba manual en navegador.

## Deuda detectada

Sin deuda nueva respecto de la ya prevista en el PLAN (DT-43 a DT-50). Observaciones para el cierre:
- `CadenaJerarquia.tsx` exporta constantes junto con el componente (aviso `only-export-components`); resolver moviendo `NIVELES_JERARQUIA` a `constants/` si se quiere cero avisos.
- Errores de stylelint preexistentes (29) en CSS ajenos; `SeleccionVersionesModal.css` encaja en DT-50.
- `npm audit --omit=dev` tiene 5 hallazgos previos (joi, qs, proxy-addr, sprintf-js); no registrados en `DEUDA_TECNICA.md` según lo revisado.

## Correcciones ronda 1

Solo los hallazgos Importantes; los Menores no se tocaron.

| Hallazgo | Corrección | Archivos |
|---|---|---|
| Calidad I1 (AGREGADO suma parcial con "Varía") | `sumarMinMaxAgregado` marca `minVaria`/`maxVaria` si alguna versión que aporta varía y devuelve `TEXTO_VARIA` en esa columna (la otra columna sigue sumando). Prueba nueva: versión A mín. 4 + versión B con mín. 2 y 3 → `Varía`; máx. sin variación → 12. | `back/src/domain/consolidado/consolidado.entity.js`, `back/test/domain/consolidado.test.js` |
| Calidad I2 (carga/error de `/filtros`) | La página pasa `cargando`, `error` y `recargar` de `useFiltrosConsolidado` a `ConsolidadoFiltros`. Mientras carga o si falló, los disparadores de tienda y versión quedan deshabilitados (los modales no se montan, así que nunca dicen "No hay versiones"); con error aparece un aviso `role="alert"` con `Reintentar`. `BotonSeleccionMultiple` ganó la prop opcional `disabled` (con estilo). | `front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx`, `front/src/components/dominio/consolidado/ConsolidadoFiltros/ConsolidadoFiltros.{tsx,css}`, `front/src/components/ui/BotonSeleccionMultiple/BotonSeleccionMultiple.{tsx,css}` |
| Seguridad I1 (limitador evadible al abortar) | Se quitó `skipFailedRequests`/`requestWasSuccessful`. Para que los 400 sigan sin gastar cupo se creó el middleware `validarQuery(schema)` y el orden de las rutas es: `requiereAnalista` → `validarQuery` → limitador → controller (el controller conserva su propia validación). Pruebas: la 6.ª petición responde 429 aunque las 5 anteriores se hayan abortado; los 400 siguen sin gastar cupo; la prueba de rutas ahora espera 3 capas en listar y exportar. | `back/src/infrastructure/http/middlewares/rateLimit.js`, `back/src/infrastructure/http/middlewares/validarQuery.js` (nuevo), `back/src/infrastructure/http/routes/consolidado.routes.js`, `back/test/http/rateLimitUsuario.test.js`, `back/test/http/consolidadoRutas.test.js` |

Resultados: `back npm test` 183/183 OK · `front npm test` 102/102 OK · `npx tsc -b` sin errores · `npm run build` OK · `npm run lint` 29 errores, los mismos preexistentes (CSS ajenos); ninguno nuevo en los archivos tocados.

Notas: M3 de calidad (desviación del 400 sin cupo) queda resuelta por el nuevo orden; hay que reflejar el orden `validarQuery` → limitador en el contrato y `ESTADO_MODULOS.md` (T23). Sin pruebas de componente para I2 (el front solo prueba lógica pura); falta verificarlo en navegador.

## Ajustes del coordinador tras la revisión (2026-10-16, pedidos por el usuario)

- **Migración 017 aplicada en DEV** (`OTB`, batch 15). `npm run migrate:status`: sin pendientes. PROD sigue sin aplicar (DT-08).
- **Accesorios dentro de Mantenimiento**: `constants/navegacion.ts` mueve Accesorios como primer hijo del grupo
  (conserva la ruta `/accesorios`); `AppTopbar.tsx` marca el grupo activo también cuando la ruta coincide con un
  hijo fuera del prefijo `/mantenimiento`; `permisos.test.ts` actualizado. Front: 102/102, `tsc -b` sin errores.
- **Productos oculta del menú del analista** (pedido del usuario, sin eliminarla): se quitó la entrada de
  `constants/navegacion.ts`; la ruta `/productos` sigue activa. Registrada como **DT-51** en `DEUDA_TECNICA.md`.
- **Min/Max agregado suma también mín. estético y capacidad máxima** (pedido del usuario): `sumarFisicosAgregado`
  en `consolidado.entity.js` suma TODAS las filas del grupo (planograma + cross + impulso), sin deduplicar por
  versión como el mín./máx. final, porque son valores físicos de cada posición; las filas sin valor no aportan y
  si ninguna tiene valor queda vacío. Prueba nueva en `consolidado.test.js`; texto del modal actualizado.
  Back 184/184.
- **Menú: grupo "Productos" con "Por versión" y "Por tienda"** (decisión del usuario: unificar solo en la
  navegación). `navegacion.ts`: el grupo Productos agrupa `/por-version` y `/mantenimiento/consolidado-tiendas`
  (etiqueta "Por tienda"); Mantenimiento queda con Accesorios. Las rutas no cambian. `AppTopbar.tsx`: el grupo se
  marca activo solo por las rutas de sus hijos (si no, Mantenimiento se marcaba en Por tienda). `permisos.test.ts`
  actualizado. Front 102/102, `tsc -b` sin errores. Tabla duplicada y ruta registradas como **DT-52**.
- **"Por versión" pasa a llamarse "Por planograma"** (solo el texto: menú y migas de `ProductosPorVersion`; la ruta
  `/por-version` no cambia) y **Tiendas pasa al grupo Mantenimiento** (junto a Accesorios; ruta `/tiendas` sin
  cambios). `permisos.test.ts` actualizado. Front 102/102, `tsc -b` sin errores.
