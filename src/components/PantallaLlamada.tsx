/**
 * Custovia — Pantalla de llamada del abuelito.
 *
 * Es LA pantalla de la app del adulto mayor: semáforo a pantalla completa,
 * transcripción en vivo y un botón gigante de COLGAR. Sin menús.
 *
 * Accesibilidad: cada color va SIEMPRE acompañado de un ícono grande y un
 * texto enorme (daltonismo y cataratas son comunes a esta edad). El estado
 * rojo además vibra fuerte con un patrón distintivo y avisa con voz.
 */

import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import {
  analizarBloque,
  crearAnalisis,
  EstadoAnalisis,
} from '../brain/analizador';
import {
  analizarConIA,
  combinarConIA,
  debeConsultarIA,
  iaConfigurada,
  peorVeredicto,
  PUNTOS_NIVEL_IA,
  VeredictoIA,
} from '../brain/ia';
import { NivelRiesgo, TipoLlamante } from '../brain/reglas';

/** Cuánto se demora en "escuchar" cada bloque (simula 10-15 s de llamada). */
const MS_ENTRE_BLOQUES = 2500;
const MS_PRIMER_BLOQUE = 1000;

const APARIENCIA: Record<
  NivelRiesgo,
  { fondo: string; textoPrincipal: string; icono: string; titulo: string; subtitulo: string }
> = {
  verde: {
    fondo: '#0B7A3B',
    textoPrincipal: '#FFFFFF',
    icono: '✅',
    titulo: 'LLAMADA SEGURA',
    subtitulo: 'Número de confianza',
  },
  amarillo: {
    fondo: '#F5C518',
    textoPrincipal: '#231F00',
    icono: '❓',
    titulo: 'ANALIZANDO…',
    subtitulo: 'Número desconocido. Precaución.',
  },
  naranja: {
    fondo: '#D96708',
    textoPrincipal: '#FFFFFF',
    icono: '⚠️',
    titulo: 'PRECAUCIÓN',
    subtitulo: 'Hay señales sospechosas',
  },
  rojo: {
    fondo: '#B3111F',
    textoPrincipal: '#FFFFFF',
    icono: '🚨',
    titulo: '¡POSIBLE ESTAFA!',
    subtitulo: 'No entregue claves ni datos. Corte la llamada.',
  },
};

const ETIQUETA_LLAMANTE: Record<TipoLlamante, string> = {
  contacto: '💚 Francisca (nieta) · contacto guardado',
  institucional: '🏦 600 600 1234 · número institucional',
  desconocido: '📵 +56 9 5555 1234 · número desconocido',
};

interface Props {
  tipoLlamante: TipoLlamante;
  bloques: string[];
  onColgar: () => void;
}

export default function PantallaLlamada({ tipoLlamante, bloques, onColgar }: Props) {
  const [estado, setEstado] = useState<EstadoAnalisis>(() => crearAnalisis(tipoLlamante));
  const [mostrados, setMostrados] = useState<string[]>([]);
  const nivelPrevio = useRef<NivelRiesgo>(estado.nivel);
  const scrollRef = useRef<ScrollView>(null);

  // Capa de IA (Fase 2): veredicto de la API de Claude sobre la conversación.
  const [veredictoIA, setVeredictoIA] = useState<VeredictoIA | null>(null);
  const [iaAnalizando, setIaAnalizando] = useState(false);
  const iaEnVuelo = useRef(false);
  const ultimoBloqueAnalizado = useRef(0);
  const montado = useRef(true);
  useEffect(() => {
    return () => {
      montado.current = false;
    };
  }, []);

  // Lo que ve el abuelito: reglas locales + IA combinadas (el más alto manda).
  const estadoFinal = combinarConIA(estado, veredictoIA);

  const terminado = mostrados.length >= bloques.length;

  // Va "escuchando" la llamada: procesa un bloque cada pocos segundos.
  useEffect(() => {
    if (terminado) return;
    const timer = setTimeout(
      () => {
        const bloque = bloques[mostrados.length];
        setEstado((e) => analizarBloque(e, bloque));
        setMostrados((m) => [...m, bloque]);
      },
      mostrados.length === 0 ? MS_PRIMER_BLOQUE : MS_ENTRE_BLOQUES
    );
    return () => clearTimeout(timer);
  }, [mostrados.length, terminado, bloques]);

  // Capa de IA: tras cada bloque nuevo envía la conversación acumulada a la
  // API de Claude. Corre en paralelo: si falla o no hay internet, el semáforo
  // de reglas locales sigue funcionando igual.
  useEffect(() => {
    if (mostrados.length === 0 || mostrados.length <= ultimoBloqueAnalizado.current) return;
    if (iaEnVuelo.current) return; // ya hay un análisis en curso; al volver se retoma
    if (!debeConsultarIA(tipoLlamante, estado.puntaje, veredictoIA)) return;

    iaEnVuelo.current = true;
    ultimoBloqueAnalizado.current = mostrados.length;
    setIaAnalizando(true);
    analizarConIA(mostrados.join('\n')).then((nuevo) => {
      iaEnVuelo.current = false;
      if (!montado.current) return;
      setIaAnalizando(false);
      if (nuevo) {
        // El riesgo nunca baja durante la llamada: se conserva el peor veredicto.
        setVeredictoIA((previo) => peorVeredicto(previo, nuevo));
      }
    });
  }, [mostrados.length, iaAnalizando, tipoLlamante, estado.puntaje, veredictoIA]);

  // Reacciones físicas cuando cambia el nivel de riesgo (reglas + IA).
  useEffect(() => {
    const anterior = nivelPrevio.current;
    nivelPrevio.current = estadoFinal.nivel;
    if (estadoFinal.nivel === anterior) return;

    if (estadoFinal.nivel === 'rojo') {
      // Vibración fuerte y distintiva: solo significa PELIGRO.
      Vibration.vibrate([0, 500, 200, 500, 200, 900]);
      // Voz suave al oído: durante la llamada no se ve la pantalla.
      try {
        Speech.speak('Precaución. Posible estafa. No entregue claves ni datos.', {
          language: 'es',
        });
      } catch {
        // Si el dispositivo no tiene voz en español, seguimos sin audio.
      }
    } else if (estadoFinal.nivel === 'naranja') {
      Vibration.vibrate(300);
    }
  }, [estadoFinal.nivel]);

  // Al salir de la pantalla se apaga todo.
  useEffect(() => {
    return () => {
      Vibration.cancel();
      Speech.stop();
    };
  }, []);

  const apariencia = APARIENCIA[estadoFinal.nivel];
  const puntajeVisible = Math.min(estadoFinal.puntaje, 100);
  const puntosIA = veredictoIA ? PUNTOS_NIVEL_IA[veredictoIA.nivel] : 0;

  return (
    <View style={[estilos.pantalla, { backgroundColor: apariencia.fondo }]}>
      {/* Quién llama */}
      <Text style={[estilos.llamante, { color: apariencia.textoPrincipal }]}>
        {ETIQUETA_LLAMANTE[tipoLlamante]}
      </Text>

      {/* Estado de la capa de IA (solo aplica a números desconocidos) */}
      {tipoLlamante === 'desconocido' && (
        <Text style={[estilos.estadoIA, { color: apariencia.textoPrincipal }]}>
          {!iaConfigurada()
            ? '🧠 IA no configurada — analizando solo con reglas locales'
            : iaAnalizando
              ? '🧠 IA de Claude analizando…'
              : '🧠 IA de Claude vigilando'}
        </Text>
      )}

      {/* Semáforo: ícono + texto gigante (nunca solo color) */}
      <View style={estilos.semaforo}>
        <Text style={estilos.icono}>{apariencia.icono}</Text>
        <Text style={[estilos.titulo, { color: apariencia.textoPrincipal }]}>
          {apariencia.titulo}
        </Text>
        <Text style={[estilos.subtitulo, { color: apariencia.textoPrincipal }]}>
          {apariencia.subtitulo}
        </Text>
      </View>

      {/* Sugerencia de verificación (estado naranja) */}
      {estadoFinal.preguntaSugerida && (
        <View style={estilos.tarjetaOscura}>
          <Text style={estilos.textoTarjeta}>💬 {estadoFinal.preguntaSugerida}</Text>
        </View>
      )}

      {/* Aviso de alerta a la familia (estado rojo) */}
      {estadoFinal.nivel === 'rojo' && (
        <View style={estilos.tarjetaOscura}>
          <Text style={estilos.textoTarjeta}>
            🔔 Su familia ya fue avisada (simulado en esta versión)
          </Text>
        </View>
      )}

      {/* Barra de riesgo */}
      <View style={estilos.filaRiesgo}>
        <Text style={[estilos.etiquetaRiesgo, { color: apariencia.textoPrincipal }]}>
          Riesgo {puntajeVisible}/100
        </Text>
        <View style={estilos.barraFondo}>
          <View style={[estilos.barraRelleno, { width: `${puntajeVisible}%` }]} />
        </View>
      </View>

      {/* Señales detectadas (reglas locales + veredicto de la IA) */}
      {(estadoFinal.senales.length > 0 || puntosIA > 0) && (
        <View style={estilos.senales}>
          {estadoFinal.senales.map((s) => (
            <Text key={s.idRegla} style={estilos.senal}>
              🚩 {s.descripcion} (+{s.puntos})
            </Text>
          ))}
          {veredictoIA && puntosIA > 0 && (
            <Text style={estilos.senal}>
              🧠 IA: {veredictoIA.motivo} (+{puntosIA})
            </Text>
          )}
        </View>
      )}

      {/* Transcripción en vivo */}
      <ScrollView
        ref={scrollRef}
        style={estilos.transcripcion}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {mostrados.map((bloque, i) => (
          <Text
            key={i}
            style={[
              estilos.bloqueTexto,
              i === mostrados.length - 1 && !terminado && estilos.bloqueActual,
            ]}
          >
            {bloque}
          </Text>
        ))}
        {!terminado && <Text style={estilos.escuchando}>🎙️ escuchando…</Text>}
        {terminado && <Text style={estilos.escuchando}>— fin de la simulación —</Text>}
      </ScrollView>

      {/* Botón gigante de colgar: la única acción del abuelito */}
      <Pressable
        onPress={() => {
          Vibration.cancel();
          Speech.stop();
          onColgar();
        }}
        style={({ pressed }) => [estilos.botonColgar, pressed && estilos.botonColgarPresionado]}
        accessibilityRole="button"
        accessibilityLabel="Colgar la llamada"
      >
        <Text style={estilos.textoColgar}>📵 COLGAR</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  llamante: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  estadoIA: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.85,
    marginBottom: 8,
  },
  semaforo: {
    alignItems: 'center',
    marginVertical: 10,
  },
  icono: {
    fontSize: 84,
  },
  titulo: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitulo: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  tarjetaOscura: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  textoTarjeta: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  filaRiesgo: {
    marginTop: 14,
  },
  etiquetaRiesgo: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  barraFondo: {
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  senales: {
    marginTop: 10,
  },
  senal: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    overflow: 'hidden',
  },
  transcripcion: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  bloqueTexto: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 10,
  },
  bloqueActual: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  escuchando: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  botonColgar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 4,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  botonColgarPresionado: {
    opacity: 0.7,
  },
  textoColgar: {
    color: '#B3111F',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
