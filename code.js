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
    panel.clipsContent = true;
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
        var growPadX = 28;
        var growPadY = 28;
        var growWidth = w + growPadX * 2;
        var growHeight = h + growPadY * 2;
        panel.resize(Math.max(panel.width || 0, growWidth), Math.max(panel.height || 0, growHeight));
        maxWidth = panel.width || maxWidth;
        maxHeight = panel.height || maxHeight;
      }
    }
    node.x = Math.round((maxWidth - w) / 2);
    node.y = Math.round((maxHeight - h) / 2);
    if (panel.layoutMode !== "NONE" && "layoutPositioning" in node) {
      node.layoutPositioning = "ABSOLUTE";
    }
    try {
      node.constraints = { horizontal: "CENTER", vertical: "CENTER" };
    } catch (e) {
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
  function normalizeSpecModules(modules) {
    var defaults = {
      timestamp: true,
      anatomy: true,
      spacing: true,
      dimensions: true,
      styles: true,
      componentInstance: true,
      variables: true,
      accessibility: true,
      readiness: true
    };
    if (!modules || typeof modules !== "object") return defaults;
    var normalized = {};
    for (var key in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
      if (Object.prototype.hasOwnProperty.call(modules, key)) {
        normalized[key] = !!modules[key];
      } else {
        normalized[key] = defaults[key];
      }
    }
    return normalized;
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
    try {
      previewCanvas.constraints = { horizontal: "STRETCH", vertical: "MIN" };
    } catch (e) {
    }
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
      if (layer.type === "VECTOR") continue;
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
      try {
        markerFrame.constraints = { horizontal: "CENTER", vertical: "CENTER" };
      } catch (e) {
      }
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
    var cardFinalWidth = Math.max(width, preview.width || width);
    try {
      preview.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
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
      card.resizeWithoutConstraints(cardFinalWidth, card.height || 1);
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
      var allNumericOptions = options.length > 0 && options.every(function(o) {
        return o.trim() !== "" && isFinite(Number(o));
      });
      if (allNumericOptions) {
        options = options.slice().sort(function(a, b) {
          return Number(a) - Number(b);
        });
      }
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
      grid.gridColumnSizes[0].type = "FLEX";
      grid.gridColumnSizes[0].value = 1;
      grid.gridColumnSizes[1].type = "FLEX";
      grid.gridColumnSizes[1].value = 1;
    } catch (e) {
      try {
        grid.gridColumnSizes[0].type = "FIXED";
        grid.gridColumnSizes[0].value = width;
        grid.gridColumnSizes[1].type = "FIXED";
        grid.gridColumnSizes[1].value = width;
      } catch (e2) {
      }
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
  function drawAutoLayoutGuides(targetClone, panel, sourceInfo, depth, baseX, baseY, mainCompNode, seenLabels) {
    if (!targetClone || !sourceInfo) return;
    var mode = sourceInfo.layoutMode || (sourceInfo.inferredAutoLayout ? sourceInfo.inferredAutoLayout.layoutMode : "NONE");
    if (!mode || mode === "NONE") return;
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
      wrapper.appendChild(r);
      var padKey = "pad:" + side + ":" + labelText;
      if (!seenLabels[padKey]) {
        seenLabels[padKey] = true;
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
        wrapper.appendChild(t);
      }
      wrapper.x = rx;
      wrapper.y = ry;
      panel.appendChild(wrapper);
      try {
        wrapper.constraints = { horizontal: "CENTER", vertical: "CENTER" };
      } catch (e) {
      }
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
      var gapKey = "gap:" + gapLabelText;
      var showGapLabel = !seenLabels[gapKey];
      seenLabels[gapKey] = true;
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
          gapFrame.appendChild(gapRect);
          if (showGapLabel) {
            var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
            label.name = "Item-Spacing-Gap-" + spacing + "px [Label]";
            label.x = Math.max(0, Math.round(gapWidth / 2 - (label.width || 0) / 2));
            label.y = gapHeight + 4;
            gapFrame.appendChild(label);
          }
          gapFrame.x = x + x1;
          gapFrame.y = y + topY;
          panel.appendChild(gapFrame);
          try {
            gapFrame.constraints = { horizontal: "CENTER", vertical: "CENTER" };
          } catch (e) {
          }
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
          gapFrame.appendChild(gapRect);
          if (showGapLabel) {
            var label = makeGuideLabel(gapLabelText, COLOR_ORANGE);
            label.name = "Item-Spacing-Gap-" + spacing + "px [Label]";
            label.x = -Math.round((label.width || 0) + 8);
            label.y = Math.max(0, Math.round(gapHeight / 2 - (label.height || 0) / 2));
            gapFrame.appendChild(label);
          }
          gapFrame.x = x + leftX;
          gapFrame.y = y + y1;
          panel.appendChild(gapFrame);
          try {
            gapFrame.constraints = { horizontal: "CENTER", vertical: "CENTER" };
          } catch (e) {
          }
        }
      }
    }
    if (depth < 4) {
      for (var i = 0; i < visibleChildren.length; i++) {
        var child = visibleChildren[i];
        var childMode = child.layoutMode || (child.inferredAutoLayout ? child.inferredAutoLayout.layoutMode : "NONE");
        if (childMode && childMode !== "NONE") {
          drawAutoLayoutGuides(child, panel, child, depth + 1, x, y, mainCompNode, seenLabels);
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
      if (propType === "TEXT") continue;
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
      var cardRefs = [];
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
          if (useGrid) card.gridColumnSpan = 1;
        } catch (e) {
        }
        cardRefs.push(card);
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
      for (var ci = 0; ci < cardRefs.length; ci++) {
        try {
          cardRefs[ci].layoutSizingHorizontal = "FILL";
        } catch (e) {
        }
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
    var header = figma.createFrame();
    header.name = SPEC_PREFIX + "Variables Header";
    header.layoutMode = "HORIZONTAL";
    header.primaryAxisSizingMode = "FIXED";
    header.counterAxisSizingMode = "AUTO";
    header.resize(SHEET_INNER_WIDTH - 48, 1);
    header.itemSpacing = 12;
    header.fills = [];
    header.layoutSizingVertical = "HUG";
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
    try {
      header.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
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
      try {
        row.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
    section.appendChild(table);
    try {
      table.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    parent.appendChild(section);
  }
  var COLOR_PASS = { r: 0.09, g: 0.58, b: 0.32 };
  var COLOR_WARN = { r: 0.85, g: 0.56, b: 0.05 };
  var COLOR_FAIL = { r: 0.82, g: 0.16, b: 0.16 };
  var COLOR_NA = { r: 0.6, g: 0.6, b: 0.6 };
  var A11Y_INTERACTIVE_NAME = /(button|btn|link|input|check|radio|switch|toggle|chip|tab|icon|close|action|control)/i;
  var DEFAULT_LAYER_NAME = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Text|Component|Instance) \d+$/;
  function walkVisibleNodes(root, cb) {
    function rec(n) {
      if (!n || n.visible === false) return;
      cb(n);
      var kids = n.children || [];
      for (var i = 0; i < kids.length; i++) rec(kids[i]);
    }
    rec(root);
  }
  function relativeLuminance(c) {
    function chan(v) {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
  }
  function contrastRatio(a, b) {
    var la = relativeLuminance(a);
    var lb = relativeLuminance(b);
    var hi = Math.max(la, lb);
    var lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  function getFirstSolidFill(n) {
    try {
      var fills = n.fills;
      if (!Array.isArray(fills)) return null;
      for (var i = 0; i < fills.length; i++) {
        var f = fills[i];
        if (f && f.visible !== false && f.type === "SOLID") return f.color;
      }
    } catch (e) {
    }
    return null;
  }
  function getEffectiveBackgroundColor(n) {
    var p = n.parent;
    while (p && p.type !== "PAGE") {
      try {
        var fills = p.fills;
        if (Array.isArray(fills)) {
          for (var i = fills.length - 1; i >= 0; i--) {
            var f = fills[i];
            if (f && f.visible !== false && f.type === "SOLID" && (f.opacity === void 0 || f.opacity > 0.5)) {
              return f.color;
            }
          }
        }
      } catch (e) {
      }
      p = p.parent;
    }
    return { r: 1, g: 1, b: 1 };
  }
  function rgbToHexLabel(c) {
    function h(v) {
      var s = Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).toUpperCase();
      return s.length === 1 ? "0" + s : s;
    }
    return "#" + h(c.r) + h(c.g) + h(c.b);
  }
  function isBoldFontStyle(styleName) {
    return /bold|black|heavy|extrabold|semibold/i.test(styleName || "");
  }
  function analyzeAccessibility(node) {
    var contrast = [];
    var typography = [];
    var touch = [];
    var seenContrast = {};
    var seenType = {};
    var hasInteractive = false;
    var hasText = false;
    walkVisibleNodes(node, function(n) {
      if (n.type === "TEXT") {
        hasText = true;
        var fg = getFirstSolidFill(n);
        if (fg) {
          var bg = getEffectiveBackgroundColor(n);
          var size = typeof n.fontSize === "number" ? n.fontSize : 0;
          var styleName = n.fontName && typeof n.fontName === "object" ? n.fontName.style || "" : "";
          var isLarge = size >= 24 || size >= 18.66 && isBoldFontStyle(styleName);
          var required = isLarge ? 3 : 4.5;
          var ratio = contrastRatio(fg, bg);
          var cKey = rgbToHexLabel(fg) + "/" + rgbToHexLabel(bg) + "/" + required;
          if (!seenContrast[cKey] && contrast.length < 8) {
            seenContrast[cKey] = true;
            contrast.push({
              label: (n.name || "Text") + " \u2014 " + rgbToHexLabel(fg) + " on " + rgbToHexLabel(bg),
              fg,
              bg,
              ratio,
              required,
              pass: ratio >= required
            });
          }
          var family = n.fontName && typeof n.fontName === "object" ? n.fontName.family || "" : "Mixed";
          var lh = "";
          try {
            var lhv = n.lineHeight;
            if (lhv && typeof lhv === "object" && typeof lhv.value === "number") {
              lh = lhv.unit === "PERCENT" ? "/" + Math.round(lhv.value) + "%" : "/" + Math.round(lhv.value);
            } else {
              lh = "/auto";
            }
          } catch (e) {
          }
          var styled = typeof n.textStyleId === "string" && n.textStyleId !== "" || !!(n.boundVariables && (n.boundVariables.fontSize || n.boundVariables.fontFamily || n.boundVariables.fontStyle || n.boundVariables.fontWeight));
          var tKey = family + "|" + styleName + "|" + size;
          if (!seenType[tKey] && typography.length < 8) {
            seenType[tKey] = true;
            typography.push({
              label: family + " " + styleName,
              detail: (size ? Math.round(size) : "?") + lh + (styled ? "" : " \u2014 no text style/token"),
              tooSmall: size > 0 && size < 12,
              styled
            });
          }
        }
      }
      var interactiveByName = A11Y_INTERACTIVE_NAME.test(n.name || "");
      var interactiveByReaction = false;
      try {
        interactiveByReaction = Array.isArray(n.reactions) && n.reactions.length > 0;
      } catch (e) {
      }
      var isCandidate = n === node || (n.type === "INSTANCE" || n.type === "FRAME") && (interactiveByName || interactiveByReaction);
      if (isCandidate && (interactiveByName || interactiveByReaction || n === node)) {
        if (n !== node && (interactiveByName || interactiveByReaction)) hasInteractive = true;
        var w = Math.round(n.width || 0);
        var h = Math.round(n.height || 0);
        if (touch.length < 6 && (n !== node || interactiveByName || interactiveByReaction)) {
          var minSide = Math.min(w, h);
          touch.push({
            label: n.name || n.type,
            w,
            h,
            // 44 = Apple HIG / WCAG AAA recommendation; 24 = WCAG 2.2 AA hard minimum.
            status: minSide >= 44 ? "pass" : minSide >= 24 ? "warn" : "fail"
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
      if (touch[to].status !== "pass") touchAllOk = false;
      if (touch[to].status === "fail") touchAnyFail = true;
    }
    return {
      contrast,
      typography,
      touch,
      hasText,
      hasInteractive,
      contrastAllPass,
      typographyAllOk,
      touchAllOk,
      touchAnyFail
    };
  }
  function makeStatusChip(text, color) {
    var chip = figma.createFrame();
    chip.name = SPEC_PREFIX + "Status " + text;
    chip.layoutMode = "HORIZONTAL";
    chip.primaryAxisSizingMode = "AUTO";
    chip.counterAxisSizingMode = "AUTO";
    chip.paddingLeft = 8;
    chip.paddingRight = 8;
    chip.paddingTop = 3;
    chip.paddingBottom = 3;
    chip.cornerRadius = 999;
    chip.fills = solidPaint(color, 0.12);
    chip.appendChild(makeText(text, 10, FONT_BOLD, color));
    return chip;
  }
  function makeA11yRow(leading, label, detail, chip) {
    var row = figma.createFrame();
    row.name = SPEC_PREFIX + "A11y Row [" + label + "]";
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "FIXED";
    row.counterAxisSizingMode = "AUTO";
    row.resize(SHEET_INNER_WIDTH - 48, 1);
    row.itemSpacing = 12;
    row.counterAxisAlignItems = "CENTER";
    row.fills = [];
    row.layoutSizingVertical = "HUG";
    if (leading) row.appendChild(leading);
    row.appendChild(makeText(label, 11, FONT_MEDIUM, COLOR_VALUE));
    var det = makeText(detail, 11, FONT_REGULAR, COLOR_MUTED);
    row.appendChild(det);
    try {
      det.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    if (chip) row.appendChild(chip);
    return row;
  }
  function makeContrastSwatch(fg, bg) {
    var sw = figma.createFrame();
    sw.name = SPEC_PREFIX + "Contrast Swatch";
    sw.layoutMode = "HORIZONTAL";
    sw.primaryAxisAlignItems = "CENTER";
    sw.counterAxisAlignItems = "CENTER";
    sw.primaryAxisSizingMode = "FIXED";
    sw.counterAxisSizingMode = "FIXED";
    sw.resize(40, 28);
    sw.cornerRadius = 4;
    sw.fills = solidPaint(bg);
    sw.strokes = solidPaint({ r: 0.85, g: 0.85, b: 0.85 });
    sw.strokeWeight = 1;
    var sample = makeText("Aa", 15, FONT_BOLD, fg);
    sw.appendChild(sample);
    return sw;
  }
  async function buildAccessibilitySheetSection(parent, node) {
    var a = analyzeAccessibility(node);
    var section = makeSectionWrapper("Accessibility");
    var rows = [];
    section.appendChild(makeText("Color contrast", 36, FONT_BOLD, COLOR_HEADER));
    if (a.contrast.length === 0) {
      section.appendChild(makeText("No solid text fills detected to evaluate.", 11, FONT_REGULAR, COLOR_MUTED));
    }
    for (var c = 0; c < a.contrast.length; c++) {
      var cr = a.contrast[c];
      var chip = cr.pass ? makeStatusChip("AA PASS", COLOR_PASS) : makeStatusChip("FAIL", COLOR_FAIL);
      var row = makeA11yRow(
        makeContrastSwatch(cr.fg, cr.bg),
        cr.label,
        Math.round(cr.ratio * 100) / 100 + ":1 (needs " + cr.required + ":1)",
        chip
      );
      section.appendChild(row);
      rows.push(row);
    }
    section.appendChild(makeText("Typography", 36, FONT_BOLD, COLOR_HEADER));
    if (a.typography.length === 0) {
      section.appendChild(makeText("No text layers in this component.", 11, FONT_REGULAR, COLOR_MUTED));
    }
    for (var t = 0; t < a.typography.length; t++) {
      var ty = a.typography[t];
      var tChip = ty.tooSmall ? makeStatusChip("BELOW 12", COLOR_FAIL) : ty.styled ? makeStatusChip("OK", COLOR_PASS) : makeStatusChip("NO TOKEN", COLOR_WARN);
      var tRow = makeA11yRow(null, ty.label, ty.detail, tChip);
      section.appendChild(tRow);
      rows.push(tRow);
    }
    section.appendChild(makeText("Touch targets", 36, FONT_BOLD, COLOR_HEADER));
    if (a.touch.length === 0) {
      section.appendChild(makeText("No interactive elements detected.", 11, FONT_REGULAR, COLOR_MUTED));
    }
    for (var to = 0; to < a.touch.length; to++) {
      var tt = a.touch[to];
      var ttChip = tt.status === "pass" ? makeStatusChip("44+ PASS", COLOR_PASS) : tt.status === "warn" ? makeStatusChip("24\u201343", COLOR_WARN) : makeStatusChip("BELOW 24", COLOR_FAIL);
      var ttRow = makeA11yRow(null, tt.label, tt.w + " \xD7 " + tt.h + " px (44 recommended, 24 minimum)", ttChip);
      section.appendChild(ttRow);
      rows.push(ttRow);
    }
    parent.appendChild(section);
    for (var r = 0; r < rows.length; r++) {
      try {
        rows[r].layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
  }
  function collectReadinessStats(root) {
    var s = { boundFills: 0, totalFills: 0, boundSpacing: 0, totalSpacing: 0, styledText: 0, totalText: 0, defaultNames: 0, totalNodes: 0 };
    walkVisibleNodes(root, function(n) {
      s.totalNodes++;
      if (DEFAULT_LAYER_NAME.test(n.name || "")) s.defaultNames++;
      function countPaints(paints, styleId, kind) {
        if (!Array.isArray(paints)) return;
        var hasStyle = typeof styleId === "string" && styleId !== "";
        for (var i = 0; i < paints.length; i++) {
          var p = paints[i];
          if (!p || p.visible === false || p.type !== "SOLID") continue;
          s.totalFills++;
          if (hasStyle || p.boundVariables && p.boundVariables.color) s.boundFills++;
        }
      }
      try {
        countPaints(n.fills, n.fillStyleId, "fills");
      } catch (e) {
      }
      try {
        countPaints(n.strokes, n.strokeStyleId, "strokes");
      } catch (e) {
      }
      var bv = n.boundVariables || {};
      if (n.layoutMode && n.layoutMode !== "NONE") {
        var spacingProps = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing"];
        for (var sp = 0; sp < spacingProps.length; sp++) {
          var v = n[spacingProps[sp]];
          if (typeof v === "number" && v > 0) {
            s.totalSpacing++;
            if (bv[spacingProps[sp]]) s.boundSpacing++;
          }
        }
      }
      var radiusProps = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
      for (var rp = 0; rp < radiusProps.length; rp++) {
        var rv = n[radiusProps[rp]];
        if (typeof rv === "number" && rv > 0) {
          s.totalSpacing++;
          if (bv[radiusProps[rp]]) s.boundSpacing++;
        }
      }
      if (n.type === "TEXT") {
        s.totalText++;
        var styled = typeof n.textStyleId === "string" && n.textStyleId !== "" || !!(bv.fontSize || bv.fontFamily || bv.fontStyle || bv.fontWeight);
        if (styled) s.styledText++;
      }
    });
    return s;
  }
  function ratioStatus(bound, total, passAt, warnAt) {
    if (total === 0) return "na";
    var r = bound / total;
    if (r >= passAt) return "pass";
    if (r >= warnAt) return "warn";
    return "fail";
  }
  async function buildReadinessSheetSection(parent, node, stateTarget) {
    var stats = collectReadinessStats(node);
    var a11y = analyzeAccessibility(node);
    var checks = [];
    checks.push({
      label: "Color tokens",
      status: ratioStatus(stats.boundFills, stats.totalFills, 0.9, 0.5),
      detail: stats.totalFills === 0 ? "No solid fills/strokes" : stats.boundFills + "/" + stats.totalFills + " fills & strokes bound to variables or styles",
      weight: 20
    });
    checks.push({
      label: "Spacing & radius tokens",
      status: ratioStatus(stats.boundSpacing, stats.totalSpacing, 0.9, 0.5),
      detail: stats.totalSpacing === 0 ? "No non-zero padding, gaps, or radii" : stats.boundSpacing + "/" + stats.totalSpacing + " padding/gap/radius values bound to variables",
      weight: 15
    });
    checks.push({
      label: "Typography tokens",
      status: ratioStatus(stats.styledText, stats.totalText, 0.99, 0.5),
      detail: stats.totalText === 0 ? "No text layers" : stats.styledText + "/" + stats.totalText + " text layers using a text style or typography variable",
      weight: 10
    });
    var stateCount = stateTarget && stateTarget.states ? stateTarget.states.length : 0;
    var looksInteractive = a11y.hasInteractive || A11Y_INTERACTIVE_NAME.test(node.name || "");
    var stateStatus;
    var stateDetail;
    if (stateCount >= 3) {
      stateStatus = "pass";
      stateDetail = stateCount + " states defined (" + stateTarget.states.join(", ") + ")";
    } else if (stateCount === 2) {
      stateStatus = "warn";
      stateDetail = "Only 2 states \u2014 consider hover, focus, and disabled";
    } else if (looksInteractive) {
      stateStatus = "fail";
      stateDetail = "Interactive component with no state variants";
    } else {
      stateStatus = "na";
      stateDetail = "Not an interactive component";
    }
    checks.push({ label: "Interactive states", status: stateStatus, detail: stateDetail, weight: 15 });
    var rootLayout = node.layoutMode && node.layoutMode !== "NONE";
    checks.push({
      label: "Auto layout",
      status: rootLayout ? "pass" : "fail",
      detail: rootLayout ? "Root uses auto layout \u2014 resizes predictably" : "Root is not auto layout \u2014 resizing behavior is undefined",
      weight: 10
    });
    var propData = await getPropertyDefinitionsForNodeAsync(node);
    var propCount = propData && propData.defs ? Object.keys(propData.defs).length : 0;
    var nameRatio = stats.totalNodes === 0 ? 0 : stats.defaultNames / stats.totalNodes;
    var structStatus = propCount > 0 && nameRatio < 0.1 ? "pass" : propCount > 0 || nameRatio < 0.3 ? "warn" : "fail";
    checks.push({
      label: "Structure & naming",
      status: structStatus,
      detail: propCount + " propert" + (propCount === 1 ? "y" : "ies") + " defined, " + stats.defaultNames + " default-named layer(s)",
      weight: 10
    });
    var a11yStatus;
    if (!a11y.hasText && a11y.touch.length === 0) {
      a11yStatus = "na";
    } else if (!a11y.contrastAllPass || a11y.touchAnyFail || !a11y.typographyAllOk) {
      a11yStatus = "fail";
    } else if (!a11y.touchAllOk) {
      a11yStatus = "warn";
    } else {
      a11yStatus = "pass";
    }
    checks.push({
      label: "Accessibility",
      status: a11yStatus,
      detail: a11yStatus === "na" ? "Nothing to evaluate" : "Contrast " + (a11y.contrastAllPass ? "passing" : "failing") + ", touch targets " + (a11y.touchAllOk ? "passing" : a11y.touchAnyFail ? "failing" : "borderline"),
      weight: 20
    });
    var earned = 0;
    var possible = 0;
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].status === "na") continue;
      possible += checks[i].weight;
      if (checks[i].status === "pass") earned += checks[i].weight;
      else if (checks[i].status === "warn") earned += checks[i].weight * 0.5;
    }
    var score = possible === 0 ? 0 : Math.round(earned / possible * 100);
    var verdict;
    var verdictColor;
    if (score >= 90) {
      verdict = "Ready for handoff";
      verdictColor = COLOR_PASS;
    } else if (score >= 75) {
      verdict = "Nearly ready \u2014 minor gaps";
      verdictColor = COLOR_WARN;
    } else if (score >= 50) {
      verdict = "Needs attention before handoff";
      verdictColor = COLOR_WARN;
    } else {
      verdict = "Not ready for handoff";
      verdictColor = COLOR_FAIL;
    }
    var section = makeSectionWrapper("Handoff readiness");
    section.appendChild(makeText(score + " / 100", 44, FONT_BOLD, verdictColor));
    section.appendChild(makeText(verdict, 14, FONT_MEDIUM, verdictColor));
    section.appendChild(makeText("Weighted across tokens, states, layout, structure, and accessibility. N/A criteria are excluded from the denominator.", 10, FONT_REGULAR, COLOR_MUTED));
    var divider = makeHorizontalDivider(SHEET_INNER_WIDTH - 48);
    section.appendChild(divider);
    try {
      divider.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    var rows = [];
    for (var k = 0; k < checks.length; k++) {
      var ck = checks[k];
      var chipColor = ck.status === "pass" ? COLOR_PASS : ck.status === "warn" ? COLOR_WARN : ck.status === "fail" ? COLOR_FAIL : COLOR_NA;
      var chipText = ck.status === "pass" ? "PASS" : ck.status === "warn" ? "REVIEW" : ck.status === "fail" ? "FAIL" : "N/A";
      var row = makeA11yRow(null, ck.label + " (" + ck.weight + ")", ck.detail, makeStatusChip(chipText, chipColor));
      section.appendChild(row);
      rows.push(row);
    }
    parent.appendChild(section);
    for (var r = 0; r < rows.length; r++) {
      try {
        rows[r].layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
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
    var leftGrew = (leftPreview.width || columnWidth) > columnWidth + 0.5;
    leftPreview.resize(Math.max(columnWidth, leftPreview.width || columnWidth), requiredLeftHeight);
    if (leftGrew) {
      try {
        left.resizeWithoutConstraints(leftPreview.width, left.height || 1);
      } catch (e) {
      }
    }
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
    var rightGrew = (rightPreview.width || columnWidth) > columnWidth + 0.5;
    rightPreview.resize(Math.max(columnWidth, rightPreview.width || columnWidth), requiredRightHeight);
    if (rightGrew) {
      try {
        right.resizeWithoutConstraints(rightPreview.width, right.height || 1);
      } catch (e) {
      }
    }
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
      leftPreview.layoutSizingHorizontal = "FILL";
    } catch (e) {
    }
    try {
      right.layoutSizingHorizontal = "FILL";
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
  function stampSectionsFrom(sheet, startIndex, key, sourceId) {
    for (var i = startIndex; i < sheet.children.length; i++) {
      var child = sheet.children[i];
      if (!child || child.type !== "FRAME") continue;
      try {
        child.setPluginData("specSection", key);
        child.setPluginData("sourceNodeId", sourceId);
      } catch (e) {
      }
    }
  }
  async function createReferenceStyleSpecSheetAsync(node, page, modules) {
    modules = normalizeSpecModules(modules);
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
    var mark = sheet.children.length;
    var hero = makeSectionWrapper(node.name);
    hero.name = SPEC_PREFIX + "Hero Section";
    hero.itemSpacing = 0;
    sheet.appendChild(hero);
    stampSectionsFrom(sheet, mark, "hero", node.id);
    mark = sheet.children.length;
    if (modules.timestamp) {
      sheet.appendChild(makeMetaSection());
      stampSectionsFrom(sheet, mark, "meta", node.id);
    }
    if (modules.anatomy) {
      mark = sheet.children.length;
      await buildAnatomySheetSection(sheet, node);
      stampSectionsFrom(sheet, mark, "anatomy", node.id);
    }
    mark = sheet.children.length;
    await buildPropertiesSheetSection(sheet, node, stateTarget);
    stampSectionsFrom(sheet, mark, "properties", node.id);
    if (modules.spacing || modules.dimensions) {
      mark = sheet.children.length;
      await buildLayoutSheetSection(sheet, node);
      stampSectionsFrom(sheet, mark, "layout", node.id);
    }
    if (modules.variables) {
      mark = sheet.children.length;
      await buildVariablesSheetSection(sheet, node);
      stampSectionsFrom(sheet, mark, "variables", node.id);
    }
    if (modules.accessibility) {
      mark = sheet.children.length;
      await buildAccessibilitySheetSection(sheet, node);
      stampSectionsFrom(sheet, mark, "a11y", node.id);
    }
    if (modules.readiness) {
      mark = sheet.children.length;
      await buildReadinessSheetSection(sheet, node, stateTarget);
      stampSectionsFrom(sheet, mark, "readiness", node.id);
    }
    try {
      sheet.setPluginData("specSectionsGenerated", JSON.stringify(
        ["hero", "properties"].concat(modules.timestamp ? ["meta"] : []).concat(modules.anatomy ? ["anatomy"] : []).concat(modules.spacing || modules.dimensions ? ["layout"] : []).concat(modules.variables ? ["variables"] : []).concat(modules.accessibility ? ["a11y"] : []).concat(modules.readiness ? ["readiness"] : [])
      ));
    } catch (e) {
    }
    finalizeSheetWidth(sheet);
    sheet.x = b.x;
    sheet.y = b.y + b.h + 80;
    page.appendChild(sheet);
    sheet.setPluginData("sourceNodeId", node.id);
    sheet.setPluginData("specModules", JSON.stringify(modules || {}));
    return sheet;
  }
  async function buildSectionByKey(key, source, stateTarget) {
    var temp = figma.createFrame();
    temp.name = SPEC_PREFIX + "Section Rebuild [temp]";
    temp.layoutMode = "VERTICAL";
    temp.primaryAxisSizingMode = "AUTO";
    temp.counterAxisSizingMode = "AUTO";
    temp.fills = [];
    temp.clipsContent = false;
    figma.currentPage.appendChild(temp);
    propagateResolvedVariableModes(temp, source);
    try {
      if (key === "hero") {
        var hero = makeSectionWrapper(source.name);
        hero.name = SPEC_PREFIX + "Hero Section";
        hero.itemSpacing = 0;
        temp.appendChild(hero);
      } else if (key === "meta") {
        temp.appendChild(makeMetaSection());
      } else if (key === "anatomy") {
        await buildAnatomySheetSection(temp, source);
      } else if (key === "properties") {
        await buildPropertiesSheetSection(temp, source, stateTarget);
      } else if (key === "layout") {
        await buildLayoutSheetSection(temp, source);
      } else if (key === "variables") {
        await buildVariablesSheetSection(temp, source);
      } else if (key === "a11y") {
        await buildAccessibilitySheetSection(temp, source);
      } else if (key === "readiness") {
        await buildReadinessSheetSection(temp, source, stateTarget);
      }
    } catch (e) {
    }
    var built = null;
    if (temp.children.length > 0 && temp.children[0].type === "FRAME") {
      built = temp.children[0];
      try {
        built.setPluginData("specSection", key);
        built.setPluginData("sourceNodeId", source.id);
      } catch (e) {
      }
      figma.currentPage.appendChild(built);
      propagateResolvedVariableModes(built, source);
    }
    temp.remove();
    return built;
  }
  async function resyncSheetInPlace(sheet, source, modules) {
    modules = normalizeSpecModules(modules);
    propagateResolvedVariableModes(sheet, source);
    var stateTarget = await findStateTargetAsync(source);
    try {
      if (sheet.counterAxisSizingMode !== "FIXED") {
        var preservedWidth = sheet.width;
        sheet.counterAxisSizingMode = "FIXED";
        sheet.resizeWithoutConstraints(preservedWidth, sheet.height || 1);
      }
    } catch (e) {
    }
    var existing = [];
    for (var i = 0; i < sheet.children.length; i++) {
      var child = sheet.children[i];
      if (child.type === "FRAME" && getSectionKey(child)) existing.push(child);
    }
    for (var j = 0; j < existing.length; j++) {
      var oldSection = existing[j];
      var key = getSectionKey(oldSection);
      var index = sheet.children.indexOf(oldSection);
      if (index < 0) continue;
      var fresh = await buildSectionByKey(key, source, stateTarget);
      if (!fresh) {
        oldSection.remove();
        continue;
      }
      sheet.insertChild(index, fresh);
      oldSection.remove();
      try {
        fresh.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    }
    var everGenerated = [];
    try {
      everGenerated = JSON.parse(sheet.getPluginData("specSectionsGenerated") || "[]") || [];
    } catch (e) {
      everGenerated = [];
    }
    var present = {};
    for (var p = 0; p < sheet.children.length; p++) {
      var pk = getSectionKey(sheet.children[p]);
      if (pk) present[pk] = true;
    }
    var backfillKeys = [];
    if (modules.accessibility) backfillKeys.push("a11y");
    if (modules.readiness) backfillKeys.push("readiness");
    for (var b = 0; b < backfillKeys.length; b++) {
      var bk = backfillKeys[b];
      if (present[bk] || everGenerated.indexOf(bk) !== -1) continue;
      var added = await buildSectionByKey(bk, source, stateTarget);
      if (added) {
        sheet.appendChild(added);
        try {
          added.layoutSizingHorizontal = "FILL";
        } catch (e) {
        }
        present[bk] = true;
      }
    }
    try {
      var record = {};
      for (var eg = 0; eg < everGenerated.length; eg++) record[everGenerated[eg]] = true;
      for (var pr in present) record[pr] = true;
      sheet.setPluginData("specSectionsGenerated", JSON.stringify(Object.keys(record)));
    } catch (e) {
    }
  }
  async function resyncSectionInPlace(oldSection, source) {
    var key = getSectionKey(oldSection);
    var parent = oldSection.parent;
    if (!key || !parent) return false;
    var stateTarget = key === "properties" || key === "readiness" ? await findStateTargetAsync(source) : null;
    var index = parent.children ? parent.children.indexOf(oldSection) : -1;
    var oldX = oldSection.x;
    var oldY = oldSection.y;
    var oldW = oldSection.width || 1;
    var oldSizingH = "";
    try {
      oldSizingH = oldSection.layoutSizingHorizontal || "";
    } catch (e) {
    }
    var fresh = await buildSectionByKey(key, source, stateTarget);
    if (!fresh) return false;
    if (index >= 0 && typeof parent.insertChild === "function") {
      parent.insertChild(Math.min(index, parent.children.length), fresh);
    } else {
      parent.appendChild(fresh);
    }
    oldSection.remove();
    var parentIsOwnSheet = !!(getSheetSourceId(parent) && !getSectionKey(parent));
    if (parentIsOwnSheet && parent.layoutMode && parent.layoutMode !== "NONE") {
      try {
        fresh.layoutSizingHorizontal = "FILL";
      } catch (e) {
      }
    } else if (parent.layoutMode && parent.layoutMode !== "NONE") {
      try {
        fresh.layoutSizingHorizontal = oldSizingH === "FILL" ? "FILL" : "FIXED";
      } catch (e) {
      }
      if (oldSizingH !== "FILL") {
        try {
          fresh.resizeWithoutConstraints(oldW, fresh.height || 1);
        } catch (e) {
        }
      }
    } else {
      fresh.x = oldX;
      fresh.y = oldY;
      try {
        fresh.resizeWithoutConstraints(oldW, fresh.height || 1);
      } catch (e) {
      }
    }
    return true;
  }
  function sheetHasStampedSections(sheet) {
    for (var i = 0; i < sheet.children.length; i++) {
      var child = sheet.children[i];
      if (child.type === "FRAME" && getSectionKey(child)) return true;
    }
    return false;
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
  var STATE_SELECTION_HINT = "Generate component spec documentation";
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
      if (getSheetSourceId(child) && !getSectionKey(child)) {
        out.push(child);
        continue;
      }
      if (child.name === SPEC_PREFIX + "Generated Sheets") {
        var inner = child.children || [];
        for (var r = 0; r < inner.length; r++) {
          var grand = inner[r];
          if (grand.type === "FRAME" && getSheetSourceId(grand) && !getSectionKey(grand)) {
            out.push(grand);
          }
        }
      }
    }
    return out;
  }
  function getSectionKey(n) {
    try {
      return n.getPluginData ? n.getPluginData("specSection") || "" : "";
    } catch (e) {
      return "";
    }
  }
  function getEnclosingSpecSheet(n) {
    var p = n.parent;
    while (p && p.type !== "PAGE") {
      if (p.type === "FRAME" && getSheetSourceId(p) && !getSectionKey(p)) return p;
      p = p.parent;
    }
    return null;
  }
  function findAllStampedSections() {
    var out = [];
    try {
      var frames = figma.currentPage.findAllWithCriteria({ types: ["FRAME"] });
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        if (!f.name || f.name.indexOf(SPEC_PREFIX) !== 0) continue;
        if (getSectionKey(f)) out.push(f);
      }
    } catch (e) {
    }
    return out;
  }
  function selectionCoversNode(n, selectedIds) {
    var p = n;
    while (p && p.type !== "PAGE") {
      if (p.id && selectedIds[p.id]) return true;
      p = p.parent;
    }
    return false;
  }
  function findResyncTargets() {
    var sheets = findLinkedSheets();
    var allSections = findAllStampedSections();
    var selection2 = figma.currentPage.selection;
    var sheetIds = {};
    for (var s = 0; s < sheets.length; s++) sheetIds[sheets[s].id] = true;
    var sections = [];
    if (selection2.length === 0) {
      for (var i = 0; i < allSections.length; i++) {
        if (!getEnclosingSpecSheet(allSections[i])) sections.push(allSections[i]);
      }
      return { sheets, sections };
    }
    var selectedIds = {};
    for (var si = 0; si < selection2.length; si++) selectedIds[selection2[si].id] = true;
    var targetIds = collectSelectionTargetIds();
    for (var j = 0; j < allSections.length; j++) {
      var sec = allSections[j];
      var enclosing = getEnclosingSpecSheet(sec);
      if (enclosing && sheetIds[enclosing.id]) continue;
      var covered = selectionCoversNode(sec, selectedIds);
      var sourceMatched = !!targetIds[getSheetSourceId(sec)];
      if (enclosing) {
        if (covered) sections.push(sec);
      } else if (covered || sourceMatched) {
        sections.push(sec);
      }
    }
    return { sheets, sections };
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
      if (sel.type === "FRAME" && getSheetSourceId(sel) && !getSectionKey(sel) && !seen[sel.id]) {
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
      var targets = findResyncTargets();
      resyncableCount = targets.sheets.length + targets.sections.length;
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
      var modules = normalizeSpecModules(msg.modules);
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
          var targets = findResyncTargets();
          if (targets.sheets.length === 0 && targets.sections.length === 0) {
            var noneMsg = figma.currentPage.selection.length === 0 ? "No spec sheets found on this page yet. Generate specs first." : "No spec sheets linked to this selection. Generate specs first.";
            figma.ui.postMessage({ type: "error", message: noneMsg });
            return;
          }
          var defaultModules = normalizeSpecModules(null);
          var sheetJobs = [];
          var orphans = 0;
          for (var i = 0; i < targets.sheets.length; i++) {
            var sheet = targets.sheets[i];
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
            sheetJobs.push({ sheet, source, modules: normalizeSpecModules(storedModules || msg.modules || defaultModules) });
          }
          var sectionJobs = [];
          var skippedSections = 0;
          for (var si = 0; si < targets.sections.length; si++) {
            var sec = targets.sections[si];
            var secSource = await figma.getNodeByIdAsync(getSheetSourceId(sec));
            if (!secSource || secSource.type !== "COMPONENT" && secSource.type !== "INSTANCE" && secSource.type !== "FRAME") {
              skippedSections++;
              continue;
            }
            sectionJobs.push({ section: sec, source: secSource });
          }
          if (sheetJobs.length === 0 && sectionJobs.length === 0) {
            figma.ui.postMessage({ type: "success", message: "Removed " + orphans + " orphaned sheet(s) \u2014 their components no longer exist." });
            postSelectionStateToUI();
            return;
          }
          var sources = [];
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
              await resyncSheetInPlace(job.sheet, job.source, job.modules);
            } else {
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
            }
            refreshedSheets++;
          }
          var refreshedSections = 0;
          for (var k = 0; k < sectionJobs.length; k++) {
            var ok = await resyncSectionInPlace(sectionJobs[k].section, sectionJobs[k].source);
            if (ok) refreshedSections++;
          }
          var parts = [];
          if (refreshedSheets > 0) parts.push(refreshedSheets + " sheet(s)");
          if (refreshedSections > 0) parts.push(refreshedSections + " moved section(s)");
          var summaryText = "Resynced " + (parts.length > 0 ? parts.join(" and ") : "nothing") + (orphans > 0 ? ", removed " + orphans + " orphaned" : "") + (skippedSections > 0 ? ", skipped " + skippedSections + " section(s) with missing components" : "") + ".";
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
  var skippedVariableRows = [];
  var skippedStyleRows = [];
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
  var FONT_SEMIBOLD = { family: "Inter", style: "Bold" };
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
  var ROW_PADDING = 16;
  var FONT_SIZE = 12;
  var CORNER_RADIUS = 16;
  var tokenFontsResolved = false;
  figma.on("currentpagechange", cancel);
  function resolveTokenFonts() {
    if (tokenFontsResolved) return;
    tokenFontsResolved = true;
    function weightOf(styleName) {
      const s = (styleName || "").toLowerCase();
      if (s.indexOf("thin") >= 0 || s.indexOf("hairline") >= 0) return 100;
      if (s.indexOf("extra light") >= 0 || s.indexOf("extralight") >= 0 || s.indexOf("ultralight") >= 0) return 200;
      if (s.indexOf("light") >= 0) return 300;
      if (s.indexOf("regular") >= 0 || s.indexOf("book") >= 0 || s.indexOf("roman") >= 0 || s.indexOf("normal") >= 0) return 400;
      if (s.indexOf("medium") >= 0) return 500;
      if (s.indexOf("semi bold") >= 0 || s.indexOf("semibold") >= 0 || s.indexOf("demi") >= 0) return 600;
      if (s.indexOf("bold") >= 0) return 700;
      if (s.indexOf("extra bold") >= 0 || s.indexOf("extrabold") >= 0) return 800;
      if (s.indexOf("black") >= 0 || s.indexOf("heavy") >= 0) return 900;
      return 400;
    }
    const candidates = [];
    const seen = {};
    function addFont(fn) {
      if (!fn || typeof fn !== "object" || !fn.family || !fn.style) return;
      const key = fn.family + "|" + fn.style;
      if (seen[key]) return;
      seen[key] = true;
      candidates.push({ family: fn.family, style: fn.style });
    }
    try {
      const localTextStyles = figma.getLocalTextStyles();
      for (let i = 0; i < localTextStyles.length; i++) addFont(localTextStyles[i].fontName);
    } catch (e) {
    }
    if (!candidates.length) return;
    function closest(target) {
      let best = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const diff = Math.abs(weightOf(c.style) - target);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = c;
        }
      }
      return best;
    }
    const regular = closest(400);
    const semi = closest(600) || closest(700);
    const italic = candidates.find((c) => (c.style || "").toLowerCase().indexOf("italic") >= 0);
    if (regular) FONT_REGULAR2 = regular;
    if (semi) FONT_SEMIBOLD = semi;
    if (italic) FONT_ITALIC = italic;
  }
  async function ensureTokenFontsLoaded() {
    resolveTokenFonts();
    async function safeLoad(target, fallback) {
      try {
        await figma.loadFontAsync(target);
        return target;
      } catch (e) {
        await figma.loadFontAsync(fallback);
        return fallback;
      }
    }
    FONT_REGULAR2 = await safeLoad(FONT_REGULAR2, { family: "Inter", style: "Regular" });
    FONT_SEMIBOLD = await safeLoad(FONT_SEMIBOLD, FONT_REGULAR2);
    FONT_ITALIC = await safeLoad(FONT_ITALIC, FONT_REGULAR2);
  }
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
  var activeCollectionGroupsById = {};
  var mainFrame;
  var TOKENS_DOC_KEY = "dsTokensDoc";
  var TOKENS_CONFIG_KEY = "dsTokensConfig";
  var TOKENS_DOC_STACK_KEY = "dsTokensDocStack";
  var TOKENS_SYNC_META_KEY = "dsTokensSyncMeta";
  function normalizeTokensSyncMode(input) {
    if (input === "doc-to-variables" || input === "variables-to-doc") return input;
    return "auto";
  }
  function normalizeDescriptionText(value) {
    const text = String(value || "").trim();
    return text.toLowerCase() === "no description" ? "" : text;
  }
  function hashDescriptionMap(map) {
    const ids = Object.keys(map).sort();
    let payload = "";
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      payload += id + "=" + normalizeDescriptionText(map[id]) + "\n";
    }
    return String(payload.length) + ":" + payload;
  }
  function extractVariableDescriptionsFromDocFrame(docFrame) {
    const out = {};
    try {
      let walk = function(node) {
        rows.push(node);
        const kids = node.children;
        if (!kids || !kids.length) return;
        for (let i = 0; i < kids.length; i++) walk(kids[i]);
      };
      const rows = [];
      walk(docFrame);
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.type !== "FRAME") continue;
        const rowName = String(row.name || "");
        if (rowName.indexOf("variable-row-") !== 0) continue;
        const variableId = rowName.substring("variable-row-".length);
        if (!variableId) continue;
        let nextDescription = null;
        const rowChildren = row.children || [];
        for (let c = 0; c < rowChildren.length; c++) {
          const cell = rowChildren[c];
          if (!cell || cell.type !== "FRAME") continue;
          const cellName = String(cell.name || "");
          if (cellName === "name-cell") {
            const textChildren = (cell.children || []).filter((n) => n && n.type === "TEXT");
            if (textChildren.length > 1) nextDescription = String(textChildren[1].characters || "").trim();
            else if (textChildren.length === 1) nextDescription = String(textChildren[0].characters || "").trim();
            break;
          }
          if (cellName === "desc-cell") {
            const textChildren = cell.children || [];
            for (let t = 0; t < textChildren.length; t++) {
              const txt = textChildren[t];
              if (txt && txt.type === "TEXT") {
                nextDescription = String(txt.characters || "").trim();
                break;
              }
            }
            break;
          }
        }
        if (nextDescription === null) continue;
        out[variableId] = normalizeDescriptionText(nextDescription);
      }
    } catch (e) {
    }
    return out;
  }
  function getVariableDescriptionsByIds(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const v = figma.variables.getVariableById(id);
        if (!v) continue;
        out[id] = normalizeDescriptionText(v.description || "");
      } catch (e) {
      }
    }
    return out;
  }
  function readTokensSyncMeta(frame) {
    try {
      const raw = frame.getPluginData(TOKENS_SYNC_META_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }
  function writeTokensSyncMeta(frame, direction) {
    try {
      const docMap = extractVariableDescriptionsFromDocFrame(frame);
      const ids = Object.keys(docMap);
      const variableMap = getVariableDescriptionsByIds(ids);
      const meta = {
        version: 1,
        docHash: hashDescriptionMap(docMap),
        variableHash: hashDescriptionMap(variableMap),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        direction
      };
      frame.setPluginData(TOKENS_SYNC_META_KEY, JSON.stringify(meta));
    } catch (e) {
    }
  }
  function findTokensDocStack() {
    try {
      var children = figma.currentPage.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.type === "FRAME" && child.getPluginData(TOKENS_DOC_STACK_KEY) === "1") {
          return child;
        }
      }
    } catch (e) {
    }
    return null;
  }
  function getSelectedTokensDocFrame() {
    try {
      var sel = figma.currentPage.selection || [];
      for (var i = 0; i < sel.length; i++) {
        var cursor = sel[i];
        while (cursor && cursor.type !== "PAGE") {
          if (cursor.type === "FRAME" && cursor.getPluginData(TOKENS_DOC_KEY) === "1") {
            return cursor;
          }
          cursor = cursor.parent;
        }
      }
    } catch (e) {
    }
    return null;
  }
  function ensureTokensDocStack() {
    var stack = findTokensDocStack();
    if (!stack) {
      stack = figma.createFrame();
      stack.name = "Specs-Token Docs";
      stack.layoutMode = "HORIZONTAL";
      stack.itemSpacing = 100;
      stack.paddingLeft = 0;
      stack.paddingRight = 0;
      stack.paddingTop = 0;
      stack.paddingBottom = 0;
      stack.layoutSizingHorizontal = "HUG";
      stack.layoutSizingVertical = "HUG";
      stack.fills = [];
      stack.setPluginData(TOKENS_DOC_STACK_KEY, "1");
      var rightmostX = 0;
      var yTop = 0;
      var pageChildren = figma.currentPage.children || [];
      for (var i = 0; i < pageChildren.length; i++) {
        var n = pageChildren[i];
        var nr = n.x + n.width;
        if (nr > rightmostX) rightmostX = nr;
        if (i === 0 || n.y < yTop) yTop = n.y;
      }
      stack.x = rightmostX + 100;
      stack.y = yTop;
      figma.currentPage.appendChild(stack);
    }
    try {
      var docs = (figma.currentPage.children || []).filter((n2) => n2.type === "FRAME" && n2.getPluginData(TOKENS_DOC_KEY) === "1");
      for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        if (doc.parent === figma.currentPage) {
          stack.appendChild(doc);
        }
      }
    } catch (e) {
    }
    return stack;
  }
  function syncVariableDescriptionsFromDocFrame(docFrame) {
    let updated = 0;
    try {
      const docMap = extractVariableDescriptionsFromDocFrame(docFrame);
      const ids = Object.keys(docMap);
      for (let i = 0; i < ids.length; i++) {
        const variableId = ids[i];
        const variable = figma.variables.getVariableById(variableId);
        if (!variable) continue;
        const nextDescription = normalizeDescriptionText(docMap[variableId]);
        const currentDescription = normalizeDescriptionText(variable.description || "");
        if (currentDescription === nextDescription) continue;
        try {
          variable.description = nextDescription;
          updated++;
        } catch (e) {
        }
      }
    } catch (e) {
    }
    return updated;
  }
  function getTokensResyncState() {
    return { available: !!getSelectedTokensDocFrame() };
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
  function getVariableGroupPath(variableName) {
    if (!variableName) return "";
    const parts = variableName.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return "";
    return parts.slice(0, parts.length - 1).join("/");
  }
  function buildCollectionGroupSummaries(variables) {
    const countsByPath = {};
    for (const v of variables) {
      const path = getVariableGroupPath(v.name);
      if (!path) continue;
      const parts = path.split("/").filter(Boolean);
      for (let depth = 1; depth <= parts.length; depth++) {
        const prefix = parts.slice(0, depth).join("/");
        countsByPath[prefix] = (countsByPath[prefix] || 0) + 1;
      }
    }
    const paths = Object.keys(countsByPath);
    paths.sort((a, b) => {
      const ad = a.split("/").length;
      const bd = b.split("/").length;
      if (ad !== bd) return ad - bd;
      return naturalSort(a, b);
    });
    return paths.map((path) => {
      const parts = path.split("/").filter(Boolean);
      return {
        id: path,
        name: parts[parts.length - 1] || path,
        count: countsByPath[path],
        depth: parts.length,
        parentId: parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : ""
      };
    });
  }
  function createMainFrame(attachToStack = true) {
    mainFrame = createAutolayout("Specs-Variables and Styles", "HORIZONTAL", 100, 0, 0);
    mainFrame.fills = [];
    mainFrame.layoutSizingHorizontal = "HUG";
    mainFrame.layoutSizingVertical = "HUG";
    variablesFrame = createAutolayout("Specs-Local Variables", "VERTICAL", 24, 24, 24);
    variablesFrame.fills = [];
    variablesFrame.layoutSizingHorizontal = "HUG";
    variablesFrame.layoutSizingVertical = "HUG";
    mainFrame.appendChild(variablesFrame);
    stylesFrame = createAutolayout("Specs-Local Styles", "VERTICAL", 24, 24, 24);
    stylesFrame.fills = [];
    stylesFrame.layoutSizingHorizontal = "HUG";
    stylesFrame.layoutSizingVertical = "HUG";
    mainFrame.appendChild(stylesFrame);
    mainFrame.cornerRadius = CORNER_RADIUS;
    mainFrame.setRelaunchData({ rewrite: REWRITE_MSG });
    if (attachToStack) {
      const stack = ensureTokensDocStack();
      stack.appendChild(mainFrame);
    }
  }
  function getTokensInitData() {
    working = false;
    selection = figma.currentPage.selection;
    collections = figma.variables.getLocalVariableCollections() || [];
    activeCollections = collections;
    const sel = selection.map((s) => ({ id: s.id, name: s.name, type: s.type }));
    const cols = collections.map((c) => {
      const vars = c.variableIds.map((id) => figma.variables.getVariableById(id)).filter(Boolean);
      const groups = buildCollectionGroupSummaries(vars);
      return {
        id: c.id,
        name: c.name,
        modeCount: c.modes.length,
        variableCount: vars.length,
        groups
      };
    });
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
    let selectedConfig = null;
    try {
      const selectedDoc = getSelectedTokensDocFrame();
      if (selectedDoc) {
        const raw = selectedDoc.getPluginData(TOKENS_CONFIG_KEY) || "null";
        selectedConfig = JSON.parse(raw);
      }
    } catch (e) {
      selectedConfig = null;
    }
    return {
      type: "tokens-init",
      selection: sel,
      collections: cols,
      colorStyles: paintStyles,
      effectStyles,
      textStyles,
      layoutStyles,
      resyncAvailable: !!getSelectedTokensDocFrame(),
      selectedConfig
    };
  }
  async function regenerateTokensDoc(targetFrame, selectedCollectionIds, selectedCollectionGroupsById, colorIds, effectIds, textIds, layoutIds, syncDirection = "variables-to-doc", syncMode = "auto") {
    working = true;
    count = 0;
    skippedVariableRows = [];
    skippedStyleRows = [];
    selection = figma.currentPage.selection;
    figma.ui.postMessage({ type: "tokens-status", text: "Preparing generation..." });
    activeCollections = collections.filter((c) => selectedCollectionIds.indexOf(c.id) !== -1);
    activeCollectionGroupsById = selectedCollectionGroupsById || {};
    activeColorStyleIds = colorIds;
    activeEffectStyleIds = effectIds;
    activeTextStyleIds = textIds;
    activeLayoutStyleIds = layoutIds;
    createMainFrame(false);
    const stagedFrame = mainFrame;
    propagateSelectedVariableModes(stagedFrame);
    figma.ui.postMessage({ type: "tokens-status", text: "Writing variables..." });
    await writeVariables((progress) => figma.ui.postMessage({ type: "tokens-progress", text: progress }));
    figma.ui.postMessage({ type: "tokens-status", text: "Writing styles..." });
    await writeStyles((progress) => figma.ui.postMessage({ type: "tokens-progress", text: progress }));
    try {
      if (stylesFrame && stylesFrame.children.length === 0 && stylesFrame.parent) {
        stylesFrame.remove();
      }
    } catch (e) {
    }
    try {
      if (variablesFrame && variablesFrame.children.length === 0 && variablesFrame.parent) {
        variablesFrame.remove();
      }
    } catch (e) {
    }
    const configPayload = JSON.stringify({
      collections: selectedCollectionIds,
      colorStyles: colorIds,
      effectStyles: effectIds,
      textStyles: textIds,
      layoutStyles: layoutIds,
      collectionGroups: selectedCollectionGroupsById || {},
      syncMode
    });
    prependTokenTimestampInVariablesColumn(stagedFrame);
    stagedFrame.setPluginData(TOKENS_DOC_KEY, "1");
    stagedFrame.setPluginData(TOKENS_CONFIG_KEY, configPayload);
    if (targetFrame) {
      while (targetFrame.children.length) targetFrame.children[0].remove();
      while (stagedFrame.children.length) targetFrame.appendChild(stagedFrame.children[0]);
      targetFrame.name = stagedFrame.name;
      targetFrame.cornerRadius = stagedFrame.cornerRadius;
      targetFrame.setRelaunchData({ rewrite: REWRITE_MSG });
      targetFrame.setPluginData(TOKENS_DOC_KEY, stagedFrame.getPluginData(TOKENS_DOC_KEY));
      targetFrame.setPluginData(TOKENS_CONFIG_KEY, stagedFrame.getPluginData(TOKENS_CONFIG_KEY));
      writeTokensSyncMeta(targetFrame, syncDirection);
      mainFrame = targetFrame;
      try {
        stagedFrame.remove();
      } catch (e) {
      }
    } else {
      const stack = ensureTokensDocStack();
      const groupedFrames = [
        ...buildGroupFramesFromSectionContainer(variablesFrame, configPayload),
        ...buildGroupFramesFromSectionContainer(stylesFrame, configPayload)
      ];
      if (groupedFrames.length > 0) {
        for (let i = 0; i < groupedFrames.length; i++) {
          writeTokensSyncMeta(groupedFrames[i], syncDirection);
          stack.appendChild(groupedFrames[i]);
        }
        mainFrame = groupedFrames[groupedFrames.length - 1];
        try {
          stagedFrame.remove();
        } catch (e) {
        }
      } else {
        writeTokensSyncMeta(stagedFrame, syncDirection);
        stack.appendChild(stagedFrame);
        mainFrame = stagedFrame;
      }
    }
    finish();
  }
  function handleTokensConfirm(msg) {
    (async () => {
      try {
        collections = figma.variables.getLocalVariableCollections() || [];
        selection = figma.currentPage.selection;
        var selectedIds = Array.isArray(msg.collections) ? msg.collections : collections.map((c) => c.id);
        var syncMode = normalizeTokensSyncMode(msg && msg.syncMode);
        var selectedCollectionGroupsById = msg.collectionGroups && typeof msg.collectionGroups === "object" ? msg.collectionGroups : {};
        await regenerateTokensDoc(
          null,
          selectedIds,
          selectedCollectionGroupsById,
          Array.isArray(msg.colorStyles) ? msg.colorStyles : [],
          Array.isArray(msg.effectStyles) ? msg.effectStyles : [],
          Array.isArray(msg.textStyles) ? msg.textStyles : [],
          Array.isArray(msg.layoutStyles) ? msg.layoutStyles : [],
          "variables-to-doc",
          syncMode
        );
      } catch (err) {
        working = false;
        const message = err && err.message ? err.message : String(err);
        figma.ui.postMessage({ type: "tokens-status", text: "Error: " + message });
        notify("Error: " + message);
      }
    })();
  }
  function handleTokensResync(msg) {
    (async () => {
      try {
        var target = getSelectedTokensDocFrame();
        if (!target) {
          figma.ui.postMessage({ type: "tokens-status", text: "Select a previous token documentation frame to resync it." });
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
        const requestedMode = normalizeTokensSyncMode(msg && msg.syncMode || stored.syncMode);
        const meta = readTokensSyncMeta(target);
        const lastSyncLabel = meta && meta.updatedAt ? " Last sync: " + meta.updatedAt + "." : "";
        const docMapBefore = extractVariableDescriptionsFromDocFrame(target);
        const variableIds = Object.keys(docMapBefore);
        const variableMapBefore = getVariableDescriptionsByIds(variableIds);
        const docChanged = !meta || hashDescriptionMap(docMapBefore) !== meta.docHash;
        const variableChanged = !meta || hashDescriptionMap(variableMapBefore) !== meta.variableHash;
        let syncDirection = "no-op";
        let syncedCount = 0;
        if (requestedMode === "doc-to-variables") {
          syncDirection = "doc-to-variables";
          syncedCount = syncVariableDescriptionsFromDocFrame(target);
        } else if (requestedMode === "variables-to-doc") {
          syncDirection = "variables-to-doc";
        } else {
          if (docChanged && !variableChanged) {
            syncDirection = "doc-to-variables";
            syncedCount = syncVariableDescriptionsFromDocFrame(target);
          } else if (!docChanged && variableChanged) {
            syncDirection = "variables-to-doc";
          } else if (docChanged && variableChanged) {
            syncDirection = "merge-doc-preferred";
            syncedCount = syncVariableDescriptionsFromDocFrame(target);
          }
        }
        if (requestedMode === "doc-to-variables") {
          figma.ui.postMessage({
            type: "tokens-status",
            text: "Forced sync mode: doc -> variables (" + syncedCount + " description" + (syncedCount === 1 ? "" : "s") + " updated)." + lastSyncLabel
          });
        } else if (requestedMode === "variables-to-doc") {
          figma.ui.postMessage({
            type: "tokens-status",
            text: "Forced sync mode: variables -> doc (regenerating from Variables panel)." + lastSyncLabel
          });
        } else if (syncDirection === "doc-to-variables") {
          figma.ui.postMessage({
            type: "tokens-status",
            text: "Sync direction: doc -> variables (" + syncedCount + " description" + (syncedCount === 1 ? "" : "s") + " updated)." + lastSyncLabel
          });
        } else if (syncDirection === "variables-to-doc") {
          figma.ui.postMessage({ type: "tokens-status", text: "Sync direction: variables -> doc (source variables changed since last sync)." + lastSyncLabel });
        } else if (syncDirection === "merge-doc-preferred") {
          figma.ui.postMessage({
            type: "tokens-status",
            text: "Both sides changed since last sync; applying doc descriptions first (" + syncedCount + " update" + (syncedCount === 1 ? "" : "s") + "), then regenerating." + lastSyncLabel
          });
        } else {
          figma.ui.postMessage({ type: "tokens-status", text: "No detected description changes since last sync; regenerating doc." + lastSyncLabel });
        }
        collections = figma.variables.getLocalVariableCollections() || [];
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
        );
      } catch (err) {
        working = false;
        const message = err && err.message ? err.message : String(err);
        figma.ui.postMessage({ type: "tokens-status", text: "Error: " + message });
        notify("Error: " + message);
      }
    })();
  }
  var TOKEN_TARGET_WIDTH = 1280;
  var TOKEN_FRAME_PADDING_X = 24;
  var PREVIEW_COLUMN_WIDTH = 320;
  var NAME_COLUMN_WIDTH = 355;
  var VALUE_COLUMN_WIDTH = TOKEN_TARGET_WIDTH - TOKEN_FRAME_PADDING_X * 2 - PREVIEW_COLUMN_WIDTH - NAME_COLUMN_WIDTH;
  var TOKEN_TABLE_WIDTH = PREVIEW_COLUMN_WIDTH + NAME_COLUMN_WIDTH + VALUE_COLUMN_WIDTH;
  var TOKEN_ROW_HEIGHT = 88;
  var TOKEN_HEADER_HEIGHT = 48;
  var TOKEN_NAME_FONT_SIZE = 20;
  var TOKENS_TIMESTAMP_FRAME_NAME = "tokens-timestamp";
  function createTokenTableSection(title) {
    const section = createAutolayout(title, "VERTICAL", 0, 0, 0, "HUG", "HUG");
    section.fills = [LIGHT];
    return section;
  }
  function createTokenGroupTitle(title) {
    const wrap = createAutolayout("group-title-" + title, "VERTICAL", 0, 0, 0, "HUG", "HUG");
    const txt = makeText2(title, FONT_SEMIBOLD, 56);
    txt.fills = [DARK];
    addToColumn(wrap, txt);
    return wrap;
  }
  function createTokenSubgroupTitle(title) {
    const wrap = createAutolayout("subgroup-title-" + title, "VERTICAL", 0, 0, 0, "HUG", "HUG");
    const txt = makeText2(title, FONT_SEMIBOLD, 28);
    txt.fills = [DARK];
    addToColumn(wrap, txt);
    return wrap;
  }
  function getTokenTimestampText() {
    const d = /* @__PURE__ */ new Date();
    let timezone = "";
    try {
      const dtf = new Intl.DateTimeFormat(void 0, { timeZoneName: "short" });
      const parts = dtf.formatToParts(d);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") {
          timezone = parts[i].value;
          break;
        }
      }
    } catch (e) {
    }
    const dateStr = d.toLocaleDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return timezone ? "Last updated: " + dateStr + " at " + timeStr + " (" + timezone + ")" : "Last updated: " + dateStr + " at " + timeStr;
  }
  function createTokenTimestampFrame() {
    const section = createAutolayout(TOKENS_TIMESTAMP_FRAME_NAME, "VERTICAL", 2, 0, 0, "HUG", "HUG");
    const stamp = makeText2(getTokenTimestampText(), FONT_REGULAR2, 11);
    stamp.fills = [COLOR_TEXT_SECONDARY];
    addToColumn(section, stamp);
    try {
      const currentUserName = figma.currentUser && figma.currentUser.name ? figma.currentUser.name.trim() : "";
      if (currentUserName) {
        const by = makeText2("By: " + currentUserName, FONT_REGULAR2, 11);
        by.fills = [COLOR_TEXT_SECONDARY];
        addToColumn(section, by);
      }
    } catch (e) {
    }
    return section;
  }
  function prependTokenTimestamp(target) {
    try {
      const children = target.children || [];
      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].name === TOKENS_TIMESTAMP_FRAME_NAME) children[i].remove();
      }
    } catch (e) {
    }
    try {
      target.insertChild(0, createTokenTimestampFrame());
    } catch (e) {
      target.appendChild(createTokenTimestampFrame());
    }
  }
  function prependTokenTimestampInVariablesColumn(root) {
    let inserted = false;
    try {
      const kids = root.children || [];
      for (let i = 0; i < kids.length; i++) {
        const child = kids[i];
        if (!child || child.type !== "FRAME") continue;
        const childName = String(child.name || "");
        if (childName === "Specs-Local Variables" || childName === "Specs-Local Styles") {
          prependTokenTimestamp(child);
          inserted = true;
        }
      }
    } catch (e) {
    }
    if (!inserted) prependTokenTimestamp(root);
  }
  function getTokenGroupPath(name) {
    if (!name) return "Ungrouped";
    const parts = name.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return "Ungrouped";
    return parts.slice(0, parts.length - 1).join("/");
  }
  function groupByTokenPath(items, getName) {
    const byPath = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const path = getTokenGroupPath(getName(item));
      if (!byPath[path]) byPath[path] = [];
      byPath[path].push(item);
    }
    const paths = Object.keys(byPath).sort((a, b) => {
      if (a === "Ungrouped") return 1;
      if (b === "Ungrouped") return -1;
      return naturalSort(a, b);
    });
    return paths.map((path) => ({ path, items: byPath[path] }));
  }
  function normalizeGroupPathForCollection(path, collectionName) {
    if (!path || path === "Ungrouped") return "Ungrouped";
    const cRaw = (collectionName || "").trim();
    const pRaw = path.trim();
    if (!cRaw) return pRaw;
    function splitParts(input) {
      return input.split(/[/\.]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    const cParts = splitParts(cRaw);
    const pParts = splitParts(pRaw);
    if (!pParts.length) return "Ungrouped";
    let start = 0;
    while (start < cParts.length && start < pParts.length && cParts[start] === pParts[start]) {
      start++;
    }
    if (start >= pParts.length) return "Ungrouped";
    const remainder = pParts.slice(start);
    return remainder.length ? remainder.join("/") : "Ungrouped";
  }
  function getLeafGroupLabel(path) {
    if (!path || path === "Ungrouped") return "Ungrouped";
    const slashParts = path.split("/").map((p) => p.trim()).filter(Boolean);
    if (slashParts.length > 0) return slashParts[slashParts.length - 1];
    return path;
  }
  function getParentAndLeafGroupLabel(path) {
    if (!path || path === "Ungrouped") return "Ungrouped";
    const parts = path.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return parts[0] || "Ungrouped";
    return parts[parts.length - 2] + " / " + parts[parts.length - 1];
  }
  function getLeafTokenName(name) {
    if (!name) return "";
    const slashParts = name.split("/").map((p) => p.trim()).filter(Boolean);
    let leaf = slashParts.length ? slashParts[slashParts.length - 1] : name;
    const dotParts = leaf.split(".").map((p) => p.trim()).filter(Boolean);
    if (dotParts.length > 1) leaf = dotParts[dotParts.length - 1];
    return leaf;
  }
  function buildGroupFramesFromSectionContainer(container, configPayload) {
    const result = [];
    let currentMajorTitle = "";
    let currentSubgroupTitle = "";
    const children = container.children.slice();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childName = child.name || "";
      if (childName.indexOf("group-title-") === 0) {
        currentMajorTitle = childName.substring("group-title-".length) || "Tokens";
        currentSubgroupTitle = "";
        continue;
      }
      if (childName.indexOf("subgroup-title-") === 0) {
        currentSubgroupTitle = childName.substring("subgroup-title-".length) || "Ungrouped";
        continue;
      }
      if (child.type === "FRAME") {
        const out = createAutolayout("Specs-" + currentMajorTitle + "-" + currentSubgroupTitle, "VERTICAL", 12, 24, 24);
        out.fills = [];
        out.layoutSizingHorizontal = "HUG";
        out.layoutSizingVertical = "HUG";
        out.cornerRadius = CORNER_RADIUS;
        prependTokenTimestamp(out);
        out.appendChild(createTokenGroupTitle(currentMajorTitle || "Tokens"));
        out.appendChild(createTokenSubgroupTitle(currentSubgroupTitle || "Ungrouped"));
        out.appendChild(child);
        out.setRelaunchData({ rewrite: REWRITE_MSG });
        out.setPluginData(TOKENS_DOC_KEY, "1");
        out.setPluginData(TOKENS_CONFIG_KEY, configPayload);
        result.push(out);
        currentSubgroupTitle = "";
      }
    }
    return result;
  }
  function setFixedCellWidth(cell, width) {
    cell.layoutSizingHorizontal = "FIXED";
    cell.resizeWithoutConstraints(width, cell.height);
  }
  function createTokenHeaderRow(title) {
    const row = createAutolayout(title + "-header", "HORIZONTAL", 0, 0, 0, "HUG", "FIXED");
    row.resizeWithoutConstraints(TOKEN_TABLE_WIDTH, TOKEN_HEADER_HEIGHT);
    row.counterAxisAlignItems = "CENTER";
    row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
    row.strokeWeight = 1;
    row.strokeBottomWeight = 1;
    row.strokeTopWeight = 0;
    row.strokeLeftWeight = 0;
    row.strokeRightWeight = 0;
    function makeHeaderCell(label, width) {
      const cell = createAutolayout("header-" + label, "VERTICAL", 0, ROW_PADDING, 0, "FIXED", "FILL");
      row.appendChild(cell);
      setFixedCellWidth(cell, width);
      const txt = makeText2(label, FONT_SEMIBOLD, FONT_SIZE);
      addToColumn(cell, txt);
      return cell;
    }
    makeHeaderCell("Preview", PREVIEW_COLUMN_WIDTH);
    makeHeaderCell("Name", NAME_COLUMN_WIDTH);
    makeHeaderCell("Value", VALUE_COLUMN_WIDTH);
    return row;
  }
  function createTokenPreviewCell(content) {
    const cell = createAutolayout("preview-cell", "VERTICAL", 0, 0, 0, "FIXED", "FILL");
    setFixedCellWidth(cell, PREVIEW_COLUMN_WIDTH);
    cell.counterAxisAlignItems = "CENTER";
    cell.primaryAxisAlignItems = "CENTER";
    if (content) {
      try {
        cell.appendChild(content);
        if (content.layoutAlign !== void 0) {
          content.layoutAlign = "STRETCH";
        }
        if (content.resizeWithoutConstraints && content.type !== "TEXT") {
          const contentName = String(content.name || "");
          if (contentName === "text-style-preview-wrap") {
            ;
            content.resizeWithoutConstraints(PREVIEW_COLUMN_WIDTH, content.height);
          } else {
            ;
            content.resizeWithoutConstraints(PREVIEW_COLUMN_WIDTH, TOKEN_ROW_HEIGHT);
          }
        }
      } catch (e) {
      }
    }
    return cell;
  }
  function createTokenTextCell(name, value, desc) {
    function textCell(cellName, text, width, muted, size, weight) {
      const contentWidth = Math.max(80, width - ROW_PADDING * 2);
      const cell = createAutolayout(cellName, "VERTICAL", 4, ROW_PADDING, 0, "FIXED", "FILL");
      setFixedCellWidth(cell, width);
      cell.primaryAxisAlignItems = "CENTER";
      const txt = makeText2(text || "\u2014", weight || FONT_REGULAR2, size || FONT_SIZE);
      try {
        txt.resizeWithoutConstraints(contentWidth, txt.height);
      } catch (e) {
      }
      if (muted) txt.fills = [COLOR_TEXT_SECONDARY];
      addToColumn(cell, txt);
      return cell;
    }
    const nameContentWidth = Math.max(80, NAME_COLUMN_WIDTH - ROW_PADDING * 2);
    const n = createAutolayout("name-cell", "VERTICAL", 6, ROW_PADDING, 0, "FIXED", "FILL");
    setFixedCellWidth(n, NAME_COLUMN_WIDTH);
    n.primaryAxisAlignItems = "CENTER";
    const nameTitle = makeText2(name || "\u2014", FONT_SEMIBOLD, TOKEN_NAME_FONT_SIZE);
    try {
      nameTitle.resizeWithoutConstraints(nameContentWidth, nameTitle.height);
    } catch (e) {
    }
    const nameDesc = makeText2(desc || "no description", FONT_REGULAR2, FONT_SIZE);
    try {
      nameDesc.resizeWithoutConstraints(nameContentWidth, nameDesc.height);
    } catch (e) {
    }
    nameDesc.fills = [COLOR_TEXT_SECONDARY];
    addToColumn(n, nameTitle);
    addToColumn(n, nameDesc);
    const valueText = (value || "\u2014").trim();
    const valuePaddingY = valueText.indexOf("\n") >= 0 ? 16 : 0;
    const v = createAutolayout("value-cell", "VERTICAL", 4, ROW_PADDING, valuePaddingY, "FIXED", "FILL");
    setFixedCellWidth(v, VALUE_COLUMN_WIDTH);
    v.primaryAxisAlignItems = "CENTER";
    const valueContentWidth = Math.max(80, VALUE_COLUMN_WIDTH - ROW_PADDING * 2);
    function renderValueLineWithBadge(line) {
      const varMatch = line.match(/^(.*?)(var\(--[^)]+\))(\s*\(.*\))?$/);
      if (!varMatch || !varMatch[2]) {
        const plain = makeText2(line, FONT_REGULAR2, FONT_SIZE);
        plain.fills = [DARK];
        try {
          plain.resizeWithoutConstraints(valueContentWidth, plain.height);
        } catch (e) {
        }
        return plain;
      }
      const label = (varMatch[1] || "").trim();
      const tokenRef = (varMatch[2] || "").trim();
      const fallback = (varMatch[3] || "").trim();
      const lineWrap = createAutolayout("value-line-token", "HORIZONTAL", 2, 0, 0, "FIXED", "HUG");
      lineWrap.resizeWithoutConstraints(valueContentWidth, 1);
      lineWrap.counterAxisAlignItems = "CENTER";
      if (label) {
        const labelText = makeText2(label + ":", FONT_REGULAR2, FONT_SIZE);
        labelText.fills = [DARK];
        lineWrap.appendChild(labelText);
      }
      const badge = createAutolayout("token-var-badge", "HORIZONTAL", 0, 6, 3, "HUG", "HUG");
      badge.cornerRadius = 3;
      badge.strokes = [COLOR_BORDER];
      badge.strokeWeight = 1;
      badge.fills = [COLOR_WHITE];
      const badgeText = makeText2(tokenRef, FONT_REGULAR2, FONT_SIZE);
      badgeText.fills = [DARK];
      badge.appendChild(badgeText);
      lineWrap.appendChild(badge);
      if (fallback) {
        const fallbackText = makeText2(fallback, FONT_REGULAR2, FONT_SIZE);
        fallbackText.fills = [COLOR_TEXT_SECONDARY];
        lineWrap.appendChild(fallbackText);
      }
      return lineWrap;
    }
    const lines = valueText.split(/\r?\n/);
    for (let li = 0; li < lines.length; li++) {
      const rawLine = lines[li];
      const line = (rawLine || "").trim();
      if (!line) continue;
      addToColumn(v, renderValueLineWithBadge(line));
    }
    if (v.children.length === 0) addToColumn(v, makeText2("\u2014", FONT_REGULAR2, FONT_SIZE));
    return { nameCell: n, valueCell: v };
  }
  function appendTokenRow(section, rowName, preview, tokenName, value, description, isLast) {
    const row = createAutolayout(rowName, "HORIZONTAL", 0, 0, 0, "FIXED", "HUG");
    row.resizeWithoutConstraints(TOKEN_TABLE_WIDTH, TOKEN_ROW_HEIGHT);
    row.minHeight = TOKEN_ROW_HEIGHT;
    row.counterAxisAlignItems = "CENTER";
    if (!isLast) {
      row.strokes = [{ type: "SOLID", color: hexToRGB("#cccccc") }];
      row.strokeWeight = 1;
      row.strokeBottomWeight = 1;
      row.strokeTopWeight = 0;
      row.strokeLeftWeight = 0;
      row.strokeRightWeight = 0;
    }
    section.appendChild(row);
    const previewCell = createTokenPreviewCell(preview);
    const textCells = createTokenTextCell(tokenName, value, description);
    row.appendChild(previewCell);
    row.appendChild(textCells.nameCell);
    row.appendChild(textCells.valueCell);
    previewCell.layoutAlign = "STRETCH";
    textCells.nameCell.layoutAlign = "STRETCH";
    textCells.valueCell.layoutAlign = "STRETCH";
  }
  function getCollectionPrimaryMode(c) {
    if (!c.modes || c.modes.length === 0) return { modeId: "", name: DEFAULT_MODE_NAME };
    var preferred = c.modes.find((m) => m.name === DEFAULT_MODE_NAME);
    return preferred || c.modes[0];
  }
  function formatResolvedValue(raw) {
    if (raw === null || raw === void 0) return "\u2014";
    if (typeof raw === "boolean") return raw ? "true" : "false";
    if (typeof raw === "number") return String(raw);
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && raw.r !== void 0 && raw.g !== void 0 && raw.b !== void 0) {
      try {
        return figmaRGBToHex(raw);
      } catch (e) {
        return "color";
      }
    }
    if (typeof raw === "object" && raw.paints) return "paint";
    if (typeof raw === "object" && raw.effects) return "effects";
    try {
      return JSON.stringify(raw);
    } catch (e) {
      return String(raw);
    }
  }
  function makeVariableReference(name) {
    let ref = (name || "").replace(/\//g, ".").trim().toLowerCase();
    if (ref && ref.indexOf("--") !== 0) ref = "--" + ref;
    return ref ? "var(" + ref + ")" : "\u2014";
  }
  function formatVariableCellValue(v, modeId) {
    const raw = (v.valuesByMode || {})[modeId];
    const resolved = resolveAliasValueForMode(raw, modeId);
    const fallback = formatResolvedValue(resolved);
    if (raw && typeof raw === "object" && raw.type === "VARIABLE_ALIAS" && raw.id) {
      const aliasVar = figma.variables.getVariableById(raw.id);
      const aliasRef = aliasVar ? makeVariableReference(aliasVar.name) : String(raw.id);
      return fallback && fallback !== "\u2014" ? aliasRef + " (" + fallback + ")" : aliasRef;
    }
    const selfRef = makeVariableReference(v.name);
    return fallback && fallback !== "\u2014" ? selfRef + " (" + fallback + ")" : selfRef;
  }
  function resolveAliasValueForMode(raw, modeId) {
    function resolveInner(value, depth, visited) {
      if (depth > 12) return value;
      if (!(value && typeof value === "object" && value.type === "VARIABLE_ALIAS" && value.id)) return value;
      const aliasId = String(value.id);
      if (visited[aliasId]) return value;
      visited[aliasId] = true;
      try {
        const aliased = figma.variables.getVariableById(aliasId);
        if (!aliased) return value;
        let next = null;
        if (modeId && aliased.valuesByMode && Object.prototype.hasOwnProperty.call(aliased.valuesByMode, modeId)) {
          next = aliased.valuesByMode[modeId];
        } else {
          const keys = Object.keys(aliased.valuesByMode || {});
          if (keys.length) next = aliased.valuesByMode[keys[0]];
        }
        if (next === null || next === void 0) return value;
        return resolveInner(next, depth + 1, visited);
      } catch (e) {
        return value;
      }
    }
    return resolveInner(raw, 0, {});
  }
  function resolveNumericValue(raw, modeId) {
    const resolved = resolveAliasValueForMode(raw, modeId);
    if (typeof resolved === "number" && isFinite(resolved)) return resolved;
    const parsed = parseFloat(String(resolved != null ? resolved : ""));
    return isFinite(parsed) ? parsed : 0;
  }
  function makeVariablePreview(v, modeId) {
    try {
      let makeLeftAlignedPreview = function(content) {
        const wrap = figma.createFrame();
        wrap.name = "token-left-align-preview";
        wrap.layoutMode = "HORIZONTAL";
        wrap.primaryAxisSizingMode = "FIXED";
        wrap.counterAxisSizingMode = "FIXED";
        wrap.resize(previewWidth, previewHeight);
        wrap.itemSpacing = 0;
        wrap.paddingLeft = 24;
        wrap.paddingRight = 0;
        wrap.paddingTop = 0;
        wrap.paddingBottom = 0;
        wrap.counterAxisAlignItems = "CENTER";
        wrap.primaryAxisAlignItems = "MIN";
        wrap.fills = [];
        wrap.appendChild(content);
        return wrap;
      };
      const raw = (v.valuesByMode || {})[modeId];
      const resolvedRaw = resolveAliasValueForMode(raw, modeId);
      const previewWidth = PREVIEW_COLUMN_WIDTH;
      const previewHeight = TOKEN_ROW_HEIGHT;
      if (v.resolvedType === "FLOAT" && /(^|\/)(space|spacing|gap)(\/|$)|\b(space|spacing|gap)\b/i.test(v.name)) {
        const n = resolveNumericValue(raw, modeId);
        const row = figma.createFrame();
        row.name = "space-preview-row";
        row.layoutMode = "HORIZONTAL";
        row.primaryAxisSizingMode = "AUTO";
        row.counterAxisSizingMode = "AUTO";
        row.itemSpacing = 0;
        row.fills = [];
        row.counterAxisAlignItems = "CENTER";
        const leftDot = figma.createEllipse();
        leftDot.resize(8, 8);
        leftDot.fills = [COLOR_BORDER];
        row.appendChild(leftDot);
        const spacer = figma.createRectangle();
        const px = Math.max(1, Math.round(n));
        spacer.resize(px, 16);
        spacer.cornerRadius = 0;
        spacer.fills = [DARK];
        try {
          spacer.setBoundVariable("width", v);
        } catch (e) {
        }
        row.appendChild(spacer);
        const rightDot = figma.createEllipse();
        rightDot.resize(8, 8);
        rightDot.fills = [COLOR_BORDER];
        row.appendChild(rightDot);
        return makeLeftAlignedPreview(row);
      }
      if (v.resolvedType === "FLOAT" && /(^|\/)(radius|corner|rounded)(\/|$)|\b(radius|corner|rounded)\b/i.test(v.name)) {
        const n = resolveNumericValue(raw, modeId);
        const radiusPreview = figma.createRectangle();
        radiusPreview.resize(40, 40);
        radiusPreview.fills = [COLOR_BG_LIGHT];
        try {
          ;
          radiusPreview.setBoundVariable("topLeftRadius", v);
          radiusPreview.setBoundVariable("topRightRadius", v);
          radiusPreview.setBoundVariable("bottomLeftRadius", v);
          radiusPreview.setBoundVariable("bottomRightRadius", v);
        } catch (e) {
          radiusPreview.cornerRadius = Math.max(0, n);
        }
        return makeLeftAlignedPreview(radiusPreview);
      }
      if (v.resolvedType === "FLOAT" && /font[\.\s\-_]*size|\bfontSize\b|(^|[\.\/_-])fs([\.\/_-]|$)/i.test(v.name)) {
        const n = resolveNumericValue(raw, modeId);
        const text = makeText2("Aa", FONT_REGULAR2, Math.max(8, n || 16));
        text.fills = [DARK];
        try {
          text.fontSize = Math.max(8, n || 16);
        } catch (e) {
        }
        try {
          text.setBoundVariable("fontSize", v);
        } catch (e) {
        }
        return makeLeftAlignedPreview(text);
      }
      if (v.resolvedType === "FLOAT" && /line[\.\s\-_]*height|\blineHeight\b|(^|[\.\/_-])lh([\.\/_-]|$)/i.test(v.name)) {
        const n = resolveNumericValue(raw, modeId);
        const text = makeText2("Aa", FONT_REGULAR2, 20);
        text.fills = [DARK];
        try {
          ;
          text.setBoundVariable("lineHeight", v);
        } catch (e) {
          try {
            text.lineHeight = { unit: "PIXELS", value: Math.max(8, n || 24) };
          } catch (ee) {
          }
        }
        return makeLeftAlignedPreview(text);
      }
      if (v.resolvedType === "COLOR") {
        const sw = figma.createRectangle();
        sw.resize(previewWidth, previewHeight);
        sw.cornerRadius = 0;
        const fills = JSON.parse(JSON.stringify(sw.fills));
        try {
          fills[0] = figma.variables.setBoundVariableForPaint(fills[0], "color", v);
          sw.fills = fills;
        } catch (e) {
          if (resolvedRaw && typeof resolvedRaw === "object" && resolvedRaw.r !== void 0) {
            sw.fills = [{ type: "SOLID", color: { r: resolvedRaw.r, g: resolvedRaw.g, b: resolvedRaw.b }, opacity: resolvedRaw.a !== void 0 ? resolvedRaw.a : 1 }];
          }
        }
        if ((!sw.fills || Array.isArray(sw.fills) && sw.fills.length === 0) && resolvedRaw && typeof resolvedRaw === "object" && resolvedRaw.r !== void 0) {
          sw.fills = [{ type: "SOLID", color: { r: resolvedRaw.r, g: resolvedRaw.g, b: resolvedRaw.b }, opacity: resolvedRaw.a !== void 0 ? resolvedRaw.a : 1 }];
        }
        return sw;
      }
      if (v.resolvedType === "BOOLEAN") {
        const chip = figma.createFrame();
        chip.layoutMode = "HORIZONTAL";
        chip.primaryAxisSizingMode = "FIXED";
        chip.counterAxisSizingMode = "FIXED";
        chip.resize(Math.max(100, previewWidth - 32), 36);
        chip.cornerRadius = 18;
        chip.strokes = [COLOR_BORDER];
        chip.strokeWeight = 1;
        chip.fills = raw === true ? [DARK] : [COLOR_WHITE];
        return chip;
      }
      if (v.resolvedType === "FLOAT") {
        if (/font|typography|type|line[\.\s\-_]*height|font[\.\s\-_]*size/i.test(v.name)) {
          const fallbackText = makeText2("Aa", FONT_REGULAR2, 16);
          fallbackText.fills = [DARK];
          return makeLeftAlignedPreview(fallbackText);
        }
        const n = resolveNumericValue(raw, modeId);
        const bar = figma.createRectangle();
        bar.resize(Math.max(8, Math.min(previewWidth, n)), 20);
        bar.cornerRadius = 6;
        bar.fills = [COLOR_BG_LIGHT];
        return bar;
      }
      if (v.resolvedType === "STRING" && /(^|\/)(font|typography|type)(\/|$)|\b(font|typography|type|weight|family)\b/i.test(v.name) || v.resolvedType === "FLOAT" && /(^|[\.\/_-])fw([\.\/_-]|$)|\bfont[\.\s\-_]*weight\b/i.test(v.name)) {
        const sample = makeText2("Aa", FONT_REGULAR2, 28);
        sample.fills = [DARK];
        return makeLeftAlignedPreview(sample);
      }
      const t = makeText2(v.resolvedType || "Value", FONT_REGULAR2, FONT_SIZE);
      return t;
    } catch (e) {
      return null;
    }
  }
  function summarizePaintStyleValue(s) {
    const p = (s.paints || [])[0];
    if (!p) return "\u2014";
    if (p.type === "SOLID" && p.color) {
      try {
        return figmaRGBToHex(p.color);
      } catch (e) {
        return "solid";
      }
    }
    if (String(p.type || "").indexOf("GRADIENT") >= 0) return String(p.type).toLowerCase();
    return String(p.type || "paint");
  }
  function getVariableFromBinding(binding) {
    try {
      if (!binding) return null;
      if (typeof binding === "string") return figma.variables.getVariableById(binding);
      if (Array.isArray(binding)) {
        for (let i = 0; i < binding.length; i++) {
          const found = getVariableFromBinding(binding[i]);
          if (found) return found;
        }
        return null;
      }
      if (typeof binding === "object" && typeof binding.id === "string") {
        return figma.variables.getVariableById(binding.id);
      }
      if (typeof binding === "object" && typeof binding.variableId === "string") {
        return figma.variables.getVariableById(binding.variableId);
      }
      if (typeof binding === "object") {
        const obj = binding;
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
          const found = getVariableFromBinding(obj[keys[i]]);
          if (found) return found;
        }
      }
    } catch (e) {
    }
    return null;
  }
  function getVariablePreferredModeId(v) {
    try {
      const c = figma.variables.getVariableCollectionById(v.variableCollectionId);
      if (c) {
        const anyCollection = c;
        if (typeof anyCollection.defaultModeId === "string" && anyCollection.defaultModeId) {
          return anyCollection.defaultModeId;
        }
        const preferred = getCollectionPrimaryMode(c);
        if (preferred && preferred.modeId) return preferred.modeId;
      }
    } catch (e) {
    }
    const keys = Object.keys(v.valuesByMode || {});
    return keys.length ? keys[0] : "";
  }
  function summarizeBoundEffectProperty(raw, binding, unit, formatter) {
    const valueFormatter = formatter || formatResolvedValue;
    const formattedRaw = valueFormatter(raw);
    const fallback = unit && typeof raw === "number" ? String(raw) + unit : formattedRaw;
    const variable = getVariableFromBinding(binding);
    if (!variable) return { primary: fallback, fallback, hasBinding: false };
    const modeId = getVariablePreferredModeId(variable);
    const variableRaw = (variable.valuesByMode || {})[modeId];
    const resolved = resolveAliasValueForMode(variableRaw, modeId);
    let resolvedText = valueFormatter(resolved);
    if (unit && typeof resolved === "number") resolvedText += unit;
    const ref = makeVariableReference(variable.name);
    return {
      primary: ref,
      fallback: resolvedText && resolvedText !== "\u2014" ? resolvedText : fallback,
      hasBinding: true
    };
  }
  function summarizeEffectStyleValue(s) {
    const e = (s.effects || [])[0];
    if (!e) return "\u2014";
    const bound = e && typeof e === "object" && e.boundVariables && typeof e.boundVariables === "object" ? e.boundVariables : {};
    function boundProp(key) {
      if (!bound) return null;
      if (Object.prototype.hasOwnProperty.call(bound, key)) return bound[key];
      return null;
    }
    function boundNested(parent, key) {
      if (!bound) return null;
      const parentValue = boundProp(parent);
      if (!parentValue || typeof parentValue !== "object") return null;
      if (Object.prototype.hasOwnProperty.call(parentValue, key)) return parentValue[key];
      return null;
    }
    if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
      const ox = Math.round(e.offset && e.offset.x || 0);
      const oy = Math.round(e.offset && e.offset.y || 0);
      const blur = Math.round(e.radius || 0);
      const spread = Math.round(e.spread || 0);
      const color = e.color && typeof e.color === "object" ? e.color : null;
      const xPart = summarizeBoundEffectProperty(ox, boundProp("offsetX") || boundNested("offset", "x"), "px");
      const yPart = summarizeBoundEffectProperty(oy, boundProp("offsetY") || boundNested("offset", "y"), "px");
      const blurPart = summarizeBoundEffectProperty(blur, boundProp("radius") || boundProp("blur"), "px");
      const spreadPart = summarizeBoundEffectProperty(spread, boundProp("spread"), "px");
      const colorPart = summarizeBoundEffectProperty(color, boundProp("color"), "", (v) => {
        if (v && typeof v === "object" && v.r !== void 0 && v.g !== void 0 && v.b !== void 0) {
          try {
            return figmaRGBToHex(v);
          } catch (e2) {
            return "color";
          }
        }
        return formatResolvedValue(v);
      });
      const hasBindings = xPart.hasBinding || yPart.hasBinding || blurPart.hasBinding || spreadPart.hasBinding || colorPart.hasBinding;
      if (!hasBindings) return `${e.type.toLowerCase()}: ${ox}px ${oy}px ${blur}px ${spread}px ${colorPart.fallback}`;
      const primary = `${e.type.toLowerCase()}: x ${xPart.primary}, y ${yPart.primary}, blur ${blurPart.primary}, spread ${spreadPart.primary}, color ${colorPart.primary}`;
      const fallback = `x ${xPart.fallback}, y ${yPart.fallback}, blur ${blurPart.fallback}, spread ${spreadPart.fallback}, color ${colorPart.fallback}`;
      return `${primary} (${fallback})`;
    }
    if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
      const blur = Math.round(e.radius || 0);
      const blurPart = summarizeBoundEffectProperty(blur, boundProp("radius") || boundProp("blur"), "px");
      if (!blurPart.hasBinding) return `${e.type.toLowerCase()}: ${blurPart.fallback}`;
      return `${e.type.toLowerCase()}: ${blurPart.primary} (${blurPart.fallback})`;
    }
    return String(e.type || "effect").toLowerCase();
  }
  function summarizeTextStyleValue(s) {
    const ts = s;
    const bound = ts && typeof ts === "object" && ts.boundVariables && typeof ts.boundVariables === "object" ? ts.boundVariables : {};
    function getBoundByPath(path) {
      if (!bound || !path) return null;
      const parts = path.split(".");
      let current = bound;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current || typeof current !== "object") return null;
        if (!Object.prototype.hasOwnProperty.call(current, part)) return null;
        current = current[part];
      }
      return current;
    }
    function boundProp(paths) {
      if (!bound) return null;
      for (let i = 0; i < paths.length; i++) {
        const v = getBoundByPath(paths[i]);
        if (v) return v;
      }
      return null;
    }
    function formatFontFamily(v) {
      if (!v) return "\u2014";
      if (typeof v === "string") return v;
      if (typeof v === "object" && typeof v.family === "string") return v.family;
      return formatResolvedValue(v);
    }
    function formatFontStyle(v) {
      if (!v) return "\u2014";
      if (typeof v === "string") return v;
      if (typeof v === "object" && typeof v.style === "string") return v.style;
      return formatResolvedValue(v);
    }
    function formatSizePx(v) {
      if (typeof v === "number") {
        const rounded = Math.round(v * 100) / 100;
        return `${String(rounded)}px`;
      }
      return formatResolvedValue(v);
    }
    function formatDimension(v) {
      if (v === null || v === void 0) return "\u2014";
      if (typeof v === "number") {
        const rounded = Math.round(v * 100) / 100;
        return `${String(rounded)}px`;
      }
      if (typeof v === "object") {
        const unit = String(v.unit || "").toUpperCase();
        const value = v.value;
        if (unit === "AUTO") return "auto";
        if (typeof value === "number") {
          const rounded = Math.round(value * 100) / 100;
          if (unit === "PIXELS") return `${rounded}px`;
          if (unit === "PERCENT") return `${rounded}%`;
          return `${rounded}${unit ? " " + unit.toLowerCase() : ""}`.trim();
        }
      }
      return formatResolvedValue(v);
    }
    function toLine(label, part) {
      if (part.hasBinding) return `${label}: ${part.primary} (${part.fallback})`;
      return `${label}: ${part.fallback}`;
    }
    const fontName = ts.fontName && typeof ts.fontName === "object" ? ts.fontName : null;
    const familyPart = summarizeBoundEffectProperty(
      fontName ? { family: fontName.family } : null,
      boundProp(["fontFamily", "fontName.family", "fontName"]),
      "",
      formatFontFamily
    );
    const stylePart = summarizeBoundEffectProperty(
      fontName ? { style: fontName.style } : null,
      boundProp(["fontStyle", "fontName.style", "fontName"]),
      "",
      formatFontStyle
    );
    const sizePart = summarizeBoundEffectProperty(ts.fontSize, boundProp(["fontSize", "typography.fontSize"]), "px", formatSizePx);
    const lineHeightPart = summarizeBoundEffectProperty(ts.lineHeight, boundProp(["lineHeight", "lineHeight.value", "typography.lineHeight"]), "", formatDimension);
    const letterSpacingPart = summarizeBoundEffectProperty(ts.letterSpacing, boundProp(["letterSpacing", "letterSpacing.value", "typography.letterSpacing"]), "", formatDimension);
    const lines = [
      toLine("fontFamily", familyPart),
      toLine("fontWeight", stylePart),
      toLine("fontSize", sizePart),
      toLine("lineHeight", lineHeightPart),
      toLine("letterSpacing", letterSpacingPart)
    ];
    return lines.join("\n");
  }
  function summarizeLayoutStyleValue(s) {
    const grids = s.layoutGrids || [];
    if (!grids.length) return "\u2014";
    const g = grids[0];
    const pattern = g.pattern || "GRID";
    const count2 = g.count !== void 0 ? g.count : "-";
    const gutter = g.gutterSize !== void 0 ? g.gutterSize : "-";
    return `${String(pattern).toLowerCase()} \u2022 count ${count2} \u2022 gutter ${gutter}`;
  }
  function makeStylePreview(styleId, kind) {
    try {
      const previewWidth = PREVIEW_COLUMN_WIDTH;
      const previewHeight = TOKEN_ROW_HEIGHT;
      if (kind === "paint") {
        const r2 = figma.createRectangle();
        r2.resize(previewWidth, previewHeight);
        r2.cornerRadius = 0;
        r2.fillStyleId = styleId;
        return r2;
      }
      if (kind === "effect") {
        const wrap = figma.createFrame();
        wrap.name = "effect-style-preview-wrap";
        wrap.layoutMode = "HORIZONTAL";
        wrap.primaryAxisSizingMode = "FIXED";
        wrap.counterAxisSizingMode = "FIXED";
        wrap.resize(previewWidth, previewHeight);
        wrap.itemSpacing = 0;
        wrap.paddingLeft = 24;
        wrap.paddingRight = 0;
        wrap.paddingTop = 0;
        wrap.paddingBottom = 0;
        wrap.counterAxisAlignItems = "CENTER";
        wrap.primaryAxisAlignItems = "MIN";
        wrap.fills = [];
        const r2 = figma.createRectangle();
        r2.resize(40, 40);
        r2.cornerRadius = 16;
        r2.fills = [COLOR_WHITE];
        r2.effectStyleId = styleId;
        wrap.appendChild(r2);
        return wrap;
      }
      if (kind === "text") {
        const wrap = createAutolayout("text-style-preview-wrap", "HORIZONTAL", 0, 24, 0, "FIXED", "HUG");
        wrap.resizeWithoutConstraints(previewWidth, 1);
        wrap.counterAxisAlignItems = "MIN";
        wrap.primaryAxisAlignItems = "MIN";
        const t = makeText2("The quick brown fox", FONT_REGULAR2, 24);
        try {
          ;
          t.textStyleId = styleId;
        } catch (e) {
        }
        t.fills = [DARK];
        t.resizeWithoutConstraints(Math.max(80, previewWidth - 48), t.height);
        wrap.appendChild(t);
        return wrap;
      }
      const r = figma.createRectangle();
      r.resize(previewWidth, previewHeight);
      r.cornerRadius = 0;
      r.fills = [COLOR_BG_LIGHT];
      return r;
    } catch (e) {
      return null;
    }
  }
  async function writeVariables(onProgress) {
    await ensureTokenFontsLoaded();
    for (const c of activeCollections) {
      if (onProgress) onProgress("Collection: " + c.name);
      const allCollectionVariables = c.variableIds.map((id) => figma.variables.getVariableById(id)).filter(Boolean);
      const hasGroupConfig = Object.prototype.hasOwnProperty.call(activeCollectionGroupsById, c.id);
      const selectedGroups = hasGroupConfig ? activeCollectionGroupsById[c.id] || [] : ["*"];
      const allowAllGroups = selectedGroups.indexOf("*") !== -1;
      const selectedPrefixes = selectedGroups.filter((g) => g && g !== "*");
      let variables = allowAllGroups ? allCollectionVariables : allCollectionVariables.filter((v) => {
        const groupPath = getVariableGroupPath(v.name);
        if (!groupPath) return false;
        for (const prefix of selectedPrefixes) {
          if (groupPath === prefix || groupPath.indexOf(prefix + "/") === 0) return true;
        }
        return false;
      });
      if (!allowAllGroups && !variables.length && selectedPrefixes.length) {
        const lowerPrefixes = selectedPrefixes.map((p) => p.toLowerCase());
        variables = allCollectionVariables.filter((v) => {
          const name = (v.name || "").toLowerCase();
          for (const prefix of lowerPrefixes) {
            if (!prefix) continue;
            if (name === prefix) return true;
            if (name.indexOf(prefix + "/") === 0) return true;
            if (name.indexOf("/" + prefix + "/") !== -1) return true;
            if (name.indexOf("." + prefix + ".") !== -1) return true;
          }
          return false;
        });
      }
      if (!variables.length && allCollectionVariables.length && !allowAllGroups) {
        figma.ui.postMessage({ type: "tokens-status", text: "No tokens matched selected groups in collection: " + c.name });
      }
      if (!variables.length) continue;
      const mode = getCollectionPrimaryMode(c);
      const grouped = groupByTokenPath(variables, (v) => v.name);
      variablesFrame.appendChild(createTokenGroupTitle(c.name));
      for (let gi = 0; gi < grouped.length; gi++) {
        const group = grouped[gi];
        const normalizedPath = normalizeGroupPathForCollection(group.path, c.name);
        const subgroupLabel = getLeafGroupLabel(normalizedPath);
        const subgroupDisplay = getParentAndLeafGroupLabel(normalizedPath);
        variablesFrame.appendChild(createTokenSubgroupTitle(subgroupDisplay));
        const section = createTokenTableSection("Variables - " + c.name + "-" + subgroupLabel);
        variablesFrame.appendChild(section);
        section.appendChild(createTokenHeaderRow(subgroupDisplay));
        for (let i = 0; i < group.items.length; i++) {
          const v = group.items[i];
          if (onProgress) onProgress("Variable: " + v.name);
          try {
            const valueText = formatVariableCellValue(v, mode.modeId);
            const preview = makeVariablePreview(v, mode.modeId);
            appendTokenRow(
              section,
              "variable-row-" + v.id,
              preview,
              sanitizeName(getLeafTokenName(v.name)),
              valueText,
              v.description || "no description",
              i === group.items.length - 1
            );
            count++;
          } catch (e) {
            skippedVariableRows.push(v.name);
            const details = e && e.message ? e.message : String(e);
            figma.ui.postMessage({ type: "tokens-status", text: "Skipped variable due to render error: " + v.name + " (" + details + ")" });
            console.error("Token row render failed for variable", v.name, e);
          }
        }
      }
    }
  }
  async function writeStyles(onProgress) {
    await ensureTokenFontsLoaded();
    function resolveTextStyleSizeForSort(style) {
      try {
        const ts = style;
        if (typeof ts.fontSize === "number" && isFinite(ts.fontSize)) return ts.fontSize;
        const bound = ts && typeof ts === "object" && ts.boundVariables && typeof ts.boundVariables === "object" ? ts.boundVariables : null;
        const binding = bound && Object.prototype.hasOwnProperty.call(bound, "fontSize") ? bound.fontSize : null;
        const variable = getVariableFromBinding(binding);
        if (variable) {
          const modeId = getVariablePreferredModeId(variable);
          const raw = (variable.valuesByMode || {})[modeId];
          const resolved = resolveAliasValueForMode(raw, modeId);
          if (typeof resolved === "number" && isFinite(resolved)) return resolved;
          const parsed = parseFloat(String(resolved != null ? resolved : ""));
          if (isFinite(parsed)) return parsed;
        }
      } catch (e) {
      }
      return 0;
    }
    function compareTextStylesBySizeDesc(a, b) {
      const aSize = resolveTextStyleSizeForSort(a);
      const bSize = resolveTextStyleSizeForSort(b);
      if (bSize !== aSize) return bSize - aSize;
      return naturalSort(a.name, b.name);
    }
    function writeStyleSection(sectionTitle, styles, previewFactory, valueFactory, sortWithinGroup, sortGroups) {
      if (!styles.length) return;
      stylesFrame.appendChild(createTokenGroupTitle(sectionTitle));
      const grouped = groupByTokenPath(styles, (s) => s.name);
      const orderedGroups = sortGroups ? grouped.slice().sort(sortGroups) : grouped;
      for (let gi = 0; gi < orderedGroups.length; gi++) {
        const group = orderedGroups[gi];
        const items = sortWithinGroup ? group.items.slice().sort(sortWithinGroup) : group.items;
        const subgroupLabel = getLeafGroupLabel(group.path);
        const subgroupDisplay = getParentAndLeafGroupLabel(group.path);
        stylesFrame.appendChild(createTokenSubgroupTitle(subgroupDisplay));
        const section = createTokenTableSection(sectionTitle + "-" + subgroupLabel);
        stylesFrame.appendChild(section);
        section.appendChild(createTokenHeaderRow(subgroupDisplay));
        for (let i = 0; i < items.length; i++) {
          const s = items[i];
          if (onProgress) onProgress(sectionTitle + ": " + s.name);
          try {
            appendTokenRow(
              section,
              sectionTitle + "-row-" + s.id,
              previewFactory(s),
              sanitizeName(getLeafTokenName(s.name)),
              valueFactory(s),
              s.description || "no description",
              i === items.length - 1
            );
            count++;
          } catch (e) {
            skippedStyleRows.push(sectionTitle + "/" + s.name);
            const details = e && e.message ? e.message : String(e);
            figma.ui.postMessage({ type: "tokens-status", text: "Skipped style due to render error: " + s.name + " (" + details + ")" });
            console.error("Token row render failed for style", sectionTitle, s.name, e);
          }
        }
      }
    }
    const paintStyles = figma.getLocalPaintStyles().filter((s) => activeColorStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    writeStyleSection("Color", paintStyles, (s) => makeStylePreview(s.id, "paint"), summarizePaintStyleValue);
    const effectStyles = figma.getLocalEffectStyles().filter((s) => activeEffectStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    writeStyleSection("Effects", effectStyles, (s) => makeStylePreview(s.id, "effect"), summarizeEffectStyleValue);
    const textStyles = figma.getLocalTextStyles().filter((s) => activeTextStyleIds.indexOf(s.id) !== -1).sort((a, b) => compareTextStylesBySizeDesc(a, b));
    writeStyleSection(
      "Text",
      textStyles,
      (s) => makeStylePreview(s.id, "text"),
      summarizeTextStyleValue,
      compareTextStylesBySizeDesc,
      (a, b) => {
        const maxA = a.items.reduce((m, s) => Math.max(m, resolveTextStyleSizeForSort(s)), 0);
        const maxB = b.items.reduce((m, s) => Math.max(m, resolveTextStyleSizeForSort(s)), 0);
        if (maxB !== maxA) return maxB - maxA;
        return naturalSort(a.path, b.path);
      }
    );
    const layoutStyles = figma.getLocalGridStyles().filter((s) => activeLayoutStyleIds.indexOf(s.id) !== -1).sort((a, b) => naturalSort(a.name, b.name));
    writeStyleSection("Layout", layoutStyles, (s) => makeStylePreview(s.id, "layout"), summarizeLayoutStyleValue);
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
    if (sizingY !== "FILL") autolayout.layoutSizingVertical = sizingY;
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
    } else if (skippedVariableRows.length || skippedStyleRows.length) {
      var skippedVarSample = skippedVariableRows.slice(0, 3);
      var skippedStyleSample = skippedStyleRows.slice(0, 3);
      var skippedDetails = [];
      if (skippedVarSample.length) skippedDetails.push("variables: " + skippedVarSample.join(", "));
      if (skippedStyleSample.length) skippedDetails.push("styles: " + skippedStyleSample.join(", "));
      text = "No rows rendered. Skipped " + (skippedVariableRows.length + skippedStyleRows.length) + " items (" + skippedDetails.join(" | ") + ")";
    } else text = IDLE_MSGS[Math.floor(Math.random() * IDLE_MSGS.length)];
    notify(text);
    try {
      figma.ui.postMessage({ type: "tokens-status", text });
      figma.ui.postMessage({ type: "tokens-resync-state", available: !!getSelectedTokensDocFrame() });
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

  // src/main.ts
  var command = figma.command || "";
  if (command === "create-autolayout") {
    handleCreateAutoLayout();
    figma.closePlugin();
  } else {
    tokenResyncStateAtOpen = getTokensResyncState();
    initialTab = command === "variables" || command === "rewrite" || tokenResyncStateAtOpen.available ? "tokens" : "component";
    isTokens = initialTab === "tokens";
    figma.showUI(__html__, { width: isTokens ? 320 : 320, height: isTokens ? 460 : 460 });
    registerSpecSelectionTracking();
    figma.on("selectionchange", function() {
      var state = getTokensResyncState();
      if (state.available) {
        figma.ui.postMessage({ type: "set-tab", tab: "tokens" });
      }
      figma.ui.postMessage(getTokensInitData());
      figma.ui.postMessage({ type: "tokens-resync-state", available: state.available });
    });
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
        handleTokensResync(msg);
        return;
      }
      handleSpecMessage(msg);
    };
  }
  var tokenResyncStateAtOpen;
  var initialTab;
  var isTokens;
})();
