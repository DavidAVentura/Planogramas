import { Route, Routes } from 'react-router-dom';
import { AppRoutes } from './router/routes';
import { RequiereSesion } from './router/RequiereSesion';
import { Autenticacion } from './pages/Autenticacion/Autenticacion';

// Layout raíz. Hoy cada página monta su propio AppTopbar (título/breadcrumb varían por
// pantalla) — este componente queda como el punto único donde main.tsx monta el árbol de
// rutas, y es donde iría un shell compartido (nav lateral, etc.) si hiciera falta más adelante.
// /auth queda fuera del guard: es donde llega el JWT desde CAO; todo lo demás exige sesión.
function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Autenticacion />} />
      <Route
        path="*"
        element={
          <RequiereSesion>
            <AppRoutes />
          </RequiereSesion>
        }
      />
    </Routes>
  );
}

export default App;
