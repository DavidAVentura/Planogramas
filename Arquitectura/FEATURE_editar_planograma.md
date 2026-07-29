# FEATURE: Editor de Planograma

Documento de diseño de interacciones y reglas de negocio del editor visual de planogramas.
No incluye implementación — define el contrato de comportamiento esperado.

---

## Contexto

El editor es la vista donde el analista de categorías construye o corrige un planograma,
ya sea partiendo de una propuesta generada por foto o creando uno desde cero.
El analista trabaja sobre una góndola lógica con sus niveles y posiciones.

---

## 1. Visualización del planograma

- La góndola se renderiza como una cuadrícula visual: filas = niveles (1 abajo, N arriba),
  columnas = posiciones dentro de cada nivel.
- Cada posición muestra imagen del producto, SKU, nombre corto y cantidad de facings horizontales.
- Los módulos físicos se indican con un separador visual sutil (línea vertical) sin interrumpir
  la experiencia de edición — el analista trabaja sobre la góndola lógica completa.
- El espacio disponible restante por nivel se muestra en tiempo real (cm libres o % libre).
- Los niveles muestran su altura desde el piso y el tipo de accesorio asignado.

---

## 2. Mover posiciones — Drag & Drop

- El analista puede arrastrar cualquier posición a otro nivel o a otra columna dentro del
  mismo nivel.
- Al soltar:
  - Se actualiza `nivel_id` y `orden_horizontal` de la posición.
  - Se recalcula el espacio disponible de nivel origen y nivel destino.
- Si el nivel destino no tiene espacio suficiente (ancho ocupado + ancho del producto
  excede ancho disponible):
  - Se muestra alerta de espacio insuficiente.
  - La acción **no se bloquea** — el analista puede aceptar y continuar.
  - Si el producto cruza el límite de un módulo físico, se activa `desborda_gondola = true`
    y se solicita `nota_desborde` opcional.
- Si se arrastra al mismo nivel en otra columna, solo cambia `orden_horizontal`.
  Los demás atributos no se modifican.

---

## 3. Copiar y pegar — Ctrl+C / Ctrl+V

- **Ctrl+C**: copia la posición seleccionada en memoria (no persiste hasta el pegado).
- **Ctrl+V**: crea una nueva instancia (`Posicion`) con todos los atributos del original,
  incluyendo accesorios (`PosicionAccesorio`), excepto `id` que es nuevo.
- **Nivel de destino por defecto al pegar**:
  1. Nivel inmediatamente superior al nivel de la posición copiada.
  2. Si no existe nivel superior, nivel inmediatamente inferior.
  3. Si solo existe un nivel, pega en el mismo nivel al final de la fila.
- La posición pegada se inserta al final del nivel destino (último `orden_horizontal`).
- Si el mismo SKU ya existe en el nivel destino se muestra advertencia
  `"Este producto ya existe en el nivel destino"` pero **no se bloquea** —
  el analista puede querer facing vertical intencional.
- El analista puede mover la posición pegada con drag & drop inmediatamente.

---

## 4. Edición de atributos de una posición

Al hacer clic en una posición se abre un panel lateral o modal con los siguientes campos editables:

### Producto
- SKU (con buscador — permite reemplazar el producto sin mover la posición)
- Nombre / descripción (solo lectura, desde catálogo)
- Imagen (solo lectura, desde catálogo)

### Espacio y facings
- **Facings horizontales** ↔ **Ancho asignado cm**: campos sincronizados en ambas
  direcciones. Editar uno recalcula el otro automáticamente:
  - `ancho_asignado_cm = facings_horizontal × producto.ancho_cm`
  - `facings_horizontal = FLOOR(ancho_asignado_cm / producto.ancho_cm)`
- **Cantidad apilable**: unidades apiladas verticalmente en la misma posición.
- **Unidades por facing**: editable manualmente; valor sugerido =
  `FLOOR((accesorio.longitud_cm - 1) / producto.profundidad_cm)`.

### Capacidad (calculados, solo lectura con opción de override manual)
- `capacidad_maxima = facings_horizontal × cantidad_apilable × unidades_por_facing`
- `min_estetico`:
  - Si `unidades_por_facing >= 4` → `facings_horizontal × 3 + 1`
  - Si `unidades_por_facing < 4`  → `facings_horizontal × unidades_por_facing`
- `min_final` y `max_final`: ajustables manualmente (override de los calculados).

### Reposición
- **Perfil de redondeo**: `MRP` (no se rompe empaque) / `ZSRE` (se puede romper).

### Montaje
- **Accesorios de montaje**: lista editable de `{ accesorio, nota_libre }`.
  - Se pueden agregar, reordenar y eliminar accesorios.
  - La nota es texto libre corto: `"a la derecha"`, `"colocar frontal"`, etc.
- **Montar en display**: toggle booleano.
  Activo = el producto viene con display propio y debe exhibirse en él (ej. Kinder).

### Clasificación
- **Modo**: `PLANOGRAMA` / `CROSS`.
- **Cross externo**: toggle — activo si el producto está en un accesorio colgante
  fuera de la góndola principal.
- **Decisión**: `ACTIVO` / `INACTIVO`.
- **Observaciones**: texto libre.

### Desborde (solo visible si aplica)
- **Desborda góndola**: toggle — activo cuando el producto cruza al módulo siguiente.
- **Nota de desborde**: texto libre. Ej: `"continúa en góndola 2, nivel 3"`.

---

## 5. Sustitución de SKU

La sustitución es un flujo explícito, distinto de simplemente editar el SKU de una posición.

**Cuándo usarlo**: producto descontinuado o reemplazado por decisión comercial.

**Flujo**:
1. El analista selecciona una o varias posiciones con el SKU a sustituir.
2. Elige la acción "Sustituir SKU".
3. Busca y selecciona el SKU sustituto del catálogo.
4. Ingresa el motivo de la sustitución (campo obligatorio).
5. El sistema actualiza `sku` en todas las posiciones seleccionadas.
6. Se genera un registro en `HistorialSustitucion` con:
   - `sku_original`, `sku_sustituto`, `motivo`, `fecha`, `usuario`
   - `posiciones_afectadas`: lista de IDs de posiciones modificadas.
7. El sistema recalcula automáticamente `ancho_asignado_cm`, `unidades_por_facing`
   y derivados si las dimensiones del sustituto difieren. Muestra advertencia si
   hay diferencia significativa de tamaño.

---

## 6. Gestión de niveles

- El analista puede agregar, eliminar y reordenar niveles.
- Al agregar un nivel se define:
  - Orden (posición en la góndola)
  - Altura desde el piso en cm
  - Tipo de accesorio y código de accesorio
  - Tamaño del accesorio en pulgadas
- Al eliminar un nivel se solicita confirmación si tiene posiciones asignadas.
  Las posiciones huérfanas no se eliminan automáticamente — el analista debe moverlas
  o eliminarlas primero.
- Al cambiar el tipo de accesorio de un nivel, el sistema advierte que
  `unidades_por_facing` de las posiciones existentes puede quedar desactualizado.

---

## 7. Alertas y validaciones en tiempo real

| Condición | Tipo | Bloquea |
|---|---|---|
| Ancho ocupado en nivel supera ancho disponible | Error | No |
| Producto desborda límite de módulo físico | Advertencia | No |
| Mismo SKU ya existe en el nivel destino (al pegar) | Advertencia | No |
| Capacidad máxima = 0 (datos incompletos) | Advertencia | No |
| Sustituto tiene dimensiones significativamente distintas (>20%) | Advertencia | No |
| Nivel sin accesorio asignado y tiene posiciones | Advertencia | No |
| `min_final` > `max_final` | Error | Sí |
| SKU no existe en catálogo activo | Error | Sí |

---

## 8. Acciones globales del editor

- **Guardar borrador**: persiste el estado actual sin cambiar el estado del planograma.
- **Publicar versión**: cambia estado a `activo`; requiere que no haya errores bloqueantes.
- **Exportar**: genera JSON y CSV del planograma con estructura estable para integración.
- **Ver historial de sustituciones**: lista de `HistorialSustitucion` de la versión activa.
- **Deshacer / Rehacer**: Ctrl+Z / Ctrl+Y sobre las últimas acciones de edición.

---

## Pendiente de definir

- Comportamiento al cambiar el accesorio de un nivel cuando `unidades_por_facing`
  fue editado manualmente (¿se respeta el manual o se recalcula?).
- Límite de niveles por góndola (¿existe un máximo operativo en Cemaco?).
- Permisos: ¿cualquier usuario del equipo de categorías puede publicar,
  o existe un rol de aprobador?
