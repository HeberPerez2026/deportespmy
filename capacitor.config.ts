import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ar.com.deportespmy.app',
  appName: 'DeportesPMY',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'deportespmy.com.ar',
      '*.deportespmy.com.ar',
      '*.run.app',
      '*.mercadopago.com',
      '*.mercadopago.com.ar',
      '*.mercadolibre.com',
      '*.googleapis.com',
      '*.firebaseapp.com',
    ],
  },
  android: {
    backgroundColor: '#0D1117',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0D1117',
    },
  },
};

export default config;
