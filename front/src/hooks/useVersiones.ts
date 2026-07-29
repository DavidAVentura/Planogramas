import { useCallback, useEffect, useState } from 'react';
import { versionesService } from '../services/versiones.service';
import { ApiError } from '../services/httpClient';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type {
  ErrorBloqueante,
  GuardarVersionResultado,
  PromoverAPilotoResultado,
  PromoverAPublicadoResultado,
  TiendaResumen,
  TiendasDeVersion,
  Version,
  VersionAnteriorArchivada,
  VersionListItem,
} from '../types/version';

function conVersionArchivada(mensaje: string, versionAnteriorArchivada?: VersionAnteriorArchivada | null): string {
  return versionAnteriorArchivada
    ? `${mensaje} (se archivó ${versionAnteriorArchivada.codigo})`
    : mensaje;
}

export function useVersionesDePlanograma(planogramaId: number) {
  const [versiones, setVersiones] = useState<VersionListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setVersiones(await versionesService.listarPorPlanograma(planogramaId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar las versiones'), 'error');
    } finally {
      setCargando(false);
    }
  }, [planogramaId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { versiones, cargando, recargar: cargar };
}

export function useCrearVersion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function crear(
    planogramaId: number,
    datos: Parameters<typeof versionesService.crear>[1],
  ): Promise<Version | null> {
    setEnviando(true);
    try {
      const version = await versionesService.crear(planogramaId, datos);
      mostrarToast(`Versión ${version.codigo} creada`, 'success');
      return version;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo crear la versión'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { crear, enviando };
}

/** Acción "Guardar" fuera del editor: avanza una versión en borrador a en_desarrollo. */
export function useGuardarVersion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function guardar(id: number): Promise<GuardarVersionResultado | null> {
    setEnviando(true);
    try {
      const version = await versionesService.guardar(id);
      mostrarToast(conVersionArchivada('Versión marcada en desarrollo', version.versionAnteriorArchivada), 'success');
      return version;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar la versión'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { guardar, enviando };
}

export function usePromoverAPiloto() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function promover(id: number, tiendaIds: number[]): Promise<PromoverAPilotoResultado | null> {
    setEnviando(true);
    try {
      const version = await versionesService.promoverAPiloto(id, tiendaIds);
      mostrarToast(conVersionArchivada('Versión promovida a piloto', version.versionAnteriorArchivada), 'success');
      return version;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo promover la versión'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { promover, enviando };
}

interface ResultadoPublicar {
  version?: PromoverAPublicadoResultado;
  erroresBloqueantes?: ErrorBloqueante[];
}

export function usePublicarVersion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function publicar(id: number): Promise<ResultadoPublicar> {
    setEnviando(true);
    try {
      const version = await versionesService.promoverAPublicado(id);
      mostrarToast(conVersionArchivada(`Versión ${version.codigo} publicada`, version.versionAnteriorArchivada), 'success');
      return { version };
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        return { erroresBloqueantes: err.details as ErrorBloqueante[] };
      }
      mostrarToast(mensajeDeError(err, 'No se pudo publicar la versión'), 'error');
      return {};
    } finally {
      setEnviando(false);
    }
  }

  return { publicar, enviando };
}

export function useArchivarVersion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function archivar(id: number): Promise<Version | null> {
    setEnviando(true);
    try {
      const version = await versionesService.archivar(id);
      mostrarToast(`Versión ${version.codigo} archivada`, 'success');
      return version;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo archivar la versión'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { archivar, enviando };
}

export function useTiendasVersion(id: number) {
  const [tiendas, setTiendas] = useState<TiendasDeVersion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const { mostrarToast } = useToast();

  useEffect(() => {
    setCargando(true);
    versionesService
      .obtenerTiendas(id)
      .then(setTiendas)
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudieron cargar las tiendas'), 'error'))
      .finally(() => setCargando(false));
  }, [id, mostrarToast]);

  async function guardar(tiendaIds: number[]): Promise<TiendaResumen[] | null> {
    setGuardando(true);
    try {
      const asignadas = await versionesService.reemplazarTiendas(id, tiendaIds);
      mostrarToast('Tiendas actualizadas', 'success');
      return asignadas;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron guardar las tiendas'), 'error');
      return null;
    } finally {
      setGuardando(false);
    }
  }

  return { tiendas, cargando, guardando, guardar };
}
