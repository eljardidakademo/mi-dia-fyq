import type { Docente } from '../config/tipos';
import { diasEntre, estadoDia, eventosDelDia, fechaCorta, fechaLarga, franjasDelHorario, isoLocal, proximoLectivo } from './calendario';
import { textos, type Idioma } from '../i18n/textos';
import { textoError, type ErrorDescarga } from './fuente';
import { MARCA_HECHO } from './normalizar';
import type { Corregir, FechaClave, Franja, MiDia, Preparar, Ritmo } from './tipos';

export type EstadoFranja = 'hecha' | 'pasada' | 'ahora' | 'siguiente' | 'futura';
export type FranjaVista = Franja & { estado: EstadoFranja };
export type Alerta = { nivel: 'error' | 'aviso' | 'info'; texto: string };

export type Vista = {
  hoy: string;
  fechaTexto: string;
  resumen: string;
  /** "hoy": hay resumen de hoy. "anterior": solo uno de otro día. "ninguno": solo el horario. */
  origen: 'hoy' | 'anterior' | 'ninguno';
  lectivo: boolean;
  motivoNoLectivo?: string;
  proximoLectivo?: string;
  franjas: FranjaVista[];
  corregir: Corregir[];
  preparar: Preparar[];
  fechas: (FechaClave & { enDias: number })[];
  ritmo: Ritmo[];
  avisos: string[];
  alertas: Alerta[];
  generadoEn?: string;
  registroEstadoA?: string;
};

export type Entrada = {
  docente: Docente;
  ahora: Date;
  dia: MiDia | null;
  problemas?: string[];
  errorDescarga?: ErrorDescarga | null;
  idioma?: Idioma;
};

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function estadosFranjas(franjas: Franja[], ahora: Date, esHoy: boolean): FranjaVista[] {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  let siguienteMarcada = false;
  return franjas.map((f) => {
    let estado: EstadoFranja = 'futura';
    if (f.tipo === 'clase' && MARCA_HECHO.test(f.toca)) estado = 'hecha';
    else if (!esHoy) estado = 'futura';
    else if (minutos(f.fin) <= min) estado = 'pasada';
    else if (minutos(f.inicio) <= min) estado = 'ahora';
    // «Siguiente» es la próxima clase, no la próxima guardia o reunión.
    if (esHoy && f.tipo === 'clase' && estado === 'futura' && !siguienteMarcada) {
      estado = 'siguiente';
      siguienteMarcada = true;
    }
    return { ...f, estado };
  });
}

export function construirVista({ docente, ahora, dia, problemas = [], errorDescarga, idioma = 'es' }: Entrada): Vista {
  const t = textos(idioma);
  const hoy = isoLocal(ahora);
  const origen: Vista['origen'] = !dia ? 'ninguno' : dia.fecha === hoy ? 'hoy' : 'anterior';
  const cal = estadoDia(docente, hoy, idioma);
  const prox = proximoLectivo(docente, hoy);

  const lectivo = origen === 'hoy' ? dia!.lectivo : cal.lectivo;
  // Sin resumen de hoy: el horario, con el ritmo de cada grupo del último resumen si lo hay.
  const franjasBase =
    origen === 'hoy'
      ? dia!.franjas
      : franjasDelHorario(docente, hoy, idioma).map((f) =>
          f.tipo === 'clase' ? { ...f, ritmo: dia?.ritmo.find((r) => r.codigo === f.codigo)?.texto ?? '' } : f,
        );

  const alertas: Alerta[] = [];
  if (errorDescarga) alertas.push({ nivel: 'error', texto: textoError(errorDescarga, idioma) });
  if (origen === 'ninguno') {
    alertas.push({ nivel: 'aviso', texto: t.sinResumenNunca });
  } else if (origen === 'anterior') {
    alertas.push({ nivel: 'aviso', texto: t.sinResumenHoy(cal.lectivo, fechaCorta(dia!.fecha, idioma)) });
  }
  if (dia?.registroDesactualizado) {
    alertas.push({ nivel: 'aviso', texto: t.registroViejo(dia.registroEstadoA ?? '') });
  }
  if (problemas.length) {
    alertas.push({ nivel: 'info', texto: t.formatoRaro(problemas.join(' ')) });
  }

  const fechas = (dia?.fechas ?? [])
    .filter((f) => f.fecha >= hoy)
    .map((f) => ({ ...f, enDias: diasEntre(hoy, f.fecha) }));

  return {
    hoy,
    fechaTexto: fechaLarga(hoy, idioma),
    resumen: origen === 'hoy' ? dia!.resumen : '',
    origen,
    lectivo,
    motivoNoLectivo: origen === 'hoy' ? dia!.motivoNoLectivo : cal.motivo,
    proximoLectivo: origen === 'hoy' && dia!.proximoLectivo ? dia!.proximoLectivo : prox ? fechaCorta(prox, idioma) : undefined,
    franjas: estadosFranjas(franjasBase, ahora, true),
    corregir: dia?.corregir ?? [],
    preparar: (dia?.preparar ?? []).filter((p) => p.fecha > hoy),
    fechas,
    ritmo: dia?.ritmo ?? [],
    avisos: [...eventosDelDia(docente, hoy), ...(dia?.avisos ?? [])],
    alertas,
    generadoEn: dia?.generadoEn,
    registroEstadoA: dia?.registroEstadoA,
  };
}
