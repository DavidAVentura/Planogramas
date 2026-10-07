import { SinTiendaElegida } from '../../components/dominio/implementacion/SinTiendaElegida/SinTiendaElegida';
import {
  ProductosVersiones,
  ProductosVersionesPagina,
} from '../../components/dominio/implementacion/ProductosVersiones/ProductosVersiones';
import { useTiendaImplementador } from '../../context/TiendaImplementadorContext';
import { useProductosImplementacion, useResumenImplementacion } from '../../hooks/useImplementacion';
import type { TiendaImplementador } from '../../types/implementacion';

/** Productos del Implementador: las versiones que monta su tienda, con el inventario de la tienda. */
export function ProductosTienda() {
  const { tienda } = useTiendaImplementador();

  return (
    <ProductosVersionesPagina titulo="Productos">
      {(vista) =>
        tienda ? <ContenidoProductos key={tienda.id} tienda={tienda} {...vista} /> : <SinTiendaElegida />
      }
    </ProductosVersionesPagina>
  );
}

interface ContenidoProductosProps {
  tienda: TiendaImplementador;
  extendida: boolean;
  alternarExtendida: () => void;
}

function ContenidoProductos({ tienda, extendida, alternarExtendida }: ContenidoProductosProps) {
  const { resumen, recargar: recargarResumen } = useResumenImplementacion(tienda.id);
  const { productos, cargando } = useProductosImplementacion(tienda.id);
  const versiones = resumen?.planogramas ?? null;

  return (
    <ProductosVersiones
      tienda={tienda}
      versiones={versiones}
      resumenes={versiones ?? []}
      productos={productos}
      cargando={cargando}
      requiereSeleccion={false}
      ruta={[{ etiqueta: 'Mi tienda', a: '/mi-tienda' }, { etiqueta: 'Productos' }]}
      titulo="Productos"
      textosSelector={{
        ayuda: `Solo las versiones asignadas a ${tienda.nombre}: la publicada o la piloto que monta la tienda.`,
        notaSinSeleccion: 'Sin selección se muestran todos los productos de la tienda.',
        aplicarSinSeleccion: 'Mostrar todos',
        sinVersiones: 'La tienda no tiene versiones asignadas.',
        sinCoincidencias: 'Ninguna versión asignada coincide con la búsqueda.',
      }}
      textoSinSeleccion="Todos los de mi tienda"
      vacio={{
        titulo: 'Tu tienda no tiene productos en planogramas',
        hint: 'Aparecerán cuando tenga versiones asignadas con productos.',
      }}
      extendida={extendida}
      onAlternarExtendida={alternarExtendida}
      onEvidenciaCerrada={recargarResumen}
    />
  );
}
