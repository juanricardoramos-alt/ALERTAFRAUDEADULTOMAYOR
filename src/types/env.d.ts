/**
 * Tipos de las variables de entorno de Custovia.
 * Expo reemplaza process.env.EXPO_PUBLIC_* por su valor real al empaquetar.
 */
declare var process: {
  env: {
    EXPO_PUBLIC_ANTHROPIC_API_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    [clave: string]: string | undefined;
  };
};
