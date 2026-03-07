# Pane Application Tests

Comprehensive logic-based tests for core functionalities of the Pane file manager application.

## Test Structure

Tests are organized by functionality rather than UI components, focusing on **logic end-to-end** rather than UI interactions.

## Test Files

### `store.test.js` - Core State Management

Tests for the Zustand store and all state management logic:

- **Pane Management**: Creating, switching, and managing multiple panes
- **Navigation & Breadcrumbs**: Directory navigation and breadcrumb generation
  - Tests that breadcrumbs correctly reflect the current path
  - Tests nested path handling (e.g., `/Users/john/Documents`)
- **File Selection & Sorting**: Single/multi-select, sorting by name/size/date
  - Tests that directories always appear first
  - Tests sorting order (ascending/descending)
  - Tests multi-select with modifier keys
- **Column View State**: Managing column-based navigation state
  - Tests column state initialization and updates
  - Tests clearing column state
- **Tabs Management**: Creating, closing, and switching tabs
- **Preview & Zoom**: File preview and zoom functionality
- **Clipboard Operations**: Copy/cut/paste file operations

### `columnView.test.js` - Column View Navigation

Comprehensive tests for the column-based file browser logic:

- **Basic Navigation**: Single column to multi-column transitions
  - Tests adding columns when selecting directories
  - Tests removing columns when clicking empty space
  - Tests breadcrumb path updates
- **Complex Navigation Scenarios**: Real-world navigation patterns
  - Tests deep navigation (5+ levels)
  - Tests navigating back to parent directories
  - Tests switching between different branches
  - Tests focused column tracking
- **File Selection in Columns**: Per-column selection tracking
  - Tests selection per column
  - Tests maintaining selections during navigation
- **Edge Cases**: Root paths, empty directories, state clearing

### `search.test.js` - Search Functionality

Tests for file search and search result navigation:

- **Search Functionality**: Search overlay and query handling
  - Tests toggling search overlay
  - Tests search with various queries
  - Tests handling empty results
  - Tests error handling
- **Search Results Navigation**: Navigating to search results
  - Tests navigating to file from search results
  - Tests revealing files in tree view

## Running Tests

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage report

```bash
npm run test:coverage
```

### Run specific test file

```bash
npm test -- store.test.js
npm test -- columnView.test.js
npm test -- search.test.js
```

## Test Philosophy

These tests focus on **core logic** rather than UI:

**What's tested:**

- State transitions and updates
- Navigation logic (breadcrumbs, column management)
- File sorting and filtering
- Selection management
- Search functionality
- Clipboard operations
- Utility functions (formatting, icons, etc.)

**What's NOT tested:**

- React component rendering
- CSS styling
- DOM interactions
- UI animations
- Keyboard event handling (handled by components)

## Key Test Scenarios

### Column View Navigation

The most complex feature - tests simulate real user interactions:

1. **Single column** → User selects folder → **Two columns appear**
2. **Three columns** → User clicks empty space in column 2 → **Column 3 removed**
3. **Deep navigation** → User navigates 5+ levels deep → **All columns tracked correctly**
4. **Branch switching** → User selects different folder in column 1 → **Column 2 updates**

### Breadcrumb Tracking

Tests verify breadcrumbs match the current navigation state:

- Root path `/` → Single breadcrumb
- Nested path `/Users/john/Documents` → Four breadcrumbs (/, Users, john, Documents)
- Breadcrumbs update when navigating

### File Selection

Tests verify selection behavior:

- Single click → Select one file
- Click same file again → Deselect
- Cmd/Ctrl + click → Multi-select
- Selection persists during navigation

### Sorting

Tests verify sort order:

- Directories always appear first
- Files sorted by name (case-insensitive)
- Files sorted by size (ascending/descending)
- Files sorted by modified date
- Files sorted by extension

## Mocking

The tests mock `window.electronAPI` to avoid requiring the Electron main process:

```javascript
global.window = {
  electronAPI: {
    readdir: jest.fn(),
    stat: jest.fn(),
    watcherStart: jest.fn(),
    // ... other API methods
  },
};
```

This allows testing the store logic independently of Electron.

## Adding New Tests

When adding new tests:

1. **Identify the core logic** - What state changes should happen?
2. **Set up initial state** - Use `useStore.setState()` to set up test conditions
3. **Perform action** - Use `act()` to trigger state changes
4. **Assert results** - Verify the state changed as expected

Example:

```javascript
test('should add file to clipboard', () => {
  const { result } = renderHook(() => useStore());
  const files = ['/test/file.txt'];

  act(() => {
    result.current.addToClipboard(files, 'copy');
  });

  expect(result.current.clipboardQueue).toEqual(files);
  expect(result.current.clipboardMode).toBe('copy');
});
```

## Coverage Goals

Current test coverage targets:

- **Store logic**: 100% (all state mutations tested)
- **Utility functions**: 100% (sorting, formatting, icons)
- **Navigation logic**: 100% (breadcrumbs, column view)
- **Search logic**: 100% (search, filtering, results)

Run `npm run test:coverage` to see detailed coverage reports.
