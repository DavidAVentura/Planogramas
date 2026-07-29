# Contrato: Listar Tiendas

**Método:** `GET`  
**Ruta:** `/api/v1/tiendas`  
**Actor:** Analista / Implementador  
**Caso de uso:** CU-02-05  

---

## Descripción

Lista las tiendas activas de la cadena con código, nombre, tipo y marca. Usado para asignar tiendas a versiones y para que el Implementador seleccione su tienda al abrir la app.

`marca` distingue el punto de venta (Cemaco, Jugueton, Bebé Jugueton) — un mismo local físico puede
tener códigos de tienda separados por marca. Puede venir `null` en tiendas sin marca asignada.

---

## Parámetros de entrada

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `tipo` | `string` | No | Filtra por tipo. Valores: `GRANDE`, `MEDIANA`, `EXPRESS`. |
| `estado` | `string` | No | Filtra por estado. Default: `activo`. |
| `sinVersionEspecial` | `boolean` | No | Si `true` con `planogramaId` y `versionBaseId`, excluye tiendas que ya tienen versión especial derivada de esa base. |
| `planogramaId` | `integer` | Condicional | Requerido si `sinVersionEspecial=true`. |
| `versionBaseId` | `integer` | Condicional | Requerido si `sinVersionEspecial=true`. |

---

## Reglas de negocio

1. Por defecto retorna solo tiendas activas.
2. Sin paginación (la cadena Cemaco tiene un número acotado de tiendas: < 50).
3. Ordenadas por `nombre ASC`.

---

## Response — 200 OK

```json
[
  {
    "id": 1,
    "codigo": "GTM-PRA",
    "nombre": "Cemaco Pradera",
    "tipo": "GRANDE",
    "region": "Guatemala Metropolitana",
    "marca": "Cemaco"
  },
  {
    "id": 2,
    "codigo": "GTM-OAK",
    "nombre": "Cemaco Oakland",
    "tipo": "GRANDE",
    "region": "Guatemala Metropolitana",
    "marca": "Cemaco"
  },
  {
    "id": 5,
    "codigo": "GTM-MED",
    "nombre": "Cemaco Mediana Norte",
    "tipo": "MEDIANA",
    "region": "Guatemala Norte",
    "marca": "Jugueton"
  }
]
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `tipo` con valor inválido, o `sinVersionEspecial=true` sin los parámetros requeridos. |
| `401 Unauthorized` | JWT ausente. |

---

## Anotaciones de arquitectura

> **[CLEAN CODE — Parámetros condicionales]**  
> El grupo `sinVersionEspecial + planogramaId + versionBaseId` es cohesivo: los tres deben ir juntos o ninguno. Validar en el controlador antes de pasar al caso de uso.

> **[SOLID — SRP]**  
> Si la lógica de `sinVersionEspecial` se vuelve compleja (sub-query con múltiples joins), extraerla a `TiendaRepository.findDisponiblesParaVersionEspecial(planogramaId, versionBaseId, tipo)`.
