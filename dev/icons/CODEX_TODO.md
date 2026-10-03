# Codex asset-work configuration TODOs

Started 2026-10-03 during icon batch 41. Concrete gaps only; no configuration
has been changed.

- [ ] Repair the managed Windows shell sandbox. Standard `exec_command` failed
  before process creation with `helper_unknown_error: setup refresh had errors`.
  Approved escalated PowerShell calls worked; `apply_patch` also worked.
- [ ] Expose the workspace's Chrome DevTools and offline Foundry MCP servers to
  the Codex harness. Neither tool set was exposed in this session. The existing
  Chrome debug session was reachable through direct local CDP; no new browser
  or server was necessary. Keep game-port discovery dynamic.
- [ ] Provide shared `AGENTS.md` entry points for the campaign and module, linking
  the existing `DEV_GUIDE.md`, `IMPLEMENTATION.md`, and asset pipelines. Operational
  guidance currently lives partly in campaign `.github/copilot-instructions.md`.

Working asset path: built-in image generation → copy atlas from Codex output to
`dev/icons/in/` → `process_grid_N.py` → PNG + SVG masks → source icon references
and live Foundry API updates → queue/changelog. Batch 41 needed no API key and
introduced no dependency. See `batch_41_prompt.md` for exact generation provenance.
