/**
 * Multi-Select Tests
 * Tests for Cmd/Ctrl multi-select and Shift range selection
 * Ensures selections are preserved correctly across different selection modes
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Multi-Select - Cmd/Ctrl Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/test',
          files: [
            { name: 'fileA.txt', path: '/test/fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileB.txt', path: '/test/fileB.txt', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileC.txt', path: '/test/fileC.txt', isDirectory: false, size: 300, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileD.txt', path: '/test/fileD.txt', isDirectory: false, size: 400, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileE.txt', path: '/test/fileE.txt', isDirectory: false, size: 500, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileF.txt', path: '/test/fileF.txt', isDirectory: false, size: 600, modified: new Date().toISOString(), extension: 'txt' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'list',
          tabs: [{ id: 'tab-1', path: '/test', label: 'test' }],
          activeTab: 0,
        },
      ],
      activePane: 'left',
    });
  });

  test('should select single file with Cmd/Ctrl', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleSelection('left', '/test/fileA.txt', true);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(1);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
  });

  test('should add multiple files with Cmd/Ctrl', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleSelection('left', '/test/fileA.txt', true);
      result.current.toggleSelection('left', '/test/fileC.txt', true);
      result.current.toggleSelection('left', '/test/fileE.txt', true);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(3);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileE.txt')).toBe(true);
  });

  test('should toggle off file with Cmd/Ctrl when already selected', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleSelection('left', '/test/fileA.txt', true);
      result.current.toggleSelection('left', '/test/fileB.txt', true);
    });

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(2);

    act(() => {
      result.current.toggleSelection('left', '/test/fileA.txt', true);
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(1);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(false);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(true);
  });
});

describe('Multi-Select - Shift Range Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/test',
          files: [
            { name: 'fileA.txt', path: '/test/fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileB.txt', path: '/test/fileB.txt', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileC.txt', path: '/test/fileC.txt', isDirectory: false, size: 300, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileD.txt', path: '/test/fileD.txt', isDirectory: false, size: 400, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileE.txt', path: '/test/fileE.txt', isDirectory: false, size: 500, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileF.txt', path: '/test/fileF.txt', isDirectory: false, size: 600, modified: new Date().toISOString(), extension: 'txt' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'list',
          tabs: [{ id: 'tab-1', path: '/test', label: 'test' }],
          activeTab: 0,
        },
      ],
      activePane: 'left',
    });
  });

  test('should select range from fileA to fileD with Shift', () => {
    const { result } = renderHook(() => useStore());
    
    // First select fileA
    act(() => {
      result.current.setSelection('left', ['/test/fileA.txt']);
    });

    // Then shift-select fileD (should select A, B, C, D)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileD.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(4);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
  });

  test('should select range in reverse order (fileD to fileA)', () => {
    const { result } = renderHook(() => useStore());
    
    // First select fileD
    act(() => {
      result.current.setSelection('left', ['/test/fileD.txt']);
    });

    // Then shift-select fileA (should select A, B, C, D)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileA.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(4);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
  });

  test('should do nothing with Shift when no files are selected', () => {
    const { result } = renderHook(() => useStore());
    
    // Shift-select without any prior selection should just select the file
    act(() => {
      result.current.setSelection('left', ['/test/fileC.txt']);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(1);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
  });
});

describe('Multi-Select - Combined Cmd and Shift Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/test',
          files: [
            { name: 'fileA.txt', path: '/test/fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileB.txt', path: '/test/fileB.txt', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileC.txt', path: '/test/fileC.txt', isDirectory: false, size: 300, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileD.txt', path: '/test/fileD.txt', isDirectory: false, size: 400, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileE.txt', path: '/test/fileE.txt', isDirectory: false, size: 500, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileF.txt', path: '/test/fileF.txt', isDirectory: false, size: 600, modified: new Date().toISOString(), extension: 'txt' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'list',
          tabs: [{ id: 'tab-1', path: '/test', label: 'test' }],
          activeTab: 0,
        },
      ],
      activePane: 'left',
    });
  });

  test('should preserve existing selections when shift-selecting a range', () => {
    const { result } = renderHook(() => useStore());
    
    // Select fileA
    act(() => {
      result.current.setSelection('left', ['/test/fileA.txt']);
    });

    // Cmd-select fileC (now have A and C)
    act(() => {
      result.current.toggleSelection('left', '/test/fileC.txt', true);
    });

    let leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(2);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);

    // Shift-select fileF (should add C, D, E, F to selection, keeping A)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileF.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(5);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileE.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileF.txt')).toBe(true);
  });

  test('should handle complex selection scenario: A, Cmd+C, Shift+F', () => {
    const { result } = renderHook(() => useStore());
    
    // Step 1: Select fileA
    act(() => {
      result.current.setSelection('left', ['/test/fileA.txt']);
    });

    // Step 2: Cmd+click fileC (skip B)
    act(() => {
      result.current.toggleSelection('left', '/test/fileC.txt', true);
    });

    // Step 3: Shift+click fileF (should select C-F range and merge with A)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileF.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    
    // Should have A, C, D, E, F (B is not selected)
    expect(leftPane.selectedFiles.size).toBe(5);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(false);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileE.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileF.txt')).toBe(true);
  });

  test('should handle multiple shift-selections preserving all previous selections', () => {
    const { result } = renderHook(() => useStore());
    
    // Select fileA
    act(() => {
      result.current.setSelection('left', ['/test/fileA.txt']);
    });

    // Shift-select fileC (A, B, C)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileC.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    // Shift-select fileF (should add D, E, F while keeping A, B, C)
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileF.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(6);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileE.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileF.txt')).toBe(true);
  });
});

describe('Multi-Select - Column View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState({
      panes: [
        {
          id: 'left',
          path: '/test',
          files: [
            { name: 'fileA.txt', path: '/test/fileA.txt', isDirectory: false, size: 100, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileB.txt', path: '/test/fileB.txt', isDirectory: false, size: 200, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileC.txt', path: '/test/fileC.txt', isDirectory: false, size: 300, modified: new Date().toISOString(), extension: 'txt' },
            { name: 'fileD.txt', path: '/test/fileD.txt', isDirectory: false, size: 400, modified: new Date().toISOString(), extension: 'txt' },
          ],
          loading: false,
          error: null,
          selectedFiles: new Set(),
          sortBy: 'name',
          sortOrder: 'asc',
          viewMode: 'column',
          tabs: [{ id: 'tab-1', path: '/test', label: 'test' }],
          activeTab: 0,
          columnState: {
            paths: ['/test'],
            filesByPath: {},
            selectedByColumn: {},
            focusedIndex: 0,
          },
        },
      ],
      activePane: 'left',
    });
  });

  test('should support Cmd multi-select in column view', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleSelection('left', '/test/fileA.txt', true);
      result.current.toggleSelection('left', '/test/fileC.txt', true);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(2);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
  });

  test('should support Shift range selection in column view', () => {
    const { result } = renderHook(() => useStore());
    
    // Select fileA
    act(() => {
      result.current.setSelection('left', ['/test/fileA.txt']);
    });

    // Shift-select fileD
    act(() => {
      const files = result.current.panes.find(p => p.id === 'left').files;
      const selectedFiles = result.current.panes.find(p => p.id === 'left').selectedFiles;
      const fileIndex = files.findIndex(f => f.path === '/test/fileD.txt');
      const selArray = [...selectedFiles];
      const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
      const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
      const range = files.slice(start, end + 1).map(f => f.path);
      const mergedSelection = new Set([...selectedFiles, ...range]);
      result.current.setSelection('left', [...mergedSelection]);
    });

    const leftPane = result.current.panes.find(p => p.id === 'left');
    expect(leftPane.selectedFiles.size).toBe(4);
    expect(leftPane.selectedFiles.has('/test/fileA.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileB.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileC.txt')).toBe(true);
    expect(leftPane.selectedFiles.has('/test/fileD.txt')).toBe(true);
  });
});
