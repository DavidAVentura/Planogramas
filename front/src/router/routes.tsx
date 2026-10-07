import { Navigate, Route, Routes } from 'react-router-dom';
import { PlanogramasListado } from '../pages/PlanogramasListado/PlanogramasListado';
import { PlanogramaDetalle } from '../pages/PlanogramaDetalle/PlanogramaDetalle';
import { EditorPlanograma } from '../pages/EditorPlanograma/EditorPlanograma';
import { LienzoPlanograma } from '../pages/LienzoPlanograma/LienzoPlanograma';
import { TiendasListado } from '../pages/TiendasListado/TiendasListado';
import { ProductosListado } from '../pages/ProductosListado/ProductosListado';
import { EstructuraAsignacion } from '../pages/EstructuraAsignacion/EstructuraAsignacion';
import { MiTienda } from '../pages/MiTienda/MiTienda';
import { ProductosTienda } from '../pages/ProductosTienda/ProductosTienda';
import { ProductosPorVersion } from '../pages/ProductosPorVersion/ProductosPorVersion';
import { AccesoriosListado } from '../pages/AccesoriosListado/AccesoriosListado';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/planogramas" replace />} />
      <Route path="/planogramas" element={<PlanogramasListado />} />
      <Route path="/planogramas/:id" element={<PlanogramaDetalle />} />
      <Route path="/planogramas/:id/versiones/:versionId/editor" element={<EditorPlanograma />} />
      <Route path="/planogramas/:id/versiones/:versionId/lienzo" element={<LienzoPlanograma />} />
      <Route path="/planogramas/:id/versiones/:versionId/lienzo/gondola/:gondolaId" element={<LienzoPlanograma />} />
      <Route path="/tiendas" element={<TiendasListado />} />
      <Route path="/estructura" element={<EstructuraAsignacion />} />
      <Route path="/productos" element={<ProductosListado />} />
      <Route path="/por-version" element={<ProductosPorVersion />} />
      <Route path="/accesorios" element={<AccesoriosListado />} />
      <Route path="/mi-tienda" element={<MiTienda />} />
      <Route path="/mi-tienda/productos" element={<ProductosTienda />} />
    </Routes>
  );
}
