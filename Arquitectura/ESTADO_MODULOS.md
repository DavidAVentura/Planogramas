# Estado de los módulos del backend y su front

> Movido desde `CLAUDE.md` (2026-10-12). Se actualiza en el cierre de cada `/desarrollo`.

El orden de desarrollo sigue `Arquitectura/ENDPOINTS.md` y las carpetas de
`Arquitectura/Contratos/{NN}_{modulo}/` (01 a 11; el 12, sesiones de captura, queda fuera del MVP).

- **Implementado end-to-end (código + pruebas Postman)**: `planogramas` (01), `versiones` (02),
  `gondolas` (03), `niveles` (04), `posiciones` (05), `catalogo` (08), `accesorios` (09),
  `tiendas` (10) y `jerarquia` (11). Cada uno sigue el mismo patrón de 4 capas descrito abajo:
  `back/src/domain/{entidad}/`, `back/src/infrastructure/repositories/{entidad}.repository.js`,
  `back/src/application/{modulo}/{modulo}.controller.js` y
  `back/src/infrastructure/http/routes/{modulo}.routes.js`. `planogramas` sigue siendo la
  referencia más simple; `gondolas`/`niveles` muestran el patrón de entidad hija (listar/crear/
  reordenar cuelgan de la ruta del padre, ver comentarios en `gondolas.routes.js`).
  - `catalogo` y `jerarquia` son proxies a CATI **sin capa de dominio** (`catalogo.controller.js`
    → `infrastructure/cati/catiClient.js`). Bajo el mismo prefijo `/catalog/productos` vive también
    el módulo `producto` (con dominio propio, `domain/producto/`): dimensiones locales y la vista
    `/productos` (`GET /catalog/productos` y `GET /catalog/productos/{sku}/planogramas`, CU-10).
    En esa vista el filtro por jerarquía se resuelve en vivo contra CATI (lista de SKUs del nivel
    cruzada con la tabla local), nunca con columnas locales — ver
    `Arquitectura/Contratos/08_catalogo/GET_productos_listar.md`.
- **Implementado end-to-end: `asignaciones` (15, vista Estructura `/estructura`)**. Matriz planograma ×
  tienda con la regla "una tienda monta una sola versión por planograma" (publicada o piloto) y
  auditoría por edición (`EdicionAsignacion`/`AsignacionAuditoria`, migración 010). Las operaciones
  que corren dentro de una transacción ajena (montar/desmontar, registrar edición) viven en
  `infrastructure/repositories/asignacionTx.js` porque también las usan `promover` y
  `PUT /versiones/:id/tiendas`. El usuario auditado sale del JWT de CAO (`usuarioAuditoria` en
  `application/compartido/validacion.js`); si falta, cae en `USUARIO_SISTEMA`.
  - `GET /asignaciones?incluirPlanogramaId=` mete en la matriz un planograma sin versiones
    publicadas ni en piloto (para promover su primera versión). Estructura lee su contexto de la URL
    (`front/src/domain/estructura/contexto.ts`: `?planogramaId=` filtrada, `&versionId=&modo=promover`
    o `&modo=piloto`); la asignación de tiendas a versiones ya no tiene modales en el detalle.
  - Publicar: `GET /versiones/:id/publicacion/simular` (solo lectura) y `POST /versiones/:id/promover`
    comparten `calcularPlanPublicacion` en `version.repository.js` (tiendas piloto ∪ tiendas de la
    publicada anterior del mismo tipo) — no duplicar esa lógica.
- **Implementado end-to-end: `secciones` (18) y `skus` (19), diseño de góndola por secciones**.
  Aditivo: una góndola sin secciones se comporta igual que antes (ningún endpoint existente cambió).
  - `secciones`: árbol por góndola en la tabla `Seccion` (migración 012) — columnas/franjas
    anidables, la última hija toma lo que sobre; `Nivel.seccion_id` nullable (null = sin dividir).
    Toda operación carga el árbol, lo modifica en memoria y lo persiste de una vez con
    `seccionRepo.guardarEstructura` (ids negativos = nodos nuevos). Nunca toca posiciones.
    `clonarEstructura` (`version.repository.js`) copia también las secciones (`clonarSecciones`) y
    reasigna `seccion_id`; no copiar niveles con `...nivelDatos` sin remapear `seccion_id`.
  - `skus` (`GET/PATCH /versiones/:id/skus`): sin tabla nueva — mín./máx. siguen en cada `Posicion`
    (así los leen sin cambios publicación, drawer, Implementador y % de inventario); el PATCH por
    SKU los aplica a todas sus posiciones. Los **números de gancho no se guardan**: se calculan en
    `skuVersion.entity.js` (`recorrerVersion`: góndola por `orden` → sección → nivel por `orden` →
    posición por `orden_horizontal` → un número por facing, pendientes incluidos). Los ganchos de
    exhibición (`"54E"`, guardados desde el Excel) se muestran tal cual y **no** reservan número:
    `recorrerVersion` solo aparta los ganchos guardados numéricos. En el lienzo a escala se reparte por
    facing solo lo normal y los `E` se muestran juntos (modificador `--exhibicion`); los ganchos se
    muestran en el orden guardado, sin reordenar.
  - Front: el detalle de góndola es la MISMA página del lienzo enfocada en una góndola
    (`/planogramas/:id/versiones/:versionId/lienzo/gondola/:gondolaId`, botón de expandir del
    marco) + `DetalleGondolaPanel`. Lienzo general y detalle dibujan cada góndola con
    `GondolaEscalaLienzo` (a escala, estilo del prototipo de diseño, con barras de uso horizontal y
    vertical); `GondolaFrameLienzo`, `NivelFilaLienzo` y `PosicionLienzo` ya no se dibujan (DT-32).
  - Postman: carpetas `18 - Secciones` y `19 - SKU en la versión`.
- **Importación de productos del Excel (`importar-productos` / `importar-layout`, módulo 20)**.
  Postman: carpeta "Importar productos" (y casos de ganchos en `PATCH /posiciones/:id`). Reglas no obvias:
  - **Esquemas Joi** en `application/importacion/importacion.schemas.js` (el controller solo tiene
    handlers). Los ganchos de importación, `POST`/`PATCH` de posiciones e `importar-layout` comparten
    `application/compartido/ganchos.schema.js` (`Joi.any().custom(normalizarGancho)`): no usar
    `Joi.number()` ni `pattern`, convierten `"5E1"` en 50.
  - **Contrato de accesorios**: `accesorios: [{ codigo, tamano_pulgadas }]` (hasta 10 por producto, 200
    códigos distintos por request). Los campos legado `accesorio_codigo`/`tamano_accesorio_pulgadas` se
    aceptan solo si `accesorios` viene vacío (mezclar → `400`; DT-22). `accesorio_id` y `orden` los
    calcula el servidor (`accesoriosDeFila`, `posicionDesdeFila` en `importacion.entity.js`).
  - **Todo o nada**: `importarProductos` valida versión editable → tope de 200 → resuelve **todos** los
    códigos (`normalizarCodigo`) → `422` con `details.codigos` si falta alguno → recién entonces lee
    SKUs y escribe. Un accesorio inexistente ya no se omite con advertencia. Los accesorios de cada
    posición se insertan en un solo `insert` con `trx` (`insertarPosicionPorUbicar`).
  - **Front**: `excelProductosPlanograma.ts` valida cada celda, acumula errores con fila/columna/letra y
    con errores devuelve `productos: []`. En `//` separa varios accesorios; enteros estrictos; los
    facings implícitos cuentan solo ganchos normales. El modal bloquea con una vista de errores (origen
    archivo) o, si un accesorio no está en el catálogo al pulsar Importar, con otra de origen catálogo
    (sin petición). El 422 de catálogo se reconoce por `Array.isArray(err.details?.codigos)`, no por el
    status (el 422 de versión no editable comparte `code`).
  - **Bloques TG/TM/TE (2026-10-15)**: se lee solo el bloque del tipo de la versión (`version.tipo`:
    GRANDE → TG, MEDIANA → TM, EXPRESS → TE; nunca del archivo), pasado página → `AgenteExtractorBubble`
    → modal → `interpretarHojaProductos(filas, tipo)`. Columnas por sufijo exacto `_tg|_tm|_te` y gancho
    `^(tg|tm|te)\d{1,2}$`; las de otros bloques ni se leen ni se validan. Columna sin sufijo es común
    (archivos antiguos); si existe la del bloque, gana esta. Bloque ausente (el archivo trae bloques pero no
    el de la versión) o vacío (sin productos) → `bloqueoDeLectura` muestra `BloqueoErrores` en el paso 1 y
    no se importa. `Planograma_<S>` con una sigla TG/TM/TE ajena como palabra (`RE_SIGLA`, letras Unicode)
    es `ErrorLectura` bloqueante, solo en filas que serían producto. Versión sin tipo: no se lee.
    Versiones TG importadas antes del 2026-10-15 desde archivos de tres bloques pueden tener ganchos TM
    mezclados (el lector anterior unía los de todos los bloques); se reimportan a mano.
  - **Ganchos de exhibición**: `Posicion.ganchos` es un arreglo mixto (`54` normal, `"54E"` exhibición,
    distintos). Única regla de ganchos: `back/src/domain/compartido/gancho.js` (`normalizarGancho`,
    `compararGanchos`, `parsearGanchosJson` — el único `JSON.parse` de ganchos) y su espejo
    `front/src/domain/ganchos/gancho.ts` (`leerGancho`, `textoGancho(s)`). Prohibido `.map(Number)`,
    `Math.min(...ganchos)` o `sort((a, b) => a - b)` sobre ganchos (usar `numeroGancho`/`compararGanchos`).
    El código de accesorio del front se normaliza solo con `normalizarCodigoAccesorio`.
  - **Cruce con "Por ubicar"** (`cruzarConPorUbicar`): compara ganchos en forma canónica; un espacio del PDF
    con `54` no toma un producto con `54E`; el reparto de facings cuenta solo los ganchos normales. El
    extractor de PDF lee y normaliza los `54E` (`ganchosDelEspacio`, plan `2026-10-15-ganchos-exhibicion-pdf`),
    así que `54E` del PDF cruza con `54E` del Excel. El extractor de imagen numerada sigue con enteros (DT-39).
  - **Antes de publicar**: consulta SQL de solo lectura de ganchos no canónicos en DEV y PROD (0 filas;
    ver `04_implementacion.md` del plan `2026-10-15-importar-excel-tamano-accesorio`).
- **Implementado end-to-end: `consolidado` (21, Consolidado Tiendas)**. Solo lectura, solo analista; en el menú es
  Productos → "Por tienda" (ruta `/mantenimiento/consolidado-tiendas`). Contratos en `Contratos/21_consolidado/`
  (README con la tubería completa). Postman: carpeta `21 - Consolidado tiendas` (reutiliza los fixtures de
  `16 - Implementación`, corre después). Reglas no obvias:
  - **Sin tabla nueva ni paginación SQL**: `cargarBase` (`infrastructure/repositories/consolidado.repository.js`)
    hace 7 consultas (las 5 de estructura viven en `repositories/baseVersiones.js` → `cargarEstructura`, compartido con el módulo 16) filtradas por la subconsulta `versionesMontables` (publicado/piloto con tienda activa),
    nunca listas de ids (límite de 2100 parámetros); el resto es dominio puro en
    `domain/consolidado/consolidado.entity.js`. La 017 solo agrega índices.
  - **Reusa el módulo 19**: `recorrerVersion` (sección, nivel, ganchos) y `valorComun` de `skuVersion.entity.js`, y
    los mapeadores de `repositories/mapeadoresVersion.js` (compartidos con `cargarVersion`). No duplicarlos.
  - **`planogramasEnTienda` se cuenta antes de los filtros** (`contarPlanogramasPorGrupo` antes de `aplicarFiltros`):
    el rojo no depende del filtro de versión, estado, jerarquía o búsqueda. No mover ese orden.
  - **Sumas del Min/Max agregado** (`sumarMinMaxAgregado`, `sumarFisicosAgregado`): mín./máx. final suman **una vez
    por versión** (primera fila PLANOGRAMA → CROSS → IMPULSO; si una versión "Varía", la columna sale `Varía`, no una
    suma parcial); mín. estético y capacidad máxima suman **todas** las filas del grupo (son físicos de cada posición).
  - **DETALLADO antepone `modo`** si no viene en `columnas` (D2). Columnas: lista blanca única en
    `domain/consolidado/columnas.js`, duplicada en `front/src/domain/consolidado/columnasConsolidado.ts` (DT-43; las
    pruebas de ambos lados comparan el mismo literal de 24 claves).
  - **Orden de capas** (`consolidado.routes.js`): `requiereAnalista` → `validarQuery(schema)` → limitador por usuario
    (`numeroEmpleado`: listado 60/min, exportación 5/min) → controller. Los `400` no gastan cupo; toda petición válida
    lo gasta aunque se aborte (no usar `skipFailedRequests`: devuelve el cupo al abortar). `validarQuery` y el
    controller validan con el mismo esquema estricto (`validarQueryEstricta`, sin `stripUnknown`; `validarConJoi`
    no se usa aquí, DT-46).
  - **Exportación**: tope `CONSOLIDADO_EXPORTACION_MAX_FILAS` (def. 100 000, máx. 200 000) → `422` antes de construir
    celdas; semáforo de 1 por proceso (`application/compartido/semaforo.js` → `semaforoExportacion`, compartido con la exportación de Productos por planograma) → `503 EXPORTACION_EN_CURSO`. El libro
    se genera completo antes de las cabeceras. `write-excel-file@4.1.1` solo se importa en
    `infrastructure/exportacion/libroXlsx.js` (celdas de texto siempre `String`, nunca fórmula).
  - **CATI**: con jerarquía se resuelve antes de cargar la base (falla → `503` sin datos parciales);
    `catiClient.listarSkusPorJerarquia` deduplica llamadas en vuelo por clave.
  - Front: `pages/ConsolidadoTiendas/` (modo extendido con el patrón de `ProductosVersiones`), `components/dominio/consolidado/`
    (`ConsolidadoFiltros`, `ConsolidadoTable`, `DescargarConsolidadoModal`), `domain/consolidado/` (lógica pura con pruebas),
    `hooks/useConsolidado.ts` y `useFiltrosConsolidado.ts`. Comparte con Por planograma `PanelColumnas<K>`,
    `domain/columnas/preferenciasColumnas.ts`, `modales/SeleccionVersionesModal` y `productos/CadenaJerarquia` (DT-52).
    Preferencias de columnas en `localStorage` (`planogramas.consolidado.columnas`).
- **Implementado end-to-end: `implementacion` (16) — Productos por planograma del analista** (ruta `/por-version`,
  plan `2026-10-19-productos-planograma-filtros-descarga`; contratos en `Contratos/16_implementacion/`, CU-10-05 y
  CU-10-06; Postman: carpeta `16 - Implementación`). Reglas no obvias:
  - **Descarga `.xlsx`** (`POST /implementacion/productos/exportar`): Lista (SKU–versión–modo) y Pivote por versión
    (bloques TG/TM/TE con encabezados del Excel de categorías). Dominio puro en
    `domain/implementacion/exportacionPorVersion.entity.js` y `columnasExportacion.js` (`validarPivote`: especiales de tienda
    excluidas, sin tipo o duplicadas → `422 PIVOTE_NO_APLICABLE`); la hoja `Versiones` va siempre.
  - **Reusa el consolidado**: `construirFilasPorVersion(base, { estados, skus, posicionIds })` en
    `domain/consolidado/consolidado.entity.js` (sin opciones = solo montables, el consolidado no cambia; recorre la versión
    completa antes de filtrar para no alterar la numeración de ganchos; la fila añade `tipoVersion`, `esEspecial` y
    `variaciones`, que `expandirPorTienda` quita para no cambiar `GET /consolidado`); `baseVersiones.js` →
    `cargarEstructura(versionIds|subconsulta)`; `application/compartido/semaforo.js` (un solo semáforo para todas las
    exportaciones) y `application/compartido/esquemasComunes.js` (`PATRON_JERARQUIA`, `listaEnteros`, `nivelJerarquia`);
    `domain/compartido/erroresExportacion.js`. No duplicarlos.
  - **`posicionIds` solo acota**: el front envía los ids de las filas visibles tras búsqueda y filtros de columna (solo si hay
    alguno activo); el servidor calcula su universo (`versionIds` ∩ jerarquía) e intersecta; los ids nunca van a SQL.
  - **Jerarquía Área › Departamento**: soportada en back (listado y exportación, validada contra CATI, 503 sin datos sin
    filtrar) y en front (`CadenaJerarquia niveles={2}`, servicio y hooks), pero **oculta en pantalla**
    (`MOSTRAR_FILTRO_JERARQUIA = false` en `ProductosPorVersion.tsx`; DT-79). Área/Departamento por SKU en la Lista salen de
    `Producto.categoria_nivel1/2` (DT-74). En el listado con jerarquía el inventario se consulta con los SKU de todas las
    posiciones (el resumen `versiones[]` no se filtra).
  - **Orden de capas**: `GET /productos`: `requiereAnalista` → limitador 60/min → controller; `POST /productos/exportar`:
    `requiereAnalista` → `validarCuerpo` → limitador 5/min → controller (cuerpo hasta 512 kb, parser montado en `app.js`).
  - **Front**: `ProductosVersiones` (compartido con el Implementador) gana props opcionales `filtrosExtra`,
    `filtrosExtraActivos`, `onLimpiarFiltrosExtra`, `accionesExtra` y `onFilasFiltradas`; con `filtrosExtra` los filtros van
    en una barra colapsable con `ui/BotonFiltros` (patrón del Consolidado) y sin ellas el render del Implementador no cambia.
    `DescargarProductosVersionModal`, `domain/implementacion/descargaPorVersion.ts` (con pruebas), `ui/IconoDescarga`
    (compartido con el Consolidado). En vista extendida la barra de filtros se oculta sin chips compactos (DT-80).
- **Implementado, sin carpeta Postman todavía**: `adjuntos` (13, CRUD sobre Azure Blob) y
  `agente-extractor`.
- **Autor de la carga (adjuntos 13 y evidencias 17, 2026-10-16, migración 018)**: ambas tablas guardan
  `subido_por` (número de empleado, el `user` de CAO) y `subido_por_nombre` (nvarchar 150, NULL en filas anteriores).
  - Regla única en `domain/compartido/autor.js` (`normalizarAutor`): sanea y recorta el nombre, no transforma el
    número y lanza (500) si falta o es `'sistema'`. No duplicarla en otros módulos.
  - El autor llega a los casos de uso como parámetro `autor` aparte de `datos`, armado en el controller con
    `usuarioAuditoria(req)`: el body nunca lo fija. El reemplazo de un adjunto sobrescribe el autor con quien reemplaza.
  - `puedeEliminar`/`eliminarEvidencia` siguen comparando solo por número. Respuestas: `subido_por_nombre` (17) y
    `subidoPorNombre` (13). Front: `utils/autorCarga.ts` (`formatearAutor`), ver `DISENO_SISTEMA.md`.
  - Deuda relacionada: DT-12, DT-62 a DT-68.
- **Autorización (permisos CAO, 2026-10-12)**: aplicada en todos los módulos; detalle, perfiles y
  matrices en `Arquitectura/SEGURIDAD_PERMISOS.md`.
  - Vive en `domain/compartido/permisos.js` (códigos y reglas puras) y
    `infrastructure/http/middlewares/autorizacion.js` (`requiereAnalista` = A, `requiereImplementador`
    = I, `requierePermiso(...)`). La respuesta de CAO se normaliza y congela en `caoAuthClient.js`.
  - **Proteger una ruta nueva**: `router.use(requiereAnalista)` como primera línea del
    `*.routes.js` (o guard por ruta si mezcla reglas), más `requierePermiso(...)` si hay un permiso
    propio, y una fila en `back/test/http/matrizPermisos.test.js`. `back/test/http/rutasProtegidas.test.js`
    falla si una ruta queda sin guard. `routes/index.js` no lleva reglas.
  - Front: `front/src/domain/permisos/permisos.ts` (reglas y modos), `RequierePermiso` /
    `RedirigirInicio` en `router/`, página `SinAcceso`; las páginas calculan `puedeEscribir` con su
    permiso. Los guards del front son cosméticos.
  - Pendiente: filtro por tienda (DT-10) y permisos propios en CAO para las acciones con regla A (DT-11).
- **Pendiente**: `sustituciones` (06) y `exportacion` (07) no están montados en
  `back/src/infrastructure/http/routes/index.js`. Su contrato ya existe en `Arquitectura/Contratos/`.
- Migraciones: `001` a `017` en `back/src/infrastructure/db/migrations/`. Antes de implementar un
  módulo nuevo, revisa si el esquema ya cubre las tablas que necesita o si hace falta una migración
  adicional (`015_...`, ver convención de nombres en `ESTRUCTURA_BACKEND.md`). Un valor nuevo de
  una columna `varchar` sin CHECK (ej. `Posicion.modo = 'IMPULSO'`) no requiere migración: basta
  con la entidad de dominio (`MODOS` en `posicion.entity.js`) y el tipo del front.
