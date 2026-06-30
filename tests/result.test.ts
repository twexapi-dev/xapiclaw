import { describe, expect, test } from 'vitest';
import { errorResult, jsonResult, textResult } from '../src/tools/result.js';

describe('tool result helpers', () => {
  test('formats text results', () => {
    expect(textResult('hello')).toEqual({
      content: [{ text: 'hello', type: 'text' }],
    });
  });

  test('formats JSON results deterministically', () => {
    expect(jsonResult({ ok: true })).toEqual({
      content: [{ text: '{\n  "ok": true\n}', type: 'text' }],
    });
  });

  test('redacts bearer tokens in errors', () => {
    const result = errorResult(new Error('Authorization: Bearer secret-token failed'));

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('[REDACTED]');
    expect(result.content[0]?.text).not.toContain('secret-token');
  });
});
