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
