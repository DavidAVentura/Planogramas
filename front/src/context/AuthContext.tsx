import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { sesionService } from '../services/sesion.service';
import type { UsuarioSesion } from '../types/usuario';

export type Rol = 'analista' | 'implementador';

export type EstadoSesion = 'verificando' | 'autenticado' | 'no_autenticado';

interface AuthContextValue {
  estado: EstadoSesion;
  usuario: UsuarioSesion | null;
  /** Guarda el token recibido en /auth?token= y lo valida contra el backend. */
  iniciarSesion: (token: string) => Promise<void>;
  cerrarSesion: () => void;
  // Rol elegido a mano (RoleSwitch) hasta que se mapeen los permisos de CAO.
  rol: Rol;
  setRol: (rol: Rol) => void;
  puedeEscribir: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>('analista');
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [estado, setEstado] = useState<EstadoSesion>(() =>
    sesionService.obtenerToken() ? 'verificando' : 'no_autenticado',
  );

  // El interceptor invalida la sesión ante cualquier 401 del backend.
  useEffect(
    () =>
      sesionService.alInvalidar(() => {
        setUsuario(null);
        setEstado('no_autenticado');
      }),
    [],
  );

  // Al cargar la app con un token ya guardado, se revalida para recuperar el usuario.
  useEffect(() => {
    if (estado !== 'verificando' || window.location.pathname === '/auth') return;
    authService
      .obtenerSesion()
      .then((datos) => {
        setUsuario(datos);
        setEstado('autenticado');
      })
      .catch(() => setEstado((actual) => (actual === 'verificando' ? 'no_autenticado' : actual)));
    // Solo en el montaje: después el estado cambia por iniciarSesion/invalidación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarSesion = useCallback(async (token: string) => {
    sesionService.guardarToken(token);
    setEstado('verificando');
    try {
      setUsuario(await authService.obtenerSesion());
      setEstado('autenticado');
    } catch (err) {
      sesionService.limpiar();
      setUsuario(null);
      setEstado('no_autenticado');
      throw err;
    }
  }, []);

  const cerrarSesion = useCallback(() => sesionService.invalidar(), []);

  return (
    <AuthContext.Provider
      value={{
        estado,
        usuario,
        iniciarSesion,
        cerrarSesion,
        rol,
        setRol,
        puedeEscribir: rol === 'analista',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
