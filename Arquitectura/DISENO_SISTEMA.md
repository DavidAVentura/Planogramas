# Sistema de diseño — reglas del frontend (`front/`)

Guía corta y obligatoria para que toda pantalla nueva se vea parte de la misma aplicación. La
mantiene el agente **disenador-ux** (ver `.claude/agents/disenador-ux.md`); los cambios a este
documento se aprueban en la etapa de cierre de `/desarrollo`.

## 1. Fuentes de verdad

| Qué | Dónde |
|---|---|
| Tokens (color, tipografía, radios, sombras, duraciones) | `front/src/styles/tokens.css` — copia del Cemaco Design System (`front/design/_ds/`) |
| Base global (reset, tipografía) | `front/src/styles/global.css` |
| Prototipo visual de pantallas | `front/design/Planogramas.dc.html` y el artifact enlazado en `CLAUDE.md` |
| Inventario de pantallas y componentes | `Arquitectura/INVENTARIO_PANTALLAS_COMPONENTES.md` |

## 2. Reglas que hace cumplir stylelint (`front/.stylelintrc.json`)

- **Color**: solo `var(--token)`. Prohibido hex, `rgb()/rgba()/hsl()` y colores por nombre fuera de
  `tokens.css`. Si falta un color, se agrega un token **semántico** en `tokens.css` (por significado:
  `--warning-bg`, `--estado-piloto`; nunca por componente: ~~`--asignar-sku-fondo`~~).
- **Sombras**: solo `var(--shadow-xs|sm|md|lg)` o `none`.
- **Radios**: solo `var(--radius-*)`, `0` o `50%`.
- **Fuentes**: solo `var(--font-display|body|mono)` o `inherit`.
- Clases BEM en kebab-case (`bloque__elemento--modificador`), sin `!important`.

Los archivos que ya violaban estas reglas al activarlas están en la lista *legacy* del mismo archivo
(solo avisan). **Nunca se agregan archivos nuevos a esa lista**; al tocar uno de ellos, se migra y se
quita (deuda DT-02).

## 3. Componentes base (`front/src/components/ui/`) — reutilizar antes de crear

| Necesidad | Componente |
|---|---|
| Acción | `Button` (`variante`: `primary` · `outline` · `ghost` · `peligro`) |
| Etiqueta de estado / tipo | `Badge` |
| Diálogo | `Modal`; confirmación destructiva: `ConfirmDialog` (botón `peligro`) |
| Panel lateral de edición | `Drawer` |
| Flujo por pasos | `Wizard` |
| Tabla / paginación | `Table` + `Paginacion` (respuesta paginada `{ data, total, page, pageSize }`) |
| Filtros | `BotonFiltros`, `CascadingSelect`, `ChipInput` |
| Selección múltiple | `BotonSeleccionMultiple`, `SeleccionMultipleModal` |
| Sin datos | `EmptyState` |
| Notificación | `Toast` (vía `ToastContext`) |
| Archivos / imágenes | `ZonaArrastreArchivo`, `VisorImagenes` |

Un componente de dominio (`components/dominio/…`) **compone** componentes base; no vuelve a
estilizar botones, modales o tablas por su cuenta. Si un patrón se repite en dos dominios, se
propone como componente base.

## 4. Estados obligatorios de toda vista o componente con datos

1. **Cargando** (sin saltos de layout).
2. **Vacío** con `EmptyState` y la acción siguiente sugerida.
3. **Error** con mensaje en español entendible para el usuario (el `message` del backend, nunca un stack).
4. **Sin permiso**: ocultar (no deshabilitar) la acción si el usuario no puede ejecutarla; el backend siempre valida igual (ver `SEGURIDAD_PERMISOS.md`).
   - Ruta no permitida por URL: redirección al inicio del modo + `Toast` info "No tienes acceso a esa pantalla."
   - 403 de una acción: `Toast` error "No tienes permiso para esta acción." (texto estándar); no cierra la sesión ni el modal.
   - Un solo modo disponible: no se muestra `RoleSwitch`. Sin ningún modo: página `SinAcceso`.
   - Vista visible pero no editable (editor sin PLA005): `Badge` "Solo lectura" en la barra de acciones del editor.
5. **Acción destructiva**: `ConfirmDialog` con el nombre del elemento afectado.

## 5. Convenciones

- Un `.css` por componente, junto a su `.tsx`, con el nombre del componente como bloque BEM.
- Estilos inline solo para valores calculados en tiempo de ejecución (escala/posición del lienzo).
- Textos de UI en español, en tono directo y sin tecnicismos (“Guardar cambios”, no “Submit”).
- Accesibilidad mínima: botones con texto o `aria-label`, foco visible, contraste del DS.
- **Autor de una carga** (evidencias y adjuntos): siempre con `formatearAutor(numero, nombre)` de
  `front/src/utils/autorCarga.ts`. Con nombre se muestra `Nombre (#código)` (ej. `Juan López (#10234)`); sin
  nombre, `#código`; si el código no es numérico (fila heredada), tal cual. El nombre va en tipo título solo en la
  presentación (lo guardado no cambia) y siempre como texto, nunca como HTML. Donde se trunca con elipsis se agrega
  `title` con el texto completo; en el visor móvil (pie de `VisorImagenes`) no se trunca, envuelve.

## 6. Pendiente (deuda DT-04)

Todavía no hay tokens de **escala tipográfica** ni de **espaciado**. Mientras se definen, usar solo los
valores ya dominantes: texto `11px · 12px · 13px · 14px` (títulos con `--font-display`), espaciado
`4 · 8 · 12 · 16 · 24px`. Valores sueltos como `10.5px` o `9px` no se agregan en código nuevo.

## 7. Cómo cambia este documento

El agente disenador-ux escribe sus propuestas en la sección “Propuestas al sistema de diseño” de su
entregable (`02_ux.md`). En el cierre de `/desarrollo`, lo aprobado se incorpora aquí (y en
`tokens.css` o `.stylelintrc.json` si aplica); lo no aprobado queda en `DEUDA_TECNICA.md`.
