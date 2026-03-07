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
    const leftPane = result.current.panes.find(p => p.id === 'left');
    
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

    const leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);

    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john', '/Users/john/Documents'],
        selectedByColumn: { 0: '/Users/john', 1: '/Users/john/Documents' },
        focusedIndex: 2,
      });
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);

    // Click empty space in column 1 - removes columns after it
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
        focusedIndex: 1,
      });
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(2);
    expect(leftPane.columnState.selectedByColumn[1]).toBeUndefined();
  });

  test('should update breadcrumb path as columns change', () => {
    const { result } = renderHook(() => useStore());
    
    // Initial breadcrumb is /Users
    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.currentBreadcrumbPath).toBe('/Users');

    // Navigate to /Users/john
    act(() => {
      result.current.setCurrentBreadcrumbPath('left', '/Users/john');
      result.current.updateColumnState('left', {
        paths: ['/Users', '/Users/john'],
        selectedByColumn: { 0: '/Users/john' },
      });
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
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

    const leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
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

    leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths[1]).toBe('/Users/john/Documents');

    // Switch to Downloads branch (click on Downloads in column 0)
    act(() => {
      result.current.updateColumnState('left', {
        paths: ['/Users/john', '/Users/john/Downloads'],
        selectedByColumn: { 0: '/Users/john/Downloads' },
        focusedIndex: 1,
      });
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.focusedIndex).toBe(0);

    // Move focus to column 2
    act(() => {
      result.current.updateColumnState('left', {
        focusedIndex: 2,
      });
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
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
    
    const leftPane = result.current.panes.find(p => p.id === 'left');
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

    const leftPane = result.current.panes.find(p => p.id === 'left');
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

    const leftPane = result.current.panes.find(p => p.id === 'left');
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
    
    const leftPane = result.current.panes.find(p => p.id === 'left');
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

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.paths).toHaveLength(3);

    // Clear all
    act(() => {
      result.current.clearColumnState('left');
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
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

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.columnState.filesByPath['/Users/john/EmptyFolder']).toHaveLength(0);
  });
});
