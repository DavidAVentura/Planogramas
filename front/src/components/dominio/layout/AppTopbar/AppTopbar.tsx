import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { RoleSwitch } from '../RoleSwitch/RoleSwitch';
import { SesionUsuario } from '../SesionUsuario/SesionUsuario';
import { TiendaImplementadorChip } from '../../implementacion/TiendaImplementadorChip/TiendaImplementadorChip';
import { useAuth } from '../../../../context/AuthContext';
import { OPCIONES_POR_MODO } from '../../../../constants/navegacion';
import { opcionesVisibles, type OpcionNavegacion } from '../../../../domain/permisos/permisos';
import isotipoCemaco from '../../../../assets/cemaco-isotipo.png';
import './AppTopbar.css';

interface AppTopbarProps {
  titulo: string;
  breadcrumb?: ReactNode;
}

/** Opción de la barra con submenú: botón desplegable; Escape y clic fuera lo cierran. */
function GrupoNavegacion({ opcion }: { opcion: OpcionNavegacion }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();
  const { pathname } = useLocation();
  // El grupo se marca solo por sus hijos: agrupan en el menú pero conservan su ruta (Por tienda vive
  // bajo `/mantenimiento/…` y pertenece a Productos).
  const activo = (opcion.hijos ?? []).map((h) => h.ruta).some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alPulsarTecla);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierto]);

  return (
    <div className="app-topbar__grupo" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className={`app-topbar__nav-opcion app-topbar__nav-boton${activo ? ' app-topbar__nav-opcion--activa' : ''}`}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-controls={idMenu}
        onClick={() => setAbierto((v) => !v)}
      >
        {opcion.etiqueta}
        <span className={`app-topbar__chevron${abierto ? ' app-topbar__chevron--abierto' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="app-topbar__menu" id={idMenu}>
          {opcion.hijos?.map((hijo) => (
            <li key={hijo.ruta}>
              <NavLink
                to={hijo.ruta}
                end={hijo.exacta}
                className={({ isActive }) =>
                  `app-topbar__menu-item${isActive ? ' app-topbar__menu-item--activo' : ''}`
                }
                onClick={() => setAbierto(false)}
              >
                {hijo.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AppTopbar({ titulo, breadcrumb }: AppTopbarProps) {
  const { rol, modos, usuario } = useAuth();
  const esImplementador = rol === 'implementador';
  const opciones = opcionesVisibles(OPCIONES_POR_MODO[rol ?? 'implementador'], usuario);

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
        {opciones.map((opcion) => (opcion.hijos ? (
          <GrupoNavegacion key={opcion.ruta} opcion={opcion} />
        ) : (
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
        )))}
      </nav>
      {esImplementador && <TiendaImplementadorChip />}
      {modos.length > 1 && <RoleSwitch />}
      <SesionUsuario />
    </header>
  );
}
