import { useNavigate } from 'react-router-dom';
import { useAuth, type Rol } from '../../../../context/AuthContext';
import { OPCIONES_POR_MODO } from '../../../../constants/navegacion';
import { rutaInicio } from '../../../../domain/permisos/permisos';
import './RoleSwitch.css';

const OPCIONES: { rol: Rol; label: string }[] = [
  { rol: 'analista', label: 'Analista' },
  { rol: 'implementador', label: 'Implementador' },
];

export function RoleSwitch() {
  const { rol, modos, usuario, setRol } = useAuth();
  const navigate = useNavigate();

  function elegir(nuevo: Rol) {
    if (nuevo === rol) return;
    setRol(nuevo);
    // Al cambiar de modo se va a la primera pantalla que el usuario puede ver en él.
    navigate(rutaInicio(OPCIONES_POR_MODO[nuevo], usuario) ?? '/');
  }

  return (
    <div className="role-switch" role="radiogroup" aria-label="Rol">
      {OPCIONES.filter((opcion) => modos.includes(opcion.rol)).map((opcion) => (
        <button
          key={opcion.rol}
          type="button"
          role="radio"
          aria-checked={rol === opcion.rol}
          className={`role-switch__opcion ${rol === opcion.rol ? 'role-switch__opcion--activa' : ''}`}
          onClick={() => elegir(opcion.rol)}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}
