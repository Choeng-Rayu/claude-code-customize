# Claude Code with NVIDIA API - Quick Start Guide

## ✅ Status: READY TO USE

Claude Code has been successfully integrated with NVIDIA's API. You can now use it to develop your code!

---

## 🚀 Quick Start (3 Methods)

### Method 1: Quick Start Script (Recommended)

```bash
cd /home/rayu/claude-code-customize
./start-claude.sh
```

### Method 2: Manual Start

```bash
cd /home/rayu/claude-code-customize
export CLAUDE_CODE_USE_NVIDIA=1
export NVIDIA_API_KEY=nvapi-your-key
bun run src/main.tsx
```

### Method 3: Install System-Wide

```bash
cd /home/rayu/claude-code-customize
./install.sh
claude-nvidia
```

---

## 📋 Prerequisites

1. **Bun Runtime** (already installed at `~/.bun/bin/bun`)
2. **NVIDIA API Key** (already configured in `.env` file)
3. **Node Dependencies** (already installed with `bun install`)

---

## 🔧 Configuration

### Required Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `CLAUDE_CODE_USE_NVIDIA` | `1` | Enable NVIDIA provider |
| `NVIDIA_API_KEY` | `nvapi-...` | Your NVIDIA API key |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_MODEL` | Model alias (e.g., `claude-sonnet-4-6`) |

---

## 🎯 Usage Examples

### Start in Current Directory

```bash
./start-claude.sh
```

### Start in Specific Project

```bash
./start-claude.sh /path/to/your/project
```

### Show Help

```bash
./start-claude.sh --help
```

---

## 🧪 Testing

Test the NVIDIA API integration:

```bash
bun run test-nvidia.ts
```

Run the demo to see the status:

```bash
bun run demo.ts
```

---

## ⚠️ Important Notes

### 1. Rate Limiting
- You may see `429 Too Many Requests` errors
- This is normal API rate limiting
- Wait a few seconds and try again

### 2. Model Mapping
- All Anthropic models map to `moonshotai/kimi-k2.6`
- This is the NVIDIA model configured for this integration

### 3. Missing Tools
- Some internal tools (TungstenTool, etc.) are not included
- These are used for specific Anthropic-internal features
- Basic functionality works fine without them

---

## 🐛 Troubleshooting

### Issue: "Cannot find module..."
**Solution:** Run `bun install` to install dependencies

### Issue: "bun: command not found"
**Solution:** Add Bun to your PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Issue: "NVIDIA API error (401): Unauthorized"
**Solution:** Check your NVIDIA_API_KEY is set correctly

### Issue: "429 Too Many Requests"
**Solution:** Wait a few seconds and retry. This is normal rate limiting.

---

## 📁 Key Files

| File | Description |
|------|-------------|
| `start-claude.sh` | Quick start script |
| `install.sh` | System-wide installation |
| `test-nvidia.ts` | NVIDIA API test |
| `demo.ts` | Status demo |
| `src/services/api/nvidiaAdapter.ts` | NVIDIA API adapter |

---

## 🎉 You're Ready!

Claude Code with NVIDIA is ready to use. Run:

```bash
./start-claude.sh
```

And start coding! 🚀

---

## 📚 Additional Documentation

- `NVIDIA_IMPLEMENTATION.md` - Technical implementation details
- `README.md` - Original Claude Code README
- `AGENTS.md` - Claude Code architecture notes
