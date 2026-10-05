import { useCallback, useEffect, useState } from 'react';
import { adjuntosService } from '../services/adjuntos.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import { subirABlob } from '../utils/adjuntoArchivo';
import type { Adjunto, AdjuntoTipoMime, SolicitarSubidaAdjuntoInput, SubidaAdjunto } from '../types/adjunto';

// Misma lista blanca y tope de tamaño que el backend (ver adjunto.entity.js) — validar acá evita
// un viaje al servidor para un error que ya se puede detectar en el navegador.
const TIPOS_PERMITIDOS: AdjuntoTipoMime[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const TAMANO_MAXIMO_BYTES = 40 * 1024 * 1024;

// Algunos navegadores/equipos sin Office registrado entregan `File.type` vacío (o genérico) para
// Excel; en ese caso se deduce el tipo por la extensión.
const TIPO_POR_EXTENSION: Record<string, AdjuntoTipoMime> = {
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function tipoMimeDe(archivo: File): AdjuntoTipoMime | null {
  if (TIPOS_PERMITIDOS.includes(archivo.type as AdjuntoTipoMime)) return archivo.type as AdjuntoTipoMime;
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  return TIPO_POR_EXTENSION[extension] ?? null;
}

function validarArchivo(archivo: File): string | null {
  if (!tipoMimeDe(archivo)) {
    return 'Tipo de archivo no permitido. Se aceptan imágenes (JPG, PNG, WEBP), PDF o Excel (XLS, XLSX).';
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return 'El archivo excede el tamaño máximo permitido (40MB).';
  }
  return null;
}

export function useAdjuntosDeVersion(versionId: number) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  /** Porcentaje de la subida en curso a Azure (0-100), o null si no hay subida. */
  const [progreso, setProgreso] = useState<number | null>(null);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setAdjuntos(await adjuntosService.listarPorVersion(versionId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar los adjuntos'), 'error');
    } finally {
      setCargando(false);
    }
  }, [versionId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * Flujo común de agregar/reemplazar: pide la URL SAS, sube el archivo directo a Azure (con
   * progreso) y confirma en la API, que verifica el blob y escribe la fila.
   */
  async function subirYConfirmar(
    archivo: File,
    solicitar: (datos: SolicitarSubidaAdjuntoInput) => Promise<SubidaAdjunto>,
    confirmar: (subida: SubidaAdjunto) => Promise<Adjunto>,
    mensajes: { exito: string; error: string },
  ): Promise<Adjunto | null> {
    const error = validarArchivo(archivo);
    if (error) {
      mostrarToast(error, 'error');
      return null;
    }
    setEnviando(true);
    setProgreso(0);
    try {
      const subida = await solicitar({
        nombre_original: archivo.name,
        tipo_mime: tipoMimeDe(archivo)!,
        tamano_bytes: archivo.size,
      });
      await subirABlob(subida.urlSubida, archivo, subida.tipoMime, setProgreso);
      const adjunto = await confirmar(subida);
      mostrarToast(mensajes.exito, 'success');
      return adjunto;
    } catch (err) {
      mostrarToast(mensajeDeError(err, mensajes.error), 'error');
      return null;
    } finally {
      setEnviando(false);
      setProgreso(null);
    }
  }

  async function agregar(archivo: File): Promise<boolean> {
    const nuevo = await subirYConfirmar(
      archivo,
      (datos) => adjuntosService.solicitarSubida(versionId, datos),
      (subida) =>
        adjuntosService.agregar(versionId, {
          nombre_original: archivo.name,
          tipo_mime: subida.tipoMime,
          blob_path: subida.blobPath,
        }),
      { exito: 'Adjunto subido', error: 'No se pudo subir el adjunto' },
    );
    if (nuevo) setAdjuntos((actual) => [nuevo, ...actual]);
    return nuevo !== null;
  }

  async function reemplazar(id: number, archivo: File): Promise<boolean> {
    const actualizado = await subirYConfirmar(
      archivo,
      (datos) => adjuntosService.solicitarSubidaReemplazo(id, datos),
      (subida) =>
        adjuntosService.reemplazar(id, {
          nombre_original: archivo.name,
          tipo_mime: subida.tipoMime,
          blob_path: subida.blobPath,
        }),
      { exito: 'Adjunto reemplazado', error: 'No se pudo reemplazar el adjunto' },
    );
    if (actualizado) setAdjuntos((actual) => actual.map((a) => (a.id === id ? actualizado : a)));
    return actualizado !== null;
  }

  async function eliminar(id: number): Promise<boolean> {
    setEnviando(true);
    try {
      await adjuntosService.eliminar(id);
      setAdjuntos((actual) => actual.filter((a) => a.id !== id));
      mostrarToast('Adjunto eliminado', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el adjunto'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { adjuntos, cargando, enviando, progreso, recargar: cargar, agregar, reemplazar, eliminar };
}
