# Contrato: Copiar/Pegar Posición

**Método:** `POST`  
**Ruta:** `/api/v1/posiciones/{id}/copiar`  
**Actor:** Analista  
**Casos de uso:** CU-04-04 / CU-04-05  

---

## Descripción

Duplica una posición (con todos sus atributos y accesorios de montaje) en el nivel destino indicado. Equivale al flujo Ctrl+C / Ctrl+V: el frontend mantiene la posición "copiada" en memoria y llama a este endpoint al pegar.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí — ID de la posición original a copiar. |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nivel_id_destino` | `integer` | Sí | Nivel donde se pegará la copia. |
| `orden_destino` | `integer` | Sí | Posición horizontal de la copia en el nivel destino. |

---

## Reglas de negocio

1. Se copian todos los atributos de la posición original: SKU, facings, capacidad, mínimos, modos, flags, observaciones.
2. Se copian todos los accesorios de montaje (`PosicionAccesorio`).
3. El nivel destino puede ser el mismo nivel de origen (copia lateral).
4. Si el mismo SKU ya existe en el nivel destino, el backend no bloquea — el frontend habrá mostrado una advertencia previa.
5. No se copia el campo `id` — la copia obtiene un nuevo `id`.

---

## Request JSON

```json
{
  "nivel_id_destino": 9,
  "orden_destino": 3
}
```

---

## Response — 201 Created

```json
{
  "id": 67,
  "nivelId": 9,
  "sku": "10012345",
  "orden_horizontal": 3,
  "facings_horizontal": 3,
  "ancho_asignado_cm": 27,
  "capacidad_maxima": 12,
  "decision": "ACTIVO"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Campos inválidos. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición original o nivel destino no existen. |
| `422 Unprocessable Entity` | Versión no editable, o nivel destino pertenece a una versión diferente. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `CopiarPosicionUseCase` carga la posición original con sus accesorios, crea un nuevo objeto `Posicion` con los mismos atributos pero sin ID, y lo persiste en el nivel destino.

> **[CLEAN CODE — Clone Pattern]**  
> La entidad `Posicion` puede exponer un método `clonar(nivelDestinoId, ordenDestino): Posicion` que retorna una nueva instancia sin ID. Esto mantiene la lógica de clonación dentro de la entidad de dominio.

> **[SOLID — SRP]**  
> La copia de `PosicionAccesorio` debe ser responsabilidad del `PosicionAccesorioRepository`, invocado por el caso de uso después de insertar la posición nueva.
