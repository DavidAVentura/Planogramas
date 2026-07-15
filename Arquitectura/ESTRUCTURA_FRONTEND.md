# Estructura de carpetas — Frontend (`src/`)

Estructura aprobada para la reconstrucción del frontend sobre el inventario de
[[INVENTARIO_PANTALLAS_COMPONENTES]]. Todo código nuevo debe respetar esta organización. Es el
equivalente, del lado del frontend, de `ESTRUCTURA_BACKEND.md` — mismos principios (arquitectura por
capas, SOLID, Clean Code, simplicidad sobre ingeniería de más), adaptados a React.

Esta reestructura reemplaza gradualmente al `src/main.jsx` monolítico actual (~1700 líneas, las 4
vistas del piloto de captura). El piloto puede migrarse a esta estructura pantalla por pantalla; no
hace falta reescribirlo de una sola vez.

---

## Árbol de carpetas

```
src/
├── main.jsx                          # Entry point: monta <App /> + router + providers globales
├── App.jsx                           # Layout raíz (header, navegación, <Outlet />)
│
├── config/
│   └── env.js                        # ÚNICO punto que lee import.meta.env (URL base de API, etc.)
│
├── router/
│   └── routes.jsx                    # Definición de rutas (react-router-dom), mapea 1:1 a pages/
│
├── services/                         # Acceso a la API — un archivo por recurso del backend
│   ├── httpClient.js                 # Cliente base: fetch + headers + parseo de errores estándar
│   ├── planogramas.service.js
│   ├── versiones.service.js
│   ├── gondolas.service.js
│   ├── niveles.service.js
│   ├── posiciones.service.js
│   ├── sustituciones.service.js
│   ├── exportacion.service.js
│   ├── catalogo.service.js           # Proxy a CATI vía backend
│   ├── accesorios.service.js
│   ├── tiendas.service.js
│   └── jerarquia.service.js          # Proxy a CATI vía backend
│
├── hooks/                            # Lógica de negocio y estado por dominio, sin JSX
│   ├── usePlanogramas.js             # Listar/crear/editar/archivar
│   ├── useVersion.js                 # Ciclo de vida, tiendas asignadas, promover/publicar
│   ├── useEditorPlanograma.js        # Estado del editor: selección, drag&drop, undo/redo
│   ├── usePosicionEditor.js          # Cálculos derivados (facings↔ancho, capacidad) + guardado
│   ├── useSustitucionSku.js          # Wizard de sustitución (3 pasos)
│   └── useCapacidadNivel.js          # Consulta y recalcula capacidad por nivel
│
├── context/                          # Estado transversal, no específico de un dominio
│   ├── AuthContext.jsx               # Usuario/rol (Analista/Implementador), token
│   └── ToastContext.jsx              # Cola de notificaciones globales
│
├── pages/                            # Una carpeta por pantalla ruteable (ver INVENTARIO_PANTALLAS_COMPONENTES)
│   ├── PlanogramasListado/
│   │   ├── PlanogramasListado.jsx
│   │   └── PlanogramasListado.scss
│   ├── PlanogramaDetalle/
│   │   ├── PlanogramaDetalle.jsx
│   │   └── PlanogramaDetalle.scss
│   ├── EditorPlanograma/
│   │   ├── EditorPlanograma.jsx
│   │   └── EditorPlanograma.scss
│   ├── SustitucionSku/
│   ├── HistorialSustituciones/
│   ├── ImplementadorSelectorTienda/
│   ├── ImplementadorListado/
│   └── ImplementadorEstructura/
│
├── components/
│   ├── ui/                           # Primitivos genéricos — sin conocimiento del dominio
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   └── Button.scss
│   │   ├── Modal/
│   │   ├── ConfirmDialog/
│   │   ├── Table/
│   │   ├── Badge/
│   │   ├── Toast/
│   │   ├── Wizard/
│   │   └── CascadingSelect/
│   │
│   └── dominio/                     # Componentes con lenguaje de negocio (nombres en español)
│       ├── PlanogramGrid/
│       ├── GondolaCard/
│       ├── NivelRow/
│       ├── PosicionCell/
│       ├── PosicionEditorPanel/
│       ├── AccessoryPicker/
│       ├── CapacityBar/
│       └── ProductPreview/
│
├── styles/
│   ├── _tokens.scss                  # :root { --lime, --blue, --ink, --muted, ... } (migrado de styles.css)
│   ├── _mixins.scss                  # Breakpoints, mixins de layout compartidos
│   └── global.scss                   # Reset, tipografía base, body — importado una sola vez en main.jsx
│
├── utils/                            # Funciones puras, sin estado ni JSX
│   ├── capacidad.js                  # capacidad_maxima, min_estetico (espejo de posicion.entity.js del backend)
│   └── formatters.js
│
└── data/
    └── realData.js                   # (ya existe, generado — no editar a mano, ver CLAUDE.md)
```

---

## Convención de componente y de página

Cada componente y cada página vive en **su propia carpeta**, con el mismo nombre exacto en
`PascalCase` para la carpeta y los archivos:

```
Button/
├── Button.jsx
└── Button.scss
```

- El `.jsx` importa su propio `.scss` (`import './Button.scss'`) — nunca estilos de otro componente.
- La clase raíz del `.scss` debe llamarse igual que el componente en `kebab-case`
  (`Button.jsx` → `.button { ... }`, `PosicionEditorPanel.jsx` → `.posicion-editor-panel { ... }`), y
  todo estilo interno se anida bajo esa clase. Esto evita colisiones de nombres entre componentes sin
  necesitar CSS Modules ni convención BEM completa.
- No usar clases sueltas de alcance amplio (`.title`, `.card`, `.row`) fuera de esa clase raíz — es la
  causa más común de que un estilo de un componente se filtre a otro en un `.scss` global.
- No se usan barrel files (`index.js`) por defecto — importar directo
  (`import Button from '../../components/ui/Button/Button'`). Agregar un barrel solo si un consumidor
  externo lo necesita; no antes.

---

## Flujo de una acción de usuario

```
Evento en la UI (click, drag, submit)
  → components/ (dominio o ui)         — solo JSX + handlers delgados, delega al hook
  → hooks/                             — orquesta la llamada, maneja estado local/optimista
  → services/{recurso}.service.js      — arma el request, llama a httpClient
  → services/httpClient.js             — fetch + header Authorization + parseo de errores
  → API backend (`Arquitectura/Contratos/`)
```

Un componente **nunca** llama a `services/` directamente — siempre pasa por un hook. Esto es lo que
permite testear la lógica de negocio (cálculo de capacidad, validaciones) sin renderizar nada.

---

## Reglas de dependencia

| Capa | Puede importar de | NO puede importar de |
|------|--------------------|------------------------|
| `components/ui/` | otros `components/ui/`, `styles/` | `hooks/`, `services/`, `pages/` (deben ser agnósticos de dominio y de datos) |
| `components/dominio/` | `components/ui/`, `utils/`, props/callbacks recibidos | `services/` directamente |
| `pages/` | `hooks/`, `components/ui/`, `components/dominio/`, `router/` | `services/` directamente (siempre vía un hook) |
| `hooks/` | `services/`, `context/`, `utils/` | JSX, `components/` |
| `services/` | `config/env.js`, `httpClient.js` | `hooks/`, `components/`, `pages/` |
| `context/` | `services/`, `utils/` | componentes de dominio específicos |
| `config/env.js` | nada del proyecto | el resto no debe leer `import.meta.env` directamente |

---

## Gestión de estado

- **Estado local de componente**: para UI efímera (hover, campo abierto/cerrado) — `useState` normal,
  sin necesidad de hook dedicado.
- **Estado de dominio** (datos de negocio, llamadas a la API): vive en los `hooks/` de la sección
  anterior, con `useState`/`useReducer` según la complejidad (el editor con undo/redo necesita
  `useReducer`: cada acción del usuario es una transición de estado explícita, más fácil de invertir).
- **Estado transversal** (usuario/rol, cola de toasts): `Context` + `useReducer` en `context/`. No se
  introduce una librería externa de estado (Zustand/Redux) mientras Context alcance — agregarla solo
  si el prop-drilling o los re-renders se vuelven un problema medible, no antes (simplicidad sobre
  ingeniería de más).

## Manejo de errores y comunicación con el backend

`httpClient.js` centraliza la interpretación de la respuesta de error estándar del backend
(`{ error: { code, message, details } }`, ver `CLAUDE.md` sección Backend) y lanza un único tipo de
error de aplicación con `status`/`code`/`message`. Los hooks lo capturan y deciden qué hacer:

| Código HTTP | Manejo por defecto |
|---|---|
| `400` / `422` | Error de validación — mostrarlo en el formulario/campo, no como toast |
| `401` | Redirigir a login / limpiar sesión |
| `403` | Mensaje de "sin permiso", no reintentar |
| `404` | Mensaje de "no encontrado", volver al listado |
| `409` | Mostrar el conflicto (ej. nombre duplicado) en el formulario |
| `503` (CATI) | Modo degradado en la UI (ver `PANT-06-04` en el inventario) + opción de reintentar |

Los toasts (`ToastContext`) se reservan para confirmaciones de éxito y errores que no tienen un campo
de formulario asociado.

## Estilos

- Los tokens de color/tipografía/radio hoy en `:root` de `styles.css` se migran tal cual a
  `styles/_tokens.scss`, como **custom properties CSS** (`--lime`, `--panel`, etc.), no como variables
  Sass — así cualquier componente los usa con `var(--lime)` sin necesidad de `@use`/`@import` extra.
- `styles/global.scss` conserva el reset y las reglas de `body`/tipografía base; se importa una sola
  vez en `main.jsx`.
- Falta instalar el compilador de Sass para que Vite procese `.scss`: `npm install -D sass`.

## Ruteo

El prototipo actual navega con un solo estado `activeView` (sin URLs reales). La estructura nueva
requiere URLs de verdad para deep-link, botón atrás y breadcrumbs (jerarquía Planograma › Versión ›
Góndola). Agregar `react-router-dom` y definir las rutas en `router/routes.jsx`, una por página de
`pages/`.

## Testing

No hay tests hoy en el repo (ver `CLAUDE.md`). Al introducir esta estructura, priorizar tests sobre
`hooks/` y `utils/` (lógica pura: cálculo de capacidad, facings↔ancho, validaciones bloqueantes) antes
que sobre componentes visuales — son los que más valor dan por esfuerzo. Convención: test colocado
junto al archivo (`capacidad.test.js` junto a `capacidad.js`), con Vitest + React Testing Library para
los pocos componentes que lo justifiquen.

## Lint y formato

El repo no tiene lint configurado. Agregar ESLint (config recomendada de React + hooks) y Prettier,
con un script `npm run lint`, antes de escalar a muchos componentes nuevos entre varias personas.

---

## Convenciones de nomenclatura (resumen)

- Carpeta de componente/página: `PascalCase`, igual al nombre del componente.
- Archivos dentro: `{Nombre}.jsx`, `{Nombre}.scss` (mismo nombre exacto que la carpeta).
- Clase raíz del `.scss`: `kebab-case` del nombre del componente.
- Hooks: `use{Dominio}.js`, en `hooks/`.
- Servicios: `{recurso}.service.js`, en plural, mismo nombre que el módulo de `Arquitectura/Contratos/`.
- Componentes de `components/dominio/`: nombre en español acorde al dominio (`Gondola`, `Nivel`,
  `Posicion`, `Sustitucion`), igual que las entidades del backend — mismo vocabulario en ambas puntas.
- Componentes de `components/ui/`: nombre genérico en inglés (`Button`, `Modal`, `Table`) — son
  primitivos sin dominio.

## Dependencias nuevas a instalar

| Paquete | Motivo |
|---|---|
| `sass` (dev) | Compilar los `.scss` de cada componente |
| `react-router-dom` | Rutas reales para la navegación jerárquica del MVP formal |
| `eslint` + config React/hooks (dev) | Lint |
| `prettier` (dev) | Formato consistente |
| `vitest` + `@testing-library/react` (dev) | Testing de hooks/utils y componentes críticos |
