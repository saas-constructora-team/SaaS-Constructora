#!/usr/bin/env node
/**
 * Genera src/environments/environment.ts a partir del archivo .env.
 *
 * Angular 18 no carga .env de forma nativa, así que los hooks npm
 * "prestart", "prebuild" y "prewatch" ejecutan este script antes de
 * compilar. Fuente de verdad: frontend/.env si existe, si no el .env
 * de la raíz del proyecto (compartido con el backend).
 *
 * IMPORTANTE: solo se copian las claves listadas en PUBLIC_ENV_KEYS.
 * El .env también contiene secretos del backend (BD, JWT, etc.) que
 * NUNCA deben terminar empaquetados en el bundle del navegador.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Claves del .env que sí se exponen al navegador (en camelCase). */
const PUBLIC_ENV_KEYS = ['GOOGLE_CLIENT_ID'];

const envCandidates = [resolve(frontendRoot, '.env'), resolve(frontendRoot, '..', '.env')];
const envPath = envCandidates.find((candidate) => existsSync(candidate));

function parseEnv(text) {
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }
    vars[match[1]] = value;
  }
  return vars;
}

const toCamelCase = (key) => key.toLowerCase().replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

const envVars = envPath ? parseEnv(readFileSync(envPath, 'utf8')) : {};
const entries = PUBLIC_ENV_KEYS.map((key) => {
  const value = envVars[key] ?? '';
  if (!value) {
    console.warn(`[generate-env] "${key}" no está definido en ${envPath ?? '(sin archivo .env)'}.`);
  }
  return [toCamelCase(key), value];
});

const outputPath = resolve(frontendRoot, 'src', 'environments', 'environment.ts');
mkdirSync(dirname(outputPath), { recursive: true });

const fileContent = `/* AUTO-GENERADO por scripts/generate-env.mjs desde ${envPath ?? '.env inexistente'}.
 * No editar a mano: los cambios se sobreescriben en cada npm start/build/watch.
 */
export const environment = {
${entries.map(([name, value]) => `  ${name}: ${JSON.stringify(value)},`).join('\n')}
} as const;
`;

writeFileSync(outputPath, fileContent);
console.log(`[generate-env] ${outputPath} generado desde ${envPath ?? 'valores vacíos'}.`);
