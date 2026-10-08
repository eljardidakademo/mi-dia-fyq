import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Vista } from '../datos/vista';
import { Alertas, Avisos, Corregir, Fechas, Preparar, RitmoGrupos, TarjetaFranja } from '../ui/componentes';
import { fuentes, type Colores } from '../ui/tema';

type Props = {
  c: Colores;
  v: Vista;
  hechos: Set<string>;
  alternar: (id: string) => void;
  refrescando: boolean;
  refrescar: () => void;
  /** Cuándo se descargó por última vez el resumen que se está viendo. */
  descargadoEn: string | null;
  abrirAjustes: () => void;
};

const hhmm = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function Hoy({ c, v, hechos, alternar, refrescando, refrescar, descargadoEn, abrirAjustes }: Props) {
  const generado = hhmm(v.generadoEn);
  const descargado = hhmm(descargadoEn);

  return (
    <ScrollView
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={s.contenido}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.acento]} tintColor={c.acento} />}
    >
      <View style={s.cabecera}>
        <View style={{ flex: 1 }}>
          <Text style={[s.fecha, { color: c.tinta }]}>{v.fechaTexto}</Text>
          {!!v.resumen && <Text style={[s.resumen, { color: c.tinta2 }]}>{v.resumen}</Text>}
        </View>
        <Pressable onPress={abrirAjustes} hitSlop={12} accessibilityLabel="Ajustes">
          <Text style={[s.engranaje, { color: c.tenue }]}>⚙</Text>
        </Pressable>
      </View>
      <Text style={[s.meta, { color: c.tenue }]}>
        {[generado && `Generado ${generado}`, v.registroEstadoA && `Registro: ${v.registroEstadoA}`, descargado && `Actualizado ${descargado}`]
          .filter(Boolean)
          .join(' · ') || 'Desliza hacia abajo para actualizar'}
      </Text>

      <Alertas c={c} v={v} />

      {v.lectivo ? (
        <View style={{ gap: 10 }}>
          {v.franjas.map((f) => (
            <TarjetaFranja key={`${f.inicio}-${f.tipo === 'clase' ? f.codigo : f.toca}`} c={c} f={f} hechos={hechos} alternar={alternar} />
          ))}
        </View>
      ) : (
        <View style={[s.noLectivo, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Text style={[s.noLectivoTitulo, { color: c.tinta }]}>Hoy no hay clase</Text>
          {!!v.motivoNoLectivo && <Text style={[s.resumen, { color: c.tinta2 }]}>{v.motivoNoLectivo}</Text>}
          {!!v.proximoLectivo && (
            <Text style={[s.resumen, { color: c.tinta }]}>
              Próximo día lectivo: <Text style={{ fontFamily: fuentes.textoNegrita }}>{v.proximoLectivo}</Text>
            </Text>
          )}
        </View>
      )}

      <Corregir c={c} v={v} />
      <Preparar c={c} v={v} />
      <Fechas c={c} v={v} />
      <RitmoGrupos c={c} v={v} />
      <Avisos c={c} v={v} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: 16, gap: 14, paddingBottom: 40 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fecha: { fontFamily: fuentes.titulo, fontSize: 30, lineHeight: 34 },
  resumen: { fontFamily: fuentes.texto, fontSize: 16, lineHeight: 22, marginTop: 4 },
  meta: { fontFamily: fuentes.mono, fontSize: 11, marginTop: -6 },
  engranaje: { fontSize: 26 },
  noLectivo: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 4 },
  noLectivoTitulo: { fontFamily: fuentes.titulo, fontSize: 22 },
});
