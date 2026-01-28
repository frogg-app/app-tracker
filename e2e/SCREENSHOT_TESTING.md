# Screenshot Testing Documentation

## Overview

This document describes the screenshot testing infrastructure for the App Tracker application. Screenshot tests validate mobile support and provide visual documentation of the complete application flow.

## Purpose

1. **Mobile Support Validation**: Verify that all pages render correctly on mobile, tablet, and desktop viewports
2. **Visual Documentation**: Create a visual record of all pages for documentation and onboarding
3. **Regression Testing**: Detect unintended visual changes across releases
4. **Accessibility Review**: Visual inspection of responsive behavior and theme support

## Test Coverage

### Pages Tested

All 5 main application pages:
- Dashboard (`/`)
- Ports (`/ports`)
- Services (`/services`)
- Processes (`/processes`)
- Containers (`/containers`)

### Viewports Tested

1. **Mobile**: 375x667 (iPhone SE)
2. **Tablet**: 768x1024 (iPad Mini)
3. **Desktop**: 1920x1080 (Full HD)

### Themes Tested

- Light mode
- Dark mode

### Total Screenshots

**Base Coverage**: 30 screenshots per browser project
- 5 pages × 3 viewports × 2 themes = 30 screenshots

**Additional Flow Screenshots**:
- Mobile navigation flow: 3 screenshots
- Mobile theme toggle: 2 screenshots
- Responsive component tests: 6 screenshots

**Total**: 41+ screenshots per browser project

**Note**: Screenshots are organized by browser project (chromium by default for CI) to prevent conflicts when running tests across multiple browsers.

## Running Screenshot Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd e2e
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Start the application:
   ```bash
   # From project root
   docker compose up -d
   # OR run UI and server separately
   cd ui && npm run dev
   cd server && npm start
   ```

### Execute Screenshot Tests

**Interactive Mode (visible browser)** (recommended for development):
```bash
npm run test:screenshots:headed
```

**Headless Mode** (for CI/CD):
```bash
npm run test:screenshots:ci
```

**Run All E2E Tests** (including screenshots):
```bash
npm test
```

## Screenshot Organization

Screenshots are organized by browser project (to avoid conflicts), then by viewport and theme:

```
e2e/screenshots/
├── chromium/                # Default project (single browser for efficiency)
│   ├── mobile/
│   │   ├── light/
│   │   │   ├── dashboard.png
│   │   │   ├── ports.png
│   │   │   ├── services.png
│   │   │   ├── processes.png
│   │   │   └── containers.png
│   │   └── dark/
│   │       ├── dashboard.png
│   │       ├── ports.png
│   │       ├── services.png
│   │       ├── processes.png
│   │       └── containers.png
│   ├── tablet/
│   │   ├── light/
│   │   │   └── (same structure)
│   │   └── dark/
│   │       └── (same structure)
│   ├── desktop/
│   │   ├── light/
│   │   │   └── (same structure)
│   │   └── dark/
│   │       └── (same structure)
│   ├── mobile-flow/
│   │   ├── 01-dashboard-closed-sidebar.png
│   │   ├── 02-sidebar-open.png
│   │   ├── 03-ports-page.png
│   │   ├── 04-light-mode.png
│   │   └── 05-dark-mode.png
│   └── components/
│       ├── system-overview-mobile.png
│       ├── system-overview-desktop.png
│       ├── table-mobile.png
│       ├── containers-grid-mobile.png
│       ├── containers-grid-tablet.png
│       └── containers-grid-desktop.png
```

## Mobile Support Checklist

When reviewing screenshots, verify:

### Layout & Spacing
- [ ] No horizontal overflow on mobile viewports
- [ ] Appropriate padding/margins for touch targets
- [ ] Text is readable without zooming
- [ ] No overlapping elements

### Navigation
- [ ] Mobile sidebar menu opens/closes correctly
- [ ] Navigation items are tap-friendly (min 44x44px)
- [ ] Active page is clearly indicated
- [ ] Header remains accessible

### Data Tables
- [ ] Tables scroll horizontally on mobile
- [ ] Important columns are visible without scrolling
- [ ] Table headers remain readable
- [ ] Row selection/interaction works on touch

### Cards & Grids
- [ ] Cards stack appropriately on mobile (1 column)
- [ ] Cards show 2 columns on tablet
- [ ] Cards show 3+ columns on desktop
- [ ] Card content is not truncated

### Forms & Inputs
- [ ] Search bars fit within viewport
- [ ] Input fields are touch-friendly
- [ ] Dropdowns/selects work on mobile
- [ ] Buttons are appropriately sized

### Charts & Visualizations
- [ ] Charts resize appropriately
- [ ] Chart legends are readable
- [ ] Touch interactions work (if applicable)
- [ ] Data labels don't overlap

### Theme Support
- [ ] Dark mode has appropriate contrast
- [ ] All colors are readable in both themes
- [ ] Theme toggle is accessible
- [ ] No "flashing" during theme transitions

## Continuous Integration

### GitHub Actions Integration

Add to your `.github/workflows/ci.yml`:

```yaml
screenshot-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: |
        cd e2e
        npm install
        npx playwright install --with-deps
    
    - name: Start application
      run: docker compose up -d
      
    - name: Wait for app to be ready
      run: |
        timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
    
    - name: Run screenshot tests
      run: |
        cd e2e
        npm run test:screenshots:ci
    
    - name: Upload screenshots
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: screenshots
        path: e2e/screenshots/
        retention-days: 30
```

## Visual Regression Testing (Future Enhancement)

For automated visual regression testing, consider integrating:

1. **Percy** (percy.io)
   - Automated visual diffing
   - PR integration
   - Baseline management

2. **Chromatic** (chromatic.com)
   - Component-level testing
   - Storybook integration
   - Review workflows

3. **Playwright Visual Comparisons**
   ```typescript
   await expect(page).toHaveScreenshot('dashboard.png');
   ```

## Maintenance

### Updating Baseline Screenshots

When making intentional UI changes:

1. Run screenshot tests
2. Review new screenshots
3. If changes are expected, commit updated screenshots
4. Document changes in CHANGELOG.md

### Adding New Pages

To add screenshot coverage for new pages:

1. Add page definition to `screenshots.spec.ts`:
   ```typescript
   { name: 'new-page', path: '/new-page', heading: /New Page/i }
   ```

2. Run tests to generate screenshots

3. Review and commit

### Troubleshooting

**Issue**: Screenshots show loading state
- **Solution**: Increase wait times in `waitForPageLoad()` helper

**Issue**: Dark mode not applied
- **Solution**: Check `enableDarkMode()` function and CSS class application

**Issue**: Mobile sidebar not visible
- **Solution**: Verify mobile breakpoint classes and viewport size

**Issue**: Screenshots too large
- **Solution**: Use `clip` option or reduce viewport sizes

## Best Practices

1. **Run Locally First**: Always run screenshot tests locally before CI/CD
2. **Review Carefully**: Manually review screenshots for layout issues
3. **Keep Updated**: Update screenshots when making intentional UI changes
4. **Document Changes**: Note significant visual changes in PR descriptions
5. **Use Consistent Data**: Ensure test data is consistent for screenshot stability
6. **Mobile First**: Review mobile screenshots first, then tablet/desktop
7. **Both Themes**: Always verify both light and dark mode
8. **Component Focus**: Test individual components in addition to full pages

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](../CONTRIBUTING.md#testing)
- [Mobile Support Guidelines](../docs/MOBILE_SUPPORT.md)
- [Accessibility Testing](../docs/ACCESSIBILITY.md)

## Support

For questions or issues with screenshot testing:
1. Check existing screenshots in `e2e/screenshots/`
2. Review test output and error messages
3. Consult Playwright documentation
4. Open an issue with screenshots attached
