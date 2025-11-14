<!-- c86e8634-fe72-4460-8aea-712bad92eb11 19807ebd-00fb-432e-8cf3-14b0c02bb890 -->

# Minimalist Header Design Options

## Current State Analysis

- AppHeader exists but may not be fully integrated
- WheelPage has WheelHeader with search, Premium Printer button, and Journal navigation
- JournalPage has its own header with search and New Entry button
- Both pages have similar search functionality but different actions
- Need unified navigation and shared services

## Three Minimalist Header Options

### Option 1: Unified Tab Navigation with Contextual Actions

**Design**: Single global header with tab-style navigation (Wheel | Journal) and contextual action buttons that change based on active page.

**Layout**:

```
[Logo] [Wheel | Journal] [Search Bar] [Page-Specific Action Button]
```

**Features**:

- Tab-style navigation (Wheel/Journal) with active state indicator
- Centered search bar (works for both ticker search and journal entry search)
- Right-side action button changes contextually:
  - Wheel page: "Premium Printer" button
  - Journal page: "New Entry" button
- Minimal height (~48px), sticky positioning
- Dark theme with gold accents matching current design

**Pros**:

- Single header component, no duplication
- Clear navigation between pages
- Contextual actions reduce clutter
- Search works universally

**Cons**:

- Action button changes per page (might be confusing)
- Less space for page-specific tools

### Option 2: Icon-Based Minimal Navigation Bar

**Design**: Ultra-minimal icon-based navigation with tooltips

**Layout**:

```
[Logo] [🔍] [⚙️] [📊] [➕]
```

**Features**:

- Icon-only navigation (hover tooltips show "Wheel", "Journal", etc.)
- Search icon opens search modal/overlay
- Settings icon for preferences
- Chart icon for analytics
- Plus icon for quick actions (contextual)
- Minimal height (~40px), floating style
- Dark theme with subtle glow effects

**Pros**:

- Maximum space efficiency
- Modern, clean aesthetic
- Scalable for future features

**Cons**:

- Less discoverable (requires hover)
- May need tooltips for clarity
- Icons need to be intuitive

### Option 3: Compact Sidebar Navigation

**Design**: Minimal left sidebar with main content area

**Layout**:

```
[Logo]
[Wheel]
[Journal]
---
[Search]
```

**Features**:

- Collapsible sidebar (~60px when collapsed, ~200px when expanded)
- Logo at top
- Navigation links below
- Search bar at bottom
- Main content area uses remaining space
- Sidebar can be toggled with hamburger menu

**Pros**:

- More space for content
- Clear navigation structure
- Can expand for more features

**Cons**:

- Takes horizontal space
- May need responsive handling for mobile

## Implementation Considerations

- Create shared header component that both pages use
- Move search logic to shared store or context
- Contextual action buttons based on current route
- Maintain existing search functionality for both pages
- Ensure header works with WheelContainer background
- Preserve existing E2E test selectors
- **Ensure Wendy's dumpster logo PNG image fits inside the header**
  - Logo should be properly sized to fit within header height constraints
  - Maintain aspect ratio while ensuring it doesn't overflow
  - Consider max-height constraints (e.g., ~40-48px for minimal header)
  - Logo should be responsive and scale appropriately
  - May need to adjust logo dimensions or use CSS object-fit properties
  - Current logo path: `/branding/wheel-to-tendies.png` (may need to verify actual dumpster logo path)
