import { describe, expect, test, vi } from 'vitest';
import { createTwexApiRequest, validateBaseUrl } from '../src/request.js';

describe('TwexAPI request client', () => {
  test('validates HTTPS base URLs without embedded credentials', () => {
    expect(validateBaseUrl('https://api.twexapi.io').href).toBe('https://api.twexapi.io/');
    expect(() => validateBaseUrl('http://api.twexapi.io')).toThrow('HTTPS');
    expect(() => validateBaseUrl('https://user:pass@api.twexapi.io')).toThrow('credentials');
  });

  test('injects bearer auth and serializes query parameters', async () => {
    const fetchFunction = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    })) as unknown as typeof fetch;

    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', fetchFunction);
    const response = await request({
      body: { q: 'ai' },
      method: 'POST',
      path: '/twitter/advanced_search',
      query: { count: 10 },
    });

    expect(response).toEqual({ ok: true });
    expect(fetchFunction).toHaveBeenCalledWith(
      'https://api.twexapi.io/twitter/advanced_search?count=10',
      expect.objectContaining({
        body: '{"q":"ai"}',
        headers: expect.objectContaining({
          Authorization: 'Bearer twex_secret',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      }),
    );
  });

  test('sanitizes non-2xx errors', async () => {
    const fetchFunction = vi.fn(async () => new Response('Authorization: Bearer twex_secret denied', {
      status: 401,
      statusText: 'Unauthorized',
    })) as unknown as typeof fetch;

    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', fetchFunction);

    await expect(request({ method: 'GET', path: '/balance' })).rejects.toThrow('Bearer [REDACTED]');
  });
});
