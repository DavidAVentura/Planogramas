import { AppRoutes } from './router/routes';

// Layout raíz. Hoy cada página monta su propio AppTopbar (título/breadcrumb varían por
// pantalla) — este componente queda como el punto único donde main.tsx monta el árbol de
// rutas, y es donde iría un shell compartido (nav lateral, etc.) si hiciera falta más adelante.
function App() {
  return <AppRoutes />;
}

export default App;
