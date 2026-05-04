# Claude Code – Leaked Source Archive & NVIDIA Integration

## 📖 Summary

This repository contains the full source code of **Claude Code**, Anthropic's AI‑coding CLI, which was unintentionally published on npm via a sourcemap leak. The codebase includes a ~785 KB `main.tsx` entry point, a React‑Ink terminal UI, 40+ agent tools, a Tamagotchi‑style buddy system, Dream & Ultraplan services, and many internal utilities.

### What we added

- **NVIDIA provider support** – Added a new `nvidia` API provider that uses the NVIDIA (Moonshot) endpoint.
- **Environment flags** – `CLAUDE_CODE_USE_NVIDIA=1` enables the provider, with `NVIDIA_API_KEY` (or `NVIDIA_API_KEY`) for authentication.
- **Tool‑calling translation** – Implemented `src/services/api/nvidiaAdapter.ts` to translate Claude‑style tool calls to the OpenAI‑compatible format expected by NVIDIA and back.
- **Stubs for missing Anthropic‑only tools** – Minimal no‑op implementations so the CLI runs without the original proprietary services.
- **Documentation updates** – Added a quick‑start guide and usage instructions for the NVIDIA integration.

## 🚀 Getting Started

### Prerequisites
- **Bun** (recommended) or Node ≥ 18
- **TypeScript** (global install if using `tsc` directly)

### Install
```bash
git clone https://github.com/Choeng-Rayu/claude-code-customize.git
cd claude-leaked
bun install   # or npm install
```

### Build
```bash
bun run src/main.tsx   # runs directly with Bun
# or
npm run build          # produces dist/main.js
```

### Run with NVIDIA
```bash
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=your_nvidia_key   # set the key you obtained from NVIDIA
./start-claude.sh --print "What is 2+2?"
# Expected output: 4
```

#### Example: file creation via tool call
```bash
./start-claude.sh --print "Create a file called hello.txt with the content 'Hello World'"
```
If the NVIDIA model supports tool calling, it will invoke the `FileWriteTool` and create `hello.txt`.

## 🛠️ How the Integration Works
- **Provider selection**: `src/utils/model/providers.ts` now includes `nvidia` in the `APIProvider` enum. `getAPIProvider()` checks `CLAUDE_CODE_USE_NVIDIA`.
- **Client creation**: `src/services/api/client.ts` creates an `NvidiaClient` when the flag is set.
- **Adapter**: `src/services/api/nvidiaAdapter.ts` converts Claude‑style tool schemas to OpenAI function schemas and back, handling streaming responses.
- **Auth**: `src/utils/auth.ts` reads `NVIDIA_API_KEY` (or `NV_API_KEY`) and injects it as an `Authorization: Bearer …` header.

## 📦 Testing the Integration
```bash
npm run test   # runs the test‑suite, including `test-nvidia.ts`
```
A passed test confirms that:
1. The NVIDIA client is instantiated.
2. A basic completion request returns a non‑error response.
3. Tool calls (e.g., `FileWriteTool`) succeed when the model supports them.

## 📚 Additional Resources
- `NVIDIA_IMPLEMENTATION.md` – deeper dive into the adapter code.
- `FIXES_SUMMARY.md` – list of all patches applied during this work.
- Original leak description – see the header section of the previous README (the source code was exposed via a sourcemap on npm).

---

*This repository is for **research and educational** purposes only. The original Claude Code source belongs to Anthropic PBC.*
