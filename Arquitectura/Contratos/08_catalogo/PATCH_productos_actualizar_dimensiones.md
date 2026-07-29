# Contrato: Actualizar Dimensiones de Producto

**Método:** `PATCH`  
**Ruta:** `/api/v1/catalog/productos/{sku}/dimensiones`  
**Actor:** Analista  
**Caso de uso:** CU-04-12  

---

## Descripción

Corrige las dimensiones físicas (ancho, alto, profundidad) de un producto en la tabla local
`Producto` — la fuente de verdad LOCAL que usa el backend para validar el SKU de una `Posicion`,
distinta del catálogo de solo lectura que expone `GET /catalog/productos/{sku}` (proxy en vivo a
CATI). Se usa desde el panel de edición de una posición cuando las medidas que trae CATI/VTEX no
coinciden con la realidad física del producto.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

### Body (JSON) — todos requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ancho_cm` | `number` | Ancho físico del producto. Mayor a 0. |
| `alto_cm` | `number` | Alto físico del producto. Mayor a 0. |
| `profundidad_cm` | `number` | Profundidad física del producto. Mayor a 0. |

---

## Reglas de negocio

1. El SKU debe existir en la tabla local `Producto` (creada normalmente al agregar una posición
   con ese SKU por primera vez, ver `POST /niveles/{id}/posiciones`). Si no existe, `404`.
2. Al aplicar el cambio, el backend fija automáticamente `fuente_dimensiones = 'MANUAL'` y
   `dimensiones_validadas = true` — el analista que corrige una medida a mano la da por válida
   en el mismo paso. Estos dos campos no se aceptan en el body; cualquier valor enviado se ignora.
3. No valida ni sincroniza `ancho_asignado_cm`/`facings_horizontal` de las posiciones que usan
   este SKU — esa sincronización, si se decide hacer, es responsabilidad del frontend en el
   momento de guardar la posición (ver `PATCH_posiciones_editar.md`).

---

## Response — 200 OK

```json
{
  "sku": "10012345",
  "nombre": "Aceite Motor 10W30 1L",
  "ancho_cm": 9.5,
  "alto_cm": 22.0,
  "profundidad_cm": 9.0,
  "fuente_dimensiones": "MANUAL",
  "dimensiones_validadas": true
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | Falta `ancho_cm`/`alto_cm`/`profundidad_cm`, o alguno es `<= 0`. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | El SKU no existe en la tabla local `Producto`. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**  
> `ActualizarDimensionesUseCase(productoRepo, sku, datos)` → `IProductoRepository.actualizarDimensiones(sku, datos)`.
> Vive en `domain/producto/` — un módulo de dominio separado de `catalogo` (que es un proxy sin
> reglas de negocio propias, ver `catalogo.controller.js`). Se monta bajo el mismo prefijo
> `/catalog` que las rutas de solo lectura, pero en un archivo de rutas/controller distinto
> (`producto.routes.js`/`producto.controller.js`), sin acoplar ambos módulos.

> **[CLEAN CODE — Invariante de fuente]**  
> `fuente_dimensiones`/`dimensiones_validadas` los fija el repositorio de infraestructura, no el
> body del request — evita que un cliente pueda declarar `fuente_dimensiones: 'CATI'` sobre datos
> que en realidad tipeó un humano.
