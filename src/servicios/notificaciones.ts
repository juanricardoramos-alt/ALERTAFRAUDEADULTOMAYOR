/**
 * Custovia — Notificaciones push (Fase 4).
 *
 * Realidad importante: Expo Go ya NO soporta notificaciones push remotas.
 * Por eso todo aquí falla "con gracia": en Expo Go la familia igual recibe
 * las alertas por Realtime con la app abierta, y las push (app cerrada)
 * se activan cuando compilas el development build con EAS (ver README).
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NombreSonido } from './logica';

/** Al recibir una notificación con la app abierta, mostrarla igual. */
export function configurarManejadorNotificaciones(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // En Expo Go puede no estar disponible: no pasa nada.
  }
}

/**
 * Android exige "canales" de notificación, y el sonido de un canal queda
 * fijo al crearlo. Por eso creamos un canal por cada sonido de alarma:
 * el push del abuelito llega por el canal del sonido que eligió CADA
 * familiar (alertas-clasica / alertas-sirena / alertas-campana).
 */
export async function crearCanalesDeAlerta(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const sonidos: NombreSonido[] = ['clasica', 'sirena', 'campana'];
  for (const sonido of sonidos) {
    try {
      await Notifications.setNotificationChannelAsync(`alertas-${sonido}`, {
        name: `Alertas Custovia (${sonido})`,
        importance: Notifications.AndroidImportance.MAX,
        sound: `${sonido}.wav`, // empaquetado vía app.json → expo-notifications
        vibrationPattern: [0, 500, 200, 500, 200, 900],
        enableVibrate: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    } catch {
      // Expo Go: los canales con sonido propio requieren development build.
    }
  }
}

/**
 * Pide permiso y obtiene el token push de Expo de este teléfono.
 * Devuelve null si no se puede (Expo Go, permiso denegado, sin proyecto
 * EAS todavía) — la app sigue funcionando con Realtime.
 */
export async function obtenerPushToken(): Promise<string | null> {
  try {
    const permiso = await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return null;

    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null; // aún sin `eas init` (ver README)

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch {
    return null;
  }
}
