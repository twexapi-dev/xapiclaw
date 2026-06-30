import { describe, expect, test } from 'vitest';
import {
  CATALOG,
  findEndpoint,
  isBlockedPath,
  normalizeMethod,
  requestNeedsApproval,
} from '../src/tools/catalog.js';

describe('TwexAPI catalog', () => {
  test('contains the selected TweetClaw-like safety subset', () => {
    expect(findEndpoint('POST', '/twitter/advanced_search')?.category).toBe('Search');
    expect(findEndpoint('GET', '/twitter/tweets/123/similar')?.path).toBe('/twitter/tweets/{tweet_id}/similar');
    expect(findEndpoint('POST', '/twitter/tweets/create')?.risk).toBe('write');
    expect(findEndpoint('POST', '/twitter/dm-history')?.risk).toBe('private-read');
    expect(findEndpoint('GET', '/twitter/global-trending/topics')?.risk).toBe('read');
  });

  test('does not expose excluded endpoint families', () => {
    const paths = CATALOG.map((entry) => entry.path);

    expect(paths).not.toContain('/twitter/{auth_token}/cookie');
    expect(paths).not.toContain('/twitter/action');
    expect(paths).not.toContain('/twitter/profile');
    expect(paths).not.toContain('/twitter/post-tweet-without-cookie');
    expect(isBlockedPath('/twitter/action')).toBe(true);
    expect(isBlockedPath('/twitter/profile')).toBe(true);
    expect(isBlockedPath('/twitter/raw-token/cookie')).toBe(true);
  });

  test('normalizes supported methods and rejects unsupported methods', () => {
    expect(normalizeMethod('post')).toBe('POST');
    expect(normalizeMethod('TRACE')).toBeUndefined();
  });

  test('requires approval for write, private-read, and paid-bulk endpoints', () => {
    expect(requestNeedsApproval('POST', '/twitter/tweets/create')).toBe(true);
    expect(requestNeedsApproval('POST', '/twitter/dm-history')).toBe(true);
    expect(requestNeedsApproval('POST', '/twitter/advanced_search')).toBe(true);
    expect(requestNeedsApproval('GET', '/twitter/global-trending/topics')).toBe(false);
  });
});
