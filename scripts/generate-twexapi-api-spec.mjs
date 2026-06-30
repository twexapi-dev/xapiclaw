import { readFileSync, writeFileSync } from 'node:fs';

const inputPath = process.argv[2] ?? '/private/tmp/xapiclaw-upstream/twexapi-openapi.json';
const outputPath = process.argv[3] ?? 'src/api-spec.ts';

const BLOCKED_PATHS = new Set([
  '/twitter/{auth_token}/cookie',
  '/twitter/{auth_token}/user_info',
  '/twitter/action',
  '/twitter/action/order-status',
  '/twitter/profile',
  '/twitter/list/create',
  '/twitter/post-tweet-without-cookie',
  '/twitter/tweets/sentiment',
]);

const WRITE_METHODS = new Set(['DELETE', 'PATCH', 'PUT']);
const WRITE_PATH_PATTERNS = [
  /^\/twitter\/tweets\/create$/u,
  /^\/twitter\/tweets\/quote$/u,
  /^\/twitter\/tweets\/delete-batch$/u,
  /^\/twitter\/tweets\/[^/]+\/(?:like|retweet|bookmark)$/u,
  /^\/twitter\/user\/(?:follow|block)$/u,
  /^\/twitter\/send-dm$/u,
  /^\/x\/articles(?:\/.*)?$/u,
];
const PRIVATE_PATH_PATTERNS = [
  /^\/balance$/u,
  /^\/v2\/dm\/status$/u,
  /^\/twitter\/dm-history$/u,
  /^\/twitter\/notifications$/u,
];
const PAID_CATEGORY_PATTERNS = [
  /search/iu,
  /followers/iu,
  /following/iu,
  /replies/iu,
  /engagement/iu,
  /timeline/iu,
  /lists/iu,
  /communities/iu,
  /tweets/iu,
  /article/iu,
];
const READ_PATH_PATTERNS = [
  /^\/twitter\/global-trending\/(?:countries|topics|contents)$/u,
  /^\/twitter\/[^/]+\/trending$/u,
  /^\/twitter\/[^/]+\/about$/u,
  /^\/twitter\/community\/[^/]+$/u,
  /^\/twitter\/community\/search$/u,
  /^\/twitter\/list\/search$/u,
  /^\/twitter\/tweets\/[^/]+\/similar$/u,
  /^\/x\/account\/verify$/u,
  /^\/twitter\/account\/based$/u,
  /^\/x\/article\/[^/]+\/markdown$/u,
  /^\/twitter\/(?:followers|following)\/task\/[^/]+\/status$/u,
];

function titleCaseCategory(tag) {
  return String(tag ?? 'Other')
    .replace(/\s*Endpoints\s*$/u, '')
    .replace(/\s*&\s*/gu, ' & ')
    .trim();
}

function sanitizeDescription(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function schemaType(schema) {
  if (schema === undefined || schema === null) return 'unknown';
  if (typeof schema.type === 'string') return schema.type;
  if (schema.type instanceof Array) return schema.type.join('|');
  if (schema.$ref !== undefined) return String(schema.$ref).split('/').at(-1) ?? 'object';
  if (schema.properties !== undefined) return 'object';
  return 'unknown';
}

function parametersForOperation(operation) {
  const params = [];
  for (const parameter of operation.parameters ?? []) {
    params.push({
      description: sanitizeDescription(parameter.description),
      in: parameter.in,
      name: parameter.name,
      required: parameter.required === true,
      type: schemaType(parameter.schema),
    });
  }

  const bodySchema =
    operation.requestBody?.content?.['application/json']?.schema ??
    operation.requestBody?.content?.['multipart/form-data']?.schema;
  if (bodySchema?.properties !== undefined) {
    for (const [name, schema] of Object.entries(bodySchema.properties)) {
      params.push({
        description: sanitizeDescription(schema.description),
        in: 'body',
        name,
        required: bodySchema.required?.includes(name) === true,
        type: schemaType(schema),
      });
    }
  }

  return params;
}

function responseShape(operation) {
  const response =
    operation.responses?.['200'] ??
    operation.responses?.['201'] ??
    operation.responses?.default;
  const schema = response?.content?.['application/json']?.schema;
  if (schema?.$ref !== undefined) return `{ ${String(schema.$ref).split('/').at(-1)} }`;
  if (schema?.type !== undefined) return `{ ${schemaType(schema)} }`;
  return undefined;
}

function isWrite(method, path) {
  return WRITE_METHODS.has(method) || WRITE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function isPrivate(path) {
  return PRIVATE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function isRead(path) {
  return READ_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function riskFor(method, path, category) {
  if (isWrite(method, path)) return 'write';
  if (isPrivate(path)) return 'private-read';
  if (isRead(path)) return 'read';
  if (PAID_CATEGORY_PATTERNS.some((pattern) => pattern.test(category))) return 'paid-bulk';
  return 'read';
}

function costFor(risk, path) {
  if (risk === 'write') return '$0.0025 per call';
  if (risk === 'paid-bulk' && /followers|following/iu.test(path)) return '$0.14 per 1,000 users';
  if (risk === 'paid-bulk' && /replies/iu.test(path)) return '$0.14 per 1,000 replies';
  if (risk === 'paid-bulk' && /search|tweets/iu.test(path)) return '$0.14 per 1,000 tweets';
  return undefined;
}

function endpointLiteral(endpoint) {
  const fields = [
    `category: ${JSON.stringify(endpoint.category)}`,
    endpoint.agentProhibited ? 'agentProhibited: true' : undefined,
    endpoint.cost === undefined ? undefined : `cost: ${JSON.stringify(endpoint.cost)}`,
    `method: ${JSON.stringify(endpoint.method)}`,
    endpoint.parameters.length === 0 ? undefined : `parameters: ${JSON.stringify(endpoint.parameters)}`,
    `path: ${JSON.stringify(endpoint.path)}`,
    endpoint.responseShape === undefined ? undefined : `responseShape: ${JSON.stringify(endpoint.responseShape)}`,
    `risk: ${JSON.stringify(endpoint.risk)}`,
    endpoint.sensitive ? 'sensitive: true' : undefined,
    `summary: ${JSON.stringify(endpoint.summary)}`,
  ].filter(Boolean);
  return `  { ${fields.join(', ')} }`;
}

const spec = JSON.parse(readFileSync(inputPath, 'utf8'));
const endpoints = [];

for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const [methodName, operation] of Object.entries(pathItem)) {
    const method = methodName.toUpperCase();
    if (!['DELETE', 'GET', 'PATCH', 'POST', 'PUT'].includes(method)) continue;
    const category = titleCaseCategory(operation.tags?.[0]);
    const risk = riskFor(method, path, category);
    const cost = costFor(risk, path);
    endpoints.push({
      agentProhibited: BLOCKED_PATHS.has(path),
      category,
      cost,
      method,
      parameters: parametersForOperation(operation),
      path,
      responseShape: responseShape(operation),
      risk,
      sensitive: risk === 'private-read' || risk === 'write',
      summary: sanitizeDescription(operation.summary) || `${method} ${path}`,
    });
  }
}

endpoints.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));

const source = `import type { EndpointInfo } from './types.js';

const API_SPEC: readonly EndpointInfo[] = [
${endpoints.map(endpointLiteral).join(',\n')}
];

export { API_SPEC };
`;

writeFileSync(outputPath, source);
