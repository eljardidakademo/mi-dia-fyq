import type { Docente } from '../config/tipos';
import { textos, type Idioma } from '../i18n/textos';
import type { Franja } from './tipos';

const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** AAAA-MM-DD en la hora local del móvil. */
export function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Fecha a mediodía local, para no tropezar con los cambios de hora. */
export function desdeIso(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function sumarDias(iso: string, n: number): string {
  const d = desdeIso(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((desdeIso(hasta).getTime() - desdeIso(desde).getTime()) / 86_400_000);
}

/** "Jueves 8 de octubre" */
export function fechaLarga(iso: string, idioma: Idioma = 'es'): string {
  const d = desdeIso(iso);
  const t = textos(idioma);
  return t.fechaLarga(mayus(t.dias[d.getDay()]), d.getDate(), t.meses[d.getMonth()]);
}

/** "Martes 13/10" */
export function fechaCorta(iso: string, idioma: Idioma = 'es'): string {
  const d = desdeIso(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${mayus(textos(idioma).dias[d.getDay()])} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

export function mesCorto(iso: string, idioma: Idioma = 'es'): string {
  return textos(idioma).meses[desdeIso(iso).getMonth()].slice(0, 3);
}

const enRango = (iso: string, desde: string, hasta?: string) => iso >= desde && iso <= (hasta ?? desde);

export type EstadoDia = {
  lectivo: boolean;
  motivo?: string;
  /** Grupos que pierden la clase aunque el día sea lectivo (p. ej. un viaje). */
  gruposSinClase: { codigo: string; motivo: string }[];
};

export function estadoDia(doc: Docente, iso: string, idioma: Idioma = 'es'): EstadoDia {
  const dia = desdeIso(iso).getDay();
  const t = textos(idioma);
  if (dia === 0 || dia === 6) return { lectivo: false, motivo: t.finDeSemana, gruposSinClase: [] };
  if (iso > doc.finCurso) return { lectivo: false, motivo: t.cursoTerminado, gruposSinClase: [] };

  const gruposSinClase: EstadoDia['gruposSinClase'] = [];
  for (const s of doc.sinClase) {
    if (!enRango(iso, s.desde, s.hasta)) continue;
    if (!s.grupos) return { lectivo: false, motivo: s.motivo, gruposSinClase: [] };
    for (const codigo of s.grupos) gruposSinClase.push({ codigo, motivo: s.motivo });
  }
  return { lectivo: true, gruposSinClase };
}

/** Primer día lectivo estrictamente posterior a `iso`, o null si se acaba el curso. */
export function proximoLectivo(doc: Docente, iso: string): string | null {
  let d = iso;
  for (let i = 0; i < 400; i++) {
    d = sumarDias(d, 1);
    if (d > doc.finCurso) return null;
    if (estadoDia(doc, d).lectivo) return d;
  }
  return null;
}

export function eventosDelDia(doc: Docente, iso: string): string[] {
  return doc.eventos.filter((e) => enRango(iso, e.desde, e.hasta)).map((e) => e.texto);
}

/**
 * Las franjas del día sacadas solo del horario. Es lo que se ve cuando no hay
 * resumen del día descargado: al menos qué clase toca, a qué hora y dónde.
 */
export function franjasDelHorario(doc: Docente, iso: string, idioma: Idioma = 'es'): Franja[] {
  const estado = estadoDia(doc, iso, idioma);
  if (!estado.lectivo) return [];
  const dia = String(desdeIso(iso).getDay()) as keyof Docente['horario'];
  return (doc.horario[dia] ?? []).map((h): Franja => {
    if (!h.grupo) return { inicio: h.inicio, fin: h.fin, tipo: 'otra', toca: h.que ?? '' };
    const g = doc.grupos.find((x) => x.codigo === h.grupo);
    const pierde = estado.gruposSinClase.find((x) => x.codigo === h.grupo);
    return {
      inicio: h.inicio,
      fin: h.fin,
      tipo: 'clase',
      grupo: g?.nombre ?? h.grupo,
      codigo: h.grupo,
      aula: g?.aula ?? '',
      sesion: '',
      unidad: '',
      ritmo: '',
      toca: pierde ? textos(idioma).sinClase(pierde.motivo) : '',
      deberes: [],
      material: [],
      nota: '',
    };
  });
}
