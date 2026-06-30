import { truncateResponse } from '../truncate.js';
import type { ToolResult } from '../types.js';

function textResult(text: string): ToolResult {
  return { content: [{ text, type: 'text' }] };
}

function successResult(content: unknown): ToolResult {
  return textResult(truncateResponse(content));
}

function redactSecrets(value: string): string {
  return value.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gu, 'Bearer [REDACTED]');
}

function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ...textResult(redactSecrets(message)), isError: true };
}

export { errorResult, redactSecrets, successResult, textResult };
