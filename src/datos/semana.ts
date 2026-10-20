import type { Docente } from '../config/tipos';
import type { Idioma } from '../i18n/textos';
import { desdeIso, diasEntre, estadoDia, eventosDelDia, fechaCorta, franjasDelHorario, isoLocal, sumarDias } from './calendario';
import { MARCA_HECHO, quitarMarcaHecho } from './normalizar';
import type { Avance, FechaClave, MiDia, Preparar, Ritmo } from './tipos';

export type ClaseSemana = {
  inicio: string;
  fin: string;
  codigo: string;
  grupo: string;
  aula: string;
  sesion: string;
  /** Lo previsto según el registro; vacío si el resumen no lo trae. */
  previsto: string;
  hecha: boolean;
  /** El grupo pierde la clase ese día (viaje, excursión…). */
  sinClase?: string;
};

export type DiaSemana = {
  fecha: string;
  titulo: string;
  cuando: 'pasado' | 'hoy' | 'futuro';
  lectivo: boolean;
  motivo?: string;
  clases: ClaseSemana[];
  fechas: FechaClave[];
  preparar: Preparar[];
  eventos: string[];
};

export type AvanceVista = Avance & { ritmo?: Ritmo };

export type Semana = { lunes: string; dias: DiaSemana[]; avance: AvanceVista[] };

/** Lunes de la semana que se enseña: la actual, o la siguiente si es fin de semana. */
export function lunesDe(hoy: string): string {
  const dow = desdeIso(hoy).getDay(); // 0 domingo … 6 sábado
  if (dow === 6) return sumarDias(hoy, 2);
  if (dow === 0) return sumarDias(hoy, 1);
  return sumarDias(hoy, 1 - dow);
}

/**
 * La semana de lunes a viernes: clases del horario, lo previsto si el resumen lo
 * trae, exámenes y entregas, material y eventos de cada día, y el avance por unidad.
 */
export function construirSemana(docente: Docente, dia: MiDia | null, ahora: Date, idioma: Idioma = 'es'): Semana {
  const hoy = isoLocal(ahora);
  const lunes = lunesDe(hoy);

  const dias: DiaSemana[] = [0, 1, 2, 3, 4].map((n) => {
    const fecha = sumarDias(lunes, n);
    const est = estadoDia(docente, fecha, idioma);
    const delResumen = dia?.fecha === fecha ? dia.franjas : null;
    const clases: ClaseSemana[] = franjasDelHorario(docente, fecha, idioma).flatMap((f) => {
      if (f.tipo !== 'clase') return [];
      const pierde = est.gruposSinClase.find((g) => g.codigo === f.codigo);
      const deHoy = delResumen?.find((x) => x.tipo === 'clase' && x.codigo === f.codigo && x.inicio === f.inicio);
      const prevista = dia?.semana.find((s) => s.fecha === fecha && s.codigo === f.codigo);
      const toca = deHoy?.tipo === 'clase' ? deHoy.toca : (prevista?.previsto ?? '');
      return [
        {
          inicio: f.inicio,
          fin: f.fin,
          codigo: f.codigo,
          grupo: f.grupo,
          aula: f.aula,
          sesion: (deHoy?.tipo === 'clase' ? deHoy.sesion : prevista?.sesion) ?? '',
          previsto: quitarMarcaHecho(toca),
          hecha: MARCA_HECHO.test(toca),
          ...(pierde ? { sinClase: pierde.motivo } : {}),
        },
      ];
    });
    const d = diasEntre(hoy, fecha);
    return {
      fecha,
      titulo: fechaCorta(fecha, idioma),
      cuando: d < 0 ? 'pasado' : d === 0 ? 'hoy' : 'futuro',
      lectivo: est.lectivo,
      motivo: est.lectivo ? undefined : est.motivo,
      clases,
      fechas: (dia?.fechas ?? []).filter((f) => f.fecha === fecha),
      preparar: (dia?.preparar ?? []).filter((p) => p.fecha === fecha),
      eventos: eventosDelDia(docente, fecha),
    };
  });

  // El avance sigue el orden de los grupos del docente.
  const orden = docente.grupos.map((g) => g.codigo);
  const avance = [...(dia?.avance ?? [])]
    .sort((a, b) => orden.indexOf(a.codigo) - orden.indexOf(b.codigo))
    .map((a) => ({ ...a, ritmo: dia?.ritmo.find((r) => r.codigo === a.codigo) }));

  return { lunes, dias, avance };
}
