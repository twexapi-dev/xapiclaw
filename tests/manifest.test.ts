import { describe, expect, test } from 'vitest';
import manifest from '../openclaw.plugin.json' with { type: 'json' };

describe('OpenClaw manifest', () => {
  test('declares xapiclaw identity and no payment signing config', () => {
    expect(manifest.id).toBe('xapiclaw');
    expect(manifest.configSchema.properties).toHaveProperty('apiKey');
    expect(manifest.configSchema.properties).not.toHaveProperty('tempoSigningKey');
  });

  test('marks live execution tool optional', () => {
    expect(manifest.toolMetadata.xapiclaw.optional).toBe(true);
  });
});
