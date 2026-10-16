# Solicitud — Consolidado Tiendas (Mantenimiento)

- **Fecha**: 2026-10-15
- **Rama**: `feat/consolidado-tiendas` · **Commit base**: `2a06094d998b8f8e61918f1fb1b059dc1d3317d2`
- **Tamaño**: L — vista nueva con consulta transversal (planogramas → versiones → asignaciones a tiendas → posiciones), endpoint nuevo y alcance por permisos/tienda.
- **Etapas**: arquitecto (1) → disenador-ux (prototipo en el artifact de diseño) → ✋ revisión del prototipo por el usuario → arquitecto (1 actualizado si hace falta) · disenador-ux · seguridad-integridad (2) → arquitecto (3) → ✋ aprobación 1 → desarrollador → revisor-calidad + seguridad (5) → ✋ aprobación 2

> Variante del flujo pedida por el usuario: antes de planear, el diseñador UX prototipa la vista en el
> artifact de diseño (https://claude.ai/artifact/Fts1Mb1NXDCGQnb7ramEKv) y el usuario la revisa. Con
> el prototipo aprobado se recorre el flujo completo de `/desarrollo`.

## Solicitud del usuario

debemos añadir una nueva vista, esta es Consolidado Tiendas, esta vista formará parte de la sección Mantenimiento,

el objetivo de esta, es contar con un consolidado en el que se encuentre el listado de todos los productos encontrados en todos los planogramas, se mostrarán combinaciones SKU - TIENDA, la lista se obtendrá de los productos asignados a cada tienda por la estructura, allí se mostrará el sku, información del sku, tienda, versión implementada, información de montaje, min max, y todas las columnas de la vista por versión, igual con la opción de reordenar, mostrar ocultar las columnas que el usuario necesite, a nivel de fila, será una fila por cada producto sku en modo planograma

y al dar clic sobre ese producto se mostrará y desplegará sub filas, que aparecerán o detallarán si para esa tienda el producto también aparece como cross o como impulso

si un producto tiene más de una aparición como planograma, dejar las filas juntas, una arriba del otro y pintarlas en color rojo suave

esta vez, se ejeuctará con el flujo desarrollo pero en el flujo añade al diseñador ux/ui, para que pueda hacer el prototipo de estas vistas en el artefacto del prototipado

luego me preguntas, yo revisaré la vista en el prototipo y luego con ese aprobar se diseña el plan de implementación pasando por todo el flujo de desarrollo otra vez

## Contexto adicional

- Artifact de diseño (canvas): https://claude.ai/artifact/Fts1Mb1NXDCGQnb7ramEKv
- Referencia de columnas: la vista de SKU por versión (módulo 19) con columnas reordenables y ocultables.

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Qué es "Mantenimiento"? | Grupo nuevo en la barra lateral; por ahora solo contiene Consolidado Tiendas. |
| Agrupar Por versión y Consolidado (2026-10-16) | Solo en el menú: grupo "Productos" con "Por versión" y "Por tienda"; páginas y rutas sin cambios; Accesorios se queda en Mantenimiento. |
| ¿Qué representa cada fila en modo planograma? | Una fila por SKU–tienda–versión (las ubicaciones de la misma versión se suman, como el módulo 19). Solo se duplica —filas juntas en rojo suave— si el SKU está en más de un planograma/versión en la tienda. |
| SKU que en la tienda solo aparece como cross o impulso | Se muestra igual: fila principal marcada "sin planograma"; al expandir se ven sus cross/impulso. |
| ¿Qué versiones entran? | Publicada + piloto (con columna de estado de la versión). |
| Inventario por tienda, exportar a Excel | Pendiente: se decide en la etapa de plan, después del prototipo. |

| Min/Max agregado: ¿qué más se suma? (2026-10-16) | También el mín. estético y la capacidad máxima, con sumatoria de planograma + cross + impulso. |
| Min/Max agregado: ¿columnas de montaje desde la fila de planograma? | Sí, pero siempre según las columnas visibles en el selector de columnas y en el orden puesto allí. |
| SKU en dos planogramas con un filtro que deja visible solo una fila: ¿sigue en rojo? | Sí, sigue en rojo (el duplicado se calcula sin importar los filtros). |
| Filtro Planograma–versión | Reutilizar el componente existente `SeleccionVersionesModal` ("Filtrar por planograma versión"), no extender `SeleccionPlanogramasModal`. |

| Filtro de jerarquía | Jerarquía CATI de 5 niveles (Área → Departamento → Familia → Categoría → Subcategoría) exactamente como en Productos: un valor por nivel, se usa el más específico, SKUs del nivel resueltos en vivo contra CATI (`GET_productos_listar.md`). Es la única excepción a "todos los filtros multiselección". |

## Cambios pedidos en la revisión del prototipo

Ronda 1 (2026-10-15):
- Agregar la opción para elegir "Mostrar solo cross" o "Mostrar solo impulso". Con esa opción se
  listan solo las filas de ese tipo, sin la fila de planograma: dejan de ser sub-filas y se muestran
  como filas principales.
- Los productos cross e impulso tienen las mismas columnas que los de planograma. Se muestran con las
  mismas columnas que la fila de planograma, también cuando aparecen como sub-fila.

Ronda 2 (2026-10-15), texto del usuario:
> añade el modo extendido para ocultar todo lo que no es necesario y aprovechar todo el espacio disponible
> y también un botón Descargar, que tiene el ícono de descarga y aparece un modal para los ajustes de la descarga, de momento tendrá las opciones para descargar detallado que descarga una fila para el sku tienda, una fila para los cross, una fila para los impulso,
> para descargar min max agregado, que es una sola fila por cada sku tienda, y el min max se suma el del planograma + el min max de cross + min max de impulso
> y para descargar hojas separadas, en una hoja los productos - tienda planograma, en otra hoja los de impulso, en otra hoja los de cross,
> con un selector para elegir cuál de los tres, o dos de tres o los tres

Interpretación del coordinador: el selector "uno, dos o los tres" elige qué hojas (planograma, impulso,
cross) incluye la descarga en hojas separadas.

Ronda 3 (2026-10-15), texto del usuario:
> el filtro de tiendas y el filtro de planogramas deben ser los que son de tipo modal que hemos hecho antes, el de planogramas es filtro a nivel planograma version, y todos son seleccionar varios

Ronda 3, adición del usuario sobre la descarga:
> la descarga de los archivos, en el archivo excel descargado, se descargan solo las que el usuario le dio mostrar en el selector de columnas, esas mismas son las columnas que al usuario le descarga en el excel

Interpretación del coordinador: aplica a los tres formatos (también Min/Max agregado, que ya no usa
columnas fijas).

**Prototipo aprobado por el usuario el 2026-10-15** (canvas versión 79, artboard
`ConsolidadoTiendas.dc.html`; copia de trabajo en el scratchpad de la sesión, especificación en
`02_ux.md`). Se sigue con el flujo completo: arquitecto (1 actualizada) → seguridad (2) → arquitecto (3).
Pregunta 18 de `02_ux.md` sin respuesta explícita: se asume que en Min/Max agregado un SKU sin
planograma en la tienda deja vacías las columnas de montaje.

## Cambios pedidos en la aprobación 1

