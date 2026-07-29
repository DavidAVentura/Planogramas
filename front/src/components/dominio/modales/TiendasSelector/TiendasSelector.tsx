import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import './TiendasSelector.css';

const SIN_MARCA = 'Sin marca';

/** Alcanza con id/codigo/nombre — así sirve tanto para `Tienda` (catálogo) como para
 *  `TiendaResumen` (tiendas ya asociadas a una versión), sin acoplar el selector a uno de los dos.
 *  `marca` es opcional: cuando ninguna tienda la trae, se muestra la lista plana de siempre. */
interface TiendaMinima {
  id: number;
  codigo: string;
  nombre: string;
  marca?: string | null;
}

interface TiendasSelectorProps {
  tiendas: TiendaMinima[];
  seleccionadas: number[];
  onChange: (ids: number[]) => void;
  cargando?: boolean;
  vacioHint?: string;
}

function agruparPorMarca(tiendas: TiendaMinima[]): [string, TiendaMinima[]][] {
  const grupos = new Map<string, TiendaMinima[]>();
  tiendas.forEach((tienda) => {
    const clave = tienda.marca ?? SIN_MARCA;
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(tienda);
    else grupos.set(clave, [tienda]);
  });
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function TiendasSelector({ tiendas, seleccionadas, onChange, cargando, vacioHint }: TiendasSelectorProps) {
  if (cargando) return <p className="tiendas-selector__cargando">Cargando…</p>;
  if (tiendas.length === 0) {
    return <EmptyState titulo="No hay tiendas disponibles" hint={vacioHint} />;
  }

  function alternar(id: number) {
    onChange(seleccionadas.includes(id) ? seleccionadas.filter((s) => s !== id) : [...seleccionadas, id]);
  }

  function fila(tienda: TiendaMinima) {
    return (
      <label key={tienda.id} className="tiendas-selector__fila">
        <input
          type="checkbox"
          checked={seleccionadas.includes(tienda.id)}
          onChange={() => alternar(tienda.id)}
        />
        <span>{tienda.nombre}</span>
        <span className="tiendas-selector__codigo mono">{tienda.codigo}</span>
      </label>
    );
  }

  const usarGrupos = tiendas.some((t) => t.marca);

  return (
    <div className="tiendas-selector">
      {usarGrupos
        ? agruparPorMarca(tiendas).map(([marca, items]) => (
            <div key={marca} className="tiendas-selector__grupo">
              <div className="tiendas-selector__grupo-titulo">{marca}</div>
              {items.map(fila)}
            </div>
          ))
        : tiendas.map(fila)}
    </div>
  );
}
