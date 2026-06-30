import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const IGNORED_DIRS = new Set(['.git', '.tmp', '.worktrees', 'dist', 'node_modules', 'superpowers']);
const FORBIDDEN_TERMS = [
  ['Xquik', 'dev'].join('-'),
  ['twexapi-dev', 'tweetclaw'].join('/'),
  ['m', 'ppx'].join(''),
  ['Tem', 'po'].join(''),
  ['vi', 'em'].join(''),
  ['xq', 'uik'].join(''),
];

function collectTextFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectTextFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

describe('project branding', () => {
  test('does not reference forbidden upstream public terms', () => {
    const offenders = collectTextFiles('.').flatMap((path) => {
      const content = readFileSync(path, 'utf8');
      return FORBIDDEN_TERMS.filter((term) => content.includes(term)).map((term) => `${path}: ${term}`);
    });
    expect(offenders).toEqual([]);
  });

  test('uses XApiClaw public repository slug', () => {
    const files = collectTextFiles('.');
    const joined = files.map((path) => readFileSync(path, 'utf8')).join('\n');
    expect(joined).toContain('twexapi-dev/xapiclaw');
    expect(joined).not.toContain(['twexapi-dev', 'tweetclaw'].join('/'));
  });
});
