import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import docenteJson from '../config/docente.json';
import type { Docente } from '../config/tipos';
import { fechaCorta } from '../datos/calendario';
import { construirMes, type Mes } from '../datos/mes';
import type { Semana as TSemana } from '../datos/semana';
import type { MiDia } from '../datos/tipos';
import { Etiqueta, Fechas, Seccion } from '../ui/componentes';
import { colorGrupo, colorRitmo, fuentes, useIdioma, useTextos, type Colores } from '../ui/tema';

type Props = {
  c: Colores;
  s: TSemana;
  dia: MiDia | null;
  hoy: string;
  volver: () => void;
  refrescando: boolean;
  refrescar: () => void;
};

const docente = docenteJson as Docente;
const CODIGOS = docente.grupos.map((g) => g.codigo);

/** Vista de lunes a viernes y avance de cada unidad, o el mes con exámenes y entregas. */
export function Semana({ c, s, dia, hoy, volver, refrescando, refrescar }: Props) {
  const t = useTextos();
  const idioma = useIdioma();
  const [verMes, setVerMes] = useState(false);
  const [desplazamiento, setDesplazamiento] = useState(0);
  const mes = useMemo(() => construirMes(docente, dia, hoy, desplazamiento, idioma), [dia, hoy, desplazamiento, idioma]);
  const hayPrevisto = s.dias.some((d) => d.clases.some((x) => !!x.previsto));

  const pestanas = (
    <View style={[st.pestanas, { borderColor: c.borde, backgroundColor: c.superficie }]}>
      {[false, true].map((m) => (
        <Pressable
          key={String(m)}
          style={[st.pestana, verMes === m && { backgroundColor: c.acento }]}
          onPress={() => setVerMes(m)}
          accessibilityState={{ selected: verMes === m }}
        >
          <Text style={[st.pestanaTexto, { color: verMes === m ? c.superficie : c.tinta2 }]}>{m ? t.vistaMes : t.vistaSemana}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (verMes) {
    return (
      <ScrollView
        style={{ backgroundColor: c.fondo }}
        contentContainerStyle={st.contenido}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.acento]} tintColor={c.acento} />}
      >
        <View style={st.cabecera}>
          <Text style={[st.titulo, { color: c.tinta }]}>{t.examenesEntregas}</Text>
          <Pressable onPress={volver} hitSlop={12}>
            <Text style={[st.volver, { color: c.acento }]}>{t.volverHoy}</Text>
          </Pressable>
        </View>
        {pestanas}
        <CalendarioMes c={c} m={mes} mover={(n) => setDesplazamiento((d) => d + n)} />
        {mes.fechas.length ? (
          <Fechas c={c} fechas={mes.fechas} titulo={mes.titulo} />
        ) : (
          <Text style={[st.nota, { color: c.tenue, marginTop: 0 }]}>{t.sinFechasMes}</Text>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={st.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.acento]} tintColor={c.acento} />}
    >
      <View style={st.cabecera}>
        <Text style={[st.titulo, { color: c.tinta }]}>{t.semanaDel(fechaCorta(s.lunes, idioma))}</Text>
        <Pressable onPress={volver} hitSlop={12}>
          <Text style={[st.volver, { color: c.acento }]}>{t.volverHoy}</Text>
        </Pressable>
      </View>
      {pestanas}
      {!hayPrevisto && <Text style={[st.nota, { color: c.tenue }]}>{t.sinPrevisto}</Text>}

      {s.dias.map((d) => {
        const esHoy = d.cuando === 'hoy';
        return (
          <View
            key={d.fecha}
            style={[
              st.dia,
              { backgroundColor: c.superficie, borderColor: esHoy ? c.acento : c.borde, borderWidth: esHoy ? 2 : 1 },
              d.cuando === 'pasado' && st.pasado,
            ]}
          >
            <View style={st.diaCabeza}>
              <Text style={[st.diaTitulo, { color: c.tinta }]}>{d.titulo}</Text>
              {esHoy && <Etiqueta texto={t.hoy} color={c.acento} fondo={c.acentoSuave} />}
            </View>

            {!d.lectivo ? (
              <Text style={[st.texto, { color: c.tinta2 }]}>{d.motivo}</Text>
            ) : (
              d.clases.map((x) => {
                const g = colorGrupo(c, CODIGOS.indexOf(x.codigo));
                return (
                  <View key={`${x.inicio}-${x.codigo}`} style={[st.clase, x.sinClase && st.pasado]}>
                    <Text style={[st.hora, { color: c.tinta2 }]}>{x.inicio}</Text>
                    <Text style={[st.codigo, { color: g?.color ?? c.acento }]}>{x.codigo}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.texto, { color: c.tinta }]} numberOfLines={3}>
                        {x.sinClase ? t.sinClase(x.sinClase) : x.previsto || x.aula}
                      </Text>
                      {!!x.sesion && !x.sinClase && (
                        <Text style={[st.pequeno, { color: c.tenue }]}>
                          {x.sesion}
                          {x.previsto ? ` · ${x.aula}` : ''}
                        </Text>
                      )}
                    </View>
                    {x.hecha && <Text style={[st.check, { color: c.verde }]}>✓</Text>}
                  </View>
                );
              })
            )}

            {d.fechas.map((f, i) => (
              <View key={`f${i}`} style={[st.marca, { backgroundColor: f.tipo === 'examen' ? c.rojoSuave : c.azulSuave }]}>
                <Text style={[st.pequeno, { color: f.tipo === 'examen' ? c.rojo : c.azul, fontFamily: fuentes.textoNegrita }]}>
                  {f.tipo === 'examen' ? t.examen : t.entrega} {f.codigo} · {f.que}
                </Text>
              </View>
            ))}
            {d.preparar.map((p, i) => (
              <Text key={`p${i}`} style={[st.pequeno, { color: c.ambar }]}>
                {t.llevar(`${p.que} (${p.codigo})`)}
              </Text>
            ))}
            {d.eventos.map((e, i) => (
              <Text key={`e${i}`} style={[st.pequeno, { color: c.tinta2 }]}>
                • {e}
              </Text>
            ))}
          </View>
        );
      })}

      <Seccion c={c} titulo={t.avanceUnidades}>
        {s.avance.length === 0 ? (
          <Text style={[st.texto, { color: c.tenue }]}>{t.sinAvance}</Text>
        ) : (
          s.avance.map((a) => {
            const color = a.ritmo ? colorRitmo(c, a.ritmo.desfase).color : (colorGrupo(c, CODIGOS.indexOf(a.codigo))?.color ?? c.acento);
            const pct = Math.round((a.hechas / a.total) * 100);
            return (
              <View key={a.codigo} style={{ gap: 4 }}>
                <View style={st.avanceCabeza}>
                  <Text style={[st.codigo, { color: c.tinta }]}>{a.codigo}</Text>
                  <Text style={[st.texto, { color: c.tinta, flex: 1 }]} numberOfLines={1}>
                    {a.unidad}
                  </Text>
                  <Text style={[st.pequeno, { color: c.tinta2 }]}>{t.sesionesDe(a.hechas, a.total)}</Text>
                </View>
                <View style={[st.pista, { backgroundColor: c.superficie2, borderColor: c.borde }]}>
                  <View style={[st.barra, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                {!!a.ritmo?.texto && <Text style={[st.pequeno, { color: c.tenue }]}>{a.ritmo.texto}</Text>}
              </View>
            );
          })
        )}
      </Seccion>
    </ScrollView>
  );
}

/** Rejilla de lunes a viernes: punto rojo si hay examen y azul si hay entrega. */
function CalendarioMes({ c, m, mover }: { c: Colores; m: Mes; mover: (n: number) => void }) {
  const t = useTextos();
  return (
    <View style={[st.dia, { backgroundColor: c.superficie, borderColor: c.borde, borderWidth: 1 }]}>
      <View style={st.mesCabeza}>
        <Pressable onPress={() => mover(-1)} hitSlop={10} accessibilityLabel={t.mesAnterior} style={[st.flecha, { borderColor: c.borde }]}>
          <Text style={[st.flechaTexto, { color: c.acento }]}>‹</Text>
        </Pressable>
        <Text style={[st.mesNombre, { color: c.tinta }]}>{m.titulo}</Text>
        <Pressable onPress={() => mover(1)} hitSlop={10} accessibilityLabel={t.mesSiguiente} style={[st.flecha, { borderColor: c.borde }]}>
          <Text style={[st.flechaTexto, { color: c.acento }]}>›</Text>
        </Pressable>
      </View>
      <View style={st.fila}>
        {t.diasCortos.map((d, i) => (
          <Text key={i} style={[st.celdaCabeza, { color: c.tenue }]}>
            {d}
          </Text>
        ))}
      </View>
      {m.semanas.map((sem) => (
        <View key={sem[0].fecha} style={st.fila}>
          {sem.map((d) => (
            <View
              key={d.fecha}
              style={[
                st.celda,
                d.esHoy && { borderColor: c.acento, borderWidth: 2 },
                d.lectivo && d.delMes && { backgroundColor: c.superficie2 },
                !d.delMes && st.pasado,
              ]}
            >
              <Text style={[st.celdaNumero, { color: d.delMes ? (d.lectivo ? c.tinta : c.tenue) : c.tenue }]}>{d.numero}</Text>
              <View style={st.puntos}>
                {Array.from({ length: d.examenes }, (_, i) => (
                  <View key={`x${i}`} style={[st.punto, { backgroundColor: c.rojo }]} />
                ))}
                {Array.from({ length: d.entregas }, (_, i) => (
                  <View key={`e${i}`} style={[st.punto, { backgroundColor: c.azul }]} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={st.leyenda}>
        <View style={[st.punto, { backgroundColor: c.rojo }]} />
        <Text style={[st.pequeno, { color: c.tinta2 }]}>{t.examen}</Text>
        <View style={[st.punto, { backgroundColor: c.azul, marginLeft: 10 }]} />
        <Text style={[st.pequeno, { color: c.tinta2 }]}>{t.entrega}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  pestanas: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 3, alignSelf: 'flex-start' },
  pestana: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
  pestanaTexto: { fontFamily: fuentes.textoNegrita, fontSize: 14 },
  mesCabeza: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flecha: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { fontFamily: fuentes.monoNegrita, fontSize: 20, lineHeight: 22 },
  fila: { flexDirection: 'row', gap: 4 },
  mesNombre: { flex: 1, textAlign: 'center', fontFamily: fuentes.tituloMedio, fontSize: 17 },
  celdaCabeza: { flex: 1, textAlign: 'center', fontFamily: fuentes.textoNegrita, fontSize: 13 },
  celda: { flex: 1, minHeight: 48, borderRadius: 8, padding: 4, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: 'transparent' },
  celdaNumero: { fontFamily: fuentes.mono, fontSize: 15 },
  puntos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 3 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  contenido: { padding: 16, gap: 12, paddingBottom: 40 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titulo: { fontFamily: fuentes.titulo, fontSize: 24, flex: 1 },
  volver: { fontFamily: fuentes.textoNegrita, fontSize: 16 },
  nota: { fontFamily: fuentes.texto, fontSize: 13, marginTop: -4 },
  dia: { borderRadius: 12, padding: 12, gap: 8 },
  pasado: { opacity: 0.55 },
  diaCabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diaTitulo: { fontFamily: fuentes.tituloMedio, fontSize: 18 },
  clase: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  hora: { fontFamily: fuentes.mono, fontSize: 13, width: 44, paddingTop: 2 },
  codigo: { fontFamily: fuentes.monoNegrita, fontSize: 14, minWidth: 52, paddingTop: 1 },
  check: { fontSize: 16, fontWeight: '700' },
  texto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21 },
  pequeno: { fontFamily: fuentes.texto, fontSize: 13, lineHeight: 18 },
  marca: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  avanceCabeza: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pista: { height: 12, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 6 },
});
