import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useStore } from '../store';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '../theme';

// Mock FilePane dependencies
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

// Import components after mocking
const FilePane = require('../components/filePane/FilePane').default;

const mkFile = (name: string, parentPath: string, ext = ''): any => ({
  name, path: `${parentPath}/${name}`, isDirectory: false, size: 1024,
  modified: new Date().toISOString(), extension: ext || name.split('.').pop(),
});

const basePath = '/Users/test';
const testFiles = [
  mkFile('file1.txt', basePath, 'txt'),
  mkFile('file2.txt', basePath, 'txt'),
  mkFile('file3.txt', basePath, 'txt'),
  mkFile('file4.txt', basePath, 'txt'),
  mkFile('file5.txt', basePath, 'txt'),
  mkFile('file6.txt', basePath, 'txt'),
  mkFile('file7.txt', basePath, 'txt'),
  mkFile('file8.txt', basePath, 'txt'),
  mkFile('file9.txt', basePath, 'txt'),
  mkFile('file10.txt', basePath, 'txt'),
];

const buildInitialState = (overrides: Record<string, any> = {}): any => ({
  panes: [{
    id: 'left', path: basePath, basePath, files: testFiles,
    loading: false, error: null, selectedFiles: new Set(), lastSelectedFile: null,
    selectionColumnIndex: null,
    sortBy: 'name', sortOrder: 'asc', viewMode: 'list',
    tabs: [{ 
      id: 'tab-1', path: basePath, basePath, currentBreadcrumbPath: basePath,
      label: 'test', files: testFiles, selectedFiles: new Set(),
      activeBookmarkId: null, viewMode: 'list', sortBy: 'name', sortOrder: 'asc',
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
      previewFile: null, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
    }],
    activeTab: 0, currentBreadcrumbPath: basePath,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
    activeBookmarkId: null,
    ...overrides,
  }],
  activePane: 'left', previewFile: null, showPreview: false,
});

const getPane = (): any => useStore.getState().panes.find((p: any) => p.id === 'left');

// Mock window.electronAPI
const mockElectronAPI = {
  readdir: jest.fn().mockResolvedValue({ success: true, files: [] }),
  watcherStart: jest.fn(),
  getTags: jest.fn().mockResolvedValue({ success: true, tags: [] }),
  folderSize: jest.fn().mockResolvedValue({ success: true, tree: { size: 1024 } }),
  getDefaultApp: jest.fn().mockResolvedValue({ success: true, app: 'TextEdit' }),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

describe('Multi-Select Integration - Column View with Real Mouse Events', () => {
  const mkDir = (name: string, parentPath: string): any => ({
    name, path: `${parentPath}/${name}`, isDirectory: true, size: 0,
    modified: new Date().toISOString(), extension: '',
  });

  const basePath = '/Users/test';
  const columnFiles = [
    mkDir('folder1', basePath),
    mkDir('folder2', basePath),
    mkDir('folder3', basePath),
    mkFile('file1.txt', basePath, 'txt'),
    mkFile('file2.txt', basePath, 'txt'),
    mkFile('file3.txt', basePath, 'txt'),
    mkFile('file4.txt', basePath, 'txt'),
    mkFile('file5.txt', basePath, 'txt'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useStore.setState({
        panes: [{
          id: 'left', path: basePath, basePath, files: columnFiles,
          loading: false, error: null, selectedFiles: new Set(), lastSelectedFile: null,
          selectionColumnIndex: null,
          sortBy: 'name', sortOrder: 'asc', viewMode: 'column',
          tabs: [{ 
            id: 'tab-1', path: basePath, basePath, currentBreadcrumbPath: basePath,
            label: 'test', files: columnFiles, selectedFiles: new Set(),
            activeBookmarkId: null, viewMode: 'column', sortBy: 'name', sortOrder: 'asc',
            columnState: { paths: [], filesByPath: { [basePath]: columnFiles }, selectedByColumn: {}, focusedIndex: 0 },
            previewFile: null, navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
          }],
          activeTab: 0, currentBreadcrumbPath: basePath,
          columnState: { paths: [], filesByPath: { [basePath]: columnFiles }, selectedByColumn: {}, focusedIndex: 0 },
          navigationHistory: [], navigationIndex: -1, _isRestoringHistory: false,
          activeBookmarkId: null,
        }],
        activePane: 'left',
      });
    });
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

  test('Shift+click in column view selects range', async () => {
    renderFilePane();
    
    // Click file1.txt
    const file1 = screen.getByText('file1.txt');
    await act(async () => {
      fireEvent.click(file1);
    });
    
    expect(getPane().lastSelectedFile).toBe(columnFiles[3].path);
    
    // Shift+click file4.txt
    const file4 = screen.getByText('file4.txt');
    await act(async () => {
      fireEvent.click(file4, { shiftKey: true });
    });
    
    // Should select file1.txt, file2.txt, file3.txt, file4.txt
    expect(getPane().selectedFiles.size).toBe(4);
    expect(getPane().selectedFiles.has(columnFiles[3].path)).toBe(true);
    expect(getPane().selectedFiles.has(columnFiles[4].path)).toBe(true);
    expect(getPane().selectedFiles.has(columnFiles[5].path)).toBe(true);
    expect(getPane().selectedFiles.has(columnFiles[6].path)).toBe(true);
  });

  test('Cmd+Shift combination in column view', async () => {
    renderFilePane();
    
    // Click folder1
    const folder1 = screen.getByText('folder1');
    await act(async () => {
      fireEvent.click(folder1);
    });
    
    // Shift+click folder3 (selects folder1, folder2, folder3)
    const folder3 = screen.getByText('folder3');
    await act(async () => {
      fireEvent.click(folder3, { shiftKey: true });
    });
    
    expect(getPane().selectedFiles.size).toBe(3);
    
    // Cmd+click file2.txt (adds file2.txt)
    const file2 = screen.getByText('file2.txt');
    await act(async () => {
      fireEvent.click(file2, { metaKey: true });
    });
    
    expect(getPane().selectedFiles.size).toBe(4);
    expect(getPane().lastSelectedFile).toBe(columnFiles[4].path);
    
    // Shift+click file4.txt (should add file2, file3, file4)
    const file4 = screen.getByText('file4.txt');
    await act(async () => {
      fireEvent.click(file4, { shiftKey: true });
    });
    
    // Should have folder1, folder2, folder3, file2, file3, file4
    expect(getPane().selectedFiles.size).toBe(6);
    expect(getPane().selectedFiles.has(columnFiles[0].path)).toBe(true); // folder1
    expect(getPane().selectedFiles.has(columnFiles[1].path)).toBe(true); // folder2
    expect(getPane().selectedFiles.has(columnFiles[2].path)).toBe(true); // folder3
    expect(getPane().selectedFiles.has(columnFiles[4].path)).toBe(true); // file2
    expect(getPane().selectedFiles.has(columnFiles[5].path)).toBe(true); // file3
    expect(getPane().selectedFiles.has(columnFiles[6].path)).toBe(true); // file4
  });

  test('Cross-column multi-selection should be restricted', async () => {
    // Mock readdir to return files for folder1
    const folder1Files = [
      mkFile('nested1.txt', '/Users/test/folder1', 'txt'),
      mkFile('nested2.txt', '/Users/test/folder1', 'txt'),
      mkFile('nested3.txt', '/Users/test/folder1', 'txt'),
    ];
    
    (window.electronAPI.readdir as jest.Mock).mockResolvedValue({
      success: true,
      files: folder1Files,
    });

    renderFilePane();
    
    // Select file1.txt in column 0
    const file1 = screen.getByText('file1.txt');
    await act(async () => {
      fireEvent.click(file1);
    });
    
    expect(getPane().selectedFiles.size).toBe(1);
    expect(getPane().selectedFiles.has(columnFiles[3].path)).toBe(true);
    expect(getPane().selectionColumnIndex).toBe(0);
    
    // Cmd+click file2.txt in same column - should add to selection
    const file2 = screen.getByText('file2.txt');
    await act(async () => {
      fireEvent.click(file2, { metaKey: true });
    });
    
    expect(getPane().selectedFiles.size).toBe(2);
    expect(getPane().selectedFiles.has(columnFiles[3].path)).toBe(true);
    expect(getPane().selectedFiles.has(columnFiles[4].path)).toBe(true);
    expect(getPane().selectionColumnIndex).toBe(0);
    
    // Click folder1 to open column 1
    const folder1 = screen.getByText('folder1');
    await act(async () => {
      fireEvent.click(folder1);
    });
    
    // Wait for column to populate
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Now try to Cmd+click a file in column 1 - should clear column 0 selections
    const nested1 = await screen.findByText('nested1.txt');
    await act(async () => {
      fireEvent.click(nested1, { metaKey: true });
    });
    
    // Should only have nested1.txt selected (column 0 selections cleared)
    expect(getPane().selectedFiles.size).toBe(1);
    expect(getPane().selectedFiles.has(folder1Files[0].path)).toBe(true);
    expect(getPane().selectedFiles.has(columnFiles[3].path)).toBe(false);
    expect(getPane().selectedFiles.has(columnFiles[4].path)).toBe(false);
    expect(getPane().selectionColumnIndex).toBe(1);
  });
});
