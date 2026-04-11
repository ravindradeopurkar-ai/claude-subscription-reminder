import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), '.config.json');

export interface AppConfig {
  renewalDate?: string;
  apiKey?: string;
}

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as AppConfig;
    }
  } catch {
    // ignore read errors
  }
  return {};
}

export function saveConfig(updates: Partial<AppConfig>): AppConfig {
  const existing = loadConfig();
  const updated = { ...existing, ...updates };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
  return updated;
}
