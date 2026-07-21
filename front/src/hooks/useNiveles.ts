import { useCallback, useEffect, useState } from 'react';
import { nivelesService } from '../services/niveles.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { Nivel, NivelCambios, NivelEditado, NivelInput, NivelResumen, OrdenNivel } from '../types/nivel';

export function useNivelesDeGondola(gondolaId: number) {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    if (!gondolaId) {
      setNiveles([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      setNiveles(await nivelesService.listarPorGondola(gondolaId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar los niveles'), 'error');
    } finally {
      setCargando(false);
    }
  }, [gondolaId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { niveles, cargando, recargar: cargar };
}

export function useAgregarNivel() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function agregar(gondolaId: number, datos: NivelInput): Promise<Nivel | null> {
    setEnviando(true);
    try {
      const nivel = await nivelesService.agregar(gondolaId, datos);
      mostrarToast('Nivel creado', 'success');
      return nivel;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo crear el nivel'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { agregar, enviando };
}

export function useEditarNivel() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function editar(id: number, cambios: NivelCambios): Promise<NivelEditado | null> {
    setEnviando(true);
    try {
      const nivel = await nivelesService.editar(id, cambios);
      mostrarToast('Nivel actualizado', 'success');
      if (nivel.advertencia) mostrarToast(nivel.advertencia, 'info');
      return nivel;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar el nivel'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { editar, enviando };
}

export function useReordenarNiveles() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function reordenar(gondolaId: number, orden: OrdenNivel[]): Promise<OrdenNivel[] | null> {
    setEnviando(true);
    try {
      return await nivelesService.reordenar(gondolaId, orden);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo reordenar los niveles'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { reordenar, enviando };
}

export function useResumenNivel() {
  const [cargando, setCargando] = useState(false);
  const { mostrarToast } = useToast();

  const obtenerResumen = useCallback(
    async (id: number): Promise<NivelResumen | null> => {
      setCargando(true);
      try {
        return await nivelesService.obtenerResumen(id);
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudo obtener el resumen del nivel'), 'error');
        return null;
      } finally {
        setCargando(false);
      }
    },
    [mostrarToast],
  );

  return { obtenerResumen, cargando };
}

export function useEliminarNivel() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function eliminar(id: number, forzar = false): Promise<boolean> {
    setEnviando(true);
    try {
      await nivelesService.eliminar(id, forzar);
      mostrarToast('Nivel eliminado', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el nivel'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { eliminar, enviando };
}
