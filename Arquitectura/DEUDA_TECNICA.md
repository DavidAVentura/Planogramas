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
| DT-01 | Autorización no aplicada: permisos y tiendas de CAO no se validan en ningún endpoint | Crítica | back | 2026-10-12 · configuración de `/desarrollo` | Abierta — primer desarrollo con `/desarrollo` |
| DT-02 | 78 archivos CSS con valores fuera de los tokens (lista legacy en `front/.stylelintrc.json`) | Media | front | 2026-10-12 · reglas de stylelint | Abierta |
| DT-03 | `listarPlanogramas` devuelve `pageSize: NaN` si recibe un valor no numérico | Baja | back | 2026-10-12 · pruebas de dominio | Abierta |
| DT-04 | Sin tokens de escala tipográfica ni de espaciado | Media | front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-05 | 26 errores de stylelint preexistentes y `npm run lint` no corre en CI | Media | front · CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-06 | Cobertura de pruebas mínima: sin pruebas del resto de entidades, casos de uso ni integración HTTP/BD | Media | back · front | 2026-10-12 · configuración de `/desarrollo` | Abierta |
| DT-07 | `adjuntos` (13) y `agente-extractor` sin carpeta de pruebas Postman | Media | back | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-08 | Estado de migraciones de PROD sin verificar | Alta | BD | 2026-10-12 · `CLAUDE.md` | Abierta |
| DT-09 | El workflow de API PROD instala devDependencies y usa `actions/setup-node@v3` (DEV usa `--omit=dev` y v4) | Baja | CI | 2026-10-12 · configuración de `/desarrollo` | Abierta |

## Detalle

### DT-01 — Autorización no aplicada
`infrastructure/http/middlewares/autenticacion.js` valida el JWT contra CAO y deja `req.usuario`
(con `permisos` y `tiendas`, ver `infrastructure/cao/caoAuthClient.js`), pero ningún endpoint los
consulta: cualquier usuario autenticado puede leer y modificar cualquier planograma de cualquier
tienda. Se resuelve con una matriz permiso → acción (`Arquitectura/SEGURIDAD_PERMISOS.md`), un
middleware de permisos y el filtrado por tienda en los repositorios.

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
