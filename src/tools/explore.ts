import type { EndpointInfo, ExploreParams, ToolResult } from '../types.js';
import { exploreCatalog } from './catalog.js';
import { textResult } from './result.js';

const SEARCH_DESCRIPTION =
  'Search the XApiClaw TwexAPI endpoint catalog without making network calls.';

function formatEndpoint(endpoint: EndpointInfo): string {
  const approval = endpoint.risk === 'read' ? 'approval: no' : `approval: yes (${endpoint.risk})`;
  const cost = endpoint.cost === undefined ? 'cost: see TwexAPI docs' : `cost: ${endpoint.cost}`;
  const params = endpoint.parameters === undefined || endpoint.parameters.length === 0
    ? 'parameters: none'
    : `parameters: ${endpoint.parameters.map((parameter) => `${parameter.in}.${parameter.name}${parameter.required ? '*' : ''}:${parameter.type}`).join(', ')}`;
  return [
    `${endpoint.method} ${endpoint.path}`,
    `  category: ${endpoint.category}`,
    `  summary: ${endpoint.summary}`,
    `  risk: ${endpoint.risk}`,
    `  ${cost}`,
    `  ${approval}`,
    `  ${params}`,
  ].join('\n');
}

function handleExplore(params: Readonly<ExploreParams>): ToolResult {
  const endpoints = exploreCatalog(params);
  if (endpoints.length === 0) {
    return textResult('No XApiClaw endpoints matched the provided filters.');
  }
  return textResult(endpoints.map(formatEndpoint).join('\n\n'));
}

export { handleExplore, SEARCH_DESCRIPTION };
