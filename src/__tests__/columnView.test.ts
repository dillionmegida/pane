/**
 * Column View Navigation Tests
 * Tests for the core column-based file navigation logic
 * Simulates real user interactions: selecting items, adding/removing columns, breadcrumb tracking
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Column View - Basic Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/Users',
          files: [
            { name: 'john', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
            { name: 'jane', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
            { name: 'shared', isDirectory: true, size: 0, modified: new Date().toISOString(), extension: '' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/Users', label: 'Users' }],
          activeTab: 0,
          currentBreadcrumbPath: '/Users',
          columnState: {
            paths: ['/Users'],
            filesByPath: {
              '/Users': [
                { name: 'john', isDirectory: true },
                { name: 'jane', isDirectory: true },
                { name: 'shared', isDirectory: true },
              ],
            },
            selectedByColumn: {},
            focusedIndex: 0,
          },
        },
      ],
      activePane: 'left',
    });
  });

  test('should start with single column at root', () => {
    const { result } = renderHook(() => useStore());
    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    
    expect(leftPane.columnState.paths).toHaveLength(1);
    expect(leftPane.columnState.paths[0]).toBe('/Users');
  });

  test('should add column when selecting directory', () => {
    const { result } = renderHook(() => useStore());
    
    // Simulate selecting 'john' folder - adds /Users/john column
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
        focusedIndex: 1,
      });
    });

    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
    expect(leftPane.columnState.paths[1]).toBe('/Users/john');
    expect(leftPane.columnState.selectedByColumn[0]).toBe('/Users/john');
    expect(leftPane.columnState.focusedIndex).toBe(1);
  });

  test('should add multiple columns through navigation', () => {
    const { result } = renderHook(() => useStore());
    
    // Navigate: /Users -> /Users/john -> /Users/john/Documents
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
        focusedIndex: 1,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);

    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
        focusedIndex: 2,
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);
    expect(leftPane.columnState.paths[2]).toBe('/Users/john/Documents');
  });

  test('should remove columns when clicking empty space', () => {
    const { result } = renderHook(() => useStore());
    
    // Start with 3 columns
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
        focusedIndex: 2,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);

    // Click empty space in column 1 - removes columns after it
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
        focusedIndex: 1,
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
    expect(leftPane.columnState.selectedByColumn[1]).toBeUndefined();
  });

  test('should update breadcrumb path as columns change', () => {
    const { result } = renderHook(() => useStore());
    
    // Initial breadcrumb is /Users
    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.currentBreadcrumbPath).toBe('/Users');

    // Navigate to /Users/john
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users/john');
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.currentBreadcrumbPath).toBe('/Users/john');
    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toHaveLength(3); // /, Users, john
  });
});

describe('Column View - Complex Navigation Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/Users/john',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/Users/john', label: 'john' }],
          activeTab: 0,
          currentBreadcrumbPath: '/Users/john',
          columnState: {
            paths: ['/Users/john'],
            filesByPath: {},
            selectedByColumn: {},
            focusedIndex: 0,
          },
        },
      ],
      activePane: 'left',
    });
  });

  test('should handle deep navigation (5+ levels)', () => {
    const { result } = renderHook(() => useStore());
    
    const deepPath = [
      '/Users/john',
      '/Users/john/Documents',
      '/Users/john/Documents/Projects',
      '/Users/john/Documents/Projects/WebApp',
      '/Users/john/Documents/Projects/WebApp/src',
      '/Users/john/Documents/Projects/WebApp/src/components',
    ];

    act(() => {
      result.current.updateColumnState('left', {
        paths: deepPath,
        selectedByColumn: {
          0: '/Users/john/Documents',
          1: '/Users/john/Documents/Projects',
          2: '/Users/john/Documents/Projects/WebApp',
          3: '/Users/john/Documents/Projects/WebApp/src',
          4: '/Users/john/Documents/Projects/WebApp/src/components',
        },
        focusedIndex: 5,
      });
    });

    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(6);
    expect(leftPane.columnState.focusedIndex).toBe(5);
  });

  test('should handle navigation back to parent', () => {
    const { result } = renderHook(() => useStore());
    
    // Start at deep level
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents', '/Users/john/Documents/Projects'],
        selectedByColumn: {
          0: '/Users/john/Documents',
          1: '/Users/john/Documents/Projects',
        },
        focusedIndex: 2,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);

    // Navigate back to parent (click on Documents in column 0)
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents'],
        selectedByColumn: {
          0: '/Users/john/Documents',
        },
        focusedIndex: 1,
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
  });

  test('should handle switching between different branches', () => {
    const { result } = renderHook(() => useStore());
    
    // Navigate to Documents branch
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john/Documents' },
        focusedIndex: 1,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths[1]).toBe('/Users/john/Documents');

    // Switch to Downloads branch (click on Downloads in column 0)
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Downloads'],
        selectedByColumn: { 0: '/Users/john/Downloads' },
        focusedIndex: 1,
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths[1]).toBe('/Users/john/Downloads');
  });

  test('should track focused column correctly', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents', '/Users/john/Documents/Projects'],
        selectedByColumn: {
          0: '/Users/john/Documents',
          1: '/Users/john/Documents/Projects',
        },
        focusedIndex: 0,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.focusedIndex).toBe(0);

    // Move focus to column 2
    act(() => {
      result.current.updateColumnState('left', {
        focusedIndex: 2,
      });
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.focusedIndex).toBe(2);
  });
});

describe('Column View - File Selection in Columns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/Users',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/Users', label: 'Users' }],
          activeTab: 0,
          currentBreadcrumbPath: '/Users',
          columnState: {
            paths: ['/Users', '/Users/john'],
            filesByPath: {
              '/Users': [
                { name: 'john', isDirectory: true },
                { name: 'jane', isDirectory: true },
              ],
              '/Users/john': [
                { name: 'Documents', isDirectory: true },
                { name: 'Downloads', isDirectory: true },
              ],
            },
            selectedByColumn: { 0: '/Users/john' },
            focusedIndex: 1,
          },
        },
      ],
      activePane: 'left',
    });
  });

  test('should track selected item per column', () => {
    const { result } = renderHook(() => useStore());
    
    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.selectedByColumn[0]).toBe('/Users/john');
  });

  test('should update selection in specific column', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.updateColumnState('left', {
        selectedByColumn: {
          0: '/Users/jane', // Changed from john to jane
          1: '/Users/jane/Documents',
        },
      });
    });

    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.selectedByColumn[0]).toBe('/Users/jane');
  });

  test('should maintain selection when navigating', () => {
    const { result } = renderHook(() => useStore());
    
    // Navigate deeper while maintaining selections
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: {
          0: '/Users/john',
          1: '/Users/john/Documents',
          2: '/Users/john/Documents/Projects',
        },
      });
    });

    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.selectedByColumn[0]).toBe('/Users/john');
    expect(leftPane.columnState.selectedByColumn[1]).toBe('/Users/john/Documents');
    expect(leftPane.columnState.selectedByColumn[2]).toBe('/Users/john/Documents/Projects');
  });
});

describe('Column View - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/',
          files: [],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/', label: 'Root' }],
          activeTab: 0,
          currentBreadcrumbPath: '/',
          columnState: {
            paths: ['/'],
            filesByPath: {},
            selectedByColumn: {},
            focusedIndex: 0,
          },
        },
      ],
      activePane: 'left',
    });
  });

  test('should handle root path navigation', () => {
    const { result } = renderHook(() => useStore());
    
    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    const breadcrumbs = result.current.getBreadcrumbs('left');
    
    expect(leftPane.currentBreadcrumbPath).toBe('/');
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0].path).toBe('/');
  });

  test('should handle single-level path', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users');
    });

    const breadcrumbs = result.current.getBreadcrumbs('left');
    expect(breadcrumbs).toHaveLength(2); // / and Users
    expect(breadcrumbs[1].name).toBe('Users');
  });

  test('should clear column state completely', () => {
    const { result } = renderHook(() => useStore());
    
    // Add multiple columns
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
        focusedIndex: 2,
      });
    });

    let leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);

    // Clear all
    act(() => {
      result.current.clearColumnState('left');
    });

    leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(0);
    expect(leftPane.columnState.selectedByColumn).toEqual({});
    expect(leftPane.columnState.focusedIndex).toBe(0);
  });

  test('should handle empty directories in column view', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john/EmptyFolder'],
        filesByPath: {
          '/Users': [{ name: 'john', isDirectory: true }],
          '/Users/john/EmptyFolder': [], // Empty
        },
        selectedByColumn: { 0: '/Users/john/EmptyFolder' },
      });
    });

    const leftPane = result.current.panes.find((p: any) => p.id === 'left');
    expect(leftPane.columnState.filesByPath['/Users/john/EmptyFolder']).toHaveLength(0);
  });
});

describe('Column View - empty space click deselects and trims columns (regression)', () => {
  const BASE = '/Users/test';

  const mkPane = (overrides = {}) => ({
    id: 'left', path: BASE, basePath: BASE, files: [],
    loading: false, error: null, selectedFiles: new Set<string>(),
    sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
    tabs: [], activeTab: 0, currentBreadcrumbPath: BASE,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({ panes: [mkPane()], activePane: 'left' } as any);
  });

  test('empty click on base column (index 0) removes all child columns', () => {
    useStore.setState({
      panes: [mkPane({
        selectedFiles: new Set([`${BASE}/Documents`]),
        columnState: {
          paths: [`${BASE}/Documents`, `${BASE}/Documents/Projects`],
          filesByPath: {
            [BASE]: [],
            [`${BASE}/Documents`]: [],
            [`${BASE}/Documents/Projects`]: [],
          },
          selectedByColumn: { 0: `${BASE}/Documents`, 1: `${BASE}/Documents/Projects` },
          focusedIndex: 2,
        },
      })],
    } as any);

    act(() => {
      const s = useStore.getState();
      s.setSelection('left', []);
      s.setColumnState('left', {
        paths: [],
        filesByPath: { [BASE]: [] },
        selectedByColumn: {},
        focusedIndex: 0,
      });
    });

    const pane = useStore.getState().panes.find((p: any) => p.id === 'left') as any;
    expect(pane.columnState.paths).toHaveLength(0);
    expect(pane.columnState.selectedByColumn).toEqual({});
    expect(pane.columnState.focusedIndex).toBe(0);
    expect(pane.selectedFiles.size).toBe(0);
  });

  test('empty click on child column keeps that column but removes columns to its right', () => {
    useStore.setState({
      panes: [mkPane({
        selectedFiles: new Set([`${BASE}/Documents/Projects`]),
        columnState: {
          paths: [`${BASE}/Documents`, `${BASE}/Documents/Projects`],
          filesByPath: {
            [BASE]: [],
            [`${BASE}/Documents`]: [],
            [`${BASE}/Documents/Projects`]: [],
          },
          selectedByColumn: { 0: `${BASE}/Documents`, 1: `${BASE}/Documents/Projects` },
          focusedIndex: 2,
        },
      })],
    } as any);

    act(() => {
      const s = useStore.getState();
      const pane = s.panes.find((p: any) => p.id === 'left') as any;
      // colIndex=1 = second column (first child). Keep paths[0..0] = [Documents].
      const colIndex = 1;
      const keptPaths = pane.columnState.paths.slice(0, colIndex);
      const keepSet = new Set([BASE, ...keptPaths]);
      const newFbp: Record<string, any[]> = {};
      for (const [k, v] of Object.entries(pane.columnState.filesByPath)) {
        if (keepSet.has(k)) newFbp[k] = v as any[];
      }
      const newSelByCol: Record<number, string> = {};
      for (let i = 0; i < colIndex; i++) {
        if (pane.columnState.selectedByColumn?.[i]) newSelByCol[i] = pane.columnState.selectedByColumn[i];
      }
      delete newSelByCol[colIndex];
      s.setSelection('left', []);
      s.setColumnState('left', {
        paths: keptPaths,
        filesByPath: newFbp,
        selectedByColumn: newSelByCol,
        focusedIndex: colIndex,
      });
    });

    const pane = useStore.getState().panes.find((p: any) => p.id === 'left') as any;
    // Column 1 (Documents) is kept, column 2 (Projects) is removed
    expect(pane.columnState.paths).toHaveLength(1);
    expect(pane.columnState.paths[0]).toBe(`${BASE}/Documents`);
    expect(pane.columnState.filesByPath[`${BASE}/Documents`]).toBeDefined();
    expect(pane.columnState.filesByPath[`${BASE}/Documents/Projects`]).toBeUndefined();
    expect(pane.selectedFiles.size).toBe(0);
    // The item previously selected in column 1 is cleared
    expect(pane.columnState.selectedByColumn[1]).toBeUndefined();
  });

  test('empty click on deepest child column keeps it, removes nothing (no columns to its right)', () => {
    useStore.setState({
      panes: [mkPane({
        columnState: {
          paths: [`${BASE}/Documents`, `${BASE}/Documents/Projects`],
          filesByPath: {
            [BASE]: [],
            [`${BASE}/Documents`]: [],
            [`${BASE}/Documents/Projects`]: [],
          },
          selectedByColumn: { 0: `${BASE}/Documents`, 1: `${BASE}/Documents/Projects` },
          focusedIndex: 2,
        },
      })],
    } as any);

    act(() => {
      const s = useStore.getState();
      const pane = s.panes.find((p: any) => p.id === 'left') as any;
      // colIndex=2 = third column (second child). Keep paths[0..1] = both child paths.
      const colIndex = 2;
      const keptPaths = pane.columnState.paths.slice(0, colIndex);
      const newSelByCol: Record<number, string> = {};
      for (let i = 0; i < colIndex; i++) {
        if (pane.columnState.selectedByColumn?.[i]) newSelByCol[i] = pane.columnState.selectedByColumn[i];
      }
      delete newSelByCol[colIndex];
      s.setSelection('left', []);
      s.setColumnState('left', {
        paths: keptPaths,
        filesByPath: { [BASE]: [], [`${BASE}/Documents`]: [], [`${BASE}/Documents/Projects`]: [] },
        selectedByColumn: newSelByCol,
        focusedIndex: colIndex,
      });
    });

    const pane = useStore.getState().panes.find((p: any) => p.id === 'left') as any;
    // Both child columns preserved
    expect(pane.columnState.paths).toHaveLength(2);
    expect(pane.columnState.paths[1]).toBe(`${BASE}/Documents/Projects`);
    expect(pane.columnState.filesByPath[`${BASE}/Documents/Projects`]).toBeDefined();
    // Selection in this column is cleared
    expect(pane.columnState.selectedByColumn[2]).toBeUndefined();
    expect(pane.selectedFiles.size).toBe(0);
    expect(pane.columnState.focusedIndex).toBe(2);
  });
});

describe('Column View - paths array is child-only (regression)', () => {
  const BASE = '/Users';

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [{
        id: 'left',
        path: BASE,
        basePath: BASE,
        files: [
          { name: 'john', path: `${BASE}/john`, isDirectory: true, size: 0, modified: '', extension: '' },
          { name: 'jane', path: `${BASE}/jane`, isDirectory: true, size: 0, modified: '', extension: '' },
        ],
        loading: false, error: null, selectedFiles: new Set(),
        sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
        tabs: [{ id: 't1', path: BASE, basePath: BASE, label: 'Users' }],
        activeTab: 0,
        currentBreadcrumbPath: BASE,
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
      }],
      activePane: 'left',
    } as any);
  });

  const getPane = () => useStore.getState().panes.find((p: any) => p.id === 'left') as any;

  test('paths starts empty — basePath is NOT stored in paths', () => {
    expect(getPane().columnState.paths).toHaveLength(0);
  });

  test('clicking a child directory appends only the child path, not basePath', () => {
    act(() => {
      useStore.getState().updateColumnState('left', {
        paths: ['/Users/john'],
        filesByPath: { '/Users/john': [] },
        selectedByColumn: { 0: '/Users/john' },
        focusedIndex: 1,
      });
    });
    const paths = getPane().columnState.paths;
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe('/Users/john');
    expect(paths).not.toContain('/Users');
  });

  test('clicking a directory in column 1 truncates deeper paths and appends new one', () => {
    act(() => {
      useStore.getState().updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Documents', '/Users/john/Documents/work'],
        filesByPath: {},
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents', 2: '/Users/john/Documents/work' },
        focusedIndex: 3,
      });
    });

    // Simulate clicking '/Users/john/Projects' in column index 1 (paths[0] = /Users/john)
    // Expected: paths[0..0] kept, new path appended → ['/Users/john', '/Users/john/Projects']
    act(() => {
      const keptPaths = ['/Users/john'];
      useStore.getState().updateColumnState('left', {
        paths: [...keptPaths, '/Users/john/Projects'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Projects' },
        focusedIndex: 2,
      });
    });

    const paths = getPane().columnState.paths;
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe('/Users/john');
    expect(paths[1]).toBe('/Users/john/Projects');
    expect(paths).not.toContain('/Users/john/Documents/work');
  });

  test('focusedIndex 0 refers to base column, 1 refers to paths[0]', () => {
    act(() => {
      useStore.getState().updateColumnState('left', {
        paths: ['/Users/john'],
        focusedIndex: 1,
      });
    });
    const { paths, focusedIndex } = getPane().columnState;
    // focusedIndex 1 → paths[0]
    expect(paths[focusedIndex - 1]).toBe('/Users/john');
  });
});

describe('Column View - exact column count via getColumnPaths (regression)', () => {
  const BASE = '/Users/test';

  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [{
        id: 'left', path: BASE, basePath: BASE, files: [],
        loading: false, error: null, selectedFiles: new Set(),
        sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
        tabs: [], activeTab: 0, currentBreadcrumbPath: BASE,
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
      }],
      activePane: 'left',
    } as any);
  });

  const setState = (breadcrumb: string) =>
    useStore.setState({ panes: [{ ...(useStore.getState().panes[0] as any), currentBreadcrumbPath: breadcrumb }] } as any);

  test('at basePath: getColumnPaths returns exactly 1 entry (base column only)', () => {
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toHaveLength(1);
    expect(paths[0]).toBe(BASE);
  });

  test('1 level deep: getColumnPaths returns exactly 2 entries', () => {
    setState(`${BASE}/Documents`);
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toHaveLength(2);
    expect(paths[0]).toBe(BASE);
    expect(paths[1]).toBe(`${BASE}/Documents`);
  });

  test('2 levels deep: getColumnPaths returns exactly 3 entries', () => {
    setState(`${BASE}/Documents/Projects`);
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toHaveLength(3);
    expect(paths[2]).toBe(`${BASE}/Documents/Projects`);
  });

  test('3 levels deep: getColumnPaths returns exactly 4 entries', () => {
    setState(`${BASE}/Documents/Projects/WebApp`);
    const paths = useStore.getState().getColumnPaths('left');
    expect(paths).toHaveLength(4);
  });

  test('basePath is always paths[0]', () => {
    setState(`${BASE}/Documents/Projects`);
    expect(useStore.getState().getColumnPaths('left')[0]).toBe(BASE);
  });

  test('no duplicate entries — each path segment appears once', () => {
    setState(`${BASE}/a/b/c`);
    const paths = useStore.getState().getColumnPaths('left');
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('Column View - toggleHiddenFiles (regression)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    useStore.setState({
      showHidden: false,
      panes: [{
        id: 'left', path: '/Users', basePath: '/Users', files: [],
        loading: false, error: null, selectedFiles: new Set(),
        sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
        tabs: [], activeTab: 0, currentBreadcrumbPath: '/Users',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
      }],
    } as any);
  });

  test('toggleHiddenFiles flips showHidden from false to true', async () => {
    expect(useStore.getState().showHidden).toBe(false);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect(useStore.getState().showHidden).toBe(true);
  });

  test('toggleHiddenFiles flips showHidden back to false', async () => {
    useStore.setState({ showHidden: true } as any);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect(useStore.getState().showHidden).toBe(false);
  });

  test('toggleHiddenFiles persists value via storeSet', async () => {
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect((window as any).electronAPI.storeSet).toHaveBeenCalledWith('showHidden', true);
  });

  test('toggleHiddenFiles calls readdir to refresh base pane files', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    useStore.setState({
      panes: [{
        id: 'left', path: '/Users', basePath: '/Users', files: [],
        loading: false, error: null, selectedFiles: new Set(),
        sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
        tabs: [], activeTab: 0, currentBreadcrumbPath: '/Users',
        columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
        navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
      }],
      showHidden: false,
    } as any);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect((window as any).electronAPI.readdir).toHaveBeenCalledWith('/Users');
  });

  test('toggleHiddenFiles calls readdir for each loaded column directory', async () => {
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    useStore.setState({
      panes: [{
        id: 'left', path: '/Users', basePath: '/Users', files: [],
        loading: false, error: null, selectedFiles: new Set(),
        sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
        tabs: [], activeTab: 0, currentBreadcrumbPath: '/Users/john',
        columnState: {
          paths: ['/Users/john'],
          filesByPath: { '/Users/john': [], '/Users/john/Documents': [] },
          selectedByColumn: {}, focusedIndex: 1,
        },
        navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
      }],
      showHidden: false,
    } as any);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    const calledPaths = (window as any).electronAPI.readdir.mock.calls.map((c: any) => c[0]);
    expect(calledPaths).toContain('/Users/john');
    expect(calledPaths).toContain('/Users/john/Documents');
  });
});
