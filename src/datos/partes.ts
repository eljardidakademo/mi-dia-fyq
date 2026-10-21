import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Ajustes, ErrorDescarga } from './fuente';

/**
 * Parte de clase dictado en el móvil: qué se hizo en una sesión. Se manda al
 * script de Google, que lo apunta en el documento «Partes FyQ 26-27» y lanza la
 * tarea para que el resumen lo tenga en cuenta.
 */
export type Parte = {
  id: string;
  fecha: string;
  inicio: string;
  codigo: string;
  grupo: string;
  sesion: string;
  texto: string;
  creadoEn: string;
};

/** Cómo quedó un parte: enviado (y si se lanzó la tarea) o esperando conexión. */
export type EstadoParte = { estado: 'enviado'; lanzado: boolean } | { estado: 'pendiente' };

export type ResultadoParte =
  | { ok: true; lanzado: boolean; motivo?: string }
  | { ok: false; error: ErrorDescarga; reintentar: boolean };

const K_COLA = 'partes.cola.v1';
const kEstados = (fecha: string) => `partes.estado.${fecha}`;
const TIEMPO_MAX_MS = 30_000;

export const idParte = (fecha: string, inicio: string, codigo: string) => `${fecha}|${inicio}|${codigo}`;

/**
 * El parte es uno por día y habla de todas las clases. Estos valores van tal cual
 * al documento de partes, que lee la tarea; por eso están en castellano.
 */
export const PARTE_DIA = { inicio: 'día completo', codigo: 'DIA', grupo: 'Todas las clases' } as const;
export const idParteDia = (fecha: string) => idParte(fecha, PARTE_DIA.inicio, PARTE_DIA.codigo);

async function leer<T>(k: string, porDefecto: T): Promise<T> {
  try {
    const t = await AsyncStorage.getItem(k);
    return t ? (JSON.parse(t) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

export const leerCola = () => leer<Parte[]>(K_COLA, []);
export const leerEstadosPartes = (fecha: string) => leer<Record<string, EstadoParte>>(kEstados(fecha), {});

async function marcar(p: Parte, e: EstadoParte) {
  const estados = await leerEstadosPartes(p.fecha);
  estados[p.id] = e;
  await AsyncStorage.setItem(kEstados(p.fecha), JSON.stringify(estados));
}

/** Manda un parte al script (POST, para que quepa un texto largo). */
export async function enviarParte(a: Ajustes, p: Parte, fetchFn: typeof fetch = fetch): Promise<ResultadoParte> {
  if (!a.url) return { ok: false, error: { codigo: 'sin_url' }, reintentar: false };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO_MAX_MS);
  let cuerpo: string;
  try {
    // text/plain evita la consulta previa CORS en web; Apps Script lee el cuerpo igual.
    const r = await fetchFn(a.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave: a.clave, accion: 'parte', parte: p }),
      signal: ctrl.signal,
    });
    cuerpo = await r.text();
    if (!r.ok) return { ok: false, error: { codigo: 'http', status: r.status }, reintentar: true };
  } catch {
    return { ok: false, error: { codigo: 'sin_red' }, reintentar: true };
  } finally {
    clearTimeout(t);
  }
  let resp: { ok?: boolean; error?: string; detalle?: string; guardado?: boolean; lanzado?: boolean; motivo?: string };
  try {
    resp = JSON.parse(cuerpo);
  } catch {
    return { ok: false, error: { codigo: 'no_json' }, reintentar: false };
  }
  if (resp.ok && resp.guardado) return { ok: true, lanzado: !!resp.lanzado, motivo: resp.motivo };
  if (resp.error === 'clave') return { ok: false, error: { codigo: 'clave' }, reintentar: false };
  // Un script antiguo no tiene doPost o no sabe qué es un parte.
  if (resp.ok || !resp.error || resp.error === 'accion') return { ok: false, error: { codigo: 'version_vieja' }, reintentar: false };
  return { ok: false, error: { codigo: 'script', detalle: resp.detalle ?? resp.error }, reintentar: false };
}

/**
 * Envía el parte; si falla lo deja en la cola para el próximo intento, así el
 * texto dictado no se pierde nunca. El error se devuelve para enseñarlo.
 */
export async function mandarOEncolar(a: Ajustes, p: Parte, fetchFn: typeof fetch = fetch): Promise<ResultadoParte> {
  const r = await enviarParte(a, p, fetchFn);
  if (r.ok) {
    await marcar(p, { estado: 'enviado', lanzado: r.lanzado });
  } else {
    const cola = (await leerCola()).filter((x) => x.id !== p.id);
    await AsyncStorage.setItem(K_COLA, JSON.stringify([...cola, p]));
    await marcar(p, { estado: 'pendiente' });
  }
  return r;
}

/**
 * Reintenta los partes en cola, en orden. Para en el primer fallo y deja el resto
 * en la cola (si es la clave o un script antiguo, salen cuando se arregle). Devuelve cuántos salieron.
 */
export async function enviarCola(a: Ajustes, fetchFn: typeof fetch = fetch): Promise<number> {
  const cola = await leerCola();
  let enviados = 0;
  for (const p of cola) {
    const r = await enviarParte(a, p, fetchFn);
    if (!r.ok) break;
    enviados++;
    await marcar(p, { estado: 'enviado', lanzado: r.lanzado });
  }
  if (enviados) await AsyncStorage.setItem(K_COLA, JSON.stringify(cola.slice(enviados)));
  return enviados;
}
