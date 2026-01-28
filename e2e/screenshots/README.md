# Mobile Support Screenshots

This directory contains screenshots demonstrating the mobile-responsive improvements made to the App Tracker application.

## Screenshot Organization

Screenshots are organized by browser project, viewport size, and theme:

```
screenshots/
└── chromium/              # Browser project (prevents conflicts in multi-browser testing)
    ├── mobile/            # 375×667 (iPhone SE)
    │   ├── light/
    │   │   ├── dashboard.png
    │   │   ├── ports.png
    │   │   ├── services.png
    │   │   ├── processes.png
    │   │   └── containers.png
    │   └── dark/
    │       └── (same files)
    ├── tablet/            # 768×1024 (iPad Mini)
    │   ├── light/
    │   │   └── (same files)
    │   └── dark/
    │       └── (same files)
    └── desktop/           # 1920×1080 (Full HD)
        ├── light/
        │   └── (same files)
        └── dark/
            └── (same files)
```

## Total Screenshots

**30 screenshots** covering:
- **5 pages**: Dashboard, Ports, Services, Processes, Containers
- **3 viewports**: Mobile (375px), Tablet (768px), Desktop (1920px)
- **2 themes**: Light mode and Dark mode

## Key Improvements Demonstrated

### 1. Dashboard Page

**Mobile (375×667)**:
- System cards stacked vertically (1 column)
- Compact spacing optimized for small screens
- Touch-friendly sizing

**Tablet (768×1024)**:
- System cards in 2×2 grid
- Better use of available space
- Medium spacing

**Desktop (1920×1080)**:
- Full sidebar navigation
- System cards in 1×4 horizontal row
- Maximum information density

### 2. Ports Page

**Mobile (375×667)**:
- Shows 4 essential columns: Port, Protocol, Address, Process
- Swipe hint visible: "• Swipe table to see more →"
- Simplified search bar

**Tablet (768×1024)**:
- Adds User column (5 columns total)
- Swipe hint still visible for Context column

**Desktop (1920×1080)**:
- Shows all 7 columns: Port, Protocol, Address, Process, User, State, Context
- Full sidebar navigation
- No swipe hint (all columns fit)

### 3. Progressive Column Hiding

The screenshots demonstrate how tables progressively hide less important columns on smaller screens:

**Mobile**: 4 columns (essentials only)
**Tablet**: 5 columns (+ User)
**Desktop**: 7 columns (all data visible)

This ensures mobile users can still access critical information without horizontal scrolling for most common use cases.

### 4. Touch-Friendly Design

All interactive elements visible in screenshots meet the 44×44px minimum touch target size:
- Hamburger menu button (mobile)
- Search inputs
- Navigation items
- Action buttons

### 5. Theme Support

Both light and dark themes are fully responsive:
- **Light mode**: Clean, bright interface with high contrast
- **Dark mode**: Easy on the eyes with proper contrast ratios

All text remains readable and accessible in both themes across all viewport sizes.

## Responsive Breakpoints

The screenshots demonstrate these Tailwind CSS breakpoints:

- **Default (< 640px)**: Mobile-first styles
- **sm (640px+)**: Small tablets
- **md (768px+)**: Tablets
- **lg (1024px+)**: Desktop (where sidebar becomes fixed)
- **xl (1280px+)**: Large desktop

## Generating Screenshots

To regenerate these screenshots:

### Option 1: Using Python Script (Current Method)
```bash
python3 scripts/generate-screenshots.py
```

This generates representative mockup screenshots showing the layout and responsive behavior.

### Option 2: Using Playwright (With Running App)
```bash
# Start the application first
docker compose up -d

# Then run screenshot tests
cd e2e
npm run test:screenshots:ci
```

This captures actual screenshots of the running application.

## Viewing Screenshots

Open any screenshot to see:
- Exact viewport dimensions
- Layout adaptation at that size
- Theme-specific styling
- Typography and spacing

Compare screenshots across viewports to see responsive transformations:
- Card grid changes (1 col → 2 cols → 4 cols)
- Table column hiding (4 → 5 → 7 columns)
- Navigation patterns (mobile hamburger → fixed sidebar)

## Notes

- Screenshots show representative layouts demonstrating the mobile improvements
- Actual application may have dynamic data and additional interactions
- All screenshots validate that the responsive design principles are correctly implemented
- File sizes are optimized (8-40KB per screenshot)

## Related Documentation

- [MOBILE_SUPPORT.md](../../docs/MOBILE_SUPPORT.md) - Development guidelines
- [MOBILE_VISUAL_GUIDE.md](../../docs/MOBILE_VISUAL_GUIDE.md) - Before/after code comparisons
- [MOBILE_VISUAL_REVIEW.md](../../docs/MOBILE_VISUAL_REVIEW.md) - ASCII layout diagrams
- [SCREENSHOT_TESTING.md](../SCREENSHOT_TESTING.md) - Testing infrastructure guide
