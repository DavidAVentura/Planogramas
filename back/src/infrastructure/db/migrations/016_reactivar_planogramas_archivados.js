/**
 * 016_reactivar_planogramas_archivados.js
 * El archivado de planogramas queda en pausa: solo se archivan versiones. Los planogramas que
 * hubieran quedado en 'archivado' vuelven a 'borrador' (el estado de todos los vigentes; nada
 * pasa planogramas a 'activo'). Sus versiones no se tocan: el archivado del planograma nunca
 * las cambió.
 *
 * Solo datos. No reversible: no se guarda qué planogramas estaban archivados.
 */

exports.up = async function (knex) {
  await knex('Planograma').where('estado', 'archivado').update({ estado: 'borrador' });
};

exports.down = async function () {};
