# Contrato: Agregar Posición a Nivel

**Método:** `POST`  
**Ruta:** `/api/v1/niveles/{nivelId}/posiciones`  
**Actor:** Analista  
**Caso de uso:** CU-04-01  

---

## Descripción

Agrega una posición (producto con SKU) a un nivel del planograma. Valida el espacio disponible y retorna advertencia si el nivel queda en desborde. Los valores de capacidad, mínimos y máximos se calculan en el frontend y se persisten aquí.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `nivelId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sku` | `string` | Sí | SKU del producto. |
| `orden_horizontal` | `integer` | Sí | Posición de izquierda a derecha en el nivel. |
| `ancho_asignado_cm` | `number` | Sí | `facings_horizontal × producto.ancho_cm`. |
| `facings_horizontal` | `integer` | Sí | Cantidad de facings horizontales. Mayor a 0. |
| `cantidad_apilable` | `integer` | Sí | Pisos verticales de producto. Mayor a 0. |
| `unidades_por_facing` | `integer` | Sí | Unidades en profundidad por facing. Mayor a 0. |
| `capacidad_maxima` | `integer` | Sí | `facings × apilable × unidades_por_facing`. |
| `min_estetico` | `integer` | No | Mínimo estético. |
| `min_final` | `integer` | No | Mínimo de reorden. Debe ser ≤ `max_final`. |
| `max_final` | `integer` | No | Máximo de reorden. Debe ser ≥ `min_final`. |
| `perfil_redondeo` | `string` | No | `NORMAL`, `REDONDEAR_ARRIBA`, `REDONDEAR_ABAJO`. Default: `NORMAL`. |
| `modo` | `string` | No | `NORMAL`, `CROSS`, `DISPLAY`. Default: `NORMAL`. |
| `decision` | `string` | No | `ACTIVO`, `BAJA`, `NUEVO`. Default: `ACTIVO`. |

---

## Reglas de negocio

1. El nivel debe pertenecer a una versión en modo editable.
2. El backend verifica espacio: si `ancho_ocupado + nuevo_ancho > ancho_disponible`, NO bloquea — responde `201` con `advertencia`.
3. El `sku` no se valida contra CATI en este endpoint (se asume validado al seleccionar desde el buscador en el frontend).
4. Si `min_final > max_final`, el backend lo acepta pero lo marca como "error bloqueante" al intentar publicar.

---

## Request JSON

```json
{
  "sku": "10012345",
  "orden_horizontal": 1,
  "ancho_asignado_cm": 27,
  "facings_horizontal": 3,
  "cantidad_apilable": 1,
  "unidades_por_facing": 4,
  "capacidad_maxima": 12,
  "min_estetico": 4,
  "min_final": 3,
  "max_final": 12,
  "perfil_redondeo": "NORMAL",
  "modo": "NORMAL",
  "decision": "ACTIVO"
}
```

---

## Response — 201 Created (sin desborde)

```json
{
  "id": 55,
  "nivelId": 7,
  "sku": "10012345",
  "orden_horizontal": 1,
  "ancho_asignado_cm": 27,
  "facings_horizontal": 3,
  "cantidad_apilable": 1,
  "unidades_por_facing": 4,
  "capacidad_maxima": 12,
  "min_final": 3,
  "max_final": 12,
  "perfil_redondeo": "NORMAL",
  "modo": "NORMAL",
  "decision": "ACTIVO"
}
```

## Response — 201 Created (con desborde)

```json
{
  "id": 56,
  "nivelId": 7,
  "sku": "10067890",
  "ancho_asignado_cm": 15,
  "advertencia": "El nivel supera su ancho disponible. Ancho ocupado: 135 cm / 120 cm disponibles."
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Campos inválidos, `facings_horizontal ≤ 0`, SKU vacío. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Nivel no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Responsabilidad de cálculo]**  
> Los campos calculados (`capacidad_maxima`, `min_estetico`) se calculan en el **frontend** y se persisten "as-is" en el backend. El backend no recalcula — confía en los valores enviados. Esto es intencional: el editor tiene contexto completo del producto (dimensiones de CATI) que el backend no necesita re-consultar en cada insert.

> **[SOLID — Validación de desborde no bloqueante]**  
> La verificación de desborde es un "warning gate", no un "error gate". Implementarlo como un `DesbordVerifier.verificar(nivelId, anchoNuevo)` que retorna `{desborde: boolean, detalle: string}` pero nunca lanza excepción.

> **[CLEAN CODE — Invariante diferida]**  
> `min_final > max_final` es un invariante de negocio pero su validación se difiere a la publicación (no al INSERT). Documentar esta decisión explícitamente en el código con un comentario. Usar un `ErrorBloqueante` en la validación de publicación que refiera a este contrato.

> **[SOLID — OCP]**  
> Si en el futuro se agregan nuevos campos de posición (ej. `etiqueta_precio`), el DTO de entrada debe poder extenderse sin modificar el caso de uso base (usar spread operator o campos opcionales).
