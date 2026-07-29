# Contrato: Validar Versión para Publicación

**Método:** `GET`  
**Ruta:** `/api/v1/versiones/{id}/validar-publicacion`  
**Actor:** Analista  
**Caso de uso:** CU-06-02 (paso previo)  

---

## Descripción

Ejecuta todas las validaciones previas a la publicación sin cambiar el estado de la versión. Retorna errores bloqueantes y advertencias. El frontend llama a este endpoint antes de mostrar el diálogo de confirmación de publicación.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido |
|-----------|------|-----------|
| `id` | `integer` | Sí |

---

## Reglas de negocio (validaciones ejecutadas)

**Bloqueantes:**
1. Posiciones con `min_final > max_final`.
2. Posiciones con SKU que no existe en el catálogo activo (tabla local `Producto`).

**Advertencias (no bloquean):**
1. Niveles con ancho ocupado > ancho disponible (desborde de góndola).
2. Posiciones con `decision = 'BAJA'` (siguen presentes en el planograma).
3. La versión no tiene tiendas asignadas.

---

## Response — 200 OK (válida)

```json
{
  "valida": true,
  "erroresBloqueantes": [],
  "advertencias": [
    "El nivel 3 de Góndola A tiene desborde de 10 cm."
  ]
}
```

## Response — 200 OK (inválida)

```json
{
  "valida": false,
  "erroresBloqueantes": [
    {
      "posicionId": 15,
      "sku": "10012345",
      "gondola": "Góndola A",
      "nivel": 2,
      "error": "min_final (5) > max_final (4)"
    }
  ],
  "advertencias": []
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | Versión no existe. |

---

## Anotaciones de arquitectura

> **[SOLID — OCP / Strategy]**  
> Implementar cada validación como un `IValidadorPublicacion` con método `validar(versionId): ValidationResult`. El caso de uso itera sobre una lista de validadores inyectados. Agregar nuevas validaciones = agregar nuevas implementaciones, sin modificar el caso de uso.

> **[SOLID — SRP]**  
> Este endpoint solo valida — no modifica estado. El endpoint `PATCH /versiones/{id}/publicar` es quien efectúa el cambio de estado.

> **[CLEAN CODE]**  
> Reutilizar `ValidarPublicacionUseCase` tanto en este endpoint (solo lectura) como en el endpoint de publicar (antes de ejecutar la transacción).
