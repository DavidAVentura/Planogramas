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
  PlanogramaListItem,
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

const PAGINA_MAXIMA = 100;

/**
 * Todos los planogramas no archivados, sin paginar: recorre las páginas de GET /planogramas con el
 * tamaño máximo que acepta el backend. Lo usa el filtro por planograma de la vista /productos.
 */
export function usePlanogramasVigentes() {
  const [planogramas, setPlanogramas] = useState<PlanogramaListItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  useEffect(() => {
    let vigente = true;
    async function cargarTodos() {
      const primera = await planogramasService.listar({ page: 1, pageSize: PAGINA_MAXIMA });
      const totalPaginas = Math.ceil(primera.total / PAGINA_MAXIMA);
      const resto = await Promise.all(
        Array.from({ length: Math.max(totalPaginas - 1, 0) }, (_, i) =>
          planogramasService.listar({ page: i + 2, pageSize: PAGINA_MAXIMA }),
        ),
      );
      return [primera, ...resto].flatMap((r) => r.data).filter((p) => p.estado !== 'archivado');
    }
    cargarTodos()
      .then((lista) => {
        if (vigente) setPlanogramas(lista);
      })
      .catch((err) => {
        if (vigente) mostrarToast(mensajeDeError(err, 'No se pudieron cargar los planogramas'), 'error');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [mostrarToast]);

  return { planogramas, cargando };
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
