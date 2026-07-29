# Contrato: Obtener Detalle de Accesorio

**Método:** `GET`  
**Ruta:** `/api/v1/accesorios/{id}`  
**Actor:** Analista  

---

## Descripción

Retorna el detalle de un accesorio del catálogo: código, tipo, dimensiones y notas de capacidad.

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
  "id": 5,
  "codigo": "G-12",
  "nombre": "Gancho 12 pulgadas",
  "tipo": "GANCHO",
  "longitud_cm": 30,
  "ancho_cm": null,
  "notas_capacidad": "Para productos hasta 1.5 kg. No usar con botellas de más de 500ml sin tapa."
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Accesorio no existe. |
