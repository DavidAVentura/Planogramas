import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RoleSwitch } from '../RoleSwitch/RoleSwitch';
import { SesionUsuario } from '../SesionUsuario/SesionUsuario';
import { TiendaImplementadorChip } from '../../implementacion/TiendaImplementadorChip/TiendaImplementadorChip';
import { useAuth } from '../../../../context/AuthContext';
import isotipoCemaco from '../../../../assets/cemaco-isotipo.png';
import './AppTopbar.css';

interface AppTopbarProps {
  titulo: string;
  breadcrumb?: ReactNode;
}

interface OpcionNavegacion {
  etiqueta: string;
  ruta: string;
  disponible: boolean;
  /** Solo activa en la ruta exacta (no en sus subrutas). */
  exacta?: boolean;
}

// Módulos de la app. Los que todavía no tienen página se muestran deshabilitados.
const OPCIONES_NAVEGACION: OpcionNavegacion[] = [
  { etiqueta: 'Planogramas', ruta: '/planogramas', disponible: true },
  { etiqueta: 'Tiendas', ruta: '/tiendas', disponible: true },
  { etiqueta: 'Estructura', ruta: '/estructura', disponible: true },
  { etiqueta: 'Productos', ruta: '/productos', disponible: true },
  { etiqueta: 'Accesorios', ruta: '/accesorios', disponible: true },
];

// El Implementador solo ve su tienda y los productos de sus planogramas.
const OPCIONES_IMPLEMENTADOR: OpcionNavegacion[] = [
  { etiqueta: 'Mi tienda', ruta: '/mi-tienda', disponible: true, exacta: true },
  { etiqueta: 'Productos', ruta: '/mi-tienda/productos', disponible: true },
];

export function AppTopbar({ titulo, breadcrumb }: AppTopbarProps) {
  const { rol } = useAuth();
  const esImplementador = rol === 'implementador';
  const opciones = esImplementador ? OPCIONES_IMPLEMENTADOR : OPCIONES_NAVEGACION;

  return (
    <header className="app-topbar">
      <div className="app-topbar__marca">
        <img className="app-topbar__isotipo" src={isotipoCemaco} alt="Cemaco" />
        <div>
          <div className="app-topbar__titulo">{titulo}</div>
          {breadcrumb ?? <div className="app-topbar__eyebrow">CEMACO</div>}
        </div>
      </div>
      <nav className="app-topbar__nav" aria-label="Navegación principal">
        {opciones.map((opcion) =>
          opcion.disponible ? (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              end={opcion.exacta}
              className={({ isActive }) =>
                `app-topbar__nav-opcion${isActive ? ' app-topbar__nav-opcion--activa' : ''}`
              }
            >
              {opcion.etiqueta}
            </NavLink>
          ) : (
            <span
              key={opcion.ruta}
              className="app-topbar__nav-opcion app-topbar__nav-opcion--deshabilitada"
              aria-disabled="true"
              title="Próximamente"
            >
              {opcion.etiqueta}
            </span>
          ),
        )}
      </nav>
      {esImplementador && <TiendaImplementadorChip />}
      <RoleSwitch />
      <SesionUsuario />
    </header>
  );
}
