# PLAN — Permisos CAO por perfil (SIP, módulo `PLANOGRAMA`)

> Plan listo para codificar. El desarrollador solo lee este archivo y los archivos que aquí se citan.
> Rama `feat/permisos-cao`, commit base `c3c97b9`. Tamaño L. Cierra la parte de permisos de **DT-01**.

## Objetivo

Cada endpoint del back exige el permiso CAO que le corresponde (PLA001–PLA010 del módulo
`PLANOGRAMA`) y responde 403 antes de tocar la BD. El front deja de elegir el rol a mano: los modos
(analista / implementador), el navbar, las rutas y los botones salen de los permisos que devuelve
CAO. El usuario de tienda solo ve "Mi tienda" y "Productos"; el usuario sin perfiles en el módulo ve
una pantalla "Sin acceso" que lo manda a Mesa de Ayuda y a NOVA.

## Decisiones

| Decisión | Razón |
|---|---|
| La autorización vive en middlewares HTTP por ruta (`requiereAnalista`, `requiereImplementador`, `requierePermiso(...)`); los casos de uso no cambian. | Son reglas de acceso, no de negocio. Evita cambiar ~60 firmas de casos de uso. |
| Regla **A** (transitoria, "analista") = el usuario tiene **todos** PLA001–PLA008. | Falla cerrado. Hoy solo la cumplen PCOMER-EST y CATEGORIA-EST. Se usa para las acciones sin permiso propio en CAO (decisión del usuario). |
| Regla **I** (lectura compartida) = PLA009 **o** PLA010 **o** regla A. | Las vistas del implementador la usan, y algunas vistas de analista (Tiendas, adjuntos) llaman los mismos endpoints. Un perfil futuro con A sin PLA009/PLA010 no se rompe. |
| Regla **C** (contenido de la versión) = PLA005 **o** PLA006, y siempre junto con A. | El editor (PLA005) y el lienzo (PLA006) usan los mismos endpoints de contenido. |
| `PATCH /versiones/:id/guardar` queda con **A** (transitoria), no PLA005. | Es un cambio de estado (borrador → en_desarrollo); el usuario incluyó "cambios de estado de versión" entre las acciones sin permiso propio. Solo lo usa `PlanogramaDetalle`. |
| `GET /versiones/:id/estructura` queda con **A** (S-08). | Ningún archivo del front lo consume (verificado por el coordinador). Mínimo privilegio. |
| Todo `catalogo.routes.js` (`/catalog/productos/buscar`, `/:sku`, `/:sku/stock`, `/:sku/ficha-tecnica`) queda con **A**. | Ninguna vista del implementador los llama (verificado: `MiTienda`, `ProductosTienda` y `components/dominio/implementacion/*` no usan catálogo). Mínimo privilegio; además elimina el riesgo de orden de montaje S-13. |
| `GET /tiendas/:id/implementacion` queda con **I**; `GET /tiendas/:id/implementacion/productos` con **PLA010**. | `ProductosTienda` (PLA010) también llama al resumen (`useResumenImplementacion`); dejar el resumen en PLA009 rompería a un perfil con solo PLA010. |
| `PUT /versiones/:id/tiendas` y todo `/asignaciones` = A + PLA001. | Confirmado por el usuario: es "asignar versiones a tiendas" (vista Estructura). |
| El usuario de tienda puede leer, subir y borrar (las propias) evidencias de cualquier tienda; no se filtra por tienda. | Decisión del usuario: el dato de tienda por usuario en CAO no está actualizado. Queda como deuda (DT-10, DT-12). |
| Se elimina `cao` de `mapearUsuario` y de `GET /auth/sesion`; la sesión se arma con lista blanca. | Nadie lo usa (grep: solo `caoAuthClient.js:81` y el tipo del front). Cierra el riesgo en vez de registrarlo como deuda. |
| El usuario normalizado se congela (`Object.freeze`, también `perfiles`, cada perfil y `permisos`). | Es la misma referencia que está en el caché de CAO por 2 min (S-09). |
| Sin número de empleado (`user` de CAO) no hay sesión: `autenticacion.js` responde 401. | S-07: evita que dos usuarios compartan la identidad `'sistema'` en evidencias y auditoría. La respuesta real de CAO siempre trae `user`. |
| El nombre del perfil de tienda (`TIENDA-EST`, provisional) vive en una sola constante `PERFILES` y no se usa en ninguna regla. | Las reglas son por permiso (S-11). El usuario enviará el nombre definitivo. |
| Modos en el front: analista si `capacidades.analista`; implementador si PLA009 o PLA010. Con un modo no se muestra `RoleSwitch`; con cero se muestra `SinAcceso`. | `capacidades` lo calcula el back (fuente única de la regla A). |
| El modo se persiste en `sessionStorage` (clave `planogramas.modo`). Precedencia al cargar: modo de la ruta actual → guardado → analista → implementador. | Propuesta de UX aceptada por el coordinador: preferencia por pestaña, no sobrevive a otra sesión. |
| `rutaInicio(modo)` = primera opción del navbar de ese modo que el usuario puede ver. | Con las reglas de modo definidas, cada modo siempre tiene al menos una opción visible: no hace falta el `EmptyState` anti-bucle que propuso UX. |
| Ruta no permitida por URL → `<Navigate replace>` al inicio del modo + `Toast` info `No tienes acceso a esa pantalla.` | UX §5.2. |
| Analista sin PLA006: se oculta la entrada al lienzo (opción "Lienzo" del modal Diseñar y "Ver lienzo" del resumen); la ruta `/lienzo` exige A + PLA006. Sin PLA006, "Diseñar" navega directo al editor. | Decisión del usuario (ronda 2): PLA006 = abrir el lienzo. Reemplaza la propuesta de UX de "solo lectura" en el lienzo. |
| El editor (`/editor`) exige A y es editable solo con PLA005; sin PLA005 muestra el badge `Solo lectura`. | PLA005 = editar la versión. Hoy nadie cae en el caso, pero la pantalla queda coherente. |
| Los componentes de dominio siguen recibiendo la prop booleana `puedeEscribir` (no se renombra); cada página decide con qué permiso la calcula. | Ningún componente lee el contexto (solo las 7 páginas usan `useAuth().puedeEscribir`). Renombrar ~120 usos no aporta. |
| 403 en el front: toast `No tienes permiso para esta acción.`; no invalida la sesión, no reintenta, no cierra el modal. El back responde `No tienes permiso para esta acción` (sin punto, contrato fijo). | UX §5.3 y S-02/S-10. |
| `CAO_COD_MODULO=PLANOGRAMA` se cambia en Azure **después** de que el código nuevo esté desplegado, nunca antes. | S-06: con el código viejo, un usuario de tienda tendría escritura total. Al revés (código nuevo con `SCRAPING`) todos reciben 403: seguro. |
| `SinAcceso`: texto con Mesa de Ayuda + jefe inmediato + NOVA; acción "Ir a NOVA" (si existe `VITE_CAO_PORTAL_URL`) o "Salir". | Respuestas del usuario (ronda 2). |
| No se agregan paquetes. | Todo se resuelve con `node:test`, `http`, `fetch` y Vitest ya instalados. |

## Fuera de alcance

- Filtro por tienda del usuario (endpoints I aceptan cualquier `tiendaId`) → DT-10.
- Permisos propios para archivar, promover, guardar (cambio de estado), adjuntos, accesorios,
  dimensiones, agente extractor, voz, pruebas → DT-11 (se piden a IT CAO; hoy regla A).
- Borrado lógico / auditoría de evidencias → DT-12.
- Timeout del `fetch` a CAO y `details` del 503 → DT-15. Parseo de body antes de la autenticación → DT-16.
- Reducir el TTL de 2 min del caché de CAO → DT-14 (aceptado).
- Renombrar `RoleSwitch` a `ModoSwitch`, variantes de `Badge`, componente `<SoloConPermiso>` (propuestas
  de UX al sistema de diseño; no se hacen aquí).
- Cambiar el texto de `SesionRequerida` ("CemacoAllInOne"): ver pregunta abierta.
- Publicar en PROD (solo si el usuario lo pide explícitamente).

## Contratos

### `GET /auth/sesion` (modificado)

Regla: autenticado. Respuesta 200 — claves **exactas**, en este orden:

```json
{
  "id": "100702",
  "numeroEmpleado": "100702",
  "usuario": "100702",
  "nombre": "DAVID VENTURA",
  "correo": null,
  "perfiles": [{ "codigo": "PCOMER-EST", "nombre": "P. Comercial estandarizado", "permisos": ["PLA001", "…", "PLA010"] }],
  "permisos": ["PLA001", "…", "PLA010"],
  "capacidades": { "analista": true, "implementador": true },
  "tiendas": [{ "cod_tienda": "T004", "nombre": "Zona 4", "cod_tipo": 1 }]
}
```

- `capacidades.analista` = regla A; `capacidades.implementador` = PLA009 o PLA010.
- Se elimina `cao`. `tiendas` se devuelve tal cual (no se usa para filtrar).
- `correo` puede venir `undefined` (se omite en el JSON); el front ya lo trata como opcional.
- Usuario autenticado en CAO pero sin perfiles en el módulo → 200 con `perfiles: []`, `permisos: []`,
  `capacidades: { analista: false, implementador: false }`.
- Errores: 401 `UNAUTHORIZED` (sin token, token inválido, **o sin número de empleado**: mensaje
  `Sesión sin número de empleado`), 503 `SERVICE_UNAVAILABLE` (CAO caído).

### Error nuevo en todos los endpoints protegidos

```json
403 { "error": { "code": "FORBIDDEN", "message": "No tienes permiso para esta acción" } }
```

Sin `details`. El 403 se resuelve antes que el 400/404 (el middleware corre antes que el controller)
y antes de cualquier acceso a BD, CATI o Blob.

### Matriz endpoint → regla (fuente de verdad para T5 y T8)

Notación: **A** = `requiereAnalista`; **I** = `requiereImplementador`; **C** =
`requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO)`; `PLA00X` = `requierePermiso(...)`.
"A (router)" = `router.use(requiereAnalista)` como **primera línea** después de `const router = Router();`.

| Archivo `back/src/infrastructure/http/routes/` | Regla de router | Reglas por ruta |
|---|---|---|
| `accesorios.routes.js` | A (router) | — (escrituras: A transitoria) |
| `adjuntos.routes.js` | — | `GET /:id/url-descarga` → I · `POST /:id/subida`, `PUT /:id`, `DELETE /:id` → A |
| `agenteExtractor.routes.js` | A (router) | — |
| `asignaciones.routes.js` | A (router) + `requierePermiso(EDITAR_ESTRUCTURA)` en el mismo `router.use` | — |
| `auth.routes.js` | — (excepción explícita) | — |
| `catalogo.routes.js` | A (router) | — |
| `evidencias.routes.js` | I (router) | — |
| `gondolas.routes.js` | A (router) | toda ruta no `GET` → C |
| `implementacion.routes.js` | A (router) | — |
| `jerarquia.routes.js` | A (router) | — |
| `niveles.routes.js` | A (router) | toda ruta no `GET` → C |
| `planogramas.routes.js` | A (router) | `POST /` → PLA002 · `PATCH /:id` → PLA003 · `POST /:id/versiones` → PLA004 · `POST /:id/archivar` → solo A |
| `posiciones.routes.js` | A (router) | toda ruta no `GET` → C |
| `producto.routes.js` | A (router) | `PATCH /productos/:sku/dimensiones[/validar]` → solo A |
| `pruebas.routes.js` | A (router) | — |
| `secciones.routes.js` | A (router) | toda ruta no `GET` → C |
| `tiendas.routes.js` | — | `GET /` → I · `POST /` → A, PLA007 · `PATCH /:id` → A, PLA008 · `GET /:tiendaId/planogramas` → I · `GET /:tiendaId/implementacion` → I · `GET /:tiendaId/implementacion/productos` → `requierePermiso(PRODUCTOS_TIENDA)` · `GET` y `POST /:tiendaId/versiones/:versionId/evidencias` → I |
| `versiones.routes.js` | — | `GET /:id/adjuntos` → I · `PATCH /:id` → A, PLA005 · `PUT /:id/tiendas` → A, PLA001 · `POST /:id/gondolas`, `PATCH /:id/gondolas/orden`, `PATCH /:id/skus/:sku`, `POST /:id/importar-layout`, `POST /:id/importar-productos` → A, C · **todas las demás** (`GET /:id`, `GET /:id/gondolas`, `POST /:id/promover`, `GET /:id/publicacion/simular`, `POST /:id/archivar`, `GET /:id/tiendas`, `PATCH /:id/guardar`, `GET /:id/estructura`, `GET /:id/resumen`, `POST /:id/adjuntos/subida`, `POST /:id/adjuntos`, `GET /:id/skus`) → A |
| `voz.routes.js` | A (router) | — |

`routes/index.js` no recibe reglas (S-03): solo un comentario sobre que cada `*.routes.js` declara
su propia autorización y que no debe agregarse un `router.use(requiereAnalista)` sin prefijo.

### Tipos TS del front que cambian (`front/src/types/usuario.ts`)

```ts
export interface CapacidadesUsuario { analista: boolean; implementador: boolean; }
export interface UsuarioSesion {
  id?: string | number; numeroEmpleado?: string; usuario?: string; nombre?: string; correo?: string;
  perfiles?: PerfilUsuario[];
  /** Unión de los permisos de todos los perfiles del módulo PLANOGRAMA (ej. "PLA001"). */
  permisos: string[];
  capacidades: CapacidadesUsuario;
  tiendas?: unknown[];
}
```
Se elimina `cao`.

## Datos

Sin cambios de BD. Los permisos viven solo en CAO (`validar_token`); no se replican. No hay
migración nueva.

## Seguridad (controles obligatorios)

| # | Control | Dónde | Cómo se prueba |
|---|---|---|---|
| S-01 | Funciones de dominio fallan cerrado: `esAnalista` exige **todos** PLA001–PLA008; `tieneAlguno` da `false` con usuario nulo, `permisos` no arreglo o `codigos` vacío; comparación exacta (sin normalizar mayúsculas); constantes congeladas y no vacías. | `back/src/domain/compartido/permisos.js` (T1) | `back/test/domain/permisos.test.js` |
| S-02 | `requierePermiso` lanza **al construirse** con lista vacía, `undefined` o código fuera del catálogo; sin `req.usuario` → 401; cuerpo del 403 exacto y sin `details`. | `middlewares/autorizacion.js` (T4) | `back/test/http/autorizacion.test.js` |
| S-03 | Ninguna ruta sin regla: prueba que recorre `router.stack` de cada `*.routes.js` (excepción: `auth.routes.js`). | T7 | `back/test/http/rutasProtegidas.test.js` |
| S-04 | Prueba HTTP de la matriz con stubs de CAO/BD/CATI/Blob: 403 sin ningún acceso a BD/CATI/Blob; 403 antes que 400/404. | T8 | `back/test/http/matrizPermisos.test.js` |
| S-05 | `GET /auth/sesion` con lista blanca (sin spread de `req.usuario`, sin `delete`); no muta `req.usuario`. | `auth.controller.js` (T6) | `back/test/http/authSesion.test.js` |
| S-06 | Orden de despliegue: código primero, `CAO_COD_MODULO=PLANOGRAMA` después; nunca al revés. | T17 + `DESPLIEGUE_AZURE.md` (T16) | Checklist de T17 |
| S-07 | Sin `numeroEmpleado` → 401 en todo endpoint autenticado. | `middlewares/autenticacion.js` (T3) | Caso `sinIdentidad` en `matrizPermisos.test.js` |
| S-08 | `GET /versiones/:id/estructura` = A. | T5 | Tabla de T8 (token `tienda` → 403) |
| S-09 | Usuario normalizado congelado; los middlewares no le agregan propiedades. | `caoAuthClient.js` (T2), `autorizacion.js` (T4) | `back/test/infrastructure/caoAuthClient.test.js` (`Object.isFrozen`) |
| S-10 | 403 en el front sin efectos colaterales; el rol ya no sale de la URL; los guards del front son cosméticos. | `authInterceptor.service.ts` (sin cambio de 401), `utils/errors.ts` (T14), `AuthContext.tsx` (T10) | `front/src/domain/permisos/permisos.test.ts` |
| S-11 | Ninguna regla decide por `perfiles[].codigo`; el nombre de perfil vive solo en `PERFILES`. | T1, T4, T9–T11 | Revisión del diff: `grep -rn "TIENDA-EST\|TIENDAS-EST\|PCOMER\|CATEGORIA-EST\|PLA_CAT\|PLA_TIENDA" back/src front/src` solo debe mostrar la constante `PERFILES` |
| S-12 | Cada 403 deja `console.warn` con usuario, método, ruta (sin query) y regla; nunca el token ni el header `Authorization`. | `autorizacion.js` (T4) | Espía de `console.warn` en `matrizPermisos.test.js` |
| S-13 | Orden de montaje `/catalog`: resuelto al dejar todo `catalogo.routes.js` en A. Se deja el comentario en `index.js`. | T5 | Caso `GET /catalog/productos/123` con `tienda` → 403 |
| S-14 | `guardar` decidido: A transitoria (ver Decisiones). | T5 | Tabla de T8 |

## UX (resumen para implementar)

Principio: **lo que no se puede usar no se muestra** (ocultar, no deshabilitar; `DISENO_SISTEMA.md`
§4.4). Sin CSS nuevo salvo el reemplazo de `#fff` en `RoleSwitch.css`. Componentes base:
`PantallaAcceso`, `Button`, `Toast` (vía `useToast().mostrarToast(mensaje, tipo)`), `Badge`, `RoleSwitch`,
`AppTopbar`. Componentes nuevos: `SinAcceso` (página que solo compone `PantallaAcceso`) y
`RequierePermiso` / `RedirigirInicio` (lógica, sin estilos).

Navbar por perfil (sin huecos; las opciones ocultas no se renderizan):
```
Analista (2 modos):   Planogramas  Tiendas  Estructura  Productos  Por versión  Accesorios   (Analista|Implementador)  Nombre  Salir
Analista en implem.:  Mi tienda  Productos   [chip Tienda]   (Analista|Implementador)  Nombre  Salir
Solo tienda (1 modo): Mi tienda  Productos   [chip Tienda]   Nombre  Salir
```

Textos exactos:
- `SinAcceso` — título `Sin acceso a Planogramas`; mensaje
  `Tu usuario no tiene permisos para este módulo. Solicita el acceso a Mesa de Ayuda con la aprobación de tu jefe inmediato y luego ingresa nuevamente desde NOVA.`;
  acción `Ir a NOVA` (enlace `className="button button--primary"` a `CAO_PORTAL_URL`) o, si
  `CAO_PORTAL_URL` no está definido, `Button variante="outline"` `Salir`. Foco inicial en la acción.
- Ruta no permitida: `Toast` `info` `No tienes acceso a esa pantalla.` (una sola vez) + redirección.
- 403 de una acción: `Toast` `error` `No tienes permiso para esta acción.`
- Editor sin PLA005: `Badge` con `bg="var(--ink-100)" color="var(--fg-2)"` y texto `Solo lectura`, dentro del
  encabezado de la página.
- Mientras `estado === 'verificando'`: la `PantallaAcceso cargando` existente; no decidir modo ni
  navbar antes de tener `usuario`.

Accesibilidad: `RoleSwitch` conserva `role="radiogroup"` y `aria-label="Rol"`; con un solo modo no se
renderiza (ni un radiogroup de una opción ni un texto fijo). `nav aria-label="Navegación principal"`
se mantiene. El toast de redirección no mueve el foco.

Mapa de acciones (qué booleano recibe cada pieza) — ver T13.

## Tareas

### T1 — Dominio de permisos (back)
- **Archivos**: crear `back/src/domain/compartido/permisos.js` · crear `back/test/domain/permisos.test.js`
- **Qué hacer**: módulo CommonJS sin dependencias:
  ```js
  const PERMISOS = Object.freeze({
    EDITAR_ESTRUCTURA: 'PLA001', CREAR_PLANOGRAMA: 'PLA002', EDITAR_PLANOGRAMA: 'PLA003',
    CREAR_VERSION: 'PLA004', EDITAR_VERSION: 'PLA005', EDITAR_LIENZO: 'PLA006',
    CREAR_TIENDA: 'PLA007', EDITAR_TIENDA: 'PLA008', MI_TIENDA: 'PLA009', PRODUCTOS_TIENDA: 'PLA010',
  });
  const CODIGOS_PERMISO       = Object.freeze(Object.values(PERMISOS));
  const PERMISOS_ANALISTA     = Object.freeze(['PLA001', … 'PLA008']);   // regla transitoria A
  const PERMISOS_IMPLEMENTADOR = Object.freeze(['PLA009', 'PLA010']);
  // Solo para mostrar/documentar; NINGUNA regla decide por perfil. TIENDA-EST es provisional
  // (IT CAO lo está validando; en la matriz original figura TIENDAS-EST). Ver DT-13.
  const PERFILES = Object.freeze({ ADMIN: 'PCOMER-EST', CATEGORIA: 'CATEGORIA-EST', TIENDA: 'TIENDA-EST' });

  esCodigoPermiso(codigo) → boolean                 // CODIGOS_PERMISO.includes(codigo)
  tieneAlguno(usuario, codigos) → boolean           // false si usuario nulo, permisos no arreglo, codigos vacío/no arreglo
  esAnalista(usuario) → boolean                     // Array.isArray(permisos) && PERMISOS_ANALISTA.every(c => permisos.includes(c))
  esImplementador(usuario) → boolean                // tieneAlguno(usuario, PERMISOS_IMPLEMENTADOR)
  puedeLecturaCompartida(usuario) → boolean         // esImplementador || esAnalista  (regla I)
  capacidades(usuario) → { analista, implementador } // objeto nuevo, no muta usuario
  ```
  Comentario de cabecera: qué es A, I y C, y que A se reemplaza por el código de cada permiso
  cuando IT CAO los cree (DT-11).
- **Criterios de aceptación**:
  - [ ] No importa nada de Express ni de `infrastructure/`.
  - [ ] `PERMISOS`, `CODIGOS_PERMISO`, `PERMISOS_ANALISTA`, `PERMISOS_IMPLEMENTADOR`, `PERFILES` son `Object.isFrozen` y no vacíos.
  - [ ] Comparación exacta: `'pla001'` no cuenta.
- **Pruebas** (`node:test`): usuario con PLA001–PLA007 → no analista; con PLA001–PLA008 → analista;
  `{ permisos: 'PLA001,PLA002,…' }` → no analista; `null` y `{}` → todas las funciones `false`;
  `tieneAlguno(u, [])` → `false`; `'pla001'` no cuenta; tienda (`['PLA009','PLA010']`) → implementador
  y lectura compartida, no analista; solo PLA010 → implementador; `capacidades` no muta el argumento
  (pasar un objeto congelado).
- **Depende de**: —

### T2 — `mapearUsuario` sin `cao` y congelado
- **Archivos**: modificar `back/src/infrastructure/cao/caoAuthClient.js` · crear `back/test/infrastructure/caoAuthClient.test.js`
- **Qué hacer**:
  - Quitar `cao: datos` del objeto que retorna `mapearUsuario` y actualizar el JSDoc (líneas 51-57)
    con la forma real: varios perfiles, `user`, `username`, `tiendas[{cod_tienda,nombre,cod_tipo}]`.
  - Congelar: cada perfil (`Object.freeze({ codigo, nombre, permisos: Object.freeze([...]) })`), el
    arreglo `perfiles`, `permisos`, `tiendas` y el objeto usuario.
  - Exportar `mapearUsuario` en `module.exports` (comentario: "exportado solo para pruebas").
- **Criterios de aceptación**:
  - [ ] Con el cuerpo de ejemplo de `00_solicitud.md` (ronda 2) más un segundo perfil
        `{ cod_perfil: 'TIENDA-EST', permisos: ['PLA009','PLA011'] }`, `permisos` es la unión sin duplicados.
  - [ ] El resultado no tiene la clave `cao` ni `token`.
  - [ ] `Object.isFrozen(usuario)`, `Object.isFrozen(usuario.permisos)`, `Object.isFrozen(usuario.perfiles[0])` son `true`.
  - [ ] `numeroEmpleado === '100702'`, `nombre === 'DAVID VENTURA'`, `tiendas` conserva los objetos de CAO.
- **Pruebas**: los cuatro criterios anteriores en `caoAuthClient.test.js`. Si requerir el módulo
  necesita variables de entorno, definir `process.env.CAO_BASE_URL` en la prueba antes del `require`
  (la regla de `env.js` aplica a `src/`, no a `test/`).
- **Depende de**: —

### T3 — Identidad obligatoria en la autenticación (S-07)
- **Archivos**: modificar `back/src/infrastructure/http/middlewares/autenticacion.js`
- **Qué hacer**: después de `req.usuario = await caoAuthClient.validarToken(token)`, si
  `!req.usuario?.numeroEmpleado` → `next(err)` con `status 401`, `code 'UNAUTHORIZED'`, mensaje
  `Sesión sin número de empleado`, **antes** de `mantenerSesionActiva` y del contexto.
- **Criterios de aceptación**:
  - [ ] Un usuario sin `numeroEmpleado` recibe 401 en cualquier ruta (incluida `GET /auth/sesion`) y no se toca BD.
  - [ ] El flujo normal no cambia.
- **Pruebas**: caso `sinIdentidad` en `matrizPermisos.test.js` (T8): `POST /tiendas/1/versiones/1/evidencias` → 401, 0 accesos a BD.
- **Depende de**: —

### T4 — Middleware de autorización
- **Archivos**: crear `back/src/infrastructure/http/middlewares/autorizacion.js` · crear `back/test/http/autorizacion.test.js`
- **Qué hacer**:
  ```js
  const { PERMISOS, esCodigoPermiso, tieneAlguno, esAnalista, puedeLecturaCompartida } = require('../../../domain/compartido/permisos');

  function errorProhibido() // Error, status 403, code 'FORBIDDEN', message 'No tienes permiso para esta acción', sin details
  function crearGuard(regla, cumple) // (req, res, next): sin req.usuario → 401 UNAUTHORIZED;
                                     // !cumple(req.usuario) → console.warn + next(errorProhibido()); si no, next().
                                     // Marca fn.reglaAutorizacion = regla (congelada). No escribe nada en req.usuario.
  const requiereAnalista      = crearGuard('A', esAnalista);
  const requiereImplementador = crearGuard('I', puedeLecturaCompartida);
  function requierePermiso(...codigos) // lanza Error al construirse si codigos.length === 0 o algún
                                       // !esCodigoPermiso(c) (cubre undefined y 'PLA999');
                                       // retorna crearGuard(Object.freeze([...codigos]), u => tieneAlguno(u, codigos))
  module.exports = { requiereAnalista, requiereImplementador, requierePermiso, PERMISOS };
  ```
  Formato del log: `` `[autorizacion] 403 usuario=${usuario.numeroEmpleado} ${req.method} ${req.baseUrl}${req.path} regla=${regla}` ``
  (usar `baseUrl + path`, nunca `originalUrl` ni headers).
- **Criterios de aceptación**:
  - [ ] `assert.throws(() => requierePermiso())`, `requierePermiso(undefined)`, `requierePermiso('PLA999')`.
  - [ ] Cuerpo del 403 (pasado por `errorHandler`) `deepEqual` a `{ error: { code: 'FORBIDDEN', message: 'No tienes permiso para esta acción' } }`.
  - [ ] Sin `req.usuario` → error con `status 401`.
  - [ ] Funciona con un `req.usuario` congelado (no lanza `TypeError`).
  - [ ] Cada guard expone `reglaAutorizacion` (`'A'`, `'I'` o arreglo de códigos).
- **Pruebas** (`autorizacion.test.js`, sin servidor: llamar el middleware con `req`/`next` falsos y
  luego `errorHandler` con un `res` falso): los criterios anteriores; usuario tienda con
  `requierePermiso('PLA010')` → pasa; con `requierePermiso('PLA005','PLA006')` → 403; analista → pasa.
- **Depende de**: T1

### T5 — Aplicar la matriz en los routers
- **Archivos**: modificar los 18 `back/src/infrastructure/http/routes/*.routes.js` (todos menos
  `auth.routes.js`) y `back/src/infrastructure/http/routes/index.js` (solo comentario)
- **Qué hacer**: aplicar exactamente la tabla "Matriz endpoint → regla" de Contratos.
  - Importar `const { requiereAnalista, requiereImplementador, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');`.
  - Regla de router: `router.use(requiereAnalista);` como primera instrucción después de crear el router.
  - En archivos con C: `const editarContenido = requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO);` y ponerlo antes del controller.
  - Por ruta, los guards van **antes** del controller y en el orden `A`, luego el permiso:
    `router.post('/', requiereAnalista, requierePermiso(PERMISOS.CREAR_TIENDA), controller.crear);`
  - Comentario corto en cada regla transitoria: `// A transitoria: sin permiso propio en CAO (DT-11)`.
  - En `index.js`, comentario sobre el bloque de módulos: cada `*.routes.js` declara su
    autorización; prohibido un `router.use(requiereAnalista)` sin prefijo aquí (bloquearía las
    rutas I de `/tiendas`, `/evidencias`, `/adjuntos`).
- **Criterios de aceptación**:
  - [ ] T7 y T8 pasan.
  - [ ] `npm run dev` arranca (un código mal escrito haría lanzar `requierePermiso` al cargar).
  - [ ] Ninguna ruta usa nombres de perfil.
- **Pruebas**: T7 y T8.
- **Depende de**: T4

### T6 — `GET /auth/sesion` con lista blanca y capacidades
- **Archivos**: modificar `back/src/application/auth/auth.controller.js` · crear `back/test/http/authSesion.test.js`
- **Qué hacer**:
  ```js
  const { capacidades } = require('../../domain/compartido/permisos');
  function obtenerSesion(req, res) {
    const u = req.usuario;
    res.json({ id: u.id, numeroEmpleado: u.numeroEmpleado, usuario: u.usuario, nombre: u.nombre,
      correo: u.correo, perfiles: u.perfiles, permisos: u.permisos, capacidades: capacidades(u), tiendas: u.tiendas });
  }
  ```
  Actualizar el comentario de cabecera.
- **Criterios de aceptación**:
  - [ ] Con `req.usuario` que trae `cao: { token: 'x' }` y `extra: 1`, las claves de la respuesta son exactamente
        `['id','numeroEmpleado','usuario','nombre','correo','perfiles','permisos','capacidades','tiendas']`.
  - [ ] Tienda → `capacidades { analista: false, implementador: true }`; `permisos: []` → ambos `false`.
  - [ ] `req.usuario` congelado no provoca error.
- **Pruebas**: `authSesion.test.js` con `res` falso que captura el argumento de `json`.
- **Depende de**: T1

### T7 — Prueba de completitud de rutas (S-03)
- **Archivos**: crear `back/test/http/rutasProtegidas.test.js`
- **Qué hacer**: para cada archivo de `back/src/infrastructure/http/routes/` que termine en
  `.routes.js` (leer el directorio con `fs.readdirSync`, así una ruta nueva entra sola):
  - `EXCEPCIONES = ['auth.routes.js']`.
  - Hacer `require` del router (antes, reemplazar en `require.cache` los mismos módulos que T8 —
    `db/connection`, `cati/catiClient`, `storage/blobClient` — si su carga lo exige).
  - `protegidoPorRouter` = existe en `router.stack` una capa sin `route` cuyo `handle.reglaAutorizacion` está definido.
  - Para cada capa con `route`: falla si `!protegidoPorRouter` y ningún `route.stack[i].handle.reglaAutorizacion` está definido.
    Mensaje: `` `${archivo}: ${Object.keys(route.methods)} ${route.path} sin regla de autorización` ``.
  - Además: en `routes/index.js` no debe haber `router.use(` con un guard sin prefijo (comprobar
    que ninguna capa del router raíz sin `route` tenga `reglaAutorizacion`).
- **Criterios de aceptación**:
  - [ ] Pasa con todas las rutas.
  - [ ] Verificación manual (no se commitea): quitar la regla de `DELETE /adjuntos/:id` hace fallar la prueba.
- **Pruebas**: este archivo.
- **Depende de**: T5

### T8 — Prueba HTTP de la matriz (S-04, S-07, S-12)
- **Archivos**: crear `back/test/http/matrizPermisos.test.js`
- **Qué hacer** (solo `node:test`, `node:http`, `fetch` global; sin dependencias nuevas):
  1. Antes de cualquier `require` de `src/`, definir en `process.env` lo mínimo que pida
     `back/src/config/env.js` (revisarlo) y reemplazar en `require.cache` (por ruta resuelta con
     `require.resolve`):
     - `src/infrastructure/cao/caoAuthClient.js` → `{ validarToken: async (t) => USUARIOS[t] ?? throw 401, mantenerSesionActiva: () => {}, mapearUsuario }`.
     - `src/infrastructure/db/connection.js` → `Proxy` de función cuyas trampas `get` y `apply`
       incrementan `accesos.bd` y lanzan `Error('BD no disponible en prueba')`. Si algún módulo toca
       la BD al cargarse, contar solo cuando `contando === true` (se activa justo antes de las requests).
     - `src/infrastructure/cati/catiClient.js` y `src/infrastructure/storage/blobClient.js` → igual, con `accesos.cati` / `accesos.blob`.
  2. `USUARIOS` (congelados): `analista` (PLA001–PLA010, `numeroEmpleado: '1'`), `tienda`
     (PLA009, PLA010), `sinPermisos` (`[]`), `soloPLA009`, `soloPLA010`, `sinIdentidad`
     (todos los permisos, `numeroEmpleado: undefined`), `sieteDeOcho` (PLA001–PLA007, PLA009, PLA010).
  3. Levantar `require('../../src/infrastructure/http/app')` con `http.createServer(app).listen(0)`;
     cerrar en `after`.
  4. Tabla de casos `[método, ruta, token, esperado]` donde `esperado` es `403`, `401` o `'pasa'`
     (= cualquier status distinto de 403 y 401; puede ser 500 por el stub de BD). Casos mínimos:
     - **Tienda → 403** (y `accesos` en 0): `POST /planogramas`, `PATCH /planogramas/1`,
       `POST /planogramas/1/archivar`, `POST /planogramas/1/versiones`, `PATCH /versiones/1`,
       `PATCH /versiones/1/guardar`, `POST /versiones/1/promover`, `POST /versiones/1/archivar`,
       `PUT /versiones/1/tiendas`, `POST /versiones/1/gondolas`, `POST /versiones/1/importar-layout`,
       `POST /asignaciones/ediciones`, `POST /tiendas`, `PATCH /tiendas/1`, `DELETE /adjuntos/1`,
       `POST /versiones/1/adjuntos/subida`, `PATCH /catalog/productos/X/dimensiones`,
       `POST /agente-extractor/imagen`, `POST /voz/tts`, `PATCH /posiciones/1/asignar-sku`,
       `POST /accesorios`; lecturas: `GET /planogramas`, `GET /versiones/1`, `GET /versiones/1/estructura`,
       `GET /asignaciones`, `GET /implementacion/versiones`, `GET /catalog/productos`,
       `GET /catalog/productos/123`, `GET /jerarquia/areas`, `GET /posiciones/por-sku`.
     - **Tienda → pasa**: `GET /tiendas`, `GET /tiendas/1/planogramas`, `GET /tiendas/1/implementacion`,
       `GET /tiendas/1/implementacion/productos`, `GET` y `POST /tiendas/1/versiones/1/evidencias`,
       `GET /evidencias/1/descargar`, `DELETE /evidencias/1`, `GET /versiones/1/adjuntos`,
       `GET /adjuntos/1/url-descarga`.
     - **sinPermisos → 403** en todas las rutas de las dos listas anteriores; `GET /auth/sesion` → 200.
     - **soloPLA009**: `GET /tiendas/1/implementacion/productos` → 403; `GET /tiendas/1/implementacion` → pasa.
     - **soloPLA010**: `GET /tiendas/1/implementacion` → pasa; `GET /tiendas/1/implementacion/productos` → pasa.
     - **sieteDeOcho**: `GET /planogramas` → 403 (A exige todos).
     - **Analista**: `GET /versiones/abc` → no 403 (400 o 500); **tienda** en `GET /versiones/abc` → 403.
     - **sinIdentidad**: `POST /tiendas/1/versiones/1/evidencias` → 401.
  5. Espiar `console.warn` (`mock.method(console, 'warn')`): hay al menos un registro por 403 y ninguno contiene el token.
- **Criterios de aceptación**:
  - [ ] Todos los casos de la tabla se cumplen y, en los 403/401, `accesos.bd + accesos.cati + accesos.blob === 0`.
  - [ ] La prueba termina sola (servidor cerrado, sin handles abiertos) dentro de `npm test`.
- **Pruebas**: este archivo.
- **Depende de**: T3, T5, T6

### T9 — Dominio de permisos (front)
- **Archivos**: crear `front/src/domain/permisos/permisos.ts` · crear `front/src/domain/permisos/permisos.test.ts` · crear `front/src/constants/navegacion.ts`
- **Qué hacer**:
  ```ts
  // permisos.ts — lógica pura, sin React
  export const PERMISOS = { EDITAR_ESTRUCTURA: 'PLA001', CREAR_PLANOGRAMA: 'PLA002', EDITAR_PLANOGRAMA: 'PLA003',
    CREAR_VERSION: 'PLA004', EDITAR_VERSION: 'PLA005', EDITAR_LIENZO: 'PLA006', CREAR_TIENDA: 'PLA007',
    EDITAR_TIENDA: 'PLA008', MI_TIENDA: 'PLA009', PRODUCTOS_TIENDA: 'PLA010' } as const;
  export type CodigoPermiso = (typeof PERMISOS)[keyof typeof PERMISOS];
  export type Modo = 'analista' | 'implementador';
  export interface ReglaAcceso { analista?: boolean; algunoDe?: readonly CodigoPermiso[] }
  export const REGLAS = {
    analista:        { analista: true },
    estructura:      { analista: true, algunoDe: ['PLA001'] },
    lienzo:          { analista: true, algunoDe: ['PLA006'] },
    miTienda:        { algunoDe: ['PLA009'] },
    productosTienda: { algunoDe: ['PLA010'] },
  } as const satisfies Record<string, ReglaAcceso>;
  export interface OpcionNavegacion { etiqueta: string; ruta: string; regla: ReglaAcceso; exacta?: boolean }

  tienePermiso(usuario: UsuarioSesion | null, codigo: CodigoPermiso): boolean   // Array.isArray + includes exacto
  cumpleRegla(usuario: UsuarioSesion | null, regla: ReglaAcceso): boolean       // (!analista || usuario.capacidades?.analista === true) && (!algunoDe || algunoDe.some(tienePermiso))
  modosDisponibles(usuario: UsuarioSesion | null): Modo[]                       // orden ['analista','implementador']
  modoDeRuta(pathname: string): Modo | null                                     // '/mi-tienda*' → implementador; '/', '/auth' → null; resto → analista
  resolverModo(modos: Modo[], elegido: Modo | null): Modo | null                // elegido si está en modos; si no 'analista' si existe; si no modos[0] ?? null
  modoInicial(pathname: string, guardado: string | null): Modo | null           // modoDeRuta(pathname) ?? (guardado válido ? guardado : null)
  rutaInicio(opciones: readonly OpcionNavegacion[], usuario: UsuarioSesion | null): string | null // primera opción con cumpleRegla
  ```
  `constants/navegacion.ts`: `OPCIONES_POR_MODO: Record<Modo, readonly OpcionNavegacion[]>` con las
  opciones actuales de `AppTopbar.tsx` (líneas 24-37) y su regla: Planogramas, Tiendas, Productos,
  Por versión, Accesorios → `REGLAS.analista`; Estructura → `REGLAS.estructura`; Mi tienda
  (`exacta: true`) → `REGLAS.miTienda`; Productos `/mi-tienda/productos` → `REGLAS.productosTienda`.
  Sin el campo `disponible`.
- **Criterios de aceptación**:
  - [ ] Ningún import de React ni de `react-router-dom` en `permisos.ts`.
  - [ ] Ninguna función usa `perfiles`.
- **Pruebas** (`permisos.test.ts`, Vitest):
  - `modosDisponibles({ permisos: ['PLA009','PLA010'], capacidades: { analista: false, implementador: true } })` → `['implementador']`.
  - Analista con los 10 y `capacidades.analista: true` → `['analista','implementador']`.
  - `permisos: []` → `[]`; `capacidades` ausente (back viejo) con PLA001–PLA010 → `['implementador']`; `'pla009'` no cuenta.
  - `resolverModo(['implementador'], 'analista')` → `'implementador'` (S-10: un `?rol=analista` o un guardado viejo no abre analista).
  - `modoInicial('/mi-tienda/productos', 'analista')` → `'implementador'`; `modoInicial('/', 'implementador')` → `'implementador'`; `modoInicial('/', 'xyz')` → `null`.
  - `rutaInicio(OPCIONES_POR_MODO.implementador, soloPLA010)` → `'/mi-tienda/productos'`; analista → `'/planogramas'`.
  - `cumpleRegla(analistaSinPLA006, REGLAS.lienzo)` → `false`.
- **Depende de**: T6 (forma de la sesión)

### T10 — Tipos y `AuthContext`
- **Archivos**: modificar `front/src/types/usuario.ts` · modificar `front/src/context/AuthContext.tsx`
- **Qué hacer**:
  - Tipos: ver "Tipos TS del front" en Contratos.
  - `AuthContextValue`: quitar `puedeEscribir`; `rol: Rol | null`; agregar `modos: Rol[]`,
    `puede: (codigo: CodigoPermiso) => boolean`, `esAnalista: boolean`. Mantener `export type Rol = Modo`.
  - Estado `rolElegido` inicial: `modoInicial(window.location.pathname, sessionStorage.getItem('planogramas.modo'))`.
    Quitar la lectura de la ruta actual (líneas 29-31) y el comentario "Rol elegido a mano…".
  - `modos = useMemo(() => modosDisponibles(usuario), [usuario])`; `rol = resolverModo(modos, rolElegido)`.
  - `setRol(m)`: si `!modos.includes(m)` no hace nada; si no, guarda en estado y en
    `sessionStorage` (`try/catch` por modo privado).
  - `puede = useCallback((c) => tienePermiso(usuario, c), [usuario])`; `esAnalista = usuario?.capacidades?.analista === true`.
  - Al cerrar sesión / invalidar, limpiar `sessionStorage.removeItem('planogramas.modo')`.
- **Criterios de aceptación**:
  - [ ] `npx tsc -b` sin errores después de T13 (cero usos de `puedeEscribir` del contexto).
  - [ ] Recargar `/mi-tienda` con un analista abre modo implementador; recargar `/planogramas` tras elegir implementador abre analista (la ruta manda).
  - [ ] Un usuario de tienda nunca obtiene `rol === 'analista'`.
- **Pruebas**: cubiertas por las funciones puras de T9.
- **Depende de**: T9

### T11 — Guard de ruta, inicio por modo y pantalla Sin acceso
- **Archivos**: crear `front/src/router/RequierePermiso.tsx` · crear `front/src/router/RedirigirInicio.tsx` ·
  crear `front/src/pages/SinAcceso/SinAcceso.tsx` · modificar `front/src/router/routes.tsx` ·
  modificar `front/src/router/RequiereSesion.tsx`
- **Qué hacer**:
  - `RequierePermiso({ regla, modo, children })`: si `!cumpleRegla(usuario, regla)` → `useEffect` (con `useRef`
    para dispararlo una sola vez) `mostrarToast('No tienes acceso a esa pantalla.', 'info')` y
    `<Navigate replace to={rutaInicio(OPCIONES_POR_MODO[rol], usuario) ?? '/'} />`. Si cumple y
    `modo !== rol` y `modos.includes(modo)` → `setRol(modo)` en `useEffect`. Renderiza `children`.
  - `RedirigirInicio`: `<Navigate replace to={rutaInicio(OPCIONES_POR_MODO[rol], usuario)} />` (ruta `/`).
  - `routes.tsx`: `/` → `<RedirigirInicio />`; envolver cada ruta:
    `/planogramas`, `/planogramas/:id`, `/…/editor`, `/tiendas`, `/productos`, `/por-version`,
    `/accesorios` → `REGLAS.analista`, modo `analista`; `/…/lienzo` y `/…/lienzo/gondola/:gondolaId`
    → `REGLAS.lienzo`; `/estructura` → `REGLAS.estructura`; `/mi-tienda` → `REGLAS.miTienda`, modo
    `implementador`; `/mi-tienda/productos` → `REGLAS.productosTienda`, modo `implementador`.
  - `SinAcceso`: compone `PantallaAcceso` con los textos de la sección UX. Acción: si `CAO_PORTAL_URL`
    → `<a className="button button--primary" href={CAO_PORTAL_URL} onClick={() => sesionService.limpiar()} autoFocus>Ir a NOVA</a>`;
    si no → `<Button variante="outline" onClick={cerrarSesion} autoFocus>Salir</Button>` (verificar
    que `Button` reenvíe `autoFocus`; si no, usar `ref` + `focus()` en `useEffect`). Sin CSS propio.
  - `RequiereSesion`: después de `no_autenticado`, si `estado === 'autenticado'` y `modos.length === 0` → `<SinAcceso />`.
- **Criterios de aceptación**:
  - [ ] Tienda que abre `/planogramas` por URL termina en `/mi-tienda` con un solo toast.
  - [ ] Usuario con `permisos: []` ve `SinAcceso` (sin navbar) y no hay bucle de redirecciones.
  - [ ] No se renderiza ningún navbar ni se redirige mientras `estado === 'verificando'`.
  - [ ] Analista sin PLA006 que abre `/…/lienzo` termina en `/planogramas` con el toast.
- **Pruebas**: lógica cubierta en T9; verificación manual en "Verificación final".
- **Depende de**: T10

### T12 — Navbar y selector de modo
- **Archivos**: modificar `front/src/components/dominio/layout/AppTopbar/AppTopbar.tsx` (+ `AppTopbar.css` si hace falta) ·
  modificar `front/src/components/dominio/layout/RoleSwitch/RoleSwitch.tsx` · modificar `RoleSwitch.css`
- **Qué hacer**:
  - `AppTopbar`: quitar `OpcionNavegacion` local, `OPCIONES_NAVEGACION`, `OPCIONES_IMPLEMENTADOR`,
    el campo `disponible` y la rama "Próximamente". `opciones = OPCIONES_POR_MODO[rol ?? 'implementador'].filter(o => cumpleRegla(usuario, o.regla))`.
    Renderizar `<RoleSwitch />` solo si `modos.length > 1`. Comprobar que el bloque de sesión siga
    alineado a la derecha sin el switch (`margin-left: auto` no debe depender del switch).
  - `RoleSwitch`: `OPCIONES` filtradas por `modos`; `INICIO_POR_ROL` se reemplaza por
    `rutaInicio(OPCIONES_POR_MODO[nuevo], usuario)`. Mantener `role="radiogroup"` y `aria-label="Rol"`.
  - `RoleSwitch.css:20`: `background: #fff` → `var(--bg-elevated)`; si `RoleSwitch.css` está en la lista
    legacy de `front/.stylelintrc.json`, quitarlo (DT-02).
- **Criterios de aceptación**:
  - [ ] Tienda: navbar "Mi tienda · Productos", chip de tienda, sin switch, sin hueco.
  - [ ] Analista: navbar completo y switch de dos opciones, como hoy.
  - [ ] `npm run lint` sin errores nuevos en los archivos tocados.
- **Pruebas**: verificación manual.
- **Depende de**: T9, T10

### T13 — Páginas: permiso concreto en lugar de `puedeEscribir`
- **Archivos**: modificar las páginas y componentes de la tabla.
- **Qué hacer**: en cada página, `const { puede, esAnalista } = useAuth();` y pasar el booleano indicado
  (los componentes conservan su prop `puedeEscribir`):

  | Archivo | Pieza | Booleano |
  |---|---|---|
  | `pages/PlanogramasListado/PlanogramasListado.tsx` | botón `+ Crear planograma` | `puede(PERMISOS.CREAR_PLANOGRAMA)` |
  | ídem | `PlanogramasTable puedeEscribir` (columna Editar) | `puede(PERMISOS.EDITAR_PLANOGRAMA)` |
  | `pages/PlanogramaDetalle/PlanogramaDetalle.tsx` | botón `Editar` (línea ~109) | `puede(PERMISOS.EDITAR_PLANOGRAMA)` |
  | ídem | `Versión especial por tienda` y `+ Crear versión` (línea ~140) | `puede(PERMISOS.CREAR_VERSION) && !archivado` |
  | ídem | enlace `Tiendas` a Estructura (línea ~130) | mostrar solo si `puede(PERMISOS.EDITAR_ESTRUCTURA)` |
  | ídem | `VersionesTable puedeEscribir` (marcar en desarrollo, promover, publicar, Diseñar, Adjuntos, archivar: todas A) | `esAnalista` |
  | ídem | `onDisenar` | si `!puede(PERMISOS.EDITAR_LIENZO)`, navegar directo a `/planogramas/:id/versiones/:v/editor` sin abrir el modal |
  | `components/dominio/modales/SeleccionarVistaDisenoModal/SeleccionarVistaDisenoModal.tsx` | opción `Lienzo` | nueva prop `puedeAbrirLienzo: boolean`; ocultar la opción si es `false` |
  | `components/dominio/modales/VersionResumenModal/VersionResumenModal.tsx` | enlace `Ver lienzo ↗` | nueva prop `puedeAbrirLienzo: boolean`; ocultar si `false` (se pasa desde `EstructuraAsignacion` con `puede(PERMISOS.EDITAR_LIENZO)`) |
  | `pages/EditorPlanograma/EditorPlanograma.tsx` | `puedeEscribir` local (atajos, `GondolaTabs`, niveles, hints) | `const puedeEscribir = puede(PERMISOS.EDITAR_VERSION);` |
  | ídem | `AgenteExtractorBubble puedeEscribir` | `puede(PERMISOS.EDITAR_VERSION) && esAnalista` |
  | ídem | encabezado | `Badge` `Solo lectura` si `!puedeEscribir` |
  | `pages/LienzoPlanograma/LienzoPlanograma.tsx` | `puedeEscribir` local y `AgenteExtractorBubble` | `const puedeEscribir = puede(PERMISOS.EDITAR_LIENZO);` (`&& esAnalista` en el bubble) |
  | `pages/TiendasListado/TiendasListado.tsx` | `+ Crear tienda` | `puede(PERMISOS.CREAR_TIENDA)` |
  | ídem | `TiendasTable puedeEscribir` (Editar y cambiar estado = `PATCH /tiendas/:id`) | `puede(PERMISOS.EDITAR_TIENDA)` |
  | `pages/AccesoriosListado/AccesoriosListado.tsx` | crear / acciones | `esAnalista` |
  | `pages/EstructuraAsignacion/EstructuraAsignacion.tsx` | `editable`, `BarraCambiosAsignacion` | `puede(PERMISOS.EDITAR_ESTRUCTURA)` |

  Si al ocultar una acción queda vacío un contenedor de acciones o un menú `⋯`, no renderizar el
  contenedor/disparador.
- **Criterios de aceptación**:
  - [ ] `grep -rn "puedeEscribir" front/src/pages front/src/context` solo muestra variables locales y props, ningún `useAuth().puedeEscribir`.
  - [ ] Con usuario analista (10 permisos) la UI se ve exactamente igual que antes.
  - [ ] `npx tsc -b` y `npm run lint` limpios.
- **Pruebas**: verificación manual (los componentes no tienen pruebas de UI).
- **Depende de**: T10

### T14 — 403 en el front
- **Archivos**: modificar `front/src/utils/errors.ts` · crear `front/src/utils/errors.test.ts`
- **Qué hacer**: en `mensajeDeError`, si `err instanceof ApiError && err.status === 403` → retornar
  `'No tienes permiso para esta acción.'` (antes de usar `err.message`). `authInterceptor.service.ts`
  **no cambia** (solo el 401 invalida la sesión).
- **Criterios de aceptación**:
  - [ ] Un 403 muestra el toast estándar y no cierra sesión, no reintenta, no cierra el modal.
- **Pruebas**: `errors.test.ts`: `new ApiError(403, 'FORBIDDEN', 'x')` → texto estándar; `ApiError(404, …, 'No existe')` → `'No existe'`; error no API → fallback.
- **Depende de**: —

### T15 — Postman
- **Archivos**: modificar `postman/planogramas-import.postman_collection.json` (único archivo editable de `postman/`)
- **Qué hacer**:
  - Carpeta `auth` → `Obtener sesión (GET /auth-sesion)` → `200 - Sesión válida con TOKEN_CAO`: agregar
    `pm.test` de que `capacidades.analista === true`, `permisos` incluye PLA001–PLA010 y la respuesta
    **no** tiene la propiedad `cao`.
  - Variable de colección nueva `TOKEN_CAO_TIENDA` (vacía) con `description`: "JWT de un usuario con
    perfil de tienda (TIENDA-EST, provisional) en el módulo PLANOGRAMA. Si está vacía, los requests
    de 'Autorización por permisos' se omiten. Pendiente: IT CAO no ha entregado un usuario de prueba."
  - En `auth`, sub-carpeta `Autorización por permisos (token de tienda)` con pre-request
    `if (!pm.collectionVariables.get('TOKEN_CAO_TIENDA')) pm.execution.skipRequest();` y header
    `Authorization: Bearer {{TOKEN_CAO_TIENDA}}`. Requests: `403 - Crear planograma (POST /planogramas)`,
    `403 - Listar planogramas (GET /planogramas)`, `403 - Asignar tiendas (PUT /versiones/:id/tiendas)`,
    `403 - Crear tienda (POST /tiendas)`, `403 - Matriz de asignaciones (GET /asignaciones)`,
    `200 - Listar tiendas (GET /tiendas)`, `200 - Resumen de implementación (GET /tiendas/:id/implementacion)`
    (con `{{tiendaIdExistente}}`). Los 403 verifican `error.code === 'FORBIDDEN'` y que no haya `details`.
  - En la `description` de la colección: `TOKEN_CAO` debe ser de un usuario con PCOMER-EST o
    CATEGORIA-EST en el módulo PLANOGRAMA.
- **Criterios de aceptación**:
  - [ ] La corrida completa con `TOKEN_CAO` de analista pasa igual que antes y con los tests nuevos de sesión.
  - [ ] Con `TOKEN_CAO_TIENDA` vacío, la sub-carpeta nueva se omite sin fallos.
  - [ ] Cumple `Arquitectura/ESTANDAR_PRUEBAS_POSTMAN.md` (nombres `{status} - {escenario}`).
- **Pruebas**: corrida de la colección en DEV tras T17.
- **Depende de**: T5, T6

### T16 — Documentación (commit separado del código)
- **Archivos**: crear `Arquitectura/SEGURIDAD_PERMISOS.md` · crear `Arquitectura/Contratos/00_auth/GET_auth_sesion.md` ·
  modificar `Arquitectura/ENDPOINTS.md`, `Arquitectura/ESTADO_MODULOS.md`, `Arquitectura/DESPLIEGUE_AZURE.md`,
  `Arquitectura/DISENO_SISTEMA.md`, `Arquitectura/DEUDA_TECNICA.md`, `CLAUDE.md`
- **Qué hacer**:
  - `SEGURIDAD_PERMISOS.md`: perfiles → permisos (tabla de `00_solicitud.md`), definición de A/I/C,
    la matriz endpoint → regla de este plan, matriz ruta del front → regla, la lista de **permisos a
    solicitar a IT CAO** (archivar planograma; promover, archivar y guardar/cambiar estado de versión;
    gestionar adjuntos; gestionar accesorios; editar dimensiones de producto; agente extractor
    (foto/PDF/IA); voz) y cómo reemplazar A cuando lleguen (cambiar la ruta, la tabla de T8 y esta matriz).
  - `Contratos/00_auth/GET_auth_sesion.md`: contrato de la sección Contratos (incluye 401 sin número de empleado).
  - `ENDPOINTS.md`: columna `Permiso` (A, I, C o PLA00X) en cada tabla; nota del 403 común.
  - `ESTADO_MODULOS.md`: apartado "Autorización" (dónde vive, cómo proteger una ruta nueva, la prueba S-03 que falla si se olvida).
  - `DESPLIEGUE_AZURE.md` §6: `CAO_COD_MODULO=PLANOGRAMA` y la regla de orden S-06 (código primero, setting después; nunca al revés) con el checklist de T17.
  - `DISENO_SISTEMA.md` §4.4: ampliar "Sin permiso" con: redirección + toast para rutas, texto estándar del 403, un solo modo = sin `RoleSwitch`, badge `Solo lectura`.
  - `DEUDA_TECNICA.md`: DT-01 → "Parcial (permisos resueltos 2026-10-12, plan `2026-10-12-permisos-cao`); falta el filtro por tienda (DT-10)"; agregar DT-10…DT-16 (sección "Deuda") con fila y detalle.
  - `CLAUDE.md`: actualizar la línea de deudas abiertas críticas/altas (DT-01 parcial, DT-10 alta, DT-08).
- **Criterios de aceptación**:
  - [ ] Ningún archivo de código en el mismo commit.
  - [ ] La matriz de `SEGURIDAD_PERMISOS.md` coincide con la de T5/T8.
- **Pruebas**: —
- **Depende de**: T5, T13

### T17 — Despliegue a DEV con `CAO_COD_MODULO=PLANOGRAMA` (solo cuando el usuario pida publicar)
- **Archivos**: modificar `back/.env.example` (en el commit de código: `CAO_COD_MODULO=PLANOGRAMA` y
  comentario de que el cambio en Azure va después del código). El `.env` local lo cambia el usuario
  a mano (el hook bloquea editarlo).
- **Qué hacer** (seguir `Arquitectura/DESPLIEGUE_AZURE.md`):
  1. Antes de publicar, en local con `CAO_COD_MODULO=PLANOGRAMA`: `GET /auth/sesion` con el usuario
     del equipo devuelve PLA001–PLA010 y `capacidades.analista: true`.
  2. Publicar código: `git push fork origin/develop:refs/heads/develop` y esperar que el workflow del
     API DEV y del Static Web App terminen en verde (corren `npm test`).
  3. **Recién entonces**: App Service `planogramas-api-dev` → Configuración → Variables de entorno →
     `CAO_COD_MODULO=PLANOGRAMA` → guardar (reinicia la app). **Nunca** cambiar el setting antes del paso 2.
  4. Checklist en DEV:
     - [ ] Usuario PCOMER-EST o CATEGORIA-EST: `GET /auth/sesion` con PLA001–PLA010, `capacidades.analista: true`, sin `cao`; ningún código `SCP*` en `permisos`.
     - [ ] La app abre en Planogramas con el switch de modo; crear/editar funciona.
     - [ ] Usuario sin perfil en PLANOGRAMA: anotar si CAO responde 200 con `perfiles: []` (→ se ve `SinAcceso`) o 401 (→ se ve `SesionRequerida`, sin bucle). Registrar el resultado en `SEGURIDAD_PERMISOS.md`.
     - [ ] Si hay usuario de tienda: navbar Mi tienda/Productos, sin switch; `/planogramas` por URL redirige con toast.
     - [ ] Corrida Postman completa (T15) en verde.
     - [ ] Revisar en el log stream del App Service que los `[autorizacion] 403` no muestren tokens.
  5. PROD: mismo orden (fast-forward de `main`, push al fork, esperar el workflow, después el setting
     en `planogramas-api-prod`), **solo** si el usuario lo pide explícitamente.
- **Criterios de aceptación**:
  - [ ] Checklist del paso 4 completo y resultado anotado.
- **Pruebas**: el checklist.
- **Depende de**: T1–T15 aprobados por el usuario y revisión de calidad/seguridad

## Deuda técnica nueva (a registrar en T16)

| ID | Título | Severidad | Área | Detalle |
|---|---|---|---|---|
| DT-10 | Sin filtro por tienda del usuario en los endpoints I | Alta | back · front | Cualquier usuario con PLA009/PLA010 consulta implementación y productos de cualquier `tiendaId` y elige cualquier tienda en el chip. Depende de que CAO actualice `tiendas` por usuario (ya llega en la sesión). Al resolverlo, DT-01 se cierra. |
| DT-11 | Acciones con la regla transitoria A sin permiso propio en CAO | Media | back · front | Solicitar a IT CAO permisos para: archivar planograma; promover, archivar y guardar (cambio de estado) de versión; gestionar adjuntos; gestionar accesorios; editar dimensiones de producto; agente extractor (foto/PDF/IA); voz. Mientras tanto: un perfil con un subconjunto de PLA001–PLA008 queda fuera de todas las vistas de analista, y cualquier perfil con los 8 puede archivar/promover. Al llegar los códigos: reemplazar A en la ruta, en `matrizPermisos.test.js`, en `puede(...)` del front y en `SEGURIDAD_PERMISOS.md`. |
| DT-12 | Evidencias de cualquier tienda: lectura, carga y borrado por el usuario de tienda | Media | back | Sin filtro por tienda, un implementador lista y descarga evidencias de otra tienda (IDs secuenciales en `/evidencias/:id/descargar`), sube evidencias a otra tienda (contamina su avance) y borra las que él mismo subió en cualquier tienda (el dominio ya limita el borrado al autor, `evidencia.entity.js:85-87`). El borrado es físico, sin auditoría. Se resuelve con DT-10 y, si se requiere trazabilidad, con borrado lógico. |
| DT-13 | Nombre provisional del perfil de tienda (`TIENDA-EST`) | Baja | back · docs | IT CAO está validando el nombre (en la matriz original aparece `TIENDAS-EST`). Vive solo en `PERFILES.TIENDA` de `back/src/domain/compartido/permisos.js` y en la doc; no afecta reglas. Actualizar cuando el usuario confirme. |
| DT-14 | La revocación de permisos tarda hasta 2 min | Baja | back | TTL del caché por token en `caoAuthClient`; el keepalive no refresca permisos. Aceptado. |
| DT-15 | `fetch` a CAO sin timeout y `details` del 503 con `causa.message` | Baja | back | `caoAuthClient.js:30-36`: expone nombres de host internos y un CAO colgado deja colgado el request. Preexistente. |
| DT-16 | `express.json` (8 MB / 21 MB) corre antes de la autenticación | Baja | back | `app.js`: un cliente sin token fuerza el parseo de cuerpos grandes. Preexistente. |

La deuda de UX "129 usos de `puedeEscribir`" queda resuelta por T13 (páginas deciden el permiso) y
la de `RoleSwitch.css #fff` por T12; `AppTopbar.disponible` por T12. No se registran.

## Verificación final

- `cd back && npm test` (incluye `permisos`, `caoAuthClient`, `autorizacion`, `authSesion`, `rutasProtegidas`, `matrizPermisos`).
- `cd front && npm test && npx tsc -b && npm run lint`.
- Grep S-11: `grep -rn "TIENDA-EST\|TIENDAS-EST\|PCOMER\|CATEGORIA-EST\|PLA_CAT\|PLA_TIENDA" back/src front/src` → solo `PERFILES`.
- Grep S-05: `grep -rn "\.\.\.req\.usuario\|res\.json(req\.usuario" back/src` → sin resultados.
- Postman: carpeta `auth` (incluida la sub-carpeta de autorización) y corrida completa con `TOKEN_CAO` de analista.
- Prueba manual local (con `CAO_COD_MODULO=PLANOGRAMA` en `.env`):
  1. Analista: entra a Planogramas, ve el switch, cambia a Implementador y vuelve; recarga en `/mi-tienda` y queda en implementador.
  2. Simular tienda (si no hay usuario: en DEV local, stub temporal no commiteado de `mapearUsuario` con PLA009/PLA010): solo Mi tienda/Productos, sin switch, `/planogramas` por URL redirige con toast, puede subir evidencia.
  3. Simular `permisos: []`: pantalla `Sin acceso a Planogramas` con acción a NOVA o Salir.
  4. Forzar un 403 (p. ej. quitar temporalmente PLA007 en el stub y llamar crear tienda desde consola): toast `No tienes permiso para esta acción.` y la sesión sigue.

## Riesgos

- Desplegar con `CAO_COD_MODULO` viejo → todos reciben 403 (falla cerrado). Mitigación: T17 paso 3 inmediatamente después del deploy; el checklist lo detecta.
- Cambiar el setting antes que el código → usuarios de tienda con escritura total. Mitigación: S-06 escrito en T17 y en `DESPLIEGUE_AZURE.md`; nunca se hace.
- `TOKEN_CAO` de Postman de un usuario sin los 8 permisos → la corrida entera falla con 403. Mitigación: descripción de la colección (T15).
- CAO responde 401 (no 200 vacío) a usuarios sin perfil → ven `SesionRequerida` en lugar de `SinAcceso`. Sin bucle; se registra en T17 y se ajusta el texto si el usuario lo pide.
- Una vista del front llama un endpoint que la matriz dejó en A y que el implementador necesita → 403 en la vista de tienda. Mitigación: se verificaron los servicios de `MiTienda`, `ProductosTienda` y `components/dominio/implementacion/*`; el paso 2 de la prueba manual lo confirma.
- Carga de `app.js` en la prueba T8 requiere variables de entorno o toca la BD al cargar → la prueba no arranca. Mitigación: stubs en `require.cache` y contador activado justo antes de las requests (T8 paso 1).
