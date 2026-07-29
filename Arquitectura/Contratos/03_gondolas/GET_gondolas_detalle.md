# Contrato: Detalle de Góndola

**Método:** `GET`  
**Ruta:** `/api/v1/gondolas/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-02  

---

## Descripción

Retorna el detalle completo de una góndola: nombre, medidas y posición en tienda. Usado por el frontend para cargar los datos actuales en el formulario de edición.

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
  "ancho_cm": 120,
  "alto_cm": 180,
  "profundidad_cm": 40,
  "posicion_en_tienda": "Pasillo 3",
  "orden": 1,
  "version_id": 7
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

> **[CLEAN CODE — Query de lectura directa]**  
> No requiere lógica de negocio. Modelar como query de lectura directa en el repositorio: `GondolaRepository.findById(id)`.
