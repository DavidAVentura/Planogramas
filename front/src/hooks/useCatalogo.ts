import { useCallback, useEffect, useState } from 'react';
import { catalogoService } from '../services/catalogo.service';
import type { ProductoCatalogo, ProductoDetalle } from '../types/catalogo';

// El catálogo CATI es un proxy externo que puede no estar disponible en desarrollo — a
// diferencia del resto de los hooks del proyecto, estos NO muestran toast en error: la UI que
// los consume debe degradar con gracia (dejar escribir el SKU a mano) en vez de interrumpir.

export function useBuscarProductosCatalogo() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  async function buscar(q: string) {
    if (q.trim().length < 2) {
      setProductos([]);
      setError(false);
      return;
    }
    setCargando(true);
    try {
      setProductos(await catalogoService.buscarProductos(q.trim()));
      setError(false);
    } catch {
      setError(true);
      setProductos([]);
    } finally {
      setCargando(false);
    }
  }

  return { productos, cargando, error, buscar };
}

export function useProductoCatalogo(sku: string | null) {
  const [producto, setProducto] = useState<ProductoDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!sku) {
      setProducto(null);
      setError(false);
      return;
    }
    setCargando(true);
    try {
      setProducto(await catalogoService.obtenerProducto(sku));
      setError(false);
    } catch {
      setError(true);
      setProducto(null);
    } finally {
      setCargando(false);
    }
  }, [sku]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { producto, cargando, error };
}
