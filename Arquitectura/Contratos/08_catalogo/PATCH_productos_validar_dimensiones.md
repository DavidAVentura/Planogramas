# Contrato: Validar Dimensiones de Producto

**Método:** `PATCH`  
**Ruta:** `/api/v1/catalog/productos/{sku}/dimensiones/validar`  
**Actor:** Analista  
**Caso de uso:** CU-04-13  

---

## Descripción

Confirma que las dimensiones físicas ya guardadas de un producto (en la tabla local `Producto`)
son correctas, sin modificarlas — a diferencia de
`PATCH /catalog/productos/{sku}/dimensiones`, que sí cambia los valores. Se usa cuando el analista
revisa una medida que vino de CATI/VTEX y confirma que ya es correcta, sin necesidad de reescribirla.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

### Body

Ninguno.

---

## Reglas de negocio

1. El SKU debe existir en la tabla local `Producto`. Si no existe, `404`.
2. Las tres dimensiones actuales (`ancho_cm`, `alto_cm`, `profundidad_cm`) deben ser mayores a 0.
   Si alguna es `null` o `<= 0`, retorna `422` — no tiene sentido validar una medida incompleta.
3. Solo modifica `dimensiones_validadas = true`. No toca `ancho_cm`/`alto_cm`/`profundidad_cm` ni
   `fuente_dimensiones`.

---

## Response — 200 OK

```json
{
  "sku": "10012345",
  "nombre": "Aceite Motor 10W30 1L",
  "ancho_cm": 9.0,
  "alto_cm": 22.0,
  "profundidad_cm": 9.0,
  "fuente_dimensiones": "CATI",
  "dimensiones_validadas": true
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | El SKU no existe en la tabla local `Producto`. |
| `422 Unprocessable Entity` | Alguna de las tres dimensiones es `null` o `<= 0` — no se puede validar una medida incompleta. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `ValidarDimensionesUseCase(productoRepo, sku)` → lee el producto, aplica
> `validarDimensionesCompletas` (regla pura en `producto.entity.js`) y, si pasa, llama
> `IProductoRepository.marcarDimensionesValidadas(sku)`. Mismo módulo `domain/producto/` que
> `PATCH_productos_actualizar_dimensiones.md`.

> **[CLEAN CODE — Regla reforzada en servidor]**  
> El frontend deshabilita el botón "Validar dimensiones" cuando alguna medida es 0, pero el `422`
> se valida igual en el backend — el frontend es una ayuda de UX, no la única barrera.
