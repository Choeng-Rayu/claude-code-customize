## Context

This is the leaked Claude Code source code (Anthropic's AI coding CLI). The codebase uses Bun runtime and React/Ink for terminal UI.

## Key Architecture Facts

### Project Structure

- `src/main.tsx` - CLI entry point (4683 lines)
- `src/QueryEngine.ts` - Core LLM logic
- `src/services/api/client.ts` - API client factory for different providers
- `src/utils/model/providers.ts` - Provider selection logic
- `src/utils/auth.ts` - Authentication handling
- `src/tools/` - 40+ agent tools

### Technology Stack

- **Runtime:** Bun (with Node.js fallback)
- **Language:** TypeScript (TSX for React components)
- **UI:** React with Ink (terminal React renderer)
- **CLI:** Commander.js

### LLM Provider System (CRITICAL for NVIDIA feature)

Currently supports 4 providers:

1. **Anthropic (firstParty)** - Direct API
   - `ANTHROPIC_API_KEY` - API key
   - `ANTHROPIC_BASE_URL` - Custom endpoint

2. **AWS Bedrock**
   - `CLAUDE_CODE_USE_BEDROCK=1` - Enable
   - `AWS_BEARER_TOKEN_BEDROCK` - Auth token
   - `AWS_REGION` / `AWS_DEFAULT_REGION`

3. **Google Vertex AI**
   - `CLAUDE_CODE_USE_VERTEX=1` - Enable
   - `ANTHROPIC_VERTEX_PROJECT_ID` - GCP project
   - `CLOUD_ML_REGION` / model-specific regions

4. **Azure Foundry**
   - `CLAUDE_CODE_USE_FOUNDRY=1` - Enable
   - `ANTHROPIC_FOUNDRY_API_KEY` or Azure AD
   - `ANTHROPIC_FOUNDRY_RESOURCE`

### Provider Implementation Pattern

To add NVIDIA (or any new provider), modify these files:

1. **`src/utils/model/providers.ts`** - Add `nvidia` to `APIProvider` type - Add `CLAUDE_CODE_USE_NVIDIA` check in `getAPIProvider()`

2. **`src/utils/managedEnvConstants.ts`** - Add `CLAUDE_CODE_USE_NVIDIA` to `PROVIDER_MANAGED_ENV_VARS` - Add `NVIDIA_API_KEY` or similar auth vars

3. **`src/services/api/client.ts`** - Add conditional block like Bedrock/Vertex/Foundry - Import NVIDIA SDK or configure fetch - Handle authentication

4. **`src/utils/auth.ts`** - Add auth checks for NVIDIA in `isAnthropicAuthEnabled()` - Add token retrieval if needed

### Build & Run Commands

```bash
# Install dependencies
bun install

# Run CLI
bun run src/main.tsx

# Build (bundles to single file)
bun build
```

### Environment Variables for Development

- `ANTHROPIC_API_KEY` - Required for testing
- `CLAUDE_CODE_USE_*` - Provider selection flags
- `USER_TYPE=ant` - Enables Anthropic-internal features

### Security Considerations

- **Trust dialog required** for project-level settings
- **apiKeyHelper** can execute shell commands - gated by trust
- Env vars in `SAFE_ENV_VARS` vs `DANGEROUS_SHELL_SETTINGS`

### Model Configuration

Default models controlled via:

- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `ANTHROPIC_SMALL_FAST_MODEL`

### Gotchas

- No package.json (uses Bun)
- No tsconfig.json visible (bundled with Bun)
- Extensive use of environment variables for configuration
- Secure storage via macOS Keychain or plain text fallback
- Provider flags are mutually exclusive (checked in priority order: Bedrock → Vertex → Foundry → firstParty)

## Task-Specific Guidance: Adding NVIDIA API

### Files to Modify

1. `src/utils/model/providers.ts` - Add nvidia provider type
2. `src/utils/managedEnvConstants.ts` - Add NVIDIA env vars
3. `src/services/api/client.ts` - Add NVIDIA client creation
4. `src/utils/auth.ts` - Add NVIDIA auth handling

### Pattern to Follow

See existing provider implementations in `src/services/api/client.ts` lines 153-298. Each provider:

1. Checks env var with `isEnvTruthy(process.env.CLAUDE_CODE_USE_*NVidia*)`
2. Imports SDK (or uses fetch)
3. Configures auth (API key, OAuth, etc.)
4. Returns typed as `Anthropic` for compatibility

### Testing

Set env vars before running:

```bash
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=your_key
bun run src/main.tsx
```
