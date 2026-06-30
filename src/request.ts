import type { FetchFunction, RequestFunction, RequestOptions } from './types.js';

const FETCH_TIMEOUT_MS = 30_000;
const CONTENT_TYPE_HEADER = 'content-type';
const AUTHORIZATION_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';
const MAX_SAFE_ERROR_CODE_LENGTH = 80;

function buildAuthHeader(apiKey: string): Record<string, string> {
  return { [AUTHORIZATION_HEADER]: `${BEARER_PREFIX}${apiKey}` };
}

function buildFetchHeaders(apiKey: string, hasBody: boolean): Record<string, string> {
  const auth = apiKey === '' ? {} : buildAuthHeader(apiKey);
  if (hasBody) return { ...auth, [CONTENT_TYPE_HEADER]: 'application/json' };
  return auth;
}

function createBaseUrl(baseUrl: string): URL {
  try {
    return new URL(baseUrl);
  } catch {
    throw new Error('Base URL must be a valid HTTPS URL.');
  }
}

function parseBaseUrl(baseUrl: string): URL {
  const url = createBaseUrl(baseUrl);
  if (url.protocol !== 'https:') throw new Error('Base URL must use HTTPS.');
  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error('Base URL must not include credentials.');
  }
  return url;
}

function buildFetchUrl(baseUrl: string, path: string, query?: Readonly<Record<string, string>>): string {
  if (!path.startsWith('/')) throw new Error(`Path must start with / but got: ${path}`);
  const url = new URL(path, parseBaseUrl(baseUrl));
  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  return url.toString();
}

const PROHIBITED_PATHS: ReadonlyArray<readonly [string, string]> = [
  ['GET', '/twitter/{auth_token}/cookie'],
  ['GET', '/twitter/{auth_token}/user_info'],
  ['POST', '/twitter/action'],
  ['POST', '/twitter/action/order-status'],
  ['POST', '/twitter/profile'],
  ['POST', '/twitter/list/create'],
  ['POST', '/twitter/post-tweet-without-cookie'],
  ['POST', '/twitter/tweets/sentiment'],
];

const PROHIBITED_PATH_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['GET', /^\/twitter\/[^/]+\/cookie\/?$/u],
  ['GET', /^\/twitter\/[^/]+\/user_info\/?$/u],
];

function normalizeProhibitedPath(path: string): string {
  let end = path.length;
  while (end > 1 && path.charAt(end - 1) === '/') end -= 1;
  return end === path.length ? path : path.slice(0, end);
}

function isProhibitedRequest(method: string, path: string): boolean {
  const upperMethod = method.toUpperCase();
  const normalizedPath = normalizeProhibitedPath(path);
  const staticMatch = PROHIBITED_PATHS.some(
    ([blockedMethod, blockedPath]) => upperMethod === blockedMethod && normalizedPath === blockedPath,
  );
  const patternMatch = PROHIBITED_PATH_PATTERNS.some(
    ([blockedMethod, pattern]) => upperMethod === blockedMethod && pattern.test(normalizedPath),
  );
  return staticMatch || patternMatch;
}

function validateRequestPath(method: string, path: string): void {
  if (!path.startsWith('/')) throw new Error(`Path must start with / but got: ${path}`);
  if (path.includes('?') || path.includes('#')) {
    throw new Error('Pass query parameters through the query object, not in the path.');
  }
  if (isProhibitedRequest(method, path)) {
    throw new Error('Agent-prohibited endpoint. This TwexAPI endpoint is blocked from XApiClaw agent execution.');
  }
}

async function readResponseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isAsciiLetter(character: string): boolean {
  const lower = character.toLowerCase();
  return lower >= 'a' && lower <= 'z';
}

function isAsciiDigit(character: string): boolean {
  return character >= '0' && character <= '9';
}

function isSafeErrorCodeCharacter(character: string): boolean {
  return isAsciiLetter(character) || isAsciiDigit(character) || character === '_' || character === '.' || character === ':' || character === '-';
}

function isSafeErrorCode(value: string): boolean {
  if (value.length === 0 || value.length > MAX_SAFE_ERROR_CODE_LENGTH || !isAsciiLetter(value.slice(0, 1))) return false;
  for (const character of value) {
    if (!isSafeErrorCodeCharacter(character)) return false;
  }
  return true;
}

function stringErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  if ('error' in value && typeof value.error === 'string') return value.error;
  if ('code' in value && typeof value.code === 'string') return value.code;
  return undefined;
}

function safeErrorCode(value: unknown): string | undefined {
  const code = stringErrorCode(value);
  return code !== undefined && isSafeErrorCode(code) ? code : undefined;
}

function formatApiError(response: Response, payload: unknown): string {
  const status = response.statusText.length > 0 ? `${String(response.status)} ${response.statusText}` : String(response.status);
  const code = safeErrorCode(payload);
  if (code === undefined) return `API request failed: ${status}`;
  return `API request failed: ${status} (${code})`;
}

function createTwexApiRequest(
  baseUrl: string,
  apiKey: string,
  fetchFunction: FetchFunction = fetch,
): RequestFunction {
  parseBaseUrl(baseUrl);
  return async (path: string, options?: Readonly<RequestOptions>): Promise<unknown> => {
    const method = options?.method ?? 'GET';
    validateRequestPath(method, path);
    const hasBody = options?.body !== undefined && method !== 'GET';
    const response = await fetchFunction(buildFetchUrl(baseUrl, path, options?.query), {
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
      headers: buildFetchHeaders(apiKey, hasBody),
      method,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json = await readResponseJson(response);
    if (!response.ok) throw new Error(formatApiError(response, json));
    return json;
  };
}

export { buildAuthHeader, buildFetchHeaders, buildFetchUrl, createTwexApiRequest, isProhibitedRequest };
