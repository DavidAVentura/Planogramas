# FEATURE: Captura de Foto a Planograma

Documento de diseño del flujo de captura fotográfica para digitalizar un planograma montado.
Es el flujo principal del MVP.

---

## Contexto

El analista de categorías primero monta físicamente el planograma en la tienda piloto
(T0PC Pradera Concepción). Una vez seguro del montaje, usa la app para convertirlo
a planograma digital. La foto es el punto de entrada, no el punto de diseño.

---

## Paso 1 — Crear sesión: contexto del planograma

El analista ingresa:
- Nombre del planograma (ej. "AUTOS 20")
- Departamento y categoría
- Tipo de versión: `GRANDE | MEDIANA | EXPRESS`

El sistema crea:
- Registro `Planograma` en estado `borrador`
- Registro `PlanogramaVersion` asociado, en estado `borrador`
- Registro `SesionCaptura` de tipo `CREACION` vinculado a la versión

La tienda **no se selecciona en este paso** — la asociación planograma-tienda
ocurre al publicar (Paso 7).

---

## Paso 2 — Confirmar medidas de la góndola

El sistema sugiere automáticamente un `TipoGondola` basado en la categoría seleccionada
y muestra el modal **"Medidas a utilizar"** con los valores por defecto:

- Ancho (cm)
- Alto (cm)
- Profundidad (cm)
- Niveles sugeridos

El analista **corrige o acepta** las medidas. Al confirmar:
- Se crea `Gondola 1` con las medidas confirmadas y referencia al `TipoGondola`.
- Si hay más de una góndola en el planograma, el analista puede agregar
  `Gondola 2`, `Gondola 3`, etc., repitiendo este mismo paso de confirmación de medidas.

El analista también puede editar las medidas de cualquier góndola en cualquier
momento posterior desde el editor, seleccionando la góndola y actualizando sus datos.

---

## Paso 3 — Captura de fotos por módulo

El sistema determina cuántos módulos pedir por góndola según el ancho confirmado:
- Ancho < 180 cm → 1 módulo (foto frontal)
- Ancho ≥ 180 cm → 2 módulos (foto izquierdo + foto derecho)
- Anchos mayores → N módulos según configuración del tipo de góndola

Por cada módulo:
1. Se muestra la guía de captura: encuadre sugerido, distancia, ángulo frontal,
   advertencia de reflejos.
2. El analista toma o sube la foto.
3. El sistema valida calidad automáticamente:
   - Resolución mínima
   - Nivel de luz
   - Contraste
   - Detección de estructura de mueble (rechaza fotos de producto individual)
4. Si la foto no pasa validación: se muestra el motivo y se solicita retomar.
   El analista puede retomar solo ese módulo sin perder los demás.
5. La foto válida se guarda en `FotoCaptura` asociada al `Modulo` correspondiente.

---

## Paso 4 — Propuesta de niveles por el agente

Con todas las fotos de una góndola validadas, el agente analiza la estructura visual
y propone los niveles detectados.

El analista ve la propuesta de niveles sobre la imagen:
- Número de niveles detectados
- Posición aproximada de cada nivel en la foto

Para cada nivel propuesto, el analista **ingresa la altura desde el piso en cm**.
El sistema no infiere este valor — es ingreso manual obligatorio porque la foto
no tiene referencia métrica confiable.

El analista puede:
- Aceptar todos los niveles propuestos
- Agregar niveles que el agente no detectó
- Eliminar niveles detectados por error

Al confirmar, se crean los registros `Nivel` con `orden` y `altura_desde_piso_cm`.
El `tipo_accesorio` y `codigo_accesorio` del nivel se completan en el editor (Paso 6).

---

## Paso 5 — Propuesta de productos por el agente

Con la estructura de niveles confirmada, el agente genera `DeteccionPropuesta`
para cada posición detectada:

- `nivel_orden`: nivel donde se detectó el producto
- `posicion_orden`: posición horizontal dentro del nivel
- `sku_candidato`: SKU del catálogo con mayor similitud
- `confianza`: porcentaje de certeza del match
- `alternativas`: lista de SKUs candidatos con su confianza y motivo

El analista revisa la propuesta nivel por nivel:
- **Aceptar**: la detección se convierte en `Posicion` con el SKU propuesto.
- **Editar**: el analista selecciona otro SKU del catálogo (búsqueda por SKU,
  nombre o marca) y acepta.
- **Rechazar**: la posición se marca como vacante; el analista puede asignarla
  manualmente en el editor.
- **Retomar foto**: si la propuesta de un módulo completo es de baja calidad,
  el analista puede volver al Paso 3 para ese módulo sin perder los demás.

La etiqueta **"Modo demo / Modo agente"** es visible en todo momento para indicar
si las detecciones vienen del agente real o de la simulación sobre catálogo.
Nunca se presentan detecciones simuladas como si fueran reales.

---

## Paso 6 — Completar atributos en el editor

Con las posiciones aceptadas, el planograma pasa al editor (ver
`FEATURE_editar_planograma.md`). El analista:

- Define el accesorio de cada nivel (tipo y código)
- Completa o corrige atributos por posición: facings, cantidad apilable,
  unidades por facing, perfil de redondeo, accesorios de montaje, etc.
- Mueve o reorganiza posiciones con drag & drop si es necesario
- Agrega posiciones que no fueron detectadas por el agente

---

## Paso 7 — Publicar y asociar tiendas

El analista publica el planograma (estado `borrador` → `activo`).

El sistema valida que no haya errores bloqueantes antes de publicar
(ver tabla de alertas en `FEATURE_editar_planograma.md`).

Al publicar, se seleccionan las tiendas que implementarán este planograma.
Se crean los registros `VersionTienda` correspondientes.

---

## Estados de la sesión de captura

| Estado | Descripción |
|---|---|
| `iniciada` | Sesión creada, pendiente de fotos |
| `fotos_ok` | Todas las fotos válidas recibidas |
| `niveles_confirmados` | Estructura de niveles aceptada por el analista |
| `propuesta_lista` | Agente generó detecciones, pendiente de revisión |
| `aceptada` | Revisión completa; pasa al editor |

---

## Flujo B — Auditoría (fase posterior, fuera del MVP)

En el futuro, el analista seleccionará un planograma ya existente, una versión
y una tienda específica para fotografiar y comparar contra el planograma aprobado.
En ese flujo, `SesionCaptura.gondola_id` apunta a una góndola ya existente
y `tipo_flujo = AUDITORIA`.

---

## Pendiente de definir

- ¿El agente de visión procesa las fotos en tiempo real (mientras el analista espera)
  o en background con notificación?
- ¿Cuántas fotos simultáneas puede procesar el agente en el piloto?
- Tiempo máximo de espera aceptable para el analista en tienda.
- ¿Se guardan las fotos originales de forma permanente o solo durante la sesión?
