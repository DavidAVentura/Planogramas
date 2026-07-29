# Contrato: Detalle de Posición (Vista Implementador)

**Método:** `GET`  
**Ruta:** `/api/v1/posiciones/{id}/detalle`  
**Actor:** Implementador  
**Caso de uso:** CU-07-02  

---

## Descripción

Retorna el detalle completo de una posición enriquecido con datos del producto desde CATI: imagen, nombre, marca, precio y jerarquía. Incluye instrucciones de montaje (accesorios + nota desborde). Endpoint de solo lectura para la vista del Implementador.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Reglas de negocio

1. El backend consulta la posición en SQL y enriquece con datos del SKU desde CATI.
2. La imagen se selecciona con `destinoImagen = 'PRINCIPAL'`, o el primer asset.
3. Solo retorna la posición si su versión padre está `publicada`. Una posición en versión `borrador` no es visible para el Implementador.
4. Los campos de edición (como `min_final`, `max_final`) se incluyen como referencia informativa.

---

## Response — 200 OK

```json
{
  "posicion": {
    "id": 55,
    "sku": "10012345",
    "nombre_producto": "Aceite Motor 10W30 1L",
    "marca": "Castrol",
    "precio": 85.00,
    "imagen_url": "https://vtex.cemaco.com/productos/10012345_XL.jpg",
    "facings_horizontal": 3,
    "cantidad_apilable": 1,
    "unidades_por_facing": 4,
    "capacidad_maxima": 12,
    "min_final": 3,
    "max_final": 12,
    "perfil_redondeo": "MRP",
    "modo": "PLANOGRAMA",
    "cross_externo": false,
    "montar_en_display": false,
    "desborda_gondola": false,
    "nota_desborde": null,
    "decision": "ACTIVO",
    "observaciones": "Verificar fecha de vencimiento en bodega",
    "accesorios": [
      {
        "codigo": "G-12",
        "nombre": "Gancho 12 pulgadas",
        "tipo": "GANCHO",
        "longitud_cm": 30,
        "nota_libre": "Colocar a la derecha del producto"
      }
    ]
  }
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `403 Forbidden` | La versión padre no está publicada. |
| `404 Not Found` | Posición no existe. |
| `503 Service Unavailable` | CATI no disponible para enriquecer con datos del producto. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Composición de puertos]**  
> `ObtenerDetallePosicionUseCase` orquesta dos fuentes: `IPosicionRepository.findByIdConAccesorios(id)` (SQL) e `ICatalogoService.obtenerProducto(sku)` (CATI). Si CATI falla, retornar la posición con datos básicos y un campo `productoEnriquecido: false`.

> **[SOLID — SRP]**  
> El enriquecimiento con datos de CATI es un concern separado. Encapsularlo en `PosicionEnriquecedor.enriquecer(posicion): PosicionDetalle`.

> **[CLEAN CODE — Modo degradado]**  
> Si CATI no responde, no fallar con 503. Retornar 200 con `imagen_url: null`, `nombre_producto: null`, `marca: null`, `precio: null` y agregar un campo `advertencia: "Datos del producto no disponibles en este momento"`. El Implementador puede ver las instrucciones de montaje aunque no vea la imagen.
