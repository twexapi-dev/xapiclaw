#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_NAME = "@twexapi-dev/xapiclaw";
const PLUGIN_ID = "xapiclaw";
const REPOSITORY_URL = "https://github.com/twexapi-dev/xapiclaw";
const OPENCLAW_BASELINE = "2026.6.8";
const OPENCLAW_RANGE = `>=${OPENCLAW_BASELINE}`;
const drifts = [];

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    drifts.push(`  ${label}: ${String(actual ?? "<missing>")} (expected ${String(expected)})`);
  }
}

function expectAbsent(label, object, key) {
  if (Object.hasOwn(object ?? {}, key)) {
    drifts.push(`  ${label}: ${key} must be absent`);
  }
}

function expectText(path, fragment) {
  if (!readText(path).includes(fragment)) {
    drifts.push(`  ${path}: missing "${fragment}"`);
  }
}

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const manifest = readJson("openclaw.plugin.json");
const server = readJson("server.json");
const expectedVersion = packageJson.version;

expectEqual("package.json name", packageJson.name, PACKAGE_NAME);
expectEqual("package.json repository.url", packageJson.repository?.url, `git+${REPOSITORY_URL}.git`);
expectEqual("package.json homepage", packageJson.homepage, `${REPOSITORY_URL}#readme`);
expectEqual("package.json bugs.url", packageJson.bugs?.url, `${REPOSITORY_URL}/issues`);
expectEqual("openclaw.plugin.json id", manifest.id, PLUGIN_ID);
expectEqual("openclaw.plugin.json version", manifest.version, expectedVersion);
expectEqual("server.json version", server.version, expectedVersion);
expectEqual("server.json repository.url", server.repository?.url, REPOSITORY_URL);
expectEqual("package-lock root version", packageLock.packages?.[""]?.version, expectedVersion);

expectEqual("package.json peerDependencies.openclaw", packageJson.peerDependencies?.openclaw, OPENCLAW_RANGE);
expectAbsent("package.json peerDependenciesMeta", packageJson, "peerDependenciesMeta");
expectEqual("package.json openclaw.compat.pluginApi", packageJson.openclaw?.compat?.pluginApi, OPENCLAW_RANGE);
expectEqual("package.json openclaw.compat.minGatewayVersion", packageJson.openclaw?.compat?.minGatewayVersion, OPENCLAW_BASELINE);
expectEqual("package.json openclaw.build.openclawVersion", packageJson.openclaw?.build?.openclawVersion, OPENCLAW_BASELINE);
expectEqual("package.json openclaw.build.pluginSdkVersion", packageJson.openclaw?.build?.pluginSdkVersion, OPENCLAW_BASELINE);
expectEqual("package.json openclaw.install.defaultChoice", packageJson.openclaw?.install?.defaultChoice, "npm");
expectEqual("package.json openclaw.install.npmSpec", packageJson.openclaw?.install?.npmSpec, `${PACKAGE_NAME}@${expectedVersion}`);
expectEqual("package.json openclaw.install.minHostVersion", packageJson.openclaw?.install?.minHostVersion, OPENCLAW_RANGE);
expectEqual("package.json openclaw.runtimeExtensions[0]", packageJson.openclaw?.runtimeExtensions?.[0], "./dist/index.js");

expectText("README.md", "openclaw plugins install npm:@twexapi-dev/xapiclaw");
expectText("README.md", "openclaw plugins update xapiclaw");
expectText("README.md", "Authorization: Bearer");
expectText("README.md", "twexapi-dev/xapiclaw");
expectText("server.json", "io.github.twexapi-dev/xapiclaw");
expectText("skills/xapiclaw/SKILL.md", "openclaw plugins install npm:@twexapi-dev/xapiclaw");

if (drifts.length > 0) {
  process.stderr.write(`Version drift detected (package.json = ${expectedVersion}):\n${drifts.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`All versioned surfaces at ${expectedVersion}\n`);
