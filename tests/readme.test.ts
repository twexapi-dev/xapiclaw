import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('README', () => {
  test('documents TwexAPI setup and no MPP support', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('TwexAPI');
    expect(readme).toContain('Authorization: Bearer');
    expect(readme).toContain('No MPP');
    expect(readme).toContain('openclaw plugins install');
  });
});
