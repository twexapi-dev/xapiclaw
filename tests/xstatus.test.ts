import { describe, expect, test, vi } from 'vitest';
import { handleXStatus } from '../src/commands/xstatus.js';

describe('/xstatus command', () => {
  test('returns setup guidance without API key', async () => {
    const request = vi.fn();
    await expect(handleXStatus('', request as never)).resolves.toContain('not configured');
  });

  test('formats balance response', async () => {
    const request = vi.fn(async () => ({ balance: 42, currency: 'USD' }));
    const text = await handleXStatus('twex_key', request as never);

    expect(text).toContain('TwexAPI status');
    expect(text).toContain('"balance": 42');
  });
});
