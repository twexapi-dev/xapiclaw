import { describe, expect, test } from 'vitest';
import { API_SPEC } from '../src/api-spec.js';

describe('TwexAPI API spec', () => {
  test('contains the full TwexAPI operation snapshot', () => {
    expect(API_SPEC).toHaveLength(84);
  });

  test('marks the agent-callable subset and blocked families', () => {
    const callable = API_SPEC.filter((endpoint) => endpoint.agentProhibited !== true);
    expect(callable).toHaveLength(76);
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
});
