import { useCallback, useEffect, useState } from 'react';
import { evidenciasService } from '../services/evidencias.service';
import { ApiError } from '../services/httpClient';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import { prepararImagenEvidencia } from '../utils/prepararImagenEvidencia';
import type { GondolaEvidencias } from '../types/evidencia';

/** Fotos de evidencia de una versión en la tienda, agrupadas por góndola. */
export function useEvidenciasDeVersion(tiendaId: number, versionId: number) {
  const [gondolas, setGondolas] = useState<GondolaEvidencias[]>([]);
  const [cargando, setCargando] = useState(true);
  /** Góndola a la que se está subiendo una foto. */
  const [subiendoEn, setSubiendoEn] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);
  const { mostrarToast } = useToast();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    evidenciasService
      .listar(tiendaId, versionId)
      .then((r) => vigente && setGondolas([...r.gondolas].sort((a, b) => a.orden - b.orden)))
      .catch((err) => vigente && mostrarToast(mensajeDeError(err, 'No se pudo cargar la evidencia'), 'error'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [tiendaId, versionId, mostrarToast]);

  const agregar = useCallback(
    async (gondolaId: number, archivo: File): Promise<boolean> => {
      setSubiendoEn(gondolaId);
      try {
        const imagen = await prepararImagenEvidencia(archivo);
        const nueva = await evidenciasService.agregar(tiendaId, versionId, {
          gondola_id: gondolaId,
          nombre_original: imagen.nombre,
          tipo_mime: imagen.tipoMime,
          archivo_base64: imagen.base64,
        });
        setGondolas((actual) =>
          actual.map((g) => (g.id === gondolaId ? { ...g, evidencias: [...g.evidencias, nueva] } : g)),
        );
        mostrarToast('Foto agregada', 'success');
        return true;
      } catch (err) {
        // Los errores de validación local (tipo, tamaño) llegan como Error con mensaje para el usuario.
        const mensaje =
          err instanceof Error && !(err instanceof ApiError) ? err.message : mensajeDeError(err, 'No se pudo subir la foto');
        mostrarToast(mensaje, 'error');
        return false;
      } finally {
        setSubiendoEn(null);
      }
    },
    [tiendaId, versionId, mostrarToast],
  );

  const eliminar = useCallback(
    async (id: number): Promise<boolean> => {
      setEliminando(id);
      try {
        await evidenciasService.eliminar(id);
        setGondolas((actual) => actual.map((g) => ({ ...g, evidencias: g.evidencias.filter((e) => e.id !== id) })));
        mostrarToast('Foto quitada', 'success');
        return true;
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudo quitar la foto'), 'error');
        return false;
      } finally {
        setEliminando(null);
      }
    },
    [mostrarToast],
  );

  return { gondolas, cargando, subiendoEn, eliminando, agregar, eliminar };
}

/**
 * Object URL de una foto de evidencia (el contenedor es privado: se descarga con el Bearer). Se
 * revoca al desmontar, o sea al cerrar el modal.
 */
export function useImagenEvidencia(id: number) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    let creada: string | null = null;
    setError(false);
    evidenciasService
      .descargar(id)
      .then((blob) => {
        if (!vigente) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
      setUrl(null);
    };
  }, [id]);

  return { url, error };
}
