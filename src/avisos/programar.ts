import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Docente } from '../config/tipos';
import { desdeIso, isoLocal } from '../datos/calendario';
import type { Preferencias } from '../datos/fuente';
import type { MiDia } from '../datos/tipos';
import { textos } from '../i18n/textos';
import { lectivosProximos, textoAviso } from './contenido';

const CANAL = 'aviso-manana';
/** Días lectivos que se dejan programados. Cada vez que se abre la app se rehacen con lo último. */
const DIAS_PROGRAMADOS = 7;

// Con la app abierta, el aviso también se enseña.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type ResultadoAvisos = { ok: true; programados: number } | { ok: false; motivo: 'sin_permiso' | 'error'; detalle?: string };

/**
 * Borra los avisos pendientes y programa uno por día lectivo a la hora elegida,
 * con el contenido calculado ahora. `pedirPermiso` solo cuando lo activa el docente.
 */
export async function programarAvisos(
  docente: Docente,
  dia: MiDia | null,
  prefs: Preferencias,
  { pedirPermiso = false, ahora = new Date() } = {},
): Promise<ResultadoAvisos> {
  if (Platform.OS === 'web') return { ok: true, programados: 0 };
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!prefs.aviso.activo) return { ok: true, programados: 0 };

    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && pedirPermiso && permiso.canAskAgain) permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return { ok: false, motivo: 'sin_permiso' };

    const t = textos(prefs.idioma);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: t.canalAviso,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const [h, m] = prefs.aviso.hora.split(':').map(Number);
    let programados = 0;
    for (const fecha of lectivosProximos(docente, isoLocal(ahora), DIAS_PROGRAMADOS + 1)) {
      const cuando = desdeIso(fecha);
      cuando.setHours(h, m, 0, 0);
      if (cuando <= ahora) continue;
      const texto = textoAviso(docente, dia, fecha, prefs.idioma);
      if (!texto) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: texto.titulo, body: texto.cuerpo, data: { fecha } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
      });
      if (++programados >= DIAS_PROGRAMADOS) break;
    }
    return { ok: true, programados };
  } catch (e) {
    return { ok: false, motivo: 'error', detalle: String(e).slice(0, 200) };
  }
}
