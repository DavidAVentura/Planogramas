import { useCallback, useEffect, useState } from 'react';
import { jerarquiaService } from '../services/jerarquia.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { JerarquiaItem } from '../types/jerarquia';

export function useJerarquia() {
  const [areas, setAreas] = useState<JerarquiaItem[]>([]);
  const [departamentos, setDepartamentos] = useState<JerarquiaItem[]>([]);
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false);
  const { mostrarToast } = useToast();

  useEffect(() => {
    jerarquiaService
      .listarAreas()
      .then(setAreas)
      .catch((err) => mostrarToast(mensajeDeError(err, 'No se pudieron cargar las áreas'), 'error'));
  }, [mostrarToast]);

  const cargarDepartamentos = useCallback(
    async (areaId: string) => {
      if (!areaId) {
        setDepartamentos([]);
        return;
      }
      setCargandoDepartamentos(true);
      try {
        setDepartamentos(await jerarquiaService.listarDepartamentos(areaId));
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar los departamentos'), 'error');
        setDepartamentos([]);
      } finally {
        setCargandoDepartamentos(false);
      }
    },
    [mostrarToast],
  );

  return { areas, departamentos, cargandoDepartamentos, cargarDepartamentos };
}

/**
 * Cascada Familia → Categoría → Subcategoría, usada por el explorador de subcategorías del
 * formulario de planograma (drill-down alternativo al chip input de texto libre). Separado de
 * `useJerarquia` para no cargar estos tres niveles en lugares que solo necesitan área/departamento
 * (ej. FiltrosBar).
 */
export function useJerarquiaExploracion() {
  const [familias, setFamilias] = useState<JerarquiaItem[]>([]);
  const [categorias, setCategorias] = useState<JerarquiaItem[]>([]);
  const [subcategorias, setSubcategorias] = useState<JerarquiaItem[]>([]);
  const [cargandoFamilias, setCargandoFamilias] = useState(false);
  const [cargandoCategorias, setCargandoCategorias] = useState(false);
  const [cargandoSubcategorias, setCargandoSubcategorias] = useState(false);
  const { mostrarToast } = useToast();

  const cargarFamilias = useCallback(
    async (departamentoId: string) => {
      if (!departamentoId) {
        setFamilias([]);
        return;
      }
      setCargandoFamilias(true);
      try {
        setFamilias(await jerarquiaService.listarFamilias(departamentoId));
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar las familias'), 'error');
        setFamilias([]);
      } finally {
        setCargandoFamilias(false);
      }
    },
    [mostrarToast],
  );

  const cargarCategorias = useCallback(
    async (familiaId: string) => {
      if (!familiaId) {
        setCategorias([]);
        return;
      }
      setCargandoCategorias(true);
      try {
        setCategorias(await jerarquiaService.listarCategorias(familiaId));
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar las categorías'), 'error');
        setCategorias([]);
      } finally {
        setCargandoCategorias(false);
      }
    },
    [mostrarToast],
  );

  const cargarSubcategorias = useCallback(
    async (categoriaId: string) => {
      if (!categoriaId) {
        setSubcategorias([]);
        return;
      }
      setCargandoSubcategorias(true);
      try {
        setSubcategorias(await jerarquiaService.listarSubcategorias(categoriaId));
      } catch (err) {
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar las subcategorías'), 'error');
        setSubcategorias([]);
      } finally {
        setCargandoSubcategorias(false);
      }
    },
    [mostrarToast],
  );

  return {
    familias,
    categorias,
    subcategorias,
    cargandoFamilias,
    cargandoCategorias,
    cargandoSubcategorias,
    cargarFamilias,
    cargarCategorias,
    cargarSubcategorias,
  };
}
