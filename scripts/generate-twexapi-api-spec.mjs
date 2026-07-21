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

const SUPERSEDED_PATH_REPLACEMENTS = new Map([
  ['/twitter/dm-history', '/v3/twitter/dm-history'],
  ['/twitter/send-dm', '/v3/twitter/send-dm'],
  ['/twitter/followers/{screen_name}/{count}', '/v3/twitter/users/followers'],
  ['/twitter/followers/page', '/v3/twitter/users/followers'],
  ['/twitter/following/{screen_name}/{count}', '/v3/twitter/users/following'],
  ['/twitter/following/page', '/v3/twitter/users/following'],
  ['/twitter/tweets/lookup', '/v2/tweet/detail'],
]);
const SUPERSEDED_PATHS = new Set(SUPERSEDED_PATH_REPLACEMENTS.keys());

const WRITE_METHODS = new Set(['DELETE', 'PATCH', 'PUT']);
const WRITE_PATH_PATTERNS = [
  /^\/twitter\/tweets\/create$/u,
  /^\/twitter\/tweets\/quote$/u,
  /^\/twitter\/tweets\/delete-batch$/u,
  /^\/twitter\/tweets\/[^/]+\/(?:like|retweet|bookmark)$/u,
  /^\/twitter\/user\/(?:follow|block)$/u,
  /^\/twitter\/send-dm$/u,
  /^\/v3\/twitter\/send-dm$/u,
  /^\/v3\/twitter\/tweets\/create-thread$/u,
  /^\/x\/articles(?:\/.*)?$/u,
];
const PRIVATE_PATH_PATTERNS = [
  /^\/balance$/u,
  /^\/v2\/dm\/status$/u,
  /^\/twitter\/dm-history$/u,
  /^\/twitter\/notifications$/u,
  /^\/v3\/twitter\/(?:conversations|dm-history|dm-media)$/u,
  /^\/v3\/twitter\/grok(?:\/.*)?$/u,
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
  const normalizedValue = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u2012-\u2015]/gu, '-')
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201C\u201D]/gu, '"')
    .replace(/\u00A0/gu, ' ');
  return Array.from(normalizedValue)
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint <= 0x7F;
    })
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
}

function schemaType(schema) {
  if (schema === undefined || schema === null) return 'unknown';
  if (schema.anyOf instanceof Array) {
    const types = schema.anyOf.map(schemaType).filter((type) => type !== 'unknown');
    return [...new Set(types)].join('|') || 'unknown';
  }
  if (schema.oneOf instanceof Array) {
    const types = schema.oneOf.map(schemaType).filter((type) => type !== 'unknown');
    return [...new Set(types)].join('|') || 'unknown';
  }
  if (schema.allOf instanceof Array) {
    const types = schema.allOf.map(schemaType).filter((type) => type !== 'unknown');
    return [...new Set(types)].join('&') || 'unknown';
  }
  if (schema.type === 'array' && schema.items !== undefined) return `array<${schemaType(schema.items)}>`;
  if (typeof schema.type === 'string') return schema.type;
  if (schema.type instanceof Array) return schema.type.join('|');
  if (schema.$ref !== undefined) return String(schema.$ref).split('/').at(-1) ?? 'object';
  if (schema.properties !== undefined) return 'object';
  return 'unknown';
}

function resolveSchema(schema, spec, seenRefs = new Set()) {
  if (schema === undefined || schema === null || typeof schema !== 'object') return schema;
  if (schema.$ref !== undefined) {
    const ref = String(schema.$ref);
    if (seenRefs.has(ref)) return schema;
    const name = ref.startsWith('#/components/schemas/') ? ref.split('/').at(-1) : undefined;
    const resolved = name === undefined ? undefined : spec.components?.schemas?.[name];
    if (resolved === undefined) return schema;
    return resolveSchema({ ...resolved, description: schema.description ?? resolved.description }, spec, new Set([...seenRefs, ref]));
  }
  if (schema.allOf instanceof Array) {
    const parts = schema.allOf.map((part) => resolveSchema(part, spec, seenRefs));
    return {
      ...schema,
      properties: Object.assign({}, ...parts.map((part) => part.properties ?? {}), schema.properties ?? {}),
      required: [...new Set(parts.flatMap((part) => part.required ?? []).concat(schema.required ?? []))],
    };
  }
  return schema;
}

function parametersForOperation(operation, spec) {
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
  const resolvedBodySchema = resolveSchema(bodySchema, spec);
  if (resolvedBodySchema?.properties !== undefined) {
    for (const [name, schema] of Object.entries(resolvedBodySchema.properties)) {
      const resolvedPropertySchema = resolveSchema(schema, spec);
      params.push({
        description: sanitizeDescription(resolvedPropertySchema.description),
        in: 'body',
        name,
        required: resolvedBodySchema.required?.includes(name) === true,
        type: schemaType(resolvedPropertySchema),
      });
    }
  } else if (bodySchema !== undefined) {
    params.push({
      description: sanitizeDescription(resolvedBodySchema?.description ?? operation.requestBody?.description),
      in: 'body',
      name: 'body',
      required: operation.requestBody?.required === true,
      type: schemaType(resolvedBodySchema),
    });
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
  if (risk === 'paid-bulk' && /search|tweets|tweet/iu.test(path)) return '$0.14 per 1,000 tweets';
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
      agentProhibited: BLOCKED_PATHS.has(path) || SUPERSEDED_PATHS.has(path),
      category,
      cost,
      method,
      parameters: parametersForOperation(operation, spec),
      path,
      responseShape: responseShape(operation),
      risk,
      sensitive: risk === 'private-read' || risk === 'write',
      summary: sanitizeDescription(operation.summary) || `${method} ${path}`,
    });
  }
}

endpoints.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));

const source = `/* eslint-disable sonarjs/no-duplicate-string */
import type { EndpointInfo } from './types.js';

const API_SPEC: readonly EndpointInfo[] = [
${endpoints.map(endpointLiteral).join(',\n')}
];

export { API_SPEC };
`;

writeFileSync(outputPath, source);
