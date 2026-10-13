import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fuentes, useTextos, type Colores } from './tema';

type Props = {
  c: Colores;
  /** Clase del parte; null cierra la hoja. */
  clase: { grupo: string; inicio: string } | null;
  enviando: boolean;
  /** Resultado del último envío, para enseñarlo antes de cerrar. */
  resultado: { ok: boolean; texto: string } | null;
  enviar: (texto: string) => void;
  cerrar: () => void;
};

/**
 * Hoja para dictar el parte de una clase. El dictado lo hace el micrófono del
 * teclado de Android (o iPhone), así no hace falta ningún permiso ni conexión para escribirlo.
 */
export function DictarParte({ c, clase, enviando, resultado, enviar, cerrar }: Props) {
  const t = useTextos();
  const [texto, setTexto] = useState('');
  useEffect(() => {
    if (clase) setTexto('');
  }, [clase]);

  return (
    <Modal visible={!!clase} transparent animationType="slide" onRequestClose={cerrar}>
      <KeyboardAvoidingView style={s.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.cerrarZona} onPress={cerrar} />
        <View style={[s.hoja, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Text style={[s.titulo, { color: c.tinta }]}>{clase ? t.parteTitulo(clase.grupo, clase.inicio) : ''}</Text>
          <Text style={[s.ayuda, { color: c.tinta2 }]}>{t.parteAyuda}</Text>
          <TextInput
            style={[s.campo, { color: c.tinta, borderColor: c.borde, backgroundColor: c.superficie2 }]}
            value={texto}
            onChangeText={setTexto}
            placeholder={t.partePlaceholder}
            placeholderTextColor={c.tenue}
            multiline
            autoFocus
            textAlignVertical="top"
            editable={!enviando}
          />
          {resultado && <Text style={[s.ayuda, { color: resultado.ok ? c.verde : c.ambar }]}>{resultado.texto}</Text>}
          <View style={s.botones}>
            <Pressable style={[s.boton, { borderColor: c.borde }]} onPress={cerrar}>
              <Text style={[s.botonTexto, { color: c.tinta2 }]}>{t.cancelar}</Text>
            </Pressable>
            <Pressable
              style={[s.boton, { backgroundColor: c.acento, borderColor: c.acento, opacity: texto.trim() ? 1 : 0.5 }]}
              onPress={() => enviar(texto.trim())}
              disabled={!texto.trim() || enviando}
            >
              {enviando ? <ActivityIndicator color={c.sobreAcento} /> : <Text style={[s.botonTexto, { color: c.sobreAcento }]}>{t.enviar}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  cerrarZona: { flex: 1 },
  hoja: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  titulo: { fontFamily: fuentes.titulo, fontSize: 20 },
  ayuda: { fontFamily: fuentes.texto, fontSize: 14, lineHeight: 20 },
  campo: { minHeight: 140, maxHeight: 260, borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: fuentes.texto, fontSize: 16, lineHeight: 22 },
  botones: { flexDirection: 'row', gap: 10 },
  boton: { flex: 1, borderWidth: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonTexto: { fontFamily: fuentes.textoNegrita, fontSize: 16 },
});
