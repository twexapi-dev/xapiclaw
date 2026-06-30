type TwexApiRequest = (options: { readonly method: 'GET'; readonly path: string }) => Promise<unknown>;

export async function handleXStatus(apiKey: string, request: TwexApiRequest): Promise<string> {
  if (apiKey.length === 0) {
    return 'XApiClaw is installed but not configured. Add a TwexAPI API key in OpenClaw plugin config.';
  }

  const balance = await request({ method: 'GET', path: '/balance' });
  return `TwexAPI status\n\n${JSON.stringify(balance, null, 2)}`;
}
