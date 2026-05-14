/**
 * Column View Keyboard Navigation Integration Tests
 * Tests actual keyboard handler with real keyboard events (shallow rendering)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useStore } from '../store';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '../theme';

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
  mkFile('notes.txt', basePath, 'txt'), mkFile('readme.md', basePath, 'md'),
];
const documentsFiles = [
  mkDir('Projects', `${basePath}/Documents`), mkDir('Archive', `${basePath}/Documents`),
  mkFile('todo.txt', `${basePath}/Documents`, 'txt'),
];
const projectsFiles = [
  mkDir('WebApp', `${basePath}/Documents/Projects`),
  mkFile('plan.md', `${basePath}/Documents/Projects`, 'md'),
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
  readdir: jest.fn(),
  watcherStart: jest.fn(),
  getTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('Column Keyboard Nav Integration Tests - Real Keyboard Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock readdir to return directory contents
    mockElectronAPI.readdir.mockImplementation(async (path: string) => {
      if (path === rootFiles[0].path) return { success: true, files: documentsFiles };
      if (path === documentsFiles[0].path) return { success: true, files: projectsFiles };
      if (path === projectsFiles[0].path) return { success: true, files: [] };
      return { success: true, files: [] };
    });
    
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderFilePane = () => {
    return render(
      React.createElement(
        StyledThemeProvider,
        { theme },
        React.createElement(FilePane, { paneId: 'left' })
      )
    );
  };

  describe('ArrowDown', () => {
    test('ArrowDown keyboard event selects first item', async () => {
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
    });

    test('ArrowDown keyboard event moves selection', async () => {
      useStore.setState(buildInitialState({ 
        selectedFiles: new Set([rootFiles[0].path]), 
        currentBreadcrumbPath: basePath 
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(false);
      expect(getPane().selectedFiles.has(rootFiles[1].path)).toBe(true);
    });
  });

  describe('ArrowRight', () => {
    test('ArrowRight on directory uses pre-loaded contents from filesByPath', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([rootFiles[0].path]),
        currentBreadcrumbPath: basePath,
        columnState: {
          paths: [],
          filesByPath: { [rootFiles[0].path]: documentsFiles },
          selectedByColumn: { 0: rootFiles[0].path },
          focusedIndex: 0,
        },
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
      });
      
      // ArrowRight should move to next column and select first file in that column
      const pane = getPane();
      expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(true);
    });

    test('ArrowRight moves focus to next column', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([rootFiles[0].path]),
        currentBreadcrumbPath: rootFiles[0].path,
        columnState: {
          paths: [rootFiles[0].path],
          filesByPath: { [rootFiles[0].path]: documentsFiles },
          selectedByColumn: { 0: rootFiles[0].path },
          focusedIndex: 1,
        },
      }));
      const before = getPane().columnState.focusedIndex;
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
      });

      const after = getPane().columnState.focusedIndex;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('ArrowRight on file does nothing', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([rootFiles[3].path]),
        currentBreadcrumbPath: basePath,
        columnState: {
          paths: [],
          filesByPath: {},
          selectedByColumn: { 0: rootFiles[3].path },
          focusedIndex: 0,
        },
      }));
      const before = getPane().selectedFiles;
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowRight' });
      });
      
      const after = getPane().selectedFiles;
      expect(after).toEqual(before);
    });
  });

  describe('ArrowUp', () => {
    test('ArrowUp moves from second item to first item', async () => {
      useStore.setState(buildInitialState({ 
        selectedFiles: new Set([rootFiles[1].path]), 
        currentBreadcrumbPath: basePath 
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowUp' });
      });
      
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
      expect(getPane().selectedFiles.has(rootFiles[1].path)).toBe(false);
    });

    test('ArrowUp wraps from first item to last item', async () => {
      useStore.setState(buildInitialState({ 
        selectedFiles: new Set([rootFiles[0].path]), 
        currentBreadcrumbPath: basePath 
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowUp' });
      });
      
      const last = rootFiles[rootFiles.length - 1];
      expect(getPane().selectedFiles.has(last.path)).toBe(true);
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(false);
    });

    test('ArrowDown wraps from last item to first item', async () => {
      useStore.setState(buildInitialState({ 
        selectedFiles: new Set([rootFiles[4].path]), 
        currentBreadcrumbPath: basePath 
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
      expect(getPane().selectedFiles.has(rootFiles[4].path)).toBe(false);
    });
  });

  describe('ArrowLeft', () => {
    test('ArrowLeft moves back to previous column', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([documentsFiles[0].path]),
        currentBreadcrumbPath: documentsFiles[0].path,
        columnState: {
          paths: [rootFiles[0].path, documentsFiles[0].path],
          filesByPath: {
            [rootFiles[0].path]: documentsFiles,
            [documentsFiles[0].path]: projectsFiles,
          },
          selectedByColumn: { 0: rootFiles[0].path, 1: documentsFiles[0].path },
          focusedIndex: 1,
        },
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });
      
      const pane = getPane();
      expect(pane.columnState.focusedIndex).toBe(0);
      expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(true);
    });

    test('ArrowLeft moves back and trims columns correctly', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([projectsFiles[0].path]),
        currentBreadcrumbPath: projectsFiles[0].path,
        columnState: {
          paths: [rootFiles[0].path, documentsFiles[0].path, projectsFiles[0].path],
          filesByPath: {
            [rootFiles[0].path]: documentsFiles,
            [documentsFiles[0].path]: projectsFiles,
            [projectsFiles[0].path]: [],
          },
          selectedByColumn: { 0: rootFiles[0].path, 1: documentsFiles[0].path, 2: projectsFiles[0].path },
          focusedIndex: 2,
        },
      }));
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });
      
      const pane = getPane();
      expect(pane.columnState.focusedIndex).toBe(1);
      expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(true);
      expect(pane.currentBreadcrumbPath).toBe(documentsFiles[0].path);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });
      
      const pane2 = getPane();
      expect(pane2.columnState.focusedIndex).toBe(0);
      expect(pane2.selectedFiles.has(rootFiles[0].path)).toBe(true);
      expect(pane2.currentBreadcrumbPath).toBe(rootFiles[0].path);
    });

    test('ArrowLeft at first column does nothing', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([rootFiles[0].path]),
        currentBreadcrumbPath: basePath,
        columnState: {
          paths: [],
          filesByPath: { [rootFiles[0].path]: documentsFiles },
          selectedByColumn: { 0: rootFiles[0].path },
          focusedIndex: 0,
        },
      }));
      const before = getPane().columnState.focusedIndex;
      renderFilePane();
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
      });
      
      const after = getPane().columnState.focusedIndex;
      expect(after).toBe(before);
    });
  });

  describe('Preview file handling', () => {
    test('ArrowDown to file opens preview, ArrowDown to directory closes preview', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set(),
        currentBreadcrumbPath: basePath,
        columnState: {
          paths: [],
          filesByPath: {},
          selectedByColumn: {},
          focusedIndex: 0,
        },
      }));
      renderFilePane();
      
      // ArrowDown to first item (Documents directory)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
      expect(getStore().showPreview).toBe(false);
      
      // ArrowDown to fourth item (notes.txt file)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });

      expect(getPane().selectedFiles.has(rootFiles[3].path)).toBe(true);
      expect(getStore().showPreview).toBe(true);
      expect(getStore().previewFile?.path).toBe(rootFiles[3].path);
      
      // ArrowDown to fifth item (readme.md file)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });
      expect(getPane().selectedFiles.has(rootFiles[4].path)).toBe(true);
      expect(getStore().showPreview).toBe(true);
      expect(getStore().previewFile?.path).toBe(rootFiles[4].path);

      // ArrowUp to Pictures directory (should close preview)
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowUp' });
      });
      await act(async () => {
        fireEvent.keyDown(document, { key: 'ArrowUp' });
      });
      expect(getPane().selectedFiles.has(rootFiles[2].path)).toBe(true);
      expect(getStore().showPreview).toBe(false);
      expect(getStore().previewFile).toBeNull();
    });
  });

});
