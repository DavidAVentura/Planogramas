import { useCallback, useEffect, useRef, useState } from 'react';
import { tiendasService, type FiltrosTiendas } from '../services/tiendas.service';
import { ApiError } from '../services/httpClient';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { CrearTiendaInput, EditarTiendaInput, EstadoTienda, Tienda } from '../types/tienda';

/** `filtros` en `null` omite la carga (útil mientras un dato previo, ej. la versión base, no está listo). */
export function useTiendas(filtros: FiltrosTiendas | null) {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(filtros !== null);
  const [recargas, setRecargas] = useState(0);
  const { mostrarToast } = useToast();

  // Los objetos de filtro se recrean en cada render del llamador; se dispara el efecto por su
  // contenido (filtrosKey), no por identidad, y se lee el valor más reciente vía ref.
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;
  const filtrosKey = filtros ? JSON.stringify(filtros) : null;

  useEffect(() => {
    const actuales = filtrosRef.current;
    if (actuales === null) {
      setTiendas([]);
      return;
    }
    setCargando(true);
    tiendasService
      .listar(actuales)
      .then(setTiendas)
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudieron cargar las tiendas'), 'error'))
      .finally(() => setCargando(false));
  }, [filtrosKey, recargas, mostrarToast]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { tiendas, cargando, recargar };
}

/** La tienda guardada, el código duplicado (para mostrarlo junto al campo) o `null` si falló. */
export type ResultadoGuardarTienda = { tienda: Tienda } | { codigoDuplicado: string } | null;

export function useGuardarTienda() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function guardar(
    id: number | null,
    datos: CrearTiendaInput | EditarTiendaInput,
  ): Promise<ResultadoGuardarTienda> {
    setEnviando(true);
    try {
      const tienda = id
        ? await tiendasService.editar(id, datos)
        : await tiendasService.crear(datos as CrearTiendaInput);
      mostrarToast(id ? 'Tienda actualizada' : `Tienda "${tienda.nombre}" creada`, 'success');
      return { tienda };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) return { codigoDuplicado: datos.codigo ?? '' };
      mostrarToast(mensajeDeError(err, 'No se pudo guardar la tienda'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { guardar, enviando };
}

export function useCambiarEstadoTienda() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function cambiarEstado(id: number, estado: EstadoTienda): Promise<Tienda | null> {
    setEnviando(true);
    try {
      const tienda = await tiendasService.editar(id, { estado });
      mostrarToast(estado === 'activo' ? 'Tienda reactivada' : 'Tienda desactivada', 'success');
      return tienda;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo cambiar el estado de la tienda'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { cambiarEstado, enviando };
}
