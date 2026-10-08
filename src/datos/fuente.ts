import AsyncStorage from '@react-native-async-storage/async-storage';

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

export type ResultadoDescarga =
  | { ok: true; guardado: Guardado; normalizado: Normalizado }
  | { ok: false; error: string };

const MENSAJES: Record<string, string> = {
  clave: 'La clave no coincide con la del script de Google. Revísala en Ajustes.',
  sin_archivos: 'El script no encuentra ningún mi_dia_fyq_*.json en la carpeta. ¿Ha guardado ya la tarea alguno?',
  json_invalido: 'El último archivo que dejó la tarea no es un JSON válido.',
};

/** Pide el resumen al script. No toca la caché: eso lo hace `actualizar`. */
export async function descargar(a: Ajustes, fetchFn: typeof fetch = fetch): Promise<ResultadoDescarga> {
  if (!a.url) return { ok: false, error: 'Falta la dirección del script. Ponla en Ajustes.' };
  const sep = a.url.includes('?') ? '&' : '?';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIEMPO_MAX_MS);
  let cuerpo: string;
  try {
    const r = await fetchFn(`${a.url}${sep}clave=${encodeURIComponent(a.clave)}`, { signal: ctrl.signal });
    cuerpo = await r.text();
    if (!r.ok) return { ok: false, error: `El script respondió con un error (HTTP ${r.status}).` };
  } catch {
    return { ok: false, error: 'Sin conexión o el script no responde. Muestro lo último descargado.' };
  } finally {
    clearTimeout(t);
  }

  let resp: { ok?: boolean; error?: string; detalle?: string; archivo?: string; datos?: unknown };
  try {
    resp = JSON.parse(cuerpo);
  } catch {
    return {
      ok: false,
      error: 'El script no devolvió JSON. Comprueba que está implementado como aplicación web con acceso «Cualquier usuario».',
    };
  }
  if (!resp.ok) return { ok: false, error: MENSAJES[resp.error ?? ''] ?? `Error del script: ${resp.detalle ?? resp.error ?? 'desconocido'}` };

  const normalizado = normalizar(resp.datos);
  if (!normalizado.dia) return { ok: false, error: `El resumen descargado no se puede leer: ${normalizado.problemas.join(' ')}` };
  return {
    ok: true,
    normalizado,
    guardado: { datos: resp.datos, archivo: resp.archivo ?? '', descargadoEn: new Date().toISOString() },
  };
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
