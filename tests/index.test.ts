import { describe, expect, test, vi } from 'vitest';
import { register, requiresXApiClawApproval } from '../src/index.js';

interface RegisteredTool {
  readonly name: string;
  readonly execute: (toolCallId: string, params: unknown) => Promise<unknown>;
}

describe('OpenClaw plugin entry', () => {
  test('registers explore and optional xapiclaw tools', () => {
    const tools: RegisteredTool[] = [];
    const api = {
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      pluginConfig: { apiKey: 'twex_key' },
      registerCommand: vi.fn(),
      registerService: vi.fn(),
      registerTool: vi.fn((tool: RegisteredTool) => tools.push(tool)),
      on: vi.fn(),
    };

    register(api as never, vi.fn() as never);

    expect(api.registerTool).toHaveBeenCalledTimes(2);
    expect(tools.map((tool) => tool.name)).toEqual(['explore', 'xapiclaw']);
  });

  test('classifies approval-required calls', () => {
    expect(requiresXApiClawApproval({ method: 'POST', path: '/twitter/tweets/create' })).toBe(true);
    expect(requiresXApiClawApproval({ method: 'GET', path: '/twitter/global-trending/topics' })).toBe(false);
  });

  test('registers before_tool_call hook for xapiclaw risky endpoints', () => {
    const api = {
      logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
      pluginConfig: { apiKey: 'twex_key' },
      registerCommand: vi.fn(),
      registerService: vi.fn(),
      registerTool: vi.fn(),
      on: vi.fn(),
    };

    register(api as never, vi.fn() as never);
    const hook = api.on.mock.calls[0]?.[1] as (event: unknown) => unknown;

    const result = hook({
      params: { method: 'POST', path: '/twitter/tweets/create' },
      toolName: 'xapiclaw',
    });

    expect(result).toEqual({
      requireApproval: expect.objectContaining({
        pluginId: 'xapiclaw',
        severity: 'warning',
        title: 'Approve XApiClaw Action',
      }),
    });
  });
});
