# Solicitud — Registro de quién cargó la evidencia (código de empleado y nombre)

- **Fecha**: 2026-10-16
- **Rama**: `feat/evidencia-usuario-carga` · **Commit base**: `aab40fc926954d110744e8e711379966ef0566bd`
- **Tamaño**: L — probable cambio de modelo de datos (columnas nuevas en `EvidenciaImplementacion`) que toca back, front y datos del usuario autenticado (CAO).
- **Etapas**: arquitecto (1, 3) · disenador-ux · seguridad-integridad (2, 5) · desarrollador · revisor-calidad

## Solicitud del usuario

incluye que la evidencia lleve registro de la persona que cargó las imágenes, con código de empleado y nombre

## Contexto adicional

- La tabla `EvidenciaImplementacion` (migración `011_evidencia_implementacion.js`) ya tiene `subido_por` (string 100); revisar qué guarda hoy y de dónde sale.
- La rama sale del HEAD de `feat/consolidado-tiendas` (por indicación del usuario); la última migración existente es `017_indices_consolidado.js`.
- Hay cambios sin commitear de Consolidado Tiendas (`DEUDA_TECNICA.md`, su carpeta de plan, `.claude/launch.json`) que no son parte de esta solicitud.

## Preguntas resueltas

| Pregunta | Respuesta del usuario |
|---|---|
| ¿Dónde desarrollar con trabajo pendiente de Consolidado Tiendas? | "la anterior ya terminó, ahora ya puedes desarrollar acá" |
| Evidencias existentes sin nombre: ¿rellenar desde EdicionAsignacion? | Dejarlas sin nombre (solo las cargas nuevas llevan nombre; las viejas muestran solo el código). |
| ¿El código de empleado es el `user` de CAO? | Sí, el `user` de CAO (lo que ya guarda `subido_por`). |
| ¿Aplica también a Adjuntos (módulo 13)? | **Sí, también adjuntos** (mismo registro de código y nombre en `Adjunto`). |
| ¿El nombre queda fijo al momento de la carga? | Sí, fijo (registro histórico). |
| Aprobación de la entrega (2026-10-16) | El usuario aprobó la entrega, pidió aplicar la 018 en DEV (hecho), probó en local y aprobó la regla de presentación del autor en `DISENO_SISTEMA.md`. |

## Cambios pedidos en la aprobación 1

