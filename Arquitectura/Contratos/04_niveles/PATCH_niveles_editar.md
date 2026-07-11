# Contrato: Editar Nivel

**Método:** `PATCH`  
**Ruta:** `/api/v1/niveles/{id}`  
**Actor:** Analista  
**Caso de uso:** CU-03-06  

---

## Descripción

Modifica propiedades de un nivel: altura, accesorio, ancho disponible, notas. Si cambia el `tipo_accesorio` y el nivel ya tiene posiciones, retorna una advertencia para que el Analista revise `unidades_por_facing`. Partial update.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

### Body (JSON) — todos opcionales

| Campo | Tipo | Validación |
|-------|------|------------|
| `altura_desde_piso_cm` | `number` | Mayor a 0. |
| `tipo_accesorio` | `string` | `GANCHO`, `BANDEJA`, `BARRA`, `CANASTA`, `OTRO`. |
| `codigo_accesorio_id` | `integer \| null` | FK a Accesorio. `null` limpia el campo. |
| `tamano_accesorio_pulgadas` | `number \| null` | Mayor a 0. |
| `ancho_disponible_cm` | `number` | Mayor a 0. |
| `notas` | `string \| null` | Máximo 200 chars. |

---

## Reglas de negocio

1. Si cambia `tipo_accesorio` y el nivel tiene posiciones → respuesta con `advertencia` (no bloquea).
2. Si cambia `ancho_disponible_cm` a un valor menor que el ancho actualmente ocupado por posiciones → respuesta con `advertencia`.
3. La versión padre debe estar en modo editable.

---

## Response — 200 OK (sin advertencias)

```json
{
  "id": 7,
  "orden": 3,
  "altura_desde_piso_cm": 95,
  "tipo_accesorio": "GANCHO",
  "accesorio": { "id": 5, "codigo": "G-12", "nombre": "Gancho 12 pulgadas" },
  "tamano_accesorio_pulgadas": 12,
  "ancho_disponible_cm": 120,
  "notas": null
}
```

## Response — 200 OK (con advertencia)

```json
{
  "id": 7,
  "tipo_accesorio": "BANDEJA",
  "advertencia": "El tipo de accesorio cambió. Revisa unidades_por_facing en las posiciones existentes."
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Body vacío o campos inválidos. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Nivel no existe. |
| `422 Unprocessable Entity` | Versión no editable. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Advertencias vs Errores]**  
> Distinguir entre errores bloqueantes (422) y advertencias informativas en la respuesta. Las advertencias se retornan en el campo `advertencia` dentro del 200 OK para que el frontend pueda mostrarlas sin interrumpir el flujo.

> **[SOLID — SRP]**  
> La verificación de posiciones afectadas por el cambio de `tipo_accesorio` es un side-effect que puede encapsularse en un método `Nivel.cambiarAccesorio(nuevoTipo): Advertencia[]`.
