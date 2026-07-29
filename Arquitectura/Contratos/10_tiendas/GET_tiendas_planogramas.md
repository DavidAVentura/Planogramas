# Contrato: Planogramas Publicados por Tienda

**Método:** `GET`  
**Ruta:** `/api/v1/tiendas/{tiendaId}/planogramas`  
**Actor:** Implementador  
**Caso de uso:** CU-07-01  

---

## Descripción

Retorna los planogramas publicados asignados a una tienda específica. Endpoint principal para la vista del Implementador. Filtra solo versiones en estado `publicado`.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `tiendaId` | `integer` | Sí |

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `departamento` | `string` | No | Filtra por departamento. |

---

## Response — 200 OK (con planogramas)

```json
{
  "tienda": {
    "id": 1,
    "codigo": "GTM-PRA",
    "nombre": "Cemaco Pradera"
  },
  "planogramas": [
    {
      "versionId": 10,
      "codigo": "AUTOS 01-TG",
      "tipo": "GRANDE",
      "planogramaId": 42,
      "nombre": "AUTOS 01",
      "departamento": "AUTOS",
      "subcategorias": ["Aceites y lubricantes", "Accesorios eléctricos"]
    }
  ]
}
```

## Response — 200 OK (sin planogramas)

```json
{
  "tienda": { "id": 1, "codigo": "GTM-PRA", "nombre": "Cemaco Pradera" },
  "planogramas": [],
  "mensaje": "No hay planogramas publicados asignados a esta tienda"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Tienda no existe. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL — Actor diferente]**  
> El Implementador tiene acceso de solo lectura. Verificar en el middleware de autorización que el rol del usuario sea compatible (Analista o Implementador). Un Implementador no puede llamar endpoints de escritura.

> **[CLEAN CODE]**  
> El campo `mensaje` en respuesta vacía ayuda al frontend a mostrar un estado informativo en lugar de una lista vacía sin contexto.
