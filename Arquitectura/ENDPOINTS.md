# Directorio de Endpoints — API Planogramas Cemaco

Inventario de todos los endpoints a desarrollar en el backend REST. Los endpoints están organizados
por recurso. Las rutas usan el prefijo base `/api/v1`.

Para cada endpoint se indica: método HTTP, ruta, actor(es) que lo consumen, caso de uso de
referencia y descripción funcional.

Los contratos detallados (request/response bodies, códigos de error, ejemplos) se documentarán
por separado en archivos de contrato individuales.

---

## 1. Planogramas

Gestión del planograma como entidad raíz: creación, edición, listado y archivado.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/planogramas` | Analista / Implementador | A | CU-01-04 | Lista planogramas. Admite filtros por `departamento`, `categoria` y `estado`. Paginado. |
| `POST` | `/planogramas` | Analista | A + PLA002 | CU-01-01 | Crea un nuevo planograma con nombre, departamento y subcategorías de referencia. |
| `GET` | `/planogramas/{id}` | Analista / Implementador | A | CU-01-05 | Retorna el detalle completo de un planograma: metadatos, subcategorías de referencia y resumen de versiones. |
| `PATCH` | `/planogramas/{id}` | Analista | A + PLA003 | CU-01-02 | Modifica nombre, departamento o subcategorías de referencia. Solo acepta los campos enviados (partial update). |
| `POST` | `/planogramas/{id}/archivar` | Analista | A | CU-01-03 | Marca el planograma como `archivado`. No elimina datos. |

---

## 2. Versiones

Ciclo de vida de una versión de planograma: creación, promoción de estado y asignación a tiendas.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/planogramas/{id}/versiones` | Analista | A | CU-02-06 | Lista todas las versiones de un planograma con su estado, tipo y tiendas asignadas. |
| `POST` | `/planogramas/{id}/versiones` | Analista | A + PLA004 | CU-02-01 / CU-02-02 | Crea una nueva versión. Si lleva `version_base_id`, crea una versión especial por tienda derivada de esa base. |
| `GET` | `/versiones/{id}` | Analista / Implementador | A | CU-01-05 | Retorna el detalle completo de una versión: góndolas, niveles y posiciones anidadas. |
| `PATCH` | `/versiones/{id}` | Analista | A + PLA005 | — | Modifica metadatos de la versión (notas, código). |
| `POST` | `/versiones/{id}/promover` | Analista | A | CU-02-03 / CU-02-04 | Avanza el estado de la versión al siguiente (`en_desarrollo` → `piloto` → `publicado`). El body indica tiendas piloto cuando el estado destino es `piloto` (se aceptan tiendas de otro tipo que la versión; el front solo avisa) y acepta `motivo` opcional (≤500) que queda como motivo de la edición auditada. Publicar responde `422` si la versión en piloto no tiene tiendas o si tiene errores bloqueantes (`details` con la lista). Si la versión es de línea base, cada paso archiva automáticamente la versión base que ocupaba el estado destino para el mismo planograma+tipo (piloto anterior al promover a piloto, publicada anterior al promover a publicado); las versiones especiales por tienda no archivan ninguna anterior. Mueve tiendas y lo audita: a piloto, las tiendas piloto desmontan su versión; a publicado, las tiendas piloto quedan con esta publicada y las de la publicada anterior pasan a esta (ver sección 15). |
| `POST` | `/versiones/{id}/archivar` | Analista | A | CU-02-07 | Marca la versión como `archivado` directamente, sin esperar a que otra versión la reemplace. Solo permitido desde `borrador`, `en_desarrollo` o `piloto` — una versión `publicado` solo se archiva automáticamente cuando otra la reemplaza (ver `/promover`). |
| `GET` | `/versiones/{id}/tiendas` | Analista | A | CU-02-05 | Lista las tiendas asignadas a una versión. |
| `PUT` | `/versiones/{id}/tiendas` | Analista | A + PLA001 | CU-02-05 | Reemplaza el listado completo de tiendas asignadas a la versión. Si está publicada o en piloto, cada tienda agregada desmonta la versión que tenía del planograma, y se audita (ver sección 15). |
| `GET` | `/versiones/{id}/publicacion/simular` | Analista | A | CU-02-04 | Simula publicar una versión en piloto sin escribir nada: errores bloqueantes, versión anterior que se archivaría, tiendas piloto, tiendas que migran desde la publicada anterior del mismo tipo y total de tiendas (unión sin repetir). Responde `200` aun con errores bloqueantes; `422` si la versión no está en piloto. Usa la misma función de solo lectura (`calcularPlanPublicacion`) que la publicación real. |
| `GET` | `/versiones/{id}/resumen` | Analista | A | CU-02-06 | Ficha de solo lectura para "Ver versión" en Estructura: datos de versión y planograma, conteos de estructura (productos, posiciones por modo, góndolas, niveles, metros lineales) y tiendas que la montan. |
| `PATCH` | `/versiones/{id}/guardar` | Analista | A | CU-06-01 | Persiste el estado actual del planograma sin cambiar su estado. Partial update de posiciones, góndolas y niveles en un solo request. |
| `GET` | `/versiones/{id}/validar-publicacion` | Analista | — | CU-06-02 | Verifica que la versión no tiene errores bloqueantes antes de publicar. Retorna lista de errores/advertencias. |
| `GET` | `/versiones/{id}/estructura` | Analista / Implementador | A | CU-07-01 | Retorna la versión completa con góndolas, niveles y posiciones anidadas en un solo response. Acepta query param `?vistaImplementador=true` para filtrar campos de edición. |
| `GET` | `/versiones/{id}/capacidad` | Analista | — | CU-04-07 | Retorna el espacio disponible por nivel en la versión. Usado para refrescar la vista de capacidad tras operaciones de movimiento o copia. |

---

## 3. Góndolas

Alta, edición, reordenamiento y eliminación de góndolas dentro de una versión.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/versiones/{id}/gondolas` | Analista | A | CU-01-05 | Lista las góndolas de una versión ordenadas por `orden`. |
| `GET` | `/gondolas/{id}` | Analista | A | CU-03-02 | Retorna el detalle completo de una góndola: nombre, medidas, posición en tienda. |
| `GET` | `/gondolas/{id}/resumen` | Analista | A | CU-03-04 | Retorna nombre de la góndola y conteos de niveles y posiciones. Usado antes del diálogo de confirmación de eliminación. |
| `POST` | `/versiones/{id}/gondolas` | Analista | A + C | CU-03-01 | Agrega una góndola a la versión con nombre, medidas y posición en tienda. |
| `PATCH` | `/gondolas/{id}` | Analista | A + C | CU-03-02 | Modifica nombre, medidas o posición en tienda de una góndola. |
| `PATCH` | `/versiones/{id}/gondolas/reordenar` | Analista | A + C | CU-03-03 | Reordena las góndolas de la versión. El body envía el array de IDs en el nuevo orden. |
| `DELETE` | `/gondolas/{id}` | Analista | A + C | CU-03-04 | Elimina una góndola. Retorna `409 Conflict` si tiene niveles con posiciones asignadas, a menos que el cliente envíe el flag `forzar=true`. |

---

## 4. Niveles

Alta, edición, reordenamiento y eliminación de niveles dentro de una góndola.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/gondolas/{id}/niveles` | Analista | A | CU-01-05 | Lista los niveles de una góndola ordenados de abajo hacia arriba (`orden` ascendente). |
| `GET` | `/niveles/{id}` | Analista | A | CU-03-06 | Retorna el detalle de un nivel: orden, altura, accesorio principal, ancho disponible. |
| `GET` | `/niveles/{id}/resumen` | Analista | A | CU-03-08 | Retorna nombre del nivel y conteo de posiciones. Usado antes del diálogo de confirmación de eliminación. |
| `POST` | `/gondolas/{id}/niveles` | Analista | A + C | CU-03-05 | Agrega un nivel a la góndola con orden, altura, tipo de accesorio y tamaño. |
| `PATCH` | `/niveles/{id}` | Analista | A + C | CU-03-06 | Modifica altura, accesorio principal, ancho disponible u otras propiedades del nivel. |
| `PATCH` | `/gondolas/{id}/niveles/reordenar` | Analista | A + C | CU-03-07 | Reordena los niveles de la góndola. El body envía el array de IDs en el nuevo orden. |
| `DELETE` | `/niveles/{id}` | Analista | A + C | CU-03-08 | Elimina un nivel. Retorna `409 Conflict` si tiene posiciones, a menos que el cliente envíe `forzar=true`. |

---

## 5. Posiciones

Gestión de posiciones (SKUs) dentro de un nivel: alta, edición, movimiento, copia y eliminación.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/niveles/{id}/posiciones` | Analista | A | CU-01-05 | Lista las posiciones de un nivel ordenadas por `orden_horizontal`. Incluye capacidad disponible restante del nivel. |
| `GET` | `/posiciones/{id}` | Analista | A | CU-04-02 | Retorna el detalle completo de una posición para el panel de edición del Analista. |
| `POST` | `/niveles/{id}/posiciones` | Analista | A + C | CU-04-01 | Agrega una posición al nivel asignando SKU y facings (o ancho asignado). Retorna `422` si el nivel queda en desborde sin el flag de confirmación. |
| `PATCH` | `/posiciones/{id}` | Analista | A + C | CU-04-02 | Modifica atributos de la posición: facings, cantidad apilable, unidades por facing, perfil de redondeo, modo (`PLANOGRAMA`, `CROSS`, `IMPULSO`, `PENDIENTE`), flags (cross, display, desborde) y observaciones. |
| `PATCH` | `/posiciones/{id}/mover` | Analista | A + C | CU-04-03 | Mueve la posición a otro nivel o a otro orden dentro del mismo nivel. El body especifica `nivel_id_destino` y `orden_destino`. |
| `POST` | `/posiciones/{id}/copiar` | Analista | A + C | CU-04-04 / CU-04-05 | Duplica la posición. El body especifica `nivel_id_destino` y `orden_destino`. |
| `DELETE` | `/posiciones/{id}` | Analista | A + C | CU-04-06 | Elimina una posición del nivel. |
| `GET` | `/posiciones/{id}/accesorios` | Analista | A | CU-04-09 | Lista los accesorios de montaje asignados a la posición. |
| `POST` | `/posiciones/{id}/accesorios` | Analista | A + C | CU-04-09 | Agrega un accesorio de montaje a la posición con nota libre. |
| `DELETE` | `/posiciones/{id}/accesorios/{accesorioId}` | Analista | A + C | CU-04-11 | Quita un accesorio de montaje de la posición. |
| `GET` | `/posiciones/por-sku` | Analista | A | CU-05-01 | Busca todas las posiciones de una versión que usan un SKU específico. Query params: `sku` (requerido) y `versionId` (requerido). |

---

## 6. Sustitución de SKUs

Flujo completo de sustitución: iniciar, confirmar y consultar historial.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/versiones/{id}/sustituciones` | Analista | — | CU-05-04 | Lista el historial de sustituciones de la versión: SKU original, sustituto, motivo, fecha y posiciones afectadas. |
| `POST` | `/versiones/{id}/sustituciones` | Analista | — | CU-05-01 / CU-05-03 | Ejecuta una sustitución: reemplaza el SKU original por el sustituto en las posiciones indicadas y registra el historial. El body incluye `sku_original`, `sku_sustituto`, `posicion_ids` y `motivo`. |

---

## 7. Exportación

Descarga del planograma completo en distintos formatos.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/versiones/{id}/exportar/json` | Analista | — | CU-06-03 | Retorna el planograma completo como JSON con estructura estable para integración externa. Content-type: `application/json`. |
| `GET` | `/versiones/{id}/exportar/csv` | Analista | — | CU-06-04 | Retorna el planograma como CSV con una fila por posición, compatible con análisis en Excel. Content-type: `text/csv`. |

---

## 8. Catálogo de productos

Búsqueda y consulta del catálogo de productos. La fuente de verdad de la búsqueda/detalle general
es CATI (API interna de Cemaco); esos 2 endpoints actúan como proxy/caché para el frontend. Las
dimensiones físicas, en cambio, tienen una porción de escritura LOCAL (tabla `Producto`, distinta
del proxy): un analista puede corregirlas a mano o validar las que ya trae CATI — ver los 2
endpoints `PATCH .../dimensiones*`, servidos por un módulo de dominio separado (`domain/producto/`,
no `catalogo`). Ese mismo módulo sirve la vista `/productos`: el listado de la tabla local con sus
apariciones en planogramas y el detalle de posiciones por SKU (`GET /catalog/productos` y
`GET /catalog/productos/{sku}/planogramas`). En ese listado el filtro por jerarquía se resuelve en
vivo contra CATI, nunca con columnas locales.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/catalog/productos/buscar` | Analista | A | CU-04-01 / CU-05-02 | Busca productos en CATI por SKU, nombre o marca (`q`) y/o `subcategoria`. Paginado con `page`/`pageSize` (máx. 50). Se puede navegar solo por `subcategoria` (sin texto de búsqueda) para el drill-down de jerarquía. |
| `GET` | `/catalog/productos` | Analista | A | CU-10-01 | Lista los productos de la tabla local con la cantidad de planogramas distintos (no archivados) en que aparecen, total y por modo (`PLANOGRAMA`/`CROSS`/`IMPULSO`). Filtro opcional por un nivel de jerarquía CATI (`area`, `departamento`, `familia`, `categoria`, `subcategoria`; se usa el más específico), resuelto pidiendo a CATI los SKUs de ese nivel. Sin paginar. |
| `GET` | `/catalog/productos/{sku}/planogramas` | Analista | A | CU-10-02 | Lista cada posición del producto en versiones no archivadas: planograma, versión, góndola, nivel, modo y tiendas asignadas a la versión. `404` si el SKU no existe localmente. |
| `GET` | `/catalog/productos/{sku}` | Analista | A | CU-04-02 | Retorna el detalle de un producto: dimensiones, imagen, precio, jerarquía, SKU sustituto sugerido, fuente de dimensiones y si están validadas. |
| `PATCH` | `/catalog/productos/{sku}/dimensiones` | Analista | A | CU-04-12 | Actualiza `ancho_cm`/`alto_cm`/`profundidad_cm` del producto local; marca `fuente_dimensiones='MANUAL'` y `dimensiones_validadas=true`. |
| `PATCH` | `/catalog/productos/{sku}/dimensiones/validar` | Analista | A | CU-04-13 | Marca `dimensiones_validadas=true` sin modificar las medidas; requiere que las tres sean mayores a 0 (`422` si no). |
| `GET` | `/catalog/productos/{sku}/stock` | Analista | A | CU-04-14 | Retorna el stock SAP del producto por centro (proxy a CATI, sin filtrar ni cachear). Arreglo vacío si no tiene inventario registrado. |
| `GET` | `/catalog/productos/{sku}/ficha-tecnica` | Analista | A | CU-04-15 | Retorna la ficha técnica del producto enriquecida por CATI, como pares `etiqueta`/`valor` (proxy a CATI, HTML traducido a texto plano, sin cachear). Arreglo vacío si no tiene ficha técnica registrada. |

---

## 9. Accesorios

Catálogo de accesorios de gondolería disponibles para asignar a niveles y posiciones.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/accesorios` | Analista | A | CU-03-05 / CU-04-09 | Lista todos los accesorios disponibles. Filtro opcional por `tipo` (GANCHO, BANDEJA, BARRA, CANASTA, OTRO). |
| `GET` | `/accesorios/{id}` | Analista | A | — | Retorna el detalle de un accesorio: código, tipo, dimensiones y notas de capacidad. |

---

## 10. Tiendas

Tiendas de la cadena: lookup para asignarlas a versiones de planograma y administración (alta, edición, activar/desactivar) desde la vista `/tiendas`.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/tiendas` | Analista | I | CU-02-05 | Lista las tiendas (por defecto solo activas; `estado=todos` incluye inactivas) con código, nombre, tipo (GRANDE, MEDIANA, EXPRESS), marca, estado y cantidad de versiones de planograma publicadas asignadas. |
| `POST` | `/tiendas` | Analista | A + PLA007 | CU-02-05 | Crea una tienda (queda activa). El código es único en la cadena. |
| `PATCH` | `/tiendas/{id}` | Analista | A + PLA008 | CU-02-05 | Edita los datos de una tienda y la activa/desactiva vía `estado`. Desactivar no toca sus asignaciones. |
| `GET` | `/tiendas/{id}/planogramas` | Implementador | I | CU-07-01 | Lista los planogramas activos de una tienda. Filtros: `departamento`, `estado` (por defecto `publicado`). |

---

## 12. Jerarquía

Consulta de la jerarquía de productos (Área → Departamento → Familia → Categoría → Subcategoría) desde CATI. El backend actúa como proxy autenticado; el frontend nunca llama a CATI directamente.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/jerarquia/areas` | Analista | A | CU-01-01 / CU-01-02 / CU-01-04 | Lista todas las áreas activas desde CATI. |
| `GET` | `/jerarquia/departamentos` | Analista | A | CU-01-01 / CU-01-02 / CU-01-04 | Lista departamentos de un área. Query param requerido: `area` (ID de área). |
| `GET` | `/jerarquia/familias` | Analista | A | CU-01-01 / CU-01-02 / CU-01-04 | Lista familias de un departamento. Query param requerido: `departamento` (ID de departamento). |
| `GET` | `/jerarquia/categorias` | Analista | A | CU-01-01 / CU-01-02 / CU-01-04 | Lista categorías de una familia. Query param requerido: `familia` (ID de familia). |
| `GET` | `/jerarquia/subcategorias` | Analista | A | CU-01-01 / CU-01-02 / CU-01-04 | Lista subcategorías de una categoría. Query param requerido: `categoria` (ID de categoría). El id resultante es el que se usa como filtro `subcategoria` en `GET /catalog/productos/buscar`. |

---

## 13. Sesiones de captura fotográfica *(fase siguiente — fuera del MVP)*

Endpoints del flujo de captura: iniciar sesión, subir fotos, confirmar propuesta del agente de visión.
Quedan listados como referencia para el diseño; no se desarrollarán en la iteración actual.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `POST` | `/sesiones-captura` | Analista | — | CU-08-01 | Inicia una sesión de captura asociada a una versión de planograma. Especifica tipo de flujo (CREACION / AUDITORIA), góndola objetivo (en auditoría) y filtro de jerarquía. |
| `GET` | `/sesiones-captura/{id}` | Analista | — | CU-08-01 | Retorna el estado actual de la sesión con sus fotos y propuesta. |
| `POST` | `/sesiones-captura/{id}/fotos` | Sistema | — | CU-08-03 | Registra una foto de módulo en la sesión. El body incluye la imagen en base64 o una URL temporal de storage. Retorna métricas de calidad calculadas en el backend y el flag `valida`. |
| `POST` | `/sesiones-captura/{id}/fotos/{fotoId}/retomar` | Sistema | — | CU-08-05 | Marca la foto como inválida y habilita el retake del módulo correspondiente. |
| `POST` | `/sesiones-captura/{id}/ejecutar-agente` | Sistema | — | CU-08-07 | Dispara el agente de visión (Claude Vision vía n8n) sobre las fotos validadas de la sesión. Genera las `DeteccionPropuesta`. Operación asíncrona; retorna un `job_id` para polling. |
| `GET` | `/sesiones-captura/{id}/propuesta` | Analista | — | CU-08-07 | Retorna la propuesta de detección completa: filas por nivel, SKU candidato, confianza y alternativas. |
| `PATCH` | `/sesiones-captura/{id}/propuesta/detecciones/{deteccionId}` | Analista | — | CU-08-08 | Acepta, edita o rechaza una detección individual de la propuesta. |
| `POST` | `/sesiones-captura/{id}/aceptar` | Analista | — | CU-08-08 | Confirma la propuesta completa y materializa las posiciones aceptadas en la versión de planograma asociada. |

---

## 14. Adjuntos

Archivos (imágenes, PDF o Excel, hasta 40MB) que el analista asocia a una versión de planograma — cada versión (TG/TM/TE, o especial por tienda) tiene su propio set de adjuntos, independiente de las demás. El binario vive en Azure Blob Storage, en un contenedor privado, y **no pasa por el backend**: el navegador sube y descarga directo contra Azure con URLs SAS de corta duración que firma el backend (subir = solicitar URL → `PUT` a Azure → confirmar). `blobUrl` sin SAS nunca se usa como link. Agregar, reemplazar y eliminar adjuntos se permite en cualquier estado de la versión (incluida publicada o archivada): son material de apoyo del analista, no parte del contenido versionado.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/versiones/{id}/adjuntos` | Analista | I | CU-09-02 | Lista los adjuntos de una versión, más recientes primero, con `subidoPor` y `subidoPorNombre`. |
| `POST` | `/versiones/{id}/adjuntos/subida` | Analista | A | CU-09-01 | Valida nombre/tipo/tamaño y devuelve la URL SAS (solo escritura, 30 min) para subir un adjunto nuevo directo a Azure. |
| `POST` | `/versiones/{id}/adjuntos` | Analista | A | CU-09-01 | Confirma el blob ya subido y crea el adjunto; registra código y nombre del autor desde el token (nunca del body). Body: `nombre_original`, `tipo_mime`, `blob_path`. Admitido en cualquier estado de la versión. |
| `POST` | `/adjuntos/{id}/subida` | Analista | A | CU-09-03 | URL SAS para subir el archivo de reemplazo de un adjunto. |
| `PUT` | `/adjuntos/{id}` | Analista | A | CU-09-03 | Confirma el blob de reemplazo, conservando el id del adjunto; el autor pasa a ser quien reemplaza. Mismo body que agregar. |
| `DELETE` | `/adjuntos/{id}` | Analista | A | CU-09-04 | Elimina un adjunto (fila + blob en Azure). Admitido en cualquier estado de la versión. |
| `GET` | `/adjuntos/{id}/url-descarga` | Analista / Implementador | I | CU-09-05 | URL SAS de solo lectura (5 min) para abrir (`modo=inline`) o descargar (`modo=attachment`) el archivo directo desde Azure. |

---

## 15. Asignaciones (vista Estructura)

Qué versión de cada planograma monta cada tienda. Regla: **una tienda monta una sola versión por planograma**, publicada (TG/TM/TE o su especial) o en piloto. Cada guardado es una edición auditada (`EdicionAsignacion` + `AsignacionAuditoria`, migración 010), con usuario, fecha, motivo y versión anterior/nueva.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/asignaciones` | Analista | A + PLA001 | CU-02-05 | Matriz: tiendas activas, planogramas con versiones publicadas o en piloto (con todas sus versiones no archivadas) y asignaciones montadas. Query opcional `incluirPlanogramaId`: incluye ese planograma aunque aún no tenga versiones publicadas ni en piloto (si no está archivado y tiene alguna versión no archivada); lo usa Estructura al promover a piloto la primera versión. |
| `POST` | `/asignaciones/ediciones` | Analista | A + PLA001 | CU-02-05 | Guarda un grupo de cambios de celda como una sola edición: montar una versión, clonar una especial publicada o quitar. Transaccional. |
| `GET` | `/asignaciones/historial` | Analista | A + PLA001 | CU-02-06 | Movimientos de una celda planograma × tienda, más reciente primero (manuales y automáticos). |

---

## 16. Implementación (consulta de productos)

Consultas del módulo `implementacion`: la vista Mi tienda del implementador y la vista Productos → Por planograma del analista. Contratos en `Contratos/16_implementacion/`. La vista del analista no tiene filtro por tienda del usuario (DT-10).

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/tiendas/{tiendaId}/implementacion` | Implementador | I | CU-07-01 | Resumen de implementación de la tienda (Mi tienda). |
| `GET` | `/tiendas/{tiendaId}/implementacion/productos` | Implementador | PRODUCTOS_TIENDA | CU-07-01, CU-07-02 | Una fila por posición con SKU de la tienda, con inventario. |
| `GET` | `/implementacion/versiones` | Analista | A | CU-10-05 | Versiones elegibles para la vista Por planograma. |
| `GET` | `/implementacion/productos` | Analista | A | CU-10-05 | Una fila por posición con SKU para las `versionIds` (1–50); `tiendaId` opcional (agrega inventario); `area`/`departamento` opcionales (jerarquía CATI; `departamento` exige `area`; código inexistente → `400`; CATI caído → `503`) que acotan `data` y `total` (`versiones[]` queda completo). Limitador 60/min por usuario. |
| `POST` | `/implementacion/productos/exportar` | Analista | A | CU-10-06 | Descarga `.xlsx` con cuerpo JSON (`versionIds`, `formato` `LISTA`|`PIVOTE`; opcionales `area`, `departamento`, `posicionIds`; hasta 512 kb). `posicionIds` solo acota: el servidor calcula su universo. `422 PIVOTE_NO_APLICABLE` / `EXPORTACION_DEMASIADO_GRANDE`; `503 EXPORTACION_EN_CURSO` (semáforo compartido con el consolidado); limitador 5/min por usuario. |

---

## 18. Secciones de góndola

Parte una góndola en columnas o franjas (anidables), cada una con sus propios niveles (tabla `Seccion`, migración 012). Aditivo: una góndola sin secciones se comporta igual que antes. Las escrituras exigen versión editable y responden con la estructura completa actualizada. Contratos en `Contratos/18_secciones/`.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/gondolas/{id}/secciones` | Analista | A | CU-03-12 | Árbol de secciones y, por cada sección final, su rectángulo en cm y sus niveles. Sin dividir: `dividida: false`. |
| `POST` | `/gondolas/{id}/secciones/dividir` | Analista | A + C | CU-03-09 | Parte una sección (o la góndola completa) en `COLUMNAS` o `FILAS`. En columnas la nueva copia los niveles vacíos; en franjas se lleva la mitad inferior de los niveles. |
| `PATCH` | `/secciones/{id}` | Analista | A + C | CU-03-10 | Cambia la medida de la sección en la dirección de su padre; la diferencia la absorbe la vecina (mínimo 10 cm cada una). |
| `DELETE` | `/secciones/{id}` | Analista | A + C | CU-03-11 | Quita una sección sin productos (`409` si tiene); su espacio pasa a la vecina. Con una sola sección restante, la góndola vuelve a "sin dividir". |

`POST /gondolas/{id}/niveles` acepta además `seccion_id` (opcional) para crear el nivel dentro de una sección, y las respuestas de niveles incluyen `seccionId`.

---

## 19. SKU en la versión

Vista por SKU de una versión: totales sumando todas sus ubicaciones y numeración de ganchos calculada (no se guarda). Sin tabla nueva: mín./máx. siguen en cada `Posicion`. Contratos en `Contratos/19_skus/`.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/versiones/{id}/skus` | Analista | A | CU-04-16 | Cada SKU con ubicaciones, facings y capacidad sumados, mín./máx. comunes, alertas (`MINMAX_VARIA`, `MIN_MAYOR_MAX`, `MAX_SUPERA_CAPACIDAD`) y ganchos; más `ganchosPorPosicion` para dibujarlos. |
| `PATCH` | `/versiones/{id}/skus/{sku}` | Analista | A + C | CU-04-17 | Aplica `min_final`/`max_final` a todas las posiciones del SKU en la versión. `422` si mín. > máx. o la versión no es editable. |

---

## 21. Consolidado Tiendas

Vista de solo lectura del analista (Productos → Por tienda): todas las combinaciones SKU–tienda–versión de lo que montan las tiendas (versiones `publicado` y `piloto` asignadas a tiendas activas), con cross/impulso como sub-filas y `planogramasEnTienda` (calculado antes de los filtros) para marcar en rojo el SKU que está en más de un planograma en la tienda. Sin tabla nueva: cálculo en memoria sobre una base cargada en bloque (migración 017 solo agrega índices). Query validada con Joi estricto (parámetro desconocido o repetido → `400`). Orden de capas: `requiereAnalista` → `validarQuery` → limitador por usuario → controller. Contratos en `Contratos/21_consolidado/`.

| Método | Ruta | Actor | Permiso | CU | Descripción |
|--------|------|-------|---------|----|-------------|
| `GET` | `/consolidado/tiendas` | Analista | A | CU-10-03 | Listado paginado por grupo SKU–tienda (vista `PLANOGRAMA`) o por fila (`CROSS`/`IMPULSO`), con filtros de tienda, versión, estado, jerarquía CATI, búsqueda y `soloDuplicados`, orden por SKU/producto/tienda/versión y `resumen` de todo lo filtrado (conteos por tipo y `maximoExportacion`). Limitador 60/min por usuario. `503` si hay jerarquía y CATI no responde. |
| `GET` | `/consolidado/tiendas/filtros` | Analista | A | CU-10-03 | Tiendas activas con alguna versión montable (con `totalSkus`) y versiones `publicado`/`piloto` con alguna tienda activa (con `totalProductos`). Sin query. |
| `GET` | `/consolidado/tiendas/exportar` | Analista | A | CU-10-04 | Descarga `.xlsx` generada en el servidor: `DETALLADO` (una fila por planograma, cross e impulso), `AGREGADO` (una por SKU–tienda, mín./máx. sumados) u `HOJAS` (una hoja por tipo). Solo las `columnas` pedidas, en su orden. `422` si supera el tope de filas; `503 EXPORTACION_EN_CURSO` si hay otra en curso; limitador 5/min por usuario. |

---

## Notas generales de diseño

- **Autenticación**: todos los endpoints (salvo `/health`) requieren el JWT de usuario emitido por CAO. El header es `Authorization: Bearer {token}`. El backend lo valida con `GET {CAO_BASE_URL}/auth/validar_token` y, sin esperar, renueva la sesión en CAO con `POST {CAO_BASE_URL}/auth/keepalive` (máximo uno por token cada 60 s; nunca bloquea el request).
- **Versionado**: prefijo `/api/v1` en todas las rutas.
- **Autorización**: la columna `Permiso` indica la regla de cada endpoint: **A** = analista (todos PLA001–PLA008, transitoria), **I** = lectura compartida (PLA009, PLA010 o A), **C** = PLA005 o PLA006 (contenido de la versión, siempre junto con A) y `PLA00X` = permiso CAO concreto. Sin el permiso, `403 { error: { code: 'FORBIDDEN', message: 'No tienes permiso para esta acción' } }` antes de cualquier validación. Los endpoints que aún no existen (secciones 6, 7 y 13, `validar-publicacion` y `capacidad`) llevan `—`. Detalle en [[SEGURIDAD_PERMISOS]].
- **Errores estándar**: `400` validación, `401` no autenticado, `403` sin permiso, `404` recurso no encontrado, `409` conflicto de estado, `422` entidad no procesable (ej. desborde sin confirmación).
- **Paginación**: los endpoints de listado retornan `{ data: [], total, page, pageSize }`.
- **Partial update**: todos los `PATCH` aceptan solo los campos enviados; los omitidos no se modifican.
- **Pruebas**: cada módulo listado aquí debe tener su carpeta equivalente en la colección Postman — ver [[ESTANDAR_PRUEBAS_POSTMAN]].
