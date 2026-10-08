import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { datosWidget } from '../avisos/contenido';
import { programarAvisos } from '../avisos/programar';
import docenteJson from '../config/docente.json';
import type { Docente } from '../config/tipos';
import { isoLocal } from '../datos/calendario';
import { actualizar, leerAjustes, leerGuardado, leerPreferencias, type Guardado, type Preferencias } from '../datos/fuente';
import { normalizar } from '../datos/normalizar';
import { coloresDe } from '../ui/tema';
import { NOMBRE_WIDGET, WidgetHoy } from './WidgetHoy';

const docente = docenteJson as Docente;
/** El widget se refresca cada 30 min; si lo descargado tiene más de esto, vuelve a descargar. */
const DESCARGA_VIEJA_MS = 25 * 60_000;

function representar(guardado: Guardado | null, prefs: Preferencias, actualizando = false) {
  const ahora = new Date();
  const dia = guardado ? normalizar(guardado.datos).dia : null;
  const d = datosWidget(docente, dia, ahora, isoLocal(ahora), prefs.idioma);
  const props = { d, idioma: prefs.idioma, actualizando };
  // Laboratorio sigue el modo del móvil: se dan las dos versiones y Android elige.
  if (prefs.tema === 'laboratorio') {
    return {
      light: <WidgetHoy {...props} c={coloresDe('laboratorio', false)} />,
      dark: <WidgetHoy {...props} c={coloresDe('laboratorio', true)} />,
    };
  }
  return <WidgetHoy {...props} c={coloresDe(prefs.tema, false)} />;
}

/** Repinta los widgets del escritorio con lo guardado. La app lo llama tras descargar o cambiar ajustes. */
export async function pintarWidgets(guardado?: Guardado | null, prefs?: Preferencias) {
  if (Platform.OS !== 'android') return;
  const [g, p] = await Promise.all([guardado === undefined ? leerGuardado() : guardado, prefs ?? leerPreferencias()]);
  await requestWidgetUpdate({ widgetName: NOMBRE_WIDGET, renderWidget: () => representar(g, p) }).catch(() => {});
}

/** Lo que hace Android con el widget cuando la app está cerrada. */
export async function tareaWidget({ widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  const prefs = await leerPreferencias();
  let guardado = await leerGuardado();

  const pulsado = widgetAction === 'WIDGET_CLICK' && clickAction === 'ACTUALIZAR';
  if (widgetAction === 'WIDGET_CLICK' && !pulsado) return;
  const viejo = !guardado || Date.now() - new Date(guardado.descargadoEn).getTime() > DESCARGA_VIEJA_MS;

  if (pulsado || viejo) {
    const ajustes = await leerAjustes();
    if (ajustes?.url) {
      if (pulsado) renderWidget(representar(guardado, prefs, true));
      const r = await actualizar(ajustes);
      if (r.ok) {
        guardado = r.guardado;
        // De paso, rehace los avisos con lo nuevo (por si la app lleva días sin abrirse).
        await programarAvisos(docente, r.normalizado.dia, prefs);
      }
    }
  }
  renderWidget(representar(guardado, prefs));
}
