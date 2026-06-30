import { describe, expect, test } from 'vitest';
import { truncateResponse, truncateText } from '../src/truncate.js';

describe('truncate utilities', () => {
  test('keeps short text unchanged', () => {
    expect(truncateText('short')).toBe('short');
  });

  test('truncates oversized text with marker', () => {
    const result = truncateText('x'.repeat(30_000));
    expect(result.length).toBeLessThan(30_000);
    expect(result).toContain('--- TRUNCATED ---');
    expect(result).toContain('limit: 6,000');
  });

  test('stringifies JSON content before truncating', () => {
    expect(truncateResponse({ ok: true })).toContain('"ok": true');
  });
});
