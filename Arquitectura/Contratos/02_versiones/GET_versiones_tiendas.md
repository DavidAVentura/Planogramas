# Contrato: Obtener Tiendas Asignadas a una Versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/tiendas`  
**Actor:** Analista  
**Caso de uso:** CU-02-05  

---

## Descripción

Retorna las tiendas asignadas y disponibles para una versión, separadas en dos grupos. Permite al Analista visualizar el estado actual de asignación antes de modificarla.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

---

## Reglas de negocio

1. Solo se muestran tiendas del mismo `tipo` que la versión.
2. Las tiendas disponibles son las del tipo correcto que **no** están asignadas a esta versión.

---

## Response — 200 OK

```json
{
  "asignadas": [
    { "id": 1, "codigo": "GTM-PRA", "nombre": "Cemaco Pradera", "tipo": "GRANDE" }
  ],
  "disponibles": [
    { "id": 2, "codigo": "GTM-OAK", "nombre": "Cemaco Oakland", "tipo": "GRANDE" },
    { "id": 4, "codigo": "GTM-MAJ", "nombre": "Cemaco Majadas", "tipo": "GRANDE" }
  ]
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE]**  
> La separación `asignadas / disponibles` puede resolverse en SQL con un LEFT JOIN + CASE, o en el Application Service con dos queries. Preferir la solución SQL por eficiencia.
