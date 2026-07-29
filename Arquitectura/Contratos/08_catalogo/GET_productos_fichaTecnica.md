# Contrato: Obtener Ficha Técnica de Producto

**Método:** `GET`  
**Ruta:** `/api/v1/catalog/productos/{sku}/ficha-tecnica`  
**Actor:** Analista  
**Caso de uso:** CU-04-15

---

## Descripción

Retorna la ficha técnica de un producto (especificaciones detalladas: descripción larga,
características, advertencias de uso, etc.) enriquecida por CATI. Usado en el bloque de "Ficha
técnica" de la ficha de producto, como tercera petición independiente — junto a la del detalle de
catálogo (`GET_productos_detalle.md`) y la de stock (`GET_productos_stock.md`).

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `sku` | `string` | Sí |

---

## Reglas de negocio

1. Proxy a `CATI GET /api/Product/fichaTecnica/{sku}`.
2. CATI no devuelve la ficha técnica como JSON estructurado: la envuelve en
   `{ success, message, data, errors, statusCode }`, donde `data` es un fragmento HTML de una
   tabla (`<tr><th>etiqueta</th><td>valor</td></tr>` por fila). Este endpoint traduce ese HTML a
   un arreglo de pares `{ etiqueta, valor }` en texto plano — ver anotación "Anti-corruption
   Layer" abajo. El frontend no recibe HTML crudo ni necesita `dangerouslySetInnerHTML`.
3. Las filas cuyo valor original tenía una lista (`<ul><li>...`) se aplanan a texto con viñetas
   (`• `) separadas por salto de línea (`\n`) — el frontend puede partir por `\n` para renderizar
   como lista, o mostrar el texto tal cual.
4. Sin cache — igual que `GET_productos_stock.md`, no hay evidencia de que este endpoint sea
   costoso, y cachear ficha técnica junto con búsqueda complicaría la invalidación sin beneficio
   claro.
5. Si CATI no tiene ficha técnica para el SKU, responde `200` con `data: ""` (no `404`) — este
   endpoint responde `200` con un arreglo vacío en ese caso. La ausencia de ficha técnica es un
   estado válido del producto, no un error.

---

## Response — 200 OK

```json
[
  {
    "etiqueta": "Descripción",
    "valor": "Este modelo de 55 plg está pensado para quienes quieren una experiencia visual más amplia..."
  },
  {
    "etiqueta": "Cantidad Entradas De Hdmi",
    "valor": "3 HDMI"
  },
  {
    "etiqueta": "Detalles del Producto",
    "valor": "• La resolución 4K y el procesador Crystal 4K ayudan a mostrar escenas más definidas.\n• Motion Xcelerator, HDR10+ y Filmmaker Mode mejoran la experiencia visual."
  },
  {
    "etiqueta": "Marca",
    "valor": "Samsung"
  }
]
```

Arreglo vacío (`[]`) cuando el producto no tiene ficha técnica registrada en CATI.

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `503 Service Unavailable` | CATI no disponible o no responde dentro del timeout. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Anti-corruption Layer]**  
> `mapFichaTecnica(raw)` en `catiClient.js` traduce el fragmento HTML de CATI a pares
> `{ etiqueta, valor }` de texto plano (`limpiarEtiquetaFichaTecnica` / `limpiarValorFichaTecnica`).
> Aísla al resto del código — y al frontend — de la forma HTML propia de este endpoint de CATI,
> distinta de la del resto del módulo `catalogo` (JSON estructurado).

> **[HEXAGONAL]**  
> `catalogo.controller.js#obtenerFichaTecnica` → `catiClient.obtenerFichaTecnica(sku)` → CATI. Sin
> capa de dominio propia, igual que el resto del módulo `catalogo` (ver nota en
> `GET_productos_detalle.md` y `Arquitectura/ESTRUCTURA_BACKEND.md`).
