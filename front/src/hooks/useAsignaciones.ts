import { useCallback, useEffect, useState } from 'react';
import { asignacionesService } from '../services/asignaciones.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type {
  CambioAsignacion,
  EventoHistorial,
  MatrizAsignaciones,
  ResultadoEdicion,
  ResumenVersion,
} from '../types/asignacion';

/** Matriz planograma × tienda de la vista Estructura. */
export function useMatrizAsignaciones() {
  const [matriz, setMatriz] = useState<MatrizAsignaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [recargas, setRecargas] = useState(0);
  const { mostrarToast } = useToast();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    asignacionesService
      .obtenerMatriz()
      .then((m) => vigente && setMatriz(m))
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudo cargar la estructura'), 'error'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [recargas, mostrarToast]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { matriz, cargando, recargar };
}

export function useGuardarEdicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function guardar(cambios: CambioAsignacion[], motivo: string): Promise<ResultadoEdicion | null> {
    setEnviando(true);
    try {
      return await asignacionesService.guardarEdicion(cambios, motivo);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron guardar las asignaciones'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { guardar, enviando };
}

export function useHistorialAsignacion(planogramaId: number, tiendaId: number) {
  const [eventos, setEventos] = useState<EventoHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    asignacionesService
      .historial(planogramaId, tiendaId)
      .then((e) => vigente && setEventos(e))
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudo cargar el historial'), 'error'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [planogramaId, tiendaId, mostrarToast]);

  return { eventos, cargando };
}

export function useResumenVersion(versionId: number) {
  const [resumen, setResumen] = useState<ResumenVersion | null>(null);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    asignacionesService
      .resumenVersion(versionId)
      .then((r) => vigente && setResumen(r))
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudo cargar la versión'), 'error'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [versionId, mostrarToast]);

  return { resumen, cargando };
}
