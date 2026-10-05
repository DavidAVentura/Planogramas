# Contrato: URL de Descarga de un Adjunto

**Método:** `GET`
**Ruta:** `/api/v1/adjuntos/{id}/url-descarga`
**Actor:** Analista / Implementador
**Caso de uso:** CU-09-05

---

## Descripción

Devuelve una **URL SAS de solo lectura** para que el navegador baje el archivo **directo desde Azure Blob**, sin pasar por el backend. El navegador lo descarga en streaming, con su propia barra de progreso y sin cargarlo en la memoria de la página. Esto es importante para archivos de hasta 40MB que se descargan con frecuencia.

El contenedor de Azure es **privado**: `blobUrl` (expuesto en los otros contratos de este módulo) no lleva SAS y no sirve para descargar. Esta URL firmada es la única forma soportada de obtener el contenido de un adjunto.

Este endpoint reemplaza a `GET /adjuntos/{id}/descargar`, que hacía streaming del binario a través del backend.

---

## Parámetros de entrada

### Path Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `integer` | Sí | ID del adjunto. |

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `modo` | `string` | No | `attachment` (default): el navegador guarda el archivo con su nombre original. `inline`: lo abre en el navegador; se usa para imágenes y PDF. |

---

## Reglas de negocio

1. El adjunto debe existir; si no, `404`.
2. La URL solo permite leer (`sp=r`) ese blob y vence a los **5 minutos**. El front la pide justo antes de abrir o descargar el archivo, nunca la guarda.
3. La firma fuerza en la respuesta de Azure:
   - `Content-Type`: el `tipoMime` guardado.
   - `Content-Disposition`: `{modo}; filename="{nombre ASCII}"; filename*=UTF-8''{nombre original}`, para que el archivo conserve acentos y "ñ" al guardarse.
4. No se verifica que el blob exista antes de firmar: si se borró fuera de la app, Azure responde `404` al abrir la URL.

---

## Response — 200 OK

```json
{
  "url": "https://{cuenta}.blob.core.windows.net/adjuntos/versiones/10/3f2a1c9e-...-Surtido_Autos_Q4.xlsx?sv=...&sp=r&se=...&rscd=...&rsct=...&sig=...",
  "expiraEn": "2026-10-05T15:07:00.000Z"
}
```

---

## Códigos de error

| Código | Condición |
|--------|-----------|
| `400 Bad Request` | `id` no es un entero positivo o `modo` no es `inline` ni `attachment`. |
| `401 Unauthorized` | JWT ausente. |
| `404 Not Found` | El adjunto no existe en la BD. |
| `503 Service Unavailable` | No se pudo firmar la URL. |

---

## Anotaciones de arquitectura

> **[HEXAGONAL]**
> `obtenerUrlDescarga(adjuntoRepo, blobStorage, id, modo)` arma el `Content-Disposition` en el dominio (`construirContentDisposition` en `adjunto.entity.js`) y delega la firma al puerto `blobStorage.generarUrlDescarga`.

> **[SEGURIDAD]**
> La autorización la hace este endpoint, que exige JWT. La URL que devuelve vale solo para ese blob, solo para leer y por pocos minutos. Nunca se usa `blobUrl` sin SAS como link.
