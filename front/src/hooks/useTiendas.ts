import { useEffect, useRef, useState } from 'react';
import { tiendasService, type FiltrosTiendas } from '../services/tiendas.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { Tienda } from '../types/tienda';

/** `filtros` en `null` omite la carga (útil mientras un dato previo, ej. la versión base, no está listo). */
export function useTiendas(filtros: FiltrosTiendas | null) {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(filtros !== null);
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
  }, [filtrosKey, mostrarToast]);

  return { tiendas, cargando };
}
