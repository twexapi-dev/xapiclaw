import { createTwexApiRequest } from '../request.js';
import type { FetchFunction, ToolResult, XApiClawParams } from '../types.js';
import { findEndpoint, normalizeMethod } from './catalog.js';
import { errorResult, jsonResult } from './result.js';

export const EXECUTE_DESCRIPTION =
  'Invoke one approved TwexAPI endpoint from the XApiClaw curated catalog.';

const MISSING_CREDENTIALS_MESSAGE =
  'XApiClaw is installed but not configured. Add a TwexAPI API key in OpenClaw plugin config before live network calls.';

interface HandleOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly fetchFunction?: FetchFunction;
  readonly params: Readonly<XApiClawParams>;
}

export async function handleXApiClaw(options: HandleOptions): Promise<ToolResult> {
  try {
    if (options.apiKey.length === 0) {
      return errorResult(new Error(MISSING_CREDENTIALS_MESSAGE));
    }

    const method = normalizeMethod(options.params.method ?? 'GET');
    if (method === undefined) {
      return errorResult(new Error(`Unsupported HTTP method: ${String(options.params.method)}`));
    }

    const endpoint = findEndpoint(method, options.params.path);
    if (endpoint === undefined) {
      return errorResult(
        new Error(`${method} ${options.params.path} is not in the XApiClaw catalog or uses the wrong method.`),
      );
    }

    const request = createTwexApiRequest(options.baseUrl, options.apiKey, options.fetchFunction);
    const response = await request({
      body: options.params.body,
      method,
      path: options.params.path,
      query: options.params.query,
    });
    return jsonResult(response);
  } catch (error: unknown) {
    return errorResult(error);
  }
}
