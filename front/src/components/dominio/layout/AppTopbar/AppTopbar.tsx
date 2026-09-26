import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { RoleSwitch } from '../RoleSwitch/RoleSwitch';
import './AppTopbar.css';

interface AppTopbarProps {
  titulo: string;
  breadcrumb?: ReactNode;
}

interface OpcionNavegacion {
  etiqueta: string;
  ruta: string;
  disponible: boolean;
}

// Módulos de la app. Solo Planogramas existe hoy; el resto se muestra deshabilitado hasta que
// tenga su página (Tiendas será el CRUD de tiendas).
const OPCIONES_NAVEGACION: OpcionNavegacion[] = [
  { etiqueta: 'Planogramas', ruta: '/planogramas', disponible: true },
  { etiqueta: 'Tiendas', ruta: '/tiendas', disponible: false },
  { etiqueta: 'Estructura', ruta: '/estructura', disponible: false },
  { etiqueta: 'Productos', ruta: '/productos', disponible: false },
];

export function AppTopbar({ titulo, breadcrumb }: AppTopbarProps) {
  return (
    <header className="app-topbar">
      <div className="app-topbar__marca">
        <div className="app-topbar__isotipo">C</div>
        <div>
          <div className="app-topbar__titulo">{titulo}</div>
          {breadcrumb ?? <div className="app-topbar__eyebrow">CEMACO</div>}
        </div>
      </div>
      <nav className="app-topbar__nav" aria-label="Navegación principal">
        {OPCIONES_NAVEGACION.map((opcion) =>
          opcion.disponible ? (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
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
      <RoleSwitch />
    </header>
  );
}
