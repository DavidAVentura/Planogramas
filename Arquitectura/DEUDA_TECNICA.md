# Deuda técnica

Registro de lo que sabemos que hay que corregir y decidimos no corregir todavía. Es la fuente única:
los agentes de `/desarrollo` reportan deuda nueva en sus entregables y el coordinador la consolida
aquí en la etapa de cierre.

**Reglas**
- Un ID por ítem (`DT-NN`, nunca se reutiliza). Al resolverlo, cambiar el estado a `Resuelta` con la
  fecha y el plan que lo cerró; no borrar la fila.
- Severidad: **Crítica** (riesgo de seguridad o pérdida de datos), **Alta** (bloquea crecer o publicar
  con confianza), **Media** (frena o genera inconsistencias), **Baja** (limpieza).
- Antes de planear un cambio, el arquitecto revisa si toca alguna deuda abierta y la incluye o la
  menciona en el plan.

| ID | Título | Severidad | Área | Detectada | Estado |
|----|--------|-----------|------|-----------|--------|
| DT-01 | Autorización por permisos/tiendas de CAO (permisos resueltos; falta el filtro por tienda) | Crítica | back | 2026-10-12 · configuración de `/desarrollo` | Parcial (permisos resueltos 2026-10-12, plan `2026-10-12-permisos-cao`); falta el filtro por tienda (DT-10) |
| DT-02 | 78 archivos CSS con valores fuera de los tokens (lista legacy en `front/.stylelintrc.json`) | Media | front | 2026-10-12 · reglas de stylelint | Abierta |
| DT-03 | `listarPlanogramas` devuelve `pageSize: NaN` si recibe un valor no numérico | Baja | back | 2026-10-12 · pruebas de dominio | Abierta |
| DT-04 | Sin tokens de escala tipográfica ni de espaciado | Media | front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-05 | 26 errores de stylelint preexistentes y `npm run lint` no corre en CI | Media | front · CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-06 | Cobertura de pruebas mínima: sin pruebas del resto de entidades, casos de uso ni integración HTTP/BD | Media | back · front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-07 | `adjuntos` (13) y `agente-extractor` sin carpeta de pruebas Postman | Media | back | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-08 | Estado de migraciones de PROD sin verificar | Alta | BD | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-09 | El workflow de API PROD instala devDependencies y usa `actions/setup-node@v3` (DEV usa `--omit=dev` y v4) | Baja | CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-10 | Sin filtro por tienda del usuario en los endpoints I | Alta | back · front | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-11 | Acciones con la regla transitoria A sin permiso propio en CAO | Media | back · front | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-12 | Evidencias de cualquier tienda: lectura, carga y borrado por el usuario de tienda | Media | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-13 | Nombre provisional del perfil de tienda (`TIENDA-EST`) | Baja | back · docs | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-14 | La revocación de permisos tarda hasta 2 min (caché de CAO) | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta (aceptada) |
| DT-15 | `fetch` a CAO sin timeout y `details` del 503 con `causa.message` | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-16 | `express.json` (8 MB / 21 MB) corre antes de la autenticación | Baja | back | 2026-10-12 · plan `2026-10-12-permisos-cao` | Abierta |
| DT-17 | Las consultas de lectura que fallan (403, 500) se muestran como lista vacía sin mensaje | Media | front | 2026-10-15 · revisión en navegador de `2026-10-12-permisos-cao` | Abierta |
| DT-18 | A 1024 px de ancho el `AppTopbar` del analista desborda y aparece scroll horizontal | Baja | front | 2026-10-15 · revisión en navegador de `2026-10-12-permisos-cao` | Abierta |
| DT-19 | Postman sin sub-carpeta de 403 con `TOKEN_CAO_TIENDA` | Baja | back · pruebas | 2026-10-15 · plan `2026-10-12-permisos-cao` (T15) | Abierta |
| DT-20 | Importación concurrente duplica SKUs: estado de la versión y `skusDeVersion` se leen fuera de la transacción (mitigado por el botón deshabilitado en vuelo) | Media | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-21 | `mensajeDeError` ignora `details` de los 400 en todo el front (solo se resolvió en el modal de importar Excel) | Media | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-22 | Campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` de importar-productos: retirarlos cuando el front nuevo esté en DEV y PROD | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-23 | Resolución de accesorios en la importación con una consulta por código (tope de 200); falta `buscarPorCodigos` en lote | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-24 | Sin índice en `PosicionAccesorio.posicion_id` | Baja | BD | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Resuelta (2026-10-16, plan `2026-10-15-consolidado-tiendas`, migración 017; aplicada en DEV, PROD pendiente por DT-08) |
| DT-25 | `importarProductos` no registra quién importó | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-26 | Importación de Excel sin caso de uso en `CASOS_DE_USO.md` | Baja | docs | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-27 | Extractores de PDF e imagen numerada solo devuelven ganchos enteros: el PDF sí imprime `54E`, hoy se lee como 54 o no cruza con "Por ubicar" | Media | back · IA | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-28 | `Gancho = number \| string` (forma mixta) en vez de un tipo explícito | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-29 | Reglas duplicadas entre back y front: ganchos y código de accesorio | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-30 | La unicidad de ganchos solo se valida dentro de cada posición, no entre posiciones de la versión (preexistente) | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-31 | Accesorio eliminado entre la verificación de catálogo y el `insert` de la importación termina en rollback y `500` genérico | Baja | back | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-32 | `GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no se montan en ninguna página (solo `GondolaEscalaLienzo`): posible código muerto | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-33 | Un texto de gancho `54. 5` (espacio tras el punto) se parte en `[54, 5]` en el lector del Excel | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-34 | Reglas de entrada de ganchos distintas entre chips (`54 E` no se acepta), drawer y Excel (unión `\d\s+E` sin helper compartido) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-35 | Varios ganchos de exhibición en un facing angosto del lienzo a escala se recortan (el `title` los lista) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-36 | El front no aplica dos topes del back en la importación: 100 ganchos por producto y 100 facings implícitos (el lote falla con 400 de Joi sin fila de Excel) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-37 | Enteros de importación sin máximo (`unidades_por_facing`, `cantidad_apilable`, `capacidad_maxima`) pueden desbordar `INT` y terminar en `500` con rollback | Baja | back · front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-38 | El lector del Excel convierte en silencio un `0` explícito en `Cantidad_x_facing`/`cantidad_apilable` (a 1) y `capacidad_maxima` (a `null`) | Baja | front | 2026-10-15 · plan `2026-10-15-importar-excel-tamano-accesorio` | Abierta |
| DT-43 | Catálogo de columnas del consolidado duplicado back (Excel) / front (tabla); mitigado con el mismo literal de 24 claves en una prueba de cada lado | Baja | back · front | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-44 | "Una versión por planograma por tienda" solo la garantiza el dominio, no la BD | Baja | back · BD | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-45 | El consolidado recalcula toda la base en cada request (sin caché); medir p95 en PROD (objetivo < 2 s) | Baja | back | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-46 | `validarConJoi` fuerza `stripUnknown: true`: los parámetros desconocidos se descartan en silencio en los módulos 16 y 17 | Media | back | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-47 | Limitadores por IP sin `trust proxy`: en App Service `vozLimiter` agrupa a todos los usuarios bajo la IP del proxy | Media | back | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-48 | Exportación del consolidado síncrona en el event loop (mitigada con tope y semáforo de 1) | Baja | back | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-49 | `ui/Modal` sin Escape, foco inicial, trampa de foco ni devolución del foco al disparador | Media | front | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-50 | Colores literales en modales y filtros compartidos (`Modal.css`, `SeleccionMultipleModal.css`, `BotonSeleccionMultiple.css`, `SeleccionVersionesModal.css`, `ProductosVersiones.css`, `ProductosFiltros.css`), `constants/tiendas.ts` y `ESTADO_VERSION_IMPLEMENTACION_META` | Baja | front | 2026-10-15 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-51 | Vista Productos (`/productos`) oculta del menú del analista pero viva: ruta, página, endpoints y pruebas siguen activos sin acceso visible | Baja | front · back | 2026-10-16 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-52 | Tablas de Productos por versión y por tienda duplicadas (`ProductosVersiones` y `ConsolidadoTable`) y ruta de Por tienda fuera del grupo Productos (`/mantenimiento/consolidado-tiendas`) | Baja | front | 2026-10-16 · plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-53 | Consolidado: la exportación carga toda la base antes de tomar el semáforo y `/consolidado/tiendas/filtros` no tiene limitador | Media | back | 2026-10-16 · revisiones de calidad (M2) y seguridad (M1, M2) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-54 | El `down` de la 017 borra índices que la migración no creó y el `up` solo compara por nombre (posible índice duplicado en PROD) | Baja | BD | 2026-10-16 · revisión de seguridad (M3) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-55 | Deduplicación en vuelo de `listarSkusPorJerarquia`: si la primera llamada falla, todas las que esperaban reciben el mismo 503 | Baja | back | 2026-10-16 · revisión de seguridad (M4) del plan `2026-10-15-consolidado-tiendas` | Abierta (aceptada) |
| DT-56 | Las pruebas no fijan el orden de capas del consolidado (`validarQuery` → limitador) y `/consolidado/*` no tiene filas en `matrizPermisos.test.js` | Baja | back · pruebas | 2026-10-16 · revisión de seguridad (R1-M1) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-57 | Ganchos de exhibición menores que 10: el consolidado muestra `5E` y el resto de la app `05E`; helper de texto de gancho duplicado en el front | Baja | back · front | 2026-10-16 · revisión de calidad (M1) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-58 | Consolidado: peticiones y conteos desfasados (la búsqueda desde una página > 1 hace una petición de más; "Descargar" usa el resumen anterior mientras recarga) | Baja | front | 2026-10-16 · revisión de calidad (M4, M7) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-59 | Consolidado: estados incompletos (429 del listado se muestra como falla de conexión; filtros sin indicio de carga, chips con ids y selector de versión deshabilitado sin estilo) | Baja | front | 2026-10-16 · revisión de calidad (M8, N1, N2) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-60 | `ConsolidadoTable` repite chevron y badge `N planogramas` en cada fila principal de un grupo duplicado (controles idénticos para teclado y lector de pantalla) | Baja | front | 2026-10-16 · revisión de calidad (M6) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-61 | Limpieza del consolidado: `useConRetardo` definido en la página, `NIVELES_JERARQUIA` exportado junto al componente (aviso `only-export-components`) y rango de diacríticos con caracteres invisibles | Baja | back · front | 2026-10-16 · revisión de calidad (M5, M9, M10) del plan `2026-10-15-consolidado-tiendas` | Abierta |
| DT-62 | Filas antiguas de `EvidenciaImplementacion` y `Adjunto` con `subido_por` no numérico (nombre completo, `sistema`, fixtures): no se pueden atribuir y, en evidencias, nadie puede eliminarlas | Media | BD · back | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-63 | `mapAdjunto` expone `blobContainer`/`blobPath`/`blobUrl` en las respuestas de adjuntos | Baja | back | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-64 | `agregarAdjunto`/`reemplazarAdjunto` no borran el blob nuevo si falla la escritura en BD (queda huérfano) | Baja | back | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-65 | `usuarioActual` conserva respaldos `usuario`/`id`/`'sistema'` aunque el middleware garantiza `numeroEmpleado` | Baja | back | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-66 | El módulo 17 (evidencias) no tiene casos de uso en `CASOS_DE_USO.md` (los contratos citan CU-07-03, que no existe) | Baja | docs | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-67 | El nombre del autor de una carga puede salir de los claims del JWT si CAO no manda `username` | Baja | back | 2026-10-16 · plan `2026-10-16-evidencia-usuario-carga` | Abierta |
| DT-68 | Menores sin corregir de la revisión de calidad del autor de la carga: pruebas faltantes en `adjunto.test.js`, `formatearAutor` duplicado en el montaje, `title` que tapa el aviso "Supera el máximo", `tipoTitulo` con guiones y apóstrofos e indentación de `VersionResumenModal` | Baja | back · front | 2026-10-16 · revisión de calidad (M-01, M-02, M-03, M-05, M-06) del plan `2026-10-16-evidencia-usuario-carga` | Abierta |

## Detalle

### DT-01 — Autorización por permisos y tiendas (Parcial)
**Permisos resueltos (2026-10-12, plan `2026-10-12-permisos-cao`)**: todos los endpoints validan la
regla de `Arquitectura/SEGURIDAD_PERMISOS.md` (guards A/I/C/PLA00X) y el front oculta lo no permitido.
**Falta el filtro por tienda** (DT-10): se cierra cuando CAO actualice las tiendas por usuario y los
repositorios las apliquen.

### DT-02 — Valores fuera de los tokens
312 colores hex, 37 `rgb()`, 62 radios y 32 sombras sueltos al activar las reglas. 92 de los hex son
`#fff` (equivale a `var(--white)`). Al tocar un archivo de la lista, migrarlo y quitarlo de la lista.

### DT-03 — `pageSize: NaN`
`domain/planograma/planograma.usecases.js` → `Math.max(1, parseInt('x'))` es `NaN`. Hoy no ocurre
porque el controller valida con Joi antes; corregir si el caso de uso se reutiliza sin ese controller.

### DT-04 — Escala tipográfica y de espaciado
Hay 8 tamaños de fuente distintos (de 9px a 15px, incluido 10.5px) y unos 674 `padding/gap/margin`
en px. Definir `--text-*` y `--space-*` en `tokens.css` y una regla de stylelint que los exija.
Propuesta a cargo del agente disenador-ux.

### DT-05 — Lint en CI
Corregir los 26 errores (15 se arreglan con `--fix`) y agregar `npm run lint` a los workflows del front.

### DT-10 — Sin filtro por tienda del usuario
Cualquier usuario con PLA009/PLA010 consulta implementación y productos de cualquier `tiendaId` y
elige cualquier tienda en el chip. Depende de que CAO actualice `tiendas` por usuario (ya llega en
la sesión). Al resolverlo, DT-01 se cierra. El Consolidado Tiendas (`/consolidado/*`, módulo 21) muestra todas las
tiendas porque es solo de analista (regla A); no abrirlo a implementadores sin intersecar `cargarBase({ tiendaIds })`
con `req.usuario.tiendas`.

### DT-11 — Acciones con la regla transitoria A
Solicitar a IT CAO permisos para: archivar planograma; promover, archivar y guardar (cambio de
estado) de versión; gestionar adjuntos; gestionar accesorios; editar dimensiones de producto; agente
extractor (foto/PDF/IA); voz; Consolidado Tiendas (+3 rutas `/consolidado/*`; la descarga usa el mismo permiso que la
vista, decisión D1 revisable del plan `2026-10-15-consolidado-tiendas`). Mientras tanto un perfil con un subconjunto de PLA001–PLA008 queda
fuera de todas las vistas de analista, y cualquier perfil con los 8 puede archivar/promover. Al
llegar los códigos: reemplazar A en la ruta, en `matrizPermisos.test.js`, en `puede(...)` del front y
en `SEGURIDAD_PERMISOS.md`. **Condición de cierre**: al reemplazar A, la prueba de rutas debe comparar
la regla de cada ruta contra una tabla declarativa (hoy los `PLA00X` por ruta quedan tapados por A y
la prueba no detectaría que se quite uno; hallazgo M-03 de `05_revision_seguridad.md`).

### DT-12 — Evidencias de cualquier tienda
Sin filtro por tienda, un implementador lista y descarga evidencias de otra tienda (IDs secuenciales
en `/evidencias/:id/descargar`), sube evidencias a otra tienda (contamina su avance) y borra las que
él mismo subió en cualquier tienda (el dominio limita el borrado al autor). El borrado es físico, sin
auditoría. Además, desde 2026-10-16 la lista de evidencias de otra tienda expone el nombre y el número de
empleado de quien las subió (`subido_por`, `subido_por_nombre`); se aceptó (herramienta interna, usuarios CAO
autenticados). Se resuelve con DT-10 y, si se requiere trazabilidad, con borrado lógico.

### DT-13 — Nombre provisional del perfil de tienda
IT CAO está validando el nombre (en la matriz original aparece `TIENDAS-EST`; hoy `TIENDA-EST`). Vive
solo en `PERFILES.TIENDA` de `back/src/domain/compartido/permisos.js` y en la doc; no afecta reglas.
Actualizar cuando el usuario confirme.

### DT-14 — Revocación de permisos con retraso
TTL de 2 min del caché por token en `caoAuthClient`; el keepalive no refresca permisos. Aceptado.

### DT-15 — Timeout de `fetch` a CAO
`caoAuthClient.js`: expone nombres de host internos en `details` del 503 y un CAO colgado deja
colgado el request. Preexistente.

### DT-16 — Parseo de body antes de autenticar
`app.js`: `express.json` (8 MB / 21 MB) corre antes de la autenticación; un cliente sin token fuerza
el parseo de cuerpos grandes. Preexistente.

### DT-17 — Errores de lectura se ven como lista vacía
Las consultas de lectura que fallan (p. ej. 403 o 500) se muestran como lista vacía sin mensaje:
ninguna página usa `isError` de React Query. Comprobado en navegador: Accesorios con 403 muestra
"0 accesorios que coinciden". Incumple el estado "Error" de `DISENO_SISTEMA.md` §4. Corregir con un
estado de error por página o un componente común.

### DT-18 — `AppTopbar` desborda a 1024 px
A 1024 px de ancho el `AppTopbar` del analista desborda ~74 px y aparece scroll horizontal en la
página (`scrollWidth` 1098 vs 1024). Ajustar el layout (agrupar o compactar la navegación).

### DT-19 — Postman: 403 con usuario de tienda
La sub-carpeta de 403 con `TOKEN_CAO_TIENDA` se omitió porque no existe usuario de tienda (el caso
lo cubren los stubs de `back/test/http/matrizPermisos.test.js`). Agregarla a la carpeta `auth` de la
colección cuando exista el usuario.

### DT-20 — Importación concurrente
`importarProductos` lee el estado de la versión y `skusDeVersion` fuera de la transacción: dos importaciones
simultáneas del mismo archivo pueden duplicar SKUs. El botón deshabilitado en vuelo lo mitiga. Mover ambas
lecturas dentro de la transacción.

### DT-21 — `mensajeDeError` y `details`
El toast global ignora `details` de los 400. Solo `ImportarExcelProductosModal` lo resuelve por su cuenta.

### DT-22 — Campos legado de importar-productos
`accesorio_codigo`/`tamano_accesorio_pulgadas` se aceptan solo si `accesorios` viene vacío. Retirarlos
cuando el front nuevo esté publicado en DEV y PROD.

### DT-23 — Resolución de accesorios sin consulta en lote
Una consulta `buscarPorCodigo` por código (tope de 200). Agregar `buscarPorCodigos`.

### DT-24 — Índice en `PosicionAccesorio.posicion_id` (Resuelta)
Sin índice; se nota al leer accesorios de muchas posiciones. **Resuelta (2026-10-16, plan `2026-10-15-consolidado-tiendas`)**: la migración
`017_indices_consolidado.js` crea `IX_PosicionAccesorio_posicion` y, además, `IX_Gondola_version`, `IX_Nivel_gondola`,
`IX_Posicion_nivel` e `IX_VersionTienda_tienda`. Aplicada en DEV (`OTB`); en PROD queda pendiente hasta resolver
DT-08 (antes, ver DT-54).

### DT-25 — Sin auditoría de la importación
`importarProductos` no registra quién importó ni cuándo.

### DT-26 — Caso de uso de la importación
La importación del Excel de productos no tiene caso de uso en `CASOS_DE_USO.md`.

### DT-27 — Extractores sin ganchos de exhibición
El PDF imprime `54E` y los extractores (PDF e imagen numerada) solo devuelven enteros; el espacio se lee como
54 o el producto `54E` no cruza con "Por ubicar" y se arrastra a mano. Requiere un plan aparte.

### DT-28 — `Gancho` como forma mixta
`number | string` (`54` normal, `"54E"` exhibición). Si aparecen otras variantes, migrar a `{ numero, tipo }`
con migración de datos.

### DT-29 — Reglas duplicadas back/front
Ganchos (`back/src/domain/compartido/gancho.js` ↔ `front/src/domain/ganchos/gancho.ts`) y código de accesorio
(`normalizarCodigo` ↔ `normalizarCodigoAccesorio`). Se mantienen con las mismas pruebas en ambos lados.

### DT-30 — Unicidad de ganchos entre posiciones
Dos posiciones de la misma versión pueden guardar el mismo `54`/`54E`; solo los chips del front lo impiden.

### DT-31 — Carrera accesorio eliminado
Si un accesorio se elimina entre la verificación del catálogo y el `insert`, la FK falla: rollback y `500`.
Si ocurre en la práctica, mapear el error de FK a `409`.

### DT-32 — Componentes del lienzo sin montar
`GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` no los monta ninguna página. Revisar si son
código muerto; si se eliminan, mover los tipos compartidos de `GondolaFrameLienzo`.

### DT-33 — Gancho `54. 5` en el Excel
`ganchosCelda` rechaza decimales con `/\d\.\d/`; con espacio tras el punto se parte en `[54, 5]`. Usar
`/\d\s*\.\s*\d/`.

### DT-34 — Reglas de ganchos distintas entre chips, drawer y Excel
`leerGancho('54 e')` en los chips da error, mientras `leerListaGanchos` (drawer) y `ganchosCelda` (Excel) unen
`54 E`; además la regla de unión difiere (lookahead). Compartir un helper en `domain/ganchos/gancho.ts`.

### DT-35 — Ganchos `E` recortados en facings angostos
`.gondola-escala__facing` tiene `overflow: hidden`; `54E, 55E, 56E` se corta (el `title` lista todos).
Mostrar `+nE` o un solo span por facing.

### DT-36 — Topes de ganchos y facings implícitos en el front
`interpretarHojaProductos` no bloquea más de 100 ganchos ni facings implícitos > 100; el back responde 400 con
el mensaje de Joi sin la fila. Registrar un `ErrorLectura` en la columna de gancho o Facings.

### DT-37 — Enteros de importación sin máximo
Un valor como `Cantidad_x_facing = 3000000000` pasa el front y Joi y el `insert` falla por desbordar `INT`
(rollback, `500` sin fila ni columna). Poner un máximo razonable en `importacion.schemas.js` y en `enteroCelda`.

### DT-38 — `0` explícito convertido en silencio
`unidades || 1`, `apilable || 1`, `capacidad || null` en el lector del Excel contradicen "el front no convierte
inválidos". Que `0` sea `ErrorLectura` ("debe ser al menos 1") y dejar `?? 1`/`?? null` solo para vacíos.

### DT-43 — Columnas del consolidado duplicadas
La lista blanca vive en `back/src/domain/consolidado/columnas.js` (encabezados y celdas del Excel) y su espejo en
`front/src/domain/consolidado/columnasConsolidado.ts` (tabla). Las pruebas de cada lado comparan el mismo literal de
24 claves (como DT-29). Al agregar una columna, tocar ambos lados y ambas pruebas.

### DT-44 — Una versión por planograma por tienda
La regla la aplican `asignaciones` y `promover`; la BD no tiene una restricción única que la garantice. El
consolidado la da por cierta para el conteo `planogramasEnTienda`.

### DT-45 — Consolidado sin caché
Cada listado y cada descarga recargan toda la base (7 consultas) y recalculan la tubería. Con DEV (~3 200 filas) es
suficiente; en PROD se esperan 10⁵–3·10⁵ filas expandidas. Medir el p95 con los logs `[consolidado] listado ms=…`
y, si supera 2 s, agregar una caché de la base de ~60 s.

### DT-46 — `validarConJoi` con `stripUnknown`
`application/compartido/validacion.js` → `validarConJoi` descarta en silencio los parámetros desconocidos. El
consolidado usa `validarQueryEstricta` (sin `stripUnknown`); los módulos 16 y 17 siguen con el comportamiento laxo.
Migrarlos a la validación estricta (cuidar que el front no mande parámetros de más).

### DT-47 — Limitadores por IP detrás del proxy
`vozLimiter` (`middlewares/rateLimit.js`) usa la IP y la app no configura `trust proxy`: en App Service todos los
usuarios comparten la IP del proxy y el cupo. Los limitadores del consolidado ya son por `numeroEmpleado`
(`crearLimiterPorUsuario`); usar lo mismo en `/voz`.

### DT-48 — Exportación síncrona
`write-excel-file` genera el libro en el event loop; con el tope de 100 000 filas puede bloquear varios segundos.
Mitigado con el tope (`422`), el semáforo de 1 (`503 EXPORTACION_EN_CURSO`) y `exportacionLimiter` (5/min). Si el
uso crece: worker thread o descarga asíncrona. Ver también DT-53.

### DT-49 — `ui/Modal` sin manejo de foco
El modal base no cierra con Escape, no pone el foco inicial, no atrapa el foco ni lo devuelve al disparador. Afecta
a todos los modales (incluidos los del consolidado). Resolverlo en `components/ui/Modal/`.

### DT-50 — Colores literales en componentes compartidos
Literales en `Modal.css`, `SeleccionMultipleModal.css`, `BotonSeleccionMultiple.css`, `SeleccionVersionesModal.css`
(`#f7f8fe`, `0 0 0 3px`, `6px`), `ProductosVersiones.css`, `ProductosFiltros.css` (incl. `999px`),
`constants/tiendas.ts` y `ESTADO_VERSION_IMPLEMENTACION_META`. Faltan tokens como `--danger-bg-hover` o
`--row-sub-bg` (propuesta del agente disenador-ux). Complementa DT-02.

### DT-51 — Vista Productos oculta sin retirar
El usuario pidió ocultar Productos del menú del analista sin eliminarla (2026-10-16). Solo se quitó la entrada
de `front/src/constants/navegacion.ts`; la ruta `/productos` (`router/routes.tsx`), `ProductosListado`, los
endpoints `GET /catalog/productos` y `GET /catalog/productos/{sku}/planogramas` y sus pruebas siguen activos y se
llega por URL directa. Decidir si vuelve al menú (p. ej. dentro de Mantenimiento) o se retira con su código; al
retirarla, cuidar lo compartido con el consolidado (`CadenaJerarquia`, `PanelColumnas`, `preferenciasColumnas`).

### DT-52 — Productos por versión y por tienda: tabla duplicada
Por decisión del usuario (2026-10-16) las dos vistas se agrupan solo en el menú (grupo "Productos": "Por versión"
y "Por tienda") y siguen siendo páginas separadas, por su granularidad y carga distintas. Comparten
`PanelColumnas`, `preferenciasColumnas` y `SeleccionVersionesModal`, pero la tabla está duplicada
(`ProductosVersiones` y `ConsolidadoTable`: celdas, cabeceras y columnas fijas). Extraer una tabla común. La ruta de
Por tienda se dejó en `/mantenimiento/consolidado-tiendas` para no romper enlaces; si se mueve a
`/productos/por-tienda`, dejar una redirección (y resolver antes DT-51, que usa `/productos`).

### DT-53 — Consolidado: base fuera del semáforo y `/filtros` sin limitador
`exportarConsolidado` (`domain/consolidado/consolidado.usecases.js`) carga la base, arma los grupos y filtra antes de
`semaforo.intentarTomar()`: N exportaciones simultáneas hacen N veces las 7 consultas y cargan N copias de la base, y
solo la generación del libro queda en serie (el semáforo protege el event loop, no la BD ni la memoria). Tomar el
semáforo al inicio y envolver todo (base, `422` y libro) en el `try/finally`, con una prueba de que un `422` lo
libera. Además `GET /consolidado/tiendas/filtros` (4 consultas, dos `COUNT(DISTINCT sku)` sobre todas las posiciones
montables) no tiene limitador: montar `consolidadoLimiter` (o una instancia propia). Relacionada con DT-48.

### DT-54 — `down` de la 017 y chequeo por nombre
El `up` se salta un índice que ya existe por nombre (`IF NOT EXISTS`), pero el `down` hace `DROP INDEX IF EXISTS`
igual: si en PROD existía, p. ej., `IX_Posicion_nivel` creado a mano, un rollback lo elimina. Un índice equivalente con
otro nombre quedaría duplicado. Antes de aplicar la 017 en PROD (DT-08), revisar `sys.indexes` de `Gondola`, `Nivel`,
`Posicion`, `PosicionAccesorio` y `VersionTienda` por columna y anotarlo en la migración.

### DT-55 — Fallo compartido en la deduplicación de CATI
`catiClient.listarSkusPorJerarquia` comparte la promesa en vuelo por clave: si la primera llamada en frío falla
(timeout de 30 s), todas las que esperaban la misma clave reciben el mismo `503`. Aceptado: el token es de servicio
(`tokenManager`), no se mezclan identidades.

### DT-56 — Orden de capas del consolidado sin prueba
`test/http/consolidadoRutas.test.js` solo comprueba que listar y exportar tengan 3 capas (`length`); si el limitador
quedara antes de `validarQuery`, la prueba pasaría y los `400` volverían a gastar cupo. `rateLimitUsuario.test.js`
usa un validador simulado, no `validarQuery`. Verificar el orden comparando `route.stack.map((l) => l.handle)` con los
middlewares importados, y agregar las 3 rutas `/consolidado/*` a `matrizPermisos.test.js` (hoy la regla A la cubren
`consolidadoRutas.test.js` y `rutasProtegidas.test.js`).

### DT-57 — Texto de ganchos de exhibición en el consolidado
`textoGancho` del back (`domain/compartido/gancho.js`) rellena solo los números (`5` → `05`) y deja `"5E"` tal cual;
el front del consolidado repite esa regla en `textoGanchoConsolidado` (`domain/consolidado/columnasConsolidado.ts`) en
vez de usar `textoGancho` de `domain/ganchos/gancho.ts`, que muestra `05E` (lienzo, Por planograma). Unificar: en el
front usar `textoGancho`; en el back rellenar también la exhibición y agregar `'5E' → '05E'` a `gancho.test.js`.
Relacionada con DT-29.

### DT-58 — Consolidado: peticiones y conteos desfasados
- Búsqueda (`ConsolidadoTiendas.tsx`): `cambiarFiltros({ busqueda })` vuelve a la página 1 en el momento, pero la
  búsqueda espera 300 ms; desde la página 3 se pide la página 1 con la búsqueda anterior y luego la buena (las dos
  gastan cupo de 60/min). Reiniciar la página cuando cambia el valor ya retrasado.
- "Descargar" solo depende de `!resumen`: si se abre el modal mientras recarga, `Filas estimadas` y la validación del
  máximo usan el resumen anterior (el `422` del servidor sigue protegiendo). Usar `disabled={!resumen || cargando}`.

### DT-59 — Consolidado: estados de error y carga incompletos
- `detalleErrorListado` (`domain/consolidado/filtrosConsolidado.ts`) muestra un `429` como "Revisa tu conexión…";
  mostrar un texto de espera y agregar el caso a `filtrosConsolidado.test.ts`.
- `.consolidado-filtros__selector` no tiene estilo `:disabled` (mantiene cursor y hover mientras carga o tras el error
  de `/filtros`); copiar el patrón de `BotonSeleccionMultiple.css`.
- Mientras llega `/filtros` (o si falla), los chips de tiendas muestran ids (`7`, `12`) y no hay indicio de carga más
  allá de los disparadores deshabilitados: `aria-busy` en la barra o "Cargando…" en los disparadores.

### DT-60 — Chevron y badge repetidos en grupos duplicados
`ConsolidadoTable.tsx`: un grupo con 3 planogramas pinta 3 chevrons (mismo `aria-controls` y misma acción) y 3 badges
`3 planogramas`. Dibujarlos solo en la primera fila principal del grupo.

### DT-61 — Limpieza del consolidado
- `useConRetardo` es un hook genérico definido en `pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx`: moverlo a
  `front/src/hooks/`.
- `CadenaJerarquia.tsx` exporta `NIVELES_JERARQUIA` junto al componente (aviso `react(only-export-components)`):
  moverlo a `front/src/constants/productos.ts`.
- `normalizarTexto` (`back/src/domain/consolidado/consolidado.entity.js`) usa un rango de diacríticos con caracteres
  combinantes literales, invisibles en el editor: escribirlo con escapes `\u0300-\u036f`.

### DT-62 — Filas antiguas sin autor atribuible
`EvidenciaImplementacion.subido_por` y `Adjunto.subido_por` tienen filas heredadas con valores no numéricos
(nombre completo, `sistema`, fixtures de pruebas). No se pueden atribuir a un empleado y, en evidencias, como
`puedeEliminar` compara por número, nadie puede quitarlas. La UI las muestra tal cual. Decidir con el negocio si
se limpian o se asignan a un responsable.

### DT-63 — `mapAdjunto` expone datos del blob
`back/src/infrastructure/repositories/adjunto.repository.js`: las respuestas incluyen `blobContainer`, `blobPath` y
`blobUrl` (sin SAS, sin uso en el front). Quitarlos de las respuestas y de los contratos de `13_adjuntos`.

### DT-64 — Blob huérfano si falla la BD en adjuntos
`agregarAdjunto` y `reemplazarAdjunto` (`adjunto.usecases.js`) no borran el blob nuevo si falla `crear` o
`actualizarArchivo`. Evidencias sí lo hace. Aplicar el mismo patrón.

### DT-65 — Respaldo innecesario de `usuarioActual`
`usuarioActual(req)` cae a `usuario`, `id` o `'sistema'` aunque el middleware `validar_token` garantiza
`numeroEmpleado`. Quitar los respaldos (el autor de cargas ya no los usa: `normalizarAutor` rechaza `'sistema'`).

### DT-66 — Casos de uso del módulo 17 sin documentar
`CASOS_DE_USO.md` no tiene los casos de uso de evidencias; los contratos de `17_evidencias` citan CU-07-03 (que no
existe). Redactarlos (listar, subir, descargar, eliminar) y alinear los contratos.

### DT-67 — Nombre del autor desde claims del JWT
Si CAO no manda `username`, `usuarioAuditoria` toma el nombre de los claims del JWT o cae al número (en ese caso
`normalizarAutor` guarda `NULL`). Confirmar con IT CAO qué campo es el nombre oficial y fijar un solo origen.

### DT-68 — Menores de la revisión de calidad (autor de la carga)
Referencias a `05_revision_calidad.md` del plan `2026-10-16-evidencia-usuario-carga`:
- **M-01**: `adjunto.test.js` no prueba `nombre: null` en `agregar` ni C-01 (autor de `datos` ignorado) en `reemplazar`.
- **M-02**: `MontajeTiendaModal` calcula `formatearAutor` dos veces por foto; guardar `autor` en `FotoMontaje`.
- **M-03**: en `UsarAdjuntos` el `title` del detalle tapa el aviso "Supera el máximo": `title={excede ? undefined : detalle}`.
- **M-05**: `tipoTitulo` no capitaliza tras guion ni apóstrofo (`María-josé`, `O'neill`).
- **M-06**: `VersionResumenModal.tsx` (líneas 205-215) con la indentación anterior al cambio.
