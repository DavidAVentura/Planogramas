# Contrato: Mover Posición

**Método:** `POST`  
**Ruta:** `/api/v1/posiciones/{id}/mover`  
**Actor:** Analista  
**Caso de uso:** CU-04-03  

---

## Descripción

Mueve una posición a otro nivel o a otra columna dentro del mismo nivel. Reajusta automáticamente el `orden_horizontal` de las posiciones afectadas en el nivel origen y destino.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nivel_id` | `integer` | Sí | Nivel destino (puede ser el mismo nivel de origen). |
| `orden_horizontal` | `integer` | Sí | Nueva posición horizontal en el nivel destino. |

---

## Reglas de negocio

1. Si `nivel_id` es el mismo que el nivel actual y `orden_horizontal` es el mismo → no hace nada (retorna 200 con los datos actuales).
2. Reajuste de orden en nivel origen: `orden_horizontal - 1` para posiciones con orden mayor al original.
3. Reajuste de orden en nivel destino: `orden_horizontal + 1` para posiciones con orden ≥ destino (excepto la posición movida).
4. El nivel destino puede estar en la misma góndola o en otra góndola de la misma versión.
5. No valida espacio disponible — el frontend ya lo verifica con advertencia visual.

---

## Request JSON

```json
{
  "nivel_id": 8,
  "orden_horizontal": 2
}
```

---

## Response — 200 OK

```json
{
  "id": 55,
  "nivel_id": 8,
  "orden_horizontal": 2
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `nivel_id` o `orden_horizontal` inválidos (≤ 0). |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición o nivel destino no existen, o el nivel destino no pertenece a la misma versión. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Comando específico]**  
> `MoverPosicionUseCase` con `MoverPosicionCommand { posicionId, nivelDestinoId, ordenDestino }`. La lógica de reajuste de orden es responsabilidad del `PosicionRepository.mover(command)`.

> **[CLEAN CODE — Atomicidad]**  
> Los tres UPDATEs (posición movida, nivel origen, nivel destino) en una sola transacción.

> **[SOLID — DIP]**  
> El repositorio abstrae la lógica de reordenamiento. El caso de uso solo expresa la intención.
