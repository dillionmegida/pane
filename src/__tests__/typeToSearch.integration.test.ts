/**
 * Type-to-Search Integration Tests
 * Tests the type-to-search feature with real keyboard events (shallow rendering)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useStore } from '../store';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '../theme';
import { KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME } from '../constants';

// Mock all FilePane dependencies to reduce complexity
jest.mock('../components/filePane/Column', () => {
  return function MockColumn() {
    return require('react').createElement('div', { 'data-testid': 'column' });
  };
});
jest.mock('../components/filePane/FileListItem', () => {
  return function MockFileListItem() {
    return require('react').createElement('div', { 'data-testid': 'file-list-item' });
  };
});
jest.mock('../components/filePane/FileGridItem', () => {
  return function MockFileGridItem() {
    return require('react').createElement('div', { 'data-testid': 'file-grid-item' });
  };
});
jest.mock('../components/filePane/PaneBreadcrumb', () => {
  return function MockPaneBreadcrumb() {
    return require('react').createElement('div', { 'data-testid': 'pane-breadcrumb' });
  };
});
jest.mock('../components/filePane/PaneContextMenu', () => {
  return function MockPaneContextMenu() {
    return null;
  };
});
jest.mock('../components/filePane/InlineTagPicker', () => {
  return function MockInlineTagPicker() {
    return null;
  };
});
jest.mock('../components/PreviewPane', () => {
  return require('react').forwardRef(() => null);
});
jest.mock('../components/QuickPreviewModal', () => {
  return () => null;
});

// Import FilePane after mocking dependencies
const FilePane = require('../components/filePane/FilePane').default;

const mkDir = (name: string, parentPath: string): any => ({
  name, path: `${parentPath}/${name}`, isDirectory: true, size: 0,
  modified: new Date().toISOString(), extension: '',
});
const mkFile = (name: string, parentPath: string, ext = ''): any => ({
  name, path: `${parentPath}/${name}`, isDirectory: false, size: 1024,
  modified: new Date().toISOString(), extension: ext || name.split('.').pop(),
});

const basePath = '/Users/test';
const rootFiles = [
  mkDir('Documents', basePath), mkDir('Downloads', basePath), mkDir('Pictures', basePath),
  mkFile('hello.txt', basePath, 'txt'), mkFile('readme.md', basePath, 'md'),
  mkFile('notes.txt', basePath, 'txt'), mkFile('test-file.js', basePath, 'js'),
];

const buildInitialState = (overrides: Record<string, any> = {}): any => ({
  panes: [{
    id: 'left', path: basePath, basePath, files: rootFiles,
    loading: false, error: null, selectedFiles: new Set(),
    sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
    tabs: [{ id: 'tab-1', path: basePath, label: 'test' }],
    activeTab: 0, currentBreadcrumbPath: basePath,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    showPreview: false,
    previewFile: null,
    ...overrides,
  }],
  activePane: 'left', previewFile: null, showPreview: false,
});

const getPane = (): any => useStore.getState().panes.find((p: any) => p.id === 'left');
const getStore = (): any => useStore.getState();

// Mock window.electronAPI
const mockElectronAPI = {
  readdir: jest.fn().mockResolvedValue({
    success: true,
    files: [mkFile('nested.txt', rootFiles[0].path, 'txt')],
  }),
  watcherStart: jest.fn(),
  getTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  folderSize: jest.fn().mockResolvedValue({ success: true, tree: { size: 1024 } }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('Type-to-Search Integration Tests - Real Keyboard Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const renderFilePane = () => {
    const result = render(
      React.createElement(
        StyledThemeProvider,
        { theme },
        React.createElement(FilePane, { paneId: 'left' })
      )
    );
    return result;
  };

  describe('Basic typing and buffer update', () => {
    test('typing something updates the typing buffer', async () => {
      const { container } = renderFilePane();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'h' });
      });

      // Check that "Searching: h" appears in the status bar
      expect(container.textContent).toContain('Searching: h');

      await act(async () => {
        jest.advanceTimersByTime(KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);
      });

      // Should select "hello.txt" (first file starting with "h")
      expect(getPane().selectedFiles.has(rootFiles[3].path)).toBe(true);
        //     // Preview pane should show
      expect(getStore().showPreview).toBe(true);
      expect(getStore().previewFile?.path).toBe(rootFiles[3].path);
      expect(container.textContent).not.toContain('Searching:');

      await act(async () => {
        fireEvent.keyDown(document, { key: 'd' });
      });
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'o' });
      });
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'c' });
      });
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'u' });
      });
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'm' });
      });

      await act(async () => {
        jest.advanceTimersByTime(KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);
      });

      // Should select "document.txt" (first file starting with "docum")
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
      expect(container.textContent).not.toContain('Searching:');
    });

    test('search with no match does not select anything', async () => {
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'z' });
        fireEvent.keyDown(document, { key: 'z' });
      });
      
      await act(async () => {
        jest.advanceTimersByTime(KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);
      });
      
      // No files start with "zz", so no selection
      expect(getPane().selectedFiles.size).toBe(0);
    });

    test('typing resets the debounce timer', async () => {
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'h' });
      });
      
      // Advance partway through debounce
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Type more - should reset timer
      await act(async () => {
        fireEvent.keyDown(document, { key: 'e' });
        fireEvent.keyDown(document, { key: 'l' });
        fireEvent.keyDown(document, { key: 'l' });
        fireEvent.keyDown(document, { key: 'o' });
      });
      
      // Advance original timeout - should not trigger yet
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      
      // Still no search because timer was reset
      expect(getPane().selectedFiles.size).toBe(0);
      
      // Advance full timeout from last keystroke
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      
      // Now should trigger
      expect(getPane().selectedFiles.has(rootFiles[3].path)).toBe(true);
    });
  });

  // describe('UI state changes on selection', () => {
  //   test('selecting a file via type-to-search shows preview pane', async () => {
  //     renderFilePane();

  //     await act(async () => {
  //       fireEvent.keyDown(document, { key: 'h' });
  //     });

  //     await act(async () => {
  //       jest.advanceTimersByTime(KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);
  //     });

  //     // Should select "hello.txt"
  //     expect(getPane().selectedFiles.has(rootFiles[3].path)).toBe(true);

  //     // Preview pane should show
  //     expect(getPane().showPreview).toBe(true);
  //     expect(getPane().previewFile?.path).toBe(rootFiles[3].path);
  //   });

  //   test('selecting a folder via type-to-search in column view adds second column', async () => {
  //     useStore.setState(buildInitialState({
  //       viewMode: 'column',
  //       currentBreadcrumbPath: basePath,
  //       columnState: {
  //         paths: [],
  //         filesByPath: { [basePath]: rootFiles },
  //         selectedByColumn: {},
  //         focusedIndex: 0,
  //       },
  //     }));

  

  //     renderFilePane();

  //     await act(async () => {
  //       fireEvent.keyDown(document, { key: 'd' });
  //       fireEvent.keyDown(document, { key: 'o' });
  //     });

  //     await act(async () => {
  //       jest.advanceTimersByTime(KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);
  //     });

  //     // Should select "Documents" folder
  //     expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);

  //     // Second column should be added
  //     expect(getPane().columnState.paths.length).toBe(1);
  //     expect(getPane().columnState.paths[0]).toBe(rootFiles[0].path);
  //   });
  // });
});
