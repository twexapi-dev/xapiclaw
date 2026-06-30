import { describe, expect, test } from 'vitest';
import manifest from '../openclaw.plugin.json' with { type: 'json' };

describe('OpenClaw manifest', () => {
  test('declares xapiclaw tools and commands', () => {
    expect(manifest.id).toBe('xapiclaw');
    expect(manifest.commandAliases).toEqual([
      { kind: 'runtime-slash', name: 'xstatus' },
      { kind: 'runtime-slash', name: 'xtrends' },
    ]);
    expect(manifest.contracts.tools).toEqual(['explore', 'xapiclaw']);
    expect(manifest.toolMetadata.xapiclaw.optional).toBe(true);
  });

  test('declares only TwexAPI API key credential config', () => {
    expect(Object.keys(manifest.configSchema.properties)).toEqual([
      'apiKey',
      'baseUrl',
      'pollingInterval',
      'pollingEnabled',
    ]);
  });
});
