# Contrato: Crear Accesorio

**Método:** `POST`  
**Ruta:** `/api/v1/accesorios`  
**Actor:** Analista  

---

## Descripción

Da de alta un accesorio en el catálogo de gondolería (ganchos, bandejas, barras...). El catálogo
crece a medida que llegan planogramas nuevos (ej. un código del Excel de productos que todavía no
existe — ver `20_importacion/POST_versiones_importar_productos.md`).

---

## Request

```json
{
  "codigo": "R45-12-212P2",
  "nombre": "Gancho sencillo 12 pulgadas",
  "tipo": "GANCHO",
  "alto_cm": 2.5,
  "ancho_cm": null,
  "profundidad_cm": 30.5,
  "notas_capacidad": null
}
```

| Campo | Tipo | Requerido | Regla |
|-------|------|-----------|-------|
| `codigo` | `string` | Sí | 1–50 chars. Se guarda en mayúsculas y sin espacios extra. Único sin distinguir mayúsculas. |
| `nombre` | `string` | Sí | 1–200 chars. |
| `tipo` | `string` | Sí | `GANCHO`, `BANDEJA`, `BARRA`, `CANASTA`, `OTRO`. |
| `alto_cm` | `number \| null` | No | Mayor a 0, máximo 9999. Centímetros; se guarda con 2 decimales (`DECIMAL(8,2)`, se redondea si trae más). |
| `ancho_cm` | `number \| null` | No | Mayor a 0, máximo 9999. Centímetros; se guarda con 2 decimales (`DECIMAL(8,2)`, se redondea si trae más). |
| `profundidad_cm` | `number \| null` | No | Mayor a 0, máximo 9999. Centímetros; se guarda con 2 decimales (`DECIMAL(8,2)`, se redondea si trae más). Cuánto sobresale el accesorio (ej. largo del gancho); es la medida que usa el sugerido de unidades por facing. |
| `notas_capacidad` | `string \| null` | No | Máximo 1000 chars. |

---

## Response — 201 Created

El accesorio creado (misma forma que `GET_accesorios_detalle.md`).

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | Falta `codigo`, `nombre` o `tipo`, o un campo no cumple su regla. |
| `401` | — | JWT ausente o inválido. |
| `409` | `CONFLICT` | Ya existe un accesorio con ese código (`details.accesorioId`). |
