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
