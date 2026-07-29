import { useCallback, useEffect, useState } from 'react';
import { posicionesService } from '../services/posiciones.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { Nivel } from '../types/nivel';
import type {
  PosicionAccesorio,
  PosicionAccesorioInput,
  PosicionCambiosCompletos,
  PosicionDetalle,
  PosicionEditada,
  PosicionInput,
  PosicionMovida,
  PosicionPorSku,
  PosicionesDeNivel,
} from '../types/posicion';

export function usePosicionesDeNiveles(niveles: Nivel[]) {
  const [porNivel, setPorNivel] = useState<Record<number, PosicionesDeNivel>>({});
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();
  const idsKey = niveles.map((n) => n.id).join(',');

  const cargar = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',').map(Number) : [];
    if (ids.length === 0) {
      setPorNivel({});
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const resultados = await Promise.all(ids.map((id) => posicionesService.listarPorNivel(id)));
      const mapa: Record<number, PosicionesDeNivel> = {};
      ids.forEach((id, i) => {
        mapa[id] = resultados[i];
      });
      setPorNivel(mapa);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar las posiciones'), 'error');
    } finally {
      setCargando(false);
    }
  }, [idsKey, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { porNivel, cargando, recargar: cargar };
}

export function useAgregarPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function agregar(nivelId: number, datos: PosicionInput): Promise<PosicionEditada | null> {
    setEnviando(true);
    try {
      const posicion = await posicionesService.agregar(nivelId, datos);
      mostrarToast('Posición creada', 'success');
      if (posicion.advertencia) mostrarToast(posicion.advertencia, 'info');
      return posicion;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo crear la posición'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { agregar, enviando };
}

export function useEditarPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function editar(id: number, cambios: PosicionCambiosCompletos): Promise<PosicionEditada | null> {
    setEnviando(true);
    try {
      const posicion = await posicionesService.editar(id, cambios);
      mostrarToast('Posición actualizada', 'success');
      if (posicion.advertencia) mostrarToast(posicion.advertencia, 'info');
      return posicion;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar la posición'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { editar, enviando };
}

export function useMoverPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function mover(id: number, nivelId: number, ordenHorizontal: number): Promise<PosicionMovida | null> {
    setEnviando(true);
    try {
      const resultado = await posicionesService.mover(id, nivelId, ordenHorizontal);
      mostrarToast('Posición movida', 'success');
      return resultado;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo mover la posición'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { mover, enviando };
}

export function useCopiarPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function copiar(id: number, nivelIdDestino: number, ordenDestino: number): Promise<PosicionDetalle | null> {
    setEnviando(true);
    try {
      const posicion = await posicionesService.copiar(id, nivelIdDestino, ordenDestino);
      mostrarToast('Posición copiada', 'success');
      return posicion;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo copiar la posición'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { copiar, enviando };
}

export function useEliminarPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function eliminar(id: number): Promise<boolean> {
    setEnviando(true);
    try {
      await posicionesService.eliminar(id);
      mostrarToast('Posición eliminada', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar la posición'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { eliminar, enviando };
}

export function usePosicionDetalle(id: number | null) {
  const [posicion, setPosicion] = useState<PosicionDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    if (id === null) {
      setPosicion(null);
      return;
    }
    setCargando(true);
    try {
      setPosicion(await posicionesService.obtener(id));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cargar el detalle de la posición'), 'error');
    } finally {
      setCargando(false);
    }
  }, [id, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { posicion, cargando, recargar: cargar };
}

export function usePosicionAccesorios(posicionId: number | null) {
  const [accesorios, setAccesorios] = useState<PosicionAccesorio[]>([]);
  const [cargando, setCargando] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    if (posicionId === null) {
      setAccesorios([]);
      return;
    }
    setCargando(true);
    try {
      setAccesorios(await posicionesService.listarAccesorios(posicionId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar los accesorios de la posición'), 'error');
    } finally {
      setCargando(false);
    }
  }, [posicionId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { accesorios, cargando, recargar: cargar };
}

export function useAgregarAccesorioPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function agregar(posicionId: number, datos: PosicionAccesorioInput): Promise<PosicionAccesorio | null> {
    setEnviando(true);
    try {
      const accesorio = await posicionesService.agregarAccesorio(posicionId, datos);
      mostrarToast('Accesorio de montaje agregado', 'success');
      return accesorio;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo agregar el accesorio'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { agregar, enviando };
}

export function useEliminarAccesorioPosicion() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function eliminar(posicionId: number, posicionAccesorioId: number): Promise<boolean> {
    setEnviando(true);
    try {
      await posicionesService.eliminarAccesorio(posicionId, posicionAccesorioId);
      mostrarToast('Accesorio de montaje quitado', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo quitar el accesorio'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { eliminar, enviando };
}

export function useBuscarPosicionesPorSku() {
  const [resultado, setResultado] = useState<PosicionPorSku | null>(null);
  const [cargando, setCargando] = useState(false);
  const { mostrarToast } = useToast();

  async function buscar(sku: string, versionId: number): Promise<PosicionPorSku | null> {
    setCargando(true);
    try {
      const r = await posicionesService.buscarPorSku(sku, versionId);
      setResultado(r);
      return r;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo buscar el SKU'), 'error');
      setResultado(null);
      return null;
    } finally {
      setCargando(false);
    }
  }

  return { resultado, buscar, cargando };
}
