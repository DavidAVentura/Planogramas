import { useEffect, useState } from 'react';
import { catalogoService } from '../services/catalogo.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { AparicionProducto, FiltroJerarquia, ProductoListado } from '../types/producto';

/**
 * Productos de la tabla local filtrados por jerarquía. Filtrar por un nivel alto (ej. un área
 * completa) puede tardar varios segundos la primera vez, porque el backend le pide a CATI todos los
 * SKUs de ese nivel. Si el usuario cambia el filtro antes de que llegue la respuesta anterior, esa
 * respuesta se descarta.
 */
export function useProductos(jerarquia: FiltroJerarquia) {
  const [productos, setProductos] = useState<ProductoListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const { mostrarToast } = useToast();

  const { area, departamento, familia, categoria, subcategoria } = jerarquia;

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    catalogoService
      .listarProductos({ area, departamento, familia, categoria, subcategoria })
      .then((lista) => {
        if (vigente) setProductos(lista);
      })
      .catch((err) => {
        if (vigente) mostrarToast(mensajeDeError(err, 'No se pudieron cargar los productos'), 'error');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [area, departamento, familia, categoria, subcategoria, mostrarToast]);

  return { productos, cargando };
}

/** Posiciones de un producto en planogramas vigentes; se piden al expandir su fila. */
export function useAparicionesProducto(sku: string) {
  const [apariciones, setApariciones] = useState<AparicionProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    catalogoService
      .obtenerPlanogramasDeProducto(sku)
      .then((lista) => {
        if (!vigente) return;
        setApariciones(lista);
        setError(false);
      })
      .catch(() => {
        if (vigente) setError(true);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [sku]);

  return { apariciones, cargando, error };
}
