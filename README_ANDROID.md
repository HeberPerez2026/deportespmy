# Aplicación Android — DeportesPMY (`ar.com.deportespmy.app`)

Tu plataforma **DeportesPMY** funciona tanto como **App instalable directa en Android (PWA / WebAPK)** como **proyecto nativo Android Studio (Capacitor)** listo para generar archivos `.apk` y `.aab` para Google Play Store.

---

## Opción 1: Instalación inmediata en cualquier celular Android (Sin Play Store)
1. Abrí la página desde **Google Chrome** en tu teléfono Android.
2. Tocá el botón **"Instalar App Android"** en la barra superior o en el pie de página (o el menú `⋮` → **Instalar aplicación**).
3. Android instalará DeportesPMY en el cajón de aplicaciones con su propio ícono, pantalla completa sin barra de navegador, accesos directos (`Turnos`, `Complejos`, `Torneos`), modo offline y notificaciones Push.

---

## Opción 2: Compilar el `.apk` o `.aab` nativo con Android Studio / Capacitor
El repositorio ya incluye el proyecto nativo completo en la carpeta `/android` y la configuración en `capacitor.config.ts`.

### Requisitos en tu PC
- **Node.js 18+**
- **JDK 17+**
- **Android Studio** (con Android SDK instalado)

### Pasos para compilar
1. Instalá dependencias:
   ```bash
   npm install
   ```
2. Compilá la web y sincronizá los assets hacia Android:
   ```bash
   npm run android:sync
   ```
3. Abrí el proyecto en Android Studio:
   ```bash
   npm run android:open
   ```
   O desde terminal para generar el APK directamente:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   El APK generado quedará en:
   `android/app/build/outputs/apk/debug/app-debug.apk`

### Para publicar en Google Play Store (`.aab`)
En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (`.aab`)**.
Recordá actualizar la huella SHA-256 de tu keystore en `public/.well-known/assetlinks.json` si habilitás App Links / TWA.
