import type { RequestFunction } from '../types.js';

interface TrendsResponse {
  readonly data?: readonly string[];
  readonly items?: readonly { readonly name?: string; readonly title?: string; readonly url?: string }[];
  readonly topics?: readonly string[];
}

function isTrendsResponse(value: unknown): value is TrendsResponse {
  return typeof value === 'object' && value !== null;
}

function formatTrends(value: unknown): string {
  if (!isTrendsResponse(value)) return '--- Trending Topics (0 items) ---';
  const topics =
    value.topics ??
    value.data ??
    value.items?.map((item) => item.title ?? item.name ?? '').filter((item) => item.length > 0) ??
    [];
  const lines = [`--- Trending Topics (${String(topics.length)} items) ---`];
  for (const [index, topic] of topics.entries()) lines.push(`${String(index + 1)}. ${topic}`);
  return lines.join('\n');
}

async function handleXTrends(request: RequestFunction, country?: string): Promise<string> {
  const trimmed = country?.trim();
  const options = trimmed === undefined || trimmed.length === 0 ? undefined : { query: { country: trimmed } };
  const result = await request('/twitter/global-trending/topics', options);
  return formatTrends(result);
}

export { formatTrends, handleXTrends };
