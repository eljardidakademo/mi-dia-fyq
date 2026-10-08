// Contrato del resumen diario (esquema v1). Fuente: docs/mi_dia.schema.json.

export type FranjaClase = {
  inicio: string;
  fin: string;
  tipo: 'clase';
  grupo: string;
  codigo: string;
  aula: string;
  sesion: string;
  unidad: string;
  ritmo: string;
  toca: string;
  deberes: string[];
  material: string[];
  nota: string;
};

export type FranjaOtra = {
  inicio: string;
  fin: string;
  tipo: 'otra';
  toca: string;
};

export type Franja = FranjaClase | FranjaOtra;

export type Corregir = { grupo: string; codigo: string; que: string; desde: string };
export type Preparar = { fecha: string; fechaTexto: string; grupo: string; codigo: string; que: string };
export type FechaClave = {
  fecha: string;
  grupo: string;
  codigo: string;
  tipo: 'examen' | 'entrega';
  que: string;
  estado: 'fijado' | 'provisional' | 'por confirmar';
};
export type Ritmo = { grupo: string; codigo: string; desfase: number; texto: string };

export type MiDia = {
  version: 1;
  fecha: string;
  fechaTexto: string;
  generadoEn: string;
  registroEstadoA: string;
  registroDesactualizado: boolean;
  lectivo: boolean;
  motivoNoLectivo?: string;
  proximoLectivo?: string;
  resumen: string;
  franjas: Franja[];
  corregir: Corregir[];
  preparar: Preparar[];
  fechas: FechaClave[];
  ritmo: Ritmo[];
  avisos: string[];
};
