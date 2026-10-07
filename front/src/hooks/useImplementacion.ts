import { useCallback, useEffect, useState } from 'react';
import { implementacionService } from '../services/implementacion.service';
import { ApiError } from '../services/httpClient';
import { useToast } from '../context/ToastContext';
import { useTiendaImplementador } from '../context/TiendaImplementadorContext';
import { mensajeDeError } from '../utils/errors';
import type {
  ProductosImplementacion,
  ProductosPorVersion,
  ResumenImplementacion,
  VersionPorVersion,
} from '../types/implementacion';

const esNoEncontrado = (err: unknown) => err instanceof ApiError && err.status === 404;

/**
 * Resumen de Mi tienda para la tienda elegida. Este endpoint solo responde 404 cuando la tienda no
 * existe o está inactiva: en ese caso se descarta la tienda guardada y se pide otra.
 */
export function useResumenImplementacion(tiendaId: number | null) {
  const [resumen, setResumen] = useState<ResumenImplementacion | null>(null);
  const [cargando, setCargando] = useState(tiendaId !== null);
  const [recargas, setRecargas] = useState(0);
  const { mostrarToast } = useToast();
  const { descartarTiendaInvalida } = useTiendaImplementador();

  useEffect(() => {
    if (tiendaId === null) {
      setResumen(null);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    implementacionService
      .resumen(tiendaId)
      .then((r) => vigente && setResumen(r))
      .catch((err) => {
        if (!vigente) return;
        if (esNoEncontrado(err)) descartarTiendaInvalida();
        else mostrarToast(mensajeDeError(err, 'No se pudieron cargar los planogramas de la tienda'), 'error');
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [tiendaId, recargas, mostrarToast, descartarTiendaInvalida]);

  // Al cambiar de tienda no se muestra el resumen de la anterior.
  const vigenteParaTienda = resumen && resumen.tienda.id === tiendaId ? resumen : null;
  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { resumen: vigenteParaTienda, cargando, recargar };
}

/**
 * Todas las posiciones de las versiones asignadas a la tienda. Se piden sin `versionIds`: el
 * filtro por versión se resuelve en el cliente (una tienda tiene a lo sumo algunos cientos de
 * posiciones) para que cambiar la selección no dispare otra consulta de inventario a CATI.
 * Se usa junto a `useResumenImplementacion`, que es quien descarta la tienda ante un 404: aquí ese
 * 404 no se vuelve a avisar.
 */
export function useProductosImplementacion(tiendaId: number | null) {
  const [productos, setProductos] = useState<ProductosImplementacion | null>(null);
  const [cargando, setCargando] = useState(tiendaId !== null);
  const { mostrarToast } = useToast();

  useEffect(() => {
    if (tiendaId === null) {
      setProductos(null);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    implementacionService
      .productos(tiendaId)
      .then((r) => vigente && setProductos(r))
      .catch((err) => {
        if (!vigente) return;
        if (!esNoEncontrado(err)) {
          mostrarToast(mensajeDeError(err, 'No se pudieron cargar los productos de la tienda'), 'error');
        }
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [tiendaId, mostrarToast]);

  const vigenteParaTienda = productos && productos.tienda.id === tiendaId ? productos : null;
  return { productos: vigenteParaTienda, cargando };
}

/**
 * Versiones elegibles en Por versión. `incluir` agrega las que llegan por enlace aunque no estén
 * publicadas ni en piloto; solo se vuelve a pedir cuando aparece una que la lista no trae.
 */
export function useVersionesPorVersion(incluir: number[]) {
  const [versiones, setVersiones] = useState<VersionPorVersion[] | null>(null);
  const { mostrarToast } = useToast();

  // Si una versión pedida no existe, la clave no cambia tras la respuesta y no se vuelve a pedir.
  const faltan = versiones === null || incluir.some((id) => !versiones.some((v) => v.versionId === id));
  const clave = faltan ? incluir.join(',') : null;

  useEffect(() => {
    if (clave === null) return;
    let vigente = true;
    implementacionService
      .versionesPorVersion(clave ? clave.split(',').map(Number) : [])
      .then((r) => vigente && setVersiones(r.data))
      .catch((err) => {
        if (!vigente) return;
        setVersiones((actual) => actual ?? []);
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar las versiones'), 'error');
      });
    return () => {
      vigente = false;
    };
  }, [clave, mostrarToast]);

  return { versiones, cargando: versiones === null };
}

/** Filas de Por versión. Sin versiones no se consulta (la vista pide elegir al menos una). */
export function useProductosPorVersion(versionIds: number[], tiendaId: number | null) {
  const [productos, setProductos] = useState<ProductosPorVersion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [recargas, setRecargas] = useState(0);
  const { mostrarToast } = useToast();
  const clave = versionIds.join(',');

  useEffect(() => {
    if (!clave) {
      setProductos(null);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    implementacionService
      .productosPorVersion(clave.split(',').map(Number), tiendaId)
      .then((r) => vigente && setProductos(r))
      .catch((err) => {
        if (!vigente) return;
        setProductos(null);
        mostrarToast(mensajeDeError(err, 'No se pudieron cargar los productos de la versión'), 'error');
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [clave, tiendaId, recargas, mostrarToast]);

  const recargar = useCallback(() => setRecargas((n) => n + 1), []);

  return { productos, cargando, recargar };
}
