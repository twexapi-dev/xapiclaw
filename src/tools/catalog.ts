import { API_SPEC } from '../api-spec.js';
import type { EndpointInfo, EndpointRisk, ExploreParams, XApiClawParams } from '../types.js';

const DEFAULT_EXPLORE_LIMIT = 25;
const MAX_EXPLORE_LIMIT = 100;
const METHODS = new Set(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
const APPROVAL_RISKS = new Set<EndpointRisk>(['paid-bulk', 'private-read', 'write']);

const specEndpoints: readonly EndpointInfo[] = API_SPEC.filter((endpoint) => endpoint.agentProhibited !== true);

function normalizeMethod(method?: string): string {
  return (method ?? 'GET').toUpperCase();
}

function normalizeLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_EXPLORE_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_EXPLORE_LIMIT);
}

function pathSegments(path: string): readonly string[] {
  const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
  return normalized.split('/');
}

function isTemplateSegment(segment: string): boolean {
  return (segment.startsWith('{') && segment.endsWith('}')) || segment.startsWith(':');
}

function matchesEndpointPath(endpointPath: string, requestPath: string): boolean {
  if (endpointPath === requestPath) return true;
  const endpointSegments = pathSegments(endpointPath);
  const requestSegments = pathSegments(requestPath);
  if (endpointSegments.length !== requestSegments.length) return false;

  return endpointSegments.every((segment, index) => {
    const requestSegment = String(requestSegments.at(index));
    return isTemplateSegment(segment) ? requestSegment.length > 0 : segment === requestSegment;
  });
}

function assertSafePath(path: string): void {
  if (!path.startsWith('/')) throw new Error(`Path must start with / but got: ${path}`);
  if (path.includes('?') || path.includes('#')) {
    throw new Error('Pass query parameters through the query object, not in the path.');
  }
}

function findEndpoint(method: string, path: string): EndpointInfo | undefined {
  const normalizedMethod = normalizeMethod(method);
  if (!METHODS.has(normalizedMethod)) return undefined;
  return specEndpoints.find((endpoint) => endpoint.method === normalizedMethod && matchesEndpointPath(endpoint.path, path));
}

function normalizeQuery(query?: Readonly<Record<string, boolean | number | string>>): Readonly<Record<string, string>> | undefined {
  if (query === undefined) return undefined;
  return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, String(value)]));
}

function requestNeedsApproval(method: string, path: string): boolean {
  const endpoint = findEndpoint(method, path);
  return endpoint === undefined ? false : APPROVAL_RISKS.has(endpoint.risk);
}

function resolveCatalogRequest(params: Readonly<XApiClawParams>): {
  readonly body?: unknown;
  readonly endpoint: EndpointInfo;
  readonly method: string;
  readonly path: string;
  readonly query?: Readonly<Record<string, string>>;
} {
  const method = normalizeMethod(params.method);
  const { body, path } = params;
  assertSafePath(path);
  const endpoint = findEndpoint(method, path);
  if (endpoint === undefined) {
    throw new Error(`Endpoint is not in the XApiClaw catalog: ${method} ${path}`);
  }

  const query = normalizeQuery(params.query);
  return {
    ...(body === undefined ? {} : { body }),
    endpoint,
    method,
    path,
    ...(query === undefined ? {} : { query }),
  };
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

function endpointMatchesQuery(endpoint: EndpointInfo, query: string): boolean {
  const normalized = normalizeSearchText(query);
  const haystack = [
    endpoint.category,
    endpoint.cost ?? '',
    endpoint.method,
    endpoint.path,
    endpoint.responseShape ?? '',
    endpoint.risk,
    endpoint.summary,
    ...(endpoint.parameters ?? []).flatMap((parameter) => [
      parameter.description,
      parameter.name,
      parameter.type,
    ]),
  ].join(' ');
  return normalizeSearchText(haystack).includes(normalized);
}

function exploreCatalog(params: Readonly<ExploreParams> = {}): readonly EndpointInfo[] {
  const method = params.method === undefined ? undefined : normalizeMethod(params.method);
  const query = params.query?.trim();
  const category = params.category?.trim().toLowerCase();
  const path = params.path?.trim();
  const limit = normalizeLimit(params.limit);

  return specEndpoints
    .filter((endpoint) => method === undefined || endpoint.method === method)
    .filter((endpoint) => category === undefined || endpoint.category.toLowerCase() === category)
    .filter((endpoint) => params.free === undefined || (params.free ? endpoint.risk === 'read' : endpoint.risk !== 'read'))
    .filter((endpoint) => params.risk === undefined || endpoint.risk === params.risk)
    .filter((endpoint) => path === undefined || matchesEndpointPath(endpoint.path, path) || endpoint.path.includes(path))
    .filter((endpoint) => query === undefined || query.length === 0 || endpointMatchesQuery(endpoint, query))
    .slice(0, limit);
}

export {
  exploreCatalog,
  findEndpoint,
  matchesEndpointPath,
  normalizeMethod,
  requestNeedsApproval,
  resolveCatalogRequest,
  specEndpoints,
};
