import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { descargar, type Ajustes as TAjustes } from '../datos/fuente';
import { fuentes, type Colores } from '../ui/tema';

type Props = { c: Colores; inicial: TAjustes | null; guardar: (a: TAjustes) => void; cerrar?: () => void };

export function Ajustes({ c, inicial, guardar, cerrar }: Props) {
  const [url, setUrl] = useState(inicial?.url ?? '');
  const [clave, setClave] = useState(inicial?.clave ?? '');
  const [prueba, setPrueba] = useState<{ ok: boolean; texto: string } | null>(null);
  const [probando, setProbando] = useState(false);

  const probar = async () => {
    setProbando(true);
    const r = await descargar({ url: url.trim(), clave });
    setProbando(false);
    setPrueba(r.ok ? { ok: true, texto: `Conectado. Último resumen: ${r.guardado.archivo || r.normalizado.dia?.fecha}.` } : { ok: false, texto: r.error });
  };

  const campo = [s.campo, { color: c.tinta, borderColor: c.borde, backgroundColor: c.superficie }];

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      <Text style={[s.titulo, { color: c.tinta }]}>Ajustes</Text>
      <Text style={[s.texto, { color: c.tinta2 }]}>
        La app lee el resumen diario desde el script de Google. Pega aquí la dirección que termina en /exec y la clave que pusiste en el
        script.
      </Text>

      <Text style={[s.etiqueta, { color: c.tinta2 }]}>Dirección del script</Text>
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
      <Text style={[s.etiqueta, { color: c.tinta2 }]}>Clave</Text>
      <TextInput style={campo} value={clave} onChangeText={setClave} secureTextEntry autoCapitalize="none" autoCorrect={false} />

      <View style={s.botones}>
        <Pressable style={[s.boton, { borderColor: c.acento }]} onPress={probar} disabled={probando}>
          {probando ? <ActivityIndicator color={c.acento} /> : <Text style={[s.botonTexto, { color: c.acento }]}>Probar</Text>}
        </Pressable>
        <Pressable style={[s.boton, { backgroundColor: c.acento, borderColor: c.acento }]} onPress={() => guardar({ url: url.trim(), clave })}>
          <Text style={[s.botonTexto, { color: '#fff' }]}>Guardar</Text>
        </Pressable>
      </View>
      {prueba && <Text style={[s.texto, { color: prueba.ok ? c.verde : c.rojo }]}>{prueba.texto}</Text>}
      {cerrar && (
        <Pressable onPress={cerrar} style={{ paddingVertical: 12 }}>
          <Text style={[s.botonTexto, { color: c.tinta2 }]}>← Volver</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: 16, gap: 10 },
  titulo: { fontFamily: fuentes.titulo, fontSize: 28, marginBottom: 4 },
  texto: { fontFamily: fuentes.texto, fontSize: 15, lineHeight: 21 },
  etiqueta: { fontFamily: fuentes.textoNegrita, fontSize: 13, marginTop: 8 },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fuentes.mono, fontSize: 14 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 12 },
  boton: { flex: 1, borderWidth: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonTexto: { fontFamily: fuentes.textoNegrita, fontSize: 16 },
});
