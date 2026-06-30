import type { FetchFunction, HttpMethod } from './types.js';
import { redactSecrets } from './tools/result.js';

interface RequestOptions {
  readonly body?: unknown;
  readonly method: HttpMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, boolean | number | string>>;
}

export function validateBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TwexAPI base URL must be a valid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('TwexAPI base URL must use HTTPS.');
  }

  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error('TwexAPI base URL must not include credentials.');
  }

  return url;
}

function buildUrl(baseUrl: URL, path: string, query?: Readonly<Record<string, boolean | number | string>>): string {
  if (!path.startsWith('/')) {
    throw new Error('TwexAPI path must start with /.');
  }

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  if (!response.ok) {
    const detail = rawBody.length === 0 ? response.statusText : rawBody;
    throw new Error(redactSecrets(`TwexAPI request failed with ${response.status} ${response.statusText}: ${detail}`));
  }

  if (rawBody.length === 0) return null;
  if (contentType.includes('application/json')) return JSON.parse(rawBody);
  return rawBody;
}

export function createTwexApiRequest(baseUrlValue: string, apiKey: string, fetchFunction: FetchFunction = fetch) {
  const baseUrl = validateBaseUrl(baseUrlValue);

  return async (options: RequestOptions): Promise<unknown> => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = {
      headers,
      method: options.method,
    };

    if (options.body !== undefined && options.method !== 'GET') {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetchFunction(buildUrl(baseUrl, options.path, options.query), init);
    return parseResponse(response);
  };
}
