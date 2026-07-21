# Contrato: Editar Posición

**Método:** `PATCH`  
**Ruta:** `/api/v1/posiciones/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-04-02 / CU-04-08 (desborde)  

---

## Descripción

Modifica atributos de una posición existente: facings, capacidad, mínimos, máximos, flags (cross, display, desborde) y observaciones. Partial update — solo los campos enviados se modifican.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON) — todos opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `facings_horizontal` | `integer` | Cantidad de facings. Mayor a 0. |
| `ancho_asignado_cm` | `number` | Sincronizado con facings. Mayor a 0. |
| `cantidad_apilable` | `integer` | Pisos verticales. Mayor a 0. |
| `unidades_por_facing` | `integer` | Unidades en profundidad. Mayor a 0. |
| `capacidad_maxima` | `integer` | Recalculado por el frontend. |
| `min_estetico` | `integer \| null` | Mínimo estético. |
| `min_final` | `integer \| null` | Mínimo de reorden. |
| `max_final` | `integer \| null` | Máximo de reorden. |
| `perfil_redondeo` | `string` | `MRP` (no se rompe empaque), `ZSRE` (se puede romper). |
| `modo` | `string` | `PLANOGRAMA`, `CROSS`. |
| `cross_externo` | `boolean` | Posición cross merchandising desde otra categoría. |
| `montar_en_display` | `boolean` | Requiere montaje en display. |
| `desborda_gondola` | `boolean` | Producto físicamente cruza límite de góndola. |
| `nota_desborde` | `string \| null` | Descripción de hacia dónde desborda. |
| `decision` | `string` | `ACTIVO`, `INACTIVO`. |
| `observaciones` | `string \| null` | Notas libres del Analista. Máximo 500 chars. |

---

## Reglas de negocio

1. Si se envía `desborda_gondola: true` debe acompañarse de `nota_desborde` (no vacío).
2. Si `min_final` y `max_final` se envían simultáneamente, validar `min_final ≤ max_final`.
3. La versión padre debe estar en modo editable.

---

## Request JSON (ejemplo CU-04-08 aceptar desborde)

```json
{
  "desborda_gondola": true,
  "nota_desborde": "Continúa en Góndola B, nivel 2"
}
```

---

## Response — 200 OK

```json
{
  "id": 55,
  "facings_horizontal": 3,
  "ancho_asignado_cm": 27,
  "cantidad_apilable": 1,
  "unidades_por_facing": 4,
  "capacidad_maxima": 12,
  "min_final": 3,
  "max_final": 12,
  "perfil_redondeo": "MRP",
  "modo": "PLANOGRAMA",
  "cross_externo": false,
  "montar_en_display": false,
  "desborda_gondola": true,
  "nota_desborde": "Continúa en Góndola B, nivel 2",
  "decision": "ACTIVO",
  "observaciones": null
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `desborda_gondola=true` sin `nota_desborde`, o `min_final > max_final`. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[SOLID — SRP]**  
> Este endpoint sirve múltiples sub-casos de uso (editar facings, aceptar desborde, cambiar decisión). Si la lógica de negocio de cada sub-caso diverge en el futuro, considerar separar en endpoints especializados (ej. `PATCH /posiciones/{id}/desborde`).

> **[CLEAN CODE — Regla de desborde]**  
> La validación de `desborda_gondola + nota_desborde` debe vivir en un `PosicionValidator` reutilizable, no inline en el controlador.

> **[HEXAGONAL]**  
> `EditarPosicionUseCase` recibe `EditarPosicionCommand` (con todos los campos como opcionales). La entidad `Posicion` aplica los cambios con un método `aplicarEdicion(command)` que valida las invariantes de la entidad.
