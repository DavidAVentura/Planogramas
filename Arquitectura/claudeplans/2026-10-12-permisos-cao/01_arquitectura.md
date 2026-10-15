# 01 — Arquitectura: permisos CAO por perfil (SIP)

## 1. Entendimiento

Se aplica la autorización por los permisos PLA001–PLA010 del módulo SIP de CAO, en el back (cada
endpoint) y en el front (modo analista o implementador, opciones del navbar, rutas y acciones). Los
perfiles PLA_ADMIN y PLA_CAT tienen los 10 permisos. PLA_TIENDA solo tiene PLA009 y PLA010, así que
solo ve el modo implementador. Las acciones que no tienen un permiso propio en CAO quedan con la
regla transitoria **"requiere perfil de analista"**. No se filtra por tienda en esta etapa.

Casos de uso tocados: todos de forma transversal. Los que cambian de comportamiento son
CU-01, CU-02 (crear, editar, promover, archivar), CU-03 y CU-04 (edición del contenido), CU-06
(asignación a tiendas = "Estructura"), CU-07 (implementador), CU-09 (adjuntos), CU-10 (productos)
y los CU de tiendas y accesorios. Cierra la parte de "permisos" de **DT-01**.

## 2. Flujo de proceso

Estado actual: CAO valida el JWT (`GET /auth/validar_token?cod_modulo=…`) y `caoAuthClient.mapearUsuario`
ya normaliza `perfiles[]` y `permisos[]` (la unión de los permisos de todos los perfiles) en `req.usuario`.
**Ningún endpoint los consulta**. En el front, el rol lo elige el usuario a mano con `RoleSwitch` y
`puedeEscribir = rol === 'analista'`.

Flujo nuevo:
1. El usuario entra por `/auth?token=` y el front llama a `GET /auth/sesion`. El back devuelve
   `permisos` y además, como dato nuevo, `capacidades` (ver §4).
2. El front calcula los modos disponibles:
   - **analista**: `capacidades.analista` es verdadero.
   - **implementador**: el usuario tiene PLA009 o PLA010.
   - Si tiene un solo modo, se fija ese modo y **no se muestra `RoleSwitch`**. Si tiene los dos, se
     muestra el switch como hoy. Si no tiene ninguno, se muestra la pantalla "Sin acceso al módulo".
3. El navbar solo muestra las opciones permitidas. Cada ruta pasa por un guard de permiso. Si el
   usuario abre por URL una ruta no permitida, se le redirige al inicio de su modo.
4. Los botones y los modos editables usan permisos concretos (`puede(PLA00X)`) en lugar de `puedeEscribir`.
5. En el back, cada endpoint exige su permiso, la regla de analista o los permisos de implementador.
   Si no se cumple, responde **403** sin tocar la BD.

Cuando un permiso cambia en CAO, el cambio tarda hasta **2 min** en aplicarse, por el TTL del caché
de `caoAuthClient`. Es aceptable.

## 3. Impacto por capa

| Capa | Archivo / módulo | Cambio |
|---|---|---|
| Dominio (back) | `back/src/domain/compartido/permisos.js` (nuevo) | Catálogo `PERMISOS` (PLA001–PLA010 con nombre semántico), `PERMISOS_ANALISTA`, `PERMISOS_IMPLEMENTADOR`, funciones puras `tieneAlguno(usuario, codigos)`, `esAnalista(usuario)`, `capacidades(usuario)`. Sin dependencias de Express. |
| Infraestructura HTTP | `back/src/infrastructure/http/middlewares/autorizacion.js` (nuevo) | `requierePermiso(...codigos)` (basta con tener uno), `requiereAnalista`, `requiereImplementador`. Lanzan un error `{status:403, code:'FORBIDDEN'}` hacia `errorHandler` (que ya mapea FORBIDDEN). |
| Infraestructura HTTP | `back/src/infrastructure/http/routes/*.routes.js` (17 archivos) y `routes/index.js` | El middleware se pone por ruta según la matriz de §4. En los routers que son 100 % de analista (`/jerarquia`, `/accesorios`, `/agente-extractor`, `/voz`, `/niveles`, `/secciones`, `/posiciones`, `/gondolas`, `/planogramas`, `/asignaciones`, `/implementacion`, `/pruebas`) se usa `router.use(requiereAnalista)` en `index.js`, y en las escrituras se agrega además el permiso específico. |
| Aplicación (back) | `back/src/application/auth/auth.controller.js` | `obtenerSesion` agrega `capacidades` y deja de exponer `cao` (la respuesta cruda de CAO). |
| Configuración | `CAO_COD_MODULO` (`.env` DEV y app settings de Azure DEV/PROD) | Cambia de `SCRAPING` al código del módulo SIP en CAO. Sin este cambio nadie tiene PLA00X y todo responde 403. Es un paso de despliegue y no toca código. |
| BD | — | Sin cambios. |
| Front dominio | `front/src/domain/permisos/permisos.ts` (+ `permisos.test.ts`) | Espejo del catálogo, `modosDisponibles(usuario)`, `rutaInicio(modo)` y el mapa `PERMISO_POR_RUTA` (lógica pura con pruebas). |
| Front tipos | `front/src/types/usuario.ts` | Agrega `capacidades: { analista: boolean; implementador: boolean }`. Quita `cao`. |
| Front contexto | `front/src/context/AuthContext.tsx` | El rol inicial sale de los modos disponibles y deja de salir de la URL. `setRol` solo acepta modos permitidos. Se expone `puede(codigo)`, `esAnalista` y `modos`. `puedeEscribir` se elimina y sus ~20 usos se reemplazan por `puede(...)`. |
| Front router | `front/src/router/routes.tsx`, `front/src/router/RequierePermiso.tsx` (nuevo) | Cada `<Route>` se envuelve en su guard. `/` redirige al inicio del modo. |
| Front layout | `AppTopbar.tsx`, `RoleSwitch.tsx` | Filtrar las opciones del navbar por permiso. Ocultar `RoleSwitch` si el usuario tiene un solo modo. |
| Front páginas | `PlanogramasListado`, `PlanogramaDetalle` (+ `VersionesTable`), `EditorPlanograma`, `LienzoPlanograma` (y componentes `editor/*`, `lienzoEditor/*` vía prop), `TiendasListado` (+ `TiendasTable`), `EstructuraAsignacion`, `AccesoriosListado` | Cambiar `puedeEscribir` por el permiso concreto (tabla de §4). Los componentes siguen recibiendo un booleano por prop y no se tocan por dentro. |
| Front nueva pantalla | `front/src/pages/SinAcceso/` (o reutilizar `PantallaAcceso`) | Pantalla para un usuario autenticado sin ningún modo. |
| Front servicios | `authInterceptor.service.ts` / `utils/errors.ts` | Ante un 403, mostrar "No tienes permiso para esta acción" sin invalidar la sesión ni reintentar. |
| Docs | `Arquitectura/SEGURIDAD_PERMISOS.md` (nuevo, ya citado por DT-01), `ENDPOINTS.md` (columna "Permiso"), `ESTADO_MODULOS.md`, `DEUDA_TECNICA.md`, `Contratos/` (auth) | Matriz oficial, lista de permisos que hay que pedir a IT CAO, cierre parcial de DT-01. |
| Postman | `postman/planogramas-import.postman_collection.json` | Carpeta "Autorización": 403 con un token de tienda en un endpoint de cada tipo y 200 en los endpoints del implementador. |
| Pruebas | `back/test/domain/permisos.test.js`, `back/test/http/autorizacion.test.js`, `front/src/domain/permisos/permisos.test.ts` | Ver §6 y las tareas del plan. |

## 4. Contratos

### 4.1 `GET /auth/sesion` (modificado, cambio aditivo salvo `cao`)

```json
{
  "id": "100702", "numeroEmpleado": "100702", "usuario": "100702",
  "nombre": "NOMBRE COMPLETO", "correo": null,
  "perfiles": [{ "codigo": "PLA_CAT", "nombre": "…", "permisos": ["PLA001", "…"] }],
  "permisos": ["PLA001", "…", "PLA010"],
  "capacidades": { "analista": true, "implementador": true },
  "tiendas": []
}
```
- `capacidades.analista` concentra la regla transitoria en un solo lugar (el back). El front no la
  recalcula.
- Se elimina `cao`. El front no lo usa (verificado con grep) y exponía la respuesta cruda de CAO.

### 4.2 Error nuevo en todos los endpoints protegidos

`403 { "error": { "code": "FORBIDDEN", "message": "No tienes permiso para esta acción" } }`.
No se incluyen en `details` los permisos requeridos (Seguridad lo confirma). El 403 se resuelve
**antes** que el 400 y el 404, porque el middleware corre antes que el controller.

### 4.3 Matriz endpoint → regla

Abreviaturas: **A** = `requiereAnalista` (transitoria: el usuario tiene **todos** los permisos
PLA001–PLA008, que hoy solo cumplen PLA_ADMIN y PLA_CAT). **I** = PLA009 o PLA010. **C** = contenido
de la versión = PLA005 o PLA006. Toda escritura exige además **A**, porque se hereda del router
o se agrega en la ruta.

| Regla | Endpoints |
|---|---|
| Autenticado (sin regla extra) | `GET /auth/sesion`, `POST /auth/keepalive`, `GET /health` |
| **I** (implementador; el analista también lo cumple) | `GET /tiendas`, `GET /tiendas/:id/planogramas`, `GET /tiendas/:id/implementacion` (PLA009), `GET /tiendas/:id/implementacion/productos` (PLA010), `GET\|POST /tiendas/:id/versiones/:v/evidencias`, `GET /evidencias/:id/descargar`, `DELETE /evidencias/:id`, `GET /versiones/:id/adjuntos`, `GET /adjuntos/:id/url-descarga`, `GET /versiones/:id/estructura`, `GET /catalog/productos/:sku`, `…/:sku/stock`, `…/:sku/ficha-tecnica` |
| **A** lectura (vistas de analista) | `GET` de `/planogramas*`, `/versiones/:id` (detalle, gondolas, tiendas, resumen, skus, publicacion/simular), `/gondolas/*`, `/niveles/*`, `/posiciones/*`, `/secciones`, `/jerarquia/*`, `/accesorios*`, `/catalog/productos` (listado), `/catalog/productos/buscar`, `/catalog/productos/:sku/planogramas`, `/implementacion/versiones`, `/implementacion/productos` |
| **PLA001** Editar estructura | `GET /asignaciones`, `GET /asignaciones/historial`, `POST /asignaciones/ediciones`, `PUT /versiones/:id/tiendas` |
| **PLA002** Crear planograma | `POST /planogramas` |
| **PLA003** Editar planograma | `PATCH /planogramas/:id` |
| **PLA004** Crear versión | `POST /planogramas/:id/versiones` |
| **PLA005** Editar versión | `PATCH /versiones/:id` (notas/código), `PATCH /versiones/:id/guardar` |
| **C** (PLA005 o PLA006) | Escrituras de `/versiones/:id/gondolas` (POST, PATCH orden), `/gondolas/:id` (PATCH, DELETE, POST niveles, PATCH niveles/orden, POST secciones/dividir), `/niveles/:id` (PATCH, DELETE, POST posiciones), `/secciones/:id` (PATCH, DELETE), `/posiciones/:id/*` (PATCH, mover, asignar-sku, copiar, DELETE, accesorios POST/DELETE), `PATCH /versiones/:id/skus/:sku`, `POST /versiones/:id/importar-layout`, `POST /versiones/:id/importar-productos` |
| **PLA007** Crear tienda | `POST /tiendas` |
| **PLA008** Editar tienda | `PATCH /tiendas/:id` |
| **A** transitoria (sin permiso en CAO; **se pide a IT CAO**) | `POST /planogramas/:id/archivar`, `POST /versiones/:id/promover`, `POST /versiones/:id/archivar`, escrituras de adjuntos (`POST /versiones/:id/adjuntos/subida`, `POST /versiones/:id/adjuntos`, `POST /adjuntos/:id/subida`, `PUT /adjuntos/:id`, `DELETE /adjuntos/:id`), escrituras de `/accesorios`, `PATCH /catalog/productos/:sku/dimensiones[/validar]`, `/agente-extractor/*`, `/voz/*`, `/pruebas/*` |

### 4.4 Front: ruta y navbar → permiso

| Modo | Opción / ruta | Regla | Acciones dentro |
|---|---|---|---|
| Analista | Planogramas `/planogramas`, `/planogramas/:id` | A | "Crear planograma" → PLA002. Editar → PLA003. "Nueva versión" → PLA004. Archivar, promover, publicar y adjuntos → A |
| Analista | `/…/editor` | A | Editable con PLA005 (y agente extractor con A) |
| Analista | `/…/lienzo` | A | Editable con PLA006 |
| Analista | Tiendas `/tiendas` | A | Crear → PLA007. Editar → PLA008 |
| Analista | Estructura `/estructura` | PLA001 | — |
| Analista | Productos `/productos`, Por versión `/por-version`, Accesorios `/accesorios` | A | CRUD de accesorios → A |
| Implementador | Mi tienda `/mi-tienda` | PLA009 | Evidencias → I |
| Implementador | Productos `/mi-tienda/productos` | PLA010 | — |

En el back no existe `/estructura`. Un usuario con PLA001 pero sin A podría ver la vista y no
cargarla, porque el router `/asignaciones` también exige A. Hoy ningún perfil cae en ese caso, y
se deja así a propósito: la regla A se retira cuando CAO tenga todos los permisos.

No hay contrato previo de `auth` en `Arquitectura/Contratos/`. Se agrega `Contratos/00_auth/` o una
nota en el README de contratos.

## 5. Datos

No hace falta migración. Los permisos viven en CAO y no se replican en la BD: la fuente única es
`validar_token`. No hay índices nuevos. El cambio es retrocompatible con los datos existentes.

## 6. Rendimiento y escalabilidad

- La autorización trabaja en memoria sobre `req.usuario.permisos`, que ya está en caché 2 min por
  token. No agrega llamadas a CAO ni consultas a la BD.
- No hay riesgo de N+1 ni de paginación. La matriz se evalúa en O(1) por request (`Set`).
- Riesgo operativo: si se despliega sin cambiar `CAO_COD_MODULO`, todos los usuarios reciben 403.
  El plan incluye una verificación previa con `GET /auth/sesion` en DEV.

## 7. Alternativas descartadas y decisión

- **Autorización dentro de los casos de uso**: se descarta. Los casos de uso no conocen al usuario,
  tendríamos que cambiar las firmas de ~60 usecases, y estas reglas son de acceso, no de negocio.
- **Regla transitoria por código de perfil (`PLA_ADMIN`/`PLA_CAT`)**: se descarta. No está
  confirmado qué `cod_perfil` devuelve CAO (`PLA_CAT` o `CATEGORIA-EST`), y la regla quedaría
  atada a nombres de perfil en lugar de a permisos.
- **Regla A = "tiene algún PLA001–PLA008"**: se descarta. Dejaría pasar a un perfil futuro con un
  solo permiso suelto (por ejemplo PLA007) a acciones críticas. "Todos" falla cerrado.
- **Mapear cada acción sin permiso al permiso más cercano** (archivar → PLA003, promover → PLA005):
  se descarta. Contradice la decisión del usuario y oculta cuáles permisos faltan en CAO.
- **Replicar los permisos en la BD**: se descarta. Duplicaría la fuente de verdad sin dar nada a cambio.

**Decisión recomendada**:
- El catálogo de permisos va en el dominio compartido.
- El middleware `requierePermiso`/`requiereAnalista` se aplica por ruta según la matriz de §4.3.
- `GET /auth/sesion` expone `capacidades` y deja de exponer `cao`.
- En el front: modos derivados de los permisos, guard por ruta, navbar filtrado y `puede(codigo)`
  en lugar de `puedeEscribir`.
- `Arquitectura/SEGURIDAD_PERMISOS.md` queda como la fuente documental de la matriz y de la lista
  de permisos pendientes en CAO.

## 8. Preguntas abiertas

1. **Código del módulo SIP en CAO** (el valor de `CAO_COD_MODULO`; hoy es `SCRAPING`). ¿IT CAO ya
   creó el módulo, el perfil PLA_TIENDA y las asignaciones a usuarios en DEV y PROD? ¿Hay un
   usuario de prueba con perfil de tienda para Postman?
2. **PLA005 vs. PLA006**: propongo PLA005 = editor de formulario (`/editor`) y metadatos de la
   versión, y PLA006 = lienzo (`/lienzo`). Las dos vistas usan los mismos endpoints de contenido,
   así que el back acepta cualquiera de los dos. ¿Lo confirmas?
3. **Asignación desde el detalle de versión** (`PUT /versiones/:id/tiendas`): lo pongo en PLA001,
   porque es "asignación de versiones a tiendas", aunque en las preguntas resueltas "asignaciones"
   aparecía como acción sin permiso. ¿Lo confirmas?
4. **Evidencias**: un usuario de tienda puede subir y **borrar** evidencias de cualquier tienda,
   porque no hay filtro por tienda. ¿Se acepta en esta etapa o el DELETE pasa a A?

## 9. Para UX

1. Cómo se ve un usuario que solo tiene el modo implementador: sin `RoleSwitch`, y qué pasa con el
   chip de tienda en el topbar.
2. La pantalla "Sin acceso al módulo" (usuario autenticado sin PLA009, PLA010 ni A): mensaje y acción.
3. Qué pasa al abrir por URL una ruta no permitida: redirige al inicio del modo con un toast, o
   muestra un estado vacío.
4. El mensaje del toast ante un 403 inesperado, y que se oculten los botones en lugar de
   deshabilitarlos (es la convención actual con `puedeEscribir`).
5. El analista con los dos modos: el switch se queda igual y debe conservar el modo al recargar.

## 10. Para Seguridad

1. La matriz §4.3: que ningún endpoint de escritura quede sin regla. Proponer una prueba que
   recorra el router y falle si una ruta no tiene middleware de autorización.
2. Que la regla A falle cerrado ("todos los permisos PLA001–PLA008") y que el 403 corra antes que
   cualquier acceso a la BD o a CATI.
3. Quitar `cao` de `GET /auth/sesion` y no exponer en `details` los permisos requeridos.
4. Los endpoints **I** sin filtro por tienda (evidencias, implementación): el riesgo aceptado y la
   deuda que hay que registrar.
5. El caché de 2 min en `caoAuthClient`: el impacto en la revocación de permisos, y que
   `/pruebas` siga apagado en producción además de exigir A.

## 11. Deuda detectada

- **DT-01**: queda **parcialmente resuelta**. La parte de permisos se cierra con este cambio. El
  filtrado por tienda se abre como deuda nueva.
- **Nueva (Alta)**: el filtro por tienda del usuario no se aplica (los endpoints **I** aceptan
  cualquier `tiendaId`). Depende de que CAO actualice las tiendas por usuario.
- **Nueva (Media)**: hay acciones protegidas con la regla transitoria A porque no tienen permiso en
  CAO (archivar planograma o versión, promover, adjuntos, accesorios, dimensiones, captura foto/IA,
  voz). Hay que pedir los permisos a IT CAO y reemplazar A por el código de cada uno.
- **Nueva (Baja)**: `caoAuthClient.mapearUsuario` guarda `cao` (la respuesta cruda) en `req.usuario`.
  Después de este cambio ya no se expone, pero sigue viajando en el contexto sin usarse.
