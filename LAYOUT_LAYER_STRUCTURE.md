# Layout and Spacing - Layer Structure

## Improved Layer Naming Convention

Every layer now has a descriptive name that explains its purpose. Here's the complete hierarchy:

### Top Level

```
Specs-Layout and spacing
  ├─ Specs-Layout Section Title
  └─ Specs-Layout Content [Two-Column]
      ├─ Specs-Layout Column [ComponentName]
      │   ├─ Specs-Preview Panel [ComponentName]
      │   │   ├─ ComponentName (cloned instance)
      │   │   ├─ Padding-Top-16px [Overlay]
      │   │   ├─ Padding-Top-16px [Label]
      │   │   ├─ Padding-Right-8px [Overlay]
      │   │   ├─ Padding-Right-8px [Label]
      │   │   ├─ Padding-Bottom-16px [Overlay]
      │   │   ├─ Padding-Bottom-16px [Label]
      │   │   ├─ Padding-Left-8px [Overlay]
      │   │   ├─ Padding-Left-8px [Label]
      │   │   ├─ Item-Spacing-Gap-8px [Overlay]
      │   │   └─ Item-Spacing-Gap-8px [Label]
      │   ├─ Specs-Node Label [ComponentName]
      │   ├─ Specs-Direction [Horizontal]
      │   ├─ Specs-Alignment [Min / Center]
      │   ├─ Specs-Vertical Resizing [Hug]
      │   ├─ Specs-Horizontal Resizing [Fill]
      │   ├─ Specs-Item Spacing [8px]
      │   └─ Specs-Padding [T16 R8 B16 L8]
      │
      └─ Specs-Layout Column [NestedFrameName]
          ├─ Specs-Preview Panel [NestedFrameName]
          │   ├─ NestedFrameName (cloned instance)
          │   ├─ Padding annotations...
          │   └─ Gap annotations...
          ├─ Specs-Node Label [NestedFrameName]
          ├─ Specs-Direction [Vertical]
          ├─ Specs-Alignment [Top left]
          ├─ Specs-Vertical Resizing [Fixed]
          ├─ Specs-Horizontal Resizing [Fill]
          ├─ Specs-Item Spacing [4px]
          └─ Specs-Padding [T12 R12 B12 L12]
```

## Naming Conventions

### Padding Overlays

- **Pattern**: `Padding-{Side}-{Value}px [Overlay]`
- **Examples**:
  - `Padding-Top-16px [Overlay]`
  - `Padding-Right-8px [Overlay]`
  - `Padding-Bottom-16px [Overlay]`
  - `Padding-Left-8px [Overlay]`

### Padding Labels

- **Pattern**: `Padding-{Side}-{Value}px [Label]`
- **Purpose**: Text labels showing the padding value
- **Examples**: `Padding-Top-16px [Label]`

### Item Spacing (Gap)

- **Pattern**: `Item-Spacing-Gap-{Value}px [Overlay]` and `[Label]`
- **Examples**:
  - `Item-Spacing-Gap-8px [Overlay]` (colored rectangle)
  - `Item-Spacing-Gap-8px [Label]` (text showing value)

### Column Frames

- **Pattern**: `Specs-Layout Column [NodeName]`
- **Purpose**: Contains the preview panel and property list for each node
- **Examples**:
  - `Specs-Layout Column [ESDSV Alert]`
  - `Specs-Layout Column [Container]`

### Preview Panels

- **Pattern**: `Specs-Preview Panel [NodeName]`
- **Purpose**: Contains the cloned component with visual annotations
- **Examples**: `Specs-Preview Panel [ESDSV Alert]`

### Property Labels

All property text labels follow the pattern:

- `Specs-Direction [Horizontal]`
- `Specs-Alignment [Min / Center]`
- `Specs-Vertical Resizing [Hug]`
- `Specs-Horizontal Resizing [Fill]`
- `Specs-Item Spacing [8px]`
- `Specs-Padding [T16 R8 B16 L8]`

The value in brackets shows the actual value for quick reference in the layers panel.

## Benefits of This Structure

1. **Self-documenting**: Every layer name explains its purpose
2. **Easy filtering**: Search for "Padding" to find all padding annotations
3. **Quick scanning**: Values are shown in brackets for at-a-glance reading
4. **Clear hierarchy**: Related elements are grouped by purpose
5. **Debugging friendly**: When something looks wrong, the layer name tells you what it's supposed to be
