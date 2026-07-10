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

const FONT_REGULAR: FontName = { family: 'Inter', style: 'Regular' }
const FONT_SEMIBOLD: FontName = { family: 'Inter', style: 'Semi Bold' }
const FONT_ITALIC: FontName = { family: 'Inter', style: 'Italic' }
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
const FONT_SIZE: number = 24
const L_FONT_SIZE: number = 40
const CORNER_RADIUS: number = 16
const MAX_COLUMN_WIDTH: number = 1440

figma.on("currentpagechange", cancel)

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

let mainFrame: FrameNode

// ─── Resync support ────────────────────────────────────────────────
// The "Variables and Styles" doc frame is stamped with pluginData so it can
// be found and regenerated in place without requiring the user to select it
// (unlike the native Figma relaunch-button flow, which does).
var TOKENS_DOC_KEY = 'dsTokensDoc'
var TOKENS_CONFIG_KEY = 'dsTokensConfig'

function findTokensDocFrame(): FrameNode | null {
  var children = figma.currentPage.children || []
  for (var i = 0; i < children.length; i++) {
    var child = children[i] as any
    if (child.type === 'FRAME' && child.getPluginData(TOKENS_DOC_KEY) === '1') {
      return child as FrameNode
    }
  }
  return null
}

export function getTokensResyncState(): { available: boolean } {
  return { available: !!findTokensDocFrame() }
}

let variablesFrame: FrameNode
let stylesFrame: FrameNode

function createMainFrame() {
  // Create a wrapper frame for all content (HORIZONTAL layout)
  mainFrame = createAutolayout('Variables and Styles', 'HORIZONTAL', 100, 0, 0)
  mainFrame.fills = []
  mainFrame.layoutSizingHorizontal = 'HUG'
  mainFrame.layoutSizingVertical = 'HUG'

  // Create Local Variables section (flows horizontally with HUG sizing)
  variablesFrame = createAutolayout('Local Variables', 'HORIZONTAL', 100, 0, 0)
  variablesFrame.fills = []
  variablesFrame.layoutSizingHorizontal = 'HUG'
  variablesFrame.layoutSizingVertical = 'HUG'
  mainFrame.appendChild(variablesFrame)

  // Create Local Styles section (flows horizontally with HUG sizing)
  stylesFrame = createAutolayout('Local Styles', 'HORIZONTAL', 100, 0, 0)
  stylesFrame.fills = []
  stylesFrame.layoutSizingHorizontal = 'HUG'
  stylesFrame.layoutSizingVertical = 'HUG'
  mainFrame.appendChild(stylesFrame)

  // Position 100px to the right of the rightmost artboard
  let rightmostX = 0
  for (const node of figma.currentPage.children) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'SECTION') {
      const nodeRight = node.x + node.width
      if (nodeRight > rightmostX) {
        rightmostX = nodeRight
      }
    }
  }
  mainFrame.x = rightmostX + 100
  mainFrame.y = 0

  mainFrame.cornerRadius = CORNER_RADIUS
  mainFrame.setRelaunchData({ rewrite: REWRITE_MSG })
  // Insert the frame at the bottom of the layer stack so it doesn't cover existing content
  try {
    figma.currentPage.insertChild(0, mainFrame)
  } catch (e) {
    // Fallback to append if insertChild fails for any reason
    figma.currentPage.appendChild(mainFrame)
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
  const cols = collections.map(c => ({ id: c.id, name: c.name, modeCount: c.modes.length }))
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

  return {
    type: 'tokens-init', selection: sel, collections: cols, colorStyles: paintStyles,
    effectStyles: effectStyles, textStyles: textStyles, layoutStyles: layoutStyles,
    resyncAvailable: !!findTokensDocFrame()
  }
}

// Shared by Confirm and Resync: (re)build the doc frame with a given
// selection of collection/style ids, reusing an existing frame in place
// when one is passed so canvas position and downstream links don't move.
async function regenerateTokensDoc(
  targetFrame: FrameNode | null,
  selectedCollectionIds: string[],
  colorIds: string[],
  effectIds: string[],
  textIds: string[],
  layoutIds: string[]
): Promise<void> {
  working = true
  count = 0
  selection = figma.currentPage.selection
  figma.ui.postMessage({ type: 'tokens-status', text: 'Preparing generation...' })

  activeCollections = collections.filter(c => selectedCollectionIds.indexOf(c.id) !== -1)
  activeColorStyleIds = colorIds
  activeEffectStyleIds = effectIds
  activeTextStyleIds = textIds
  activeLayoutStyleIds = layoutIds

  if (targetFrame) {
    mainFrame = targetFrame
    while (mainFrame.children.length) mainFrame.children[0].remove()
  } else {
    createMainFrame()
  }

  figma.ui.postMessage({ type: 'tokens-status', text: 'Writing variables...' })
  await writeVariables(progress => figma.ui.postMessage({ type: 'tokens-progress', text: progress }))

  figma.ui.postMessage({ type: 'tokens-status', text: 'Writing styles...' })
  await writeStyles(progress => figma.ui.postMessage({ type: 'tokens-progress', text: progress }))

  mainFrame.setPluginData(TOKENS_DOC_KEY, '1')
  mainFrame.setPluginData(TOKENS_CONFIG_KEY, JSON.stringify({
    collections: selectedCollectionIds, colorStyles: colorIds,
    effectStyles: effectIds, textStyles: textIds, layoutStyles: layoutIds
  }))

  finish()
}

// Generation flow, triggered by the Tokens tab's Confirm button (via main.ts).
// Unlike the old standalone plugin, this keeps the plugin open when done.
export function handleTokensConfirm(msg: any): void {
  (async () => {
    try {
      collections = figma.variables.getLocalVariableCollections() || []
      selection = figma.currentPage.selection

      var existingByData = findTokensDocFrame()
      var existingByRelaunch = (selection[0]?.type === 'FRAME' && selection[0]?.getRelaunchData().rewrite === REWRITE_MSG)
        ? selection[0] as FrameNode
        : null
      var target = existingByData || existingByRelaunch || null

      var selectedIds: string[] = Array.isArray(msg.collections) ? msg.collections : collections.map(c => c.id)
      await regenerateTokensDoc(
        target, selectedIds,
        Array.isArray(msg.colorStyles) ? msg.colorStyles : [],
        Array.isArray(msg.effectStyles) ? msg.effectStyles : [],
        Array.isArray(msg.textStyles) ? msg.textStyles : [],
        Array.isArray(msg.layoutStyles) ? msg.layoutStyles : []
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
export function handleTokensResync(): void {
  (async () => {
    try {
      var target = findTokensDocFrame()
      if (!target) {
        figma.ui.postMessage({ type: 'tokens-status', text: 'No token documentation found on this page yet — use Confirm to generate one first.' })
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

      collections = figma.variables.getLocalVariableCollections() || []
      await regenerateTokensDoc(
        target,
        stored.collections || [],
        stored.colorStyles || [],
        stored.effectStyles || [],
        stored.textStyles || [],
        stored.layoutStyles || []
      )
    } catch (err) {
      working = false
      const message = (err && (err as Error).message) ? (err as Error).message : String(err)
      figma.ui.postMessage({ type: 'tokens-status', text: 'Error: ' + message })
      notify('Error: ' + message)
    }
  })()
}

// Action for selected nodes
async function writeVariables(onProgress?: (text: string) => void) {

  await figma.loadFontAsync(FONT_REGULAR)
  await figma.loadFontAsync(FONT_SEMIBOLD)
  await figma.loadFontAsync(FONT_ITALIC)
  for (const c of activeCollections) {
    if (onProgress) onProgress('Collection: ' + c.name)

    // Create a vertical container per collection (we'll add rows inside)
    const collectionBox: FrameNode = createAutolayout(c.name, 'VERTICAL', GAP_BETWEEN_SECTIONS, 0, 0)
    collectionBox.fills = [LIGHT]
    collectionBox.layoutSizingVertical = 'HUG'
    collectionBox.layoutSizingHorizontal = 'HUG'
    collectionBox.minWidth = MAX_COLUMN_WIDTH
    variablesFrame.appendChild(collectionBox)

    const variables = c.variableIds.map(id => figma.variables.getVariableById(id))
    variables.sort((a, b) => naturalSort(a.name, b.name))

    // Build mode list once per collection
    const modes = c.modes

    // Header row: collection title on the left, mode titles on the right
    const headerRow: FrameNode = createAutolayout(c.name + '-modes-header', 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
    collectionBox.appendChild(headerRow)
    headerRow.layoutSizingHorizontal = 'HUG'
    headerRow.minWidth = MAX_COLUMN_WIDTH
    headerRow.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    headerRow.strokeWeight = 1
    headerRow.dashPattern = [4, 4]
    headerRow.strokeBottomWeight = 1
    headerRow.strokeTopWeight = 0
    headerRow.strokeLeftWeight = 0
    headerRow.strokeRightWeight = 0

    // Left header cell contains the collection title
    const leftHeader: FrameNode = createAutolayout('left-header', 'VERTICAL', 4, ROW_PADDING, ROW_PADDING)
    headerRow.appendChild(leftHeader)
    leftHeader.layoutSizingHorizontal = 'FIXED'
    leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height)
    const cHeader = makeText(sanitizeName(c.name), FONT_SEMIBOLD, L_FONT_SIZE)
    addToColumn(leftHeader, cHeader)

    // Mode headers (fixed-width columns)
    for (const m of modes) {
      const headerCell: FrameNode = createAutolayout('mode-header-' + m.modeId, 'VERTICAL', 0, ROW_PADDING, ROW_PADDING)
      headerRow.appendChild(headerCell)
      headerCell.layoutSizingHorizontal = 'HUG'
      headerCell.layoutSizingVertical = 'FILL'
      headerCell.minWidth = MIN_MODE_COLUMN_WIDTH
      headerCell.primaryAxisAlignItems = 'CENTER'
      headerCell.counterAxisAlignItems = 'CENTER'
      
      // Add mode-appropriate background to header
      if (m.name.toLowerCase() === 'dark') {
        headerCell.fills = [COLOR_DARK_MODE_BG]
        headerCell.topLeftRadius = 16
        headerCell.topRightRadius = 16
      }
      
      const valueHeader = makeText((m.name === DEFAULT_MODE_NAME && modes.length === 1) ? 'Value' : m.name, FONT_SEMIBOLD, FONT_SIZE)
      valueHeader.fills = m.name.toLowerCase() === 'dark' ? [COLOR_DARK_MODE_TEXT] : [{ type: 'SOLID', color: hexToRGB('#000000') }]
      addToColumn(headerCell, valueHeader)
      valueHeader.textAlignVertical = 'CENTER'
    }

    // Rows: one per variable
    for (const v of variables) {
      if (onProgress) onProgress('Variable: ' + v.name)
      const row: FrameNode = createAutolayout('row-' + v.name, 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
      collectionBox.appendChild(row)
      row.layoutSizingHorizontal = 'HUG'
      row.minWidth = MAX_COLUMN_WIDTH
      
      // Add border to all except last
      const isLast = variables.indexOf(v) === variables.length - 1
      if (!isLast) {
        row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
        row.strokeWeight = 1
        row.dashPattern = [4, 4]
        row.strokeBottomWeight = 1
        row.strokeTopWeight = 0
        row.strokeLeftWeight = 0
        row.strokeRightWeight = 0
      }

      // Left cell: name + description (vertical)
      const leftCell: FrameNode = createAutolayout('left-' + v.name, 'VERTICAL', 4)
      row.appendChild(leftCell)
      leftCell.layoutSizingHorizontal = 'FIXED'
      leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height)
      leftCell.paddingTop = ROW_PADDING
      leftCell.paddingBottom = ROW_PADDING
      leftCell.paddingLeft = ROW_PADDING
      leftCell.paddingRight = ROW_PADDING

      const vName = makeText(sanitizeName(v.name), FONT_SEMIBOLD, FONT_SIZE)
      addToColumn(leftCell, vName)
      const vDesc = makeText(v.description || 'no description', FONT_REGULAR, 14)
      vDesc.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(leftCell, vDesc)
      count++

      // Right cells: one per mode (value previews)
      for (const m of modes) {
        const isDark = m.name.toLowerCase() === 'dark'
        const isLastRow = variables.indexOf(v) === variables.length - 1
        const valueColumn: FrameNode = createAutolayout('value-' + v.name + '-' + m.modeId, 'VERTICAL', isDark ? 8 : 8)
        row.appendChild(valueColumn)
        valueColumn.layoutSizingHorizontal = 'HUG'
        valueColumn.layoutSizingVertical = 'FILL'
        valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH
        if (modes.length > 2) valueColumn.maxWidth = 500
        valueColumn.setExplicitVariableModeForCollection(c.id, m.modeId)
        
        // Add mode-appropriate background
        if (isDark) {
          valueColumn.fills = [COLOR_DARK_MODE_BG]
          valueColumn.strokes = [COLOR_DARK_MODE_BORDER]
          valueColumn.strokeWeight = 1
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
          if (isLastRow) {
            valueColumn.bottomLeftRadius = 16
            valueColumn.bottomRightRadius = 16
          }
        } else {
          valueColumn.fills = []
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
        }
        
        // Allow overflow for interaction/focus mode previews so shadows/overlays are visible
        if (typeof m.name === 'string' && /interaction|focus/i.test(m.name)) {
          valueColumn.clipsContent = false
          row.clipsContent = false
        }

        // Resolve value for this variable + mode
        const rawValue: any = v.valuesByMode[m.modeId]
        const type = v.resolvedType
        let valueStr = ''
        let font = FONT_REGULAR
        let isAlias = false
        if (rawValue && typeof rawValue === 'object' && rawValue.type === 'VARIABLE_ALIAS') {
          isAlias = true
          const aliased = figma.variables.getVariableById(rawValue.id)
          valueStr = aliased ? aliased.name.toString() : String(rawValue.id)
          font = FONT_ITALIC
        } else {
          // Handle color, paint/gradient, and effect variable values
          if (type === 'COLOR') {
            valueStr = figmaRGBToHex(rawValue as any)
          } else if (rawValue && typeof rawValue === 'object' && (rawValue.paints || (Array.isArray(rawValue) && rawValue[0] && rawValue[0].type))) {
            // Paint or gradient-like object
            const paints = rawValue.paints ? rawValue.paints : (Array.isArray(rawValue) ? rawValue : [rawValue])
            const first = paints[0]
            if (first) {
              if (first.type === 'SOLID' && first.color) {
                valueStr = figmaRGBToHex(first.color as any)
              } else if (first.gradientStops && Array.isArray(first.gradientStops)) {
                // Render gradient preview as actual gradient
                const gradientPreview = figma.createRectangle()
                gradientPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
                // Bind the gradient variable
                try {
                  const gradFills = JSON.parse(JSON.stringify(gradientPreview.fills))
                  gradFills[0] = figma.variables.setBoundVariableForPaint(gradFills[0], 'color', v)
                  gradientPreview.fills = gradFills
                } catch (e) {
                  // Fallback: just set the paint directly
                  gradientPreview.fills = [first as Paint]
                }
                valueColumn.appendChild(gradientPreview)
                
                const gtype = (first.type || 'GRADIENT').replace(/^GRADIENT_?/i, '')
                const gradientType = gtype.charAt(0).toUpperCase() + gtype.slice(1).toLowerCase()
                
                // Create header: gradient type + first position
                const firstPos = Math.round((first.gradientStops[0]?.position || 0) * 100) + '%'
                const gradientHeader = makeText(gradientType + ' — ' + firstPos, FONT_REGULAR, FONT_SIZE)
                gradientHeader.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
                valueColumn.appendChild(gradientHeader)

                // Render each stop as a row with swatch + label + hex
                for (const s of first.gradientStops) {
                  const stopRow: FrameNode = createAutolayout('gradient-stop', 'HORIZONTAL', GAP_SWATCH_ITEMS)
                  valueColumn.appendChild(stopRow)

                  // Find variable that matches this stop's color in current mode
                  const colorVar = resolveColorVariableForMode(s.color, c.id, m.modeId)
                  
                  // Create swatch
                  const swatchPreview = figma.createRectangle()
                  swatchPreview.resize(SWATCH_SIZE, SWATCH_SIZE)
                  swatchPreview.cornerRadius = BORDER_RADIUS_SM
                  
                  if (colorVar) {
                    // Set mode FIRST, then bind variable
                    swatchPreview.setExplicitVariableModeForCollection(c.id, m.modeId)
                    const swatchFills = JSON.parse(JSON.stringify(swatchPreview.fills))
                    try { swatchFills[0] = figma.variables.setBoundVariableForPaint(swatchFills[0], 'color', colorVar) } catch (e) { }
                    swatchPreview.fills = swatchFills
                  } else {
                    // No variable found, use static color
                    const col: RGB = { r: s.color.r || 0, g: s.color.g || 0, b: s.color.b || 0 }
                    const alpha = (s.color.a !== undefined) ? s.color.a : 1
                    swatchPreview.fills = [{ type: 'SOLID', color: col, opacity: alpha } as Paint]
                  }
                  stopRow.appendChild(swatchPreview)

                  // Label - use variable name if found
                  const label = colorVar ? sanitizeName(colorVar.name) : resolveColorLabel(s.color)
                  const labelTxt = makeText(label, FONT_REGULAR, FONT_SIZE)
                  labelTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
                  stopRow.appendChild(labelTxt)

                  // Show hex alongside variable name
                  if (colorVar) {
                    const hex = figmaRGBToHex(s.color)
                    const hexTxt = makeText(hex, FONT_REGULAR, FONT_SIZE)
                    hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY]
                    stopRow.appendChild(hexTxt)
                  }
                }

                // Last position on its own line
                const lastPos = Math.round((first.gradientStops[first.gradientStops.length - 1]?.position || 1) * 100) + '%'
                const gradientFooter = makeText(lastPos, FONT_REGULAR, FONT_SIZE)
                gradientFooter.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
                valueColumn.appendChild(gradientFooter)
                
                valueStr = '' // Already rendered visually
              } else {
                valueStr = first.type ? String(first.type) : JSON.stringify(first)
              }
            }
          } else if (rawValue && typeof rawValue === 'object' && rawValue.effects) {
            // Effects array
            try {
              const parts: string[] = (rawValue.effects as any[]).map(e => {
                if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
                  const ox = Math.round((e.offset && e.offset.x) || 0)
                  const oy = Math.round((e.offset && e.offset.y) || 0)
                  const blur = Math.round(e.radius || 0)
                  const alpha = (e.color && e.color.a !== undefined) ? e.color.a : 1
                  const col = e.color ? figmaRGBToHex(e.color) : ''
                  return `${e.type} ${ox}px ${oy}px ${blur}px ${col} ${Math.round(alpha * 100)}%`
                }
                if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
                  return `${e.type} ${Math.round(e.radius || 0)}px`
                }
                return e.type
              })
              valueStr = parts.join('; ')
            } catch (e) {
              valueStr = JSON.stringify(rawValue.effects)
            }
          } else {
            valueStr = (rawValue !== undefined && rawValue !== null) ? rawValue.toString() : ''
          }
        }

        if (type === 'COLOR') {
          // color preview with indicator and optional fallback hex
          const previewRow: FrameNode = createAutolayout('preview-' + v.name + '-' + m.modeId, 'VERTICAL', GAP_PREVIEW_ITEMS)
          valueColumn.appendChild(previewRow)
          previewRow.layoutSizingHorizontal = 'FILL'

              const colorPreview = figma.createRectangle()
              colorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
              if (isAlias && 'cornerRadius' in colorPreview) colorPreview.cornerRadius = 4
              if (!isAlias && 'cornerRadius' in colorPreview) colorPreview.cornerRadius = 24
          const newFills = JSON.parse(JSON.stringify(colorPreview.fills))
          try { newFills[0] = figma.variables.setBoundVariableForPaint(newFills[0], 'color', v) } catch (e) { }
          colorPreview.fills = newFills
          colorPreview.strokes = [DARK_20]
          colorPreview.strokeWeight = 1
          colorPreview.layoutAlign = 'STRETCH'
          previewRow.appendChild(colorPreview)

          // Extract the actual rendered color from the indicator
          let displayHex = ''
          try {
            const fill = colorPreview.fills[0]
            if (fill && fill.type === 'SOLID' && fill.color) {
              displayHex = figmaRGBToHex(fill.color as any)
            }
          } catch (e) {
            console.error('Error extracting color from indicator:', e)
          }

          // Create vertical stack for color name + hex
          const textStack: FrameNode = createAutolayout('text-stack', 'VERTICAL', 4)
          previewRow.appendChild(textStack)
          textStack.layoutSizingHorizontal = 'FILL'

          if (isAlias) {
            // For aliases: show alias name + actual hex from preview
            const aliasName = sanitizeName(valueStr) // Contains the aliased variable name
            const labelText = makeText(aliasName, FONT_REGULAR, FONT_SIZE, false)
            labelText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
            labelText.layoutAlign = 'STRETCH'
            textStack.appendChild(labelText)

            // Always show hex for aliases using the preview color
            const hexText = makeText(displayHex || valueStr, FONT_REGULAR, FONT_SIZE, false)
            hexText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY]
            hexText.layoutAlign = 'STRETCH'
            textStack.appendChild(hexText)
          } else {
            // For non-aliases: show only hex value from preview
            const hexText = makeText(displayHex || valueStr, FONT_REGULAR, FONT_SIZE, false)
            hexText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY]
            hexText.layoutAlign = 'STRETCH'
            textStack.appendChild(hexText)
          }

        } else if (type === 'BOOLEAN') {
          const box = figma.createFrame()
          const isTrue = (String(valueStr).toLowerCase() === 'true')
          box.resizeWithoutConstraints(96, 50)
          box.cornerRadius = 12
          box.fills = isTrue ? [DARK] : []
          box.strokes = [DARK]
          box.strokeWeight = 2
          valueColumn.appendChild(box)
        } else if (type === 'FLOAT' && v.name.toLowerCase().includes('radius')) {
          // Radius variable - show preview with radius applied
          const radiusPreview = figma.createRectangle()
          radiusPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
          radiusPreview.fills = [COLOR_BG_LIGHT]
          // Bind the radius variable
          try {
            radiusPreview.setBoundVariable('topLeftRadius', v)
            radiusPreview.setBoundVariable('topRightRadius', v)
            radiusPreview.setBoundVariable('bottomLeftRadius', v)
            radiusPreview.setBoundVariable('bottomRightRadius', v)
          } catch (e) {
            // Fallback: just set the radius value directly
            const radiusValue = parseFloat(String(valueStr)) || 0
            radiusPreview.cornerRadius = radiusValue
          }
          valueColumn.appendChild(radiusPreview)
          
          // Also show the text value
          const txt = makeText((typeof valueStr === 'string') ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE)
          txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
          valueColumn.appendChild(txt)
        } else if (type === 'FLOAT' && (v.name.toLowerCase().includes('space') || v.name.toLowerCase().includes('spacing') || v.name.toLowerCase().includes('gap'))) {
          // Space/spacing variable - show preview with width equal to space value
          const spaceContainer: FrameNode = createAutolayout('space-preview', 'HORIZONTAL', 0)
          spaceContainer.counterAxisAlignItems = 'CENTER'
          valueColumn.appendChild(spaceContainer)
          
          // Left ellipse (8x8)
          const leftEllipse = figma.createEllipse()
          leftEllipse.resize(8, 8)
          leftEllipse.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BORDER]
          spaceContainer.appendChild(leftEllipse)
          
          // Rectangle with width bound to the variable
          const spacePreview = figma.createRectangle()
          spacePreview.resize(Math.max(parseFloat(String(valueStr)) || 1, 1), PREVIEW_HEIGHT)
          spacePreview.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BG_LIGHT]
          // Try to bind the width variable
          try {
            spacePreview.setBoundVariable('width', v)
          } catch (e) {
            // If binding fails, keep the static size
          }
          spaceContainer.appendChild(spacePreview)
          
          // Right ellipse (8x8)
          const rightEllipse = figma.createEllipse()
          rightEllipse.resize(8, 8)
          rightEllipse.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BORDER]
          spaceContainer.appendChild(rightEllipse)
          
          // Also show the text value
          const txt = makeText((typeof valueStr === 'string') ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE)
          txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
          valueColumn.appendChild(txt)
        } else {
          const txt = makeText((typeof valueStr === 'string') ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE)
          txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
          valueColumn.appendChild(txt)
        }
      }
    }
  }
}

async function writeStyles(onProgress?: (text: string) => void) {
  // Get all modes from all active collections for styles that might reference variables
  const allModes: { collectionId: string, modeId: string, name: string }[] = []
  for (const c of activeCollections) {
    for (const m of c.modes) {
      allModes.push({ collectionId: c.id, modeId: m.modeId, name: m.name })
    }
  }
  // Filter out default "Mode 1" if there are other modes
  let modes = allModes.filter(m => m.name !== DEFAULT_MODE_NAME)
  // If no modes left after filtering, use single default mode
  if (modes.length === 0) {
    modes = [{ collectionId: '', modeId: '', name: 'Value' }]
  }

  // Paint / Color styles (row-driven, matching variables structure)
  const paintStyles = figma.getLocalPaintStyles().filter(s => activeColorStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name))
  if (paintStyles.length) {
    const collectionBox: FrameNode = createAutolayout('Color', 'VERTICAL', GAP_BETWEEN_SECTIONS, 0, 0)
    collectionBox.fills = [LIGHT]
    collectionBox.layoutSizingVertical = 'HUG'
    collectionBox.layoutSizingHorizontal = 'HUG'
    collectionBox.minWidth = MAX_COLUMN_WIDTH
    stylesFrame.appendChild(collectionBox)

    // Header row: "Color" title on left, mode names on right
    const headerRow: FrameNode = createAutolayout('color-styles-header', 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
    collectionBox.appendChild(headerRow)
    headerRow.layoutSizingHorizontal = 'HUG'
    headerRow.minWidth = MAX_COLUMN_WIDTH
    headerRow.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    headerRow.strokeWeight = 1
    headerRow.dashPattern = [4, 4]
    headerRow.strokeBottomWeight = 1
    headerRow.strokeTopWeight = 0
    headerRow.strokeLeftWeight = 0
    headerRow.strokeRightWeight = 0

    // Left header cell
    const leftHeader: FrameNode = createAutolayout('left-header', 'VERTICAL', 4, ROW_PADDING, ROW_PADDING)
    headerRow.appendChild(leftHeader)
    leftHeader.layoutSizingHorizontal = 'FIXED'
    leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height)
    const cHeader = makeText('Color', FONT_SEMIBOLD, L_FONT_SIZE)
    addToColumn(leftHeader, cHeader)

    // Mode headers (fixed-width columns)
    for (const m of modes) {
      const headerCell: FrameNode = createAutolayout('mode-header-' + m.modeId, 'VERTICAL', 0, ROW_PADDING, ROW_PADDING)
      headerRow.appendChild(headerCell)
      headerCell.layoutSizingHorizontal = 'HUG'
      headerCell.layoutSizingVertical = 'FILL'
      headerCell.minWidth = MIN_MODE_COLUMN_WIDTH
      if (modes.length > 2) headerCell.maxWidth = 500
      headerCell.primaryAxisAlignItems = 'CENTER'
      headerCell.counterAxisAlignItems = 'CENTER'
      
      if (m.name.toLowerCase() === 'dark') {
        headerCell.fills = [COLOR_DARK_MODE_BG]
        headerCell.topLeftRadius = 16
        headerCell.topRightRadius = 16
      }
      
      const valueHeader = makeText((m.name === DEFAULT_MODE_NAME && modes.length === 1) ? 'Value' : m.name, FONT_SEMIBOLD, FONT_SIZE)
      valueHeader.fills = m.name.toLowerCase() === 'dark' ? [COLOR_DARK_MODE_TEXT] : [{ type: 'SOLID', color: hexToRGB('#000000') }]
      addToColumn(headerCell, valueHeader)
      valueHeader.textAlignVertical = 'CENTER'
    }

    // Rows: one per style
    for (const s of paintStyles) {
      if (onProgress) onProgress('Color style: ' + s.name)
      const row: FrameNode = createAutolayout('row-' + s.name, 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
      collectionBox.appendChild(row)
      row.layoutSizingHorizontal = 'HUG'
      row.minWidth = MAX_COLUMN_WIDTH
      
      // Add border to all except last
      const isLast = paintStyles.indexOf(s) === paintStyles.length - 1
      if (!isLast) {
        row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
        row.strokeWeight = 1
        row.dashPattern = [4, 4]
        row.strokeBottomWeight = 1
        row.strokeTopWeight = 0
        row.strokeLeftWeight = 0
        row.strokeRightWeight = 0
      }

      // Left cell: name + description
      const leftCell: FrameNode = createAutolayout('left-' + s.name, 'VERTICAL', 4)
      row.appendChild(leftCell)
      leftCell.layoutSizingHorizontal = 'FIXED'
      leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height)
      leftCell.paddingTop = ROW_PADDING
      leftCell.paddingBottom = ROW_PADDING
      leftCell.paddingLeft = ROW_PADDING
      leftCell.paddingRight = ROW_PADDING

      const sName = makeText(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE)
      addToColumn(leftCell, sName)
      const sDesc = makeText(s.description || 'no description', FONT_REGULAR, 14)
      sDesc.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(leftCell, sDesc)

      // Right cells: one per mode
      for (const m of modes) {
        const isDark = m.name.toLowerCase() === 'dark'
        const isLastRow = paintStyles.indexOf(s) === paintStyles.length - 1
        const valueColumn: FrameNode = createAutolayout('value-' + s.name + '-' + m.modeId, 'VERTICAL', isDark ? 8 : 8)
        row.appendChild(valueColumn)
        valueColumn.layoutSizingHorizontal = 'HUG'
        valueColumn.layoutSizingVertical = 'FILL'
        valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH
        if (modes.length > 2) valueColumn.maxWidth = 500
        
        if (m.collectionId) {
          valueColumn.setExplicitVariableModeForCollection(m.collectionId, m.modeId)
        }
        
        // Add mode-appropriate background
        if (isDark) {
          valueColumn.fills = [COLOR_DARK_MODE_BG]
          valueColumn.strokes = [COLOR_DARK_MODE_BORDER]
          valueColumn.strokeWeight = 1
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
          if (isLastRow) {
            valueColumn.bottomLeftRadius = 16
            valueColumn.bottomRightRadius = 16
          }
        } else {
          valueColumn.fills = []
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
        }

        // Color preview with style applied
        const colorPreview = figma.createRectangle()
        colorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
        colorPreview.cornerRadius = 24
        if (m.collectionId) {
          colorPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId)
        }
        // @ts-ignore - fillStyleId is supported on shapes
        colorPreview.fillStyleId = s.id
        colorPreview.layoutAlign = 'STRETCH'
        valueColumn.appendChild(colorPreview)

        // Get the paint to show additional details
        const paints = s.paints || []
        if (paints.length > 0) {
          const paint: any = paints[0]
          if (paint.type === 'SOLID' && paint.color) {
            // Show hex value
            const hex = figmaRGBToHex(paint.color as any)
            const hexTxt = makeText(hex, FONT_REGULAR, FONT_SIZE)
            hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
            valueColumn.appendChild(hexTxt)
          } else if (paint.type && paint.type.includes('GRADIENT') && paint.gradientStops) {
            // Show gradient details
            const gtype = paint.type.replace(/^GRADIENT_?/i, '')
            const gradientType = gtype.charAt(0).toUpperCase() + gtype.slice(1).toLowerCase()
            
            // Header: gradient type + first position
            const firstPos = Math.round((paint.gradientStops[0]?.position || 0) * 100) + '%'
            const gradientHeader = makeText(gradientType + ' — ' + firstPos, FONT_REGULAR, FONT_SIZE)
            gradientHeader.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
            valueColumn.appendChild(gradientHeader)

            // Render each stop with swatch + variable name (or hex)
            for (const stop of paint.gradientStops) {
              const stopRow: FrameNode = createAutolayout('gradient-stop', 'HORIZONTAL', GAP_SWATCH_ITEMS)
              valueColumn.appendChild(stopRow)

              // Find variable that matches this stop's color
              let colorVar: Variable | null = null
              if (m.collectionId) {
                colorVar = resolveColorVariableForMode(stop.color, m.collectionId, m.modeId)
              }
              
              // Create swatch
              const swatchPreview = figma.createRectangle()
              swatchPreview.resize(SWATCH_SIZE, SWATCH_SIZE)
              swatchPreview.cornerRadius = BORDER_RADIUS_SM
              
              if (colorVar && m.collectionId) {
                // Bind to variable
                swatchPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId)
                const swatchFills = JSON.parse(JSON.stringify(swatchPreview.fills))
                try { swatchFills[0] = figma.variables.setBoundVariableForPaint(swatchFills[0], 'color', colorVar) } catch (e) { }
                swatchPreview.fills = swatchFills
              } else {
                // No variable found, use static color
                const col: RGB = { r: stop.color.r || 0, g: stop.color.g || 0, b: stop.color.b || 0 }
                const alpha = (stop.color.a !== undefined) ? stop.color.a : 1
                swatchPreview.fills = [{ type: 'SOLID', color: col, opacity: alpha } as Paint]
              }
              stopRow.appendChild(swatchPreview)

              // Label - use variable name if found
              const label = colorVar ? sanitizeName(colorVar.name) : resolveColorLabel(stop.color)
              const labelTxt = makeText(label, FONT_REGULAR, FONT_SIZE)
              labelTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
              stopRow.appendChild(labelTxt)

              // Show hex alongside variable name
              if (colorVar) {
                const hex = figmaRGBToHex(stop.color)
                const hexTxt = makeText(hex, FONT_REGULAR, FONT_SIZE)
                hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY]
                stopRow.appendChild(hexTxt)
              }
            }

            // Last position on its own line
            const lastPos = Math.round((paint.gradientStops[paint.gradientStops.length - 1]?.position || 1) * 100) + '%'
            const gradientFooter = makeText(lastPos, FONT_REGULAR, FONT_SIZE)
            gradientFooter.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK]
            valueColumn.appendChild(gradientFooter)
          }
        }
      }
    }
  }

  // Effect styles
  const effectStyles = figma.getLocalEffectStyles().filter(s => activeEffectStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name))
  if (effectStyles.length) {
    const collectionBox: FrameNode = createAutolayout('Effects', 'VERTICAL', GAP_BETWEEN_SECTIONS, 0, 0)
    collectionBox.fills = [LIGHT]
    collectionBox.layoutSizingVertical = 'HUG'
    collectionBox.layoutSizingHorizontal = 'HUG'
    collectionBox.minWidth = MAX_COLUMN_WIDTH
    stylesFrame.appendChild(collectionBox)

    // Header row: "Effects" title on left, mode names on right
    const headerRow: FrameNode = createAutolayout('effect-styles-header', 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
    collectionBox.appendChild(headerRow)
    headerRow.layoutSizingHorizontal = 'HUG'
    headerRow.minWidth = MAX_COLUMN_WIDTH
    headerRow.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    headerRow.strokeWeight = 1
    headerRow.dashPattern = [4, 4]
    headerRow.strokeBottomWeight = 1
    headerRow.strokeTopWeight = 0
    headerRow.strokeLeftWeight = 0
    headerRow.strokeRightWeight = 0

    // Left header cell
    const leftHeader: FrameNode = createAutolayout('left-header', 'VERTICAL', 4, ROW_PADDING, ROW_PADDING)
    headerRow.appendChild(leftHeader)
    leftHeader.layoutSizingHorizontal = 'FIXED'
    leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height)
    const cHeader = makeText('Effects', FONT_SEMIBOLD, L_FONT_SIZE)
    addToColumn(leftHeader, cHeader)

    // Mode headers (fixed-width columns)
    for (const m of modes) {
      const headerCell: FrameNode = createAutolayout('mode-header-' + m.modeId, 'VERTICAL', 0, ROW_PADDING, ROW_PADDING)
      headerRow.appendChild(headerCell)
      headerCell.layoutSizingHorizontal = 'HUG'
      headerCell.layoutSizingVertical = 'FILL'
      headerCell.minWidth = MIN_MODE_COLUMN_WIDTH
      if (modes.length > 2) headerCell.maxWidth = 500
      headerCell.primaryAxisAlignItems = 'CENTER'
      headerCell.counterAxisAlignItems = 'CENTER'
      
      if (m.name.toLowerCase() === 'dark') {
        headerCell.fills = [COLOR_DARK_MODE_BG]
        headerCell.topLeftRadius = 16
        headerCell.topRightRadius = 16
      }
      
      const valueHeader = makeText((m.name === DEFAULT_MODE_NAME && modes.length === 1) ? 'Value' : m.name, FONT_SEMIBOLD, FONT_SIZE)
      valueHeader.fills = m.name.toLowerCase() === 'dark' ? [COLOR_DARK_MODE_TEXT] : [{ type: 'SOLID', color: hexToRGB('#000000') }]
      addToColumn(headerCell, valueHeader)
      valueHeader.textAlignVertical = 'CENTER'
    }

    // Rows: one per effect style
    for (const s of effectStyles) {
      if (onProgress) onProgress('Effect style: ' + s.name)
      const row: FrameNode = createAutolayout('row-' + s.name, 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
      collectionBox.appendChild(row)
      row.layoutSizingHorizontal = 'HUG'
      row.minWidth = MAX_COLUMN_WIDTH
      
      // Add border to all except last
      const isLast = effectStyles.indexOf(s) === effectStyles.length - 1
      if (!isLast) {
        row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
        row.strokeWeight = 1
        row.dashPattern = [4, 4]
        row.strokeBottomWeight = 1
        row.strokeTopWeight = 0
        row.strokeLeftWeight = 0
        row.strokeRightWeight = 0
      }

      // Left cell: name + description (vertical)
      const leftCell: FrameNode = createAutolayout('left-' + s.name, 'VERTICAL', 4)
      row.appendChild(leftCell)
      leftCell.layoutSizingHorizontal = 'FIXED'
      leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height)
      leftCell.paddingTop = ROW_PADDING
      leftCell.paddingBottom = ROW_PADDING
      leftCell.paddingLeft = ROW_PADDING
      leftCell.paddingRight = ROW_PADDING

      const sName = makeText(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE)
      addToColumn(leftCell, sName)
      const sDesc = makeText(s.description || 'no description', FONT_REGULAR, 14)
      sDesc.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(leftCell, sDesc)

      // Right cells: one per mode
      for (const m of modes) {
        const isDark = m.name.toLowerCase() === 'dark'
        const isLastRow = effectStyles.indexOf(s) === effectStyles.length - 1
        const valueColumn: FrameNode = createAutolayout('value-' + s.name + '-' + m.modeId, 'VERTICAL', isDark ? 8 : 8)
        row.appendChild(valueColumn)
        valueColumn.layoutSizingHorizontal = 'HUG'
        valueColumn.layoutSizingVertical = 'FILL'
        valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH
        if (modes.length > 2) valueColumn.maxWidth = 500
        
        if (m.collectionId) {
          valueColumn.setExplicitVariableModeForCollection(m.collectionId, m.modeId)
        }
        
        // Add mode-appropriate background
        if (isDark) {
          valueColumn.fills = [COLOR_DARK_MODE_BG]
          valueColumn.strokes = [COLOR_DARK_MODE_BORDER]
          valueColumn.strokeWeight = 1
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
          if (isLastRow) {
            valueColumn.bottomLeftRadius = 16
            valueColumn.bottomRightRadius = 16
          }
        } else {
          valueColumn.fills = []
          valueColumn.paddingTop = ROW_PADDING
          valueColumn.paddingBottom = ROW_PADDING
          valueColumn.paddingLeft = ROW_PADDING
          valueColumn.paddingRight = ROW_PADDING
        }

        // Effect preview
        const effectPreview = figma.createRectangle()
        effectPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
        effectPreview.cornerRadius = 6
        effectPreview.fills = [{ type: 'SOLID', color: hexToRGB('#ffffff') }]
        if (m.collectionId) {
          effectPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId)
        }
        // @ts-ignore - effectStyleId is supported on shapes
        effectPreview.effectStyleId = s.id
        effectPreview.layoutAlign = 'STRETCH'
        valueColumn.appendChild(effectPreview)

        // Effect description
        const effects = s.effects || []
        if (effects.length > 0) {
          for (const effect of effects) {
            let effectText = ''
            if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
              const ox = Math.round((effect.offset?.x || 0))
              const oy = Math.round((effect.offset?.y || 0))
              const blur = Math.round(effect.radius || 0)
              const alpha = (effect.color?.a !== undefined) ? effect.color.a : 1
              effectText = `${effect.type.replace('_', ' ').toLowerCase()}: ${ox}x ${oy}y ${blur}px ${Math.round(alpha * 100)}%`
            } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
              const blur = Math.round(effect.radius || 0)
              effectText = `${effect.type.replace('_', ' ').toLowerCase()}: ${blur}px`
            } else {
              effectText = effect.type.replace('_', ' ').toLowerCase()
            }
            const txt = makeText(effectText, FONT_REGULAR, FONT_SIZE)
            txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY]
            valueColumn.appendChild(txt)
          }
        }
      }
    }
  }

  // Text styles
  const textStyles = figma.getLocalTextStyles().filter(s => activeTextStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name))
  if (textStyles.length) {
    const collectionBox: FrameNode = createAutolayout('Text', 'VERTICAL', GAP_BETWEEN_SECTIONS, 0, 0)
    collectionBox.fills = [LIGHT]
    collectionBox.layoutSizingVertical = 'HUG'
    collectionBox.layoutSizingHorizontal = 'HUG'
    collectionBox.minWidth = MAX_COLUMN_WIDTH
    stylesFrame.appendChild(collectionBox)

    // header row (collection title on left, preview header on right)
    const headerRow: FrameNode = createAutolayout('text-styles-header', 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
    collectionBox.appendChild(headerRow)
    headerRow.layoutSizingHorizontal = 'HUG'
    headerRow.minWidth = MAX_COLUMN_WIDTH
    headerRow.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    headerRow.strokeWeight = 1
    headerRow.dashPattern = [4, 4]
    headerRow.strokeBottomWeight = 1
    headerRow.strokeTopWeight = 0
    headerRow.strokeLeftWeight = 0
    headerRow.strokeRightWeight = 0
    const leftHeaderT = createAutolayout('left-header', 'VERTICAL', 4, ROW_PADDING, ROW_PADDING)
    headerRow.appendChild(leftHeaderT)
    leftHeaderT.layoutSizingHorizontal = 'FIXED'
    leftHeaderT.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeaderT.height)
    const tHeader = makeText('Text', FONT_SEMIBOLD, L_FONT_SIZE)
    addToColumn(leftHeaderT, tHeader)

    const headerCellPreviewT: FrameNode = createAutolayout('value-header-cell', 'VERTICAL', 0, ROW_PADDING, ROW_PADDING, 'FILL')
    headerRow.appendChild(headerCellPreviewT)
    headerCellPreviewT.layoutSizingHorizontal = 'FILL'
    const valueHeaderT = makeText('Value', FONT_SEMIBOLD, FONT_SIZE)
    addToColumn(headerCellPreviewT, valueHeaderT)
    valueHeaderT.textAlignVertical = 'CENTER'

    for (const s of textStyles) {
      if (onProgress) onProgress('Text style: ' + s.name)
      const row: FrameNode = createAutolayout('text-row-' + s.name, 'HORIZONTAL', GAP_BETWEEN_ROWS, ROW_PADDING, ROW_PADDING, 'HUG')
      collectionBox.appendChild(row)
      row.layoutSizingHorizontal = 'HUG'
      row.minWidth = MAX_COLUMN_WIDTH

      // Add border to all except last
      const isLast = textStyles.indexOf(s) === textStyles.length - 1
      if (!isLast) {
        row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
        row.strokeWeight = 1
        row.dashPattern = [4, 4]
        row.strokeBottomWeight = 1
        row.strokeTopWeight = 0
        row.strokeLeftWeight = 0
        row.strokeRightWeight = 0
      }

      const leftCell = createAutolayout('left-' + s.name, 'VERTICAL', 4)
      row.appendChild(leftCell)
      leftCell.layoutSizingHorizontal = 'FIXED'
      leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height)

      const sName = makeText(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE)
      addToColumn(leftCell, sName)
      const sDesc = makeText((s as any).description || 'no description', FONT_REGULAR, 14)
      sDesc.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(leftCell, sDesc)

      const valueCell = createAutolayout('value-' + s.name, 'VERTICAL', 6)
      row.appendChild(valueCell)
      valueCell.layoutSizingHorizontal = 'HUG'
      valueCell.minWidth = MIN_MODE_COLUMN_WIDTH

      // Create a text preview and try to assign the text style
      const previewText = makeText(sanitizeName(s.name), FONT_REGULAR, FONT_SIZE)
      try {
        // @ts-ignore - assign the style id so the preview uses the style
        previewText.textStyleId = s.id
      } catch (e) {
        // Fallback: set fontName/size if available
        try {
          if ((s as any).fontName) previewText.fontName = (s as any).fontName
          if ((s as any).fontSize) previewText.fontSize = (s as any).fontSize
        } catch (e) {}
      }
      previewText.layoutAlign = 'STRETCH'
      valueCell.appendChild(previewText)

      // Add property values below preview
      const ts = s as any
      
      // fontFamily
      if (ts.fontName) {
        const fontFamily = (typeof ts.fontName === 'object' && ts.fontName.family) ? ts.fontName.family : (typeof ts.fontName === 'string' ? ts.fontName : '')
        if (fontFamily) {
          const fontFamilyTxt = makeText('fontFamily: ' + fontFamily, FONT_REGULAR, 18)
          fontFamilyTxt.fills = [COLOR_TEXT_SECONDARY]
          fontFamilyTxt.layoutAlign = 'STRETCH'
          valueCell.appendChild(fontFamilyTxt)
        }
        
        // fontWeight/fontStyle
        const fontStyle = (typeof ts.fontName === 'object' && ts.fontName.style) ? ts.fontName.style : ''
        if (fontStyle) {
          const fontWeightTxt = makeText('fontWeight: ' + fontStyle, FONT_REGULAR, 18)
          fontWeightTxt.fills = [COLOR_TEXT_SECONDARY]
          fontWeightTxt.layoutAlign = 'STRETCH'
          valueCell.appendChild(fontWeightTxt)
        }
      }
      
      // fontSize
      if (typeof ts.fontSize !== 'undefined' && ts.fontSize !== null) {
        const fontSizeTxt = makeText('fontSize: ' + ts.fontSize + 'px', FONT_REGULAR, 18)
        fontSizeTxt.fills = [COLOR_TEXT_SECONDARY]
        fontSizeTxt.layoutAlign = 'STRETCH'
        valueCell.appendChild(fontSizeTxt)
      }
      
      // lineHeight
      if (typeof ts.lineHeight !== 'undefined' && ts.lineHeight !== null) {
        const lh = (typeof ts.lineHeight === 'object' && ts.lineHeight.value !== undefined) ? ts.lineHeight.value : ts.lineHeight
        const unit = (typeof ts.lineHeight === 'object' && ts.lineHeight.unit) ? ts.lineHeight.unit : '%'
        const displayUnit = unit === 'PERCENT' ? '%' : unit
        const displayValue = unit === 'PERCENT' ? Math.round(lh * 100) / 100 : lh
        const lineHeightTxt = makeText('lineHeight: ' + displayValue + displayUnit, FONT_REGULAR, 18)
        lineHeightTxt.fills = [COLOR_TEXT_SECONDARY]
        lineHeightTxt.layoutAlign = 'STRETCH'
        valueCell.appendChild(lineHeightTxt)
      }
      
      // letterSpacing
      if (typeof ts.letterSpacing !== 'undefined' && ts.letterSpacing !== null) {
        const ls = (typeof ts.letterSpacing === 'object' && ts.letterSpacing.value !== undefined) ? ts.letterSpacing.value : ts.letterSpacing
        const unit = (typeof ts.letterSpacing === 'object' && ts.letterSpacing.unit) ? ts.letterSpacing.unit : 'px'
        const displayUnit = unit === 'PERCENT' ? '%' : unit
        const displayValue = unit === 'PERCENT' ? Math.round(ls * 100) / 100 : ls
        const letterSpacingTxt = makeText('letterSpacing: ' + displayValue + displayUnit, FONT_REGULAR, 18)
        letterSpacingTxt.fills = [COLOR_TEXT_SECONDARY]
        letterSpacingTxt.layoutAlign = 'STRETCH'
        valueCell.appendChild(letterSpacingTxt)
      }
      
      // paragraphSpacing
      if (typeof ts.paragraphSpacing !== 'undefined' && ts.paragraphSpacing !== null) {
        const unit = (ts as any).paragraphSpacingUnit || 'px'
        const paragraphSpacingTxt = makeText('paragraphSpacing: ' + ts.paragraphSpacing + unit, FONT_REGULAR, 18)
        paragraphSpacingTxt.fills = [COLOR_TEXT_SECONDARY]
        paragraphSpacingTxt.layoutAlign = 'STRETCH'
        valueCell.appendChild(paragraphSpacingTxt)
      }

    }
  }

  const layoutStyles = figma.getLocalGridStyles().filter(s => activeLayoutStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name))
  // Cleanup any stray top-level grid preview frames created previously
  try {
    for (const child of figma.currentPage.children.slice()) {
      if (child.name && child.name.startsWith && child.name.startsWith('grid-')) {
        if (child.parent === figma.currentPage) child.remove()
      }
    }
  } catch (e) {
    // ignore
  }
  if (layoutStyles.length) {
    const collectionBox: FrameNode = createAutolayout('Layout', 'VERTICAL', GAP_BETWEEN_SECTIONS, 0, 0)
    collectionBox.fills = [LIGHT]
    collectionBox.layoutSizingVertical = 'HUG'
    collectionBox.layoutSizingHorizontal = 'HUG'
    collectionBox.minWidth = MAX_COLUMN_WIDTH
    stylesFrame.appendChild(collectionBox)

    // header row (collection title on left, preview header on right)
    const headerRow: FrameNode = createAutolayout('layout-styles-header', 'HORIZONTAL', GAP_BETWEEN_ROWS, 0, 0, 'HUG')
    collectionBox.appendChild(headerRow)
    headerRow.layoutSizingHorizontal = 'HUG'
    headerRow.minWidth = MAX_COLUMN_WIDTH
    headerRow.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
    headerRow.strokeWeight = 1
    headerRow.dashPattern = [4, 4]
    headerRow.strokeBottomWeight = 1
    headerRow.strokeTopWeight = 0
    headerRow.strokeLeftWeight = 0
    headerRow.strokeRightWeight = 0
    const leftHeaderL = createAutolayout('left-header', 'VERTICAL', 4, ROW_PADDING, ROW_PADDING)
    headerRow.appendChild(leftHeaderL)
    leftHeaderL.layoutSizingHorizontal = 'FIXED'
    leftHeaderL.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeaderL.height)
    const lHeader = makeText('Layout', FONT_SEMIBOLD, L_FONT_SIZE)
    addToColumn(leftHeaderL, lHeader)

    const headerCellPreviewL: FrameNode = createAutolayout('value-header-cell', 'VERTICAL', 0, ROW_PADDING, ROW_PADDING, 'FILL')
    headerRow.appendChild(headerCellPreviewL)
    headerCellPreviewL.layoutSizingHorizontal = 'FILL'
    const valueHeaderL = makeText('Value', FONT_SEMIBOLD, FONT_SIZE)
    addToColumn(headerCellPreviewL, valueHeaderL)
    valueHeaderL.textAlignVertical = 'CENTER'

    for (const s of layoutStyles) {
      if (onProgress) onProgress('Layout style: ' + s.name)
      const row: FrameNode = createAutolayout('layout-row-' + s.name, 'HORIZONTAL', GAP_BETWEEN_ROWS, ROW_PADDING, ROW_PADDING, 'HUG')
      collectionBox.appendChild(row)
      row.layoutSizingHorizontal = 'HUG'
      row.minWidth = MAX_COLUMN_WIDTH
      
      // Add border to all except last
      const isLast = layoutStyles.indexOf(s) === layoutStyles.length - 1
      if (!isLast) {
        row.strokes = [{ type: 'SOLID', color: hexToRGB('#cccccc') }]
        row.strokeWeight = 1
        row.dashPattern = [4, 4]
        row.strokeBottomWeight = 1
        row.strokeTopWeight = 0
        row.strokeLeftWeight = 0
        row.strokeRightWeight = 0
      }

      const leftCell = createAutolayout('left-' + s.name, 'VERTICAL', 4)
      row.appendChild(leftCell)
      leftCell.layoutSizingHorizontal = 'FIXED'
      leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height)

      const sName = makeText(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE)
      addToColumn(leftCell, sName)
      const sDesc = makeText(s.description || 'no description', FONT_REGULAR, 14)
      sDesc.fills = [COLOR_TEXT_SECONDARY]
      addToColumn(leftCell, sDesc)

      const valueCell = createAutolayout('value-' + s.name, 'VERTICAL', 6)
      row.appendChild(valueCell)
      valueCell.layoutSizingHorizontal = 'FILL'

      const grids = (s as any).layoutGrids || []
      if (grids.length === 0) {
        const info = makeText('No grids defined', FONT_REGULAR, FONT_SIZE)
        valueCell.appendChild(info)
      } else {
        for (const g of grids) {
          const pattern = (g.pattern || 'COLUMNS')
          const patternLabel = pattern === 'COLUMNS' ? 'Columns' : (pattern === 'ROWS' ? 'Rows' : 'Grid')

          const gridBox: FrameNode = createAutolayout('grid-' + patternLabel, 'VERTICAL', 6, 6, 6, 'FILL')
          gridBox.fills = []
          gridBox.resizeWithoutConstraints(260, 80)

          // header: pattern name
          const header = makeText(patternLabel, FONT_SEMIBOLD, FONT_SIZE)
          addToColumn(gridBox, header)

          // Create a small info row
          const infoRow: FrameNode = createAutolayout('grid-info', 'HORIZONTAL', GAP_SWATCH_ITEMS)

          // Count
          const countTxt = makeText('Count: ' + (g.count !== undefined ? String(g.count) : '-'), FONT_REGULAR, FONT_SIZE)
          addToColumn(infoRow, countTxt)

          // Gutter
          const gutterTxt = makeText('Gutter: ' + (g.gutterSize !== undefined ? String(g.gutterSize) : '-'), FONT_REGULAR, FONT_SIZE)
          addToColumn(infoRow, gutterTxt)

          // Offset / Margin
          const offsetTxt = makeText('Margin: ' + (g.offset !== undefined ? String(g.offset) : '-'), FONT_REGULAR, FONT_SIZE)
          addToColumn(infoRow, offsetTxt)

          // Section size / Width
          const sizeUnit = (g as any).sectionSizeUnit || (g.sectionSize ? 'px' : '')
          const widthTxt = makeText('Width: ' + (g.sectionSize !== undefined ? String(g.sectionSize) + sizeUnit : 'Auto'), FONT_REGULAR, FONT_SIZE)
          addToColumn(infoRow, widthTxt)

          gridBox.appendChild(infoRow)

          // Type / alignment
          const typeTxt = makeText('Type: ' + (g.alignment || (g.sectionSize ? 'Fixed' : 'Stretch')), FONT_REGULAR, FONT_SIZE)
          addToColumn(gridBox, typeTxt)

          // Color swatch if present
          if (g.color) {
            const swatchRow: FrameNode = createAutolayout('swatch-row', 'HORIZONTAL', GAP_SWATCH_ITEMS)
            const gridColorPreview = figma.createRectangle()
            gridColorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT)
            const colorObj = g.color
            // @ts-ignore
            const col: RGB = { r: colorObj.r || 0, g: colorObj.g || 0, b: colorObj.b || 0 }
            // @ts-ignore
            const alpha = (colorObj.a !== undefined) ? colorObj.a : 1
            gridColorPreview.fills = [{ type: 'SOLID', color: col, opacity: alpha } as Paint]
            addToColumn(swatchRow, gridColorPreview)

            const hex = figmaRGBToHex(colorObj as any)
            const hexTxt = makeText(hex + (alpha !== 1 ? (' ' + Math.round(alpha * 100) + '%') : ''), FONT_REGULAR, FONT_SIZE)
            addToColumn(swatchRow, hexTxt)
            gridBox.appendChild(swatchRow)
          }

          // Preview bar: visualize columns/gutters/offset
          const previewHeight = 50
          const previewWidth = Math.min(MAX_COLUMN_WIDTH / 2, 720)
          const preview = createAutolayout('grid-preview', 'HORIZONTAL', g.gutterSize || 8, Math.max(0, g.offset || 0), 0)
          gridBox.appendChild(preview)
          preview.resizeWithoutConstraints(previewWidth, previewHeight)

          const previewCount = Math.min((g.count || 1), 8)
          for (let i = 0; i < previewCount; i++) {
            const columnPreview = figma.createRectangle()
            if (g.sectionSize && g.sectionSize > 0) {
              columnPreview.resizeWithoutConstraints(Math.max(8, g.sectionSize), previewHeight)
            } else {
              columnPreview.resizeWithoutConstraints(20, previewHeight)
              // @ts-ignore
              columnPreview.layoutGrow = 1
            }
            if (g.color) {
              const colorObj = g.color
              // @ts-ignore
              const col: RGB = { r: colorObj.r || 0, g: colorObj.g || 0, b: colorObj.b || 0 }
              // @ts-ignore
              const alpha = (colorObj.a !== undefined) ? colorObj.a : 1
              columnPreview.fills = [{ type: 'SOLID', color: col, opacity: alpha } as Paint]
            } else {
              columnPreview.fills = [COLOR_BG_LIGHT]
            }
            preview.appendChild(columnPreview)
          }

          if ((g.count || 0) > previewCount) {
            const more = makeText('… (' + (g.count || 0) + ' total)', FONT_REGULAR, FONT_SIZE)
            addToColumn(gridBox, more)
          }

          addToColumn(valueCell, gridBox)
          gridBox.layoutSizingHorizontal = 'FILL'
          preview.layoutSizingHorizontal = 'FILL'
        }
      }
    }
  }
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
  autolayout.layoutSizingVertical = sizingY
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
  else text = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)]
  notify(text)
  try {
    figma.ui.postMessage({ type: 'tokens-status', text: text })
    figma.ui.postMessage({ type: 'tokens-resync-state', available: !!findTokensDocFrame() })
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
