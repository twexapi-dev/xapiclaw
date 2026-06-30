import { describe, expect, test } from 'vitest';
import { asPluginConfig, DEFAULT_BASE_URL } from '../src/index.js';

describe('plugin scaffold exports', () => {
  test('uses TwexAPI as the default base URL', () => {
    expect(DEFAULT_BASE_URL).toBe('https://api.twexapi.io');
  });

  test('normalizes plugin config without MPP fields', () => {
    expect(
      asPluginConfig({
        apiKey: 'twex_test_key',
        baseUrl: 'https://api.twexapi.io',
        pollingEnabled: true,
        pollingInterval: 2,
        tempoSigningKey: 'ignored',
      }),
    ).toEqual({
      apiKey: 'twex_test_key',
      baseUrl: 'https://api.twexapi.io',
      pollingEnabled: true,
      pollingInterval: 5,
    });
  });
});
