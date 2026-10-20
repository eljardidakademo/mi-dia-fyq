import type { Avance, Corregir, FechaClave, Franja, MiDia, Preparar, Ritmo, SesionSemana } from './tipos';

/**
 * Convierte lo que llega de la tarea en un MiDia utilizable. Es tolerante con las
 * variaciones ya vistas (fechas en texto, examen y entrega en una sola entrada) y
 * anota cada arreglo en `problemas` para poder enseñarlo en pantalla.
 */
export type Normalizado = { dia: MiDia | null; problemas: string[] };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const esObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const txt = (x: unknown): string => (typeof x === 'string' ? x : x == null ? '' : String(x));
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const listaTxt = (x: unknown): string[] => lista(x).map(txt).filter((s) => s.trim() !== '');

/** "07/10", "mié 07/10", "Hechos el mié 07/10" → "2026-10-07", tomando el año que deja la fecha en o antes de `ref`. */
export function fechaDesdeTexto(s: string, ref: string): string | null {
  if (ISO.test(s)) return s;
  const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(s);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  if (m[3]) {
    const a = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${a}-${mm}-${dd}`;
  }
  const año = Number(ref.slice(0, 4));
  const candidata = `${año}-${mm}-${dd}`;
  return candidata <= ref ? candidata : `${año - 1}-${mm}-${dd}`;
}

function franja(x: unknown): Franja | null {
  if (!esObj(x)) return null;
  const base = { inicio: txt(x.inicio), fin: txt(x.fin), toca: txt(x.toca) };
  if (!base.inicio) return null;
  const esClase = x.tipo === 'clase' || (x.tipo !== 'otra' && !!x.codigo);
  if (!esClase) return { ...base, tipo: 'otra' };
  return {
    ...base,
    tipo: 'clase',
    grupo: txt(x.grupo),
    codigo: txt(x.codigo),
    aula: txt(x.aula),
    sesion: txt(x.sesion),
    unidad: txt(x.unidad),
    ritmo: txt(x.ritmo),
    deberes: listaTxt(x.deberes),
    material: listaTxt(x.material),
    nota: txt(x.nota),
  };
}

const ESTADOS: FechaClave['estado'][] = ['fijado', 'provisional', 'por confirmar'];

export function normalizar(entrada: unknown): Normalizado {
  const problemas: string[] = [];
  if (!esObj(entrada)) return { dia: null, problemas: ['El resumen no es un objeto JSON.'] };
  const fecha = txt(entrada.fecha);
  if (!ISO.test(fecha)) return { dia: null, problemas: ['El resumen no trae una fecha válida.'] };
  if (entrada.version !== 1) problemas.push(`Versión de esquema inesperada (${txt(entrada.version) || 'sin versión'}).`);

  const franjas = lista(entrada.franjas).map(franja).filter((f): f is Franja => f !== null);
  franjas.sort((a, b) => a.inicio.localeCompare(b.inicio));

  const corregir: Corregir[] = lista(entrada.corregir).filter(esObj).map((c) => {
    const original = txt(c.desde);
    let desde = original;
    if (original && !ISO.test(original)) {
      desde = fechaDesdeTexto(original, fecha) ?? original;
      problemas.push(`«desde» venía como texto («${original}»).`);
    }
    return { grupo: txt(c.grupo), codigo: txt(c.codigo), que: txt(c.que), desde };
  });

  const preparar: Preparar[] = lista(entrada.preparar)
    .filter(esObj)
    .map((p) => ({ fecha: txt(p.fecha), fechaTexto: txt(p.fechaTexto), grupo: txt(p.grupo), codigo: txt(p.codigo), que: txt(p.que) }));

  const fechas: FechaClave[] = [];
  for (const f of lista(entrada.fechas).filter(esObj)) {
    const tipo = txt(f.tipo).toLowerCase();
    const estadoTxt = txt(f.estado).toLowerCase();
    const estado = ESTADOS.find((e) => e === estadoTxt) ?? 'por confirmar';
    const base = { fecha: txt(f.fecha), grupo: txt(f.grupo), codigo: txt(f.codigo), que: txt(f.que), estado };
    const examen = tipo.includes('examen');
    const entrega = tipo.includes('entrega');
    if (examen && entrega) {
      problemas.push('Un examen y una entrega venían en la misma entrada; se han separado.');
      fechas.push({ ...base, tipo: 'examen' }, { ...base, tipo: 'entrega' });
    } else {
      fechas.push({ ...base, tipo: entrega ? 'entrega' : 'examen' });
    }
  }
  fechas.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const ritmo: Ritmo[] = lista(entrada.ritmo).filter(esObj).map((r) => {
    const n = typeof r.desfase === 'number' ? r.desfase : parseFloat(txt(r.desfase).replace(',', '.'));
    return { grupo: txt(r.grupo), codigo: txt(r.codigo), desfase: Number.isFinite(n) ? n : 0, texto: txt(r.texto) };
  });

  const semana: SesionSemana[] = lista(entrada.semana)
    .filter(esObj)
    .map((x) => ({ fecha: txt(x.fecha), codigo: txt(x.codigo), sesion: txt(x.sesion), previsto: txt(x.previsto) }))
    .filter((x) => ISO.test(x.fecha) && !!x.codigo);

  const numero = (x: unknown) => {
    const n = typeof x === 'number' ? x : parseFloat(txt(x).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const avance: Avance[] = lista(entrada.avance)
    .filter(esObj)
    .map((x) => ({ grupo: txt(x.grupo), codigo: txt(x.codigo), unidad: txt(x.unidad), hechas: numero(x.hechas), total: numero(x.total) }))
    .filter((x) => !!x.codigo && x.total > 0)
    .map((x) => ({ ...x, hechas: Math.min(Math.max(x.hechas, 0), x.total) }));

  const dia: MiDia = {
    version: 1,
    fecha,
    fechaTexto: txt(entrada.fechaTexto),
    generadoEn: txt(entrada.generadoEn),
    registroEstadoA: txt(entrada.registroEstadoA),
    registroDesactualizado: entrada.registroDesactualizado === true,
    lectivo: entrada.lectivo !== false,
    motivoNoLectivo: entrada.motivoNoLectivo ? txt(entrada.motivoNoLectivo) : undefined,
    proximoLectivo: entrada.proximoLectivo ? txt(entrada.proximoLectivo) : undefined,
    resumen: txt(entrada.resumen),
    franjas,
    corregir,
    preparar,
    fechas,
    ritmo,
    avisos: listaTxt(entrada.avisos),
    semana,
    avance,
  };
  return { dia, problemas };
}

/** Marca que la tarea pone en clases y materiales ya hechos. */
export const MARCA_HECHO = /\(ya hecho\)/i;

export function quitarMarcaHecho(s: string): string {
  return s.replace(MARCA_HECHO, '').replace(/\s{2,}/g, ' ').trim();
}
