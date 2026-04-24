import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), '.config.json');

export interface AppConfig {
  renewalDate?: string;
  apiKey?: string;
}

export function loadConfig(): AppConfig {
  // Environment variables take precedence over the config file
  const envConfig: AppConfig = {
    ...(process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : {}),
    ...(process.env.RENEWAL_DATE ? { renewalDate: process.env.RENEWAL_DATE } : {}),
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as AppConfig;
      // env vars win over file values
      return { ...fileConfig, ...envConfig };
    }
  } catch {
    // ignore read errors
  }

  return envConfig;
}

export function saveConfig(updates: Partial<AppConfig>): AppConfig {
  const existing = loadConfig();
  const updated = { ...existing, ...updates };

  // Atomic write: write to a temp file then rename to avoid partial-write corruption
  const tmp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(updated, null, 2));
  fs.renameSync(tmp, CONFIG_FILE);

  return updated;
}
