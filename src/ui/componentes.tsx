import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import docenteJson from '../config/docente.json';
import { mesCorto, desdeIso } from '../datos/calendario';
import { MARCA_HECHO, quitarMarcaHecho } from '../datos/normalizar';
import type { FranjaVista, Vista } from '../datos/vista';
import { colorGrupo, colorRitmo, fuentes, useIdioma, useTextos, type Colores } from './tema';

type ConC = { c: Colores };

const CODIGOS = docenteJson.grupos.map((g) => g.codigo);
/** Color propio del grupo en temas como Colorido; si no, null. */
const deGrupo = (c: Colores, codigo: string) => colorGrupo(c, CODIGOS.indexOf(codigo));

/** Casilla tipo tabla periódica: sesión arriba, código grande, aula abajo. */
export function Ficha({ c, sesion, codigo, aula, ritmo }: ConC & { sesion: string; codigo: string; aula: string; ritmo: string }) {
  const borde = ritmo ? colorRitmo(c, ritmo).color : c.borde;
  const g = deGrupo(c, codigo);
  return (
    <View style={[s.ficha, { borderColor: borde, backgroundColor: g?.fondo ?? c.superficie2 }]}>
      <Text style={[s.fichaSesion, { color: c.tinta2 }]}>{sesion || ' '}</Text>
      <Text style={[s.fichaCodigo, { color: g?.color ?? c.tinta }]} numberOfLines={1} adjustsFontSizeToFit>
        {codigo}
      </Text>
      <Text style={[s.fichaAula, { color: c.tinta2 }]} numberOfLines={1}>
        {aula}
      </Text>
    </View>
  );
}

export function Etiqueta({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return (
    <View style={[s.etiqueta, { backgroundColor: fondo }]}>
      <Text style={[s.etiquetaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

export function Casilla({ c, texto, marcada, onPress }: ConC & { texto: string; marcada: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.casilla} hitSlop={6}>
      <View style={[s.caja, { borderColor: marcada ? c.verde : c.tenue, backgroundColor: marcada ? c.verde : 'transparent' }]}>
        {marcada && <Text style={s.cajaCheck}>✓</Text>}
      </View>
      <Text style={[s.casillaTexto, { color: marcada ? c.tenue : c.tinta }, marcada && s.tachado]}>{texto}</Text>
    </Pressable>
  );
}

export function TarjetaFranja({
  c,
  f,
  hechos,
  alternar,
}: ConC & {
  f: FranjaVista;
  hechos: Set<string>;
  alternar: (id: string) => void;
}) {
  const t = useTextos();
  const apagada = f.estado === 'pasada' || f.estado === 'hecha';
  const hora = (
    <View style={s.horaCol}>
      <Text style={[s.hora, { color: f.estado === 'ahora' ? c.acento : c.tinta }]}>{f.inicio}</Text>
      <Text style={[s.horaFin, { color: c.tenue }]}>{f.fin}</Text>
    </View>
  );

  if (f.tipo === 'otra') {
    return (
      <View style={[s.fila, apagada && s.apagada]}>
        {hora}
        <View style={[s.otra, { borderColor: f.estado === 'ahora' ? c.acento : c.borde }]}>
          <Text style={[s.otraTexto, { color: c.tinta2 }]}>{f.toca}</Text>
          {f.estado === 'ahora' && <Etiqueta texto={t.estado.ahora} color={c.acento} fondo={c.acentoSuave} />}
        </View>
      </View>
    );
  }

  const estadoTxt = f.estado === 'ahora' || f.estado === 'siguiente' || f.estado === 'hecha' ? t.estado[f.estado] : undefined;
  const destacada = f.estado === 'ahora' || f.estado === 'siguiente';
  const toca = quitarMarcaHecho(f.toca);
  const id = (tipo: string, i: number) => `${f.inicio}|${f.codigo}|${tipo}|${i}`;

  return (
    <View style={[s.fila, apagada && s.apagada]}>
      {hora}
      <View style={[s.tarjeta, { backgroundColor: c.superficie, borderColor: destacada ? c.acento : c.borde }, destacada && s.tarjetaDestacada]}>
        <View style={s.tarjetaCabeza}>
          <Ficha c={c} sesion={f.sesion} codigo={f.codigo} aula={f.aula} ritmo={f.ritmo} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={s.filaEtiquetas}>
              <Text style={[s.grupo, { color: c.tinta }]}>{f.grupo}</Text>
              {estadoTxt && (
                <Etiqueta
                  texto={estadoTxt}
                  color={f.estado === 'hecha' ? c.verde : c.acento}
                  fondo={f.estado === 'hecha' ? c.verdeSuave : c.acentoSuave}
                />
              )}
            </View>
            {!!f.unidad && <Text style={[s.pequeno, { color: c.tinta2 }]}>{f.unidad}</Text>}
            {!!f.ritmo && <Etiqueta texto={f.ritmo} {...colorRitmo(c, f.ritmo)} />}
          </View>
        </View>
        {!!toca && <Text style={[s.toca, { color: c.tinta }]}>{toca}</Text>}
        {f.deberes.length > 0 && (
          <Bloque c={c} titulo={t.revisarDeberes}>
            {f.deberes.map((d, i) => (
              <Casilla key={i} c={c} texto={d} marcada={hechos.has(id('d', i))} onPress={() => alternar(id('d', i))} />
            ))}
          </Bloque>
        )}
        {f.material.length > 0 && (
          <Bloque c={c} titulo={t.material}>
            {f.material.map((m, i) => {
              const yaHecho = MARCA_HECHO.test(m);
              return (
                <Casilla
                  key={i}
                  c={c}
                  texto={quitarMarcaHecho(m)}
                  marcada={yaHecho || hechos.has(id('m', i))}
                  onPress={yaHecho ? undefined : () => alternar(id('m', i))}
                />
              );
            })}
          </Bloque>
        )}
        {!!f.nota && <Text style={[s.nota, { color: c.tinta2, borderColor: c.borde }]}>{f.nota}</Text>}
      </View>
    </View>
  );
}

function Bloque({ c, titulo, children }: ConC & { titulo: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.bloqueTitulo, { color: c.tenue }]}>{titulo.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export function Seccion({ c, titulo, children }: ConC & { titulo: string; children: ReactNode }) {
  return (
    <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <Text style={[s.seccionTitulo, { color: c.tinta }]}>{titulo}</Text>
      {children}
    </View>
  );
}

export function Corregir({ c, v }: ConC & { v: Vista }) {
  const t = useTextos();
  if (!v.corregir.length) return null;
  return (
    <Seccion c={c} titulo={t.pendienteCorregir}>
      {v.corregir.map((x, i) => (
        <View key={i} style={s.filaLista}>
          <Text style={[s.codigoMini, { color: deGrupo(c, x.codigo)?.color ?? c.acento }]}>{x.codigo}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.texto, { color: c.tinta }]}>{x.que}</Text>
            <Text style={[s.pequeno, { color: c.tenue }]}>{t.desdeEl(x.desde.split('-').reverse().slice(0, 2).join('/'))}</Text>
          </View>
        </View>
      ))}
    </Seccion>
  );
}

export function Preparar({ c, v }: ConC & { v: Vista }) {
  const t = useTextos();
  if (!v.preparar.length) return null;
  const porFecha = new Map<string, typeof v.preparar>();
  for (const p of v.preparar) porFecha.set(p.fechaTexto || p.fecha, [...(porFecha.get(p.fechaTexto || p.fecha) ?? []), p]);
  return (
    <Seccion c={c} titulo={t.materialProximos}>
      {[...porFecha].map(([fecha, items]) => (
        <View key={fecha} style={{ gap: 6 }}>
          <Text style={[s.bloqueTitulo, { color: c.tenue }]}>{fecha.toUpperCase()}</Text>
          {items.map((p, i) => (
            <View key={i} style={s.filaLista}>
              <Text style={[s.codigoMini, { color: deGrupo(c, p.codigo)?.color ?? c.acento }]}>{p.codigo}</Text>
              <Text style={[s.texto, { color: c.tinta, flex: 1 }]}>{p.que}</Text>
            </View>
          ))}
        </View>
      ))}
    </Seccion>
  );
}

export function Fechas({ c, v }: ConC & { v: Vista }) {
  const t = useTextos();
  const idioma = useIdioma();
  if (!v.fechas.length) return null;
  const est = { fijado: [c.verde, c.verdeSuave], provisional: [c.ambar, c.ambarSuave], 'por confirmar': [c.rojo, c.rojoSuave] } as const;
  return (
    <Seccion c={c} titulo={t.examenesEntregas}>
      {v.fechas.map((f, i) => (
        <View key={i} style={s.filaLista}>
          <View style={[s.calendario, { borderColor: c.borde }]}>
            <Text style={[s.calMes, { backgroundColor: f.tipo === 'examen' ? c.rojo : c.acento }]}>{mesCorto(f.fecha, idioma).toUpperCase()}</Text>
            <Text style={[s.calDia, { color: c.tinta }]}>{desdeIso(f.fecha).getDate()}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[s.texto, { color: c.tinta }]}>
              <Text style={{ fontFamily: fuentes.textoNegrita }}>{f.tipo === 'examen' ? t.examen : t.entrega} {f.codigo}</Text> · {f.que}
            </Text>
            <View style={s.filaEtiquetas}>
              <Etiqueta texto={t.estadoFecha[f.estado]} color={est[f.estado][0]} fondo={est[f.estado][1]} />
              <Text style={[s.pequeno, { color: c.tinta2 }]}>
                {t.enDias(f.enDias)}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </Seccion>
  );
}

/** Barras divergentes: retraso a la izquierda, adelanto a la derecha. */
export function RitmoGrupos({ c, v }: ConC & { v: Vista }) {
  const t = useTextos();
  if (!v.ritmo.length) return null;
  const max = Math.max(5, ...v.ritmo.map((r) => Math.abs(r.desfase)));
  return (
    <Seccion c={c} titulo={t.ritmo}>
      {v.ritmo.map((r) => {
        const ancho = `${(Math.abs(r.desfase) / max) * 50}%` as const;
        const col = colorRitmo(c, r.desfase).color;
        return (
          <View key={r.codigo} style={{ gap: 2 }}>
            <View style={s.filaRitmo}>
              <Text style={[s.codigoMini, { color: deGrupo(c, r.codigo)?.color ?? c.tinta, width: 60 }]}>{r.codigo}</Text>
              <View style={[s.pista, { backgroundColor: c.superficie2 }]}>
                <View style={[s.eje, { backgroundColor: c.borde }]} />
                {r.desfase !== 0 && (
                  <View style={[s.barra, { backgroundColor: col, width: ancho }, r.desfase < 0 ? { right: '50%' } : { left: '50%' }]} />
                )}
              </View>
              <Text style={[s.ritmoNum, { color: col }]}>{r.desfase > 0 ? `+${r.desfase}` : r.desfase}</Text>
            </View>
            <Text style={[s.pequeno, { color: c.tenue, marginLeft: 68 }]}>{r.texto}</Text>
          </View>
        );
      })}
    </Seccion>
  );
}

export function Avisos({ c, v }: ConC & { v: Vista }) {
  const t = useTextos();
  if (!v.avisos.length) return null;
  return (
    <Seccion c={c} titulo={t.avisos}>
      {v.avisos.map((a, i) => (
        <Text key={i} style={[s.texto, { color: c.tinta }]}>
          • {a}
        </Text>
      ))}
    </Seccion>
  );
}

export function Alertas({ c, v }: ConC & { v: Vista }) {
  return (
    <>
      {v.alertas.map((a, i) => {
        const [color, fondo] = a.nivel === 'error' ? [c.rojo, c.rojoSuave] : a.nivel === 'aviso' ? [c.ambar, c.ambarSuave] : [c.tinta2, c.superficie2];
        return (
          <View key={i} style={[s.alerta, { backgroundColor: fondo, borderColor: color }]}>
            <Text style={[s.texto, { color }]}>{a.texto}</Text>
          </View>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  ficha: { width: 64, height: 72, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  fichaSesion: { fontFamily: fuentes.mono, fontSize: 11 },
  fichaCodigo: { fontFamily: fuentes.monoNegrita, fontSize: 22, paddingHorizontal: 4 },
  fichaAula: { fontFamily: fuentes.mono, fontSize: 10 },
  etiqueta: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  etiquetaTexto: { fontFamily: fuentes.textoNegrita, fontSize: 12 },
  casilla: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  caja: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  cajaCheck: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },
  casillaTexto: { flex: 1, fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21 },
  tachado: { textDecorationLine: 'line-through' },
  fila: { flexDirection: 'row', gap: 10 },
  apagada: { opacity: 0.55 },
  horaCol: { width: 48, paddingTop: 6 },
  hora: { fontFamily: fuentes.monoNegrita, fontSize: 15 },
  horaFin: { fontFamily: fuentes.mono, fontSize: 12 },
  otra: { flex: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  otraTexto: { fontFamily: fuentes.texto, fontSize: 15 },
  tarjeta: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  tarjetaDestacada: { borderWidth: 2 },
  tarjetaCabeza: { flexDirection: 'row', gap: 12 },
  filaEtiquetas: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  grupo: { fontFamily: fuentes.tituloMedio, fontSize: 18 },
  toca: { fontFamily: fuentes.texto, fontSize: 16, lineHeight: 23 },
  nota: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, borderLeftWidth: 3, paddingLeft: 10, fontStyle: 'italic' },
  bloqueTitulo: { fontFamily: fuentes.textoNegrita, fontSize: 11, letterSpacing: 0.8 },
  seccion: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12 },
  seccionTitulo: { fontFamily: fuentes.titulo, fontSize: 18 },
  filaLista: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codigoMini: { fontFamily: fuentes.monoNegrita, fontSize: 14, minWidth: 44, paddingTop: 2 },
  texto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21 },
  pequeno: { fontFamily: fuentes.texto, fontSize: 13 },
  calendario: { width: 46, borderWidth: 1, borderRadius: 8, overflow: 'hidden', alignItems: 'center' },
  calMes: { width: '100%', textAlign: 'center', color: '#fff', fontFamily: fuentes.monoNegrita, fontSize: 10, paddingVertical: 2 },
  calDia: { fontFamily: fuentes.titulo, fontSize: 20, paddingVertical: 2 },
  filaRitmo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pista: { flex: 1, height: 14, borderRadius: 4, overflow: 'hidden', justifyContent: 'center' },
  eje: { position: 'absolute', left: '50%', width: 2, top: 0, bottom: 0, marginLeft: -1 },
  barra: { position: 'absolute', top: 2, bottom: 2, borderRadius: 3 },
  ritmoNum: { fontFamily: fuentes.monoNegrita, fontSize: 13, width: 36, textAlign: 'right' },
  alerta: { borderLeftWidth: 4, borderRadius: 8, padding: 12 },
});
