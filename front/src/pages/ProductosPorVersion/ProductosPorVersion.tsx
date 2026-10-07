import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ProductosVersiones,
  ProductosVersionesPagina,
} from '../../components/dominio/implementacion/ProductosVersiones/ProductosVersiones';
import { useProductosPorVersion, useVersionesPorVersion } from '../../hooks/useImplementacion';
import { useTiendas } from '../../hooks/useTiendas';
import { parsearIdsVersiones } from '../../domain/implementacion/miTienda';
import './ProductosPorVersion.css';

const SOLO_ACTIVAS = {};

/**
 * Por versión (Analista): la misma tabla de Productos del Implementador, para las versiones de
 * cualquier planograma. Versiones y tienda viven en la URL (`?versiones=12,15&tienda=3`), así que
 * "Ver productos" desde una versión o desde la ficha de un producto llega ya filtrado. La tienda es
 * opcional: solo agrega su inventario y si monta cada versión.
 */
export function ProductosPorVersion() {
  return (
    <ProductosVersionesPagina titulo="Por versión">
      {(vista) => <ContenidoPorVersion {...vista} />}
    </ProductosVersionesPagina>
  );
}

function ContenidoPorVersion({ extendida, alternarExtendida }: { extendida: boolean; alternarExtendida: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const idsEnUrl = useMemo(() => parsearIdsVersiones(searchParams.get('versiones')), [searchParams]);
  const tiendaId = useMemo(() => {
    const valor = Number(searchParams.get('tienda'));
    return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
  }, [searchParams]);

  const { tiendas, cargando: cargandoTiendas } = useTiendas(SOLO_ACTIVAS);
  const { versiones } = useVersionesPorVersion(idsEnUrl);
  const { productos, cargando, recargar } = useProductosPorVersion(idsEnUrl, tiendaId);

  const cambiarTienda = useCallback(
    (id: number | null, reemplazar = false) => {
      setSearchParams(
        (actual) => {
          const siguiente = new URLSearchParams(actual);
          if (id) siguiente.set('tienda', String(id));
          else siguiente.delete('tienda');
          return siguiente;
        },
        { replace: reemplazar },
      );
    },
    [setSearchParams],
  );

  // Una tienda del link que no existe o ya no está activa se quita.
  useEffect(() => {
    if (tiendaId === null || cargandoTiendas || tiendas.length === 0) return;
    if (!tiendas.some((t) => t.id === tiendaId)) cambiarTienda(null, true);
  }, [tiendaId, tiendas, cargandoTiendas, cambiarTienda]);

  // La tienda de la respuesta (no la del selector) para que encabezado, franja y columnas coincidan
  // mientras llega la consulta con la tienda nueva.
  const tiendaDeLosDatos = productos?.tienda ?? null;

  const selectorTienda = (
    <label className="productos-por-version__tienda">
      <span>Tienda (inventario)</span>
      <select
        value={tiendaId ?? ''}
        onChange={(e) => cambiarTienda(e.target.value ? Number(e.target.value) : null)}
        disabled={cargandoTiendas && tiendas.length === 0}
      >
        <option value="">Sin tienda</option>
        {tiendas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.codigo} · {t.nombre}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ProductosVersiones
      tienda={tiendaDeLosDatos}
      versiones={versiones}
      resumenes={productos?.versiones ?? []}
      productos={productos}
      cargando={cargando}
      requiereSeleccion
      ruta={[{ etiqueta: 'Por versión' }]}
      titulo="Productos por versión"
      controles={selectorTienda}
      textosSelector={{
        ayuda: 'Versiones publicadas y en piloto de todos los planogramas, más las que llegaron por enlace.',
        notaSinSeleccion: 'Elige al menos una versión para ver sus productos.',
        aplicarSinSeleccion: 'Quitar versiones',
        sinVersiones: 'No hay versiones publicadas ni en piloto.',
        sinCoincidencias: 'Ninguna versión coincide con la búsqueda.',
      }}
      textoSinSeleccion="Elegir versiones"
      vacio={{
        titulo: 'Las versiones elegidas no tienen productos',
        hint: 'Aparecerán cuando sus góndolas tengan posiciones con SKU.',
      }}
      extendida={extendida}
      onAlternarExtendida={alternarExtendida}
      onEvidenciaCerrada={recargar}
    />
  );
}
