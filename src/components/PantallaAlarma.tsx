/**
 * Custovia — Pantalla de alarma del familiar (Fase 4).
 *
 * Se muestra a pantalla completa cuando llega una alerta del abuelito.
 * Suena en bucle con el sonido/volumen/vibración que configuró el
 * familiar (como un despertador) hasta que la silencia.
 */

import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { marcarFalsaAlarma } from '../servicios/alertas';
import { detenerAlarma, sonarAlarma } from '../servicios/alarma';
import { ConfigAlarma } from '../servicios/logica';
import { Alerta } from '../servicios/supabase';

interface Props {
  alerta: Alerta;
  nombreAbuelito: string;
  telefonoAbuelito: string;
  config: ConfigAlarma;
  onCerrar: () => void;
}

export default function PantallaAlarma({
  alerta,
  nombreAbuelito,
  telefonoAbuelito,
  config,
  onCerrar,
}: Props) {
  const [silenciada, setSilenciada] = useState(false);
  const esPrueba = alerta.nivel === 'prueba';

  // La alarma suena al aparecer la pantalla y se apaga al salir de ella.
  useEffect(() => {
    sonarAlarma(config);
    return () => detenerAlarma();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const silenciar = () => {
    detenerAlarma();
    setSilenciada(true);
  };

  const llamar = () => {
    silenciar();
    if (telefonoAbuelito) {
      Linking.openURL(`tel:${telefonoAbuelito}`).catch(() => undefined);
    }
  };

  const falsaAlarma = async () => {
    silenciar();
    await marcarFalsaAlarma(alerta.id);
    onCerrar();
  };

  return (
    <View style={[estilos.pantalla, esPrueba && estilos.pantallaPrueba]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.icono}>{esPrueba ? '🔔' : '🚨'}</Text>
        <Text style={estilos.titulo}>
          {esPrueba ? 'PRUEBA DE ALERTA' : '¡POSIBLE ESTAFA!'}
        </Text>
        <Text style={estilos.subtitulo}>
          {esPrueba
            ? `Así sonará una alerta de ${nombreAbuelito}.`
            : `${nombreAbuelito} está recibiendo una llamada sospechosa AHORA.`}
        </Text>

        <View style={estilos.tarjetaMotivo}>
          <Text style={estilos.etiquetaMotivo}>Lo que detectó Custovia:</Text>
          <Text style={estilos.motivo}>{alerta.motivo}</Text>
          {Boolean(alerta.fragmento) && (
            <Text style={estilos.fragmento}>{alerta.fragmento}</Text>
          )}
        </View>

        {!esPrueba && (
          <Pressable
            style={[estilos.boton, estilos.botonLlamar, !telefonoAbuelito && estilos.botonApagado]}
            onPress={llamar}
            disabled={!telefonoAbuelito}
            accessibilityRole="button"
            accessibilityLabel={`Llamar a ${nombreAbuelito} ahora`}
          >
            <Text style={estilos.textoBotonLlamar}>
              {telefonoAbuelito
                ? `📞 LLAMAR A ${nombreAbuelito.toUpperCase()}`
                : '📞 (sin teléfono guardado)'}
            </Text>
          </Pressable>
        )}

        {!silenciada ? (
          <Pressable
            style={[estilos.boton, estilos.botonSilenciar]}
            onPress={silenciar}
            accessibilityRole="button"
            accessibilityLabel="Silenciar la alarma"
          >
            <Text style={estilos.textoBoton}>🔇 SILENCIAR</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[estilos.boton, estilos.botonSilenciar]}
            onPress={onCerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar la alerta"
          >
            <Text style={estilos.textoBoton}>✔️ CERRAR</Text>
          </Pressable>
        )}

        {!esPrueba && (
          <Pressable
            style={estilos.botonFalsa}
            onPress={falsaAlarma}
            accessibilityRole="button"
            accessibilityLabel="Marcar como falsa alarma"
          >
            <Text style={estilos.textoFalsa}>Fue una falsa alarma</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B3111F',
    zIndex: 10,
  },
  pantallaPrueba: {
    backgroundColor: '#1666D6',
  },
  contenido: {
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  icono: {
    fontSize: 76,
  },
  titulo: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6,
  },
  subtitulo: {
    fontSize: 19,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 26,
  },
  tarjetaMotivo: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    width: '100%',
  },
  etiquetaMotivo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  motivo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
  },
  fragmento: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 21,
  },
  boton: {
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    width: '100%',
    marginTop: 14,
  },
  botonLlamar: {
    backgroundColor: '#FFFFFF',
  },
  botonApagado: {
    opacity: 0.5,
  },
  textoBotonLlamar: {
    color: '#0B7A3B',
    fontSize: 22,
    fontWeight: '900',
  },
  botonSilenciar: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  textoBoton: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  botonFalsa: {
    marginTop: 18,
    padding: 10,
  },
  textoFalsa: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
