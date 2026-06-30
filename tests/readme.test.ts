import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('README', () => {
  test('documents TwexAPI setup with TweetClaw-style usage sections', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('TwexAPI');
    expect(readme).toContain('Authorization: Bearer');
    expect(readme).toContain('No MPP');
    expect(readme).toContain('openclaw plugins install');
    expect(readme).toContain('openclaw plugins update xapiclaw');

    for (const heading of [
      '## Install',
      '## Configure',
      '### Enable the optional action tool',
      '## OpenClaw Trust Model',
      '## Tools',
      '## Commands',
      '## API Coverage',
      '## Links',
    ]) {
      expect(readme).toContain(heading);
    }
  });
});
