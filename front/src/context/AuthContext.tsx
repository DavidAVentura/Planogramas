import { createContext, useContext, useState, type ReactNode } from 'react';

export type Rol = 'analista' | 'implementador';

interface AuthContextValue {
  rol: Rol;
  setRol: (rol: Rol) => void;
  puedeEscribir: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>('analista');

  return (
    <AuthContext.Provider value={{ rol, setRol, puedeEscribir: rol === 'analista' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
