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
    posición por `orden_horizontal` → un número por facing, pendientes incluidos).
  - Front: el detalle de góndola es la MISMA página del lienzo enfocada en una góndola
    (`/planogramas/:id/versiones/:versionId/lienzo/gondola/:gondolaId`, botón de expandir del
    marco) + `DetalleGondolaPanel`. Lienzo general y detalle dibujan cada góndola con
    `GondolaEscalaLienzo` (a escala, estilo del prototipo de diseño, con barras de uso horizontal y
    vertical); `GondolaFrameLienzo` ya no se dibuja, solo se conserva por su tipo de props compartido.
  - Postman: carpetas `18 - Secciones` y `19 - SKU en la versión`.
- **Implementado, sin carpeta Postman todavía**: `adjuntos` (13, CRUD sobre Azure Blob) y
  `agente-extractor`.
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
- Migraciones: `001` a `016` en `back/src/infrastructure/db/migrations/`. Antes de implementar un
  módulo nuevo, revisa si el esquema ya cubre las tablas que necesita o si hace falta una migración
  adicional (`015_...`, ver convención de nombres en `ESTRUCTURA_BACKEND.md`). Un valor nuevo de
  una columna `varchar` sin CHECK (ej. `Posicion.modo = 'IMPULSO'`) no requiere migración: basta
  con la entidad de dominio (`MODOS` en `posicion.entity.js`) y el tipo del front.
