/**
 * Custovia — Tarjeta "Tu familia" en la app del abuelito (Fase 4).
 *
 * Muestra el código de vinculación que la familia escribe en su app,
 * cuántos familiares ya están conectados, y permite ponerle nombre al
 * abuelito (es el nombre que aparece en las alertas).
 */

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Abuelito, supabaseConfigurado } from '../servicios/supabase';
import { contarFamiliares, renombrarAbuelito } from '../servicios/vinculacion';

interface Props {
  abuelito: Abuelito | null;
  onNombreCambiado: (nombre: string) => void;
}

export default function TarjetaFamilia({ abuelito, onNombreCambiado }: Props) {
  const [familiares, setFamiliares] = useState<number | null>(null);
  const [nombre, setNombre] = useState(abuelito?.nombre ?? '');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (abuelito) {
      contarFamiliares(abuelito.id).then(setFamiliares);
    }
  }, [abuelito]);

  if (!supabaseConfigurado()) {
    return (
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>👨‍👩‍👧 Tu familia</Text>
        <Text style={estilos.parrafo}>
          Para que las alertas lleguen de verdad a tu familia, falta conectar
          Supabase (guía "Fase 4" del README). Mientras tanto, el semáforo
          funciona igual.
        </Text>
      </View>
    );
  }

  if (!abuelito) {
    return (
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>👨‍👩‍👧 Tu familia</Text>
        <Text style={estilos.parrafo}>
          No se pudo crear tu código de vinculación (¿sin internet?). Cierra y
          vuelve a abrir la app para reintentar.
        </Text>
      </View>
    );
  }

  const guardarNombre = async () => {
    const limpio = nombre.trim();
    if (!limpio || limpio === abuelito.nombre) return;
    const ok = await renombrarAbuelito(abuelito.id, limpio);
    if (ok) {
      onNombreCambiado(limpio);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    }
  };

  return (
    <View style={estilos.tarjeta}>
      <Text style={estilos.titulo}>👨‍👩‍👧 Tu familia</Text>
      <Text style={estilos.parrafo}>
        Comparte este código con tu familia. Ellos lo escriben en su app
        Custovia (modo familiar) y quedarán conectados contigo:
      </Text>
      <Text style={estilos.codigo}>{abuelito.codigo}</Text>
      <Text style={estilos.contador}>
        {familiares === null
          ? 'Consultando familiares vinculados…'
          : familiares === 0
            ? 'Aún nadie se ha vinculado.'
            : `${familiares} familiar(es) vinculado(s) ✓`}
      </Text>

      <Text style={estilos.etiqueta}>Tu nombre (aparece en las alertas):</Text>
      <View style={estilos.filaNombre}>
        <TextInput
          style={estilos.entradaNombre}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Rosa"
          placeholderTextColor="#8A94A6"
        />
        <Pressable style={estilos.botonGuardar} onPress={guardarNombre}>
          <Text style={estilos.textoGuardar}>{guardado ? '✓' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E1E8F0',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#12263A',
    marginBottom: 6,
  },
  parrafo: {
    fontSize: 13,
    color: '#3A4A5E',
    lineHeight: 19,
  },
  codigo: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    color: '#1666D6',
    marginVertical: 10,
  },
  contador: {
    fontSize: 13,
    textAlign: 'center',
    color: '#0B7A3B',
    fontWeight: '600',
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12263A',
    marginTop: 12,
    marginBottom: 6,
  },
  filaNombre: {
    flexDirection: 'row',
    gap: 8,
  },
  entradaNombre: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D4E3',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: '#12263A',
  },
  botonGuardar: {
    backgroundColor: '#12263A',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textoGuardar: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
