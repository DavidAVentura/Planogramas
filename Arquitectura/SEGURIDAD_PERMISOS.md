# Seguridad: permisos CAO por perfil

Autorización del módulo **PLANOGRAMA** ("SIP - Sistema de Implementación de Planogramas") con los
permisos que CAO entrega en `validar_token`. Implementada en el plan `2026-10-12-permisos-cao`
(DT-01 queda **Parcial**: falta el filtro por tienda, DT-10).

## 1. Cómo funciona

- `back/src/infrastructure/cao/caoAuthClient.js` normaliza la respuesta de CAO: un usuario puede
  tener varios perfiles y sus permisos efectivos son la **unión** de los de todos. El usuario queda
  congelado (`Object.freeze`) y sin el cuerpo crudo de CAO.
- `autenticacion.js` valida el token y exige `numeroEmpleado`; sin él responde `401` (evita la
  identidad compartida `'sistema'` en evidencias y auditoría).
- `back/src/domain/compartido/permisos.js` define los códigos y las funciones puras de decisión.
- `back/src/infrastructure/http/middlewares/autorizacion.js` traduce la decisión a `403`
  (`FORBIDDEN`, "No tienes permiso para esta acción"). Cada guard corre **antes** del controller
  (el `403` llega antes que cualquier `400`/`404` y sin tocar BD, CATI ni Blob) y deja un
  `console.warn` con usuario, método, ruta y regla (nunca el token).
- Ninguna regla decide por nombre de perfil, solo por código de permiso. El nombre de perfil vive
  solo en `PERFILES` (`permisos.js`).
- El front usa los mismos permisos para ocultar navegación y acciones; es **cosmético**, la
  autorización real es la del back.

## 2. Perfiles y permisos

| Perfil estandarizado | Perfil de aplicación | Descripción | Permisos |
|---|---|---|---|
| `PCOMER-EST` | PLA_ADMIN | Administrador de la aplicación (desarrolladores) | PLA001–PLA010 |
| `CATEGORIA-EST` | PLA_CAT | Usuario de categorías; administrador funcional | PLA001–PLA010 |
| `TIENDA-EST` (provisional, DT-13) | PLA_TIENDA | Usuario de tienda que implementa | PLA009, PLA010 |

| Código | Descripción | Qué controla |
|---|---|---|
| PLA001 | Editar estructura | Asignar versiones a tiendas (vista Estructura) |
| PLA002 | Crear planograma | `POST /planogramas` |
| PLA003 | Editar planograma | `PATCH /planogramas/:id` |
| PLA004 | Crear versión de planograma | `POST /planogramas/:id/versiones` |
| PLA005 | Editar versión de planograma | Formulario de datos básicos y editor (nombre, góndolas y similares) |
| PLA006 | Editar versión en lienzo | Abrir el lienzo |
| PLA007 | Crear tienda | `POST /tiendas` |
| PLA008 | Editar tienda | `PATCH /tiendas/:id` |
| PLA009 | Mi tienda | Vista "Mi tienda" del modo implementador |
| PLA010 | Productos | Vista "Productos" del modo implementador |

## 3. Reglas (A, I, C)

| Regla | Guard | Se cumple cuando |
|---|---|---|
| **A** (analista, **transitoria**) | `requiereAnalista` | El usuario tiene **todos** PLA001–PLA008. Cubre las acciones que CAO aún no tiene como permiso (sección 6). |
| **I** (lectura compartida) | `requiereImplementador` | PLA009 **o** PLA010 **o** regla A. |
| **C** (contenido de la versión) | `requierePermiso(EDITAR_VERSION, EDITAR_LIENZO)` | PLA005 **o** PLA006; siempre junto con A. |
| `PLA00X` | `requierePermiso(...)` | El usuario tiene alguno de los códigos indicados. |

`requierePermiso` lanza al construirse si recibe una lista vacía o un código fuera del catálogo.

## 4. Matriz endpoint → regla

Fuente de verdad: `back/src/infrastructure/http/routes/*.routes.js`, verificada por
`back/test/http/matrizPermisos.test.js` (cada fila) y `rutasProtegidas.test.js` (ninguna ruta sin
regla; falla si se agrega una ruta sin guard). "A (router)" = `router.use(requiereAnalista)` como
primera línea del archivo. `routes/index.js` no lleva reglas: cada `*.routes.js` declara las suyas.

| Archivo de rutas | Regla de router | Reglas por ruta |
|---|---|---|
| `accesorios` | A (router) | — |
| `adjuntos` | — | `GET /:id/url-descarga` → I · `POST /:id/subida`, `PUT /:id`, `DELETE /:id` → A |
| `agenteExtractor` | A (router) | — |
| `asignaciones` | A (router) + PLA001 | — |
| `auth` | — (excepción: solo autenticado) | `GET /sesion`, `POST /keepalive` |
| `catalogo` | A (router) | — |
| `consolidado` (`/consolidado/tiendas…`) | A (router) | `GET /tiendas` y `GET /tiendas/exportar` → además `validarQuery` y limitador por usuario (60/min y 5/min), en ese orden después de A · `GET /tiendas/filtros` → solo A |
| `evidencias` | I (router) | — |
| `gondolas` | A (router) | toda ruta no `GET` → C |
| `implementacion` (`/implementacion/*`) | A (router) | — |
| `jerarquia` | A (router) | — |
| `niveles` | A (router) | toda ruta no `GET` → C |
| `planogramas` | A (router) | `POST /` → PLA002 · `PATCH /:id` → PLA003 · `POST /:id/versiones` → PLA004 · `POST /:id/archivar` → solo A |
| `posiciones` | A (router) | toda ruta no `GET` → C |
| `producto` (`/catalog/productos…`) | A (router) | `PATCH /productos/:sku/dimensiones[/validar]` → solo A |
| `pruebas` (solo con `PRUEBAS_HABILITADAS`) | A (router) | — |
| `secciones` | A (router) | toda ruta no `GET` → C |
| `tiendas` | — | `GET /` → I · `POST /` → A + PLA007 · `PATCH /:id` → A + PLA008 · `GET /:tiendaId/planogramas` → I · `GET /:tiendaId/implementacion` → I · `GET /:tiendaId/implementacion/productos` → PLA010 · `GET` y `POST /:tiendaId/versiones/:versionId/evidencias` → I |
| `versiones` | — | `GET /:id/adjuntos` → I · `PATCH /:id` → A + PLA005 · `PUT /:id/tiendas` → A + PLA001 · `POST /:id/gondolas`, `PATCH /:id/gondolas/orden`, `PATCH /:id/skus/:sku`, `POST /:id/importar-layout`, `POST /:id/importar-productos` → A + C · todas las demás → A |
| `voz` | A (router) | — |

Decisiones de la matriz: `PATCH /versiones/:id/guardar` y `GET /versiones/:id/estructura` quedan con A
(la primera es un cambio de estado; la segunda no la consume ningún front). Todo `catalogo` queda con
A porque ninguna vista del implementador lo usa. El resumen de implementación (`/tiendas/:id/implementacion`)
es I y no PLA009 porque `ProductosTienda` (PLA010) también lo consume.

## 5. Matriz ruta del front → regla

Definida en `front/src/domain/permisos/permisos.ts` (`REGLAS`) y aplicada en `front/src/router/routes.tsx`
con `RequierePermiso`. `capacidades.analista` lo calcula el back (fuente única de la regla A).

| Ruta | Modo | Regla |
|---|---|---|
| `/planogramas`, `/planogramas/:id`, `/planogramas/:id/versiones/:versionId/editor` | analista | A |
| `/planogramas/:id/versiones/:versionId/lienzo[/gondola/:gondolaId]` | analista | A + PLA006 |
| `/tiendas`, `/productos`, `/por-version`, `/accesorios`, `/mantenimiento/consolidado-tiendas` | analista | A |
| `/estructura` | analista | A + PLA001 |
| `/mi-tienda` | implementador | PLA009 |
| `/mi-tienda/productos` | implementador | PLA010 |
| `/` | — | `RedirigirInicio`: primera pantalla del modo activo |

- Modos: **analista** si `capacidades.analista`; **implementador** si PLA009 o PLA010. Con un solo
  modo no se muestra `RoleSwitch`; con cero se muestra `SinAcceso` ("Sin acceso a Planogramas", con
  Mesa de Ayuda, jefe inmediato y NOVA). El modo se guarda en `sessionStorage` (`planogramas.modo`).
- Ruta no permitida por URL: redirección al inicio del modo + toast "No tienes acceso a esa pantalla."
- 403 de una acción: toast "No tienes permiso para esta acción."; no cierra la sesión ni el modal.
- Analista sin PLA006: se oculta la entrada al lienzo (modal Diseñar y "Ver lienzo" del resumen).
- Editor sin PLA005: editable no; badge "Solo lectura" en la barra de acciones.

## 6. Permisos por solicitar a IT CAO (hoy regla A)

Mientras no existan, estas acciones las puede hacer quien tenga PLA001–PLA008 (en la práctica
PCOMER-EST y CATEGORIA-EST). Registrado como **DT-11**.

1. Archivar planograma.
2. Promover, archivar y guardar (cambiar estado) de versión.
3. Gestionar adjuntos (agregar, reemplazar, eliminar).
4. Gestionar accesorios.
5. Editar dimensiones de producto.
6. Agente extractor (foto / PDF / IA).
7. Voz.
8. Consolidado Tiendas: ver y descargar (`/consolidado/*`, decisión D1 del plan `2026-10-15-consolidado-tiendas`: la descarga usa el mismo permiso que la vista; revisable).

**Cómo reemplazar A cuando lleguen los códigos**: (1) agregar el código a `PERMISOS` en `permisos.js`
(y en `permisos.ts` del front); (2) cambiar en la ruta `requiereAnalista` por `requierePermiso(...)`;
(3) actualizar `back/test/http/matrizPermisos.test.js`; (4) actualizar `puede(...)` del front;
(5) actualizar la matriz de este documento. Condición de cierre de DT-11: la prueba de rutas debe
comparar la regla de cada ruta contra una tabla declarativa, porque hoy los `PLA00X` por ruta quedan
tapados por A.

## 7. Cómo proteger una ruta nueva

1. En el `*.routes.js`, `router.use(requiereAnalista)` como primera línea (o guard por ruta si el
   archivo mezcla reglas) y, si corresponde, `requierePermiso(...)`.
2. Agregar la fila a `matrizPermisos.test.js`.
3. `rutasProtegidas.test.js` falla si una ruta queda sin guard.

## 8. Despliegue (orden obligatorio)

`CAO_COD_MODULO=PLANOGRAMA` se cambia en Azure **después** de que el código esté desplegado, nunca
antes (con el código viejo un usuario de tienda tendría escritura total; al revés, todos reciben 403:
seguro). Detalle y checklist en `DESPLIEGUE_AZURE.md` §6.

## 9. Deuda relacionada

DT-01 (parcial), DT-10 (sin filtro por tienda), DT-11 (acciones con regla A), DT-12 (evidencias de
cualquier tienda), DT-13 (nombre del perfil de tienda), DT-14 (revocación hasta 2 min), DT-15 (timeout
a CAO), DT-16 (parseo de body antes de autenticar), DT-17 a DT-19 (front y Postman), DT-47 (limitadores por IP sin `trust proxy`). Ver
`DEUDA_TECNICA.md`.

Pendiente de verificar en DEV (T17): si CAO responde `200` con `perfiles: []` o `401` a un usuario
sin perfil en PLANOGRAMA (se vería `SinAcceso` o `SesionRequerida`, respectivamente, sin bucle).

## 10. Verificación en DEV (2026-10-15)

Publicado `76dd827` en DEV y `CAO_COD_MODULO=PLANOGRAMA` aplicado en `planogramas-api-dev` después del
despliegue (orden S-06).

| Punto del checklist (T17) | Resultado |
|---|---|
| Usuario PCOMER-EST: `GET /auth/sesion` con PLA001–PLA010 y entrada normal a la app | ✅ Confirmado por el usuario |
| API sin token / con token inválido | ✅ `401` en ambos casos |
| Front con token inválido en `/auth` | ✅ "Acceso restringido" (`SesionRequerida`), sin bucle |
| Usuario sin perfil en PLANOGRAMA (`200` con `perfiles: []` o `401`) | ⏳ Pendiente: no hay usuario de prueba |
| Usuario de tienda (navbar Mi tienda/Productos, redirección con aviso) | ⏳ Pendiente: no hay usuario de tienda (DT-19) |
| Logs de `[autorizacion] 403` sin tokens | ⏳ Pendiente: aún no hay 403 registrados |
| Corrida completa de Postman con `TOKEN_CAO` de analista | ⏳ Pendiente |
