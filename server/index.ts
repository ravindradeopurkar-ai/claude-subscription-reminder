import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig, saveConfig } from './config';
import { startScheduler, sendReminder, getDaysLeft } from './scheduler';

dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const PORT = 3001;

// ── GET /api/status ──────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  const config = loadConfig();

  if (!config.renewalDate) {
    return res.json({ configured: false });
  }

  const daysLeft = getDaysLeft(config.renewalDate);

  return res.json({
    configured: true,
    daysLeft,
    renewalDate: config.renewalDate,
    hasApiKey: !!config.apiKey,
  });
});

// ── POST /api/config ─────────────────────────────────────────────────────────
app.post('/api/config', async (req, res) => {
  const { renewalDate, apiKey } = req.body as { renewalDate?: string; apiKey?: string };

  if (!renewalDate || !apiKey) {
    return res.status(400).json({ error: 'renewalDate and apiKey are required' });
  }

  // Verify the API key works with a minimal call
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ error: `API key verification failed: ${message}` });
  }

  saveConfig({ renewalDate, apiKey });
  return res.json({ success: true });
});

// ── POST /api/remind-now ─────────────────────────────────────────────────────
app.post('/api/remind-now', (_req, res) => {
  const config = loadConfig();
  if (!config.renewalDate) {
    return res.status(400).json({ error: 'No renewal date configured yet' });
  }
  sendReminder(config.renewalDate);
  return res.json({ success: true });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
