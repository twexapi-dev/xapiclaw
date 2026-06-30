#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_NAME = "xapiclaw";
const PLUGIN_ID = "xapiclaw";
const PLUGIN_NAME = "XApiClaw";
const REPOSITORY_URL = "https://github.com/twexapi-dev/xapiclaw";
const SKILL_PATH = "skills/xapiclaw/SKILL.md";
const TOOL_NAMES = ["explore", "xapiclaw"];
const COMMAND_NAMES = ["xstatus", "xtrends"];
const OPENCLAW_BASELINE = "2026.6.8";
const OPENCLAW_RANGE = `>=${OPENCLAW_BASELINE}`;
const errors = [];

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function addError(message) {
  errors.push(`  ${message}`);
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    addError(`${label}: ${String(actual ?? "<missing>")} (expected ${String(expected)})`);
  }
}

function assertArrayEqual(label, actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index])) {
    addError(`${label}: ${JSON.stringify(actual ?? null)} (expected ${JSON.stringify(expected)})`);
  }
}

function assertFileExists(path) {
  if (!existsSync(join(root, path))) {
    addError(`${path}: missing file`);
  }
}

function assertTextIncludes(path, fragment) {
  if (!readText(path).includes(fragment)) {
    addError(`${path}: missing "${fragment}"`);
  }
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const manifest = readJson("openclaw.plugin.json");
const server = readJson("server.json");

assertEqual("package.json name", packageJson.name, PACKAGE_NAME);
assertEqual("package.json repository.url", packageJson.repository?.url, `git+${REPOSITORY_URL}.git`);
assertEqual("package.json openclaw.compat.pluginApi", packageJson.openclaw?.compat?.pluginApi, OPENCLAW_RANGE);
assertEqual("package.json openclaw.compat.minGatewayVersion", packageJson.openclaw?.compat?.minGatewayVersion, OPENCLAW_BASELINE);
assertEqual("package.json openclaw.build.openclawVersion", packageJson.openclaw?.build?.openclawVersion, OPENCLAW_BASELINE);
assertEqual("package.json openclaw.build.pluginSdkVersion", packageJson.openclaw?.build?.pluginSdkVersion, OPENCLAW_BASELINE);
assertEqual("package.json openclaw.install.defaultChoice", packageJson.openclaw?.install?.defaultChoice, "npm");
assertEqual("package.json openclaw.install.npmSpec", packageJson.openclaw?.install?.npmSpec, `${PACKAGE_NAME}@${packageJson.version}`);
assertEqual("package.json openclaw.install.minHostVersion", packageJson.openclaw?.install?.minHostVersion, OPENCLAW_RANGE);
assertEqual("package.json peerDependencies.openclaw", packageJson.peerDependencies?.openclaw, OPENCLAW_RANGE);
assertEqual("package-lock root peerDependencies.openclaw", packageLock.packages?.[""]?.peerDependencies?.openclaw, OPENCLAW_RANGE);
assertArrayEqual("package.json openclaw.extensions", packageJson.openclaw?.extensions, ["./src/index.ts"]);
assertArrayEqual("package.json openclaw.runtimeExtensions", packageJson.openclaw?.runtimeExtensions, ["./dist/index.js"]);
assertArrayEqual("package.json files", packageJson.files, [
  "dist/",
  "src/",
  SKILL_PATH,
  "openclaw.plugin.json",
  "server.json",
]);

assertEqual("openclaw.plugin.json id", manifest.id, PLUGIN_ID);
assertEqual("openclaw.plugin.json name", manifest.name, PLUGIN_NAME);
assertEqual("openclaw.plugin.json version", manifest.version, packageJson.version);
assertEqual("openclaw.plugin.json activation.onStartup", manifest.activation?.onStartup, false);
assertArrayEqual("openclaw.plugin.json activation.onCapabilities", manifest.activation?.onCapabilities, ["tool"]);
assertArrayEqual("openclaw.plugin.json contracts.tools", manifest.contracts?.tools, TOOL_NAMES);
assertEqual("openclaw.plugin.json toolMetadata.xapiclaw.optional", manifest.toolMetadata?.xapiclaw?.optional, true);
assertArrayEqual(
  "openclaw.plugin.json command aliases",
  Array.isArray(manifest.commandAliases) ? manifest.commandAliases.map((alias) => alias.name) : undefined,
  COMMAND_NAMES,
);
assertEqual("openclaw.plugin.json configSchema.type", manifest.configSchema?.type, "object");
assertEqual("openclaw.plugin.json configSchema.additionalProperties", manifest.configSchema?.additionalProperties, false);

const configProperties = manifest.configSchema?.properties ?? {};
const uiHints = manifest.uiHints ?? {};
for (const key of ["apiKey", "baseUrl", "pollingInterval", "pollingEnabled"]) {
  if (!Object.hasOwn(configProperties, key)) addError(`openclaw.plugin.json configSchema.properties.${key}: missing`);
  if (!Object.hasOwn(uiHints, key)) addError(`openclaw.plugin.json uiHints.${key}: missing`);
}
assertEqual("openclaw.plugin.json uiHints.apiKey.sensitive", uiHints.apiKey?.sensitive, true);
assertEqual("openclaw.plugin.json configSchema.properties.baseUrl.pattern", configProperties.baseUrl?.pattern, "^https://");
assertEqual("openclaw.plugin.json configSchema.properties.pollingInterval.minimum", configProperties.pollingInterval?.minimum, 5);

assertEqual("server.json name", server.name, "io.github.twexapi-dev/xapiclaw");
assertEqual("server.json repository.url", server.repository?.url, REPOSITORY_URL);
assertArrayEqual("server.json remotes", server.remotes, []);

assertFileExists("dist/index.js");
assertFileExists(SKILL_PATH);
assertFileExists("docs/openclaw-setup.md");
assertFileExists("docs/agent-workflows.md");

const indexSource = readText("src/index.ts");
for (const fragment of [
  "definePluginEntry",
  "registerCommand",
  "before_tool_call",
  "allowedDecisions: ['allow-once', 'deny']",
  "{ name: 'xapiclaw', optional: true }",
  "registerWriteApprovalHook(api);",
  "handleXTrends",
]) {
  if (!indexSource.includes(fragment)) addError(`src/index.ts: missing "${fragment}"`);
}

const docChecks = [
  {
    path: "README.md",
    fragments: [
      "openclaw plugins install npm:xapiclaw",
      "openclaw plugins update xapiclaw",
      "Authorization: Bearer",
      "tools.alsoAllow",
      "/xstatus",
      "/xtrends",
      REPOSITORY_URL,
    ],
  },
  {
    path: "docs/openclaw-setup.md",
    fragments: [
      "openclaw plugins install npm:xapiclaw",
      "openclaw plugins update xapiclaw",
      "Authorization: Bearer",
      "tools.alsoAllow",
      "/xstatus",
      "/xtrends",
      "twexapi-dev/xapiclaw",
    ],
  },
  {
    path: "docs/agent-workflows.md",
    fragments: ["OpenClaw", "XApiClaw", "TwexAPI", "xapiclaw", "approval", "twexapi-dev/xapiclaw"],
  },
  {
    path: SKILL_PATH,
    fragments: ["openclaw plugins install npm:xapiclaw", "`explore`", "`xapiclaw`", "/xstatus", "/xtrends"],
  },
];

for (const check of docChecks) {
  for (const fragment of check.fragments) {
    assertTextIncludes(check.path, fragment);
  }
}

if (errors.length > 0) {
  process.stderr.write(`OpenClaw platform fitness check failed:\n${errors.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`${PLUGIN_NAME} platform fitness OK: ${packageJson.name}@${packageJson.version}\n`);
