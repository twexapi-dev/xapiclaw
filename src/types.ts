export type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
export type EndpointRisk = 'read' | 'private-read' | 'paid-bulk' | 'write';

export interface PluginConfig {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly pollingEnabled?: boolean;
  readonly pollingInterval?: number;
}

export interface EndpointDescriptor {
  readonly method: HttpMethod;
  readonly path: string;
  readonly category: string;
  readonly summary: string;
  readonly risk: EndpointRisk;
  readonly cost?: string;
  readonly approvalReason?: string;
}

export interface ExploreParams {
  readonly category?: string;
  readonly free?: boolean;
  readonly limit?: number;
  readonly method?: string;
  readonly path?: string;
  readonly query?: string;
}

export interface XApiClawParams {
  readonly body?: unknown;
  readonly method?: string;
  readonly path: string;
  readonly query?: Readonly<Record<string, boolean | number | string>>;
}

export interface ToolTextContent {
  readonly text: string;
  readonly type: 'text';
}

export interface ToolResult {
  readonly content: readonly ToolTextContent[];
  readonly isError?: true;
}

export type FetchFunction = typeof fetch;
