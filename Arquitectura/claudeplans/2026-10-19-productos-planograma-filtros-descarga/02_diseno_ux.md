# 02 — Diseño UX/UI: Área › Departamento y descarga en Productos por planograma

- **Etapa**: 2 (diseño) · **Fecha**: 2026-10-19 · Rol: **Analista** (ruta `/por-version`, página `ProductosPorVersion`).
- Referencias: `DISENO_SISTEMA.md`; patrón a copiar: Consolidado Tiendas (`DescargarConsolidadoModal`, botón "Descargar" con `IconoDescarga`, `CadenaJerarquia`, `mostrarToast`).
- Las "Preguntas resueltas" de `00_solicitud.md` mandan: la tabla **no** cambia de granularidad (P1); la descarga respeta versiones + jerarquía + búsqueda + filtros por columna (P6); solo `.xlsx` (P7).

## 1. Flujo del usuario

1. Entra por Productos → Por planograma (o "Ver productos" desde una versión / ficha de producto, que ya trae `?versiones=`).
2. Elige versiones (selector existente). Opcional: tienda (inventario).
3. Opcional: elige **Área** y luego **Departamento**. La tabla se recarga; el conteo del encabezado pasa a las filas filtradas.
4. Opcional: busca o filtra por columna (cliente, como hoy).
5. Pulsa **Descargar** → modal "Descargar productos por planograma" → elige **Lista** o **Pivote por versión** → **Descargar (.xlsx)**.
6. El navegador guarda el archivo; el modal se cierra y sale `Toast` de éxito. Vuelve a la misma pantalla sin perder filtros.
7. Error: el modal **permanece abierto** (422 de Pivote se muestra en el propio modal) o `Toast` de error (429/503/otros), igual que el consolidado.

El Implementador (`ProductosVersiones` compartido) no cambia: todo entra por la prop `controles`.

## 2. Estructura

Ubicación: `ContenidoPorVersion` en `front/src/pages/ProductosPorVersion/ProductosPorVersion.tsx`, dentro de `controles` (columna derecha de la cabecera, arriba de la nota de inventario).

```
Productos › Por planograma                         [Tienda (inventario) v]  [Descargar]
Productos por versión                              Jerarquía: [Área v] › [Departamento v]
12 productos · Ordenado por …                      Inventario en tienda … · solo lectura
                                                   (hint de filtro, solo con jerarquía activa)
[ Buscar ] [ Planograma versión ] ...  (barra de filtros existente, sin cambios)
[ resumen por versión ]
[ tabla ]
```

`controles` pasa a ser un contenedor `productos-por-version__controles` (flex, `flex-wrap: wrap`, `justify-content: flex-end`, `gap: 12px`) con dos filas:
- Fila 1: selector de tienda (existente) + botón Descargar.
- Fila 2: `CadenaJerarquia niveles={2}` + hint.

Razón de no tocar la barra de filtros: es de `ProductosVersiones` y la comparte el Implementador. Se mantiene el costo de cambio en un solo archivo de página.

Resumen por versión (no filtrado por jerarquía): con jerarquía activa se muestra, bajo la cadena, el texto de ayuda
`El resumen por versión muestra la versión completa; la tabla solo los productos de {Área} › {Departamento}.`
(`font-size: 12px`, `--fg-3`, clase `productos-por-version__hint`, `role="note"` implícito vía `<p>`). Los nombres vienen del segundo argumento de `onChange` de `CadenaJerarquia`. Sin jerarquía, no se muestra.

## 3. Componentes

| Pieza | Componente | Notas |
|---|---|---|
| Filtro Área › Departamento | `CadenaJerarquia` existente (`dominio/productos/`) con **prop nueva `niveles?: number`** (def. 5) | Recorta `NIVELES_JERARQUIA` a `slice(0, niveles)` y los cargadores. El consolidado y Productos no cambian. Estado local `jerarquia: FiltroJerarquia` y `nombres: string[]`; no va en la URL (igual que el consolidado). |
| Botón Descargar | `Button variante="outline"` con icono + texto "Descargar" | Copiar el `<span>` con icono del consolidado. `IconoDescarga` hoy es una función local de `ConsolidadoTiendas.tsx`: **extraer a `ui/IconoDescarga`** o `dominio/compartido` y usarla en ambos (ver §8). Deshabilitado si no hay versiones elegidas (`idsEnUrl.length === 0`) o `productos` aún sin cargar; con `title`: "Elige al menos una versión para descargar." |
| Modal | **Nuevo** `dominio/implementacion/DescargarProductosVersionModal/` | No alcanza `DescargarConsolidadoModal`: opciones, textos y avisos son distintos (sin hojas ni columnas visibles, con aviso de Pivote no aplicable). Compone `Modal` (`ancho="lg"`) + `Button`. Misma estructura de tarjetas radio que el consolidado, con CSS propio por BEM (`descargar-productos-version__*`), copiando valores de tokens. |
| Selector de formato | tarjetas radio en `role="radiogroup"` | Igual al consolidado. |
| Avisos | párrafo `role="alert"` (error) y `role="status"` (aviso informativo) | Mismo estilo que `descargar-consolidado__error`. |

Props del modal:

```ts
interface DescargarProductosVersionModalProps {
  abierto: boolean;
  onClose: () => void;
  versiones: VersionResumen[];       // elegidas, con codigo, nombre del planograma, tipo, estado
  jerarquiaNombres: string[];        // para resumir el alcance; [] si no hay
  hayFiltrosCliente: boolean;        // búsqueda o filtros por columna activos
  generando: boolean;
  errorServidor: string | null;      // 422 PIVOTE_NO_APLICABLE / TOPE, mostrado dentro del modal
  onDescargar: (formato: 'LISTA' | 'PIVOTE') => void;
}
```

Se monta solo abierto (cada apertura vuelve a "Lista"), como el consolidado.

### Contenido del modal

Título: **Descargar productos por planograma**.

Tarjetas:
1. **Lista** (por defecto) — "Una fila por SKU, versión y modo de aparición (planograma, cross o impulso). Un SKU aparece una vez por cada versión en la que está; si está en planograma y en cross de la misma versión, son dos filas."
2. **Pivote por versión** — "Una fila por SKU, planograma, estado de la versión y modo. Tres bloques en horizontal (TG, TM y TE) con los mismos encabezados del Excel de categorías (por ejemplo `Facings_TG`), para poder volver a cargarlo. Las versiones especiales de tienda no se incluyen."

Resumen (caja `--ink-50`, como el consolidado):
- `Versiones: {n} · {código}, {código}…` (máx. 3 códigos y "y {k} más").
- `Alcance: {Área} › {Departamento}` o `Alcance: todas las áreas y departamentos`.
- Si `hayFiltrosCliente`: `Se aplican la búsqueda y los filtros de columna de la tabla.`
- Si no hay: `La búsqueda y los filtros de columna se aplican si los usas; ahora no hay ninguno.` → simplificar a no mostrar nada cuando no hay.
- No hay "filas estimadas" (la tabla tiene una fila por posición, el archivo otra granularidad; no se promete un número). Alternativa descartada: calcular en cliente, daría cifras engañosas.

## 4. Estilo (tokens)

- Texto: títulos de tarjeta 14px/700 `--fg-1`; descripciones 13px `--fg-2`; resumen 13px `--fg-2` sobre `--ink-50`; hint 12px `--fg-3`. Espaciado 4/8/12/16px (usar 12 y 16 donde el consolidado usa 10/14, para cumplir la escala de la sección 6; no copiar literalmente `10px`, `14px`, `3px`, `6px`).
- Tarjeta: `border: 1px solid var(--border)`, `--radius-md`, fondo `--white`; elegida: borde `--cemaco-indigo`, fondo `--cemaco-indigo-50`. Foco del radio: el del navegador/DS.
- Error: fondo `--danger-bg`, texto `--danger`, 13px/600, `--radius-md`. Aviso informativo (Pivote no aplica antes de pedir): `--warning-bg` / `--warning` si existen en `tokens.css` (verificar con Grep al implementar; si no, usar el estilo de `.productos-versiones__advertencia`).
- Enlace/botón texto: `--cemaco-indigo`, hover `--cemaco-indigo-50`.
- Spinner: igual que `descargar-consolidado__spinner` con `currentcolor`, `border-radius: 50%` y `prefers-reduced-motion`.
- `select` de la cadena: ya estilizados por `CadenaJerarquia.css`; no se reestiliza.
- No usar `#fff` (hay uno heredado en `ProductosPorVersion.css`, ver §9; en lo que se toque en ese archivo, cambiar a `var(--white)`).

## 5. Estados

| Estado | Comportamiento / texto exacto |
|---|---|
| Cargando jerarquía | `CadenaJerarquia` ya muestra `Cargando…` en el select del nivel. |
| Cargando tabla con jerarquía nueva | Conteo del encabezado: `Cargando…`; la tabla conserva su estado de carga existente. |
| Tabla vacía por jerarquía | `EmptyState` de la tabla con título `Ningún producto de las versiones elegidas pertenece a esa jerarquía` y hint `Prueba con otra área o departamento, o quita la jerarquía.` (se distingue del vacío actual "Las versiones elegidas no tienen productos" cuando hay jerarquía; `vacio` se calcula en la página). |
| Error de jerarquía en CATI (503 en listado) | Mensaje de error existente de la tabla con `message` del backend; si no hay: `No se pudo consultar la jerarquía. Intenta de nuevo en unos minutos.` y la jerarquía elegida se conserva. |
| Descargar sin versiones | Botón deshabilitado, `title` "Elige al menos una versión para descargar." |
| Pivote no aplicable (aviso previo, mismo regla que el back) | La tarjeta Pivote **no se deshabilita**: se puede elegirla, pero el botón Descargar se deshabilita y se muestra `role="alert"`. Textos: sin tipo → `El Pivote necesita que todas las versiones tengan tipo (TG, TM o TE). Sin tipo: {códigos}.` Duplicadas → `Hay dos versiones del mismo planograma, tipo y estado: {código} y {código} ({planograma}, {tipo}). Quita una para descargar el Pivote.` La Lista sigue disponible. Nota: según P5 la clave incluye el estado, así que solo bloquea cuando coinciden planograma + tipo + estado. Versiones especiales de tienda: nota informativa `Las versiones especiales de tienda no se incluyen en el Pivote: {códigos}.` (`role="status"`, no bloquea). |
| Descarga en curso | Botón `Generando…` con spinner, cancelar y radios deshabilitados, el modal no cierra (Esc y clic fuera ignorados). |
| Éxito | Cierra el modal; `Toast` success `Descarga lista: {archivo}`. |
| 422 `PIVOTE_NO_APLICABLE` (el back lo detecta aunque el front no) | En el modal, `role="alert"`: `El Pivote no se puede generar con estas versiones. Revisa que cada una tenga tipo y que no haya dos del mismo planograma, tipo y estado.` |
| 422 `EXPORTACION_DEMASIADO_GRANDE` | En el modal: `La descarga tendría {filas} filas y el máximo es {maximo}. Elige menos versiones o filtra por Área y Departamento.` |
| 429 | `Toast` error: `Hiciste muchas descargas seguidas. Espera un minuto e intenta de nuevo.` |
| 503 `EXPORTACION_EN_CURSO` | `Toast` error: `Hay otra descarga en curso. Intenta de nuevo en unos segundos.` |
| 503 CATI | `Toast` error: `No se pudo consultar la jerarquía en CATI. Intenta de nuevo en unos minutos.` |
| 404 versiones | `Toast` error: `Alguna de las versiones elegidas ya no existe. Vuelve a elegirlas.` |
| 403 | `Toast` error estándar: `No tienes permiso para esta acción.` (no cierra el modal). Sin permiso de analista la ruta ya no es accesible; no se agrega ocultamiento extra. |
| 500 / red | `Toast` error: `No se pudo generar el archivo. Intenta de nuevo.` |
| Confirmación destructiva | No aplica (solo lectura). |

Reutilizar `mensajeErrorDescarga` del consolidado como patrón: crear `mensajeErrorDescargaPorVersion(err)` en `domain/implementacion/descargaPorVersion.ts` con estos textos.

## 6. Accesibilidad

- `CadenaJerarquia` ya expone `role="group"` con `aria-label="Jerarquía CATI"` y etiquetas ocultas por select. Con `niveles={2}` se mantiene.
- Botón Descargar con texto visible; el icono `aria-hidden`. Deshabilitado con `title` y `aria-describedby` no necesario.
- Modal: `Modal` base gestiona foco y Esc; durante `generando` Esc no cierra. Al abrir, foco en la tarjeta elegida (radio Lista). Al cerrar, devolver foco al botón Descargar.
- `radiogroup` con `aria-label="Formato de la descarga"`; cada radio con `aria-labelledby` al título y `aria-describedby` a la descripción.
- Errores con `role="alert"`; avisos informativos con `role="status"`; el botón Descargar referencia el alert con `aria-describedby` cuando está deshabilitado por aviso.
- Teclado: flechas entre radios, Tab hasta Descargar, Enter lo activa. Hint de jerarquía accesible como texto normal.
- Anuncio de fin de descarga: el `Toast` ya es `aria-live` en la app.

## 7. Consistencia

- Copiar de **Consolidado Tiendas**: botón "Descargar" `outline` con icono, tarjetas de formato, caja de resumen, estado "Generando…", toast de éxito `Descarga lista: …`, `CadenaJerarquia` con estado local.
- Copiar de **Por planograma** actual: selector de tienda como campo de `controles` (misma altura 36px, `--radius-md`).
- Diferencias deliberadas: no hay "Elegir columnas" ni "filas estimadas" (columnas fijas por formato, ver 01 §7).

### Diseño del libro Excel (para el desarrollador y el revisor)

- **Lista** (hoja `Lista`): fila 1 encabezados fijos, congelada; autofiltro si `libroXlsx` lo soporta; anchos según tipo de dato: SKU 14, Producto 36, Planograma 28, Versión 18, Tipo 8, Estado 14, Modo 12, ubicaciones 14, numéricas 12, Observaciones 40.
- **Pivote por versión**: fila 1 de grupo con título `TG`, `TM`, `TE` sobre su bloque (en ese orden, P4) y fila 2 con los encabezados del Excel de categorías (`Facings_TG`, …). Columnas comunes (SKU, Producto, Planograma, **Estado**, Modo, SKU sustituto) con la fila de grupo vacía. Paneles congelados tras las columnas comunes y las dos filas de encabezado. Fondos de grupo por bloque con un único color de la paleta del libro (si `libroXlsx` admite estilos, alternar tonos `--ink-50`/blanco por bloque para legibilidad; los libros no usan tokens CSS, tomar los mismos valores hex ya definidos en `libroXlsx.js`, sin inventar nuevos).
- Texto siempre como texto (la seguridad ya está en `libroXlsx.js`).

## 8. Propuestas al sistema de diseño

| Propuesta | Impacto | Esfuerzo |
|---|---|---|
| Extraer `IconoDescarga` (hoy local de `ConsolidadoTiendas.tsx`) a `ui/` y usarlo en consolidado y por planograma. | Bajo, evita copia | Bajo |
| Extraer a `ui/ModalDescarga` el esqueleto compartido de tarjetas de formato + resumen + error + "Generando…" que hoy duplican `DescargarConsolidadoModal` y el nuevo modal. Aprobar tras este cambio si se confirma la duplicación (regla de dos dominios). | Medio | Medio |
| Añadir prop `filtrosExtra?: ReactNode` a `ProductosVersiones` que renderice en `productos-versiones__barra`, junto a Buscar y Planograma versión: ubicaría la jerarquía en la barra de filtros donde el usuario ya busca, en vez de en la cabecera. No aplicado ahora para no tocar el compartido con el Implementador. | Medio | Bajo |
| Token de escala de espaciado (`--space-1…5`) y regla de stylelint de literales de `px` en `padding/gap` (DT-04). | Alto | Medio |

## 9. Deuda detectada

- `front/src/pages/ProductosPorVersion/ProductosPorVersion.css:15` y `front/src/components/dominio/implementacion/ProductosVersiones/ProductosVersiones.css` (`.productos-versiones__barra`, `#fff`): colores literales `#fff` en lugar de `var(--white)`; `border-radius: 6px` literal en `.productos-versiones__enlace`. Al tocar `ProductosPorVersion.css` se migra el suyo; el de `ProductosVersiones.css` queda como deuda (DT-02 / lista legacy).
- `DescargarConsolidadoModal.css` usa `10px`, `14px`, `3px`, `6px` de espaciado fuera de la escala 4/8/12/16/24 (DT-04). No se replican en el modal nuevo.
- `IconoDescarga` duplicable (propuesta §8).
- `ProductosVersiones.tsx` línea ~353 tiene una línea con espacios en blanco al final; cosmético.

## 10. Resumen de piezas nuevas

- **Componente nuevo**: `dominio/implementacion/DescargarProductosVersionModal/` (`.tsx` + `.css`).
- **Prop nueva**: `CadenaJerarquia` → `niveles?: number`.
- **Clases nuevas** en `ProductosPorVersion.css`: `productos-por-version__controles`, `productos-por-version__hint`.
- **Tokens nuevos**: ninguno (solo verificar existencia de `--warning-bg` y `--warning`).
