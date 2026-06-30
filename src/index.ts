import {
  definePluginEntry,
  type OpenClawPluginApi,
  type OpenClawPluginConfigSchema,
} from 'openclaw/plugin-sdk/plugin-entry';
import type { JsonSchemaObject } from 'openclaw/plugin-sdk/config-schema';
import { handleXStatus } from './commands/xstatus.js';
import { handleXTrends } from './commands/xtrends.js';
import { createTwexApiRequest } from './request.js';
import { normalizeMethod, requestNeedsApproval } from './tools/catalog.js';
import { handleExplore, SEARCH_DESCRIPTION } from './tools/explore.js';
import { EXECUTE_DESCRIPTION, handleXApiClaw } from './tools/xapiclaw.js';
import type { ExploreParams, FetchFunction, PluginConfig, ToolResult, XApiClawParams } from './types.js';

const DEFAULT_BASE_URL = 'https://api.twexapi.io';
const DEFAULT_POLLING_INTERVAL_SECONDS = 60;
const MIN_POLLING_INTERVAL_SECONDS = 5;

const CONFIG_JSON_SCHEMA = {
  additionalProperties: false,
  properties: {
    apiKey: { description: 'TwexAPI API key. Store as sensitive OpenClaw plugin config.', minLength: 1, type: 'string' },
    baseUrl: {
      default: DEFAULT_BASE_URL,
      description: 'HTTPS TwexAPI-compatible API base URL.',
      pattern: '^https://',
      type: 'string',
    },
    pollingInterval: {
      default: DEFAULT_POLLING_INTERVAL_SECONDS,
      description: 'Reserved polling interval in seconds.',
      minimum: MIN_POLLING_INTERVAL_SECONDS,
      type: 'number',
    },
    pollingEnabled: { default: false, type: 'boolean' },
  },
  type: 'object',
} as const;

const CONFIG_SCHEMA: OpenClawPluginConfigSchema = {
  jsonSchema: CONFIG_JSON_SCHEMA as unknown as JsonSchemaObject,
};

interface CommandContext {
  readonly args?: string;
}

interface BeforeToolCallEvent {
  readonly params?: unknown;
  readonly toolName?: string;
}

interface ToolApprovalRequest {
  readonly allowedDecisions?: readonly ['allow-once', 'deny'];
  readonly description: string;
  readonly pluginId?: string;
  readonly severity?: 'critical' | 'info' | 'warning';
  readonly timeoutBehavior?: 'allow' | 'deny';
  readonly timeoutMs?: number;
  readonly title: string;
}

interface BeforeToolCallResult {
  readonly requireApproval?: ToolApprovalRequest;
}

type BeforeToolCallHandler = (
  event: BeforeToolCallEvent,
) => BeforeToolCallResult | Promise<BeforeToolCallResult | undefined> | undefined;

interface OpenClawApi {
  readonly logger: {
    readonly debug?: (message: string) => void;
    readonly error: (message: string) => void;
    readonly info: (message: string) => void;
    readonly warn: (message: string) => void;
  };
  readonly pluginConfig?: Readonly<Record<string, unknown>>;
  readonly registerCommand: (options: {
    readonly acceptsArgs?: boolean;
    readonly description: string;
    readonly handler: (context: CommandContext) => Promise<{ readonly text: string }>;
    readonly name: string;
  }) => void;
  readonly registerService: (options: {
    readonly id: string;
    readonly start: (context?: unknown) => void;
    readonly stop?: (context?: unknown) => void;
  }) => void;
  readonly registerTool: (
    tool: {
      readonly description: string;
      readonly execute: (toolCallId: string, params: unknown) => Promise<ToolResult>;
      readonly label?: string;
      readonly name: string;
      readonly parameters: unknown;
    },
    options?: { readonly name?: string; readonly optional?: boolean },
  ) => void;
  readonly on?: (
    name: 'before_tool_call',
    handler: BeforeToolCallHandler,
    options?: { readonly priority?: number },
  ) => void;
  readonly registerHook?: (
    name: 'before_tool_call',
    handler: BeforeToolCallHandler,
    options?: { readonly priority?: number },
  ) => void;
}

const EXPLORE_PARAMETERS = {
  properties: {
    category: { description: 'Endpoint category filter', type: 'string' },
    free: { description: 'Filter to no-approval read endpoints when true.', type: 'boolean' },
    limit: { default: 25, description: 'Maximum endpoint descriptors to return', maximum: 100, minimum: 1, type: 'number' },
    method: { description: 'HTTP method filter', enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], type: 'string' },
    path: { description: 'Exact or partial API path filter', type: 'string' },
    query: { description: 'Keyword search across endpoint metadata', type: 'string' },
    risk: { description: 'Risk filter', enum: ['read', 'private-read', 'paid-bulk', 'write'], type: 'string' },
  },
  type: 'object',
};

const XAPICLAW_PARAMETERS = {
  additionalProperties: false,
  properties: {
    body: {
      description: 'JSON request body',
      items: {},
      type: ['object', 'array', 'string', 'number', 'boolean', 'null'],
    },
    method: { default: 'GET', description: 'HTTP method', enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], type: 'string' },
    path: { description: 'Concrete TwexAPI endpoint path from the catalog', type: 'string' },
    query: {
      additionalProperties: { type: ['string', 'number', 'boolean'] },
      description: 'Query parameters',
      type: 'object',
    },
  },
  required: ['path'],
  type: 'object',
};

function asObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  return Object.fromEntries(Object.entries(value));
}

function normalizePollingInterval(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(Math.trunc(value), MIN_POLLING_INTERVAL_SECONDS);
}

function asPluginConfig(value: unknown): PluginConfig {
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

function asExploreParams(params: unknown): Readonly<ExploreParams> {
  const value = asObject(params);
  if (value === undefined) return {};
  const { category, free, limit, method, path, query, risk } = value;
  return {
    ...(typeof category === 'string' ? { category } : {}),
    ...(typeof free === 'boolean' ? { free } : {}),
    ...(typeof limit === 'number' ? { limit } : {}),
    ...(typeof method === 'string' ? { method } : {}),
    ...(typeof path === 'string' ? { path } : {}),
    ...(typeof query === 'string' ? { query } : {}),
    ...(risk === 'read' || risk === 'private-read' || risk === 'paid-bulk' || risk === 'write' ? { risk } : {}),
  };
}

function asQueryParams(value: unknown): Readonly<Record<string, boolean | number | string>> | undefined {
  const query = asObject(value);
  if (query === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(query).filter(
      (entry): entry is [string, boolean | number | string] =>
        ['boolean', 'number', 'string'].includes(typeof entry[1]),
    ),
  );
}

function asXApiClawParams(params: unknown): Readonly<XApiClawParams> {
  const value = asObject(params);
  if (value === undefined) return { path: '' };
  const { body, method, path, query: rawQuery } = value;
  if (typeof path !== 'string') return { path: '' };
  const query = asQueryParams(rawQuery);
  return {
    ...(body === undefined ? {} : { body }),
    ...(typeof method === 'string' ? { method } : {}),
    path,
    ...(query === undefined ? {} : { query }),
  };
}

function requiresXApiClawApproval(params: Readonly<XApiClawParams>): boolean {
  return requestNeedsApproval(normalizeMethod(params.method), params.path);
}

function registerWriteApprovalHook(api: OpenClawApi): void {
  const registerHook = api.on ?? api.registerHook;
  if (registerHook === undefined) {
    api.logger.warn('XApiClaw: OpenClaw approval hooks are unavailable. Require explicit user approval before risky calls.');
    return;
  }

  registerHook.call(
    api,
    'before_tool_call',
    (event): BeforeToolCallResult | undefined => {
      if (event.toolName !== 'xapiclaw') return undefined;
      const params = asXApiClawParams(event.params);
      if (params.path.length === 0 || !requiresXApiClawApproval(params)) return undefined;
      return {
        requireApproval: {
          allowedDecisions: ['allow-once', 'deny'],
          description:
            'XApiClaw is about to invoke a TwexAPI endpoint that can write to X, expose private data, or incur count-based cost. Review the endpoint, target, payload, and cost ceiling before allowing it.',
          pluginId: 'xapiclaw',
          severity: 'warning',
          timeoutBehavior: 'deny',
          timeoutMs: 60_000,
          title: 'Approve XApiClaw Action',
        },
      };
    },
    { priority: 50 },
  );
}

function registerTools(api: OpenClawApi, config: Readonly<PluginConfig>, fetchFunction?: FetchFunction): void {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = config.apiKey ?? '';
  api.registerTool(
    {
      description: SEARCH_DESCRIPTION,
      execute: async (_toolCallId, params) => {
        await Promise.resolve();
        return handleExplore(asExploreParams(params));
      },
      label: 'Explore',
      name: 'explore',
      parameters: EXPLORE_PARAMETERS,
    },
    { name: 'explore' },
  );

  api.registerTool(
    {
      description: EXECUTE_DESCRIPTION,
      execute: async (_toolCallId, params) =>
        handleXApiClaw({
          apiKey,
          baseUrl,
          ...(fetchFunction === undefined ? {} : { fetchFunction }),
          params: asXApiClawParams(params),
        }),
      label: 'XApiClaw',
      name: 'xapiclaw',
      parameters: XAPICLAW_PARAMETERS,
    },
    { name: 'xapiclaw', optional: true },
  );
}

function registerCommands(api: OpenClawApi, config: Readonly<PluginConfig>, fetchFunction?: FetchFunction): void {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = config.apiKey ?? '';
  const request = createTwexApiRequest(baseUrl, apiKey, fetchFunction);
  api.registerCommand({
    description: 'Show TwexAPI balance and status',
    handler: async () => ({ text: await handleXStatus(apiKey, request) }),
    name: 'xstatus',
  });
  api.registerCommand({
    acceptsArgs: true,
    description: 'Show trending topics on X from TwexAPI',
    handler: async ({ args }) => ({ text: await handleXTrends(request, args) }),
    name: 'xtrends',
  });
}

function register(api: OpenClawApi, fetchFunction?: FetchFunction): void {
  const config = asPluginConfig(api.pluginConfig);
  registerWriteApprovalHook(api);
  registerTools(api, config, fetchFunction);
  registerCommands(api, config, fetchFunction);
  if (config.apiKey === undefined) {
    api.logger.warn('XApiClaw: No TwexAPI API key configured. explore works; live calls require configuration.');
  }
  api.logger.info('XApiClaw: Plugin registered successfully');
}

function registerPlugin(api: OpenClawPluginApi): void {
  register(api as unknown as OpenClawApi);
}

const plugin = definePluginEntry({
  configSchema: CONFIG_SCHEMA,
  description: 'Structured X/Twitter workflows through TwexAPI',
  id: 'xapiclaw',
  name: 'XApiClaw',
  register: registerPlugin,
});

export { asPluginConfig, DEFAULT_BASE_URL, register, requiresXApiClawApproval };
export default plugin;
