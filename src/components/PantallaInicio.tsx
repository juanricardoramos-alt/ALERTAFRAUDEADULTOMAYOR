/**
 * Custovia — Pantalla de inicio del prototipo (modo simulación).
 *
 * Esta pantalla es para quien hace la DEMO (tú), no para el abuelito:
 * aquí eliges quién llama y pegas la conversación a simular. En fases
 * futuras esta pantalla desaparece y la app queda "invisible" hasta
 * que entra una llamada real.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EJEMPLOS } from '../brain/ejemplos';
import { TipoLlamante } from '../brain/reglas';

const TIPOS: { tipo: TipoLlamante; icono: string; nombre: string; detalle: string }[] = [
  {
    tipo: 'desconocido',
    icono: '📵',
    nombre: 'Desconocido',
    detalle: 'Se analiza todo',
  },
  {
    tipo: 'institucional',
    icono: '🏦',
    nombre: 'Institucional (600)',
    detalle: 'Vigilancia anti-spoofing',
  },
  {
    tipo: 'contacto',
    icono: '💚',
    nombre: 'Contacto guardado',
    detalle: 'Pasa directo',
  },
];

interface Props {
  onIniciar: (tipo: TipoLlamante, texto: string) => void;
}

export default function PantallaInicio({ onIniciar }: Props) {
  const [tipo, setTipo] = useState<TipoLlamante>('desconocido');
  const [texto, setTexto] = useState('');

  return (
    <KeyboardAvoidingView
      style={estilos.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.logo}>🛡️ Custovia</Text>
        <Text style={estilos.eslogan}>
          Protección contra estafas telefónicas para adultos mayores
        </Text>
        <Text style={estilos.fase}>Prototipo — modo simulación</Text>

        <Text style={estilos.seccion}>1. ¿Quién llama?</Text>
        <View style={estilos.filaTipos}>
          {TIPOS.map((t) => (
            <Pressable
              key={t.tipo}
              onPress={() => setTipo(t.tipo)}
              style={[estilos.tarjetaTipo, tipo === t.tipo && estilos.tarjetaTipoActiva]}
              accessibilityRole="button"
              accessibilityLabel={`Simular llamada de ${t.nombre}`}
            >
              <Text style={estilos.iconoTipo}>{t.icono}</Text>
              <Text style={estilos.nombreTipo}>{t.nombre}</Text>
              <Text style={estilos.detalleTipo}>{t.detalle}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={estilos.seccion}>2. Conversación a simular</Text>
        <Text style={estilos.ayuda}>
          Escribe o pega lo que diría quien llama. Cada línea se analiza como un
          momento distinto de la llamada. O parte de un ejemplo:
        </Text>

        <View style={estilos.filaEjemplos}>
          {EJEMPLOS.map((e) => (
            <Pressable
              key={e.titulo}
              onPress={() => {
                setTipo(e.tipoLlamante);
                setTexto(e.texto);
              }}
              style={estilos.chipEjemplo}
              accessibilityRole="button"
              accessibilityLabel={`Cargar ejemplo: ${e.titulo}`}
            >
              <Text style={estilos.textoChip}>
                {e.emoji} {e.titulo}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={estilos.entrada}
          multiline
          placeholder={
            'Ej: Buenas tardes, le hablamos del banco…\n(una línea por cada cosa que dice)'
          }
          placeholderTextColor="#8A94A6"
          value={texto}
          onChangeText={setTexto}
        />

        <Pressable
          onPress={() => onIniciar(tipo, texto)}
          disabled={texto.trim().length === 0}
          style={[estilos.botonIniciar, texto.trim().length === 0 && estilos.botonDeshabilitado]}
          accessibilityRole="button"
          accessibilityLabel="Iniciar llamada simulada"
        >
          <Text style={estilos.textoIniciar}>▶️ INICIAR LLAMADA SIMULADA</Text>
        </Pressable>

        <Text style={estilos.notaPrivacidad}>
          🔒 Principio de diseño: el audio se descarta al instante, solo se
          procesa texto, y solo se guardan los fragmentos con riesgo.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  contenido: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    color: '#12263A',
  },
  eslogan: {
    fontSize: 17,
    textAlign: 'center',
    color: '#3A4A5E',
    marginTop: 6,
  },
  fase: {
    fontSize: 14,
    textAlign: 'center',
    color: '#7A8699',
    marginTop: 4,
    marginBottom: 18,
  },
  seccion: {
    fontSize: 20,
    fontWeight: '800',
    color: '#12263A',
    marginTop: 14,
    marginBottom: 8,
  },
  filaTipos: {
    flexDirection: 'row',
    gap: 8,
  },
  tarjetaTipo: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  tarjetaTipoActiva: {
    borderColor: '#1666D6',
    backgroundColor: '#E8F0FE',
  },
  iconoTipo: {
    fontSize: 30,
  },
  nombreTipo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12263A',
    textAlign: 'center',
    marginTop: 4,
  },
  detalleTipo: {
    fontSize: 11,
    color: '#5A6B80',
    textAlign: 'center',
    marginTop: 2,
  },
  ayuda: {
    fontSize: 14,
    color: '#5A6B80',
    marginBottom: 8,
  },
  filaEjemplos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chipEjemplo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9D4E3',
  },
  textoChip: {
    fontSize: 13,
    color: '#12263A',
    fontWeight: '600',
  },
  entrada: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9D4E3',
    minHeight: 130,
    padding: 14,
    fontSize: 16,
    color: '#12263A',
    textAlignVertical: 'top',
  },
  botonIniciar: {
    backgroundColor: '#12A150',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  botonDeshabilitado: {
    backgroundColor: '#9DB3C8',
  },
  textoIniciar: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notaPrivacidad: {
    fontSize: 13,
    color: '#7A8699',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 18,
  },
});
