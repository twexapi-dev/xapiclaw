import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const FORBIDDEN_README_TERMS = [
  ['M', 'PP'].join(''),
  ['m', 'ppx'].join(''),
  ['Tem', 'po'].join(''),
  ['vi', 'em'].join(''),
  ['xq', 'uik'].join(''),
];

describe('README', () => {
  test('documents XApiClaw with OpenClaw-style usage sections', () => {
    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('# XApiClaw');
    expect(readme).toContain('TwexAPI');
    expect(readme).toContain('Authorization: Bearer');
    expect(readme).toContain('openclaw plugins install npm:@twexapi-dev/xapiclaw');
    expect(readme).toContain('openclaw plugins update xapiclaw');
    expect(readme).toContain('https://context7.com/twexapi-dev/xapiclaw');
    expect(readme).toContain('https://apify.com/fastcrawler/tweet-x-twitter-scraper-0-05-1k-pay-per-result-v2');
    expect(readme).toContain('## OpenClaw Trust Model');
    expect(readme).toContain('## Tools');
    expect(readme).toContain('## Commands');
    expect(readme).toContain('## API Coverage');
    for (const term of FORBIDDEN_README_TERMS) expect(readme).not.toContain(term);
  });
});
