import { describe, expect, test } from 'vitest';
import { formatTrends, handleXTrends } from '../src/commands/xtrends.js';

describe('/xtrends command', () => {
  test('formats TwexAPI trend topics', () => {
    expect(formatTrends({ topics: ['AI', 'OpenClaw'] })).toContain('1. AI');
  });

  test('passes country argument to global trending tweets endpoint', async () => {
    const calls: unknown[] = [];
    const request = async (path: string, options?: { readonly query?: Readonly<Record<string, string>> }) => {
      calls.push({ path, options });
      return { topics: ['AI'] };
    };
    const result = await handleXTrends(request, 'global');
    expect(result).toContain('AI');
    expect(calls).toEqual([{ path: '/twitter/global-trending/topics', options: { query: { country: 'global' } } }]);
  });
});
