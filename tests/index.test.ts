import { describe, expect, test, vi } from 'vitest';
import plugin, { register, requiresXApiClawApproval } from '../src/index.js';
import manifest from '../openclaw.plugin.json' with { type: 'json' };

interface RegisteredTool {
  readonly description: string;
  readonly execute: (toolCallId: string, params: unknown) => Promise<unknown>;
  readonly label?: string;
  readonly name: string;
  readonly parameters: unknown;
}

function createMockApi(pluginConfig?: unknown) {
  const tools: RegisteredTool[] = [];
  const commands: Array<{ readonly name: string }> = [];
  const hooks: unknown[] = [];
  const warnings: string[] = [];
  const api = {
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: (message: string) => {
        warnings.push(message);
      },
    },
    pluginConfig: pluginConfig as Readonly<Record<string, unknown>> | undefined,
    registerCommand: vi.fn((command: { readonly name: string }) => {
      commands.push(command);
    }),
    registerService: vi.fn(),
    registerTool: vi.fn((tool: RegisteredTool) => {
      tools.push(tool);
    }),
    on: vi.fn((_name: string, handler: unknown, options: unknown) => {
      hooks.push({ handler, options });
    }),
  };
  return { api, commands, hooks, tools, warnings };
}

describe('OpenClaw plugin entry', () => {
  test('exports manifest-aligned plugin metadata', () => {
    expect(plugin.id).toBe('xapiclaw');
    expect(plugin.name).toBe('XApiClaw');
    expect(plugin.configSchema).toEqual({ jsonSchema: manifest.configSchema });
  });

  test('registers explore, optional xapiclaw, xstatus, and xtrends', () => {
    const { api, commands, tools } = createMockApi({ apiKey: 'twex_key' });
    register(api as never, vi.fn() as never);
    expect(tools.map((tool) => tool.name)).toEqual(['explore', 'xapiclaw']);
    expect(api.registerTool).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: 'xapiclaw' }), {
      name: 'xapiclaw',
      optional: true,
    });
    expect(commands.map((command) => command.name)).toEqual(['xstatus', 'xtrends']);
  });

  test('allows missing API key while warning once', async () => {
    const { api, tools, warnings } = createMockApi();
    register(api as never, vi.fn() as never);
    const result = await tools.find((tool) => tool.name === 'xapiclaw')?.execute('missing', {
      path: '/twitter/global-trending/topics',
    });
    expect(warnings[0]).toContain('No TwexAPI API key configured');
    expect((result as { readonly isError?: true }).isError).toBe(true);
  });

  test('classifies approval-required calls', () => {
    expect(requiresXApiClawApproval({ method: 'POST', path: '/twitter/tweets/create' })).toBe(true);
    expect(requiresXApiClawApproval({ method: 'GET', path: '/twitter/global-trending/topics' })).toBe(false);
  });

  test('registers approval hook for risky xapiclaw endpoints', () => {
    const { api } = createMockApi({ apiKey: 'twex_key' });
    register(api as never, vi.fn() as never);
    const hook = api.on.mock.calls[0]?.[1] as (event: unknown) => unknown;
    const result = hook({ params: { method: 'POST', path: '/twitter/tweets/create' }, toolName: 'xapiclaw' });
    expect(result).toEqual({
      requireApproval: expect.objectContaining({
        pluginId: 'xapiclaw',
        severity: 'warning',
        title: 'Approve XApiClaw Action',
      }),
    });
  });
});
