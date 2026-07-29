# Contrato: Listar Accesorios del Catálogo

**Método:** `GET`  
**Ruta:** `/api/v1/accesorios`  
**Actor:** Analista  
**Casos de uso:** CU-03-05 / CU-04-09  

---

## Descripción

Lista todos los accesorios de gondolería disponibles en el catálogo interno. Filtro opcional por tipo. Usado en los selectores de accesorios al crear/editar niveles y posiciones.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `tipo` | `string` | No | Filtra por tipo. Valores: `GANCHO`, `BANDEJA`, `BARRA`, `CANASTA`, `OTRO`. |

---

## Reglas de negocio

1. Ordenados por `tipo ASC, nombre ASC`.
2. No paginado (el catálogo de accesorios es de tamaño acotado: < 200 ítems).
3. Solo retorna accesorios activos.

---

## Response — 200 OK

```json
[
  {
    "id": 1,
    "codigo": "B-10",
    "nombre": "Bandeja 10 cm",
    "tipo": "BANDEJA",
    "longitud_cm": 30,
    "ancho_cm": 10
  },
  {
    "id": 5,
    "codigo": "G-12",
    "nombre": "Gancho 12 pulgadas",
    "tipo": "GANCHO",
    "longitud_cm": 30,
    "ancho_cm": null
  }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo` con valor no permitido. |
| `401 Unauthorized` | JWT ausente. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Cache agresiva]**  
> El catálogo de accesorios cambia raramente. Cachear la respuesta completa con TTL largo (1 hora). Invalidar el cache cuando se modifique el catálogo (si existe un endpoint de administración de accesorios).

> **[SOLID — ISP]**  
> Si en el futuro se necesita un endpoint de administración de accesorios (CRUD), crear `IAccesorioAdminRepository` separado del `IAccesorioReadRepository`.
