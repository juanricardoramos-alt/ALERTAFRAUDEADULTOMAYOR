# 🛡️ Custovia — Alerta de fraude telefónico para adultos mayores

> **Custovia** se lee "Custov-IA": evoca *custodia* —resguardo, protección—
> con la IA adentro.

Prototipo de una app que protege a adultos mayores de estafas telefónicas
(el falso "nieto en apuros", falsos bancos, falsa PDI, premios inexistentes)
y que —esa es la gracia— avisa a la familia **en el momento**, no después.

**Estado actual: Fase 2 (reglas locales + IA de Claude).** La app del
abuelito funciona con su semáforo de riesgo a pantalla completa. El cerebro
tiene dos capas: **reglas locales** instantáneas (palabras clave chilenas) y
la **API de Claude** para estafas sutiles sin palabras obvias (manipulación
emocional, recolección de datos personales). El puntaje más alto manda. Si
no hay internet o API key, la app funciona igual solo con reglas. La
conversación se ingresa como texto (simulando la transcripción).

---

## Cómo probarla en tu teléfono (5 minutos)

1. Instala **Node.js** (versión 20 o superior) en tu computador: <https://nodejs.org>
2. Instala la app **Expo Go** en tu teléfono (App Store o Google Play).
3. En una terminal, dentro de esta carpeta:

   ```bash
   npm install
   npx expo start
   ```

   > **Nota de compatibilidad**: el proyecto usa **Expo SDK 54** a propósito,
   > porque es la versión que soporta la app Expo Go disponible hoy en la
   > App Store y Google Play (las versiones más nuevas de Expo Go llevan
   > meses esperando aprobación de Apple). No lo subas de versión mientras
   > pruebes con Expo Go.

4. Aparecerá un código QR en la terminal:
   - **Android**: abre Expo Go y escanea el QR.
   - **iPhone**: escanea el QR con la cámara y toca la notificación.
   - Si el teléfono no encuentra el servidor (redes distintas), usa
     `npx expo start --tunnel`.

5. En la app: elige quién llama, toca un **ejemplo** (por ejemplo
   "🏦 Falso banco") y presiona **▶️ INICIAR LLAMADA SIMULADA**. Verás la
   transcripción avanzando por bloques, el puntaje de riesgo subiendo y, al
   cruzar el umbral, la pantalla roja de **¡POSIBLE ESTAFA!** con vibración
   y aviso de voz.

## Activar la IA de Claude (Fase 2, opcional pero recomendado)

Sin este paso la app funciona igual, solo con las reglas locales.

1. **Crea tu API key** (una sola vez):
   - Entra a <https://console.anthropic.com> y crea una cuenta.
   - Carga un saldo pequeño en **Billing** (con US$5 sobra para meses de
     pruebas: cada análisis de llamada cuesta ~1 centavo de dólar).
   - En **API Keys** → *Create Key*. Cópiala entera (empieza con `sk-ant-`).

2. **Configúrala en el proyecto**:

   ```bash
   # en la carpeta del proyecto (Windows PowerShell: usa "copy" en vez de "cp")
   cp .env.example .env
   ```

   Abre el archivo `.env` y pega tu key después del `=`. Ese archivo está
   en `.gitignore`: **nunca** se sube a GitHub ni queda en el código.

3. **Prueba la conexión** (sin necesidad del teléfono):

   ```bash
   npm run probar-ia
   ```

   Envía una estafa "sutil" de prueba y muestra el veredicto de la IA.

4. **Reinicia la app** con `npx expo start --clear` y prueba los ejemplos
   marcados como *(sutil, para la IA)*: las reglas solas los dejan en
   amarillo, pero la IA los detecta y dispara la alerta.

> ⚠️ **Nota para producción**: con el prefijo `EXPO_PUBLIC_` la key queda
> dentro de la app compilada. Para un prototipo personal está bien; antes
> de publicar la app, la key se mueve a un servidor propio (Fase 4).

## Cómo correr los tests del cerebro

```bash
npm test
```

Son 37 pruebas automáticas. De la Fase 1: estafas clásicas → rojo;
repartidor honesto de número desconocido → nunca rojo; número institucional
clonado que pide datos → rojo igual (anti-spoofing); contacto de confianza →
verde siempre. De la Fase 2: la IA solo puede subir el riesgo, nunca
bajarlo; sin internet el estado de reglas queda intacto; control de costos
(no se llama a la IA para contactos ni cuando ya hay rojo); y los casos
sutiles de verdad se les escapan a las reglas (para que la demo de la IA
tenga sentido). Los tests no llaman a la API real: corren gratis y sin
internet.

---

## Cómo está organizado el código

```
App.tsx                        ← une las dos pantallas
metro.config.js                ← ajuste del empaquetador para la librería de la IA
scripts/probar-ia.mjs          ← prueba tu API key desde el computador
src/
  brain/                       ← el "cerebro" (lógica pura, sin interfaz)
    reglas.ts                  ← capa 1: señales por palabras clave y puntajes
    analizador.ts              ← normaliza, segmenta y puntúa por bloques
    ia.ts                      ← capa 2: análisis con la API de Claude
    ejemplos.ts                ← conversaciones de demo (incluye las sutiles)
    __tests__/                 ← tests de ambas capas
  components/
    PantallaInicio.tsx         ← configurar la simulación (para la demo)
    PantallaLlamada.tsx        ← LA pantalla del abuelito (semáforo)
```

El cerebro recibe **texto**, venga de donde venga (simulación hoy;
reconocimiento de voz o VoIP mañana). Así el mismo motor sirve para todas
las vías de acceso al audio.

### Cómo funciona el puntaje

- El texto se analiza en **bloques** (~10-15 segundos de conversación).
- Señales **críticas** (+50): pedir claves/PIN, códigos SMS, datos de
  tarjeta, transferencias, gift cards, acceso remoto. Una sola basta para
  llegar a rojo.
- Señales de **manipulación** (+15 a +20): urgencia, secretismo,
  suplantación ("soy tu nieto", "del banco"), "número nuevo", amenazas,
  premios. Se necesitan varias para escalar.
- Umbrales: **25 = naranja** (se sugiere una pregunta de verificación),
  **50 = rojo** (posible estafa + alerta a la familia).
- Cada señal suma **una sola vez** por llamada.
- **Filtro por número**: contactos y números institucionales (600) parten
  en verde y solo se vigilan señales *absolutas* (ningún banco real pide
  claves por teléfono) → protección anti-spoofing. Números desconocidos
  parten en amarillo y se analiza todo.
- **Capa de IA** (números desconocidos): tras cada bloque, la conversación
  acumulada se envía a la API de Claude, que responde un nivel
  (`ninguno`/`bajo` +12/`medio` +35/`alto` +70) y un motivo en una frase.
  El puntaje final es el **mayor** entre reglas e IA; la IA nunca baja el
  riesgo. Costos cuidados: no se consulta para contactos, se deja de
  consultar al llegar a rojo, y el prompt fijo aprovecha el caché de la API.
- **Regla de oro**: la IA **nunca** cuelga la llamada. Solo pinta la
  pantalla, vibra y avisa. Colgar es siempre decisión humana.

---

## Plan de fases

- ✅ **Fase 1 — Prototipo con simulación**: semáforo, cerebro de reglas
  locales, modo simulación por texto, tests.
- ✅ **Fase 2 — Análisis con matices** (esta versión): la API de Claude
  como segunda capa del cerebro, con las reglas locales como respaldo
  instantáneo. Detecta manipulación emocional y recolección de datos.
- ⬜ **Fase 3 — Voz**: reconocimiento de voz del dispositivo (modo
  altavoz) alimentando el mismo cerebro.
- ⬜ **Fase 4 — App de la familia**: vinculación, números de confianza,
  alertas push en tiempo real, historial, botón de falsa alarma
  (backend simple: Supabase o Firebase).
- ⬜ **Fase 5 — Acceso a llamadas reales**: número virtual VoIP, o
  alianza con operador. (Ni iOS ni Android permiten escuchar llamadas
  nativas por privacidad.)

## Privacidad desde el diseño

- El audio se descarta al instante; solo se procesa texto.
- Solo se guardan los fragmentos con riesgo; el resto se borra.
- Aviso al contestar: "esta llamada está siendo supervisada por un
  sistema de seguridad".
- Procesamiento local en el teléfono siempre que sea posible.
