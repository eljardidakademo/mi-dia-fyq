// Configuración de un docente: lo que la app necesita para funcionar sin conexión.
// Cada docente tendrá su propio archivo; nada de esto va escrito en el código.

export type Grupo = {
  codigo: string;
  nombre: string;
  aula: string;
  sesionesCurso?: number;
};

/** Hora del horario semanal. Si lleva `grupo` es una clase; si no, una hora sin grupo (guardia, reunión...). */
export type HoraHorario = {
  inicio: string;
  fin: string;
  grupo?: string;
  que?: string;
};

/** Periodo sin clase. Sin `grupos` afecta a todo el día; con `grupos`, solo a esos grupos. */
export type SinClase = {
  desde: string;
  hasta?: string;
  motivo: string;
  grupos?: string[];
};

export type Evento = {
  desde: string;
  hasta?: string;
  texto: string;
};

export type Docente = {
  nombre: string;
  centro: string;
  curso: string;
  finCurso: string;
  grupos: Grupo[];
  /** Claves 1 (lunes) a 5 (viernes). */
  horario: Record<'1' | '2' | '3' | '4' | '5', HoraHorario[]>;
  sinClase: SinClase[];
  eventos: Evento[];
};
