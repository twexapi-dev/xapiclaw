import { describe, expect, test } from 'vitest';
import { handleXStatus } from '../src/commands/xstatus.js';

describe('/xstatus command', () => {
  test('returns setup guidance without API key', async () => {
    const request = async () => ({ balance: 10 });
    await expect(handleXStatus('', request)).resolves.toContain('not configured');
  });

  test('formats TwexAPI balance response', async () => {
    const request = async (path: string) => ({ balance: 42, path });
    await expect(handleXStatus('twex_secret', request)).resolves.toContain('"balance": 42');
  });
});
