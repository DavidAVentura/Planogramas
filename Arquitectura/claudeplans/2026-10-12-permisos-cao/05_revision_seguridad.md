# 05 — Revisión de seguridad del diff (ronda 1)

Diff revisado: `git diff c3c97b9` + archivos nuevos (`permisos.js`, `autorizacion.js`, pruebas en
`back/test/{domain,http,infrastructure}`, `front/src/domain/permisos`, `RequierePermiso`,
`RedirigirInicio`, `SinAcceso`, `navegacion.ts`, `errors.test.ts`). Contra `PLAN.md` y `02_seguridad.md`.

`cd back && npm test`: **62/62 en verde**. `rutasProtegidas` y `matrizPermisos` también pasan sin
`.env` (corridos desde otro directorio, como en el CI).

## Verificación de controles

| Control | Estado | Evidencia |
|---|---|---|
| S-01 fail-closed | Cumple | `permisos.js`: `tieneAlguno` exige `codigos` no vacío y `permisos` arreglo; `esAnalista` usa `every` sobre una constante congelada no vacía; comparación exacta. |
| S-02 guard falla al construirse | Cumple | `autorizacion.js:60-65` lanza con lista vacía, `undefined` o código fuera del catálogo; sin `req.usuario` → 401; 403 sin `details`. |
| S-03 cobertura de rutas | Cumple con hueco en la prueba | Las 18 `*.routes.js` tienen regla: 13 a nivel de router y 5 mixtas por ruta. Grep de handlers sin guard: todos quedan bajo un `router.use(guard)` previo. Ver I-01. |
| Matriz endpoint → regla | Cumple | Las 5 rutas mixtas (`tiendas`, `versiones`, `adjuntos`, `evidencias`, `catalogo`) coinciden línea a línea con la tabla del PLAN. `estructura` = A (S-08), `guardar` = A (S-14), `/catalog` completo en A (S-13). |
| S-04 matriz HTTP | Cumple | Hay 30 casos prohibidos y 10 permitidos para `tienda`. Con `sinPermisos` se repiten las 40 rutas. Se cubren `soloPLA009`/`soloPLA010`, `sieteDeOcho` y el 403 antes que el 400 (`/versiones/abc`). Los contadores de BD/CATI/Blob se verifican en cada 403/401. |
| S-05 lista blanca `/auth/sesion` | Cumple | `auth.controller.js:17-30` arma los campos uno por uno, sin spread ni `delete`. La prueba comprueba las claves exactas con `cao` y `extra` presentes. |
| S-06 orden de despliegue | Pendiente (T17) | Fuera del diff de código. Ver M-02. |
| S-07 401 sin número de empleado | Cumple | `autenticacion.js:33-39` corta antes del keepalive y del contexto. Caso `sinIdentidad` en `POST …/evidencias` y en `GET /auth/sesion`. |
| S-09 usuario congelado | Cumple con matiz | `caoAuthClient.js:63-87` congela el usuario, `perfiles`, cada perfil, `permisos` y el arreglo `tiendas`. Los guards no escriben en `req.usuario`. Ver M-01. |
| S-10 front cosmético / sin rol por URL | Cumple | `AuthContext.tsx`: `setRol` ignora modos no disponibles y `resolverModo` descarta un modo guardado inválido. `errors.ts` da el texto estándar del 403. El interceptor solo invalida la sesión con 401. |
| S-11 sin nombres de perfil en reglas | Cumple | El grep solo devuelve `PERFILES` en `permisos.js:34`. |
| S-12 log de 403 sin token | Cumple | `autorizacion.js:48` registra `baseUrl + path`, el usuario y la regla. La prueba espía `console.warn` y comprueba que no aparezca `Bearer` ni `Authorization`. |

## Hallazgos

### Bloqueantes

Ninguno.

### Importantes

**I-01. La prueba de completitud no valida el orden del guard de router.**
`back/test/http/rutasProtegidas.test.js:14`. `protegidoPorRouter = router.stack.some(...)` da por
protegida cualquier ruta si existe un `router.use(guard)` en **cualquier** posición del stack. En
Express una capa solo aplica a las rutas registradas **después** de ella.

Escenario: alguien agrega `router.post('/:id/clonar', controller.clonar)` en
`planogramas.routes.js` **arriba** de `router.use(requiereAnalista)` (o reordena el archivo). El
usuario de tienda puede llamar ese endpoint y `npm test` sigue en verde, así que el CD publica. Lo
mismo pasa con un `router.use('/sub', guard)` con prefijo, que hoy se cuenta como protección de
todo el router.

Corrección: comparar índices. Para cada capa con `route` en la posición `i`, debe existir una capa
sin `route`, con `reglaAutorizacion` y `layer.path === '/'` (o `matchers` sin prefijo), en una
posición `j < i`, o un guard en el propio `route.stack` **antes** del último handler. Hoy todos los
archivos cumplen esa condición, así que el cambio solo endurece la prueba.

### Menores

**M-01. Los objetos de `tiendas` pasan crudos a `/auth/sesion` y no están congelados.**
`caoAuthClient.js:83` y `auth.controller.js:22`. El arreglo se congela, pero cada elemento es el
objeto de CAO tal cual. Si CAO agrega campos a cada tienda (internos o de otro módulo), salen en
`GET /auth/sesion` sin pasar por la lista blanca. Además, un código futuro que mute `tiendas[0]`
contaminaría el usuario cacheado (S-09).

Corrección: mapear `{ cod_tienda, nombre, cod_tipo }` y congelar cada elemento.

**M-02. `CAO_COD_MODULO` sigue en `SCRAPING` en `back/.env.example:30` y como default en `env.js:39`.**
`04_implementacion.md` lo difiere a T17. El default falla cerrado: con `SCRAPING` nadie tiene
PLA00X, así que todos reciben 403. Sin embargo, el PLAN pedía actualizar `.env.example` **en el
commit de código**.

Escenario: un entorno nuevo copiado de `.env.example` queda sin servicio (todo 403) y alguien
"arregla" el setting en Azure fuera del orden de S-06.

Corrección: cambiar `.env.example` a `PLANOGRAMA` con el comentario de orden de despliegue en el
commit de código, como dice T17.

**M-03. Los permisos por ruta (PLA00X y C) no se pueden verificar mientras A exija PLA001–PLA008.**
Toda ruta con `requierePermiso(PLA001…PLA008)` va detrás de `requiereAnalista`, así que el chequeo
específico es redundante hoy. `matrizPermisos.test.js` no lo puede distinguir.

Escenario: `PATCH /tiendas/:id` con `CREAR_TIENDA` en lugar de `EDITAR_TIENDA`
(`tiendas.routes.js:29`), o un `editarContenido` faltante en una escritura de `posiciones`. La
prueba sigue en verde y el error aparece cuando DT-11 reemplace A por permisos propios.

Corrección: en `rutasProtegidas.test.js`, comparar `route.stack[].handle.reglaAutorizacion` contra
una tabla declarativa `método + ruta → reglas esperadas` (la misma matriz del PLAN). También vale
anotarlo como condición de cierre de DT-11.

## Deuda detectada

- DT-10/DT-12 (sin filtro por tienda; adjuntos y evidencias legibles por cualquier implementador)
  se mantienen como riesgo aceptado. El diff no los agrava: el dominio de evidencias sigue validando
  tienda activa + versión asignada (`evidencia.usecases.js:27-29`) y el borrado por autor.
- Sin deuda nueva aparte de M-03, que conviene agregar como criterio de cierre en DT-11.

## Veredicto

**Aprobado con observaciones.** Sin bloqueantes. I-01 debe corregirse en la ronda 2: es la red de
seguridad que impide publicar una ruta sin guard. M-01 a M-03 se pueden corregir ahora o registrar.
