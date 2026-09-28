# Módulo 17 — Evidencia de implementación

Fotos que el Implementador sube de cada góndola ya montada en su tienda, según la versión de
planograma que tiene asignada. Se asocian a **versión + tienda + góndola**: la misma versión puede
estar montada en varias tiendas y cada una reporta su propia evidencia.

Tabla nueva `EvidenciaImplementacion` (migración `011_evidencia_implementacion.js`):

| Columna | Tipo | Nota |
|---------|------|------|
| `id` | int PK | |
| `planograma_version_id` | int FK `PlanogramaVersion` | sin cascada (la limpieza llega por la góndola) |
| `tienda_id` | int FK `Tienda` | sin cascada |
| `gondola_id` | int FK `Gondola` | `ON DELETE CASCADE`: borrar una góndola (versión piloto editable) o la versión completa (`PlanogramaVersion` → `Gondola` → aquí) borra su evidencia. Una sola ruta de cascada, porque SQL Server no admite dos. El blob queda huérfano, igual que con `Adjunto`. |
| `nombre_original` | varchar(255) | |
| `tipo_mime` | varchar(100) | solo imágenes: `image/jpeg`, `image/png`, `image/webp` |
| `tamano_bytes` | int | |
| `blob_container` | varchar(100) | mismo contenedor privado que `Adjunto` |
| `blob_path` | varchar(500) | `evidencias/{tiendaCodigo}/{versionId}/{uuid}-{nombre}` |
| `blob_url` | varchar(1000) | URL sin SAS; la descarga siempre pasa por el backend |
| `subido_por` | varchar(100) | usuario del JWT (`req.usuario.usuario`) |
| `created_at` | datetime | default `now()` |

Índice por `(tienda_id, planograma_version_id)`.

Reglas comunes a los endpoints:

- La versión debe ser `publicado` o `piloto` **y** estar asignada a la tienda (`VersionTienda`);
  si no → `404 NOT_FOUND`.
- La góndola debe pertenecer a esa versión; si no → `400 VALIDATION_ERROR`.
- El binario se guarda con el mismo `blobClient` que Adjuntos (módulo 13).

Endpoints:

| Método | Ruta | Contrato |
|--------|------|----------|
| `GET` | `/tiendas/{tiendaId}/versiones/{versionId}/evidencias` | `GET_evidencias_lista.md` |
| `POST` | `/tiendas/{tiendaId}/versiones/{versionId}/evidencias` | `POST_evidencias_agregar.md` |
| `GET` | `/evidencias/{id}/descargar` | `GET_evidencias_descargar.md` |
| `DELETE` | `/evidencias/{id}` | `DELETE_evidencias_eliminar.md` |
