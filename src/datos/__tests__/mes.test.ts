import docenteJson from '../../config/docente.json';
import type { Docente } from '../../config/tipos';
import { construirMes, inicioMes } from '../mes';
import { normalizar } from '../normalizar';
import ejemplo from './fixtures/ejemplo_2026-10-08.json';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const docente = docenteJson as Docente;
const dia = normalizar({
  ...ejemplo,
  fechas: [
    { fecha: '2026-10-20', grupo: '1º Bach D', codigo: '1BD', tipo: 'examen', que: 'UD1', estado: 'fijado' },
    { fecha: '2026-10-20', grupo: '2º ESO C', codigo: '2C', tipo: 'entrega', que: 'Informe', estado: 'fijado' },
    { fecha: '2026-11-12', grupo: '4º ESO B', codigo: '4B', tipo: 'examen', que: 'UD2', estado: 'provisional' },
  ],
}).dia;

describe('calendario del mes', () => {
  test('inicio de mes con desplazamiento, también al cambiar de año', () => {
    expect(inicioMes('2026-10-23')).toBe('2026-10-01');
    expect(inicioMes('2026-10-23', 1)).toBe('2026-11-01');
    expect(inicioMes('2026-12-15', 1)).toBe('2027-01-01');
    expect(inicioMes('2026-10-31', -1)).toBe('2026-09-01');
  });

  test('octubre: semanas de lunes a viernes desde la del día 1', () => {
    const m = construirMes(docente, dia, '2026-10-23');
    expect(m.titulo).toBe('Octubre 2026');
    expect(m.semanas.map((s) => s[0].fecha)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
    expect(m.semanas[0][0].delMes).toBe(false);
    const d20 = m.semanas[3][1];
    expect(d20).toMatchObject({ fecha: '2026-10-20', examenes: 1, entregas: 1 });
    expect(m.semanas[3][4].esHoy).toBe(true);
    expect(m.semanas[1][4]).toMatchObject({ fecha: '2026-10-09', lectivo: false });
    expect(m.fechas.map((f) => f.codigo)).toEqual(['1BD', '2C']);
    expect(m.fechas[0].enDias).toBe(-3);
  });

  test('noviembre empieza en domingo: la primera semana es la del lunes 2', () => {
    const m = construirMes(docente, dia, '2026-10-23', 1);
    expect(m.semanas[0][0].fecha).toBe('2026-11-02');
    expect(m.semanas[m.semanas.length - 1][0].fecha).toBe('2026-11-30');
    expect(m.fechas).toHaveLength(1);
  });
});
