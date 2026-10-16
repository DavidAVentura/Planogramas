import { describe, expect, it } from 'vitest';
import { OPCIONES_POR_MODO } from '../../constants/navegacion';
import type { UsuarioSesion } from '../../types/usuario';
import type { OpcionNavegacion } from './permisos';
import {
  cumpleRegla,
  modoDeRuta,
  modoInicial,
  modosDisponibles,
  opcionesVisibles,
  REGLAS,
  resolverModo,
  rutaInicio,
} from './permisos';

const todos = Array.from({ length: 10 }, (_, i) => `PLA${String(i + 1).padStart(3, '0')}`);
const usuario = (permisos: string[], analista: boolean, implementador = true): UsuarioSesion => ({
  permisos,
  capacidades: { analista, implementador },
});

const analista = usuario(todos, true);
const tienda = usuario(['PLA009', 'PLA010'], false);
const soloPLA010 = usuario(['PLA010'], false);

describe('modosDisponibles', () => {
  it('tienda: solo implementador', () => {
    expect(modosDisponibles(tienda)).toEqual(['implementador']);
  });
  it('analista con los 10: ambos modos, en orden', () => {
    expect(modosDisponibles(analista)).toEqual(['analista', 'implementador']);
  });
  it('sin permisos o sin usuario: ninguno', () => {
    expect(modosDisponibles(usuario([], false, false))).toEqual([]);
    expect(modosDisponibles(null)).toEqual([]);
  });
  it('sin capacidades (back viejo) no abre analista', () => {
    expect(modosDisponibles({ permisos: todos } as unknown as UsuarioSesion)).toEqual(['implementador']);
  });
  it('comparación exacta de códigos', () => {
    expect(modosDisponibles(usuario(['pla009'], false))).toEqual([]);
  });
});

describe('resolverModo y modoInicial', () => {
  it('un modo guardado o pedido por URL que el usuario no tiene no se respeta', () => {
    expect(resolverModo(['implementador'], 'analista')).toBe('implementador');
  });
  it('sin elegido prefiere analista y si no el primero', () => {
    expect(resolverModo(['analista', 'implementador'], null)).toBe('analista');
    expect(resolverModo([], 'analista')).toBeNull();
  });
  it('la ruta manda sobre lo guardado', () => {
    expect(modoInicial('/mi-tienda/productos', 'analista')).toBe('implementador');
    expect(modoInicial('/planogramas', 'implementador')).toBe('analista');
    expect(modoInicial('/', 'implementador')).toBe('implementador');
    expect(modoInicial('/', 'xyz')).toBeNull();
  });
  it('modoDeRuta', () => {
    expect(modoDeRuta('/')).toBeNull();
    expect(modoDeRuta('/auth')).toBeNull();
    expect(modoDeRuta('/mi-tienda')).toBe('implementador');
  });
});

describe('rutaInicio y cumpleRegla', () => {
  it('implementador con solo PLA010 empieza en Productos', () => {
    expect(rutaInicio(OPCIONES_POR_MODO.implementador, soloPLA010)).toBe('/mi-tienda/productos');
  });
  it('analista empieza en /planogramas; tienda en /mi-tienda', () => {
    expect(rutaInicio(OPCIONES_POR_MODO.analista, analista)).toBe('/planogramas');
    expect(rutaInicio(OPCIONES_POR_MODO.implementador, tienda)).toBe('/mi-tienda');
  });
  it('analista sin PLA006 no cumple la regla del lienzo', () => {
    const sinLienzo = usuario(todos.filter((c) => c !== 'PLA006'), true);
    expect(cumpleRegla(sinLienzo, REGLAS.lienzo)).toBe(false);
    expect(cumpleRegla(analista, REGLAS.lienzo)).toBe(true);
    expect(cumpleRegla(tienda, REGLAS.analista)).toBe(false);
  });
});

describe('opcionesVisibles (grupos con hijos)', () => {
  it('analista ve el grupo Productos (por planograma y por tienda) y Mantenimiento con Accesorios y Tiendas', () => {
    const visibles = opcionesVisibles(OPCIONES_POR_MODO.analista, analista);
    const productos = visibles.find((o) => o.etiqueta === 'Productos');
    expect(productos?.hijos?.map((h) => h.ruta)).toEqual(['/por-version', '/mantenimiento/consolidado-tiendas']);
    const mantenimiento = visibles.find((o) => o.etiqueta === 'Mantenimiento');
    expect(mantenimiento?.hijos?.map((h) => h.ruta)).toEqual(['/accesorios', '/tiendas']);
  });

  it('implementador no ve el grupo Mantenimiento', () => {
    expect(opcionesVisibles(OPCIONES_POR_MODO.analista, tienda)).toEqual([]);
    expect(opcionesVisibles(OPCIONES_POR_MODO.implementador, tienda).some((o) => o.etiqueta === 'Mantenimiento')).toBe(false);
  });

  it('un grupo cuyo único hijo no cumple la regla se quita', () => {
    const opciones: OpcionNavegacion[] = [
      { etiqueta: 'Libre', ruta: '/libre', regla: REGLAS.analista },
      {
        etiqueta: 'Grupo',
        ruta: '/grupo',
        regla: REGLAS.analista,
        hijos: [{ etiqueta: 'Lienzo', ruta: '/grupo/lienzo', regla: REGLAS.lienzo }],
      },
    ];
    const sinLienzo = usuario(todos.filter((c) => c !== 'PLA006'), true);
    expect(opcionesVisibles(opciones, sinLienzo).map((o) => o.etiqueta)).toEqual(['Libre']);
    expect(opcionesVisibles(opciones, analista).map((o) => o.etiqueta)).toEqual(['Libre', 'Grupo']);
  });

  it('filtra los hijos que no cumplen y conserva los demás', () => {
    const opciones: OpcionNavegacion[] = [{
      etiqueta: 'Grupo',
      ruta: '/grupo',
      regla: REGLAS.analista,
      hijos: [
        { etiqueta: 'A', ruta: '/grupo/a', regla: REGLAS.lienzo },
        { etiqueta: 'B', ruta: '/grupo/b', regla: REGLAS.analista },
      ],
    }];
    const sinLienzo = usuario(todos.filter((c) => c !== 'PLA006'), true);
    expect(opcionesVisibles(opciones, sinLienzo)[0].hijos?.map((h) => h.etiqueta)).toEqual(['B']);
  });

  it('rutaInicio usa la ruta del primer hijo cuando la primera opción es un grupo', () => {
    const opciones: OpcionNavegacion[] = [{
      etiqueta: 'Grupo',
      ruta: '/grupo',
      regla: REGLAS.analista,
      hijos: [{ etiqueta: 'A', ruta: '/grupo/a', regla: REGLAS.analista }],
    }];
    expect(rutaInicio(opciones, analista)).toBe('/grupo/a');
    expect(rutaInicio(opciones, tienda)).toBeNull();
  });
});
