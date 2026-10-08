import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { FamiljenGrotesk_600SemiBold, FamiljenGrotesk_700Bold } from '@expo-google-fonts/familjen-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import docenteJson from './src/config/docente.json';
import type { Docente } from './src/config/tipos';
import { isoLocal } from './src/datos/calendario';
import {
  actualizar,
  guardarAjustes,
  guardarHechos,
  leerAjustes,
  leerGuardado,
  leerHechos,
  type Ajustes as TAjustes,
  type Guardado,
} from './src/datos/fuente';
import { normalizar } from './src/datos/normalizar';
import { construirVista } from './src/datos/vista';
import { Ajustes } from './src/pantallas/Ajustes';
import { Hoy } from './src/pantallas/Hoy';
import { useColores } from './src/ui/tema';

const docente = docenteJson as Docente;
const REFRESCO_AUTO_MS = 5 * 60_000;

export default function App() {
  const [fuentesListas] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });
  const c = useColores();
  const oscuro = useColorScheme() === 'dark';

  const [cargado, setCargado] = useState(false);
  const [ajustes, setAjustes] = useState<TAjustes | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [guardado, setGuardado] = useState<Guardado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const ultimoIntento = useRef(0);

  const hoy = isoLocal(ahora);

  // Primer arranque: lo guardado en el móvil, sin esperar a la red.
  useEffect(() => {
    (async () => {
      const [a, g] = await Promise.all([leerAjustes(), leerGuardado()]);
      setAjustes(a);
      setGuardado(g);
      setVerAjustes(!a?.url);
      setCargado(true);
    })();
  }, []);

  useEffect(() => {
    leerHechos(hoy).then(setHechos);
  }, [hoy]);

  const refrescar = useCallback(async () => {
    if (!ajustes?.url) return;
    ultimoIntento.current = Date.now();
    setRefrescando(true);
    const r = await actualizar(ajustes);
    if (r.ok) {
      setGuardado(r.guardado);
      setError(null);
    } else {
      setError(r.error);
    }
    setAhora(new Date());
    setRefrescando(false);
  }, [ajustes]);

  // Al abrir y al volver a la app: actualiza si hace más de 5 minutos del último intento.
  useEffect(() => {
    if (cargado && ajustes?.url) refrescar();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      setAhora(new Date());
      if (Date.now() - ultimoIntento.current > REFRESCO_AUTO_MS) refrescar();
    });
    return () => sub.remove();
  }, [cargado, ajustes, refrescar]);

  // Reloj para «Ahora» y «Siguiente».
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const normalizado = useMemo(() => (guardado ? normalizar(guardado.datos) : null), [guardado]);
  const vista = useMemo(
    () =>
      construirVista({
        docente,
        ahora,
        dia: normalizado?.dia ?? null,
        problemas: normalizado?.problemas,
        errorDescarga: error,
      }),
    [ahora, normalizado, error],
  );

  const alternar = useCallback(
    (id: string) => {
      setHechos((prev) => {
        const s = new Set(prev);
        if (s.has(id)) s.delete(id);
        else s.add(id);
        guardarHechos(hoy, s);
        return s;
      });
    },
    [hoy],
  );

  if (!fuentesListas || !cargado) return <View style={{ flex: 1, backgroundColor: c.fondo }} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.fondo }} edges={['top', 'left', 'right']}>
        <StatusBar style={oscuro ? 'light' : 'dark'} />
        {verAjustes ? (
          <Ajustes
            c={c}
            inicial={ajustes}
            cerrar={() => setVerAjustes(false)}
            guardar={async (a) => {
              await guardarAjustes(a);
              setAjustes(a);
              setVerAjustes(false);
            }}
          />
        ) : (
          <Hoy
            c={c}
            v={vista}
            hechos={hechos}
            alternar={alternar}
            refrescando={refrescando}
            refrescar={refrescar}
            descargadoEn={guardado?.descargadoEn ?? null}
            abrirAjustes={() => setVerAjustes(true)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
