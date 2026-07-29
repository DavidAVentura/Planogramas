# Contrato: Agregar Góndola a Versión

**Método:** `POST`  
**Ruta:** `/api/v1/versiones/{versionId}/gondolas`  
**Actor:** Analista  
**Caso de uso:** CU-03-01  

---

## Descripción

Agrega una nueva góndola vacía a la versión. El orden se asigna automáticamente como `MAX(orden) + 1`. Solo versiones en modo editable admiten esta operación.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `nombre` | `string` | Sí | Máximo 100 chars. |
| `ancho_cm` | `number` | Sí | Mayor a 0. Máximo 500. |
| `alto_cm` | `number` | Sí | Mayor a 0. Máximo 300. |
| `profundidad_cm` | `number` | Sí | Mayor a 0. Máximo 200. |
| `posicion_en_tienda` | `string` | No | Texto libre. Máximo 200 chars. |

---

## Reglas de negocio

1. La versión debe estar en `borrador`, `en_desarrollo` o `piloto` — si está `publicada` o `archivada`, retorna `422`.
2. El campo `orden` se asigna como `MAX(orden_actual) + 1` — no lo envía el cliente.
3. El nombre de la góndola no requiere ser único dentro de la versión.

---

## Request JSON

```json
{
  "nombre": "Góndola C",
  "ancho_cm": 120,
  "alto_cm": 180,
  "profundidad_cm": 40,
  "posicion_en_tienda": "Pasillo 5 - centro"
}
```

---

## Response — 201 Created

```json
{
  "id": 3,
  "versionId": 10,
  "nombre": "Góndola C",
  "ancho_cm": 120,
  "alto_cm": 180,
  "profundidad_cm": 40,
  "posicion_en_tienda": "Pasillo 5 - centro",
  "orden": 3
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Campos inválidos (medidas ≤ 0, nombre ausente). |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

```json
// 422
{
  "error": "La versión no está en modo editable",
  "estadoActual": "publicado"
}
```

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Value Objects]**  
> Las medidas (`ancho_cm`, `alto_cm`, `profundidad_cm`) pueden modelarse como un value object `MedidasGondola` con sus propias validaciones. Facilita reutilización y testing.

> **[HEXAGONAL]**  
> `AgregarGondolaUseCase` recibe `(versionId, AgregarGondolaCommand)`. El caso de uso verifica que la versión sea editable antes de delegar al repositorio.

> **[SOLID — SRP]**  
> El cálculo del siguiente `orden` es responsabilidad del repositorio (`GondolaRepository.siguienteOrden(versionId)`), no del caso de uso.
