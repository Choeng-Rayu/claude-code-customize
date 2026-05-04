# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Identity

This is a **customized fork of Claude Code** — Anthropic's AI-coding CLI — adapted to run against NVIDIA and Doubleword (OpenAI-compatible) API endpoints instead of the first-party Anthropic API. The repo originated from leaked sourcemap artifacts and has been patched with provider adapters, no-op stubs for proprietary subsystems, and updated environment handling.

---

## 1. Common Commands

There are no npm scripts defined in `package.json`. All development is manual:

| Action | Command |
|--------|---------|
| Install deps | `bun install` |
| Run CLI (NVIDIA) | `CLAUDE_CODE_USE_NVIDIA=1 NVIDIA_API_KEY=... bun run src/main.tsx` |
| Run CLI (Doubleword) | `CLAUDE_CODE_USE_DOUBLEWORD=1 DOUBLEWORD_API_KEY=... bun run src/entrypoints/cli.tsx` |
| Quick-start wrapper | `./start-claude.sh [project-path]` |
| System-wide install | `./install.sh` |
| Test NVIDIA adapter | `bun run test-nvidia.ts` |
| Test Doubleword | `bun run test-doubleword.ts` |
| Test API client | `bun run test-api-client.ts` |
| Run tests | `bun test` |

> `start-claude.sh` reads `src/.env`, defaults to `API_PROVIDER=doubleword`, and launches `bun run src/entrypoints/cli.tsx`. Use `--` to forward flags.

---

## 2. Architecture Overview

### 2.1 High-level Flow

```
src/entrypoints/cli.tsx                    (terminal entrypoint)
      │
      ▼
src/main.tsx                              (command parsing & boot)
      │
      ├── src/commands.ts                  (register CLI commands)
      ├── src/QueryEngine.ts               (core LLM orchestration)
      ├── src/services/api/client.ts       (provider client factory)
      └── src/tools/*.tsx                  (40+ built-in tools)
```

### 2.2 Provider Routing

`src/utils/model/providers.ts` defines `APIProvider` enum (`firstParty` | `bedrock` | `vertex` | `foundry` | `nvidia` | `doubleword`) and `getAPIProvider()` which reads env flags in strict priority.

The factory in `src/services/api/client.ts` (exported as `getAnthropicClient`) returns a client typed as `Anthropic` but actually swaps implementations based on `getAPIProvider()`. When NVIDIA or Doubleword is selected, it imports `src/services/api/nvidiaAdapter.ts` and wraps the OpenAI-compatible endpoint.

### 2.3 NVIDIA / Doubleword Adapter (`nvidiaAdapter.ts`)

- Single adapter handles both providers by parameterizing `baseURL` and `defaultModel`.
- Converts Anthropic messages/tools to OpenAI chat-completion format.
- Maps Anthropic model aliases (e.g. `claude-sonnet-4-6`) to provider-specific strings via `src/utils/model/configs.ts`.
- Handles streaming SSE responses and converts back to Anthropic SDK event shapes.
- Tool-calling is translated bidirectionally: Anthropic `tool_use`/`tool_result` <-> OpenAI `tool_calls`/`function`.

### 2.4 Model Configuration (`src/utils/model/configs.ts`)

Every Anthropic model constant (`CLAUDE_OPUS_4_CONFIG`, `CLAUDE_SONNET_4_6_CONFIG`, etc.) maps each provider to a concrete model string. For NVIDIA and Doubleword in this fork, all aliases resolve to `moonshotai/kimi-k2.6`.

### 2.5 Tool System

Tools are defined under `src/tools/` (e.g. `AgentTool`, `BashTool`, `FileWriteTool`, `MCPTool`).

`src/Tool.ts` contains shared types (`ToolInputJSONSchema`, `ToolUseContext`, `CanUseToolFn`) and the `Tools` type union. New tools must add to `Tools`, register in `src/tools.ts`, and expose a JSON schema.

### 2.6 Commands

`src/commands.ts` imports every command module and builds a map. Most commands are folders (e.g. `src/commands/commit.ts`, `src/commands/cost/`) exporting a `Command` object with name, shorthand, and handler.

Some commands are gated behind `feature()` flags (from `bun:bundle`) or `USER_TYPE === 'ant'` checks using lazy `require()` to avoid circular deps at import time.

### 2.7 Auth & Environment

`src/utils/auth.ts` manages OAuth tokens, API keys, and subscription state. For NVIDIA/Doubleword, the adapter pulls directly from `NVIDIA_API_KEY` / `DOUBLEWORD_API_KEY` env vars.

`src/utils/managedEnvConstants.ts` lists `PROVIDER_MANAGED_ENV_VARS`. Any new provider flag or endpoint config must be added here so it can be stripped when `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` is set.

`src/.env` is loaded by the shell wrapper (`start-claude.sh`) via `. src/.env`, but not by Node/Bun (no `dotenv`).

### 2.8 UI Layer

Terminal UI is rendered with **React + Ink**. Components live in `src/components/`. The Ink root is created in `src/ink.tsx`. Main interactive loop is driven from `src/main.tsx` using `renderAndRun()` helpers.

### 2.9 Key Entrypoints

| File | Purpose |
|------|---------|
| `src/entrypoints/cli.tsx` | Main CLI when run via `claude-code` binary |
| `src/entrypoints/agent.ts` | Agent SDK / programmatic entrypoint |
| `src/main.tsx` | Legacy massive entry point; still used for some direct `bun run` flows |
| `src/query.ts` | Core LLM query helper; wraps API calls and handles retries |
| `src/QueryEngine.ts` | Stateful conversation loop; invokes tools and manages message history |

---

## 3. Important Build & Runtime Notes

### 3.1 Bun Required

This project is hardcoded for Bun. Do not use Node.js or npm scripts.
- `bun:` builtins are used everywhere (`bun:bundle`, `bun:sqlite`).
- **Do not add `dotenv`** — environment is loaded by shell wrappers.

### 3.2 Module Resolution

Paths use full relative specifiers ending in `.js` even for TS/TSX files (Bun handles this). Example: `import { foo } from './utils/auth.js'` resolves to `auth.ts`. Maintain this convention.

### 3.3 Circular Dependency Handling

Many lazy `require()` calls exist to break import cycles (especially around `teammate.ts`, `AppState.tsx`, and command feature-gates). Prefer keeping that pattern if introducing new cross-cutting imports.

### 3.4 Missing Third-party Tools

Some proprietary tools referenced in the original leak (`TungstenTool`, certain analytics services) have been replaced with no-op stubs in `src/tools/`. Removing or renaming these stubs may cause downstream type errors in `src/tools.ts`.

---

## 4. How to Add or Change a Provider

Follow the exact pattern used for NVIDIA/Doubleword:

1. **`src/utils/model/providers.ts`** — Add env flag to `getAPIProvider()` and extend `APIProvider` union.
2. **`src/utils/managedEnvConstants.ts`** — Add provider env vars to `PROVIDER_MANAGED_ENV_VARS`.
3. **`src/services/api/client.ts`** — Add a conditional branch in `getAnthropicClient` that imports/creates the adapter.
4. **`src/utils/model/configs.ts`** — Add the new provider key to every model config constant.
5. **`src/utils/model/modelStrings.ts`** — Add mapping helper if model aliases differ from Anthropic names.
6. **`src/services/api/nvidiaAdapter.ts`** — Reuse or extend `createNVIDIAClient` logic; pass correct `baseURL` and `defaultModel`.
7. **`src/utils/auth.ts`** — Add any auth-aware checks (e.g. `isNvidiaAuthEnabled`) if the new provider needs OAuth/token helpers.

---

## 5. Summary of Key Files

| Path | Responsibility |
|------|----------------|
| `src/services/api/nvidiaAdapter.ts` | OpenAI-compatible adapter for NVIDIA & Doubleword |
| `src/services/api/client.ts` | Provider client factory; returns `Anthropic`-shaped client |
| `src/utils/model/providers.ts` | `APIProvider` enum and `getAPIProvider()` logic |
| `src/utils/model/configs.ts` | Model ID mappings per provider |
| `src/utils/managedEnvConstants.ts` | Env vars that must be host-managed |
| `src/QueryEngine.ts` | Core conversation loop and tool dispatch |
| `src/query.ts` | Low-level LLM request wrapper |
| `src/Tool.ts` | Shared tool types and registry union |
| `src/commands.ts` | CLI command map built at startup |
| `src/tools.ts` | Tool factory; aggregates all built-in tools |
| `start-claude.sh` | Convenience launcher; reads `src/.env` |
