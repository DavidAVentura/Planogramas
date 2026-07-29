# Nota: Sesiones de Captura Fotográfica — Fuera del MVP

> ⚠️ **Estos endpoints están diseñados pero NO se implementarán en la iteración actual del MVP.**  
> Se documentan aquí como referencia para el diseño de la siguiente fase.  
> Ver `REUNION_TECNICA.md` para el roadmap y los gates de rollout.

---

Los endpoints de sesiones de captura cubren el flujo:
1. Iniciar sesión de captura asociada a una versión
2. Subir fotos de módulo
3. Ejecutar el agente de visión (Claude Vision vía n8n) — operación asíncrona
4. Revisar la propuesta de detección generada
5. Aceptar/editar/rechazar detecciones individuales
6. Confirmar la propuesta y materializar posiciones en la versión

---

## Endpoints planificados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/sesiones-captura` | Inicia una sesión de captura |
| `GET` | `/sesiones-captura/{id}` | Estado de la sesión |
| `POST` | `/sesiones-captura/{id}/fotos` | Sube foto de módulo |
| `POST` | `/sesiones-captura/{id}/fotos/{fotoId}/retomar` | Marca foto como inválida |
| `POST` | `/sesiones-captura/{id}/ejecutar-agente` | Dispara el agente de visión (async) |
| `GET` | `/sesiones-captura/{id}/propuesta` | Retorna propuesta de detección |
| `PATCH` | `/sesiones-captura/{id}/propuesta/detecciones/{id}` | Acepta/edita/rechaza una detección |
| `POST` | `/sesiones-captura/{id}/aceptar` | Confirma propuesta y materializa posiciones |

---

## Consideraciones de arquitectura para la siguiente fase

> **[HEXAGONAL — Agente externo]**  
> Claude Vision se integra como un puerto externo (`IVisionAgente`). El backend publica un job en n8n y expone un webhook para recibir los resultados. La operación es asíncrona — el frontend hace polling sobre `GET /sesiones-captura/{id}`.

> **[CLEAN CODE — Estado de sesión]**  
> La sesión de captura tiene su propio ciclo de vida independiente del ciclo de la versión: `iniciada → en_captura → procesando_agente → propuesta_lista → confirmada`. Modelar con su propia máquina de estados.

> **[SOLID — SRP]**  
> El servicio de análisis de calidad de foto (resolución, luz, contraste) — actualmente en el frontend (`analyzeCapturedPhoto`) — debe migrar al backend para ser confiable y auditable. Encapsular en `FotoCalidadAnalyzer`.

> **[CLEAN CODE — Traza de detección]**  
> La propuesta del agente de visión debe guardar la confianza de cada detección (`0.0 - 1.0`) y las alternativas de SKU candidatas. Esto es crítico para el principio de "nunca fingir que una detección es real cuando no lo es" (del CLAUDE.md).

> **[HEXAGONAL — Separación de datos reales vs simulados]**  
> La vista de Revisión actual es simulada (`makeDetectionRows`). Al implementar esta fase, los datos del agente real deben fluir por un puerto completamente separado — nunca mezclar con la lógica de simulación del MVP.
