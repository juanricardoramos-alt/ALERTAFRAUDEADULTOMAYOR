/**
 * Custovia — Una app, dos modos (Fase 4).
 *
 *  - Modo abuelito: el semáforo de las Fases 1-2 + envío real de alertas.
 *  - Modo familia: vinculación, alarma configurable y alertas en vivo.
 * El modo elegido queda guardado en el teléfono (AsyncStorage).
 */

import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { segmentarTranscripcion } from './src/brain/analizador';
import { TipoLlamante } from './src/brain/reglas';
import PantallaFamilia from './src/components/PantallaFamilia';
import PantallaInicio from './src/components/PantallaInicio';
import PantallaLlamada from './src/components/PantallaLlamada';
import PantallaModo from './src/components/PantallaModo';
import {
  configurarManejadorNotificaciones,
  crearCanalesDeAlerta,
} from './src/servicios/notificaciones';
import { borrarPerfil, cargarPerfil, guardarPerfil, Perfil, PerfilFamilia } from './src/servicios/perfil';
import { supabaseConfigurado } from './src/servicios/supabase';
import { crearAbuelito } from './src/servicios/vinculacion';

interface LlamadaSimulada {
  tipo: TipoLlamante;
  bloques: string[];
}

export default function App() {
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  /** 'familia' mientras el familiar aún no completa la vinculación. */
  const [modoEnCurso, setModoEnCurso] = useState<'familia' | null>(null);
  const [creandoPerfil, setCreandoPerfil] = useState(false);
  const [llamada, setLlamada] = useState<LlamadaSimulada | null>(null);

  useEffect(() => {
    configurarManejadorNotificaciones();
    crearCanalesDeAlerta();
    cargarPerfil().then((p) => {
      setPerfil(p);
      setCargando(false);
    });
  }, []);

  const elegirModo = async (modo: 'abuelito' | 'familia') => {
    if (modo === 'familia') {
      setModoEnCurso('familia');
      return;
    }
    // Modo abuelito: crear su registro (y código) en Supabase si se puede.
    setCreandoPerfil(true);
    const abuelito = supabaseConfigurado() ? await crearAbuelito('Abuelito(a)') : null;
    const nuevo: Perfil = { modo: 'abuelito', abuelito };
    await guardarPerfil(nuevo);
    setPerfil(nuevo);
    setCreandoPerfil(false);
  };

  const perfilFamiliaListo = async (p: PerfilFamilia) => {
    await guardarPerfil(p);
    setPerfil(p);
    setModoEnCurso(null);
  };

  const cambiarModo = async () => {
    await borrarPerfil();
    setPerfil(null);
    setModoEnCurso(null);
    setLlamada(null);
  };

  if (cargando) {
    return <View style={{ flex: 1, backgroundColor: '#F2F5F9' }} />;
  }

  // ── Modo familia ──
  if (perfil?.modo === 'familia' || modoEnCurso === 'familia') {
    return (
      <>
        <StatusBar style="dark" />
        <PantallaFamilia
          perfil={perfil?.modo === 'familia' ? perfil : null}
          onPerfilListo={perfilFamiliaListo}
          onCambiarModo={cambiarModo}
        />
      </>
    );
  }

  // ── Modo abuelito ──
  if (perfil?.modo === 'abuelito') {
    return (
      <>
        <StatusBar style={llamada ? 'light' : 'dark'} />
        {llamada ? (
          <PantallaLlamada
            tipoLlamante={llamada.tipo}
            bloques={llamada.bloques}
            abuelito={perfil.abuelito}
            onColgar={() => setLlamada(null)}
          />
        ) : (
          <PantallaInicio
            abuelito={perfil.abuelito}
            onNombreCambiado={(nombre) => {
              if (perfil.abuelito) {
                const actualizado: Perfil = {
                  modo: 'abuelito',
                  abuelito: { ...perfil.abuelito, nombre },
                };
                guardarPerfil(actualizado);
                setPerfil(actualizado);
              }
            }}
            onCambiarModo={cambiarModo}
            onIniciar={(tipo, texto) => {
              const bloques = segmentarTranscripcion(texto);
              if (bloques.length > 0) {
                setLlamada({ tipo, bloques });
              }
            }}
          />
        )}
      </>
    );
  }

  // ── Aún sin modo elegido ──
  return (
    <>
      <StatusBar style="dark" />
      <PantallaModo onElegir={elegirModo} ocupado={creandoPerfil} />
    </>
  );
}
