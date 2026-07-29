# Contrato: Editar Góndola

**Método:** `PATCH`  
**Ruta:** `/api/v1/gondolas/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-02  

---

## Descripción

Modifica nombre, medidas o posición en tienda de una góndola. Si cambia `ancho_cm`, recalcula el `ancho_disponible_cm` en los niveles que tenían el mismo ancho anterior. Partial update.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON) — todos opcionales

| Campo | Tipo | Validación |
|-------|------|------------|
| `nombre` | `string` | Máximo 100 chars. |
| `ancho_cm` | `number` | Mayor a 0. Máximo 500. |
| `alto_cm` | `number` | Mayor a 0. Máximo 300. |
| `profundidad_cm` | `number` | Mayor a 0. Máximo 200. |
| `posicion_en_tienda` | `string \| null` | Texto libre. Máximo 200 chars. |

---

## Reglas de negocio

1. Si `ancho_cm` cambia, actualizar `ancho_disponible_cm` en todos los niveles de la góndola donde `ancho_disponible_cm = ancho_anterior`. Niveles con ancho personalizado diferente al de la góndola no se tocan.
2. La versión padre debe estar en modo editable.

---

## Request JSON

```json
{
  "nombre": "Góndola A bis",
  "ancho_cm": 130
}
```

---

## Response — 200 OK

```json
{
  "id": 1,
  "nombre": "Góndola A bis",
  "ancho_cm": 130,
  "alto_cm": 180,
  "profundidad_cm": 40,
  "posicion_en_tienda": "Pasillo 3",
  "orden": 1,
  "nivelesActualizados": 4
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Body vacío, medidas ≤ 0. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Góndola no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Side effects documentados]**  
> El efecto de cascada sobre `Nivel.ancho_disponible_cm` debe estar documentado en el caso de uso y en este contrato. El frontend puede usar `nivelesActualizados` para refrescar la vista.

> **[SOLID — SRP]**  
> La actualización en cascada de niveles es una responsabilidad del `GondolaRepository` o de un `NivelRepository`, no del controlador.
