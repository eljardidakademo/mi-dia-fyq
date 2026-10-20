import docenteJson from '../../config/docente.json';
import type { Docente } from '../../config/tipos';
import { normalizar } from '../normalizar';
import { construirSemana, lunesDe } from '../semana';
import ejemplo from './fixtures/ejemplo_2026-10-08.json';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const docente = docenteJson as Docente;
const a = (iso: string, hhmm = '10:00') => new Date(`${iso}T${hhmm}:00`);

const conSemana = {
  ...ejemplo,
  semana: [
    { fecha: '2026-10-09', codigo: '1BD', sesion: 'S15', previsto: 'No debería salir: es festivo' },
    { fecha: '2026-10-06', codigo: '2C', sesion: 'S12', previsto: 'Introducción a la densidad' },
    { fecha: 'mañana', codigo: '2C', sesion: 'S99', previsto: 'fecha mala' },
  ],
  avance: [
    { grupo: '2º ESO E', codigo: '2E', unidad: 'UD1 Método científico', hechas: 9, total: 12 },
    { grupo: '2º ESO C', codigo: '2C', unidad: 'UD1 Método científico', hechas: '14', total: 12 },
    { grupo: 'x', codigo: '3E', unidad: 'Sin total', hechas: 2, total: 0 },
  ],
};

test('fin de semana: se enseña la semana siguiente', () => {
  expect(lunesDe('2026-10-08')).toBe('2026-10-05');
  expect(lunesDe('2026-10-10')).toBe('2026-10-12');
  expect(lunesDe('2026-10-11')).toBe('2026-10-12');
});

test('los campos nuevos son opcionales y se limpian', () => {
  expect(normalizar(ejemplo).dia).toMatchObject({ semana: [], avance: [] });
  const dia = normalizar(conSemana).dia!;
  expect(dia.semana.map((s) => s.sesion)).toEqual(['S15', 'S12']);
  // Se queda en el máximo, y una unidad sin total no sirve.
  expect(dia.avance.map((x) => [x.codigo, x.hechas, x.total])).toEqual([
    ['2E', 9, 12],
    ['2C', 12, 12],
  ]);
});

test('semana del 5 al 9 de octubre vista el jueves 8', () => {
  const s = construirSemana(docente, normalizar(conSemana).dia, a('2026-10-08'));
  expect(s.dias.map((d) => [d.titulo, d.cuando, d.lectivo])).toEqual([
    ['Lunes 05/10', 'pasado', true],
    ['Martes 06/10', 'pasado', true],
    ['Miércoles 07/10', 'pasado', true],
    ['Jueves 08/10', 'hoy', true],
    ['Viernes 09/10', 'futuro', false],
  ]);
  expect(s.dias[4]).toMatchObject({ motivo: 'Festivo', clases: [] });

  // Hoy sale lo que trae el resumen; 2º C ya está hecha según el parte.
  const jueves = s.dias[3];
  expect(jueves.clases.map((c) => c.codigo)).toEqual(['2C', '2E', '3E']);
  expect(jueves.clases[0]).toMatchObject({ hecha: true, sesion: 'S13' });
  expect(jueves.clases[0].previsto).not.toMatch(/ya hecho/i);

  // Otro día: lo previsto que viene en «semana».
  expect(s.dias[1].clases.find((c) => c.codigo === '2C')).toMatchObject({ sesion: 'S12', previsto: 'Introducción a la densidad' });

  // Avance en el orden de los grupos del docente, con su ritmo.
  expect(s.avance.map((x) => x.codigo)).toEqual(['2C', '2E']);
  expect(s.avance[0].ritmo?.desfase).toBe(-5);
  expect(s.avance[1].ritmo).toBeUndefined();
});

test('sin resumen: solo el horario y sin avance', () => {
  const s = construirSemana(docente, null, a('2026-10-13'));
  expect(s.lunes).toBe('2026-10-12');
  expect(s.dias[0].lectivo).toBe(false); // 12 de octubre
  expect(s.dias[1].clases.map((c) => c.codigo)).toEqual(['1BD', '4B', '2C']);
  expect(s.avance).toEqual([]);
});
