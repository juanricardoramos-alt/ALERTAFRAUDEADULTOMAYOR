/**
 * Custovia — Prototipo Fase 1.
 *
 * Dos pantallas:
 *  - Inicio: configurar la simulación (quién llama + conversación).
 *  - Llamada: la pantalla del abuelito con el semáforo funcionando.
 */

import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';

import { segmentarTranscripcion } from './src/brain/analizador';
import { TipoLlamante } from './src/brain/reglas';
import PantallaInicio from './src/components/PantallaInicio';
import PantallaLlamada from './src/components/PantallaLlamada';

interface LlamadaSimulada {
  tipo: TipoLlamante;
  bloques: string[];
}

export default function App() {
  const [llamada, setLlamada] = useState<LlamadaSimulada | null>(null);

  return (
    <>
      <StatusBar style={llamada ? 'light' : 'dark'} />
      {llamada ? (
        <PantallaLlamada
          tipoLlamante={llamada.tipo}
          bloques={llamada.bloques}
          onColgar={() => setLlamada(null)}
        />
      ) : (
        <PantallaInicio
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
