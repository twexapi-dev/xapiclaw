import { describe, expect, test } from 'vitest';
import { handleExplore } from '../src/tools/explore.js';

describe('explore tool', () => {
  test('filters catalog by query and method', () => {
    const result = handleExplore({ method: 'POST', query: 'advanced search' });
    const text = result.content[0]?.text ?? '';

    expect(text).toContain('POST /twitter/advanced_search');
    expect(text).not.toContain('GET /twitter/global-trending/topics');
  });

  test('filters catalog by category', () => {
    const result = handleExplore({ category: 'trending', limit: 3 });
    const text = result.content[0]?.text ?? '';

    expect(text).toContain('Trending');
    expect(text).toContain('/twitter/global-trending');
  });

  test('returns a useful empty message', () => {
    const result = handleExplore({ query: 'auth token cookie' });
    expect(result.content[0]?.text).toContain('No XApiClaw endpoints matched');
  });
});
