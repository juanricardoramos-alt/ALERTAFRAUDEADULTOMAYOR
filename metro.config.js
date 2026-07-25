/**
 * Custovia — Configuración de Metro (el empaquetador de React Native).
 *
 * La librería @anthropic-ai/sdk trae código opcional que solo corre en
 * computadores (leer credenciales guardadas en disco, usando módulos de
 * Node.js como node:fs). En el teléfono ese código nunca se ejecuta —la
 * API key llega por el .env—, pero Metro intenta resolver esos módulos
 * igual al empaquetar y falla. Aquí le decimos que los trate como vacíos.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const resolverOriginal = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, nombreModulo, plataforma) => {
  if (nombreModulo.startsWith('node:')) {
    return { type: 'empty' };
  }
  if (resolverOriginal) {
    return resolverOriginal(context, nombreModulo, plataforma);
  }
  return context.resolveRequest(context, nombreModulo, plataforma);
};

module.exports = config;
