# Contrato: Obtener Detalle de Producto

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos/{sku}`  
**Actor:** Analista  
**Caso de uso:** CU-04-02  

---

## Descripción

Retorna el detalle completo de un producto desde CATI: dimensiones físicas, imagen principal, precio, jerarquía de categorías y SKU sustituto sugerido. Usado al seleccionar un SKU en el editor antes de agregar la posición.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Product/{sku}?profile=CEMACO`.
2. La imagen principal se selecciona con `destinoImagen = 'PRINCIPAL'`, o el primer asset si no hay principal.
3. El `sku_sustituto`, `fuente_dimensiones` y `dimensiones_validadas` se retornan desde la tabla
   local `Producto` si existe, no desde CATI. Si el SKU todavía no existe en la tabla local,
   `sku_sustituto` y `fuente_dimensiones` vienen `null` y `dimensiones_validadas` viene `false`.
4. Si el SKU no existe en CATI, retorna `404`.

---

## Response — 200 OK

```json
{
  "sku": "10012345",
  "nombre": "Aceite Motor 10W30 1L",
  "marca": "Castrol",
  "subcategoria": "Aceites y lubricantes",
  "categoria_nivel1": "Hogar",
  "categoria_nivel2": "Automotriz",
  "ancho_cm": 9.0,
  "alto_cm": 22.0,
  "profundidad_cm": 9.0,
  "imagen_url": "https://vtex.cemaco.com/productos/10012345_XL.jpg",
  "precio": 85.00,
  "sku_sustituto": "10098765",
  "fuente_dimensiones": "CATI",
  "dimensiones_validadas": false
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | SKU no encontrado en CATI. |
| `503 Service Unavailable` | CATI no disponible. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Anti-corruption Layer]**  
> `CatiProductoMapper.toProductoDetalle(catiProduct)` transforma el modelo CATI (con `erpInformation`, `assets`, `internalAttributes`) al modelo interno simplificado.

> **[HEXAGONAL]**  
> `ObtenerProductoUseCase(sku)` → `ICatalogoService.obtenerProducto(sku)` → CATI. `sku_sustituto`,
> `fuente_dimensiones` y `dimensiones_validadas` se enriquecen desde `productoRepo.buscarPorSku(sku)`
> — fuente de verdad local. La escritura de `fuente_dimensiones`/`dimensiones_validadas` vive en un
> módulo de dominio separado (`domain/producto/`, ver
> `PATCH_productos_actualizar_dimensiones.md` y `PATCH_productos_validar_dimensiones.md`) — este
> endpoint solo lee.

> **[SOLID — SRP]**  
> La selección de la imagen principal (`destinoImagen = 'PRINCIPAL'`) es responsabilidad del mapper, no del caso de uso.
