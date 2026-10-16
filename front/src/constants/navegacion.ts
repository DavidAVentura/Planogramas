import { REGLAS, type Modo, type OpcionNavegacion } from '../domain/permisos/permisos';

// Opciones del navbar por modo, con la regla que decide si el usuario las ve.
export const OPCIONES_POR_MODO: Record<Modo, readonly OpcionNavegacion[]> = {
  analista: [
    { etiqueta: 'Planogramas', ruta: '/planogramas', regla: REGLAS.analista },
    { etiqueta: 'Estructura', ruta: '/estructura', regla: REGLAS.estructura },
    // Grupos con menú desplegable. Solo agrupan en el menú: cada hijo conserva su ruta.
    // La vista vieja de Productos (`/productos`) sigue oculta del menú pero activa (DT-51).
    {
      etiqueta: 'Productos',
      ruta: '/productos',
      regla: REGLAS.analista,
      hijos: [
        { etiqueta: 'Por planograma', ruta: '/por-version', regla: REGLAS.analista },
        { etiqueta: 'Por tienda', ruta: '/mantenimiento/consolidado-tiendas', regla: REGLAS.analista },
      ],
    },
    {
      etiqueta: 'Mantenimiento',
      ruta: '/mantenimiento',
      regla: REGLAS.analista,
      hijos: [
        { etiqueta: 'Accesorios', ruta: '/accesorios', regla: REGLAS.analista },
        { etiqueta: 'Tiendas', ruta: '/tiendas', regla: REGLAS.analista },
      ],
    },
  ],
  // El Implementador solo ve su tienda y los productos de sus planogramas.
  implementador: [
    { etiqueta: 'Mi tienda', ruta: '/mi-tienda', regla: REGLAS.miTienda, exacta: true },
    { etiqueta: 'Productos', ruta: '/mi-tienda/productos', regla: REGLAS.productosTienda },
  ],
};
