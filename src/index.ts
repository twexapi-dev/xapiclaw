import type { PluginConfig } from './types.js';

export const DEFAULT_BASE_URL = 'https://api.twexapi.io';
const MIN_POLLING_INTERVAL_SECONDS = 5;

function asObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.fromEntries(Object.entries(value));
}

function normalizePollingInterval(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(Math.trunc(value), MIN_POLLING_INTERVAL_SECONDS);
}

export function asPluginConfig(value: unknown): PluginConfig {
  const config = asObject(value);
  if (config === undefined) return {};

  const { apiKey, baseUrl, pollingEnabled, pollingInterval } = config;
  const normalizedPollingInterval = normalizePollingInterval(pollingInterval);

  return {
    ...(typeof apiKey === 'string' && apiKey.length > 0 ? { apiKey } : {}),
    ...(typeof baseUrl === 'string' && baseUrl.length > 0 ? { baseUrl } : {}),
    ...(typeof pollingEnabled === 'boolean' ? { pollingEnabled } : {}),
    ...(normalizedPollingInterval === undefined ? {} : { pollingInterval: normalizedPollingInterval }),
  };
}
