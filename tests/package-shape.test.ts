import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

const packageShape = packageJson as typeof packageJson & { readonly peerDependenciesMeta?: unknown };

describe('package shape', () => {
  test('uses xapiclaw identity and runtime entry', () => {
    expect(packageJson.name).toBe('xapiclaw');
    expect(packageJson.repository.url).toBe('git+https://github.com/twexapi-dev/xapiclaw.git');
    expect(packageJson.homepage).toBe('https://github.com/twexapi-dev/xapiclaw#readme');
    expect(packageJson.bugs.url).toBe('https://github.com/twexapi-dev/xapiclaw/issues');
    expect(packageJson.openclaw.runtimeExtensions).toEqual(['./dist/index.js']);
    expect(packageJson.openclaw.install.npmSpec).toBe('xapiclaw@0.1.0');
  });

  test('build excludes tests from tsconfig include', () => {
    const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8')) as { include: string[] };
    expect(tsconfig.include).toEqual(['src/**/*.ts']);
  });

  test('does not declare extra peer dependency metadata', () => {
    expect(packageJson.peerDependencies).toEqual({ openclaw: '>=2026.6.8' });
    expect(packageShape.peerDependenciesMeta).toBeUndefined();
  });
});
