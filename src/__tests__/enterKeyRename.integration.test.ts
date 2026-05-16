/**
 * Enter Key Rename Integration Tests
 * Tests that pressing Enter on a selected file triggers rename mode
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useStore } from '../store';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '../theme';

// Mock only non-essential FilePane dependencies
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

// Mock window.electronAPI
const mockElectronAPI = {
  readdir: jest.fn(),
  watcherStart: jest.fn(),
  getTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  folderSize: jest.fn().mockResolvedValue({ success: true, tree: { size: 1024 } }),
  rename: jest.fn().mockResolvedValue({ success: true }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('Enter Key Rename Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock scrollIntoView for testing
    Element.prototype.scrollIntoView = jest.fn();
    // Mock readdir to return directory contents
    mockElectronAPI.readdir.mockImplementation(async (path: string) => {
      if (path === basePath) return { success: true, files: rootFiles };
      if (path === `${basePath}/Documents`) return { success: true, files: [] };
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


  describe('Column View', () => {
    test('Enter key on selected file in column view triggers rename', async () => {
      useStore.setState(buildInitialState({
        selectedFiles: new Set([rootFiles[0].path]),
        currentBreadcrumbPath: basePath,
        viewMode: 'column',
        columnState: {
          paths: [],
          filesByPath: { [basePath]: rootFiles },
          selectedByColumn: { 0: rootFiles[0].path },
          focusedIndex: 0,
        },
      }));
      
      const { container } = renderFilePane();
      
      const paneBefore = getPane();
      expect(paneBefore.selectedFiles.has(rootFiles[0].path)).toBe(true);
      
      // Press Enter to trigger rename mode
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Enter' });
      });
      
      // Verify rename input appears in the DOM
      const renameInput = container.querySelector('input');
      expect(renameInput).toBeTruthy();
      expect(renameInput?.getAttribute('value')).toBe(rootFiles[0].name);

      await act(async () => {
        fireEvent.change(renameInput!, { target: { value: 'direct' } });
      });
      
      await act(async () => {
        fireEvent.keyDown(renameInput!, { key: 'Enter' });
      });
      
      // Verify rename input is no longer visible (rename completed)
      const renameInputAfter = container.querySelector('input');
      expect(renameInputAfter).toBeFalsy();

      const paneAfter = getPane();
      expect(paneAfter.selectedFiles.has(`${basePath}/direct`)).toBe(true);
    });

    test('Enter key on file in nested column triggers rename mode', async () => {
      const documentsFiles = [
        mkDir('Projects', `${basePath}/Documents`),
        mkFile('todo.txt', `${basePath}/Documents`, 'txt'),
      ];
      
      useStore.setState(buildInitialState({
        selectedFiles: new Set([documentsFiles[1].path]),
        currentBreadcrumbPath: rootFiles[0].path,
        viewMode: 'column',
        columnState: {
          paths: [rootFiles[0].path],
          filesByPath: {
            [basePath]: rootFiles,
            [rootFiles[0].path]: documentsFiles,
          },
          selectedByColumn: { 0: rootFiles[0].path, 1: documentsFiles[1].path },
          focusedIndex: 1,
        },
      }));
      
      const { container } = renderFilePane();
      
      const paneBefore = getPane();
      expect(paneBefore.selectedFiles.has(documentsFiles[1].path)).toBe(true);
      
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Enter' });
      });
      
      // Verify rename input appears in the DOM
      const renameInput = container.querySelector('input');
      expect(renameInput).toBeTruthy();
      expect(renameInput?.getAttribute('value')).toBe(documentsFiles[1].name);

      await act(async () => {
        fireEvent.change(renameInput!, { target: { value: 'a.txt' } });
      });
      
      await act(async () => {
        fireEvent.keyDown(renameInput!, { key: 'Enter' });
      });
      
      // Verify rename input is no longer visible (rename completed)
      const renameInputAfter = container.querySelector('input');
      expect(renameInputAfter).toBeFalsy();

      const paneAfter = getPane();
      expect(paneAfter.selectedFiles.has(`${basePath}/Documents/a.txt`)).toBe(true);
    });
  });

});
