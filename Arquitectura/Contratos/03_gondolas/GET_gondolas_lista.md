# Contrato: Listar Góndolas de una Versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/gondolas`  
**Actor:** Analista  
**Caso de uso:** CU-01-05 (sub-consulta)  

---

## Descripción

Lista las góndolas de una versión, ordenadas por el campo `orden` ascendente. Incluye resumen de niveles por góndola.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID de la versión. |

---

## Response — 200 OK

```json
[
  {
    "id": 1,
    "versionId": 10,
    "nombre": "Góndola A",
    "ancho_cm": 120,
    "alto_cm": 180,
    "profundidad_cm": 40,
    "posicion_en_tienda": "Pasillo 3 - lado izquierdo",
    "orden": 1,
    "totalNiveles": 4
  },
  {
    "id": 2,
    "versionId": 10,
    "nombre": "Góndola B",
    "ancho_cm": 90,
    "alto_cm": 180,
    "profundidad_cm": 40,
    "posicion_en_tienda": null,
    "orden": 2,
    "totalNiveles": 3
  }
]
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
> Este endpoint es un subconjunto del detalle completo (`GET /versiones/{id}`). Puede coexistir para casos donde el frontend necesita solo la lista de góndolas sin cargar toda la estructura anidada (ej. panel de reordenamiento).
