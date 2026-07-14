# DS Handoff

Figma plugin combining two previously separate plugins into one design-handoff toolkit:

- **Component Spec** — generates annotated spec sheets for components/instances (anatomy callouts, properties, layout & spacing, styles, variables).
- **Variables** — documents local variables and styles (color, text, effect, grid) on canvas, with one-click refresh.

## How it works

One window (`ui.html`) with a **Component | Tokens** toggle:

- **Component** — spec sheet generation with module checkboxes, Generate/Resync buttons, live selection state. Resync regenerates the sheet(s) linked to the current selection in place.
- **Tokens** — collection/style pickers and Confirm, documenting variables and styles on canvas. Stays open after generating (the old standalone plugin closed itself). A Resync button appears once a doc frame exists on the page, regenerating it in place with its last-used collection/style selection — no need to reselect the frame or reopen the pickers.

[src/main.ts](src/main.ts) owns the UI and dispatches messages: `generate-specs` / `resync-specs` / `clear-specs` → spec module; `tokens-confirm` / `tokens-resync` → variables module; `ui-resize` swaps window size per tab (320×460 vs 560×500).

Both resync flows follow the same pattern: the generated frame is stamped with `pluginData` (source node id + module selection for Component; a doc marker + collection/style ids for Tokens) so it can be found and regenerated without depending on canvas selection.

Variable **mode** context (e.g. a Dark mode applied to a frame higher up the tree) doesn't inherit into cloned previews — clones end up as siblings on the page, not descendants of whatever frame set the override. `propagateResolvedVariableModes` in spec.ts reads the source node's `resolvedVariableModes` and re-applies each one to the generated sheet via `setExplicitVariableModeForCollection`, so Anatomy/Properties previews resolve variables the same way the original did, mode included.

Resync doesn't require re-finding the exact source node. Any of these select and trigger it:
- The exact node specs were generated from, an ancestor frame wrapping it, or anything nested inside it (any depth, including nested frames).
- The generated sheet itself, selected directly — it already carries its own source id in `pluginData`.
- **Nothing** — with an empty selection, Resync regenerates every stamped sheet on the page ("Resync All (N)"). Generate once, and every later resync is a single click with no reselecting.

**Accessibility section** (`a11y`): evaluates the component as rendered —
- *Color contrast*: every unique text-fill/background pair, WCAG 2.x ratio against AA thresholds (4.5:1 normal, 3:1 large text ≥24px or ≥18.66px bold). Background is approximated as the nearest ancestor's opaque solid fill. Each row's swatch (`makeContrastSwatch`) shows "Aa" set in the actual foreground color on the actual background color — a live sample, like a contrast-checker tool, rather than an abstract swatch+dot.
- *Typography*: unique font family/style/size combos, flagging sizes below 12px and text without a text style or typography variable.
- *Touch targets*: the component root plus nested elements that look interactive (name heuristics or prototype reactions); 44px+ passes (Apple HIG / WCAG AAA), 24–43px is borderline (WCAG 2.2 AA minimum), below 24 fails.

**Handoff readiness section** (`readiness`): a weighted 0–100 score with a verdict (≥90 Ready, 75–89 Nearly ready, 50–74 Needs attention, <50 Not ready). Criteria and weights: Color tokens (20) — solid fills/strokes bound to variables/styles; Spacing & radius tokens (15); Typography tokens (10); Interactive states (15) — ≥3 state variants pass, 2 warns, interactive-looking with none fails; Auto layout (10) — root uses auto layout; Structure & naming (10) — properties defined + few default-named layers; Accessibility (20) — rolls up the a11y section's results. Criteria that don't apply (e.g. states on a non-interactive component) are N/A and excluded from the denominator, so a static component isn't penalized. This section is the plugin's final intent: a confidence check that the marked-up component is truly ready.

**Resync is section-level, in place.** Every top-level section (`hero`, `meta`, `anatomy`, `properties`, `layout`, `variables`, `a11y`, `readiness`) is stamped with its own `specSection` key + `sourceNodeId` at generation. On resync:
- The sheet frame itself is **never replaced** — its canvas position and its width are left exactly as they are. A sheet width that differs from the generated default is treated as an intentional user choice; nothing resets it (`finalizeSheetWidth` only runs on initial Generate).
- Each section still inside the sheet is rebuilt in its slot (fresh section inserted at the same index, old removed, `FILL` reapplied).
- A section **moved out of the sheet into another frame keeps syncing there** — same parent, stacking order, position, and width — and is **not** re-created back inside the sheet. Deleting a section is also respected: resync doesn't resurrect it.
- Moved-out sections are found page-wide by their `specSection` stamp. With an empty selection they're all included in Resync All; with a selection they're included when selected (directly or via an ancestor) or when their source component matches the selection.
- Sheets generated before section stamping existed have no per-section identity, so they fall back to the old whole-sheet rebuild once — regenerating stamps them for section-level sync from then on.
- Sections introduced by newer plugin versions (currently `a11y` and `readiness`) are **backfilled** on resync: appended to sheets that never had them. The sheet's `specSectionsGenerated` record distinguishes "never generated" (backfill) from "user deleted it" (stays deleted).

**Width is real Figma `FILL` sizing, cascading from one root, not matching numbers.** An earlier pass made every section compute the same pixel value (`SHEET_INNER_WIDTH`, 860) so they'd visually line up — but each was still an independently fixed size, so resizing the sheet by hand in Figma did nothing to its children. `finalizeSheetWidth` (spec.ts) now runs once after a sheet's sections are all built: it measures the widest section's natural content (so a component that genuinely needs more room, e.g. Layout & Spacing's `allowScale=false` growth, still gets it), sets that as the sheet's one explicit `FIXED` width, and sets every top-level section to `layoutSizingHorizontal = 'FILL'`. Each section cascades that down its own way:
- **Properties** — 1–2 card groups (the common case: booleans, instance-swaps, most variants) use a plain `HORIZONTAL` auto-layout row with `FILL` cards, which Figma splits evenly and keeps in sync if the row resizes later. Each card's own preview panel is `FILL` relative to the card. 3+ card groups stay on the old `GRID` layout (wraps into rows of 2) since `WRAP` layouts require fixed/hug child sizes and can't use `FILL`.
  - **`GRID` children always get `FILL`, unconditionally — do not make this growth-aware like the 1–2 card row.** A `GRID` child left without an explicit `layoutSizingHorizontal` doesn't place into its own cell correctly; it can render on top of an adjacent card instead of beside it. This was tried once and broke Properties for any 3+ option variant group. The accepted trade-off: an oversized card in a 3+ group can still crop in rare cases — that's preferable to overlapping, unusable output.
- **Layout & Spacing** — the two-column row, each column, and their preview panels are all `FILL`.
- **Variables** — the table, header, divider, and each row are `FILL`.
- **Anatomy** — the content row is `FILL`, and its preview panel stretches via `layoutAlign = 'STRETCH'` (works here since its parent, `row`, is a real auto-layout frame).

**The cloned preview content inside each card/panel re-centers reactively, via constraints, not by recomputing on every resize.** `centerNodeInPanel` positions each clone with absolute x/y once, same as before, but now also sets `constraints = { horizontal: 'CENTER', vertical: 'CENTER' }` on it. Figma's default constraint is top-left pinning, which is exactly why a panel that later widened via FILL left its content stranded on the left with dead space on the right — CENTER/CENTER tells Figma to keep it centered itself, live, whenever the panel resizes, no matter what resized it or when. Related spots needed the same treatment: Anatomy's overlay markers and callout leader-lines, and the padding-redline/gap overlays `drawAutoLayoutGuides` draws in Layout & Spacing. Anatomy's `previewCanvas` uses `constraints = { horizontal: 'STRETCH', vertical: 'MIN' }` (its `layoutAlign = 'STRETCH'` is inert — its parent is `layoutMode: 'NONE'`, and `layoutAlign` only means anything inside an auto-layout parent) — `'STRETCH'` is the actual API value; an earlier pass used `'LEFT_RIGHT'`, the UI label, not a valid value, so the assignment threw silently and the canvas never widened.

Alignment-grid and direction-arrow icons intentionally keep Figma's default constraints (pinned, not centered) — they're UI chrome, not content, and should stay put rather than drift toward center as a panel resizes.

**Preview panels clip (`clipsContent = true`).** This was briefly `false` as a stopgap — clipping was hiding real sizing bugs, so it got disabled to expose overflow instead of masking it. The actual bug was `buildLayoutSheetSection` and `makeStateCard` unconditionally applying `layoutSizingHorizontal = 'FILL'` to preview panels *after* their content had already legitimately grown wider than the section's column width (`centerNodeInPanel`'s `allowScale=false` growth path) — FILL snapped the panel straight back down to its evenly-split share, discarding the growth and genuinely cropping content. Both builders now track whether a panel/card actually grew and, when it did, leave that column/card at its natural (wider) size instead of forcing FILL — `finalizeSheetWidth` then measures the true requirement and grows the whole sheet to match, so nothing needs to crop.

**`centerNodeInPanel` uses two different margins, deliberately not the same number.** `padX`/`padY` (16px) decides *whether* a panel needs to grow at all — kept tight, matching the pre-existing baseline, so components that fit comfortably at the FILL-target width are never flagged as "grew." `growPadX`/`growPadY` (28px) is the margin actually *applied once* growth is triggered — generous, since guide labels drawn after centering (Layout & Spacing's padding/gap overlays) extend outside the clone's own bounds and need room. These were briefly the same 28px value, which raised the "does it need to grow" threshold along with the "how much room once it does" amount — moderate-width components that fit fine with standard 16px padding started falsely registering as grown, permanently skipping `FILL` and sitting at a fixed (`HUG`-looking) width instead of tracking the sheet. Don't merge these back into one number.

**Card/panel FILL is only growth-aware in the plain `HORIZONTAL` row (1–2 property cards) and Layout & Spacing — never in `GRID` (3+ property cards).** A `GRID` child left without an explicit `layoutSizingHorizontal` doesn't place into its own cell correctly and can render on top of the adjacent card instead of beside it. `GRID` cards always get `FILL` unconditionally; the accepted trade-off is that a genuinely oversized card in a 3+ option group can still crop in rare cases, which is preferable to broken, overlapping output.

**Repeated auto-layout siblings only get their padding/gap value labeled once.** `drawAutoLayoutGuides` recurses into every visible auto-layout child (e.g. 5 identical nav items, each with the same internal icon-to-label gap) — every gap in one container shares its parent's single `itemSpacing` value, so without dedup every pair, and every repeated sibling recursed into, stacked an identical text label on top of each other. A `seenLabels` set is now threaded through the whole recursive call tree (created once at depth 0): the colored region still draws for every occurrence (so gap/padding coverage stays visible), but only the first occurrence of each unique label gets text.

**Anatomy no longer marks bare `VECTOR` layers** (icon paths, decorative shapes) — they're implementation detail, not anatomy, and numbering them added noise without documenting anything meaningful. (Note: the anatomy marker/legend logic actually used by `buildAnatomySheetSection` lives in its own marker-queue loop, not in `createAnatomyOverlay` — that function is dead code, unreferenced anywhere; don't edit it expecting it to affect output.)

**Numeric variant options sort smallest→largest.** A variant that's purely a display number (e.g. a badge's `Count`: 1, 2, 3...) now sorts numerically instead of using Figma's stored insertion order, which doesn't reliably match numeric order (`"10"` can land before `"2"`). Only applies when every option in the group is a plain number — text variants like Small/Medium/Large keep their original order.

**TEXT component properties are hidden from the Properties section** — same preview, different string, and the content is subjective per usage, so it's noise rather than spec.

Clicking `DS Handoff` in the Plugins menu always opens the unified UI directly on the Component tab — switch to Tokens with the in-app toggle. The only `figma.command` routing left is for contextual relaunch buttons:

| Entry point | Opens |
|---|---|
| "Refresh variables" relaunch button | Tokens tab (`rewrite` flow) |
| "Wrap in auto layout" relaunch button | headless, no UI |

## Build

```bash
npm install
npm run build      # esbuild bundle → code.js
npm run watch      # rebuild on change
npm run typecheck  # tsc --noEmit
```

In Figma: `Plugins → Development → Import plugin from manifest…` and select `manifest.json`.

## Structure

- `src/main.ts` — entry point, unified UI controller, message dispatcher
- `src/spec.ts` — Component module (exports `registerSpecSelectionTracking`, `handleSpecMessage`)
- `src/variables.ts` — Tokens module (exports `getTokensInitData`, `handleTokensConfirm`, `handleTokensResync`, `handleCreateAutoLayout`)
- `ui.html` — single UI with both tabs; Tokens styles scoped under `#tab-tokens` via CSS nesting so the two design languages don't collide
- `LAYOUT_LAYER_STRUCTURE.md` — Component Spec sheet layer structure reference

## Provenance (merged July 2026)

- Component Spec source: `~/Dropbox/Main/Code/Figma Plugins/Component Spec` (last updated Jul 2026 — was the only copy)
- Variables source: `~/Documents/GitHub/plugin-variables` **working tree** (May 2026, including changes that were never committed)
- `~/Dropbox/Main/Code/Figma Plugins/Variables` was a stale Jan 2026 snapshot and was **not** used

The old folders were left in place; this repo supersedes all of them.

## Notes

- `documentAccess: "dynamic-page"` is intentionally **omitted**: the Variables module still uses sync APIs (`getLocalVariableCollections`, `getVariableById`, `getLocalGridStyles`) that throw under dynamic-page. Migrating those to the async equivalents would allow re-enabling it (needed if this is ever published to Community).
- **Don't change `manifest.json`'s `id`.** `setPluginData`/`getPluginData` (used by both Resync features) are namespaced per plugin id — changing it orphans every sourceNodeId/specModules/dsTokensDoc stamp already on canvas, silently breaking resync for existing sheets.
