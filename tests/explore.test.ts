import { describe, expect, test } from 'vitest';
import { handleExplore } from '../src/tools/explore.js';

describe('explore tool', () => {
  test('formats matching endpoint details', () => {
    const result = handleExplore({ limit: 1, query: 'advanced search' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain('POST /twitter/advanced_search');
    expect(result.content[0]?.text).toContain('risk: paid-bulk');
  });

  test('supports free read filtering', () => {
    const result = handleExplore({ free: true, query: 'global trending topics' });
    expect(result.content[0]?.text).toContain('GET /twitter/global-trending/topics');
    expect(result.content[0]?.text).toContain('approval: no');
  });

  test('returns a no-match message', () => {
    expect(handleExplore({ query: 'not-a-real-operation' }).content[0]?.text).toBe(
      'No XApiClaw endpoints matched the provided filters.',
    );
  });
});
