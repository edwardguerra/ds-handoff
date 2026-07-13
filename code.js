(() => {
  // src/spec.ts
  var SPEC_PREFIX = "Specs-";
  var FONT_REGULAR = { family: "Inter", style: "Regular" };
  var FONT_MEDIUM = { family: "Inter", style: "Medium" };
  var FONT_BOLD = { family: "Inter", style: "Bold" };
  function resolveLocalFonts(selectionNodes) {
    function weightOf(styleName) {
      var s = (styleName || "").toLowerCase();
      if (s === "thin" || s.indexOf("hairline") >= 0) return 100;
      if (s.indexOf("extralight") >= 0 || s.indexOf("extra light") >= 0 || s.indexOf("ultralight") >= 0) return 200;
      if (s === "light") return 300;
      if (s === "regular" || s === "book" || s === "roman" || s === "normal" || s === "text") return 400;
      if (s === "medium") return 500;
      if (s.indexOf("semibold") >= 0 || s.indexOf("semi bold") >= 0 || s.indexOf("demi") >= 0) return 600;
      if (s === "bold") return 700;
      if (s.indexOf("extrabold") >= 0 || s.indexOf("extra bold") >= 0) return 800;
      if (s.indexOf("black") >= 0 || s.indexOf("heavy") >= 0) return 900;
      return 400;
    }
    var candidates = [];
    var seen = {};
    function addFont(fn) {
      if (!fn || typeof fn !== "object" || !fn.family || !fn.style) return;
      var key = fn.family + "|" + fn.style;
      if (seen[key]) return;
      seen[key] = true;
      candidates.push({ family: fn.family, style: fn.style });
    }
    function walkNode(node) {
      if (!node) return;
      if (node.type === "TEXT") {
        var fn = node.fontName;
        if (fn && fn !== figma.mixed) addFont(fn);
      }
      var kids = node.children || [];
      for (var i = 0; i < kids.length; i++) walkNode(kids[i]);
    }
    if (selectionNodes) {
      for (var si = 0; si < selectionNodes.length; si++) walkNode(selectionNodes[si]);
    }
    try {
      var localStyles = figma.getLocalTextStyles();
      for (var ls = 0; ls < localStyles.length; ls++) addFont(localStyles[ls].fontName);
    } catch (e) {
    }
    if (candidates.length === 0) return;
    function closest(target) {
      var best = null;
      var bestDiff = Infinity;
      for (var ci = 0; ci < candidates.length; ci++) {
        var diff = Math.abs(weightOf(candidates[ci].style) - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = candidates[ci];
        }
      }
      return best;
    }
    var r = closest(400);
    if (r) FONT_REGULAR = r;
    var m = closest(500);
    if (m) FONT_MEDIUM = m;
    var b = closest(700);
    if (b) FONT_BOLD = b;
  }
  var COLOR_LABEL = { r: 0.4, g: 0.4, b: 0.4 };
  var COLOR_VALUE = { r: 0.13, g: 0.13, b: 0.13 };
  var COLOR_HEADER = { r: 0.1, g: 0.1, b: 0.1 };
  var COLOR_MUTED = { r: 0.6, g: 0.6, b: 0.6 };
  var COLOR_ACCENT = { r: 0.24, g: 0.48, b: 0.89 };
  var COLOR_DIVIDER = { r: 0.9, g: 0.9, b: 0.9 };
  var WHITE = { r: 1, g: 1, b: 1 };
  var COLOR_SPACING = { r: 0.14, g: 0.65, b: 0.42 };
  var COLOR_ORANGE = { r: 0.85, g: 0.34, b: 0.04 };
  var COLOR_PAGE_BG = { r: 0.92, g: 0.92, b: 0.92 };
  var TOKEN_MARKER_COLOR = COLOR_ORANGE;
  var TOKEN_PREVIEW_BG = { r: 0.88, g: 0.88, b: 0.88 };
  var TOKEN_PREVIEW_RADIUS = 0;
  var SPEC_ROW_WIDTH = 800;
  var SHEET_INNER_WIDTH = 860;
  var PROPERTIES_CARD_WIDTH = 450;
  function solidPaint(color, opacity) {
    if (opacity !== void 0) {
      return [{ type: "SOLID", color, opacity }];
    }
    return [{ type: "SOLID", color }];
  }
  function rgbToHex(c) {
    if (!c) return "#000000";
    var r = Math.round(c.r * 255);
    var g = Math.round(c.g * 255);
    var b = Math.round(c.b * 255);
    function h(n) {
      var s = n.toString(16);
      return s.length === 1 ? "0" + s : s;
    }
    return ("#" + h(r) + h(g) + h(b)).toUpperCase();
  }
  function parseHexToRgb(hex) {
    if (typeof hex !== "string") return null;
    var raw = hex.trim();
    if (!raw) return null;
    if (raw.charAt(0) === "#") raw = raw.substring(1);
    if (raw.length === 3) {
      raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
    var r = parseInt(raw.substring(0, 2), 16) / 255;
    var g = parseInt(raw.substring(2, 4), 16) / 255;
    var b = parseInt(raw.substring(4, 6), 16) / 255;
    return { r, g, b };
  }
  function parseRadiusPx(value) {
    if (typeof value === "number" && isFinite(value)) return Math.max(0, value);
    if (typeof value !== "string") return null;
    var n = parseFloat(value.trim());
    if (!isFinite(n)) return null;
    return Math.max(0, n);
  }
  function applyUiTokenOverrides(tokens) {
    if (!tokens || typeof tokens !== "object") return;
    var markerColor = parseHexToRgb(tokens.markerColor);
    if (markerColor) TOKEN_MARKER_COLOR = markerColor;
    var previewBg = parseHexToRgb(tokens.previewBg);
    if (previewBg) TOKEN_PREVIEW_BG = previewBg;
    var previewRadius = parseRadiusPx(tokens.previewRadius);
    if (previewRadius !== null) TOKEN_PREVIEW_RADIUS = previewRadius;
  }
  function resolveVarAlias(node, prop, index, mainCompNode) {
    function lookupBinding(source) {
      if (!source || !source.boundVariables) return "";
      var binding = source.boundVariables[prop];
      if (!binding) return "";
      var entry = binding;
      if (Array.isArray(binding)) {
        if (index !== void 0 && index < binding.length) entry = binding[index];
        else return "";
      }
      if (!entry || !entry.id) return "";
      try {
        var variable = figma.variables.getVariableById(entry.id);
        if (variable) return variable.name;
      } catch (e) {
      }
      return "";
    }
    var result = lookupBinding(node);
    if (result) return result;
    if (mainCompNode) {
      result = lookupBinding(mainCompNode);
      if (result) return result;
    }
    if (node.inferredAutoLayout) {
      result = lookupBinding(node.inferredAutoLayout);
      if (result) return result;
    }
    return "";
  }
  async function resolveVarAliasAsync(node, prop, mainCompNode) {
    async function lookupAsync(source) {
      if (!source || !source.boundVariables) return "";
      var binding = source.boundVariables[prop];
      if (!binding) return "";
      var id = Array.isArray(binding) ? "" : binding.id || "";
      if (!id) return "";
      try {
        var v = await figma.variables.getVariableByIdAsync(id);
        if (v) return v.name || "";
      } catch (e) {
      }
      try {
        var sv = figma.variables.getVariableById(id);
        if (sv) return sv.name || "";
      } catch (e) {
      }
      return "";
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
    return "";
  }
  function shortTokenName(name) {
    if (!name) return name;
    var parts = name.split("/");
    if (parts.length <= 2) return name;
    return parts.slice(-2).join("/");
  }
  function normalizeComponentPropertyType(rawType) {
    if (typeof rawType !== "string" || rawType.length === 0) return "UNKNOWN";
    var normalized = rawType.toUpperCase().replace(/[\s-]+/g, "_");
    if (normalized === "SLOT") return "INSTANCE_SWAP";
    if (normalized === "VARIANT" || normalized === "TEXT" || normalized === "BOOLEAN" || normalized === "INSTANCE_SWAP") {
      return normalized;
    }
    return "UNKNOWN";
  }
  function getNodeBounds(node) {
    var bounds = node.absoluteRenderBounds || node.absoluteBoundingBox;
    if (bounds) {
      return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
    }
    return { x: node.x || 0, y: node.y || 0, w: node.width || 0, h: node.height || 0 };
  }
  function getTypeIcon(nodeType) {
    if (nodeType === "TEXT") return "T";
    if (nodeType === "INSTANCE") return "\u25C7";
    if (nodeType === "COMPONENT") return "\u25C6";
    if (nodeType === "COMPONENT_SET") return "\u25C8";
    if (nodeType === "FRAME") return "\u2317";
    if (nodeType === "GROUP") return "\u2630";
    if (nodeType === "VECTOR") return "\u270E";
    return "\u2022";
  }
  function getTypeTag(nodeType) {
    if (nodeType === "TEXT") return "TEXT";
    if (nodeType === "INSTANCE") return "INSTANCE";
    if (nodeType === "FRAME") return "FRAME";
    if (nodeType === "COMPONENT") return "COMPONENT";
    if (nodeType === "COMPONENT_SET") return "COMPONENT SET";
    if (nodeType === "VECTOR") return "VECTOR";
    if (nodeType === "GROUP") return "GROUP";
    return nodeType || "UNKNOWN";
  }
  function makeNodeLabel(name, nodeType, size, bold) {
    var row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.primaryAxisAlignItems = "CENTER";
    row.counterAxisAlignItems = "CENTER";
    row.itemSpacing = 6;
    row.fills = [];
    row.clipsContent = false;
    var icon = makeText(getTypeIcon(nodeType), size, FONT_MEDIUM, COLOR_LABEL);
    var label = makeText(name, size, bold ? FONT_BOLD : FONT_REGULAR, COLOR_HEADER);
    row.appendChild(icon);
    row.appendChild(label);
    return row;
  }
  function makeText(str, size, font, color) {
    var t = figma.createText();
    t.fontName = font;
    t.characters = str;
    t.fontSize = Math.min(size, 24);
    t.fills = solidPaint(color);
    t.textAutoResize = "HEIGHT";
    return t;
  }
  function makeHorizontalDivider(width) {
    var d = figma.createRectangle();
    d.resize(width, 1);
    d.fills = solidPaint(COLOR_DIVIDER);
    d.strokes = [];
    return d;
  }
  function makeRow(label, value) {
    var row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "FIXED";
    row.counterAxisSizingMode = "AUTO";
    row.resize(SPEC_ROW_WIDTH, 1);
    row.itemSpacing = 12;
    row.fills = [];
    var labelNode = makeText(label, 11, FONT_MEDIUM, COLOR_LABEL);
    labelNode.layoutAlign = "STRETCH";
    var valueNode = makeText(value, 11, FONT_REGULAR, COLOR_VALUE);
    valueNode.layoutGrow = 1;
    valueNode.textAutoResize = "HEIGHT";
    row.appendChild(labelNode);
    row.appendChild(valueNode);
    return row;
  }
  function makeLightPreviewPanel(width, height) {
    var panel = figma.createFrame();
    panel.layoutMode = "NONE";
    panel.primaryAxisSizingMode = "FIXED";
    panel.counterAxisSizingMode = "FIXED";
    panel.resize(width, height);
    panel.fills = solidPaint(TOKEN_PREVIEW_BG);
    panel.cornerRadius = TOKEN_PREVIEW_RADIUS;
    panel.clipsContent = false;
    return panel;
  }
  async function makePreviewSourceNode(node) {
    if (node.type === "COMPONENT") {
      return node.createInstance();
    }
    if (node.type === "COMPONENT_SET") {
      var setNode = node;
      var variant = setNode.defaultVariant || setNode.children && setNode.children[0];
      if (variant && variant.type === "COMPONENT") {
        return variant.createInstance();
      }
    }
    if (node.type === "INSTANCE") {
      var instanceNode = node;
      var mainComponent = null;
      try {
        mainComponent = await node.getMainComponentAsync();
      } catch (e) {
      }
      if (mainComponent) {
        var freshInstance = mainComponent.createInstance();
        try {
          var updates = {};
          var componentProperties = instanceNode.componentProperties || {};
          for (var propKey in componentProperties) {
            if (!componentProperties.hasOwnProperty(propKey)) continue;
            var propEntry = componentProperties[propKey];
            if (propEntry && typeof propEntry === "object" && "value" in propEntry) {
              updates[propKey] = propEntry.value;
            }
          }
          if (Object.keys(updates).length > 0 && typeof freshInstance.setProperties === "function") {
            freshInstance.setProperties(updates);
          }
        } catch (e) {
        }
        return freshInstance;
      }
    }
    return node.clone();
  }
  function makeVerticalAutoFrame(width) {
    var f = figma.createFrame();
    f.layoutMode = "VERTICAL";
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "FIXED";
    f.layoutSizingVertical = "HUG";
    f.clipsContent = false;
    f.fills = [];
    return f;
  }
  function centerNodeInPanel(node, panel, maxWidth, maxHeight, allowScale) {
    panel.appendChild(node);
    var currentW = node.width || 1;
    var currentH = node.height || 1;
    var sx = maxWidth / currentW;
    var sy = maxHeight / currentH;
    var scale = Math.min(sx, sy, 1);
    var w = node.width || 1;
    var h = node.height || 1;
    if (allowScale === false) {
      var padX = 16;
      var padY = 16;
      var requiredWidth = w + padX * 2;
      var requiredHeight = h + padY * 2;
      if (panel.width < requiredWidth || panel.height < requiredHeight) {
        panel.resize(Math.max(panel.width || 0, requiredWidth), Math.max(panel.height || 0, requiredHeight));
        maxWidth = panel.width || maxWidth;
        maxHeight = panel.height || maxHeight;
      }
    }
    node.x = Math.round((maxWidth - w) / 2);
    node.y = Math.round((maxHeight - h) / 2);
    if (panel.layoutMode !== "NONE" && "layoutPositioning" in node) {
      node.layoutPositioning = "ABSOLUTE";
    }
    return node;
  }
  function cloneNodeCentered(source, panel, maxWidth, maxHeight, allowScale) {
    var clone = source.clone();
    return centerNodeInPanel(clone, panel, maxWidth, maxHeight, allowScale);
  }
  function makeAlignmentGrid(sourceInfo, mode) {
    var primaryAlign = sourceInfo.primaryAxisAlignItems || "MIN";
    var counterAlign = sourceInfo.counterAxisAlignItems || "MIN";
    var squareSize = 8;
    var gridGap = 4;
    var outlineColor = { r: 0.8, g: 0.8, b: 0.8 };
    var fillColor = { r: 0.5, g: 0.5, b: 0.5 };
    var selectedRow = 0;
    var selectedCol = 0;
    if (mode === "HORIZONTAL") {
      if (primaryAlign === "CENTER") selectedCol = 1;
      else if (primaryAlign === "MAX") selectedCol = 2;
      if (counterAlign === "CENTER") selectedRow = 1;
      else if (counterAlign === "MAX") selectedRow = 2;
    } else {
      if (primaryAlign === "CENTER") selectedRow = 1;
      else if (primaryAlign === "MAX") selectedRow = 2;
      if (counterAlign === "CENTER") selectedCol = 1;
      else if (counterAlign === "MAX") selectedCol = 2;
    }
    var grid = figma.createFrame();
    grid.name = "Alignment-Grid";
    grid.layoutMode = "HORIZONTAL";
    grid.layoutWrap = "WRAP";
    grid.primaryAxisSizingMode = "AUTO";
    grid.counterAxisSizingMode = "AUTO";
    grid.itemSpacing = gridGap;
    grid.counterAxisSpacing = gridGap;
    grid.fills = [];
    grid.clipsContent = false;
    grid.resize(squareSize * 3 + gridGap * 2, squareSize * 3 + gridGap * 2);
    grid.x = 24;
    grid.y = 24;
    for (var row = 0; row < 3; row++) {
      for (var col = 0; col < 3; col++) {
        var square = figma.createRectangle();
        square.name = "Alignment-Grid-Cell";
        square.resize(squareSize, squareSize);
        square.fills = [];
        square.strokes = solidPaint(outlineColor, 1);
        square.strokeWeight = 1;
        var isSelected = row === selectedRow && col === selectedCol;
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
  function makeSectionWrapper(title) {
    var section = figma.createFrame();
    section.layoutMode = "VERTICAL";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "AUTO";
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
  function makeMetaSection() {
    var section = figma.createFrame();
    section.name = SPEC_PREFIX + "Meta";
    section.layoutMode = "VERTICAL";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "AUTO";
    section.itemSpacing = 6;
    section.paddingTop = 20;
    section.paddingBottom = 20;
    section.paddingLeft = 24;
    section.paddingRight = 24;
    section.fills = solidPaint(WHITE);
    section.clipsContent = false;
    var now = /* @__PURE__ */ new Date();
    var dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    var timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    var timezone = "";
    try {
      var tzFormatter = Intl.DateTimeFormat("en-US", { hour: "numeric", timeZoneName: "short" });
      var tzParts = tzFormatter.formatToParts ? tzFormatter.formatToParts(now) : [];
      for (var tp = 0; tp < tzParts.length; tp++) {
        if (tzParts[tp].type === "timeZoneName" && tzParts[tp].value) {
          timezone = tzParts[tp].value;
          break;
        }
      }
    } catch (e) {
    }
    if (!timezone) {
      try {
        var resolvedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        var usOffset = now.getTimezoneOffset();
        if (resolvedTimezone === "America/New_York" || resolvedTimezone === "US/Eastern") {
          timezone = usOffset === 240 ? "EDT" : "EST";
        } else if (resolvedTimezone === "America/Chicago" || resolvedTimezone === "US/Central") {
          timezone = usOffset === 300 ? "CDT" : "CST";
        } else if (resolvedTimezone === "America/Denver" || resolvedTimezone === "US/Mountain") {
          timezone = usOffset === 360 ? "MDT" : "MST";
        } else if (resolvedTimezone === "America/Los_Angeles" || resolvedTimezone === "US/Pacific") {
          timezone = usOffset === 420 ? "PDT" : "PST";
        } else if (resolvedTimezone === "America/Anchorage" || resolvedTimezone === "US/Alaska") {
          timezone = usOffset === 480 ? "AKDT" : "AKST";
        } else if (resolvedTimezone === "Pacific/Honolulu" || resolvedTimezone === "US/Hawaii") {
          timezone = "HST";
        } else if (resolvedTimezone === "America/Phoenix") {
          timezone = "MST";
        } else if (resolvedTimezone) {
          timezone = resolvedTimezone;
        }
      } catch (e) {
      }
    }
    var timestamp = timezone ? "Last updated: " + dateStr + " at " + timeStr + " (" + timezone + ")" : "Last updated: " + dateStr + " at " + timeStr;
    section.appendChild(makeText(timestamp, 11, FONT_REGULAR, COLOR_MUTED));
    try {
      var currentUserName = figma.currentUser && figma.currentUser.name ? figma.currentUser.name.trim() : "";
      if (currentUserName) {
        section.appendChild(makeText("By: " + currentUserName, 11, FONT_REGULAR, COLOR_MUTED));
      }
    } catch (e) {
    }
    return section;
  }
  function finalizeSheetWidth(sheet) {
    var targetWidth = SHEET_INNER_WIDTH;
    for (var i = 0; i < sheet.children.length; i++) {
      var child = sheet.children[i];
      if (!child || child.visible === false) continue;
      if (child.type !== "FRAME") continue;
      targetWidth = Math.max(targetWidth, child.width || 0);
    }
    sheet.counterAxisSizingMode = "FIXED";
    try {
      sheet.resizeWithoutConstraints(targetWidth, sheet.height || 1);
    } catch (e) {
    }
    for (var j = 0; j < sheet.children.length; j++) {
      var section = sheet.children[j];
      if (!section || section.visible === false) continue;
      if (section.type !== "FRAME") continue;
      try {
        section.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
  }
  function createNumberBadge(num, color) {
    var badge = figma.createFrame();
    badge.layoutMode = "NONE";
    badge.resize(24, 24);
    badge.cornerRadius = 12;
    badge.fills = solidPaint(WHITE);
    badge.strokes = solidPaint(color);
    badge.strokeWeight = 1;
    var n = makeText("" + num, 11, FONT_BOLD, color);
    n.resize(24, n.height);
    n.textAlignHorizontal = "CENTER";
    n.x = 0;
    n.y = 6;
    badge.appendChild(n);
    return badge;
  }
  function createCalloutRail(name, length, axis, color) {
    var rail = figma.createRectangle();
    rail.name = name;
    rail.fills = solidPaint(color, 0.6);
    rail.strokes = [];
    rail.cornerRadius = 0;
    var railLength = Math.max(1, Math.round(length));
    if (axis === "horizontal") {
      rail.resize(railLength, 1);
    } else {
      rail.resize(1, railLength);
    }
    return rail;
  }
  async function buildAnatomySheetSection(parent, node) {
    var section = makeSectionWrapper("Anatomy");
    var row = figma.createFrame();
    row.name = SPEC_PREFIX + "Anatomy Content";
    row.layoutMode = "VERTICAL";
    row.layoutAlign = "STRETCH";
    row.resize(SHEET_INNER_WIDTH - 48, 10);
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "FIXED";
    row.itemSpacing = 20;
    row.fills = [];
    var preview = figma.createFrame();
    preview.name = SPEC_PREFIX + "Anatomy Preview";
    preview.layoutMode = "NONE";
    preview.layoutAlign = "STRETCH";
    var ANATOMY_PAD_V = 32;
    var ANATOMY_MIN_H = 340;
    var ANATOMY_W = SHEET_INNER_WIDTH - 48;
    preview.resize(ANATOMY_W, ANATOMY_MIN_H);
    preview.primaryAxisSizingMode = "FIXED";
    preview.counterAxisSizingMode = "FIXED";
    preview.fills = [];
    preview.clipsContent = true;
    var previewCanvas = figma.createFrame();
    previewCanvas.name = SPEC_PREFIX + "Anatomy Preview Canvas";
    previewCanvas.layoutMode = "HORIZONTAL";
    previewCanvas.layoutAlign = "STRETCH";
    previewCanvas.resize(ANATOMY_W, ANATOMY_MIN_H);
    previewCanvas.primaryAxisSizingMode = "FIXED";
    previewCanvas.counterAxisSizingMode = "FIXED";
    previewCanvas.primaryAxisAlignItems = "CENTER";
    previewCanvas.counterAxisAlignItems = "CENTER";
    previewCanvas.fills = solidPaint(TOKEN_PREVIEW_BG);
    previewCanvas.cornerRadius = TOKEN_PREVIEW_RADIUS;
    previewCanvas.clipsContent = true;
    preview.appendChild(previewCanvas);
    previewCanvas.x = 0;
    previewCanvas.y = 0;
    var previewSource = await makePreviewSourceNode(node);
    try {
      var previewAsAny = previewSource;
      if (previewAsAny && typeof previewAsAny.setProperties === "function" && previewAsAny.componentProperties) {
        var boolUpdates = {};
        var compProps = previewAsAny.componentProperties || {};
        for (var cpKey in compProps) {
          if (!compProps.hasOwnProperty(cpKey)) continue;
          var entry = compProps[cpKey];
          if (!entry) continue;
          var entryType = normalizeComponentPropertyType(entry.type);
          if (entryType === "BOOLEAN") boolUpdates[cpKey] = true;
        }
        if (Object.keys(boolUpdates).length > 0) {
          previewAsAny.setProperties(boolUpdates);
        }
      }
    } catch (e) {
    }
    previewCanvas.appendChild(previewSource);
    var sourceNativeH = previewSource.height || 0;
    var neededH = Math.max(ANATOMY_MIN_H, sourceNativeH + ANATOMY_PAD_V * 2);
    if (neededH > ANATOMY_MIN_H) {
      previewCanvas.resize(ANATOMY_W, neededH);
      preview.resize(ANATOMY_W, neededH);
    }
    var previewClone = previewSource;
    var previewWrapperBounds = getNodeBounds(preview);
    var cloneBounds = getNodeBounds(previewClone);
    function makeBounds(n) {
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
    var markers = [];
    markers.push({ node: previewClone, name: node.name || "Component", type: "container", bounds: makeBounds(previewClone) });
    var markerQueue = [];
    var directKids = previewClone.children || [];
    for (var di = 0; di < directKids.length; di++) {
      if (directKids[di] && directKids[di].visible !== false) markerQueue.push({ node: directKids[di], depth: 1 });
    }
    for (var qi = 0; qi < markerQueue.length && markers.length < 10; qi++) {
      var qentry = markerQueue[qi];
      var layer = qentry.node;
      var lw = layer.width || 0;
      var lh = layer.height || 0;
      if (lw < 2 || lh < 2) continue;
      var mtype = qentry.depth === 1 ? "base" : "base-child";
      markers.push({ node: layer, name: layer.name || "Layer " + markers.length, type: mtype, bounds: makeBounds(layer) });
      if (qentry.depth < 2 && layer.children) {
        var kids = layer.children;
        for (var ki = 0; ki < kids.length; ki++) {
          if (kids[ki] && kids[ki].visible !== false) markerQueue.push({ node: kids[ki], depth: qentry.depth + 1 });
        }
      }
    }
    var placedMarkerCenters = [];
    function overlapsExisting(cx, cy) {
      for (var pm = 0; pm < placedMarkerCenters.length; pm++) {
        var dx = Math.abs(placedMarkerCenters[pm].x - cx);
        var dy = Math.abs(placedMarkerCenters[pm].y - cy);
        if (dx < 28 && dy < 28) return true;
      }
      return false;
    }
    function overlapsTextRect(left, top, width, height) {
      for (var mr = 0; mr < markers.length; mr++) {
        var textNode = markers[mr].node;
        if (!textNode || textNode.type !== "TEXT") continue;
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
    function getMarkerFrameRect(anchorX2, anchorY2, badgeCenterX2, badgeCenterY2, axis) {
      var badgeSize2 = 24;
      if (axis === "horizontal") {
        var hLeft = Math.min(anchorX2, badgeCenterX2 - badgeSize2 / 2);
        return {
          left: hLeft,
          top: badgeCenterY2 - badgeSize2 / 2,
          w: Math.max(badgeSize2, Math.abs(anchorX2 - badgeCenterX2) + badgeSize2),
          h: badgeSize2
        };
      }
      var vTop = Math.min(anchorY2, badgeCenterY2 - badgeSize2 / 2);
      return {
        left: badgeCenterX2 - badgeSize2 / 2,
        top: vTop,
        w: badgeSize2,
        h: Math.max(badgeSize2, Math.abs(anchorY2 - badgeCenterY2) + badgeSize2)
      };
    }
    function nudgeMarkerAwayFromText(markerType, bounds2, anchorX2, anchorY2, badgeCenterX2, badgeCenterY2, axis, isInstanceMarker2) {
      var candidates = [];
      if (markerType === "container") {
        candidates.push({ anchorX: bounds2.left, anchorY: bounds2.y, badgeCenterX: bounds2.left - 28, badgeCenterY: bounds2.y, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.x, anchorY: bounds2.top, badgeCenterX: bounds2.x + 28, badgeCenterY: bounds2.y, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.x, anchorY: bounds2.top, badgeCenterX: bounds2.x, badgeCenterY: bounds2.top - 28, axis: "vertical" });
        candidates.push({ anchorX: bounds2.x, anchorY: bounds2.top + bounds2.h, badgeCenterX: bounds2.x, badgeCenterY: bounds2.top + bounds2.h + 28, axis: "vertical" });
      } else if (isInstanceMarker2) {
        candidates.push({ anchorX: bounds2.left, anchorY: bounds2.y, badgeCenterX: bounds2.left - 28, badgeCenterY: bounds2.y, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.left, anchorY: bounds2.top - 12, badgeCenterX: bounds2.left - 28, badgeCenterY: bounds2.top - 12, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.left, anchorY: bounds2.top + bounds2.h + 12, badgeCenterX: bounds2.left - 28, badgeCenterY: bounds2.top + bounds2.h + 12, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.left - 12, anchorY: bounds2.y, badgeCenterX: bounds2.left - 40, badgeCenterY: bounds2.y, axis: "horizontal" });
      } else {
        candidates.push({ anchorX: bounds2.left + bounds2.w, anchorY: bounds2.y, badgeCenterX: bounds2.left + bounds2.w + 28, badgeCenterY: bounds2.y, axis: "horizontal" });
        candidates.push({ anchorX: bounds2.x, anchorY: bounds2.top, badgeCenterX: bounds2.x, badgeCenterY: bounds2.top - 28, axis: "vertical" });
        candidates.push({ anchorX: bounds2.x, anchorY: bounds2.top + bounds2.h, badgeCenterX: bounds2.x, badgeCenterY: bounds2.top + bounds2.h + 28, axis: "vertical" });
        candidates.push({ anchorX: bounds2.left, anchorY: bounds2.y, badgeCenterX: bounds2.left - 28, badgeCenterY: bounds2.y, axis: "horizontal" });
      }
      for (var c = 0; c < candidates.length; c++) {
        var candidate = candidates[c];
        var rect = getMarkerFrameRect(candidate.anchorX, candidate.anchorY, candidate.badgeCenterX, candidate.badgeCenterY, candidate.axis);
        if (!overlapsTextRect(rect.left, rect.top, rect.w, rect.h)) {
          return candidate;
        }
      }
      return { anchorX: anchorX2, anchorY: anchorY2, badgeCenterX: badgeCenterX2, badgeCenterY: badgeCenterY2, axis };
    }
    for (var m = 0; m < markers.length; m++) {
      var marker = markers[m];
      var bounds = marker.bounds;
      var isInstanceMarker = !!(marker.node && marker.node.type === "INSTANCE");
      var markerName = (marker.name || "").toLowerCase();
      var markerNodeType = (marker.node && marker.node.type ? marker.node.type : "").toString().toUpperCase();
      var isTextMarker = markerNodeType === "TEXT" || markerName.indexOf("label") >= 0 || markerName.indexOf("text") >= 0 || markerName.indexOf("copy") >= 0;
      var isIconMarker = markerName.indexOf("icon") >= 0 || markerNodeType === "VECTOR" || markerNodeType === "INSTANCE" || markerNodeType === "COMPONENT" || markerNodeType === "COMPONENT_SET" || bounds.w > 0 && bounds.h > 0 && bounds.w <= 36 && bounds.h <= 36;
      var forcedVerticalSide = isTextMarker ? "bottom" : isIconMarker ? "top" : null;
      var anchorX = bounds.x;
      var anchorY = bounds.y;
      var badgeCenterX = bounds.x;
      var badgeCenterY = bounds.y;
      if (marker.type === "container") {
        anchorX = bounds.left;
        anchorY = bounds.y;
        badgeCenterX = bounds.left - 28;
        badgeCenterY = bounds.y;
      } else if (forcedVerticalSide === "top") {
        anchorX = bounds.x;
        anchorY = bounds.top;
        badgeCenterX = bounds.x;
        badgeCenterY = bounds.top - 36;
      } else if (forcedVerticalSide === "bottom") {
        anchorX = bounds.x;
        anchorY = bounds.top + bounds.h;
        badgeCenterX = bounds.x;
        badgeCenterY = anchorY + 36;
      } else if (isInstanceMarker) {
        anchorX = bounds.left;
        anchorY = bounds.y;
        badgeCenterX = bounds.left - 28;
        badgeCenterY = bounds.y;
      } else if (marker.type === "base") {
        anchorX = bounds.x;
        anchorY = bounds.top;
        badgeCenterY = bounds.top - 60;
        badgeCenterX = bounds.x;
      } else if (marker.type === "base-child") {
        anchorX = bounds.x;
        anchorY = bounds.top;
        badgeCenterY = bounds.top - 30;
        badgeCenterX = bounds.x;
      } else {
        anchorX = bounds.x;
        anchorY = bounds.top + bounds.h;
        badgeCenterY = anchorY + 28;
        badgeCenterX = bounds.x;
      }
      if (overlapsExisting(badgeCenterX, badgeCenterY)) {
        var tries = 0;
        while (overlapsExisting(badgeCenterX, badgeCenterY) && tries < 40) {
          if (forcedVerticalSide) {
            badgeCenterX += tries % 2 === 0 ? 14 : -14;
            badgeCenterY += forcedVerticalSide === "top" ? -10 : 10;
          } else if (marker.type === "container") {
            badgeCenterX -= 20;
          } else if (marker.type === "base") {
            badgeCenterX += tries % 2 === 0 ? 35 : -35;
          } else if (isInstanceMarker) {
            badgeCenterX -= 20;
          } else if (marker.type === "base-child") {
            badgeCenterX += tries % 2 === 0 ? 30 : -30;
          } else {
            if (tries % 2 === 0) {
              badgeCenterY += 20;
            } else {
              badgeCenterX += tries % 4 === 1 ? 30 : -30;
            }
          }
          tries++;
        }
      }
      var leaderAxis = marker.type === "container" ? "horizontal" : "vertical";
      if (forcedVerticalSide) {
        var textSafeTries = 0;
        while (textSafeTries < 20) {
          var forcedRect = getMarkerFrameRect(anchorX, anchorY, badgeCenterX, badgeCenterY, "vertical");
          if (!overlapsTextRect(forcedRect.left, forcedRect.top, forcedRect.w, forcedRect.h)) break;
          badgeCenterX += textSafeTries % 2 === 0 ? 12 : -12;
          badgeCenterY += forcedVerticalSide === "top" ? -10 : 10;
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
      badge.name = "Callout-Badge-" + (m + 1);
      var markerFrame = figma.createFrame();
      markerFrame.name = SPEC_PREFIX + "Marker-" + (m + 1) + " [" + marker.name + "]";
      markerFrame.layoutMode = leaderAxis === "horizontal" ? "HORIZONTAL" : "VERTICAL";
      markerFrame.primaryAxisSizingMode = "FIXED";
      markerFrame.counterAxisSizingMode = "FIXED";
      markerFrame.primaryAxisAlignItems = "CENTER";
      markerFrame.counterAxisAlignItems = "CENTER";
      markerFrame.itemSpacing = 0;
      markerFrame.paddingTop = 0;
      markerFrame.paddingBottom = 0;
      markerFrame.paddingLeft = 0;
      markerFrame.paddingRight = 0;
      markerFrame.fills = [];
      markerFrame.strokes = [];
      markerFrame.clipsContent = false;
      if (leaderAxis === "horizontal") {
        var horizontalRailLength = Math.max(1, Math.round(Math.abs(anchorX - badgeCenterX) - 12));
        var horizontalRail = createCalloutRail("Callout-Line-" + (m + 1), horizontalRailLength, "horizontal", TOKEN_MARKER_COLOR);
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
        var verticalRail = createCalloutRail("Callout-Line-" + (m + 1), verticalRailLength, "vertical", TOKEN_MARKER_COLOR);
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
      preview.appendChild(markerFrame);
    }
    var detail = figma.createFrame();
    detail.name = SPEC_PREFIX + "Anatomy Legend";
    detail.layoutMode = "VERTICAL";
    detail.layoutAlign = "STRETCH";
    detail.resize(SHEET_INNER_WIDTH - 48, 10);
    detail.primaryAxisSizingMode = "AUTO";
    detail.counterAxisSizingMode = "FIXED";
    detail.itemSpacing = 10;
    detail.clipsContent = false;
    detail.fills = [];
    function makeLegendIndexBadge(index) {
      var b = figma.createFrame();
      b.layoutMode = "VERTICAL";
      b.resize(18, 10);
      b.primaryAxisSizingMode = "AUTO";
      b.counterAxisSizingMode = "FIXED";
      b.primaryAxisAlignItems = "CENTER";
      b.counterAxisAlignItems = "CENTER";
      b.paddingTop = 4;
      b.paddingBottom = 4;
      b.paddingLeft = 0;
      b.paddingRight = 0;
      b.cornerRadius = 9;
      b.fills = solidPaint(TOKEN_MARKER_COLOR);
      b.strokes = solidPaint(TOKEN_MARKER_COLOR);
      var t = makeText("" + index, 9, FONT_BOLD, WHITE);
      t.resize(18, t.height);
      t.textAlignHorizontal = "CENTER";
      b.appendChild(t);
      return b;
    }
    async function makeLegendRow(index, sourceNode, title, nodeType, width, height) {
      var rowItem = figma.createFrame();
      rowItem.layoutMode = "HORIZONTAL";
      rowItem.primaryAxisSizingMode = "AUTO";
      rowItem.counterAxisSizingMode = "AUTO";
      rowItem.counterAxisAlignItems = "MIN";
      rowItem.itemSpacing = 10;
      rowItem.fills = [];
      rowItem.strokes = [];
      rowItem.clipsContent = false;
      var indexBadge = makeLegendIndexBadge(index);
      rowItem.appendChild(indexBadge);
      var content = figma.createFrame();
      content.layoutMode = "VERTICAL";
      content.primaryAxisSizingMode = "AUTO";
      content.counterAxisSizingMode = "AUTO";
      content.itemSpacing = 2;
      content.fills = [];
      content.strokes = [];
      content.clipsContent = false;
      var headRow = figma.createFrame();
      headRow.layoutMode = "HORIZONTAL";
      headRow.primaryAxisSizingMode = "AUTO";
      headRow.counterAxisSizingMode = "AUTO";
      headRow.counterAxisAlignItems = "CENTER";
      headRow.itemSpacing = 5;
      headRow.fills = [];
      headRow.strokes = [];
      headRow.appendChild(makeText(getTypeIcon(nodeType), 11, FONT_MEDIUM, COLOR_LABEL));
      headRow.appendChild(makeText(title, 11, FONT_BOLD, COLOR_HEADER));
      content.appendChild(headRow);
      content.appendChild(makeText(getTypeTag(nodeType), 10, FONT_MEDIUM, COLOR_MUTED));
      content.appendChild(makeText(Math.round(width) + " \xD7 " + Math.round(height), 10, FONT_REGULAR, COLOR_MUTED));
      try {
        var tokenRows = await collectDirectVariableUsageRows(sourceNode);
        var filtered = tokenRows.filter(function(r) {
          return r.previewKind === "color" || r.previewKind === "radius" || r.previewKind === "spacing";
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
          }, "Anatomy Legend Token " + index + "-" + (tr + 1)));
        }
      } catch (e) {
      }
      rowItem.appendChild(content);
      return rowItem;
    }
    for (var legendIdx = 0; legendIdx < markers.length; legendIdx++) {
      var markerData = markers[legendIdx];
      var legendNode = markerData.node;
      detail.appendChild(
        await makeLegendRow(
          legendIdx + 1,
          legendNode,
          markerData.name,
          legendNode.type || "UNKNOWN",
          legendNode.width || markerData.bounds.w,
          legendNode.height || markerData.bounds.h
        )
      );
    }
    row.appendChild(preview);
    row.appendChild(detail);
    section.appendChild(row);
    try {
      row.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    parent.appendChild(section);
  }
  function getPropertyBaseName(name) {
    var hashIdx = name.indexOf("#");
    return hashIdx > 0 ? name.substring(0, hashIdx) : name;
  }
  function isStatePropertyName(name) {
    return getPropertyBaseName(name).trim().toLowerCase() === "state";
  }
  async function getVariantStatePropertyInfoAsync(node) {
    if (!node) return null;
    if (node.type === "COMPONENT_SET") {
      var csDefs = node.componentPropertyDefinitions || {};
      for (var csKey in csDefs) {
        if (!csDefs.hasOwnProperty(csKey)) continue;
        var csDef = csDefs[csKey];
        if (!csDef || normalizeComponentPropertyType(csDef.type) !== "VARIANT" || !isStatePropertyName(csKey)) continue;
        var csStates = Array.isArray(csDef.variantOptions) ? csDef.variantOptions.filter(function(o) {
          return !!o;
        }) : [];
        if (csStates.length === 0) continue;
        return {
          propertyKey: csKey,
          states: csStates,
          currentState: csDef.defaultValue || csStates[0] || ""
        };
      }
      return null;
    }
    if (node.type === "INSTANCE") {
      var mainComp = null;
      try {
        mainComp = await node.getMainComponentAsync();
      } catch (e) {
      }
      if (!mainComp) return null;
      var parentSet = mainComp.parent;
      var instanceDefs = parentSet && parentSet.type === "COMPONENT_SET" ? parentSet.componentPropertyDefinitions : mainComp.componentPropertyDefinitions;
      var instanceProps = node.componentProperties || {};
      for (var instanceKey in instanceProps) {
        if (!instanceProps.hasOwnProperty(instanceKey)) continue;
        var instanceEntry = instanceProps[instanceKey];
        var instanceDef = instanceDefs ? instanceDefs[instanceKey] : null;
        var instanceType = normalizeComponentPropertyType(instanceDef ? instanceDef.type : instanceEntry ? instanceEntry.type : null);
        if (!instanceEntry || instanceType !== "VARIANT" || !isStatePropertyName(instanceKey)) continue;
        var instanceStates = instanceDef && Array.isArray(instanceDef.variantOptions) ? instanceDef.variantOptions.filter(function(option) {
          return !!option;
        }) : [];
        if (instanceStates.length === 0) return null;
        return {
          propertyKey: instanceKey,
          states: instanceStates,
          currentState: instanceEntry.value || (instanceDef ? instanceDef.defaultValue : "") || ""
        };
      }
    }
    if (node.type === "COMPONENT") {
      var componentSet = node.parent;
      if (!componentSet || componentSet.type !== "COMPONENT_SET") return null;
      var componentDefs = componentSet.componentPropertyDefinitions || null;
      if (!componentDefs) return null;
      for (var componentKey in componentDefs) {
        if (!componentDefs.hasOwnProperty(componentKey)) continue;
        var componentDef = componentDefs[componentKey];
        if (!componentDef || normalizeComponentPropertyType(componentDef.type) !== "VARIANT" || !isStatePropertyName(componentKey)) continue;
        var componentStates = Array.isArray(componentDef.variantOptions) ? componentDef.variantOptions.filter(function(option) {
          return !!option;
        }) : [];
        if (componentStates.length === 0) return null;
        var baseName = getPropertyBaseName(componentKey);
        var variantProps = node.variantProperties || {};
        return {
          propertyKey: componentKey,
          states: componentStates,
          currentState: variantProps[baseName] || variantProps[componentKey] || componentDef.defaultValue || ""
        };
      }
    }
    return null;
  }
  async function findStateTargetAsync(node) {
    var rootInfo = await getVariantStatePropertyInfoAsync(node);
    if (rootInfo) {
      var previewSrc = node.type === "COMPONENT" || node.type === "COMPONENT_SET" ? "instance-from-component" : "clone-selection";
      var instanceSrc = node.type === "COMPONENT_SET" ? node.defaultVariant || node.children[0] : void 0;
      return {
        propertyKey: rootInfo.propertyKey,
        states: rootInfo.states,
        currentState: rootInfo.currentState,
        previewSource: previewSrc,
        instanceSource: instanceSrc,
        targetPath: [],
        targetName: node.name || "Selected component"
      };
    }
    return null;
  }
  function resolveNodeAtPath(root, path) {
    var current = root;
    for (var i = 0; i < path.length; i++) {
      if (!current || !("children" in current)) return null;
      var children = current.children || [];
      if (path[i] < 0 || path[i] >= children.length) return null;
      current = children[path[i]];
    }
    return current;
  }
  function resolveInstanceSwapName(nodeId) {
    if (!nodeId || typeof nodeId !== "string") return "None";
    try {
      var swapNode = figma.getNodeById(nodeId);
      if (swapNode) return swapNode.name;
    } catch (e) {
    }
    return nodeId;
  }
  function formatPropertyValueLabel(propType, rawValue) {
    if (propType === "BOOLEAN") return rawValue ? "true" : "false";
    if (propType === "INSTANCE_SWAP") return resolveInstanceSwapName(rawValue);
    if (rawValue === void 0 || rawValue === null) return "";
    return "" + rawValue;
  }
  function getPropertyVariablePreviewKind(propType, variableType) {
    if (variableType === "COLOR") return "color";
    if (propType === "TEXT") return "text";
    if (variableType === "FLOAT") return "number";
    return "token";
  }
  async function resolvePropertyVariableRefsAsync(propertyKey, propType, def, currentEntry, consumer) {
    var refs = [];
    var seen = {};
    async function appendRef(label, alias) {
      if (!alias || typeof alias !== "object") return;
      var details = await resolveVariableDetails(alias.id || "", alias, consumer);
      var identity = getVariableDedupIdentity(alias.id || "", alias, details);
      if (seen[identity]) return;
      seen[identity] = true;
      refs.push({
        label,
        name: details.name,
        variableId: details.variableId,
        fallbackValue: details.fallbackValue,
        fallbackColor: details.fallbackColor,
        previewKind: getPropertyVariablePreviewKind(propType, details.type)
      });
    }
    var currentAlias = currentEntry && currentEntry.boundVariables ? currentEntry.boundVariables.value : null;
    var defaultAlias = def && def.boundVariables ? def.boundVariables.value : null;
    await appendRef("Current token", currentAlias);
    await appendRef("Default token", defaultAlias);
    return refs;
  }
  function makeInlineVariablePreviewNode(previewKind, fallbackColor, indexName, variableId) {
    if (previewKind === "color" && fallbackColor) {
      var swatch = figma.createRectangle();
      swatch.name = indexName + " Swatch";
      swatch.resize(12, 12);
      var swatchPaint = solidPaint(fallbackColor)[0];
      if (variableId) {
        try {
          var colorVariable = resolveVariableFromBinding(variableId, null);
          if (colorVariable) {
            swatchPaint = figma.variables.setBoundVariableForPaint(swatchPaint, "color", colorVariable);
          }
        } catch (e) {
        }
      }
      swatch.fills = [swatchPaint];
      swatch.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
      swatch.strokeWeight = 1;
      return swatch;
    }
    var chip = figma.createFrame();
    chip.name = indexName + " Icon";
    chip.layoutMode = "HORIZONTAL";
    chip.primaryAxisSizingMode = "FIXED";
    chip.counterAxisSizingMode = "FIXED";
    chip.resize(14, 14);
    chip.cornerRadius = 3;
    chip.primaryAxisAlignItems = "CENTER";
    chip.counterAxisAlignItems = "CENTER";
    chip.fills = solidPaint({ r: 0.96, g: 0.96, b: 0.97 });
    chip.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
    chip.strokeWeight = 1;
    var glyph = "#";
    if (previewKind === "text") glyph = "T";
    else if (previewKind === "token") glyph = "\u2022";
    var iconText = makeText(glyph, 8, FONT_BOLD, COLOR_LABEL);
    iconText.name = indexName + " Icon Label";
    iconText.textAutoResize = "WIDTH_AND_HEIGHT";
    chip.appendChild(iconText);
    return chip;
  }
  function makePropertyVariableRefRow(ref, indexName) {
    var row = figma.createFrame();
    row.name = indexName + " Row";
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.counterAxisAlignItems = "CENTER";
    row.itemSpacing = 6;
    row.fills = [];
    var label = makeText(ref.label, 10, FONT_MEDIUM, COLOR_MUTED);
    var badge = figma.createFrame();
    badge.name = indexName + " Badge";
    badge.layoutMode = "HORIZONTAL";
    badge.primaryAxisSizingMode = "AUTO";
    badge.counterAxisSizingMode = "AUTO";
    badge.counterAxisAlignItems = "CENTER";
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
    if (ref.fallbackValue && ref.fallbackValue !== "-") {
      badge.appendChild(makeText("(" + ref.fallbackValue + ")", 10, FONT_REGULAR, COLOR_MUTED));
    }
    row.appendChild(label);
    row.appendChild(badge);
    return row;
  }
  function makeLayoutMetricRow(label, tokenName, fallbackPx, indexName) {
    return makePropertyVariableRefRow({
      label,
      name: tokenName || fallbackPx,
      variableId: "",
      fallbackValue: tokenName ? fallbackPx : "",
      fallbackColor: null,
      previewKind: "spacing"
    }, indexName);
  }
  function getPropertyVariableRefBaseKey(ref) {
    return ref.name + "|" + ref.previewKind + "|" + ref.label;
  }
  function getPropertyVariableRefUniqueKey(ref) {
    return getPropertyVariableRefBaseKey(ref) + "|" + (ref.fallbackValue || "-");
  }
  function getPropertyVariableRefSortRank(ref) {
    if (ref.previewKind === "color") return 0;
    if (ref.previewKind === "radius") return 1;
    if (ref.previewKind === "spacing") return 2;
    if (ref.previewKind === "number") return 3;
    if (ref.previewKind === "text") return 4;
    return 5;
  }
  function formatStateSpecificVariableLabel(stateTitle, appliedAs) {
    var cleanState = (stateTitle || "").trim();
    var cleanApplied = (appliedAs || "").trim();
    if (!cleanState) return cleanApplied;
    var lowerState = cleanState.toLowerCase();
    if (lowerState === "default" || lowerState === "current") return cleanApplied;
    if (!cleanApplied) return cleanState;
    return cleanState + " " + cleanApplied.toLowerCase();
  }
  async function collectContextualVariableRefsForCard(node, stateTarget, spec) {
    var refs = [];
    var tempPreview = makeLightPreviewPanel(1, 1);
    try {
      var previewResult = await buildStatePreviewNode(node, tempPreview, stateTarget, spec.propertyKey, spec.value);
      if (!previewResult.previewRoot) return refs;
      try {
        var basePreviewRoot = null;
        try {
          if (stateTarget.previewSource === "instance-from-component") {
            var baseInstanceSource = stateTarget.instanceSource || node;
            basePreviewRoot = baseInstanceSource.createInstance();
          } else {
            basePreviewRoot = await makePreviewSourceNode(node);
          }
        } catch (e) {
        }
        var baseUsageRows = [];
        try {
          if (basePreviewRoot) {
            baseUsageRows = await collectVariableUsageRows(basePreviewRoot, false);
          }
        } finally {
          if (basePreviewRoot && basePreviewRoot.remove) {
            try {
              basePreviewRoot.remove();
            } catch (e) {
            }
          }
        }
        var baseColorByKey = {};
        var baseTextByKey = {};
        for (var bu = 0; bu < baseUsageRows.length; bu++) {
          var baseRow = baseUsageRows[bu];
          var baseKey = baseRow.variableName + "|" + baseRow.previewKind + "|" + baseRow.appliedAs;
          if (baseRow.previewKind === "color" && baseRow.fallbackColor) {
            baseColorByKey[baseKey] = rgbToHex(baseRow.fallbackColor);
          } else if (baseRow.previewKind === "text") {
            baseTextByKey[baseKey] = baseRow.fallbackValue || "-";
          }
        }
        var usageRows = await collectVariableUsageRows(previewResult.previewRoot, false);
        for (var ur = 0; ur < usageRows.length; ur++) {
          var usageRow = usageRows[ur];
          var usageKey = usageRow.variableName + "|" + usageRow.previewKind + "|" + usageRow.appliedAs;
          if (usageRow.previewKind === "color" && usageRow.fallbackColor) {
            var usageColorHex = rgbToHex(usageRow.fallbackColor);
            if (baseColorByKey[usageKey] && baseColorByKey[usageKey] === usageColorHex) {
              continue;
            }
          } else if (usageRow.previewKind === "text") {
            var baseTextValue = baseTextByKey[usageKey];
            if (baseTextValue !== void 0 && baseTextValue === (usageRow.fallbackValue || "-")) {
              continue;
            }
          }
          var label = usageRow.appliedAs;
          if (usageRow.previewKind === "color") {
            label = formatStateSpecificVariableLabel(spec.title, usageRow.appliedAs);
          }
          refs.push({
            label,
            name: usageRow.variableName,
            variableId: usageRow.variableId,
            fallbackValue: usageRow.fallbackValue,
            fallbackColor: usageRow.fallbackColor,
            previewKind: usageRow.previewKind
          });
        }
      } catch (e) {
      }
    } finally {
      if (tempPreview && tempPreview.parent) {
        tempPreview.remove();
      }
    }
    return refs;
  }
  function buildPropertyPreviewTarget(node, stateTarget) {
    if (stateTarget) {
      return {
        previewSource: stateTarget.previewSource,
        instanceSource: stateTarget.instanceSource,
        targetPath: stateTarget.targetPath,
        targetName: stateTarget.targetName
      };
    }
    var previewSrc = node.type === "COMPONENT" || node.type === "COMPONENT_SET" ? "instance-from-component" : "clone-selection";
    var instanceSrc = node.type === "COMPONENT_SET" ? node.defaultVariant || node.children[0] : void 0;
    return {
      previewSource: previewSrc,
      instanceSource: instanceSrc,
      targetPath: [],
      targetName: node.name || "Selected component"
    };
  }
  async function buildStatePreviewNode(node, panel, stateTarget, propertyKey, propertyValue) {
    var previewRoot;
    if (stateTarget.previewSource === "instance-from-component") {
      var instSrc = stateTarget.instanceSource || node;
      previewRoot = instSrc.createInstance();
      centerNodeInPanel(previewRoot, panel, Math.max(1, panel.width || PROPERTIES_CARD_WIDTH), Math.max(1, panel.height || 210), false);
    } else {
      previewRoot = await makePreviewSourceNode(node);
      centerNodeInPanel(previewRoot, panel, Math.max(1, panel.width || PROPERTIES_CARD_WIDTH), Math.max(1, panel.height || 210), false);
    }
    var target = resolveNodeAtPath(previewRoot, stateTarget.targetPath);
    if (!target || typeof target.setProperties !== "function") return { previewRoot, target: null };
    var propertyUpdate = {};
    propertyUpdate[propertyKey] = propertyValue;
    try {
      target.setProperties(propertyUpdate);
    } catch (e) {
    }
    try {
      centerNodeInPanel(previewRoot, panel, Math.max(1, panel.width || PROPERTIES_CARD_WIDTH), Math.max(1, panel.height || 210), false);
    } catch (e) {
    }
    return { previewRoot, target };
  }
  async function makeStateCard(title, node, stateTarget, spec, precomputedContextualRefs, allowedVariantRefBaseKeys, cardWidth) {
    var width = cardWidth || PROPERTIES_CARD_WIDTH;
    var card = makeVerticalAutoFrame(width);
    card.name = SPEC_PREFIX + title + " Property";
    card.itemSpacing = 10;
    card.fills = [];
    var preview = makeLightPreviewPanel(width, 150);
    preview.name = SPEC_PREFIX + title + " Preview";
    var previewResult = await buildStatePreviewNode(node, preview, stateTarget, spec.propertyKey, spec.value);
    var contextualRefs = precomputedContextualRefs || [];
    if (!precomputedContextualRefs && previewResult.previewRoot) {
      contextualRefs = await collectContextualVariableRefsForCard(node, stateTarget, spec);
    }
    var allRefs = [];
    var seenRef = {};
    function appendRefs(list) {
      for (var i2 = 0; i2 < list.length; i2++) {
        var ref2 = list[i2];
        if (allowedVariantRefBaseKeys && !allowedVariantRefBaseKeys[getPropertyVariableRefBaseKey(ref2)]) continue;
        var refKey = getPropertyVariableRefUniqueKey(ref2);
        if (seenRef[refKey]) continue;
        seenRef[refKey] = true;
        allRefs.push(ref2);
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
    card.appendChild(makeText(title, 30, FONT_BOLD, COLOR_HEADER));
    card.appendChild(makeNodeLabel(stateTarget.targetName, node.type, 11, false));
    card.appendChild(makeText("Property: " + getPropertyBaseName(spec.propertyKey), 11, FONT_REGULAR, COLOR_VALUE));
    for (var vr = 0; vr < allRefs.length; vr++) {
      var ref = allRefs[vr];
      if (ref.previewKind === "color" || ref.previewKind === "text" && ref.label === "Font style") {
        card.appendChild(makePropertyVariableRefRow(ref, SPEC_PREFIX + title + " Property Variable " + (vr + 1)));
      }
    }
    for (var i = 0; i < spec.metaLines.length; i++) {
      card.appendChild(makeText(spec.metaLines[i], 10, FONT_REGULAR, COLOR_MUTED));
    }
    try {
      card.resizeWithoutConstraints(width, card.height || 1);
    } catch (e) {
    }
    return card;
  }
  async function getPropertyDefinitionsForNodeAsync(node) {
    if (!node) return null;
    if (node.type === "INSTANCE") {
      var mainComp = null;
      try {
        mainComp = await node.getMainComponentAsync();
      } catch (e) {
      }
      if (!mainComp) return null;
      var parentSet = mainComp.parent;
      var defs = parentSet && parentSet.type === "COMPONENT_SET" ? parentSet.componentPropertyDefinitions : mainComp.componentPropertyDefinitions;
      return {
        defs: defs || {},
        currentProps: node.componentProperties || {}
      };
    }
    if (node.type === "COMPONENT_SET") {
      return {
        defs: node.componentPropertyDefinitions || {},
        currentProps: {}
      };
    }
    if (node.type === "COMPONENT") {
      var componentSet = node.parent;
      var componentDefs = componentSet && componentSet.type === "COMPONENT_SET" ? componentSet.componentPropertyDefinitions : node.componentPropertyDefinitions;
      return {
        defs: componentDefs || {},
        currentProps: node.variantProperties || {}
      };
    }
    return null;
  }
  async function createPropertyCardsForDefinition(propertyKey, propType, def, currentRawValue, defaultRawValue, currentEntry, consumer) {
    var cards = [];
    var currentLabel = formatPropertyValueLabel(propType, currentRawValue);
    var defaultLabel = formatPropertyValueLabel(propType, defaultRawValue);
    var variableRefs = await resolvePropertyVariableRefsAsync(propertyKey, propType, def, currentEntry, consumer);
    if (propType === "VARIANT") {
      var options = Array.isArray(def.variantOptions) ? def.variantOptions.filter(function(option2) {
        return !!option2;
      }) : [];
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        cards.push({
          title: option,
          propertyKey,
          propertyType: propType,
          value: option,
          valueLabel: option,
          variableRefs,
          metaLines: []
        });
      }
      return cards;
    }
    if (propType === "BOOLEAN") {
      cards.push({
        title: currentLabel || "Current",
        propertyKey,
        propertyType: propType,
        value: !!currentRawValue,
        valueLabel: currentLabel,
        variableRefs,
        metaLines: []
      });
      return cards;
    }
    if (propType === "TEXT") {
      cards.push({
        title: currentLabel || "Current",
        propertyKey,
        propertyType: propType,
        value: currentRawValue === void 0 || currentRawValue === null ? "" : "" + currentRawValue,
        valueLabel: currentLabel,
        variableRefs,
        metaLines: []
      });
      if (currentLabel !== defaultLabel) {
        cards.push({
          title: defaultLabel || "Default",
          propertyKey,
          propertyType: propType,
          value: defaultRawValue === void 0 || defaultRawValue === null ? "" : "" + defaultRawValue,
          valueLabel: defaultLabel,
          variableRefs,
          metaLines: []
        });
      }
      return cards;
    }
    if (propType === "INSTANCE_SWAP") {
      cards.push({
        title: currentLabel || "Current instance",
        propertyKey,
        propertyType: propType,
        value: currentRawValue === void 0 || currentRawValue === null ? "" : "" + currentRawValue,
        valueLabel: currentLabel,
        variableRefs,
        metaLines: []
      });
      if (currentLabel !== defaultLabel) {
        cards.push({
          title: defaultLabel || "Default instance",
          propertyKey,
          propertyType: propType,
          value: defaultRawValue === void 0 || defaultRawValue === null ? "" : "" + defaultRawValue,
          valueLabel: defaultLabel,
          variableRefs,
          metaLines: []
        });
      }
      return cards;
    }
    return cards;
  }
  function createPropertyGroupGrid(columnWidth) {
    var width = columnWidth || PROPERTIES_CARD_WIDTH;
    var grid = figma.createFrame();
    grid.layoutMode = "GRID";
    grid.gridColumnCount = 2;
    grid.gridRowCount = 1;
    grid.gridColumnGap = 24;
    grid.gridRowGap = 24;
    grid.counterAxisSizingMode = "AUTO";
    grid.layoutSizingHorizontal = "HUG";
    grid.layoutSizingVertical = "HUG";
    grid.fills = [];
    try {
      grid.gridColumnSizes[0].type = "FIXED";
      grid.gridColumnSizes[0].value = width;
      grid.gridColumnSizes[1].type = "FIXED";
      grid.gridColumnSizes[1].value = width;
    } catch (e) {
    }
    return grid;
  }
  function toTitleCaseLayout(value) {
    if (!value) return "None";
    var v = value.toLowerCase();
    return v.charAt(0).toUpperCase() + v.substring(1);
  }
  function getLayoutDirectionLabel(node) {
    var mode = node && node.layoutMode ? node.layoutMode : "NONE";
    if (mode === "HORIZONTAL") return "Horizontal";
    if (mode === "VERTICAL") return "Vertical";
    return "None";
  }
  function getSizingModeLabel(raw) {
    if (raw === "HUG") return "Hug";
    if (raw === "FILL") return "Fill";
    if (raw === "FIXED") return "Fixed";
    return "Inferred";
  }
  function getAlignmentLabel(node) {
    var main = node && node.primaryAxisAlignItems ? node.primaryAxisAlignItems : "MIN";
    var cross = node && node.counterAxisAlignItems ? node.counterAxisAlignItems : "MIN";
    return toTitleCaseLayout(main) + " / " + toTitleCaseLayout(cross);
  }
  function getPaddingValue(node, prop) {
    if (node && typeof node[prop] === "number") return node[prop];
    if (node && node.inferredAutoLayout && typeof node.inferredAutoLayout[prop] === "number") return node.inferredAutoLayout[prop];
    return 0;
  }
  function getItemSpacingValue(node) {
    if (node && typeof node.itemSpacing === "number") return node.itemSpacing;
    if (node && node.inferredAutoLayout && typeof node.inferredAutoLayout.itemSpacing === "number") return node.inferredAutoLayout.itemSpacing;
    return 0;
  }
  function makeGuideLabel(text, color) {
    var label = makeText(text, 12, FONT_BOLD, color);
    label.fills = solidPaint(color);
    return label;
  }
  function formatGuideValue(value) {
    if (!isFinite(value)) return "0";
    return "" + Math.round(value);
  }
  function drawAutoLayoutGuides(targetClone, panel, sourceInfo, depth, baseX, baseY, mainCompNode) {
    if (!targetClone || !sourceInfo) return;
    var mode = sourceInfo.layoutMode || (sourceInfo.inferredAutoLayout ? sourceInfo.inferredAutoLayout.layoutMode : "NONE");
    if (!mode || mode === "NONE") return;
    depth = depth || 0;
    baseX = baseX || 0;
    baseY = baseY || 0;
    var x = (targetClone.x || 0) + baseX;
    var y = (targetClone.y || 0) + baseY;
    var w = targetClone.width || 0;
    var h = targetClone.height || 0;
    if (w <= 0 || h <= 0) return;
    var leftBand = x - 24;
    var topBand = y - 24;
    var rightBand = x + w + 8;
    var bottomBand = y + h + 8;
    if (depth === 0 && targetClone.opacity !== void 0) {
      targetClone.opacity = 0.8;
    }
    var pt = getPaddingValue(sourceInfo, "paddingTop");
    var pr = getPaddingValue(sourceInfo, "paddingRight");
    var pb = getPaddingValue(sourceInfo, "paddingBottom");
    var pl = getPaddingValue(sourceInfo, "paddingLeft");
    if (depth === 0) {
      var MIN_ARROW = 64;
      var GRID_SIZE = 32;
      var ARROW_X = 24 + GRID_SIZE + 24;
      var ARROW_Y = 24;
      if (mode === "HORIZONTAL") {
        var hArrow = figma.createLine();
        hArrow.name = "Direction-Arrow [HORIZONTAL]";
        hArrow.strokes = solidPaint(COLOR_ACCENT, 1);
        hArrow.strokeWeight = 2;
        hArrow.strokeCap = "ARROW_LINES";
        hArrow.resize(GRID_SIZE, 0);
        hArrow.x = ARROW_X;
        hArrow.y = ARROW_Y + GRID_SIZE / 2;
        panel.appendChild(hArrow);
      } else {
        var vArrow = figma.createLine();
        vArrow.name = "Direction-Arrow [VERTICAL]";
        vArrow.strokes = solidPaint(COLOR_ACCENT, 1);
        vArrow.strokeWeight = 2;
        vArrow.strokeCap = "ARROW_LINES";
        vArrow.resize(GRID_SIZE, 0);
        vArrow.rotation = -90;
        vArrow.x = ARROW_X;
        vArrow.y = ARROW_Y;
        panel.appendChild(vArrow);
      }
    }
    var PROP_SIDE = { Top: "paddingTop", Right: "paddingRight", Bottom: "paddingBottom", Left: "paddingLeft" };
    function addPadRect(rx, ry, rw, rh, value, side) {
      if (rw <= 0 || rh <= 0) return;
      var wrapper = figma.createFrame();
      wrapper.name = "Padding-" + side + "-" + value + "px";
      wrapper.layoutMode = "NONE";
      wrapper.resize(rw, rh);
      wrapper.fills = [];
      wrapper.strokes = [];
      wrapper.clipsContent = false;
      var r = figma.createRectangle();
      r.name = "Padding-" + side + "-" + value + "px [Overlay]";
      r.resize(rw, rh);
      r.fills = solidPaint(COLOR_SPACING, 0.2);
      r.strokes = [];
      r.x = 0;
      r.y = 0;
      var propKey = PROP_SIDE[side] || "";
      var alias = propKey ? resolveVarAlias(sourceInfo, propKey, void 0, mainCompNode) : "";
      var labelText = alias ? shortTokenName(alias) : formatGuideValue(value);
      var t = makeGuideLabel(labelText, COLOR_SPACING);
      t.name = "Padding-" + side + "-" + value + "px [Label]";
      var lw = t.width || 20;
      var lh = t.height || 14;
      if (side === "Top") {
        t.x = Math.round(rw / 2 - lw / 2);
        t.y = -(lh + 3);
      } else if (side === "Bottom") {
        t.x = Math.round(rw / 2 - lw / 2);
        t.y = rh + 3;
      } else if (side === "Left") {
        t.x = -(lw + 4);
        t.y = Math.round(rh / 2 - lh / 2);
      } else {
        t.x = rw + 4;
        t.y = Math.round(rh / 2 - lh / 2);
      }
      wrapper.appendChild(r);
      wrapper.appendChild(t);
      wrapper.x = rx;
      wrapper.y = ry;
      panel.appendChild(wrapper);
    }
    addPadRect(x, y, w, pt, pt, "Top");
    addPadRect(x + w - pr, y, pr, h, pr, "Right");
    addPadRect(x, y + h - pb, w, pb, pb, "Bottom");
    addPadRect(x, y, pl, h, pl, "Left");
    var spacing = getItemSpacingValue(sourceInfo);
    if (spacing <= 0 || !targetClone.children || targetClone.children.length < 2) return;
    var visibleChildren = [];
    for (var i = 0; i < targetClone.children.length; i++) {
      var c = targetClone.children[i];
      if (c && c.visible !== false) visibleChildren.push(c);
    }
    if (visibleChildren.length < 2) return;
    for (var idx = 0; idx < visibleChildren.length - 1; idx++) {
      var a = visibleChildren[idx];
      var b = visibleChildren[idx + 1];
      var gapAlias = resolveVarAlias(sourceInfo, "itemSpacing", void 0, mainCompNode);
      var gapLabelText = gapAlias ? shortTokenName(gapAlias) : formatGuideValue(spacing);
      if (mode === "HORIZONTAL") {
        var x1 = (a.x || 0) + (a.width || 0);
        var x2 = b.x || 0;
        if (x2 > x1) {
          var gapWidth = x2 - x1;
          var topY = Math.min(a.y || 0, b.y || 0);
          var bottomY = Math.max((a.y || 0) + (a.height || 0), (b.y || 0) + (b.height || 0));
          var gapHeight = bottomY - topY;
          var gapFrame = figma.createFrame();
          gapFrame.name = "Item-Spacing-Gap-" + spacing + "px";
          gapFrame.fills = [];
          gapFrame.clipsContent = false;
          gapFrame.layoutMode = "NONE";
          gapFrame.resize(gapWidth, gapHeight);
          var gapRect = figma.createRectangle();
          gapRect.name = "Item-Spacing-Gap-" + spacing + "px [Overlay]";
          gapRect.fills = solidPaint(COLOR_ORANGE, 0.2);
          gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
          gapRect.strokeWeight = 1;
          gapRect.resize(gapWidth, gapHeight);
          gapRect.x = 0;
          gapRect.y = 0;
          var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
          label.name = "Item-Spacing-Gap-" + spacing + "px [Label]";
          label.x = Math.max(0, Math.round(gapWidth / 2 - (label.width || 0) / 2));
          label.y = gapHeight + 4;
          gapFrame.appendChild(gapRect);
          gapFrame.appendChild(label);
          gapFrame.x = x + x1;
          gapFrame.y = y + topY;
          panel.appendChild(gapFrame);
        }
      } else {
        var y1 = (a.y || 0) + (a.height || 0);
        var y2 = b.y || 0;
        if (y2 > y1) {
          var gapHeight = y2 - y1;
          var leftX = Math.min(a.x || 0, b.x || 0);
          var rightX = Math.max((a.x || 0) + (a.width || 0), (b.x || 0) + (b.width || 0));
          var gapWidth = rightX - leftX;
          var gapFrame = figma.createFrame();
          gapFrame.name = "Item-Spacing-Gap-" + spacing + "px";
          gapFrame.fills = [];
          gapFrame.clipsContent = false;
          gapFrame.layoutMode = "NONE";
          gapFrame.resize(gapWidth, gapHeight);
          var gapRect = figma.createRectangle();
          gapRect.name = "Item-Spacing-Gap-" + spacing + "px [Overlay]";
          gapRect.fills = solidPaint(COLOR_ORANGE, 0.2);
          gapRect.strokes = solidPaint(COLOR_ORANGE, 0.9);
          gapRect.strokeWeight = 1;
          gapRect.resize(gapWidth, gapHeight);
          gapRect.x = 0;
          gapRect.y = 0;
          var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
          label.name = "Item-Spacing-Gap-" + spacing + "px [Label]";
          label.x = -Math.round((label.width || 0) + 8);
          label.y = Math.max(0, Math.round(gapHeight / 2 - (label.height || 0) / 2));
          gapFrame.appendChild(gapRect);
          gapFrame.appendChild(label);
          gapFrame.x = x + leftX;
          gapFrame.y = y + y1;
          panel.appendChild(gapFrame);
        }
      }
    }
    if (depth < 4) {
      for (var i = 0; i < visibleChildren.length; i++) {
        var child = visibleChildren[i];
        var childMode = child.layoutMode || (child.inferredAutoLayout ? child.inferredAutoLayout.layoutMode : "NONE");
        if (childMode && childMode !== "NONE") {
          drawAutoLayoutGuides(child, panel, child, depth + 1, x, y);
        }
      }
    }
  }
  function findPrimaryAutoLayoutTarget(node) {
    var n = node;
    if (!n || !n.children || n.children.length === 0) return node;
    for (var i = 0; i < n.children.length; i++) {
      var child = n.children[i];
      if (!child || child.visible === false) continue;
      var mode = child.layoutMode || (child.inferredAutoLayout ? child.inferredAutoLayout.layoutMode : "NONE");
      if (mode && mode !== "NONE") return child;
    }
    return node;
  }
  async function buildPropertiesSheetSection(parent, node, stateTarget) {
    var previewTarget = buildPropertyPreviewTarget(node, stateTarget);
    var propertyNode = resolveNodeAtPath(node, previewTarget.targetPath);
    if (!propertyNode) propertyNode = node;
    var propertyData = await getPropertyDefinitionsForNodeAsync(propertyNode);
    if (!propertyData) return;
    var defs = propertyData.defs || {};
    var currentProps = propertyData.currentProps || {};
    var keys = Object.keys(defs);
    if (keys.length === 0) return;
    var section = makeSectionWrapper("Properties");
    section.appendChild(makeText("Visualized component properties for " + previewTarget.targetName, 11, FONT_REGULAR, COLOR_VALUE));
    var stateVariantGroups = [];
    var regularGroups = [];
    var booleanCards = [];
    var hasAnyCards = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var def = defs[key];
      if (!def) continue;
      var propType = normalizeComponentPropertyType(def.type);
      if (propType === "UNKNOWN") continue;
      var baseName = getPropertyBaseName(key);
      var currentEntry = currentProps[key] || currentProps[baseName];
      var currentRawValue = def.defaultValue;
      if (currentEntry && typeof currentEntry === "object" && "value" in currentEntry) {
        currentRawValue = currentEntry.value;
      } else if (propType === "VARIANT" && typeof currentProps[baseName] === "string") {
        currentRawValue = currentProps[baseName];
      }
      var cards = await createPropertyCardsForDefinition(key, propType, def, currentRawValue, def.defaultValue, currentEntry, propertyNode);
      if (cards.length === 0) continue;
      if (propType === "BOOLEAN") {
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
      if (propType === "VARIANT" && isStatePropertyName(key)) {
        stateVariantGroups.push({ baseName, cards });
        continue;
      }
      regularGroups.push({ baseName, cards });
    }
    async function appendPropertyGroup(groupName, cards2, maxWidth) {
      if (cards2.length === 0) return;
      hasAnyCards = true;
      section.appendChild(makeText(groupName, 36, FONT_BOLD, COLOR_HEADER));
      var groupInnerWidth = SHEET_INNER_WIDTH - 48;
      var groupGap = 24;
      var cardWidth = cards2.length === 1 ? groupInnerWidth : Math.floor((groupInnerWidth - groupGap) / 2);
      var useGrid = cards2.length > 2;
      var grid;
      if (useGrid) {
        grid = createPropertyGroupGrid(cardWidth);
        grid.gridRowCount = Math.max(1, Math.ceil(cards2.length / 2));
      } else {
        grid = figma.createFrame();
        grid.layoutMode = "HORIZONTAL";
        grid.itemSpacing = groupGap;
        grid.primaryAxisSizingMode = "AUTO";
        grid.counterAxisSizingMode = "AUTO";
        grid.fills = [];
      }
      grid.name = SPEC_PREFIX + "Property Cards " + groupName;
      var contextualByCard = [];
      var allowedVariantRefBaseKeys = void 0;
      if (cards2.length > 1 && cards2[0].propertyType === "VARIANT") {
        var baseStats = {};
        for (var pc = 0; pc < cards2.length; pc++) {
          var ctxRefs = await collectContextualVariableRefsForCard(node, previewTarget, cards2[pc]);
          contextualByCard[pc] = ctxRefs;
          var merged = [];
          for (var sr = 0; sr < cards2[pc].variableRefs.length; sr++) merged.push(cards2[pc].variableRefs[sr]);
          for (var cr = 0; cr < ctxRefs.length; cr++) merged.push(ctxRefs[cr]);
          var seenCardRef = {};
          for (var mr = 0; mr < merged.length; mr++) {
            var ref = merged[mr];
            var unique = getPropertyVariableRefUniqueKey(ref);
            if (seenCardRef[unique]) continue;
            seenCardRef[unique] = true;
            var base = getPropertyVariableRefBaseKey(ref);
            if (!baseStats[base]) baseStats[base] = { count: 0, values: {} };
            baseStats[base].count += 1;
            baseStats[base].values[ref.fallbackValue || "-"] = true;
          }
        }
        allowedVariantRefBaseKeys = {};
        var statKeys = Object.keys(baseStats);
        for (var sk = 0; sk < statKeys.length; sk++) {
          var stat = baseStats[statKeys[sk]];
          var valueCount = Object.keys(stat.values).length;
          if (valueCount > 1 || stat.count < cards2.length) {
            allowedVariantRefBaseKeys[statKeys[sk]] = true;
          }
        }
      }
      for (var c = 0; c < cards2.length; c++) {
        var card = await makeStateCard(
          cards2[c].title,
          node,
          previewTarget,
          cards2[c],
          contextualByCard[c],
          allowedVariantRefBaseKeys,
          cardWidth
        );
        grid.appendChild(card);
        try {
          card.layoutSizingVertical = "HUG";
          card.layoutSizingHorizontal = "FILL";
          if (useGrid) card.gridColumnSpan = 1;
        } catch (e) {
        }
      }
      if (maxWidth) {
        try {
          grid.resizeWithoutConstraints(maxWidth, grid.height || 1);
        } catch (e) {
        }
      }
      section.appendChild(grid);
      try {
        grid.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
    for (var s = 0; s < stateVariantGroups.length; s++) {
      await appendPropertyGroup(stateVariantGroups[s].baseName, stateVariantGroups[s].cards);
    }
    if (booleanCards.length > 0) {
      await appendPropertyGroup("Boolean", booleanCards);
    }
    for (var r = 0; r < regularGroups.length; r++) {
      await appendPropertyGroup(regularGroups[r].baseName, regularGroups[r].cards);
    }
    if (hasAnyCards) {
      parent.appendChild(section);
    }
  }
  function formatVariableAppliedAs(prop, node) {
    var base = prop.replace(/\[\d+\]/g, "");
    if (base === "fills") {
      if (node) {
        var t = node.type || "";
        if (t === "TEXT") return "Text color";
        if (t === "VECTOR" || t === "BOOLEAN_OPERATION" || t === "STAR" || t === "POLYGON" || t === "ELLIPSE" || t === "LINE") return "Icon color";
      }
      return "Background color";
    }
    if (base === "textFills") return "Text color";
    if (base === "strokes") return "Border color";
    if (base === "effects") return "Drop shadow";
    if (base === "height") return "Height";
    if (base === "width") return "Width";
    if (base === "minHeight") return "Min height";
    if (base === "minWidth") return "Min width";
    if (base === "itemSpacing") return "Item spacing";
    if (base === "paddingTop") return "Padding top";
    if (base === "paddingRight") return "Padding right";
    if (base === "paddingBottom") return "Padding bottom";
    if (base === "paddingLeft") return "Padding left";
    if (base === "textDecoration") return "Text decoration";
    if (base === "textCase") return "Text case";
    if (base === "fontName") return "Font name";
    if (base === "fontStyle") return "Font style";
    if (base === "fontSize") return "Font size";
    if (base === "fontFamily") return "Font family";
    if (base === "lineHeight") return "Line height";
    if (base === "letterSpacing") return "Letter spacing";
    if (base === "paragraphSpacing") return "Paragraph spacing";
    if (base === "paragraphIndent") return "Paragraph indent";
    if (base === "topLeftRadius" || base === "topRightRadius" || base === "bottomLeftRadius" || base === "bottomRightRadius") return "Border radius";
    if (base === "cornerRadius") return "Border radius";
    if (base === "opacity") return "Opacity";
    return base.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  }
  var VARIABLE_LOOKUP_CACHE = null;
  function getVariableLookupCache() {
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
  async function hydrateLibraryVariableLookupCacheAsync() {
    var cache = getVariableLookupCache();
    if (cache.libraryLoaded) return;
    try {
      var variables = figma.variables.getLocalVariables();
      for (var i = 0; i < variables.length; i++) {
        var variable = variables[i];
        if (!variable) continue;
        if (variable.id) {
          cache.byId[variable.id] = variable;
          cache.byId[normalizeVariableIdentifier(variable.id)] = variable;
        }
        if (variable.key) cache.byKey[variable.key] = variable;
      }
    } catch (e) {
    }
    try {
      var collections2 = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      for (var c = 0; c < collections2.length; c++) {
        var collection = collections2[c];
        if (!collection || !collection.key) continue;
        try {
          var libraryVariables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
          for (var v = 0; v < libraryVariables.length; v++) {
            var libraryVariable = libraryVariables[v];
            if (!libraryVariable || !libraryVariable.key) continue;
            cache.byKey[libraryVariable.key] = libraryVariable;
            if (libraryVariable.id) {
              cache.byId[libraryVariable.id] = libraryVariable;
              cache.byId[normalizeVariableIdentifier(libraryVariable.id)] = libraryVariable;
            }
            cache.libraryByKey[libraryVariable.key] = {
              name: libraryVariable.name || "",
              resolvedType: libraryVariable.resolvedType || "UNKNOWN",
              libraryName: collection.libraryName || "",
              collectionName: collection.name || ""
            };
          }
        } catch (e) {
        }
      }
    } catch (e) {
    }
    cache.libraryLoaded = true;
  }
  function normalizeVariableIdentifier(id) {
    return (id || "").trim();
  }
  function resolveVariableFromBinding(variableId, binding) {
    var cache = getVariableLookupCache();
    var candidates = [];
    if (variableId) {
      candidates.push(variableId);
      candidates.push(normalizeVariableIdentifier(variableId));
    }
    if (binding && typeof binding.id === "string") {
      candidates.push(binding.id);
      candidates.push(normalizeVariableIdentifier(binding.id));
    }
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate) continue;
      try {
        var direct = figma.variables.getVariableById(candidate);
        if (direct) return direct;
      } catch (e) {
      }
      if (cache.byId[candidate]) return cache.byId[candidate];
    }
    if (binding && typeof binding.key === "string" && cache.byKey[binding.key]) {
      return cache.byKey[binding.key];
    }
    return null;
  }
  async function resolveVariableFromBindingAsync(variableId, binding) {
    var cache = getVariableLookupCache();
    var candidates = [];
    if (variableId) {
      candidates.push(variableId);
      candidates.push(normalizeVariableIdentifier(variableId));
    }
    if (binding && typeof binding.id === "string") {
      candidates.push(binding.id);
      candidates.push(normalizeVariableIdentifier(binding.id));
    }
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate) continue;
      try {
        var asyncResolved = await figma.variables.getVariableByIdAsync(candidate);
        if (asyncResolved) {
          if (asyncResolved.id) {
            cache.byId[asyncResolved.id] = asyncResolved;
            cache.byId[normalizeVariableIdentifier(asyncResolved.id)] = asyncResolved;
          }
          if (asyncResolved.key) cache.byKey[asyncResolved.key] = asyncResolved;
          return asyncResolved;
        }
      } catch (e) {
      }
      if (cache.byId[candidate]) return cache.byId[candidate];
    }
    var resolved = resolveVariableFromBinding(variableId, binding);
    if (resolved) return resolved;
    if (binding && typeof binding.key === "string" && binding.key.length > 0) {
      await hydrateLibraryVariableLookupCacheAsync();
    }
    if (binding && typeof binding.key === "string" && binding.key.length > 0) {
      try {
        var imported = await figma.variables.importVariableByKeyAsync(binding.key);
        if (imported) {
          var cache = getVariableLookupCache();
          if (imported.id) {
            cache.byId[imported.id] = imported;
            cache.byId[normalizeVariableIdentifier(imported.id)] = imported;
          }
          if (imported.key) cache.byKey[imported.key] = imported;
          return imported;
        }
      } catch (e) {
      }
    }
    return null;
  }
  function variableTypeRank(variableType) {
    if (variableType === "COLOR") return 0;
    if (variableType === "FLOAT") return 1;
    return 2;
  }
  function getVariablePreviewKind(prop, variableType) {
    var base = prop.replace(/\[\d+\]/g, "");
    if (base === "fills" || base === "textFills" || base === "strokes" || base === "effects") return "color";
    if (base === "fontName" || base === "fontFamily" || base === "fontStyle" || base === "fontSize" || base === "lineHeight" || base === "letterSpacing" || base === "paragraphSpacing" || base === "paragraphIndent" || base === "textCase" || base === "textDecoration") return "text";
    if (base === "cornerRadius" || base === "topLeftRadius" || base === "topRightRadius" || base === "bottomLeftRadius" || base === "bottomRightRadius") return "radius";
    if (base === "width" || base === "minWidth" || base === "maxWidth") return "width";
    if (base === "height" || base === "minHeight" || base === "maxHeight") return "height";
    if (base === "itemSpacing" || base === "paddingTop" || base === "paddingRight" || base === "paddingBottom" || base === "paddingLeft") return "spacing";
    if (base === "opacity") return "opacity";
    if (variableType === "COLOR") return "color";
    if (variableType === "FLOAT") return "number";
    return "token";
  }
  function formatResolvedVariableValue(raw, variableType) {
    if (!raw) return { label: "-", color: null };
    if (variableType === "COLOR" && raw && typeof raw === "object") {
      var color = { r: raw.r || 0, g: raw.g || 0, b: raw.b || 0 };
      var hex = rgbToHex(color);
      var alpha = typeof raw.a === "number" ? raw.a : 1;
      var label = alpha < 1 ? hex + " @ " + Math.round(alpha * 100) + "%" : hex;
      return { label, color };
    }
    if (variableType === "FLOAT") {
      if (typeof raw === "number") return { label: "" + Math.round(raw * 100) / 100, color: null };
      return { label: "-", color: null };
    }
    if (variableType === "BOOLEAN") {
      return { label: raw ? "true" : "false", color: null };
    }
    if (variableType === "STRING") {
      return { label: typeof raw === "string" ? raw : "-", color: null };
    }
    return { label: "-", color: null };
  }
  function formatVariableFallback(variable, consumer) {
    if (!variable) return { label: "-", color: null };
    try {
      if (consumer && typeof variable.resolveForConsumer === "function") {
        var resolved = variable.resolveForConsumer(consumer);
        if (resolved && "value" in resolved) {
          return formatResolvedVariableValue(resolved.value, resolved.resolvedType || variable.resolvedType || "UNKNOWN");
        }
      }
    } catch (e) {
    }
    if (!variable.valuesByMode) return { label: "-", color: null };
    var modeIds = Object.keys(variable.valuesByMode);
    if (modeIds.length === 0) return { label: "-", color: null };
    function resolveModeValue(v, depth) {
      if (!v || !v.valuesByMode) return null;
      if (depth > 5) return null;
      var ids = Object.keys(v.valuesByMode);
      if (ids.length === 0) return null;
      var value = v.valuesByMode[ids[0]];
      if (value && typeof value === "object" && value.type === "VARIABLE_ALIAS" && typeof value.id === "string") {
        var aliasVar = resolveVariableFromBinding(value.id, value);
        if (aliasVar) return resolveModeValue(aliasVar, depth + 1);
      }
      return value;
    }
    return formatResolvedVariableValue(resolveModeValue(variable, 0), variable.resolvedType || "UNKNOWN");
  }
  async function resolveVariableDetails(variableId, binding, consumer) {
    var variable = await resolveVariableFromBindingAsync(variableId, binding);
    if (variable) {
      var fallback = formatVariableFallback(variable, consumer);
      return {
        name: variable.name || variableId,
        variableId: variable.id || normalizeVariableIdentifier(variableId || ""),
        type: variable.resolvedType || "UNKNOWN",
        fallbackColor: fallback.color,
        fallbackValue: fallback.label
      };
    }
    var cache = getVariableLookupCache();
    if (binding && typeof binding.key === "string" && binding.key.length > 0) {
      var libraryMeta = cache.libraryByKey[binding.key];
      if (libraryMeta) {
        return {
          name: libraryMeta.name || binding.key,
          variableId: normalizeVariableIdentifier(variableId || ""),
          type: libraryMeta.resolvedType || "UNKNOWN",
          fallbackColor: null,
          fallbackValue: "-"
        };
      }
    }
    var fallbackName = "";
    if (binding && typeof binding.name === "string" && binding.name.length > 0) {
      fallbackName = binding.name;
    } else if (binding && typeof binding.key === "string" && binding.key.length > 0) {
      fallbackName = binding.key;
    } else if (variableId && variableId.length > 0) {
      fallbackName = "Variable " + normalizeVariableIdentifier(variableId);
    }
    return {
      name: fallbackName || "Unresolved variable",
      variableId: normalizeVariableIdentifier(variableId || ""),
      type: "UNKNOWN",
      fallbackColor: null,
      fallbackValue: "-"
    };
  }
  function inferColorFromUsage(node, prop) {
    if (!node) return null;
    var baseProp = prop.replace(/\[\d+\]/g, "");
    return _inferColorFromUsageParsed(node, baseProp, prop);
  }
  function _inferColorFromUsageParsed(node, baseProp, prop) {
    var match = prop.match(/\[(\d+)\]$/);
    var index = match ? parseInt(match[1], 10) : 0;
    function colorFromPaint(paint) {
      if (!paint || paint.visible === false) return null;
      if (paint.type === "SOLID" && paint.color) {
        return {
          r: typeof paint.color.r === "number" ? paint.color.r : 0,
          g: typeof paint.color.g === "number" ? paint.color.g : 0,
          b: typeof paint.color.b === "number" ? paint.color.b : 0
        };
      }
      return null;
    }
    if ((baseProp === "fills" || baseProp === "textFills" || baseProp === "strokes") && Array.isArray(node[baseProp])) {
      if (index >= 0 && index < node[baseProp].length) {
        var indexed = colorFromPaint(node[baseProp][index]);
        if (indexed) return indexed;
      }
      for (var i = 0; i < node[baseProp].length; i++) {
        var firstVisible = colorFromPaint(node[baseProp][i]);
        if (firstVisible) return firstVisible;
      }
    }
    if (baseProp === "effects" && Array.isArray(node.effects)) {
      for (var e = 0; e < node.effects.length; e++) {
        var effect = node.effects[e];
        if (!effect || effect.visible === false) continue;
        if ((effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") && effect.color) {
          return {
            r: typeof effect.color.r === "number" ? effect.color.r : 0,
            g: typeof effect.color.g === "number" ? effect.color.g : 0,
            b: typeof effect.color.b === "number" ? effect.color.b : 0
          };
        }
      }
    }
    return null;
  }
  function readNodePropertyValue(node, baseProp) {
    if (!node) return null;
    var val = node[baseProp];
    if (typeof val === "number") return "" + Math.round(val * 100) / 100;
    if (typeof val === "string") return val;
    if (typeof val === "boolean") return "" + val;
    return null;
  }
  function resolveAppliedTargetNode(node) {
    if (!node) return node;
    if (node.type !== "VECTOR") return node;
    var current = node.parent;
    while (current) {
      if (current.type === "INSTANCE" || current.type === "COMPONENT" || current.type === "COMPONENT_SET") {
        return current;
      }
      current = current.parent;
    }
    return node;
  }
  function getVariableDedupIdentity(variableId, binding, details) {
    if (binding && typeof binding.key === "string" && binding.key.length > 0) return "key:" + binding.key;
    var normalizedId = normalizeVariableIdentifier(variableId || (binding && binding.id ? binding.id : ""));
    if (normalizedId) return "id:" + normalizedId;
    if (details && details.name) return "name:" + details.name + "|" + (details.type || "UNKNOWN");
    return "unknown";
  }
  function isHexColorName(value) {
    if (!value) return false;
    return /^#[0-9A-Fa-f]{3,8}(\s*@\s*\d+%|\s*\/\s*\d+%|)$/.test(value.trim());
  }
  function isFallbackVariableName(value) {
    if (!value) return true;
    if (value === "Unresolved variable") return true;
    if (value.indexOf("Variable VariableID:") === 0) return true;
    if (value.indexOf("Variable ") === 0) return true;
    if (value.indexOf("Bound ") === 0) return true;
    if (isHexColorName(value)) return true;
    return false;
  }
  function formatFallbackValueFromUsage(node, prop, previewKind, fallbackColor) {
    var baseProp = prop.replace(/\[\d+\]/g, "");
    if (previewKind === "color" && fallbackColor) {
      return rgbToHex(fallbackColor);
    }
    var nodeVal = readNodePropertyValue(node, baseProp);
    if (nodeVal !== null) return nodeVal;
    if (previewKind === "color") return "-";
    return "-";
  }
  function shouldShowVariableUsageRow(appliedAs, previewKind) {
    if (previewKind === "text") return appliedAs === "Font style";
    return true;
  }
  async function collectDirectVariableUsageRows(node) {
    VARIABLE_LOOKUP_CACHE = null;
    var rows = [];
    var aggregates = {};
    async function addUsage(variableId, prop2, currentNode) {
      var binding = null;
      var baseProp = prop2.replace(/\[\d+\]/g, "");
      try {
        var rawBinding = currentNode && currentNode.boundVariables ? currentNode.boundVariables[baseProp] : null;
        if (Array.isArray(rawBinding)) {
          var match = prop2.match(/\[(\d+)\]$/);
          var index = match ? parseInt(match[1], 10) : -1;
          if (index >= 0 && index < rawBinding.length) binding = rawBinding[index];
        } else {
          binding = rawBinding;
        }
      } catch (e) {
      }
      var details = await resolveVariableDetails(variableId, binding, currentNode);
      var actualColor = inferColorFromUsage(currentNode, prop2);
      if (actualColor) details.fallbackColor = actualColor;
      var previewKind = getVariablePreviewKind(prop2, details.type);
      var fallbackValue = formatFallbackValueFromUsage(currentNode, prop2, previewKind, details.fallbackColor);
      if (!details.fallbackValue || details.fallbackValue === "-") {
        details.fallbackValue = fallbackValue;
      }
      var nameIsRaw = isFallbackVariableName(details.name);
      if (nameIsRaw) {
        if (previewKind === "color" && binding && typeof binding.name === "string" && binding.name.length > 0) {
          details.name = binding.name;
        } else if (previewKind === "color" && binding && typeof binding.key === "string" && binding.key.length > 0) {
          details.name = binding.key;
        } else {
          details.name = "Bound " + formatVariableAppliedAs(prop2);
        }
      }
      var appliedAs = formatVariableAppliedAs(prop2, node || currentNode);
      if (!shouldShowVariableUsageRow(appliedAs, previewKind)) return;
      var appliedTarget = resolveAppliedTargetNode(currentNode);
      var appliedTo = getTypeIcon(appliedTarget.type || "UNKNOWN") + " " + (appliedTarget.name || appliedTarget.type || "Layer");
      var aggregateKey = getVariableDedupIdentity(variableId, binding, details);
      if (!aggregates[aggregateKey]) {
        aggregates[aggregateKey] = {
          variableName: details.name,
          variableId: details.variableId,
          variableType: details.type,
          fallbackColor: details.fallbackColor,
          fallbackValue: details.fallbackValue,
          previewKind,
          appliedAs: {},
          appliedTo: {}
        };
      }
      var aggregate2 = aggregates[aggregateKey];
      if (isFallbackVariableName(aggregate2.variableName) && !isFallbackVariableName(details.name)) {
        aggregate2.variableName = details.name;
      }
      if (!aggregate2.variableId && details.variableId) aggregate2.variableId = details.variableId;
      if (!aggregate2.fallbackColor && details.fallbackColor) aggregate2.fallbackColor = details.fallbackColor;
      if ((!aggregate2.fallbackValue || aggregate2.fallbackValue === "-") && details.fallbackValue && details.fallbackValue !== "-") {
        aggregate2.fallbackValue = details.fallbackValue;
      }
      aggregate2.appliedAs[appliedAs] = true;
      aggregate2.appliedTo[appliedTo] = true;
    }
    async function readBinding(binding, prop2, currentNode) {
      if (!binding) return;
      if (Array.isArray(binding)) {
        for (var i = 0; i < binding.length; i++) {
          var entry = binding[i];
          if (entry) await addUsage(entry.id || "", prop2 + "[" + i + "]", currentNode);
        }
        return;
      }
      if (binding) await addUsage(binding.id || "", prop2, currentNode);
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
        appliedAs: appliedAsList.join(", "),
        appliedTo: appliedToList.join(", ")
      });
    }
    rows.sort(function(a2, b) {
      var byTypeRank = variableTypeRank(a2.variableType) - variableTypeRank(b.variableType);
      if (byTypeRank !== 0) return byTypeRank;
      var byName = a2.variableName.localeCompare(b.variableName);
      if (byName !== 0) return byName;
      var byApplied = a2.appliedAs.localeCompare(b.appliedAs);
      if (byApplied !== 0) return byApplied;
      return a2.appliedTo.localeCompare(b.appliedTo);
    });
    return rows;
  }
  async function collectVariableUsageRows(root, includeVariantSiblings) {
    VARIABLE_LOOKUP_CACHE = null;
    var rows = [];
    var aggregates = {};
    var primaryColorSet = {};
    var inPrimaryWalk = true;
    async function addUsage(variableId, prop, node) {
      var binding = null;
      var baseProp = prop.replace(/\[\d+\]/g, "");
      try {
        var rawBinding = node && node.boundVariables ? node.boundVariables[baseProp] : null;
        if (Array.isArray(rawBinding)) {
          var match = prop.match(/\[(\d+)\]$/);
          var index = match ? parseInt(match[1], 10) : -1;
          if (index >= 0 && index < rawBinding.length) binding = rawBinding[index];
        } else {
          binding = rawBinding;
        }
      } catch (e) {
      }
      var details = await resolveVariableDetails(variableId, binding, node);
      var actualColor = inferColorFromUsage(node, prop);
      if (actualColor) details.fallbackColor = actualColor;
      var previewKind = getVariablePreviewKind(prop, details.type);
      var fallbackValue = formatFallbackValueFromUsage(node, prop, previewKind, details.fallbackColor);
      if (!details.fallbackValue || details.fallbackValue === "-") {
        details.fallbackValue = fallbackValue;
      }
      var nameIsRaw = isFallbackVariableName(details.name);
      if (nameIsRaw) {
        if (previewKind === "color" && binding && typeof binding.name === "string" && binding.name.length > 0) {
          details.name = binding.name;
        } else if (previewKind === "color" && binding && typeof binding.key === "string" && binding.key.length > 0) {
          details.name = binding.key;
        } else {
          details.name = "Bound " + formatVariableAppliedAs(prop);
        }
      }
      var appliedAs = formatVariableAppliedAs(prop, node);
      if (!shouldShowVariableUsageRow(appliedAs, previewKind)) return;
      var appliedTarget = resolveAppliedTargetNode(node);
      var appliedTo = getTypeIcon(appliedTarget.type || "UNKNOWN") + " " + (appliedTarget.name || appliedTarget.type || "Layer");
      var targetKey = appliedTarget && appliedTarget.id ? appliedTarget.id : appliedTo;
      var aggregateKey = getVariableDedupIdentity(variableId, binding, details);
      if (!aggregates[aggregateKey]) {
        aggregates[aggregateKey] = {
          variableName: details.name,
          variableId: details.variableId,
          variableType: details.type,
          fallbackColor: details.fallbackColor,
          fallbackValue: details.fallbackValue,
          previewKind,
          appliedAs: {},
          appliedTo: {}
        };
      }
      var aggregate2 = aggregates[aggregateKey];
      if (isFallbackVariableName(aggregate2.variableName) && !isFallbackVariableName(details.name)) {
        aggregate2.variableName = details.name;
      }
      if (!aggregate2.variableId && details.variableId) aggregate2.variableId = details.variableId;
      if (details.fallbackColor) {
        if (inPrimaryWalk) {
          aggregate2.fallbackColor = details.fallbackColor;
          primaryColorSet[aggregateKey] = true;
        } else if (!primaryColorSet[aggregateKey]) {
          aggregate2.fallbackColor = details.fallbackColor;
        }
      }
      if ((!aggregate2.fallbackValue || aggregate2.fallbackValue === "-") && details.fallbackValue && details.fallbackValue !== "-") {
        aggregate2.fallbackValue = details.fallbackValue;
      }
      aggregate2.appliedAs[appliedAs] = true;
      aggregate2.appliedTo[appliedTo] = true;
    }
    async function readBinding(binding, prop, node) {
      if (!binding) return;
      if (Array.isArray(binding)) {
        for (var i = 0; i < binding.length; i++) {
          var entry = binding[i];
          if (entry) await addUsage(entry.id || "", prop + "[" + i + "]", node);
        }
        return;
      }
      if (binding) await addUsage(binding.id || "", prop, node);
    }
    async function walk(node) {
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
    await walk(root);
    inPrimaryWalk = false;
    if (includeVariantSiblings !== false) {
      async function walkAllVariants(variantNodes) {
        for (var v = 0; v < variantNodes.length; v++) {
          await walk(variantNodes[v]);
        }
      }
      if (root.type === "INSTANCE") {
        try {
          var mainComp = await root.getMainComponentAsync();
          if (mainComp) {
            var parentSet = mainComp.parent;
            if (parentSet && parentSet.type === "COMPONENT_SET" && Array.isArray(parentSet.children)) {
              var siblings = parentSet.children.filter(function(c) {
                return c && c.id !== mainComp.id;
              });
              await walkAllVariants(siblings);
            }
          }
        } catch (e) {
        }
      } else if (root.type === "COMPONENT") {
        var componentParent = root.parent;
        if (componentParent && componentParent.type === "COMPONENT_SET" && Array.isArray(componentParent.children)) {
          var componentSiblings = componentParent.children.filter(function(c) {
            return c && c.id !== root.id;
          });
          await walkAllVariants(componentSiblings);
        }
      } else if (root.type === "COMPONENT_SET") {
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
        appliedAs: appliedAsList.join(", "),
        appliedTo: appliedToList.join(", ")
      });
    }
    rows.sort(function(a2, b) {
      var byTypeRank = variableTypeRank(a2.variableType) - variableTypeRank(b.variableType);
      if (byTypeRank !== 0) return byTypeRank;
      var byName = a2.variableName.localeCompare(b.variableName);
      if (byName !== 0) return byName;
      var byApplied = a2.appliedAs.localeCompare(b.appliedAs);
      if (byApplied !== 0) return byApplied;
      return a2.appliedTo.localeCompare(b.appliedTo);
    });
    return rows;
  }
  async function buildVariablesSheetSection(parent, node) {
    var section = makeSectionWrapper("Variables");
    section.name = SPEC_PREFIX + "Variables";
    section.primaryAxisSizingMode = "AUTO";
    section.counterAxisSizingMode = "FIXED";
    section.layoutSizingVertical = "HUG";
    var rows = await collectVariableUsageRows(node);
    if (rows.length === 0) {
      var empty = makeText("No variable bindings detected on selected node.", 11, FONT_REGULAR, COLOR_MUTED);
      empty.name = SPEC_PREFIX + "Variables Empty State";
      section.appendChild(empty);
      parent.appendChild(section);
      return;
    }
    var table = figma.createFrame();
    table.name = SPEC_PREFIX + "Variables Table";
    table.layoutMode = "VERTICAL";
    table.primaryAxisSizingMode = "AUTO";
    table.counterAxisSizingMode = "FIXED";
    table.resize(SHEET_INNER_WIDTH - 48, 10);
    table.itemSpacing = 8;
    table.fills = [];
    table.layoutSizingVertical = "HUG";
    try {
      table.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    var header = figma.createFrame();
    header.name = SPEC_PREFIX + "Variables Header";
    header.layoutMode = "HORIZONTAL";
    header.primaryAxisSizingMode = "FIXED";
    header.counterAxisSizingMode = "AUTO";
    header.resize(SHEET_INNER_WIDTH - 48, 1);
    header.itemSpacing = 12;
    header.fills = [];
    header.layoutSizingVertical = "HUG";
    try {
      header.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    var hName = makeText("Name", 11, FONT_BOLD, COLOR_MUTED);
    hName.name = SPEC_PREFIX + "Variables Header Name";
    hName.resize(320, hName.height);
    var hFallback = makeText("Fallback", 11, FONT_BOLD, COLOR_MUTED);
    hFallback.name = SPEC_PREFIX + "Variables Header Fallback";
    hFallback.resize(120, hFallback.height);
    var hApplied = makeText("Applied as", 11, FONT_BOLD, COLOR_MUTED);
    hApplied.name = SPEC_PREFIX + "Variables Header Applied As";
    hApplied.resize(150, hApplied.height);
    header.appendChild(hName);
    header.appendChild(hFallback);
    header.appendChild(hApplied);
    table.appendChild(header);
    var divider = makeHorizontalDivider(SHEET_INNER_WIDTH - 48);
    divider.name = SPEC_PREFIX + "Variables Divider";
    table.appendChild(divider);
    try {
      divider.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    function makeVariablePreviewNode(row2, index) {
      if (row2.previewKind === "color" && row2.fallbackColor) {
        var swatch = figma.createRectangle();
        swatch.name = SPEC_PREFIX + "Variables Swatch " + index;
        swatch.resize(12, 12);
        var swatchPaint = solidPaint(row2.fallbackColor)[0];
        if (row2.variableId) {
          try {
            var colorVariable = resolveVariableFromBinding(row2.variableId, null);
            if (colorVariable) {
              swatchPaint = figma.variables.setBoundVariableForPaint(swatchPaint, "color", colorVariable);
            }
          } catch (e) {
          }
        }
        swatch.fills = [swatchPaint];
        swatch.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
        swatch.strokeWeight = 1;
        return swatch;
      }
      var chip = figma.createFrame();
      chip.name = SPEC_PREFIX + "Variables Icon " + index;
      chip.layoutMode = "HORIZONTAL";
      chip.primaryAxisSizingMode = "FIXED";
      chip.counterAxisSizingMode = "FIXED";
      chip.resize(14, 14);
      chip.cornerRadius = 3;
      chip.primaryAxisAlignItems = "CENTER";
      chip.counterAxisAlignItems = "CENTER";
      chip.fills = solidPaint({ r: 0.96, g: 0.96, b: 0.97 });
      chip.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
      chip.strokeWeight = 1;
      chip.paddingLeft = 0;
      chip.paddingRight = 0;
      chip.paddingTop = 0;
      chip.paddingBottom = 0;
      var glyph = "#";
      var font = FONT_BOLD;
      var size = 8;
      if (row2.previewKind === "text") glyph = "T";
      else if (row2.previewKind === "radius") glyph = "\u25DC";
      else if (row2.previewKind === "width") glyph = "W";
      else if (row2.previewKind === "height") glyph = "H";
      else if (row2.previewKind === "spacing") glyph = "\u2194";
      else if (row2.previewKind === "opacity") glyph = "%";
      else if (row2.previewKind === "token") glyph = "\u2022";
      var iconText = makeText(glyph, size, font, COLOR_LABEL);
      iconText.name = SPEC_PREFIX + "Variables Icon Label " + index;
      iconText.textAlignHorizontal = "CENTER";
      iconText.textAutoResize = "WIDTH_AND_HEIGHT";
      chip.appendChild(iconText);
      return chip;
    }
    function makeVariableNameBadge(row2, index) {
      var badge = figma.createFrame();
      badge.name = SPEC_PREFIX + "Variables Name Badge " + index;
      badge.layoutMode = "HORIZONTAL";
      badge.primaryAxisSizingMode = "AUTO";
      badge.counterAxisSizingMode = "AUTO";
      badge.primaryAxisAlignItems = "CENTER";
      badge.counterAxisAlignItems = "CENTER";
      badge.itemSpacing = 6;
      badge.paddingLeft = 8;
      badge.paddingRight = 8;
      badge.paddingTop = 4;
      badge.paddingBottom = 4;
      badge.cornerRadius = 4;
      badge.fills = solidPaint(WHITE);
      badge.strokes = solidPaint({ r: 0.8, g: 0.8, b: 0.8 });
      badge.strokeWeight = 1;
      badge.layoutSizingHorizontal = "HUG";
      badge.layoutSizingVertical = "HUG";
      var nameCell = makeText(row2.variableName, 11, FONT_REGULAR, COLOR_VALUE);
      nameCell.name = SPEC_PREFIX + "Variables Name " + index;
      badge.appendChild(makeVariablePreviewNode(row2, index));
      badge.appendChild(nameCell);
      return badge;
    }
    for (var i = 0; i < rows.length; i++) {
      var row = figma.createFrame();
      row.name = SPEC_PREFIX + "Variables Row " + (i + 1);
      row.layoutMode = "HORIZONTAL";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";
      row.resize(SHEET_INNER_WIDTH - 48, 1);
      row.itemSpacing = 12;
      row.fills = [];
      try {
        row.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
      row.layoutSizingVertical = "HUG";
      var nameCellWrap = figma.createFrame();
      nameCellWrap.name = SPEC_PREFIX + "Variables Name Cell " + (i + 1);
      nameCellWrap.layoutMode = "HORIZONTAL";
      nameCellWrap.primaryAxisSizingMode = "FIXED";
      nameCellWrap.counterAxisSizingMode = "AUTO";
      nameCellWrap.resize(320, 1);
      nameCellWrap.itemSpacing = 8;
      nameCellWrap.fills = [];
      nameCellWrap.layoutSizingVertical = "HUG";
      nameCellWrap.appendChild(makeVariableNameBadge(rows[i], i + 1));
      var fallbackCell = makeText(rows[i].fallbackValue || "-", 11, FONT_REGULAR, COLOR_MUTED);
      fallbackCell.name = SPEC_PREFIX + "Variables Fallback " + (i + 1);
      fallbackCell.resize(120, fallbackCell.height);
      var appliedCell = makeText(rows[i].appliedAs, 11, FONT_REGULAR, COLOR_VALUE);
      appliedCell.name = SPEC_PREFIX + "Variables Applied As " + (i + 1);
      appliedCell.resize(150, appliedCell.height);
      row.appendChild(nameCellWrap);
      row.appendChild(fallbackCell);
      row.appendChild(appliedCell);
      table.appendChild(row);
    }
    section.appendChild(table);
    parent.appendChild(section);
  }
  async function buildLayoutSheetSection(parent, node) {
    var f = node;
    var mainComp = null;
    try {
      if (typeof f.getMainComponentAsync === "function") {
        mainComp = await f.getMainComponentAsync();
      }
    } catch (e) {
    }
    var section = makeSectionWrapper("Layout and spacing");
    var row = figma.createFrame();
    row.name = SPEC_PREFIX + "Layout Content [Two-Column]";
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = 20;
    row.fills = [];
    var columnWidth = Math.floor((SHEET_INNER_WIDTH - 48 - 20) / 2);
    var left = figma.createFrame();
    left.name = SPEC_PREFIX + "Layout Column [" + node.name + "]";
    left.layoutMode = "VERTICAL";
    left.resize(columnWidth, 10);
    left.primaryAxisSizingMode = "AUTO";
    left.counterAxisSizingMode = "FIXED";
    left.itemSpacing = 10;
    left.clipsContent = false;
    left.fills = [];
    var leftPreview = makeLightPreviewPanel(columnWidth, 240);
    leftPreview.name = SPEC_PREFIX + "Preview Panel [" + node.name + "]";
    leftPreview.appendChild(makeAlignmentGrid(f, getLayoutDirectionLabel(f) === "Horizontal" ? "HORIZONTAL" : "VERTICAL"));
    var leftClone = cloneNodeCentered(node, leftPreview, columnWidth, 240, false);
    var GRID_CLEAR = 72;
    if ((leftClone.y || 0) < GRID_CLEAR) leftClone.y = GRID_CLEAR;
    drawAutoLayoutGuides(leftClone, leftPreview, f, 0, 0, 0, mainComp);
    var leftH = leftClone.height || 0;
    var leftY = leftClone.y || 0;
    var requiredLeftHeight = Math.max(240, leftY + leftH + 60);
    leftPreview.resize(columnWidth, requiredLeftHeight);
    left.appendChild(leftPreview);
    var leftLabel = makeNodeLabel(node.name, node.type, 12, true);
    leftLabel.name = SPEC_PREFIX + "Node Label [" + node.name + "]";
    left.appendChild(leftLabel);
    var leftDirection = makeRow("Direction", getLayoutDirectionLabel(f));
    leftDirection.name = SPEC_PREFIX + "Direction [" + getLayoutDirectionLabel(f) + "]";
    left.appendChild(leftDirection);
    var leftAlignment = makeRow("Alignment", getAlignmentLabel(f));
    leftAlignment.name = SPEC_PREFIX + "Alignment [" + getAlignmentLabel(f) + "]";
    left.appendChild(leftAlignment);
    var leftVResize = makeRow("Vertical resizing", getSizingModeLabel(f.layoutSizingVertical));
    leftVResize.name = SPEC_PREFIX + "Vertical Resizing [" + getSizingModeLabel(f.layoutSizingVertical) + "]";
    left.appendChild(leftVResize);
    var leftHResize = makeRow("Horizontal resizing", getSizingModeLabel(f.layoutSizingHorizontal));
    leftHResize.name = SPEC_PREFIX + "Horizontal Resizing [" + getSizingModeLabel(f.layoutSizingHorizontal) + "]";
    left.appendChild(leftHResize);
    var leftGapAlias = await resolveVarAliasAsync(f, "itemSpacing", mainComp);
    var leftGapPx = getItemSpacingValue(f) + "px";
    left.appendChild(makeLayoutMetricRow("Gap", leftGapAlias, leftGapPx, SPEC_PREFIX + "Item Spacing [" + getItemSpacingValue(f) + "px]"));
    var leftPadRows = await paddingRows(f, mainComp);
    for (var lpi = 0; lpi < leftPadRows.length; lpi++) {
      left.appendChild(makeLayoutMetricRow(leftPadRows[lpi].label, leftPadRows[lpi].token, leftPadRows[lpi].px, SPEC_PREFIX + "Padding Row [" + leftPadRows[lpi].label + "]"));
    }
    var right = figma.createFrame();
    var nestedTarget = findPrimaryAutoLayoutTarget(node);
    var nestedInfo = nestedTarget;
    right.name = SPEC_PREFIX + "Layout Column [" + node.name + "]";
    right.layoutMode = "VERTICAL";
    right.resize(columnWidth, 10);
    right.primaryAxisSizingMode = "AUTO";
    right.counterAxisSizingMode = "FIXED";
    right.itemSpacing = 10;
    right.clipsContent = false;
    right.fills = [];
    var rightPreview = makeLightPreviewPanel(columnWidth, 240);
    rightPreview.name = SPEC_PREFIX + "Preview Panel [" + node.name + "]";
    rightPreview.appendChild(makeAlignmentGrid(nestedInfo, getLayoutDirectionLabel(nestedInfo) === "Horizontal" ? "HORIZONTAL" : "VERTICAL"));
    var rightClone = cloneNodeCentered(node, rightPreview, columnWidth, 240, false);
    if ((rightClone.y || 0) < GRID_CLEAR) rightClone.y = GRID_CLEAR;
    drawAutoLayoutGuides(rightClone, rightPreview, nestedInfo, 0, 0, 0, mainComp);
    var rightH = rightClone.height || 0;
    var rightY = rightClone.y || 0;
    var requiredRightHeight = Math.max(240, rightY + rightH + 60);
    rightPreview.resize(columnWidth, requiredRightHeight);
    right.appendChild(rightPreview);
    var rightLabel = makeNodeLabel(node.name, node.type, 12, true);
    rightLabel.name = SPEC_PREFIX + "Node Label [" + node.name + "]";
    right.appendChild(rightLabel);
    var rightDirection = makeRow("Direction", getLayoutDirectionLabel(nestedInfo));
    rightDirection.name = SPEC_PREFIX + "Direction [" + getLayoutDirectionLabel(nestedInfo) + "]";
    right.appendChild(rightDirection);
    var rightAlignment = makeRow("Alignment", getAlignmentLabel(nestedInfo));
    rightAlignment.name = SPEC_PREFIX + "Alignment [" + getAlignmentLabel(nestedInfo) + "]";
    right.appendChild(rightAlignment);
    var rightVResize = makeRow("Vertical resizing", getSizingModeLabel(nestedInfo.layoutSizingVertical));
    rightVResize.name = SPEC_PREFIX + "Vertical Resizing [" + getSizingModeLabel(nestedInfo.layoutSizingVertical) + "]";
    right.appendChild(rightVResize);
    var rightHResize = makeRow("Horizontal resizing", getSizingModeLabel(nestedInfo.layoutSizingHorizontal));
    rightHResize.name = SPEC_PREFIX + "Horizontal Resizing [" + getSizingModeLabel(nestedInfo.layoutSizingHorizontal) + "]";
    right.appendChild(rightHResize);
    var rightGapAlias = await resolveVarAliasAsync(nestedInfo, "itemSpacing", mainComp);
    var rightGapPx = getItemSpacingValue(nestedInfo) + "px";
    right.appendChild(makeLayoutMetricRow("Gap", rightGapAlias, rightGapPx, SPEC_PREFIX + "Item Spacing [" + getItemSpacingValue(nestedInfo) + "px]"));
    var rightPadRows = await paddingRows(nestedInfo, mainComp);
    for (var rpi = 0; rpi < rightPadRows.length; rpi++) {
      right.appendChild(makeLayoutMetricRow(rightPadRows[rpi].label, rightPadRows[rpi].token, rightPadRows[rpi].px, SPEC_PREFIX + "Padding Row [" + rightPadRows[rpi].label + "]"));
    }
    async function paddingRows(node2, mc) {
      var tV = getPaddingValue(node2, "paddingTop");
      var rV = getPaddingValue(node2, "paddingRight");
      var bV = getPaddingValue(node2, "paddingBottom");
      var lV = getPaddingValue(node2, "paddingLeft");
      var tT = await resolveVarAliasAsync(node2, "paddingTop", mc);
      var rT = await resolveVarAliasAsync(node2, "paddingRight", mc);
      var bT = await resolveVarAliasAsync(node2, "paddingBottom", mc);
      var lT = await resolveVarAliasAsync(node2, "paddingLeft", mc);
      if (tV === rV && rV === bV && bV === lV && tT === rT && rT === bT && bT === lT) {
        return [{ label: "Padding", token: tT, px: tV + "px" }];
      }
      if (tV === bV && rV === lV && tT === bT && rT === lT) {
        return [
          { label: "Vertical padding", token: tT, px: tV + "px" },
          { label: "Horizontal padding", token: rT, px: rV + "px" }
        ];
      }
      return [
        { label: "Top padding", token: tT, px: tV + "px" },
        { label: "Right padding", token: rT, px: rV + "px" },
        { label: "Bottom padding", token: bT, px: bV + "px" },
        { label: "Left padding", token: lT, px: lV + "px" }
      ];
    }
    row.appendChild(left);
    row.appendChild(right);
    section.appendChild(row);
    try {
      row.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    try {
      left.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    try {
      right.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    try {
      leftPreview.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    try {
      rightPreview.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    parent.appendChild(section);
  }
  function propagateResolvedVariableModes(sheet, sourceNode) {
    try {
      var resolved = sourceNode.resolvedVariableModes;
      if (!resolved) return;
      var collectionIds = Object.keys(resolved);
      for (var i = 0; i < collectionIds.length; i++) {
        var collectionId = collectionIds[i];
        var modeId = resolved[collectionId];
        try {
          sheet.setExplicitVariableModeForCollection(collectionId, modeId);
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }
  async function createReferenceStyleSpecSheetAsync(node, page, modules) {
    var b = getNodeBounds(node);
    var stateTarget = await findStateTargetAsync(node);
    var hasStateOutput = !!(stateTarget && stateTarget.states.length > 0);
    var sheet = figma.createFrame();
    sheet.name = "spec";
    sheet.layoutMode = "VERTICAL";
    sheet.primaryAxisSizingMode = "AUTO";
    sheet.counterAxisSizingMode = "AUTO";
    sheet.itemSpacing = 0;
    sheet.paddingTop = 0;
    sheet.paddingBottom = 0;
    sheet.paddingLeft = 0;
    propagateResolvedVariableModes(sheet, node);
    sheet.paddingRight = 0;
    sheet.clipsContent = false;
    sheet.fills = solidPaint(COLOR_PAGE_BG);
    var hero = makeSectionWrapper(node.name);
    hero.name = SPEC_PREFIX + "Hero Section";
    hero.itemSpacing = 0;
    sheet.appendChild(hero);
    sheet.appendChild(makeMetaSection());
    if (modules.anatomy) {
      await buildAnatomySheetSection(sheet, node);
    }
    await buildPropertiesSheetSection(sheet, node, stateTarget);
    if (modules.spacing || modules.dimensions) {
      await buildLayoutSheetSection(sheet, node);
    }
    if (modules.variables) {
      await buildVariablesSheetSection(sheet, node);
    }
    finalizeSheetWidth(sheet);
    sheet.x = b.x;
    sheet.y = b.y + b.h + 80;
    page.appendChild(sheet);
    sheet.setPluginData("sourceNodeId", node.id);
    sheet.setPluginData("specModules", JSON.stringify(modules || {}));
    return sheet;
  }
  async function getSelectionStateSummaryAsync() {
    var selection2 = figma.currentPage.selection;
    for (var i = 0; i < selection2.length; i++) {
      var target = await findStateTargetAsync(selection2[i]);
      if (!target || target.states.length === 0) continue;
      return {
        hasStateTarget: true,
        targetName: target.targetName,
        states: target.states,
        message: "State property found on " + target.targetName + ": " + target.states.join(", ")
      };
    }
    return {
      hasStateTarget: false,
      targetName: "",
      states: [],
      message: STATE_SELECTION_HINT
    };
  }
  var STATE_SELECTION_HINT = "Select a component instance to generate spec documentation.";
  var NO_STATE_SUMMARY = {
    hasStateTarget: false,
    targetName: "",
    states: [],
    message: STATE_SELECTION_HINT
  };
  function getSheetSourceId(sheet) {
    try {
      return sheet.getPluginData ? sheet.getPluginData("sourceNodeId") || "" : "";
    } catch (e) {
      return "";
    }
  }
  function getAllSpecSheets() {
    var out = [];
    var children = figma.currentPage.children || [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.type !== "FRAME") continue;
      if (getSheetSourceId(child)) {
        out.push(child);
        continue;
      }
      if (child.name === SPEC_PREFIX + "Generated Sheets") {
        var inner = child.children || [];
        for (var r = 0; r < inner.length; r++) {
          var grand = inner[r];
          if (grand.type === "FRAME" && getSheetSourceId(grand)) {
            out.push(grand);
          }
        }
      }
    }
    return out;
  }
  function collectSelectionTargetIds() {
    var ids = {};
    var selection2 = figma.currentPage.selection;
    for (var i = 0; i < selection2.length; i++) {
      var node = selection2[i];
      if (node.type !== "COMPONENT" && node.type !== "INSTANCE" && node.type !== "FRAME") continue;
      if (getSheetSourceId(node)) continue;
      if (node.name && node.name.indexOf(SPEC_PREFIX) === 0) continue;
      ids[node.id] = true;
      if (typeof node.findAllWithCriteria === "function") {
        var nested = node.findAllWithCriteria({ types: ["COMPONENT", "INSTANCE", "FRAME"] });
        for (var n = 0; n < nested.length; n++) {
          ids[nested[n].id] = true;
        }
      }
      var ancestor = node.parent;
      while (ancestor && ancestor.type !== "PAGE") {
        if (ancestor.id) ids[ancestor.id] = true;
        ancestor = ancestor.parent;
      }
    }
    return ids;
  }
  function findLinkedSheets() {
    var selection2 = figma.currentPage.selection;
    var sheets = getAllSpecSheets();
    if (selection2.length === 0) {
      return sheets;
    }
    var linked = [];
    var seen = {};
    for (var s = 0; s < selection2.length; s++) {
      var sel = selection2[s];
      if (sel.type === "FRAME" && getSheetSourceId(sel) && !seen[sel.id]) {
        seen[sel.id] = true;
        linked.push(sel);
      }
    }
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
  function postSelectionStateToUI() {
    var resyncableCount = 0;
    try {
      resyncableCount = findLinkedSheets().length;
    } catch (e) {
      resyncableCount = 0;
    }
    var resyncIsBatch = figma.currentPage.selection.length === 0;
    getSelectionStateSummaryAsync().then(function(summary) {
      figma.ui.postMessage({ type: "selection-state", selection: summary, resyncableCount, resyncIsBatch });
    }).catch(function() {
      figma.ui.postMessage({ type: "selection-state", selection: NO_STATE_SUMMARY, resyncableCount, resyncIsBatch });
    });
  }
  function clearAllSpecs() {
    var count2 = 0;
    function recurse(parent) {
      if (!("children" in parent)) return;
      var children = parent.children;
      var i = children.length - 1;
      while (i >= 0) {
        if (children[i].name.indexOf(SPEC_PREFIX) === 0 || getSheetSourceId(children[i])) {
          children[i].remove();
          count2++;
        } else {
          recurse(children[i]);
        }
        i--;
      }
    }
    recurse(figma.currentPage);
    return count2;
  }
  function isTopLevelSpecSheet(node) {
    var n = node;
    if (!n || n.type !== "FRAME") return false;
    if (!n.parent || n.parent.type !== "PAGE") return false;
    if (!n.name || n.name.indexOf(SPEC_PREFIX) !== 0) return false;
    if (n.name === SPEC_PREFIX + "Generated Sheets") return false;
    if (n.layoutMode !== "VERTICAL") return false;
    if (!n.children || n.children.length === 0) return false;
    return true;
  }
  function getOrCreateSpecsRow(anchorX, anchorY) {
    var page = figma.currentPage;
    var children = page.children || [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.type === "FRAME" && child.name === SPEC_PREFIX + "Generated Sheets") {
        return child;
      }
    }
    var row = figma.createFrame();
    row.name = SPEC_PREFIX + "Generated Sheets";
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = 40;
    row.paddingTop = 0;
    row.paddingBottom = 0;
    row.paddingLeft = 0;
    row.paddingRight = 0;
    row.fills = [];
    row.clipsContent = false;
    row.layoutWrap = "NO_WRAP";
    row.x = anchorX;
    row.y = anchorY;
    page.appendChild(row);
    return row;
  }
  function findSpecsRow() {
    var page = figma.currentPage;
    var children = page.children || [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.type === "FRAME" && child.name === SPEC_PREFIX + "Generated Sheets") {
        return child;
      }
    }
    return null;
  }
  function arrangeSpecSheetsSideBySide(newSheets, anchorX, anchorY) {
    var page = figma.currentPage;
    var pageChildren = page.children || [];
    var newIds = {};
    for (var ni = 0; ni < newSheets.length; ni++) {
      newIds[newSheets[ni].id] = true;
    }
    var looseSheets = [];
    for (var i = 0; i < pageChildren.length; i++) {
      var candidate = pageChildren[i];
      if (!isTopLevelSpecSheet(candidate)) continue;
      if (newIds[candidate.id]) continue;
      looseSheets.push(candidate);
    }
    var row = findSpecsRow();
    var existingInRow = [];
    if (row) {
      var rowChildren = row.children || [];
      for (var r = 0; r < rowChildren.length; r++) {
        if (rowChildren[r].type === "FRAME") {
          existingInRow.push(rowChildren[r]);
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
    looseSheets.sort(function(a, b) {
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
  function registerSpecSelectionTracking() {
    figma.on("selectionchange", function() {
      postSelectionStateToUI();
    });
  }
  function pushSpecSelectionState() {
    postSelectionStateToUI();
  }
  function handleSpecMessage(msg) {
    if (msg.type === "generate-specs") {
      var selection2 = figma.currentPage.selection;
      if (selection2.length === 0) {
        figma.ui.postMessage({ type: "error", message: "Select a component or instance first." });
        return;
      }
      applyUiTokenOverrides(msg.tokens);
      var modules = msg.modules || {
        anatomy: true,
        spacing: true,
        dimensions: true,
        styles: true,
        componentInstance: true,
        variables: true
      };
      resolveLocalFonts(selection2);
      Promise.all([
        figma.loadFontAsync(FONT_REGULAR),
        figma.loadFontAsync(FONT_MEDIUM),
        figma.loadFontAsync(FONT_BOLD)
      ]).then(async function() {
        var totalGenerated = 0;
        var generatedSheets = [];
        var anchorX = Number.POSITIVE_INFINITY;
        var anchorY = 0;
        for (var si = 0; si < selection2.length; si++) {
          var sb = getNodeBounds(selection2[si]);
          if (sb.x < anchorX) anchorX = sb.x;
          if (sb.y + sb.h + 80 > anchorY) anchorY = sb.y + sb.h + 80;
        }
        if (!isFinite(anchorX)) anchorX = 0;
        for (var s = 0; s < selection2.length; s++) {
          var node = selection2[s];
          if (node.type !== "COMPONENT" && node.type !== "INSTANCE" && node.type !== "FRAME") continue;
          var createdSheet = await createReferenceStyleSpecSheetAsync(node, figma.currentPage, modules);
          generatedSheets.push(createdSheet);
          totalGenerated++;
        }
        arrangeSpecSheetsSideBySide(generatedSheets, anchorX, anchorY);
        figma.ui.postMessage({
          type: "success",
          message: "Generated specs for " + totalGenerated + " component(s)."
        });
        postSelectionStateToUI();
      }).catch(function(err) {
        figma.ui.postMessage({ type: "error", message: "Error generating specs: " + (err && err.message || err) });
      });
    }
    if (msg.type === "resync-specs") {
      (async function() {
        try {
          applyUiTokenOverrides(msg.tokens);
          var linked = findLinkedSheets();
          if (linked.length === 0) {
            var noneMsg = figma.currentPage.selection.length === 0 ? "No spec sheets found on this page yet. Generate specs first." : "No spec sheets linked to this selection. Generate specs first.";
            figma.ui.postMessage({ type: "error", message: noneMsg });
            return;
          }
          var defaultModules = {
            anatomy: true,
            spacing: true,
            dimensions: true,
            styles: true,
            componentInstance: true,
            variables: true
          };
          var jobs = [];
          var orphans = 0;
          for (var i = 0; i < linked.length; i++) {
            var sheet = linked[i];
            var source = await figma.getNodeByIdAsync(getSheetSourceId(sheet));
            if (!source || source.type !== "COMPONENT" && source.type !== "INSTANCE" && source.type !== "FRAME") {
              sheet.remove();
              orphans++;
              continue;
            }
            var storedModules = null;
            try {
              storedModules = JSON.parse(sheet.getPluginData("specModules") || "null");
            } catch (e) {
              storedModules = null;
            }
            jobs.push({ sheet, source, modules: storedModules || msg.modules || defaultModules });
          }
          if (jobs.length === 0) {
            figma.ui.postMessage({ type: "success", message: "Removed " + orphans + " orphaned sheet(s) \u2014 their components no longer exist." });
            postSelectionStateToUI();
            return;
          }
          var sources = [];
          for (var s = 0; s < jobs.length; s++) sources.push(jobs[s].source);
          resolveLocalFonts(sources);
          await Promise.all([
            figma.loadFontAsync(FONT_REGULAR),
            figma.loadFontAsync(FONT_MEDIUM),
            figma.loadFontAsync(FONT_BOLD)
          ]);
          var refreshed = 0;
          for (var j = 0; j < jobs.length; j++) {
            var job = jobs[j];
            var parent = job.sheet.parent;
            var index = parent && parent.children ? parent.children.indexOf(job.sheet) : -1;
            var oldX = job.sheet.x;
            var oldY = job.sheet.y;
            var newSheet = await createReferenceStyleSpecSheetAsync(job.source, figma.currentPage, job.modules);
            job.sheet.remove();
            if (parent && parent.type !== "PAGE" && index >= 0 && !parent.removed) {
              var insertAt = Math.min(index, parent.children.length);
              parent.insertChild(insertAt, newSheet);
            } else {
              newSheet.x = oldX;
              newSheet.y = oldY;
            }
            refreshed++;
          }
          var summaryText = "Resynced " + refreshed + " spec sheet(s)" + (orphans > 0 ? ", removed " + orphans + " orphaned" : "") + ".";
          figma.ui.postMessage({ type: "success", message: summaryText });
          postSelectionStateToUI();
        } catch (err) {
          figma.ui.postMessage({ type: "error", message: "Error resyncing specs: " + (err && err.message || err) });
        }
      })();
    }
    if (msg.type === "clear-specs") {
      var count2 = clearAllSpecs();
      figma.ui.postMessage({
        type: "success",
        message: "Removed " + count2 + " annotation(s)."
      });
    }
    if (msg.type === "close") {
      figma.closePlugin();
    }
  }

  // src/variables.ts
  var CONFIRM_MSGS = ["Done!", "You got it!", "Aye!", "Is that all?", "My job here is done.", "Gotcha!", "It wasn't hard.", "Got it! What's next?"];
  var ACTION_MSGS = ["Updated", "Writed", "Made it with", "Got"];
  var IDLE_MSGS = ["Did not found any variables", "Nothing to do, see no variables", "Any variables? Can't see it", "Can't update any variables. Did you set 'em up?"];
  var DEFAULT_MODE_NAME = "Mode 1";
  var REWRITE_MSG = "Rewrite this frame with new variables";
  var notification;
  var selection;
  var working;
  var count = 0;
  function sanitizeName(name) {
    if (!name) return name;
    return name.replace(/\//g, ".").trim().toLowerCase();
  }
  function hexToRGB(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  }
  function naturalSort(a, b) {
    const aParts = a.match(/(\d+|\D+)/g) || [];
    const bParts = b.match(/(\d+|\D+)/g) || [];
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || "";
      const bPart = bParts[i] || "";
      const aNum = parseInt(aPart, 10);
      const bNum = parseInt(bPart, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  }
  var FONT_REGULAR2 = { family: "Inter", style: "Regular" };
  var FONT_SEMIBOLD = { family: "Inter", style: "Semi Bold" };
  var FONT_ITALIC = { family: "Inter", style: "Italic" };
  var LIGHT = { type: "SOLID", color: hexToRGB("#fcfcfc") };
  var DARK = { type: "SOLID", color: hexToRGB("#313131") };
  var DARK_20 = { type: "SOLID", color: hexToRGB("#313131"), opacity: 0.2 };
  var COLOR_BLACK = { type: "SOLID", color: hexToRGB("#000000") };
  var COLOR_WHITE = { type: "SOLID", color: hexToRGB("#ffffff") };
  var COLOR_BORDER = { type: "SOLID", color: hexToRGB("#cccccc") };
  var COLOR_BG_LIGHT = { type: "SOLID", color: hexToRGB("#666666") };
  var COLOR_TEXT_SECONDARY = { type: "SOLID", color: hexToRGB("#999999") };
  var COLOR_DARK_MODE_BG = { type: "SOLID", color: hexToRGB("#000000") };
  var COLOR_DARK_MODE_TEXT = { type: "SOLID", color: hexToRGB("#ffffff") };
  var COLOR_DARK_MODE_BORDER = { type: "SOLID", color: hexToRGB("#cccccc") };
  var PREVIEW_WIDTH = 96;
  var PREVIEW_HEIGHT = 75;
  var SWATCH_SIZE = 32;
  var LEFT_COLUMN_WIDTH = 696;
  var MIN_MODE_COLUMN_WIDTH = 450;
  var ROW_PADDING = 16;
  var BORDER_RADIUS_SM = 6;
  var GAP_BETWEEN_ROWS = 48;
  var GAP_PREVIEW_ITEMS = 12;
  var GAP_SWATCH_ITEMS = 8;
  var GAP_BETWEEN_SECTIONS = 0;
  var FONT_SIZE = 24;
  var L_FONT_SIZE = 40;
  var CORNER_RADIUS = 16;
  var MAX_COLUMN_WIDTH = 1440;
  figma.on("currentpagechange", cancel);
  function handleCreateAutoLayout() {
    const selection2 = figma.currentPage.selection;
    if (selection2.length === 0) {
      figma.notify("Please select at least one layer");
      return;
    }
    let createdCount = 0;
    for (const node of selection2) {
      const frame = figma.createFrame();
      frame.name = `Auto Layout - ${node.name}`;
      frame.layoutMode = "HORIZONTAL";
      frame.itemSpacing = 16;
      frame.paddingLeft = 16;
      frame.paddingRight = 16;
      frame.paddingTop = 16;
      frame.paddingBottom = 16;
      frame.layoutSizingHorizontal = "HUG";
      frame.layoutSizingVertical = "HUG";
      frame.clipsContent = false;
      const parent = node.parent;
      if (parent && parent.type !== "PAGE") {
        parent.insertChild(parent.children.indexOf(node) + 1, frame);
      } else {
        figma.currentPage.appendChild(frame);
      }
      frame.x = node.x;
      frame.y = node.y + (node.height || 0) + 20;
      frame.appendChild(node);
      createdCount++;
    }
    figma.notify(`Created ${createdCount} auto layout frame${createdCount !== 1 ? "s" : ""}`);
  }
  var collections = [];
  var activeCollections = [];
  var activeColorStyleIds = [];
  var activeEffectStyleIds = [];
  var activeLayoutStyleIds = [];
  var activeTextStyleIds = [];
  var mainFrame;
  var TOKENS_DOC_KEY = "dsTokensDoc";
  var TOKENS_CONFIG_KEY = "dsTokensConfig";
  function findTokensDocFrame() {
    try {
      var children = figma.currentPage.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.type === "FRAME" && child.getPluginData(TOKENS_DOC_KEY) === "1") {
          return child;
        }
      }
    } catch (e) {
    }
    return null;
  }
  function propagateSelectedVariableModes(target) {
    try {
      var sel = figma.currentPage.selection[0];
      if (!sel) return;
      var resolved = sel.resolvedVariableModes;
      if (!resolved) return;
      var ids = Object.keys(resolved);
      for (var i = 0; i < ids.length; i++) {
        try {
          target.setExplicitVariableModeForCollection(ids[i], resolved[ids[i]]);
        } catch (e) {
        }
      }
    } catch (e) {
    }
  }
  var variablesFrame;
  var stylesFrame;
  function createMainFrame() {
    mainFrame = createAutolayout("Variables and Styles", "HORIZONTAL", 100, 0, 0);
    mainFrame.fills = [];
    mainFrame.layoutSizingHorizontal = "HUG";
    mainFrame.layoutSizingVertical = "HUG";
    variablesFrame = createAutolayout("Local Variables", "HORIZONTAL", 100, 0, 0);
    variablesFrame.fills = [];
    variablesFrame.layoutSizingHorizontal = "HUG";
    variablesFrame.layoutSizingVertical = "HUG";
    mainFrame.appendChild(variablesFrame);
    stylesFrame = createAutolayout("Local Styles", "HORIZONTAL", 100, 0, 0);
    stylesFrame.fills = [];
    stylesFrame.layoutSizingHorizontal = "HUG";
    stylesFrame.layoutSizingVertical = "HUG";
    mainFrame.appendChild(stylesFrame);
    let rightmostX = 0;
    for (const node of figma.currentPage.children) {
      if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "SECTION") {
        const nodeRight = node.x + node.width;
        if (nodeRight > rightmostX) {
          rightmostX = nodeRight;
        }
      }
    }
    mainFrame.x = rightmostX + 100;
    mainFrame.y = 0;
    mainFrame.cornerRadius = CORNER_RADIUS;
    mainFrame.setRelaunchData({ rewrite: REWRITE_MSG });
    try {
      figma.currentPage.insertChild(0, mainFrame);
    } catch (e) {
      figma.currentPage.appendChild(mainFrame);
    }
  }
  function getTokensInitData() {
    working = false;
    selection = figma.currentPage.selection;
    collections = figma.variables.getLocalVariableCollections() || [];
    activeCollections = collections;
    const sel = selection.map((s) => ({ id: s.id, name: s.name, type: s.type }));
    const cols = collections.map((c) => ({ id: c.id, name: c.name, modeCount: c.modes.length }));
    const paintStyles = figma.getLocalPaintStyles().map((s) => ({ id: s.id, name: s.name }));
    const effectStyles = figma.getLocalEffectStyles().map((s) => ({ id: s.id, name: s.name }));
    const textStyles = figma.getLocalTextStyles().map((s) => {
      const asAny = s;
      let colorHex = null;
      let colorAliasId = null;
      try {
        const fills = asAny.fills;
        if (Array.isArray(fills) && fills.length) {
          const first = fills[0];
          if (first && first.type === "SOLID" && first.color) {
            colorHex = figmaRGBToHex(first.color);
          } else if (first && first.type === "VARIABLE_ALIAS" && first.id) {
            colorAliasId = first.id;
          }
        }
      } catch (e) {
      }
      let fontFamily = null;
      let fontStyle = null;
      let fontWeight = null;
      try {
        if (asAny.fontName) {
          if (typeof asAny.fontName === "string") {
            fontFamily = asAny.fontName;
          } else {
            fontFamily = asAny.fontName.family || null;
            fontStyle = asAny.fontName.style || null;
            if (fontStyle && /\b(\d{3})\b/.test(fontStyle)) {
              const m = fontStyle.match(/(\d{3})/);
              fontWeight = m ? parseInt(m[0], 10) : fontStyle;
            } else {
              fontWeight = fontStyle;
            }
          }
        }
      } catch (e) {
      }
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
      };
    });
    const layoutStyles = figma.getLocalGridStyles().map((s) => ({ id: s.id, name: s.name }));
    return {
      type: "tokens-init",
      selection: sel,
      collections: cols,
      colorStyles: paintStyles,
      effectStyles,
      textStyles,
      layoutStyles,
      resyncAvailable: !!findTokensDocFrame()
    };
  }
  async function regenerateTokensDoc(targetFrame, selectedCollectionIds, colorIds, effectIds, textIds, layoutIds) {
    working = true;
    count = 0;
    selection = figma.currentPage.selection;
    figma.ui.postMessage({ type: "tokens-status", text: "Preparing generation..." });
    activeCollections = collections.filter((c) => selectedCollectionIds.indexOf(c.id) !== -1);
    activeColorStyleIds = colorIds;
    activeEffectStyleIds = effectIds;
    activeTextStyleIds = textIds;
    activeLayoutStyleIds = layoutIds;
    if (targetFrame) {
      mainFrame = targetFrame;
      while (mainFrame.children.length) mainFrame.children[0].remove();
    } else {
      createMainFrame();
    }
    propagateSelectedVariableModes(mainFrame);
    figma.ui.postMessage({ type: "tokens-status", text: "Writing variables..." });
    await writeVariables((progress) => figma.ui.postMessage({ type: "tokens-progress", text: progress }));
    figma.ui.postMessage({ type: "tokens-status", text: "Writing styles..." });
    await writeStyles((progress) => figma.ui.postMessage({ type: "tokens-progress", text: progress }));
    mainFrame.setPluginData(TOKENS_DOC_KEY, "1");
    mainFrame.setPluginData(TOKENS_CONFIG_KEY, JSON.stringify({
      collections: selectedCollectionIds,
      colorStyles: colorIds,
      effectStyles: effectIds,
      textStyles: textIds,
      layoutStyles: layoutIds
    }));
    finish();
  }
  function handleTokensConfirm(msg) {
    (async () => {
      var _a, _b;
      try {
        collections = figma.variables.getLocalVariableCollections() || [];
        selection = figma.currentPage.selection;
        var existingByData = findTokensDocFrame();
        var existingByRelaunch = ((_a = selection[0]) == null ? void 0 : _a.type) === "FRAME" && ((_b = selection[0]) == null ? void 0 : _b.getRelaunchData().rewrite) === REWRITE_MSG ? selection[0] : null;
        var target = existingByData || existingByRelaunch || null;
        var selectedIds = Array.isArray(msg.collections) ? msg.collections : collections.map((c) => c.id);
        await regenerateTokensDoc(
          target,
          selectedIds,
          Array.isArray(msg.colorStyles) ? msg.colorStyles : [],
          Array.isArray(msg.effectStyles) ? msg.effectStyles : [],
          Array.isArray(msg.textStyles) ? msg.textStyles : [],
          Array.isArray(msg.layoutStyles) ? msg.layoutStyles : []
        );
      } catch (err) {
        working = false;
        const message = err && err.message ? err.message : String(err);
        figma.ui.postMessage({ type: "tokens-status", text: "Error: " + message });
        notify("Error: " + message);
      }
    })();
  }
  function handleTokensResync() {
    (async () => {
      try {
        var target = findTokensDocFrame();
        if (!target) {
          figma.ui.postMessage({ type: "tokens-status", text: "No token documentation found on this page yet \u2014 use Confirm to generate one first." });
          return;
        }
        var stored = null;
        try {
          stored = JSON.parse(target.getPluginData(TOKENS_CONFIG_KEY) || "null");
        } catch (e) {
          stored = null;
        }
        if (!stored) {
          figma.ui.postMessage({ type: "tokens-status", text: "No saved selection to resync \u2014 use Confirm instead." });
          return;
        }
        collections = figma.variables.getLocalVariableCollections() || [];
        await regenerateTokensDoc(
          target,
          stored.collections || [],
          stored.colorStyles || [],
          stored.effectStyles || [],
          stored.textStyles || [],
          stored.layoutStyles || []
        );
      } catch (err) {
        working = false;
        const message = err && err.message ? err.message : String(err);
        figma.ui.postMessage({ type: "tokens-status", text: "Error: " + message });
        notify("Error: " + message);
      }
    })();
  }
  async function writeVariables(onProgress) {
    var _a, _b;
    await figma.loadFontAsync(FONT_REGULAR2);
    await figma.loadFontAsync(FONT_SEMIBOLD);
    await figma.loadFontAsync(FONT_ITALIC);
    for (const c of activeCollections) {
      if (onProgress) onProgress("Collection: " + c.name);
      const collectionBox = createAutolayout(c.name, "VERTICAL", GAP_BETWEEN_SECTIONS, 0, 0);
      collectionBox.fills = [LIGHT];
      collectionBox.layoutSizingVertical = "HUG";
      collectionBox.layoutSizingHorizontal = "HUG";
      collectionBox.minWidth = MAX_COLUMN_WIDTH;
      variablesFrame.appendChild(collectionBox);
      const variables = c.variableIds.map((id) => figma.variables.getVariableById(id));
      variables.sort((a, b) => naturalSort(a.name, b.name));
      const modes = c.modes;
      const headerRow = createAutolayout(c.name + "-modes-header", "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
      collectionBox.appendChild(headerRow);
      headerRow.layoutSizingHorizontal = "HUG";
      headerRow.minWidth = MAX_COLUMN_WIDTH;
      headerRow.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      headerRow.strokeWeight = 1;
      headerRow.dashPattern = [4, 4];
      headerRow.strokeBottomWeight = 1;
      headerRow.strokeTopWeight = 0;
      headerRow.strokeLeftWeight = 0;
      headerRow.strokeRightWeight = 0;
      const leftHeader = createAutolayout("left-header", "VERTICAL", 4, ROW_PADDING, ROW_PADDING);
      headerRow.appendChild(leftHeader);
      leftHeader.layoutSizingHorizontal = "FIXED";
      leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height);
      const cHeader = makeText2(sanitizeName(c.name), FONT_SEMIBOLD, L_FONT_SIZE);
      addToColumn(leftHeader, cHeader);
      for (const m of modes) {
        const headerCell = createAutolayout("mode-header-" + m.modeId, "VERTICAL", 0, ROW_PADDING, ROW_PADDING);
        headerRow.appendChild(headerCell);
        headerCell.layoutSizingHorizontal = "HUG";
        headerCell.layoutSizingVertical = "FILL";
        headerCell.minWidth = MIN_MODE_COLUMN_WIDTH;
        headerCell.primaryAxisAlignItems = "CENTER";
        headerCell.counterAxisAlignItems = "CENTER";
        if (m.name.toLowerCase() === "dark") {
          headerCell.fills = [COLOR_DARK_MODE_BG];
          headerCell.topLeftRadius = 16;
          headerCell.topRightRadius = 16;
        }
        const valueHeader = makeText2(m.name === DEFAULT_MODE_NAME && modes.length === 1 ? "Value" : m.name, FONT_SEMIBOLD, FONT_SIZE);
        valueHeader.fills = m.name.toLowerCase() === "dark" ? [COLOR_DARK_MODE_TEXT] : [{ type: "SOLID", color: hexToRGB("#000000") }];
        addToColumn(headerCell, valueHeader);
        valueHeader.textAlignVertical = "CENTER";
      }
      for (const v of variables) {
        if (onProgress) onProgress("Variable: " + v.name);
        const row = createAutolayout("row-" + v.name, "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
        collectionBox.appendChild(row);
        row.layoutSizingHorizontal = "HUG";
        row.minWidth = MAX_COLUMN_WIDTH;
        const isLast = variables.indexOf(v) === variables.length - 1;
        if (!isLast) {
          row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
          row.strokeWeight = 1;
          row.dashPattern = [4, 4];
          row.strokeBottomWeight = 1;
          row.strokeTopWeight = 0;
          row.strokeLeftWeight = 0;
          row.strokeRightWeight = 0;
        }
        const leftCell = createAutolayout("left-" + v.name, "VERTICAL", 4);
        row.appendChild(leftCell);
        leftCell.layoutSizingHorizontal = "FIXED";
        leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height);
        leftCell.paddingTop = ROW_PADDING;
        leftCell.paddingBottom = ROW_PADDING;
        leftCell.paddingLeft = ROW_PADDING;
        leftCell.paddingRight = ROW_PADDING;
        const vName = makeText2(sanitizeName(v.name), FONT_SEMIBOLD, FONT_SIZE);
        addToColumn(leftCell, vName);
        const vDesc = makeText2(v.description || "no description", FONT_REGULAR2, 14);
        vDesc.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(leftCell, vDesc);
        count++;
        for (const m of modes) {
          const isDark = m.name.toLowerCase() === "dark";
          const isLastRow = variables.indexOf(v) === variables.length - 1;
          const valueColumn = createAutolayout("value-" + v.name + "-" + m.modeId, "VERTICAL", isDark ? 8 : 8);
          row.appendChild(valueColumn);
          valueColumn.layoutSizingHorizontal = "HUG";
          valueColumn.layoutSizingVertical = "FILL";
          valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH;
          if (modes.length > 2) valueColumn.maxWidth = 500;
          valueColumn.setExplicitVariableModeForCollection(c.id, m.modeId);
          if (isDark) {
            valueColumn.fills = [COLOR_DARK_MODE_BG];
            valueColumn.strokes = [COLOR_DARK_MODE_BORDER];
            valueColumn.strokeWeight = 1;
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
            if (isLastRow) {
              valueColumn.bottomLeftRadius = 16;
              valueColumn.bottomRightRadius = 16;
            }
          } else {
            valueColumn.fills = [];
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
          }
          if (typeof m.name === "string" && /interaction|focus/i.test(m.name)) {
            valueColumn.clipsContent = false;
            row.clipsContent = false;
          }
          const rawValue = v.valuesByMode[m.modeId];
          const type = v.resolvedType;
          let valueStr = "";
          let font = FONT_REGULAR2;
          let isAlias = false;
          if (rawValue && typeof rawValue === "object" && rawValue.type === "VARIABLE_ALIAS") {
            isAlias = true;
            const aliased = figma.variables.getVariableById(rawValue.id);
            valueStr = aliased ? aliased.name.toString() : String(rawValue.id);
            font = FONT_ITALIC;
          } else {
            if (type === "COLOR") {
              valueStr = figmaRGBToHex(rawValue);
            } else if (rawValue && typeof rawValue === "object" && (rawValue.paints || Array.isArray(rawValue) && rawValue[0] && rawValue[0].type)) {
              const paints = rawValue.paints ? rawValue.paints : Array.isArray(rawValue) ? rawValue : [rawValue];
              const first = paints[0];
              if (first) {
                if (first.type === "SOLID" && first.color) {
                  valueStr = figmaRGBToHex(first.color);
                } else if (first.gradientStops && Array.isArray(first.gradientStops)) {
                  const gradientPreview = figma.createRectangle();
                  gradientPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
                  try {
                    const gradFills = JSON.parse(JSON.stringify(gradientPreview.fills));
                    gradFills[0] = figma.variables.setBoundVariableForPaint(gradFills[0], "color", v);
                    gradientPreview.fills = gradFills;
                  } catch (e) {
                    gradientPreview.fills = [first];
                  }
                  valueColumn.appendChild(gradientPreview);
                  const gtype = (first.type || "GRADIENT").replace(/^GRADIENT_?/i, "");
                  const gradientType = gtype.charAt(0).toUpperCase() + gtype.slice(1).toLowerCase();
                  const firstPos = Math.round((((_a = first.gradientStops[0]) == null ? void 0 : _a.position) || 0) * 100) + "%";
                  const gradientHeader = makeText2(gradientType + " \u2014 " + firstPos, FONT_REGULAR2, FONT_SIZE);
                  gradientHeader.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
                  valueColumn.appendChild(gradientHeader);
                  for (const s of first.gradientStops) {
                    const stopRow = createAutolayout("gradient-stop", "HORIZONTAL", GAP_SWATCH_ITEMS);
                    valueColumn.appendChild(stopRow);
                    const colorVar = resolveColorVariableForMode(s.color, c.id, m.modeId);
                    const swatchPreview = figma.createRectangle();
                    swatchPreview.resize(SWATCH_SIZE, SWATCH_SIZE);
                    swatchPreview.cornerRadius = BORDER_RADIUS_SM;
                    if (colorVar) {
                      swatchPreview.setExplicitVariableModeForCollection(c.id, m.modeId);
                      const swatchFills = JSON.parse(JSON.stringify(swatchPreview.fills));
                      try {
                        swatchFills[0] = figma.variables.setBoundVariableForPaint(swatchFills[0], "color", colorVar);
                      } catch (e) {
                      }
                      swatchPreview.fills = swatchFills;
                    } else {
                      const col = { r: s.color.r || 0, g: s.color.g || 0, b: s.color.b || 0 };
                      const alpha = s.color.a !== void 0 ? s.color.a : 1;
                      swatchPreview.fills = [{ type: "SOLID", color: col, opacity: alpha }];
                    }
                    stopRow.appendChild(swatchPreview);
                    const label = colorVar ? sanitizeName(colorVar.name) : resolveColorLabel(s.color);
                    const labelTxt = makeText2(label, FONT_REGULAR2, FONT_SIZE);
                    labelTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
                    stopRow.appendChild(labelTxt);
                    if (colorVar) {
                      const hex = figmaRGBToHex(s.color);
                      const hexTxt = makeText2(hex, FONT_REGULAR2, FONT_SIZE);
                      hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY];
                      stopRow.appendChild(hexTxt);
                    }
                  }
                  const lastPos = Math.round((((_b = first.gradientStops[first.gradientStops.length - 1]) == null ? void 0 : _b.position) || 1) * 100) + "%";
                  const gradientFooter = makeText2(lastPos, FONT_REGULAR2, FONT_SIZE);
                  gradientFooter.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
                  valueColumn.appendChild(gradientFooter);
                  valueStr = "";
                } else {
                  valueStr = first.type ? String(first.type) : JSON.stringify(first);
                }
              }
            } else if (rawValue && typeof rawValue === "object" && rawValue.effects) {
              try {
                const parts = rawValue.effects.map((e) => {
                  if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
                    const ox = Math.round(e.offset && e.offset.x || 0);
                    const oy = Math.round(e.offset && e.offset.y || 0);
                    const blur = Math.round(e.radius || 0);
                    const alpha = e.color && e.color.a !== void 0 ? e.color.a : 1;
                    const col = e.color ? figmaRGBToHex(e.color) : "";
                    return `${e.type} ${ox}px ${oy}px ${blur}px ${col} ${Math.round(alpha * 100)}%`;
                  }
                  if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
                    return `${e.type} ${Math.round(e.radius || 0)}px`;
                  }
                  return e.type;
                });
                valueStr = parts.join("; ");
              } catch (e) {
                valueStr = JSON.stringify(rawValue.effects);
              }
            } else {
              valueStr = rawValue !== void 0 && rawValue !== null ? rawValue.toString() : "";
            }
          }
          if (type === "COLOR") {
            const previewRow = createAutolayout("preview-" + v.name + "-" + m.modeId, "VERTICAL", GAP_PREVIEW_ITEMS);
            valueColumn.appendChild(previewRow);
            previewRow.layoutSizingHorizontal = "FILL";
            const colorPreview = figma.createRectangle();
            colorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
            if (isAlias && "cornerRadius" in colorPreview) colorPreview.cornerRadius = 4;
            if (!isAlias && "cornerRadius" in colorPreview) colorPreview.cornerRadius = 24;
            const newFills = JSON.parse(JSON.stringify(colorPreview.fills));
            try {
              newFills[0] = figma.variables.setBoundVariableForPaint(newFills[0], "color", v);
            } catch (e) {
            }
            colorPreview.fills = newFills;
            colorPreview.strokes = [DARK_20];
            colorPreview.strokeWeight = 1;
            colorPreview.layoutAlign = "STRETCH";
            previewRow.appendChild(colorPreview);
            let displayHex = "";
            try {
              const fill = colorPreview.fills[0];
              if (fill && fill.type === "SOLID" && fill.color) {
                displayHex = figmaRGBToHex(fill.color);
              }
            } catch (e) {
              console.error("Error extracting color from indicator:", e);
            }
            const textStack = createAutolayout("text-stack", "VERTICAL", 4);
            previewRow.appendChild(textStack);
            textStack.layoutSizingHorizontal = "FILL";
            if (isAlias) {
              const aliasName = sanitizeName(valueStr);
              const labelText = makeText2(aliasName, FONT_REGULAR2, FONT_SIZE, false);
              labelText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
              labelText.layoutAlign = "STRETCH";
              textStack.appendChild(labelText);
              const hexText = makeText2(displayHex || valueStr, FONT_REGULAR2, FONT_SIZE, false);
              hexText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY];
              hexText.layoutAlign = "STRETCH";
              textStack.appendChild(hexText);
            } else {
              const hexText = makeText2(displayHex || valueStr, FONT_REGULAR2, FONT_SIZE, false);
              hexText.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY];
              hexText.layoutAlign = "STRETCH";
              textStack.appendChild(hexText);
            }
          } else if (type === "BOOLEAN") {
            const box = figma.createFrame();
            const isTrue = String(valueStr).toLowerCase() === "true";
            box.resizeWithoutConstraints(96, 50);
            box.cornerRadius = 12;
            box.fills = isTrue ? [DARK] : [];
            box.strokes = [DARK];
            box.strokeWeight = 2;
            valueColumn.appendChild(box);
          } else if (type === "FLOAT" && v.name.toLowerCase().includes("radius")) {
            const radiusPreview = figma.createRectangle();
            radiusPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
            radiusPreview.fills = [COLOR_BG_LIGHT];
            try {
              radiusPreview.setBoundVariable("topLeftRadius", v);
              radiusPreview.setBoundVariable("topRightRadius", v);
              radiusPreview.setBoundVariable("bottomLeftRadius", v);
              radiusPreview.setBoundVariable("bottomRightRadius", v);
            } catch (e) {
              const radiusValue = parseFloat(String(valueStr)) || 0;
              radiusPreview.cornerRadius = radiusValue;
            }
            valueColumn.appendChild(radiusPreview);
            const txt = makeText2(typeof valueStr === "string" ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE);
            txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
            valueColumn.appendChild(txt);
          } else if (type === "FLOAT" && (v.name.toLowerCase().includes("space") || v.name.toLowerCase().includes("spacing") || v.name.toLowerCase().includes("gap"))) {
            const spaceContainer = createAutolayout("space-preview", "HORIZONTAL", 0);
            spaceContainer.counterAxisAlignItems = "CENTER";
            valueColumn.appendChild(spaceContainer);
            const leftEllipse = figma.createEllipse();
            leftEllipse.resize(8, 8);
            leftEllipse.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BORDER];
            spaceContainer.appendChild(leftEllipse);
            const spacePreview = figma.createRectangle();
            spacePreview.resize(Math.max(parseFloat(String(valueStr)) || 1, 1), PREVIEW_HEIGHT);
            spacePreview.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BG_LIGHT];
            try {
              spacePreview.setBoundVariable("width", v);
            } catch (e) {
            }
            spaceContainer.appendChild(spacePreview);
            const rightEllipse = figma.createEllipse();
            rightEllipse.resize(8, 8);
            rightEllipse.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_BORDER];
            spaceContainer.appendChild(rightEllipse);
            const txt = makeText2(typeof valueStr === "string" ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE);
            txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
            valueColumn.appendChild(txt);
          } else {
            const txt = makeText2(typeof valueStr === "string" ? sanitizeName(valueStr) : String(valueStr), font, FONT_SIZE);
            txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
            valueColumn.appendChild(txt);
          }
        }
      }
    }
  }
  async function writeStyles(onProgress) {
    var _a, _b, _c, _d, _e;
    const allModes = [];
    for (const c of activeCollections) {
      for (const m of c.modes) {
        allModes.push({ collectionId: c.id, modeId: m.modeId, name: m.name });
      }
    }
    let modes = allModes.filter((m) => m.name !== DEFAULT_MODE_NAME);
    if (modes.length === 0) {
      modes = [{ collectionId: "", modeId: "", name: "Value" }];
    }
    const paintStyles = figma.getLocalPaintStyles().filter((s) => activeColorStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    if (paintStyles.length) {
      const collectionBox = createAutolayout("Color", "VERTICAL", GAP_BETWEEN_SECTIONS, 0, 0);
      collectionBox.fills = [LIGHT];
      collectionBox.layoutSizingVertical = "HUG";
      collectionBox.layoutSizingHorizontal = "HUG";
      collectionBox.minWidth = MAX_COLUMN_WIDTH;
      stylesFrame.appendChild(collectionBox);
      const headerRow = createAutolayout("color-styles-header", "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
      collectionBox.appendChild(headerRow);
      headerRow.layoutSizingHorizontal = "HUG";
      headerRow.minWidth = MAX_COLUMN_WIDTH;
      headerRow.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      headerRow.strokeWeight = 1;
      headerRow.dashPattern = [4, 4];
      headerRow.strokeBottomWeight = 1;
      headerRow.strokeTopWeight = 0;
      headerRow.strokeLeftWeight = 0;
      headerRow.strokeRightWeight = 0;
      const leftHeader = createAutolayout("left-header", "VERTICAL", 4, ROW_PADDING, ROW_PADDING);
      headerRow.appendChild(leftHeader);
      leftHeader.layoutSizingHorizontal = "FIXED";
      leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height);
      const cHeader = makeText2("Color", FONT_SEMIBOLD, L_FONT_SIZE);
      addToColumn(leftHeader, cHeader);
      for (const m of modes) {
        const headerCell = createAutolayout("mode-header-" + m.modeId, "VERTICAL", 0, ROW_PADDING, ROW_PADDING);
        headerRow.appendChild(headerCell);
        headerCell.layoutSizingHorizontal = "HUG";
        headerCell.layoutSizingVertical = "FILL";
        headerCell.minWidth = MIN_MODE_COLUMN_WIDTH;
        if (modes.length > 2) headerCell.maxWidth = 500;
        headerCell.primaryAxisAlignItems = "CENTER";
        headerCell.counterAxisAlignItems = "CENTER";
        if (m.name.toLowerCase() === "dark") {
          headerCell.fills = [COLOR_DARK_MODE_BG];
          headerCell.topLeftRadius = 16;
          headerCell.topRightRadius = 16;
        }
        const valueHeader = makeText2(m.name === DEFAULT_MODE_NAME && modes.length === 1 ? "Value" : m.name, FONT_SEMIBOLD, FONT_SIZE);
        valueHeader.fills = m.name.toLowerCase() === "dark" ? [COLOR_DARK_MODE_TEXT] : [{ type: "SOLID", color: hexToRGB("#000000") }];
        addToColumn(headerCell, valueHeader);
        valueHeader.textAlignVertical = "CENTER";
      }
      for (const s of paintStyles) {
        if (onProgress) onProgress("Color style: " + s.name);
        const row = createAutolayout("row-" + s.name, "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
        collectionBox.appendChild(row);
        row.layoutSizingHorizontal = "HUG";
        row.minWidth = MAX_COLUMN_WIDTH;
        const isLast = paintStyles.indexOf(s) === paintStyles.length - 1;
        if (!isLast) {
          row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
          row.strokeWeight = 1;
          row.dashPattern = [4, 4];
          row.strokeBottomWeight = 1;
          row.strokeTopWeight = 0;
          row.strokeLeftWeight = 0;
          row.strokeRightWeight = 0;
        }
        const leftCell = createAutolayout("left-" + s.name, "VERTICAL", 4);
        row.appendChild(leftCell);
        leftCell.layoutSizingHorizontal = "FIXED";
        leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height);
        leftCell.paddingTop = ROW_PADDING;
        leftCell.paddingBottom = ROW_PADDING;
        leftCell.paddingLeft = ROW_PADDING;
        leftCell.paddingRight = ROW_PADDING;
        const sName = makeText2(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE);
        addToColumn(leftCell, sName);
        const sDesc = makeText2(s.description || "no description", FONT_REGULAR2, 14);
        sDesc.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(leftCell, sDesc);
        for (const m of modes) {
          const isDark = m.name.toLowerCase() === "dark";
          const isLastRow = paintStyles.indexOf(s) === paintStyles.length - 1;
          const valueColumn = createAutolayout("value-" + s.name + "-" + m.modeId, "VERTICAL", isDark ? 8 : 8);
          row.appendChild(valueColumn);
          valueColumn.layoutSizingHorizontal = "HUG";
          valueColumn.layoutSizingVertical = "FILL";
          valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH;
          if (modes.length > 2) valueColumn.maxWidth = 500;
          if (m.collectionId) {
            valueColumn.setExplicitVariableModeForCollection(m.collectionId, m.modeId);
          }
          if (isDark) {
            valueColumn.fills = [COLOR_DARK_MODE_BG];
            valueColumn.strokes = [COLOR_DARK_MODE_BORDER];
            valueColumn.strokeWeight = 1;
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
            if (isLastRow) {
              valueColumn.bottomLeftRadius = 16;
              valueColumn.bottomRightRadius = 16;
            }
          } else {
            valueColumn.fills = [];
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
          }
          const colorPreview = figma.createRectangle();
          colorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
          colorPreview.cornerRadius = 24;
          if (m.collectionId) {
            colorPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId);
          }
          colorPreview.fillStyleId = s.id;
          colorPreview.layoutAlign = "STRETCH";
          valueColumn.appendChild(colorPreview);
          const paints = s.paints || [];
          if (paints.length > 0) {
            const paint = paints[0];
            if (paint.type === "SOLID" && paint.color) {
              const hex = figmaRGBToHex(paint.color);
              const hexTxt = makeText2(hex, FONT_REGULAR2, FONT_SIZE);
              hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
              valueColumn.appendChild(hexTxt);
            } else if (paint.type && paint.type.includes("GRADIENT") && paint.gradientStops) {
              const gtype = paint.type.replace(/^GRADIENT_?/i, "");
              const gradientType = gtype.charAt(0).toUpperCase() + gtype.slice(1).toLowerCase();
              const firstPos = Math.round((((_a = paint.gradientStops[0]) == null ? void 0 : _a.position) || 0) * 100) + "%";
              const gradientHeader = makeText2(gradientType + " \u2014 " + firstPos, FONT_REGULAR2, FONT_SIZE);
              gradientHeader.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
              valueColumn.appendChild(gradientHeader);
              for (const stop of paint.gradientStops) {
                const stopRow = createAutolayout("gradient-stop", "HORIZONTAL", GAP_SWATCH_ITEMS);
                valueColumn.appendChild(stopRow);
                let colorVar = null;
                if (m.collectionId) {
                  colorVar = resolveColorVariableForMode(stop.color, m.collectionId, m.modeId);
                }
                const swatchPreview = figma.createRectangle();
                swatchPreview.resize(SWATCH_SIZE, SWATCH_SIZE);
                swatchPreview.cornerRadius = BORDER_RADIUS_SM;
                if (colorVar && m.collectionId) {
                  swatchPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId);
                  const swatchFills = JSON.parse(JSON.stringify(swatchPreview.fills));
                  try {
                    swatchFills[0] = figma.variables.setBoundVariableForPaint(swatchFills[0], "color", colorVar);
                  } catch (e) {
                  }
                  swatchPreview.fills = swatchFills;
                } else {
                  const col = { r: stop.color.r || 0, g: stop.color.g || 0, b: stop.color.b || 0 };
                  const alpha = stop.color.a !== void 0 ? stop.color.a : 1;
                  swatchPreview.fills = [{ type: "SOLID", color: col, opacity: alpha }];
                }
                stopRow.appendChild(swatchPreview);
                const label = colorVar ? sanitizeName(colorVar.name) : resolveColorLabel(stop.color);
                const labelTxt = makeText2(label, FONT_REGULAR2, FONT_SIZE);
                labelTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
                stopRow.appendChild(labelTxt);
                if (colorVar) {
                  const hex = figmaRGBToHex(stop.color);
                  const hexTxt = makeText2(hex, FONT_REGULAR2, FONT_SIZE);
                  hexTxt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY];
                  stopRow.appendChild(hexTxt);
                }
              }
              const lastPos = Math.round((((_b = paint.gradientStops[paint.gradientStops.length - 1]) == null ? void 0 : _b.position) || 1) * 100) + "%";
              const gradientFooter = makeText2(lastPos, FONT_REGULAR2, FONT_SIZE);
              gradientFooter.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [DARK];
              valueColumn.appendChild(gradientFooter);
            }
          }
        }
      }
    }
    const effectStyles = figma.getLocalEffectStyles().filter((s) => activeEffectStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    if (effectStyles.length) {
      const collectionBox = createAutolayout("Effects", "VERTICAL", GAP_BETWEEN_SECTIONS, 0, 0);
      collectionBox.fills = [LIGHT];
      collectionBox.layoutSizingVertical = "HUG";
      collectionBox.layoutSizingHorizontal = "HUG";
      collectionBox.minWidth = MAX_COLUMN_WIDTH;
      stylesFrame.appendChild(collectionBox);
      const headerRow = createAutolayout("effect-styles-header", "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
      collectionBox.appendChild(headerRow);
      headerRow.layoutSizingHorizontal = "HUG";
      headerRow.minWidth = MAX_COLUMN_WIDTH;
      headerRow.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      headerRow.strokeWeight = 1;
      headerRow.dashPattern = [4, 4];
      headerRow.strokeBottomWeight = 1;
      headerRow.strokeTopWeight = 0;
      headerRow.strokeLeftWeight = 0;
      headerRow.strokeRightWeight = 0;
      const leftHeader = createAutolayout("left-header", "VERTICAL", 4, ROW_PADDING, ROW_PADDING);
      headerRow.appendChild(leftHeader);
      leftHeader.layoutSizingHorizontal = "FIXED";
      leftHeader.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeader.height);
      const cHeader = makeText2("Effects", FONT_SEMIBOLD, L_FONT_SIZE);
      addToColumn(leftHeader, cHeader);
      for (const m of modes) {
        const headerCell = createAutolayout("mode-header-" + m.modeId, "VERTICAL", 0, ROW_PADDING, ROW_PADDING);
        headerRow.appendChild(headerCell);
        headerCell.layoutSizingHorizontal = "HUG";
        headerCell.layoutSizingVertical = "FILL";
        headerCell.minWidth = MIN_MODE_COLUMN_WIDTH;
        if (modes.length > 2) headerCell.maxWidth = 500;
        headerCell.primaryAxisAlignItems = "CENTER";
        headerCell.counterAxisAlignItems = "CENTER";
        if (m.name.toLowerCase() === "dark") {
          headerCell.fills = [COLOR_DARK_MODE_BG];
          headerCell.topLeftRadius = 16;
          headerCell.topRightRadius = 16;
        }
        const valueHeader = makeText2(m.name === DEFAULT_MODE_NAME && modes.length === 1 ? "Value" : m.name, FONT_SEMIBOLD, FONT_SIZE);
        valueHeader.fills = m.name.toLowerCase() === "dark" ? [COLOR_DARK_MODE_TEXT] : [{ type: "SOLID", color: hexToRGB("#000000") }];
        addToColumn(headerCell, valueHeader);
        valueHeader.textAlignVertical = "CENTER";
      }
      for (const s of effectStyles) {
        if (onProgress) onProgress("Effect style: " + s.name);
        const row = createAutolayout("row-" + s.name, "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
        collectionBox.appendChild(row);
        row.layoutSizingHorizontal = "HUG";
        row.minWidth = MAX_COLUMN_WIDTH;
        const isLast = effectStyles.indexOf(s) === effectStyles.length - 1;
        if (!isLast) {
          row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
          row.strokeWeight = 1;
          row.dashPattern = [4, 4];
          row.strokeBottomWeight = 1;
          row.strokeTopWeight = 0;
          row.strokeLeftWeight = 0;
          row.strokeRightWeight = 0;
        }
        const leftCell = createAutolayout("left-" + s.name, "VERTICAL", 4);
        row.appendChild(leftCell);
        leftCell.layoutSizingHorizontal = "FIXED";
        leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height);
        leftCell.paddingTop = ROW_PADDING;
        leftCell.paddingBottom = ROW_PADDING;
        leftCell.paddingLeft = ROW_PADDING;
        leftCell.paddingRight = ROW_PADDING;
        const sName = makeText2(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE);
        addToColumn(leftCell, sName);
        const sDesc = makeText2(s.description || "no description", FONT_REGULAR2, 14);
        sDesc.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(leftCell, sDesc);
        for (const m of modes) {
          const isDark = m.name.toLowerCase() === "dark";
          const isLastRow = effectStyles.indexOf(s) === effectStyles.length - 1;
          const valueColumn = createAutolayout("value-" + s.name + "-" + m.modeId, "VERTICAL", isDark ? 8 : 8);
          row.appendChild(valueColumn);
          valueColumn.layoutSizingHorizontal = "HUG";
          valueColumn.layoutSizingVertical = "FILL";
          valueColumn.minWidth = MIN_MODE_COLUMN_WIDTH;
          if (modes.length > 2) valueColumn.maxWidth = 500;
          if (m.collectionId) {
            valueColumn.setExplicitVariableModeForCollection(m.collectionId, m.modeId);
          }
          if (isDark) {
            valueColumn.fills = [COLOR_DARK_MODE_BG];
            valueColumn.strokes = [COLOR_DARK_MODE_BORDER];
            valueColumn.strokeWeight = 1;
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
            if (isLastRow) {
              valueColumn.bottomLeftRadius = 16;
              valueColumn.bottomRightRadius = 16;
            }
          } else {
            valueColumn.fills = [];
            valueColumn.paddingTop = ROW_PADDING;
            valueColumn.paddingBottom = ROW_PADDING;
            valueColumn.paddingLeft = ROW_PADDING;
            valueColumn.paddingRight = ROW_PADDING;
          }
          const effectPreview = figma.createRectangle();
          effectPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
          effectPreview.cornerRadius = 6;
          effectPreview.fills = [{ type: "SOLID", color: hexToRGB("#ffffff") }];
          if (m.collectionId) {
            effectPreview.setExplicitVariableModeForCollection(m.collectionId, m.modeId);
          }
          effectPreview.effectStyleId = s.id;
          effectPreview.layoutAlign = "STRETCH";
          valueColumn.appendChild(effectPreview);
          const effects = s.effects || [];
          if (effects.length > 0) {
            for (const effect of effects) {
              let effectText = "";
              if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
                const ox = Math.round(((_c = effect.offset) == null ? void 0 : _c.x) || 0);
                const oy = Math.round(((_d = effect.offset) == null ? void 0 : _d.y) || 0);
                const blur = Math.round(effect.radius || 0);
                const alpha = ((_e = effect.color) == null ? void 0 : _e.a) !== void 0 ? effect.color.a : 1;
                effectText = `${effect.type.replace("_", " ").toLowerCase()}: ${ox}x ${oy}y ${blur}px ${Math.round(alpha * 100)}%`;
              } else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
                const blur = Math.round(effect.radius || 0);
                effectText = `${effect.type.replace("_", " ").toLowerCase()}: ${blur}px`;
              } else {
                effectText = effect.type.replace("_", " ").toLowerCase();
              }
              const txt = makeText2(effectText, FONT_REGULAR2, FONT_SIZE);
              txt.fills = isDark ? [COLOR_DARK_MODE_TEXT] : [COLOR_TEXT_SECONDARY];
              valueColumn.appendChild(txt);
            }
          }
        }
      }
    }
    const textStyles = figma.getLocalTextStyles().filter((s) => activeTextStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    if (textStyles.length) {
      const collectionBox = createAutolayout("Text", "VERTICAL", GAP_BETWEEN_SECTIONS, 0, 0);
      collectionBox.fills = [LIGHT];
      collectionBox.layoutSizingVertical = "HUG";
      collectionBox.layoutSizingHorizontal = "HUG";
      collectionBox.minWidth = MAX_COLUMN_WIDTH;
      stylesFrame.appendChild(collectionBox);
      const headerRow = createAutolayout("text-styles-header", "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
      collectionBox.appendChild(headerRow);
      headerRow.layoutSizingHorizontal = "HUG";
      headerRow.minWidth = MAX_COLUMN_WIDTH;
      headerRow.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      headerRow.strokeWeight = 1;
      headerRow.dashPattern = [4, 4];
      headerRow.strokeBottomWeight = 1;
      headerRow.strokeTopWeight = 0;
      headerRow.strokeLeftWeight = 0;
      headerRow.strokeRightWeight = 0;
      const leftHeaderT = createAutolayout("left-header", "VERTICAL", 4, ROW_PADDING, ROW_PADDING);
      headerRow.appendChild(leftHeaderT);
      leftHeaderT.layoutSizingHorizontal = "FIXED";
      leftHeaderT.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeaderT.height);
      const tHeader = makeText2("Text", FONT_SEMIBOLD, L_FONT_SIZE);
      addToColumn(leftHeaderT, tHeader);
      const headerCellPreviewT = createAutolayout("value-header-cell", "VERTICAL", 0, ROW_PADDING, ROW_PADDING, "FILL");
      headerRow.appendChild(headerCellPreviewT);
      headerCellPreviewT.layoutSizingHorizontal = "FILL";
      const valueHeaderT = makeText2("Value", FONT_SEMIBOLD, FONT_SIZE);
      addToColumn(headerCellPreviewT, valueHeaderT);
      valueHeaderT.textAlignVertical = "CENTER";
      for (const s of textStyles) {
        if (onProgress) onProgress("Text style: " + s.name);
        const row = createAutolayout("text-row-" + s.name, "HORIZONTAL", GAP_BETWEEN_ROWS, ROW_PADDING, ROW_PADDING, "HUG");
        collectionBox.appendChild(row);
        row.layoutSizingHorizontal = "HUG";
        row.minWidth = MAX_COLUMN_WIDTH;
        const isLast = textStyles.indexOf(s) === textStyles.length - 1;
        if (!isLast) {
          row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
          row.strokeWeight = 1;
          row.dashPattern = [4, 4];
          row.strokeBottomWeight = 1;
          row.strokeTopWeight = 0;
          row.strokeLeftWeight = 0;
          row.strokeRightWeight = 0;
        }
        const leftCell = createAutolayout("left-" + s.name, "VERTICAL", 4);
        row.appendChild(leftCell);
        leftCell.layoutSizingHorizontal = "FIXED";
        leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height);
        const sName = makeText2(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE);
        addToColumn(leftCell, sName);
        const sDesc = makeText2(s.description || "no description", FONT_REGULAR2, 14);
        sDesc.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(leftCell, sDesc);
        const valueCell = createAutolayout("value-" + s.name, "VERTICAL", 6);
        row.appendChild(valueCell);
        valueCell.layoutSizingHorizontal = "HUG";
        valueCell.minWidth = MIN_MODE_COLUMN_WIDTH;
        const previewText = makeText2(sanitizeName(s.name), FONT_REGULAR2, FONT_SIZE);
        try {
          previewText.textStyleId = s.id;
        } catch (e) {
          try {
            if (s.fontName) previewText.fontName = s.fontName;
            if (s.fontSize) previewText.fontSize = s.fontSize;
          } catch (e2) {
          }
        }
        previewText.layoutAlign = "STRETCH";
        valueCell.appendChild(previewText);
        const ts = s;
        if (ts.fontName) {
          const fontFamily = typeof ts.fontName === "object" && ts.fontName.family ? ts.fontName.family : typeof ts.fontName === "string" ? ts.fontName : "";
          if (fontFamily) {
            const fontFamilyTxt = makeText2("fontFamily: " + fontFamily, FONT_REGULAR2, 18);
            fontFamilyTxt.fills = [COLOR_TEXT_SECONDARY];
            fontFamilyTxt.layoutAlign = "STRETCH";
            valueCell.appendChild(fontFamilyTxt);
          }
          const fontStyle = typeof ts.fontName === "object" && ts.fontName.style ? ts.fontName.style : "";
          if (fontStyle) {
            const fontWeightTxt = makeText2("fontWeight: " + fontStyle, FONT_REGULAR2, 18);
            fontWeightTxt.fills = [COLOR_TEXT_SECONDARY];
            fontWeightTxt.layoutAlign = "STRETCH";
            valueCell.appendChild(fontWeightTxt);
          }
        }
        if (typeof ts.fontSize !== "undefined" && ts.fontSize !== null) {
          const fontSizeTxt = makeText2("fontSize: " + ts.fontSize + "px", FONT_REGULAR2, 18);
          fontSizeTxt.fills = [COLOR_TEXT_SECONDARY];
          fontSizeTxt.layoutAlign = "STRETCH";
          valueCell.appendChild(fontSizeTxt);
        }
        if (typeof ts.lineHeight !== "undefined" && ts.lineHeight !== null) {
          const lh = typeof ts.lineHeight === "object" && ts.lineHeight.value !== void 0 ? ts.lineHeight.value : ts.lineHeight;
          const unit = typeof ts.lineHeight === "object" && ts.lineHeight.unit ? ts.lineHeight.unit : "%";
          const displayUnit = unit === "PERCENT" ? "%" : unit;
          const displayValue = unit === "PERCENT" ? Math.round(lh * 100) / 100 : lh;
          const lineHeightTxt = makeText2("lineHeight: " + displayValue + displayUnit, FONT_REGULAR2, 18);
          lineHeightTxt.fills = [COLOR_TEXT_SECONDARY];
          lineHeightTxt.layoutAlign = "STRETCH";
          valueCell.appendChild(lineHeightTxt);
        }
        if (typeof ts.letterSpacing !== "undefined" && ts.letterSpacing !== null) {
          const ls = typeof ts.letterSpacing === "object" && ts.letterSpacing.value !== void 0 ? ts.letterSpacing.value : ts.letterSpacing;
          const unit = typeof ts.letterSpacing === "object" && ts.letterSpacing.unit ? ts.letterSpacing.unit : "px";
          const displayUnit = unit === "PERCENT" ? "%" : unit;
          const displayValue = unit === "PERCENT" ? Math.round(ls * 100) / 100 : ls;
          const letterSpacingTxt = makeText2("letterSpacing: " + displayValue + displayUnit, FONT_REGULAR2, 18);
          letterSpacingTxt.fills = [COLOR_TEXT_SECONDARY];
          letterSpacingTxt.layoutAlign = "STRETCH";
          valueCell.appendChild(letterSpacingTxt);
        }
        if (typeof ts.paragraphSpacing !== "undefined" && ts.paragraphSpacing !== null) {
          const unit = ts.paragraphSpacingUnit || "px";
          const paragraphSpacingTxt = makeText2("paragraphSpacing: " + ts.paragraphSpacing + unit, FONT_REGULAR2, 18);
          paragraphSpacingTxt.fills = [COLOR_TEXT_SECONDARY];
          paragraphSpacingTxt.layoutAlign = "STRETCH";
          valueCell.appendChild(paragraphSpacingTxt);
        }
      }
    }
    const layoutStyles = figma.getLocalGridStyles().filter((s) => activeLayoutStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    try {
      for (const child of figma.currentPage.children.slice()) {
        if (child.name && child.name.startsWith && child.name.startsWith("grid-")) {
          if (child.parent === figma.currentPage) child.remove();
        }
      }
    } catch (e) {
    }
    if (layoutStyles.length) {
      const collectionBox = createAutolayout("Layout", "VERTICAL", GAP_BETWEEN_SECTIONS, 0, 0);
      collectionBox.fills = [LIGHT];
      collectionBox.layoutSizingVertical = "HUG";
      collectionBox.layoutSizingHorizontal = "HUG";
      collectionBox.minWidth = MAX_COLUMN_WIDTH;
      stylesFrame.appendChild(collectionBox);
      const headerRow = createAutolayout("layout-styles-header", "HORIZONTAL", GAP_BETWEEN_ROWS, 0, 0, "HUG");
      collectionBox.appendChild(headerRow);
      headerRow.layoutSizingHorizontal = "HUG";
      headerRow.minWidth = MAX_COLUMN_WIDTH;
      headerRow.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      headerRow.strokeWeight = 1;
      headerRow.dashPattern = [4, 4];
      headerRow.strokeBottomWeight = 1;
      headerRow.strokeTopWeight = 0;
      headerRow.strokeLeftWeight = 0;
      headerRow.strokeRightWeight = 0;
      const leftHeaderL = createAutolayout("left-header", "VERTICAL", 4, ROW_PADDING, ROW_PADDING);
      headerRow.appendChild(leftHeaderL);
      leftHeaderL.layoutSizingHorizontal = "FIXED";
      leftHeaderL.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftHeaderL.height);
      const lHeader = makeText2("Layout", FONT_SEMIBOLD, L_FONT_SIZE);
      addToColumn(leftHeaderL, lHeader);
      const headerCellPreviewL = createAutolayout("value-header-cell", "VERTICAL", 0, ROW_PADDING, ROW_PADDING, "FILL");
      headerRow.appendChild(headerCellPreviewL);
      headerCellPreviewL.layoutSizingHorizontal = "FILL";
      const valueHeaderL = makeText2("Value", FONT_SEMIBOLD, FONT_SIZE);
      addToColumn(headerCellPreviewL, valueHeaderL);
      valueHeaderL.textAlignVertical = "CENTER";
      for (const s of layoutStyles) {
        if (onProgress) onProgress("Layout style: " + s.name);
        const row = createAutolayout("layout-row-" + s.name, "HORIZONTAL", GAP_BETWEEN_ROWS, ROW_PADDING, ROW_PADDING, "HUG");
        collectionBox.appendChild(row);
        row.layoutSizingHorizontal = "HUG";
        row.minWidth = MAX_COLUMN_WIDTH;
        const isLast = layoutStyles.indexOf(s) === layoutStyles.length - 1;
        if (!isLast) {
          row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
          row.strokeWeight = 1;
          row.dashPattern = [4, 4];
          row.strokeBottomWeight = 1;
          row.strokeTopWeight = 0;
          row.strokeLeftWeight = 0;
          row.strokeRightWeight = 0;
        }
        const leftCell = createAutolayout("left-" + s.name, "VERTICAL", 4);
        row.appendChild(leftCell);
        leftCell.layoutSizingHorizontal = "FIXED";
        leftCell.resizeWithoutConstraints(LEFT_COLUMN_WIDTH, leftCell.height);
        const sName = makeText2(sanitizeName(s.name), FONT_SEMIBOLD, FONT_SIZE);
        addToColumn(leftCell, sName);
        const sDesc = makeText2(s.description || "no description", FONT_REGULAR2, 14);
        sDesc.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(leftCell, sDesc);
        const valueCell = createAutolayout("value-" + s.name, "VERTICAL", 6);
        row.appendChild(valueCell);
        valueCell.layoutSizingHorizontal = "FILL";
        const grids = s.layoutGrids || [];
        if (grids.length === 0) {
          const info = makeText2("No grids defined", FONT_REGULAR2, FONT_SIZE);
          valueCell.appendChild(info);
        } else {
          for (const g of grids) {
            const pattern = g.pattern || "COLUMNS";
            const patternLabel = pattern === "COLUMNS" ? "Columns" : pattern === "ROWS" ? "Rows" : "Grid";
            const gridBox = createAutolayout("grid-" + patternLabel, "VERTICAL", 6, 6, 6, "FILL");
            gridBox.fills = [];
            gridBox.resizeWithoutConstraints(260, 80);
            const header = makeText2(patternLabel, FONT_SEMIBOLD, FONT_SIZE);
            addToColumn(gridBox, header);
            const infoRow = createAutolayout("grid-info", "HORIZONTAL", GAP_SWATCH_ITEMS);
            const countTxt = makeText2("Count: " + (g.count !== void 0 ? String(g.count) : "-"), FONT_REGULAR2, FONT_SIZE);
            addToColumn(infoRow, countTxt);
            const gutterTxt = makeText2("Gutter: " + (g.gutterSize !== void 0 ? String(g.gutterSize) : "-"), FONT_REGULAR2, FONT_SIZE);
            addToColumn(infoRow, gutterTxt);
            const offsetTxt = makeText2("Margin: " + (g.offset !== void 0 ? String(g.offset) : "-"), FONT_REGULAR2, FONT_SIZE);
            addToColumn(infoRow, offsetTxt);
            const sizeUnit = g.sectionSizeUnit || (g.sectionSize ? "px" : "");
            const widthTxt = makeText2("Width: " + (g.sectionSize !== void 0 ? String(g.sectionSize) + sizeUnit : "Auto"), FONT_REGULAR2, FONT_SIZE);
            addToColumn(infoRow, widthTxt);
            gridBox.appendChild(infoRow);
            const typeTxt = makeText2("Type: " + (g.alignment || (g.sectionSize ? "Fixed" : "Stretch")), FONT_REGULAR2, FONT_SIZE);
            addToColumn(gridBox, typeTxt);
            if (g.color) {
              const swatchRow = createAutolayout("swatch-row", "HORIZONTAL", GAP_SWATCH_ITEMS);
              const gridColorPreview = figma.createRectangle();
              gridColorPreview.resize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
              const colorObj = g.color;
              const col = { r: colorObj.r || 0, g: colorObj.g || 0, b: colorObj.b || 0 };
              const alpha = colorObj.a !== void 0 ? colorObj.a : 1;
              gridColorPreview.fills = [{ type: "SOLID", color: col, opacity: alpha }];
              addToColumn(swatchRow, gridColorPreview);
              const hex = figmaRGBToHex(colorObj);
              const hexTxt = makeText2(hex + (alpha !== 1 ? " " + Math.round(alpha * 100) + "%" : ""), FONT_REGULAR2, FONT_SIZE);
              addToColumn(swatchRow, hexTxt);
              gridBox.appendChild(swatchRow);
            }
            const previewHeight = 50;
            const previewWidth = Math.min(MAX_COLUMN_WIDTH / 2, 720);
            const preview = createAutolayout("grid-preview", "HORIZONTAL", g.gutterSize || 8, Math.max(0, g.offset || 0), 0);
            gridBox.appendChild(preview);
            preview.resizeWithoutConstraints(previewWidth, previewHeight);
            const previewCount = Math.min(g.count || 1, 8);
            for (let i = 0; i < previewCount; i++) {
              const columnPreview = figma.createRectangle();
              if (g.sectionSize && g.sectionSize > 0) {
                columnPreview.resizeWithoutConstraints(Math.max(8, g.sectionSize), previewHeight);
              } else {
                columnPreview.resizeWithoutConstraints(20, previewHeight);
                columnPreview.layoutGrow = 1;
              }
              if (g.color) {
                const colorObj = g.color;
                const col = { r: colorObj.r || 0, g: colorObj.g || 0, b: colorObj.b || 0 };
                const alpha = colorObj.a !== void 0 ? colorObj.a : 1;
                columnPreview.fills = [{ type: "SOLID", color: col, opacity: alpha }];
              } else {
                columnPreview.fills = [COLOR_BG_LIGHT];
              }
              preview.appendChild(columnPreview);
            }
            if ((g.count || 0) > previewCount) {
              const more = makeText2("\u2026 (" + (g.count || 0) + " total)", FONT_REGULAR2, FONT_SIZE);
              addToColumn(gridBox, more);
            }
            addToColumn(valueCell, gridBox);
            gridBox.layoutSizingHorizontal = "FILL";
            preview.layoutSizingHorizontal = "FILL";
          }
        }
      }
    }
  }
  function makeText2(text, font, size, truncate = false) {
    const node = figma.createText();
    node.fontName = font;
    node.fontSize = size;
    node.fills = [DARK];
    node.characters = text;
    if (truncate) {
      node.textTruncation = "ENDING";
      node.textAutoResize = "HEIGHT";
    } else {
      node.textTruncation = "DISABLED";
      node.textAutoResize = "HEIGHT";
    }
    return node;
  }
  function addToColumn(autolayout, child) {
    autolayout.appendChild(child);
    child.layoutAlign = "STRETCH";
  }
  function createAutolayout(name, direction = "HORIZONTAL", gap = 0, paddingX = 0, paddingY = 0, sizingX = "HUG", sizingY = "HUG") {
    const autolayout = figma.createFrame();
    autolayout.name = name;
    autolayout.fills = [];
    autolayout.layoutMode = direction;
    autolayout.itemSpacing = gap;
    autolayout.paddingLeft = paddingX;
    autolayout.paddingRight = paddingX;
    autolayout.paddingTop = paddingY;
    autolayout.paddingBottom = paddingY;
    if (sizingX !== "FILL") autolayout.layoutSizingHorizontal = sizingX;
    autolayout.layoutSizingVertical = sizingY;
    return autolayout;
  }
  function finish(message = void 0) {
    if (mainFrame) mainFrame.locked = false;
    working = false;
    figma.root.setRelaunchData({ relaunch: "" });
    let text;
    if (message) {
      text = message;
    } else if (count > 0) {
      text = CONFIRM_MSGS[Math.floor(Math.random() * CONFIRM_MSGS.length)] + " " + ACTION_MSGS[Math.floor(Math.random() * ACTION_MSGS.length)] + " " + (count === 1 ? "only one variable" : count + " variables");
    } else text = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)];
    notify(text);
    try {
      figma.ui.postMessage({ type: "tokens-status", text });
      figma.ui.postMessage({ type: "tokens-resync-state", available: !!findTokensDocFrame() });
    } catch (e) {
    }
  }
  function notify(text) {
    if (notification != null)
      notification.cancel();
    notification = figma.notify(text);
  }
  function cancel() {
    if (notification != null)
      notification.cancel();
    if (working) {
      notify("Plugin work have been interrupted");
      figma.closePlugin();
    }
  }
  var namesRGB = ["r", "g", "b"];
  function figmaRGBToWebRGB(color) {
    const rgb = [];
    namesRGB.forEach((e, i) => {
      rgb[i] = Math.round(color[e] * 255);
    });
    if (color["a"] !== void 0) rgb[3] = Math.round(color["a"] * 100) / 100;
    return rgb;
  }
  function figmaRGBToHex(color) {
    let hex = "#";
    const rgb = figmaRGBToWebRGB(color);
    hex += ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
    if (rgb[3] !== void 0) {
      const a = Math.round(rgb[3] * 255).toString(16);
      if (a.length == 1) {
        hex += "0" + a;
      } else {
        if (a !== "ff") hex += a;
      }
    }
    return hex;
  }
  function resolveColorLabel(color) {
    try {
      const hex = figmaRGBToHex(color);
      if (collections && Array.isArray(collections)) {
        for (const c of collections) {
          for (const id of c.variableIds) {
            const v = figma.variables.getVariableById(id);
            if (!v) continue;
            const modes = v.valuesByMode || {};
            for (const mid in modes) {
              const raw = modes[mid];
              if (raw && typeof raw === "object") {
                try {
                  if (figmaRGBToHex(raw) === hex) return sanitizeName(v.name);
                } catch (e) {
                }
              }
            }
          }
        }
      }
      const paints = figma.getLocalPaintStyles();
      for (const s of paints) {
        if (s.paints && s.paints[0] && s.paints[0].type === "SOLID" && s.paints[0].color) {
          try {
            if (figmaRGBToHex(s.paints[0].color) === hex) return sanitizeName(s.name);
          } catch (e) {
          }
        }
      }
      return hex;
    } catch (e) {
      return String(color);
    }
  }
  function resolveColorVariableForMode(color, collectionId, modeId) {
    try {
      const hex = figmaRGBToHex(color);
      const targetCollection = figma.variables.getVariableCollectionById(collectionId);
      if (targetCollection) {
        for (const id of targetCollection.variableIds) {
          const v = figma.variables.getVariableById(id);
          if (!v || v.resolvedType !== "COLOR") continue;
          const raw = v.valuesByMode[modeId];
          if (raw && typeof raw === "object") {
            try {
              if (figmaRGBToHex(raw) === hex) return v;
            } catch (e) {
            }
          }
        }
      }
      if (collections && Array.isArray(collections)) {
        for (const c of collections) {
          for (const id of c.variableIds) {
            const v = figma.variables.getVariableById(id);
            if (!v || v.resolvedType !== "COLOR") continue;
            const raw = v.valuesByMode[modeId];
            if (raw && typeof raw === "object") {
              try {
                if (figmaRGBToHex(raw) === hex) return v;
              } catch (e) {
              }
            }
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // src/main.ts
  var command = figma.command || "";
  if (command === "create-autolayout") {
    handleCreateAutoLayout();
    figma.closePlugin();
  } else {
    initialTab = command === "variables" || command === "rewrite" ? "tokens" : "component";
    isTokens = initialTab === "tokens";
    figma.showUI(__html__, { width: isTokens ? 560 : 320, height: isTokens ? 500 : 460 });
    registerSpecSelectionTracking();
    figma.ui.onmessage = function(msg) {
      if (!msg || !msg.type) return;
      if (msg.type === "ui-ready") {
        figma.ui.postMessage({ type: "set-tab", tab: initialTab });
        figma.ui.postMessage(getTokensInitData());
        pushSpecSelectionState();
        return;
      }
      if (msg.type === "ui-resize") {
        figma.ui.resize(Math.max(240, msg.width | 0), Math.max(240, msg.height | 0));
        return;
      }
      if (msg.type === "tokens-confirm") {
        handleTokensConfirm(msg);
        return;
      }
      if (msg.type === "tokens-resync") {
        handleTokensResync();
        return;
      }
      handleSpecMessage(msg);
    };
  }
  var initialTab;
  var isTokens;
})();
