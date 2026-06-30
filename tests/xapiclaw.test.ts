import { describe, expect, test, vi } from 'vitest';
import { handleXApiClaw } from '../src/tools/xapiclaw.js';

describe('xapiclaw execution tool', () => {
  test('returns setup guidance when API key is missing', async () => {
    const result = await handleXApiClaw({
      apiKey: '',
      baseUrl: 'https://api.twexapi.io',
      params: { method: 'GET', path: '/balance' },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('not configured');
  });

  test('rejects unknown paths and method mismatches', async () => {
    const unknown = await handleXApiClaw({
      apiKey: 'twex_key',
      baseUrl: 'https://api.twexapi.io',
      params: { method: 'GET', path: '/twitter/action' },
    });

    const mismatch = await handleXApiClaw({
      apiKey: 'twex_key',
      baseUrl: 'https://api.twexapi.io',
      params: { method: 'GET', path: '/twitter/advanced_search' },
    });

    expect(unknown.isError).toBe(true);
    expect(unknown.content[0]?.text).toContain('not in the XApiClaw catalog');
    expect(mismatch.isError).toBe(true);
    expect(mismatch.content[0]?.text).toContain('not in the XApiClaw catalog');
  });

  test('invokes catalog endpoint with mocked fetch', async () => {
    const fetchFunction = vi.fn(async () => new Response(JSON.stringify({ balance: 12 }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    })) as unknown as typeof fetch;

    const result = await handleXApiClaw({
      apiKey: 'twex_key',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction,
      params: { method: 'GET', path: '/balance' },
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain('"balance": 12');
  });
});
