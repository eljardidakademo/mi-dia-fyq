import docenteJson from '../../config/docente.json';
import type { Docente } from '../../config/tipos';
import { estadoDia, fechaCorta, fechaLarga, franjasDelHorario, proximoLectivo } from '../calendario';
import { descargar, esperarResumenNuevo, mismoContenido, pedirResumenNuevo, textoError } from '../fuente';
import { fechaDesdeTexto, normalizar } from '../normalizar';
import { construirVista } from '../vista';
import ejemplo from './fixtures/ejemplo_2026-10-08.json';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const docente = docenteJson as Docente;
const a = (iso: string, hhmm = '12:00') => new Date(`${iso}T${hhmm}:00`);

describe('calendario', () => {
  test('textos de fecha', () => {
    expect(fechaLarga('2026-10-08')).toBe('Jueves 8 de octubre');
    expect(fechaCorta('2026-10-13')).toBe('Martes 13/10');
  });

  test('textos de fecha en valenciano e inglés', () => {
    expect(fechaLarga('2026-10-08', 'va')).toBe("Dijous 8 d'octubre");
    expect(fechaLarga('2026-11-13', 'va')).toBe('Divendres 13 de novembre');
    expect(fechaLarga('2026-10-08', 'en')).toBe('Thursday 8 October');
    expect(fechaCorta('2026-10-13', 'va')).toBe('Dimarts 13/10');
  });

  test('puente del Pilar: sin clase y vuelta el martes 13', () => {
    expect(estadoDia(docente, '2026-10-09')).toMatchObject({ lectivo: false, motivo: 'Festivo' });
    expect(estadoDia(docente, '2026-10-10').motivo).toBe('Fin de semana');
    expect(proximoLectivo(docente, '2026-10-08')).toBe('2026-10-13');
  });

  test('Navidad: se vuelve el jueves 7 de enero', () => {
    expect(proximoLectivo(docente, '2026-12-21')).toBe('2027-01-07');
  });

  test('viaje de 4º ESO: el día es lectivo pero 4º B no tiene clase', () => {
    const franjas = franjasDelHorario(docente, '2027-06-15'); // martes
    const cuatroB = franjas.find((f) => f.tipo === 'clase' && f.codigo === '4B');
    expect(cuatroB?.toca).toBe('Sin clase: Viaje de 4º ESO');
    expect(franjas.find((f) => f.tipo === 'clase' && f.codigo === '1BD')?.toca).toBe('');
  });

  test('el horario del jueves coincide con el resumen real', () => {
    const horario = franjasDelHorario(docente, '2026-10-08').map((f) => `${f.inicio} ${f.tipo === 'clase' ? f.codigo : f.toca}`);
    expect(horario).toEqual(['08:00 2C', '08:55 Guardia', '09:50 Coordinación didáctica', '11:15 2E', '13:05 3E']);
  });

  test('después del último día no hay clase', () => {
    expect(estadoDia(docente, '2027-06-21').motivo).toBe('Curso terminado');
    expect(proximoLectivo(docente, '2027-06-18')).toBeNull();
  });
});

describe('normalizar', () => {
  test('el resumen real del 08/10 pasa sin problemas', () => {
    const { dia, problemas } = normalizar(ejemplo);
    expect(problemas).toEqual([]);
    expect(dia?.franjas).toHaveLength(4);
    expect(dia?.fechas.map((f) => f.tipo)).toEqual(['examen', 'examen', 'entrega']);
  });

  test('arregla «desde» en texto', () => {
    expect(fechaDesdeTexto('Hechos el mié 07/10', '2026-10-08')).toBe('2026-10-07');
    expect(fechaDesdeTexto('20/12', '2027-01-10')).toBe('2026-12-20');
    const { dia, problemas } = normalizar({ ...ejemplo, corregir: [{ ...ejemplo.corregir[0], desde: 'Hechos el mié 07/10' }] });
    expect(dia?.corregir[0].desde).toBe('2026-10-07');
    expect(problemas).toHaveLength(1);
  });

  test('separa examen y entrega combinados', () => {
    const { dia } = normalizar({ ...ejemplo, fechas: [{ ...ejemplo.fechas[1], tipo: 'examen + entrega' }] });
    expect(dia?.fechas.map((f) => f.tipo)).toEqual(['examen', 'entrega']);
  });

  test('rechaza lo que no tiene fecha', () => {
    expect(normalizar({ franjas: [] }).dia).toBeNull();
    expect(normalizar('hola').dia).toBeNull();
  });
});

describe('vista', () => {
  const { dia } = normalizar(ejemplo);

  test('a las 9:00 del 08/10: 2º C hecha, Guardia ahora, 2º E es la siguiente clase', () => {
    const v = construirVista({ docente, ahora: a('2026-10-08', '09:00'), dia });
    expect(v.origen).toBe('hoy');
    expect(v.franjas.map((f) => f.estado)).toEqual(['hecha', 'ahora', 'futura', 'siguiente']);
    expect(v.fechas.find((f) => f.codigo === '2E')?.enDias).toBe(11);
    expect(v.alertas).toEqual([]);
  });

  test('sin conexión al día siguiente lectivo: horario del martes y lo pendiente del jueves', () => {
    const v = construirVista({ docente, ahora: a('2026-10-13', '07:30'), dia, errorDescarga: { codigo: 'sin_red' } });
    expect(v.origen).toBe('anterior');
    expect(v.franjas.filter((f) => f.tipo === 'clase').map((f) => f.tipo === 'clase' && f.codigo)).toEqual(['1BD', '4B', '2C']);
    expect(v.franjas[0]).toMatchObject({ estado: 'siguiente', ritmo: 'Adelantado 3–4 sesiones' });
    expect(v.corregir).toHaveLength(1);
    expect(v.preparar).toEqual([]); // los del 13/10 ya son de hoy
    expect(v.alertas.map((x) => x.nivel)).toEqual(['error', 'aviso']);
    expect(v.alertas[0].texto).toContain('Sin conexión');
  });

  test('en valenciano: fecha y alertas traducidas', () => {
    const v = construirVista({ docente, ahora: a('2026-10-13', '07:30'), dia, errorDescarga: { codigo: 'sin_red' }, idioma: 'va' });
    expect(v.fechaTexto).toBe('Dimarts 13 d\'octubre');
    expect(v.alertas[0].texto).toContain('Sense connexió');
    expect(v.alertas[1].texto).toContain('dijous 08/10');
  });

  test('festivo sin resumen: no lectivo con el próximo día', () => {
    const v = construirVista({ docente, ahora: a('2026-10-09'), dia: null });
    expect(v).toMatchObject({ lectivo: false, motivoNoLectivo: 'Festivo', proximoLectivo: 'Martes 13/10', franjas: [] });
  });
});

describe('descargar', () => {
  const resp = (cuerpo: string, status = 200) =>
    jest.fn().mockResolvedValue({ ok: status < 400, status, text: () => Promise.resolve(cuerpo) }) as unknown as typeof fetch;
  const aj = { url: 'https://script.google.com/macros/s/X/exec', clave: 'a b' };

  test('respuesta correcta', async () => {
    const f = resp(JSON.stringify({ ok: true, archivo: 'mi_dia_fyq_2026-10-08_0921.json', datos: ejemplo }));
    const r = await descargar(aj, f);
    expect(r.ok).toBe(true);
    expect((f as jest.Mock).mock.calls[0][0]).toBe('https://script.google.com/macros/s/X/exec?clave=a%20b');
  });

  test('sesiones que el script acaba de apuntar en el registro', async () => {
    const f = resp(JSON.stringify({ ok: true, archivo: 'x.json', datos: ejemplo, registrado: ['2C S14', '1BD S18'] }));
    const r = await descargar(aj, f);
    expect(r.ok && r.registrado).toEqual(['2C S14', '1BD S18']);
    const sin = await descargar(aj, resp(JSON.stringify({ ok: true, archivo: 'x.json', datos: ejemplo, registroError: 'No encuentro' })));
    expect(sin.ok && sin.registrado).toEqual([]);
  });

  test('clave incorrecta', async () => {
    const r = await descargar(aj, resp(JSON.stringify({ ok: false, error: 'clave' })));
    expect(r).toEqual({ ok: false, error: { codigo: 'clave' } });
    expect(textoError({ codigo: 'clave' })).toContain('clave');
  });

  test('página de inicio de sesión de Google en vez de JSON', async () => {
    const r = await descargar(aj, resp('<html>Iniciar sesión</html>'));
    expect(r).toEqual({ ok: false, error: { codigo: 'no_json', detalle: 'Iniciar sesión' } });
    expect(textoError({ codigo: 'no_json' })).toContain('Cualquier usuario');
    expect(textoError({ codigo: 'no_json', detalle: 'Iniciar sesión' })).toContain('«Iniciar sesión»');
  });

  test('de una página de error de Google se queda solo el texto', async () => {
    const html = '<html><head><title>Error</title><style>p{}</style></head><body><p>Exception: No item with the given ID could be found.</p></body></html>';
    const r = await descargar(aj, resp(html));
    expect(r).toEqual({ ok: false, error: { codigo: 'no_json', detalle: 'Error Exception: No item with the given ID could be found.' } });
  });

  test('sin red', async () => {
    const f = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;
    expect(await descargar(aj, f)).toEqual({ ok: false, error: { codigo: 'sin_red' } });
  });
});

describe('pedir resumen nuevo', () => {
  const aj = { url: 'https://script.google.com/macros/s/X/exec', clave: 'k' };
  const json = (o: unknown) => ({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(o)) });

  test('el script lanza la tarea', async () => {
    const f = jest.fn().mockResolvedValue(json({ ok: true, pedidoEn: '2026-10-08T17:00:00Z' })) as unknown as typeof fetch;
    expect(await pedirResumenNuevo(aj, f)).toEqual({ ok: true, pedidoEn: '2026-10-08T17:00:00Z' });
    expect((f as jest.Mock).mock.calls[0][0]).toBe('https://script.google.com/macros/s/X/exec?clave=k&accion=regenerar');
  });

  test('script antiguo: devuelve el resumen en vez de lanzar la tarea', async () => {
    const f = jest.fn().mockResolvedValue(json({ ok: true, archivo: 'x.json', datos: ejemplo })) as unknown as typeof fetch;
    expect(await pedirResumenNuevo(aj, f)).toEqual({ ok: false, error: { codigo: 'version_vieja' } });
  });

  test('falta el token o la tarea falla', async () => {
    const sinToken = jest.fn().mockResolvedValue(json({ ok: false, error: 'sin_token' })) as unknown as typeof fetch;
    expect(await pedirResumenNuevo(aj, sinToken)).toEqual({ ok: false, error: { codigo: 'sin_token' } });
    const falla = jest.fn().mockResolvedValue(json({ ok: false, error: 'rutina', detalle: 'HTTP 401' })) as unknown as typeof fetch;
    const r = await pedirResumenNuevo(aj, falla);
    expect(r).toEqual({ ok: false, error: { codigo: 'rutina', detalle: 'HTTP 401' } });
    expect(!r.ok && textoError(r.error, 'en')).toBe("Couldn't start the Claude task: HTTP 401");
  });

  test('espera hasta que aparece un archivo distinto', async () => {
    const viejo = json({ ok: true, archivo: 'mi_dia_fyq_2026-10-08_1545.json', datos: ejemplo });
    const nuevo = json({ ok: true, archivo: 'mi_dia_fyq_2026-10-08_1802.json', datos: ejemplo });
    const f = jest.fn().mockResolvedValueOnce(viejo).mockResolvedValueOnce(viejo).mockResolvedValue(nuevo) as unknown as typeof fetch;
    const r = await esperarResumenNuevo(aj, 'mi_dia_fyq_2026-10-08_1545.json', { cadaMs: 1, maxMs: 5000, fetchFn: f });
    expect(r.ok && r.guardado.archivo).toBe('mi_dia_fyq_2026-10-08_1802.json');
    expect((f as jest.Mock).mock.calls).toHaveLength(3);
  });

  test('si no llega a tiempo lo dice', async () => {
    const f = jest.fn().mockResolvedValue(json({ ok: true, archivo: 'a.json', datos: ejemplo })) as unknown as typeof fetch;
    expect(await esperarResumenNuevo(aj, 'a.json', { cadaMs: 1, maxMs: 20, fetchFn: f })).toEqual({ ok: false, error: { codigo: 'tarda' } });
  });
});

describe('mismoContenido', () => {
  it('no cuenta la hora de generación', () => {
    const a = { ...ejemplo, generadoEn: '2026-10-08T07:46:00+02:00' };
    const b = { ...ejemplo, generadoEn: '2026-10-08T08:27:00+02:00' };
    expect(mismoContenido(a, b)).toBe(true);
  });
  it('detecta cualquier otro cambio', () => {
    expect(mismoContenido(ejemplo, { ...ejemplo, resumen: 'otra cosa' })).toBe(false);
  });
});
