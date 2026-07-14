// Component module — spec sheet documentation (anatomy, properties, spacing, styles).
// Merged from '/Users/edward/Dropbox/Main/Code/Figma Plugins/Component Spec' (Jul 2026).
// Module-scoped (bundled by esbuild), so top-level names don't collide with variables.ts.
// Exports: registerSpecSelectionTracking, handleSpecMessage — driven by main.ts,
// which owns the unified UI.
/// <reference types="@figma/plugin-typings" />

/**
 * Component Spec – Visual Annotation Engine
 * Generates dev-ready handoff specs:
 *   1. Anatomy Overlay  – numbered callouts on each child + legend
 *   2. Component Diff    – table of overridden properties vs. default
 *   3. Layout Redlines   – semi-transparent padding rects + dashed gap lines
 *   4. Spec Panel        – textual specification frame
 */

var SPEC_PREFIX = 'Specs-';
var FONT_REGULAR: FontName = { family: 'Inter', style: 'Regular' };
var FONT_MEDIUM: FontName  = { family: 'Inter', style: 'Medium' };
var FONT_BOLD: FontName    = { family: 'Inter', style: 'Bold' };

function resolveLocalFonts(selectionNodes?: readonly SceneNode[]): void {
  function weightOf(styleName: string): number {
    var s = (styleName || '').toLowerCase();
    if (s === 'thin' || s.indexOf('hairline') >= 0) return 100;
    if (s.indexOf('extralight') >= 0 || s.indexOf('extra light') >= 0 || s.indexOf('ultralight') >= 0) return 200;
    if (s === 'light') return 300;
    if (s === 'regular' || s === 'book' || s === 'roman' || s === 'normal' || s === 'text') return 400;
    if (s === 'medium') return 500;
    if (s.indexOf('semibold') >= 0 || s.indexOf('semi bold') >= 0 || s.indexOf('demi') >= 0) return 600;
    if (s === 'bold') return 700;
    if (s.indexOf('extrabold') >= 0 || s.indexOf('extra bold') >= 0) return 800;
    if (s.indexOf('black') >= 0 || s.indexOf('heavy') >= 0) return 900;
    return 400;
  }

  // Collect FontName candidates: component text layers first, then local text styles
  var candidates: FontName[] = [];
  var seen: { [key: string]: boolean } = {};

  function addFont(fn: any): void {
    if (!fn || typeof fn !== 'object' || !fn.family || !fn.style) return;
    var key = fn.family + '|' + fn.style;
    if (seen[key]) return;
    seen[key] = true;
    candidates.push({ family: fn.family, style: fn.style });
  }

  function walkNode(node: any): void {
    if (!node) return;
    if (node.type === 'TEXT') {
      var fn = node.fontName;
      if (fn && fn !== figma.mixed) addFont(fn);
    }
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) walkNode(kids[i]);
  }

  if (selectionNodes) {
    for (var si = 0; si < selectionNodes.length; si++) walkNode(selectionNodes[si]);
  }

  // Supplement with local text styles (covers files where styles are defined locally)
  try {
    var localStyles = figma.getLocalTextStyles();
    for (var ls = 0; ls < localStyles.length; ls++) addFont(localStyles[ls].fontName);
  } catch (e) {}

  if (candidates.length === 0) return;

  function closest(target: number): FontName | null {
    var best: FontName | null = null;
    var bestDiff = Infinity;
    for (var ci = 0; ci < candidates.length; ci++) {
      var diff = Math.abs(weightOf(candidates[ci].style) - target);
      if (diff < bestDiff) { bestDiff = diff; best = candidates[ci]; }
    }
    return best;
  }

  var r = closest(400); if (r) FONT_REGULAR = r;
  var m = closest(500); if (m) FONT_MEDIUM = m;
  var b = closest(700); if (b) FONT_BOLD = b;
}

var COLOR_LABEL: RGB   = { r: 0.4, g: 0.4, b: 0.4 };
var COLOR_VALUE: RGB   = { r: 0.13, g: 0.13, b: 0.13 };
var COLOR_HEADER: RGB  = { r: 0.1, g: 0.1, b: 0.1 };
var COLOR_MUTED: RGB   = { r: 0.6, g: 0.6, b: 0.6 };
var COLOR_ACCENT: RGB  = { r: 0.24, g: 0.48, b: 0.89 };
var COLOR_DIVIDER: RGB = { r: 0.9, g: 0.9, b: 0.9 };
var WHITE: RGB         = { r: 1, g: 1, b: 1 };
var BG_LIGHT: RGB      = { r: 0.97, g: 0.97, b: 0.97 };
var RED: RGB           = { r: 1, g: 0, b: 0 };
var COLOR_CARD_BG: RGB = { r: 0.995, g: 0.995, b: 0.995 };
var COLOR_CARD_BORDER: RGB = { r: 0.86, g: 0.88, b: 0.9 };
var COLOR_DIMENSION: RGB = { r: 0.86, g: 0.26, b: 0.21 };
var COLOR_SPACING: RGB = { r: 0.14, g: 0.65, b: 0.42 };
var COLOR_ANATOMY: RGB = { r: 0.19, g: 0.45, b: 0.9 };
var COLOR_STYLE: RGB = { r: 0.86, g: 0.54, b: 0.2 };
var COLOR_ORANGE: RGB = { r: 0.85, g: 0.34, b: 0.04 };
var COLOR_PAGE_BG: RGB = { r: 0.92, g: 0.92, b: 0.92 };

// Shared design tokens (mirrored in ui.html CSS variables).
var TOKEN_MARKER_COLOR: RGB = COLOR_ORANGE;
var TOKEN_PREVIEW_BG: RGB = { r: 0.88, g: 0.88, b: 0.88 };
var TOKEN_PREVIEW_RADIUS = 0;

var SPEC_PANEL_WIDTH = 860;
var SPEC_INNER_WIDTH = 824;
var SPEC_ROW_WIDTH = 800;
var SPEC_LABEL_WIDTH = 220;
var SHEET_WIDTH = 980;
var SHEET_INNER_WIDTH = 860;
var PREVIEW_PANEL_WIDTH = 620;
var PREVIEW_PANEL_HEIGHT = 340;
var DETAIL_PANEL_WIDTH = 220;
var PROPERTIES_CARD_WIDTH = 450;

interface StatePropertyInfo {
  propertyKey: string;
  states: string[];
  currentState: string;
}

interface StateTargetInfo extends StatePropertyInfo {
  previewSource: 'clone-selection' | 'instance-from-component';
    instanceSource?: any;
  targetPath: number[];
  targetName: string;
}

type KnownComponentPropertyType = 'VARIANT' | 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'UNKNOWN';

interface PropertyPreviewTarget {
  previewSource: 'clone-selection' | 'instance-from-component';
  instanceSource?: any;
  targetPath: number[];
  targetName: string;
}

interface PropertyCardSpec {
  title: string;
  propertyKey: string;
  propertyType: KnownComponentPropertyType;
  value: string | boolean;
  valueLabel: string;
  variableRefs: PropertyVariableRef[];
  metaLines: string[];
}

interface PropertyVariableRef {
  label: string;
  name: string;
  variableId: string;
  fallbackValue: string;
  fallbackColor: RGB | null;
  previewKind: string;
}

interface VariableUsageRow {
  variableName: string;
  variableId: string;
  variableType: string;
  fallbackColor: RGB | null;
  fallbackValue: string;
  previewKind: string;
  appliedAs: string;
  appliedTo: string;
}

interface VariableUsageAggregate {
  variableName: string;
  variableId: string;
  variableType: string;
  fallbackColor: RGB | null;
  fallbackValue: string;
  previewKind: string;
  appliedAs: { [key: string]: boolean };
  appliedTo: { [key: string]: boolean };
}

interface VariableLookupCache {
  byId: { [id: string]: any };
  byKey: { [key: string]: any };
  libraryByKey: { [key: string]: { name: string; resolvedType: string; libraryName: string; collectionName: string } };
  libraryLoaded: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function solidPaint(color: RGB, opacity?: number): Paint[] {
  if (opacity !== undefined) {
    return [{ type: 'SOLID', color: color, opacity: opacity } as SolidPaint];
  }
  return [{ type: 'SOLID', color: color } as SolidPaint];
}

function rgbToHex(c: any): string {
  if (!c) return '#000000';
  var r = Math.round(c.r * 255);
  var g = Math.round(c.g * 255);
  var b = Math.round(c.b * 255);
  function h(n: number) { var s = n.toString(16); return s.length === 1 ? '0' + s : s; }
  return ('#' + h(r) + h(g) + h(b)).toUpperCase();
}

function parseHexToRgb(hex: any): RGB | null {
  if (typeof hex !== 'string') return null;
  var raw = hex.trim();
  if (!raw) return null;
  if (raw.charAt(0) === '#') raw = raw.substring(1);
  if (raw.length === 3) {
    raw = raw.charAt(0) + raw.charAt(0)
      + raw.charAt(1) + raw.charAt(1)
      + raw.charAt(2) + raw.charAt(2);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;

  var r = parseInt(raw.substring(0, 2), 16) / 255;
  var g = parseInt(raw.substring(2, 4), 16) / 255;
  var b = parseInt(raw.substring(4, 6), 16) / 255;
  return { r: r, g: g, b: b };
}

function parseRadiusPx(value: any): number | null {
  if (typeof value === 'number' && isFinite(value)) return Math.max(0, value);
  if (typeof value !== 'string') return null;
  var n = parseFloat(value.trim());
  if (!isFinite(n)) return null;
  return Math.max(0, n);
}

function applyUiTokenOverrides(tokens: any): void {
  if (!tokens || typeof tokens !== 'object') return;

  var markerColor = parseHexToRgb(tokens.markerColor);
  if (markerColor) TOKEN_MARKER_COLOR = markerColor;

  var previewBg = parseHexToRgb(tokens.previewBg);
  if (previewBg) TOKEN_PREVIEW_BG = previewBg;

  var previewRadius = parseRadiusPx(tokens.previewRadius);
  if (previewRadius !== null) TOKEN_PREVIEW_RADIUS = previewRadius;
}

// mainCompNode: pass an already-awaited mainComponent to check its bindings (sync-safe)
function resolveVarAlias(node: any, prop: string, index?: number, mainCompNode?: any): string {
  function lookupBinding(source: any): string {
    if (!source || !source.boundVariables) return '';
    var binding = source.boundVariables[prop];
    if (!binding) return '';
    var entry = binding;
    if (Array.isArray(binding)) {
      if (index !== undefined && index < binding.length) entry = binding[index];
      else return '';
    }
    if (!entry || !entry.id) return '';
    try {
      var variable = figma.variables.getVariableById(entry.id);
      if (variable) return variable.name;
    } catch (e) {}
    return '';
  }

  // 1. Check the node itself
  var result = lookupBinding(node);
  if (result) return result;

  // 2. Pre-fetched main component (caller must await getMainComponentAsync before passing)
  if (mainCompNode) {
    result = lookupBinding(mainCompNode);
    if (result) return result;
  }

  // 3. inferredAutoLayout exposes bindings on some frame types
  if (node.inferredAutoLayout) {
    result = lookupBinding(node.inferredAutoLayout);
    if (result) return result;
  }

  return '';
}

// Async variant — resolves library variables that the sync getVariableById misses
async function resolveVarAliasAsync(node: any, prop: string, mainCompNode?: any): Promise<string> {
  async function lookupAsync(source: any): Promise<string> {
    if (!source || !source.boundVariables) return '';
    var binding = source.boundVariables[prop];
    if (!binding) return '';
    var id = Array.isArray(binding) ? '' : (binding.id || '');
    if (!id) return '';
    try {
      var v = await figma.variables.getVariableByIdAsync(id);
      if (v) return (v as any).name || '';
    } catch (e) {}
    try {
      var sv = figma.variables.getVariableById(id);
      if (sv) return (sv as any).name || '';
    } catch (e) {}
    return '';
  }
  var result = await lookupAsync(node);
  if (result) return result;
  if (mainCompNode) {
    result = await lookupAsync(mainCompNode);
    if (result) return result;
  }
  if (node && node.inferredAutoLayout) {
    result = await lookupAsync(node.inferredAutoLayout);
    if (result) return result;
  }
  return '';
}

// Returns the last 2 path segments of a token name for compact guide labels, e.g. "DS Space/padding/1x" → "padding/1x"
function shortTokenName(name: string): string {
  if (!name) return name;
  var parts = name.split('/');
  if (parts.length <= 2) return name;
  return parts.slice(-2).join('/');
}

function resolveStyleName(styleId: any): string {
  if (!styleId || typeof styleId !== 'string' || styleId.length === 0) return '';
  try {
    var style = figma.getStyleById(styleId);
    if (style) return style.name;
  } catch (e) {}
  return '';
}

function normalizeComponentPropertyType(rawType: any): KnownComponentPropertyType {
  if (typeof rawType !== 'string' || rawType.length === 0) return 'UNKNOWN';
  var normalized = rawType.toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'SLOT') return 'INSTANCE_SWAP';
  if (normalized === 'VARIANT' || normalized === 'TEXT' || normalized === 'BOOLEAN' || normalized === 'INSTANCE_SWAP') {
    return normalized;
  }
  return 'UNKNOWN';
}

/** Get the absolute bounds of a node */
function getNodeBounds(node: any): { x: number; y: number; w: number; h: number } {
  var bounds = node.absoluteRenderBounds || node.absoluteBoundingBox;
  if (bounds) {
    return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
  }
  return { x: node.x || 0, y: node.y || 0, w: node.width || 0, h: node.height || 0 };
}

type MarkerSide = 'top' | 'bottom' | 'left' | 'right';

interface AnatomyMarkerPlacement {
  side: MarkerSide;
  anchorX: number;
  anchorY: number;
  badgeCenterX: number;
  badgeCenterY: number;
}

interface AnatomyMarkerBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AnatomyMarkerSideCounts {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface AnatomyMarkerRowBand {
  centerY: number;
  count: number;
}

function isAnatomyTextLayer(childType: string): boolean {
  return (childType || '').toUpperCase() === 'TEXT';
}

function isAnatomyIconLikeLayer(childType: string, childName: string): boolean {
  var normalizedType = (childType || '').toUpperCase();
  var normalizedName = (childName || '').toLowerCase();
  return normalizedName.indexOf('icon') >= 0 || normalizedType === 'VECTOR' || normalizedType === 'INSTANCE' || normalizedType === 'COMPONENT' || normalizedType === 'COMPONENT_SET';
}

function isAnatomyRoleLocked(childType: string, childName: string): boolean {
  return isAnatomyTextLayer(childType) || isAnatomyIconLikeLayer(childType, childName);
}

function getAnatomyForcedSide(child: any, childName: string): MarkerSide | null {
  var normalizedName = (childName || '').toLowerCase();
  var childType = (child && child.type ? child.type : '').toString().toUpperCase();
  var bounds = getNodeBounds(child || {});
  var isLabelLike = normalizedName.indexOf('label') >= 0 || normalizedName.indexOf('text') >= 0 || normalizedName.indexOf('copy') >= 0;
  var isIconLikeBySize = bounds.w > 0 && bounds.h > 0 && bounds.w <= 36 && bounds.h <= 36;

  if (isAnatomyTextLayer(childType) || isLabelLike) return 'bottom';
  if (isAnatomyIconLikeLayer(childType, normalizedName) || isIconLikeBySize) return 'top';
  return null;
}

function oppositeMarkerSide(side: MarkerSide): MarkerSide {
  if (side === 'top') return 'bottom';
  if (side === 'bottom') return 'top';
  if (side === 'left') return 'right';
  return 'left';
}

function isVerticalMarkerSide(side: MarkerSide): boolean {
  return side === 'top' || side === 'bottom';
}

function isEdgeEligibleMarkerSide(side: MarkerSide, childB: AnatomyMarkerBounds, parentB: AnatomyMarkerBounds): boolean {
  var edgeBandX = Math.max(18, parentB.w * 0.18);
  if (side === 'left') return (childB.x - parentB.x) <= edgeBandX;
  if (side === 'right') return ((parentB.x + parentB.w) - (childB.x + childB.w)) <= edgeBandX;
  return true;
}

function getAnatomyMarkerPlacement(side: MarkerSide, childB: AnatomyMarkerBounds, parentB: AnatomyMarkerBounds, badgeGap: number): AnatomyMarkerPlacement {
  var childCenterX = childB.x + childB.w / 2;
  var childCenterY = childB.y + childB.h / 2;

  if (side === 'top') {
    return {
      side: side,
      anchorX: childCenterX,
      anchorY: childB.y,
      badgeCenterX: childCenterX,
      badgeCenterY: childB.y - badgeGap,
    };
  }

  if (side === 'bottom') {
    return {
      side: side,
      anchorX: childCenterX,
      anchorY: childB.y + childB.h,
      badgeCenterX: childCenterX,
      badgeCenterY: childB.y + childB.h + badgeGap,
    };
  }

  if (side === 'left') {
    return {
      side: side,
      anchorX: childB.x,
      anchorY: childCenterY,
      badgeCenterX: childB.x - badgeGap,
      badgeCenterY: childCenterY,
    };
  }

  return {
    side: side,
    anchorX: childB.x + childB.w,
    anchorY: childCenterY,
    badgeCenterX: childB.x + childB.w + badgeGap,
    badgeCenterY: childCenterY,
  };
}

function nudgeAnatomyMarkerPlacement(placement: AnatomyMarkerPlacement, tries: number): AnatomyMarkerPlacement {
  var swing = tries % 2 === 0 ? 1 : -1;
  var magnitude = Math.min(18, 6 + Math.floor(tries / 2) * 4);

  if (isVerticalMarkerSide(placement.side)) {
    return {
      side: placement.side,
      anchorX: placement.anchorX,
      anchorY: placement.anchorY,
      badgeCenterX: placement.badgeCenterX + (swing * magnitude),
      badgeCenterY: placement.badgeCenterY,
    };
  }

  return {
    side: placement.side,
    anchorX: placement.anchorX,
    anchorY: placement.anchorY,
    badgeCenterX: placement.badgeCenterX,
    badgeCenterY: placement.badgeCenterY + (swing * magnitude),
  };
}

function getAnatomyMarkerPreferredSide(childB: AnatomyMarkerBounds, parentB: AnatomyMarkerBounds, rowBandCount: number, childType: string, childName: string): MarkerSide {
  var parentCenterX = parentB.x + parentB.w / 2;
  var parentCenterY = parentB.y + parentB.h / 2;
  var childCenterX = childB.x + childB.w / 2;
  var childCenterY = childB.y + childB.h / 2;
  var isTextLayer = isAnatomyTextLayer(childType);
  var isIconLike = isAnatomyIconLikeLayer(childType, childName);

  var centeredVertically = Math.abs(childCenterY - parentCenterY) <= Math.max(12, parentB.h * 0.18);
  var centeredHorizontally = Math.abs(childCenterX - parentCenterX) <= Math.max(12, parentB.w * 0.18);
  var nearLeftEdge = (childB.x - parentB.x) <= Math.max(8, parentB.w * 0.04);
  var nearRightEdge = ((parentB.x + parentB.w) - (childB.x + childB.w)) <= Math.max(8, parentB.w * 0.04);

  if (centeredVertically) {
    if (isTextLayer) return 'bottom';
    if (isIconLike) return 'top';
    return rowBandCount % 2 === 0 ? 'top' : 'bottom';
  }

  if (isTextLayer) {
    return 'bottom';
  }

  if (isIconLike) {
    return 'top';
  }

  if (!centeredHorizontally && nearLeftEdge && !nearRightEdge) {
    return 'left';
  }

  if (!centeredHorizontally && nearRightEdge && !nearLeftEdge) {
    return 'right';
  }

  return childCenterY < parentCenterY ? 'top' : 'bottom';
}

function getAnatomyMarkerSideOrder(
  preferredSide: MarkerSide,
  childB: { x: number; y: number; w: number; h: number },
  parentB: { x: number; y: number; w: number; h: number },
  sideCounts: { top: number; bottom: number; left: number; right: number },
  roleLocked: boolean
): MarkerSide[] {
  if (roleLocked) {
    return [preferredSide];
  }

  var sideOrder: MarkerSide[] = [];
  var primarySide = preferredSide;
  var secondarySide = oppositeMarkerSide(primarySide);
  var centeredVerticalPair = primarySide === 'top' || primarySide === 'bottom';

  if ((primarySide === 'left' || primarySide === 'right') && !isEdgeEligibleMarkerSide(primarySide, childB, parentB)) {
    primarySide = 'top';
    secondarySide = 'bottom';
    centeredVerticalPair = true;
  }

  sideOrder.push(primarySide);

  if (centeredVerticalPair || isEdgeEligibleMarkerSide(secondarySide, childB, parentB)) {
    var primaryCount = sideCounts[primarySide] || 0;
    var secondaryCount = sideCounts[secondarySide] || 0;
    if (secondaryCount < primaryCount) {
      sideOrder.unshift(secondarySide);
    } else {
      sideOrder.push(secondarySide);
    }
  }

  return sideOrder;
}

// ── Layer icon helpers ──────────────────────────────────────────────

function getTypeIcon(nodeType: string): string {
  if (nodeType === 'TEXT') return 'T';
  if (nodeType === 'INSTANCE') return '◇';
  if (nodeType === 'COMPONENT') return '◆';
  if (nodeType === 'COMPONENT_SET') return '◈';
  if (nodeType === 'FRAME') return '⌗';
  if (nodeType === 'GROUP') return '☰';
  if (nodeType === 'VECTOR') return '✎';
  return '•';
}

function getTypeTag(nodeType: string): string {
  if (nodeType === 'TEXT') return 'TEXT';
  if (nodeType === 'INSTANCE') return 'INSTANCE';
  if (nodeType === 'FRAME') return 'FRAME';
  if (nodeType === 'COMPONENT') return 'COMPONENT';
  if (nodeType === 'COMPONENT_SET') return 'COMPONENT SET';
  if (nodeType === 'VECTOR') return 'VECTOR';
  if (nodeType === 'GROUP') return 'GROUP';
  return nodeType || 'UNKNOWN';
}

function makeNodeLabel(name: string, nodeType: string, size: number, bold: boolean): FrameNode {
  var row = figma.createFrame();
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisAlignItems = 'CENTER';
  row.counterAxisAlignItems = 'CENTER';
  row.itemSpacing = 6;
  row.fills = [];
  row.clipsContent = false;
  var icon = makeText(getTypeIcon(nodeType), size, FONT_MEDIUM, COLOR_LABEL);
  var label = makeText(name, size, bold ? FONT_BOLD : FONT_REGULAR, COLOR_HEADER);
  row.appendChild(icon);
  row.appendChild(label);
  return row;
}

// ── Frame Builders ──────────────────────────────────────────────────

function makeText(str: string, size: number, font: FontName, color: RGB): TextNode {
  var t = figma.createText();
  t.fontName = font;
  t.characters = str;
  t.fontSize = Math.min(size, 24);
  t.fills = solidPaint(color);
  t.textAutoResize = 'HEIGHT';
  return t;
}

function makeHorizontalDivider(width: number): RectangleNode {
  var d = figma.createRectangle();
  d.resize(width, 1);
  d.fills = solidPaint(COLOR_DIVIDER);
  d.strokes = [];
  return d;
}

function makeRow(label: string, value: string): FrameNode {
  var row = figma.createFrame();
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.resize(SPEC_ROW_WIDTH, 1);
  row.itemSpacing = 12;
  row.fills = [];

  var labelNode = makeText(label, 11, FONT_MEDIUM, COLOR_LABEL);
  labelNode.layoutAlign = 'STRETCH';
  var valueNode = makeText(value, 11, FONT_REGULAR, COLOR_VALUE);
  valueNode.layoutGrow = 1;
  valueNode.textAutoResize = 'HEIGHT';

  row.appendChild(labelNode);
  row.appendChild(valueNode);
  return row;
}

function makeDescriptionColumn(): FrameNode {
  var col = figma.createFrame();
  col.layoutMode = 'VERTICAL';
  col.primaryAxisSizingMode = 'AUTO';
  col.counterAxisSizingMode = 'FIXED';
  col.resize(SPEC_INNER_WIDTH, 1);
  col.itemSpacing = 10;
  col.paddingTop = 16;
  col.paddingBottom = 16;
  col.paddingLeft = 16;
  col.paddingRight = 16;
  col.fills = solidPaint(COLOR_CARD_BG);
  col.strokes = solidPaint(COLOR_CARD_BORDER);
  col.strokeWeight = 1;
  col.cornerRadius = 8;
  return col;
}

function getSectionAccent(title: string): RGB {
  if (title === 'Dimensions') return COLOR_DIMENSION;
  if (title === 'Spacing') return COLOR_SPACING;
  if (title === 'Anatomy') return COLOR_ANATOMY;
  if (title === 'Styles') return COLOR_STYLE;
  return COLOR_ACCENT;
}

function addSectionHeader(frame: FrameNode, title: string): void {
  var accent = getSectionAccent(title);

  var headerRow = figma.createFrame();
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'FIXED';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.resize(SPEC_ROW_WIDTH, 1);
  headerRow.itemSpacing = 8;
  headerRow.fills = [];
  headerRow.counterAxisAlignItems = 'CENTER';

  var dot = figma.createEllipse();
  dot.resize(8, 8);
  dot.fills = solidPaint(accent);

  var titleNode = makeText(title, 13, FONT_BOLD, COLOR_HEADER);
  var meta = makeText('SPEC MODULE', 9, FONT_MEDIUM, COLOR_MUTED);
  headerRow.appendChild(meta);

  frame.appendChild(headerRow);
  frame.appendChild(makeHorizontalDivider(SPEC_ROW_WIDTH));
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 1: ANATOMY OVERLAY
// Creates a transparent overlay frame exactly on top of the selection.
// For each primary child: a 20×20 accent circle with number + leader line.
// Outputs a Legend frame to the right mapping ID → name [type].
// ═══════════════════════════════════════════════════════════════════

function createAnatomyOverlay(node: SceneNode, page: PageNode): void {
  var f = node as any;
  var b = getNodeBounds(f);

  // ── Overlay frame matching node bounds ─────────────────────────
  var overlay = figma.createFrame();
  overlay.name = SPEC_PREFIX + 'Anatomy Overlay';
  overlay.x = b.x;
  overlay.y = b.y;
  overlay.resize(b.w, b.h);
  overlay.fills = [];
  overlay.strokes = solidPaint(COLOR_ACCENT, 0.3);
  overlay.strokeWeight = 1;
  (overlay as any).dashPattern = [6, 4];
  overlay.clipsContent = false;
  overlay.locked = true;

  var children: SceneNode[] = (f.children || []) as SceneNode[];
  var legendItems: Array<{ id: number; name: string; type: string; isContainer?: boolean }> = [];
  var placedMarkerCenters: Array<{ x: number; y: number }> = [];
  var sideCounts: AnatomyMarkerSideCounts = { top: 0, bottom: 0, left: 0, right: 0 };
  var rowBands: AnatomyMarkerRowBand[] = [];

  // Helper to detect marker overlaps
  function overlapsExisting(cx: number, cy: number): boolean {
    for (var pm = 0; pm < placedMarkerCenters.length; pm++) {
      var dx = Math.abs(placedMarkerCenters[pm].x - cx);
      var dy = Math.abs(placedMarkerCenters[pm].y - cy);
      if (dx < 26 && dy < 26) return true;
    }
    return false;
  }

  // First, add container marker for the component instance itself
  var containerB = getNodeBounds(f);
  var containerCenterX = containerB.x + containerB.w / 2;
  var containerCenterY = containerB.y + containerB.h / 2;
  
  // Container marker always goes on the left side
  var containerAnchorX = containerB.x;
  var containerAnchorY = containerCenterY;
  var containerBadgeX = containerAnchorX - 28;
  var containerBadgeY = containerAnchorY;
  
  placedMarkerCenters.push({ x: containerBadgeX, y: containerBadgeY });
  
  // Create container marker (ID 1)
  var containerCircle = figma.createEllipse();
  containerCircle.name = 'Callout-Circle-1';
  containerCircle.resize(20, 20);
  containerCircle.fills = solidPaint(TOKEN_MARKER_COLOR);
  containerCircle.strokes = solidPaint(WHITE);
  containerCircle.strokeWeight = 2;
  containerCircle.x = containerBadgeX - 10;
  containerCircle.y = containerBadgeY - 10;

  var containerNumText = makeText('1', 10, FONT_BOLD, WHITE);
  containerNumText.name = 'Callout-Num-1';
  containerNumText.textAlignHorizontal = 'CENTER';
  containerNumText.resize(20, containerNumText.height);
  containerNumText.x = containerBadgeX - 10;
  containerNumText.y = containerBadgeY - 10 + 3;

  var containerLine = figma.createLine();
  containerLine.name = 'Callout-Line-1';
  containerLine.strokeWeight = 1;
  containerLine.strokes = solidPaint(TOKEN_MARKER_COLOR, 0.6);
  (containerLine as any).dashPattern = [3, 2];

  var containerDx = containerAnchorX - containerBadgeX;
  var containerDy = containerAnchorY - containerBadgeY;
  var containerLineLen = Math.sqrt(containerDx * containerDx + containerDy * containerDy);

  containerLine.x = containerBadgeX;
  containerLine.y = containerBadgeY;
  if (containerLineLen > 0) {
    (containerLine as any).resize(containerLineLen, 0);
    containerLine.rotation = -Math.atan2(containerDy, containerDx) * (180 / Math.PI);
  }

  var containerCalloutGroup = figma.group([containerCircle, containerNumText, containerLine], page);
  containerCalloutGroup.name = SPEC_PREFIX + 'Callout-1';
  containerCalloutGroup.locked = true;

  legendItems.push({ id: 1, name: node.name || 'Container', type: node.type || 'INSTANCE', isContainer: true });

  // Now process child markers with priority placement
  var markerId = 2; // IDs start at 2 since container is 1; incremented only for children that actually get a marker
  for (var i = 0; i < children.length; i++) {
    var child = children[i] as any;
    // Bare vector layers (icon paths, decorative shapes) are implementation
    // detail, not anatomy — numbering them adds noise without documenting
    // anything meaningful. Their parent (if any) still gets marked normally.
    if (child.type === 'VECTOR') continue;
    var childB = getNodeBounds(child);
    var id = markerId++;

    var childCenterX = childB.x + childB.w / 2;
    var childCenterY = childB.y + childB.h / 2;
    var parentCenterX = b.x + b.w / 2;
    var parentCenterY = b.y + b.h / 2;

    // Determine if this is a base layer (background/foundational layer)
    var childName = (child.name || '').toLowerCase();
    var isBaseLayer = childName.includes('base') || childName.includes('background') || childName.includes('bg');
    var isRoleLocked = isAnatomyRoleLocked(child.type || '', childName);

    var rowBand: AnatomyMarkerRowBand | null = null;
    var rowBandTolerance = Math.max(12, b.h * 0.08);
    for (var rb = 0; rb < rowBands.length; rb++) {
      if (Math.abs(rowBands[rb].centerY - childCenterY) <= rowBandTolerance) {
        rowBand = rowBands[rb];
        break;
      }
    }
    if (!rowBand) {
      rowBand = { centerY: childCenterY, count: 0 };
      rowBands.push(rowBand);
    }

    var forcedSide = getAnatomyForcedSide(child, childName);
    var preferredSide = forcedSide || getAnatomyMarkerPreferredSide(childB, b, rowBand.count, child.type || '', childName);
    var sideOrder = forcedSide ? [forcedSide] : getAnatomyMarkerSideOrder(preferredSide, childB, b, sideCounts, isRoleLocked);
    var placement: AnatomyMarkerPlacement | null = null;
    var badgeGap = isBaseLayer ? 56 : 32;

    for (var so = 0; so < sideOrder.length; so++) {
      var candidatePlacement = getAnatomyMarkerPlacement(sideOrder[so], childB, b, badgeGap);
      var candidateTries = 0;

      while (overlapsExisting(candidatePlacement.badgeCenterX, candidatePlacement.badgeCenterY) && candidateTries < 60) {
        if ((isRoleLocked || !!forcedSide) && isVerticalMarkerSide(candidatePlacement.side)) {
          var outwardGap = badgeGap + ((candidateTries + 1) * 8);
          candidatePlacement = getAnatomyMarkerPlacement(candidatePlacement.side, childB, b, outwardGap);
        } else {
          candidatePlacement = nudgeAnatomyMarkerPlacement(candidatePlacement, candidateTries);
        }
        candidateTries++;
      }

      if (!overlapsExisting(candidatePlacement.badgeCenterX, candidatePlacement.badgeCenterY)) {
        placement = candidatePlacement;
        break;
      }
    }

    if (!placement) {
      placement = getAnatomyMarkerPlacement(sideOrder[0], childB, b, badgeGap);
    }

    console.log('[AnatomyMarker]', {
      id: id,
      name: child.name || 'Unnamed',
      type: child.type || 'UNKNOWN',
      forcedSide: forcedSide,
      preferredSide: preferredSide,
      resolvedSide: placement.side,
    });

    rowBand.count++;
    sideCounts[placement.side]++;

    placedMarkerCenters.push({ x: placement.badgeCenterX, y: placement.badgeCenterY });

    // ── Numbered circle ──────────────────────────────────────────
    var circle = figma.createEllipse();
    circle.name = 'Callout-Circle-' + id;
    circle.resize(20, 20);
    circle.fills = solidPaint(TOKEN_MARKER_COLOR);
    circle.strokes = solidPaint(WHITE);
    circle.strokeWeight = 2;
    circle.x = placement.badgeCenterX - 10;
    circle.y = placement.badgeCenterY - 10;

    // ── Number label ─────────────────────────────────────────────
    var numText = makeText('' + id, 10, FONT_BOLD, WHITE);
    numText.name = 'Callout-Num-' + id;
    numText.textAlignHorizontal = 'CENTER';
    numText.resize(20, numText.height);
    numText.x = placement.badgeCenterX - 10;
    numText.y = placement.badgeCenterY - 10 + 3;

    // ── Leader line from badge center to anchor point ────────────
    var line = figma.createLine();
    line.name = 'Callout-Line-' + id;
    line.strokeWeight = 1;
    line.strokes = solidPaint(TOKEN_MARKER_COLOR, 0.6);
    (line as any).dashPattern = [3, 2];

    var dx = placement.anchorX - placement.badgeCenterX;
    var dy = placement.anchorY - placement.badgeCenterY;
    var lineLen = Math.sqrt(dx * dx + dy * dy);

    line.x = placement.badgeCenterX;
    line.y = placement.badgeCenterY;
    if (lineLen > 0) {
      (line as any).resize(lineLen, 0);
      line.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
    }

    // ── Group circle + number + line ─────────────────────────────
    var calloutGroup = figma.group([circle, numText, line], page);
    calloutGroup.name = SPEC_PREFIX + 'Callout-' + id;
    calloutGroup.locked = true;

    legendItems.push({ id: id, name: child.name || 'Unnamed', type: child.type || 'UNKNOWN' });
  }

  page.appendChild(overlay);

  // ── Legend frame to the right of the component ─────────────────
  var legend = figma.createFrame();
  legend.name = SPEC_PREFIX + 'Anatomy Legend';
  legend.layoutMode = 'VERTICAL';
  legend.primaryAxisSizingMode = 'AUTO';
  legend.counterAxisSizingMode = 'AUTO';
  legend.itemSpacing = 6;
  legend.paddingTop = 14;
  legend.paddingBottom = 14;
  legend.paddingLeft = 16;
  legend.paddingRight = 16;
  legend.fills = solidPaint(WHITE);
  legend.strokes = solidPaint(COLOR_DIVIDER);
  legend.strokeWeight = 1;
  legend.cornerRadius = 6;
  legend.locked = true;

  // Position to the right of the node
  legend.x = b.x + b.w + 24;
  legend.y = b.y;

  // Title
  var legendTitle = makeText('Anatomy Legend', 12, FONT_BOLD, COLOR_HEADER);
  legend.appendChild(legendTitle);
  legend.appendChild(makeHorizontalDivider(260));

  // Each entry: "1. Layer_Name [TYPE]"
  for (var j = 0; j < legendItems.length; j++) {
    var item = legendItems[j];

    var entryRow = figma.createFrame();
    entryRow.layoutMode = 'HORIZONTAL';
    entryRow.primaryAxisSizingMode = 'AUTO';
    entryRow.counterAxisSizingMode = 'AUTO';
    entryRow.itemSpacing = 8;
    entryRow.fills = [];

    // Colored number badge
    var badge = figma.createFrame();
    badge.resize(18, 18);
    badge.cornerRadius = 9;
    badge.fills = solidPaint(TOKEN_MARKER_COLOR);
    var badgeNum = makeText('' + item.id, 9, FONT_BOLD, WHITE);
    badgeNum.textAlignHorizontal = 'CENTER';
    badgeNum.resize(18, badgeNum.height);
    badge.appendChild(badgeNum);
    entryRow.appendChild(badge);

    // Name and type
    legend.appendChild(entryRow);
  }

  page.appendChild(legend);
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 2: COMPONENT DIFF (Instance Property Overrides)
// Reads componentPropertyDefinitions from mainComponent.
// Compares each against the instance's componentProperties.
// Outputs only "active" (overridden) properties in a table.
// Variant properties are highlighted with ★.
// ═══════════════════════════════════════════════════════════════════

interface DiffItem {
  name: string;
  type: string;
  defaultValue: string;
  instanceValue: string;
  isVariant: boolean;
}

async function analyzeComponentDiff(node: SceneNode): Promise<DiffItem[]> {
  var f = node as any;
  if (f.type !== 'INSTANCE') return [];

  var instanceNode = node as InstanceNode;
  var mainComp: any = null;
  try {
    mainComp = await instanceNode.getMainComponentAsync();
  } catch (e) {}
  if (!mainComp) return [];

  var defs = mainComp.componentPropertyDefinitions;
  if (!defs) return [];

  // The instance's actual property values live in componentProperties
  var instanceProps = f.componentProperties || {};
  var result: DiffItem[] = [];

  for (var key in defs) {
    if (!defs.hasOwnProperty(key)) continue;
    var def = defs[key];
    var propType = normalizeComponentPropertyType(def ? def.type : null);
    var propName: string = key;

    // Strip the hash suffix Figma appends (e.g. "Show Icon#1234:56")
    var hashIdx = propName.indexOf('#');
    if (hashIdx > 0) propName = propName.substring(0, hashIdx);

    // Get default value
    var defaultVal = '';
    if (propType === 'BOOLEAN') {
      defaultVal = def.defaultValue ? 'true' : 'false';
    } else if (propType === 'TEXT') {
      defaultVal = def.defaultValue || '';
    } else if (propType === 'VARIANT') {
      defaultVal = def.defaultValue || '';
    } else if (propType === 'INSTANCE_SWAP') {
      defaultVal = def.defaultValue || '';
      // Try to resolve the component name for default
      if (defaultVal) {
        try {
          var defNode = figma.getNodeById(defaultVal);
          if (defNode) defaultVal = defNode.name;
        } catch (e) {}
      }
    }

    // Get instance value from componentProperties
    var instEntry = instanceProps[key];
    var instanceVal = defaultVal;
    var isActive = false;

    if (instEntry) {
      if (propType === 'BOOLEAN') {
        instanceVal = instEntry.value ? 'true' : 'false';
        // Active if visibility is true OR value differs from default
        isActive = (instEntry.value !== def.defaultValue);
      } else if (propType === 'TEXT') {
        instanceVal = instEntry.value || '';
        isActive = (instanceVal !== (def.defaultValue || ''));
      } else if (propType === 'VARIANT') {
        instanceVal = instEntry.value || '';
        isActive = (instanceVal !== (def.defaultValue || ''));
      } else if (propType === 'INSTANCE_SWAP') {
        var swapId = instEntry.value;
        instanceVal = swapId || '';
        if (swapId) {
          try {
            var swapNode = figma.getNodeById(swapId);
            if (swapNode) instanceVal = swapNode.name;
          } catch (e) {}
        }
        isActive = (instEntry.value !== def.defaultValue);
      }
    }

    // For BOOLEAN: also include if currently visible (value === true)
    if (propType === 'BOOLEAN' && instEntry && instEntry.value === true) {
      isActive = true;
    }

    if (!isActive) continue;

    result.push({
      name: propName,
      type: propType,
      defaultValue: defaultVal,
      instanceValue: instanceVal,
      isVariant: propType === 'VARIANT'
    });
  }

  return result;
}

async function createComponentDiffAnnotation(node: SceneNode, page: PageNode): Promise<void> {
  var f = node as any;
  var b = getNodeBounds(f);
  var diffItems = await analyzeComponentDiff(node);

  // If no overrides found, skip entirely
  if (diffItems.length === 0) return;

  // ── Create table frame ─────────────────────────────────────────
  var diffFrame = figma.createFrame();
  diffFrame.name = SPEC_PREFIX + 'Component Diff';
  diffFrame.layoutMode = 'VERTICAL';
  diffFrame.primaryAxisSizingMode = 'AUTO';
  diffFrame.counterAxisSizingMode = 'AUTO';
  diffFrame.itemSpacing = 0;
  diffFrame.paddingTop = 14;
  diffFrame.paddingBottom = 14;
  diffFrame.paddingLeft = 16;
  diffFrame.paddingRight = 16;
  diffFrame.fills = solidPaint(WHITE);
  diffFrame.strokes = solidPaint(COLOR_CARD_BORDER);
  diffFrame.strokeWeight = 1;
  diffFrame.cornerRadius = 8;
  diffFrame.locked = true;

  // Position below the anatomy legend
  diffFrame.x = b.x + b.w + 24;
  diffFrame.y = b.y + b.h / 2;

  // ── Title ──────────────────────────────────────────────────────
  var title = makeText('Component Overrides', 12, FONT_BOLD, COLOR_HEADER);
  diffFrame.appendChild(title);
  diffFrame.appendChild(makeHorizontalDivider(500));

  // ── Column headers ─────────────────────────────────────────────
  var headerRow = figma.createFrame();
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'AUTO';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.itemSpacing = 8;
  headerRow.paddingTop = 6;
  headerRow.paddingBottom = 6;
  headerRow.fills = [];

  var hProp = makeText('Property', 10, FONT_BOLD, COLOR_MUTED);
  hProp.resize(150, hProp.height);
  var hType = makeText('Type', 10, FONT_BOLD, COLOR_MUTED);
  hType.resize(110, hType.height);
  var hOverride = makeText('Override', 10, FONT_BOLD, COLOR_MUTED);
  hOverride.resize(230, hOverride.height);

  headerRow.appendChild(hProp);
  headerRow.appendChild(hType);
  headerRow.appendChild(hOverride);
  diffFrame.appendChild(headerRow);
  diffFrame.appendChild(makeHorizontalDivider(500));

  // ── Data rows ──────────────────────────────────────────────────
  for (var i = 0; i < diffItems.length; i++) {
    var di = diffItems[i];

    var dataRow = figma.createFrame();
    dataRow.layoutMode = 'HORIZONTAL';
    dataRow.primaryAxisSizingMode = 'AUTO';
    dataRow.counterAxisSizingMode = 'AUTO';
    dataRow.itemSpacing = 8;
    dataRow.paddingTop = 6;
    dataRow.paddingBottom = 6;
    dataRow.paddingLeft = 4;
    dataRow.paddingRight = 4;
    // Variant rows get a warm highlight background
    dataRow.fills = di.isVariant
      ? solidPaint({ r: 1, g: 0.96, b: 0.92 })
      : [];

    var nameCell = makeText(di.name, 10, FONT_MEDIUM, COLOR_VALUE);
    nameCell.resize(150, nameCell.height);
    var typeCell = makeText(di.type, 9, FONT_REGULAR, COLOR_MUTED);
    typeCell.resize(110, typeCell.height);

    var overrideStr = di.defaultValue + '  →  ' + di.instanceValue;
    if (di.isVariant) overrideStr = '★ ' + overrideStr;
    var overrideCell = makeText(overrideStr, 10, FONT_REGULAR, COLOR_ACCENT);
    overrideCell.resize(230, overrideCell.height);

    dataRow.appendChild(nameCell);
    dataRow.appendChild(typeCell);
    dataRow.appendChild(overrideCell);
    diffFrame.appendChild(dataRow);
  }

  // ── Legend ─────────────────────────────────────────────────────
  diffFrame.appendChild(makeHorizontalDivider(500));
  var legendNote = makeText('★ = Variant-distinguishing property', 9, FONT_REGULAR, COLOR_MUTED);
  diffFrame.appendChild(legendNote);

  page.appendChild(diffFrame);
}

// ═══════════════════════════════════════════════════════════════════
// MODULE 3: LAYOUT REDLINES
// For auto-layout frames: semi-transparent red padding rects with
// pixel labels, and a dashed gap indicator between the first two
// children. All nodes are locked.
// ═══════════════════════════════════════════════════════════════════

function createLayoutRedlines(node: SceneNode, page: PageNode): void {
  var f = node as any;

  // Detect auto layout
  var layoutMode = f.layoutMode;
  if (!layoutMode || layoutMode === 'NONE') {
    // Try inferred auto layout
    if (f.inferredAutoLayout) {
      layoutMode = f.inferredAutoLayout.layoutMode;
    }
    if (!layoutMode || layoutMode === 'NONE') return;
  }

  var b = getNodeBounds(f);
  var redlineNodes: SceneNode[] = [];

  // ── Read padding values ────────────────────────────────────────
  var pt = f.paddingTop || 0;
  var pb = f.paddingBottom || 0;
  var pl = f.paddingLeft || 0;
  var pr = f.paddingRight || 0;

  if (pt === 0 && pb === 0 && pl === 0 && pr === 0 && f.inferredAutoLayout) {
    var ia = f.inferredAutoLayout;
    pt = ia.paddingTop || 0;
    pb = ia.paddingBottom || 0;
    pl = ia.paddingLeft || 0;
    pr = ia.paddingRight || 0;
  }

  var innerX = b.x + pl;
  var innerY = b.y + pt;
  var innerW = Math.max(0, b.w - pl - pr);
  var innerH = Math.max(0, b.h - pt - pb);

  // ── Top padding ────────────────────────────────────────────────
  if (pt > 0) {
    var topR = figma.createRectangle();
    topR.name = 'Rect';
    topR.resize(b.w, pt);
    topR.x = b.x;
    topR.y = b.y;
    topR.fills = solidPaint(RED, 0.15);
    topR.strokes = solidPaint(RED, 0.4);
    topR.strokeWeight = 0.5;

    var topL = makeText(Math.round(pt) + '', 10, FONT_BOLD, RED);
    topL.x = b.x + b.w - 18;
    topL.y = b.y + 2;

    page.appendChild(topR);
    page.appendChild(topL);
    var topGroup = figma.group([topR, topL], page);
    topGroup.name = SPEC_PREFIX + 'Redline-Pad-Top';
    (topGroup as any).layoutPositioning = 'ABSOLUTE';
    topGroup.locked = true;
    redlineNodes.push(topGroup);
  }

  // ── Bottom padding ─────────────────────────────────────────────
  if (pb > 0) {
    var botR = figma.createRectangle();
    botR.name = 'Rect';
    botR.resize(b.w, pb);
    botR.x = b.x;
    botR.y = b.y + b.h - pb;
    botR.fills = solidPaint(RED, 0.15);
    botR.strokes = solidPaint(RED, 0.4);
    botR.strokeWeight = 0.5;

    var botL = makeText(Math.round(pb) + '', 10, FONT_BOLD, RED);
    botL.x = b.x + b.w / 2 - 8;
    botL.y = b.y + b.h - pb + pb / 2 - 6;

    page.appendChild(botR);
    page.appendChild(botL);
    var botGroup = figma.group([botR, botL], page);
    botGroup.name = SPEC_PREFIX + 'Redline-Pad-Bot';
    (botGroup as any).layoutPositioning = 'ABSOLUTE';
    botGroup.locked = true;
    redlineNodes.push(botGroup);
  }

  // ── Left padding ───────────────────────────────────────────────
  if (pl > 0) {
    var leftR = figma.createRectangle();
    leftR.name = 'Rect';
    leftR.resize(pl, innerH);
    leftR.x = b.x;
    leftR.y = innerY;
    leftR.fills = solidPaint(RED, 0.15);
    leftR.strokes = solidPaint(RED, 0.4);
    leftR.strokeWeight = 0.5;

    var leftL = makeText(Math.round(pl) + '', 10, FONT_BOLD, RED);
    leftL.x = b.x + pl / 2 - 8;
    leftL.y = innerY + innerH / 2 - 6;

    page.appendChild(leftR);
    page.appendChild(leftL);
    var leftGroup = figma.group([leftR, leftL], page);
    leftGroup.name = SPEC_PREFIX + 'Redline-Pad-Left';
    (leftGroup as any).layoutPositioning = 'ABSOLUTE';
    leftGroup.locked = true;
    redlineNodes.push(leftGroup);
  }

  // ── Right padding ──────────────────────────────────────────────
  if (pr > 0) {
    var rightR = figma.createRectangle();
    rightR.name = 'Rect';
    rightR.resize(pr, innerH);
    rightR.x = b.x + b.w - pr;
    rightR.y = innerY;
    rightR.fills = solidPaint(RED, 0.15);
    rightR.strokes = solidPaint(RED, 0.4);
    rightR.strokeWeight = 0.5;

    var rightL = makeText(Math.round(pr) + '', 10, FONT_BOLD, RED);
    rightL.x = b.x + b.w - pr + pr / 2 - 8;
    rightL.y = innerY + innerH / 2 - 6;

    page.appendChild(rightR);
    page.appendChild(rightL);
    var rightGroup = figma.group([rightR, rightL], page);
    rightGroup.name = SPEC_PREFIX + 'Redline-Pad-Right';
    (rightGroup as any).layoutPositioning = 'ABSOLUTE';
    rightGroup.locked = true;
    redlineNodes.push(rightGroup);
  }

  // ── Gap indicators (show ALL gaps between adjacent children) ────
  var gap = f.itemSpacing || 0;
  if (gap === 0 && f.inferredAutoLayout) {
    gap = f.inferredAutoLayout.itemSpacing || 0;
  }

  var kids = f.children || [];
  if (gap > 0 && kids.length >= 2) {
    // Iterate through all adjacent pairs to show all gaps
    for (var ki = 0; ki < kids.length - 1; ki++) {
      var c1 = getNodeBounds(kids[ki]);
      var c2 = getNodeBounds(kids[ki + 1]);

      var sx: number = 0, sy: number = 0, ex: number = 0, ey: number = 0;
      var isActuallyAdjacent = false;

      if (layoutMode === 'HORIZONTAL') {
        // Check if horizontally adjacent (c2 is to the right of c1)
        if (c2.x > c1.x + c1.w - 2) {  // Allow 2px tolerance
          isActuallyAdjacent = true;
          sx = c1.x + c1.w;
          sy = c1.y + c1.h / 2;
          ex = c2.x;
          ey = c2.y + c2.h / 2;
        }
      } else {
        // Check if vertically adjacent (c2 is below c1)
        if (c2.y > c1.y + c1.h - 2) {  // Allow 2px tolerance
          isActuallyAdjacent = true;
          sx = c1.x + c1.w / 2;
          sy = c1.y + c1.h;
          ex = c2.x + c2.w / 2;
          ey = c2.y;
        }
      }

      if (!isActuallyAdjacent) continue;

      // Calculate gap rectangle position and size
      var gapX: number, gapY: number, gapW: number, gapH: number;
      
      if (layoutMode === 'HORIZONTAL') {
        // Horizontal layout: gap is a vertical bar between items
        gapX = c1.x + c1.w;  // Start at right edge of first item
        gapW = c2.x - gapX;   // Width is the actual gap
        gapY = innerY;        // Match the content box height
        gapH = innerH;
      } else {
        // Vertical layout: gap is a horizontal bar between items
        gapX = innerX;        // Match the content box width
        gapW = innerW;
        gapY = c1.y + c1.h;   // Start at bottom edge of first item
        gapH = c2.y - gapY;   // Height is the actual gap
      }

      // Create auto layout frame for gap indicator
      var gapFrame = figma.createFrame();
      gapFrame.name = SPEC_PREFIX + 'Redline-Gap-' + ki;
      gapFrame.x = gapX;
      gapFrame.y = gapY;
      gapFrame.fills = [];
      gapFrame.clipsContent = false;
      gapFrame.layoutMode = 'HORIZONTAL';
      gapFrame.primaryAxisAlignItems = 'MIN';      // Align top
      gapFrame.counterAxisAlignItems = 'MIN';      // Align left
      gapFrame.itemSpacing = 2;
      gapFrame.paddingLeft = 0;
      gapFrame.paddingRight = 0;
      gapFrame.paddingTop = 0;
      gapFrame.paddingBottom = 0;
      gapFrame.primaryAxisSizingMode = 'AUTO';
      gapFrame.counterAxisSizingMode = 'AUTO';
      
      // Create gap rectangle - stays in auto layout flow to reserve space
      var gapRect = figma.createRectangle();
      gapRect.name = 'Rectangle';
      gapRect.resize(gapW, gapH);
      gapRect.fills = solidPaint(COLOR_ORANGE, 0.2);
      
      if (layoutMode === 'HORIZONTAL') {
        // Horizontal gap (vertical bar): only left and right strokes
        gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
        gapRect.strokeWeight = 1;
        gapRect.strokeLeftWeight = 1;
        gapRect.strokeRightWeight = 1;
        gapRect.strokeTopWeight = 0;
        gapRect.strokeBottomWeight = 0;
      } else {
        // Vertical gap (horizontal bar): only top and bottom strokes
        gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
        gapRect.strokeWeight = 1;
        gapRect.strokeLeftWeight = 0;
        gapRect.strokeRightWeight = 0;
        gapRect.strokeTopWeight = 1;
        gapRect.strokeBottomWeight = 1;
      }
      
      gapFrame.appendChild(gapRect);

      // Create label - flows in auto layout after rectangle
      var gapLabel = makeText(Math.round(gap) + '', 10, FONT_BOLD, COLOR_ORANGE);
      gapFrame.appendChild(gapLabel);

      page.appendChild(gapFrame);
      (gapFrame as any).layoutPositioning = 'ABSOLUTE';
      gapFrame.locked = true;
      redlineNodes.push(gapFrame);
    }
  }

  // Group all redline nodes and lock the group
  if (redlineNodes.length > 0) {
    var redlineGroup = figma.group(redlineNodes, page);
    redlineGroup.name = SPEC_PREFIX + 'Layout Redlines';
    redlineGroup.locked = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SPEC PANEL MODULES (textual description frame)
// ═══════════════════════════════════════════════════════════════════

async function buildComponentInstanceModule(section: FrameNode, node: SceneNode): Promise<void> {
  addSectionHeader(section, 'Component Instance');
  var f = node as any;

  if (f.type === 'INSTANCE') {
    var instanceNode = node as InstanceNode;
    var mainComp: any = null;
    try {
      mainComp = await instanceNode.getMainComponentAsync();
    } catch (e) {}
    if (mainComp) {
      section.appendChild(makeRow('Main Component', mainComp.name));
      var propDefs = mainComp.componentPropertyDefinitions;
      if (propDefs) {
        var count = Object.keys(propDefs).length;
        if (count > 0) section.appendChild(makeRow('Properties', count + ' defined'));
      }
    }
  } else if (f.type === 'COMPONENT') {
    section.appendChild(makeText('This is the main component', 11, FONT_REGULAR, COLOR_VALUE));
  } else {
    section.appendChild(makeText('Not a component or instance', 11, FONT_REGULAR, COLOR_MUTED));
  }
}

function buildDimensionsModule(section: FrameNode, node: SceneNode): void {
  addSectionHeader(section, 'Dimensions');
  var f = node as any;
  section.appendChild(makeRow('Width', Math.round(f.width || 0) + 'px'));
  section.appendChild(makeRow('Height', Math.round(f.height || 0) + 'px'));
  if (f.rotation) section.appendChild(makeRow('Rotation', Math.round(f.rotation) + '°'));
  if (f.minWidth) section.appendChild(makeRow('Min Width', f.minWidth + 'px'));
  if (f.maxWidth) section.appendChild(makeRow('Max Width', f.maxWidth + 'px'));
  if (f.minHeight) section.appendChild(makeRow('Min Height', f.minHeight + 'px'));
  if (f.maxHeight) section.appendChild(makeRow('Max Height', f.maxHeight + 'px'));
}

function buildSpacingModule(section: FrameNode, node: SceneNode): void {
  addSectionHeader(section, 'Spacing');
  var f = node as any;

  var layout = f.layoutMode || (f.inferredAutoLayout ? f.inferredAutoLayout.layoutMode : null);
  section.appendChild(makeRow('Auto Layout', (layout && layout !== 'NONE') ? layout : 'None'));

  var pl = f.paddingLeft || 0;
  var pr = f.paddingRight || 0;
  var pt = f.paddingTop || 0;
  var pb = f.paddingBottom || 0;

  if (pl === 0 && pr === 0 && pt === 0 && pb === 0 && f.inferredAutoLayout) {
    var ia2 = f.inferredAutoLayout;
    pl = ia2.paddingLeft || 0;
    pr = ia2.paddingRight || 0;
    pt = ia2.paddingTop || 0;
    pb = ia2.paddingBottom || 0;
  }

  function fmtPad(val: number, prop: string): string {
    var v = resolveVarAlias(f, prop);
    if (v) return v;
    return val + 'px';
  }

  section.appendChild(makeRow('Padding Top', fmtPad(pt, 'paddingTop')));
  section.appendChild(makeRow('Padding Right', fmtPad(pr, 'paddingRight')));
  section.appendChild(makeRow('Padding Bottom', fmtPad(pb, 'paddingBottom')));
  section.appendChild(makeRow('Padding Left', fmtPad(pl, 'paddingLeft')));

  var gap2 = f.itemSpacing || 0;
  if (gap2 === 0 && f.inferredAutoLayout) gap2 = f.inferredAutoLayout.itemSpacing || 0;
  section.appendChild(makeRow('Item Spacing', fmtPad(gap2, 'itemSpacing')));

  if (f.primaryAxisAlignItems) section.appendChild(makeRow('Main Axis', f.primaryAxisAlignItems));
  if (f.counterAxisAlignItems) section.appendChild(makeRow('Cross Axis', f.counterAxisAlignItems));
}

function collectLayers(parent: any, depth: number): Array<{ node: SceneNode; depth: number }> {
  var result: Array<{ node: SceneNode; depth: number }> = [];
  if (!parent.children) return result;
  for (var i = 0; i < parent.children.length; i++) {
    var child = parent.children[i] as SceneNode;
    result.push({ node: child, depth: depth });
    if ('children' in child && (child as any).children) {
      var nested = collectLayers(child, depth + 1);
      for (var j = 0; j < nested.length; j++) result.push(nested[j]);
    }
  }
  return result;
}

function buildAnatomyModule(section: FrameNode, node: SceneNode): void {
  addSectionHeader(section, 'Anatomy');
  var layers = collectLayers(node, 0);

  var headerRow = figma.createFrame();
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'FIXED';
  headerRow.counterAxisSizingMode = 'AUTO';
  headerRow.resize(SPEC_ROW_WIDTH, 1);
  headerRow.itemSpacing = 8;
  headerRow.fills = [];

  var numH = makeText('#', 10, FONT_BOLD, COLOR_MUTED);
  numH.resize(24, numH.height);
  var nameH = makeText('Layer Name', 10, FONT_BOLD, COLOR_MUTED);
  nameH.resize(500, nameH.height);
  var typeH = makeText('Type', 10, FONT_BOLD, COLOR_MUTED);
  typeH.resize(140, typeH.height);

  headerRow.appendChild(numH);
  headerRow.appendChild(nameH);
  headerRow.appendChild(typeH);
  section.appendChild(headerRow);
  section.appendChild(makeHorizontalDivider(SPEC_ROW_WIDTH));

  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    var indent = '';
    for (var d = 0; d < layer.depth; d++) indent = indent + '  ';

    var layerRow = figma.createFrame();
    layerRow.layoutMode = 'HORIZONTAL';
    layerRow.primaryAxisSizingMode = 'FIXED';
    layerRow.counterAxisSizingMode = 'AUTO';
    layerRow.resize(SPEC_ROW_WIDTH, 1);
    layerRow.itemSpacing = 8;
    layerRow.fills = [];

    var numCell = makeText('' + (i + 1), 10, FONT_REGULAR, COLOR_ACCENT);
    numCell.resize(24, numCell.height);
    var nameCell = makeText(indent + layer.node.name, 10, FONT_REGULAR, COLOR_VALUE);
    nameCell.resize(500, nameCell.height);
    var typeCell = makeText(layer.node.type, 10, FONT_REGULAR, COLOR_MUTED);
    typeCell.resize(140, typeCell.height);

    layerRow.appendChild(numCell);
    layerRow.appendChild(nameCell);
    layerRow.appendChild(typeCell);
    section.appendChild(layerRow);
  }

  section.appendChild(makeText(layers.length + ' layers total', 10, FONT_REGULAR, COLOR_MUTED));
}

function buildStylesModule(section: FrameNode, node: SceneNode): void {
  addSectionHeader(section, 'Styles');
  var f = node as any;

  var fillStyleName = resolveStyleName(f.fillStyleId);
  if (f.fills && f.fills.length > 0) {
    section.appendChild(makeText('Fills', 11, FONT_BOLD, COLOR_HEADER));
    for (var i = 0; i < f.fills.length; i++) {
      var fill = f.fills[i];
      if (fill.visible === false) continue;
      if (fill.type === 'SOLID') {
        var hex = rgbToHex(fill.color);
        var opacity = fill.opacity !== undefined ? Math.round(fill.opacity * 100) : 100;
        var fillVal = hex + '  ' + opacity + '%';
        var fillVar = resolveVarAlias(f, 'fills', i);
        if (fillVar) fillVal = fillVal + '  →  ' + fillVar;
        if (fillStyleName) fillVal = fillVal + '  [' + fillStyleName + ']';

        var swatchRow = figma.createFrame();
        swatchRow.layoutMode = 'HORIZONTAL';
        swatchRow.primaryAxisSizingMode = 'AUTO';
        swatchRow.counterAxisSizingMode = 'AUTO';
        swatchRow.itemSpacing = 8;
        swatchRow.counterAxisAlignItems = 'CENTER';
        swatchRow.fills = [];

        var swatch = figma.createRectangle();
        swatch.resize(16, 16);
        swatch.cornerRadius = 3;

        // Build base paint then bind to Figma variable if one is assigned to this fill slot.
        var swatchPaint: Paint = solidPaint(fill.color, fill.opacity)[0];
        if (f.boundVariables && f.boundVariables['fills']) {
          var fillBindings = f.boundVariables['fills'];
          var fillEntry: any = Array.isArray(fillBindings) ? fillBindings[i] : fillBindings;
          if (fillEntry && fillEntry.id) {
            try {
              var fillVariable = resolveVariableFromBinding('', fillEntry);
              if (fillVariable) {
                swatchPaint = figma.variables.setBoundVariableForPaint(swatchPaint as SolidPaint, 'color', fillVariable);
              }
            } catch (e) {}
          }
        }
        swatch.fills = [swatchPaint];
        swatch.strokes = solidPaint(COLOR_DIVIDER);
        swatch.strokeWeight = 1;
        swatchRow.appendChild(swatch);
        swatchRow.appendChild(makeText(fillVal, 10, FONT_REGULAR, COLOR_VALUE));

        section.appendChild(swatchRow);
      } else {
        section.appendChild(makeRow('Gradient', fill.type));
      }
    }
    section.appendChild(makeHorizontalDivider(SPEC_ROW_WIDTH));
  }

  var strokeStyleName = resolveStyleName(f.strokeStyleId);
  if (f.strokes && f.strokes.length > 0) {
    section.appendChild(makeText('Strokes', 11, FONT_BOLD, COLOR_HEADER));
    for (var si = 0; si < f.strokes.length; si++) {
      var stroke = f.strokes[si];
      if (stroke.visible === false) continue;
      if (stroke.type === 'SOLID') {
        var sHex = rgbToHex(stroke.color);
        var sW = f.strokeWeight || 0;
        var sAlign = f.strokeAlign || 'CENTER';
        var strokeVal = sHex + '  ' + sW + 'px  ' + sAlign;
        if (strokeStyleName) strokeVal = strokeVal + '  [' + strokeStyleName + ']';
        section.appendChild(makeRow('Border', strokeVal));
      }
    }
    section.appendChild(makeHorizontalDivider(SPEC_ROW_WIDTH));
  }

  var cr = f.cornerRadius;
  if (cr !== undefined && cr !== figma.mixed && cr > 0) {
    var crVal = Math.round(cr) + 'px';
    var crVar = resolveVarAlias(f, 'cornerRadius');
    if (crVar) crVal = crVal + '  →  ' + crVar;
    section.appendChild(makeRow('Corner Radius', crVal));
  } else if (cr === figma.mixed) {
    var tl = f.topLeftRadius || 0;
    var tr = f.topRightRadius || 0;
    var br2 = f.bottomRightRadius || 0;
    var bl = f.bottomLeftRadius || 0;
    section.appendChild(makeRow('Corner Radius', tl + '/' + tr + '/' + br2 + '/' + bl + 'px'));
  }

  var effectStyleName = resolveStyleName(f.effectStyleId);
  if (effectStyleName) section.appendChild(makeRow('Effects', effectStyleName));
}

// ═══════════════════════════════════════════════════════════════════
// DIMENSION LINES (width / height)
// ═══════════════════════════════════════════════════════════════════

function createDimensionAnnotations(node: SceneNode, page: PageNode): void {
  var b = getNodeBounds(node);

  // Width dimension line above the component
  var wLine = figma.createLine();
  wLine.name = SPEC_PREFIX + 'Dim-Width';
  wLine.strokeWeight = 1;
  wLine.strokes = solidPaint(COLOR_DIMENSION);
  wLine.x = b.x;
  wLine.y = b.y - 20;
  (wLine as any).resize(b.w, 0);
  wLine.locked = true;

  var wLabel = makeText(Math.round(b.w) + 'px', 10, FONT_BOLD, COLOR_DIMENSION);
  wLabel.x = b.x + b.w / 2 - 16;
  wLabel.y = b.y - 36;
  wLabel.locked = true;

  // Height dimension line to the left
  var hLine = figma.createLine();
  hLine.name = SPEC_PREFIX + 'Dim-Height';
  hLine.strokeWeight = 1;
  hLine.strokes = solidPaint(COLOR_DIMENSION);
  hLine.x = b.x - 20;
  hLine.y = b.y;
  (hLine as any).resize(b.h, 0);
  hLine.rotation = -90;
  hLine.locked = true;

  var hLabel = makeText(Math.round(b.h) + 'px', 10, FONT_BOLD, COLOR_DIMENSION);
  hLabel.x = b.x - 52;
  hLabel.y = b.y + b.h / 2 - 6;
  hLabel.locked = true;

  var dimNodes: SceneNode[] = [wLine, wLabel, hLine, hLabel];
  for (var di = 0; di < dimNodes.length; di++) page.appendChild(dimNodes[di]);
  var dimGroup = figma.group(dimNodes, page);
  dimGroup.name = SPEC_PREFIX + 'Dimensions';
  dimGroup.locked = true;
}

function makeLightPreviewPanel(width: number, height: number): FrameNode {
  var panel = figma.createFrame();
  panel.layoutMode = 'NONE';
  panel.primaryAxisSizingMode = 'FIXED';
  panel.counterAxisSizingMode = 'FIXED';
  panel.resize(width, height);
  panel.fills = solidPaint(TOKEN_PREVIEW_BG);
  panel.cornerRadius = TOKEN_PREVIEW_RADIUS;
  // Clipped: a preview should never show content past its own edge. This
  // was briefly turned off because growth logic elsewhere could under-size
  // the panel and clipping would hide that instead of exposing it — but
  // hiding overflow isn't the fix, sizing the panel correctly is. The real
  // bug (buildLayoutSheetSection forcing a grown panel back down to FILL,
  // discarding its growth) is now fixed at the source; if a preview crops
  // again, that's a sizing bug to fix there, not a reason to stop clipping.
  panel.clipsContent = true;
  return panel;
}

function makePreviewStage(width: number, height: number): FrameNode {
  var stage = figma.createFrame();
  stage.layoutMode = 'NONE';
  stage.primaryAxisSizingMode = 'FIXED';
  stage.counterAxisSizingMode = 'FIXED';
  stage.resize(width, height);
  stage.fills = [];
  stage.clipsContent = false;
  return stage;
}

async function makePreviewSourceNode(node: SceneNode): Promise<SceneNode> {
  if (node.type === 'COMPONENT') {
    return (node as ComponentNode).createInstance();
  }

  if (node.type === 'COMPONENT_SET') {
    var setNode = node as any;
    var variant = setNode.defaultVariant || (setNode.children && setNode.children[0]);
    if (variant && variant.type === 'COMPONENT') {
      return (variant as ComponentNode).createInstance();
    }
  }

  if (node.type === 'INSTANCE') {
    var instanceNode = node as any;
    var mainComponent: ComponentNode | null = null;
    try {
      mainComponent = await node.getMainComponentAsync();
    } catch (e) {}
    if (mainComponent) {
      var freshInstance = mainComponent.createInstance();
      try {
        var updates: { [key: string]: string | boolean } = {};
        var componentProperties = instanceNode.componentProperties || {};
        for (var propKey in componentProperties) {
          if (!componentProperties.hasOwnProperty(propKey)) continue;
          var propEntry = componentProperties[propKey];
          if (propEntry && typeof propEntry === 'object' && 'value' in propEntry) {
            updates[propKey] = propEntry.value;
          }
        }
        if (Object.keys(updates).length > 0 && typeof (freshInstance as any).setProperties === 'function') {
          (freshInstance as any).setProperties(updates);
        }
      } catch (e) {}
      return freshInstance;
    }
  }

  return (node as any).clone() as SceneNode;
}

function makeVerticalAutoFrame(width: number): FrameNode {
  var f = figma.createFrame();
  f.layoutMode = 'VERTICAL';
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'FIXED';
  f.layoutSizingVertical = 'HUG' as any;
  f.clipsContent = false;
  f.fills = [];
  return f;
}

function centerNodeInPanel(node: SceneNode, panel: FrameNode, maxWidth: number, maxHeight: number, allowScale?: boolean): SceneNode {
  panel.appendChild(node);

  var currentW = (node as any).width || 1;
  var currentH = (node as any).height || 1;
  var sx = maxWidth / currentW;
  var sy = maxHeight / currentH;
  var scale = Math.min(sx, sy, 1);

  var w = (node as any).width || 1;
  var h = (node as any).height || 1;
  if (allowScale === false) {
    // 28px, not 16: callers like buildLayoutSheetSection draw padding/gap
    // guide labels after this returns, positioned outside the clone's own
    // bounding box (e.g. a "Top" padding label sits above it) — with too
    // tight a margin here those labels land right at (or past) the panel
    // edge clipsContent now enforces.
    var padX = 28;
    var padY = 28;
    var requiredWidth = w + padX * 2;
    var requiredHeight = h + padY * 2;
    if ((panel as any).width < requiredWidth || (panel as any).height < requiredHeight) {
      panel.resize(Math.max((panel as any).width || 0, requiredWidth), Math.max((panel as any).height || 0, requiredHeight));
      maxWidth = (panel as any).width || maxWidth;
      maxHeight = (panel as any).height || maxHeight;
    }
  }
  // Keep the instance centered; guide offsets are handled separately.
  node.x = Math.round((maxWidth - w) / 2);
  node.y = Math.round((maxHeight - h) / 2);
  if (panel.layoutMode !== 'NONE' && 'layoutPositioning' in node) {
    (node as any).layoutPositioning = 'ABSOLUTE';
  }
  // Without this, Figma defaults new nodes to MIN/MIN (pinned top-left):
  // if the panel is later resized wider — by this sheet's own FILL cascade
  // finishing after this node was positioned, or by a user resizing the
  // sheet by hand afterward — the node just stays at its original x/y
  // instead of staying centered. CENTER/CENTER makes Figma keep it
  // centered reactively, with no manual recentering pass needed.
  try {
    (node as any).constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
  } catch (e) {}
  return node;
}

function cloneNodeCentered(source: SceneNode, panel: FrameNode, maxWidth: number, maxHeight: number, allowScale?: boolean): SceneNode {
  var clone = (source as any).clone() as SceneNode;
  return centerNodeInPanel(clone, panel, maxWidth, maxHeight, allowScale);
}

function makeAlignmentGrid(sourceInfo: any, mode: string): FrameNode {
  var primaryAlign = sourceInfo.primaryAxisAlignItems || 'MIN';
  var counterAlign = sourceInfo.counterAxisAlignItems || 'MIN';
  var squareSize = 8;
  var gridGap = 4;
  var outlineColor: RGB = { r: 0.8, g: 0.8, b: 0.8 };
  var fillColor: RGB = { r: 0.5, g: 0.5, b: 0.5 };

  var selectedRow = 0;
  var selectedCol = 0;

  if (mode === 'HORIZONTAL') {
    if (primaryAlign === 'CENTER') selectedCol = 1;
    else if (primaryAlign === 'MAX') selectedCol = 2;
    if (counterAlign === 'CENTER') selectedRow = 1;
    else if (counterAlign === 'MAX') selectedRow = 2;
  } else {
    if (primaryAlign === 'CENTER') selectedRow = 1;
    else if (primaryAlign === 'MAX') selectedRow = 2;
    if (counterAlign === 'CENTER') selectedCol = 1;
    else if (counterAlign === 'MAX') selectedCol = 2;
  }

  var grid = figma.createFrame();
  grid.name = 'Alignment-Grid';
  grid.layoutMode = 'HORIZONTAL';
  (grid as any).layoutWrap = 'WRAP';
  grid.primaryAxisSizingMode = 'AUTO';
  grid.counterAxisSizingMode = 'AUTO';
  grid.itemSpacing = gridGap;
  (grid as any).counterAxisSpacing = gridGap;
  grid.fills = [];
  grid.clipsContent = false;
  grid.resize((squareSize * 3) + (gridGap * 2), (squareSize * 3) + (gridGap * 2));
  grid.x = 24;
  grid.y = 24;

  for (var row = 0; row < 3; row++) {
    for (var col = 0; col < 3; col++) {
      var square = figma.createRectangle();
      square.name = 'Alignment-Grid-Cell';
      square.resize(squareSize, squareSize);
      square.fills = [];
      square.strokes = solidPaint(outlineColor, 1);
      square.strokeWeight = 1;

      var isSelected = (row === selectedRow && col === selectedCol);
      square.fills = isSelected ? solidPaint(fillColor, 1) : [];
      square.strokes = isSelected ? solidPaint(fillColor, 1) : solidPaint(outlineColor, 1);
      if (isSelected) {
        square.strokeWeight = 1;
      }
      grid.appendChild(square);
    }
  }

  return grid;
}

function makeSectionWrapper(title: string): FrameNode {
  var section = figma.createFrame();
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.name = SPEC_PREFIX + title;
  section.itemSpacing = 18;
  section.paddingTop = 28;
  section.paddingBottom = 28;
  section.paddingLeft = 24;
  section.paddingRight = 24;
  section.fills = solidPaint(WHITE);
  section.clipsContent = false;

  section.appendChild(makeText(title, 44, FONT_BOLD, COLOR_HEADER));
  return section;
}

function makeMetaSection(): FrameNode {
  var section = figma.createFrame();
  section.name = SPEC_PREFIX + 'Meta';
  section.layoutMode = 'VERTICAL';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'AUTO';
  section.itemSpacing = 6;
  section.paddingTop = 20;
  section.paddingBottom = 20;
  section.paddingLeft = 24;
  section.paddingRight = 24;
  section.fills = solidPaint(WHITE);
  section.clipsContent = false;

  var now = new Date();
  var dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  var timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  var timezone = '';

  try {
    var tzFormatter: any = Intl.DateTimeFormat('en-US', { hour: 'numeric', timeZoneName: 'short' });
    var tzParts: any[] = tzFormatter.formatToParts ? tzFormatter.formatToParts(now) : [];
    for (var tp = 0; tp < tzParts.length; tp++) {
      if (tzParts[tp].type === 'timeZoneName' && tzParts[tp].value) {
        timezone = tzParts[tp].value;
        break;
      }
    }
  } catch (e) {}

  if (!timezone) {
    try {
      var resolvedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      var usOffset = now.getTimezoneOffset();
      if (resolvedTimezone === 'America/New_York' || resolvedTimezone === 'US/Eastern') {
        timezone = usOffset === 240 ? 'EDT' : 'EST';
      } else if (resolvedTimezone === 'America/Chicago' || resolvedTimezone === 'US/Central') {
        timezone = usOffset === 300 ? 'CDT' : 'CST';
      } else if (resolvedTimezone === 'America/Denver' || resolvedTimezone === 'US/Mountain') {
        timezone = usOffset === 360 ? 'MDT' : 'MST';
      } else if (resolvedTimezone === 'America/Los_Angeles' || resolvedTimezone === 'US/Pacific') {
        timezone = usOffset === 420 ? 'PDT' : 'PST';
      } else if (resolvedTimezone === 'America/Anchorage' || resolvedTimezone === 'US/Alaska') {
        timezone = usOffset === 480 ? 'AKDT' : 'AKST';
      } else if (resolvedTimezone === 'Pacific/Honolulu' || resolvedTimezone === 'US/Hawaii') {
        timezone = 'HST';
      } else if (resolvedTimezone === 'America/Phoenix') {
        timezone = 'MST';
      } else if (resolvedTimezone) {
        timezone = resolvedTimezone;
      }
    } catch (e) {}
  }

  var timestamp = timezone
    ? 'Last updated: ' + dateStr + ' at ' + timeStr + ' (' + timezone + ')'
    : 'Last updated: ' + dateStr + ' at ' + timeStr;
  section.appendChild(makeText(timestamp, 11, FONT_REGULAR, COLOR_MUTED));

  try {
    var currentUserName = figma.currentUser && figma.currentUser.name ? figma.currentUser.name.trim() : '';
    if (currentUserName) {
      section.appendChild(makeText('By: ' + currentUserName, 11, FONT_REGULAR, COLOR_MUTED));
    }
  } catch (e) {}

  return section;
}

// Establishes the sheet's width as the one real, explicit source of truth
// (FIXED, not HUG) and makes every top-level section a genuine FILL child
// of it — real Figma auto-layout sizing, not a precomputed number that
// merely happens to agree with everyone else. This is what makes resizing
// the "spec" frame by hand in Figma actually cascade to its sections,
// instead of leaving them stuck at whatever width they were built with.
//
// Sections can still legitimately need more than SHEET_INNER_WIDTH (e.g.
// Layout & Spacing growing to avoid distorting an oversized component) —
// if any section's natural width exceeds the baseline, the sheet grows to
// match instead of clipping it, same safety net the old width-matching
// pass provided.
function finalizeSheetWidth(sheet: FrameNode): void {
  var targetWidth = SHEET_INNER_WIDTH;
  for (var i = 0; i < sheet.children.length; i++) {
    var child = sheet.children[i] as any;
    if (!child || child.visible === false) continue;
    if (child.type !== 'FRAME') continue;
    targetWidth = Math.max(targetWidth, child.width || 0);
  }

  sheet.counterAxisSizingMode = 'FIXED';
  try {
    sheet.resizeWithoutConstraints(targetWidth, sheet.height || 1);
  } catch (e) {}

  for (var j = 0; j < sheet.children.length; j++) {
    var section = sheet.children[j] as any;
    if (!section || section.visible === false) continue;
    if (section.type !== 'FRAME') continue;
    try {
      section.layoutSizingHorizontal = 'FILL';
    } catch (e) {}
  }
}

function buildModuleLabel(modules: any, hasStateOutput: boolean): string {
  var parts: string[] = [];
  if (modules.anatomy) parts.push('Anatomy');
  if (hasStateOutput) parts.push('States');
  if (modules.variables) parts.push('Variables');
  if (modules.spacing || modules.dimensions) parts.push('Layout');
  return parts.length > 0 ? ' [' + parts.join(' • ') + ']' : '';
}



function collectAnatomyTargets(root: any, maxItems: number): any[] {
  var picked: any[] = [];
  var seen: { [key: string]: boolean } = {};

  function addNode(n: any): void {
    if (!n || n.visible === false) return;
    if (picked.length >= maxItems) return;
    var id = n.id || n.name + '_' + n.type;
    if (seen[id]) return;
    var w = n.width || 0;
    var h = n.height || 0;
    if (w < 2 || h < 2) return;
    seen[id] = true;
    picked.push(n);
  }

  var direct = root.children || [];
  for (var i = 0; i < direct.length && picked.length < maxItems; i++) {
    var d = direct[i];
    var dt = d.type;
    if (dt === 'FRAME' || dt === 'INSTANCE' || dt === 'COMPONENT' || dt === 'TEXT' || dt === 'VECTOR' || dt === 'RECTANGLE' || dt === 'ELLIPSE') {
      addNode(d);
    }
  }

  function walkDesc(n: any, depth: number): void {
    if (picked.length >= maxItems || depth > 3) return;
    var children = n.children || [];
    for (var ci = 0; ci < children.length; ci++) {
      var c = children[ci];
      if (!c || c.visible === false) continue;
      var t = c.type;
      var significant = (t === 'TEXT' || t === 'INSTANCE' || t === 'VECTOR' || t === 'RECTANGLE' || t === 'ELLIPSE' || t === 'LINE' || t === 'POLYGON' || t === 'STAR');
      if (significant) addNode(c);
      if (picked.length >= maxItems) return;
      // Do not recurse into instances — their children are internal implementation details.
      if (t !== 'INSTANCE') {
        walkDesc(c, depth + 1);
      }
      if (picked.length >= maxItems) return;
    }
  }

  walkDesc(root, 0);
  return picked.slice(0, maxItems);
}

function getPerimeterCalloutSlots(boxX: number, boxY: number, boxW: number, boxH: number): Array<{ x: number; y: number }> {
  return [
    { x: boxX - 36, y: boxY + boxH * 0.25 },
    { x: boxX + boxW * 0.2, y: boxY - 30 },
    { x: boxX + boxW * 0.5, y: boxY - 30 },
    { x: boxX + boxW * 0.8, y: boxY - 30 },
    { x: boxX + boxW + 36, y: boxY + boxH * 0.2 },
    { x: boxX + boxW + 36, y: boxY + boxH * 0.5 },
    { x: boxX + boxW * 0.25, y: boxY + boxH + 30 },
    { x: boxX + boxW + 36, y: boxY + boxH * 0.78 }
  ];
}

function createLeaderLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB,
  axis?: 'vertical' | 'horizontal'
): SceneNode[] {
  var nodes: SceneNode[] = [];

  var drawAxis = axis || (Math.abs(x2 - x1) >= Math.abs(y2 - y1) ? 'horizontal' : 'vertical');

  if (drawAxis === 'horizontal') {
    var hLen = Math.abs(x2 - x1);
    if (hLen > 0.5) {
      var h = figma.createLine();
      h.strokeWeight = 1;
      h.strokes = solidPaint(color);
      h.x = Math.min(x1, x2);
      h.y = y1;
      (h as any).resize(hLen, 0);
      nodes.push(h);
    }
  } else {
    var vLen = Math.abs(y2 - y1);
    if (vLen > 0.5) {
      var v = figma.createLine();
      v.strokeWeight = 1;
      v.strokes = solidPaint(color);
      v.x = x1;
      v.y = Math.min(y1, y2);
      (v as any).resize(vLen, 0);
      v.rotation = -90;
      nodes.push(v);
    }
  }

  return nodes;
}

function createNumberBadge(num: number, color: RGB): FrameNode {
  var badge = figma.createFrame();
  badge.layoutMode = 'NONE';
  badge.resize(24, 24);
  badge.cornerRadius = 12;
  badge.fills = solidPaint(WHITE);
  badge.strokes = solidPaint(color);
  badge.strokeWeight = 1;

  var n = makeText('' + num, 11, FONT_BOLD, color);
  n.resize(24, n.height);
  n.textAlignHorizontal = 'CENTER';
  n.x = 0;
  n.y = 6;
  badge.appendChild(n);
  return badge;
}

function createCalloutRail(name: string, length: number, axis: 'vertical' | 'horizontal', color: RGB): RectangleNode {
  var rail = figma.createRectangle();
  rail.name = name;
  rail.fills = solidPaint(color, 0.6);
  rail.strokes = [];
  rail.cornerRadius = 0;

  var railLength = Math.max(1, Math.round(length));
  if (axis === 'horizontal') {
    rail.resize(railLength, 1);
  } else {
    rail.resize(1, railLength);
  }

  return rail;
}

async function buildAnatomySheetSection(parent: FrameNode, node: SceneNode): Promise<void> {
  var section = makeSectionWrapper('Anatomy');

  var row = figma.createFrame();
  row.name = SPEC_PREFIX + 'Anatomy Content';
  row.layoutMode = 'VERTICAL';
  row.layoutAlign = 'STRETCH';
  row.resize(SHEET_INNER_WIDTH - 48, 10);
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'FIXED';
  row.itemSpacing = 20;
  row.fills = [];

  var preview = figma.createFrame();
  preview.name = SPEC_PREFIX + 'Anatomy Preview';
  preview.layoutMode = 'NONE';
  preview.layoutAlign = 'STRETCH';
  var ANATOMY_PAD_V = 32;
  var ANATOMY_MIN_H = 340;
  var ANATOMY_W = SHEET_INNER_WIDTH - 48;

  preview.resize(ANATOMY_W, ANATOMY_MIN_H);
  preview.primaryAxisSizingMode = 'FIXED';
  preview.counterAxisSizingMode = 'FIXED';
  preview.fills = [];
  preview.clipsContent = true;

  var previewCanvas = figma.createFrame();
  previewCanvas.name = SPEC_PREFIX + 'Anatomy Preview Canvas';
  previewCanvas.layoutMode = 'HORIZONTAL';
  previewCanvas.layoutAlign = 'STRETCH';
  previewCanvas.resize(ANATOMY_W, ANATOMY_MIN_H);
  previewCanvas.primaryAxisSizingMode = 'FIXED';
  previewCanvas.counterAxisSizingMode = 'FIXED';
  previewCanvas.primaryAxisAlignItems = 'CENTER';
  previewCanvas.counterAxisAlignItems = 'CENTER';
  previewCanvas.fills = solidPaint(TOKEN_PREVIEW_BG);
  previewCanvas.cornerRadius = TOKEN_PREVIEW_RADIUS;
  previewCanvas.clipsContent = true;

  preview.appendChild(previewCanvas);
  previewCanvas.x = 0;
  previewCanvas.y = 0;
  // previewCanvas.layoutAlign='STRETCH' above is inert: preview (its parent)
  // is layoutMode='NONE', and layoutAlign only does anything inside an
  // auto-layout parent. The constraints API is what applies here, and its
  // both-edges-pinned value is 'STRETCH' ("Left and right" in the UI — an
  // earlier pass used 'LEFT_RIGHT', which isn't a valid API value, so the
  // assignment threw, the catch swallowed it, and the canvas silently kept
  // its default left-pin while everything around it widened).
  try {
    (previewCanvas as any).constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
  } catch (e) {}

  var previewSource: SceneNode = await makePreviewSourceNode(node);

  // For anatomy previews, expand boolean properties so optional layers are visible.
  try {
    var previewAsAny = previewSource as any;
    if (previewAsAny && typeof previewAsAny.setProperties === 'function' && previewAsAny.componentProperties) {
      var boolUpdates: { [key: string]: boolean } = {};
      var compProps = previewAsAny.componentProperties || {};
      for (var cpKey in compProps) {
        if (!compProps.hasOwnProperty(cpKey)) continue;
        var entry = compProps[cpKey];
        if (!entry) continue;
        var entryType = normalizeComponentPropertyType(entry.type);
        if (entryType === 'BOOLEAN') boolUpdates[cpKey] = true;
      }
      if (Object.keys(boolUpdates).length > 0) {
        previewAsAny.setProperties(boolUpdates);
      }
    }
  } catch (e) {}

  // Add the component to the auto layout canvas (it will be centered automatically)
  previewCanvas.appendChild(previewSource);

  // Expand height to fit content, with 32px vertical padding on each side
  var sourceNativeH = (previewSource as any).height || 0;
  var neededH = Math.max(ANATOMY_MIN_H, sourceNativeH + ANATOMY_PAD_V * 2);
  if (neededH > ANATOMY_MIN_H) {
    previewCanvas.resize(ANATOMY_W, neededH);
    preview.resize(ANATOMY_W, neededH);
  }

  var previewClone = previewSource as any;
  var previewWrapperBounds = getNodeBounds(preview as any);
  var cloneBounds = getNodeBounds(previewClone);

  // Build marker data – one entry per visible layer, breadth-first
  type MarkerData = {
    node: SceneNode;
    name: string;
    type: 'container' | 'base' | 'base-child' | 'other';
    bounds: { x: number; y: number; w: number; h: number; left: number; top: number };
  };

  function makeBounds(n: any): { x: number; y: number; w: number; h: number; left: number; top: number } {
    var b = getNodeBounds(n);
    return {
      x: b.x - previewWrapperBounds.x + b.w / 2,
      y: b.y - previewWrapperBounds.y + b.h / 2,
      w: b.w,
      h: b.h,
      left: b.x - previewWrapperBounds.x,
      top: b.y - previewWrapperBounds.y
    };
  }

  var markers: MarkerData[] = [];

  // 1. Container
  markers.push({ node: previewClone, name: node.name || 'Component', type: 'container', bounds: makeBounds(previewClone) });

  // 2. Direct children of the component, then their direct children (breadth-first, cap 10)
  var markerQueue: Array<{ node: any; depth: number }> = [];
  var directKids = (previewClone.children || []) as any[];
  for (var di = 0; di < directKids.length; di++) {
    if (directKids[di] && directKids[di].visible !== false) markerQueue.push({ node: directKids[di], depth: 1 });
  }

  for (var qi = 0; qi < markerQueue.length && markers.length < 10; qi++) {
    var qentry = markerQueue[qi];
    var layer = qentry.node;
    var lw = layer.width || 0;
    var lh = layer.height || 0;
    if (lw < 2 || lh < 2) continue;
    // Bare vector layers (icon paths, decorative shapes) are implementation
    // detail, not anatomy — numbering them adds noise without documenting
    // anything meaningful. They're leaf nodes, so skipping also means not
    // enqueueing (nonexistent) children.
    if (layer.type === 'VECTOR') continue;

    var mtype: 'base' | 'base-child' | 'other' = qentry.depth === 1 ? 'base' : 'base-child';
    markers.push({ node: layer, name: layer.name || ('Layer ' + markers.length), type: mtype, bounds: makeBounds(layer) });

    // Queue grandchildren (one more level only)
    if (qentry.depth < 2 && layer.children) {
      var kids = layer.children as any[];
      for (var ki = 0; ki < kids.length; ki++) {
        if (kids[ki] && kids[ki].visible !== false) markerQueue.push({ node: kids[ki], depth: qentry.depth + 1 });
      }
    }
  }

  var placedMarkerCenters: Array<{ x: number; y: number }> = [];

  function overlapsExisting(cx: number, cy: number): boolean {
    for (var pm = 0; pm < placedMarkerCenters.length; pm++) {
      var dx = Math.abs(placedMarkerCenters[pm].x - cx);
      var dy = Math.abs(placedMarkerCenters[pm].y - cy);
      if (dx < 28 && dy < 28) return true;
    }
    return false;
  }

  function overlapsTextRect(left: number, top: number, width: number, height: number): boolean {
    for (var mr = 0; mr < markers.length; mr++) {
      var textNode = markers[mr].node as any;
      if (!textNode || textNode.type !== 'TEXT') continue;
      var textBounds = markers[mr].bounds;
      var right = left + width;
      var bottom = top + height;
      var textRight = textBounds.left + textBounds.w;
      var textBottom = textBounds.top + textBounds.h;
      if (left < textRight && right > textBounds.left && top < textBottom && bottom > textBounds.top) {
        return true;
      }
    }
    return false;
  }

  function getMarkerFrameRect(anchorX: number, anchorY: number, badgeCenterX: number, badgeCenterY: number, axis: 'vertical' | 'horizontal'): { left: number; top: number; w: number; h: number } {
    var badgeSize = 24;
    if (axis === 'horizontal') {
      var hLeft = Math.min(anchorX, badgeCenterX - (badgeSize / 2));
      return {
        left: hLeft,
        top: badgeCenterY - (badgeSize / 2),
        w: Math.max(badgeSize, Math.abs(anchorX - badgeCenterX) + badgeSize),
        h: badgeSize
      };
    }
    var vTop = Math.min(anchorY, badgeCenterY - (badgeSize / 2));
    return {
      left: badgeCenterX - (badgeSize / 2),
      top: vTop,
      w: badgeSize,
      h: Math.max(badgeSize, Math.abs(anchorY - badgeCenterY) + badgeSize)
    };
  }

  function nudgeMarkerAwayFromText(
    markerType: 'container' | 'base' | 'base-child' | 'other',
    bounds: { x: number; y: number; w: number; h: number; left: number; top: number },
    anchorX: number,
    anchorY: number,
    badgeCenterX: number,
    badgeCenterY: number,
    axis: 'vertical' | 'horizontal',
    isInstanceMarker?: boolean
  ): { anchorX: number; anchorY: number; badgeCenterX: number; badgeCenterY: number; axis: 'vertical' | 'horizontal' } {
    var candidates = [] as Array<{ anchorX: number; anchorY: number; badgeCenterX: number; badgeCenterY: number; axis: 'vertical' | 'horizontal' }>;

    if (markerType === 'container') {
      candidates.push({ anchorX: bounds.left, anchorY: bounds.y, badgeCenterX: bounds.left - 28, badgeCenterY: bounds.y, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.x, anchorY: bounds.top, badgeCenterX: bounds.x + 28, badgeCenterY: bounds.y, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.x, anchorY: bounds.top, badgeCenterX: bounds.x, badgeCenterY: bounds.top - 28, axis: 'vertical' });
      candidates.push({ anchorX: bounds.x, anchorY: bounds.top + bounds.h, badgeCenterX: bounds.x, badgeCenterY: bounds.top + bounds.h + 28, axis: 'vertical' });
    } else if (isInstanceMarker) {
      candidates.push({ anchorX: bounds.left, anchorY: bounds.y, badgeCenterX: bounds.left - 28, badgeCenterY: bounds.y, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.left, anchorY: bounds.top - 12, badgeCenterX: bounds.left - 28, badgeCenterY: bounds.top - 12, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.left, anchorY: bounds.top + bounds.h + 12, badgeCenterX: bounds.left - 28, badgeCenterY: bounds.top + bounds.h + 12, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.left - 12, anchorY: bounds.y, badgeCenterX: bounds.left - 40, badgeCenterY: bounds.y, axis: 'horizontal' });
    } else {
      candidates.push({ anchorX: bounds.left + bounds.w, anchorY: bounds.y, badgeCenterX: bounds.left + bounds.w + 28, badgeCenterY: bounds.y, axis: 'horizontal' });
      candidates.push({ anchorX: bounds.x, anchorY: bounds.top, badgeCenterX: bounds.x, badgeCenterY: bounds.top - 28, axis: 'vertical' });
      candidates.push({ anchorX: bounds.x, anchorY: bounds.top + bounds.h, badgeCenterX: bounds.x, badgeCenterY: bounds.top + bounds.h + 28, axis: 'vertical' });
      candidates.push({ anchorX: bounds.left, anchorY: bounds.y, badgeCenterX: bounds.left - 28, badgeCenterY: bounds.y, axis: 'horizontal' });
    }

    for (var c = 0; c < candidates.length; c++) {
      var candidate = candidates[c];
      var rect = getMarkerFrameRect(candidate.anchorX, candidate.anchorY, candidate.badgeCenterX, candidate.badgeCenterY, candidate.axis);
      if (!overlapsTextRect(rect.left, rect.top, rect.w, rect.h)) {
        return candidate;
      }
    }

    return { anchorX: anchorX, anchorY: anchorY, badgeCenterX: badgeCenterX, badgeCenterY: badgeCenterY, axis: axis };
  }
  
  // Position markers based on type
  for (var m = 0; m < markers.length; m++) {
    var marker = markers[m];
    var bounds = marker.bounds;
    var isInstanceMarker = !!(marker.node && (marker.node as any).type === 'INSTANCE');
    var markerName = (marker.name || '').toLowerCase();
    var markerNodeType = ((marker.node as any) && (marker.node as any).type ? (marker.node as any).type : '').toString().toUpperCase();
    var isTextMarker = markerNodeType === 'TEXT' || markerName.indexOf('label') >= 0 || markerName.indexOf('text') >= 0 || markerName.indexOf('copy') >= 0;
    var isIconMarker = markerName.indexOf('icon') >= 0 || markerNodeType === 'VECTOR' || markerNodeType === 'INSTANCE' || markerNodeType === 'COMPONENT' || markerNodeType === 'COMPONENT_SET' || (bounds.w > 0 && bounds.h > 0 && bounds.w <= 36 && bounds.h <= 36);
    var forcedVerticalSide: 'top' | 'bottom' | null = isTextMarker ? 'bottom' : (isIconMarker ? 'top' : null);
    var anchorX = bounds.x;
    var anchorY = bounds.y;
    var badgeCenterX = bounds.x;
    var badgeCenterY = bounds.y;

    if (marker.type === 'container') {
      // Component container: left side, vertical center
      anchorX = bounds.left;
      anchorY = bounds.y;
      badgeCenterX = bounds.left - 28;
      badgeCenterY = bounds.y;
    } else if (forcedVerticalSide === 'top') {
      anchorX = bounds.x;
      anchorY = bounds.top;
      badgeCenterX = bounds.x;
      badgeCenterY = bounds.top - 36;
    } else if (forcedVerticalSide === 'bottom') {
      anchorX = bounds.x;
      anchorY = bounds.top + bounds.h;
      badgeCenterX = bounds.x;
      badgeCenterY = anchorY + 36;
    } else if (isInstanceMarker) {
      // Instance nodes stay on the left so they do not stack on top of sibling markers.
      anchorX = bounds.left;
      anchorY = bounds.y;
      badgeCenterX = bounds.left - 28;
      badgeCenterY = bounds.y;
      
    } else if (marker.type === 'base') {
      // Base layer: top, tallest height - must be higher than base children
      anchorX = bounds.x;
      anchorY = bounds.top;
      badgeCenterY = bounds.top - 60; // Tallest height (30px higher than base children)
      badgeCenterX = bounds.x;
      
    } else if (marker.type === 'base-child') {
      // Base children: top, below base marker but above element
      anchorX = bounds.x;
      anchorY = bounds.top;
      badgeCenterY = bounds.top - 30; // 30px below base marker level
      badgeCenterX = bounds.x;
      
    } else {
      // Other layers: bottom
      anchorX = bounds.x;
      anchorY = bounds.top + bounds.h;
      badgeCenterY = anchorY + 28;
      badgeCenterX = bounds.x;
    }

    // Adjust for overlaps
    if (overlapsExisting(badgeCenterX, badgeCenterY)) {
      var tries = 0;
      while (overlapsExisting(badgeCenterX, badgeCenterY) && tries < 40) {
        if (forcedVerticalSide) {
          badgeCenterX += (tries % 2 === 0 ? 14 : -14);
          badgeCenterY += forcedVerticalSide === 'top' ? -10 : 10;
        } else if (marker.type === 'container') {
          // Move further left
          badgeCenterX -= 20;
        } else if (marker.type === 'base') {
          // Base: shift horizontally only to maintain height hierarchy
          badgeCenterX += (tries % 2 === 0 ? 35 : -35);
        } else if (isInstanceMarker) {
          // Instance markers keep moving left so they remain visually separated.
          badgeCenterX -= 20;
        } else if (marker.type === 'base-child') {
          // Base children: shift horizontally only, never change vertical position
          badgeCenterX += (tries % 2 === 0 ? 30 : -30);
        } else {
          // Other layers: move down or shift horizontally
          if (tries % 2 === 0) {
            badgeCenterY += 20;
          } else {
            badgeCenterX += (tries % 4 === 1 ? 30 : -30);
          }
        }
        tries++;
      }
    }

    var leaderAxis: 'vertical' | 'horizontal' = marker.type === 'container' ? 'horizontal' : 'vertical';

    if (forcedVerticalSide) {
      var textSafeTries = 0;
      while (textSafeTries < 20) {
        var forcedRect = getMarkerFrameRect(anchorX, anchorY, badgeCenterX, badgeCenterY, 'vertical');
        if (!overlapsTextRect(forcedRect.left, forcedRect.top, forcedRect.w, forcedRect.h)) break;
        badgeCenterX += (textSafeTries % 2 === 0 ? 12 : -12);
        badgeCenterY += forcedVerticalSide === 'top' ? -10 : 10;
        textSafeTries++;
      }
    }

    if (!forcedVerticalSide) {
      var placement = nudgeMarkerAwayFromText(marker.type, bounds, anchorX, anchorY, badgeCenterX, badgeCenterY, leaderAxis, isInstanceMarker);
      anchorX = placement.anchorX;
      anchorY = placement.anchorY;
      badgeCenterX = placement.badgeCenterX;
      badgeCenterY = placement.badgeCenterY;
      leaderAxis = placement.axis;
    }

    placedMarkerCenters.push({ x: badgeCenterX, y: badgeCenterY });

    var badgeSize = 24;
    var badge = createNumberBadge(m + 1, TOKEN_MARKER_COLOR);
    badge.name = 'Callout-Badge-' + (m + 1);

    var markerFrame = figma.createFrame();
    markerFrame.name = SPEC_PREFIX + 'Marker-' + (m + 1) + ' [' + marker.name + ']';
    markerFrame.layoutMode = leaderAxis === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
    markerFrame.primaryAxisSizingMode = 'FIXED';
    markerFrame.counterAxisSizingMode = 'FIXED';
    markerFrame.primaryAxisAlignItems = 'CENTER';
    markerFrame.counterAxisAlignItems = 'CENTER';
    markerFrame.itemSpacing = 0;
    markerFrame.paddingTop = 0;
    markerFrame.paddingBottom = 0;
    markerFrame.paddingLeft = 0;
    markerFrame.paddingRight = 0;
    markerFrame.fills = [];
    markerFrame.strokes = [];
    markerFrame.clipsContent = false;

    if (leaderAxis === 'horizontal') {
      var horizontalRailLength = Math.max(1, Math.round(Math.abs(anchorX - badgeCenterX) - 12));
      var horizontalRail = createCalloutRail('Callout-Line-' + (m + 1), horizontalRailLength, 'horizontal', TOKEN_MARKER_COLOR);
      if (anchorX < badgeCenterX) {
        markerFrame.resize(horizontalRailLength + badgeSize, badgeSize);
        markerFrame.x = anchorX;
        markerFrame.y = badgeCenterY - 12;
        markerFrame.appendChild(horizontalRail);
        markerFrame.appendChild(badge);
      } else {
        markerFrame.resize(badgeSize + horizontalRailLength, badgeSize);
        markerFrame.x = badgeCenterX - 12;
        markerFrame.y = badgeCenterY - 12;
        markerFrame.appendChild(badge);
        markerFrame.appendChild(horizontalRail);
      }
    } else {
      var verticalRailLength = Math.max(1, Math.round(Math.abs(anchorY - badgeCenterY) - 12));
      var verticalRail = createCalloutRail('Callout-Line-' + (m + 1), verticalRailLength, 'vertical', TOKEN_MARKER_COLOR);
      if (anchorY < badgeCenterY) {
        markerFrame.resize(badgeSize, verticalRailLength + badgeSize);
        markerFrame.x = badgeCenterX - 12;
        markerFrame.y = anchorY;
        markerFrame.appendChild(verticalRail);
        markerFrame.appendChild(badge);
      } else {
        markerFrame.resize(badgeSize, badgeSize + verticalRailLength);
        markerFrame.x = badgeCenterX - 12;
        markerFrame.y = badgeCenterY - 12;
        markerFrame.appendChild(badge);
        markerFrame.appendChild(verticalRail);
      }
    }

    preview.appendChild(markerFrame); // Add markers to the wrapper frame as one auto-layout unit
    // The component clone re-centers reactively (CENTER/CENTER constraints
    // set in centerNodeInPanel) if this panel is later widened via FILL.
    // Each marker was positioned relative to the component's build-time
    // location, so it needs the same constraint to shift in sync and stay
    // aligned with whatever it's pointing at, instead of staying frozen
    // while the component it's labeling moves.
    try {
      (markerFrame as any).constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
    } catch (e) {}
  }

  var detail = figma.createFrame();
  detail.name = SPEC_PREFIX + 'Anatomy Legend';
  detail.layoutMode = 'VERTICAL';
  detail.layoutAlign = 'STRETCH';
  detail.resize(SHEET_INNER_WIDTH - 48, 10);
  detail.primaryAxisSizingMode = 'AUTO';
  detail.counterAxisSizingMode = 'FIXED';
  detail.itemSpacing = 10;
  detail.clipsContent = false;
  detail.fills = [];



  function makeLegendIndexBadge(index: number): FrameNode {
    var b = figma.createFrame();
    b.layoutMode = 'VERTICAL';
    b.resize(18, 10);
    b.primaryAxisSizingMode = 'AUTO';
    b.counterAxisSizingMode = 'FIXED';
    b.primaryAxisAlignItems = 'CENTER';
    b.counterAxisAlignItems = 'CENTER';
    b.paddingTop = 4;
    b.paddingBottom = 4;
    b.paddingLeft = 0;
    b.paddingRight = 0;
    b.cornerRadius = 9;
    b.fills = solidPaint(TOKEN_MARKER_COLOR);
    b.strokes = solidPaint(TOKEN_MARKER_COLOR);

    var t = makeText('' + index, 9, FONT_BOLD, WHITE);
    t.resize(18, t.height);
    t.textAlignHorizontal = 'CENTER';
    b.appendChild(t);
    return b;
  }

  async function makeLegendRow(index: number, sourceNode: any, title: string, nodeType: string, width: number, height: number): Promise<FrameNode> {
    var rowItem = figma.createFrame();
    rowItem.layoutMode = 'HORIZONTAL';
    rowItem.primaryAxisSizingMode = 'AUTO';
    rowItem.counterAxisSizingMode = 'AUTO';
    rowItem.counterAxisAlignItems = 'MIN';
    rowItem.itemSpacing = 10;
    rowItem.fills = [];
    rowItem.strokes = [];
    rowItem.clipsContent = false;

    var indexBadge = makeLegendIndexBadge(index);
    rowItem.appendChild(indexBadge);

    var content = figma.createFrame();
    content.layoutMode = 'VERTICAL';
    content.primaryAxisSizingMode = 'AUTO';
    content.counterAxisSizingMode = 'AUTO';
    content.itemSpacing = 2;
    content.fills = [];
    content.strokes = [];
    content.clipsContent = false;

    var headRow = figma.createFrame();
    headRow.layoutMode = 'HORIZONTAL';
    headRow.primaryAxisSizingMode = 'AUTO';
    headRow.counterAxisSizingMode = 'AUTO';
    headRow.counterAxisAlignItems = 'CENTER';
    headRow.itemSpacing = 5;
    headRow.fills = [];
    headRow.strokes = [];

    headRow.appendChild(makeText(getTypeIcon(nodeType), 11, FONT_MEDIUM, COLOR_LABEL));
    headRow.appendChild(makeText(title, 11, FONT_BOLD, COLOR_HEADER));
    content.appendChild(headRow);
    content.appendChild(makeText(getTypeTag(nodeType), 10, FONT_MEDIUM, COLOR_MUTED));
    content.appendChild(makeText(Math.round(width) + ' × ' + Math.round(height), 10, FONT_REGULAR, COLOR_MUTED));

    // Direct variable bindings only — background color and corner radius
    try {
      var tokenRows = await collectDirectVariableUsageRows(sourceNode);
      var filtered = tokenRows.filter(function(r: VariableUsageRow) {
        return r.previewKind === 'color' || r.previewKind === 'radius' || r.previewKind === 'spacing';
      });
      for (var tr = 0; tr < filtered.length; tr++) {
        var tok = filtered[tr];
        content.appendChild(makePropertyVariableRefRow({
          label: tok.appliedAs,
          name: tok.variableName,
          variableId: tok.variableId,
          fallbackValue: tok.fallbackValue,
          fallbackColor: tok.fallbackColor,
          previewKind: tok.previewKind
        }, 'Anatomy Legend Token ' + index + '-' + (tr + 1)));
      }
    } catch (e) {}

    rowItem.appendChild(content);
    return rowItem;
  }

  // Generate legend rows for all markers
  for (var legendIdx = 0; legendIdx < markers.length; legendIdx++) {
    var markerData = markers[legendIdx];
    var legendNode = markerData.node as any;
    detail.appendChild(
      await makeLegendRow(
        legendIdx + 1,
        legendNode,
        markerData.name,
        legendNode.type || 'UNKNOWN',
        legendNode.width || markerData.bounds.w,
        legendNode.height || markerData.bounds.h
      )
    );
  }

  row.appendChild(preview);
  row.appendChild(detail);
  section.appendChild(row);
  // Real FILL relative to section (preview/previewCanvas already stretch
  // relative to row via layoutAlign='STRETCH'), so this section tracks the
  // sheet's width instead of sitting at a fixed ANATOMY_W.
  try { (row as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  parent.appendChild(section);
}

function getPropertyBaseName(name: string): string {
  var hashIdx = name.indexOf('#');
  return hashIdx > 0 ? name.substring(0, hashIdx) : name;
}

function isStatePropertyName(name: string): boolean {
  return getPropertyBaseName(name).trim().toLowerCase() === 'state';
}

async function getVariantStatePropertyInfoAsync(node: any): Promise<StatePropertyInfo | null> {
  if (!node) return null;

    if (node.type === 'COMPONENT_SET') {
      var csDefs = node.componentPropertyDefinitions || {};
      for (var csKey in csDefs) {
        if (!csDefs.hasOwnProperty(csKey)) continue;
        var csDef = csDefs[csKey];
        if (!csDef || normalizeComponentPropertyType(csDef.type) !== 'VARIANT' || !isStatePropertyName(csKey)) continue;
        var csStates = Array.isArray(csDef.variantOptions)
          ? csDef.variantOptions.filter(function(o: string) { return !!o; })
          : [];
        if (csStates.length === 0) continue;
        return {
          propertyKey: csKey,
          states: csStates,
          currentState: csDef.defaultValue || csStates[0] || ''
        };
      }
      return null;
    }

  if (node.type === 'INSTANCE') {
    var mainComp: any = null;
    try {
      mainComp = await node.getMainComponentAsync();
    } catch (e) {}
    if (!mainComp) return null;

    var parentSet = mainComp.parent as any;
    var instanceDefs = parentSet && parentSet.type === 'COMPONENT_SET'
      ? parentSet.componentPropertyDefinitions
      : mainComp.componentPropertyDefinitions;
    var instanceProps = node.componentProperties || {};

    for (var instanceKey in instanceProps) {
      if (!instanceProps.hasOwnProperty(instanceKey)) continue;
      var instanceEntry = instanceProps[instanceKey];
      var instanceDef = instanceDefs ? instanceDefs[instanceKey] : null;
      var instanceType = normalizeComponentPropertyType(instanceDef ? instanceDef.type : (instanceEntry ? instanceEntry.type : null));
      if (!instanceEntry || instanceType !== 'VARIANT' || !isStatePropertyName(instanceKey)) continue;
      var instanceStates = instanceDef && Array.isArray(instanceDef.variantOptions)
        ? instanceDef.variantOptions.filter(function(option: string) { return !!option; })
        : [];

      if (instanceStates.length === 0) return null;

      return {
        propertyKey: instanceKey,
        states: instanceStates,
        currentState: instanceEntry.value || (instanceDef ? instanceDef.defaultValue : '') || ''
      };
    }
  }

  if (node.type === 'COMPONENT') {
    var componentSet = node.parent as any;
    if (!componentSet || componentSet.type !== 'COMPONENT_SET') return null;

    var componentDefs = componentSet.componentPropertyDefinitions || null;
    if (!componentDefs) return null;

    for (var componentKey in componentDefs) {
      if (!componentDefs.hasOwnProperty(componentKey)) continue;
      var componentDef = componentDefs[componentKey];
      if (!componentDef || normalizeComponentPropertyType(componentDef.type) !== 'VARIANT' || !isStatePropertyName(componentKey)) continue;

      var componentStates = Array.isArray(componentDef.variantOptions)
        ? componentDef.variantOptions.filter(function(option: string) { return !!option; })
        : [];

      if (componentStates.length === 0) return null;

      var baseName = getPropertyBaseName(componentKey);
      var variantProps = node.variantProperties || {};

      return {
        propertyKey: componentKey,
        states: componentStates,
        currentState: variantProps[baseName] || variantProps[componentKey] || componentDef.defaultValue || ''
      };
    }
  }

  return null;
}

async function findStateTargetAsync(node: SceneNode): Promise<StateTargetInfo | null> {
  var rootInfo = await getVariantStatePropertyInfoAsync(node as any);
  if (rootInfo) {
      var previewSrc: 'clone-selection' | 'instance-from-component' =
        (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') ? 'instance-from-component' : 'clone-selection';
      var instanceSrc: any = node.type === 'COMPONENT_SET'
        ? ((node as any).defaultVariant || (node as any).children[0])
        : undefined;
    return {
      propertyKey: rootInfo.propertyKey,
      states: rootInfo.states,
      currentState: rootInfo.currentState,
        previewSource: previewSrc,
        instanceSource: instanceSrc,
      targetPath: [],
      targetName: node.name || 'Selected component'
    };
  }
  return null;
}

function resolveNodeAtPath(root: SceneNode, path: number[]): SceneNode | null {
  var current: any = root;
  for (var i = 0; i < path.length; i++) {
    if (!current || !('children' in current)) return null;
    var children = current.children || [];
    if (path[i] < 0 || path[i] >= children.length) return null;
    current = children[path[i]];
  }
  return current as SceneNode;
}

function resolveInstanceSwapName(nodeId: any): string {
  if (!nodeId || typeof nodeId !== 'string') return 'None';
  try {
    var swapNode = figma.getNodeById(nodeId);
    if (swapNode) return swapNode.name;
  } catch (e) {}
  return nodeId;
}

function formatPropertyValueLabel(propType: KnownComponentPropertyType, rawValue: any): string {
  if (propType === 'BOOLEAN') return rawValue ? 'true' : 'false';
  if (propType === 'INSTANCE_SWAP') return resolveInstanceSwapName(rawValue);
  if (rawValue === undefined || rawValue === null) return '';
  return '' + rawValue;
}

function getPropertyVariablePreviewKind(propType: KnownComponentPropertyType, variableType: string): string {
  if (variableType === 'COLOR') return 'color';
  if (propType === 'TEXT') return 'text';
  if (variableType === 'FLOAT') return 'number';
  return 'token';
}

async function resolvePropertyVariableRefsAsync(propertyKey: string, propType: KnownComponentPropertyType, def: any, currentEntry: any, consumer: any): Promise<PropertyVariableRef[]> {
  var refs: PropertyVariableRef[] = [];
  var seen: { [key: string]: boolean } = {};

  async function appendRef(label: string, alias: any): Promise<void> {
    if (!alias || typeof alias !== 'object') return;
    var details = await resolveVariableDetails(alias.id || '', alias, consumer);
    var identity = getVariableDedupIdentity(alias.id || '', alias, details);
    if (seen[identity]) return;
    seen[identity] = true;

    refs.push({
      label: label,
      name: details.name,
      variableId: details.variableId,
      fallbackValue: details.fallbackValue,
      fallbackColor: details.fallbackColor,
      previewKind: getPropertyVariablePreviewKind(propType, details.type)
    });
  }

  var currentAlias = currentEntry && currentEntry.boundVariables ? currentEntry.boundVariables.value : null;
  var defaultAlias = def && def.boundVariables ? def.boundVariables.value : null;

  await appendRef('Current token', currentAlias);
  await appendRef('Default token', defaultAlias);
  return refs;
}

function makeInlineVariablePreviewNode(previewKind: string, fallbackColor: RGB | null, indexName: string, variableId?: string): SceneNode {
  if (previewKind === 'color' && fallbackColor) {
    var swatch = figma.createRectangle();
    swatch.name = indexName + ' Swatch';
    swatch.resize(12, 12);
    var swatchPaint: Paint = solidPaint(fallbackColor)[0];
    if (variableId) {
      try {
        var colorVariable = resolveVariableFromBinding(variableId, null);
        if (colorVariable) {
          swatchPaint = figma.variables.setBoundVariableForPaint(swatchPaint as SolidPaint, 'color', colorVariable);
        }
      } catch (e) {}
    }
    swatch.fills = [swatchPaint];
    swatch.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
    swatch.strokeWeight = 1;
    return swatch;
  }

  var chip = figma.createFrame();
  chip.name = indexName + ' Icon';
  chip.layoutMode = 'HORIZONTAL';
  chip.primaryAxisSizingMode = 'FIXED';
  chip.counterAxisSizingMode = 'FIXED';
  chip.resize(14, 14);
  chip.cornerRadius = 3;
  chip.primaryAxisAlignItems = 'CENTER';
  chip.counterAxisAlignItems = 'CENTER';
  chip.fills = solidPaint({ r: 0.96, g: 0.96, b: 0.97 });
  chip.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
  chip.strokeWeight = 1;

  var glyph = '#';
  if (previewKind === 'text') glyph = 'T';
  else if (previewKind === 'token') glyph = '•';

  var iconText = makeText(glyph, 8, FONT_BOLD, COLOR_LABEL);
  iconText.name = indexName + ' Icon Label';
  iconText.textAutoResize = 'WIDTH_AND_HEIGHT';
  chip.appendChild(iconText);
  return chip;
}

function makePropertyVariableRefRow(ref: PropertyVariableRef, indexName: string): FrameNode {
  var row = figma.createFrame();
  row.name = indexName + ' Row';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.counterAxisAlignItems = 'CENTER';
  row.itemSpacing = 6;
  row.fills = [];

  var label = makeText(ref.label, 10, FONT_MEDIUM, COLOR_MUTED);

  var badge = figma.createFrame();
  badge.name = indexName + ' Badge';
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.counterAxisAlignItems = 'CENTER';
  badge.itemSpacing = 6;
  badge.paddingLeft = 8;
  badge.paddingRight = 8;
  badge.paddingTop = 4;
  badge.paddingBottom = 4;
  badge.cornerRadius = 4;
  badge.fills = solidPaint(WHITE);
  badge.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
  badge.strokeWeight = 1;

  var name = makeText(ref.name, 10, FONT_REGULAR, COLOR_VALUE);

  badge.appendChild(makeInlineVariablePreviewNode(ref.previewKind, ref.fallbackColor, indexName, ref.variableId));
  badge.appendChild(name);
  if (ref.fallbackValue && ref.fallbackValue !== '-') {
    badge.appendChild(makeText('(' + ref.fallbackValue + ')', 10, FONT_REGULAR, COLOR_MUTED));
  }

  row.appendChild(label);
  row.appendChild(badge);
  return row;
}

// tokenName: resolved variable name (or empty if unbound); fallbackPx: raw pixel string always shown as fallback
function makeLayoutMetricRow(label: string, tokenName: string, fallbackPx: string, indexName: string): FrameNode {
  return makePropertyVariableRefRow({
    label: label,
    name: tokenName || fallbackPx,
    variableId: '',
    fallbackValue: tokenName ? fallbackPx : '',
    fallbackColor: null,
    previewKind: 'spacing'
  }, indexName);
}

function getPropertyVariableRefBaseKey(ref: PropertyVariableRef): string {
  return ref.name + '|' + ref.previewKind + '|' + ref.label;
}

function getPropertyVariableRefUniqueKey(ref: PropertyVariableRef): string {
  return getPropertyVariableRefBaseKey(ref) + '|' + (ref.fallbackValue || '-');
}

function getPropertyVariableRefSortRank(ref: PropertyVariableRef): number {
  if (ref.previewKind === 'color') return 0;
  if (ref.previewKind === 'radius') return 1;
  if (ref.previewKind === 'spacing') return 2;
  if (ref.previewKind === 'number') return 3;
  if (ref.previewKind === 'text') return 4;
  return 5;
}

function formatStateSpecificVariableLabel(stateTitle: string, appliedAs: string): string {
  var cleanState = (stateTitle || '').trim();
  var cleanApplied = (appliedAs || '').trim();
  if (!cleanState) return cleanApplied;

  var lowerState = cleanState.toLowerCase();
  if (lowerState === 'default' || lowerState === 'current') return cleanApplied;

  if (!cleanApplied) return cleanState;
  return cleanState + ' ' + cleanApplied.toLowerCase();
}

async function collectContextualVariableRefsForCard(node: SceneNode, stateTarget: PropertyPreviewTarget, spec: PropertyCardSpec): Promise<PropertyVariableRef[]> {
  var refs: PropertyVariableRef[] = [];
  var tempPreview = makeLightPreviewPanel(1, 1);
  try {
    var previewResult = await buildStatePreviewNode(node, tempPreview, stateTarget, spec.propertyKey, spec.value);
    if (!previewResult.previewRoot) return refs;

    try {
      var basePreviewRoot: SceneNode | null = null;
      try {
        if (stateTarget.previewSource === 'instance-from-component') {
          var baseInstanceSource: ComponentNode = stateTarget.instanceSource || node as ComponentNode;
          basePreviewRoot = baseInstanceSource.createInstance();
        } else {
          basePreviewRoot = await makePreviewSourceNode(node);
        }
      } catch (e) {}

      var baseUsageRows: VariableUsageRow[] = [];
      try {
        if (basePreviewRoot) {
          baseUsageRows = await collectVariableUsageRows(basePreviewRoot as any, false);
        }
      } finally {
        if (basePreviewRoot && (basePreviewRoot as any).remove) {
          try { (basePreviewRoot as any).remove(); } catch (e) {}
        }
      }

      var baseColorByKey: { [key: string]: string } = {};
        var baseTextByKey: { [key: string]: string } = {};
      for (var bu = 0; bu < baseUsageRows.length; bu++) {
        var baseRow = baseUsageRows[bu];
        var baseKey = baseRow.variableName + '|' + baseRow.previewKind + '|' + baseRow.appliedAs;
          if (baseRow.previewKind === 'color' && baseRow.fallbackColor) {
            baseColorByKey[baseKey] = rgbToHex(baseRow.fallbackColor);
          } else if (baseRow.previewKind === 'text') {
            baseTextByKey[baseKey] = baseRow.fallbackValue || '-';
          }
      }

      var usageRows = await collectVariableUsageRows(previewResult.previewRoot as any, false);
      for (var ur = 0; ur < usageRows.length; ur++) {
        var usageRow = usageRows[ur];
          var usageKey = usageRow.variableName + '|' + usageRow.previewKind + '|' + usageRow.appliedAs;
          if (usageRow.previewKind === 'color' && usageRow.fallbackColor) {
          var usageColorHex = rgbToHex(usageRow.fallbackColor);
          if (baseColorByKey[usageKey] && baseColorByKey[usageKey] === usageColorHex) {
            continue;
          }
          } else if (usageRow.previewKind === 'text') {
            var baseTextValue = baseTextByKey[usageKey];
            if (baseTextValue !== undefined && baseTextValue === (usageRow.fallbackValue || '-')) {
              continue;
            }
        }

        var label = usageRow.appliedAs;
        if (usageRow.previewKind === 'color') {
          label = formatStateSpecificVariableLabel(spec.title, usageRow.appliedAs);
        }

        refs.push({
          label: label,
          name: usageRow.variableName,
          variableId: usageRow.variableId,
          fallbackValue: usageRow.fallbackValue,
          fallbackColor: usageRow.fallbackColor,
          previewKind: usageRow.previewKind
        });
      }
    } catch (e) {}
  } finally {
    if (tempPreview && tempPreview.parent) {
      tempPreview.remove();
    }
  }

  return refs;
}

function buildPropertyPreviewTarget(node: SceneNode, stateTarget: StateTargetInfo | null): PropertyPreviewTarget {
  if (stateTarget) {
    return {
      previewSource: stateTarget.previewSource,
      instanceSource: stateTarget.instanceSource,
      targetPath: stateTarget.targetPath,
      targetName: stateTarget.targetName
    };
  }

  var previewSrc: 'clone-selection' | 'instance-from-component' =
    (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') ? 'instance-from-component' : 'clone-selection';
  var instanceSrc: any = node.type === 'COMPONENT_SET'
    ? ((node as any).defaultVariant || (node as any).children[0])
    : undefined;

  return {
    previewSource: previewSrc,
    instanceSource: instanceSrc,
    targetPath: [],
    targetName: node.name || 'Selected component'
  };
}

async function buildStatePreviewNode(node: SceneNode, panel: FrameNode, stateTarget: PropertyPreviewTarget, propertyKey: string, propertyValue: string | boolean): Promise<{ previewRoot: SceneNode | null; target: SceneNode | null }> {
  var previewRoot: SceneNode;

  if (stateTarget.previewSource === 'instance-from-component') {
    var instSrc: ComponentNode = stateTarget.instanceSource || node as ComponentNode;
    previewRoot = instSrc.createInstance();
    centerNodeInPanel(previewRoot, panel, Math.max(1, (panel as any).width || PROPERTIES_CARD_WIDTH), Math.max(1, (panel as any).height || 210), false);
  } else {
    previewRoot = await makePreviewSourceNode(node);
    centerNodeInPanel(previewRoot, panel, Math.max(1, (panel as any).width || PROPERTIES_CARD_WIDTH), Math.max(1, (panel as any).height || 210), false);
  }

  var target = resolveNodeAtPath(previewRoot, stateTarget.targetPath) as any;
  if (!target || typeof target.setProperties !== 'function') return { previewRoot: previewRoot, target: null };

  var propertyUpdate: { [key: string]: string | boolean } = {};
  propertyUpdate[propertyKey] = propertyValue;

  try {
    target.setProperties(propertyUpdate);
  } catch (e) {}

  // Recenter after property application in case the state changes the rendered size.
  try {
    centerNodeInPanel(previewRoot, panel, Math.max(1, (panel as any).width || PROPERTIES_CARD_WIDTH), Math.max(1, (panel as any).height || 210), false);
  } catch (e) {}

  return { previewRoot: previewRoot, target: target as SceneNode };
}

async function makeStateCard(
  title: string,
  node: SceneNode,
  stateTarget: PropertyPreviewTarget,
  spec: PropertyCardSpec,
  precomputedContextualRefs?: PropertyVariableRef[],
  allowedVariantRefBaseKeys?: { [key: string]: boolean },
  cardWidth?: number
): Promise<FrameNode> {
  var width = cardWidth || PROPERTIES_CARD_WIDTH;
  var card = makeVerticalAutoFrame(width);
  card.name = SPEC_PREFIX + title + ' Property';
  card.itemSpacing = 10;
  card.fills = [];

  var preview = makeLightPreviewPanel(width, 150);
  preview.name = SPEC_PREFIX + title + ' Preview';
  var previewResult = await buildStatePreviewNode(node, preview, stateTarget, spec.propertyKey, spec.value);

  var contextualRefs: PropertyVariableRef[] = precomputedContextualRefs || [];
  if (!precomputedContextualRefs && previewResult.previewRoot) {
    contextualRefs = await collectContextualVariableRefsForCard(node, stateTarget, spec);
  }

  var allRefs: PropertyVariableRef[] = [];
  var seenRef: { [k: string]: boolean } = {};

  function appendRefs(list: PropertyVariableRef[]): void {
    for (var i = 0; i < list.length; i++) {
      var ref = list[i];
      if (allowedVariantRefBaseKeys && !allowedVariantRefBaseKeys[getPropertyVariableRefBaseKey(ref)]) continue;
      var refKey = getPropertyVariableRefUniqueKey(ref);
      if (seenRef[refKey]) continue;
      seenRef[refKey] = true;
      allRefs.push(ref);
    }
  }

  appendRefs(spec.variableRefs || []);
  appendRefs(contextualRefs);

  allRefs.sort(function(a, b) {
    var rankDiff = getPropertyVariableRefSortRank(a) - getPropertyVariableRefSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    var labelDiff = a.label.localeCompare(b.label);
    if (labelDiff !== 0) return labelDiff;
    var nameDiff = a.name.localeCompare(b.name);
    if (nameDiff !== 0) return nameDiff;
    return getPropertyVariableRefUniqueKey(a).localeCompare(getPropertyVariableRefUniqueKey(b));
  });

  card.appendChild(preview);
  // preview may have grown past `width` in buildStatePreviewNode's
  // allowScale=false growth (centerNodeInPanel) when the real component
  // doesn't fit `width`. Setting it to FILL here would immediately snap it
  // back down to match card (still at `width` at this point) — discarding
  // that growth and cropping the content clipsContent now enforces. Only
  // FILL when nothing grew; otherwise widen the card to match instead, so
  // the caller's cardWidth comparison (below, in appendPropertyGroup) can
  // detect the growth and skip forcing THIS card back down too.
  var cardFinalWidth = Math.max(width, preview.width || width);
  if (cardFinalWidth > width + 0.5) {
    try { card.resizeWithoutConstraints(cardFinalWidth, card.height || 1); } catch (e) {}
  } else {
    try { (preview as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }
  card.appendChild(makeText(title, 30, FONT_BOLD, COLOR_HEADER));
  card.appendChild(makeNodeLabel(stateTarget.targetName, node.type, 11, false));
  card.appendChild(makeText('Property: ' + getPropertyBaseName(spec.propertyKey), 11, FONT_REGULAR, COLOR_VALUE));
  // Show typography font-style rows and any color refs, but suppress Font size and Letter spacing.
  for (var vr = 0; vr < allRefs.length; vr++) {
    var ref = allRefs[vr];
    if (ref.previewKind === 'color' || (ref.previewKind === 'text' && ref.label === 'Font style')) {
      card.appendChild(makePropertyVariableRefRow(ref, SPEC_PREFIX + title + ' Property Variable ' + (vr + 1)));
    }
  }
  for (var i = 0; i < spec.metaLines.length; i++) {
    card.appendChild(makeText(spec.metaLines[i], 10, FONT_REGULAR, COLOR_MUTED));
  }

  try {
    card.resizeWithoutConstraints(cardFinalWidth, card.height || 1);
  } catch (e) {}
  return card;
}

async function getPropertyDefinitionsForNodeAsync(node: any): Promise<{ defs: any; currentProps: any } | null> {
  if (!node) return null;

  if (node.type === 'INSTANCE') {
    var mainComp: any = null;
    try {
      mainComp = await node.getMainComponentAsync();
    } catch (e) {}
    if (!mainComp) return null;

    var parentSet = mainComp.parent as any;
    var defs = parentSet && parentSet.type === 'COMPONENT_SET'
      ? parentSet.componentPropertyDefinitions
      : mainComp.componentPropertyDefinitions;

    return {
      defs: defs || {},
      currentProps: node.componentProperties || {}
    };
  }

  if (node.type === 'COMPONENT_SET') {
    return {
      defs: node.componentPropertyDefinitions || {},
      currentProps: {}
    };
  }

  if (node.type === 'COMPONENT') {
    var componentSet = node.parent as any;
    var componentDefs = componentSet && componentSet.type === 'COMPONENT_SET'
      ? componentSet.componentPropertyDefinitions
      : node.componentPropertyDefinitions;
    return {
      defs: componentDefs || {},
      currentProps: node.variantProperties || {}
    };
  }

  return null;
}

async function createPropertyCardsForDefinition(
  propertyKey: string,
  propType: KnownComponentPropertyType,
  def: any,
  currentRawValue: any,
  defaultRawValue: any,
  currentEntry: any,
  consumer: any
): Promise<PropertyCardSpec[]> {
  var cards: PropertyCardSpec[] = [];
  var currentLabel = formatPropertyValueLabel(propType, currentRawValue);
  var defaultLabel = formatPropertyValueLabel(propType, defaultRawValue);
  var variableRefs = await resolvePropertyVariableRefsAsync(propertyKey, propType, def, currentEntry, consumer);

  if (propType === 'VARIANT') {
    var options = Array.isArray(def.variantOptions)
      ? def.variantOptions.filter(function(option: string) { return !!option; })
      : [];

    // A variant that's purely a display number (e.g. a badge "Count":
    // 1, 2, 3...) should read smallest-to-largest — Figma's stored option
    // order is insertion order, not numeric order, so "10" can land before
    // "2". Only applies when every option is numeric; text variants like
    // Small/Medium/Large keep their original (deliberate) order.
    var allNumericOptions = options.length > 0 && options.every(function(o: string) {
      return o.trim() !== '' && isFinite(Number(o));
    });
    if (allNumericOptions) {
      options = options.slice().sort(function(a: string, b: string) { return Number(a) - Number(b); });
    }

    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      cards.push({
        title: option,
        propertyKey: propertyKey,
        propertyType: propType,
        value: option,
        valueLabel: option,
        variableRefs: variableRefs,
        metaLines: []
      });
    }
    return cards;
  }

  if (propType === 'BOOLEAN') {
    cards.push({
      title: currentLabel || 'Current',
      propertyKey: propertyKey,
      propertyType: propType,
      value: !!currentRawValue,
      valueLabel: currentLabel,
      variableRefs: variableRefs,
      metaLines: []
    });
    return cards;
  }

  if (propType === 'TEXT') {
    cards.push({
      title: currentLabel || 'Current',
      propertyKey: propertyKey,
      propertyType: propType,
      value: (currentRawValue === undefined || currentRawValue === null) ? '' : ('' + currentRawValue),
      valueLabel: currentLabel,
      variableRefs: variableRefs,
      metaLines: []
    });

    if (currentLabel !== defaultLabel) {
      cards.push({
        title: defaultLabel || 'Default',
        propertyKey: propertyKey,
        propertyType: propType,
        value: (defaultRawValue === undefined || defaultRawValue === null) ? '' : ('' + defaultRawValue),
        valueLabel: defaultLabel,
        variableRefs: variableRefs,
        metaLines: []
      });
    }
    return cards;
  }

  if (propType === 'INSTANCE_SWAP') {
    cards.push({
      title: currentLabel || 'Current instance',
      propertyKey: propertyKey,
      propertyType: propType,
      value: (currentRawValue === undefined || currentRawValue === null) ? '' : ('' + currentRawValue),
      valueLabel: currentLabel,
      variableRefs: variableRefs,
      metaLines: []
    });

    if (currentLabel !== defaultLabel) {
      cards.push({
        title: defaultLabel || 'Default instance',
        propertyKey: propertyKey,
        propertyType: propType,
        value: (defaultRawValue === undefined || defaultRawValue === null) ? '' : ('' + defaultRawValue),
        valueLabel: defaultLabel,
        variableRefs: variableRefs,
        metaLines: []
      });
    }
    return cards;
  }

  return cards;
}

function createPropertyGroupGrid(columnWidth?: number): FrameNode {
  var width = columnWidth || PROPERTIES_CARD_WIDTH;
  var grid = figma.createFrame();
  grid.layoutMode = 'GRID';
  grid.gridColumnCount = 2;
  grid.gridRowCount = 1;
  grid.gridColumnGap = 24;
  grid.gridRowGap = 24;
  grid.counterAxisSizingMode = 'AUTO';
  (grid as any).layoutSizingHorizontal = 'HUG';
  (grid as any).layoutSizingVertical = 'HUG';
  grid.fills = [];

  // Flexible tracks (1fr each) instead of FIXED pixel widths: the grid is
  // set to FILL relative to its section after append, so flexible tracks
  // make the columns split whatever width the grid actually has — tracking
  // the sheet — rather than freezing at the build-time card width.
  try {
    (grid.gridColumnSizes[0] as any).type = 'FLEX';
    (grid.gridColumnSizes[0] as any).value = 1;
    (grid.gridColumnSizes[1] as any).type = 'FLEX';
    (grid.gridColumnSizes[1] as any).value = 1;
  } catch (e) {
    // FLEX tracks unsupported on this Figma version — fixed widths as before.
    try {
      grid.gridColumnSizes[0].type = 'FIXED';
      grid.gridColumnSizes[0].value = width;
      grid.gridColumnSizes[1].type = 'FIXED';
      grid.gridColumnSizes[1].value = width;
    } catch (e2) {}
  }

  return grid;
}

function toTitleCaseLayout(value: string): string {
  if (!value) return 'None';
  var v = value.toLowerCase();
  return v.charAt(0).toUpperCase() + v.substring(1);
}

function getLayoutDirectionLabel(node: any): string {
  var mode = node && node.layoutMode ? node.layoutMode : 'NONE';
  if (mode === 'HORIZONTAL') return 'Horizontal';
  if (mode === 'VERTICAL') return 'Vertical';
  return 'None';
}

function getSizingModeLabel(raw: any): string {
  if (raw === 'HUG') return 'Hug';
  if (raw === 'FILL') return 'Fill';
  if (raw === 'FIXED') return 'Fixed';
  return 'Inferred';
}

function getAlignmentLabel(node: any): string {
  var main = node && node.primaryAxisAlignItems ? node.primaryAxisAlignItems : 'MIN';
  var cross = node && node.counterAxisAlignItems ? node.counterAxisAlignItems : 'MIN';
  return toTitleCaseLayout(main) + ' / ' + toTitleCaseLayout(cross);
}

function getPaddingValue(node: any, prop: string): number {
  if (node && typeof node[prop] === 'number') return node[prop];
  if (node && node.inferredAutoLayout && typeof node.inferredAutoLayout[prop] === 'number') return node.inferredAutoLayout[prop];
  return 0;
}

function getItemSpacingValue(node: any): number {
  if (node && typeof node.itemSpacing === 'number') return node.itemSpacing;
  if (node && node.inferredAutoLayout && typeof node.inferredAutoLayout.itemSpacing === 'number') return node.inferredAutoLayout.itemSpacing;
  return 0;
}

function makeGuideLabel(text: string, color: RGB): TextNode {
  var label = makeText(text, 12, FONT_BOLD, color);
  label.fills = solidPaint(color);
  return label;
}

function formatGuideValue(value: number): string {
  if (!isFinite(value)) return '0';
  return '' + Math.round(value);
}

function drawAutoLayoutGuides(
  targetClone: any, panel: FrameNode, sourceInfo: any, depth?: number, baseX?: number, baseY?: number,
  mainCompNode?: any,
  // Shared across the whole recursive call tree (created once at depth 0),
  // so repeated siblings — e.g. 5 identical nav items, each recursed into —
  // only get their padding/gap VALUE labeled once instead of once per
  // repeat. The colored regions themselves still draw for every repeat;
  // only the text (the actual unreadable part) is deduped.
  seenLabels?: { [key: string]: boolean }
): void {
  if (!targetClone || !sourceInfo) return;
  var mode = sourceInfo.layoutMode || (sourceInfo.inferredAutoLayout ? sourceInfo.inferredAutoLayout.layoutMode : 'NONE');
  if (!mode || mode === 'NONE') return;

  depth = depth || 0;
  baseX = baseX || 0;
  baseY = baseY || 0;
  seenLabels = seenLabels || {};

  var x = (targetClone.x || 0) + baseX;
  var y = (targetClone.y || 0) + baseY;
  var w = targetClone.width || 0;
  var h = targetClone.height || 0;
  if (w <= 0 || h <= 0) return;
  var leftBand = x - 24;
  var topBand = y - 24;
  var rightBand = x + w + 8;
  var bottomBand = y + h + 8;

  // Reduce opacity slightly to emphasize spacing overlays (only for top level)
  if (depth === 0 && targetClone.opacity !== undefined) {
    targetClone.opacity = 0.8;
  }

  var pt = getPaddingValue(sourceInfo, 'paddingTop');
  var pr = getPaddingValue(sourceInfo, 'paddingRight');
  var pb = getPaddingValue(sourceInfo, 'paddingBottom');
  var pl = getPaddingValue(sourceInfo, 'paddingLeft');

  // Draw directional arrow spanning across the component (only for top level)
  if (depth === 0) {
    var MIN_ARROW = 64;

    // Both arrows sit to the right of the alignment grid (grid: x=24, y=24, size=32).
    var GRID_SIZE = 32;
    var ARROW_X = 24 + GRID_SIZE + 24; // x80
    var ARROW_Y = 24;                  // top-aligned with grid

    if (mode === 'HORIZONTAL') {
      var hArrow = figma.createLine();
      hArrow.name = 'Direction-Arrow [HORIZONTAL]';
      hArrow.strokes = solidPaint(COLOR_ACCENT, 1);
      hArrow.strokeWeight = 2;
      hArrow.strokeCap = 'ARROW_LINES';
      hArrow.resize(GRID_SIZE, 0);
      hArrow.x = ARROW_X;
      hArrow.y = ARROW_Y + GRID_SIZE / 2; // vertically centred within grid row
      panel.appendChild(hArrow);
    } else {
      var vArrow = figma.createLine();
      vArrow.name = 'Direction-Arrow [VERTICAL]';
      vArrow.strokes = solidPaint(COLOR_ACCENT, 1);
      vArrow.strokeWeight = 2;
      vArrow.strokeCap = 'ARROW_LINES';
      vArrow.resize(GRID_SIZE, 0);
      vArrow.rotation = -90;
      vArrow.x = ARROW_X;
      vArrow.y = ARROW_Y;
      panel.appendChild(vArrow);
    }
  }

  var PROP_SIDE: { [k: string]: string } = { Top: 'paddingTop', Right: 'paddingRight', Bottom: 'paddingBottom', Left: 'paddingLeft' };

  function addPadRect(rx: number, ry: number, rw: number, rh: number, value: number, side: string): void {
    if (rw <= 0 || rh <= 0) return;

    var wrapper = figma.createFrame();
    wrapper.name = 'Padding-' + side + '-' + value + 'px';
    wrapper.layoutMode = 'NONE';
    wrapper.resize(rw, rh);
    wrapper.fills = [];
    wrapper.strokes = [];
    wrapper.clipsContent = false;

    var r = figma.createRectangle();
    r.name = 'Padding-' + side + '-' + value + 'px [Overlay]';
    r.resize(rw, rh);
    r.fills = solidPaint(COLOR_SPACING, 0.2);
    r.strokes = [];
    r.x = 0;
    r.y = 0;

    // Resolve token alias from the original source node (clone has no boundVariables)
    var propKey = PROP_SIDE[side] || '';
    var alias = propKey ? resolveVarAlias(sourceInfo, propKey, undefined, mainCompNode) : '';
    var labelText = alias ? shortTokenName(alias) : formatGuideValue(value);

    wrapper.appendChild(r);

    // Only label the first occurrence of this exact padding side+value —
    // repeated siblings (e.g. 5 identical nav items) would otherwise stack
    // identical text on top of each other. The colored region still draws
    // every time so coverage stays visible.
    var padKey = 'pad:' + side + ':' + labelText;
    if (!seenLabels![padKey]) {
      seenLabels![padKey] = true;
      var t = makeGuideLabel(labelText, COLOR_SPACING);
      t.name = 'Padding-' + side + '-' + value + 'px [Label]';
      var lw = t.width || 20;
      var lh = t.height || 14;

      // Position label OUTSIDE the padding rect so it never overlaps the component
      if (side === 'Top') {
        t.x = Math.round(rw / 2 - lw / 2);
        t.y = -(lh + 3);
      } else if (side === 'Bottom') {
        t.x = Math.round(rw / 2 - lw / 2);
        t.y = rh + 3;
      } else if (side === 'Left') {
        t.x = -(lw + 4);
        t.y = Math.round(rh / 2 - lh / 2);
      } else { // Right
        t.x = rw + 4;
        t.y = Math.round(rh / 2 - lh / 2);
      }
      wrapper.appendChild(t);
    }

    wrapper.x = rx;
    wrapper.y = ry;
    panel.appendChild(wrapper);
    // Positioned relative to the clone's build-time location; the clone
    // re-centers reactively (CENTER/CENTER in centerNodeInPanel), so the
    // overlay needs the same constraint to shift in lockstep and stay on
    // the padding it's highlighting. Grid/direction arrows deliberately
    // keep default pinning — they're chrome, not tied to the instance.
    try {
      (wrapper as any).constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
    } catch (e) {}
  }

  addPadRect(x, y, w, pt, pt, 'Top');
  addPadRect(x + w - pr, y, pr, h, pr, 'Right');
  addPadRect(x, y + h - pb, w, pb, pb, 'Bottom');
  addPadRect(x, y, pl, h, pl, 'Left');

  var spacing = getItemSpacingValue(sourceInfo);
  if (spacing <= 0 || !targetClone.children || targetClone.children.length < 2) return;

  var visibleChildren: any[] = [];
  for (var i = 0; i < targetClone.children.length; i++) {
    var c = targetClone.children[i] as any;
    if (c && c.visible !== false) visibleChildren.push(c);
  }
  if (visibleChildren.length < 2) return;

  // Loop through all adjacent pairs of children to show all gaps
  for (var idx = 0; idx < visibleChildren.length - 1; idx++) {
    var a = visibleChildren[idx];
    var b = visibleChildren[idx + 1];
    
    var gapAlias = resolveVarAlias(sourceInfo, 'itemSpacing', undefined, mainCompNode);
    var gapLabelText = gapAlias ? shortTokenName(gapAlias) : formatGuideValue(spacing);
    // Every gap in one auto-layout container shares the same itemSpacing
    // value, so without this every pair — and every repeated sibling
    // container recursed into below — would stack an identical label.
    // Only the first occurrence gets text; the colored region still marks
    // every gap.
    var gapKey = 'gap:' + gapLabelText;
    var showGapLabel = !seenLabels![gapKey];
    seenLabels![gapKey] = true;

    if (mode === 'HORIZONTAL') {
      var x1 = (a.x || 0) + (a.width || 0);
      var x2 = (b.x || 0);
      if (x2 > x1) {
        var gapWidth = x2 - x1;
        var topY = Math.min(a.y || 0, b.y || 0);
        var bottomY = Math.max((a.y || 0) + (a.height || 0), (b.y || 0) + (b.height || 0));
        var gapHeight = bottomY - topY;

        var gapFrame = figma.createFrame();
        gapFrame.name = 'Item-Spacing-Gap-' + spacing + 'px';
        gapFrame.fills = [];
        gapFrame.clipsContent = false;
        gapFrame.layoutMode = 'NONE';
        gapFrame.resize(gapWidth, gapHeight);

        var gapRect = figma.createRectangle();
        gapRect.name = 'Item-Spacing-Gap-' + spacing + 'px [Overlay]';
        gapRect.fills = solidPaint(COLOR_ORANGE, 0.2);
        gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
        gapRect.strokeWeight = 1;
        gapRect.resize(gapWidth, gapHeight);
        gapRect.x = 0;
        gapRect.y = 0;

        gapFrame.appendChild(gapRect);
        if (showGapLabel) {
          var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
          label.name = 'Item-Spacing-Gap-' + spacing + 'px [Label]';
          label.x = Math.max(0, Math.round(gapWidth / 2 - (label.width || 0) / 2));
          label.y = gapHeight + 4;
          gapFrame.appendChild(label);
        }
        gapFrame.x = x + x1;
        gapFrame.y = y + topY;
        panel.appendChild(gapFrame);
        // Track the re-centering clone, same as the padding overlays.
        try {
          (gapFrame as any).constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
        } catch (e) {}
      }
    } else {
      var y1 = (a.y || 0) + (a.height || 0);
      var y2 = (b.y || 0);
      if (y2 > y1) {
        var gapHeight = y2 - y1;
        var leftX = Math.min(a.x || 0, b.x || 0);
        var rightX = Math.max((a.x || 0) + (a.width || 0), (b.x || 0) + (b.width || 0));
        var gapWidth = rightX - leftX;

        var gapFrame = figma.createFrame();
        gapFrame.name = 'Item-Spacing-Gap-' + spacing + 'px';
        gapFrame.fills = [];
        gapFrame.clipsContent = false;
        gapFrame.layoutMode = 'NONE';
        gapFrame.resize(gapWidth, gapHeight);

        var gapRect = figma.createRectangle();
        gapRect.name = 'Item-Spacing-Gap-' + spacing + 'px [Overlay]';
        gapRect.fills = solidPaint(COLOR_ORANGE, 0.2);
        gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
        gapRect.strokeWeight = 1;
        gapRect.resize(gapWidth, gapHeight);
        gapRect.x = 0;
        gapRect.y = 0;

        gapFrame.appendChild(gapRect);
        if (showGapLabel) {
          var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
          label.name = 'Item-Spacing-Gap-' + spacing + 'px [Label]';
          label.x = -Math.round((label.width || 0) + 8);
          label.y = Math.max(0, Math.round(gapHeight / 2 - (label.height || 0) / 2));
          gapFrame.appendChild(label);
        }
        gapFrame.x = x + leftX;
        gapFrame.y = y + y1;
        panel.appendChild(gapFrame);
        // Track the re-centering clone, same as the padding overlays.
        try {
          (gapFrame as any).constraints = { horizontal: 'CENTER', vertical: 'CENTER' };
        } catch (e) {}
      }
    }
  }
  
  // Recursively draw guides for nested auto-layout children (up to 4 levels)
  if (depth < 4) {
    for (var i = 0; i < visibleChildren.length; i++) {
      var child = visibleChildren[i];
      var childMode = child.layoutMode || (child.inferredAutoLayout ? child.inferredAutoLayout.layoutMode : 'NONE');
      if (childMode && childMode !== 'NONE') {
        // Pass accumulated position so nested gaps align correctly
        drawAutoLayoutGuides(child, panel, child, depth + 1, x, y, mainCompNode, seenLabels);
      }
    }
  }
}

// Finds frames that directly contain an INSTANCE_SWAP slot node, de-duplicated by node id.
function findSlotContainers(root: any): any[] {
  var seen: { [id: string]: boolean } = {};
  var containers: any[] = [];

  function walk(node: any): void {
    if (!node) return;
    var refs = node.componentPropertyReferences;
    if (refs && (refs.mainComponent !== undefined)) {
      // This node is a slot — its parent auto-layout frame defines the slot spacing
      var parent = node.parent;
      while (parent) {
        var mode = parent.layoutMode || (parent.inferredAutoLayout ? parent.inferredAutoLayout.layoutMode : 'NONE');
        if (mode && mode !== 'NONE') break;
        parent = parent.parent;
      }
      var container = parent || node.parent;
      if (container && !seen[container.id]) {
        seen[container.id] = true;
        containers.push({ slotNode: node, container: container });
      }
    }
    if (node.children && Array.isArray(node.children)) {
      for (var i = 0; i < node.children.length; i++) {
        walk(node.children[i]);
      }
    }
  }

  walk(root);
  return containers;
}

function findPrimaryAutoLayoutTarget(node: SceneNode): SceneNode {
  var n = node as any;
  if (!n || !n.children || n.children.length === 0) return node;
  for (var i = 0; i < n.children.length; i++) {
    var child = n.children[i] as any;
    if (!child || child.visible === false) continue;
    var mode = child.layoutMode || (child.inferredAutoLayout ? child.inferredAutoLayout.layoutMode : 'NONE');
    if (mode && mode !== 'NONE') return child as SceneNode;
  }
  return node;
}

function formatSpacingValue(node: any, prop: string, value: number): string {
  var alias = resolveVarAlias(node, prop);
  if (!alias) return '' + value;
  return value + '  (' + alias + ')';
}

async function buildPropertiesSheetSection(parent: FrameNode, node: SceneNode, stateTarget: StateTargetInfo | null): Promise<void> {
  var previewTarget = buildPropertyPreviewTarget(node, stateTarget);
  var propertyNode = resolveNodeAtPath(node, previewTarget.targetPath) as any;
  if (!propertyNode) propertyNode = node as any;

  var propertyData = await getPropertyDefinitionsForNodeAsync(propertyNode);
  if (!propertyData) return;

  var defs = propertyData.defs || {};
  var currentProps = propertyData.currentProps || {};
  var keys = Object.keys(defs);
  if (keys.length === 0) return;

  var section = makeSectionWrapper('Properties');
  section.appendChild(makeText('Visualized component properties for ' + previewTarget.targetName, 11, FONT_REGULAR, COLOR_VALUE));

  var stateVariantGroups: Array<{ baseName: string; cards: PropertyCardSpec[] }> = [];
  var regularGroups: Array<{ baseName: string; cards: PropertyCardSpec[] }> = [];
  var booleanCards: PropertyCardSpec[] = [];
  var hasAnyCards = false;

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var def = defs[key];
    if (!def) continue;

    var propType = normalizeComponentPropertyType(def.type);
    if (propType === 'UNKNOWN') continue;
    // TEXT properties (e.g. a badge's label string) render as near-identical
    // cards — same preview, different content — and the content itself is
    // subjective per usage, so it adds noise rather than spec value. Hidden.
    if (propType === 'TEXT') continue;

    var baseName = getPropertyBaseName(key);
    var currentEntry = currentProps[key] || currentProps[baseName];
    var currentRawValue: any = def.defaultValue;

    if (currentEntry && typeof currentEntry === 'object' && ('value' in currentEntry)) {
      currentRawValue = currentEntry.value;
    } else if (propType === 'VARIANT' && typeof currentProps[baseName] === 'string') {
      currentRawValue = currentProps[baseName];
    }

    var cards = await createPropertyCardsForDefinition(key, propType, def, currentRawValue, def.defaultValue, currentEntry, propertyNode);
    if (cards.length === 0) continue;

    if (propType === 'BOOLEAN') {
      for (var bc = 0; bc < cards.length; bc++) {
        booleanCards.push({
          title: baseName,
          propertyKey: cards[bc].propertyKey,
          propertyType: cards[bc].propertyType,
          value: cards[bc].value,
          valueLabel: cards[bc].valueLabel,
          variableRefs: cards[bc].variableRefs,
          metaLines: cards[bc].metaLines
        });
      }
      continue;
    }

    if (propType === 'VARIANT' && isStatePropertyName(key)) {
      stateVariantGroups.push({ baseName: baseName, cards: cards });
      continue;
    }

    regularGroups.push({ baseName: baseName, cards: cards });
  }

  async function appendPropertyGroup(groupName: string, cards: PropertyCardSpec[], maxWidth?: number): Promise<void> {
    if (cards.length === 0) return;
    hasAnyCards = true;
    section.appendChild(makeText(groupName, 36, FONT_BOLD, COLOR_HEADER));

    // Derive card width from SHEET_INNER_WIDTH — the same "one true width"
    // Anatomy and Variables already build against — instead of the old
    // independent PROPERTIES_CARD_WIDTH constant. Used as the starting size
    // for 1-2 card rows (which use real FILL sizing below and will track
    // the sheet if it's later resized) and as a fixed size for 3+ card
    // groups (still GRID-based — see note below).
    var groupInnerWidth = SHEET_INNER_WIDTH - 48;
    var groupGap = 24;
    var cardWidth = cards.length === 1 ? groupInnerWidth : Math.floor((groupInnerWidth - groupGap) / 2);

    // 1-2 cards (the vast majority: booleans, instance-swaps, most variant
    // groups) get a plain HORIZONTAL auto-layout row with real FILL
    // children — genuinely reactive if the sheet is resized later, unlike
    // GRID's fixed-width column tracks. 3+ cards keep the GRID (wraps into
    // multiple rows of 2), since WRAP layouts require fixed/hug child sizes
    // and can't use FILL — a fixed card width there is an acceptable
    // trade-off for a case this rare.
    var useGrid = cards.length > 2;
    var grid: FrameNode;
    if (useGrid) {
      grid = createPropertyGroupGrid(cardWidth);
      grid.gridRowCount = Math.max(1, Math.ceil(cards.length / 2));
    } else {
      grid = figma.createFrame();
      grid.layoutMode = 'HORIZONTAL';
      grid.itemSpacing = groupGap;
      grid.primaryAxisSizingMode = 'AUTO';
      grid.counterAxisSizingMode = 'AUTO';
      grid.fills = [];
    }
    grid.name = SPEC_PREFIX + 'Property Cards ' + groupName;

    var contextualByCard: PropertyVariableRef[][] = [];
    var allowedVariantRefBaseKeys: { [key: string]: boolean } | undefined = undefined;

    if (cards.length > 1 && cards[0].propertyType === 'VARIANT') {
      var baseStats: { [base: string]: { count: number; values: { [v: string]: boolean } } } = {};

      for (var pc = 0; pc < cards.length; pc++) {
        var ctxRefs = await collectContextualVariableRefsForCard(node, previewTarget, cards[pc]);
        contextualByCard[pc] = ctxRefs;

        var merged: PropertyVariableRef[] = [];
        for (var sr = 0; sr < cards[pc].variableRefs.length; sr++) merged.push(cards[pc].variableRefs[sr]);
        for (var cr = 0; cr < ctxRefs.length; cr++) merged.push(ctxRefs[cr]);

        var seenCardRef: { [k: string]: boolean } = {};
        for (var mr = 0; mr < merged.length; mr++) {
          var ref = merged[mr];
          var unique = getPropertyVariableRefUniqueKey(ref);
          if (seenCardRef[unique]) continue;
          seenCardRef[unique] = true;

          var base = getPropertyVariableRefBaseKey(ref);
          if (!baseStats[base]) baseStats[base] = { count: 0, values: {} };
          baseStats[base].count += 1;
          baseStats[base].values[ref.fallbackValue || '-'] = true;
        }
      }

      allowedVariantRefBaseKeys = {};
      var statKeys = Object.keys(baseStats);
      for (var sk = 0; sk < statKeys.length; sk++) {
        var stat = baseStats[statKeys[sk]];
        var valueCount = Object.keys(stat.values).length;
        if (valueCount > 1 || stat.count < cards.length) {
          allowedVariantRefBaseKeys[statKeys[sk]] = true;
        }
      }
    }

      var cardRefs: FrameNode[] = [];
      for (var c = 0; c < cards.length; c++) {
        var card = await makeStateCard(
          cards[c].title,
          node,
          previewTarget,
          cards[c],
          contextualByCard[c],
          allowedVariantRefBaseKeys,
          cardWidth
        );
        grid.appendChild(card);
        try {
          (card as any).layoutSizingVertical = 'HUG';
          if (useGrid) (card as any).gridColumnSpan = 1;
        } catch (e) {}
        cardRefs.push(card);
      }

      if (maxWidth) {
        try {
          grid.resizeWithoutConstraints(maxWidth, grid.height || 1);
        } catch (e) {}
      }

      section.appendChild(grid);

      // A card whose preview genuinely grew past cardWidth (real component
      // doesn't fit) must keep its natural width — FILL would snap it back
      // down to its evenly-split share and crop it. If any card grew, the
      // grid itself is also left un-FILLed so it hugs its true (wider)
      // content instead of being force-shrunk to the section's width;
      // finalizeSheetWidth then grows the whole sheet to match.
      var anyCardGrew = false;
      for (var cg = 0; cg < cardRefs.length; cg++) {
        if ((cardRefs[cg].width || cardWidth) > cardWidth + 0.5) { anyCardGrew = true; break; }
      }

      if (!anyCardGrew) {
        try { (grid as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
      }

      for (var ci = 0; ci < cardRefs.length; ci++) {
        var grew = (cardRefs[ci].width || cardWidth) > cardWidth + 0.5;
        if (!grew) {
          try { (cardRefs[ci] as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
        }
      }
  }

  for (var s = 0; s < stateVariantGroups.length; s++) {
    await appendPropertyGroup(stateVariantGroups[s].baseName, stateVariantGroups[s].cards);
  }

  if (booleanCards.length > 0) {
    await appendPropertyGroup('Boolean', booleanCards);
  }

  for (var r = 0; r < regularGroups.length; r++) {
    await appendPropertyGroup(regularGroups[r].baseName, regularGroups[r].cards);
  }

  if (hasAnyCards) {
    parent.appendChild(section);
  }
}

function formatVariableAppliedAs(prop: string, node?: any): string {
  var base = prop.replace(/\[\d+\]/g, '');
  if (base === 'fills') {
    if (node) {
      var t = node.type || '';
      if (t === 'TEXT') return 'Text color';
      if (t === 'VECTOR' || t === 'BOOLEAN_OPERATION' || t === 'STAR' || t === 'POLYGON' || t === 'ELLIPSE' || t === 'LINE') return 'Icon color';
    }
    return 'Background color';
  }
  if (base === 'textFills') return 'Text color';
  if (base === 'strokes') return 'Border color';
  if (base === 'effects') return 'Drop shadow';
  if (base === 'height') return 'Height';
  if (base === 'width') return 'Width';
  if (base === 'minHeight') return 'Min height';
  if (base === 'minWidth') return 'Min width';
  if (base === 'itemSpacing') return 'Item spacing';
  if (base === 'paddingTop') return 'Padding top';
  if (base === 'paddingRight') return 'Padding right';
  if (base === 'paddingBottom') return 'Padding bottom';
  if (base === 'paddingLeft') return 'Padding left';
  if (base === 'textDecoration') return 'Text decoration';
  if (base === 'textCase') return 'Text case';
  if (base === 'fontName') return 'Font name';
  if (base === 'fontStyle') return 'Font style';
  if (base === 'fontSize') return 'Font size';
  if (base === 'fontFamily') return 'Font family';
  if (base === 'lineHeight') return 'Line height';
  if (base === 'letterSpacing') return 'Letter spacing';
  if (base === 'paragraphSpacing') return 'Paragraph spacing';
  if (base === 'paragraphIndent') return 'Paragraph indent';
  if (base === 'topLeftRadius' || base === 'topRightRadius' || base === 'bottomLeftRadius' || base === 'bottomRightRadius') return 'Border radius';
  if (base === 'cornerRadius') return 'Border radius';
  if (base === 'opacity') return 'Opacity';
  return base.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
}

var VARIABLE_LOOKUP_CACHE: VariableLookupCache | null = null;

function getVariableLookupCache(): VariableLookupCache {
  if (!VARIABLE_LOOKUP_CACHE) {
    VARIABLE_LOOKUP_CACHE = {
      byId: {},
      byKey: {},
      libraryByKey: {},
      libraryLoaded: false
    };
  }
  return VARIABLE_LOOKUP_CACHE;
}

async function hydrateLibraryVariableLookupCacheAsync(): Promise<void> {
  var cache = getVariableLookupCache();
  if (cache.libraryLoaded) return;

  try {
    var variables = figma.variables.getLocalVariables();
    for (var i = 0; i < variables.length; i++) {
      var variable = variables[i] as any;
      if (!variable) continue;
      if (variable.id) {
        cache.byId[variable.id] = variable;
        cache.byId[normalizeVariableIdentifier(variable.id)] = variable;
      }
      if (variable.key) cache.byKey[variable.key] = variable;
    }
  } catch (e) {}

  try {
    var collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    for (var c = 0; c < collections.length; c++) {
      var collection = collections[c];
      if (!collection || !collection.key) continue;

      try {
        var libraryVariables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
        for (var v = 0; v < libraryVariables.length; v++) {
          var libraryVariable = libraryVariables[v] as any;
          if (!libraryVariable || !libraryVariable.key) continue;
          cache.byKey[libraryVariable.key] = libraryVariable;
          if (libraryVariable.id) {
            cache.byId[libraryVariable.id] = libraryVariable;
            cache.byId[normalizeVariableIdentifier(libraryVariable.id)] = libraryVariable;
          }
          cache.libraryByKey[libraryVariable.key] = {
            name: libraryVariable.name || '',
            resolvedType: libraryVariable.resolvedType || 'UNKNOWN',
            libraryName: collection.libraryName || '',
            collectionName: collection.name || ''
          };
        }
      } catch (e) {}
    }
  } catch (e) {}

  cache.libraryLoaded = true;
}

function normalizeVariableIdentifier(id: string): string {
  return (id || '').trim();
}

function resolveVariableFromBinding(variableId: string, binding: any): any {
  var cache = getVariableLookupCache();

  var candidates: string[] = [];
  if (variableId) {
    candidates.push(variableId);
    candidates.push(normalizeVariableIdentifier(variableId));
  }
  if (binding && typeof binding.id === 'string') {
    candidates.push(binding.id);
    candidates.push(normalizeVariableIdentifier(binding.id));
  }

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    if (!candidate) continue;

    try {
      var direct = figma.variables.getVariableById(candidate);
      if (direct) return direct;
    } catch (e) {}

    if (cache.byId[candidate]) return cache.byId[candidate];
  }

  if (binding && typeof binding.key === 'string' && cache.byKey[binding.key]) {
    return cache.byKey[binding.key];
  }

  return null;
}

async function resolveVariableFromBindingAsync(variableId: string, binding: any): Promise<any> {
  var cache = getVariableLookupCache();

  var candidates: string[] = [];
  if (variableId) {
    candidates.push(variableId);
    candidates.push(normalizeVariableIdentifier(variableId));
  }
  if (binding && typeof binding.id === 'string') {
    candidates.push(binding.id);
    candidates.push(normalizeVariableIdentifier(binding.id));
  }

  for (var i = 0; i < candidates.length; i++) {
    var candidate = candidates[i];
    if (!candidate) continue;

    try {
      var asyncResolved = await figma.variables.getVariableByIdAsync(candidate);
      if (asyncResolved) {
        if ((asyncResolved as any).id) {
          cache.byId[(asyncResolved as any).id] = asyncResolved;
          cache.byId[normalizeVariableIdentifier((asyncResolved as any).id)] = asyncResolved;
        }
        if ((asyncResolved as any).key) cache.byKey[(asyncResolved as any).key] = asyncResolved;
        return asyncResolved;
      }
    } catch (e) {}

    if (cache.byId[candidate]) return cache.byId[candidate];
  }

  var resolved = resolveVariableFromBinding(variableId, binding);
  if (resolved) return resolved;

  if (binding && typeof binding.key === 'string' && binding.key.length > 0) {
    await hydrateLibraryVariableLookupCacheAsync();
  }

  if (binding && typeof binding.key === 'string' && binding.key.length > 0) {
    try {
      var imported = await figma.variables.importVariableByKeyAsync(binding.key);
      if (imported) {
        var cache = getVariableLookupCache();
        if (imported.id) {
          cache.byId[imported.id] = imported;
          cache.byId[normalizeVariableIdentifier(imported.id)] = imported;
        }
        if ((imported as any).key) cache.byKey[(imported as any).key] = imported;
        return imported;
      }
    } catch (e) {}
  }

  return null;
}

function variableTypeRank(variableType: string): number {
  if (variableType === 'COLOR') return 0;
  if (variableType === 'FLOAT') return 1;
  return 2;
}

function getVariablePreviewKind(prop: string, variableType: string): string {
  var base = prop.replace(/\[\d+\]/g, '');
  if (base === 'fills' || base === 'textFills' || base === 'strokes' || base === 'effects') return 'color';
  if (base === 'fontName' || base === 'fontFamily' || base === 'fontStyle' || base === 'fontSize' || base === 'lineHeight' || base === 'letterSpacing' || base === 'paragraphSpacing' || base === 'paragraphIndent' || base === 'textCase' || base === 'textDecoration') return 'text';
  if (base === 'cornerRadius' || base === 'topLeftRadius' || base === 'topRightRadius' || base === 'bottomLeftRadius' || base === 'bottomRightRadius') return 'radius';
  if (base === 'width' || base === 'minWidth' || base === 'maxWidth') return 'width';
  if (base === 'height' || base === 'minHeight' || base === 'maxHeight') return 'height';
  if (base === 'itemSpacing' || base === 'paddingTop' || base === 'paddingRight' || base === 'paddingBottom' || base === 'paddingLeft') return 'spacing';
  if (base === 'opacity') return 'opacity';
  if (variableType === 'COLOR') return 'color';
  if (variableType === 'FLOAT') return 'number';
  return 'token';
}

function formatResolvedVariableValue(raw: any, variableType: string): { label: string; color: RGB | null } {
  if (!raw) return { label: '-', color: null };

  if (variableType === 'COLOR' && raw && typeof raw === 'object') {
    var color = { r: raw.r || 0, g: raw.g || 0, b: raw.b || 0 } as RGB;
    var hex = rgbToHex(color);
    var alpha = typeof raw.a === 'number' ? raw.a : 1;
    var label = alpha < 1 ? (hex + ' @ ' + Math.round(alpha * 100) + '%') : hex;
    return { label: label, color: color };
  }

  if (variableType === 'FLOAT') {
    if (typeof raw === 'number') return { label: '' + Math.round(raw * 100) / 100, color: null };
    return { label: '-', color: null };
  }

  if (variableType === 'BOOLEAN') {
    return { label: raw ? 'true' : 'false', color: null };
  }

  if (variableType === 'STRING') {
    return { label: typeof raw === 'string' ? raw : '-', color: null };
  }

  return { label: '-', color: null };
}

function formatVariableFallback(variable: any, consumer?: any): { label: string; color: RGB | null } {
  if (!variable) return { label: '-', color: null };

  try {
    if (consumer && typeof variable.resolveForConsumer === 'function') {
      var resolved = variable.resolveForConsumer(consumer);
      if (resolved && 'value' in resolved) {
        return formatResolvedVariableValue(resolved.value, resolved.resolvedType || variable.resolvedType || 'UNKNOWN');
      }
    }
  } catch (e) {}

  if (!variable.valuesByMode) return { label: '-', color: null };
  var modeIds = Object.keys(variable.valuesByMode);
  if (modeIds.length === 0) return { label: '-', color: null };

  function resolveModeValue(v: any, depth: number): any {
    if (!v || !v.valuesByMode) return null;
    if (depth > 5) return null;
    var ids = Object.keys(v.valuesByMode);
    if (ids.length === 0) return null;
    var value = v.valuesByMode[ids[0]];
    if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string') {
      var aliasVar = resolveVariableFromBinding(value.id, value);
      if (aliasVar) return resolveModeValue(aliasVar, depth + 1);
    }
    return value;
  }

  return formatResolvedVariableValue(resolveModeValue(variable, 0), variable.resolvedType || 'UNKNOWN');
}

async function resolveVariableDetails(variableId: string, binding: any, consumer?: any): Promise<{ name: string; variableId: string; type: string; fallbackColor: RGB | null; fallbackValue: string }> {
  var variable = await resolveVariableFromBindingAsync(variableId, binding);
  if (variable) {
    var fallback = formatVariableFallback(variable, consumer);
    return {
      name: variable.name || variableId,
      variableId: (variable.id || normalizeVariableIdentifier(variableId || '')) as string,
      type: variable.resolvedType || 'UNKNOWN',
      fallbackColor: fallback.color,
      fallbackValue: fallback.label
    };
  }

  var cache = getVariableLookupCache();
  if (binding && typeof binding.key === 'string' && binding.key.length > 0) {
    var libraryMeta = cache.libraryByKey[binding.key];
    if (libraryMeta) {
      return {
        name: libraryMeta.name || binding.key,
        variableId: normalizeVariableIdentifier(variableId || ''),
        type: libraryMeta.resolvedType || 'UNKNOWN',
        fallbackColor: null,
        fallbackValue: '-'
      };
    }
  }

  var fallbackName = '';
  if (binding && typeof binding.name === 'string' && binding.name.length > 0) {
    fallbackName = binding.name;
  } else if (binding && typeof binding.key === 'string' && binding.key.length > 0) {
    fallbackName = binding.key;
  } else if (variableId && variableId.length > 0) {
    fallbackName = 'Variable ' + normalizeVariableIdentifier(variableId);
  }

  return {
    name: fallbackName || 'Unresolved variable',
    variableId: normalizeVariableIdentifier(variableId || ''),
    type: 'UNKNOWN',
    fallbackColor: null,
    fallbackValue: '-'
  };
}

function inferColorFromUsage(node: any, prop: string): RGB | null {
  if (!node) return null;
  var baseProp = prop.replace(/\[\d+\]/g, '');
  return _inferColorFromUsageParsed(node, baseProp, prop);
}

function _inferColorFromUsageParsed(node: any, baseProp: string, prop: string): RGB | null {
  var match = prop.match(/\[(\d+)\]$/);
  var index = match ? parseInt(match[1], 10) : 0;

  function colorFromPaint(paint: any): RGB | null {
    if (!paint || paint.visible === false) return null;
    if (paint.type === 'SOLID' && paint.color) {
      return {
        r: typeof paint.color.r === 'number' ? paint.color.r : 0,
        g: typeof paint.color.g === 'number' ? paint.color.g : 0,
        b: typeof paint.color.b === 'number' ? paint.color.b : 0
      } as RGB;
    }
    return null;
  }

  if ((baseProp === 'fills' || baseProp === 'textFills' || baseProp === 'strokes') && Array.isArray(node[baseProp])) {
    if (index >= 0 && index < node[baseProp].length) {
      var indexed = colorFromPaint(node[baseProp][index]);
      if (indexed) return indexed;
    }
    for (var i = 0; i < node[baseProp].length; i++) {
      var firstVisible = colorFromPaint(node[baseProp][i]);
      if (firstVisible) return firstVisible;
    }
  }

  if (baseProp === 'effects' && Array.isArray(node.effects)) {
    for (var e = 0; e < node.effects.length; e++) {
      var effect = node.effects[e];
      if (!effect || effect.visible === false) continue;
      if ((effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && effect.color) {
        return {
          r: typeof effect.color.r === 'number' ? effect.color.r : 0,
          g: typeof effect.color.g === 'number' ? effect.color.g : 0,
          b: typeof effect.color.b === 'number' ? effect.color.b : 0
        } as RGB;
      }
    }
  }

  return null;
}

function readNodePropertyValue(node: any, baseProp: string): string | null {
  if (!node) return null;
  var val = node[baseProp];
  if (typeof val === 'number') return '' + Math.round(val * 100) / 100;
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return '' + val;
  return null;
}

function resolveAppliedTargetNode(node: any): any {
  if (!node) return node;

  if (node.type !== 'VECTOR') return node;

  var current = node.parent;
  while (current) {
    if (current.type === 'INSTANCE' || current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') {
      return current;
    }
    current = current.parent;
  }

  return node;
}

function formatVariableAppliedTo(node: any): string {
  var targetNode = resolveAppliedTargetNode(node);
  return getTypeIcon(targetNode.type || 'UNKNOWN') + ' ' + (targetNode.name || targetNode.type || 'Layer');
}

function getVariableDedupIdentity(variableId: string, binding: any, details: any): string {
  if (binding && typeof binding.key === 'string' && binding.key.length > 0) return 'key:' + binding.key;

  var normalizedId = normalizeVariableIdentifier(variableId || (binding && binding.id ? binding.id : ''));
  if (normalizedId) return 'id:' + normalizedId;

  if (details && details.name) return 'name:' + details.name + '|' + (details.type || 'UNKNOWN');

  return 'unknown';
}

function isHexColorName(value: string): boolean {
  if (!value) return false;
  return /^#[0-9A-Fa-f]{3,8}(\s*@\s*\d+%|\s*\/\s*\d+%|)$/.test(value.trim());
}

function isFallbackVariableName(value: string): boolean {
  if (!value) return true;
  if (value === 'Unresolved variable') return true;
  if (value.indexOf('Variable VariableID:') === 0) return true;
  if (value.indexOf('Variable ') === 0) return true;
  if (value.indexOf('Bound ') === 0) return true;
  if (isHexColorName(value)) return true;
  return false;
}

function getAnatomyRoleName(sourceNode: any): string {
  var current = sourceNode;
  while (current) {
    var name = current && typeof current.name === 'string' ? current.name.trim() : '';
    if (name) {
      var lower = name.toLowerCase();
      if (lower !== 'text' && lower !== 'frame' && lower !== 'group' && lower !== 'rectangle' && lower !== 'instance' && lower !== 'component' && lower !== 'layer') {
        return name;
      }
    }
    current = current.parent;
  }
  return '';
}

function getAnatomyDocumentationLabel(sourceNode: any, fallbackAppliedAs: string, previewKind: string): string {
  var roleName = getAnatomyRoleName(sourceNode);
  var kindLabel = '';
  if (previewKind === 'text') kindLabel = 'style';
  else if (previewKind === 'color') kindLabel = 'color';
  else if (previewKind === 'radius') kindLabel = 'radius';
  else if (previewKind === 'spacing') kindLabel = 'spacing';
  else if (previewKind === 'number') kindLabel = 'value';
  else kindLabel = fallbackAppliedAs || 'value';

  if (roleName) return roleName + ' ' + kindLabel;
  return fallbackAppliedAs || kindLabel;
}

function formatFallbackValueFromUsage(node: any, prop: string, previewKind: string, fallbackColor: RGB | null): string {
  var baseProp = prop.replace(/\[\d+\]/g, '');
  if (previewKind === 'color' && fallbackColor) {
    return rgbToHex(fallbackColor);
  }

  var nodeVal = readNodePropertyValue(node, baseProp);
  if (nodeVal !== null) return nodeVal;

  if (previewKind === 'color') return '-';
  return '-';
}

function shouldShowVariableUsageRow(appliedAs: string, previewKind: string): boolean {
  if (previewKind === 'text') return appliedAs === 'Font style';
  return true;
}

async function collectDirectVariableUsageRows(node: any): Promise<VariableUsageRow[]> {
  VARIABLE_LOOKUP_CACHE = null;

  var rows: VariableUsageRow[] = [];
  var aggregates: { [key: string]: VariableUsageAggregate } = {};

  async function addUsage(variableId: string, prop: string, currentNode: any): Promise<void> {
    var binding = null;
    var baseProp = prop.replace(/\[\d+\]/g, '');
    try {
      var rawBinding = currentNode && currentNode.boundVariables ? currentNode.boundVariables[baseProp] : null;
      if (Array.isArray(rawBinding)) {
        var match = prop.match(/\[(\d+)\]$/);
        var index = match ? parseInt(match[1], 10) : -1;
        if (index >= 0 && index < rawBinding.length) binding = rawBinding[index];
      } else {
        binding = rawBinding;
      }
    } catch (e) {}

    var details = await resolveVariableDetails(variableId, binding, currentNode);
    var actualColor = inferColorFromUsage(currentNode, prop);
    if (actualColor) details.fallbackColor = actualColor;
    var previewKind = getVariablePreviewKind(prop, details.type);
    var fallbackValue = formatFallbackValueFromUsage(currentNode, prop, previewKind, details.fallbackColor);
    if (!details.fallbackValue || details.fallbackValue === '-') {
      details.fallbackValue = fallbackValue;
    }

    var nameIsRaw = isFallbackVariableName(details.name);
    if (nameIsRaw) {
      if (previewKind === 'color' && binding && typeof binding.name === 'string' && binding.name.length > 0) {
        details.name = binding.name;
      } else if (previewKind === 'color' && binding && typeof binding.key === 'string' && binding.key.length > 0) {
        details.name = binding.key;
      } else {
        details.name = 'Bound ' + formatVariableAppliedAs(prop);
      }
    }

    var appliedAs = formatVariableAppliedAs(prop, node || currentNode);
    if (!shouldShowVariableUsageRow(appliedAs, previewKind)) return;
    var appliedTarget = resolveAppliedTargetNode(currentNode);
    var appliedTo = getTypeIcon(appliedTarget.type || 'UNKNOWN') + ' ' + (appliedTarget.name || appliedTarget.type || 'Layer');
    var aggregateKey = getVariableDedupIdentity(variableId, binding, details);
    if (!aggregates[aggregateKey]) {
      aggregates[aggregateKey] = {
        variableName: details.name,
        variableId: details.variableId,
        variableType: details.type,
        fallbackColor: details.fallbackColor,
        fallbackValue: details.fallbackValue,
        previewKind: previewKind,
        appliedAs: {},
        appliedTo: {}
      };
    }

    var aggregate = aggregates[aggregateKey];
    if (isFallbackVariableName(aggregate.variableName) && !isFallbackVariableName(details.name)) {
      aggregate.variableName = details.name;
    }
    if (!aggregate.variableId && details.variableId) aggregate.variableId = details.variableId;
    if ((!aggregate.fallbackColor) && details.fallbackColor) aggregate.fallbackColor = details.fallbackColor;
    if ((!aggregate.fallbackValue || aggregate.fallbackValue === '-') && details.fallbackValue && details.fallbackValue !== '-') {
      aggregate.fallbackValue = details.fallbackValue;
    }
    aggregate.appliedAs[appliedAs] = true;
    aggregate.appliedTo[appliedTo] = true;
  }

  async function readBinding(binding: any, prop: string, currentNode: any): Promise<void> {
    if (!binding) return;
    if (Array.isArray(binding)) {
      for (var i = 0; i < binding.length; i++) {
        var entry = binding[i];
        if (entry) await addUsage(entry.id || '', prop + '[' + i + ']', currentNode);
      }
      return;
    }
    if (binding) await addUsage(binding.id || '', prop, currentNode);
  }

  if (node) {
    var bound = node.boundVariables || {};
    for (var prop in bound) {
      if (!bound.hasOwnProperty(prop)) continue;
      await readBinding(bound[prop], prop, node);
    }
  }

  var aggregateKeys = Object.keys(aggregates);
  for (var a = 0; a < aggregateKeys.length; a++) {
    var aggregate = aggregates[aggregateKeys[a]];
    var appliedAsList = Object.keys(aggregate.appliedAs).sort();
    var appliedToList = Object.keys(aggregate.appliedTo).sort();
    rows.push({
      variableName: aggregate.variableName,
      variableId: aggregate.variableId,
      variableType: aggregate.variableType,
      fallbackColor: aggregate.fallbackColor,
      fallbackValue: aggregate.fallbackValue,
      previewKind: aggregate.previewKind,
      appliedAs: appliedAsList.join(', '),
      appliedTo: appliedToList.join(', ')
    });
  }

  rows.sort(function(a, b) {
    var byTypeRank = variableTypeRank(a.variableType) - variableTypeRank(b.variableType);
    if (byTypeRank !== 0) return byTypeRank;
    var byName = a.variableName.localeCompare(b.variableName);
    if (byName !== 0) return byName;
    var byApplied = a.appliedAs.localeCompare(b.appliedAs);
    if (byApplied !== 0) return byApplied;
    return a.appliedTo.localeCompare(b.appliedTo);
  });

  return rows;
}

async function collectNestedInstanceOverrideDocs(node: any): Promise<PropertyVariableRef[]> {
  var refs: PropertyVariableRef[] = [];

  async function walk(current: any): Promise<void> {
    if (!current) return;

    if (current.type === 'INSTANCE') {
      try {
        var diffItems = await analyzeComponentDiff(current as SceneNode);
        for (var i = 0; i < diffItems.length; i++) {
          var item = diffItems[i];
          refs.push({
            label: 'Nested ' + item.name,
            name: item.instanceValue,
            variableId: '',
            fallbackValue: item.defaultValue,
            fallbackColor: null,
            previewKind: item.type === 'INSTANCE_SWAP' ? 'token' : 'token'
          });
        }
      } catch (e) {}
    }

    if (!current.children || !Array.isArray(current.children)) return;
    for (var c = 0; c < current.children.length; c++) {
      await walk(current.children[c]);
    }
  }

  await walk(node);
  return refs;
}

async function collectVariableUsageRows(root: any, includeVariantSiblings?: boolean): Promise<VariableUsageRow[]> {
  // Rebuild cache fresh each run so newly-added library variables are picked up.
  VARIABLE_LOOKUP_CACHE = null;

  var rows: VariableUsageRow[] = [];
  var aggregates: { [key: string]: VariableUsageAggregate } = {};
  // Track which aggregates had their color set from the primary (root) walk.
  // Sibling-walk colors should never override a primary-walk color.
  var primaryColorSet: { [key: string]: boolean } = {};
  var inPrimaryWalk = true;

  async function addUsage(variableId: string, prop: string, node: any): Promise<void> {
    var binding = null;
    var baseProp = prop.replace(/\[\d+\]/g, '');
    try {
      var rawBinding = node && node.boundVariables ? node.boundVariables[baseProp] : null;
      if (Array.isArray(rawBinding)) {
        var match = prop.match(/\[(\d+)\]$/);
        var index = match ? parseInt(match[1], 10) : -1;
        if (index >= 0 && index < rawBinding.length) binding = rawBinding[index];
      } else {
        binding = rawBinding;
      }
    } catch (e) {}

    var details = await resolveVariableDetails(variableId, binding, node);
    // Always use the actual resolved paint color as the primary swatch source.
    // This works for library variables where valuesByMode is inaccessible, and
    // accurately reflects each variant's rendered color.
    var actualColor = inferColorFromUsage(node, prop);
    if (actualColor) details.fallbackColor = actualColor;
    var previewKind = getVariablePreviewKind(prop, details.type);
    var fallbackValue = formatFallbackValueFromUsage(node, prop, previewKind, details.fallbackColor);
    if (!details.fallbackValue || details.fallbackValue === '-') {
      details.fallbackValue = fallbackValue;
    }

    // Replace any raw VariableID string with something developer-useful.
    var nameIsRaw = isFallbackVariableName(details.name);
    if (nameIsRaw) {
      // For color tokens prefer binding metadata over generic labels.
      if (previewKind === 'color' && binding && typeof binding.name === 'string' && binding.name.length > 0) {
        details.name = binding.name;
      } else if (previewKind === 'color' && binding && typeof binding.key === 'string' && binding.key.length > 0) {
        details.name = binding.key;
      } else {
        details.name = 'Bound ' + formatVariableAppliedAs(prop);
      }
    }

    var appliedAs = formatVariableAppliedAs(prop, node);
    if (!shouldShowVariableUsageRow(appliedAs, previewKind)) return;
    var appliedTarget = resolveAppliedTargetNode(node);
    var appliedTo = getTypeIcon(appliedTarget.type || 'UNKNOWN') + ' ' + (appliedTarget.name || appliedTarget.type || 'Layer');
    var targetKey = appliedTarget && appliedTarget.id ? appliedTarget.id : appliedTo;
    var aggregateKey = getVariableDedupIdentity(variableId, binding, details);
    if (!aggregates[aggregateKey]) {
      aggregates[aggregateKey] = {
        variableName: details.name,
        variableId: details.variableId,
        variableType: details.type,
        fallbackColor: details.fallbackColor,
        fallbackValue: details.fallbackValue,
        previewKind: previewKind,
        appliedAs: {},
        appliedTo: {}
      };
    }

    var aggregate = aggregates[aggregateKey];
    if (isFallbackVariableName(aggregate.variableName) && !isFallbackVariableName(details.name)) {
      aggregate.variableName = details.name;
    }
    if (!aggregate.variableId && details.variableId) aggregate.variableId = details.variableId;
    // Only override fallbackColor from a sibling walk if the primary walk never set one
    if (details.fallbackColor) {
      if (inPrimaryWalk) {
        aggregate.fallbackColor = details.fallbackColor;
        primaryColorSet[aggregateKey] = true;
      } else if (!primaryColorSet[aggregateKey]) {
        aggregate.fallbackColor = details.fallbackColor;
      }
    }
    if ((!aggregate.fallbackValue || aggregate.fallbackValue === '-') && details.fallbackValue && details.fallbackValue !== '-') {
      aggregate.fallbackValue = details.fallbackValue;
    }
    aggregate.appliedAs[appliedAs] = true;
    aggregate.appliedTo[appliedTo] = true;
  }

  async function readBinding(binding: any, prop: string, node: any): Promise<void> {
    if (!binding) return;
    if (Array.isArray(binding)) {
      for (var i = 0; i < binding.length; i++) {
        var entry = binding[i];
        if (entry) await addUsage(entry.id || '', prop + '[' + i + ']', node);
      }
      return;
    }
    if (binding) await addUsage(binding.id || '', prop, node);
  }

  async function walk(node: any): Promise<void> {
    if (!node) return;
    var bound = node.boundVariables || {};
    for (var prop in bound) {
      if (!bound.hasOwnProperty(prop)) continue;
      await readBinding(bound[prop], prop, node);
    }
    if (!node.children || !Array.isArray(node.children)) return;
    for (var c = 0; c < node.children.length; c++) {
      await walk(node.children[c]);
    }
  }

  // Walk the selected node first — colors captured here are authoritative
  await walk(root);
  inPrimaryWalk = false;

  if (includeVariantSiblings !== false) {
    // Also walk all sibling variants from the parent component set so that
    // variables from other states (e.g. Status=Error, Status=Success …) are included.
    async function walkAllVariants(variantNodes: any[]): Promise<void> {
      for (var v = 0; v < variantNodes.length; v++) {
        await walk(variantNodes[v]);
      }
    }

    if (root.type === 'INSTANCE') {
      try {
        var mainComp: any = await root.getMainComponentAsync();
        if (mainComp) {
          var parentSet = mainComp.parent as any;
          if (parentSet && parentSet.type === 'COMPONENT_SET' && Array.isArray(parentSet.children)) {
            // Siblings are all children of the set that aren't the current main component
            var siblings = parentSet.children.filter(function(c: any) { return c && c.id !== mainComp.id; });
            await walkAllVariants(siblings);
          }
        }
      } catch (e) {}
    } else if (root.type === 'COMPONENT') {
      var componentParent = root.parent as any;
      if (componentParent && componentParent.type === 'COMPONENT_SET' && Array.isArray(componentParent.children)) {
        var componentSiblings = componentParent.children.filter(function(c: any) { return c && c.id !== root.id; });
        await walkAllVariants(componentSiblings);
      }
    } else if (root.type === 'COMPONENT_SET') {
      if (Array.isArray(root.children)) {
        await walkAllVariants(root.children);
      }
    }
  }

  var aggregateKeys = Object.keys(aggregates);
  for (var a = 0; a < aggregateKeys.length; a++) {
    var aggregate = aggregates[aggregateKeys[a]];
    var appliedAsList = Object.keys(aggregate.appliedAs).sort();
    var appliedToList = Object.keys(aggregate.appliedTo).sort();
    rows.push({
      variableName: aggregate.variableName,
      variableId: aggregate.variableId,
      variableType: aggregate.variableType,
      fallbackColor: aggregate.fallbackColor,
      fallbackValue: aggregate.fallbackValue,
      previewKind: aggregate.previewKind,
      appliedAs: appliedAsList.join(', '),
      appliedTo: appliedToList.join(', ')
    });
  }

  rows.sort(function(a, b) {
    var byTypeRank = variableTypeRank(a.variableType) - variableTypeRank(b.variableType);
    if (byTypeRank !== 0) return byTypeRank;
    var byName = a.variableName.localeCompare(b.variableName);
    if (byName !== 0) return byName;
    var byApplied = a.appliedAs.localeCompare(b.appliedAs);
    if (byApplied !== 0) return byApplied;
    return a.appliedTo.localeCompare(b.appliedTo);
  });

  return rows;
}

async function buildVariablesSheetSection(parent: FrameNode, node: SceneNode): Promise<void> {
  var section = makeSectionWrapper('Variables');
  section.name = SPEC_PREFIX + 'Variables';
  section.primaryAxisSizingMode = 'AUTO';
  section.counterAxisSizingMode = 'FIXED';
  (section as any).layoutSizingVertical = 'HUG';
  var rows = await collectVariableUsageRows(node as any);

  if (rows.length === 0) {
    var empty = makeText('No variable bindings detected on selected node.', 11, FONT_REGULAR, COLOR_MUTED);
    empty.name = SPEC_PREFIX + 'Variables Empty State';
    section.appendChild(empty);
    parent.appendChild(section);
    return;
  }

  var table = figma.createFrame();
  table.name = SPEC_PREFIX + 'Variables Table';
  table.layoutMode = 'VERTICAL';
  table.primaryAxisSizingMode = 'AUTO';
  table.counterAxisSizingMode = 'FIXED';
  table.resize(SHEET_INNER_WIDTH - 48, 10);
  table.itemSpacing = 8;
  table.fills = [];
  (table as any).layoutSizingVertical = 'HUG';
  // NOTE: table's FILL is set at the bottom of this function, after
  // section.appendChild(table) — layoutSizingHorizontal='FILL' throws on a
  // node that isn't yet inside an auto-layout parent, and the try/catch
  // pattern here swallows that throw silently (which is exactly how this
  // section previously ended up stuck at a fixed width).

  var header = figma.createFrame();
  header.name = SPEC_PREFIX + 'Variables Header';
  header.layoutMode = 'HORIZONTAL';
  header.primaryAxisSizingMode = 'FIXED';
  header.counterAxisSizingMode = 'AUTO';
  header.resize(SHEET_INNER_WIDTH - 48, 1);
  header.itemSpacing = 12;
  header.fills = [];
  (header as any).layoutSizingVertical = 'HUG';

  var hName = makeText('Name', 11, FONT_BOLD, COLOR_MUTED);
  hName.name = SPEC_PREFIX + 'Variables Header Name';
  hName.resize(320, hName.height);
  var hFallback = makeText('Fallback', 11, FONT_BOLD, COLOR_MUTED);
  hFallback.name = SPEC_PREFIX + 'Variables Header Fallback';
  hFallback.resize(120, hFallback.height);
  var hApplied = makeText('Applied as', 11, FONT_BOLD, COLOR_MUTED);
  hApplied.name = SPEC_PREFIX + 'Variables Header Applied As';
  hApplied.resize(150, hApplied.height);
  header.appendChild(hName);
  header.appendChild(hFallback);
  header.appendChild(hApplied);
  table.appendChild(header);
  try { (header as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  var divider = makeHorizontalDivider(SHEET_INNER_WIDTH - 48);
  divider.name = SPEC_PREFIX + 'Variables Divider';
  table.appendChild(divider);
  try { (divider as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}

  function makeVariablePreviewNode(row: VariableUsageRow, index: number): SceneNode {
    if (row.previewKind === 'color' && row.fallbackColor) {
      var swatch = figma.createRectangle();
      swatch.name = SPEC_PREFIX + 'Variables Swatch ' + index;
      swatch.resize(12, 12);
      var swatchPaint: Paint = solidPaint(row.fallbackColor as RGB)[0];
      if (row.variableId) {
        try {
          var colorVariable = resolveVariableFromBinding(row.variableId, null);
          if (colorVariable) {
            swatchPaint = figma.variables.setBoundVariableForPaint(swatchPaint as SolidPaint, 'color', colorVariable);
          }
        } catch (e) {}
      }
      swatch.fills = [swatchPaint];
      swatch.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
      swatch.strokeWeight = 1;
      return swatch;
    }

    var chip = figma.createFrame();
    chip.name = SPEC_PREFIX + 'Variables Icon ' + index;
    chip.layoutMode = 'HORIZONTAL';
    chip.primaryAxisSizingMode = 'FIXED';
    chip.counterAxisSizingMode = 'FIXED';
    chip.resize(14, 14);
    chip.cornerRadius = 3;
    chip.primaryAxisAlignItems = 'CENTER';
    chip.counterAxisAlignItems = 'CENTER';
    chip.fills = solidPaint({ r: 0.96, g: 0.96, b: 0.97 });
    chip.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
    chip.strokeWeight = 1;
    chip.paddingLeft = 0;
    chip.paddingRight = 0;
    chip.paddingTop = 0;
    chip.paddingBottom = 0;

    var glyph = '#';
    var font = FONT_BOLD;
    var size = 8;
    if (row.previewKind === 'text') glyph = 'T';
    else if (row.previewKind === 'radius') glyph = '◜';
    else if (row.previewKind === 'width') glyph = 'W';
    else if (row.previewKind === 'height') glyph = 'H';
    else if (row.previewKind === 'spacing') glyph = '↔';
    else if (row.previewKind === 'opacity') glyph = '%';
    else if (row.previewKind === 'token') glyph = '•';

    var iconText = makeText(glyph, size, font, COLOR_LABEL);
    iconText.name = SPEC_PREFIX + 'Variables Icon Label ' + index;
    iconText.textAlignHorizontal = 'CENTER';
    iconText.textAutoResize = 'WIDTH_AND_HEIGHT';
    chip.appendChild(iconText);
    return chip;
  }

  function makeVariableNameBadge(row: VariableUsageRow, index: number): FrameNode {
    var badge = figma.createFrame();
    badge.name = SPEC_PREFIX + 'Variables Name Badge ' + index;
    badge.layoutMode = 'HORIZONTAL';
    badge.primaryAxisSizingMode = 'AUTO';
    badge.counterAxisSizingMode = 'AUTO';
    badge.primaryAxisAlignItems = 'CENTER';
    badge.counterAxisAlignItems = 'CENTER';
    badge.itemSpacing = 6;
    badge.paddingLeft = 8;
    badge.paddingRight = 8;
    badge.paddingTop = 4;
    badge.paddingBottom = 4;
    badge.cornerRadius = 4;
    badge.fills = solidPaint(WHITE);
    badge.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
    badge.strokeWeight = 1;
    (badge as any).layoutSizingHorizontal = 'HUG';
    (badge as any).layoutSizingVertical = 'HUG';

    var nameCell = makeText(row.variableName, 11, FONT_REGULAR, COLOR_VALUE);
    nameCell.name = SPEC_PREFIX + 'Variables Name ' + index;

    badge.appendChild(makeVariablePreviewNode(row, index));
    badge.appendChild(nameCell);
    return badge;
  }

  for (var i = 0; i < rows.length; i++) {
    var row = figma.createFrame();
    row.name = SPEC_PREFIX + 'Variables Row ' + (i + 1);
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.resize(SHEET_INNER_WIDTH - 48, 1);
    row.itemSpacing = 12;
    row.fills = [];
    (row as any).layoutSizingVertical = 'HUG';

    var nameCellWrap = figma.createFrame();
    nameCellWrap.name = SPEC_PREFIX + 'Variables Name Cell ' + (i + 1);
    nameCellWrap.layoutMode = 'HORIZONTAL';
    nameCellWrap.primaryAxisSizingMode = 'FIXED';
    nameCellWrap.counterAxisSizingMode = 'AUTO';
    nameCellWrap.resize(320, 1);
    nameCellWrap.itemSpacing = 8;
    nameCellWrap.fills = [];
    (nameCellWrap as any).layoutSizingVertical = 'HUG';
    nameCellWrap.appendChild(makeVariableNameBadge(rows[i], i + 1));

    var fallbackCell = makeText(rows[i].fallbackValue || '-', 11, FONT_REGULAR, COLOR_MUTED);
    fallbackCell.name = SPEC_PREFIX + 'Variables Fallback ' + (i + 1);
    fallbackCell.resize(120, fallbackCell.height);

    var appliedCell = makeText(rows[i].appliedAs, 11, FONT_REGULAR, COLOR_VALUE);
    appliedCell.name = SPEC_PREFIX + 'Variables Applied As ' + (i + 1);
    appliedCell.resize(150, appliedCell.height);
    row.appendChild(nameCellWrap);
    row.appendChild(fallbackCell);
    row.appendChild(appliedCell);
    table.appendChild(row);
    try { (row as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }

  section.appendChild(table);
  try { (table as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  parent.appendChild(section);
}

// ═══════════════════════════════════════════════════════════════════
// ACCESSIBILITY + HANDOFF READINESS
// ═══════════════════════════════════════════════════════════════════

var COLOR_PASS: RGB = { r: 0.09, g: 0.58, b: 0.32 };
var COLOR_WARN: RGB = { r: 0.85, g: 0.56, b: 0.05 };
var COLOR_FAIL: RGB = { r: 0.82, g: 0.16, b: 0.16 };
var COLOR_NA: RGB   = { r: 0.6, g: 0.6, b: 0.6 };

var A11Y_INTERACTIVE_NAME = /(button|btn|link|input|check|radio|switch|toggle|chip|tab|icon|close|action|control)/i;
var DEFAULT_LAYER_NAME = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Text|Component|Instance) \d+$/;

function walkVisibleNodes(root: any, cb: (n: any) => void): void {
  function rec(n: any): void {
    if (!n || n.visible === false) return;
    cb(n);
    var kids = n.children || [];
    for (var i = 0; i < kids.length; i++) rec(kids[i]);
  }
  rec(root);
}

function relativeLuminance(c: RGB): number {
  function chan(v: number): number {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

function contrastRatio(a: RGB, b: RGB): number {
  var la = relativeLuminance(a);
  var lb = relativeLuminance(b);
  var hi = Math.max(la, lb);
  var lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function getFirstSolidFill(n: any): RGB | null {
  try {
    var fills = n.fills;
    if (!Array.isArray(fills)) return null;
    for (var i = 0; i < fills.length; i++) {
      var f = fills[i];
      if (f && f.visible !== false && f.type === 'SOLID') return f.color as RGB;
    }
  } catch (e) {}
  return null;
}

// Nearest ancestor with a visible, mostly-opaque solid fill — a practical
// approximation of "the background this text renders on". Defaults to
// white when nothing opaque is found before the page.
function getEffectiveBackgroundColor(n: any): RGB {
  var p = n.parent;
  while (p && p.type !== 'PAGE') {
    try {
      var fills = p.fills;
      if (Array.isArray(fills)) {
        for (var i = fills.length - 1; i >= 0; i--) {
          var f = fills[i];
          if (f && f.visible !== false && f.type === 'SOLID' && (f.opacity === undefined || f.opacity > 0.5)) {
            return f.color as RGB;
          }
        }
      }
    } catch (e) {}
    p = p.parent;
  }
  return { r: 1, g: 1, b: 1 };
}

function rgbToHexLabel(c: RGB): string {
  function h(v: number): string {
    var s = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).toUpperCase();
    return s.length === 1 ? '0' + s : s;
  }
  return '#' + h(c.r) + h(c.g) + h(c.b);
}

interface A11yContrastRow { label: string; fg: RGB; bg: RGB; ratio: number; required: number; pass: boolean; }
interface A11yTypeRow { label: string; detail: string; tooSmall: boolean; styled: boolean; }
interface A11yTouchRow { label: string; w: number; h: number; status: 'pass' | 'warn' | 'fail'; }
interface A11yAnalysis {
  contrast: A11yContrastRow[];
  typography: A11yTypeRow[];
  touch: A11yTouchRow[];
  hasText: boolean;
  hasInteractive: boolean;
  contrastAllPass: boolean;
  typographyAllOk: boolean;
  touchAllOk: boolean;
  touchAnyFail: boolean;
}

function isBoldFontStyle(styleName: string): boolean {
  return /bold|black|heavy|extrabold|semibold/i.test(styleName || '');
}

function analyzeAccessibility(node: SceneNode): A11yAnalysis {
  var contrast: A11yContrastRow[] = [];
  var typography: A11yTypeRow[] = [];
  var touch: A11yTouchRow[] = [];
  var seenContrast: { [k: string]: boolean } = {};
  var seenType: { [k: string]: boolean } = {};
  var hasInteractive = false;
  var hasText = false;

  walkVisibleNodes(node, function(n) {
    if (n.type === 'TEXT') {
      hasText = true;
      var fg = getFirstSolidFill(n);
      if (fg) {
        var bg = getEffectiveBackgroundColor(n);
        var size = typeof n.fontSize === 'number' ? n.fontSize : 0;
        var styleName = (n.fontName && typeof n.fontName === 'object') ? n.fontName.style || '' : '';
        var isLarge = size >= 24 || (size >= 18.66 && isBoldFontStyle(styleName));
        var required = isLarge ? 3 : 4.5;
        var ratio = contrastRatio(fg, bg);
        var cKey = rgbToHexLabel(fg) + '/' + rgbToHexLabel(bg) + '/' + required;
        if (!seenContrast[cKey] && contrast.length < 8) {
          seenContrast[cKey] = true;
          contrast.push({
            label: (n.name || 'Text') + ' — ' + rgbToHexLabel(fg) + ' on ' + rgbToHexLabel(bg),
            fg: fg, bg: bg, ratio: ratio, required: required, pass: ratio >= required
          });
        }

        var family = (n.fontName && typeof n.fontName === 'object') ? n.fontName.family || '' : 'Mixed';
        var lh = '';
        try {
          var lhv = n.lineHeight;
          if (lhv && typeof lhv === 'object' && typeof lhv.value === 'number') {
            lh = lhv.unit === 'PERCENT' ? '/' + Math.round(lhv.value) + '%' : '/' + Math.round(lhv.value);
          } else {
            lh = '/auto';
          }
        } catch (e) {}
        var styled = (typeof n.textStyleId === 'string' && n.textStyleId !== '') ||
          !!(n.boundVariables && (n.boundVariables.fontSize || n.boundVariables.fontFamily || n.boundVariables.fontStyle || n.boundVariables.fontWeight));
        var tKey = family + '|' + styleName + '|' + size;
        if (!seenType[tKey] && typography.length < 8) {
          seenType[tKey] = true;
          typography.push({
            label: family + ' ' + styleName,
            detail: (size ? Math.round(size) : '?') + lh + (styled ? '' : ' — no text style/token'),
            tooSmall: size > 0 && size < 12,
            styled: styled
          });
        }
      }
    }

    var interactiveByName = A11Y_INTERACTIVE_NAME.test(n.name || '');
    var interactiveByReaction = false;
    try { interactiveByReaction = Array.isArray(n.reactions) && n.reactions.length > 0; } catch (e) {}
    var isCandidate = (n === node) || ((n.type === 'INSTANCE' || n.type === 'FRAME') && (interactiveByName || interactiveByReaction));
    if (isCandidate && (interactiveByName || interactiveByReaction || n === node)) {
      if (n !== node && (interactiveByName || interactiveByReaction)) hasInteractive = true;
      var w = Math.round(n.width || 0);
      var h = Math.round(n.height || 0);
      if (touch.length < 6 && (n !== node || interactiveByName || interactiveByReaction)) {
        var minSide = Math.min(w, h);
        touch.push({
          label: n.name || n.type,
          w: w, h: h,
          // 44 = Apple HIG / WCAG AAA recommendation; 24 = WCAG 2.2 AA hard minimum.
          status: minSide >= 44 ? 'pass' : (minSide >= 24 ? 'warn' : 'fail')
        });
      }
    }
  });

  var contrastAllPass = true;
  for (var c = 0; c < contrast.length; c++) if (!contrast[c].pass) contrastAllPass = false;
  var typographyAllOk = true;
  for (var t = 0; t < typography.length; t++) if (typography[t].tooSmall) typographyAllOk = false;
  var touchAllOk = true;
  var touchAnyFail = false;
  for (var to = 0; to < touch.length; to++) {
    if (touch[to].status !== 'pass') touchAllOk = false;
    if (touch[to].status === 'fail') touchAnyFail = true;
  }

  return {
    contrast: contrast, typography: typography, touch: touch,
    hasText: hasText, hasInteractive: hasInteractive,
    contrastAllPass: contrastAllPass, typographyAllOk: typographyAllOk,
    touchAllOk: touchAllOk, touchAnyFail: touchAnyFail
  };
}

function makeStatusChip(text: string, color: RGB): FrameNode {
  var chip = figma.createFrame();
  chip.name = SPEC_PREFIX + 'Status ' + text;
  chip.layoutMode = 'HORIZONTAL';
  chip.primaryAxisSizingMode = 'AUTO';
  chip.counterAxisSizingMode = 'AUTO';
  chip.paddingLeft = 8;
  chip.paddingRight = 8;
  chip.paddingTop = 3;
  chip.paddingBottom = 3;
  chip.cornerRadius = 999;
  chip.fills = solidPaint(color, 0.12);
  chip.appendChild(makeText(text, 10, FONT_BOLD, color));
  return chip;
}

function makeA11yRow(leading: SceneNode | null, label: string, detail: string, chip: FrameNode | null): FrameNode {
  var row = figma.createFrame();
  row.name = SPEC_PREFIX + 'A11y Row [' + label + ']';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.resize(SHEET_INNER_WIDTH - 48, 1);
  row.itemSpacing = 12;
  row.counterAxisAlignItems = 'CENTER';
  row.fills = [];
  (row as any).layoutSizingVertical = 'HUG';

  if (leading) row.appendChild(leading);
  row.appendChild(makeText(label, 11, FONT_MEDIUM, COLOR_VALUE));
  var det = makeText(detail, 11, FONT_REGULAR, COLOR_MUTED);
  row.appendChild(det);
  try { (det as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  if (chip) row.appendChild(chip);
  return row;
}

// Shows the actual pairing — "Aa" set in the foreground color on a swatch
// of the background color — instead of an abstract swatch+dot, matching
// how contrast-checker tools typically present a live sample.
function makeContrastSwatch(fg: RGB, bg: RGB): FrameNode {
  var sw = figma.createFrame();
  sw.name = SPEC_PREFIX + 'Contrast Swatch';
  sw.layoutMode = 'HORIZONTAL';
  sw.primaryAxisAlignItems = 'CENTER';
  sw.counterAxisAlignItems = 'CENTER';
  sw.primaryAxisSizingMode = 'FIXED';
  sw.counterAxisSizingMode = 'FIXED';
  sw.resize(40, 28);
  sw.cornerRadius = 4;
  sw.fills = solidPaint(bg);
  sw.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
  sw.strokeWeight = 1;
  var sample = makeText('Aa', 15, FONT_BOLD, fg);
  sw.appendChild(sample);
  return sw;
}

async function buildAccessibilitySheetSection(parent: FrameNode, node: SceneNode): Promise<void> {
  var a = analyzeAccessibility(node);
  var section = makeSectionWrapper('Accessibility');
  var rows: FrameNode[] = [];

  section.appendChild(makeText('Color contrast', 36, FONT_BOLD, COLOR_HEADER));
  if (a.contrast.length === 0) {
    section.appendChild(makeText('No solid text fills detected to evaluate.', 11, FONT_REGULAR, COLOR_MUTED));
  }
  for (var c = 0; c < a.contrast.length; c++) {
    var cr = a.contrast[c];
    var chip = cr.pass
      ? makeStatusChip('AA PASS', COLOR_PASS)
      : makeStatusChip('FAIL', COLOR_FAIL);
    var row = makeA11yRow(
      makeContrastSwatch(cr.fg, cr.bg),
      cr.label,
      (Math.round(cr.ratio * 100) / 100) + ':1 (needs ' + cr.required + ':1)',
      chip
    );
    section.appendChild(row);
    rows.push(row);
  }

  section.appendChild(makeText('Typography', 36, FONT_BOLD, COLOR_HEADER));
  if (a.typography.length === 0) {
    section.appendChild(makeText('No text layers in this component.', 11, FONT_REGULAR, COLOR_MUTED));
  }
  for (var t = 0; t < a.typography.length; t++) {
    var ty = a.typography[t];
    var tChip = ty.tooSmall
      ? makeStatusChip('BELOW 12', COLOR_FAIL)
      : (ty.styled ? makeStatusChip('OK', COLOR_PASS) : makeStatusChip('NO TOKEN', COLOR_WARN));
    var tRow = makeA11yRow(null, ty.label, ty.detail, tChip);
    section.appendChild(tRow);
    rows.push(tRow);
  }

  section.appendChild(makeText('Touch targets', 36, FONT_BOLD, COLOR_HEADER));
  if (a.touch.length === 0) {
    section.appendChild(makeText('No interactive elements detected.', 11, FONT_REGULAR, COLOR_MUTED));
  }
  for (var to = 0; to < a.touch.length; to++) {
    var tt = a.touch[to];
    var ttChip = tt.status === 'pass'
      ? makeStatusChip('44+ PASS', COLOR_PASS)
      : (tt.status === 'warn' ? makeStatusChip('24–43', COLOR_WARN) : makeStatusChip('BELOW 24', COLOR_FAIL));
    var ttRow = makeA11yRow(null, tt.label, tt.w + ' × ' + tt.h + ' px (44 recommended, 24 minimum)', ttChip);
    section.appendChild(ttRow);
    rows.push(ttRow);
  }

  parent.appendChild(section);
  for (var r = 0; r < rows.length; r++) {
    try { (rows[r] as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }
}

// ─── Handoff readiness ─────────────────────────────────────────────

interface ReadinessCheck { label: string; status: 'pass' | 'warn' | 'fail' | 'na'; detail: string; weight: number; }

function collectReadinessStats(root: any): {
  boundFills: number; totalFills: number;
  boundSpacing: number; totalSpacing: number;
  styledText: number; totalText: number;
  defaultNames: number; totalNodes: number;
} {
  var s = { boundFills: 0, totalFills: 0, boundSpacing: 0, totalSpacing: 0, styledText: 0, totalText: 0, defaultNames: 0, totalNodes: 0 };
  walkVisibleNodes(root, function(n) {
    s.totalNodes++;
    if (DEFAULT_LAYER_NAME.test(n.name || '')) s.defaultNames++;

    function countPaints(paints: any, styleId: any, kind: 'fills' | 'strokes'): void {
      if (!Array.isArray(paints)) return;
      var hasStyle = typeof styleId === 'string' && styleId !== '';
      for (var i = 0; i < paints.length; i++) {
        var p = paints[i];
        if (!p || p.visible === false || p.type !== 'SOLID') continue;
        s.totalFills++;
        if (hasStyle || (p.boundVariables && p.boundVariables.color)) s.boundFills++;
      }
    }
    try { countPaints(n.fills, n.fillStyleId, 'fills'); } catch (e) {}
    try { countPaints(n.strokes, n.strokeStyleId, 'strokes'); } catch (e) {}

    var bv = n.boundVariables || {};
    if (n.layoutMode && n.layoutMode !== 'NONE') {
      var spacingProps = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'];
      for (var sp = 0; sp < spacingProps.length; sp++) {
        var v = n[spacingProps[sp]];
        if (typeof v === 'number' && v > 0) {
          s.totalSpacing++;
          if (bv[spacingProps[sp]]) s.boundSpacing++;
        }
      }
    }
    var radiusProps = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
    for (var rp = 0; rp < radiusProps.length; rp++) {
      var rv = n[radiusProps[rp]];
      if (typeof rv === 'number' && rv > 0) {
        s.totalSpacing++;
        if (bv[radiusProps[rp]]) s.boundSpacing++;
      }
    }

    if (n.type === 'TEXT') {
      s.totalText++;
      var styled = (typeof n.textStyleId === 'string' && n.textStyleId !== '') ||
        !!(bv.fontSize || bv.fontFamily || bv.fontStyle || bv.fontWeight);
      if (styled) s.styledText++;
    }
  });
  return s;
}

function ratioStatus(bound: number, total: number, passAt: number, warnAt: number): 'pass' | 'warn' | 'fail' | 'na' {
  if (total === 0) return 'na';
  var r = bound / total;
  if (r >= passAt) return 'pass';
  if (r >= warnAt) return 'warn';
  return 'fail';
}

async function buildReadinessSheetSection(parent: FrameNode, node: SceneNode, stateTarget: StateTargetInfo | null): Promise<void> {
  var stats = collectReadinessStats(node);
  var a11y = analyzeAccessibility(node);
  var checks: ReadinessCheck[] = [];

  // 1. Color tokens
  checks.push({
    label: 'Color tokens',
    status: ratioStatus(stats.boundFills, stats.totalFills, 0.9, 0.5),
    detail: stats.totalFills === 0 ? 'No solid fills/strokes' : stats.boundFills + '/' + stats.totalFills + ' fills & strokes bound to variables or styles',
    weight: 20
  });

  // 2. Spacing & radius tokens
  checks.push({
    label: 'Spacing & radius tokens',
    status: ratioStatus(stats.boundSpacing, stats.totalSpacing, 0.9, 0.5),
    detail: stats.totalSpacing === 0 ? 'No non-zero padding, gaps, or radii' : stats.boundSpacing + '/' + stats.totalSpacing + ' padding/gap/radius values bound to variables',
    weight: 15
  });

  // 3. Typography tokens
  checks.push({
    label: 'Typography tokens',
    status: ratioStatus(stats.styledText, stats.totalText, 0.99, 0.5),
    detail: stats.totalText === 0 ? 'No text layers' : stats.styledText + '/' + stats.totalText + ' text layers using a text style or typography variable',
    weight: 10
  });

  // 4. Interactive states
  var stateCount = stateTarget && stateTarget.states ? stateTarget.states.length : 0;
  var looksInteractive = a11y.hasInteractive || A11Y_INTERACTIVE_NAME.test(node.name || '');
  var stateStatus: 'pass' | 'warn' | 'fail' | 'na';
  var stateDetail: string;
  if (stateCount >= 3) {
    stateStatus = 'pass';
    stateDetail = stateCount + ' states defined (' + stateTarget!.states.join(', ') + ')';
  } else if (stateCount === 2) {
    stateStatus = 'warn';
    stateDetail = 'Only 2 states — consider hover, focus, and disabled';
  } else if (looksInteractive) {
    stateStatus = 'fail';
    stateDetail = 'Interactive component with no state variants';
  } else {
    stateStatus = 'na';
    stateDetail = 'Not an interactive component';
  }
  checks.push({ label: 'Interactive states', status: stateStatus, detail: stateDetail, weight: 15 });

  // 5. Auto layout
  var rootLayout = (node as any).layoutMode && (node as any).layoutMode !== 'NONE';
  checks.push({
    label: 'Auto layout',
    status: rootLayout ? 'pass' : 'fail',
    detail: rootLayout ? 'Root uses auto layout — resizes predictably' : 'Root is not auto layout — resizing behavior is undefined',
    weight: 10
  });

  // 6. Structure & naming
  var propData = await getPropertyDefinitionsForNodeAsync(node as any);
  var propCount = propData && propData.defs ? Object.keys(propData.defs).length : 0;
  var nameRatio = stats.totalNodes === 0 ? 0 : stats.defaultNames / stats.totalNodes;
  var structStatus: 'pass' | 'warn' | 'fail' =
    (propCount > 0 && nameRatio < 0.1) ? 'pass' : ((propCount > 0 || nameRatio < 0.3) ? 'warn' : 'fail');
  checks.push({
    label: 'Structure & naming',
    status: structStatus,
    detail: propCount + ' propert' + (propCount === 1 ? 'y' : 'ies') + ' defined, ' + stats.defaultNames + ' default-named layer(s)',
    weight: 10
  });

  // 7. Accessibility
  var a11yStatus: 'pass' | 'warn' | 'fail' | 'na';
  if (!a11y.hasText && a11y.touch.length === 0) {
    a11yStatus = 'na';
  } else if (!a11y.contrastAllPass || a11y.touchAnyFail || !a11y.typographyAllOk) {
    a11yStatus = 'fail';
  } else if (!a11y.touchAllOk) {
    a11yStatus = 'warn';
  } else {
    a11yStatus = 'pass';
  }
  checks.push({
    label: 'Accessibility',
    status: a11yStatus,
    detail: a11yStatus === 'na' ? 'Nothing to evaluate' : 'Contrast ' + (a11y.contrastAllPass ? 'passing' : 'failing') + ', touch targets ' + (a11y.touchAllOk ? 'passing' : (a11y.touchAnyFail ? 'failing' : 'borderline')),
    weight: 20
  });

  // Weighted score over applicable criteria only.
  var earned = 0;
  var possible = 0;
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].status === 'na') continue;
    possible += checks[i].weight;
    if (checks[i].status === 'pass') earned += checks[i].weight;
    else if (checks[i].status === 'warn') earned += checks[i].weight * 0.5;
  }
  var score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  var verdict: string;
  var verdictColor: RGB;
  if (score >= 90) { verdict = 'Ready for handoff'; verdictColor = COLOR_PASS; }
  else if (score >= 75) { verdict = 'Nearly ready — minor gaps'; verdictColor = COLOR_WARN; }
  else if (score >= 50) { verdict = 'Needs attention before handoff'; verdictColor = COLOR_WARN; }
  else { verdict = 'Not ready for handoff'; verdictColor = COLOR_FAIL; }

  var section = makeSectionWrapper('Handoff readiness');
  section.appendChild(makeText(score + ' / 100', 44, FONT_BOLD, verdictColor));
  section.appendChild(makeText(verdict, 14, FONT_MEDIUM, verdictColor));
  section.appendChild(makeText('Weighted across tokens, states, layout, structure, and accessibility. N/A criteria are excluded from the denominator.', 10, FONT_REGULAR, COLOR_MUTED));

  var divider = makeHorizontalDivider(SHEET_INNER_WIDTH - 48);
  section.appendChild(divider);
  try { (divider as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}

  var rows: FrameNode[] = [];
  for (var k = 0; k < checks.length; k++) {
    var ck = checks[k];
    var chipColor = ck.status === 'pass' ? COLOR_PASS : (ck.status === 'warn' ? COLOR_WARN : (ck.status === 'fail' ? COLOR_FAIL : COLOR_NA));
    var chipText = ck.status === 'pass' ? 'PASS' : (ck.status === 'warn' ? 'REVIEW' : (ck.status === 'fail' ? 'FAIL' : 'N/A'));
    var row = makeA11yRow(null, ck.label + ' (' + ck.weight + ')', ck.detail, makeStatusChip(chipText, chipColor));
    section.appendChild(row);
    rows.push(row);
  }

  parent.appendChild(section);
  for (var r = 0; r < rows.length; r++) {
    try { (rows[r] as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }
}

async function buildLayoutSheetSection(parent: FrameNode, node: SceneNode): Promise<void> {
  var f = node as any;

  // Pre-fetch main component async once so sync helpers can read its boundVariables safely
  var mainComp: any = null;
  try {
    if (typeof f.getMainComponentAsync === 'function') {
      mainComp = await f.getMainComponentAsync();
    }
  } catch (e) {}

  var section = makeSectionWrapper('Layout and spacing');

  var row = figma.createFrame();
  row.name = SPEC_PREFIX + 'Layout Content [Two-Column]';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 20;
  row.fills = [];

  // Derive column width from SHEET_INNER_WIDTH — the same "one true width"
  // Anatomy/Variables/Properties all build against — instead of an
  // independent hardcoded number. Panels can still grow past this if a
  // component's actual unscaled content needs more room (allowScale=false
  // below), so this is a baseline, not a hard cap.
  var columnWidth = Math.floor((SHEET_INNER_WIDTH - 48 - 20) / 2);

  var left = figma.createFrame();
  left.name = SPEC_PREFIX + 'Layout Column [' + node.name + ']';
  left.layoutMode = 'VERTICAL';
  left.resize(columnWidth, 10);
  left.primaryAxisSizingMode = 'AUTO';
  left.counterAxisSizingMode = 'FIXED';
  left.itemSpacing = 10;
  left.clipsContent = false;
  left.fills = [];
  var leftPreview = makeLightPreviewPanel(columnWidth, 240);
  leftPreview.name = SPEC_PREFIX + 'Preview Panel [' + node.name + ']';
  leftPreview.appendChild(makeAlignmentGrid(f, getLayoutDirectionLabel(f) === 'Horizontal' ? 'HORIZONTAL' : 'VERTICAL'));
  var leftClone = cloneNodeCentered(node, leftPreview, columnWidth, 240, false) as any;
  // Push clone below the alignment grid (grid bottom = 24+32=56, +16px gap = 72)
  var GRID_CLEAR = 72;
  if ((leftClone.y || 0) < GRID_CLEAR) leftClone.y = GRID_CLEAR;
  drawAutoLayoutGuides(leftClone, leftPreview, f, 0, 0, 0, mainComp);

  // Adjust panel height: component top + height + 60px bottom breathing room.
  // Width uses whatever the panel already grew to above (allowScale=false
  // in centerNodeInPanel widens it when the real component doesn't fit
  // columnWidth) — resizing back down to columnWidth here would silently
  // undo that growth and crop the content clipping is about to re-enable.
  var leftH = leftClone.height || 0;
  var leftY = leftClone.y || 0;
  var requiredLeftHeight = Math.max(240, leftY + leftH + 60);
  var leftGrew = (leftPreview.width || columnWidth) > columnWidth + 0.5;
  leftPreview.resize(Math.max(columnWidth, leftPreview.width || columnWidth), requiredLeftHeight);
  // left has counterAxisSizingMode='FIXED', so it won't auto-hug a wider
  // child — without this it'd stay at columnWidth while leftPreview sits
  // wider inside it (clipsContent=false means it wouldn't be clipped, but
  // finalizeSheetWidth reads left/row/section .width, not leftPreview's,
  // so the sheet still wouldn't grow to actually fit it).
  if (leftGrew) {
    try { left.resizeWithoutConstraints(leftPreview.width, left.height || 1); } catch (e) {}
  }

  left.appendChild(leftPreview);
  var leftLabel = makeNodeLabel(node.name, node.type, 12, true);
  leftLabel.name = SPEC_PREFIX + 'Node Label [' + node.name + ']';
  left.appendChild(leftLabel);
  
  var leftDirection = makeRow('Direction', getLayoutDirectionLabel(f));
  leftDirection.name = SPEC_PREFIX + 'Direction [' + getLayoutDirectionLabel(f) + ']';
  left.appendChild(leftDirection);

  var leftAlignment = makeRow('Alignment', getAlignmentLabel(f));
  leftAlignment.name = SPEC_PREFIX + 'Alignment [' + getAlignmentLabel(f) + ']';
  left.appendChild(leftAlignment);

  var leftVResize = makeRow('Vertical resizing', getSizingModeLabel(f.layoutSizingVertical));
  leftVResize.name = SPEC_PREFIX + 'Vertical Resizing [' + getSizingModeLabel(f.layoutSizingVertical) + ']';
  left.appendChild(leftVResize);

  var leftHResize = makeRow('Horizontal resizing', getSizingModeLabel(f.layoutSizingHorizontal));
  leftHResize.name = SPEC_PREFIX + 'Horizontal Resizing [' + getSizingModeLabel(f.layoutSizingHorizontal) + ']';
  left.appendChild(leftHResize);
  
  var leftGapAlias = await resolveVarAliasAsync(f, 'itemSpacing', mainComp);
  var leftGapPx = getItemSpacingValue(f) + 'px';
  left.appendChild(makeLayoutMetricRow('Gap', leftGapAlias, leftGapPx, SPEC_PREFIX + 'Item Spacing [' + getItemSpacingValue(f) + 'px]'));

  var leftPadRows = await paddingRows(f, mainComp);
  for (var lpi = 0; lpi < leftPadRows.length; lpi++) {
    left.appendChild(makeLayoutMetricRow(leftPadRows[lpi].label, leftPadRows[lpi].token, leftPadRows[lpi].px, SPEC_PREFIX + 'Padding Row [' + leftPadRows[lpi].label + ']'));
  }

  var right = figma.createFrame();
  var nestedTarget = findPrimaryAutoLayoutTarget(node);
  var nestedInfo = nestedTarget as any;
  right.name = SPEC_PREFIX + 'Layout Column [' + node.name + ']';
  right.layoutMode = 'VERTICAL';
  right.resize(columnWidth, 10);
  right.primaryAxisSizingMode = 'AUTO';
  right.counterAxisSizingMode = 'FIXED';
  right.itemSpacing = 10;
  right.clipsContent = false;
  right.fills = [];
  var rightPreview = makeLightPreviewPanel(columnWidth, 240);
  rightPreview.name = SPEC_PREFIX + 'Preview Panel [' + node.name + ']';
  rightPreview.appendChild(makeAlignmentGrid(nestedInfo, getLayoutDirectionLabel(nestedInfo) === 'Horizontal' ? 'HORIZONTAL' : 'VERTICAL'));
  var rightClone = cloneNodeCentered(node, rightPreview, columnWidth, 240, false) as any;
  if ((rightClone.y || 0) < GRID_CLEAR) rightClone.y = GRID_CLEAR;
  drawAutoLayoutGuides(rightClone, rightPreview, nestedInfo, 0, 0, 0, mainComp);

  var rightH = rightClone.height || 0;
  var rightY = rightClone.y || 0;
  var requiredRightHeight = Math.max(240, rightY + rightH + 60);
  var rightGrew = (rightPreview.width || columnWidth) > columnWidth + 0.5;
  rightPreview.resize(Math.max(columnWidth, rightPreview.width || columnWidth), requiredRightHeight);
  if (rightGrew) {
    try { right.resizeWithoutConstraints(rightPreview.width, right.height || 1); } catch (e) {}
  }

  right.appendChild(rightPreview);
  var rightLabel = makeNodeLabel(node.name, node.type, 12, true);
  rightLabel.name = SPEC_PREFIX + 'Node Label [' + node.name + ']';
  right.appendChild(rightLabel);
  
  var rightDirection = makeRow('Direction', getLayoutDirectionLabel(nestedInfo));
  rightDirection.name = SPEC_PREFIX + 'Direction [' + getLayoutDirectionLabel(nestedInfo) + ']';
  right.appendChild(rightDirection);

  var rightAlignment = makeRow('Alignment', getAlignmentLabel(nestedInfo));
  rightAlignment.name = SPEC_PREFIX + 'Alignment [' + getAlignmentLabel(nestedInfo) + ']';
  right.appendChild(rightAlignment);

  var rightVResize = makeRow('Vertical resizing', getSizingModeLabel(nestedInfo.layoutSizingVertical));
  rightVResize.name = SPEC_PREFIX + 'Vertical Resizing [' + getSizingModeLabel(nestedInfo.layoutSizingVertical) + ']';
  right.appendChild(rightVResize);

  var rightHResize = makeRow('Horizontal resizing', getSizingModeLabel(nestedInfo.layoutSizingHorizontal));
  rightHResize.name = SPEC_PREFIX + 'Horizontal Resizing [' + getSizingModeLabel(nestedInfo.layoutSizingHorizontal) + ']';
  right.appendChild(rightHResize);
  
  var rightGapAlias = await resolveVarAliasAsync(nestedInfo, 'itemSpacing', mainComp);
  var rightGapPx = getItemSpacingValue(nestedInfo) + 'px';
  right.appendChild(makeLayoutMetricRow('Gap', rightGapAlias, rightGapPx, SPEC_PREFIX + 'Item Spacing [' + getItemSpacingValue(nestedInfo) + 'px]'));

  var rightPadRows = await paddingRows(nestedInfo, mainComp);
  for (var rpi = 0; rpi < rightPadRows.length; rpi++) {
    right.appendChild(makeLayoutMetricRow(rightPadRows[rpi].label, rightPadRows[rpi].token, rightPadRows[rpi].px, SPEC_PREFIX + 'Padding Row [' + rightPadRows[rpi].label + ']'));
  }

  // Returns one row per logical padding group with descriptive labels:
  // all-same → [{label:'Padding', ...}]
  // symmetric → [{label:'Vertical padding', ...}, {label:'Horizontal padding', ...}]
  // all unique → [{label:'Top padding', ...}, {label:'Right padding', ...}, ...]
  async function paddingRows(node: any, mc?: any): Promise<Array<{ label: string; token: string; px: string }>> {
    var tV = getPaddingValue(node, 'paddingTop');
    var rV = getPaddingValue(node, 'paddingRight');
    var bV = getPaddingValue(node, 'paddingBottom');
    var lV = getPaddingValue(node, 'paddingLeft');
    var tT = await resolveVarAliasAsync(node, 'paddingTop', mc);
    var rT = await resolveVarAliasAsync(node, 'paddingRight', mc);
    var bT = await resolveVarAliasAsync(node, 'paddingBottom', mc);
    var lT = await resolveVarAliasAsync(node, 'paddingLeft', mc);

    // All four sides identical (value AND token)
    if (tV === rV && rV === bV && bV === lV && tT === rT && rT === bT && bT === lT) {
      return [{ label: 'Padding', token: tT, px: tV + 'px' }];
    }
    // Symmetric: top=bottom, left=right
    if (tV === bV && rV === lV && tT === bT && rT === lT) {
      return [
        { label: 'Vertical padding', token: tT, px: tV + 'px' },
        { label: 'Horizontal padding', token: rT, px: rV + 'px' }
      ];
    }
    // All unique
    return [
      { label: 'Top padding', token: tT, px: tV + 'px' },
      { label: 'Right padding', token: rT, px: rV + 'px' },
      { label: 'Bottom padding', token: bT, px: bV + 'px' },
      { label: 'Left padding', token: lT, px: lV + 'px' }
    ];
  }

  row.appendChild(left);
  row.appendChild(right);
  section.appendChild(row);

  // Real FILL sizing, cascading row → columns → preview panels, so this
  // section actually tracks the sheet if it's resized later instead of
  // sitting at whatever fixed columnWidth it was generated with.
  //
  // BUT: a column whose preview genuinely grew past columnWidth (the real
  // component doesn't fit) must NOT be forced to FILL — FILL would snap it
  // straight back down to the (smaller) FILL-allotted share, discarding
  // the growth and cropping the content clipsContent is about to enforce.
  // Left at its natural width instead, finalizeSheetWidth (which runs
  // after this section returns, scanning real .width across sections)
  // picks up the true requirement and grows the whole sheet to match — the
  // sheet widens for content that needs it rather than the content
  // shrinking to fit an assumed width.
  if (!leftGrew) {
    try { (left as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
    try { (leftPreview as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }
  if (!rightGrew) {
    try { (right as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
    try { (rightPreview as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }
  if (!leftGrew && !rightGrew) {
    try { row.layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }

  parent.appendChild(section);
}

// The node specs are generated from may sit inside a frame with an explicit
// variable mode override (e.g. a "Dark" mode applied higher up the tree).
// Clones placed into our own sheet don't inherit that — they're siblings on
// the page, not descendants of the overridden frame — so without this every
// preview in Anatomy/Properties silently falls back to the default mode.
// Propagating the node's *resolved* modes onto the sheet itself fixes that
// for every clone nested inside it, no matter how deep.
function propagateResolvedVariableModes(sheet: FrameNode, sourceNode: SceneNode): void {
  try {
    var resolved = (sourceNode as any).resolvedVariableModes as { [collectionId: string]: string } | undefined;
    if (!resolved) return;
    var collectionIds = Object.keys(resolved);
    for (var i = 0; i < collectionIds.length; i++) {
      var collectionId = collectionIds[i];
      var modeId = resolved[collectionId];
      try {
        sheet.setExplicitVariableModeForCollection(collectionId as any, modeId);
      } catch (e) {
        // collection may no longer exist — skip it
      }
    }
  } catch (e) {
    // resolvedVariableModes unsupported on this node type — nothing to propagate
  }
}

// Stamps every child appended to `sheet` since `startIndex` as a section of
// kind `key`, linked to `sourceId`. Sections carry their own identity so
// resync can find and rebuild each one individually — including after the
// user moves a section out of the sheet into some other frame.
function stampSectionsFrom(sheet: FrameNode, startIndex: number, key: string, sourceId: string): void {
  for (var i = startIndex; i < sheet.children.length; i++) {
    var child = sheet.children[i] as any;
    if (!child || child.type !== 'FRAME') continue;
    try {
      child.setPluginData('specSection', key);
      child.setPluginData('sourceNodeId', sourceId);
    } catch (e) {}
  }
}

async function createReferenceStyleSpecSheetAsync(node: SceneNode, page: PageNode, modules: any): Promise<FrameNode> {
  var b = getNodeBounds(node);
  var stateTarget = await findStateTargetAsync(node);
  var hasStateOutput = !!(stateTarget && stateTarget.states.length > 0);

  var sheet = figma.createFrame();
  sheet.name = 'spec';
  sheet.layoutMode = 'VERTICAL';
  sheet.primaryAxisSizingMode = 'AUTO';
  sheet.counterAxisSizingMode = 'AUTO';
  sheet.itemSpacing = 0;
  sheet.paddingTop = 0;
  sheet.paddingBottom = 0;
  sheet.paddingLeft = 0;
  propagateResolvedVariableModes(sheet, node);
  sheet.paddingRight = 0;
  sheet.clipsContent = false;
  sheet.fills = solidPaint(COLOR_PAGE_BG);

  var mark = sheet.children.length;
  var hero = makeSectionWrapper(node.name);
  hero.name = SPEC_PREFIX + 'Hero Section';
  hero.itemSpacing = 0;
  sheet.appendChild(hero);
  stampSectionsFrom(sheet, mark, 'hero', node.id);

  mark = sheet.children.length;
  sheet.appendChild(makeMetaSection());
  stampSectionsFrom(sheet, mark, 'meta', node.id);

  if (modules.anatomy) {
    mark = sheet.children.length;
    await buildAnatomySheetSection(sheet, node);
    stampSectionsFrom(sheet, mark, 'anatomy', node.id);
  }

  mark = sheet.children.length;
  await buildPropertiesSheetSection(sheet, node, stateTarget);
  stampSectionsFrom(sheet, mark, 'properties', node.id);

  if (modules.spacing || modules.dimensions) {
    mark = sheet.children.length;
    await buildLayoutSheetSection(sheet, node);
    stampSectionsFrom(sheet, mark, 'layout', node.id);
  }

  if (modules.variables) {
    mark = sheet.children.length;
    await buildVariablesSheetSection(sheet, node);
    stampSectionsFrom(sheet, mark, 'variables', node.id);
  }

  mark = sheet.children.length;
  await buildAccessibilitySheetSection(sheet, node);
  stampSectionsFrom(sheet, mark, 'a11y', node.id);

  mark = sheet.children.length;
  await buildReadinessSheetSection(sheet, node, stateTarget);
  stampSectionsFrom(sheet, mark, 'readiness', node.id);

  // Record which section kinds this sheet has ever had, so resync can tell
  // "section added by a newer plugin version" (backfill it) apart from
  // "section the user deleted" (leave it deleted).
  try {
    sheet.setPluginData('specSectionsGenerated', JSON.stringify(
      ['hero', 'meta', 'properties', 'a11y', 'readiness']
        .concat(modules.anatomy ? ['anatomy'] : [])
        .concat((modules.spacing || modules.dimensions) ? ['layout'] : [])
        .concat(modules.variables ? ['variables'] : [])
    ));
  } catch (e) {}

  finalizeSheetWidth(sheet);

  sheet.x = b.x;
  sheet.y = b.y + b.h + 80;
  page.appendChild(sheet);
  sheet.setPluginData('sourceNodeId', node.id);
  sheet.setPluginData('specModules', JSON.stringify(modules || {}));
  return sheet;
}

// Builds ONE section of the given kind into a temporary container and
// returns it detached (parked at page level; caller inserts it where the
// old section lived). Returns null when the builder produced nothing
// (e.g. properties when the source no longer has any).
async function buildSectionByKey(key: string, source: SceneNode, stateTarget: StateTargetInfo | null): Promise<FrameNode | null> {
  var temp = figma.createFrame();
  temp.name = SPEC_PREFIX + 'Section Rebuild [temp]';
  temp.layoutMode = 'VERTICAL';
  temp.primaryAxisSizingMode = 'AUTO';
  temp.counterAxisSizingMode = 'AUTO';
  temp.fills = [];
  temp.clipsContent = false;
  figma.currentPage.appendChild(temp);
  propagateResolvedVariableModes(temp, source);

  try {
    if (key === 'hero') {
      var hero = makeSectionWrapper(source.name);
      hero.name = SPEC_PREFIX + 'Hero Section';
      hero.itemSpacing = 0;
      temp.appendChild(hero);
    } else if (key === 'meta') {
      temp.appendChild(makeMetaSection());
    } else if (key === 'anatomy') {
      await buildAnatomySheetSection(temp, source);
    } else if (key === 'properties') {
      await buildPropertiesSheetSection(temp, source, stateTarget);
    } else if (key === 'layout') {
      await buildLayoutSheetSection(temp, source);
    } else if (key === 'variables') {
      await buildVariablesSheetSection(temp, source);
    } else if (key === 'a11y') {
      await buildAccessibilitySheetSection(temp, source);
    } else if (key === 'readiness') {
      await buildReadinessSheetSection(temp, source, stateTarget);
    }
  } catch (e) {}

  var built: FrameNode | null = null;
  if (temp.children.length > 0 && temp.children[0].type === 'FRAME') {
    built = temp.children[0] as FrameNode;
    try {
      built.setPluginData('specSection', key);
      built.setPluginData('sourceNodeId', source.id);
    } catch (e) {}
    figma.currentPage.appendChild(built); // detach before removing temp
    propagateResolvedVariableModes(built, source);
  }
  temp.remove();
  return built;
}

// Rebuilds each stamped section of `sheet` in place. The sheet frame itself
// is untouched — its canvas position AND its width are preserved (a width
// differing from the generated default is an intentional user choice).
// Sections the user moved out or deleted are simply absent here and are
// NOT re-created (moved-out ones sync separately, where they now live).
async function resyncSheetInPlace(sheet: FrameNode, source: SceneNode): Promise<void> {
  propagateResolvedVariableModes(sheet, source);
  var stateTarget = await findStateTargetAsync(source);

  var existing: FrameNode[] = [];
  for (var i = 0; i < sheet.children.length; i++) {
    var child = sheet.children[i] as any;
    if (child.type === 'FRAME' && getSectionKey(child)) existing.push(child as FrameNode);
  }

  for (var j = 0; j < existing.length; j++) {
    var oldSection = existing[j];
    var key = getSectionKey(oldSection);
    var index = sheet.children.indexOf(oldSection);
    if (index < 0) continue;

    var fresh = await buildSectionByKey(key, source, stateTarget);
    if (!fresh) {
      oldSection.remove(); // source genuinely has nothing for this section anymore
      continue;
    }
    sheet.insertChild(index, fresh);
    oldSection.remove();
    try { (fresh as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
  }

  // Backfill sections introduced by newer plugin versions (a11y, readiness):
  // append them when this sheet has NEVER had them. If the sheet's record
  // says a key was generated before but it's absent now, the user deleted
  // (or moved out) that section — respect that and don't resurrect it.
  var everGenerated: string[] = [];
  try {
    everGenerated = JSON.parse(sheet.getPluginData('specSectionsGenerated') || '[]') || [];
  } catch (e) {
    everGenerated = [];
  }
  var present: { [k: string]: boolean } = {};
  for (var p = 0; p < sheet.children.length; p++) {
    var pk = getSectionKey(sheet.children[p] as any);
    if (pk) present[pk] = true;
  }
  var backfillKeys = ['a11y', 'readiness'];
  for (var b = 0; b < backfillKeys.length; b++) {
    var bk = backfillKeys[b];
    if (present[bk] || everGenerated.indexOf(bk) !== -1) continue;
    var added = await buildSectionByKey(bk, source, stateTarget);
    if (added) {
      sheet.appendChild(added);
      try { (added as any).layoutSizingHorizontal = 'FILL'; } catch (e) {}
      present[bk] = true;
    }
  }

  // Refresh the record: everything ever generated plus what exists now.
  try {
    var record: { [k: string]: boolean } = {};
    for (var eg = 0; eg < everGenerated.length; eg++) record[everGenerated[eg]] = true;
    for (var pr in present) record[pr] = true;
    sheet.setPluginData('specSectionsGenerated', JSON.stringify(Object.keys(record)));
  } catch (e) {}
}

// Rebuilds one section that lives outside the sheet (or inside a sheet the
// user targeted directly), keeping its current parent, stacking order,
// position, and width — the section stays exactly where the user put it.
async function resyncSectionInPlace(oldSection: FrameNode, source: SceneNode): Promise<boolean> {
  var key = getSectionKey(oldSection);
  var parent = oldSection.parent as any;
  if (!key || !parent) return false;

  var stateTarget = (key === 'properties' || key === 'readiness') ? await findStateTargetAsync(source) : null;
  var index = parent.children ? parent.children.indexOf(oldSection) : -1;
  var oldX = oldSection.x;
  var oldY = oldSection.y;
  var oldW = oldSection.width || 1;
  var oldSizingH = '';
  try { oldSizingH = (oldSection as any).layoutSizingHorizontal || ''; } catch (e) {}

  var fresh = await buildSectionByKey(key, source, stateTarget);
  if (!fresh) return false; // keep the old one rather than silently deleting it

  if (index >= 0 && typeof parent.insertChild === 'function') {
    parent.insertChild(Math.min(index, parent.children.length), fresh);
  } else {
    parent.appendChild(fresh);
  }
  oldSection.remove();

  if (parent.layoutMode && parent.layoutMode !== 'NONE') {
    // Auto-layout parent: mirror how the old section sat in the flow.
    try {
      (fresh as any).layoutSizingHorizontal = oldSizingH === 'FILL' ? 'FILL' : 'FIXED';
    } catch (e) {}
    if (oldSizingH !== 'FILL') {
      try { fresh.resizeWithoutConstraints(oldW, fresh.height || 1); } catch (e) {}
    }
  } else {
    fresh.x = oldX;
    fresh.y = oldY;
    try { fresh.resizeWithoutConstraints(oldW, fresh.height || 1); } catch (e) {}
  }
  return true;
}

function sheetHasStampedSections(sheet: FrameNode): boolean {
  for (var i = 0; i < sheet.children.length; i++) {
    var child = sheet.children[i] as any;
    if (child.type === 'FRAME' && getSectionKey(child)) return true;
  }
  return false;
}

async function getSelectionStateSummaryAsync(): Promise<{ hasStateTarget: boolean; targetName: string; states: string[]; message: string }> {
  var selection = figma.currentPage.selection;
  for (var i = 0; i < selection.length; i++) {
    var target = await findStateTargetAsync(selection[i]);
    if (!target || target.states.length === 0) continue;

    return {
      hasStateTarget: true,
      targetName: target.targetName,
      states: target.states,
      message: 'State property found on ' + target.targetName + ': ' + target.states.join(', ')
    };
  }

  return {
    hasStateTarget: false,
    targetName: '',
    states: [],
    message: STATE_SELECTION_HINT
  };
}

var STATE_SELECTION_HINT = 'Select a component instance to generate spec documentation.';

var NO_STATE_SUMMARY = {
  hasStateTarget: false as false,
  targetName: '',
  states: [] as string[],
  message: STATE_SELECTION_HINT
};

// ─── Resync support ────────────────────────────────────────────────
// Generated sheets carry pluginData: sourceNodeId (the component they
// document) and specModules (the module selection used). This lets the
// plugin find sheets linked to the current selection and re-generate
// them in place.

function getSheetSourceId(sheet: BaseNode): string {
  try {
    return (sheet as any).getPluginData ? (sheet as any).getPluginData('sourceNodeId') || '' : '';
  } catch (e) {
    return '';
  }
}

function getAllSpecSheets(): FrameNode[] {
  var out: FrameNode[] = [];
  var children = figma.currentPage.children || [];
  for (var i = 0; i < children.length; i++) {
    var child = children[i] as any;
    if (child.type !== 'FRAME') continue;
    // A moved-out *section* also carries sourceNodeId but has a specSection
    // key — it must not be mistaken for a whole sheet, or resync would
    // delete it and regenerate a full sheet in its place.
    if (getSheetSourceId(child) && !getSectionKey(child)) {
      out.push(child as FrameNode);
      continue;
    }
    if (child.name === SPEC_PREFIX + 'Generated Sheets') {
      var inner = child.children || [];
      for (var r = 0; r < inner.length; r++) {
        var grand = inner[r] as any;
        if (grand.type === 'FRAME' && getSheetSourceId(grand) && !getSectionKey(grand)) {
          out.push(grand as FrameNode);
        }
      }
    }
  }
  return out;
}

function getSectionKey(n: BaseNode): string {
  try {
    return (n as any).getPluginData ? (n as any).getPluginData('specSection') || '' : '';
  } catch (e) {
    return '';
  }
}

// Nearest ancestor that is a spec sheet (sourceNodeId without a section
// key), or null when the node lives outside any sheet.
function getEnclosingSpecSheet(n: BaseNode): FrameNode | null {
  var p = (n as any).parent;
  while (p && p.type !== 'PAGE') {
    if (p.type === 'FRAME' && getSheetSourceId(p) && !getSectionKey(p)) return p as FrameNode;
    p = p.parent;
  }
  return null;
}

// Every stamped section on the page, wherever it lives. Name prefix first
// (cheap) so getPluginData only runs on plugin-produced frames.
function findAllStampedSections(): FrameNode[] {
  var out: FrameNode[] = [];
  try {
    var frames = figma.currentPage.findAllWithCriteria({ types: ['FRAME'] }) as any[];
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      if (!f.name || f.name.indexOf(SPEC_PREFIX) !== 0) continue;
      if (getSectionKey(f)) out.push(f as FrameNode);
    }
  } catch (e) {}
  return out;
}

function selectionCoversNode(n: BaseNode, selectedIds: { [id: string]: boolean }): boolean {
  var p: any = n;
  while (p && p.type !== 'PAGE') {
    if (p.id && selectedIds[p.id]) return true;
    p = p.parent;
  }
  return false;
}

// What resync should touch: whole sheets (rebuilt section-by-section in
// place) plus individual sections that live OUTSIDE any sheet — the user
// moved them into their own frames and they sync there (never re-created
// back inside the sheet). Sections inside a targeted sheet are covered by
// the sheet's own in-place rebuild and excluded here to avoid double work.
function findResyncTargets(): { sheets: FrameNode[]; sections: FrameNode[] } {
  var sheets = findLinkedSheets();
  var allSections = findAllStampedSections();
  var selection = figma.currentPage.selection;

  var sheetIds: { [id: string]: boolean } = {};
  for (var s = 0; s < sheets.length; s++) sheetIds[sheets[s].id] = true;

  var sections: FrameNode[] = [];

  if (selection.length === 0) {
    for (var i = 0; i < allSections.length; i++) {
      if (!getEnclosingSpecSheet(allSections[i])) sections.push(allSections[i]);
    }
    return { sheets: sheets, sections: sections };
  }

  var selectedIds: { [id: string]: boolean } = {};
  for (var si = 0; si < selection.length; si++) selectedIds[selection[si].id] = true;
  var targetIds = collectSelectionTargetIds();

  for (var j = 0; j < allSections.length; j++) {
    var sec = allSections[j];
    var enclosing = getEnclosingSpecSheet(sec);
    if (enclosing && sheetIds[enclosing.id]) continue; // sheet rebuild covers it
    var covered = selectionCoversNode(sec, selectedIds);
    var sourceMatched = !!targetIds[getSheetSourceId(sec)];
    if (enclosing) {
      // Inside a sheet that is NOT being resynced: only when explicitly
      // selected (directly or via a selected ancestor).
      if (covered) sections.push(sec);
    } else if (covered || sourceMatched) {
      sections.push(sec);
    }
  }

  return { sheets: sheets, sections: sections };
}

function collectSelectionTargetIds(): { [id: string]: boolean } {
  var ids: { [id: string]: boolean } = {};
  var selection = figma.currentPage.selection;
  for (var i = 0; i < selection.length; i++) {
    var node = selection[i] as any;
    if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE' && node.type !== 'FRAME') continue;
    if (getSheetSourceId(node)) continue; // selected a generated sheet, not a source
    if (node.name && node.name.indexOf(SPEC_PREFIX) === 0) continue;
    ids[node.id] = true;

    // Descendants: a selected frame may wrap the node specs were actually
    // generated from — search the whole subtree, not just component/instance
    // leaves, since the source can itself be a FRAME (e.g. a card or row).
    if (typeof node.findAllWithCriteria === 'function') {
      var nested = node.findAllWithCriteria({ types: ['COMPONENT', 'INSTANCE', 'FRAME'] });
      for (var n = 0; n < nested.length; n++) {
        ids[nested[n].id] = true;
      }
    }

    // Ancestors: the user may instead select something nested INSIDE the
    // node specs were generated from (e.g. the instance itself, when specs
    // were generated against its parent frame) — walk up so that still
    // resolves to the same linked sheet.
    var ancestor = node.parent as any;
    while (ancestor && ancestor.type !== 'PAGE') {
      if (ancestor.id) ids[ancestor.id] = true;
      ancestor = ancestor.parent;
    }
  }
  return ids;
}

function findLinkedSheets(): FrameNode[] {
  var selection = figma.currentPage.selection;
  var sheets = getAllSpecSheets();

  // Nothing selected: once specs are generated you shouldn't have to go
  // re-find the exact source node just to keep them in sync — resync
  // everything already generated on this page. Each sheet already carries
  // its own sourceNodeId in pluginData, so no selection is needed at all.
  if (selection.length === 0) {
    return sheets;
  }

  var linked: FrameNode[] = [];
  var seen: { [id: string]: boolean } = {};

  // A generated sheet selected directly resyncs just itself — the sheet
  // already has everything it needs (sourceNodeId + specModules) without
  // any source-matching.
  for (var s = 0; s < selection.length; s++) {
    var sel = selection[s] as any;
    if (sel.type === 'FRAME' && getSheetSourceId(sel) && !getSectionKey(sel) && !seen[sel.id]) {
      seen[sel.id] = true;
      linked.push(sel as FrameNode);
    }
  }

  // Otherwise fall back to source-matching (exact source, an ancestor
  // wrapping it, or something nested inside it).
  var targetIds = collectSelectionTargetIds();
  for (var i = 0; i < sheets.length; i++) {
    var srcId = getSheetSourceId(sheets[i]);
    if (srcId && targetIds[srcId] && !seen[sheets[i].id]) {
      seen[sheets[i].id] = true;
      linked.push(sheets[i]);
    }
  }

  return linked;
}

function postSelectionStateToUI(): void {
  var resyncableCount = 0;
  try {
    var targets = findResyncTargets();
    resyncableCount = targets.sheets.length + targets.sections.length;
  } catch (e) {
    resyncableCount = 0;
  }
  var resyncIsBatch = figma.currentPage.selection.length === 0;
  getSelectionStateSummaryAsync().then(function(summary) {
    figma.ui.postMessage({ type: 'selection-state', selection: summary, resyncableCount: resyncableCount, resyncIsBatch: resyncIsBatch });
  }).catch(function() {
    figma.ui.postMessage({ type: 'selection-state', selection: NO_STATE_SUMMARY, resyncableCount: resyncableCount, resyncIsBatch: resyncIsBatch });
  });
}

// ═══════════════════════════════════════════════════════════════════
// CLEAR ALL SPECS
// ═══════════════════════════════════════════════════════════════════

function clearAllSpecs(): number {
  var count = 0;
  function recurse(parent: BaseNode): void {
    if (!('children' in parent)) return;
    var children = (parent as any).children;
    var i = children.length - 1;
    while (i >= 0) {
      if (children[i].name.indexOf(SPEC_PREFIX) === 0 || getSheetSourceId(children[i])) {
        children[i].remove();
        count++;
      } else {
        recurse(children[i]);
      }
      i--;
    }
  }
  recurse(figma.currentPage);
  return count;
}

function isTopLevelSpecSheet(node: BaseNode): boolean {
  var n = node as any;
  if (!n || n.type !== 'FRAME') return false;
  if (!n.parent || n.parent.type !== 'PAGE') return false;
  if (!n.name || n.name.indexOf(SPEC_PREFIX) !== 0) return false;
  if (n.name === SPEC_PREFIX + 'Generated Sheets') return false;
  if (n.layoutMode !== 'VERTICAL') return false;
  if (!n.children || n.children.length === 0) return false;
  return true;
}

function getOrCreateSpecsRow(anchorX: number, anchorY: number): FrameNode {
  var page = figma.currentPage;
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var child = children[i] as any;
    if (child.type === 'FRAME' && child.name === SPEC_PREFIX + 'Generated Sheets') {
      return child as FrameNode;
    }
  }

  var row = figma.createFrame();
  row.name = SPEC_PREFIX + 'Generated Sheets';
  row.layoutMode = 'HORIZONTAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 40;
  row.paddingTop = 0;
  row.paddingBottom = 0;
  row.paddingLeft = 0;
  row.paddingRight = 0;
  row.fills = [];
  row.clipsContent = false;
  row.layoutWrap = 'NO_WRAP';
  row.x = anchorX;
  row.y = anchorY;
  page.appendChild(row);
  return row;
}

function findSpecsRow(): FrameNode | null {
  var page = figma.currentPage;
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var child = children[i] as any;
    if (child.type === 'FRAME' && child.name === SPEC_PREFIX + 'Generated Sheets') {
      return child as FrameNode;
    }
  }
  return null;
}

function arrangeSpecSheetsSideBySide(newSheets: FrameNode[], anchorX: number, anchorY: number): void {
  var page = figma.currentPage;
  var pageChildren = page.children || [];
  var newIds: { [id: string]: boolean } = {};
  for (var ni = 0; ni < newSheets.length; ni++) {
    newIds[newSheets[ni].id] = true;
  }

  var looseSheets: FrameNode[] = [];
  for (var i = 0; i < pageChildren.length; i++) {
    var candidate = pageChildren[i] as any;
    if (!isTopLevelSpecSheet(candidate)) continue;
    if (newIds[candidate.id]) continue;
    looseSheets.push(candidate as FrameNode);
  }

  var row = findSpecsRow();
  var existingInRow: FrameNode[] = [];
  if (row) {
    var rowChildren = row.children || [];
    for (var r = 0; r < rowChildren.length; r++) {
      if ((rowChildren[r] as any).type === 'FRAME') {
        existingInRow.push(rowChildren[r] as FrameNode);
      }
    }
  }

  var total = existingInRow.length + looseSheets.length + newSheets.length;
  if (total <= 1) return;

  if (!row) {
    row = getOrCreateSpecsRow(anchorX, anchorY);
  }

  if (existingInRow.length === 0) {
    row.x = anchorX;
    row.y = anchorY;
  }

  looseSheets.sort(function(a: any, b: any) {
    return (a.x || 0) - (b.x || 0);
  });

  for (var l = 0; l < looseSheets.length; l++) {
    row.appendChild(looseSheets[l]);
  }

  for (var n = 0; n < newSheets.length; n++) {
    if (newSheets[n].parent !== row) {
      row.appendChild(newSheets[n]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODULE ENTRY POINTS (called by main.ts, which owns the unified UI)
// ═══════════════════════════════════════════════════════════════════

export function registerSpecSelectionTracking(): void {
  figma.on('selectionchange', function() {
    postSelectionStateToUI();
  });
}

// Called by main.ts once the UI signals 'ui-ready'. A push fired eagerly at
// startup (before the UI iframe has attached its message listener) is a
// window.postMessage race and can be silently dropped — this is the
// reliable first push, matching how getTokensInitData() is delivered.
export function pushSpecSelectionState(): void {
  postSelectionStateToUI();
}

export function handleSpecMessage(msg: any): void {

  if (msg.type === 'generate-specs') {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select a component or instance first.' });
      return;
    }

    applyUiTokenOverrides(msg.tokens);

    var modules = msg.modules || {
      anatomy: true, spacing: true, dimensions: true,
      styles: true, componentInstance: true, variables: true
    };

    resolveLocalFonts(selection);

    Promise.all([
      figma.loadFontAsync(FONT_REGULAR),
      figma.loadFontAsync(FONT_MEDIUM),
      figma.loadFontAsync(FONT_BOLD)
    ]).then(async function() {
      var totalGenerated = 0;
      var generatedSheets: FrameNode[] = [];
      var anchorX = Number.POSITIVE_INFINITY;
      var anchorY = 0;

      for (var si = 0; si < selection.length; si++) {
        var sb = getNodeBounds(selection[si] as any);
        if (sb.x < anchorX) anchorX = sb.x;
        if ((sb.y + sb.h + 80) > anchorY) anchorY = sb.y + sb.h + 80;
      }

      if (!isFinite(anchorX)) anchorX = 0;

      for (var s = 0; s < selection.length; s++) {
        var node = selection[s];
        if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE' && node.type !== 'FRAME') continue;

        var createdSheet = await createReferenceStyleSpecSheetAsync(node, figma.currentPage, modules);
        generatedSheets.push(createdSheet);
        totalGenerated++;
      }

      arrangeSpecSheetsSideBySide(generatedSheets, anchorX, anchorY);

      figma.ui.postMessage({
        type: 'success',
        message: 'Generated specs for ' + totalGenerated + ' component(s).'
      });
      postSelectionStateToUI();
    }).catch(function(err: any) {
      figma.ui.postMessage({ type: 'error', message: 'Error generating specs: ' + (err && err.message || err) });
    });
  }

  if (msg.type === 'resync-specs') {
    (async function() {
      try {
        applyUiTokenOverrides(msg.tokens);

        var targets = findResyncTargets();
        if (targets.sheets.length === 0 && targets.sections.length === 0) {
          var noneMsg = figma.currentPage.selection.length === 0
            ? 'No spec sheets found on this page yet. Generate specs first.'
            : 'No spec sheets linked to this selection. Generate specs first.';
          figma.ui.postMessage({ type: 'error', message: noneMsg });
          return;
        }

        var defaultModules = {
          anatomy: true, spacing: true, dimensions: true,
          styles: true, componentInstance: true, variables: true
        };

        // Resolve sources up front; drop orphaned sheets, skip orphaned
        // moved-out sections (they live inside the user's own frames —
        // deleting there is not this plugin's call).
        var sheetJobs: { sheet: FrameNode; source: SceneNode; modules: any }[] = [];
        var orphans = 0;
        for (var i = 0; i < targets.sheets.length; i++) {
          var sheet = targets.sheets[i];
          var source = await figma.getNodeByIdAsync(getSheetSourceId(sheet));
          if (!source || (source.type !== 'COMPONENT' && source.type !== 'INSTANCE' && source.type !== 'FRAME')) {
            sheet.remove();
            orphans++;
            continue;
          }
          var storedModules: any = null;
          try {
            storedModules = JSON.parse(sheet.getPluginData('specModules') || 'null');
          } catch (e) {
            storedModules = null;
          }
          sheetJobs.push({ sheet: sheet, source: source as SceneNode, modules: storedModules || msg.modules || defaultModules });
        }

        var sectionJobs: { section: FrameNode; source: SceneNode }[] = [];
        var skippedSections = 0;
        for (var si = 0; si < targets.sections.length; si++) {
          var sec = targets.sections[si];
          var secSource = await figma.getNodeByIdAsync(getSheetSourceId(sec));
          if (!secSource || (secSource.type !== 'COMPONENT' && secSource.type !== 'INSTANCE' && secSource.type !== 'FRAME')) {
            skippedSections++;
            continue;
          }
          sectionJobs.push({ section: sec, source: secSource as SceneNode });
        }

        if (sheetJobs.length === 0 && sectionJobs.length === 0) {
          figma.ui.postMessage({ type: 'success', message: 'Removed ' + orphans + ' orphaned sheet(s) — their components no longer exist.' });
          postSelectionStateToUI();
          return;
        }

        var sources: SceneNode[] = [];
        for (var s = 0; s < sheetJobs.length; s++) sources.push(sheetJobs[s].source);
        for (var s2 = 0; s2 < sectionJobs.length; s2++) sources.push(sectionJobs[s2].source);
        resolveLocalFonts(sources);
        await Promise.all([
          figma.loadFontAsync(FONT_REGULAR),
          figma.loadFontAsync(FONT_MEDIUM),
          figma.loadFontAsync(FONT_BOLD)
        ]);

        var refreshedSheets = 0;
        for (var j = 0; j < sheetJobs.length; j++) {
          var job = sheetJobs[j];
          if (sheetHasStampedSections(job.sheet)) {
            // Section-level sync in place: the sheet frame is never
            // replaced, so its position and any user-adjusted width stay
            // exactly as they are, and sections moved out of the sheet
            // are not re-created inside it.
            await resyncSheetInPlace(job.sheet, job.source);
          } else {
            // Legacy sheet from before sections carried their own stamps —
            // full rebuild is the only option, restoring position as before.
            var parent = job.sheet.parent as any;
            var index = parent && parent.children ? parent.children.indexOf(job.sheet) : -1;
            var oldX = job.sheet.x;
            var oldY = job.sheet.y;

            var newSheet = await createReferenceStyleSpecSheetAsync(job.source, figma.currentPage, job.modules);
            job.sheet.remove();

            if (parent && parent.type !== 'PAGE' && index >= 0 && !(parent as any).removed) {
              var insertAt = Math.min(index, parent.children.length);
              parent.insertChild(insertAt, newSheet);
            } else {
              newSheet.x = oldX;
              newSheet.y = oldY;
            }
          }
          refreshedSheets++;
        }

        var refreshedSections = 0;
        for (var k = 0; k < sectionJobs.length; k++) {
          var ok = await resyncSectionInPlace(sectionJobs[k].section, sectionJobs[k].source);
          if (ok) refreshedSections++;
        }

        var parts: string[] = [];
        if (refreshedSheets > 0) parts.push(refreshedSheets + ' sheet(s)');
        if (refreshedSections > 0) parts.push(refreshedSections + ' moved section(s)');
        var summaryText = 'Resynced ' + (parts.length > 0 ? parts.join(' and ') : 'nothing') +
          (orphans > 0 ? ', removed ' + orphans + ' orphaned' : '') +
          (skippedSections > 0 ? ', skipped ' + skippedSections + ' section(s) with missing components' : '') + '.';
        figma.ui.postMessage({ type: 'success', message: summaryText });
        postSelectionStateToUI();
      } catch (err: any) {
        figma.ui.postMessage({ type: 'error', message: 'Error resyncing specs: ' + (err && err.message || err) });
      }
    })();
  }

  if (msg.type === 'clear-specs') {
    var count = clearAllSpecs();
    figma.ui.postMessage({
      type: 'success',
      message: 'Removed ' + count + ' annotation(s).'
    });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
}
