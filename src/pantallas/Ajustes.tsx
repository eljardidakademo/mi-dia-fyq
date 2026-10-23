import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useColorScheme, View } from 'react-native';

import { descargar, textoError, type Ajustes as TAjustes, type Preferencias } from '../datos/fuente';
import { IDIOMAS } from '../i18n/textos';
import { coloresDe, fuentes, TEMAS, useIdioma, useTextos, type Colores } from '../ui/tema';

type Props = {
  c: Colores;
  inicial: TAjustes | null;
  guardar: (a: TAjustes) => void;
  cerrar?: () => void;
  prefs: Preferencias;
  cambiarPrefs: (p: Preferencias) => void;
  /** Resultado de programar los avisos: cuántos hay o por qué no se pudo. */
  estadoAvisos: string | null;
  anadirWidget?: () => void;
};

/** Suma minutos a "HH:MM" sin salir del día. */
const moverHora = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.min(23 * 60 + 55, Math.max(0, h * 60 + m + min));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function Ajustes({ c, inicial, guardar, cerrar, prefs, cambiarPrefs, estadoAvisos, anadirWidget }: Props) {
  const t = useTextos();
  const idioma = useIdioma();
  const sistemaOscuro = useColorScheme() === 'dark';
  const [url, setUrl] = useState(inicial?.url ?? '');
  const [clave, setClave] = useState(inicial?.clave ?? '');
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null);
  const [probando, setProbando] = useState(false);

  const probar = async () => {
    setProbando(true);
    const r = await descargar({ url: url.trim(), clave });
    setProbando(false);
    setPrueba(
      r.ok
        ? { ok: true, texto: t.conectado(r.guardado.archivo || r.normalizado.dia?.fecha || '') }
        : { ok: false, texto: textoError(r.error, idioma) },
    );
  };

  const primeraVez = !inicial?.url;
  const campo = [s.campo, { color: c.tinta, borderColor: c.borde, backgroundColor: c.superficie }];
  const chip = (activo: boolean) => [s.chip, { borderColor: activo ? c.acento : c.borde, backgroundColor: activo ? c.acentoSuave : c.superficie }];

  // Conexión con el script: arriba la primera vez, abajo cuando ya está puesta.
  const conexion = (
  <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
    <Text style={[s.seccionTitulo, { color: c.tinta }]}>{t.conexion}</Text>
    <Text style={[s.texto, { color: c.tinta2 }]}>{t.conexionTexto}</Text>

    <Text style={[s.etiqueta, { color: c.tinta2 }]}>{t.direccion}</Text>
    <TextInput
      style={campo}
      value={url}
      onChangeText={setUrl}
      placeholder="https://script.google.com/macros/s/…/exec"
      placeholderTextColor={c.tenue}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
    />
    <Text style={[s.etiqueta, { color: c.tinta2 }]}>{t.clave}</Text>
    <TextInput style={campo} value={clave} onChangeText={setClave} secureTextEntry autoCapitalize="none" autoCorrect={false} />

    <View style={s.botones}>
      <Pressable style={[s.boton, { flex: 1, borderColor: c.acento }]} onPress={probar} disabled={probando}>
        {probando ? <ActivityIndicator color={c.acento} /> : <Text style={[s.botonTexto, { color: c.acento }]}>{t.probar}</Text>}
      </Pressable>
      <Pressable
        style={[s.boton, { flex: 1, backgroundColor: c.acento, borderColor: c.acento }]}
        onPress={() => guardar({ url: url.trim(), clave })}
      >
        <Text style={[s.botonTexto, { color: c.sobreAcento }]}>{t.guardar}</Text>
      </Pressable>
    </View>
    {prueba && <Text style={[s.texto, { color: prueba.ok ? c.verde : c.rojo }]}>{prueba.texto}</Text>}
  </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      <View style={s.cabecera}>
        <Text style={[s.titulo, { color: c.tinta }]}>{t.ajustes}</Text>
        {cerrar && (
          <Pressable onPress={cerrar} hitSlop={12}>
            <Text style={[s.botonTexto, { color: c.tinta2 }]}>{t.volver}</Text>
          </Pressable>
        )}
      </View>

      {primeraVez && conexion}

      {/* Apariencia */}
      <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Text style={[s.seccionTitulo, { color: c.tinta }]}>{t.apariencia}</Text>
        <Text style={[s.etiqueta, { color: c.tinta2 }]}>{t.tema}</Text>
        <View style={s.temas}>
          {TEMAS.map((id) => {
            const m = coloresDe(id, sistemaOscuro);
            const activo = prefs.tema === id;
            const [nombre, desc] = t.temas[id];
            return (
              <Pressable
                key={id}
                onPress={() => cambiarPrefs({ ...prefs, tema: id })}
                style={[s.tema, { borderColor: activo ? c.acento : c.borde, borderWidth: activo ? 2 : 1 }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
              >
                <View style={[s.muestra, { backgroundColor: m.fondo, borderColor: m.borde }]}>
                  <View style={[s.muestraTarjeta, { backgroundColor: m.superficie, borderColor: m.acento }]}>
                    <View style={[s.muestraLinea, { backgroundColor: m.tinta, width: '70%' }]} />
                    <View style={[s.muestraLinea, { backgroundColor: m.tinta2, width: '45%' }]} />
                  </View>
                  <View style={s.muestraPuntos}>
                    {(m.grupos.length ? m.grupos.slice(0, 4).map((g) => g.color) : [m.acento, m.verde, m.ambar, m.rojo]).map((col, i) => (
                      <View key={i} style={[s.punto, { backgroundColor: col }]} />
                    ))}
                  </View>
                </View>
                <Text style={[s.temaNombre, { color: c.tinta }]}>{nombre}</Text>
                <Text style={[s.temaDesc, { color: c.tinta2 }]}>{desc}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.etiqueta, { color: c.tinta2 }]}>{t.idioma}</Text>
        <View style={s.chips}>
          {IDIOMAS.map((i) => (
            <Pressable key={i.id} onPress={() => cambiarPrefs({ ...prefs, idioma: i.id })} style={chip(prefs.idioma === i.id)}>
              <Text style={[s.chipTexto, { color: prefs.idioma === i.id ? c.acento : c.tinta }]}>{i.nombre}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[s.nota, { color: c.tenue }]}>{t.idiomaNota}</Text>
      </View>

      {/* Aviso de la mañana */}
      <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Text style={[s.seccionTitulo, { color: c.tinta }]}>{t.avisoDiario}</Text>
        <Text style={[s.texto, { color: c.tinta2 }]}>{t.avisoTexto}</Text>
        <View style={s.filaAviso}>
          <Text style={[s.botonTexto, { color: c.tinta, flex: 1 }]}>{t.avisoActivo}</Text>
          <Switch
            value={prefs.aviso.activo}
            onValueChange={(activo) => cambiarPrefs({ ...prefs, aviso: { ...prefs.aviso, activo } })}
            trackColor={{ true: c.acento, false: c.borde }}
            thumbColor={c.superficie}
          />
        </View>
        {prefs.aviso.activo && (
          <View style={s.filaAviso}>
            <Text style={[s.botonTexto, { color: c.tinta, flex: 1 }]}>{t.hora}</Text>
            <Pressable
              style={[s.paso, { borderColor: c.borde }]}
              onPress={() => cambiarPrefs({ ...prefs, aviso: { ...prefs.aviso, hora: moverHora(prefs.aviso.hora, -5) } })}
              hitSlop={6}
            >
              <Text style={[s.pasoTexto, { color: c.acento }]}>−</Text>
            </Pressable>
            <Text style={[s.hora, { color: c.tinta }]}>{prefs.aviso.hora}</Text>
            <Pressable
              style={[s.paso, { borderColor: c.borde }]}
              onPress={() => cambiarPrefs({ ...prefs, aviso: { ...prefs.aviso, hora: moverHora(prefs.aviso.hora, 5) } })}
              hitSlop={6}
            >
              <Text style={[s.pasoTexto, { color: c.acento }]}>+</Text>
            </Pressable>
          </View>
        )}
        {!!estadoAvisos && prefs.aviso.activo && <Text style={[s.nota, { color: c.tinta2 }]}>{estadoAvisos}</Text>}
      </View>

      {/* Recordatorio del parte */}
      <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Text style={[s.seccionTitulo, { color: c.tinta }]}>{t.recordarParte}</Text>
        <Text style={[s.texto, { color: c.tinta2 }]}>{t.recordarParteTexto}</Text>
        <View style={s.filaAviso}>
          <Text style={[s.botonTexto, { color: c.tinta, flex: 1 }]}>{t.recordarParteActivo}</Text>
          <Switch
            value={prefs.parte.recordar}
            onValueChange={(recordar) => cambiarPrefs({ ...prefs, parte: { recordar } })}
            trackColor={{ true: c.acento, false: c.borde }}
            thumbColor={c.superficie}
          />
        </View>
        {!!estadoAvisos && !prefs.aviso.activo && prefs.parte.recordar && (
          <Text style={[s.nota, { color: c.tinta2 }]}>{estadoAvisos}</Text>
        )}
      </View>

      {/* Widget (solo Android) */}
      {Platform.OS === 'android' && (
        <View style={[s.seccion, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Text style={[s.seccionTitulo, { color: c.tinta }]}>{t.widget}</Text>
          <Text style={[s.texto, { color: c.tinta2 }]}>{t.widgetTexto}</Text>
          {anadirWidget && (
            <Pressable style={[s.boton, { borderColor: c.acento }]} onPress={anadirWidget}>
              <Text style={[s.botonTexto, { color: c.acento }]}>{t.anadirWidget}</Text>
            </Pressable>
          )}
        </View>
      )}

      {!primeraVez && conexion}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: 16, gap: 14, paddingBottom: 40 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontFamily: fuentes.titulo, fontSize: 28 },
  seccion: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  seccionTitulo: { fontFamily: fuentes.titulo, fontSize: 18 },
  texto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21 },
  nota: { fontFamily: fuentes.texto, fontSize: 13, lineHeight: 18 },
  etiqueta: { fontFamily: fuentes.textoNegrita, fontSize: 13, marginTop: 4 },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fuentes.mono, fontSize: 14 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 6 },
  boton: { borderWidth: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonTexto: { fontFamily: fuentes.textoNegrita, fontSize: 16 },
  temas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tema: { width: '47%', flexGrow: 1, borderRadius: 12, padding: 8, gap: 4 },
  muestra: { height: 64, borderRadius: 8, borderWidth: 1, padding: 8, justifyContent: 'space-between' },
  muestraTarjeta: { borderRadius: 5, borderLeftWidth: 3, padding: 5, gap: 4 },
  muestraLinea: { height: 4, borderRadius: 2 },
  muestraPuntos: { flexDirection: 'row', gap: 4 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  temaNombre: { fontFamily: fuentes.textoNegrita, fontSize: 15 },
  temaDesc: { fontFamily: fuentes.texto, fontSize: 12, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipTexto: { fontFamily: fuentes.textoNegrita, fontSize: 14 },
  filaAviso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paso: { width: 40, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pasoTexto: { fontFamily: fuentes.monoNegrita, fontSize: 20 },
  hora: { fontFamily: fuentes.monoNegrita, fontSize: 20, minWidth: 64, textAlign: 'center' },
});
