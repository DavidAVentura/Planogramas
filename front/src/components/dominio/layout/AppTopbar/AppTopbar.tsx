import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RoleSwitch } from '../RoleSwitch/RoleSwitch';
import { SesionUsuario } from '../SesionUsuario/SesionUsuario';
import { TiendaImplementadorChip } from '../../implementacion/TiendaImplementadorChip/TiendaImplementadorChip';
import { useAuth } from '../../../../context/AuthContext';
import { OPCIONES_POR_MODO } from '../../../../constants/navegacion';
import { cumpleRegla } from '../../../../domain/permisos/permisos';
import isotipoCemaco from '../../../../assets/cemaco-isotipo.png';
import './AppTopbar.css';

interface AppTopbarProps {
  titulo: string;
  breadcrumb?: ReactNode;
}

export function AppTopbar({ titulo, breadcrumb }: AppTopbarProps) {
  const { rol, modos, usuario } = useAuth();
  const esImplementador = rol === 'implementador';
  const opciones = OPCIONES_POR_MODO[rol ?? 'implementador'].filter((o) => cumpleRegla(usuario, o.regla));

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
        {opciones.map((opcion) => (
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
        ))}
      </nav>
      {esImplementador && <TiendaImplementadorChip />}
      {modos.length > 1 && <RoleSwitch />}
      <SesionUsuario />
    </header>
  );
}
