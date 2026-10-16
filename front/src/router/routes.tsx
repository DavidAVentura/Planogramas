import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
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
import { ConsolidadoTiendas } from '../pages/ConsolidadoTiendas/ConsolidadoTiendas';
import { REGLAS, type Modo, type ReglaAcceso } from '../domain/permisos/permisos';
import { RedirigirInicio } from './RedirigirInicio';
import { RequierePermiso } from './RequierePermiso';

function protegida(regla: ReglaAcceso, modo: Modo, pagina: ReactNode) {
  return <RequierePermiso regla={regla} modo={modo}>{pagina}</RequierePermiso>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RedirigirInicio />} />
      <Route path="/planogramas" element={protegida(REGLAS.analista, 'analista', <PlanogramasListado />)} />
      <Route path="/planogramas/:id" element={protegida(REGLAS.analista, 'analista', <PlanogramaDetalle />)} />
      <Route
        path="/planogramas/:id/versiones/:versionId/editor"
        element={protegida(REGLAS.analista, 'analista', <EditorPlanograma />)}
      />
      <Route
        path="/planogramas/:id/versiones/:versionId/lienzo"
        element={protegida(REGLAS.lienzo, 'analista', <LienzoPlanograma />)}
      />
      <Route
        path="/planogramas/:id/versiones/:versionId/lienzo/gondola/:gondolaId"
        element={protegida(REGLAS.lienzo, 'analista', <LienzoPlanograma />)}
      />
      <Route path="/tiendas" element={protegida(REGLAS.analista, 'analista', <TiendasListado />)} />
      <Route path="/estructura" element={protegida(REGLAS.estructura, 'analista', <EstructuraAsignacion />)} />
      <Route path="/productos" element={protegida(REGLAS.analista, 'analista', <ProductosListado />)} />
      <Route path="/por-version" element={protegida(REGLAS.analista, 'analista', <ProductosPorVersion />)} />
      <Route path="/accesorios" element={protegida(REGLAS.analista, 'analista', <AccesoriosListado />)} />
      <Route
        path="/mantenimiento/consolidado-tiendas"
        element={protegida(REGLAS.analista, 'analista', <ConsolidadoTiendas />)}
      />
      <Route path="/mi-tienda" element={protegida(REGLAS.miTienda, 'implementador', <MiTienda />)} />
      <Route
        path="/mi-tienda/productos"
        element={protegida(REGLAS.productosTienda, 'implementador', <ProductosTienda />)}
      />
    </Routes>
  );
}
