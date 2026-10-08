import docenteJson from '../../config/docente.json';
import type { Docente } from '../../config/tipos';
import ejemplo from '../../datos/__tests__/fixtures/ejemplo_2026-10-08.json';
import { normalizar } from '../../datos/normalizar';
import { datosWidget, lectivosProximos, textoAviso } from '../contenido';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const docente = docenteJson as Docente;
const dia = normalizar(ejemplo).dia;
const a = (iso: string, hhmm: string) => new Date(`${iso}T${hhmm}:00`);

describe('aviso de la mañana', () => {
  test('se programan solo días lectivos (se salta el puente del Pilar)', () => {
    expect(lectivosProximos(docente, '2026-10-08', 3)).toEqual(['2026-10-08', '2026-10-13', '2026-10-14']);
  });

  test('festivo: no hay aviso', () => {
    expect(textoAviso(docente, dia, '2026-10-09')).toBeNull();
  });

  test('martes 13: primera clase del horario, material del resumen y lo urgente', () => {
    const t = textoAviso(docente, dia, '2026-10-13')!;
    expect(t.titulo).toBe('Martes 13/10 · 3 clases');
    const lineas = t.cuerpo.split('\n');
    expect(lineas[0]).toMatch(/^Primera: 08:00 1º Bach/);
    const preparar13 = (dia?.preparar ?? []).filter((p) => p.fecha === '2026-10-13');
    if (preparar13.length) expect(t.cuerpo).toContain(preparar13[0].que);
    expect(t.cuerpo).toContain(`Corregir: ${dia!.corregir.length}`);
  });

  test('en inglés', () => {
    expect(textoAviso(docente, dia, '2026-10-13', 'en')!.titulo).toBe('Tuesday 13/10 · 3 classes');
  });
});

describe('widget', () => {
  test('a las 9:00 del 08/10 enseña 2º E como siguiente', () => {
    const d = datosWidget(docente, dia, a('2026-10-08', '09:00'), '2026-10-08');
    expect(d.tipo === 'dia' && d.clase?.codigo).toBe('2E');
    expect(d.tipo === 'dia' && d.etiqueta).toBe('Siguiente');
  });

  test('a las 8:10 la clase de ahora es 2º C (solo con el horario)', () => {
    const d = datosWidget(docente, null, a('2026-10-08', '08:10'), '2026-10-08');
    expect(d.tipo === 'dia' && [d.clase?.codigo, d.etiqueta]).toEqual(['2C', 'Ahora']);
  });

  test('una clase ya dada según el parte no sale como «Ahora»', () => {
    const d = datosWidget(docente, dia, a('2026-10-08', '08:10'), '2026-10-08');
    expect(d.tipo === 'dia' && d.clase?.codigo).toBe('2E');
  });

  test('por la tarde: no quedan clases y dice cuándo es la próxima', () => {
    const d = datosWidget(docente, dia, a('2026-10-08', '17:00'), '2026-10-08');
    expect(d.tipo === 'dia' && d.clase).toBeNull();
    expect(d.tipo === 'dia' && d.despues).toBe('Próximo día: Martes 13/10 · 08:00 1BD');
  });
});
