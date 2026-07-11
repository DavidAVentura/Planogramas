# Contrato: Consultar Capacidad de Niveles por Versión

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{versionId}/capacidad`  
**Actor:** Analista  
**Caso de uso:** CU-04-07 (refresco desde BD)  

---

## Descripción

Retorna el estado de ocupación de espacio por nivel en la versión. Usado por el frontend cuando el Analista solicita refrescar los datos de capacidad desde la base de datos (no el cálculo local).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `versionId` | `integer` | Sí |

---

## Response — 200 OK

```json
[
  {
    "nivelId": 7,
    "gondolaNombre": "Góndola A",
    "nivelOrden": 3,
    "ancho_disponible_cm": 120,
    "ancho_ocupado_cm": 95.5,
    "ancho_libre_cm": 24.5,
    "pct_ocupado": 79.6
  },
  {
    "nivelId": 8,
    "gondolaNombre": "Góndola A",
    "nivelOrden": 2,
    "ancho_disponible_cm": 120,
    "ancho_ocupado_cm": 130,
    "ancho_libre_cm": -10,
    "pct_ocupado": 108.3
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

> **[CLEAN CODE — Cálculo en SQL]**  
> `ancho_ocupado = SUM(ancho_asignado_cm)` se calcula en el SQL con GROUP BY. No traer todas las posiciones al servidor y sumar en memoria.

> **[SOLID — Read Model]**  
> Este es un endpoint de proyección de lectura. Puede implementarse como un Read Model independiente o como una query directa al repositorio de posiciones.
