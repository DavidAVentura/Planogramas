# Contrato: Sesión del usuario

**Método:** `GET`  
**Ruta:** `/api/v1/auth/sesion`  
**Actor:** Cualquier usuario autenticado  
**Permiso:** solo autenticado (excepción explícita; no aplica A/I/C)  

---

## Descripción

Devuelve la identidad del usuario, sus perfiles y permisos del módulo PLANOGRAMA y las capacidades
que el front usa para decidir modos, navbar y rutas. La respuesta se arma con lista blanca: no se
expone el cuerpo crudo de CAO ni el token. Ver `Arquitectura/SEGURIDAD_PERMISOS.md`.

---

## Respuesta exitosa `200`

Claves exactas, en este orden:

```json
{
  "id": "100702",
  "numeroEmpleado": "100702",
  "usuario": "100702",
  "nombre": "DAVID VENTURA",
  "correo": null,
  "perfiles": [{ "codigo": "PCOMER-EST", "nombre": "P. Comercial estandarizado", "permisos": ["PLA001", "…", "PLA010"] }],
  "permisos": ["PLA001", "…", "PLA010"],
  "capacidades": { "analista": true, "implementador": true },
  "tiendas": [{ "cod_tienda": "T004", "nombre": "Zona 4", "cod_tipo": 1 }]
}
```

| Campo | Descripción |
|---|---|
| `numeroEmpleado` | Campo `user` de CAO; identidad para auditoría y evidencias. |
| `perfiles` | Perfiles del usuario en el módulo, cada uno con sus permisos. |
| `permisos` | Unión sin duplicados de los permisos de todos los perfiles. |
| `capacidades.analista` | Regla A: tiene todos PLA001–PLA008. |
| `capacidades.implementador` | Tiene PLA009 o PLA010. |
| `tiendas` | Tal cual las entrega CAO (`cod_tienda`, `nombre`, `cod_tipo`); aún no se usan para filtrar (DT-10). |

- `correo` puede venir `undefined` y entonces se omite del JSON.
- Se eliminó el campo `cao`.
- Usuario autenticado en CAO sin perfiles en el módulo: `200` con `perfiles: []`, `permisos: []` y
  `capacidades: { "analista": false, "implementador": false }`.

---

## Errores

| Código | `code` | Cuándo |
|---|---|---|
| `401` | `UNAUTHORIZED` | Sin token, token inválido o **sin número de empleado** (mensaje `Sesión sin número de empleado`). |
| `503` | `SERVICE_UNAVAILABLE` | CAO no responde. |

## Error común de autorización (todos los endpoints protegidos)

```json
403 { "error": { "code": "FORBIDDEN", "message": "No tienes permiso para esta acción" } }
```

Sin `details`. Se resuelve antes de cualquier validación `400`/`404` y de cualquier acceso a BD,
CATI o Blob.

---

## Cobertura mínima Postman

- `200` con `TOKEN_CAO` de analista: PLA001–PLA010, `capacidades.analista: true`, sin `cao` ni `token`.
- `401` sin token.
- `403` con usuario de tienda sobre un endpoint de analista (pendiente hasta que exista `TOKEN_CAO_TIENDA`, DT-19).
