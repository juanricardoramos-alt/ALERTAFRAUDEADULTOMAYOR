/**
 * Custovia — La alarma tipo despertador del familiar (Fase 4).
 *
 * Reproduce el sonido elegido en bucle, al volumen elegido, con vibración
 * opcional — incluso con el iPhone en silencio (playsInSilentMode). La
 * configuración se guarda en el teléfono del familiar (AsyncStorage).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Vibration } from 'react-native';

import { completarConfigAlarma, ConfigAlarma, NombreSonido } from './logica';

export const SONIDOS: { id: NombreSonido; nombre: string; emoji: string }[] = [
  { id: 'clasica', nombre: 'Clásica', emoji: '⏰' },
  { id: 'sirena', nombre: 'Sirena', emoji: '🚨' },
  { id: 'campana', nombre: 'Campana', emoji: '🔔' },
];

const ARCHIVOS: Record<NombreSonido, number> = {
  clasica: require('../../assets/sonidos/clasica.wav'),
  sirena: require('../../assets/sonidos/sirena.wav'),
  campana: require('../../assets/sonidos/campana.wav'),
};

// ─── Guardar y cargar la configuración ──────────────────────────────────

const CLAVE_CONFIG = 'custovia.configAlarma';

export async function cargarConfigAlarma(): Promise<ConfigAlarma> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_CONFIG);
    return completarConfigAlarma(crudo ? JSON.parse(crudo) : null);
  } catch {
    return completarConfigAlarma(null);
  }
}

export async function guardarConfigAlarma(config: ConfigAlarma): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_CONFIG, JSON.stringify(config));
  } catch {
    // sin espacio o storage no disponible: la config vuelve al defecto
  }
}

// ─── Sonar / detener la alarma ──────────────────────────────────────────

let reproductorActivo: AudioPlayer | null = null;

/** Hace sonar la alarma según la config. Llama a detenerAlarma() para pararla. */
export async function sonarAlarma(config: ConfigAlarma): Promise<void> {
  detenerAlarma();
  try {
    // Que suene aunque el teléfono esté en modo silencio (es una alarma).
    await setAudioModeAsync({ playsInSilentMode: true });
    const reproductor = createAudioPlayer(ARCHIVOS[config.sonido]);
    reproductor.loop = true;
    reproductor.volume = config.volumen;
    reproductor.play();
    reproductorActivo = reproductor;
  } catch {
    // Si el audio falla (raro), al menos vibramos.
  }
  if (config.vibrar) {
    Vibration.vibrate([0, 500, 300, 500, 300, 900], true); // patrón repetido
  }
}

export function detenerAlarma(): void {
  try {
    reproductorActivo?.remove();
  } catch {
    /* ya estaba liberado */
  }
  reproductorActivo = null;
  Vibration.cancel();
}
