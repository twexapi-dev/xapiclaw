import { describe, expect, test } from 'vitest';
import { buildAuthHeader, buildFetchUrl, createTwexApiRequest, isProhibitedRequest } from '../src/request.js';

describe('TwexAPI request layer', () => {
  test('builds Bearer auth header', () => {
    expect(buildAuthHeader('twex_secret')).toEqual({ authorization: 'Bearer twex_secret' });
  });

  test('validates HTTPS base URL and credentials', async () => {
    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', async () => new Response('{}'));
    await expect(request('/twitter/global-trending/topics')).resolves.toEqual({});
    expect(() => createTwexApiRequest('http://api.twexapi.io', 'twex_secret')).toThrow('HTTPS');
    expect(() => createTwexApiRequest('https://user:pass@api.twexapi.io', 'twex_secret')).toThrow('credentials');
  });

  test('builds URL with query parameters', () => {
    expect(buildFetchUrl('https://api.twexapi.io', '/twitter/global-trending/topics', { limit: '5' })).toBe(
      'https://api.twexapi.io/twitter/global-trending/topics?limit=5',
    );
  });

  test('rejects blocked request paths', async () => {
    expect(isProhibitedRequest('GET', '/twitter/{auth_token}/cookie')).toBe(true);
    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', async () => new Response('{}'));
    await expect(request('/twitter/action', { method: 'POST' })).rejects.toThrow('Agent-prohibited endpoint');
  });

  test('formats API errors without echoing response body secrets', async () => {
    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', async () =>
      new Response(JSON.stringify({ error: 'invalid_request', token: 'secret' }), { status: 400, statusText: 'Bad Request' }),
    );
    await expect(request('/twitter/global-trending/topics')).rejects.toThrow(
      'API request failed: 400 Bad Request (invalid_request)',
    );
  });

  test('sends JSON body for non-GET methods', async () => {
    const request = createTwexApiRequest('https://api.twexapi.io', 'twex_secret', async (_input, init) => {
      expect(init?.headers).toEqual({ authorization: 'Bearer twex_secret', 'content-type': 'application/json' });
      expect(init?.body).toBe(JSON.stringify({ text: 'hello' }));
      return new Response(JSON.stringify({ ok: true }));
    });
    await expect(request('/twitter/tweets/create', { body: { text: 'hello' }, method: 'POST' })).resolves.toEqual({ ok: true });
  });
});
