import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const IGNORED_DIRS = new Set(['.git', 'dist', 'node_modules']);
const FORBIDDEN_GITHUB_ORG = ['Xquik', 'dev'].join('-');
const FORBIDDEN_TWEXAPI_REPO = ['twexapi-dev', 'tweetclaw'].join('/');

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
  test('does not reference the legacy GitHub organization', () => {
    const offenders = collectTextFiles('.').filter((path) =>
      readFileSync(path, 'utf8').includes(FORBIDDEN_GITHUB_ORG),
    );

    expect(offenders).toEqual([]);
  });

  test('uses the XApiClaw repository under the TwexAPI GitHub organization', () => {
    const offenders = collectTextFiles('.').filter((path) =>
      readFileSync(path, 'utf8').includes(FORBIDDEN_TWEXAPI_REPO),
    );

    expect(offenders).toEqual([]);
  });

  test('uses XApiClaw public repository slug', () => {
    const files = collectTextFiles('.');
    const joined = files.map((path) => readFileSync(path, 'utf8')).join('\n');
    expect(joined).toContain('twexapi-dev/xapiclaw');
    expect(joined).not.toContain(['twexapi-dev', 'tweetclaw'].join('/'));
  });
});
