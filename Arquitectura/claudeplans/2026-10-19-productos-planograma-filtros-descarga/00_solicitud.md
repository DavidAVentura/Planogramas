# Solicitud — Filtros Área/Departamento y descarga en productos por planograma

- **Fecha**: 2026-10-19
- **Rama**: `feat/productos-planograma-filtros-descarga` · **Commit base**: `b34524e9bad7b0a1b23455ed95127a800fcb89e9`
- **Tamaño**: M — cambia una pantalla existente (productos por planograma) y su consulta en el back, con exportación de archivos (seguridad obligatoria)
- **Etapas**: arquitecto (1, 3) · disenador-ux · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

en la vista de productos por planograma, añadir el filtro área y Departamento, y también añadir el botón de descarga, descarga el listado de skus

un producto planograma versión por fila
habría una fila por modo de aparición como planograma , consolidado e impulso al igual que en la vista de productos por tienda

también al descargar, daría la opción de "Lista" en la que cada producto aparece una vez por cada planograma versión en la que aparece, también una fila por cada aparición cross o impulso en un planograma versión 

Pivote por versión 
aparece una fila por cada producto modo planograma, y aparecen tres bloques en horizontal, así como en el archivo de categorías excel que cargan en el planograma versión, aparece un bloque con la información TG, otro con la información TE y otro con la información TM
también como fila aparecerían los skus planograma cross que aparecen y la versión en la que se encuentra la información, un producto puede ser cross solo en la TG pero no en las otras, o inversa

## Contexto adicional

- Referencias: vista de productos por tienda (modos de aparición planograma / cross / impulso) y el Excel de categorías que se carga en la versión (bloques TG / TE / TM).

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| P1 ¿Fila producto–versión–modo en pantalla o solo descarga? | Solo la descarga; la tabla sigue con una fila por posición. |
| P2 ¿"Consolidado" = modo Cross? | Sí: modos Planograma, Cross, Impulso (como productos por tienda). |
| P3 Columnas de la Lista | Propuesta del arquitecto + Área y Departamento del producto (CATI). |
| P4 Bloques del Pivote | Mismas columnas y encabezados del Excel de categorías (`Facings_TG`…) para poder reimportar; orden de bloques igual al Excel de categorías (TG, TM, TE). |
| P5 Dos versiones del mismo planograma y tipo en el Pivote | Propuesta del usuario (aceptada): clave de fila del Pivote = SKU + planograma + **estado de la versión** + modo (p. ej. una fila piloto y otra publicada, cada una con sus bloques TG/TM/TE). Columna Estado entre las comunes. Si aun así hay dos versiones del mismo planograma + tipo + estado (p. ej. dos borradores TG) → aviso / 422 pidiendo quitar una. Versiones especiales de tienda: solo en la Lista, excluidas del Pivote. |
| P6 Filtros que respeta la descarga | Todos los de pantalla: versiones, Área/Departamento, búsqueda y filtros por columna. |
| P7 Formato | Solo `.xlsx`. |

## Cambios pedidos en la aprobación 1
