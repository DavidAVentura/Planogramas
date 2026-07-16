# Estructura de carpetas — Frontend (`front/`)

Estructura aprobada para el frontend nuevo del MVP formal, sobre el inventario de
[[INVENTARIO_PANTALLAS_COMPONENTES]] y el prototipo visual ya diseñado en
`front/design/Planogramas.dc.html` (handoff detallado en `front/design/
ESPECIFICACION-PANTALLAS-COMPONENTES.md`). Es el equivalente, del lado del frontend, de
`ESTRUCTURA_BACKEND.md` — mismos principios (arquitectura por capas, SOLID, Clean Code, simplicidad
sobre ingeniería de más), adaptados a React.

Este es un proyecto **separado** de `src/main.jsx` (el piloto de captura, en la raíz del repo, ver
`CLAUDE.md`), no un reemplazo gradual de ese código. Vive en `front/`, ya scaffoldeado con Vite +
React + TypeScript (`front/package.json`) pero sin pantallas implementadas todavía — las carpetas de
`pages/`/`components/` de abajo ya existen vacías, creadas como esqueleto de esta estructura.

---

## Stack real (ya decidido al scaffoldear `front/`, no lo que planeaba la versión anterior de este documento)

| Antes se planeaba | Lo que hay realmente en `front/` |
|---|---|
| JavaScript + `.jsx` | **TypeScript + `.tsx`/`.ts`** (`front/tsconfig.json`, `front/tsconfig.app.json`) |
| SCSS por componente | **CSS plano** por componente (`front/src/App.css`, `front/src/index.css`) — no hay `sass` como dependencia declarada en `package.json` |
| ESLint + Prettier | **oxlint** (`front/.oxlintrc.json`, script `npm run lint`) |
| React 18 | **React 19** (`react@^19.2.7`) |
| Vitest + Testing Library | Sin decidir todavía (ver §Testing) |

El resto de este documento ya está actualizado a esta realidad — no repetir el plan viejo.

---

## Árbol de carpetas

```
front/
├── index.html
├── vite.config.ts
├── package.json
├── src/
│   ├── main.tsx                       # Entry point: monta <App /> + router + providers globales
│   ├── App.tsx                        # Layout raíz (AppTopbar, <Outlet />) — hoy es el demo de Vite, falta reemplazar
│   ├── index.css                      # Reset + tipografía base — importado una sola vez en main.tsx
│   ├── App.css                        # Reemplazar por styles/global.css al implementar el layout raíz
│   │
│   ├── config/
│   │   └── env.ts                     # ÚNICO punto que lee import.meta.env (URL base de API, etc.)
│   │
│   ├── router/
│   │   └── routes.tsx                 # 3 rutas (ver más abajo), react-router-dom
│   │
│   ├── services/                      # Acceso a la API — un archivo por recurso del backend
│   │   ├── httpClient.ts              # Cliente base: fetch + headers + parseo de errores estándar
│   │   ├── planogramas.service.ts
│   │   ├── versiones.service.ts
│   │   ├── gondolas.service.ts
│   │   ├── niveles.service.ts
│   │   ├── posiciones.service.ts
│   │   ├── sustituciones.service.ts
│   │   ├── exportacion.service.ts
│   │   ├── catalogo.service.ts        # Proxy a CATI vía backend
│   │   ├── accesorios.service.ts
│   │   ├── tiendas.service.ts
│   │   └── jerarquia.service.ts       # Proxy a CATI vía backend
│   │
│   ├── hooks/                         # Lógica de negocio y estado por dominio, sin JSX
│   │   ├── usePlanogramas.ts          # Listar/filtrar/crear/editar/archivar (PANT-01-*)
│   │   ├── useVersion.ts              # Crear versión/especial, promover, publicar, tiendas asignadas
│   │   ├── useEditorPlanograma.ts     # Estado del editor: tabs de góndola, selección, drag&drop, undo/redo
│   │   ├── usePosicionEditor.ts       # PosicionDrawer: cálculos derivados (facings↔ancho, capacidad) + guardado
│   │   └── useSustitucionSku.ts       # Modo sustitución + SustitucionWizard
│   │
│   ├── context/                       # Estado transversal, no específico de un dominio
│   │   ├── AuthContext.tsx            # Usuario/rol (Analista/Implementador) — hoy es el RoleSwitch manual del prototipo, no auth real (ver gap en INVENTARIO §5)
│   │   └── ToastContext.tsx           # Cola de notificaciones globales
│   │
│   ├── types/                         # Modelo de datos compartido (ver ESPECIFICACION-PANTALLAS-COMPONENTES.md §4)
│   │   └── planograma.ts              # Planograma, Version, Gondola, Nivel, Posicion, ProductoCatalogo, MedidasMontaje, Sustitucion
│   │
│   ├── pages/                         # Una carpeta por pantalla ruteable — SOLO 3, ver nota abajo
│   │   ├── PlanogramasListado/
│   │   │   ├── PlanogramasListado.tsx
│   │   │   └── PlanogramasListado.css
│   │   ├── PlanogramaDetalle/
│   │   │   ├── PlanogramaDetalle.tsx
│   │   │   └── PlanogramaDetalle.css
│   │   └── PlanogramaEditor/
│   │       ├── PlanogramaEditor.tsx
│   │       └── PlanogramaEditor.css
│   │
│   ├── components/
│   │   ├── ui/                        # Primitivos genéricos — sin conocimiento del dominio
│   │   │   ├── Button/                # ya existe la carpeta
│   │   │   ├── Modal/                 # ya existe — base de todos los modales centrados
│   │   │   ├── Drawer/                # FALTA CREAR — base de PosicionDrawer (lateral derecho, no centrado)
│   │   │   ├── ConfirmDialog/         # ya existe — base de ArchivarModal y DeleteConfirmModal
│   │   │   ├── Table/                 # ya existe — base de PlanogramasTable, VersionesTable, historial
│   │   │   ├── Badge/                 # ya existe — base de EstadoBadge
│   │   │   ├── Toast/                 # ya existe
│   │   │   ├── ChipInput/             # ya existe — subcategorías en PlanogramaFormModal
│   │   │   ├── CascadingSelect/       # ya existe — Área → Departamento
│   │   │   ├── Wizard/                # FALTA CREAR — base de VersionEspecialWizard y SustitucionWizard
│   │   │   ├── EmptyState/            # FALTA CREAR
│   │   │   └── Popover/               # FALTA CREAR — base de ExportMenu
│   │   │
│   │   └── dominio/                   # Componentes con lenguaje de negocio, agrupados por pantalla
│   │       ├── layout/
│   │       │   ├── AppTopbar/
│   │       │   ├── RoleSwitch/
│   │       │   └── Breadcrumb/
│   │       ├── listado/
│   │       │   ├── FiltrosBar/
│   │       │   ├── PlanogramasTable/
│   │       │   └── PlanogramaCard/    # equivalente de fila para móvil
│   │       ├── detalle/
│   │       │   ├── SubcategoriasCard/
│   │       │   ├── VersionesTable/
│   │       │   └── VersionCard/       # equivalente de fila para móvil
│   │       ├── editor/
│   │       │   ├── EditorToolbar/
│   │       │   ├── ExportMenu/
│   │       │   ├── SustitucionBanner/
│   │       │   ├── GondolaTabs/
│   │       │   ├── GondolaInfoBar/
│   │       │   ├── EspacioToolbar/
│   │       │   ├── NivelRow/
│   │       │   ├── CapacityBar/
│   │       │   ├── PosicionCard/
│   │       │   └── FacingTile/
│   │       ├── modales/
│   │       │   ├── PlanogramaFormModal/   # crear Y editar planograma — reemplaza pages/PlanogramaFormulario (ver nota)
│   │       │   ├── ArchivarModal/
│   │       │   ├── CrearVersionModal/
│   │       │   ├── VersionEspecialWizard/
│   │       │   ├── PromoverPilotoModal/
│   │       │   ├── PublicarVersionModal/
│   │       │   ├── PublicarEditorPanel/
│   │       │   ├── TiendasAsignadasModal/
│   │       │   ├── PosicionDrawer/
│   │       │   ├── FichaProductoModal/
│   │       │   ├── GondolaModal/
│   │       │   ├── NivelModal/
│   │       │   ├── DeleteConfirmModal/
│   │       │   ├── SustitucionWizard/
│   │       │   └── HistorialSustitucionesModal/
│   │       └── EstadoBadge/            # (badge de estado con colores por estado, ver INVENTARIO §4.3)
│   │
│   ├── styles/
│   │   ├── tokens.css                 # :root { --cemaco-green, --cemaco-indigo, --ink-*, ... } — copiar de
│   │   │                               #   front/design/_ds/.../colors_and_type.css, NO reinventar la paleta
│   │   └── global.css                 # Reset, tipografía base, body — importado una sola vez en main.tsx
│   │
│   └── utils/                         # Funciones puras, sin estado ni JSX
│       ├── capacidad.ts               # capacidad_maxima, min_estetico (espejo de posicion.entity.js del backend)
│       └── formatters.ts
│
└── design/                            # Referencia de diseño (prototipo + design system) — NO es código de la app
    ├── Planogramas.dc.html            # prototipo navegable, abrir con un server local (no file://, ver nota)
    ├── support.js / _ds/…             # runtime del prototipo, no se usa en la app real
    └── ESPECIFICACION-PANTALLAS-COMPONENTES.md
```

### Nota — carpetas ya scaffoldeadas que hay que reconciliar

`front/src/pages/` hoy tiene **4** carpetas vacías: `PlanogramasListado`, `PlanogramaDetalle`,
`PlanogramaFormulario` y (falta) el editor. Según el diseño, **crear/editar planograma es un modal
(`PlanogramaFormModal`), no una pantalla con ruta propia** — `pages/PlanogramaFormulario/` debería
eliminarse o repurponerse cuando se implemente, y falta crear `pages/PlanogramaEditor/` (la pantalla
más grande y la que no tiene carpeta todavía). No se tocan las carpetas en este documento — es una
decisión para el momento de implementar, no un cambio de código que corresponda a una reescritura de
documentación (ver convención de "no mezclar cambios" en `CLAUDE.md`).

### Nota — `front/design/` no es parte del build

Es material de referencia (el prototipo de diseño y su runtime), no código de la aplicación. No se
importa desde `src/`. Contiene la fuente `Chalet-NewYorkNineteenSixtymodificada.otf`, marcada como
uso interno solamente (`colors_and_type.css`: "DO NOT serve publicly without a license") — al migrar
los tokens a `styles/tokens.css`, usar el fallback web-safe "Hanken Grotesk" en el `font-family` que
de verdad se sirve en producción, no empaquetar esa fuente en el build. El prototipo (`Planogramas.
dc.html`) carga React/Babel desde `unpkg.com` en tiempo real y necesita abrirse vía un servidor HTTP
local (`python -m http.server`, por ejemplo) — bajo `file://` el listado no renderiza filas por las
restricciones de CORS del navegador.

---

## Convención de componente y de página

Cada componente y cada página vive en **su propia carpeta**, con el mismo nombre exacto en
`PascalCase` para la carpeta y los archivos:

```
Button/
├── Button.tsx
└── Button.css
```

- El `.tsx` importa su propio `.css` (`import './Button.css'`) — nunca estilos de otro componente.
- La clase raíz del `.css` debe llamarse igual que el componente en `kebab-case`
  (`Button.tsx` → `.button { ... }`, `PosicionDrawer.tsx` → `.posicion-drawer { ... }`), y todo
  estilo interno se anida bajo esa clase usando **CSS nesting nativo** (`.posicion-drawer { .seccion
  { ... } }`) — soportado sin configuración extra en los navegadores modernos que ya requiere el
  resto del proyecto (ver requisito de cámara/HTTPS en `CLAUDE.md`), da la misma ergonomía que el
  anidado de SCSS sin agregar Sass. Esto evita colisiones de nombres entre componentes sin necesitar
  CSS Modules ni convención BEM completa.
- No usar clases sueltas de alcance amplio (`.title`, `.card`, `.row`) fuera de esa clase raíz — es
  la causa más común de que un estilo de un componente se filtre a otro en un `.css` global. Nada
  fuerza esto automáticamente (no hay CSS Modules ni stylelint configurado todavía) — depende de
  revisión de código; si con más gente tocando estilos esto empieza a fallar en la práctica, agregar
  `stylelint` con una regla de selector raíz obligatorio es la solución más simple, no CSS Modules.
- No se usan barrel files (`index.ts`) por defecto — importar directo
  (`import Button from '../../components/ui/Button/Button'`). Agregar un barrel solo si un
  consumidor externo lo necesita; no antes.

---

## Flujo de una acción de usuario

```
Evento en la UI (click, drag, submit)
  → components/ (dominio o ui)         — solo JSX + handlers delgados, delega al hook
  → hooks/                             — orquesta la llamada, maneja estado local/optimista
  → services/{recurso}.service.ts      — arma el request, llama a httpClient
  → services/httpClient.ts             — fetch + header Authorization + parseo de errores
  → API backend (`Arquitectura/Contratos/`)
```

Un componente **nunca** llama a `services/` directamente — siempre pasa por un hook. Esto es lo que
permite testear la lógica de negocio (cálculo de capacidad, validaciones) sin renderizar nada.

---

## Reglas de dependencia

| Capa | Puede importar de | NO puede importar de |
|------|--------------------|------------------------|
| `components/ui/` | otros `components/ui/`, `styles/` | `hooks/`, `services/`, `pages/` (deben ser agnósticos de dominio y de datos) |
| `components/dominio/` | `components/ui/`, `utils/`, `types/`, props/callbacks recibidos | `services/` directamente |
| `pages/` | `hooks/`, `components/ui/`, `components/dominio/`, `router/` | `services/` directamente (siempre vía un hook) |
| `hooks/` | `services/`, `context/`, `utils/`, `types/` | JSX, `components/` |
| `services/` | `config/env.ts`, `httpClient.ts`, `types/` | `hooks/`, `components/`, `pages/` |
| `context/` | `services/`, `utils/` | componentes de dominio específicos |
| `config/env.ts` | nada del proyecto | el resto no debe leer `import.meta.env` directamente |

---

## Gestión de estado

- **Estado local de componente**: para UI efímera (hover, campo abierto/cerrado, qué modal está
  abierto) — `useState` normal, sin necesidad de hook dedicado.
- **Estado de dominio** (datos de negocio, llamadas a la API): vive en los `hooks/` de la sección
  anterior, con `useState`/`useReducer` según la complejidad (el editor con undo/redo necesita
  `useReducer`: cada acción del usuario es una transición de estado explícita, más fácil de invertir;
  el prototipo, al ser un único componente de clase con un solo `state` raíz, no es un buen modelo a
  copiar — ahí la simplicidad viene de no tener que dividir el estado, algo que sí hay que hacer acá).
- **Estado transversal** (usuario/rol, cola de toasts): `Context` + `useReducer` en `context/`. No se
  introduce una librería externa de estado (Zustand/Redux) mientras Context alcance — agregarla solo
  si el prop-drilling o los re-renders se vuelven un problema medible, no antes (simplicidad sobre
  ingeniería de más).

## Manejo de errores y comunicación con el backend

`httpClient.ts` centraliza la interpretación de la respuesta de error estándar del backend
(`{ error: { code, message, details } }`, ver `CLAUDE.md` sección Backend) y lanza un único tipo de
error de aplicación con `status`/`code`/`message`. Los hooks lo capturan y deciden qué hacer:

| Código HTTP | Manejo por defecto |
|---|---|
| `400` / `422` | Error de validación — mostrarlo en el formulario/campo, no como toast |
| `401` | Redirigir a login / limpiar sesión |
| `403` | Mensaje de "sin permiso", no reintentar |
| `404` | Mensaje de "no encontrado", volver al listado |
| `409` | Mostrar el conflicto (ej. nombre duplicado) en el formulario |
| `503` (CATI) | Modo degradado en la UI + opción de reintentar (ver PANT-06-04 en el inventario — el prototipo no llama a CATI de verdad, así que este modo sigue sin diseñarse) |

Los toasts (`ToastContext`) se reservan para confirmaciones de éxito y errores que no tienen un campo
de formulario asociado.

## Estilos

- Los tokens de color/tipografía/radio/sombra se copian de `front/design/_ds/.../colors_and_type.css`
  a `styles/tokens.css` **tal cual, como custom properties CSS** (`--cemaco-green`, `--cemaco-indigo`,
  `--ink-*`, `--fg-*`, `--border`, etc.) — no reinventar la paleta ni traducirla a variables Sass. Es
  el mismo mecanismo que ya usa el prototipo.
- `--font-display: "Chalet NY", "Hanken Grotesk", ...` — usar el stack completo con fallback; no
  empaquetar el archivo `.otf` en `front/public/` sin confirmar la licencia (ver nota más arriba).
- `styles/global.css` conserva el reset y las reglas de `body`/tipografía base; se importa una sola
  vez en `main.tsx`, reemplazando a `index.css`/`App.css` (que hoy son el boilerplate default de Vite).

## Ruteo

Faltan **3 rutas** (no 8 como planeaba la versión anterior de este documento — el diseño resolvió
sustitución, historial, tiendas asignadas, crear/editar planograma, etc. como modales de una pantalla
existente, no como rutas propias):

```
/planogramas                                              → PlanogramasListado
/planogramas/:id                                           → PlanogramaDetalle
/planogramas/:id/versiones/:versionId/editor                → PlanogramaEditor
```

Agregar `react-router-dom` (no está instalado todavía) y definir estas rutas en `router/routes.tsx`.
Los modales/drawers/wizards son estado de UI de la página que los abre, no rutas.

## Testing

No hay tests hoy en `front/` ni herramienta decidida (a diferencia de lo que asumía la versión
anterior de este documento, que ya daba Vitest por elegido). Al introducir tests, priorizar
`hooks/` y `utils/` (lógica pura: cálculo de capacidad, facings↔ancho, validaciones bloqueantes)
antes que componentes visuales. Vitest + React Testing Library son la opción obvia por integrar bien
con Vite, pero no está confirmado — decidir antes de escribir el primer test, no asumirlo.

## Lint y formato

- **oxlint** (`front/.oxlintrc.json`) para JS/TS/JSX — excluye `design/` (`ignorePatterns`), que es
  material de referencia y no código de la app (ver nota más arriba). No hace falta agregar ESLint
  ni Prettier por separado salvo que oxlint resulte insuficiente para alguna regla específica de
  React/hooks — el propio `README.md` de `front/` documenta cómo habilitar reglas type-aware si
  hiciera falta.
- **stylelint** (`front/.stylelintrc.json`, extiende `stylelint-config-standard`) para los `.css` de
  `src/`. Agrega dos reglas sobre la base estándar: `selector-class-pattern` y
  `custom-property-pattern` fuerzan kebab-case en clases y en tokens (`--cemaco-green`, no
  `--cemacoGreen`), y `declaration-no-important` prohíbe `!important` (si hace falta, es señal de
  que la cascada/especificidad está mal resuelta, no algo a tapar). No incluye una regla que fuerce
  "la clase raíz del archivo coincide con el nombre del componente" — no existe como regla estándar
  de stylelint, se necesitaría un plugin propio; se deja como convención de code review por ahora
  (ver nota en la sección de convención de componente) en vez de construir un plugin a medida.
- `npm run lint` corre ambos (`oxlint && npm run lint:css`); `npm run lint:css` corre solo stylelint.
  No hay `--fix` en CI todavía — correrlo a mano (`npx stylelint "src/**/*.css" --fix`) antes de
  commitear si el editor no lo hace solo.

---

## Convenciones de nomenclatura (resumen)

- Carpeta de componente/página: `PascalCase`, igual al nombre del componente.
- Archivos dentro: `{Nombre}.tsx`, `{Nombre}.css` (mismo nombre exacto que la carpeta).
- Clase raíz del `.css`: `kebab-case` del nombre del componente.
- Hooks: `use{Dominio}.ts`, en `hooks/`.
- Servicios: `{recurso}.service.ts`, en plural, mismo nombre que el módulo de `Arquitectura/Contratos/`.
- Componentes de `components/dominio/`: nombres tal como los fijó el diseño (`PosicionDrawer`,
  `GondolaModal`, `SustitucionWizard`, etc. — ver inventario completo en INVENTARIO §4.1) — no
  traducir ni renombrar al implementar, para que el código y el prototipo se puedan comparar 1:1.
- Componentes de `components/ui/`: nombre genérico en inglés (`Button`, `Modal`, `Table`, `Drawer`,
  `Wizard`) — son primitivos sin dominio.

## Dependencias nuevas a instalar

| Paquete | Motivo |
|---|---|
| `react-router-dom` | Rutas reales para las 3 pantallas del MVP formal |
| `vitest` + `@testing-library/react` (dev) | Candidato para testing de `hooks/`/`utils/` — confirmar antes de instalar (ver §Testing) |
| `dnd-kit` (opcional) | Alternativa a drag&drop nativo HTML5 si este último resulta limitado al implementar `NivelRow`/`PosicionCard` (el prototipo usa DnD nativo y alcanza, según `ESPECIFICACION-PANTALLAS-COMPONENTES.md` §6) |

No hace falta `sass` ni `eslint`/`prettier` (ver tabla de stack real más arriba).
