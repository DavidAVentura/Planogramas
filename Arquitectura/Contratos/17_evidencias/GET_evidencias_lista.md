# Contrato: Listar evidencia de una versión en una tienda

**Método:** `GET`  
**Ruta:** `/api/v1/tiendas/{tiendaId}/versiones/{versionId}/evidencias`  
**Actor:** Implementador  
**Caso de uso:** CU-07-03 (nuevo: reportar evidencia de implementación)  

---

## Descripción

Lista las fotos de evidencia que la tienda subió para la versión, agrupadas por góndola. Incluye
todas las góndolas de la versión (también las que aún no tienen fotos), para que el modal pueda
mostrar "Sin fotos" y el avance.

---

## Reglas de negocio

1. Reglas comunes del módulo (ver `README.md`): versión publicada o piloto asignada a la tienda.
2. Góndolas ordenadas por `Gondola.orden`; fotos por `created_at` ascendente.
3. `puedeEliminar` es `true` solo si `subido_por` coincide con el usuario del JWT.

---

## Response — 200 OK

```json
{
  "versionId": 10,
  "tiendaId": 1,
  "gondolas": [
    {
      "id": 101,
      "nombre": "Góndola 1",
      "orden": 1,
      "evidencias": [
        {
          "id": 7,
          "nombre_original": "gondola1.jpg",
          "tipo_mime": "image/jpeg",
          "tamano_bytes": 482133,
          "subido_por": "jlopez",
          "created_at": "2026-09-18T16:42:00.000Z",
          "puedeEliminar": true
        }
      ]
    },
    { "id": 102, "nombre": "Góndola 2", "orden": 2, "evidencias": [] }
  ]
}
```

---

## Códigos de error

| Código | `error.code` | Condición |
|--------|--------------|-----------|
| `400` | `VALIDATION_ERROR` | `tiendaId` o `versionId` no es un entero positivo. |
| `401` | — | JWT ausente o inválido. |
| `404` | `NOT_FOUND` | La tienda no existe o está inactiva. |
| `404` | `NOT_FOUND` | La versión no es publicada/piloto o no está asignada a la tienda. |
