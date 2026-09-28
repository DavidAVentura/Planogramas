import { useNavigate } from 'react-router-dom';
import { useAuth, type Rol } from '../../../../context/AuthContext';
import './RoleSwitch.css';

const OPCIONES: { rol: Rol; label: string }[] = [
  { rol: 'analista', label: 'Analista' },
  { rol: 'implementador', label: 'Implementador' },
];

// Pantalla de inicio de cada rol al cambiar de rol.
const INICIO_POR_ROL: Record<Rol, string> = {
  analista: '/planogramas',
  implementador: '/mi-tienda',
};

export function RoleSwitch() {
  const { rol, setRol } = useAuth();
  const navigate = useNavigate();

  function elegir(nuevo: Rol) {
    if (nuevo === rol) return;
    setRol(nuevo);
    navigate(INICIO_POR_ROL[nuevo]);
  }

  return (
    <div className="role-switch" role="radiogroup" aria-label="Rol">
      {OPCIONES.map((opcion) => (
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
