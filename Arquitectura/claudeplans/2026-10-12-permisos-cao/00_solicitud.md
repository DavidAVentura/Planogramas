# Solicitud — Permisos CAO por perfil (SIP)

- **Fecha**: 2026-10-12
- **Rama**: `feat/permisos-cao` · **Commit base**: `c3c97b9ca3f09b1bbc4ff3d5e7c4ea215d65e579`
- **Tamaño**: L — aplica autorización por permisos CAO en back (endpoints) y front (navbar/rutas); toca DT-01.
- **Etapas**: arquitecto (1, 3) · disenador-ux · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

Incluir en la aplicación los permisos solicitados a IT CAO para el módulo PLANOGRAMA
("SIP - Sistema de Implementación de Planogramas", V01r01, tipo F), aplicados por perfil.

### Perfiles

| Perfil estandarizado | Perfil de aplicación | Descripción | Observación |
|---|---|---|---|
| PCOMER-EST | PLA_ADMIN | Administrador de la aplicación (desarrolladores) | Existente |
| CATEGORIA-EST | PLA_CAT | Usuario de categorías que carga y da mantenimiento a planogramas (es el administrador funcional) | Existente |
| TIENDAS-EST | PLA_TIENDA | Usuario de tienda que implementa los planogramas | Validar si existe; crear si no |

### Permisos (aplicaciones)

| Código | Descripción |
|---|---|
| PLA001 | Editar estructura |
| PLA002 | Crear planograma |
| PLA003 | Editar planograma |
| PLA004 | Crear versión de planograma |
| PLA005 | Editar versión de planograma |
| PLA006 | Editar versión en lienzo |
| PLA007 | Crear tienda |
| PLA008 | Editar tienda |
| PLA009 | Mi tienda |
| PLA010 | Productos |

### Permisos ordenados por perfil

- **PCOMER-EST / PLA_ADMIN**: PLA001–PLA010 (10).
- **CATEGORIA-EST / PLA_CAT**: PLA001–PLA010 (10).
- **TIENDAS-EST / PLA_TIENDA**: PLA009 Mi tienda, PLA010 Productos (2).

## Contexto adicional

- Auth actual vía CAO (`/auth?token=`, middleware `validar_token`); falta mapear permisos (memoria del proyecto).
- Deuda abierta relacionada: DT-01 (autorización por permisos/tiendas no aplicada).

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Admin y Categorías con permisos idénticos es intencional? | Sí. Categorías es el administrador funcional; PCOMER son los desarrolladores. Mismos permisos. |
| Acciones sin permiso en la matriz (asignaciones, cambios de estado de versión, eliminar/archivar, adjuntos y captura foto/IA, etc.) | Quedan habilitadas para usuarios con perfil PCOMER o CATEGORIA (en la práctica: quien tenga los permisos de analista). Documentar que se debe pedir a IT CAO la creación de esos permisos; cuando existan, se agregan a la aplicación. |
| ¿"Mi tienda" restringe a las tiendas asignadas al usuario? | No, en esta etapa. El dato de tienda por usuario no está actualizado en CAO (se pidió su actualización para precargarlo). Por ahora el usuario de tienda puede ver y elegir cualquier tienda. |
| ¿Qué es PLA010 Productos? | Las dos vistas del modo implementador (las dos opciones de su navbar: PLA009 Mi tienda y PLA010 Productos). El usuario de tienda solo ve esas dos vistas y no debe ver las vistas del analista. El analista sí puede entrar al modo implementador porque tiene ambos permisos. |
| ¿Qué es PLA001 Editar estructura? | La asignación de versiones de planograma a tiendas: la vista "Estructura" del navbar del analista. |
| (Arq. P1) Código del módulo SIP en CAO y perfil de tienda | Código de módulo `PLANOGRAMA`. El perfil de tienda está en validación con IT CAO: usar `TIENDA-EST` de momento (el usuario lo escribió así; en la matriz original aparece `TIENDAS-EST`). Dejarlo en un solo lugar configurable/constante: el usuario enviará el nombre exacto cuando lo confirmen. Usuario de tienda para Postman: sin respuesta todavía. |
| (Arq. P2) PLA005 vs PLA006 | PLA005 = formulario de edición de datos básicos de la versión (nombre, góndolas y similares). PLA006 = editar en el lienzo, es decir, abrir el lienzo. |
| (Arq. P3) `PUT /versiones/:id/tiendas` bajo PLA001 | Confirmado. |
| (Arq. P4) Usuario de tienda puede borrar evidencias de cualquier tienda (sin filtro por tienda) | Se acepta en esta etapa (sí pueden borrar). Documentarlo como deuda a resolver cuando llegue la actualización de tienda por usuario en CAO. |

### Ronda 2 (tras UX y seguridad)

| Pregunta | Respuesta del usuario |
|---|---|
| (Seg. P1) Usuario sin perfil en el módulo PLANOGRAMA | Se le muestra la vista de "no permitido", que le indica entrar nuevamente por **NOVA** (portal de acceso). No debe quedar en bucle de login. |
| (UX P2) Contacto en la pantalla sin acceso | Solicitar acceso con **Mesa de Ayuda, aprobado por su jefe inmediato**. |
| (UX P1) Analista sin PLA006 | Ocultar el acceso al lienzo (PLA006 = abrir el lienzo). PCOMER y CATEGORIAS tienen PLA006. |
| Forma real de la respuesta de CAO y suma de perfiles | Un usuario puede tener **varios perfiles**; sus permisos efectivos son la **unión** de los permisos de todos sus perfiles. La autorización busca por código de permiso (o de perfil cuando aplique). Ejemplo real (token omitido):<br>`{ "user": "100702", "username": "DAVID VENTURA", "perfiles": [ { "cod_perfil": "PCOMER-EST", "perfil": "P. Comercial estandarizado", "permisos": ["PLA001", …, "PLA010"] } ], "tiendas": [ { "cod_tienda": "T004", "nombre": "Zona 4", "cod_tipo": 1 } ] }`<br>Notas: `user` es el número de empleado (identidad para auditoría/evidencias; verificar que el back lo use y no caiga en `'sistema'`). CAO ya trae `tiendas`, pero el dato no está actualizado: no filtrar por tienda en esta etapa (solo dejarlo disponible para el futuro filtro). Nunca exponer `token` al front más allá de lo actual. |

### Resueltas por el coordinador revisando el código (2026-10-12)

| Pregunta | Respuesta |
|---|---|
| (Seg. P2) ¿Alguna vista del implementador usa `GET /versiones/:id/estructura`? | No. Ningún archivo del front lo consume. Pasa a regla de analista. |
| (Seg. P3) ¿El lienzo llama a `PATCH /versiones/:id/guardar`? | No. Solo lo usa `PlanogramaDetalle` (`useGuardarVersion`, acción "Guardar" fuera del editor que avanza borrador → en_desarrollo). Es un cambio de estado: regla transitoria de analista (o PLA005 si el arquitecto lo justifica), no PLA006. |
| (UX P3) Persistencia del modo | `sessionStorage` (propuesta de UX; preferencia por pestaña, no es estado crítico). |

## Cambios pedidos en la aprobación 1

Aprobado (2026-10-13) con estas respuestas a las preguntas no bloqueantes del PLAN:
- Cambiar también el texto de `SesionRequerida` de "CemacoAllInOne" a **NOVA**.
- Las pruebas Postman con `TOKEN_CAO_TIENDA` se omiten mientras no exista usuario de tienda (T8 cubre con stubs).
- T17 (despliegue) solo se ejecuta cuando el usuario pida publicar.

