import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Docente } from '../config/tipos';
import { desdeIso, isoLocal } from '../datos/calendario';
import type { Preferencias } from '../datos/fuente';
import type { MiDia } from '../datos/tipos';
import { textos } from '../i18n/textos';
import { horaRecordatorioParte, lectivosProximos, textoAviso } from './contenido';

const CANAL = 'aviso-manana';
const CANAL_PARTE = 'recordar-parte';
/** Días lectivos que se dejan programados. Cada vez que se abre la app se rehacen con lo último. */
const DIAS_PROGRAMADOS = 7;

// Con la app abierta, el aviso también se enseña.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type ResultadoAvisos = { ok: true; programados: number } | { ok: false; motivo: 'sin_permiso' | 'error'; detalle?: string };

/**
 * Borra los avisos pendientes y programa, por día lectivo, el aviso de la mañana
 * a la hora elegida y el recordatorio del parte al acabar las clases (hoy no, si
 * el parte ya salió). `pedirPermiso` solo cuando el docente activa uno de los dos.
 */
export async function programarAvisos(
  docente: Docente,
  dia: MiDia | null,
  prefs: Preferencias,
  { pedirPermiso = false, ahora = new Date(), parteHechoHoy = false } = {},
): Promise<ResultadoAvisos> {
  if (Platform.OS === 'web') return { ok: true, programados: 0 };
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!prefs.aviso.activo && !prefs.parte.recordar) return { ok: true, programados: 0 };

    let permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted && pedirPermiso && permiso.canAskAgain) permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return { ok: false, motivo: 'sin_permiso' };

    const t = textos(prefs.idioma);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: t.canalAviso,
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync(CANAL_PARTE, {
        name: t.canalParte,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const [h, m] = prefs.aviso.hora.split(':').map(Number);
    const hoy = isoLocal(ahora);
    let programados = 0;
    for (const fecha of lectivosProximos(docente, hoy, DIAS_PROGRAMADOS + 1).slice(0, DIAS_PROGRAMADOS + 1)) {
      if (prefs.aviso.activo) {
        const cuando = desdeIso(fecha);
        cuando.setHours(h, m, 0, 0);
        const texto = cuando > ahora ? textoAviso(docente, dia, fecha, prefs.idioma) : null;
        if (texto) {
          await Notifications.scheduleNotificationAsync({
            content: { title: texto.titulo, body: texto.cuerpo, data: { fecha } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
          });
          programados++;
        }
      }
      const horaParte = prefs.parte.recordar && !(fecha === hoy && parteHechoHoy) ? horaRecordatorioParte(docente, fecha) : null;
      if (horaParte) {
        const [hp, mp] = horaParte.split(':').map(Number);
        const cuando = desdeIso(fecha);
        cuando.setHours(hp, mp, 0, 0);
        if (cuando > ahora) {
          await Notifications.scheduleNotificationAsync({
            content: { title: t.recordarParteTitulo, body: t.recordarParteCuerpo, data: { fecha, abrir: 'parte' } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL_PARTE },
          });
          programados++;
        }
      }
    }
    return { ok: true, programados };
  } catch (e) {
    return { ok: false, motivo: 'error', detalle: String(e).slice(0, 200) };
  }
}
