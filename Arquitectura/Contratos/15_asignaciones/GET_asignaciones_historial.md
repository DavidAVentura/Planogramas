# Contrato: Historial de una celda

**Método:** `GET`  
**Ruta:** `/api/v1/asignaciones/historial`  
**Actor:** Analista  
**Caso de uso:** CU-02-06  

---

## Descripción

Movimientos de una celda planograma × tienda, **más reciente primero**. Lo usa el modal
"Historial" del menú contextual (clic derecho) de la matriz de Estructura.

Incluye tanto las ediciones hechas a mano como las automáticas (publicar o promover a piloto una
versión). La auditoría es append-only: nunca se edita ni se borra.

---

## Query Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `planogramaId` | `integer` | Sí |
| `tiendaId` | `integer` | Sí |

---

## Response — 200 OK

```json
{
  "eventos": [
    {
      "id": 981,
      "edicionId": 152,
      "cambiosEnEdicion": 3,
      "fecha": "2026-07-21T14:30:00.000Z",
      "usuario": { "numero": "sistema", "nombre": "sistema" },
      "motivo": "Ajuste de surtido de Limpieza",
      "origen": "MANUAL",
      "accion": "CAMBIO",
      "anterior": { "id": 16102, "codigo": "JABONES-TM", "estado": "publicado" },
      "nueva": { "id": 16841, "codigo": "JABONES-TM-T010", "estado": "publicado" }
    }
  ]
}
```

- `cambiosEnEdicion`: cuántos cambios se guardaron juntos en esa edición.
- `anterior` / `nueva`: `null` cuando la celda estaba o quedó vacía. Son la foto del momento: si la
  versión se archivó o se renombró después, el código registrado no cambia.
- `origen`: `MANUAL` | `VERSION` | `PILOTO` | `PUBLICACION`.
- Sin movimientos: `{ "eventos": [] }` (no es error).

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Falta `planogramaId` o `tiendaId`, o no son enteros positivos. |
