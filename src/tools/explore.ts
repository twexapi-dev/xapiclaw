import type { EndpointDescriptor, ExploreParams, HttpMethod, ToolResult } from '../types.js';
import { CATALOG, normalizeMethod } from './catalog.js';
import { textResult } from './result.js';

export const SEARCH_DESCRIPTION =
  'Search XApiClaw TwexAPI endpoint catalog without making network calls.';

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function includesText(value: string, query: string): boolean {
  return normalizeSearchText(value).includes(normalizeSearchText(query));
}

function matchesQuery(endpoint: EndpointDescriptor, query: string): boolean {
  return [endpoint.path, endpoint.category, endpoint.summary, endpoint.risk, endpoint.cost ?? ''].some((value) =>
    includesText(value, query),
  );
}

function filterCatalog(params: Readonly<ExploreParams>): readonly EndpointDescriptor[] {
  const method = normalizeMethod(params.method) as HttpMethod | undefined;
  const limit = typeof params.limit === 'number' && Number.isFinite(params.limit)
    ? Math.min(Math.max(Math.trunc(params.limit), 1), 100)
    : 25;

  return CATALOG.filter((endpoint) => {
    if (method !== undefined && endpoint.method !== method) return false;
    if (params.category !== undefined && !includesText(endpoint.category, params.category)) return false;
    if (params.path !== undefined && !includesText(endpoint.path, params.path)) return false;
    if (params.query !== undefined && !matchesQuery(endpoint, params.query)) return false;
    if (params.free === true && endpoint.risk !== 'read') return false;
    if (params.free === false && endpoint.risk === 'read') return false;
    return true;
  }).slice(0, limit);
}

function formatEndpoint(endpoint: EndpointDescriptor): string {
  const approval = endpoint.approvalReason === undefined ? 'approval: no' : `approval: yes (${endpoint.risk})`;
  const cost = endpoint.cost === undefined ? 'cost: see TwexAPI docs' : `cost: ${endpoint.cost}`;
  return [
    `${endpoint.method} ${endpoint.path}`,
    `  category: ${endpoint.category}`,
    `  summary: ${endpoint.summary}`,
    `  ${cost}`,
    `  ${approval}`,
  ].join('\n');
}

export function handleExplore(params: Readonly<ExploreParams>): ToolResult {
  const endpoints = filterCatalog(params);
  if (endpoints.length === 0) {
    return textResult('No XApiClaw endpoints matched the provided filters.');
  }

  return textResult(endpoints.map(formatEndpoint).join('\n\n'));
}
