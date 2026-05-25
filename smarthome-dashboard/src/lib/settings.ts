import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'settings.json');

export const DEFAULTS = {
  musicLocation:  '',
  photoLocation:  '',
  slideshowTimer: '5',
  idleTimeout:    '10',
  location:       '',
};

export function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) };
  } catch {
    return DEFAULTS;
  }
}

export function writeSettings(patch: Partial<typeof DEFAULTS>) {
  const next = { ...readSettings(), ...patch };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}