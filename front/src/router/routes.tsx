import { Navigate, Route, Routes } from 'react-router-dom';
import { PlanogramasListado } from '../pages/PlanogramasListado/PlanogramasListado';
import { PlanogramaDetalle } from '../pages/PlanogramaDetalle/PlanogramaDetalle';
import { EditorPlanograma } from '../pages/EditorPlanograma/EditorPlanograma';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/planogramas" replace />} />
      <Route path="/planogramas" element={<PlanogramasListado />} />
      <Route path="/planogramas/:id" element={<PlanogramaDetalle />} />
      <Route path="/planogramas/:id/versiones/:versionId/editor" element={<EditorPlanograma />} />
    </Routes>
  );
}
