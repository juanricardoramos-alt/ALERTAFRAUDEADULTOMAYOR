/**
 * Configuración de Jest para probar el "cerebro" de GuardIA (src/brain).
 * Es lógica TypeScript pura (sin componentes de React Native), así que
 * basta con ts-jest en ambiente Node; no se necesita emulador ni teléfono.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
