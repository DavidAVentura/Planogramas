# Contrato: Listar Accesorios de una Posición

**Método:** `GET`  
**Ruta:** `/api/v1/posiciones/{id}/accesorios`  
**Actor:** Analista  

---

## Descripción

Lista los accesorios de montaje asignados a una posición, ordenados por `orden`. Usado en el panel de detalle del editor.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí — ID de la posición. |

---

## Response — 200 OK

```json
[
  {
    "id": 10,
    "posicionId": 55,
    "accesorio": {
      "id": 5,
      "codigo": "G-12",
      "nombre": "Gancho 12 pulgadas",
      "tipo": "GANCHO",
      "longitud_cm": 30
    },
    "nota_libre": "Colocar a la derecha",
    "orden": 1
  }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Posición no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**  
> Este endpoint puede omitirse si `GET /posiciones/{id}` ya retorna los accesorios embebidos. Mantenerlo para casos donde el frontend necesita refrescar solo los accesorios sin recargar toda la posición.
