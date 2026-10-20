/**
 * Client ID OAuth 2.0 de Google (HU-01).
 *
 * Viene del archivo .env (clave GOOGLE_CLIENT_ID) vía
 * src/environments/environment.ts, que genera scripts/generate-env.mjs
 * antes de cada `npm start`/`npm run build`. Es el mismo valor que usa
 * el backend y que debe estar autorizado con el origen de esta
 * aplicación (p. ej. http://localhost:4200) en Google Cloud Console.
 *
 * Mientras esté vacío, el botón "Continuar con Google" queda deshabilitado
 * y el resto del inicio de sesión funciona con normalidad.
 */
import { environment } from '../../environments/environment';

export const GOOGLE_CLIENT_ID = environment.googleClientId ?? '';
