/**
 * Custovia — Selector de modo (Fase 4).
 *
 * Primera pantalla al instalar: ¿este teléfono es del abuelito o de un
 * familiar? Una sola app, dos modos (más simple que dos apps separadas).
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onElegir: (modo: 'abuelito' | 'familia') => void;
  ocupado: boolean;
}

export default function PantallaModo({ onElegir, ocupado }: Props) {
  return (
    <View style={estilos.fondo}>
      <Text style={estilos.logo}>🛡️ Custovia</Text>
      <Text style={estilos.eslogan}>Protección contra estafas telefónicas</Text>

      <Text style={estilos.pregunta}>¿De quién es este teléfono?</Text>

      <Pressable
        style={[estilos.tarjeta, estilos.tarjetaAbuelito]}
        onPress={() => onElegir('abuelito')}
        disabled={ocupado}
        accessibilityRole="button"
        accessibilityLabel="Este teléfono es del adulto mayor"
      >
        <Text style={estilos.iconoTarjeta}>👴</Text>
        <Text style={estilos.tituloTarjeta}>Es mi teléfono</Text>
        <Text style={estilos.detalleTarjeta}>
          Soy el adulto mayor. La app vigilará mis llamadas con el semáforo.
        </Text>
      </Pressable>

      <Pressable
        style={[estilos.tarjeta, estilos.tarjetaFamilia]}
        onPress={() => onElegir('familia')}
        disabled={ocupado}
        accessibilityRole="button"
        accessibilityLabel="Soy un familiar que recibirá las alertas"
      >
        <Text style={estilos.iconoTarjeta}>👨‍👩‍👧</Text>
        <Text style={estilos.tituloTarjeta}>Soy familiar</Text>
        <Text style={estilos.detalleTarjeta}>
          Me vincularé con mi abuelito(a) y recibiré las alertas al instante.
        </Text>
      </Pressable>

      {ocupado && <ActivityIndicator size="large" color="#12263A" style={{ marginTop: 20 }} />}

      <Text style={estilos.nota}>Podrás cambiar de modo cuando quieras.</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: '#F2F5F9',
    padding: 24,
    paddingTop: 90,
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    color: '#12263A',
  },
  eslogan: {
    fontSize: 16,
    textAlign: 'center',
    color: '#3A4A5E',
    marginTop: 4,
    marginBottom: 34,
  },
  pregunta: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#12263A',
    marginBottom: 18,
  },
  tarjeta: {
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
  },
  tarjetaAbuelito: {
    backgroundColor: '#E9F7EE',
    borderColor: '#12A150',
  },
  tarjetaFamilia: {
    backgroundColor: '#E8F0FE',
    borderColor: '#1666D6',
  },
  iconoTarjeta: {
    fontSize: 46,
  },
  tituloTarjeta: {
    fontSize: 24,
    fontWeight: '900',
    color: '#12263A',
    marginTop: 6,
  },
  detalleTarjeta: {
    fontSize: 15,
    color: '#3A4A5E',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  nota: {
    fontSize: 13,
    color: '#7A8699',
    textAlign: 'center',
    marginTop: 10,
  },
});
