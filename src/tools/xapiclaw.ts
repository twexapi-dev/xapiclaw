import { createTwexApiRequest } from '../request.js';
import type { FetchFunction, RequestFunction, ToolResult, XApiClawParams } from '../types.js';
import { resolveCatalogRequest, specEndpoints } from './catalog.js';
import { errorResult, successResult } from './result.js';

const EXECUTE_DESCRIPTION = `Invoke one TwexAPI endpoint from the bundled XApiClaw catalog.

Use "explore" first to find the endpoint, then call this tool with structured parameters:
- path: concrete TwexAPI path
- method: GET, POST, PATCH, PUT, or DELETE
- query: query parameters as an object
- body: JSON request body

Auth is injected automatically. Never pass API keys, passwords, cookies, auth tokens, or TOTP secrets.

Important rules:
- Only endpoints listed in the bundled catalog can be invoked. Unknown paths are rejected.
- The plugin only calls the configured TwexAPI API base URL.
- Blocked cookie conversion, engagement purchase, profile mutation, random-cookie posting, and sentiment endpoints are not agent-callable.
- Write, private-read, and paid/bulk calls trigger an OpenClaw approval prompt.

Example: Search tweets
{
  "path": "/twitter/advanced_search",
  "method": "POST",
  "body": { "query": "AI agents" }
}`;

const EXECUTION_TIMEOUT_MS = 30_000;
const MS_PER_SECOND = 1000;
const MISSING_CREDENTIALS_MESSAGE =
  'XApiClaw is installed but not configured. Add a TwexAPI API key in OpenClaw plugin config before live network calls.';

function createExecutionTimeout(timeoutMs: number): {
  readonly cancel: () => void;
  readonly promise: Promise<never>;
} {
  const controller = new AbortController();
  const promise = new Promise<never>((_resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Execution timed out after ${String(timeoutMs / MS_PER_SECOND)}s`));
    }, timeoutMs);
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    }, { once: true });
  });

  return {
    cancel: (): void => {
      controller.abort();
    },
    promise,
  };
}

interface XApiClawOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly fetchFunction?: FetchFunction | undefined;
  readonly params: Readonly<XApiClawParams>;
  readonly timeoutMs?: number | undefined;
}

async function handleXApiClaw(options: Readonly<XApiClawOptions>): Promise<ToolResult> {
  const {
    apiKey,
    baseUrl,
    fetchFunction,
    params,
    timeoutMs = EXECUTION_TIMEOUT_MS,
  } = options;

  try {
    if (apiKey.length === 0) return errorResult(new Error(MISSING_CREDENTIALS_MESSAGE));
    const requestInfo = resolveCatalogRequest(params);
    const request: RequestFunction = createTwexApiRequest(baseUrl, apiKey, fetchFunction);
    const timeout = createExecutionTimeout(timeoutMs);

    try {
      const result = await Promise.race([
        request(requestInfo.path, {
          ...(requestInfo.body === undefined ? {} : { body: requestInfo.body }),
          method: requestInfo.method,
          ...(requestInfo.query === undefined ? {} : { query: requestInfo.query }),
        }),
        timeout.promise,
      ]);

      return successResult(result);
    } finally {
      timeout.cancel();
    }
  } catch (error: unknown) {
    return errorResult(error);
  }
}

export { EXECUTE_DESCRIPTION, handleXApiClaw, specEndpoints };
