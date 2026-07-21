# OpenClaw Setup Guide

Use this guide when installing, configuring, or verifying XApiClaw in OpenClaw.
It keeps the setup path short, public-safe, and aligned with the package at
`@twexapi-dev/xapiclaw`. The GitHub repository remains
`twexapi-dev/xapiclaw`.

## What XApiClaw Adds

XApiClaw is the `xapiclaw` OpenClaw plugin for TwexAPI-backed X/Twitter
workflows. It registers 2 structured tools and 2 slash commands:

- `explore`: local TwexAPI catalog search with no network request.
- `xapiclaw`: live endpoint invoker for catalog-listed TwexAPI paths.
- `/xstatus`: balance/status check through `/balance`.
- `/xtrends`: trending topics through `/twitter/global-trending/topics`.

The plugin can install before credentials exist. Without credentials,
`explore` remains usable and live calls return setup guidance.

## Install

Install the published package:

```bash
openclaw plugins install npm:@twexapi-dev/xapiclaw
```

For routine upgrades, keep the tracked install source and update the plugin id:

```bash
openclaw plugins update xapiclaw
```

For reproducible production installs, pin a published npm version:

```bash
openclaw plugins install npm:@twexapi-dev/xapiclaw@<version> --pin
```

Current source metadata targets OpenClaw `2026.6.8` or newer. Update OpenClaw
before testing source builds or freshly packed artifacts from this repository.

## Configure

Create a TwexAPI API key from your TwexAPI account, then store it in OpenClaw
plugin config:

```bash
openclaw config set plugins.entries.xapiclaw.config.apiKey "$TWEXAPI_API_KEY"
```

Live calls inject the key as:

```http
Authorization: Bearer YOUR_API_KEY
```

Never paste API keys, passwords, cookies, auth tokens, or other credentials
into chat, docs, logs, screenshots, or tool arguments.

Optional settings:

```bash
openclaw config set plugins.entries.xapiclaw.config.baseUrl "https://api.twexapi.io"
openclaw config set plugins.entries.xapiclaw.config.pollingEnabled false
openclaw config set plugins.entries.xapiclaw.config.pollingInterval 60
```

Only change `baseUrl` for a trusted TwexAPI-compatible HTTPS API. XApiClaw
rejects non-HTTPS URLs and URLs with embedded credentials.

## Verify Runtime Loading

After install or update, inspect the runtime and bundled skill:

```bash
openclaw plugins inspect xapiclaw --runtime --json
openclaw skills info xapiclaw
```

Expected result:

- The `xapiclaw` plugin loads.
- The `explore` tool is available.
- The optional `xapiclaw` tool is available when the OpenClaw tool profile allows it.
- The `before_tool_call` approval hook is registered for risky `xapiclaw` calls.
- The `/xstatus` and `/xtrends` commands are registered.
- The XApiClaw skill is visible to the agent.

For packaged release checks, validate the installed artifact instead of the
source checkout:

```bash
npm pack
openclaw plugins install npm-pack:./twexapi-dev-xapiclaw-<version>.tgz
openclaw plugins inspect xapiclaw --runtime --json
```

Maintainers should also run the deterministic source gate after building:

```bash
npm run check-openclaw-platform-fitness
```

## Enable The Optional Tool

Many OpenClaw profiles keep a coding-focused tool set by default. If the skill
is visible but the agent cannot call XApiClaw tools, add the 2 tool names to
`tools.alsoAllow`:

```bash
openclaw config set tools.alsoAllow '["explore", "xapiclaw"]'
```

Use `tools.alsoAllow` instead of replacing the whole tool profile unless strict
allowlist mode is intentional.

## Approval Model

OpenClaw optional tools and plugin permission requests solve different
problems. XApiClaw uses both:

- `xapiclaw` is optional so the model does not see the live endpoint invoker
  until the user opts in.
- The plugin approval hook runs after the model selects `xapiclaw` and before
  OpenClaw executes the call.

XApiClaw requests approval for write, private-read, and paid-bulk calls.
Approval prompts offer one-time approval or deny; they do not create durable
trust for future X account actions.

## First Checks

Use `explore` before live calls:

```json
{ "query": "tweet search", "limit": 5 }
```

For live calls, pass only catalog-listed TwexAPI paths. Put query parameters in
the `query` object, not inside the path string:

```json
{
  "path": "/twitter/advanced_search",
  "method": "POST",
  "body": {
    "query": "openclaw agents"
  }
}
```

## Troubleshooting

If install fails, verify OpenClaw is at least `2026.6.8` for current source
builds and install the published package.

If tools are not visible, inspect runtime loading with `--runtime --json` and
set `tools.alsoAllow` for `explore` and `xapiclaw`.

If live calls return setup guidance, configure `apiKey`.

If a path is rejected, remove embedded query strings and fragments from the
path, then provide query fields through the structured `query` object.
