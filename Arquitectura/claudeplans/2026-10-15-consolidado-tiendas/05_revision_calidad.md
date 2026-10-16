# 05 — Revisión de calidad · Consolidado Tiendas

Diff revisado: `git diff 2a06094` + archivos nuevos sin seguimiento (excluida `claudeplans/`), contra
`PLAN.md`, `02_ux.md` y `04_implementacion.md`.

Verificación propia: `back npm test` → 181/181 OK · `front npm test` → 102/102 OK · `npx tsc -b` sin
errores · stylelint/oxlint sobre los archivos nuevos: 0 errores (solo el aviso conocido
`only-export-components` en `CadenaJerarquia.tsx:6` y `#fff` preexistente en `AppTopbar.css:7`).

En general la entrega es sólida: dominio puro sin Express/Knex, repositorio con columnas explícitas y
subconsulta común (sin listas de ids), validación estricta con pruebas de cada caso del plan, semáforo y
tope con pruebas, adaptador xlsx aislado y probado contra fórmulas, front con servicios → hooks →
componentes y descarte de respuestas obsoletas. Los hallazgos son puntuales.

## Hallazgos

### Importante

**I1 — AGREGADO suma en silencio un mín./máx. parcial cuando una versión "Varía"**
`back/src/domain/consolidado/consolidado.entity.js:320-331` (`sumarMinMaxAgregado`)
- Problema: si la fila de una versión tiene `minVaria`/`maxVaria`, `valorComun` deja `minFinal = null` y
  esa versión no se suma. La celda del Excel muestra un número que parece el total pero no lo es.
- Escenario: SKU en la tienda con versión A (mín. 4) y versión B con dos ubicaciones de mín. 2 y 3
  (→ Varía). La hoja "Min-Max agregado" muestra `4`; el total real es al menos 9. En la tabla y en
  DETALLADO la fila B dice "Varía", así que el agregado contradice a las demás vistas.
- D15 dice "`null` no suma", pero pensaba en un valor ausente, no en uno que varía.
- Corrección sugerida: si alguna fila que aporta tiene `minVaria` (o `maxVaria`), devolver `TEXTO_VARIA`
  en esa columna (la celda ya se tipa como texto en `celda()`), y agregar el caso a
  `consolidado.test.js`. Si el usuario prefiere otra regla (p. ej. sumar por ubicación), confirmarla
  antes de cambiar.

**I2 — Sin estados de carga ni error en las opciones de filtro: los modales mienten**
`front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx:107`, `front/src/components/dominio/consolidado/ConsolidadoFiltros/ConsolidadoFiltros.tsx:86-87, 253-271`
- Problema: la página solo lee `opciones` de `useFiltrosConsolidado`; ignora `cargando`, `error` y
  `recargar`. Mientras carga o si `/consolidado/tiendas/filtros` falla, `opciones` es `null` y la barra
  pasa listas vacías.
- Escenario: falla `/filtros` (o todavía no responde) y el analista abre "Planograma versión": ve
  `No hay versiones publicadas ni en piloto asignadas a tiendas.`, que es falso. El modal de tiendas
  queda vacío y los chips muestran ids sueltos (`Tienda: 7`). No hay forma de reintentar. Esto incumple
  la regla de `DISENO_SISTEMA.md` de tener siempre estados de carga, vacío y error.
- Corrección sugerida: pasar `cargando` y `error` a `ConsolidadoFiltros`. Mientras carga, deshabilitar
  los disparadores de tienda y versión (o abrir el modal con `cargando`, que `SeleccionMultipleModal` ya
  soporta). Con error, mostrar un aviso con `Reintentar` → `recargar`.

### Menor

**M1 — Texto de ganchos de exhibición distinto al del resto de la app y helper duplicado**
`front/src/domain/consolidado/columnasConsolidado.ts:390`, `back/src/domain/compartido/gancho.js:36-39`
- `textoGanchoConsolidado` repite `textoGancho` de `front/src/domain/ganchos/gancho.ts:36` y no da el
  mismo resultado: para un gancho de exhibición menor que 10, el lienzo y Por versión muestran `05E` y
  el consolidado (tabla y Excel) muestra `5E` (la forma canónica del back es `"5E"`).
- Corrección: en el front usar `textoGancho` de `domain/ganchos/gancho.ts`. En el back, dejar que
  `textoGancho` rellene también la exhibición (`String(numeroGancho(g)).padStart(2,'0') + 'E'`) y
  agregar `'5E' → '05E'` a `gancho.test.js`.

**M2 — El semáforo se toma después de cargar toda la base**
`back/src/domain/consolidado/consolidado.usecases.js:73-77`
- Si llegan dos exportaciones a la vez, las dos hacen las 7 consultas, construyen los grupos y filtran,
  y solo entonces la segunda recibe 503. El semáforo protege el event loop pero no la BD.
- Corrección: llamar a `intentarTomar()` al principio y envolver todo (base, conteo/422 y libro) en el
  `try/finally`. Las pruebas existentes de 422 y 503 siguen valiendo; agregar una que confirme que un 422
  libera el semáforo.

**M3 — Desviación no documentada en los limitadores**
`back/src/infrastructure/http/middlewares/rateLimit.js:37-38`
- `skipFailedRequests` + `requestWasSuccessful` (los 400 no gastan cupo) no está en el plan ni en
  `04_implementacion.md` → "Desviaciones". Es razonable y tiene prueba, pero hay que dejarla escrita en
  el contrato y en `ESTADO_MODULOS.md` (T23) para que seguridad la valide.

**M4 — La búsqueda dispara una petición extra al estar en una página mayor que 1**
`front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx:128-139`
- `cambiarFiltros({ busqueda })` vuelve a la página 1 en el momento, pero la búsqueda espera 300 ms. Desde
  la página 3, la primera tecla pide la página 1 con la búsqueda anterior y 300 ms después llega la
  petición buena. Las dos cuentan para el cupo de 60/min.
- Corrección: no reiniciar `page` en el `onChange` de la búsqueda. Reiniciarla en un efecto cuando cambia
  el valor ya retrasado (o retrasar el objeto de filtros completo).

**M5 — Hook dentro de una página**
`front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx:66-73`
- `useConRetardo` es un hook genérico definido en la página. Moverlo a `front/src/hooks/` para que se
  pueda reutilizar (Productos, Por versión) y siga la convención de `ESTRUCTURA_FRONTEND.md`.

**M6 — Chevron y badge repetidos en cada fila de un grupo duplicado**
`front/src/components/dominio/consolidado/ConsolidadoTable/ConsolidadoTable.tsx:275-297`
- Un grupo con 3 planogramas pinta 3 botones chevron (los 3 con el mismo `aria-controls` y la misma
  acción) y 3 badges `3 planogramas`. Con teclado y lector de pantalla son 3 controles idénticos.
- Corrección: dibujar chevron y badge solo en la primera fila principal del grupo.

**M7 — "Descargar" usa conteos viejos mientras el listado recarga**
`front/src/pages/ConsolidadoTiendas/ConsolidadoTiendas.tsx:289, 398-399`
- El botón solo depende de `!resumen`. Si se cambia un filtro y se abre el modal antes de que llegue la
  respuesta, `Filas estimadas` y la validación del máximo usan el resumen anterior (el 422 del servidor
  sigue protegiendo).
- Corrección: `disabled={!resumen || cargando}`.

**M8 — Un 429 del listado se muestra como problema de conexión**
`front/src/domain/consolidado/filtrosConsolidado.ts:249-256` (`detalleErrorListado`)
- Pasadas 60 peticiones por minuto, el estado de error dice `Revisa tu conexión e inténtalo de nuevo.`
- Corrección: si `error.status === 429`, mostrar `error.message` o un texto de espera, y agregar el caso
  a `filtrosConsolidado.test.ts`.

**M9 — Rango de diacríticos con caracteres invisibles**
`back/src/domain/consolidado/consolidado.entity.js:33`
- `/[̀-ͯ]/g` lleva combinantes literales que no se ven en el editor (y es fácil romperlos al editar).
  Usar `/[̀-ͯ]/g`.

**M10 — Aviso `only-export-components`**
`front/src/components/dominio/productos/CadenaJerarquia/CadenaJerarquia.tsx:6`
- Ya lo anotó el desarrollador. Mover `NIVELES_JERARQUIA` a `front/src/constants/productos.ts` lo resuelve
  sin cambiar el comportamiento.

## Criterios de aceptación aún sin verificar (no son defectos del código)

- T1: 017 sin aplicar en DEV (`migrate` → `rollback` → `migrate`, índices presentes).
- T8: volumen de DEV (~3 200 filas en < 2 s) sin medir.
- T13: la carpeta Postman `21 - Consolidado tiendas` no se corrió contra una API.
- Prueba manual de la "Verificación final": navegador, los 3 Excel abiertos en Excel, y Productos y Por
  versión sin regresiones (cadena de jerarquía, panel de columnas, modal de versiones).

Deben cerrarse antes de la aprobación final, aunque los hallazgos de arriba se corrijan.

## Deuda

Sin deuda nueva aparte de DT-39 a DT-46. Si M5 o M10 no se corrigen ahora, registrarlos con DT-46.

## Veredicto

**Requiere cambios** — 0 bloqueantes, 2 importantes (I1, I2) y 10 menores. I1 e I2 son correcciones
cortas. Los menores son opcionales; se recomiendan M1, M2 y M7.

## Ronda 1

Alcance: solo las correcciones de I1 e I2 (`04_implementacion.md` → "Correcciones ronda 1").
Verificación propia: `back npm test` → 183/183 OK · `npx tsc -b` sin errores · oxlint y stylelint sobre
los archivos tocados: 0 errores (los avisos de `BotonSeleccionMultiple.css:9` y `:35` ya existían).

### Estado de los hallazgos

- **I1 — Cerrado.** `sumarMinMaxAgregado` (`consolidado.entity.js:320-337`) marca `minVaria`/`maxVaria`
  por versión y devuelve `TEXTO_VARIA` solo en la columna afectada; la otra sigue sumando. `celda()` la
  tipa como texto. La prueba nueva (`consolidado.test.js:300`) cubre el escenario del hallazgo
  (A mín. 4 + B mín. 2 y 3 → `Varía`; máx. 6 + 6 → 12). La tabla del front no calcula el agregado, así
  que no hay otra copia de la regla que alinear.
- **I2 — Cerrado.** La página pasa `cargando`, `error` y `recargar` (`ConsolidadoTiendas.tsx:107, 330-332`).
  Mientras carga o si falló, los disparadores de tienda y versión están deshabilitados y los modales no se
  montan (`ConsolidadoFiltros.tsx:93, 139, 153, 272, 282`), así que ya no aparece el falso "No hay
  versiones…". Con error aparece un `role="alert"` con `Reintentar` que llama a `recargar`; el hook
  reinicia `error` y descarta la respuesta vieja. `BotonSeleccionMultiple` ganó `disabled` opcional (por
  defecto `false`), así que Productos y Por versión no cambian.

### Hallazgos nuevos introducidos por la corrección

**N1 (Menor) — El selector de versión deshabilitado parece activo**
`front/src/components/dominio/consolidado/ConsolidadoFiltros/ConsolidadoFiltros.css:69-98`
- `.consolidado-filtros__selector` no tiene estilo `:disabled`: mientras carga o si hubo error mantiene
  `cursor: pointer` y el fondo de `:hover`, a diferencia del botón de tiendas (que ya baja la opacidad).
  El clic no hace nada y no hay señal visual de por qué.
- Corrección: agregar `&:disabled { opacity: 0.6; cursor: not-allowed; }` y limitar el hover a
  `&:hover:not(:disabled)`, como en `BotonSeleccionMultiple.css`.

**N2 (Menor) — Mientras carga no hay indicio de carga, y con error los chips muestran ids**
`ConsolidadoFiltros.tsx:97-100, 196-210`
- Con preferencias guardadas y varias tiendas, mientras llega `/filtros` (o si falla) los chips muestran
  `7`, `12`… porque el nombre cae a `String(tid)`. Pasa poco y no engaña sobre los datos (el aviso de
  error lo explica), pero la carga solo se nota porque los disparadores están deshabilitados.
- Corrección opcional: `aria-busy` en la barra mientras carga, o un texto "Cargando…" en los disparadores.

Los menores M1–M10 de la ronda 0 siguen abiertos (no estaban en el alcance de esta ronda). M3 queda
superado por el cambio de seguridad (`validarQuery` → limitador), que falta reflejar en el contrato y en
`ESTADO_MODULOS.md` (T23). Los criterios de aceptación sin verificar (T1, T8, T13 y la prueba manual en
navegador, que ahora incluye el aviso de error de `/filtros`) siguen pendientes.

### Veredicto

**Aprobado con menores** — 0 bloqueantes, 0 importantes; menores: 2 nuevos (N1, N2) y M1–M10 abiertos
(M3 superado). Se recomienda corregir N1 junto con M1, M2 y M7 si hay otra pasada.
