# Contrato: Agregar Accesorio de Montaje a Posición

**Método:** `POST`  
**Ruta:** `/api/v1/posiciones/{posicionId}/accesorios`  
**Actor:** Analista  
**Caso de uso:** CU-04-09  

---

## Descripción

Agrega un accesorio de montaje (gancho, bandeja, etc.) a una posición, con una nota libre de instrucción. El orden se asigna automáticamente como `MAX(orden) + 1`.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `posicionId` | `integer` | Sí |

### Body (JSON)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `accesorio_id` | `integer` | Sí | FK a tabla `Accesorio`. |
| `nota_libre` | `string` | No | Instrucción de colocación. Ej: "a la derecha", "colocar frontal". Máximo 200 chars. |

---

## Reglas de negocio

1. El accesorio debe existir en el catálogo.
2. Una posición puede tener múltiples accesorios del mismo tipo.
3. La versión padre debe estar en modo editable.
4. El `orden` se asigna automáticamente.

---

## Request JSON

```json
{
  "accesorio_id": 5,
  "nota_libre": "Colocar a la derecha del producto"
}
```

---

## Response — 201 Created

```json
{
  "id": 10,
  "posicionId": 55,
  "accesorio": {
    "id": 5,
    "codigo": "G-12",
    "nombre": "Gancho 12 pulgadas"
  },
  "nota_libre": "Colocar a la derecha del producto",
  "orden": 1
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `accesorio_id` ausente. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición o accesorio no existen. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `AgregarAccesorioAPosicionUseCase` recibe `(posicionId, AccesorioCommand)`. Verifica que la posición y el accesorio existan, y que la versión sea editable.

> **[SOLID — SRP]**  
> El cálculo del siguiente `orden` es responsabilidad del repositorio, no del caso de uso.
