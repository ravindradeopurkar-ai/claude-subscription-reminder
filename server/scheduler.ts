import cron from 'node-cron';
import notifier from 'node-notifier';
import { loadConfig } from './config';

export function getDaysLeft(renewalDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  const diffMs = renewal.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function buildMessage(daysLeft: number): string {
  if (daysLeft > 1) return `${daysLeft} days left to renew your Claude subscription!`;
  if (daysLeft === 1) return 'Only 1 day left to renew your Claude subscription!';
  if (daysLeft === 0) return 'Your Claude subscription expires today — renew now!';
  const abs = Math.abs(daysLeft);
  return `Your Claude subscription expired ${abs} day${abs === 1 ? '' : 's'} ago.`;
}

export function sendReminder(renewalDate: string): void {
  const daysLeft = getDaysLeft(renewalDate);
  const message = buildMessage(daysLeft);

  console.log(`[${new Date().toLocaleString()}] Reminder: ${message}`);

  notifier.notify({
    title: 'Claude Subscription Reminder',
    message,
    sound: true,
    wait: false,
  });
}

export function startScheduler(): void {
  // Runs every day at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    const config = loadConfig();
    if (config.renewalDate) {
      sendReminder(config.renewalDate);
    }
  });

  console.log('Scheduler started — daily reminder fires at 9:00 AM');
}
