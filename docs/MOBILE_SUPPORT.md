# Mobile Support Guidelines

## Overview

App Tracker is designed to be fully responsive and provide a polished mobile experience. This document outlines our mobile support strategy, design patterns, and implementation guidelines.

## Design Philosophy

Our mobile support follows these core principles:

1. **Mobile-First Approach**: Design for mobile, enhance for desktop
2. **Touch-Friendly**: All interactive elements meet minimum touch target sizes
3. **Performance**: Optimized loading and rendering for mobile networks
4. **Progressive Enhancement**: Core functionality works on all devices
5. **Consistent Experience**: Same features available across all screen sizes

## Supported Devices

### Primary Support
- **Mobile Phones**: 375px - 767px width (iPhone SE, modern Android phones)
- **Tablets**: 768px - 1023px width (iPad, Android tablets)
- **Desktop**: 1024px+ width (laptops, monitors)

### Test Devices
- iPhone SE (375×667) - Minimum mobile width
- iPad Mini (768×1024) - Minimum tablet width
- Desktop Full HD (1920×1080) - Standard desktop

## Responsive Breakpoints

Using Tailwind CSS breakpoints:

```css
/* Mobile First - Default (no prefix) */
/* Applies to all screen sizes */

/* Small devices and up - 640px */
sm: @media (min-width: 640px)

/* Medium devices and up - 768px */
md: @media (min-width: 768px)

/* Large devices and up - 1024px */
lg: @media (min-width: 1024px)

/* Extra large devices and up - 1280px */
xl: @media (min-width: 1280px)

/* 2XL devices and up - 1536px */
2xl: @media (min-width: 1536px)
```

## Layout Patterns

### Navigation

#### Mobile (< 1024px)
- Hamburger menu button in header
- Slide-out sidebar overlay
- Full-width navigation items
- Close button in sidebar

#### Desktop (≥ 1024px)
- Fixed sidebar (256px width)
- Always visible navigation
- Collapsed icons option (future)

**Implementation:**
```tsx
// Mobile sidebar - hidden by default, shown on toggle
<div className="lg:hidden">
  <Sidebar open={isOpen} onClose={() => setOpen(false)} />
</div>

// Desktop sidebar - always visible
<div className="hidden lg:block lg:fixed lg:w-64">
  <Sidebar />
</div>
```

### Grid Layouts

Use responsive grid patterns:

```tsx
// 1 column on mobile, 2 on tablet, 4 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// 1 column on mobile, 2 on desktop
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

// Cards: 1 on mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Tables

#### Mobile Strategy
Tables present a challenge on mobile. We use horizontal scrolling:

```tsx
<div className="card overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      {/* Table content */}
    </table>
  </div>
</div>
```

**Future Enhancement**: Card-based view for mobile
```tsx
// Show table on desktop, cards on mobile
<div className="hidden md:block">
  <Table />
</div>
<div className="md:hidden">
  <CardList />
</div>
```

### Forms & Inputs

```tsx
// Full width on mobile, constrained on desktop
<input className="input w-full md:max-w-md" />

// Search with responsive width
<div className="relative flex-1 min-w-[200px] max-w-md">
  <input className="input pl-9 w-full" />
</div>
```

### Spacing

Use responsive padding and margins:

```tsx
// Increase padding on larger screens
<main className="p-4 sm:p-6 lg:p-8">

// Responsive gaps
<div className="space-y-4 md:space-y-6">
```

## Component Guidelines

### Buttons

**Minimum Touch Target**: 44×44px (iOS Human Interface Guidelines)

```tsx
// Standard button with adequate padding
<button className="btn-primary px-4 py-2 min-h-[44px]">

// Icon button with touch-friendly size
<button className="p-2 min-w-[44px] min-h-[44px]">
```

### Cards

```tsx
// Responsive card with proper padding
<div className="card p-4 md:p-6">
  <h3 className="text-lg md:text-xl font-bold">
  <p className="text-sm md:text-base">
</div>
```

### Typography

```tsx
// Responsive headings
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Responsive body text
<p className="text-sm md:text-base">

// Constrain line length for readability
<p className="max-w-prose">
```

### Images & Icons

```tsx
// Responsive icon sizes
<Icon className="w-5 h-5 md:w-6 md:h-6" />

// Responsive image
<img className="w-full md:w-auto md:max-w-lg" />
```

## Mobile-Specific Features

### Touch Gestures

- **Tap**: Primary interaction (equivalent to click)
- **Swipe**: Dismiss sidebars, scroll content
- **Pinch**: Zoom (browser default, we don't prevent)
- **Long Press**: Future - show context menu

### Mobile Navigation

```tsx
// Keyboard shortcut hints - hide on mobile
<span className="hidden md:inline-block">
  Press / to search
</span>

// Mobile menu button
<button className="lg:hidden" onClick={toggleMenu}>
  <Menu className="w-6 h-6" />
</button>
```

### Performance Optimizations

```tsx
// Lazy load charts on mobile
const shouldLoadChart = useMediaQuery('(min-width: 768px)');

{shouldLoadChart && <Chart data={data} />}
```

## Testing Checklist

### Manual Testing

Test on actual devices when possible:
- [ ] iPhone (Safari)
- [ ] Android phone (Chrome)
- [ ] iPad (Safari)
- [ ] Android tablet (Chrome)

### Responsive Testing Tools

1. **Browser DevTools**
   - Chrome DevTools responsive mode
   - Firefox Responsive Design Mode
   - Safari Responsive Design Mode

2. **Playwright Tests**
   - Automated screenshot tests
   - Multiple viewport testing
   - Touch interaction simulation

### Test Scenarios

- [ ] Navigation menu opens/closes
- [ ] All pages load correctly
- [ ] Tables scroll horizontally
- [ ] Forms are usable
- [ ] Buttons are tap-friendly
- [ ] No horizontal overflow
- [ ] Text is readable without zoom
- [ ] Theme toggle works
- [ ] Search functionality works
- [ ] Charts render appropriately

## Common Issues & Solutions

### Issue: Horizontal Scroll on Mobile

**Cause**: Fixed width elements wider than viewport

**Solution**:
```tsx
// Before
<div className="w-[500px]">

// After
<div className="w-full max-w-[500px]">
```

### Issue: Text Too Small

**Cause**: Fixed font sizes

**Solution**:
```tsx
// Before
<p className="text-xs">

// After
<p className="text-sm md:text-base">
```

### Issue: Buttons Too Small to Tap

**Cause**: Insufficient padding

**Solution**:
```tsx
// Before
<button className="p-1">

// After
<button className="p-2 min-w-[44px] min-h-[44px]">
```

### Issue: Table Cuts Off Content

**Cause**: No overflow handling

**Solution**:
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full">
```

### Issue: Sidebar Doesn't Close

**Cause**: Missing overlay or close handler

**Solution**:
```tsx
{/* Backdrop to close sidebar */}
{isOpen && (
  <div 
    className="fixed inset-0 bg-black/50"
    onClick={onClose}
  />
)}
```

## Best Practices

### Do's ✅

- Use mobile-first approach
- Test on real devices
- Use relative units (%, rem, em)
- Provide adequate touch targets (44×44px minimum)
- Use responsive images
- Implement proper overflow handling
- Test both portrait and landscape
- Support both light and dark themes
- Use semantic HTML
- Test with slow network conditions

### Don'ts ❌

- Don't use fixed pixel widths
- Don't assume mouse interactions
- Don't hide critical features on mobile
- Don't use hover-only interactions
- Don't use small touch targets (<44px)
- Don't ignore viewport meta tag
- Don't forget to test on real devices
- Don't use mobile-unfriendly date pickers
- Don't display too much data at once
- Don't forget loading states

## Accessibility on Mobile

- Ensure minimum touch target sizes (44×44px)
- Provide sufficient color contrast
- Support system font size preferences
- Ensure form labels are visible
- Test with screen readers (VoiceOver, TalkBack)
- Support landscape orientation
- Provide skip navigation links
- Ensure focus indicators are visible

## Performance Considerations

### Mobile-Specific Optimizations

```tsx
// Reduce data on mobile
const itemsToShow = isMobile ? 20 : 100;

// Lazy load images
<img loading="lazy" src={imageUrl} />

// Defer non-critical scripts
<script defer src="analytics.js" />
```

### Network Awareness

```tsx
// Use connection API if available
const connection = navigator.connection;
const isSlowConnection = connection?.effectiveType === '2g' || 
                         connection?.effectiveType === 'slow-2g';

if (isSlowConnection) {
  // Load lighter version
}
```

## Future Enhancements

### Planned Features

1. **Card Views for Tables**
   - Alternative mobile-friendly table layout
   - Swipe to reveal more details

2. **Offline Support**
   - Service worker implementation
   - Cached data for offline viewing

3. **Pull to Refresh**
   - Native-like refresh interaction

4. **Touch Gestures**
   - Swipe to navigate
   - Long press for actions

5. **Progressive Web App (PWA)**
   - Add to home screen
   - App-like experience
   - Push notifications

6. **Adaptive Loading**
   - Load less data on mobile
   - Progressive image loading

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/)
- [Material Design - Mobile](https://material.io/design/layout/responsive-layout-grid.html)
- [Web.dev - Responsive Design](https://web.dev/responsive-web-design-basics/)
- [MDN - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)

## Contributing

When adding new features:

1. Design mobile-first
2. Test on multiple viewports
3. Add responsive screenshot tests
4. Update this documentation
5. Follow established patterns

For questions or suggestions, open an issue or discussion.
