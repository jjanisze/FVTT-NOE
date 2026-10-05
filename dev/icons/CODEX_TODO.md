# Codex asset-work configuration TODOs

Started 2026-10-03 during icon batch 41. Concrete gaps only; no configuration
has been changed.

- [ ] Repair the managed Windows shell sandbox. Standard `exec_command` failed
  before process creation with `helper_unknown_error: setup refresh had errors`.
  Approved escalated PowerShell calls worked; `apply_patch` also worked.
  *2026-10-05, GM decision: the sandbox stays as it is; the GM approves escalations
  (including `npm run fvtt …`). Still worth reporting if it keeps failing.*
- [x] Expose the workspace's Chrome DevTools and offline Foundry MCP servers to
  the Codex harness. *Done 2026-10-05:* global Codex MCP servers `chrome-devtools`
  (via the vault launcher `Integracje/chrome-debug/chrome-devtools-mcp.mjs`, which
  reads the endpoint from `.mcp.json` — discovery stays dynamic, no port copied) and
  `foundry-vtt`; both handshake-tested. Skills `foundry-vtt`, `fvtt-api`, `splatter`
  in `~/.codex/skills`.
- [x] Provide shared `AGENTS.md` entry points for the campaign and module. *Done
  2026-10-05:* [AGENTS.md](../../AGENTS.md) here; the campaign's is in the vault's agent
  root (a pointer at the vault root for sessions started there).

Working asset path: built-in image generation → copy atlas from Codex output to
`dev/icons/in/` → `process_grid_N.py` → PNG + SVG masks → source icon references
and live Foundry API updates → queue/changelog. Batch 41 needed no API key and
introduced no dependency. See `batch_41_prompt.md` for exact generation provenance.
