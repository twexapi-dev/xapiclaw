import type { RequestFunction } from '../types.js';

async function handleXStatus(apiKey: string, request: RequestFunction): Promise<string> {
  if (apiKey.length === 0) {
    return 'XApiClaw is installed but not configured. Add a TwexAPI API key in OpenClaw plugin config.';
  }
  const result = await request('/balance');
  return `--- TwexAPI Status ---\n${JSON.stringify(result, null, 2)}`;
}

export { handleXStatus };
