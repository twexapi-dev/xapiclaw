interface EndpointParameter {
  readonly description: string;
  readonly in: 'body' | 'path' | 'query';
  readonly name: string;
  readonly required: boolean;
  readonly type: string;
}

type EndpointRisk = 'paid-bulk' | 'private-read' | 'read' | 'write';

interface EndpointInfo {
  readonly agentProhibited?: true;
  readonly category: string;
  readonly cost?: string;
  readonly method: string;
  readonly parameters?: readonly EndpointParameter[];
  readonly path: string;
  readonly responseShape?: string;
  readonly risk: EndpointRisk;
  readonly sensitive?: true;
  readonly summary: string;
}

interface RequestOptions {
  readonly body?: unknown;
  readonly method?: string;
  readonly query?: Readonly<Record<string, string>>;
}

type RequestFunction = (path: string, options?: Readonly<RequestOptions>) => Promise<unknown>;
type FetchFunction = typeof fetch;

interface ExploreParams {
  readonly category?: string;
  readonly free?: boolean;
  readonly limit?: number;
  readonly method?: string;
  readonly path?: string;
  readonly query?: string;
  readonly risk?: EndpointRisk;
}

interface XApiClawParams {
  readonly body?: unknown;
  readonly method?: string;
  readonly path: string;
  readonly query?: Readonly<Record<string, boolean | number | string>>;
}

interface ToolResult {
  readonly content: ReadonlyArray<{ readonly text: string; readonly type: 'text' }>;
  readonly isError?: true;
}

interface PluginConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly pollingEnabled?: boolean;
  readonly pollingInterval?: number;
}

export type {
  EndpointInfo,
  EndpointParameter,
  EndpointRisk,
  ExploreParams,
  FetchFunction,
  PluginConfig,
  RequestFunction,
  RequestOptions,
  ToolResult,
  XApiClawParams,
};
