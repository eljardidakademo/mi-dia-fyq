import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { FamiljenGrotesk_600SemiBold, FamiljenGrotesk_700Bold } from '@expo-google-fonts/familjen-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Platform, View } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { programarAvisos, type ResultadoAvisos } from './src/avisos/programar';
import docenteJson from './src/config/docente.json';
import type { Docente } from './src/config/tipos';
import { fechaCorta, isoLocal } from './src/datos/calendario';
import {
  enviarCola,
  idParteDia,
  leerCola,
  leerEstadosPartes,
  mandarOEncolar,
  PARTE_DIA,
  type EstadoParte,
  type Parte,
} from './src/datos/partes';
import {
  actualizar,
  esperarResumenNuevo,
  guardarAjustes,
  guardarHechos,
  guardarPreferencias,
  leerAjustes,
  leerGuardado,
  leerHechos,
  leerPreferencias,
  mismoContenido,
  pedirResumenNuevo,
  PREFERENCIAS_INICIALES,
  textoError,
  type Ajustes as TAjustes,
  type ErrorDescarga,
  type Guardado,
  type Preferencias,
} from './src/datos/fuente';
import { textos } from './src/i18n/textos';
import { normalizar } from './src/datos/normalizar';
import { construirVista, type Vista } from './src/datos/vista';
import { Ajustes } from './src/pantallas/Ajustes';
import { Hoy } from './src/pantallas/Hoy';
import { Semana } from './src/pantallas/Semana';
import { construirSemana } from './src/datos/semana';
import { DictarParte } from './src/ui/DictarParte';
import { ProveedorIdioma, useColoresDe } from './src/ui/tema';
import { NOMBRE_WIDGET } from './src/widget/WidgetHoy';
import { pintarWidgets } from './src/widget/tarea';

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
  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_INICIALES);
  const c = useColoresDe(prefs.tema);
  const t = textos(prefs.idioma);

  const [cargado, setCargado] = useState(false);
  const [ajustes, setAjustes] = useState<TAjustes | null>(null);
  const [verAjustes, setVerAjustes] = useState(false);
  const [verSemana, setVerSemana] = useState(false);
  const [guardado, setGuardado] = useState<Guardado | null>(null);
  const [error, setError] = useState<ErrorDescarga | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [avisoPedido, setAvisoPedido] = useState<{ ok: boolean; texto: string } | null>(null);
  const [estadoAvisos, setEstadoAvisos] = useState<ResultadoAvisos | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const ultimoIntento = useRef(0);

  const hoy = isoLocal(ahora);

  // Primer arranque: lo guardado en el móvil, sin esperar a la red.
  useEffect(() => {
    (async () => {
      const [a, g, p] = await Promise.all([leerAjustes(), leerGuardado(), leerPreferencias()]);
      setAjustes(a);
      setGuardado(g);
      setPrefs(p);
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
    // Primero los partes que se quedaron sin enviar, para que el resumen los tenga.
    if (await enviarCola(ajustes)) leerPartes();
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

  // Pide a la tarea de Claude un resumen nuevo y espera a que llegue.
  // Espera a que la tarea deje un resumen distinto de `previo` y lo enseña.
  const esperarNuevo = useCallback(
    async (a: TAjustes, previo: Guardado | null) => {
      setPidiendo(true);
      const r = await esperarResumenNuevo(a, previo?.archivo ?? '');
      if (r.ok) {
        setGuardado(r.guardado);
        setError(null);
        const estadoA = normalizar(r.guardado.datos).dia?.registroEstadoA;
        const igual = !!previo && mismoContenido(previo.datos, r.guardado.datos);
        setAvisoPedido({ ok: true, texto: igual && estadoA ? t.resumenSinCambios(estadoA) : t.resumenNuevoListo });
      } else {
        setAvisoPedido({ ok: false, texto: textoError(r.error, prefs.idioma) });
      }
      ultimoIntento.current = Date.now();
      setAhora(new Date());
      setPidiendo(false);
    },
    [prefs.idioma, t],
  );

  // Pide a la tarea de Claude un resumen nuevo y espera a que llegue.
  const pedirResumen = useCallback(async () => {
    if (!ajustes?.url || pidiendo) return;
    setPidiendo(true);
    setAvisoPedido(null);
    const previo = guardado;
    const p = await pedirResumenNuevo(ajustes);
    if (!p.ok) {
      setAvisoPedido({ ok: false, texto: textoError(p.error, prefs.idioma) });
      setPidiendo(false);
      return;
    }
    await esperarNuevo(ajustes, previo);
  }, [ajustes, pidiendo, guardado, prefs.idioma, esperarNuevo]);

  // Partes de clase dictados: estado por clase de hoy y los que esperan conexión.
  const [parteAbierto, setParteAbierto] = useState(false);
  // Las sesiones de hoy van con el parte para que la tarea sepa de qué clases habla.
  const vistaRef = useRef<Vista | null>(null);
  const [enviandoParte, setEnviandoParte] = useState(false);
  const [resultadoParte, setResultadoParte] = useState<{ ok: boolean; texto: string } | null>(null);
  const [estadosPartes, setEstadosPartes] = useState<Record<string, EstadoParte>>({});
  const [partesEnCola, setPartesEnCola] = useState(0);

  const leerPartes = useCallback(async () => {
    const [e, cola] = await Promise.all([leerEstadosPartes(hoy), leerCola()]);
    setEstadosPartes(e);
    setPartesEnCola(cola.length);
  }, [hoy]);
  useEffect(() => {
    leerPartes();
  }, [leerPartes]);

  const enviarParteDictado = useCallback(
    async (texto: string) => {
      if (!ajustes) return;
      setEnviandoParte(true);
      const sesiones = (vistaRef.current?.franjas ?? [])
        .flatMap((f) => (f.tipo === 'clase' ? [`${f.inicio} ${f.codigo}${f.sesion ? ' ' + f.sesion : ''}`] : []))
        .join(', ');
      const parte: Parte = {
        id: idParteDia(hoy),
        fecha: hoy,
        ...PARTE_DIA,
        sesion: sesiones,
        texto,
        creadoEn: new Date().toISOString(),
      };
      const previo = guardado;
      const r = await mandarOEncolar(ajustes, parte);
      await leerPartes();
      setEnviandoParte(false);
      if (!r.ok) {
        setResultadoParte({ ok: false, texto: t.parteEnCola(textoError(r.error, prefs.idioma)) });
        return;
      }
      setParteAbierto(false);
      setResultadoParte(null);
      setAvisoPedido({ ok: true, texto: r.lanzado ? t.parteOk : t.parteOkSinTarea });
      if (r.lanzado && !pidiendo) await esperarNuevo(ajustes, previo);
    },
    [ajustes, hoy, guardado, leerPartes, t, prefs.idioma, pidiendo, esperarNuevo],
  );

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
        idioma: prefs.idioma,
      }),
    [ahora, normalizado, error, prefs.idioma],
  );
  vistaRef.current = vista;
  // Botón «atrás» de Android: de Semana o Ajustes vuelve a Hoy en vez de cerrar la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (verSemana) {
        setVerSemana(false);
        return true;
      }
      if (verAjustes && ajustes?.url) {
        setVerAjustes(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [verSemana, verAjustes, ajustes]);

  const semana = useMemo(
    () => construirSemana(docente, normalizado?.dia ?? null, ahora, prefs.idioma),
    [ahora, normalizado, prefs.idioma],
  );

  // Avisos y widget se rehacen con cada resumen nuevo y con cada cambio de preferencias.
  const pedirPermisoAviso = useRef(false);
  useEffect(() => {
    if (!cargado) return;
    const pedirPermiso = pedirPermisoAviso.current;
    pedirPermisoAviso.current = false;
    programarAvisos(docente, normalizado?.dia ?? null, prefs, { pedirPermiso }).then(setEstadoAvisos);
    pintarWidgets(guardado, prefs);
  }, [cargado, normalizado, guardado, prefs]);

  const cambiarPrefs = useCallback((p: Preferencias) => {
    setPrefs((antes) => {
      if (p.aviso.activo && !antes.aviso.activo) pedirPermisoAviso.current = true;
      return p;
    });
    guardarPreferencias(p);
  }, []);

  const textoEstadoAvisos = !estadoAvisos
    ? null
    : estadoAvisos.ok
      ? t.avisosProgramados(estadoAvisos.programados)
      : estadoAvisos.motivo === 'sin_permiso'
        ? t.avisoSinPermiso
        : (estadoAvisos.detalle ?? null);

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
    <ProveedorIdioma value={prefs.idioma}>
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.fondo }} edges={['top', 'left', 'right']}>
        <StatusBar style={c.oscuro ? 'light' : 'dark'} />
        {verAjustes ? (
          <Ajustes
            c={c}
            inicial={ajustes}
            cerrar={ajustes?.url ? () => setVerAjustes(false) : undefined}
            guardar={async (a) => {
              await guardarAjustes(a);
              setAjustes(a);
              setVerAjustes(false);
            }}
            prefs={prefs}
            cambiarPrefs={cambiarPrefs}
            estadoAvisos={textoEstadoAvisos}
            anadirWidget={Platform.OS === 'android' ? () => requestPinWidget({ widgetName: NOMBRE_WIDGET }) : undefined}
          />
        ) : verSemana ? (
          <Semana
            c={c}
            s={semana}
            volver={() => setVerSemana(false)}
            refrescando={refrescando}
            refrescar={refrescar}
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
            abrirSemana={() => setVerSemana(true)}
            pidiendo={pidiendo}
            pedirResumen={pedirResumen}
            aviso={avisoPedido}
            abrirParte={() => {
              setResultadoParte(null);
              setParteAbierto(true);
            }}
            estadoParte={estadosPartes[idParteDia(hoy)]}
            partesEnCola={partesEnCola}
          />
        )}
        <DictarParte
          c={c}
          abierto={parteAbierto}
          titulo={t.parteTitulo(fechaCorta(hoy, prefs.idioma))}
          enviando={enviandoParte}
          resultado={resultadoParte}
          enviar={enviarParteDictado}
          cerrar={() => setParteAbierto(false)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
    </ProveedorIdioma>
  );
}
