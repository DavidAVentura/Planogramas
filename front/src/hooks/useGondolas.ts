import { useCallback, useEffect, useState } from 'react';
import { gondolasService } from '../services/gondolas.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { Gondola, GondolaEditada, GondolaInput, GondolaListItem, GondolaResumen, OrdenGondola } from '../types/gondola';

export function useGondolasDeVersion(versionId: number) {
  const [gondolas, setGondolas] = useState<GondolaListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setGondolas(await gondolasService.listarPorVersion(versionId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar las góndolas'), 'error');
    } finally {
      setCargando(false);
    }
  }, [versionId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { gondolas, cargando, recargar: cargar };
}

export function useAgregarGondola() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function agregar(versionId: number, datos: GondolaInput): Promise<Gondola | null> {
    setEnviando(true);
    try {
      const gondola = await gondolasService.agregar(versionId, datos);
      mostrarToast(`Góndola "${gondola.nombre}" creada`, 'success');
      return gondola;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo crear la góndola'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { agregar, enviando };
}

export function useEditarGondola() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function editar(id: number, cambios: Partial<GondolaInput>): Promise<GondolaEditada | null> {
    setEnviando(true);
    try {
      const gondola = await gondolasService.editar(id, cambios);
      mostrarToast('Góndola actualizada', 'success');
      return gondola;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar la góndola'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { editar, enviando };
}

export function useReordenarGondolas() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function reordenar(versionId: number, orden: OrdenGondola[]): Promise<OrdenGondola[] | null> {
    setEnviando(true);
    try {
      return await gondolasService.reordenar(versionId, orden);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo reordenar las góndolas'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { reordenar, enviando };
}

export function useResumenGondola() {
  const [cargando, setCargando] = useState(false);
  const { mostrarToast } = useToast();

  const obtenerResumen = useCallback(
    async (id: number): Promise<GondolaResumen | null> => {
      setCargando(true);
      try {
        return await gondolasService.obtenerResumen(id);
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudo obtener el resumen de la góndola'), 'error');
        return null;
      } finally {
        setCargando(false);
      }
    },
    [mostrarToast],
  );

  return { obtenerResumen, cargando };
}

export function useEliminarGondola() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function eliminar(id: number, forzar = false): Promise<boolean> {
    setEnviando(true);
    try {
      await gondolasService.eliminar(id, forzar);
      mostrarToast('Góndola eliminada', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la góndola'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { eliminar, enviando };
}
