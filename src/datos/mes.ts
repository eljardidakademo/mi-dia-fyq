import type { Docente } from '../config/tipos';
import { textos, type Idioma } from '../i18n/textos';
import { desdeIso, diasEntre, estadoDia, isoLocal, sumarDias } from './calendario';
import { lunesDe } from './semana';
import type { FechaClave, MiDia } from './tipos';

export type DiaMes = {
  fecha: string;
  numero: number;
  /** Falso para los días de relleno del mes anterior o siguiente. */
  delMes: boolean;
  lectivo: boolean;
  esHoy: boolean;
  examenes: number;
  entregas: number;
};

export type Mes = {
  /** Primer día del mes, AAAA-MM-01. */
  inicio: string;
  titulo: string;
  /** Semanas de lunes a viernes; el fin de semana no se pinta. */
  semanas: DiaMes[][];
  /** Exámenes y entregas del mes, por fecha, con los días que faltan desde hoy. */
  fechas: (FechaClave & { enDias: number })[];
};

/** AAAA-MM-01 del mes que queda `desplazamiento` meses después del de `hoy`. */
export function inicioMes(hoy: string, desplazamiento = 0): string {
  const d = desdeIso(hoy);
  d.setDate(1);
  d.setMonth(d.getMonth() + desplazamiento);
  return isoLocal(d);
}

/**
 * Calendario del mes con los exámenes y entregas que trae el resumen. Solo
 * enseña lo que la tarea haya puesto en «fechas» (desde el día 1 del mes en
 * curso hasta final de trimestre).
 */
export function construirMes(docente: Docente, dia: MiDia | null, hoy: string, desplazamiento = 0, idioma: Idioma = 'es'): Mes {
  const inicio = inicioMes(hoy, desplazamiento);
  const mm = inicio.slice(0, 7);
  const fechasMes = (dia?.fechas ?? []).filter((f) => f.fecha.startsWith(mm));

  const semanas: DiaMes[][] = [];
  // Desde el lunes de la semana del día 1 (si cae en fin de semana, la siguiente).
  for (let lunes = lunesDe(inicio); lunes.slice(0, 7) === mm || sumarDias(lunes, 4).slice(0, 7) === mm; lunes = sumarDias(lunes, 7)) {
    semanas.push(
      [0, 1, 2, 3, 4].map((n) => {
        const fecha = sumarDias(lunes, n);
        const delDia = fechasMes.filter((f) => f.fecha === fecha);
        return {
          fecha,
          numero: desdeIso(fecha).getDate(),
          delMes: fecha.startsWith(mm),
          lectivo: estadoDia(docente, fecha, idioma).lectivo,
          esHoy: fecha === hoy,
          examenes: delDia.filter((f) => f.tipo === 'examen').length,
          entregas: delDia.filter((f) => f.tipo === 'entrega').length,
        };
      }),
    );
  }

  return {
    inicio,
    titulo: tituloMes(inicio, idioma),
    semanas,
    fechas: fechasMes.map((f) => ({ ...f, enDias: diasEntre(hoy, f.fecha) })),
  };
}

function tituloMes(inicio: string, idioma: Idioma): string {
  const d = desdeIso(inicio);
  const mes = textos(idioma).meses[d.getMonth()];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${d.getFullYear()}`;
}
