import { useState, useEffect, FormEvent } from 'react';

const API = 'http://localhost:3001';

interface Status {
  configured: boolean;
  daysLeft?: number;
  renewalDate?: string;
  hasApiKey?: boolean;
}

function urgencyColor(days: number): string {
  if (days > 14) return '#22c55e';
  if (days > 7) return '#f59e0b';
  return '#ef4444';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  function showToast(text: string, ok: boolean) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`${API}/api/status`);
      const data: Status = await res.json();
      setStatus(data);
      if (!data.configured) setShowSettings(true);
    } catch {
      showToast('Cannot reach server. Make sure `npm run dev` is running.', false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, renewalDate }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Saved — API key verified successfully.', true);
        setApiKey('');
        setShowSettings(false);
        fetchStatus();
      } else {
        showToast(data.error ?? 'Failed to save configuration.', false);
      }
    } catch {
      showToast('Could not connect to server.', false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemindNow() {
    setReminding(true);
    try {
      const res = await fetch(`${API}/api/remind-now`, { method: 'POST' });
      if (res.ok) {
        showToast('Desktop notification sent!', true);
      } else {
        showToast('Could not send reminder.', false);
      }
    } catch {
      showToast('Could not connect to server.', false);
    } finally {
      setReminding(false);
    }
  }

  const days = status?.daysLeft;
  const color = days !== undefined ? urgencyColor(days) : '#6b7280';

  return (
    <div className="wrap">
      <header>
        <h1>Claude Subscription Reminder</h1>
        <p className="sub">Daily desktop alerts so you never miss your renewal</p>
      </header>

      {toast && (
        <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {status?.configured && days !== undefined && (
        <div className="card center">
          <div className="big-num" style={{ color }}>
            {Math.abs(days)}
          </div>
          <div className="big-label">
            {days > 1 && 'days remaining'}
            {days === 1 && 'day remaining'}
            {days === 0 && 'expires today!'}
            {days < 0 && `day${Math.abs(days) === 1 ? '' : 's'} overdue`}
          </div>

          {status.renewalDate && (
            <p className="renewal-date">Renewal date: {formatDate(status.renewalDate)}</p>
          )}

          <div className="badges">
            <span className={`badge ${status.hasApiKey ? 'on' : 'off'}`}>
              {status.hasApiKey ? '● API connected' : '○ No API key'}
            </span>
          </div>

          <div className="row-btns">
            <button className="btn-ghost" onClick={handleRemindNow} disabled={reminding}>
              {reminding ? 'Sending…' : 'Test notification'}
            </button>
            <button className="btn-primary" onClick={() => setShowSettings((v) => !v)}>
              {showSettings ? 'Hide settings' : 'Update settings'}
            </button>
          </div>
        </div>
      )}

      {!status?.configured && (
        <div className="card center">
          <p className="muted">Configure your renewal date and API key to get started.</p>
        </div>
      )}

      {(showSettings || !status?.configured) && (
        <div className="card">
          <h2>Settings</h2>
          <form onSubmit={handleSave}>
            <label htmlFor="apiKey">Anthropic API key</label>
            <input
              id="apiKey"
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <small>Stored locally in <code>.config.json</code> — never sent anywhere else.</small>

            <label htmlFor="date" style={{ marginTop: '1rem' }}>
              Subscription renewal date
            </label>
            <input
              id="date"
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.target.value)}
              required
            />

            <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: '1.25rem' }}>
              {saving ? 'Verifying…' : 'Save & verify'}
            </button>
          </form>
        </div>
      )}

      <footer>Reminders fire automatically every day at 9:00 AM via desktop notification.</footer>
    </div>
  );
}
