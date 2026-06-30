import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const FORBIDDEN_README_TERMS = [
  ['M', 'PP'].join(''),
  ['m', 'ppx'].join(''),
  ['Tem', 'po'].join(''),
  ['vi', 'em'].join(''),
  ['pay', 'per', 'use signing'].join('-'),
];

describe('README', () => {
  test('documents TwexAPI setup with TweetClaw-style usage sections', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('TwexAPI');
    expect(readme).toContain('Authorization: Bearer');
    expect(readme).toContain('openclaw plugins install');
    expect(readme).toContain('openclaw plugins update xapiclaw');
    for (const term of FORBIDDEN_README_TERMS) {
      expect(readme).not.toContain(term);
    }

    for (const heading of [
      '## Install',
      '## Configure',
      '### TwexAPI API key',
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
