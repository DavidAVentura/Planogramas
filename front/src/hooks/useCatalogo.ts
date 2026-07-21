import { useCallback, useEffect, useState } from 'react';
import { catalogoService } from '../services/catalogo.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type {
  DimensionesProducto,
  FichaTecnicaCampo,
  InventarioSap,
  ProductoCatalogo,
  ProductoDetalle,
} from '../types/catalogo';

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

export function useProductosPorSubcategoria() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  async function buscar(subcategoriaId: string) {
    if (!subcategoriaId) {
      setProductos([]);
      setError(false);
      return;
    }
    setCargando(true);
    try {
      setProductos(
        await catalogoService.buscarProductos('', { subcategoria: subcategoriaId, page: 1, pageSize: 5 }),
      );
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

  return { producto, cargando, error, recargar: cargar };
}

export function useStockProducto(sku: string | null) {
  const [inventario, setInventario] = useState<InventarioSap[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!sku) {
      setInventario([]);
      setError(false);
      return;
    }
    setCargando(true);
    try {
      setInventario(await catalogoService.obtenerStock(sku));
      setError(false);
    } catch {
      setError(true);
      setInventario([]);
    } finally {
      setCargando(false);
    }
  }, [sku]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { inventario, cargando, error, recargar: cargar };
}

export function useFichaTecnicaProducto(sku: string | null) {
  const [fichaTecnica, setFichaTecnica] = useState<FichaTecnicaCampo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!sku) {
      setFichaTecnica([]);
      setError(false);
      return;
    }
    setCargando(true);
    try {
      setFichaTecnica(await catalogoService.obtenerFichaTecnica(sku));
      setError(false);
    } catch {
      setError(true);
      setFichaTecnica([]);
    } finally {
      setCargando(false);
    }
  }, [sku]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { fichaTecnica, cargando, error, recargar: cargar };
}

// A diferencia de los hooks de lectura de arriba, los siguientes SÍ muestran toast: escriben en
// la tabla local `Producto` (fuente de verdad propia del backend), no en el proxy CATI que puede
// estar caído — un error acá es una falla real que vale la pena interrumpir para mostrar.

export function useActualizarDimensionesProducto() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function actualizar(sku: string, dimensiones: DimensionesProducto): Promise<ProductoDetalle | null> {
    setEnviando(true);
    try {
      const producto = await catalogoService.actualizarDimensiones(sku, dimensiones);
      mostrarToast('Medidas del producto actualizadas', 'success');
      return producto;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron actualizar las medidas'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { actualizar, enviando };
}

export function useValidarDimensionesProducto() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function validar(sku: string): Promise<ProductoDetalle | null> {
    setEnviando(true);
    try {
      const producto = await catalogoService.validarDimensiones(sku);
      mostrarToast('Dimensiones validadas', 'success');
      return producto;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron validar las dimensiones'), 'error');
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { validar, enviando };
}
