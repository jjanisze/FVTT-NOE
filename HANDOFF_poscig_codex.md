# HANDOFF — Pościg: themes, graphics, vehicle orientation & lane sway (for Codex) + field test of the agent tooling

> Written 2026-10-05 by Claude Code for **Codex**, the multimodal agent: this task is chosen for its
> tight visual loop — look at the board, change it, look again, measure. Two goals, in this order
> of importance for the GM:
>
> 1. **The functional request** (§3): three graphical themes for the chase board, better graphics,
>    vehicles that always face the direction of travel, and a subtle in-lane sway — with
>    performance measured, not assumed, and tests.
> 2. **A field test of the agent tooling built today** (§2): you are the first agent other than its
>    author to use it. Report what helped and what got in the way.
>
> Delete this file once the work is done and recorded elsewhere (repo convention for `HANDOFF_*`).

**Read first, in this order:** [AGENTS.md](AGENTS.md) → [dev/agent/README.md](dev/agent/README.md) →
[PLAN_poscigi.md](PLAN_poscigi.md) §2 and §9a (the board, and the v14 traps already paid for) →
[TESTING.md](TESTING.md) §3 "Warstwa 6" → this file. Polish is the language of the module's UI and
of most comments; player-facing strings stay Polish.

---

## 1. Your setup (done today, verify with one command)

- **MCP servers** (global Codex config): `chrome-devtools` — attached to the GM's already-running
  Chrome, started through `Neuro 5e/Integracje/chrome-debug/chrome-devtools-mcp.mjs` in the campaign
  vault, which reads the endpoint from the vault's `.mcp.json` (never copy the port anywhere);
  `foundry-vtt` — the offline LevelDB server (start with `foundry_status`; reads work while Foundry
  runs, from a snapshot; writes are refused then).
- **Skills** (`~/.codex/skills`): `foundry-vtt`, `fvtt-api`, `splatter` — wrappers around the
  canonical files in the vault's `.github/skills/`. "Which file defines class X" in Foundry/dnd5e:
  grep `fvtt-source-map.md` there.
- **Sandbox (GM decision):** Codex's own shell sandbox is unchanged; the GM approves escalations
  (`npm run fvtt …` needs localhost, the DPAPI secret, `%LOCALAPPDATA%` writes and process
  control). Batch commands to keep approvals few.
- **Chrome is shared with the GM** and only a human starts or restarts it. Never kill it.

```sh
npm run fvtt -- doctor        # module repo; everything below assumes this says ok
```

## 2. Field test of the tooling — what to use, what to report

Use the tools for real while doing §3; don't run them for their own sake. At the end, append a
**"Codex field test (date)"** entry to [PLAN_agentic_improvements.md](PLAN_agentic_improvements.md)
§9: what you ran, what happened, what you expected, how many approval prompts it took, and every
point where you needed the GM. Short and concrete — this feeds the next retro.

| Step of §3 | Tooling to use | Expected |
|---|---|---|
| Orientation | `fvtt doctor` | servers, mode `development`, Chrome tabs, no held databases |
| A world to work in | `npm run fvtt -- sandbox:init` (refreshes links), then `world:create poscig --fixture=<yours>` | a fresh `agent-poscig-<date>` world in the **sandbox** data path, own port, beside the campaign |
| Seeing it | `npm run fvtt -- login --profile=sandbox --context=gm` (then `--user="Gracz 1" --context=gracz1`), chrome-devtools `list_pages`, `select_page`, `take_screenshot` | GM and player tabs at once. Pages in fvtt-made contexts are not labelled as isolated in `list_pages`; tell them apart with `evaluate_script` → `game.user.name`, `game.world.id` |
| After editing `scripts/**` | `npm run fvtt -- reload --profile=sandbox [--page=…]` | hard reload past the ES-module cache, waits for `game.ready` |
| Performance | chrome-devtools `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight`; in-page `canvas.app.ticker.FPS` sampling | traces from the real GPU, foreground tab (`select_page` with `bringToFront`) — background tabs throttle rAF and lie |
| Unit-level checks | `npm run fvtt -- quench --profile=sandbox [--filter=poscig]` and, before finishing, `npm run fvtt -- quench` (campaign) | `{total, passed, failed, failures[]}`; campaign was 759/759 today |
| Layer-6 tests | `npm run fvtt -- e2e --suites=poscig [--keep]` | `logs/e2e/<run>/report.json` + screenshots; red keeps the world and tabs |
| Offline reads | `foundry-vtt` MCP, `foundry_status`, then e.g. `foundry_search_documents` with `world: "agent-…"` | sandbox worlds are readable, read-only |
| Before handing back | `npm run release:check -- --skip-sandbox` (full gate if time allows) | green; it re-runs generators and verifies the zip |

Mode is `development`: restarting the campaign server is allowed, but nothing in this task needs
the campaign world — build and test everything in the sandbox. Packs are not involved.

---

## 3. The functional request

### 3.1 How the board works today (facts you build on)

- A chase board is a **generated scene** with a module flag `flags.neuroshima-2026-overrides.poscig`
  (`isPoscigScene()`); created by `game.neuroshima.poscig.start({...})` / the GM's dialog
  (`poscig-ui.mjs`). Code: `scripts/scenes/poscig.mjs` (scene, flags, pieces),
  `poscig-canvas.mjs` (graphics), `poscig-snap.mjs` (lane snapping, recentring), `poscig-ui.mjs`.
- **Geometry** (`poscig.mjs`): lanes are **vertical columns**, `LANE_W = 200` px = one chase marker
  (36 m). Lane *n* centre: `torX(n)`; lane of an x: `xNaTor(x)`. The **chase band** is above
  `FREEFORM_Y = 1300`; below it is the GM's free zone (drawings, nothing mechanical). Vehicles stand
  from `PAS_GORA = 420` down. The square grid is invisible (`alpha: 0`) and exists only so Foundry
  asks `getSnappedPosition` — gridless would disable snapping entirely.
- **Direction of travel is to the right**: a higher lane number is further ahead; the background
  scrolls (parallax via `TilingSprite.tilePosition.x`) so the road appears to move left.
- **Snapping** (`poscig-snap.mjs`): an override of `TokenDocument#getSnappedPosition` puts the token's
  **centre x** on the lane centre and leaves y free (several vehicles per lane). Shift-drag skips it
  (Foundry's own "don't snap"). **The lane is never stored** — it is computed from position
  (`pionkiPoscigu()`), so "snapped to a lane" must be computed too.
- **Graphics** (`poscig-canvas.mjs`): one PIXI container in `canvas.primary` at `elevation 0`,
  `sortLayer 100` (above the scene background, below tiles/drawings/tokens); sky + three parallax
  strips (`far 0.25`, `mid 1.0`, `near 2.0`), textures **baked procedurally** at runtime
  (`_bakeFar/_bakeMid/_bakeNear`, 1024-px tiles), swap point `DESERT_TEXTURES = {far, mid, near}`
  (`null` = bake). Speed: `BASE_SPEED × flaga.tempoTla` (GM slider). Lanes, numbers and the free-zone
  caption are drawn in the same layer. Ticker added once, removed on `canvasTearDown`; baked textures
  destroyed with the layer.
- **Pieces**: tokens with the role flag `poscigRola` (`scigany`/`scigajacy`), width 1, `sight`
  disabled; created from vehicle actors (`daneTokenu`). The active GM recentres the whole field when
  someone leaves the board (one `updateEmbeddedDocuments`).
- **RAW environments** `SRODOWISKA` (`config/vehicles-data.mjs`: open / streets / narrow alleys) set
  the Chase Test DC only. They are **not** graphics.

**Traps already paid for** (`PLAN_poscigi.md` §9a, project memory): `sprite.mask` silently does
nothing here — cut by geometry; the canvas renders on ticker priority LOW, so updates on NORMAL land
before the same frame's render; a v14 scene level needs `_id: "defaultLevel0000"` or tokens vanish
without an error; rewriting `changes.x/y` in `preUpdateToken` kills a move silently (but `rotation`
is not in `TokenDocument.MOVEMENT_FIELDS` — verify live before relying on that); token
`texture.scaleX` lags mid-animation — read `_source`; positional destructuring of
`createEmbeddedDocuments` results is unstable.

### 3.2 Themes and better graphics

Three **themes**, independent of the RAW environment (GM decision): any look with any DC.

| id (suggested) | UI name (Polish) | Note |
|---|---|---|
| `pustynia` | Pustynia Nevady | **Default**, and what every existing board without the new flag shows. Today's procedural desert, improved. |
| `przedmiescia` | Przedmieścia w ruinach | Suburbia ruins: burnt-out houses, wrecks, cracked asphalt. |
| `zima` | Nuklearna zima | Grey-white, ash/snow; the obvious candidate for a particle layer — budget it. |

- A theme defines everything the layer draws: sky, the three parallax strips, lane colours/lines,
  label style, optional ambient effect. Store the choice in the scene's `poscig` flag (e.g.
  `motyw`), pick it in the new-chase dialog and the settings dialog; switching it rebuilds the layer
  live (the layer already rebuilds from flags — `poscigCanvasApi.odswiez`, in the console
  `game.neuroshima.poscig.tlo.odswiez()`).
- **Procedural or authored art is your call**, per layer, judged by how it looks *and* what it
  costs. Authored assets: **WEBP**, horizontally tileable, power-of-two widths, under the module
  (e.g. `ui/poscig/<theme>/`), provenance noted (generated art: keep the prompt next to it, as the icon
  pipeline does in `dev/icons/`; third-party: `CREDITS.md`). Never a PNG in the repo.
- "Better graphics" for the desert too: today's bake is simple bands and blobs. Depth, horizon,
  road surface, motion cues — use your eyes; screenshot before and after at the GM's window size.

**Performance — measured, not assumed.** Measure the current board first (baseline), then every
theme, all in a foreground tab, 12 lanes, 6 vehicles swaying (§3.4), 60 s each:
sustained FPS, p95 frame time, main-thread cost of the ticker, GPU texture memory of the layer
(sum of texture sizes), and JS heap over 60 s (flat = no per-frame allocation). Proposed budget,
to confirm with the GM if the baseline itself misses it: **≥ 55 fps sustained, p95 frame ≤ 20 ms,
≤ 48 MB of layer textures per theme, heap flat, and no theme more than 15 % slower than the
baseline**. Put the numbers in the hand-back (§3.6), per theme.

### 3.3 Vehicles always face right — lane band only

- On a chase board, every token **in the chase band** (centre above `FREEFORM_Y`) faces the
  direction of travel (right). Tokens in the free zone keep whatever rotation the GM gives them
  (GM decision). Other scenes: no change at all.
- Make it the **document** rotation, not just a visual: vision/light cones, targeting and VFX
  then agree with what is drawn. Enforce on token creation, on a move into the band, and when
  someone rotates a token in the band (it snaps back). The client making the change applies it
  in the same operation — no GM relay needed. Moving out to the free zone does not rotate.
- **Art facing differs from "rotation 0"**: Foundry treats rotation 0 as facing down (south). The
  party's GMT400 token art (in the campaign world, not in this repo) has its front at the
  **bottom** — so "facing right" is rotation 270 for it. Look at the other vehicle art before
  assuming the same (the police "Hammer Posterunku", and whatever you use in the sandbox): if
  facings differ, add a per-actor facing offset rather than guessing per image.
- The sandbox has no vehicle actors and none of the campaign's art: create minimal dnd5e `vehicle`
  actors in your fixture, with token art you make for the purpose (top-down, transparent
  background, front pointing a known way) — never copy campaign art into the repo.

### 3.4 Lane sway — only for tokens snapped to a lane

- A token is **snapped to a lane** when it is on a chase board, in the chase band, and its centre x
  equals `torX(xNaTor(centre))` (within ~1 px). Shift-placed between lanes, or in the free zone:
  no sway. Write this as a pure, exported predicate and test it.
- The sway is **purely visual**: offsets applied to the token's rendered mesh each frame, never a
  document update (no database traffic; every client animates locally). Document x/y/rotation,
  snapping, recentring, targeting and the facing from §3.3 stay exactly as they are.
- Character: a vehicle on a rough road — a slight shake plus a delicate, slow yaw left and right
  (a few degrees), with a small drift sideways to its heading (on screen: up/down), always staying
  inside its lane. Each vehicle has its own phase (seed from the token id) so the convoy does not
  move in lockstep. Scale it with `tempoTla` (a stopped road = no sway).
- It must compose with Foundry's own token animation (a moving token animates its mesh — apply the
  offset after that, don't fight it), with dragging (no sway on the drag preview; recompute
  "snapped" on drop) and with recentring.
- **Setting:** per-user module setting (`scope: "user"`), e.g. "Animacja pojazdów na planszy
  pościgu", **default on**. **Ignore `prefers-reduced-motion`** (GM decision: this is a game, not a
  page; the GM's own Chrome reports reduced motion, so honouring it would switch the feature off
  on the table's machine). Turning it off stops the sway immediately and restores the meshes.

### 3.5 Tests

- **Quench** (`scripts/tests/poscig.test.mjs`, layers 1–4): theme registry complete (every theme
  defines every part, has a Polish name, the default exists and is what a flag-less board gets);
  the "snapped to a lane" predicate (lane centre → yes; Shift offset → no; free zone → no; lanes off
  the board); the orientation rule (art facing + offset → rotation); the sway function (deterministic
  per seed, bounded so the vehicle never leaves its lane, zero when the road is stopped or the
  setting is off).
- **Layer 6** — `dev/e2e/fixtures/poscig.mjs` (a board with vehicles: two snapped, one Shift-placed
  between lanes, one in the free zone) and `dev/e2e/suites/poscig.mjs`, with GM and a player:
  each theme renders (screenshot evidence per theme); band tokens are at rotation "right" as
  documents, the free-zone token is untouched; a token rotated by hand snaps back; sampling the
  mesh transform over ~1 s shows sway for snapped tokens only, on the player's client too; the
  setting off → no sway; **a performance assertion** per theme against the budget above (foreground
  tab). The suite must not depend on `createEmbeddedDocuments` order (read, never assume).
- **Mutation check**, as for the combat suite: break the snapped predicate (e.g. sway everything)
  and show the suite going red; restore.
- Green before handing back: `npm test`, `fvtt quench` (campaign and sandbox), `fvtt e2e` (all
  suites), `npm run release:check -- --skip-sandbox`.

### 3.6 Done when — and the hand-back

- Three themes selectable; boards without the flag show Nevada desert; the GM has seen screenshots
  of all three.
- Facing and sway behave as specified on GM and player clients; the setting works.
- Performance numbers per theme recorded and within budget (or the GM agreed to different numbers).
- Tests above green; the mutation check done.
- Docs: `PLAN_poscigi.md` — a section on themes, facing and sway (and correct anything in §2 the
  work proves wrong, the way earlier corrections there are marked); `IMPLEMENTATION.md` matrix row;
  `CREDITS.md` for any third-party art.
- Hand-back: a short report appended to this file — what changed, the performance table, the
  screenshot paths — and the §2 field-test entry in `PLAN_agentic_improvements.md`.
- Commits small, `Area: what changed` subjects; the repo is public (no ports, hosts, secrets,
  personal paths, campaign spoilers).

## 4. Decisions already made by the GM (2026-10-05) — don't re-ask

| Topic | Decision |
|---|---|
| Themes vs RAW environments | Independent; default Nevada desert. |
| Who faces right | Tokens in the chase band only; the free zone is the GM's. |
| Motion and `prefers-reduced-motion` | Ignore the OS flag; per-user setting, default on. |
| Codex sandbox | Unchanged; the GM approves `fvtt` escalations. |

## 5. Ask the GM (don't guess) if

- the baseline already misses the performance budget, or a theme can only meet it by looking
  noticeably worse;
- a vehicle's art cannot be made to face right cleanly (e.g. a non-top-down or circular portrait);
- anything in this file contradicts what you see in the running board.
