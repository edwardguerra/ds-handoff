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

**Resync is section-level, in place.** Every top-level section (`hero`, `meta`, `anatomy`, `properties`, `layout`, `variables`) is stamped with its own `specSection` key + `sourceNodeId` at generation. On resync:
- The sheet frame itself is **never replaced** — its canvas position and its width are left exactly as they are. A sheet width that differs from the generated default is treated as an intentional user choice; nothing resets it (`finalizeSheetWidth` only runs on initial Generate).
- Each section still inside the sheet is rebuilt in its slot (fresh section inserted at the same index, old removed, `FILL` reapplied).
- A section **moved out of the sheet into another frame keeps syncing there** — same parent, stacking order, position, and width — and is **not** re-created back inside the sheet. Deleting a section is also respected: resync doesn't resurrect it.
- Moved-out sections are found page-wide by their `specSection` stamp. With an empty selection they're all included in Resync All; with a selection they're included when selected (directly or via an ancestor) or when their source component matches the selection.
- Sheets generated before section stamping existed have no per-section identity, so they fall back to the old whole-sheet rebuild once — regenerating stamps them for section-level sync from then on.

**Width is real Figma `FILL` sizing, cascading from one root, not matching numbers.** An earlier pass made every section compute the same pixel value (`SHEET_INNER_WIDTH`, 860) so they'd visually line up — but each was still an independently fixed size, so resizing the sheet by hand in Figma did nothing to its children. `finalizeSheetWidth` (spec.ts) now runs once after a sheet's sections are all built: it measures the widest section's natural content (so a component that genuinely needs more room, e.g. Layout & Spacing's `allowScale=false` growth, still gets it), sets that as the sheet's one explicit `FIXED` width, and sets every top-level section to `layoutSizingHorizontal = 'FILL'`. Each section cascades that down its own way:
- **Properties** — 1–2 card groups (the common case: booleans, instance-swaps, most variants) use a plain `HORIZONTAL` auto-layout row with `FILL` cards, which Figma splits evenly and keeps in sync if the row resizes later. Each card's own preview panel is `FILL` relative to the card. 3+ card groups stay on the old `GRID` layout (wraps into rows of 2) since `WRAP` layouts require fixed/hug child sizes and can't use `FILL` — a fixed width there is an accepted trade-off for a case this rare.
- **Layout & Spacing** — the two-column row, each column, and their preview panels are all `FILL`.
- **Variables** — the table, header, divider, and each row are `FILL`.
- **Anatomy** — the content row is `FILL`, and its preview panel stretches via `layoutAlign = 'STRETCH'` (works here since its parent, `row`, is a real auto-layout frame).

**The cloned preview content inside each card/panel re-centers reactively, via constraints, not by recomputing on every resize.** `centerNodeInPanel` positions each clone with absolute x/y once, same as before, but now also sets `constraints = { horizontal: 'CENTER', vertical: 'CENTER' }` on it. Figma's default constraint is top-left pinning, which is exactly why a panel that later widened via FILL left its content stranded on the left with dead space on the right — CENTER/CENTER tells Figma to keep it centered itself, live, whenever the panel resizes, no matter what resized it or when. Two related spots needed the same treatment:
- **Anatomy's overlay markers** — each callout badge/leader-line frame was positioned relative to the component's build-time location; it now also gets `constraints = CENTER/CENTER` so it shifts in sync with the (natively re-centering) component instead of staying frozen and pointing at the wrong spot.
- **Anatomy's `previewCanvas`** — its `layoutAlign = 'STRETCH'` was silently inert, because its parent (`preview`) is `layoutMode: 'NONE'` and `STRETCH` only means anything inside an auto-layout parent. The `NONE`-mode equivalent is `constraints = { horizontal: 'LEFT_RIGHT', vertical: 'MIN' }` (pin both edges instead of one), which is what actually makes it widen when `preview` does.

Alignment-grid and direction-arrow icons intentionally keep Figma's default constraints (pinned, not centered) — they're UI chrome, not content, and should stay put rather than drift toward center as a panel resizes.

`makeLightPreviewPanel` no longer clips (`clipsContent = false`). It used to, plus a rounded corner, which made any mismatch between the growth math and the content's actual render bounds show up as a visible crop. The growth math (`centerNodeInPanel`'s `allowScale=false` path) sizes the panel off the cloned node's layout `width`/`height`, which don't account for effects or anything else that can render outside them — so it can under-measure. Not clipping means that gap now shows as content occasionally overhanging the rounded rect rather than being silently cut off by it.

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
