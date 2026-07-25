/**
 * Custovia — App de la familia (Fase 4).
 *
 * Tres estados en una pantalla:
 *  1. Supabase sin configurar → instrucciones.
 *  2. Sin vincular → formulario con el código del abuelito.
 *  3. Vinculado → tablero: alarma configurable, prueba, historial.
 * Cuando llega una alerta (Realtime), se superpone PantallaAlarma.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { dispararAlerta, suscribirseAAlertas, ultimasAlertas } from '../servicios/alertas';
import {
  cargarConfigAlarma,
  detenerAlarma,
  guardarConfigAlarma,
  sonarAlarma,
  SONIDOS,
} from '../servicios/alarma';
import { codigoValido, completarConfigAlarma, ConfigAlarma } from '../servicios/logica';
import { obtenerPushToken } from '../servicios/notificaciones';
import { PerfilFamilia } from '../servicios/perfil';
import { Alerta, supabaseConfigurado } from '../servicios/supabase';
import {
  actualizarFamiliar,
  buscarAbuelitoPorCodigo,
  registrarFamiliar,
} from '../servicios/vinculacion';
import PantallaAlarma from './PantallaAlarma';

const VOLUMENES = [
  { nombre: 'Bajo', valor: 0.3 },
  { nombre: 'Medio', valor: 0.6 },
  { nombre: 'Fuerte', valor: 1.0 },
];

/** Una alerta se considera "en curso" si llegó hace menos de 3 minutos. */
const MS_ALERTA_VIGENTE = 3 * 60 * 1000;

interface Props {
  perfil: PerfilFamilia | null;
  onPerfilListo: (perfil: PerfilFamilia) => void;
  onCambiarModo: () => void;
}

export default function PantallaFamilia({ perfil, onPerfilListo, onCambiarModo }: Props) {
  // ── Formulario de vinculación ──
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [errorVinculo, setErrorVinculo] = useState('');

  // ── Tablero ──
  const [config, setConfig] = useState<ConfigAlarma>(completarConfigAlarma(null));
  const [probando, setProbando] = useState(false);
  const [historial, setHistorial] = useState<Alerta[]>([]);
  const [alertaActiva, setAlertaActiva] = useState<Alerta | null>(null);
  const [avisoPrueba, setAvisoPrueba] = useState('');
  const timerPrueba = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refrescarHistorial = useCallback(async () => {
    if (!perfil) return;
    const alertas = await ultimasAlertas(perfil.abuelito.id);
    setHistorial(alertas);
    // Si llegó una alerta hace poco (p. ej. con la app cerrada), mostrarla.
    const reciente = alertas.find(
      (a) => !a.falsa_alarma && Date.now() - new Date(a.creado_en).getTime() < MS_ALERTA_VIGENTE
    );
    if (reciente) setAlertaActiva(reciente);
  }, [perfil]);

  // Cargar config guardada + historial + refrescar token push al entrar.
  useEffect(() => {
    cargarConfigAlarma().then(setConfig);
    if (!perfil) return;
    refrescarHistorial();
    obtenerPushToken().then((token) => {
      if (token && token !== perfil.familiar.push_token) {
        actualizarFamiliar(perfil.familiar.id, { push_token: token });
      }
    });
  }, [perfil, refrescarHistorial]);

  // Suscripción en tiempo real a las alertas del abuelito.
  useEffect(() => {
    if (!perfil) return;
    const cancelar = suscribirseAAlertas(perfil.abuelito.id, (alerta) => {
      setAlertaActiva(alerta);
      setHistorial((previas) => [alerta, ...previas]);
    });
    return cancelar;
  }, [perfil]);

  // Apagar sonido de prueba al salir.
  useEffect(() => {
    return () => {
      if (timerPrueba.current) clearTimeout(timerPrueba.current);
      detenerAlarma();
    };
  }, []);

  // ── 1. Supabase sin configurar ──
  if (!supabaseConfigurado()) {
    return (
      <View style={estilos.fondo}>
        <View style={estilos.contenido}>
          <Text style={estilos.logo}>👨‍👩‍👧 Custovia Familia</Text>
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>Falta conectar Supabase</Text>
            <Text style={estilos.parrafo}>
              Para vincularte con tu abuelito y recibir alertas, sigue la guía
              "Fase 4" del README: crear el proyecto gratuito en Supabase,
              correr el archivo supabase/esquema.sql y pegar las dos claves en
              el archivo .env. Luego reinicia con: npx expo start --clear
            </Text>
          </View>
          <Pressable onPress={onCambiarModo} style={estilos.enlace}>
            <Text style={estilos.textoEnlace}>← Volver a elegir modo</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── 2. Vinculación ──
  if (!perfil) {
    const vincular = async () => {
      setErrorVinculo('');
      if (!codigoValido(codigo)) {
        setErrorVinculo('El código tiene 6 letras/números (ejemplo: XKP42M).');
        return;
      }
      if (nombre.trim().length === 0) {
        setErrorVinculo('Escribe tu nombre para que la familia sepa quién eres.');
        return;
      }
      setVinculando(true);
      const abuelito = await buscarAbuelitoPorCodigo(codigo);
      if (!abuelito) {
        setErrorVinculo('No encontramos ese código. Revisa con tu abuelito(a).');
        setVinculando(false);
        return;
      }
      const token = await obtenerPushToken();
      const familiar = await registrarFamiliar(abuelito.id, nombre.trim(), token, config.sonido);
      setVinculando(false);
      if (!familiar) {
        setErrorVinculo('No se pudo vincular. ¿Tienes internet?');
        return;
      }
      onPerfilListo({
        modo: 'familia',
        familiar,
        abuelito: { id: abuelito.id, nombre: abuelito.nombre },
        telefonoAbuelito: telefono.trim(),
      });
    };

    return (
      <KeyboardAvoidingView
        style={estilos.fondo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.contenido}>
          <Text style={estilos.logo}>👨‍👩‍👧 Custovia Familia</Text>
          <Text style={estilos.subtituloPantalla}>
            Vincúlate con tu abuelito(a) para recibir sus alertas.
          </Text>

          <Text style={estilos.etiqueta}>Código de vinculación</Text>
          <Text style={estilos.ayuda}>
            Aparece en la app del abuelito, en la tarjeta "Tu familia".
          </Text>
          <TextInput
            style={[estilos.entrada, estilos.entradaCodigo]}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="XKP42M"
            placeholderTextColor="#8A94A6"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />

          <Text style={estilos.etiqueta}>Tu nombre</Text>
          <TextInput
            style={estilos.entrada}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Carolina (hija)"
            placeholderTextColor="#8A94A6"
          />

          <Text style={estilos.etiqueta}>Teléfono del abuelito(a) — opcional</Text>
          <Text style={estilos.ayuda}>
            Para el botón "LLAMAR" de la alerta. Queda solo en tu teléfono.
          </Text>
          <TextInput
            style={estilos.entrada}
            value={telefono}
            onChangeText={setTelefono}
            placeholder="+56 9 1234 5678"
            placeholderTextColor="#8A94A6"
            keyboardType="phone-pad"
          />

          {Boolean(errorVinculo) && <Text style={estilos.error}>{errorVinculo}</Text>}

          <Pressable
            style={[estilos.botonPrincipal, vinculando && estilos.botonApagado]}
            onPress={vincular}
            disabled={vinculando}
            accessibilityRole="button"
          >
            {vinculando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={estilos.textoBotonPrincipal}>🔗 VINCULARME</Text>
            )}
          </Pressable>

          <Pressable onPress={onCambiarModo} style={estilos.enlace}>
            <Text style={estilos.textoEnlace}>← Volver a elegir modo</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── 3. Tablero del familiar ──
  const cambiarConfig = (cambios: Partial<ConfigAlarma>) => {
    const nueva = { ...config, ...cambios };
    setConfig(nueva);
    guardarConfigAlarma(nueva);
    if (cambios.sonido) {
      // El sonido elegido también se guarda en Supabase: define el canal
      // por el que llegan las push de este familiar en Android.
      actualizarFamiliar(perfil.familiar.id, { sonido: cambios.sonido });
    }
  };

  const probarAlarma = () => {
    if (probando) {
      if (timerPrueba.current) clearTimeout(timerPrueba.current);
      detenerAlarma();
      setProbando(false);
      return;
    }
    setProbando(true);
    sonarAlarma(config);
    timerPrueba.current = setTimeout(() => {
      detenerAlarma();
      setProbando(false);
    }, 4000);
  };

  const enviarPrueba = async () => {
    setAvisoPrueba('Enviando prueba…');
    const r = await dispararAlerta({
      abuelitoId: perfil.abuelito.id,
      nombreAbuelito: perfil.abuelito.nombre,
      motivo: 'Esto es una PRUEBA del sistema de alertas de Custovia.',
      fragmento: '',
      nivel: 'prueba',
    });
    setAvisoPrueba(
      r.ok
        ? 'Prueba enviada: debería sonar aquí y donde el resto de la familia.'
        : 'No se pudo enviar. ¿Tienes internet?'
    );
    setTimeout(() => setAvisoPrueba(''), 6000);
  };

  return (
    <View style={estilos.fondo}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={estilos.logo}>👨‍👩‍👧 Custovia Familia</Text>
        <Text style={estilos.subtituloPantalla}>
          Cuidando a <Text style={estilos.destacado}>{perfil.abuelito.nombre}</Text> · tú
          eres {perfil.familiar.nombre}
        </Text>

        {/* Configuración de la alarma */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>⏰ Tu alarma de alerta</Text>

          <Text style={estilos.etiqueta}>Sonido</Text>
          <View style={estilos.fila}>
            {SONIDOS.map((s) => (
              <Pressable
                key={s.id}
                style={[estilos.chip, config.sonido === s.id && estilos.chipActivo]}
                onPress={() => cambiarConfig({ sonido: s.id })}
              >
                <Text style={estilos.textoChip}>
                  {s.emoji} {s.nombre}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={estilos.etiqueta}>Volumen</Text>
          <View style={estilos.fila}>
            {VOLUMENES.map((v) => (
              <Pressable
                key={v.nombre}
                style={[
                  estilos.chip,
                  Math.abs(config.volumen - v.valor) < 0.01 && estilos.chipActivo,
                ]}
                onPress={() => cambiarConfig({ volumen: v.valor })}
              >
                <Text style={estilos.textoChip}>{v.nombre}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[estilos.fila, { alignItems: 'center', marginTop: 10 }]}>
            <Text style={[estilos.etiqueta, { marginTop: 0, flex: 1 }]}>Vibrar</Text>
            <Switch
              value={config.vibrar}
              onValueChange={(v) => cambiarConfig({ vibrar: v })}
            />
          </View>

          <Pressable style={estilos.botonSecundario} onPress={probarAlarma}>
            <Text style={estilos.textoBotonSecundario}>
              {probando ? '⏹ Detener' : '▶️ Probar cómo sonará'}
            </Text>
          </Pressable>
        </View>

        {/* Prueba de extremo a extremo */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>🔔 Probar el sistema completo</Text>
          <Text style={estilos.parrafo}>
            Envía una alerta de PRUEBA por internet: viaja a Supabase y vuelve a
            todos los familiares vinculados, igual que una alerta real.
          </Text>
          <Pressable style={estilos.botonSecundario} onPress={enviarPrueba}>
            <Text style={estilos.textoBotonSecundario}>Enviar alerta de prueba</Text>
          </Pressable>
          {Boolean(avisoPrueba) && <Text style={estilos.aviso}>{avisoPrueba}</Text>}
        </View>

        {/* Historial */}
        <View style={estilos.tarjeta}>
          <Text style={estilos.tituloTarjeta}>📜 Historial de alertas</Text>
          {historial.length === 0 && (
            <Text style={estilos.parrafo}>Sin alertas todavía. Ojalá siga así 🙂</Text>
          )}
          {historial.map((a) => (
            <View key={a.id} style={estilos.itemHistorial}>
              <Text style={estilos.iconoHistorial}>
                {a.falsa_alarma ? '✅' : a.nivel === 'prueba' ? '🔔' : '🚨'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={estilos.motivoHistorial}>
                  {a.motivo}
                  {a.falsa_alarma ? ' (falsa alarma)' : ''}
                </Text>
                <Text style={estilos.fechaHistorial}>
                  {new Date(a.creado_en).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={onCambiarModo} style={estilos.enlace}>
          <Text style={estilos.textoEnlace}>Cambiar de modo / desvincular</Text>
        </Pressable>
      </ScrollView>

      {/* Alarma superpuesta cuando llega una alerta */}
      {alertaActiva && (
        <PantallaAlarma
          alerta={alertaActiva}
          nombreAbuelito={perfil.abuelito.nombre}
          telefonoAbuelito={perfil.telefonoAbuelito}
          config={config}
          onCerrar={() => {
            setAlertaActiva(null);
            refrescarHistorial();
          }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: '#F2F5F9',
  },
  contenido: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    color: '#12263A',
  },
  subtituloPantalla: {
    fontSize: 15,
    textAlign: 'center',
    color: '#3A4A5E',
    marginTop: 6,
    marginBottom: 16,
  },
  destacado: {
    fontWeight: '800',
    color: '#12263A',
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1E8F0',
  },
  tituloTarjeta: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12263A',
    marginBottom: 6,
  },
  parrafo: {
    fontSize: 14,
    color: '#3A4A5E',
    lineHeight: 20,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12263A',
    marginTop: 12,
    marginBottom: 6,
  },
  ayuda: {
    fontSize: 12,
    color: '#7A8699',
    marginBottom: 6,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F2F5F9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActivo: {
    borderColor: '#1666D6',
    backgroundColor: '#E8F0FE',
  },
  textoChip: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12263A',
  },
  entrada: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C9D4E3',
    padding: 13,
    fontSize: 16,
    color: '#12263A',
  },
  entradaCodigo: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  error: {
    color: '#B3111F',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  botonPrincipal: {
    backgroundColor: '#1666D6',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 18,
  },
  botonApagado: {
    opacity: 0.6,
  },
  textoBotonPrincipal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  botonSecundario: {
    backgroundColor: '#12263A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotonSecundario: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  aviso: {
    fontSize: 13,
    color: '#0B7A3B',
    marginTop: 8,
    fontWeight: '600',
  },
  itemHistorial: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFF3F8',
  },
  iconoHistorial: {
    fontSize: 20,
  },
  motivoHistorial: {
    fontSize: 14,
    color: '#12263A',
    fontWeight: '600',
  },
  fechaHistorial: {
    fontSize: 12,
    color: '#7A8699',
    marginTop: 2,
  },
  enlace: {
    alignItems: 'center',
    padding: 12,
  },
  textoEnlace: {
    color: '#1666D6',
    fontSize: 14,
    fontWeight: '700',
  },
});
