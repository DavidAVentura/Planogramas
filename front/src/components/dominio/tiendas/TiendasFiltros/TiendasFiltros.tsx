import { Button } from '../../../ui/Button/Button';
import {
  FILTROS_TIENDAS_INICIALES,
  MARCAS_TIENDA,
  TIPO_TIENDA_META,
  TIPOS_TIENDA,
} from '../../../../constants/tiendas';
import type { EstadoTienda, FiltrosListadoTiendas, TipoTienda } from '../../../../types/tienda';
import './TiendasFiltros.css';

interface TiendasFiltrosProps {
  filtros: FiltrosListadoTiendas;
  onChange: (parciales: Partial<FiltrosListadoTiendas>) => void;
}

export function TiendasFiltros({ filtros, onChange }: TiendasFiltrosProps) {
  const hayFiltrosActivos =
    filtros.busqueda !== FILTROS_TIENDAS_INICIALES.busqueda ||
    filtros.tipo !== FILTROS_TIENDAS_INICIALES.tipo ||
    filtros.marca !== FILTROS_TIENDAS_INICIALES.marca ||
    filtros.estado !== FILTROS_TIENDAS_INICIALES.estado;

  return (
    <div className="tiendas-filtros">
      <label className="tiendas-filtros__campo tiendas-filtros__campo--busqueda">
        <span>Buscar</span>
        <input
          type="search"
          placeholder="Código o nombre de tienda"
          value={filtros.busqueda}
          onChange={(e) => onChange({ busqueda: e.target.value })}
        />
      </label>

      <label className="tiendas-filtros__campo">
        <span>Tipo</span>
        <select value={filtros.tipo} onChange={(e) => onChange({ tipo: e.target.value as TipoTienda | '' })}>
          <option value="">Todos</option>
          {TIPOS_TIENDA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {TIPO_TIENDA_META[tipo].label}
            </option>
          ))}
        </select>
      </label>

      <label className="tiendas-filtros__campo">
        <span>Marca</span>
        <select value={filtros.marca} onChange={(e) => onChange({ marca: e.target.value })}>
          <option value="">Todas</option>
          {MARCAS_TIENDA.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
            </option>
          ))}
        </select>
      </label>

      <label className="tiendas-filtros__campo">
        <span>Estado</span>
        <select
          value={filtros.estado}
          onChange={(e) => onChange({ estado: e.target.value as EstadoTienda | '' })}
        >
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
          <option value="">Todas</option>
        </select>
      </label>

      {hayFiltrosActivos && (
        <Button variante="ghost" onClick={() => onChange(FILTROS_TIENDAS_INICIALES)}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
