import { Navigate, Route, Routes } from 'react-router-dom';
import { PlanogramasListado } from '../pages/PlanogramasListado/PlanogramasListado';
import { PlanogramaDetalle } from '../pages/PlanogramaDetalle/PlanogramaDetalle';

// El Editor de planograma (/planogramas/:id/versiones/:versionId/editor) se agrega cuando
// se implemente el módulo de versiones/góndolas/niveles — ver INVENTARIO_PANTALLAS_COMPONENTES.md.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/planogramas" replace />} />
      <Route path="/planogramas" element={<PlanogramasListado />} />
      <Route path="/planogramas/:id" element={<PlanogramaDetalle />} />
    </Routes>
  );
}
