# Contrato: Ejecutar Sustitución de SKU

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{versionId}/sustituciones`  
**Actor:** Analista  
**Casos de uso:** CU-05-01 / CU-05-03  

---

## Descripción

Ejecuta la sustitución de un SKU en múltiples posiciones de la versión. Reemplaza el SKU original por el sustituto, recalcula `ancho_asignado_cm` si las dimensiones cambiaron, y registra el historial. Requiere que la versión esté en modo editable.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `sku_original` | `string` | Sí | SKU a reemplazar. |
| `sku_sustituto` | `string` | Sí | SKU de reemplazo. Diferente a `sku_original`. |
| `motivo` | `string` | Sí | Razón de la sustitución. Mínimo 10 chars, máximo 500. |
| `posicion_ids` | `integer[]` | Sí | IDs de posiciones donde aplicar el cambio. Mínimo 1. |

---

## Reglas de negocio

1. La versión debe estar en `borrador`, `en_desarrollo` o `piloto`.
2. Todas las `posicion_ids` deben pertenecer a la versión indicada.
3. El `sku_sustituto` se consulta en CATI para obtener sus dimensiones y recalcular `ancho_asignado_cm = facings_horizontal × nuevo_ancho_cm`.
4. Si la diferencia de `ancho_cm` entre original y sustituto es > 20%, se incluye una advertencia en la respuesta.
5. La operación es atómica: UPDATE de posiciones + INSERT en historial en una transacción.
6. El campo `posicionesAfectadas` en el historial almacena los IDs como JSON.

---

## Request JSON

```json
{
  "sku_original": "10012345",
  "sku_sustituto": "10098765",
  "motivo": "Descontinuación del SKU original según comunicado CATI 2026-07-01",
  "posicion_ids": [55, 56, 57]
}
```

---

## Response — 200 OK

```json
{
  "historialId": 3,
  "skuOriginal": "10012345",
  "skuSustituto": "10098765",
  "motivo": "Descontinuación del SKU original según comunicado CATI 2026-07-01",
  "posicionesActualizadas": 3,
  "advertencias": []
}
```

## Response — 200 OK (con advertencia de tamaño)

```json
{
  "historialId": 4,
  "skuOriginal": "10012345",
  "skuSustituto": "10099999",
  "posicionesActualizadas": 2,
  "advertencias": [
    "El sustituto tiene un 25% más de ancho que el original. Revisa los facings en las posiciones actualizadas."
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `posicion_ids` vacío, `sku_original === sku_sustituto`, motivo muy corto. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe, o alguna `posicion_ids` no pertenece a la versión, o `sku_sustituto` no encontrado en CATI. |
| `422 Unprocessable Entity` | Versión publicada o archivada. |
| `503 Service Unavailable` | CATI no disponible al consultar dimensiones del sustituto. |

```json
// 422
{
  "error": "La versión no está en modo editable",
  "estadoActual": "publicado"
}
```

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Puertos externos]**  
> La consulta a CATI para obtener dimensiones del sustituto pasa por el **puerto de catálogo** (`ICatalogoService.obtenerProducto(sku)`). Si CATI no está disponible, el caso de uso puede continuar **sin recalcular** el ancho (modo degradado) e incluir una advertencia adicional. Esto aplica el patrón **Circuit Breaker**.

> **[SOLID — SRP]**  
> Separar: (1) `ValidarSustitucionUseCase` — verifica versión y posiciones. (2) `EjecutarSustitucionUseCase` — aplica cambios y registra historial.

> **[CLEAN CODE — Transacción cross-cutting]**  
> El UPDATE de posiciones y el INSERT en historial deben ocurrir en la misma transacción de BD. Si el INSERT de historial falla, las posiciones deben revertirse.

> **[CLEAN CODE — Advertencias vs Errores]**  
> La diferencia de tamaño > 20% es una advertencia, no un error. Retornar en campo `advertencias: string[]` en el 200 OK. No retornar 422 por esto.

> **[SOLID — OCP]**  
> Si se agregan nuevas reglas de advertencia (ej. diferencia de precio > 30%), añadirlas como nuevos `ISustitucionAdvisor` inyectables sin modificar el caso de uso base.
