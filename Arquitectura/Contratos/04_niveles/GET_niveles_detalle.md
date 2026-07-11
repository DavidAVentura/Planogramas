# Contrato: Detalle de Nivel

**Método:** `GET`  
**Ruta:** `/api/v1/niveles/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-06  

---

## Descripción

Retorna el detalle completo de un nivel: orden, altura desde el piso, accesorio principal y ancho disponible. Usado por el frontend para cargar los datos actuales en el formulario de edición de nivel.

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
  "id": 12,
  "gondola_id": 1,
  "orden": 2,
  "altura_desde_piso_cm": 45,
  "accesorio_principal_id": 3,
  "accesorio_principal_codigo": "B-40",
  "accesorio_principal_nombre": "Bandeja 40cm",
  "ancho_disponible_cm": 120,
  "tipo_accesorio": "BANDEJA",
  "tamano": "MEDIANO"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Nivel no existe. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Query de lectura directa]**  
> No requiere lógica de negocio. Modelar como query de lectura directa en el repositorio: `NivelRepository.findById(id)`.
