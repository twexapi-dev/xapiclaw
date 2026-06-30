import { describe, expect, test } from 'vitest';
import packageJson from '../package.json' with { type: 'json' };

describe('package artifact intent', () => {
  test('ships runtime and source files but not compiled tests', () => {
    expect(packageJson.files).toEqual([
      'dist/',
      'src/',
      'skills/xapiclaw/SKILL.md',
      'openclaw.plugin.json',
      'server.json',
    ]);
    expect(packageJson.openclaw.runtimeExtensions).toEqual(['./dist/index.js']);
  });
});
