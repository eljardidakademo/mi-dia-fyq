import AsyncStorage from '@react-native-async-storage/async-storage';

import { textos, type Idioma, type TemaId } from '../i18n/textos';
import { normalizar, type Normalizado } from './normalizar';

/** Dónde está el script de Google que sirve el resumen más reciente. */
export type Ajustes = { url: string; clave: string };

/** Lo último que se descargó bien, tal cual llegó. Se guarda para funcionar sin conexión. */
export type Guardado = { datos: unknown; archivo: string; descargadoEn: string };

const K_AJUSTES = 'ajustes.v1';
const K_ULTIMO = 'ultimo.v1';
const TIEMPO_MAX_MS = 15_000;

async function leerJson<T>(clave: string): Promise<T | null> {
  try {
    const t = await AsyncStorage.getItem(clave);
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
}

export const leerAjustes = () => leerJson<Ajustes>(K_AJUSTES);
export const guardarAjustes = (a: Ajustes) => AsyncStorage.setItem(K_AJUSTES, JSON.stringify(a));
export const leerGuardado = () => leerJson<Guardado>(K_ULTIMO);

/** Lo que cada docente elige en Ajustes > Apariencia y Avisos. */
export type Preferencias = {
  tema: TemaId;
  idioma: Idioma;
  aviso: { activo: boolean; hora: string };
  /** Recordatorio del parte al acabar las clases del día. */
  parte: { recordar: boolean };
};

export const PREFERENCIAS_INICIALES: Preferencias = {
  tema: 'laboratorio',
  idioma: 'es',
  aviso: { activo: false, hora: '07:30' },
  parte: { recordar: true },
};
const K_PREFERENCIAS = 'preferencias.v1';

export async function leerPreferencias(): Promise<Preferencias> {
  const p = await leerJson<Partial<Preferencias>>(K_PREFERENCIAS);
  return {
    ...PREFERENCIAS_INICIALES,
    ...p,
    aviso: { ...PREFERENCIAS_INICIALES.aviso, ...p?.aviso },
    parte: { ...PREFERENCIAS_INICIALES.parte, ...p?.parte },
  };
}
export const guardarPreferencias = (p: Preferencias) => AsyncStorage.setItem(K_PREFERENCIAS, JSON.stringify(p));

/** Qué falló al hablar con el script. Se traduce al pintarlo, así sigue el idioma elegido. */
export type ErrorDescarga =
  | { codigo: 'sin_url' | 'sin_red' | 'clave' | 'sin_archivos' | 'json_invalido' | 'sin_token' | 'version_vieja' | 'tarda' }
  | { codigo: 'http'; status: number }
  /** `detalle`: lo que dice la página que devolvió Google en lugar del JSON, si se lee algo. */
  | { codigo: 'no_json'; detalle?: string }
  | { codigo: 'ilegible' | 'script' | 'rutina'; detalle: string };

export function textoError(e: ErrorDescarga, idioma: Idioma = 'es'): string {
  const t = textos(idioma).errores;
  switch (e.codigo) {
    case 'http':
      return t.http(e.status);
    case 'no_json':
      return t.no_json(e.detalle);
    case 'ilegible':
    case 'script':
    case 'rutina':
      return t[e.codigo](e.detalle);
    default:
      return t[e.codigo];
  }
}

export type ResultadoDescarga =
  | { ok: true; guardado: Guardado; normalizado: Normalizado }
  | { ok: false; error: ErrorDescarga };

type RespuestaScript = {
  ok?: boolean;
  error?: string;
  detalle?: string;
  archivo?: string;
  datos?: unknown;
  /** Solo al pedir un resumen nuevo: cuándo se lanzó la tarea (ISO). */
  pedidoEn?: string;
};

const ERRORES_SCRIPT = ['clave', 'sin_archivos', 'json_invalido', 'sin_token'] as const;

/** Llama al script y devuelve su JSON ya leído, o el error. */
async function llamarScript(
  a: Ajustes,
  extra: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<{ ok: true; resp: RespuestaScript } | { ok: false; error: ErrorDescarga }> {
  if (!a.url) return { ok: false, error: { codigo: 'sin_url' } };
  const params = Object.entries({ clave: a.clave, ...extra })
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const sep = a.url.includes('?') ? '&' : '?';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO_MAX_MS);
  let cuerpo: string;
  try {
    const r = await fetchFn(`${a.url}${sep}${params}`, { signal: ctrl.signal });
    cuerpo = await r.text();
    if (!r.ok) return { ok: false, error: { codigo: 'http', status: r.status } };
  } catch {
    return { ok: false, error: { codigo: 'sin_red' } };
  } finally {
    clearTimeout(t);
  }

  let resp: RespuestaScript;
  try {
    resp = JSON.parse(cuerpo);
  } catch {
    return { ok: false, error: { codigo: 'no_json', detalle: textoDePagina(cuerpo) } };
  }
  if (!resp.ok) {
    const conocido = ERRORES_SCRIPT.find((c) => c === resp.error);
    if (conocido) return { ok: false, error: { codigo: conocido } };
    if (resp.error === 'rutina') return { ok: false, error: { codigo: 'rutina', detalle: resp.detalle ?? '' } };
    return { ok: false, error: { codigo: 'script', detalle: resp.detalle ?? resp.error ?? '?' } };
  }
  return { ok: true, resp };
}

/** El texto visible de una página HTML de error de Google, recortado. */
export function textoDePagina(html: string): string | undefined {
  const texto = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return texto ? texto.slice(0, 200) : undefined;
}

/** Pide el resumen al script. No toca la caché: eso lo hace `actualizar`. */
export async function descargar(a: Ajustes, fetchFn: typeof fetch = fetch): Promise<ResultadoDescarga> {
  const r = await llamarScript(a, {}, fetchFn);
  if (!r.ok) return r;
  const normalizado = normalizar(r.resp.datos);
  if (!normalizado.dia) return { ok: false, error: { codigo: 'ilegible', detalle: normalizado.problemas.join(' ') } };
  return {
    ok: true,
    normalizado,
    guardado: { datos: r.resp.datos, archivo: r.resp.archivo ?? '', descargadoEn: new Date().toISOString() },
  };
}

/**
 * Pide al script que lance ya la tarea de Claude que lee el registro y deja un
 * resumen nuevo en Drive. Vuelve en cuanto la tarea arranca; el resumen tarda
 * un par de minutos en aparecer (ver `esperarResumenNuevo`).
 */
export async function pedirResumenNuevo(
  a: Ajustes,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: true; pedidoEn: string } | { ok: false; error: ErrorDescarga }> {
  const r = await llamarScript(a, { accion: 'regenerar' }, fetchFn);
  if (!r.ok) return r;
  // Un script antiguo ignora «accion» y devuelve el resumen de siempre.
  if (!r.resp.pedidoEn) return { ok: false, error: { codigo: 'version_vieja' } };
  return { ok: true, pedidoEn: r.resp.pedidoEn };
}

const espera = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Descarga cada `cadaMs` hasta que llega un archivo distinto de `archivoPrevio`
 * o se acaba el tiempo. Cada descarga buena se guarda, aunque aún no sea la nueva.
 */
export async function esperarResumenNuevo(
  a: Ajustes,
  archivoPrevio: string,
  { cadaMs = 20_000, maxMs = 6 * 60_000, fetchFn = fetch as typeof fetch } = {},
): Promise<ResultadoDescarga> {
  const fin = Date.now() + maxMs;
  while (Date.now() < fin) {
    await espera(cadaMs);
    const r = await descargar(a, fetchFn);
    if (r.ok && r.guardado.archivo !== archivoPrevio) {
      await AsyncStorage.setItem(K_ULTIMO, JSON.stringify(r.guardado));
      return r;
    }
  }
  return { ok: false, error: { codigo: 'tarda' } };
}

/**
 * ¿Dos resúmenes dicen lo mismo? Sin contar la hora en que se generaron: así la app
 * puede avisar de que la tarea ha corrido pero el registro no tenía nada nuevo.
 */
export function mismoContenido(a: unknown, b: unknown): boolean {
  const sinHora = (x: unknown) => {
    if (!x || typeof x !== 'object') return JSON.stringify(x);
    const { generadoEn: _g, ...resto } = x as Record<string, unknown>;
    return JSON.stringify(resto);
  };
  return sinHora(a) === sinHora(b);
}

/** Descarga y, si sale bien, sustituye la copia guardada. */
export async function actualizar(a: Ajustes): Promise<ResultadoDescarga> {
  const r = await descargar(a);
  if (r.ok) await AsyncStorage.setItem(K_ULTIMO, JSON.stringify(r.guardado));
  return r;
}

// Casillas de deberes y material marcadas en el móvil, por día.
const kHechos = (fecha: string) => `hechos.${fecha}`;
export const leerHechos = async (fecha: string) => new Set((await leerJson<string[]>(kHechos(fecha))) ?? []);
export const guardarHechos = (fecha: string, s: Set<string>) => AsyncStorage.setItem(kHechos(fecha), JSON.stringify([...s]));
