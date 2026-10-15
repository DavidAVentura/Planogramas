# 02 — Seguridad e integridad: permisos CAO por perfil (SIP)

Revisado contra `00_solicitud.md`, `01_arquitectura.md` y el código en el commit base `c3c97b9`
(`routes/*.routes.js`, `routes/index.js`, `autenticacion.js`, `caoAuthClient.js`,
`auth.controller.js`, `errorHandler.js`, `evidencias.controller.js`, `evidencia.entity.js`,
`app.js`, servicios del front del modo implementador).

## 1. Superficie afectada

- **Endpoints**: los 97 handlers de los 19 archivos `back/src/infrastructure/http/routes/*.routes.js`
  (contados con grep sobre `router.get|post|put|patch|delete`), más `/health` (público) y `/auth/*`.
- **Routers mixtos** (tienen rutas I y rutas A en el mismo archivo, así que **no** admiten una regla
  a nivel de router): `tiendas.routes.js`, `versiones.routes.js`, `adjuntos.routes.js`,
  `evidencias.routes.js`, `catalogo.routes.js`. `producto.routes.js` es 100 % A, pero comparte el
  prefijo `/catalog` con `catalogo.routes.js`.
- **Tablas**: ninguna cambia. Las que quedan expuestas al perfil de tienda sin filtro por tienda son
  `Evidencia` (leer, crear, borrar las propias), `Adjunto` (leer, descargar), `Tienda` (listar) y las
  lecturas de implementación por `tiendaId`.
- **Roles y permisos**: PLA_ADMIN y PLA_CAT (PLA001–PLA010, cumplen A). PLA_TIENDA / `TIENDA-EST`
  (PLA009 y PLA010, solo cumplen I).
- **Tiendas**: no se filtran en esta etapa (decisión del usuario). Cualquier usuario con I puede
  operar sobre cualquier `tiendaId`.
- **Integración**: CAO (`validar_token?cod_modulo=` pasa de `SCRAPING` a `PLANOGRAMA`). No hay
  llamadas nuevas.

## 2. Controles requeridos

### Bloqueantes

**S-01. Fail-closed en las funciones de dominio.**
Dónde: `back/src/domain/compartido/permisos.js`.
- `esAnalista(usuario)` devuelve `true` solo si `usuario.permisos` es un arreglo que contiene
  **todos** los códigos de `PERMISOS_ANALISTA` (PLA001–PLA008).
- `tieneAlguno(usuario, codigos)` devuelve `false` si `usuario` es nulo, si `permisos` no es un
  arreglo o si `codigos` está vacío. Cuidado: `[].every(...)` da `true` y `[].some(...)` da `false`.
  `PERMISOS_ANALISTA` tiene que ser una constante congelada (`Object.freeze`) y no vacía.
- La comparación es exacta (`'PLA001'`). No se normalizan mayúsculas ni prefijos.

Verificación (`back/test/domain/permisos.test.js`):
- un usuario con PLA001–PLA007 sin PLA008 no es analista;
- `{ permisos: 'PLA001,...' }` (un string en lugar de arreglo) no es analista;
- `null` y `{}` no son nada;
- `tieneAlguno(u, [])` da `false`;
- un permiso `'pla001'` en minúsculas no cuenta.

**S-02. El middleware falla al arrancar si recibe un código inválido.**
Dónde: `back/src/infrastructure/http/middlewares/autorizacion.js`.
- `requierePermiso(...codigos)` lanza un error **al construirse** (al cargar la ruta, no en el
  request) si `codigos` está vacío o si algún código no está en el catálogo `PERMISOS`. Así, un
  error de tipeo como `PERMISOS.EDITAR_VERSOIN`, que da `undefined`, rompe el arranque en lugar de
  dejar una ruta mal protegida.
- Si `req.usuario` no existe, responde 401 y no 403.
- El 403 tiene exactamente la forma de §4.2 de arquitectura: sin `details` y sin la lista de
  permisos requeridos.

Verificación (`back/test/http/autorizacion.test.js`): `assert.throws(() => requierePermiso())`,
`assert.throws(() => requierePermiso(undefined))` y `assert.throws(() => requierePermiso('PLA999'))`.
Además, el cuerpo del 403 es `deepEqual` a
`{ error: { code: 'FORBIDDEN', message: 'No tienes permiso para esta acción' } }`.

**S-03. Ninguna ruta queda sin regla (prueba de completitud).**
Dónde: `back/test/http/rutasProtegidas.test.js` (nuevo).
- Cada middleware de autorización se marca con una propiedad, por ejemplo
  `fn.reglaAutorizacion = 'A' | 'I' | ['PLA001']`.
- La prueba carga cada `*.routes.js` y recorre `router.stack`. En Express 5.2.1 / router 2.x, cada
  `layer.route` tiene `path`, `methods` y `stack[].handle`.
- Falla si una ruta no tiene un handler marcado, ni en `route.stack` ni en una capa `router.use`
  marcada **del mismo archivo**.
- Excepciones permitidas, declaradas en una lista explícita dentro de la prueba: solo
  `auth.routes.js`.

Consecuencia de diseño: la regla A de los routers 100 % analista va **dentro de cada
`*.routes.js`** (`router.use(requiereAnalista)` al inicio) y no en `routes/index.js`. Así la prueba
la ve archivo por archivo y no depende del orden de los montajes. Si se mantiene en `index.js`,
tiene que ser con prefijo: `router.use('/gondolas', requiereAnalista, require(...))`. Un
`router.use(requiereAnalista)` **sin prefijo** en `index.js` bloquearía todos los montajes
posteriores, incluidas las rutas I de `/tiendas`, `/evidencias` y `/catalog`.

Verificación: la prueba pasa con todas las rutas. Para comprobar que detecta el hueco, quitar a
mano la regla de `DELETE /adjuntos/:id` y confirmar que falla (no se commitea).

**S-04. Prueba HTTP de la matriz: el 403 llega antes de la BD y de CATI.**
Dónde: `back/test/http/matrizPermisos.test.js` (nuevo, sin dependencias: `node:test` +
`http` + `fetch`).
- Antes de cargar `app.js`, se reemplazan en `require.cache`:
  - `infrastructure/cao/caoAuthClient` por un stub que devuelve usuarios según el token
    (`tienda`, `analista`, `sinPermisos`, `soloPLA009`, `soloPLA010`);
  - `infrastructure/db/connection` por un proxy que registra cualquier acceso y lanza un error;
  - el cliente CATI (`infrastructure/cati/*`), igual.
- La prueba levanta el app en un puerto efímero y recorre una tabla `[método, ruta de ejemplo,
  regla]` que refleja §4.3 de arquitectura.

Verificación:
- **todas** las rutas A o PLA00X con el token `tienda` dan 403, y el proxy de BD/CATI registra
  **cero** accesos;
- con `sinPermisos`, también las rutas I dan 403;
- con `soloPLA009`, `GET /tiendas/1/implementacion/productos` da 403 y `GET /tiendas/1/implementacion`
  **no** da 403 (puede dar 500 por el stub de BD: lo que se comprueba es que pasó el guard).

Esta prueba sustituye a la carpeta Postman con usuario de tienda mientras no exista ese usuario
(pregunta sin respuesta). Por eso es bloqueante.

**S-05. `GET /auth/sesion` con lista blanca explícita.**
Dónde: `back/src/application/auth/auth.controller.js`.
- `obtenerSesion` arma la respuesta con los campos de §4.1 nombrados uno por uno: `id`,
  `numeroEmpleado`, `usuario`, `nombre`, `correo`, `perfiles`, `permisos`, `capacidades`, `tiendas`.
- **No** se usa `{ ...req.usuario }` ni se borra `cao` con `delete`, porque un campo que se agregue
  después a `mapearUsuario` se filtraría solo.
- `capacidades` se calcula con las funciones de S-01 y no muta `req.usuario`: ese objeto es la
  misma referencia que está en el caché de `caoAuthClient` (ver S-09).

Verificación: prueba del controller con un `req.usuario` que trae `cao: { token: 'x', secreto: 1 }`
y un campo extra. La respuesta no tiene `cao` ni el campo extra, y sus claves son exactamente las
de §4.1.

**S-06. Orden de despliegue de `CAO_COD_MODULO`.**
Dónde: `Arquitectura/DESPLIEGUE_AZURE.md` y la tarea de despliegue del plan.
- El código con autorización y el cambio de `CAO_COD_MODULO=PLANOGRAMA` se publican en el
  **mismo** reinicio del App Service: primero el código y en el mismo paso el app setting.
- **Nunca** se cambia el setting antes que el código. Hoy no hay autorización, así que en cuanto
  el back valide contra `PLANOGRAMA` los usuarios PLA_TIENDA podrían autenticarse y tendrían
  escritura total (crear, archivar, promover, asignar) hasta que llegue el código.
- Al revés (código nuevo con `SCRAPING`), todos reciben 403. Es seguro, pero deja la app sin
  servicio.

Verificación: checklist de despliegue en DEV.
1. `GET /auth/sesion` con un usuario PLA_CAT devuelve `permisos` PLA001–PLA010 y
   `capacidades.analista: true`.
2. Con un usuario de otro módulo (solo SCRAPING), la respuesta es 401 o 403.
3. Ningún código `SCP*` aparece en `permisos`.

### Importantes

**S-07. Identidad obligatoria para operar.**
Dónde: `autorizacion.js` (o `autenticacion.js`).
- Hoy `usuarioActual` (`back/src/application/compartido/validacion.js:69-72`) cae en `'sistema'` si
  CAO no trae `user`.
- Con eso, dos usuarios distintos sin número de empleado comparten identidad. Uno puede borrar las
  evidencias del otro, porque `puedeEliminar` (`back/src/domain/evidencia/evidencia.entity.js:85-87`)
  compara `subidoPor === 'sistema'`, y la auditoría (`subido_por`, `EdicionAsignacion`) pierde al
  autor.
- Los guards deben responder 401 si `req.usuario.numeroEmpleado` está vacío.

Verificación: con un usuario `{ permisos: [todos], numeroEmpleado: undefined }`,
`POST /tiendas/1/versiones/1/evidencias` responde 401 y no toca la BD.

**S-08. `GET /versiones/:id/estructura` pasa de I a A.**
- La matriz le da I, pero ningún servicio del front lo llama (grep de `estructura` en
  `front/src/services/*.ts`: sin resultados).
- Por mínimo privilegio, se queda en A hasta que una vista del implementador lo necesite.

Verificación: entra en la tabla de S-04 con el token `tienda` y espera 403.

**S-09. No mutar el usuario cacheado.**
- `caoAuthClient.validarToken` devuelve el mismo objeto en cada request durante 2 min.
- Los middlewares no deben agregarle propiedades (por ejemplo un `Set` de permisos o
  `capacidades`). Lo que se agregue sobreviviría entre requests y sería visible para el siguiente
  uso del token.
- Opción: `Object.freeze(usuario)` en `mapearUsuario`.

Verificación: prueba de `mapearUsuario` que comprueba `Object.isFrozen`, o una revisión del diff en
la etapa 5.

**S-10. 403 en el front sin efectos colaterales.**
Dónde: `front/src/services/authInterceptor.service.ts:14`.
- Hoy solo invalida la sesión ante un 401. El 403 se muestra con el toast y **no** invalida la
  sesión, no reintenta ni redirige al login.
- Los guards de ruta (`RequierePermiso.tsx`) y `modosDisponibles` son **cosméticos**. La seguridad
  real está en S-03/S-04.
- El rol ya no se toma de la URL (`AuthContext.tsx:29-30`): un `?rol=analista` manual no debe abrir
  el modo analista a un PLA_TIENDA.

Verificación: pruebas de `permisos.test.ts`:
- `modosDisponibles({ permisos: ['PLA009','PLA010'], capacidades: { analista: false } })` da
  `['implementador']`;
- `setRol('analista')` se ignora para ese usuario.

**S-11. Regla por permisos, nunca por nombre de perfil.**
- El nombre del perfil de tienda (`TIENDA-EST` / `TIENDAS-EST`, sin confirmar) va en una sola
  constante y se usa solo para mostrar o documentar.
- Ningún guard del back ni del front decide por `perfiles[].codigo`.

Verificación: en la revisión del diff, grep de `TIENDA` / `PLA_CAT` / `PCOMER` en
`back/src/infrastructure/http` y en `front/src/router`, `front/src/context`. Solo debe aparecer en
la constante.

**S-12. Registro de los 403.**
- `autorizacion.js` deja un `console.warn` con el usuario, el método, la ruta y la regla. No se
  registra el token ni el header `Authorization`.
- Sirve para detectar perfiles mal configurados en CAO tras el despliegue y para investigar intentos.

Verificación: en la prueba de S-04, espiar `console.warn` y comprobar que el mensaje no contiene el
token.

### Menores

**S-13. Orden de los montajes en `/catalog`.**
- `catalogo.routes.js` (con rutas I) tiene que seguir montándose **antes** que
  `producto.routes.js` en `routes/index.js:35-36`.
- Si `producto.routes.js` lleva `router.use(requiereAnalista)` y alguien invierte el orden,
  `GET /catalog/productos/:sku` dará 403 al usuario de tienda. Falla cerrado, pero rompe la ficha
  de producto del implementador.
- Dejar un comentario en `index.js` y cubrir `GET /catalog/productos/123` con el token `tienda`
  (espera que no dé 403) en la prueba de S-04.

**S-14. `PATCH /versiones/:id/guardar` solo con PLA005.**
- Si el lienzo también llama a `guardar`, un futuro perfil con solo PLA006 no podría guardar desde
  el lienzo.
- Hoy ningún perfil cae en ese caso, porque toda escritura exige A. Confirmar qué vista lo usa
  antes de cerrar la matriz. Si lo usa el lienzo, la regla pasa a C.

## 3. Pruebas de abuso (mínimas)

Todas van en `matrizPermisos.test.js` (S-04), salvo que se indique otra cosa.

1. El token `tienda` llama a `POST /planogramas`, `PATCH /planogramas/1`,
   `POST /planogramas/1/archivar`, `POST /planogramas/1/versiones`, `POST /versiones/1/promover`,
   `POST /versiones/1/archivar`, `PUT /versiones/1/tiendas`, `POST /asignaciones/ediciones`,
   `POST /tiendas`, `PATCH /tiendas/1`, `DELETE /adjuntos/1`, `POST /versiones/1/adjuntos/subida`,
   `PATCH /catalog/productos/X/dimensiones`, `POST /agente-extractor/imagen`, `POST /voz/tts` y
   `PATCH /posiciones/1/asignar-sku`. Todos responden **403** y hay **0** accesos a BD/CATI.
2. El token `tienda` lee vistas de analista: `GET /planogramas`, `GET /versiones/1`,
   `GET /asignaciones`, `GET /implementacion/versiones`, `GET /catalog/productos`,
   `GET /jerarquia/areas`, `GET /versiones/1/estructura` (S-08) y `GET /posiciones/por-sku`. Todos
   responden **403**.
3. El token `tienda` usa sus propias vistas: `GET /tiendas`, `GET /tiendas/1/implementacion`,
   `GET /tiendas/1/implementacion/productos`, `GET|POST /tiendas/1/versiones/1/evidencias`,
   `GET /evidencias/1/descargar`, `DELETE /evidencias/1`, `GET /versiones/1/adjuntos`,
   `GET /adjuntos/1/url-descarga` y `GET /catalog/productos/1/stock`. Ninguno responde 403: el
   guard pasa.
4. El token `sinPermisos` (autenticado en el módulo, con `permisos: []`) recibe 403 en **todas**
   las rutas salvo `/auth/*`.
5. Un usuario con PLA001–PLA007 (le falta PLA008) recibe 403 en `GET /planogramas`. Comprueba que
   A exige todos los permisos.
6. Con el token `analista` y `:id` inexistente o inválido (`/versiones/abc`), el 403 no aplica; para
   el token `tienda`, la misma ruta da **403 y no 400 ni 404**. No se filtra si el recurso existe.
7. Prueba unitaria del controller (S-05): `GET /auth/sesion` no devuelve `cao`.
8. Prueba de `autorizacion.test.js` (S-07): un usuario sin `numeroEmpleado` recibe 401 en una
   escritura I.
9. Prueba de `permisos.test.ts` (S-10): un PLA_TIENDA con `?rol=analista` en la URL sigue en el
   modo implementador.
10. Prueba de `rutasProtegidas.test.js` (S-03): una ruta nueva sin guard hace fallar `npm test`, y
    el CD no publica.

## 4. Riesgos aceptados y deuda a registrar

El último ID usado en `Arquitectura/DEUDA_TECNICA.md` es DT-09. El coordinador asigna los números
al consolidar.

| Propuesta | Deuda | Severidad | Escenario concreto |
|---|---|---|---|
| DT-10 | **Sin filtro por tienda** en los endpoints I (riesgo aceptado por el usuario). Depende de que CAO actualice las tiendas por usuario. | Alta | Un usuario de la tienda A: (a) lista y descarga evidencias de la tienda B recorriendo `GET /evidencias/:id/descargar` con IDs secuenciales; (b) **sube evidencias falsas** a la tienda B con `POST /tiendas/B/versiones/:v/evidencias`, lo que contamina el avance de implementación de B; (c) consulta la implementación y los productos de cualquier tienda. |
| (dentro de DT-10) | **Borrado de evidencias por el usuario de tienda** (riesgo aceptado). Precisión para el registro: el dominio **ya** limita el borrado a quien subió la foto (`evidencia.entity.js:85-87`). El usuario de tienda no puede borrar fotos subidas por otros, ni siquiera de su tienda. Sí puede borrar las que él mismo subió en cualquier tienda. El borrado es físico (`evidenciaRepo.eliminar` + blob), sin rastro de auditoría. | Media | Un implementador sube y luego borra la evidencia de la tienda B y no queda registro de que existió. Se mitiga junto con DT-10 y con un borrado lógico o auditoría si se requiere trazabilidad. |
| DT-11 | **Acciones con la regla transitoria A** a la espera de permisos de IT CAO: archivar planograma, promover y archivar versión, escrituras de adjuntos, CRUD de accesorios, dimensiones de producto, agente extractor, voz y `/pruebas`. | Media | Un perfil futuro con un subconjunto de PLA001–PLA008 (por ejemplo, solo PLA007) queda bloqueado de **todas** las vistas de analista (falla cerrado, pero rompe la funcionalidad). Al revés, cualquier perfil con los 8 permisos puede archivar y promover sin un permiso propio. Al llegar los códigos de CAO, se reemplaza A por el código en la ruta y en la tabla de S-04. |
| DT-12 | `caoAuthClient.mapearUsuario` guarda `cao` (la respuesta cruda) en `req.usuario` y en el contexto de la solicitud sin usarlo. | Baja | Cualquier `res.json(req.usuario)` o log futuro expone la respuesta completa de CAO. Se puede eliminar en este cambio si el desarrollador lo confirma con un grep. |
| DT-13 | La revocación de un permiso en CAO tarda hasta 2 min (TTL del caché por token) y el keepalive no refresca los permisos. | Baja (aceptado en arquitectura) | Un usuario al que se le quita PLA_CAT sigue escribiendo hasta 2 min. |
| DT-14 | `caoAuthClient.errorServicioNoDisponible` (`caoAuthClient.js:30-36`) pone `causa.message` en `details` del 503, y el `fetch` a CAO no tiene timeout. | Baja | Ante una caída de red, el cliente recibe `getaddrinfo ENOTFOUND <host interno>`. Si CAO se cuelga, cada request queda colgado sin límite. Preexistente, fuera de alcance. |
| DT-15 | `express.json` (8 MB, y 21 MB en `/agente-extractor/pdf-planograma`) corre antes de la autenticación (`app.js:30-31`). | Baja | Un cliente sin token puede forzar el parseo de cuerpos de 21 MB. Preexistente, fuera de alcance. |

**DT-01** queda **parcialmente resuelta** (permisos) y se cierra del todo cuando se resuelva DT-10.

## 5. Preguntas abiertas

1. Cuando el usuario no tiene ningún perfil en el módulo `PLANOGRAMA`, ¿CAO responde 401 o 200
   con `perfiles: []`? Si responde 401, el front nunca muestra "Sin acceso al módulo" y el usuario
   vuelve al login en bucle. Hay que verificarlo en DEV antes de cerrar el diseño de UX.
2. ¿Hay alguna vista del implementador que vaya a necesitar `GET /versiones/:id/estructura`? Si no,
   se aplica S-08 (A).
3. ¿El lienzo llama a `PATCH /versiones/:id/guardar`? Define S-14.
