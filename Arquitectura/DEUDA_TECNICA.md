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
la sesión). Al resolverlo, DT-01 se cierra.

### DT-11 — Acciones con la regla transitoria A
Solicitar a IT CAO permisos para: archivar planograma; promover, archivar y guardar (cambio de
estado) de versión; gestionar adjuntos; gestionar accesorios; editar dimensiones de producto; agente
extractor (foto/PDF/IA); voz. Mientras tanto un perfil con un subconjunto de PLA001–PLA008 queda
fuera de todas las vistas de analista, y cualquier perfil con los 8 puede archivar/promover. Al
llegar los códigos: reemplazar A en la ruta, en `matrizPermisos.test.js`, en `puede(...)` del front y
en `SEGURIDAD_PERMISOS.md`. **Condición de cierre**: al reemplazar A, la prueba de rutas debe comparar
la regla de cada ruta contra una tabla declarativa (hoy los `PLA00X` por ruta quedan tapados por A y
la prueba no detectaría que se quite uno; hallazgo M-03 de `05_revision_seguridad.md`).

### DT-12 — Evidencias de cualquier tienda
Sin filtro por tienda, un implementador lista y descarga evidencias de otra tienda (IDs secuenciales
en `/evidencias/:id/descargar`), sube evidencias a otra tienda (contamina su avance) y borra las que
él mismo subió en cualquier tienda (el dominio limita el borrado al autor). El borrado es físico, sin
auditoría. Se resuelve con DT-10 y, si se requiere trazabilidad, con borrado lógico.

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
