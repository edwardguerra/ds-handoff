// Tokens module — variables/styles documentation.
// Merged from '/Users/edward/Documents/GitHub/plugin-variables' working tree (May 2026, incl. uncommitted changes).
// Module-scoped (bundled by esbuild), so top-level names don't collide with spec.ts.
// Exports: getTokensInitData, handleTokensConfirm, handleCreateAutoLayout — driven by main.ts,
// which owns the unified UI.

// Constants and variables
const CONFIRM_MSGS = ["Done!", "You got it!", "Aye!", "Is that all?", "My job here is done.", "Gotcha!", "It wasn't hard.", "Got it! What's next?"]
const ACTION_MSGS = ["Updated", "Writed", "Made it with", "Got"]
const IDLE_MSGS = ["Did not found any variables", "Nothing to do, see no variables", "Any variables? Can't see it", "Can't update any variables. Did you set 'em up?"]
const DEFAULT_MODE_NAME = 'Mode 1'
const REWRITE_MSG = 'Rewrite this frame with new variables'

let notification: NotificationHandler
let selection: ReadonlyArray<SceneNode>
let working: boolean
let count: number = 0
let skippedVariableRows: string[] = []
let skippedStyleRows: string[] = []

// Utility functions
function sanitizeName(name: string) {
  if (!name) return name
  return name.replace(/\//g, '.').trim().toLowerCase()
}

function hexToRGB(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b }
}

function naturalSort(a: string, b: string): number {
  // Split strings into parts of text and numbers
  const aParts = a.match(/(\d+|\D+)/g) || []
  const bParts = b.match(/(\d+|\D+)/g) || []

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''

    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)

    // If both parts are numbers, compare numerically
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum
    } else {
      // Otherwise compare as strings
      const cmp = aPart.localeCompare(bPart)
      if (cmp !== 0) return cmp
    }
  }

  return 0
}

// Font and color constants

let FONT_REGULAR: FontName = { family: 'Inter', style: 'Regular' }
let FONT_SEMIBOLD: FontName = { family: 'Inter', style: 'Bold' }
let FONT_ITALIC: FontName = { family: 'Inter', style: 'Italic' }
const LIGHT: Paint = { type: 'SOLID', color: hexToRGB('#fcfcfc') }
const DARK: Paint = { type: 'SOLID', color: hexToRGB('#313131') }
const DARK_20: Paint = { type: 'SOLID', color: hexToRGB('#313131'), opacity: 0.2 }

// Design tokens
const COLOR_BLACK: Paint = { type: 'SOLID', color: hexToRGB('#000000') }
const COLOR_WHITE: Paint = { type: 'SOLID', color: hexToRGB('#ffffff') }
const COLOR_BORDER: Paint = { type: 'SOLID', color: hexToRGB('#cccccc') }
const COLOR_BG_LIGHT: Paint = { type: 'SOLID', color: hexToRGB('#666666') }
const COLOR_TEXT_SECONDARY: Paint = { type: 'SOLID', color: hexToRGB('#999999') }
const COLOR_DARK_MODE_BG: Paint = { type: 'SOLID', color: hexToRGB('#000000') }
const COLOR_DARK_MODE_TEXT: Paint = { type: 'SOLID', color: hexToRGB('#ffffff') }
const COLOR_DARK_MODE_BORDER: Paint = { type: 'SOLID', color: hexToRGB('#cccccc') }

// Common sizes
const PREVIEW_WIDTH: number = 96
const PREVIEW_HEIGHT: number = 75
const SWATCH_SIZE: number = 32
const LEFT_COLUMN_WIDTH: number = 696
const MIN_MODE_COLUMN_WIDTH: number = 450
const ROW_PADDING: number = 16
const BORDER_RADIUS_SM: number = 6
const GAP_BETWEEN_ROWS: number = 48
const GAP_PREVIEW_ITEMS: number = 12
const GAP_SWATCH_ITEMS: number = 8
const GAP_BETWEEN_SECTIONS: number = 0

let lastX: number = 0
let lastY: number = 0

const MARGIN_X: number = 0
const MARGIN_Y: number = 40
const FONT_SIZE: number = 12
const L_FONT_SIZE: number = 36
const CORNER_RADIUS: number = 16
const MAX_COLUMN_WIDTH: number = 1440
let tokenFontsResolved: boolean = false

figma.on("currentpagechange", cancel)

function resolveTokenFonts(): void {
  if (tokenFontsResolved) return
  tokenFontsResolved = true

  function weightOf(styleName: string): number {
    const s = (styleName || '').toLowerCase()
    if (s.indexOf('thin') >= 0 || s.indexOf('hairline') >= 0) return 100
    if (s.indexOf('extra light') >= 0 || s.indexOf('extralight') >= 0 || s.indexOf('ultralight') >= 0) return 200
    if (s.indexOf('light') >= 0) return 300
    if (s.indexOf('regular') >= 0 || s.indexOf('book') >= 0 || s.indexOf('roman') >= 0 || s.indexOf('normal') >= 0) return 400
    if (s.indexOf('medium') >= 0) return 500
    if (s.indexOf('semi bold') >= 0 || s.indexOf('semibold') >= 0 || s.indexOf('demi') >= 0) return 600
    if (s.indexOf('bold') >= 0) return 700
    if (s.indexOf('extra bold') >= 0 || s.indexOf('extrabold') >= 0) return 800
    if (s.indexOf('black') >= 0 || s.indexOf('heavy') >= 0) return 900
    return 400
  }

  const candidates: FontName[] = []
  const seen: { [k: string]: boolean } = {}

  function addFont(fn: any): void {
    if (!fn || typeof fn !== 'object' || !fn.family || !fn.style) return
    const key = fn.family + '|' + fn.style
    if (seen[key]) return
    seen[key] = true
    candidates.push({ family: fn.family, style: fn.style })
  }

  try {
    const localTextStyles = figma.getLocalTextStyles()
    for (let i = 0; i < localTextStyles.length; i++) addFont((localTextStyles[i] as any).fontName)
  } catch (e) {}

  if (!candidates.length) return

  function closest(target: number): FontName | null {
    let best: FontName | null = null
    let bestDiff = Number.POSITIVE_INFINITY
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]
      const diff = Math.abs(weightOf(c.style) - target)
      if (diff < bestDiff) {
        bestDiff = diff
        best = c
      }
    }
    return best
  }

  const regular = closest(400)
  const semi = closest(600) || closest(700)
  const italic = candidates.find(c => (c.style || '').toLowerCase().indexOf('italic') >= 0)
  if (regular) FONT_REGULAR = regular
  if (semi) FONT_SEMIBOLD = semi
  if (italic) FONT_ITALIC = italic
}

async function ensureTokenFontsLoaded(): Promise<void> {
  resolveTokenFonts()

  async function safeLoad(target: FontName, fallback: FontName): Promise<FontName> {
    try {
      await figma.loadFontAsync(target)
      return target
    } catch (e) {
      await figma.loadFontAsync(fallback)
      return fallback
    }
  }

  FONT_REGULAR = await safeLoad(FONT_REGULAR, { family: 'Inter', style: 'Regular' })
  FONT_SEMIBOLD = await safeLoad(FONT_SEMIBOLD, FONT_REGULAR)
  FONT_ITALIC = await safeLoad(FONT_ITALIC, FONT_REGULAR)
}

// Relaunch command: wrap selection in auto layout (headless, routed from main.ts)
export function handleCreateAutoLayout() {
  const selection = figma.currentPage.selection
  if (selection.length === 0) {
    figma.notify('Please select at least one layer')
    return
  }

  let createdCount = 0
  for (const node of selection) {
    const frame = figma.createFrame()
    frame.name = `Auto Layout - ${node.name}`
    frame.layoutMode = 'HORIZONTAL'
    frame.itemSpacing = 16
    frame.paddingLeft = 16
    frame.paddingRight = 16
    frame.paddingTop = 16
    frame.paddingBottom = 16
    frame.layoutSizingHorizontal = 'HUG'
    frame.layoutSizingVertical = 'HUG'
    frame.clipsContent = false

    // Insert frame near the original node
    const parent = node.parent
    if (parent && parent.type !== 'PAGE') {
      parent.insertChild(parent.children.indexOf(node) + 1, frame)
    } else {
      figma.currentPage.appendChild(frame)
    }

    // Copy positioning from node
    frame.x = node.x
    frame.y = node.y + (node.height || 0) + 20

    // Move the node inside the frame
    frame.appendChild(node)
    createdCount++
  }

  figma.notify(`Created ${createdCount} auto layout frame${createdCount !== 1 ? 's' : ''}`)
}

// Module state — populated by getTokensInitData() when the unified UI opens
let collections: VariableCollection[] = []
let activeCollections: VariableCollection[] = []
let activeColorStyleIds: string[] = []
let activeEffectStyleIds: string[] = []
let activeLayoutStyleIds: string[] = []
let activeTextStyleIds: string[] = []
let activeCollectionGroupsById: { [collectionId: string]: string[] } = {}

let mainFrame: FrameNode

// ─── Resync support ────────────────────────────────────────────────
// The "Variables and Styles" doc frame is stamped with pluginData so it can
// be found and regenerated in place without requiring the user to select it
// (unlike the native Figma relaunch-button flow, which does).
var TOKENS_DOC_KEY = 'dsTokensDoc'
var TOKENS_CONFIG_KEY = 'dsTokensConfig'
var TOKENS_DOC_STACK_KEY = 'dsTokensDocStack'
var TOKENS_SYNC_META_KEY = 'dsTokensSyncMeta'

type TokensSyncMeta = {
  version: number
  docHash: string
  variableHash: string
  updatedAt: string
  direction: 'doc-to-variables' | 'variables-to-doc' | 'merge-doc-preferred' | 'no-op'
}

type TokensSyncMode = 'auto' | 'doc-to-variables' | 'variables-to-doc'

function normalizeTokensSyncMode(input: any): TokensSyncMode {
  if (input === 'doc-to-variables' || input === 'variables-to-doc') return input
  return 'auto'
}

function normalizeDescriptionText(value: string | null | undefined): string {
  const text = String(value || '').trim()
  return text.toLowerCase() === 'no description' ? '' : text
}

function hashDescriptionMap(map: { [id: string]: string }): string {
  const ids = Object.keys(map).sort()
  let payload = ''
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    payload += id + '=' + normalizeDescriptionText(map[id]) + '\n'
  }
  return String(payload.length) + ':' + payload
}

function extractVariableDescriptionsFromDocFrame(docFrame: FrameNode): { [id: string]: string } {
  const out: { [id: string]: string } = {}
  try {
    const rows: SceneNode[] = []
    function walk(node: SceneNode): void {
      rows.push(node)
      const kids = (node as any).children as SceneNode[] | undefined
      if (!kids || !kids.length) return
      for (let i = 0; i < kids.length; i++) walk(kids[i])
    }
    walk(docFrame)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any
      if (!row || row.type !== 'FRAME') continue
      const rowName = String(row.name || '')
      if (rowName.indexOf('variable-row-') !== 0) continue
      const variableId = rowName.substring('variable-row-'.length)
      if (!variableId) continue

      let nextDescription: string | null = null
      const rowChildren = (row.children || []) as SceneNode[]
      for (let c = 0; c < rowChildren.length; c++) {
        const cell = rowChildren[c] as any
        if (!cell || cell.type !== 'FRAME') continue
        const cellName = String(cell.name || '')

        if (cellName === 'name-cell') {
          const textChildren = (cell.children || []).filter((n: any) => n && n.type === 'TEXT') as SceneNode[]
          if (textChildren.length > 1) nextDescription = String((textChildren[1] as any).characters || '').trim()
          else if (textChildren.length === 1) nextDescription = String((textChildren[0] as any).characters || '').trim()
          break
        }

        if (cellName === 'desc-cell') {
          const textChildren = (cell.children || []) as SceneNode[]
          for (let t = 0; t < textChildren.length; t++) {
            const txt = textChildren[t] as any
            if (txt && txt.type === 'TEXT') {
              nextDescription = String(txt.characters || '').trim()
              break
            }
          }
          break
        }
      }

      if (nextDescription === null) continue
      out[variableId] = normalizeDescriptionText(nextDescription)
    }
  } catch (e) {
    // best effort
  }
  return out
}

function getVariableDescriptionsByIds(ids: string[]): { [id: string]: string } {
  const out: { [id: string]: string } = {}
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    try {
      const v = figma.variables.getVariableById(id)
      if (!v) continue
      out[id] = normalizeDescriptionText(v.description || '')
    } catch (e) {
      // ignore missing/deleted ids
    }
  }
  return out
}

function readTokensSyncMeta(frame: FrameNode): TokensSyncMeta | null {
  try {
    const raw = frame.getPluginData(TOKENS_SYNC_META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as TokensSyncMeta
  } catch (e) {
    return null
  }
}

function writeTokensSyncMeta(frame: FrameNode, direction: TokensSyncMeta['direction']): void {
  try {
    const docMap = extractVariableDescriptionsFromDocFrame(frame)
    const ids = Object.keys(docMap)
    const variableMap = getVariableDescriptionsByIds(ids)
    const meta: TokensSyncMeta = {
      version: 1,
      docHash: hashDescriptionMap(docMap),
      variableHash: hashDescriptionMap(variableMap),
      updatedAt: new Date().toISOString(),
      direction,
    }
    frame.setPluginData(TOKENS_SYNC_META_KEY, JSON.stringify(meta))
  } catch (e) {
    // non-fatal
  }
}

function findTokensDocFrame(): FrameNode | null {
  try {
    var children = figma.currentPage.children || []
    for (var i = 0; i < children.length; i++) {
      var child = children[i] as any
      if (child.type === 'FRAME' && child.getPluginData(TOKENS_DOC_KEY) === '1') {
        return child as FrameNode
      }
    }
  } catch (e) {
    // ignore — treated as "no doc frame yet"
  }
  return null
}

function findTokensDocStack(): FrameNode | null {
  try {
    var children = figma.currentPage.children || []
    for (var i = 0; i < children.length; i++) {
      var child = children[i] as any
      if (child.type === 'FRAME' && child.getPluginData(TOKENS_DOC_STACK_KEY) === '1') {
        return child as FrameNode
      }
    }
  } catch (e) {
    // ignore — treated as "no stack yet"
  }
  return null
}

function getSelectedTokensDocFrame(): FrameNode | null {
  try {
    var sel = figma.currentPage.selection || []
    for (var i = 0; i < sel.length; i++) {
      var cursor: BaseNode | null = sel[i]
      while (cursor && cursor.type !== 'PAGE') {
        if (cursor.type === 'FRAME' && (cursor as FrameNode).getPluginData(TOKENS_DOC_KEY) === '1') {
          return cursor as FrameNode
        }
        cursor = cursor.parent
      }
    }
  } catch (e) {
    // ignore
  }
  return null
}

function ensureTokensDocStack(): FrameNode {
  var stack = findTokensDocStack()
  if (!stack) {
    stack = figma.createFrame()
    stack.name = 'Specs-Token Docs'
    stack.layoutMode = 'HORIZONTAL'
    stack.itemSpacing = 100
    stack.paddingLeft = 0
    stack.paddingRight = 0
    stack.paddingTop = 0
    stack.paddingBottom = 0
    stack.layoutSizingHorizontal = 'HUG'
    stack.layoutSizingVertical = 'HUG'
    stack.fills = []
    stack.setPluginData(TOKENS_DOC_STACK_KEY, '1')

    var rightmostX = 0
    var yTop = 0
    var pageChildren = figma.currentPage.children || []
    for (var i = 0; i < pageChildren.length; i++) {
      var n = pageChildren[i] as SceneNode
      var nr = n.x + n.width
      if (nr > rightmostX) rightmostX = nr
      if (i === 0 || n.y < yTop) yTop = n.y
    }
    stack.x = rightmostX + 100
    stack.y = yTop
    figma.currentPage.appendChild(stack)
  }

  try {
    var docs = (figma.currentPage.children || []).filter(n => n.type === 'FRAME' && (n as FrameNode).getPluginData(TOKENS_DOC_KEY) === '1') as FrameNode[]
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i]
      if (doc.parent === figma.currentPage) {
        stack.appendChild(doc)
      }
    }
  } catch (e) {
    // ignore migration errors
  }

  return stack
}

function syncVariableDescriptionsFromDocFrame(docFrame: FrameNode): number {
  let updated = 0
  try {
    const docMap = extractVariableDescriptionsFromDocFrame(docFrame)
    const ids = Object.keys(docMap)
    for (let i = 0; i < ids.length; i++) {
      const variableId = ids[i]
      const variable = figma.variables.getVariableById(variableId)
      if (!variable) continue

      const nextDescription = normalizeDescriptionText(docMap[variableId])
      const currentDescription = normalizeDescriptionText(variable.description || '')
      if (currentDescription === nextDescription) continue

      try {
        variable.description = nextDescription
        updated++
      } catch (e) {
        // Ignore individual assignment failures and continue syncing others.
      }
    }
  } catch (e) {
    // Non-fatal: resync can still continue even if description sync fails.
  }
  return updated
}

export function getTokensResyncState(): { available: boolean } {
  return { available: !!getSelectedTokensDocFrame() }
}

// Anchors the whole Tokens doc to whatever mode the current selection is
// actually using, same mechanism as the Component tab's fix: read the
// selected node's resolvedVariableModes and apply each one to the doc's
// root frame. Individual swatches already set their own explicit mode per
// column, but this keeps the doc's own top-level context consistent with
// "the theme you're looking at" rather than an arbitrary default.
function propagateSelectedVariableModes(target: FrameNode): void {
  try {
    var sel = figma.currentPage.selection[0] as any
    if (!sel) return
    var resolved = sel.resolvedVariableModes as { [collectionId: string]: string } | undefined
    if (!resolved) return
    var ids = Object.keys(resolved)
    for (var i = 0; i < ids.length; i++) {
      try {
        target.setExplicitVariableModeForCollection(ids[i] as any, resolved[ids[i]])
      } catch (e) {
        // collection may no longer exist — skip it
      }
    }
  } catch (e) {
    // resolvedVariableModes unsupported on this node type — nothing to propagate
  }
}

let variablesFrame: FrameNode
let stylesFrame: FrameNode

function getVariableGroupPath(variableName: string): string {
  if (!variableName) return ''
  const parts = variableName
    .split('/')
    .map(p => p.trim())
    .filter(Boolean)
  if (parts.length <= 1) return ''
  return parts.slice(0, parts.length - 1).join('/')
}

function buildCollectionGroupSummaries(variables: Variable[]): Array<{ id: string; name: string; count: number; depth: number; parentId: string }> {
  const countsByPath: { [path: string]: number } = {}
  for (const v of variables) {
    const path = getVariableGroupPath(v.name)
    if (!path) continue
    const parts = path.split('/').filter(Boolean)
    for (let depth = 1; depth <= parts.length; depth++) {
      const prefix = parts.slice(0, depth).join('/')
      countsByPath[prefix] = (countsByPath[prefix] || 0) + 1
    }
  }

  const paths = Object.keys(countsByPath)
  paths.sort((a, b) => {
    const ad = a.split('/').length
    const bd = b.split('/').length
    if (ad !== bd) return ad - bd
    return naturalSort(a, b)
  })

  return paths.map(path => {
    const parts = path.split('/').filter(Boolean)
    return {
      id: path,
      name: parts[parts.length - 1] || path,
      count: countsByPath[path],
      depth: parts.length,
      parentId: parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : ''
    }
  })
}

function createMainFrame(attachToStack: boolean = true) {
  // Create a wrapper frame for all content (HORIZONTAL layout)
  mainFrame = createAutolayout('Specs-Variables and Styles', 'HORIZONTAL', 100, 0, 0)
  mainFrame.fills = []
  mainFrame.layoutSizingHorizontal = 'HUG'
  mainFrame.layoutSizingVertical = 'HUG'

  // Create Local Variables section (stack grouped tables vertically)
  variablesFrame = createAutolayout('Specs-Local Variables', 'VERTICAL', 24, 24, 24)
  variablesFrame.fills = []
  variablesFrame.layoutSizingHorizontal = 'HUG'
  variablesFrame.layoutSizingVertical = 'HUG'
  mainFrame.appendChild(variablesFrame)

  // Create Local Styles section (stack grouped tables vertically)
  stylesFrame = createAutolayout('Specs-Local Styles', 'VERTICAL', 24, 24, 24)
  stylesFrame.fills = []
  stylesFrame.layoutSizingHorizontal = 'HUG'
  stylesFrame.layoutSizingVertical = 'HUG'
  mainFrame.appendChild(stylesFrame)

  mainFrame.cornerRadius = CORNER_RADIUS
  mainFrame.setRelaunchData({ rewrite: REWRITE_MSG })

  if (attachToStack) {
    // Keep every generated token doc in a single 100px-spaced stack.
    const stack = ensureTokensDocStack()
    stack.appendChild(mainFrame)
  }
}

// Collect everything the Tokens tab needs to render its pickers.
// Called by main.ts when the unified UI opens (or is refreshed).
export function getTokensInitData(): any {
  working = false
  selection = figma.currentPage.selection
  collections = figma.variables.getLocalVariableCollections() || []
  activeCollections = collections

  const sel = selection.map(s => ({ id: s.id, name: s.name, type: s.type }))
  // Keep collection order exactly as returned by Figma so the picker mirrors
  // the Variables panel ordering.
  const cols = collections.map(c => {
    const vars = c.variableIds
      .map(id => figma.variables.getVariableById(id))
      .filter(Boolean) as Variable[]
    const groups = buildCollectionGroupSummaries(vars)

    return {
      id: c.id,
      name: c.name,
      modeCount: c.modes.length,
      variableCount: vars.length,
      groups: groups
    }
  })
  const paintStyles = figma.getLocalPaintStyles().map(s => ({ id: s.id, name: s.name }))
  const effectStyles = figma.getLocalEffectStyles().map(s => ({ id: s.id, name: s.name }))
  const textStyles = figma.getLocalTextStyles().map(s => {
    const asAny = s as any
    // try to extract a solid color hex if present
    let colorHex: string | null = null
    let colorAliasId: string | null = null
    try {
      const fills = asAny.fills
      if (Array.isArray(fills) && fills.length) {
        const first = fills[0]
        if (first && first.type === 'SOLID' && first.color) {
          colorHex = figmaRGBToHex(first.color)
        } else if (first && first.type === 'VARIABLE_ALIAS' && first.id) {
          colorAliasId = first.id
        }
      }
    } catch (e) {
      // ignore
    }

    // normalize font info
    let fontFamily: string | null = null
    let fontStyle: string | null = null
    let fontWeight: string | number | null = null
    try {
      if (asAny.fontName) {
        if (typeof asAny.fontName === 'string') {
          fontFamily = asAny.fontName
        } else {
          fontFamily = asAny.fontName.family || null
          fontStyle = asAny.fontName.style || null
          // attempt to infer weight from style when possible
          if (fontStyle && /\b(\d{3})\b/.test(fontStyle)) {
            const m = fontStyle.match(/(\d{3})/)
            fontWeight = m ? parseInt(m[0], 10) : fontStyle
          } else {
            fontWeight = fontStyle
          }
        }
      }
    } catch (e) {}

    return {
      id: s.id,
      name: s.name,
      fontFamily,
      fontStyle,
      fontWeight,
      fontSize: asAny.fontSize,
      lineHeight: asAny.lineHeight,
      letterSpacing: asAny.letterSpacing,
      paragraphSpacing: asAny.paragraphSpacing,
      textDecoration: asAny.textDecoration,
      textCase: asAny.textCase,
      colorHex,
      colorAliasId
    }
  })
  const layoutStyles = figma.getLocalGridStyles().map(s => ({ id: s.id, name: s.name }))

  let selectedConfig: any = null
  try {
    const selectedDoc = getSelectedTokensDocFrame()
    if (selectedDoc) {
      const raw = selectedDoc.getPluginData(TOKENS_CONFIG_KEY) || 'null'
      selectedConfig = JSON.parse(raw)
    }
  } catch (e) {
    selectedConfig = null
  }

  return {
    type: 'tokens-init', selection: sel, collections: cols, colorStyles: paintStyles,
    effectStyles: effectStyles, textStyles: textStyles, layoutStyles: layoutStyles,
    resyncAvailable: !!getSelectedTokensDocFrame(),
    selectedConfig: selectedConfig
  }
}

// Shared by Confirm and Resync: (re)build the doc frame with a given
// selection of collection/style ids, reusing an existing frame in place
// when one is passed so canvas position and downstream links don't move.
async function regenerateTokensDoc(
  targetFrame: FrameNode | null,
  selectedCollectionIds: string[],
  selectedCollectionGroupsById: { [collectionId: string]: string[] },
  colorIds: string[],
  effectIds: string[],
  textIds: string[],
  layoutIds: string[],
  syncDirection: TokensSyncMeta['direction'] = 'variables-to-doc',
  syncMode: TokensSyncMode = 'auto'
): Promise<void> {
  working = true
  count = 0
  skippedVariableRows = []
  skippedStyleRows = []
  selection = figma.currentPage.selection
  figma.ui.postMessage({ type: 'tokens-status', text: 'Preparing generation...' })

  activeCollections = collections.filter(c => selectedCollectionIds.indexOf(c.id) !== -1)
  activeCollectionGroupsById = selectedCollectionGroupsById || {}
  activeColorStyleIds = colorIds
  activeEffectStyleIds = effectIds
  activeTextStyleIds = textIds
  activeLayoutStyleIds = layoutIds

  // Transactional render: always build in a staged frame first.
  // Only replace target content (or append a new doc) after successful render.
  createMainFrame(false)
  const stagedFrame = mainFrame
  propagateSelectedVariableModes(stagedFrame)

  figma.ui.postMessage({ type: 'tokens-status', text: 'Writing variables...' })
  await writeVariables(progress => figma.ui.postMessage({ type: 'tokens-progress', text: progress }))

  figma.ui.postMessage({ type: 'tokens-status', text: 'Writing styles...' })
  await writeStyles(progress => figma.ui.postMessage({ type: 'tokens-progress', text: progress }))

  // Keep output clean: hide empty columns instead of leaving blank wrappers.
  try {
    if (stylesFrame && stylesFrame.children.length === 0 && stylesFrame.parent) {
      stylesFrame.remove()
    }
  } catch (e) {}
  try {
    if (variablesFrame && variablesFrame.children.length === 0 && variablesFrame.parent) {
      variablesFrame.remove()
    }
  } catch (e) {}

  const configPayload = JSON.stringify({
    collections: selectedCollectionIds, colorStyles: colorIds,
    effectStyles: effectIds, textStyles: textIds, layoutStyles: layoutIds,
    collectionGroups: selectedCollectionGroupsById || {},
    syncMode: syncMode
  })
  prependTokenTimestampInVariablesColumn(stagedFrame)
  stagedFrame.setPluginData(TOKENS_DOC_KEY, '1')
  stagedFrame.setPluginData(TOKENS_CONFIG_KEY, configPayload)

  if (targetFrame) {
    // Swap only after successful render so existing docs are preserved on error.
    while (targetFrame.children.length) targetFrame.children[0].remove()
    while (stagedFrame.children.length) targetFrame.appendChild(stagedFrame.children[0])
    targetFrame.name = stagedFrame.name
    targetFrame.cornerRadius = stagedFrame.cornerRadius
    targetFrame.setRelaunchData({ rewrite: REWRITE_MSG })
    targetFrame.setPluginData(TOKENS_DOC_KEY, stagedFrame.getPluginData(TOKENS_DOC_KEY))
    targetFrame.setPluginData(TOKENS_CONFIG_KEY, stagedFrame.getPluginData(TOKENS_CONFIG_KEY))
    writeTokensSyncMeta(targetFrame, syncDirection)
    mainFrame = targetFrame
    try { stagedFrame.remove() } catch (e) {}
  } else {
    const stack = ensureTokensDocStack()
    const groupedFrames = [
      ...buildGroupFramesFromSectionContainer(variablesFrame, configPayload),
      ...buildGroupFramesFromSectionContainer(stylesFrame, configPayload)
    ]
    if (groupedFrames.length > 0) {
      for (let i = 0; i < groupedFrames.length; i++) {
        writeTokensSyncMeta(groupedFrames[i], syncDirection)
        stack.appendChild(groupedFrames[i])
      }
      mainFrame = groupedFrames[groupedFrames.length - 1]
      try { stagedFrame.remove() } catch (e) {}
    } else {
      writeTokensSyncMeta(stagedFrame, syncDirection)
      stack.appendChild(stagedFrame)
      mainFrame = stagedFrame
    }
  }

  finish()
}

// Generation flow, triggered by the Tokens tab's Confirm button (via main.ts).
// Unlike the old standalone plugin, this keeps the plugin open when done.
export function handleTokensConfirm(msg: any): void {
  (async () => {
    try {
      collections = figma.variables.getLocalVariableCollections() || []
      selection = figma.currentPage.selection

      var selectedIds: string[] = Array.isArray(msg.collections) ? msg.collections : collections.map(c => c.id)
      var syncMode: TokensSyncMode = normalizeTokensSyncMode(msg && msg.syncMode)
      var selectedCollectionGroupsById: { [collectionId: string]: string[] } =
        (msg.collectionGroups && typeof msg.collectionGroups === 'object') ? msg.collectionGroups : {}
      await regenerateTokensDoc(
        null, selectedIds, selectedCollectionGroupsById,
        Array.isArray(msg.colorStyles) ? msg.colorStyles : [],
        Array.isArray(msg.effectStyles) ? msg.effectStyles : [],
        Array.isArray(msg.textStyles) ? msg.textStyles : [],
        Array.isArray(msg.layoutStyles) ? msg.layoutStyles : [],
        'variables-to-doc',
        syncMode
      )
    } catch (err) {
      working = false
      const message = (err && (err as Error).message) ? (err as Error).message : String(err)
      figma.ui.postMessage({ type: 'tokens-status', text: 'Error: ' + message })
      notify('Error: ' + message)
    }
  })()
}

// Resync flow: regenerate the existing doc frame using its last-used
// selection, with no picker round-trip. Picks up newly added/removed
// variables and styles within the previously chosen collections/groups.
export function handleTokensResync(msg?: any): void {
  (async () => {
    try {
      var target = getSelectedTokensDocFrame()
      if (!target) {
        figma.ui.postMessage({ type: 'tokens-status', text: 'Select a previous token documentation frame to resync it.' })
        return
      }

      var stored: any = null
      try {
        stored = JSON.parse(target.getPluginData(TOKENS_CONFIG_KEY) || 'null')
      } catch (e) {
        stored = null
      }
      if (!stored) {
        figma.ui.postMessage({ type: 'tokens-status', text: 'No saved selection to resync — use Confirm instead.' })
        return
      }

      const requestedMode: TokensSyncMode = normalizeTokensSyncMode((msg && msg.syncMode) || stored.syncMode)

      const meta = readTokensSyncMeta(target)
      const lastSyncLabel = meta && meta.updatedAt ? (' Last sync: ' + meta.updatedAt + '.') : ''
      const docMapBefore = extractVariableDescriptionsFromDocFrame(target)
      const variableIds = Object.keys(docMapBefore)
      const variableMapBefore = getVariableDescriptionsByIds(variableIds)
      const docChanged = !meta || hashDescriptionMap(docMapBefore) !== meta.docHash
      const variableChanged = !meta || hashDescriptionMap(variableMapBefore) !== meta.variableHash

      let syncDirection: TokensSyncMeta['direction'] = 'no-op'
      let syncedCount = 0
      if (requestedMode === 'doc-to-variables') {
        syncDirection = 'doc-to-variables'
        syncedCount = syncVariableDescriptionsFromDocFrame(target)
      } else if (requestedMode === 'variables-to-doc') {
        syncDirection = 'variables-to-doc'
      } else {
        if (docChanged && !variableChanged) {
          syncDirection = 'doc-to-variables'
          syncedCount = syncVariableDescriptionsFromDocFrame(target)
        } else if (!docChanged && variableChanged) {
          syncDirection = 'variables-to-doc'
        } else if (docChanged && variableChanged) {
          syncDirection = 'merge-doc-preferred'
          syncedCount = syncVariableDescriptionsFromDocFrame(target)
        }
      }

      if (requestedMode === 'doc-to-variables') {
        figma.ui.postMessage({
          type: 'tokens-status',
          text: 'Forced sync mode: doc -> variables (' + syncedCount + ' description' + (syncedCount === 1 ? '' : 's') + ' updated).' + lastSyncLabel
        })
      } else if (requestedMode === 'variables-to-doc') {
        figma.ui.postMessage({
          type: 'tokens-status',
          text: 'Forced sync mode: variables -> doc (regenerating from Variables panel).' + lastSyncLabel
        })
      } else if (syncDirection === 'doc-to-variables') {
        figma.ui.postMessage({
          type: 'tokens-status',
          text: 'Sync direction: doc -> variables (' + syncedCount + ' description' + (syncedCount === 1 ? '' : 's') + ' updated).' + lastSyncLabel
        })
      } else if (syncDirection === 'variables-to-doc') {
        figma.ui.postMessage({ type: 'tokens-status', text: 'Sync direction: variables -> doc (source variables changed since last sync).' + lastSyncLabel })
      } else if (syncDirection === 'merge-doc-preferred') {
        figma.ui.postMessage({
          type: 'tokens-status',
          text: 'Both sides changed since last sync; applying doc descriptions first (' + syncedCount + ' update' + (syncedCount === 1 ? '' : 's') + '), then regenerating.' + lastSyncLabel
        })
      } else {
        figma.ui.postMessage({ type: 'tokens-status', text: 'No detected description changes since last sync; regenerating doc.' + lastSyncLabel })
      }

      collections = figma.variables.getLocalVariableCollections() || []
      await regenerateTokensDoc(
        target,
        stored.collections || [],
        stored.collectionGroups || {},
        stored.colorStyles || [],
        stored.effectStyles || [],
        stored.textStyles || [],
        stored.layoutStyles || [],
        syncDirection,
        requestedMode
      )
    } catch (err) {
      working = false
      const message = (err && (err as Error).message) ? (err as Error).message : String(err)
      figma.ui.postMessage({ type: 'tokens-status', text: 'Error: ' + message })
      notify('Error: ' + message)
    }
  })()
}

const TOKEN_TARGET_WIDTH = 1280
const TOKEN_FRAME_PADDING_X = 24
const PREVIEW_COLUMN_WIDTH = 320
const NAME_COLUMN_WIDTH = 355
const VALUE_COLUMN_WIDTH = TOKEN_TARGET_WIDTH - (TOKEN_FRAME_PADDING_X * 2) - PREVIEW_COLUMN_WIDTH - NAME_COLUMN_WIDTH
const TOKEN_TABLE_WIDTH = PREVIEW_COLUMN_WIDTH + NAME_COLUMN_WIDTH + VALUE_COLUMN_WIDTH
const TOKEN_ROW_HEIGHT = 88
const TOKEN_HEADER_HEIGHT = 48
const TOKEN_NAME_FONT_SIZE = 20
const TOKENS_TIMESTAMP_FRAME_NAME = 'tokens-timestamp'

function setFillWidth(node: SceneNode): void {
  try { (node as any).layoutSizingHorizontal = 'FILL' } catch (e) {}
}

function createTokenTableSection(title: string): FrameNode {
  const section = createAutolayout(title, 'VERTICAL', 0, 0, 0, 'HUG', 'HUG')
  section.fills = [LIGHT]
  return section
}

function createTokenGroupTitle(title: string): FrameNode {
  const wrap = createAutolayout('group-title-' + title, 'VERTICAL', 0, 0, 0, 'HUG', 'HUG')
  const txt = makeText(title, FONT_SEMIBOLD, 56)
  txt.fills = [DARK]
  addToColumn(wrap, txt)
  return wrap
}

function createTokenSubgroupTitle(title: string): FrameNode {
  const wrap = createAutolayout('subgroup-title-' + title, 'VERTICAL', 0, 0, 0, 'HUG', 'HUG')
  const txt = makeText(title, FONT_SEMIBOLD, 28)
  txt.fills = [DARK]
  addToColumn(wrap, txt)
  return wrap
}

function getTokenTimestampText(): string {
  const d = new Date()
  let timezone = ''
  try {
    const dtf = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    const parts = dtf.formatToParts(d)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].type === 'timeZoneName') {
        timezone = parts[i].value
        break
      }
    }
  } catch (e) {}

  const dateStr = d.toLocaleDateString()
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return timezone
    ? 'Last updated: ' + dateStr + ' at ' + timeStr + ' (' + timezone + ')'
    : 'Last updated: ' + dateStr + ' at ' + timeStr
}

function createTokenTimestampFrame(): FrameNode {
  const section = createAutolayout(TOKENS_TIMESTAMP_FRAME_NAME, 'VERTICAL', 2, 0, 0, 'HUG', 'HUG')
  const stamp = makeText(getTokenTimestampText(), FONT_REGULAR, 11)
  stamp.fills = [COLOR_TEXT_SECONDARY]
  addToColumn(section, stamp)
  try {
    const currentUserName = figma.currentUser && figma.currentUser.name ? figma.currentUser.name.trim() : ''
    if (currentUserName) {
      const by = makeText('By: ' + currentUserName, FONT_REGULAR, 11)
      by.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(section, by)
    }
  } catch (e) {}
  return section
}

function prependTokenTimestamp(target: FrameNode): void {
  try {
    const children = target.children || []
    for (let i = children.length - 1; i >= 0; i--) {
      if ((children[i] as any).name === TOKENS_TIMESTAMP_FRAME_NAME) children[i].remove()
    }
  } catch (e) {}
  try {
    target.insertChild(0, createTokenTimestampFrame())
  } catch (e) {
    target.appendChild(createTokenTimestampFrame())
  }
}

function prependTokenTimestampInVariablesColumn(root: FrameNode): void {
  let inserted = false
  try {
    const kids = root.children || []
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i] as any
      if (!child || child.type !== 'FRAME') continue
      const childName = String(child.name || '')
      if (childName === 'Specs-Local Variables' || childName === 'Specs-Local Styles') {
        prependTokenTimestamp(child as FrameNode)
        inserted = true
      }
    }
  } catch (e) {}
  if (!inserted) prependTokenTimestamp(root)
}

function getTokenGroupPath(name: string): string {
  if (!name) return 'Ungrouped'
  const parts = name.split('/').map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return 'Ungrouped'
  return parts.slice(0, parts.length - 1).join('/')
}

function groupByTokenPath<T>(items: T[], getName: (item: T) => string): Array<{ path: string; items: T[] }> {
  const byPath: { [path: string]: T[] } = {}
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const path = getTokenGroupPath(getName(item))
    if (!byPath[path]) byPath[path] = []
    byPath[path].push(item)
  }
  const paths = Object.keys(byPath).sort((a, b) => {
    if (a === 'Ungrouped') return 1
    if (b === 'Ungrouped') return -1
    return naturalSort(a, b)
  })
  return paths.map(path => ({ path, items: byPath[path] }))
}

function normalizeGroupPathForCollection(path: string, collectionName: string): string {
  if (!path || path === 'Ungrouped') return 'Ungrouped'
  const cRaw = (collectionName || '').trim()
  const pRaw = path.trim()
  if (!cRaw) return pRaw

  function splitParts(input: string): string[] {
    return input
      .split(/[/\.]/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  }

  const cParts = splitParts(cRaw)
  const pParts = splitParts(pRaw)
  if (!pParts.length) return 'Ungrouped'

  let start = 0
  while (start < cParts.length && start < pParts.length && cParts[start] === pParts[start]) {
    start++
  }

  if (start >= pParts.length) return 'Ungrouped'
  const remainder = pParts.slice(start)
  return remainder.length ? remainder.join('/') : 'Ungrouped'
}

function getLeafGroupLabel(path: string): string {
  if (!path || path === 'Ungrouped') return 'Ungrouped'
  const slashParts = path.split('/').map(p => p.trim()).filter(Boolean)
  if (slashParts.length > 0) return slashParts[slashParts.length - 1]
  return path
}

function getParentAndLeafGroupLabel(path: string): string {
  if (!path || path === 'Ungrouped') return 'Ungrouped'
  const parts = path.split('/').map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return parts[0] || 'Ungrouped'
  return parts[parts.length - 2] + ' / ' + parts[parts.length - 1]
}

function getLeafTokenName(name: string): string {
  if (!name) return ''
  const slashParts = name.split('/').map(p => p.trim()).filter(Boolean)
  let leaf = slashParts.length ? slashParts[slashParts.length - 1] : name
  const dotParts = leaf.split('.').map(p => p.trim()).filter(Boolean)
  if (dotParts.length > 1) leaf = dotParts[dotParts.length - 1]
  return leaf
}

function buildGroupFramesFromSectionContainer(container: FrameNode, configPayload: string): FrameNode[] {
  const result: FrameNode[] = []
  let currentMajorTitle = ''
  let currentSubgroupTitle = ''
  const children = container.children.slice()

  for (let i = 0; i < children.length; i++) {
    const child = children[i] as SceneNode
    const childName = ((child as any).name || '') as string

    if (childName.indexOf('group-title-') === 0) {
      currentMajorTitle = childName.substring('group-title-'.length) || 'Tokens'
      currentSubgroupTitle = ''
      continue
    }
    if (childName.indexOf('subgroup-title-') === 0) {
      currentSubgroupTitle = childName.substring('subgroup-title-'.length) || 'Ungrouped'
      continue
    }

    if ((child as any).type === 'FRAME') {
      const out = createAutolayout('Specs-' + currentMajorTitle + '-' + currentSubgroupTitle, 'VERTICAL', 12, 24, 24)
      out.fills = []
      out.layoutSizingHorizontal = 'HUG'
      out.layoutSizingVertical = 'HUG'
      out.cornerRadius = CORNER_RADIUS

      prependTokenTimestamp(out)
      out.appendChild(createTokenGroupTitle(currentMajorTitle || 'Tokens'))
      out.appendChild(createTokenSubgroupTitle(currentSubgroupTitle || 'Ungrouped'))
      out.appendChild(child as FrameNode)

      out.setRelaunchData({ rewrite: REWRITE_MSG })
      out.setPluginData(TOKENS_DOC_KEY, '1')
      out.setPluginData(TOKENS_CONFIG_KEY, configPayload)
      result.push(out)
      currentSubgroupTitle = ''
    }
  }

  return result
}

function setFixedCellWidth(cell: FrameNode, width: number): void {
  cell.layoutSizingHorizontal = 'FIXED'
  cell.resizeWithoutConstraints(width, cell.height)
}

function createTokenHeaderRow(title: string): FrameNode {
  const row = createAutolayout(title + '-header', 'HORIZONTAL', 0, 0, 0, 'HUG', 'FIXED')
  row.resizeWithoutConstraints(TOKEN_TABLE_WIDTH, TOKEN_HEADER_HEIGHT)
  row.counterAxisAlignItems = 'CENTER'
  row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
  row.strokeWeight = 1
  row.strokeBottomWeight = 1
  row.strokeTopWeight = 0
  row.strokeLeftWeight = 0
  row.strokeRightWeight = 0

  function makeHeaderCell(label: string, width: number): FrameNode {
    const cell = createAutolayout('header-' + label, 'VERTICAL', 0, ROW_PADDING, 0, 'FIXED', 'FILL')
    row.appendChild(cell)
    setFixedCellWidth(cell, width)
    const txt = makeText(label, FONT_SEMIBOLD, FONT_SIZE)
    addToColumn(cell, txt)
    return cell
  }

  makeHeaderCell('Preview', PREVIEW_COLUMN_WIDTH)
  makeHeaderCell('Name', NAME_COLUMN_WIDTH)
  makeHeaderCell('Value', VALUE_COLUMN_WIDTH)

  return row
}

function createTokenPreviewCell(content?: SceneNode | null): FrameNode {
  const cell = createAutolayout('preview-cell', 'VERTICAL', 0, 0, 0, 'FIXED', 'FILL')
  setFixedCellWidth(cell, PREVIEW_COLUMN_WIDTH)
  cell.counterAxisAlignItems = 'CENTER'
  cell.primaryAxisAlignItems = 'CENTER'

  if (content) {
    try {
      cell.appendChild(content)
      if ((content as any).layoutAlign !== undefined) {
        (content as any).layoutAlign = 'STRETCH'
      }
      if ((content as any).resizeWithoutConstraints && (content as any).type !== 'TEXT') {
        const contentName = String((content as any).name || '')
        if (contentName === 'text-style-preview-wrap') {
          ;(content as any).resizeWithoutConstraints(PREVIEW_COLUMN_WIDTH, (content as any).height)
        } else {
          ;(content as any).resizeWithoutConstraints(PREVIEW_COLUMN_WIDTH, TOKEN_ROW_HEIGHT)
        }
      }
    } catch (e) {}
  }
  return cell
}

function createTokenTextCell(name: string, value: string, desc: string): { nameCell: FrameNode; valueCell: FrameNode } {
  function textCell(cellName: string, text: string, width: number, muted?: boolean, size?: number, weight?: FontName): FrameNode {
    const contentWidth = Math.max(80, width - (ROW_PADDING * 2))
    const cell = createAutolayout(cellName, 'VERTICAL', 4, ROW_PADDING, 0, 'FIXED', 'FILL')
    setFixedCellWidth(cell, width)
    cell.primaryAxisAlignItems = 'CENTER'
    const txt = makeText(text || '—', weight || FONT_REGULAR, size || FONT_SIZE)
    try { txt.resizeWithoutConstraints(contentWidth, txt.height) } catch (e) {}
    if (muted) txt.fills = [COLOR_TEXT_SECONDARY]
    addToColumn(cell, txt)
    return cell
  }
  const nameContentWidth = Math.max(80, NAME_COLUMN_WIDTH - (ROW_PADDING * 2))
  const n = createAutolayout('name-cell', 'VERTICAL', 6, ROW_PADDING, 0, 'FIXED', 'FILL')
  setFixedCellWidth(n, NAME_COLUMN_WIDTH)
  n.primaryAxisAlignItems = 'CENTER'
  const nameTitle = makeText(name || '—', FONT_SEMIBOLD, TOKEN_NAME_FONT_SIZE)
  try { nameTitle.resizeWithoutConstraints(nameContentWidth, nameTitle.height) } catch (e) {}
  const nameDesc = makeText(desc || 'no description', FONT_REGULAR, FONT_SIZE)
  try { nameDesc.resizeWithoutConstraints(nameContentWidth, nameDesc.height) } catch (e) {}
  nameDesc.fills = [COLOR_TEXT_SECONDARY]
  addToColumn(n, nameTitle)
  addToColumn(n, nameDesc)

  const valueText = (value || '—').trim()
  const valuePaddingY = valueText.indexOf('\n') >= 0 ? 16 : 0
  const v = createAutolayout('value-cell', 'VERTICAL', 4, ROW_PADDING, valuePaddingY, 'FIXED', 'FILL')
  setFixedCellWidth(v, VALUE_COLUMN_WIDTH)
  v.primaryAxisAlignItems = 'CENTER'
  const valueContentWidth = Math.max(80, VALUE_COLUMN_WIDTH - (ROW_PADDING * 2))

  function renderValueLineWithBadge(line: string): SceneNode {
    const varMatch = line.match(/^(.*?)(var\(--[^)]+\))(\s*\(.*\))?$/)
    if (!varMatch || !varMatch[2]) {
      const plain = makeText(line, FONT_REGULAR, FONT_SIZE)
      plain.fills = [DARK]
      try { plain.resizeWithoutConstraints(valueContentWidth, plain.height) } catch (e) {}
      return plain
    }

    const label = (varMatch[1] || '').trim()
    const tokenRef = (varMatch[2] || '').trim()
    const fallback = (varMatch[3] || '').trim()

    const lineWrap = createAutolayout('value-line-token', 'HORIZONTAL', 2, 0, 0, 'FIXED', 'HUG')
    lineWrap.resizeWithoutConstraints(valueContentWidth, 1)
    lineWrap.counterAxisAlignItems = 'CENTER'

    if (label) {
      const labelText = makeText(label + ':', FONT_REGULAR, FONT_SIZE)
      labelText.fills = [DARK]
      lineWrap.appendChild(labelText)
    }

    const badge = createAutolayout('token-var-badge', 'HORIZONTAL', 0, 6, 3, 'HUG', 'HUG')
    badge.cornerRadius = 3
    badge.strokes = [COLOR_BORDER]
    badge.strokeWeight = 1
    badge.fills = [COLOR_WHITE]
    const badgeText = makeText(tokenRef, FONT_REGULAR, FONT_SIZE)
    badgeText.fills = [DARK]
    badge.appendChild(badgeText)
    lineWrap.appendChild(badge)

    if (fallback) {
      const fallbackText = makeText(fallback, FONT_REGULAR, FONT_SIZE)
      fallbackText.fills = [COLOR_TEXT_SECONDARY]
      lineWrap.appendChild(fallbackText)
    }

    return lineWrap
  }

  const lines = valueText.split(/\r?\n/)
  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li]
    const line = (rawLine || '').trim()
    if (!line) continue

    addToColumn(v, renderValueLineWithBadge(line))
  }
  if (v.children.length === 0) addToColumn(v, makeText('—', FONT_REGULAR, FONT_SIZE))

  return { nameCell: n, valueCell: v }
}

function appendTokenRow(section: FrameNode, rowName: string, preview: SceneNode | null, tokenName: string, value: string, description: string, isLast: boolean): void {
  const row = createAutolayout(rowName, 'HORIZONTAL', 0, 0, 0, 'FIXED', 'HUG')
  row.resizeWithoutConstraints(TOKEN_TABLE_WIDTH, TOKEN_ROW_HEIGHT)
  ;(row as any).minHeight = TOKEN_ROW_HEIGHT
  row.counterAxisAlignItems = 'CENTER'
  if (!isLast) {
    row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    row.strokeWeight = 1
    row.strokeBottomWeight = 1
    row.strokeTopWeight = 0
    row.strokeLeftWeight = 0
    row.strokeRightWeight = 0
  }
  section.appendChild(row)

  const previewCell = createTokenPreviewCell(preview)
  const textCells = createTokenTextCell(tokenName, value, description)
  row.appendChild(previewCell)
  row.appendChild(textCells.nameCell)
  row.appendChild(textCells.valueCell)
  previewCell.layoutAlign = 'STRETCH'
  textCells.nameCell.layoutAlign = 'STRETCH'
  textCells.valueCell.layoutAlign = 'STRETCH'
}

function getCollectionPrimaryMode(c: VariableCollection): { modeId: string; name: string } {
  if (!c.modes || c.modes.length === 0) return { modeId: '', name: DEFAULT_MODE_NAME }
  var preferred = c.modes.find(m => m.name === DEFAULT_MODE_NAME)
  return preferred || c.modes[0]
}

function formatVariableValue(raw: any): string {
  if (raw === null || raw === undefined) return '—'
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS' && raw.id) {
    const aliased = figma.variables.getVariableById(raw.id)
    return aliased ? sanitizeName(aliased.name) : String(raw.id)
  }
  if (typeof raw === 'object' && raw.r !== undefined && raw.g !== undefined && raw.b !== undefined) {
    try { return figmaRGBToHex(raw as any) } catch (e) { return 'color' }
  }
  if (typeof raw === 'object' && raw.paints) return 'paint'
  if (typeof raw === 'object' && raw.effects) return 'effects'
  try { return JSON.stringify(raw) } catch (e) { return String(raw) }
}

function formatResolvedValue(raw: any): string {
  if (raw === null || raw === undefined) return '—'
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw.r !== undefined && raw.g !== undefined && raw.b !== undefined) {
    try { return figmaRGBToHex(raw as any) } catch (e) { return 'color' }
  }
  if (typeof raw === 'object' && raw.paints) return 'paint'
  if (typeof raw === 'object' && raw.effects) return 'effects'
  try { return JSON.stringify(raw) } catch (e) { return String(raw) }
}

function makeVariableReference(name: string): string {
  let ref = (name || '').replace(/\//g, '.').trim().toLowerCase()
  if (ref && ref.indexOf('--') !== 0) ref = '--' + ref
  return ref ? 'var(' + ref + ')' : '—'
}

function formatVariableCellValue(v: Variable, modeId: string): string {
  const raw = (v.valuesByMode || ({} as any))[modeId]
  const resolved = resolveAliasValueForMode(raw, modeId)
  const fallback = formatResolvedValue(resolved)

  if (raw && typeof raw === 'object' && raw.type === 'VARIABLE_ALIAS' && raw.id) {
    const aliasVar = figma.variables.getVariableById(raw.id)
    const aliasRef = aliasVar ? makeVariableReference(aliasVar.name) : String(raw.id)
    return fallback && fallback !== '—' ? (aliasRef + ' (' + fallback + ')') : aliasRef
  }

  const selfRef = makeVariableReference(v.name)
  return fallback && fallback !== '—' ? (selfRef + ' (' + fallback + ')') : selfRef
}

function resolveAliasValueForMode(raw: any, modeId: string): any {
  function resolveInner(value: any, depth: number, visited: { [id: string]: boolean }): any {
    if (depth > 12) return value
    if (!(value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS' && value.id)) return value
    const aliasId = String(value.id)
    if (visited[aliasId]) return value
    visited[aliasId] = true

    try {
      const aliased = figma.variables.getVariableById(aliasId)
      if (!aliased) return value
      let next: any = null
      if (modeId && aliased.valuesByMode && Object.prototype.hasOwnProperty.call(aliased.valuesByMode, modeId)) {
        next = (aliased.valuesByMode as any)[modeId]
      } else {
        const keys = Object.keys(aliased.valuesByMode || {})
        if (keys.length) next = (aliased.valuesByMode as any)[keys[0]]
      }
      if (next === null || next === undefined) return value
      return resolveInner(next, depth + 1, visited)
    } catch (e) {
      return value
    }
  }

  return resolveInner(raw, 0, {})
}

function resolveNumericValue(raw: any, modeId: string): number {
  const resolved = resolveAliasValueForMode(raw, modeId)
  if (typeof resolved === 'number' && isFinite(resolved)) return resolved
  const parsed = parseFloat(String(resolved ?? ''))
  return isFinite(parsed) ? parsed : 0
}

function makeVariablePreview(v: Variable, modeId: string): SceneNode | null {
  try {
    const raw = (v.valuesByMode || ({} as any))[modeId]
    const resolvedRaw = resolveAliasValueForMode(raw, modeId)
    const previewWidth = PREVIEW_COLUMN_WIDTH
    const previewHeight = TOKEN_ROW_HEIGHT

    function makeLeftAlignedPreview(content: SceneNode): FrameNode {
      const wrap = figma.createFrame()
      wrap.name = 'token-left-align-preview'
      wrap.layoutMode = 'HORIZONTAL'
      wrap.primaryAxisSizingMode = 'FIXED'
      wrap.counterAxisSizingMode = 'FIXED'
      wrap.resize(previewWidth, previewHeight)
      wrap.itemSpacing = 0
      wrap.paddingLeft = 24
      wrap.paddingRight = 0
      wrap.paddingTop = 0
      wrap.paddingBottom = 0
      wrap.counterAxisAlignItems = 'CENTER'
      wrap.primaryAxisAlignItems = 'MIN'
      wrap.fills = []
      wrap.appendChild(content)
      return wrap
    }

    if (v.resolvedType === 'FLOAT' && /(^|\/)(space|spacing|gap)(\/|$)|\b(space|spacing|gap)\b/i.test(v.name)) {
      const n = resolveNumericValue(raw, modeId)
      const row = figma.createFrame()
      row.name = 'space-preview-row'
      row.layoutMode = 'HORIZONTAL'
      row.primaryAxisSizingMode = 'AUTO'
      row.counterAxisSizingMode = 'AUTO'
      row.itemSpacing = 0
      row.fills = []
      row.counterAxisAlignItems = 'CENTER'

      const leftDot = figma.createEllipse()
      leftDot.resize(8, 8)
      leftDot.fills = [COLOR_BORDER]
      row.appendChild(leftDot)

      const spacer = figma.createRectangle()
      const px = Math.max(1, Math.round(n))
      spacer.resize(px, 16)
      spacer.cornerRadius = 0
      spacer.fills = [DARK]
      try { (spacer as any).setBoundVariable('width', v) } catch (e) {}
      row.appendChild(spacer)

      const rightDot = figma.createEllipse()
      rightDot.resize(8, 8)
      rightDot.fills = [COLOR_BORDER]
      row.appendChild(rightDot)
      return makeLeftAlignedPreview(row)
    }

    if (v.resolvedType === 'FLOAT' && /(^|\/)(radius|corner|rounded)(\/|$)|\b(radius|corner|rounded)\b/i.test(v.name)) {
      const n = resolveNumericValue(raw, modeId)
      const radiusPreview = figma.createRectangle()
      radiusPreview.resize(40, 40)
      radiusPreview.fills = [COLOR_BG_LIGHT]
      try {
        ;(radiusPreview as any).setBoundVariable('topLeftRadius', v)
        ;(radiusPreview as any).setBoundVariable('topRightRadius', v)
        ;(radiusPreview as any).setBoundVariable('bottomLeftRadius', v)
        ;(radiusPreview as any).setBoundVariable('bottomRightRadius', v)
      } catch (e) {
        radiusPreview.cornerRadius = Math.max(0, n)
      }
      return makeLeftAlignedPreview(radiusPreview)
    }

    if (v.resolvedType === 'FLOAT' && /font[\.\s\-_]*size|\bfontSize\b|(^|[\.\/_-])fs([\.\/_-]|$)/i.test(v.name)) {
      const n = resolveNumericValue(raw, modeId)
      const text = makeText('Aa', FONT_REGULAR, Math.max(8, n || 16))
      text.fills = [DARK]
      try { text.fontSize = Math.max(8, n || 16) } catch (e) {}
      try { (text as any).setBoundVariable('fontSize', v) } catch (e) {}
      return makeLeftAlignedPreview(text)
    }

    if (v.resolvedType === 'FLOAT' && /line[\.\s\-_]*height|\blineHeight\b|(^|[\.\/_-])lh([\.\/_-]|$)/i.test(v.name)) {
      const n = resolveNumericValue(raw, modeId)
      const text = makeText('Aa', FONT_REGULAR, 20)
      text.fills = [DARK]
      try {
        ;(text as any).setBoundVariable('lineHeight', v)
      } catch (e) {
        try { (text as any).lineHeight = { unit: 'PIXELS', value: Math.max(8, n || 24) } } catch (ee) {}
      }
      return makeLeftAlignedPreview(text)
    }

    if (v.resolvedType === 'COLOR') {
      const sw = figma.createRectangle()
      sw.resize(previewWidth, previewHeight)
      sw.cornerRadius = 0
      const fills = JSON.parse(JSON.stringify(sw.fills))
      try {
        fills[0] = figma.variables.setBoundVariableForPaint(fills[0], 'color', v)
        sw.fills = fills
      } catch (e) {
        if (resolvedRaw && typeof resolvedRaw === 'object' && resolvedRaw.r !== undefined) {
          sw.fills = [{ type: 'SOLID', color: { r: resolvedRaw.r, g: resolvedRaw.g, b: resolvedRaw.b }, opacity: resolvedRaw.a !== undefined ? resolvedRaw.a : 1 } as Paint]
        }
      }
      if ((!sw.fills || (Array.isArray(sw.fills) && sw.fills.length === 0)) && resolvedRaw && typeof resolvedRaw === 'object' && resolvedRaw.r !== undefined) {
        sw.fills = [{ type: 'SOLID', color: { r: resolvedRaw.r, g: resolvedRaw.g, b: resolvedRaw.b }, opacity: resolvedRaw.a !== undefined ? resolvedRaw.a : 1 } as Paint]
      }
      return sw
    }
    if (v.resolvedType === 'BOOLEAN') {
      const chip = figma.createFrame()
      chip.layoutMode = 'HORIZONTAL'
      chip.primaryAxisSizingMode = 'FIXED'
      chip.counterAxisSizingMode = 'FIXED'
      chip.resize(Math.max(100, previewWidth - 32), 36)
      chip.cornerRadius = 18
      chip.strokes = [COLOR_BORDER]
      chip.strokeWeight = 1
      chip.fills = (raw === true) ? [DARK] : [COLOR_WHITE]
      return chip
    }
    if (v.resolvedType === 'FLOAT') {
      if (/font|typography|type|line[\.\s\-_]*height|font[\.\s\-_]*size/i.test(v.name)) {
        const fallbackText = makeText('Aa', FONT_REGULAR, 16)
        fallbackText.fills = [DARK]
        return makeLeftAlignedPreview(fallbackText)
      }
      const n = resolveNumericValue(raw, modeId)
      const bar = figma.createRectangle()
      bar.resize(Math.max(8, Math.min(previewWidth, n)), 20)
      bar.cornerRadius = 6
      bar.fills = [COLOR_BG_LIGHT]
      return bar
    }
    if (
      (v.resolvedType === 'STRING' && /(^|\/)(font|typography|type)(\/|$)|\b(font|typography|type|weight|family)\b/i.test(v.name)) ||
      (v.resolvedType === 'FLOAT' && /(^|[\.\/_-])fw([\.\/_-]|$)|\bfont[\.\s\-_]*weight\b/i.test(v.name))
    ) {
      const sample = makeText('Aa', FONT_REGULAR, 28)
      sample.fills = [DARK]
      return makeLeftAlignedPreview(sample)
    }
    const t = makeText(v.resolvedType || 'Value', FONT_REGULAR, FONT_SIZE)
    return t
  } catch (e) {
    return null
  }
}

function summarizePaintStyleValue(s: PaintStyle): string {
  const p = (s.paints || [])[0] as any
  if (!p) return '—'
  if (p.type === 'SOLID' && p.color) {
    try { return figmaRGBToHex(p.color as any) } catch (e) { return 'solid' }
  }
  if (String(p.type || '').indexOf('GRADIENT') >= 0) return String(p.type).toLowerCase()
  return String(p.type || 'paint')
}

function getVariableFromBinding(binding: any): Variable | null {
  try {
    if (!binding) return null
    if (typeof binding === 'string') return figma.variables.getVariableById(binding)
    if (Array.isArray(binding)) {
      for (let i = 0; i < binding.length; i++) {
        const found = getVariableFromBinding(binding[i])
        if (found) return found
      }
      return null
    }
    if (typeof binding === 'object' && typeof (binding as any).id === 'string') {
      return figma.variables.getVariableById((binding as any).id)
    }
    if (typeof binding === 'object' && typeof (binding as any).variableId === 'string') {
      return figma.variables.getVariableById((binding as any).variableId)
    }
    if (typeof binding === 'object') {
      const obj: any = binding
      const keys = Object.keys(obj)
      for (let i = 0; i < keys.length; i++) {
        const found = getVariableFromBinding(obj[keys[i]])
        if (found) return found
      }
    }
  } catch (e) {}
  return null
}

function getVariablePreferredModeId(v: Variable): string {
  try {
    const c = figma.variables.getVariableCollectionById(v.variableCollectionId)
    if (c) {
      const anyCollection = c as any
      if (typeof anyCollection.defaultModeId === 'string' && anyCollection.defaultModeId) {
        return anyCollection.defaultModeId
      }
      const preferred = getCollectionPrimaryMode(c)
      if (preferred && preferred.modeId) return preferred.modeId
    }
  } catch (e) {}
  const keys = Object.keys(v.valuesByMode || {})
  return keys.length ? keys[0] : ''
}

function summarizeBoundEffectProperty(raw: any, binding: any, unit: string, formatter?: (v: any) => string): { primary: string; fallback: string; hasBinding: boolean } {
  const valueFormatter = formatter || formatResolvedValue
  const formattedRaw = valueFormatter(raw)
  const fallback = (unit && typeof raw === 'number') ? (String(raw) + unit) : formattedRaw
  const variable = getVariableFromBinding(binding)
  if (!variable) return { primary: fallback, fallback: fallback, hasBinding: false }

  const modeId = getVariablePreferredModeId(variable)
  const variableRaw = (variable.valuesByMode || ({} as any))[modeId]
  const resolved = resolveAliasValueForMode(variableRaw, modeId)
  let resolvedText = valueFormatter(resolved)
  if (unit && typeof resolved === 'number') resolvedText += unit

  const ref = makeVariableReference(variable.name)
  return {
    primary: ref,
    fallback: resolvedText && resolvedText !== '—' ? resolvedText : fallback,
    hasBinding: true,
  }
}

function summarizeEffectStyleValue(s: EffectStyle): string {
  const e = (s.effects || [])[0] as any
  if (!e) return '—'

  const bound = (e && typeof e === 'object' && e.boundVariables && typeof e.boundVariables === 'object') ? e.boundVariables : {}

  function boundProp(key: string): any {
    if (!bound) return null
    if (Object.prototype.hasOwnProperty.call(bound, key)) return bound[key]
    return null
  }

  function boundNested(parent: string, key: string): any {
    if (!bound) return null
    const parentValue = boundProp(parent)
    if (!parentValue || typeof parentValue !== 'object') return null
    if (Object.prototype.hasOwnProperty.call(parentValue, key)) return parentValue[key]
    return null
  }

  if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
    const ox = Math.round((e.offset && e.offset.x) || 0)
    const oy = Math.round((e.offset && e.offset.y) || 0)
    const blur = Math.round(e.radius || 0)
    const spread = Math.round(e.spread || 0)
    const color = (e.color && typeof e.color === 'object') ? e.color : null

    const xPart = summarizeBoundEffectProperty(ox, boundProp('offsetX') || boundNested('offset', 'x'), 'px')
    const yPart = summarizeBoundEffectProperty(oy, boundProp('offsetY') || boundNested('offset', 'y'), 'px')
    const blurPart = summarizeBoundEffectProperty(blur, boundProp('radius') || boundProp('blur'), 'px')
    const spreadPart = summarizeBoundEffectProperty(spread, boundProp('spread'), 'px')
    const colorPart = summarizeBoundEffectProperty(color, boundProp('color'), '', v => {
      if (v && typeof v === 'object' && v.r !== undefined && v.g !== undefined && v.b !== undefined) {
        try { return figmaRGBToHex(v as any) } catch (e) { return 'color' }
      }
      return formatResolvedValue(v)
    })

    const hasBindings = xPart.hasBinding || yPart.hasBinding || blurPart.hasBinding || spreadPart.hasBinding || colorPart.hasBinding
    if (!hasBindings) return `${e.type.toLowerCase()}: ${ox}px ${oy}px ${blur}px ${spread}px ${colorPart.fallback}`

    const primary = `${e.type.toLowerCase()}: x ${xPart.primary}, y ${yPart.primary}, blur ${blurPart.primary}, spread ${spreadPart.primary}, color ${colorPart.primary}`
    const fallback = `x ${xPart.fallback}, y ${yPart.fallback}, blur ${blurPart.fallback}, spread ${spreadPart.fallback}, color ${colorPart.fallback}`
    return `${primary} (${fallback})`
  }
  if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
    const blur = Math.round(e.radius || 0)
    const blurPart = summarizeBoundEffectProperty(blur, boundProp('radius') || boundProp('blur'), 'px')
    if (!blurPart.hasBinding) return `${e.type.toLowerCase()}: ${blurPart.fallback}`
    return `${e.type.toLowerCase()}: ${blurPart.primary} (${blurPart.fallback})`
  }
  return String(e.type || 'effect').toLowerCase()
}

function summarizeTextStyleValue(s: TextStyle): string {
  const ts: any = s as any
  const bound = (ts && typeof ts === 'object' && ts.boundVariables && typeof ts.boundVariables === 'object') ? ts.boundVariables : {}

  function getBoundByPath(path: string): any {
    if (!bound || !path) return null
    const parts = path.split('.')
    let current: any = bound
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!current || typeof current !== 'object') return null
      if (!Object.prototype.hasOwnProperty.call(current, part)) return null
      current = current[part]
    }
    return current
  }

  function boundProp(paths: string[]): any {
    if (!bound) return null
    for (let i = 0; i < paths.length; i++) {
      const v = getBoundByPath(paths[i])
      if (v) return v
    }
    return null
  }

  function formatFontFamily(v: any): string {
    if (!v) return '—'
    if (typeof v === 'string') return v
    if (typeof v === 'object' && typeof v.family === 'string') return v.family
    return formatResolvedValue(v)
  }

  function formatFontStyle(v: any): string {
    if (!v) return '—'
    if (typeof v === 'string') return v
    if (typeof v === 'object' && typeof v.style === 'string') return v.style
    return formatResolvedValue(v)
  }

  function formatSizePx(v: any): string {
    if (typeof v === 'number') {
      const rounded = Math.round(v * 100) / 100
      return `${String(rounded)}px`
    }
    return formatResolvedValue(v)
  }

  function formatDimension(v: any): string {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'number') {
      const rounded = Math.round(v * 100) / 100
      return `${String(rounded)}px`
    }
    if (typeof v === 'object') {
      const unit = String((v as any).unit || '').toUpperCase()
      const value = (v as any).value
      if (unit === 'AUTO') return 'auto'
      if (typeof value === 'number') {
        const rounded = Math.round(value * 100) / 100
        if (unit === 'PIXELS') return `${rounded}px`
        if (unit === 'PERCENT') return `${rounded}%`
        return `${rounded}${unit ? ' ' + unit.toLowerCase() : ''}`.trim()
      }
    }
    return formatResolvedValue(v)
  }

  function toLine(label: string, part: { primary: string; fallback: string; hasBinding: boolean }): string {
    if (part.hasBinding) return `${label}: ${part.primary} (${part.fallback})`
    return `${label}: ${part.fallback}`
  }

  const fontName = ts.fontName && typeof ts.fontName === 'object' ? ts.fontName : null
  const familyPart = summarizeBoundEffectProperty(
    fontName ? { family: fontName.family } : null,
    boundProp(['fontFamily', 'fontName.family', 'fontName']),
    '',
    formatFontFamily,
  )
  const stylePart = summarizeBoundEffectProperty(
    fontName ? { style: fontName.style } : null,
    boundProp(['fontStyle', 'fontName.style', 'fontName']),
    '',
    formatFontStyle,
  )
  const sizePart = summarizeBoundEffectProperty(ts.fontSize, boundProp(['fontSize', 'typography.fontSize']), 'px', formatSizePx)
  const lineHeightPart = summarizeBoundEffectProperty(ts.lineHeight, boundProp(['lineHeight', 'lineHeight.value', 'typography.lineHeight']), '', formatDimension)
  const letterSpacingPart = summarizeBoundEffectProperty(ts.letterSpacing, boundProp(['letterSpacing', 'letterSpacing.value', 'typography.letterSpacing']), '', formatDimension)

  const lines = [
    toLine('fontFamily', familyPart),
    toLine('fontWeight', stylePart),
    toLine('fontSize', sizePart),
    toLine('lineHeight', lineHeightPart),
    toLine('letterSpacing', letterSpacingPart),
  ]
  return lines.join('\n')
}

function summarizeLayoutStyleValue(s: GridStyle): string {
  const grids = (s as any).layoutGrids || []
  if (!grids.length) return '—'
  const g: any = grids[0]
  const pattern = g.pattern || 'GRID'
  const count = g.count !== undefined ? g.count : '-'
  const gutter = g.gutterSize !== undefined ? g.gutterSize : '-'
  return `${String(pattern).toLowerCase()} • count ${count} • gutter ${gutter}`
}

function makeStylePreview(styleId: string, kind: 'paint' | 'effect' | 'text' | 'layout'): SceneNode | null {
  try {
    const previewWidth = PREVIEW_COLUMN_WIDTH
    const previewHeight = TOKEN_ROW_HEIGHT
    if (kind === 'paint') {
      const r = figma.createRectangle()
      r.resize(previewWidth, previewHeight)
      r.cornerRadius = 0
      ;(r as any).fillStyleId = styleId
      return r
    }
    if (kind === 'effect') {
      const wrap = figma.createFrame()
      wrap.name = 'effect-style-preview-wrap'
      wrap.layoutMode = 'HORIZONTAL'
      wrap.primaryAxisSizingMode = 'FIXED'
      wrap.counterAxisSizingMode = 'FIXED'
      wrap.resize(previewWidth, previewHeight)
      wrap.itemSpacing = 0
      wrap.paddingLeft = 24
      wrap.paddingRight = 0
      wrap.paddingTop = 0
      wrap.paddingBottom = 0
      wrap.counterAxisAlignItems = 'CENTER'
      wrap.primaryAxisAlignItems = 'MIN'
      wrap.fills = []

      const r = figma.createRectangle()
      r.resize(40, 40)
      r.cornerRadius = 16
      r.fills = [COLOR_WHITE]
      ;(r as any).effectStyleId = styleId
      wrap.appendChild(r)
      return wrap
    }
    if (kind === 'text') {
      const wrap = createAutolayout('text-style-preview-wrap', 'HORIZONTAL', 0, 24, 0, 'FIXED', 'HUG')
      wrap.resizeWithoutConstraints(previewWidth, 1)
      wrap.counterAxisAlignItems = 'MIN'
      wrap.primaryAxisAlignItems = 'MIN'

      const t = makeText('The quick brown fox', FONT_REGULAR, 24)
      try { ;(t as any).textStyleId = styleId } catch (e) {}
      t.fills = [DARK]
      t.resizeWithoutConstraints(Math.max(80, previewWidth - 48), t.height)
      wrap.appendChild(t)
      return wrap
    }
    const r = figma.createRectangle()
    r.resize(previewWidth, previewHeight)
    r.cornerRadius = 0
    r.fills = [COLOR_BG_LIGHT]
    return r
  } catch (e) {
    return null
  }
}

// Action for selected nodes
async function writeVariables(onProgress?: (text: string) => void) {
  await ensureTokenFontsLoaded()

  for (const c of activeCollections) {
    if (onProgress) onProgress('Collection: ' + c.name)

    const allCollectionVariables = c.variableIds
      .map(id => figma.variables.getVariableById(id))
      .filter(Boolean) as Variable[]
    // Keep Figma collection order so generated docs match the Variables panel.

    const hasGroupConfig = Object.prototype.hasOwnProperty.call(activeCollectionGroupsById, c.id)
    const selectedGroups = hasGroupConfig ? (activeCollectionGroupsById[c.id] || []) : ['*']
    const allowAllGroups = selectedGroups.indexOf('*') !== -1
    const selectedPrefixes = selectedGroups.filter(g => g && g !== '*')
    let variables = allowAllGroups
      ? allCollectionVariables
      : allCollectionVariables.filter(v => {
          const groupPath = getVariableGroupPath(v.name)
          if (!groupPath) return false
          for (const prefix of selectedPrefixes) {
            if (groupPath === prefix || groupPath.indexOf(prefix + '/') === 0) return true
          }
          return false
        })

    // Fallback for collections whose naming may drift from group-path parsing;
    // prefer documenting matching tokens over producing an empty output.
    if (!allowAllGroups && !variables.length && selectedPrefixes.length) {
      const lowerPrefixes = selectedPrefixes.map(p => p.toLowerCase())
      variables = allCollectionVariables.filter(v => {
        const name = (v.name || '').toLowerCase()
        for (const prefix of lowerPrefixes) {
          if (!prefix) continue
          if (name === prefix) return true
          if (name.indexOf(prefix + '/') === 0) return true
          if (name.indexOf('/' + prefix + '/') !== -1) return true
          if (name.indexOf('.' + prefix + '.') !== -1) return true
        }
        return false
      })
    }

    if (!variables.length && allCollectionVariables.length && !allowAllGroups) {
      figma.ui.postMessage({ type: 'tokens-status', text: 'No tokens matched selected groups in collection: ' + c.name })
    }
    if (!variables.length) continue

    const mode = getCollectionPrimaryMode(c)
    const grouped = groupByTokenPath(variables, v => v.name)
    variablesFrame.appendChild(createTokenGroupTitle(c.name))
    for (let gi = 0; gi < grouped.length; gi++) {
      const group = grouped[gi]
      const normalizedPath = normalizeGroupPathForCollection(group.path, c.name)
      const subgroupLabel = getLeafGroupLabel(normalizedPath)
      const subgroupDisplay = getParentAndLeafGroupLabel(normalizedPath)
      variablesFrame.appendChild(createTokenSubgroupTitle(subgroupDisplay))
      const section = createTokenTableSection('Variables - ' + c.name + '-' + subgroupLabel)
      variablesFrame.appendChild(section)
      section.appendChild(createTokenHeaderRow(subgroupDisplay))

      for (let i = 0; i < group.items.length; i++) {
        const v = group.items[i]
        if (onProgress) onProgress('Variable: ' + v.name)
        try {
          const valueText = formatVariableCellValue(v, mode.modeId)
          const preview = makeVariablePreview(v, mode.modeId)
          appendTokenRow(
            section,
            'variable-row-' + v.id,
            preview,
            sanitizeName(getLeafTokenName(v.name)),
            valueText,
            v.description || 'no description',
            i === group.items.length - 1
          )
          count++
        } catch (e) {
          skippedVariableRows.push(v.name)
          const details = (e && (e as Error).message) ? (e as Error).message : String(e)
          figma.ui.postMessage({ type: 'tokens-status', text: 'Skipped variable due to render error: ' + v.name + ' (' + details + ')' })
          console.error('Token row render failed for variable', v.name, e)
        }
      }
    }
  }
}

async function writeStyles(onProgress?: (text: string) => void) {
  await ensureTokenFontsLoaded()

  function resolveTextStyleSizeForSort(style: TextStyle): number {
    try {
      const ts: any = style as any
      if (typeof ts.fontSize === 'number' && isFinite(ts.fontSize)) return ts.fontSize

      const bound = ts && typeof ts === 'object' && ts.boundVariables && typeof ts.boundVariables === 'object'
        ? ts.boundVariables
        : null
      const binding = bound && Object.prototype.hasOwnProperty.call(bound, 'fontSize') ? bound.fontSize : null
      const variable = getVariableFromBinding(binding)
      if (variable) {
        const modeId = getVariablePreferredModeId(variable)
        const raw = (variable.valuesByMode || ({} as any))[modeId]
        const resolved = resolveAliasValueForMode(raw, modeId)
        if (typeof resolved === 'number' && isFinite(resolved)) return resolved
        const parsed = parseFloat(String(resolved ?? ''))
        if (isFinite(parsed)) return parsed
      }
    } catch (e) {}
    return 0
  }

  function compareTextStylesBySizeDesc(a: TextStyle, b: TextStyle): number {
    const aSize = resolveTextStyleSizeForSort(a)
    const bSize = resolveTextStyleSizeForSort(b)
    if (bSize !== aSize) return bSize - aSize
    return naturalSort(a.name, b.name)
  }

  function writeStyleSection<T extends BaseStyle>(
    sectionTitle: string,
    styles: T[],
    previewFactory: (s: T) => SceneNode | null,
    valueFactory: (s: T) => string,
    sortWithinGroup?: (a: T, b: T) => number,
    sortGroups?: (a: { path: string; items: T[] }, b: { path: string; items: T[] }) => number
  ): void {
    if (!styles.length) return
    stylesFrame.appendChild(createTokenGroupTitle(sectionTitle))
    const grouped = groupByTokenPath(styles, s => s.name)
    const orderedGroups = sortGroups ? grouped.slice().sort(sortGroups) : grouped
    for (let gi = 0; gi < orderedGroups.length; gi++) {
      const group = orderedGroups[gi]
      const items = sortWithinGroup ? group.items.slice().sort(sortWithinGroup) : group.items
      const subgroupLabel = getLeafGroupLabel(group.path)
      const subgroupDisplay = getParentAndLeafGroupLabel(group.path)
      stylesFrame.appendChild(createTokenSubgroupTitle(subgroupDisplay))
      const section = createTokenTableSection(sectionTitle + '-' + subgroupLabel)
      stylesFrame.appendChild(section)
      section.appendChild(createTokenHeaderRow(subgroupDisplay))

      for (let i = 0; i < items.length; i++) {
        const s = items[i]
        if (onProgress) onProgress(sectionTitle + ': ' + s.name)
        try {
          appendTokenRow(
            section,
            sectionTitle + '-row-' + s.id,
            previewFactory(s),
            sanitizeName(getLeafTokenName(s.name)),
            valueFactory(s),
            s.description || 'no description',
            i === items.length - 1
          )
          count++
        } catch (e) {
          skippedStyleRows.push(sectionTitle + '/' + s.name)
          const details = (e && (e as Error).message) ? (e as Error).message : String(e)
          figma.ui.postMessage({ type: 'tokens-status', text: 'Skipped style due to render error: ' + s.name + ' (' + details + ')' })
          console.error('Token row render failed for style', sectionTitle, s.name, e)
        }
      }
    }
  }

  const paintStyles = figma.getLocalPaintStyles()
    .filter(s => activeColorStyleIds.indexOf(s.id) !== -1)
    .sort((a, b) => naturalSort(a.name, b.name))
  writeStyleSection<PaintStyle>('Color', paintStyles, s => makeStylePreview(s.id, 'paint'), summarizePaintStyleValue)

  const effectStyles = figma.getLocalEffectStyles()
    .filter(s => activeEffectStyleIds.indexOf(s.id) !== -1)
    .sort((a, b) => naturalSort(a.name, b.name))
  writeStyleSection<EffectStyle>('Effects', effectStyles, s => makeStylePreview(s.id, 'effect'), summarizeEffectStyleValue)

  const textStyles = figma.getLocalTextStyles()
    .filter(s => activeTextStyleIds.indexOf(s.id) !== -1)
    .sort((a, b) => compareTextStylesBySizeDesc(a, b))
  writeStyleSection<TextStyle>(
    'Text',
    textStyles,
    s => makeStylePreview(s.id, 'text'),
    summarizeTextStyleValue,
    compareTextStylesBySizeDesc,
    (a, b) => {
      const maxA = a.items.reduce((m, s) => Math.max(m, resolveTextStyleSizeForSort(s)), 0)
      const maxB = b.items.reduce((m, s) => Math.max(m, resolveTextStyleSizeForSort(s)), 0)
      if (maxB !== maxA) return maxB - maxA
      return naturalSort(a.path, b.path)
    }
  )

  const layoutStyles = figma.getLocalGridStyles()
    .filter(s => activeLayoutStyleIds.indexOf(s.id) !== -1)
    .sort((a, b) => naturalSort(a.name, b.name))
  writeStyleSection<GridStyle>('Layout', layoutStyles, s => makeStylePreview(s.id, 'layout'), summarizeLayoutStyleValue)
}

function offset(node: SceneNode, x: number, y: number, absolute: boolean = false) {
  if (absolute) {
    node.x = x
    node.y = y
  }
  else {
    node.x = (x === 0) ? lastX - node.width : lastX + x
    node.y = (y === 0) ? lastY - node.height : lastY + y
  }
  lastX = node.x + node.width
  lastY = node.y + node.height
}

function makeText(text: string, font: FontName, size: number, truncate: boolean = false) {
  const node = figma.createText()
  node.fontName = font
  node.fontSize = size
  node.fills = [DARK]
  node.characters = text
  if (truncate) {
    node.textTruncation = 'ENDING'
    node.textAutoResize = 'HEIGHT'
  } else {
    node.textTruncation = 'DISABLED'
    node.textAutoResize = 'HEIGHT'
  }
  return node
}

function addToColumn(autolayout: FrameNode, child) {
  autolayout.appendChild(child)
  child.layoutAlign = 'STRETCH'
}

function createFrame(name: string) {
  const frame: FrameNode = figma.createFrame()
  frame.locked = true
  frame.fills = [LIGHT]
  frame.resizeWithoutConstraints(1000, 500)
  frame.name = name
  frame.x = Math.round(figma.viewport.center.x - frame.width / 2)
  frame.y = Math.round(figma.viewport.center.y - frame.height / 2)
  frame.cornerRadius = CORNER_RADIUS
  return frame
}

function createAutolayout(
  name: string,
  direction: "HORIZONTAL" | "NONE" | "VERTICAL" = 'HORIZONTAL',
  gap = 0, paddingX = 0, paddingY = 0,
  sizingX: "HUG" | "FIXED" | "FILL" = 'HUG',
  sizingY: "HUG" | "FIXED" | "FILL" = 'HUG'
) {
  const autolayout: FrameNode = figma.createFrame()
  autolayout.name = name
  autolayout.fills = []
  autolayout.layoutMode = direction
  autolayout.itemSpacing = gap
  autolayout.paddingLeft = paddingX
  autolayout.paddingRight = paddingX
  autolayout.paddingTop = paddingY
  autolayout.paddingBottom = paddingY
  if (sizingX !== 'FILL') autolayout.layoutSizingHorizontal = sizingX
  if (sizingY !== 'FILL') autolayout.layoutSizingVertical = sizingY
  return autolayout

}

async function refreshVariablesSection(node) { }

// Ending the work — reports status but keeps the unified plugin open
function finish(message: string = undefined) {
  if (mainFrame) mainFrame.locked = false
  working = false
  figma.root.setRelaunchData({ relaunch: '' })
  let text: string
  if (message) {
    text = message
  }
  else if (count > 0) {
    text = CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)] +
      " " + ACTION_MSGS[Math.floor(Math.random() * ACTION_MSGS.length)] +
      " " + ((count === 1) ? "only one variable" : (count + " variables"))
  }
  else if (skippedVariableRows.length || skippedStyleRows.length) {
    var skippedVarSample = skippedVariableRows.slice(0, 3)
    var skippedStyleSample = skippedStyleRows.slice(0, 3)
    var skippedDetails = [] as string[]
    if (skippedVarSample.length) skippedDetails.push('variables: ' + skippedVarSample.join(', '))
    if (skippedStyleSample.length) skippedDetails.push('styles: ' + skippedStyleSample.join(', '))
    text = 'No rows rendered. Skipped ' + (skippedVariableRows.length + skippedStyleRows.length) + ' items (' + skippedDetails.join(' | ') + ')'
  } else text = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)]
  notify(text)
  try {
    figma.ui.postMessage({ type: 'tokens-status', text: text })
    figma.ui.postMessage({ type: 'tokens-resync-state', available: !!getSelectedTokensDocFrame() })
  } catch (e) {
    // UI may not be open (headless relaunch flows) — notify() already covered it
  }
}

// Show new notification
function notify(text: string) {
  if (notification != null)
    notification.cancel()
  notification = figma.notify(text)
}

// Showing interruption notification
function cancel() {
  if (notification != null)
    notification.cancel()
  if (working) {
    notify("Plugin work have been interrupted")
    figma.closePlugin()
  }
}


// From https://github.com/figma-plugin-helper-functions/figma-plugin-helpers/blob/master/src/helpers/convertColor.ts

const namesRGB = ['r', 'g', 'b']
function figmaRGBToWebRGB(color: RGBA): webRGBA
function figmaRGBToWebRGB(color: RGB): webRGB
function figmaRGBToWebRGB(color): any {
  const rgb = []

  namesRGB.forEach((e, i) => {
    rgb[i] = Math.round(color[e] * 255)
  })

  if (color['a'] !== undefined) rgb[3] = Math.round(color['a'] * 100) / 100
  return rgb
}

function figmaRGBToHex(color: RGB | RGBA): string {
  let hex = '#'

  const rgb = figmaRGBToWebRGB(color) as webRGB | webRGBA
  hex += ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1)

  if (rgb[3] !== undefined) {
    const a = Math.round(rgb[3] * 255).toString(16)
    if (a.length == 1) {
      hex += '0' + a
    } else {
      if (a !== 'ff') hex += a
    }
  }
  return hex
}

function resolveColorLabel(color: any): string {
  try {
    const hex = figmaRGBToHex(color as any)
    // Try to match a variable value
    if (collections && Array.isArray(collections)) {
      for (const c of collections) {
        for (const id of c.variableIds) {
          const v = figma.variables.getVariableById(id)
          if (!v) continue
          const modes = v.valuesByMode || {}
          for (const mid in modes) {
            const raw = modes[mid]
            if (raw && typeof raw === 'object') {
              try {
                if (figmaRGBToHex(raw as any) === hex) return sanitizeName(v.name)
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }
    }
    // Try paint styles
    const paints = figma.getLocalPaintStyles()
    for (const s of paints) {
      if (s.paints && s.paints[0] && s.paints[0].type === 'SOLID' && s.paints[0].color) {
        try {
          if (figmaRGBToHex(s.paints[0].color as any) === hex) return sanitizeName(s.name)
        } catch (e) { }
      }
    }
    return hex
  } catch (e) {
    return String(color)
  }
}

function resolveColorVariable(color: any): Variable | null {
  try {
    const hex = figmaRGBToHex(color as any)
    // Try to match a variable value
    if (collections && Array.isArray(collections)) {
      for (const c of collections) {
        for (const id of c.variableIds) {
          const v = figma.variables.getVariableById(id)
          if (!v || v.resolvedType !== 'COLOR') continue
          const modes = v.valuesByMode || {}
          for (const mid in modes) {
            const raw = modes[mid]
            if (raw && typeof raw === 'object') {
              try {
                if (figmaRGBToHex(raw as any) === hex) return v
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }
    }
    return null
  } catch (e) {
    return null
  }
}

function resolveColorVariableForMode(color: any, collectionId: string, modeId: string): Variable | null {
  try {
    const hex = figmaRGBToHex(color as any)
    // Search in the specified collection first
    const targetCollection = figma.variables.getVariableCollectionById(collectionId)
    if (targetCollection) {
      for (const id of targetCollection.variableIds) {
        const v = figma.variables.getVariableById(id)
        if (!v || v.resolvedType !== 'COLOR') continue
        const raw = v.valuesByMode[modeId]
        if (raw && typeof raw === 'object') {
          try {
            if (figmaRGBToHex(raw as any) === hex) return v
          } catch (e) {
            // ignore
          }
        }
      }
    }
    // Then search all collections in the current mode if available
    if (collections && Array.isArray(collections)) {
      for (const c of collections) {
        for (const id of c.variableIds) {
          const v = figma.variables.getVariableById(id)
          if (!v || v.resolvedType !== 'COLOR') continue
          const raw = v.valuesByMode[modeId]
          if (raw && typeof raw === 'object') {
            try {
              if (figmaRGBToHex(raw as any) === hex) return v
            } catch (e) {
              // ignore
            }
          }
        }
      }
    }
    return null
  } catch (e) {
    return null
  }
}

type webRGB = [number, number, number]
type webRGBA = [number, number, number, number]
