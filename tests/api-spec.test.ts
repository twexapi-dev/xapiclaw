import { describe, expect, test } from 'vitest';
import { API_SPEC } from '../src/api-spec.js';

describe('TwexAPI API spec', () => {
  test('contains the full TwexAPI operation snapshot', () => {
    expect(API_SPEC).toHaveLength(99);
  });

  test('marks the agent-callable subset and blocked families', () => {
    const callable = API_SPEC.filter((endpoint) => endpoint.agentProhibited !== true);
    expect(callable).toHaveLength(84);
    expect(callable.map((endpoint) => endpoint.path)).not.toContain('/twitter/{auth_token}/cookie');
    expect(callable.map((endpoint) => endpoint.path)).not.toContain('/twitter/tweets/sentiment');
    expect(callable.map((endpoint) => endpoint.path)).not.toContain('/twitter/action');
  });

  test('includes representative TwexAPI categories', () => {
    const categories = new Set(API_SPEC.map((endpoint) => endpoint.category));
    expect(categories).toContain('Search');
    expect(categories).toContain('Tweet Actions');
    expect(categories).toContain('Trending');
    expect(categories).toContain('Balance');
  });

  test('classifies risks for representative endpoints', () => {
    expect(API_SPEC.find((endpoint) => endpoint.path === '/balance')?.risk).toBe('private-read');
    expect(API_SPEC.find((endpoint) => endpoint.path === '/twitter/advanced_search')?.risk).toBe('paid-bulk');
    expect(API_SPEC.find((endpoint) => endpoint.path === '/twitter/tweets/create')?.risk).toBe('write');
    expect(API_SPEC.find((endpoint) => endpoint.path === '/twitter/global-trending/topics')?.risk).toBe('read');
  });

  test('includes docs-only TwexAPI endpoint pages beyond the public OpenAPI index', () => {
    expect(API_SPEC).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'DM', path: '/v3/twitter/conversations', risk: 'private-read' }),
        expect.objectContaining({ category: 'DM', path: '/v3/twitter/dm-history', risk: 'private-read' }),
        expect.objectContaining({ category: 'DM', path: '/v3/twitter/dm-media', risk: 'private-read' }),
        expect.objectContaining({ category: 'DM', path: '/v3/twitter/send-dm', risk: 'write' }),
        expect.objectContaining({ category: 'Followers & Following', path: '/v3/twitter/users/followers', risk: 'paid-bulk' }),
        expect.objectContaining({ category: 'Followers & Following', path: '/v3/twitter/users/following', risk: 'paid-bulk' }),
        expect.objectContaining({ category: 'Followers & Following', path: '/v3/twitter/users/verified-followers', risk: 'paid-bulk' }),
        expect.objectContaining({ category: 'Grok', path: '/v3/twitter/grok/ask', risk: 'private-read' }),
        expect.objectContaining({ category: 'Grok', path: '/v3/twitter/grok/conversation', risk: 'private-read' }),
        expect.objectContaining({ category: 'Grok', path: '/v3/twitter/grok/history', risk: 'private-read' }),
        expect.objectContaining({ category: 'Tweet Actions', path: '/v3/twitter/tweets/create-thread', risk: 'write' }),
        expect.objectContaining({
          category: 'Tweets',
          cost: '$0.14 per 1,000 tweets',
          path: '/v2/tweet/detail',
          risk: 'paid-bulk',
        }),
      ]),
    );
  });

  test('keeps superseded lower-version endpoints out of the agent-callable catalog', () => {
    const callablePaths = API_SPEC.filter((endpoint) => endpoint.agentProhibited !== true).map((endpoint) => endpoint.path);

    expect(callablePaths).toEqual(
      expect.arrayContaining([
        '/v2/tweet/detail',
        '/v3/twitter/dm-history',
        '/v3/twitter/send-dm',
        '/v3/twitter/users/followers',
        '/v3/twitter/users/following',
      ]),
    );
    expect(callablePaths).not.toEqual(
      expect.arrayContaining([
        '/twitter/dm-history',
        '/twitter/send-dm',
        '/twitter/followers/{screen_name}/{count}',
        '/twitter/followers/page',
        '/twitter/following/{screen_name}/{count}',
        '/twitter/following/page',
        '/twitter/tweets/lookup',
      ]),
    );
  });

  test('extracts request body fields from referenced TwexAPI schemas', () => {
    expect(API_SPEC.find((endpoint) => endpoint.path === '/v3/twitter/send-dm')?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'body', name: 'recipient', required: true, type: 'string' }),
        expect.objectContaining({ in: 'body', name: 'text', required: true, type: 'string' }),
        expect.objectContaining({ in: 'body', name: 'cookie', required: true, type: 'string' }),
      ]),
    );
    expect(API_SPEC.find((endpoint) => endpoint.path === '/v3/twitter/grok/ask')?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'body', name: 'prompt', required: true, type: 'string' }),
        expect.objectContaining({ in: 'body', name: 'cookie', required: true, type: 'string' }),
      ]),
    );
    expect(API_SPEC.find((endpoint) => endpoint.path === '/v3/twitter/tweets/create-thread')?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'body', name: 'items', required: true, type: 'array<string>' }),
        expect.objectContaining({ in: 'body', name: 'cookie', required: true, type: 'string' }),
      ]),
    );
    expect(API_SPEC.find((endpoint) => endpoint.path === '/v2/tweet/detail')?.parameters).toContainEqual(
      expect.objectContaining({ in: 'body', name: 'body', required: true, type: 'array<string>' }),
    );
  });
});
