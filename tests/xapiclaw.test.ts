import { afterEach, describe, expect, test, vi } from 'vitest';
import { handleXApiClaw } from '../src/tools/xapiclaw.js';

function createMockFetch(response: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(response), { status, statusText: status === 200 ? 'OK' : 'Error' });
}

describe('handleXApiClaw', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('executes catalog request with mock TwexAPI response', async () => {
    const result = await handleXApiClaw({
      apiKey: 'twex_test',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: createMockFetch({ topics: ['ai'] }),
      params: { path: '/twitter/global-trending/topics' },
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain('ai');
  });

  test('injects auth automatically', async () => {
    const mockFetch: typeof fetch = async (_input, init) => {
      expect(init?.headers).toEqual({ authorization: 'Bearer twex_secret' });
      return new Response(JSON.stringify({ ok: true }));
    };
    await handleXApiClaw({
      apiKey: 'twex_secret',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: mockFetch,
      params: { path: '/twitter/global-trending/topics' },
    });
  });

  test('returns setup guidance when missing api key', async () => {
    const result = await handleXApiClaw({
      apiKey: '',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: createMockFetch({}),
      params: { path: '/twitter/global-trending/topics' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('not configured');
  });

  test('rejects unknown paths', async () => {
    const result = await handleXApiClaw({
      apiKey: 'twex_test',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: createMockFetch({}),
      params: { path: '/twitter/not-real' },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('not in the XApiClaw catalog');
  });

  test('truncates large responses', async () => {
    const result = await handleXApiClaw({
      apiKey: 'twex_test',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: createMockFetch({ data: 'x'.repeat(30_000) }),
      params: { path: '/twitter/global-trending/topics' },
    });
    expect(result.content[0]?.text).toContain('--- TRUNCATED ---');
  });

  test('handles execution timeout', async () => {
    const hangingFetch: typeof fetch = async () => new Promise<Response>(() => {});
    const result = await handleXApiClaw({
      apiKey: 'twex_test',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: hangingFetch,
      params: { path: '/twitter/global-trending/topics' },
      timeoutMs: 10,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('timed out');
  });

  test('passes POST body and query parameters', async () => {
    const mockFetch: typeof fetch = async (input, init) => {
      expect(String(input)).toBe('https://api.twexapi.io/twitter/advanced_search?count=5');
      expect(init?.body).toBe(JSON.stringify({ query: 'ai' }));
      return new Response(JSON.stringify({ tweets: [] }));
    };
    await handleXApiClaw({
      apiKey: 'twex_test',
      baseUrl: 'https://api.twexapi.io',
      fetchFunction: mockFetch,
      params: {
        body: { query: 'ai' },
        method: 'POST',
        path: '/twitter/advanced_search',
        query: { count: 5 },
      },
    });
  });
});
