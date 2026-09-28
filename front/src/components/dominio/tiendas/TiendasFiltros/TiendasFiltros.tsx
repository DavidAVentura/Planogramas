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
  id: string;
  filtros: FiltrosListadoTiendas;
  hayFiltrosActivos: boolean;
  onChange: (parciales: Partial<FiltrosListadoTiendas>) => void;
}

/** Fila desplegable de filtros del listado de tiendas; las etiquetas quedan solo para lectores de pantalla. */
export function TiendasFiltros({ id, filtros, hayFiltrosActivos, onChange }: TiendasFiltrosProps) {
  return (
    <div id={id} className="tiendas-filtros">
      <label className="tiendas-filtros__campo tiendas-filtros__campo--busqueda">
        <span className="tiendas-filtros__oculto">Buscar tienda</span>
        <input
          type="search"
          placeholder="Código o nombre de tienda"
          value={filtros.busqueda}
          onChange={(e) => onChange({ busqueda: e.target.value })}
        />
      </label>

      <label className="tiendas-filtros__campo">
        <span className="tiendas-filtros__oculto">Tipo</span>
        <select value={filtros.tipo} onChange={(e) => onChange({ tipo: e.target.value as TipoTienda | '' })}>
          <option value="">Todos los tipos</option>
          {TIPOS_TIENDA.map((tipo) => (
            <option key={tipo} value={tipo}>
              {TIPO_TIENDA_META[tipo].label}
            </option>
          ))}
        </select>
      </label>

      <label className="tiendas-filtros__campo">
        <span className="tiendas-filtros__oculto">Marca</span>
        <select value={filtros.marca} onChange={(e) => onChange({ marca: e.target.value })}>
          <option value="">Todas las marcas</option>
          {MARCAS_TIENDA.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
            </option>
          ))}
        </select>
      </label>

      <label className="tiendas-filtros__campo">
        <span className="tiendas-filtros__oculto">Estado</span>
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
