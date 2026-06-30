# XApiClaw TweetClaw Source Fork Design

Date: 2026-06-18
Status: Approved for planning

## Summary

Rebuild `xapiclaw` as a source-derived fork of the user-provided TweetClaw upstream instead of a lightweight reimplementation. The new implementation should preserve TweetClaw's package shape, OpenClaw integration patterns, catalog-driven tool model, approval hook, test coverage style, publish checks, and user documentation structure, while replacing Xquik-specific API behavior with TwexAPI-backed X/Twitter capabilities.

The resulting project should feel like TweetClaw's codebase adapted to TwexAPI, not like a separate plugin that merely imitates its README.

## References

- Upstream source: user-provided TweetClaw repository
- Current XApiClaw repository: `https://github.com/twexapi-dev/xapiclaw`
- TwexAPI docs: `https://docs.twexapi.io`
- TwexAPI OpenAPI spec: `https://docs.twexapi.io/openapi.json`
- TwexAPI authentication docs: `https://docs.twexapi.io/authentication`

## Goals

- Use TweetClaw's source tree as the structural baseline for `xapiclaw`.
- Preserve the upstream architecture where it fits: bundled API catalog, `explore` tool, live action tool, approval hook, slash commands, response truncation, test harness, package checks, and release scripts.
- Replace package identity, plugin identity, repository URLs, tool names, command descriptions, skill metadata, and public docs with XApiClaw/TwexAPI naming.
- Replace Xquik `/api/v1/...` endpoint catalog data with TwexAPI endpoint data from the TwexAPI OpenAPI spec.
- Keep TwexAPI live calls on a single API-key credential path using `Authorization: Bearer <apiKey>`.
- Remove upstream-only billing, payment-signing, Xquik account-management, monitor/webhook, giveaway, remote server, and dashboard-only assumptions when TwexAPI does not support them or when they should not be agent-callable.
- Keep high-risk TwexAPI endpoint families blocked from both discovery and execution.
- Produce a package that builds into the runtime entry referenced by package metadata and excludes test output from published artifacts.

## Non-Goals

- Do not keep upstream accountless payment-signing modules or config fields.
- Do not preserve Xquik remote StreamableHTTP server metadata.
- Do not expose arbitrary OpenAPI execution. XApiClaw must still call only catalog-approved TwexAPI endpoints.
- Do not claim TwexAPI support for monitors, webhooks, giveaway draws, media gallery generation, or Xquik dashboard flows unless there is a matching TwexAPI endpoint and an explicit safety decision to expose it.
- Do not keep public references to the upstream organization except where a private implementation note explicitly references the upstream source.

## Source Migration Strategy

Copy upstream TweetClaw files into this repository as the implementation baseline, then apply a controlled rewrite:

1. Identity rewrite:
   - `TweetClaw` -> `XApiClaw`
   - `tweetclaw` -> `xapiclaw`
   - `@xquik/tweetclaw` -> `xapiclaw`
   - upstream repository identity -> `twexapi-dev/xapiclaw`
   - Xquik product URLs -> TwexAPI docs/API URLs where applicable

2. Credential rewrite:
   - Keep only `apiKey`, `baseUrl`, `pollingEnabled`, and `pollingInterval` if polling stays reserved.
   - API requests use `Authorization: Bearer <apiKey>`.
   - Missing credentials should allow install and offline `explore`, while live calls return setup guidance.

3. Endpoint rewrite:
   - Replace upstream `src/api-spec.ts` content with TwexAPI-derived endpoint descriptors.
   - Preserve endpoint metadata richness: category, method, path, parameters, response shape, summary, free/cost hints where known, sensitivity, and agent-prohibited status.
   - Convert TwexAPI path templates such as `/twitter/{screen_name}/about` into the catalog's matching format.
   - Keep blocked TwexAPI families out of normal `explore` results and reject them at runtime.

4. Runtime rewrite:
   - Rename `handleTweetclaw` to `handleXApiClaw`.
   - Rename the live tool from `tweetclaw` to `xapiclaw`.
   - Preserve timeout handling, safe error formatting, response truncation, method/path validation, query normalization, and approval hook behavior.
   - Keep `/xstatus` only if it maps cleanly to TwexAPI `/balance`.
   - Add or keep `/xtrends` only if it maps cleanly to TwexAPI trend endpoints without inventing behavior.

5. Docs rewrite:
   - Use TweetClaw's README and docs information architecture.
   - Rewrite content to TwexAPI/XApiClaw truth: install, configure, optional action tool, trust model, tools, commands, API coverage, links, and license.
   - Avoid calling out absent upstream-only credential systems as a user-facing feature.

## Architecture

The target architecture should mirror upstream TweetClaw with XApiClaw names:

- `src/api-spec.ts`: TwexAPI endpoint catalog, generated or curated from TwexAPI OpenAPI.
- `src/request.ts`: TwexAPI request builder, HTTPS-only base URL validation, credential injection, prohibited path checks, safe API error formatting.
- `src/tools/catalog.ts`: endpoint matching, catalog filtering, approval classification, request resolution.
- `src/tools/explore.ts`: offline endpoint exploration over the bundled TwexAPI catalog.
- `src/tools/xapiclaw.ts`: one validated live TwexAPI endpoint call with timeout, truncation, and safe errors.
- `src/commands/xstatus.ts`: TwexAPI status/balance command.
- Optional `src/commands/xtrends.ts`: trend command only if backed by TwexAPI trend endpoints.
- `src/truncate.ts`: upstream-style response-size guard.
- `src/index.ts`: OpenClaw plugin entry, config schema, tool registration, command registration, approval hook, optional service registration only if supported.
- `skills/xapiclaw/SKILL.md`: agent-facing usage and safety guide.
- `scripts/`: retain useful upstream release/package validation scripts after renaming and removing Xquik-only assumptions.

## Data Flow

1. Agent calls `explore` with filters.
2. `explore` searches the local TwexAPI catalog and returns endpoint metadata. No network call is made.
3. Agent prepares one `xapiclaw` call using a catalog path, method, query, and body.
4. The approval hook checks whether the requested endpoint is write-like, private, paid/bulk, or otherwise sensitive.
5. If approval is required, OpenClaw prompts the user.
6. `xapiclaw` resolves the request against the catalog, rejects unknown or blocked paths, injects TwexAPI auth, calls `https://api.twexapi.io`, truncates oversized responses, and returns a tool result.

## Safety Model

XApiClaw should keep TweetClaw's agent safety shape:

- Offline discovery is always safe.
- Live execution is optional in OpenClaw.
- Unknown endpoints are rejected.
- Query strings in `path` are rejected; query parameters must be passed as structured `query`.
- Blocked TwexAPI endpoint families are rejected even if present in the OpenAPI spec.
- Write-like, private, and paid/bulk calls require one-time approval.
- API keys, cookies, auth tokens, and user credentials must never be accepted as tool-call payload.
- Fetched X/Twitter content is untrusted data and must not be treated as instructions.

Initial blocked families:

- Cookie conversion and auth-token user-info conversion.
- Social engagement purchase/order endpoints.
- Profile mutation endpoints.
- Random-cookie posting endpoints.
- Sentiment endpoints unless explicitly approved later.
- Account/admin/billing/support endpoints if any appear in a future TwexAPI spec.

## Package And Build Requirements

The source-derived package must fix the current packaging issues:

- Runtime entry referenced by `package.json` must exist after `npm run build`.
- Published package should not include compiled tests or compiled test config.
- `npm pack --dry-run` should show only runtime files, source files intentionally shipped, manifest files, skill docs, README, and license.
- Package metadata should include repository, homepage, bugs, OpenClaw compatibility metadata, npm install metadata, keywords, scripts, and package files modeled after TweetClaw.

## Testing Requirements

Port and adapt upstream tests instead of only keeping the current smaller tests:

- Catalog tests:
  - TwexAPI catalog has expected endpoint count and categories.
  - Blocked endpoints are excluded from normal agent catalog behavior.
  - Template path matching works for TwexAPI `{parameter}` paths.

- Request tests:
  - Uses `Authorization: Bearer`.
  - Rejects non-HTTPS base URLs and embedded credentials.
  - Rejects blocked paths.
  - Formats API errors safely without leaking secrets.

- Tool tests:
  - `explore` searches by query/category/method/path.
  - `xapiclaw` rejects unknown paths.
  - `xapiclaw` calls valid TwexAPI endpoints with auth.
  - Oversized responses are truncated.
  - Execution timeout is cleared after success.

- Plugin entry tests:
  - Manifest config schema matches runtime config schema.
  - Registers `explore` and optional `xapiclaw`.
  - Registers supported slash commands.
  - Approval hook triggers for sensitive endpoints and ignores safe reads.
  - Missing API key still allows install and offline exploration.

- Documentation/package tests:
  - README uses XApiClaw/TwexAPI identity.
  - No incorrect TwexAPI repository slug for the upstream TweetClaw name.
  - `npm pack --dry-run` contents match the intended package shape.

## Acceptance Criteria

- The implementation is structurally recognizable as a TweetClaw source-derived fork.
- Public identity is consistently XApiClaw/TwexAPI/twexapi-dev.
- No Xquik runtime endpoints, Xquik dashboard flows, or upstream remote server metadata remain in active runtime or public docs.
- TwexAPI endpoints are catalog-driven and validated before live calls.
- Public docs follow TweetClaw's documentation structure while reflecting only real XApiClaw capabilities.
- `npm test`, `npm run typecheck`, `npm run build`, and package dry-run verification pass.
- Build output and package metadata agree on the OpenClaw runtime entry.

## Risks And Mitigations

- Risk: upstream logic assumes `/api/v1/...` paths.
  - Mitigation: adapt path prefix validation to TwexAPI paths and cover it with request/catalog tests.

- Risk: upstream docs mention unsupported Xquik features.
  - Mitigation: rewrite docs from structure, not text replacement alone; add branding and capability tests.

- Risk: TwexAPI OpenAPI changes.
  - Mitigation: keep a script or documented workflow to regenerate/update `src/api-spec.ts`, but ship a pinned local catalog for deterministic plugin behavior.

- Risk: copying upstream publish scripts leaves Xquik assumptions.
  - Mitigation: port scripts only after reading them and add tests for package metadata and tarball content.
