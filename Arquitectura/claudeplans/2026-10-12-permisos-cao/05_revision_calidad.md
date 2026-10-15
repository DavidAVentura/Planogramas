# 05 — Revisión de calidad (ronda 1): Permisos CAO por perfil

Diff revisado: `git diff c3c97b9` + archivos nuevos sin seguimiento (rama `feat/permisos-cao`).
Contra `PLAN.md`, `02_ux.md` y `04_implementacion.md`.

## Verificación ejecutada

- `cd back && npm test`: 62/62 OK. Además corrí `matrizPermisos` y `rutasProtegidas` **sin `.env`**
  (cwd ajeno y `env -i`), como en CI: 20/20 OK. La prueba HTTP no depende de la configuración local.
- `cd front && npx vitest run`: 21/21 OK. `npx tsc -b`: limpio. `oxlint` sobre los archivos nuevos o
  tocados del router, del dominio, del contexto y del layout: solo la advertencia
  `only-export-components` de `AuthContext.tsx`, que ya existía.
- Matriz endpoint → regla (PLAN, Contratos): revisé ruta por ruta los 18 `*.routes.js`. Coincide
  con la tabla, incluidos el orden `A` → permiso, los guards antes del controller y
  `router.use(requiereAnalista)` como primera instrucción. En `voz.routes.js` el guard va antes
  de `vozLimiter`, así que un 403 no consume cuota.
- Vistas del implementador (`MiTienda`, `ProductosTienda`, `components/dominio/implementacion/*`,
  `TiendaImplementadorChip`): solo usan `useTiendas`, `useImplementacion`, `useEvidencias` y
  `useAdjuntos` (listar y url-descarga). Todos tienen la regla I o PLA010. No queda ningún
  endpoint A en la ruta del usuario de tienda.
- Grep S-11 (nombres de perfil) y S-05 (`...req.usuario`): sin hallazgos fuera de `PERFILES`. No
  quedan usos de `useAuth().puedeEscribir`; `tsc` lo confirma.

## Hallazgos

### Importante

**I-1. `back/test/http/rutasProtegidas.test.js:15` — la prueba S-03 no comprueba que el guard de router esté antes de las rutas ni que no tenga prefijo.**
`protegidoPorRouter` es `true` si **cualquier** capa sin `route` tiene `reglaAutorizacion`, sin
importar su posición en `router.stack` ni su path.
- Escenario 1: un módulo nuevo declara sus rutas y al final del archivo pone
  `router.use(requiereAnalista)`. Express resuelve las rutas antes de llegar al guard, así que
  quedan sin protección y la prueba pasa en verde.
- Escenario 2: `router.use('/algo', requiereAnalista)` también cuenta como protección de todo el
  router.

Es justo el olvido que S-03 debe atrapar.
*Corrección*: calcular `protegidoPorRouter` por ruta. Debe existir una capa de guard con
`reglaAutorizacion` cuyo índice en `router.stack` sea menor que el de la capa de la ruta y cuyo
path sea la raíz (`capa.regexp.fast_slash` o el equivalente de path vacío en Express 5). Agregar
un caso negativo con un router sintético (rutas antes que el guard) que demuestre que la prueba
falla.

**I-2. `back/.env.example:30` — sigue `CAO_COD_MODULO=SCRAPING`; T17 pide cambiarlo en el commit de código.**
`04_implementacion.md` marca T17 como "no ejecutada" y deja `.env.example` sin tocar, pero el plan
indica que el `.env.example` se modifica **en el commit de código**. Solo la parte de Azure espera
a la publicación. Con el código nuevo y `SCRAPING`, los permisos son `SCP*` y **toda** la API
responde 403. Quien clone o actualice `develop` y copie el ejemplo, o deje su `.env` como está,
verá la app entera en `SinAcceso` sin pista de la causa. Falla cerrado, así que no es un riesgo de
seguridad, pero sí un tropiezo seguro para el equipo.
*Corrección*: en el mismo commit de código, `CAO_COD_MODULO=PLANOGRAMA` en `.env.example` con el
comentario de que en Azure el setting se cambia **después** de desplegar el código (S-06). Avisar
al usuario que actualice su `.env` local a mano (el hook lo bloquea para el agente).

### Menor

**M-1. `back/test/http/matrizPermisos.test.js:105` — `'pasa'` acepta 404.**
`cumple = status !== 403 && status !== 401`. Si una ruta de `PASA_TIENDA` se renombra o está mal
escrita en la tabla, Express responde 404 y el caso sigue en verde sin probar nada. Con los stubs,
las rutas reales responden 500 (BD) o 400 (validación), nunca 404.
*Corrección*: en `'pasa'`, excluir también el 404.

**M-2. `back/src/infrastructure/http/routes/{adjuntos,tiendas,versiones}.routes.js` (comentario sobre el import) — citan `Arquitectura/SEGURIDAD_PERMISOS.md`, que todavía no existe.**
Lo crea T16. Si el commit de código entra antes o sin el de docs, el enlace queda roto.
*Corrección*: asegurar que T16 cree el archivo antes de cerrar `/desarrollo`.

**M-3. `front/src/components/dominio/layout/AppTopbar/AppTopbar.css:67-68` — CSS muerto.**
`.app-topbar__nav-opcion--deshabilitada` ya no tiene uso desde que se quitó `disponible`. El
desarrollador lo reportó como deuda.
*Corrección*: borrarlo; es un cambio de 2 reglas.

**M-4. `front/src/pages/EditorPlanograma/EditorPlanograma.tsx:217` — el badge `Solo lectura` va en la barra de acciones, no "dentro del encabezado de la página" (02_ux §176, PLAN UX).**
El editor no tiene un encabezado propio (solo `AppTopbar` con breadcrumb), así que la barra de
acciones es una ubicación razonable. Hoy ningún perfil cae en el caso.
*Corrección*: dejarlo y registrar la ubicación en `DISENO_SISTEMA.md` §4.4 (T16), o moverlo al
`breadcrumb`/título si UX lo prefiere.

## Observaciones (sin acción)

- T15 quedó parcial por decisión del usuario: sin `TOKEN_CAO_TIENDA` y sin la sub-carpeta de 403.
  La cobertura del 403 la da `matrizPermisos.test.js`. Conviene registrarlo en el cierre como
  pendiente de Postman, junto con DT-10/DT-11.
- `env.js` mantiene el valor por defecto `SCRAPING`. Si falta el setting en Azure, todos reciben
  403 (falla cerrado). Es coherente con el plan; ver I-2 para el ejemplo local.
- El log del guard serializa la regla con `JSON.stringify` (`regla="A"`), lo que es aceptable y no
  incluye token ni query.

## Veredicto

**Requiere cambios.** Hay 2 hallazgos Importantes (I-1: la prueba S-03 deja pasar un guard mal
ubicado; I-2: `.env.example` fuera del commit de código) y 4 Menores. No encontré Bloqueantes: la
matriz, los guards, la sesión con lista blanca, los modos y la navegación del front cumplen los
criterios de aceptación del plan.

---

## Ronda 2

Alcance: solo las correcciones de I-1 y I-2 (sección "Correcciones ronda 1" de `04_implementacion.md`).
`cd back && npm test`: 65 pruebas, 65 OK.

**I-1: resuelto.** `rutasDesprotegidas` evalúa cada ruta por separado. Un guard de router solo
cuenta si es una capa `use` con `reglaAutorizacion`, `slash === true` e índice menor que el de la
ruta. Comprobé `node_modules/router/lib/layer.js:47`: `this.slash = path === '/' && opts.end === false`,
así que `router.use(guard)` y `router.use('/', guard)` cuentan como raíz y `router.use('/sub', guard)` no.
- Guard después de la ruta: lo detecta (caso negativo 1).
- Guard con prefijo: lo detecta (caso negativo 2).
- Falsos positivos: no los hay. Los 19 `*.routes.js` reales pasan. Eso incluye
  `asignaciones.routes.js`, con dos guards en un mismo `use`, y `voz.routes.js`, con un limitador
  después del guard. El caso positivo cubre el guard previo y el guard por ruta.
- Si una versión futura de `router` quita `slash`, la prueba falla en rojo con todas las rutas
  marcadas, nunca en falso verde. Falla cerrado.

**I-2: resuelto a medias, queda como menor.** `back/.env.example:30` ya dice
`CAO_COD_MODULO=PLANOGRAMA`.

### Hallazgos nuevos

**Menor. `back/.env.example:30` no tiene el comentario de orden de despliegue (S-06) que pedía la
corrección de I-2.** Si alguien actualiza el setting de Azure antes de desplegar el código, el
código anterior valida contra el módulo nuevo. Corrección: agregar arriba de la línea algo como
`# En Azure, cambiar este setting DESPUÉS de desplegar el código (S-06).` También falta avisar al
usuario que actualice su `back/.env` local a mano. Esto va en el cierre, no en el código.

### Veredicto ronda 2

**Aprobado con menores.** Hay 0 Bloqueantes, 0 Importantes y 1 Menor nuevo (el comentario S-06 en
`.env.example`). Los 4 Menores de la ronda 1 siguen sin corregir, como se acordó.
