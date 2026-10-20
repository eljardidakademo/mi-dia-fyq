import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import docenteJson from '../config/docente.json';
import { fechaCorta } from '../datos/calendario';
import type { Semana as TSemana } from '../datos/semana';
import { Etiqueta, Seccion } from '../ui/componentes';
import { colorGrupo, colorRitmo, fuentes, useIdioma, useTextos, type Colores } from '../ui/tema';

type Props = { c: Colores; s: TSemana; volver: () => void; refrescando: boolean; refrescar: () => void };

const CODIGOS = docenteJson.grupos.map((g) => g.codigo);

/** Vista de lunes a viernes y avance de cada unidad. */
export function Semana({ c, s, volver, refrescando, refrescar }: Props) {
  const t = useTextos();
  const idioma = useIdioma();
  const hayPrevisto = s.dias.some((d) => d.clases.some((x) => !!x.previsto));

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

const st = StyleSheet.create({
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
