import type { ToolResult } from '../types.js';

const BEARER_PATTERN = /Bearer\s+[-._~+/=A-Za-z0-9]+/gu;

export function redactSecrets(value: string): string {
  return value.replace(BEARER_PATTERN, 'Bearer [REDACTED]');
}

export function textResult(text: string): ToolResult {
  return { content: [{ text, type: 'text' }] };
}

export function jsonResult(value: unknown): ToolResult {
  return textResult(JSON.stringify(value, null, 2));
}

export function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ text: redactSecrets(message), type: 'text' }],
    isError: true,
  };
}
