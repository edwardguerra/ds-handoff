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

**Width is real Figma `FILL` sizing, cascading from one root, not matching numbers.** An earlier pass made every section compute the same pixel value (`SHEET_INNER_WIDTH`, 860) so they'd visually line up — but each was still an independently fixed size, so resizing the sheet by hand in Figma did nothing to its children. `finalizeSheetWidth` (spec.ts) now runs once after a sheet's sections are all built: it measures the widest section's natural content (so a component that genuinely needs more room, e.g. Layout & Spacing's `allowScale=false` growth, still gets it), sets that as the sheet's one explicit `FIXED` width, and sets every top-level section to `layoutSizingHorizontal = 'FILL'`. Each section cascades that down its own way:
- **Properties** — 1–2 card groups (the common case: booleans, instance-swaps, most variants) use a plain `HORIZONTAL` auto-layout row with `FILL` cards, which Figma splits evenly and keeps in sync if the row resizes later. 3+ card groups stay on the old `GRID` layout (wraps into rows of 2) since `WRAP` layouts require fixed/hug child sizes and can't use `FILL` — a fixed width there is an accepted trade-off for a case this rare.
- **Layout & Spacing** — the two-column row and each column are `FILL`; the preview panels inside are `FILL` too, though the cloned/centered content within them is still positioned once at generation time (see below).
- **Variables** — the table, header, divider, and each row are `FILL`.
- **Anatomy** — the content row is `FILL`; its preview canvas already stretched via the older `layoutAlign = 'STRETCH'` API.

One caveat: the cloned/scaled preview *content* inside each card or panel (the actual component graphic) is still centered once via absolute x/y math at generation time, computed against the width it started with. That starting width now matches what `FILL` would produce for the same content at generation time, so nothing looks different right after Generate or Resync — but if you manually resize the sheet afterward in Figma, the surrounding frames (cards, panels, columns) will genuinely resize with it, while the specific graphic inside stays at its original centered position/size rather than re-centering live. Making that reactive too would mean rewriting the centering system to rely on native auto-layout alignment instead of manual math — out of scope for this pass.

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
