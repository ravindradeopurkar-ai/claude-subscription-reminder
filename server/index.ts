import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig, saveConfig } from './config';
import { startScheduler, sendReminder, getDaysLeft } from './scheduler';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '16kb' }));

const PORT = Number(process.env.PORT) || 3001;

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
  // Runtime type validation — don't trust the TypeScript cast alone
  const { renewalDate, apiKey } = req.body ?? {};

  if (typeof renewalDate !== 'string' || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'renewalDate and apiKey must be strings' });
  }

  if (!renewalDate.trim() || !apiKey.trim()) {
    return res.status(400).json({ error: 'renewalDate and apiKey are required' });
  }

  // Validate that renewalDate is a real calendar date
  const parsed = Date.parse(renewalDate);
  if (isNaN(parsed)) {
    return res.status(400).json({ error: 'renewalDate must be a valid date (YYYY-MM-DD)' });
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

// ── Global error-handling middleware ─────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Catch unhandled promise rejections so the process doesn't silently die ───
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled rejection]', reason);
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
