import type { Docente } from '../config/tipos';
import { diasEntre, estadoDia, eventosDelDia, fechaCorta, franjasDelHorario, proximoLectivo } from '../datos/calendario';
import { quitarMarcaHecho } from '../datos/normalizar';
import type { MiDia } from '../datos/tipos';
import { estadosFranjas, type FranjaVista } from '../datos/vista';
import { textos, type Idioma } from '../i18n/textos';

/**
 * Texto del aviso de la mañana para `fecha`, con lo que se sabe al programarlo:
 * el horario del docente y el último resumen descargado (material, correcciones,
 * exámenes). Devuelve null si ese día no hay clase.
 */
export function textoAviso(
  docente: Docente,
  dia: MiDia | null,
  fecha: string,
  idioma: Idioma = 'es',
): { titulo: string; cuerpo: string } | null {
  const estado = estadoDia(docente, fecha);
  if (!estado.lectivo) return null;
  const t = textos(idioma);
  // Si el resumen es de ese mismo día, sus franjas traen ya qué toca y el material.
  const franjas = dia?.fecha === fecha ? dia.franjas : franjasDelHorario(docente, fecha, idioma);
  const clases = franjas.filter((f) => f.tipo === 'clase' && !estado.gruposSinClase.some((g) => g.codigo === f.codigo));
  const fechaTxt = fechaCorta(fecha, idioma);
  const titulo = clases.length ? t.avisoTitulo(fechaTxt, clases.length) : t.avisoSinClases(fechaTxt);

  const lineas: string[] = [];
  const primera = clases[0];
  if (primera?.tipo === 'clase') lineas.push(t.primera(primera.inicio, primera.grupo, primera.aula));

  const material = [
    ...(dia?.preparar ?? []).filter((p) => p.fecha === fecha).map((p) => `${p.que} (${p.codigo})`),
    ...(dia?.fecha === fecha ? clases.flatMap((f) => (f.tipo === 'clase' ? f.material.filter((m) => !/\(ya hecho\)/i.test(m)) : [])) : []),
  ].map(quitarMarcaHecho);
  if (material.length) lineas.push(t.llevar(material.join(' · ')));

  const urgente: string[] = [];
  const pendientes = dia?.corregir.length ?? 0;
  if (pendientes) urgente.push(t.corregirN(pendientes));
  for (const f of dia?.fechas ?? []) {
    const n = diasEntre(fecha, f.fecha);
    if (n >= 0 && n <= 3) urgente.push(`${f.tipo === 'examen' ? t.examen : t.entrega} ${f.codigo} ${t.enDias(n)}`);
  }
  if (urgente.length) lineas.push(urgente.join(' · '));
  lineas.push(...eventosDelDia(docente, fecha));

  return { titulo, cuerpo: lineas.join('\n') };
}

/** Días lectivos desde `desde` (incluido si es lectivo) hasta `n` días. */
export function lectivosProximos(docente: Docente, desde: string, n: number): string[] {
  const dias: string[] = [];
  let d: string | null = estadoDia(docente, desde).lectivo ? desde : proximoLectivo(docente, desde);
  while (d && dias.length < n) {
    dias.push(d);
    d = proximoLectivo(docente, d);
  }
  return dias;
}

export type DatosWidget =
  | { tipo: 'sinDatos' }
  | {
      tipo: 'dia';
      fechaTexto: string;
      /** Clase en curso o siguiente; null si ya no quedan. */
      clase: (FranjaVista & { tipo: 'clase' }) | null;
      etiqueta: string;
      /** Si hoy no quedan clases: el próximo día lectivo y su primera clase. */
      despues: string | null;
      urgente: string[];
    };

/** Lo que enseña el widget: la clase de ahora o la siguiente, y lo urgente. */
export function datosWidget(docente: Docente, dia: MiDia | null, ahora: Date, hoy: string, idioma: Idioma = 'es'): DatosWidget {
  const t = textos(idioma);
  const franjas = estadosFranjas(dia?.fecha === hoy ? dia.franjas : franjasDelHorario(docente, hoy, idioma), ahora, true);
  const clase =
    (franjas.find((f) => f.tipo === 'clase' && f.estado === 'ahora') as (FranjaVista & { tipo: 'clase' }) | undefined) ??
    (franjas.find((f) => f.tipo === 'clase' && f.estado === 'siguiente') as (FranjaVista & { tipo: 'clase' }) | undefined) ??
    null;

  let despues: string | null = null;
  if (!clase) {
    const prox = proximoLectivo(docente, hoy);
    if (prox) {
      const p = franjasDelHorario(docente, prox, idioma).find((f) => f.tipo === 'clase');
      despues = `${t.manana}: ${fechaCorta(prox, idioma)}${p?.tipo === 'clase' ? ` · ${p.inicio} ${p.codigo}` : ''}`;
    }
  }

  const urgente: string[] = [];
  const pendientes = dia?.corregir.length ?? 0;
  if (pendientes) urgente.push(t.corregirN(pendientes));
  for (const f of dia?.fechas ?? []) {
    const n = diasEntre(hoy, f.fecha);
    if (n >= 0 && n <= 3) urgente.push(`${f.tipo === 'examen' ? t.examen : t.entrega} ${f.codigo} ${t.enDias(n)}`);
  }
  for (const p of dia?.preparar ?? []) {
    if (p.fecha === proximoLectivo(docente, hoy) && !clase) urgente.push(t.llevar(`${p.que} (${p.codigo})`));
  }

  if (!dia && !franjas.length && !despues) return { tipo: 'sinDatos' };
  return {
    tipo: 'dia',
    fechaTexto: fechaCorta(hoy, idioma),
    clase,
    etiqueta: clase?.estado === 'ahora' ? t.ahoraW : t.siguienteW,
    despues,
    urgente,
  };
}
