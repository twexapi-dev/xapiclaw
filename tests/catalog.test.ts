import { describe, expect, test } from 'vitest';
import {
  exploreCatalog,
  findEndpoint,
  matchesEndpointPath,
  requestNeedsApproval,
  resolveCatalogRequest,
  specEndpoints,
} from '../src/tools/catalog.js';

describe('TwexAPI catalog', () => {
  test('exposes only agent-callable endpoints', () => {
    expect(specEndpoints).toHaveLength(76);
    expect(specEndpoints.some((endpoint) => endpoint.path === '/twitter/{auth_token}/cookie')).toBe(false);
  });

  test('matches TwexAPI curly-brace path templates', () => {
    expect(matchesEndpointPath('/twitter/{screen_name}/about', '/twitter/elonmusk/about')).toBe(true);
    expect(matchesEndpointPath('/twitter/{screen_name}/about', '/twitter/elonmusk/about/extra')).toBe(false);
  });

  test('finds endpoints by concrete path', () => {
    const endpoint = findEndpoint('GET', '/twitter/elonmusk/about');
    expect(endpoint?.path).toBe('/twitter/{screen_name}/about');
  });

  test('resolves catalog request and normalizes query values', () => {
    expect(
      resolveCatalogRequest({
        method: 'GET',
        path: '/twitter/global-trending/topics',
        query: { includeTweets: false, limit: 5 },
      }),
    ).toEqual({
      endpoint: expect.objectContaining({ path: '/twitter/global-trending/topics' }),
      method: 'GET',
      path: '/twitter/global-trending/topics',
      query: { includeTweets: 'false', limit: '5' },
    });
  });

  test('rejects query strings inside path', () => {
    expect(() => resolveCatalogRequest({ path: '/twitter/global-trending/topics?limit=5' })).toThrow(
      'Pass query parameters through the query object',
    );
  });

  test('rejects blocked or unknown endpoints', () => {
    expect(() => resolveCatalogRequest({ path: '/twitter/not-real' })).toThrow('not in the XApiClaw catalog');
    expect(() => resolveCatalogRequest({ method: 'POST', path: '/twitter/action' })).toThrow(
      'not in the XApiClaw catalog',
    );
  });

  test('classifies approval-required requests', () => {
    expect(requestNeedsApproval('GET', '/twitter/global-trending/topics')).toBe(false);
    expect(requestNeedsApproval('GET', '/balance')).toBe(true);
    expect(requestNeedsApproval('POST', '/twitter/advanced_search')).toBe(true);
    expect(requestNeedsApproval('POST', '/twitter/tweets/create')).toBe(true);
  });

  test('explores by query, category, risk, and path', () => {
    expect(exploreCatalog({ query: 'advanced search' })[0]?.path).toBe('/twitter/advanced_search');
    expect(exploreCatalog({ category: 'Trending' }).every((endpoint) => endpoint.category === 'Trending')).toBe(true);
    expect(exploreCatalog({ risk: 'write' }).every((endpoint) => endpoint.risk === 'write')).toBe(true);
    expect(exploreCatalog({ path: '/twitter/elonmusk/about' })[0]?.path).toBe('/twitter/{screen_name}/about');
  });
});
