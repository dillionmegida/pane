# Testing Guide for Pane

## Overview

Pane includes comprehensive **logic-based tests** for core functionalities. Tests focus on state management, navigation logic, and file operations rather than UI components.

## Quick Start

### Install dependencies

```bash
npm install
```

### Run tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

- **Store Management** (50+ tests)
  - Pane creation and switching
  - Navigation and breadcrumb generation
  - File selection and sorting
  - Column view state management
  - Tab management
  - Preview and zoom
  - Clipboard operations

- **Column View Navigation** (20+ tests)
  - Single to multi-column transitions
  - Deep navigation (5+ levels)
  - Branch switching
  - Column removal
  - Focused column tracking

- **Search Functionality** (10+ tests)
  - Search overlay toggling
  - Query handling
  - Result navigation
  - Error handling

## Test Files

```
src/__tests__/
├── store.test.js          # Core state management (50+ tests)
├── columnView.test.js     # Column navigation logic (20+ tests)
├── search.test.js         # Search functionality (10+ tests)
└── README.md              # Detailed test documentation
```

## Key Features Tested

### 1. Breadcrumbs

Tests verify breadcrumb generation for all path levels:

```text
/ → Single breadcrumb
/Users → Two breadcrumbs
/Users/john/Documents → Four breadcrumbs
```

### 2. Column View Navigation

Tests simulate real user interactions:

```text
Start: /Users (1 column)
Select 'john' → /Users, /Users/john (2 columns)
Select 'Documents' → /Users, /Users/john, /Users/john/Documents (3 columns)
Click empty space in column 2 → Back to 2 columns
```

### 3. File Selection

Tests verify selection behavior:

- Single click selects one file
- Click again deselects
- Cmd/Ctrl + click multi-selects
- Selection persists during navigation

### 4. File Sorting

Tests verify sort order:

- Directories always first
- Files sorted by name (case-insensitive)
- Files sorted by size (ascending/descending)
- Files sorted by date
- Files sorted by extension

### 5. Clipboard Operations

Tests verify copy/cut/paste:

- Add files to clipboard
- Remove files from clipboard
- Clear clipboard
- Prevent duplicates

## Running Specific Tests

```bash
# Run store tests only
npm test -- store.test.js

# Run column view tests only
npm test -- columnView.test.js

# Run search tests only
npm test -- search.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="breadcrumb"

# Run with coverage
npm run test:coverage
```

## Test Structure

Each test follows this pattern:

```javascript
test('should [describe behavior]', () => {
  // 1. Setup: Initialize store state
  const { result } = renderHook(() => useStore());

  // 2. Action: Perform state change
  act(() => {
    result.current.someAction();
  });

  // 3. Assert: Verify result
  expect(result.current.someState).toBe(expectedValue);
});
```

## Mocking

Tests mock `window.electronAPI` to avoid requiring Electron:

```javascript
global.window = {
  electronAPI: {
    readdir: jest.fn(),
    stat: jest.fn(),
    watcherStart: jest.fn(),
    // ... other methods
  },
};
```

## Adding New Tests

1. Identify the core logic to test
2. Set up initial state using `useStore.setState()`
3. Perform action using `act()`
4. Assert results

Example:

```javascript
test('should navigate to directory', async () => {
  window.electronAPI.readdir.mockResolvedValue({
    success: true,
    files: [{ name: 'file.txt', isDirectory: false }],
  });

  const { result } = renderHook(() => useStore());

  await act(async () => {
    await result.current.navigateTo('left', '/Users');
  });

  const leftPane = result.current.panes.find(p => p.id === 'left');
  expect(leftPane.path).toBe('/Users');
  expect(leftPane.files).toHaveLength(1);
});
```

## Coverage Goals

Current targets:

- Store logic: 100%
- Utility functions: 100%
- Navigation logic: 100%
- Search logic: 100%

View coverage report:

```bash
npm run test:coverage
```

## Debugging Tests

### Run single test

```bash
npm test -- --testNamePattern="specific test name"
```

### Run with verbose output

```bash
npm test -- --verbose
```

### Watch mode (re-runs on file change)

```bash
npm run test:watch
```

## CI/CD Integration

Add to your CI pipeline:

```bash
npm test -- --coverage --watchAll=false
```

## Troubleshooting

### Tests fail with "window is not defined"

The tests mock `window.electronAPI` globally. Ensure the mock is set up before importing the store.

### Tests timeout

Increase timeout for async tests:

```javascript
test('async test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### State not updating

Use `act()` wrapper for all state changes:

```javascript
act(() => {
  result.current.someAction();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Zustand Testing](https://github.com/pmndrs/zustand#testing)

## Questions?

See `src/__tests__/README.md` for detailed test documentation.
