import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { idParte, type EstadoParte } from '../datos/partes';
import type { FranjaVista, Vista } from '../datos/vista';
import { Alertas, Avisos, Corregir, Fechas, Preparar, RitmoGrupos, TarjetaFranja } from '../ui/componentes';
import { fuentes, useTextos, type Colores } from '../ui/tema';

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
  abrirSemana: () => void;
  /** Hay una petición de resumen nuevo en marcha. */
  pidiendo: boolean;
  pedirResumen: () => void;
  /** Mensaje breve tras pedir un resumen (bien o mal). */
  aviso: { ok: boolean; texto: string } | null;
  /** Dictar el parte de una clase de hoy. */
  abrirParte: (f: FranjaVista & { tipo: 'clase' }) => void;
  estadosPartes: Record<string, EstadoParte>;
  partesEnCola: number;
};

// El parte se ofrece en las clases que ya han empezado (o que ya tienen uno).
const admiteParte = (f: FranjaVista, e?: EstadoParte) => f.tipo === 'clase' && (!!e || ['ahora', 'pasada', 'hecha'].includes(f.estado));

const hhmm = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function Hoy({
  c,
  v,
  hechos,
  alternar,
  refrescando,
  refrescar,
  descargadoEn,
  abrirAjustes,
  abrirSemana,
  pidiendo,
  pedirResumen,
  aviso,
  abrirParte,
  estadosPartes,
  partesEnCola,
}: Props) {
  const t = useTextos();
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
        <Pressable onPress={abrirSemana} hitSlop={8} style={[s.semana, { borderColor: c.borde }]} accessibilityRole="button">
          <Text style={[s.semanaTexto, { color: c.acento }]}>{t.semana}</Text>
        </Pressable>
        <Pressable onPress={abrirAjustes} hitSlop={12} accessibilityLabel={t.ajustes}>
          <Text style={[s.engranaje, { color: c.tenue }]}>⚙</Text>
        </Pressable>
      </View>
      <Text style={[s.meta, { color: c.tenue }]}>
        {[generado && t.generado(generado), v.registroEstadoA && t.registro(v.registroEstadoA), descargado && t.actualizado(descargado)]
          .filter(Boolean)
          .join(' · ') || t.deslizaParaActualizar}
      </Text>

      <Pressable
        onPress={pedirResumen}
        disabled={pidiendo}
        style={[s.pedir, { borderColor: c.acento, backgroundColor: pidiendo ? c.acentoSuave : 'transparent' }]}
        accessibilityRole="button"
      >
        {pidiendo ? <ActivityIndicator color={c.acento} size="small" /> : <Text style={[s.pedirIcono, { color: c.acento }]}>↻</Text>}
        <Text style={[s.pedirTexto, { color: c.acento }]}>{t.pedirResumen}</Text>
      </Pressable>
      {pidiendo && <Text style={[s.pedirNota, { color: c.tinta2 }]}>{t.pidiendo}</Text>}
      {!pidiendo && aviso && <Text style={[s.pedirNota, { color: aviso.ok ? c.verde : c.rojo }]}>{aviso.texto}</Text>}
      {partesEnCola > 0 && <Text style={[s.pedirNota, { color: c.ambar }]}>{t.partesEnCola(partesEnCola)}</Text>}

      <Alertas c={c} v={v} />

      {v.lectivo ? (
        <View style={{ gap: 10 }}>
          {v.franjas.map((f) => (
            <TarjetaFranja
              key={`${f.inicio}-${f.tipo === 'clase' ? f.codigo : f.toca}`}
              c={c}
              f={f}
              hechos={hechos}
              alternar={alternar}
              {...(f.tipo === 'clase' && admiteParte(f, estadosPartes[idParte(v.hoy, f.inicio, f.codigo)])
                ? { abrirParte: () => abrirParte(f), estadoParte: estadosPartes[idParte(v.hoy, f.inicio, f.codigo)] }
                : {})}
            />
          ))}
        </View>
      ) : (
        <View style={[s.noLectivo, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Text style={[s.noLectivoTitulo, { color: c.tinta }]}>{t.hoyNoHayClase}</Text>
          {!!v.motivoNoLectivo && <Text style={[s.resumen, { color: c.tinta2 }]}>{v.motivoNoLectivo}</Text>}
          {!!v.proximoLectivo && (
            <Text style={[s.resumen, { color: c.tinta }]}>
              {t.proximoDiaLectivo} <Text style={{ fontFamily: fuentes.textoNegrita }}>{v.proximoLectivo}</Text>
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
  semana: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 2 },
  semanaTexto: { fontFamily: fuentes.textoNegrita, fontSize: 14 },
  pedir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10 },
  pedirIcono: { fontSize: 18, lineHeight: 20 },
  pedirTexto: { fontFamily: fuentes.textoNegrita, fontSize: 15 },
  pedirNota: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20, marginTop: -6 },
  noLectivo: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 4 },
  noLectivoTitulo: { fontFamily: fuentes.titulo, fontSize: 22 },
});
