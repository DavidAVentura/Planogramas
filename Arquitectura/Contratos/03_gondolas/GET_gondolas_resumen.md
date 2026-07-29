# Contrato: Resumen de Góndola (previa a eliminación)

**Método:** `GET`  
**Ruta:** `/api/v1/gondolas/{id}/resumen`  
**Actor:** Analista  

---

## Descripción

Retorna un resumen de la góndola con conteos de niveles y posiciones. Usado por el frontend antes de mostrar el diálogo de confirmación de eliminación.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Response — 200 OK

```json
{
  "id": 1,
  "nombre": "Góndola A",
  "totalNiveles": 4,
  "totalPosiciones": 18
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Góndola no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Query liviana]**  
> Este endpoint hace un COUNT simple. Modelarlo como una query de lectura directa, sin pasar por el caso de uso de eliminación. No requiere lógica de negocio adicional.
