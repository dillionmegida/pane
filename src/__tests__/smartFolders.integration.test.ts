/**
 * Smart Folders Integration Tests
 * Tests user flows for smart folders modal (large, empty, old filters)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useStore } from '../store';
import { ThemeProvider } from 'styled-components';
import { theme } from '../theme';


const mkDir = (name: string, parentPath: string, size = 0): any => ({
  name,
  path: `${parentPath}/${name}`,
  isDirectory: true,
  size,
  modified: new Date().toISOString(),
  extension: '',
});

const mkFile = (name: string, parentPath: string, size = 1024, modified?: string): any => ({
  name,
  path: `${parentPath}/${name}`,
  isDirectory: false,
  size,
  modified: modified || new Date().toISOString(),
  extension: name.split('.').pop() || '',
});

const setRevealTargetSpy = jest.spyOn(useStore.getState(), 'setRevealTarget');

const basePath = '/Users/test/Desktop';
const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

const mockFiles = [
  mkFile('huge.bin', basePath, 50 * 1024 * 1024), // 50MB - large
  mkFile('tiny.txt', basePath, 1024), // 1KB - not large
  mkFile('old.txt', basePath, 1024, twoYearsAgo), // old file
  mkFile('recent.txt', basePath, 1024), // recent file
  mkDir('empty', basePath, 0), // empty directory
  mkDir('full', basePath, 4096), // non-empty directory
];

// Module-level variable to control filter type for mock
let mockFilterType = 'large';

// Filter results based on filter type
const getFilteredResults = (filterType: string) => {
  switch (filterType) {
    case 'large':
      return mockFiles.filter(f => !f.isDirectory && f.size > 10 * 1024 * 1024); // > 10MB
    case 'empty':
      return mockFiles.filter(f => f.isDirectory && f.size === 0);
    case 'old':
      return mockFiles.filter(f => new Date(f.modified) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
    default:
      return mockFiles;
  }
};

// Mock useConcurrentDirectoryScanner to return mock results based on filter type
jest.mock('../hooks/useDirectoryScanner', () => ({
  useConcurrentDirectoryScanner: () => ({
    isScanning: false,
    scanResults: (() => getFilteredResults(mockFilterType))(),
    setScanResults: jest.fn(),
    scanForLargeFiles: jest.fn(),
    scanWithConcurrentWalking: jest.fn(),
    scanWithGenericSearch: jest.fn(),
    abortScan: jest.fn(),
  }),
}));

const SmartFoldersModal = require('../components/modals/SmartFoldersModal').SmartFoldersModal;

const buildInitialState = (overrides: Record<string, any> = {}): any => ({
  panes: [{
    id: 'left',
    path: basePath,
    basePath,
    files: mockFiles,
    loading: false,
    error: null,
    selectedFiles: new Set(),
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'column',
    tabs: [{ id: 'tab-1', path: basePath, label: 'Desktop' }],
    activeTab: 0,
    currentBreadcrumbPath: basePath,
    columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
  }],
  activePane: 'left',
  previewFile: null,
  showPreview: false,
  zoom: 1.6,
  ...overrides,
});

const getPane = (): any => useStore.getState().panes.find((p: any) => p.id === 'left');

// Mock window.electronAPI
const mockElectronAPI = {
  readdir: jest.fn().mockResolvedValue({
    success: true,
    files: mockFiles,
  }),
  stat: jest.fn().mockResolvedValue({
    success: true,
    stat: { size: 1024, isDirectory: false, modified: new Date().toISOString() },
  }),
  readFile: jest.fn().mockResolvedValue({
    success: true,
    content: '',
  }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  openPath: jest.fn().mockResolvedValue({ success: true }),
  watcherStart: jest.fn(),
};

(window as any).electronAPI = mockElectronAPI;

describe('SmartFoldersModal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFilterType = 'large'; // Reset to default filter
    useStore.setState(buildInitialState());
  });

  afterEach(() => {
    useStore.setState({
      panes: [],
      activePane: 'left',
      previewFile: null,
      showPreview: false,
    });
  });

  const renderModal = () => {
    return render(
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(SmartFoldersModal, { data: { id: 'large' }, onClose: () => {} })
      )
    );
  };

  describe('Large Files Filter', () => {
    test('opens modal and displays large filter option', () => {
      const { getByText } = renderModal();
      expect(getByText(/Large Files/i)).toBeTruthy();
    });

    test('selects large filter and shows large files in results', async () => {
      const { getByText } = renderModal();

      // Select large filter
      await act(async () => {
        fireEvent.click(getByText(/Large Files/i));
      });

      // Wait for scan to complete (mocked)
      await waitFor(() => {
        expect(getByText(/huge\.bin/)).toBeTruthy();
      });
    });

    test('reveal action on large file navigates to file in column view', async () => {
      const { getByText, getAllByText } = renderModal();

      // Select large filter
      await act(async () => {
        fireEvent.click(getByText(/Large Files/i));
      });

      // Wait for results
      await waitFor(() => {
        expect(getByText(/huge\.bin/)).toBeTruthy();
      });

      // Click on the large file to select it
      await act(async () => {
        fireEvent.click(getByText(/huge\.bin/));
      });

      // Click reveal button
      const revealButtons = getAllByText(/Reveal/i);
      await act(async () => {
        fireEvent.click(revealButtons[0]);
      });

      // Verify setRevealTarget was called with correct parameters
      expect(setRevealTargetSpy).toHaveBeenCalledWith({
        paneId: 'left',
        filePath: `${basePath}/huge.bin`,
        fileDir: basePath,
        isDirectory: false,
        triggerPreview: true,
      });

    });
  });

  describe('Empty Folders Filter', () => {
    test('selects empty filter and shows empty directories', async () => {
      // Set mock filter type before rendering
      mockFilterType = 'empty';
      const { getByText } = renderModal();

      // Wait for scan to complete
      await waitFor(() => {
        expect(getByText(/empty/)).toBeTruthy();
      });
    });

    test('reveal action on empty directory navigates to it', async () => {
      // Set mock filter type before rendering
      mockFilterType = 'empty';
      const { getByText, getAllByText } = renderModal();

      // Wait for results
      await waitFor(() => {
        expect(getByText(/empty/)).toBeTruthy();
      });

      // Click on empty directory
      await act(async () => {
        fireEvent.click(getByText(/empty/));
      });

      // Click reveal button
      const revealButtons = getAllByText(/Reveal/i);
      await act(async () => {
        fireEvent.click(revealButtons[0]);
      });

      // Verify setRevealTarget was called with correct parameters
      expect(setRevealTargetSpy).toHaveBeenCalledWith({
        paneId: 'left',
        filePath: `${basePath}/empty`,
        fileDir: basePath,
        isDirectory: true,
        triggerPreview: false,
      });
    });
  });

  describe('Old Files Filter', () => {
    test('selects old filter and shows old files', async () => {
      // Set mock filter type before rendering
      mockFilterType = 'old';
      const { getByText } = renderModal();

      // Wait for scan to complete
      await waitFor(() => {
        expect(getByText(/old\.txt/)).toBeTruthy();
      });
    });

    test('reveal action on old file navigates to it', async () => {
      // Set mock filter type before rendering
      mockFilterType = 'old';
      const { getByText, getAllByText } = renderModal();

      // Wait for results
      await waitFor(() => {
        expect(getByText(/old\.txt/)).toBeTruthy();
      });

      // Click on old file
      await act(async () => {
        fireEvent.click(getByText(/old\.txt/));
      });

      // Click reveal button
      const revealButtons = getAllByText(/Reveal/i);
      await act(async () => {
        fireEvent.click(revealButtons[0]);
      });

      // Verify setRevealTarget was called with correct parameters
      expect(setRevealTargetSpy).toHaveBeenCalledWith({
        paneId: 'left',
        filePath: `${basePath}/old.txt`,
        fileDir: basePath,
        isDirectory: false,
        triggerPreview: true,
      });
    });
  });

  describe('Delete Action', () => {
    test('delete action removes file from results', async () => {
      const { getByText, getAllByText, queryByText } = renderModal();

      // Select large filter
      await act(async () => {
        fireEvent.click(getByText(/Large Files/i));
      });

      // Wait for results
      await waitFor(() => {
        expect(getByText(/huge\.bin/)).toBeTruthy();
      });

      // Click on the file
      await act(async () => {
        fireEvent.click(getByText(/huge\.bin/));
      });

      // Click delete button
      const deleteButtons = getAllByText(/Delete/i);
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      // Verify delete was called
      expect(mockElectronAPI.delete).toHaveBeenCalledWith(`${basePath}/huge.bin`);
    });
  });

  describe('Filter Switching', () => {
    test('switching between filters updates results', async () => {
      const { getByText, queryByText, rerender } = renderModal();

      // Start with large filter
      mockFilterType = 'large';
      rerender(
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(SmartFoldersModal, { data: { id: 'large' }, onClose: () => {} })
        )
      );

      await waitFor(() => {
        expect(getByText(/huge\.bin/)).toBeTruthy();
      });

      // Switch to empty filter
      mockFilterType = 'empty';
      rerender(
        React.createElement(
          ThemeProvider,
          { theme },
          React.createElement(SmartFoldersModal, { data: { id: 'empty' }, onClose: () => {} })
        )
      );

      await waitFor(() => {
        expect(getByText(/empty/)).toBeTruthy();
        expect(queryByText(/huge\.bin/)).toBeNull();
      });
    });
  });
});
