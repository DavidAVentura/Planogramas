import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import './TiendasSelector.css';

/** Alcanza con id/codigo/nombre — así sirve tanto para `Tienda` (catálogo) como para
 *  `TiendaResumen` (tiendas ya asociadas a una versión), sin acoplar el selector a uno de los dos. */
interface TiendaMinima {
  id: number;
  codigo: string;
  nombre: string;
}

interface TiendasSelectorProps {
  tiendas: TiendaMinima[];
  seleccionadas: number[];
  onChange: (ids: number[]) => void;
  cargando?: boolean;
  vacioHint?: string;
}

export function TiendasSelector({ tiendas, seleccionadas, onChange, cargando, vacioHint }: TiendasSelectorProps) {
  if (cargando) return <p className="tiendas-selector__cargando">Cargando…</p>;
  if (tiendas.length === 0) {
    return <EmptyState titulo="No hay tiendas disponibles" hint={vacioHint} />;
  }

  function alternar(id: number) {
    onChange(seleccionadas.includes(id) ? seleccionadas.filter((s) => s !== id) : [...seleccionadas, id]);
  }

  return (
    <div className="tiendas-selector">
      {tiendas.map((tienda) => (
        <label key={tienda.id} className="tiendas-selector__fila">
          <input
            type="checkbox"
            checked={seleccionadas.includes(tienda.id)}
            onChange={() => alternar(tienda.id)}
          />
          <span>{tienda.nombre}</span>
          <span className="tiendas-selector__codigo mono">{tienda.codigo}</span>
        </label>
      ))}
    </div>
  );
}
