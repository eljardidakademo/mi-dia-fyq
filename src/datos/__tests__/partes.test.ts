import AsyncStorage from '@react-native-async-storage/async-storage';

import { enviarCola, idParte, leerCola, leerEstadosPartes, mandarOEncolar, type Parte } from '../partes';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const aj = { url: 'https://script.google.com/macros/s/X/exec', clave: 'k' };
const parte = (codigo = '2C', inicio = '08:00'): Parte => ({
  id: idParte('2026-10-13', inicio, codigo),
  fecha: '2026-10-13',
  inicio,
  codigo,
  grupo: '2º ESO C',
  sesion: 'S14',
  texto: 'Práctica de densidad hecha.',
  creadoEn: '2026-10-13T09:20:00Z',
});
const json = (o: unknown) => ({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(o)) });
const sinRed = () => jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;

beforeEach(() => AsyncStorage.clear());

test('se manda por POST con la clave y queda como enviado', async () => {
  const f = jest.fn().mockResolvedValue(json({ ok: true, guardado: true, lanzado: true })) as unknown as typeof fetch;
  expect(await mandarOEncolar(aj, parte(), f)).toEqual({ ok: true, lanzado: true, motivo: undefined });
  const [url, init] = (f as jest.Mock).mock.calls[0];
  expect(url).toBe(aj.url);
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toMatchObject({ clave: 'k', accion: 'parte', parte: { codigo: '2C', texto: 'Práctica de densidad hecha.' } });
  expect(await leerEstadosPartes('2026-10-13')).toEqual({ [parte().id]: { estado: 'enviado', lanzado: true } });
  expect(await leerCola()).toEqual([]);
});

test('sin conexión: se guarda en la cola y sale en el siguiente intento', async () => {
  const r = await mandarOEncolar(aj, parte(), sinRed());
  expect(r).toMatchObject({ ok: false, error: { codigo: 'sin_red' } });
  expect(await leerCola()).toHaveLength(1);
  expect((await leerEstadosPartes('2026-10-13'))[parte().id]).toEqual({ estado: 'pendiente' });

  // Volver a enviarlo sin red no lo duplica.
  await mandarOEncolar(aj, parte(), sinRed());
  expect(await leerCola()).toHaveLength(1);

  const ok = jest.fn().mockResolvedValue(json({ ok: true, guardado: true, lanzado: false })) as unknown as typeof fetch;
  expect(await enviarCola(aj, ok)).toBe(1);
  expect(await leerCola()).toEqual([]);
  expect((await leerEstadosPartes('2026-10-13'))[parte().id]).toEqual({ estado: 'enviado', lanzado: false });
});

test('la cola para en el primer fallo y conserva el orden', async () => {
  await mandarOEncolar(aj, parte('2C'), sinRed());
  await mandarOEncolar(aj, parte('2E', '11:15'), sinRed());
  const f = jest
    .fn()
    .mockResolvedValueOnce(json({ ok: true, guardado: true, lanzado: true }))
    .mockRejectedValue(new Error('x')) as unknown as typeof fetch;
  expect(await enviarCola(aj, f)).toBe(1);
  expect((await leerCola()).map((p) => p.codigo)).toEqual(['2E']);
});

test('script antiguo o clave mal: se avisa y el parte no se pierde', async () => {
  const viejo = jest.fn().mockResolvedValue(json({ ok: true, archivo: 'x.json', datos: {} })) as unknown as typeof fetch;
  expect(await mandarOEncolar(aj, parte(), viejo)).toMatchObject({ ok: false, error: { codigo: 'version_vieja' } });
  const clave = jest.fn().mockResolvedValue(json({ ok: false, error: 'clave' })) as unknown as typeof fetch;
  expect(await mandarOEncolar(aj, parte(), clave)).toMatchObject({ ok: false, error: { codigo: 'clave' } });
  expect(await leerCola()).toHaveLength(1);
});
