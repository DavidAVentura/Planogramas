import { useCallback, useEffect, useState } from 'react';
import { planogramasService } from '../services/planogramas.service';
import { ApiError } from '../services/httpClient';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type {
  CrearPlanogramaInput,
  EditarPlanogramaInput,
  ListarPlanogramasFiltros,
  ListarPlanogramasResultado,
  PlanogramaDetalle,
} from '../types/planograma';

const FILTROS_INICIALES: ListarPlanogramasFiltros = { page: 1, pageSize: 20 };

export function usePlanogramasListado() {
  const [filtros, setFiltrosState] = useState<ListarPlanogramasFiltros>(FILTROS_INICIALES);
  const [resultado, setResultado] = useState<ListarPlanogramasResultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  const cargar = useCallback(
    async (f: ListarPlanogramasFiltros) => {
      setCargando(true);
      try {
        setResultado(await planogramasService.listar(f));
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudo cargar el listado de planogramas'), 'error');
      } finally {
        setCargando(false);
      }
    },
    [mostrarToast],
  );

  useEffect(() => {
    cargar(filtros);
  }, [filtros, cargar]);

  function setFiltros(parciales: Partial<ListarPlanogramasFiltros>) {
    setFiltrosState((actual) => ({ ...actual, ...parciales, page: parciales.page ?? 1 }));
  }

  return { filtros, setFiltros, resultado, cargando, recargar: () => cargar(filtros) };
}

/** `id` en `null` omite la carga — útil cuando el mismo hook sirve tanto al modal de crear (sin id) como al de editar/detalle (con id). */
export function usePlanogramaDetalle(id: number | null) {
  const [planograma, setPlanograma] = useState<PlanogramaDetalle | null>(null);
  const [cargando, setCargando] = useState(id !== null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    if (id === null) return;
    setCargando(true);
    setNoEncontrado(false);
    try {
      setPlanograma(await planogramasService.obtener(id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoEncontrado(true);
      } else {
        mostrarToast(mensajeDeError(err, 'No se pudo cargar el planograma'), 'error');
      }
    } finally {
      setCargando(false);
    }
  }, [id, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { planograma, cargando, noEncontrado, recargar: cargar };
}

export function useGuardarPlanograma() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function guardar(
    id: number | null,
    datos: CrearPlanogramaInput | EditarPlanogramaInput,
  ): Promise<PlanogramaDetalle | null> {
    setEnviando(true);
    try {
      const guardado = id
        ? await planogramasService.editar(id, datos)
        : await planogramasService.crear(datos as CrearPlanogramaInput);
      mostrarToast(id ? 'Planograma actualizado' : `Planograma "${guardado.nombre}" creado`, 'success');
      return guardado;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo guardar el planograma'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { guardar, enviando };
}

export function useArchivarPlanograma() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function archivar(id: number): Promise<PlanogramaDetalle | null> {
    setEnviando(true);
    try {
      const archivado = await planogramasService.archivar(id);
      mostrarToast('Planograma archivado', 'success');
      return archivado;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo archivar el planograma'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { archivar, enviando };
}
