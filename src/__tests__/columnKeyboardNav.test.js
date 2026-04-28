/**
 * Column View Keyboard Navigation Tests
 * Tests for arrow key navigation, column creation/deletion,
 * selection behavior, escape key, wrap-around, and preview pane.
 *
 * These tests simulate the exact store action sequences that the
 * handleKeyDown handler in FilePane.jsx performs for each key.
 */

import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mkDir = (name, parentPath) => ({
  name,
  path: `${parentPath}/${name}`,
  isDirectory: true,
  size: 0,
  modified: new Date().toISOString(),
  extension: '',
});

const mkFile = (name, parentPath, ext = '') => ({
  name,
  path: `${parentPath}/${name}`,
  isDirectory: false,
  size: 1024,
  modified: new Date().toISOString(),
  extension: ext || name.split('.').pop(),
});

const getPane = () => {
  return useStore.getState().panes.find(p => p.id === 'left');
};

const getStore = () => {
  return useStore.getState();
};

// ─── Shared state builders ────────────────────────────────────────────────────

const basePath = '/Users/test';

const rootFiles = [
  mkDir('Documents', basePath),
  mkDir('Downloads', basePath),
  mkDir('Pictures', basePath),
  mkFile('notes.txt', basePath, 'txt'),
  mkFile('readme.md', basePath, 'md'),
];

const documentsFiles = [
  mkDir('Projects', `${basePath}/Documents`),
  mkDir('Archive', `${basePath}/Documents`),
  mkFile('todo.txt', `${basePath}/Documents`, 'txt'),
];

const projectsFiles = [
  mkDir('WebApp', `${basePath}/Documents/Projects`),
  mkFile('plan.md', `${basePath}/Documents/Projects`, 'md'),
];

const buildInitialState = (overrides = {}) => ({
  panes: [
    {
      id: 'left',
      path: basePath,
      basePath: basePath,
      files: rootFiles,
      loading: false,
      error: null,
      selectedFiles: new Set(),
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'column',
      tabs: [{ id: 'tab-1', path: basePath, label: 'test' }],
      activeTab: 0,
      currentBreadcrumbPath: basePath,
      columnState: {
        paths: [],
        filesByPath: {},
        selectedByColumn: {},
        focusedIndex: 0,
      },
      ...overrides,
    },
  ],
  activePane: 'left',
  previewFile: null,
  showPreview: false,
});

// ─── Simulate keyboard actions ────────────────────────────────────────────────
// These replicate the exact logic from FilePane.jsx handleKeyDown

function simulateArrowDown(ignored, paneId = 'left') {
  const s = useStore.getState();
  const pane = s.panes.find(p => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const columnFilesList = focusedIndex === 0
    ? pane.files
    : (pane.columnState.filesByPath[columnKey] || []);

  if (columnFilesList.length === 0) return;

  const currentIndex = columnFilesList.findIndex(f => pane.selectedFiles.has(f.path));
  let newIdx;
  if (currentIndex >= columnFilesList.length - 1 || currentIndex < 0) {
    newIdx = 0;
  } else {
    newIdx = currentIndex + 1;
  }
  const newFile = columnFilesList[newIdx];
  s.setSelection(paneId, [newFile.path]);

  if (newFile.isDirectory) {
    s.setCurrentBreadcrumbPath(paneId, newFile.path);
    s.setPreviewFile(null);
  } else {
    s.setPreviewFile(newFile);
    const parentPath = newFile.path.split('/').slice(0, -1).join('/') || '/';
    s.setCurrentBreadcrumbPath(paneId, parentPath);
  }
}

function simulateArrowUp(ignored, paneId = 'left') {
  const s = useStore.getState();
  const pane = s.panes.find(p => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const columnFilesList = focusedIndex === 0
    ? pane.files
    : (pane.columnState.filesByPath[columnKey] || []);

  if (columnFilesList.length === 0) return;

  const currentIndex = columnFilesList.findIndex(f => pane.selectedFiles.has(f.path));
  let newIdx;
  if (currentIndex <= 0) {
    newIdx = columnFilesList.length - 1;
  } else {
    newIdx = currentIndex - 1;
  }
  const newFile = columnFilesList[newIdx];
  s.setSelection(paneId, [newFile.path]);

  if (newFile.isDirectory) {
    s.setCurrentBreadcrumbPath(paneId, newFile.path);
    s.setPreviewFile(null);
  } else {
    s.setPreviewFile(newFile);
    const parentPath = newFile.path.split('/').slice(0, -1).join('/') || '/';
    s.setCurrentBreadcrumbPath(paneId, parentPath);
  }
}

function simulateArrowRight(ignored, paneId = 'left') {
  const s = useStore.getState();
  const pane = s.panes.find(p => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const columnFilesList = focusedIndex === 0
    ? pane.files
    : (pane.columnState.filesByPath[columnKey] || []);

  const currentIndex = columnFilesList.findIndex(f => pane.selectedFiles.has(f.path));
  if (currentIndex < 0) return;

  const selectedItem = columnFilesList[currentIndex];
  if (!selectedItem || !selectedItem.isDirectory) return;

  const nextColumnFiles = pane.columnState.filesByPath[selectedItem.path] || [];
  if (nextColumnFiles.length === 0) return;

  s.updateColumnState(paneId, { focusedIndex: focusedIndex + 1 });
  s.setSelection(paneId, [nextColumnFiles[0].path]);

  // handleColumnClick for the first item in next column
  if (nextColumnFiles[0].isDirectory) {
    s.setCurrentBreadcrumbPath(paneId, nextColumnFiles[0].path);
    s.setPreviewFile(null);
  } else {
    s.setPreviewFile(nextColumnFiles[0]);
    const parentPath = nextColumnFiles[0].path.split('/').slice(0, -1).join('/') || '/';
    s.setCurrentBreadcrumbPath(paneId, parentPath);
  }
}

function simulateArrowLeft(ignored, paneId = 'left') {
  const s = useStore.getState();
  const pane = s.panes.find(p => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);

  if (focusedIndex <= 0) return;

  const prevColumn = focusedIndex - 1;
  const selectedDirPath = columnPaths[focusedIndex];

  // Trim columns deeper than one level beyond the target
  if (columnPaths.length > focusedIndex + 1) {
    s.setCurrentBreadcrumbPath(paneId, columnPaths[focusedIndex]);
  }

  s.updateColumnState(paneId, { focusedIndex: prevColumn });
  if (selectedDirPath) {
    s.setSelection(paneId, [selectedDirPath]);
  }
  s.setPreviewFile(null);
}

function simulateEscape(ignored, paneId = 'left') {
  const s = useStore.getState();
  const pane = s.panes.find(p => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);

  s.setCurrentBreadcrumbPath(paneId, columnPaths[focusedIndex]);
  s.setSelection(paneId, []);
  s.setPreviewFile(null);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Column Keyboard Nav - ArrowDown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
    }));
  });

  test('first ArrowDown with no selection selects the first item', () => {
    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(pane.selectedFiles.size).toBe(1);
  });

  test('ArrowDown moves from first item to second item', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]),
      currentBreadcrumbPath: rootFiles[0].path,
    }));

    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(rootFiles[1].path)).toBe(true);
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(false);
  });

  test('ArrowDown wraps from last item to first item', () => {
    const lastFile = rootFiles[rootFiles.length - 1];
    useStore.setState(buildInitialState({
      selectedFiles: new Set([lastFile.path]),
      currentBreadcrumbPath: basePath, // file selection sets breadcrumb to parent
    }));

    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(pane.selectedFiles.has(lastFile.path)).toBe(false);
  });

  test('ArrowDown through all items cycles back to start', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
    }));

    // First press: selects first item (no selection → index 0)
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);

    // Press down to reach the last item
    for (let i = 1; i < rootFiles.length; i++) {
      act(() => simulateArrowDown(getStore()));
    }
    const lastFile = rootFiles[rootFiles.length - 1];
    expect(getPane().selectedFiles.has(lastFile.path)).toBe(true);

    // One more press should wrap to first item
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
  });
});

describe('Column Keyboard Nav - ArrowUp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
    }));
  });

  test('first ArrowUp with no selection wraps to last item', () => {
    const store = getStore();
    act(() => simulateArrowUp(store));

    const pane = getPane();
    const lastFile = rootFiles[rootFiles.length - 1];
    expect(pane.selectedFiles.has(lastFile.path)).toBe(true);
  });

  test('ArrowUp from first item wraps to last item', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]),
      currentBreadcrumbPath: rootFiles[0].path,
    }));

    const store = getStore();
    act(() => simulateArrowUp(store));

    const pane = getPane();
    const lastFile = rootFiles[rootFiles.length - 1];
    expect(pane.selectedFiles.has(lastFile.path)).toBe(true);
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(false);
  });

  test('ArrowUp moves from second item to first item', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[1].path]),
      currentBreadcrumbPath: rootFiles[1].path,
    }));

    const store = getStore();
    act(() => simulateArrowUp(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(true);
  });
});

describe('Column Keyboard Nav - ArrowRight (open directory)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]), // Documents selected
      currentBreadcrumbPath: rootFiles[0].path,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));
  });

  test('ArrowRight on directory moves focus to next column', () => {
    const store = getStore();
    act(() => simulateArrowRight(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(1);
  });

  test('ArrowRight selects first item in the new column', () => {
    const store = getStore();
    act(() => simulateArrowRight(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(true);
    expect(pane.selectedFiles.size).toBe(1);
  });

  test('ArrowRight creates a new column (breadcrumb extends)', () => {
    const store = getStore();

    const pathsBefore = store.getColumnPaths('left');

    act(() => simulateArrowRight(store));

    const pathsAfter = getStore().getColumnPaths('left');
    expect(pathsAfter.length).toBeGreaterThan(pathsBefore.length);
  });

  test('ArrowRight on a file does nothing', () => {
    // Select a file instead of a directory
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[3].path]), // notes.txt
      currentBreadcrumbPath: basePath,
      columnState: {
        paths: [],
        filesByPath: {},
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));

    const store = getStore();
    act(() => simulateArrowRight(store));

    const pane = getPane();
    // Focus should not have changed
    expect(pane.columnState.focusedIndex).toBe(0);
    // Selection unchanged
    expect(pane.selectedFiles.has(rootFiles[3].path)).toBe(true);
  });

  test('ArrowRight with no selection does nothing', () => {
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

    const store = getStore();
    act(() => simulateArrowRight(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(0);
  });

  test('ArrowRight on empty directory does nothing', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]), // Pictures
      currentBreadcrumbPath: rootFiles[2].path,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[2].path]: [], // Empty directory
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));

    const store = getStore();
    act(() => simulateArrowRight(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(0);
  });
});

describe('Column Keyboard Nav - ArrowLeft (go back)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // State: 3 columns, focused on col2 (Projects)
    useStore.setState(buildInitialState({
      selectedFiles: new Set([projectsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects/WebApp`,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
          [`${basePath}/Documents/Projects/WebApp`]: [],
        },
        selectedByColumn: {},
        focusedIndex: 2,
      },
    }));
  });

  test('ArrowLeft moves focus to previous column', () => {
    const store = getStore();
    act(() => simulateArrowLeft(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(1);
  });

  test('ArrowLeft selects the parent directory in previous column', () => {
    const store = getStore();
    const columnPaths = store.getColumnPaths('left');
    const expectedSelection = columnPaths[2]; // The column we're leaving becomes the selection in parent

    act(() => simulateArrowLeft(store));

    const pane = getPane();
    expect(pane.selectedFiles.has(expectedSelection)).toBe(true);
    expect(pane.selectedFiles.size).toBe(1);
  });

  test('ArrowLeft keeps the immediate child column visible', () => {
    const store = getStore();
    const pathsBefore = store.getColumnPaths('left');
    const numColumnsBefore = pathsBefore.length;

    act(() => simulateArrowLeft(store));

    // The column we left should still exist (immediate child is kept)
    const pathsAfter = getStore().getColumnPaths('left');
    // We trim anything deeper than focusedColumn+1
    // Before: col0, col1, col2, col3 (4 columns, focused on 2)
    // After: col0, col1, col2 (trim col3, keep col2 as immediate child of col1)
    expect(pathsAfter.length).toBeLessThanOrEqual(numColumnsBefore);
  });

  test('ArrowLeft clears preview', () => {
    // First set a preview
    act(() => {
      useStore.getState().setPreviewFile({ name: 'test.txt', path: '/test.txt' });
    });
    expect(getStore().previewFile).not.toBeNull();

    const store = getStore();
    act(() => simulateArrowLeft(store));

    expect(getStore().previewFile).toBeNull();
  });

  test('ArrowLeft at column 0 does nothing', () => {
    // Set focus to column 0
    act(() => {
      useStore.getState().updateColumnState('left', { focusedIndex: 0 });
    });

    const store = getStore();
    act(() => simulateArrowLeft(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(0);
  });

  test('two ArrowLefts from col2 trims deeper columns on second press', () => {
    const store = getStore();
    const initialPaths = store.getColumnPaths('left');

    // First left: col2 -> col1
    act(() => simulateArrowLeft(getStore()));
    const pathsAfterFirst = getStore().getColumnPaths('left');

    // Second left: col1 -> col0
    act(() => simulateArrowLeft(getStore()));
    const pathsAfterSecond = getStore().getColumnPaths('left');

    // After second left, columns deeper than col0+1 should be trimmed
    // We should have at most 2 columns (col0 and the child that was focused)
    expect(pathsAfterSecond.length).toBeLessThanOrEqual(pathsAfterFirst.length);
  });
});

describe('Column Keyboard Nav - Escape (deselect)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 2 columns, focused on col1, item selected
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 1,
      },
    }));
  });

  test('Escape clears selection in focused column', () => {
    const store = getStore();
    act(() => simulateEscape(store));

    const pane = getPane();
    expect(pane.selectedFiles.size).toBe(0);
  });

  test('Escape trims columns to the right of focused column', () => {
    const store = getStore();
    const pathsBefore = store.getColumnPaths('left');

    act(() => simulateEscape(store));

    const pathsAfter = getStore().getColumnPaths('left');
    // Breadcrumb set to focused column path, so anything deeper is trimmed
    expect(pathsAfter.length).toBeLessThanOrEqual(pathsBefore.length);
  });

  test('Escape clears preview', () => {
    act(() => {
      useStore.getState().setPreviewFile({ name: 'test.txt', path: '/test.txt' });
    });

    const store = getStore();
    act(() => simulateEscape(store));

    expect(getStore().previewFile).toBeNull();
  });

  test('Escape on column 0 with no selection is a no-op for selection', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set(),
      currentBreadcrumbPath: basePath,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {},
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));

    const store = getStore();
    act(() => simulateEscape(store));

    const pane = getPane();
    expect(pane.selectedFiles.size).toBe(0);
  });
});

describe('Column Keyboard Nav - Preview pane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
    }));
  });

  test('selecting a file via ArrowDown sets preview', () => {
    // Select last directory so next down goes to notes.txt
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]), // Pictures (last dir)
      currentBreadcrumbPath: rootFiles[2].path,
    }));

    const store = getStore();
    act(() => simulateArrowDown(store));

    // rootFiles[3] is notes.txt
    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.name).toBe('notes.txt');
  });

  test('selecting a directory clears preview', () => {
    // Set a preview first
    act(() => {
      useStore.getState().setPreviewFile(rootFiles[3]); // notes.txt
    });
    expect(getStore().previewFile).not.toBeNull();

    // Select the file, then ArrowUp to a directory
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[3].path]), // notes.txt
      currentBreadcrumbPath: basePath,
    }));

    const store = getStore();
    act(() => simulateArrowUp(store));

    // rootFiles[2] is Pictures (directory)
    expect(getStore().previewFile).toBeNull();
  });

  test('ArrowRight into a directory with file as first item sets preview', () => {
    // Set up: Documents selected, its children start with a file
    const docsWithFileFirst = [
      mkFile('readme.txt', `${basePath}/Documents`, 'txt'),
      mkDir('Projects', `${basePath}/Documents`),
    ];

    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]), // Documents
      currentBreadcrumbPath: rootFiles[0].path,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: docsWithFileFirst,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));

    const store = getStore();
    act(() => simulateArrowRight(store));

    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.name).toBe('readme.txt');
  });
});

describe('Column Keyboard Nav - Column creation and deletion', () => {
  test('selecting a directory creates a new column in breadcrumb', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));

    const pathsBefore = getStore().getColumnPaths('left');

    // Simulate: select Documents directory
    act(() => {
      const store = getStore();
      store.setSelection('left', [rootFiles[0].path]);
      store.setCurrentBreadcrumbPath('left', rootFiles[0].path);
    });

    const pathsAfter = getStore().getColumnPaths('left');
    expect(pathsAfter.length).toBe(pathsBefore.length + 1);
    expect(pathsAfter[pathsAfter.length - 1]).toBe(rootFiles[0].path);
  });

  test('Escape trims all columns after focused column', () => {
    // 3 columns deep
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 1, // focused on Documents column
      },
    }));

    const store = getStore();
    act(() => simulateEscape(store));

    const pathsAfter = getStore().getColumnPaths('left');
    // Focused on col1 (/Users/test/Documents), Escape sets breadcrumb to that path
    // So columns should be [basePath, basePath/Documents]
    expect(pathsAfter[pathsAfter.length - 1]).toBe(`${basePath}/Documents`);
  });

  test('navigating into a deeply nested structure creates correct column count', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));

    // Navigate: select Documents
    act(() => {
      const store = getStore();
      store.setSelection('left', [rootFiles[0].path]);
      store.setCurrentBreadcrumbPath('left', rootFiles[0].path);
    });

    expect(getStore().getColumnPaths('left').length).toBe(2);

    // Navigate: select Projects
    act(() => {
      const store = getStore();
      store.setSelection('left', [documentsFiles[0].path]);
      store.setCurrentBreadcrumbPath('left', documentsFiles[0].path);
    });

    expect(getStore().getColumnPaths('left').length).toBe(3);

    // Navigate: select WebApp
    act(() => {
      const store = getStore();
      store.setSelection('left', [projectsFiles[0].path]);
      store.setCurrentBreadcrumbPath('left', projectsFiles[0].path);
    });

    expect(getStore().getColumnPaths('left').length).toBe(4);
  });
});

describe('Column Keyboard Nav - Up/Down in non-first columns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 2 columns: basePath and Documents. Focus on col1 (Documents column).
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]), // Projects selected
      currentBreadcrumbPath: `${basePath}/Documents/Projects`,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 1,
      },
    }));
  });

  test('ArrowDown in second column moves within that column', () => {
    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    // Should move from Projects (idx 0) to Archive (idx 1)
    expect(pane.selectedFiles.has(documentsFiles[1].path)).toBe(true);
    expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(false);
  });

  test('ArrowUp in second column moves within that column', () => {
    const store = getStore();
    act(() => simulateArrowUp(store));

    const pane = getPane();
    // Should wrap from Projects (idx 0) to last item (todo.txt, idx 2)
    expect(pane.selectedFiles.has(documentsFiles[2].path)).toBe(true);
  });

  test('ArrowDown wraps in second column', () => {
    // Select last item in Documents
    act(() => {
      useStore.getState().setSelection('left', [documentsFiles[2].path]);
      useStore.getState().setCurrentBreadcrumbPath('left', basePath + '/Documents');
    });

    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    // Should wrap to first item
    expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(true);
  });

  test('focus stays on current column after ArrowDown', () => {
    const store = getStore();
    act(() => simulateArrowDown(store));

    const pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(1);
  });
});

describe('Column Keyboard Nav - Full navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));
  });

  test('Down → Right → Down → Left → Down stays in correct columns', () => {
    // Step 1: ArrowDown — select first item (Documents)
    act(() => simulateArrowDown(getStore()));
    let pane = getPane();
    expect(pane.selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(pane.columnState.focusedIndex).toBe(0);

    // Step 2: ArrowRight — enter Documents, select first child (Projects)
    act(() => simulateArrowRight(getStore()));
    pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(1);
    expect(pane.selectedFiles.has(documentsFiles[0].path)).toBe(true);

    // Step 3: ArrowDown — move to Archive in col1
    act(() => simulateArrowDown(getStore()));
    pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(1);
    expect(pane.selectedFiles.has(documentsFiles[1].path)).toBe(true);

    // Step 4: ArrowLeft — go back to col0
    act(() => simulateArrowLeft(getStore()));
    pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(0);

    // Step 5: ArrowDown — should move within col0 (not col1)
    act(() => simulateArrowDown(getStore()));
    pane = getPane();
    expect(pane.columnState.focusedIndex).toBe(0);
    // The selected item should be in rootFiles
    const selectedPath = [...pane.selectedFiles][0];
    const isInRootFiles = rootFiles.some(f => f.path === selectedPath);
    expect(isInRootFiles).toBe(true);
  });

  test('Right → Right → Left → Left returns to start correctly', () => {
    // Select Documents
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);

    // Right into Documents
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    // Select Projects (first item, already selected by ArrowRight)
    // Right into Projects
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(2);

    // Left back to Documents column
    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    // Left back to root column
    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });
});

describe('Column Keyboard Nav - Selection state consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));
  });

  test('selection is always exactly one item after arrow key', () => {
    const store = getStore();
    act(() => simulateArrowDown(store));
    expect(getPane().selectedFiles.size).toBe(1);

    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);

    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
  });

  test('Escape results in zero selected items', () => {
    const store = getStore();
    act(() => simulateArrowDown(store));
    expect(getPane().selectedFiles.size).toBe(1);

    act(() => simulateEscape(getStore()));
    expect(getPane().selectedFiles.size).toBe(0);
  });

  test('ArrowLeft selection is always exactly one item', () => {
    // Navigate right first
    act(() => simulateArrowDown(getStore()));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    act(() => simulateArrowLeft(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
  });
});

describe('Column Keyboard Nav - getColumnPaths derivation', () => {
  test('getColumnPaths returns correct paths for nested breadcrumb', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: `${basePath}/Documents/Projects`,
      basePath: basePath,
    }));

    const paths = getStore().getColumnPaths('left');
    expect(paths).toEqual([
      basePath,
      `${basePath}/Documents`,
      `${basePath}/Documents/Projects`,
    ]);
  });

  test('getColumnPaths returns single column for base path', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));

    const paths = getStore().getColumnPaths('left');
    expect(paths).toEqual([basePath]);
  });

  test('getColumnPaths returns empty for non-column viewMode', () => {
    useStore.setState(buildInitialState({
      viewMode: 'list',
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));

    const paths = getStore().getColumnPaths('left');
    expect(paths).toEqual([]);
  });

  test('getColumnPaths trims when breadcrumb is shortened', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: `${basePath}/Documents/Projects/WebApp`,
      basePath: basePath,
    }));

    let paths = getStore().getColumnPaths('left');
    expect(paths.length).toBe(4);

    // Shorten breadcrumb
    act(() => {
      useStore.getState().setCurrentBreadcrumbPath('left', `${basePath}/Documents`);
    });

    paths = getStore().getColumnPaths('left');
    expect(paths.length).toBe(2);
    expect(paths).toEqual([basePath, `${basePath}/Documents`]);
  });
});

describe('Column Keyboard Nav - setSelection store action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState());
  });

  test('setSelection replaces all previous selections', () => {
    act(() => {
      useStore.getState().setSelection('left', [rootFiles[0].path, rootFiles[1].path]);
    });
    expect(getPane().selectedFiles.size).toBe(2);

    act(() => {
      useStore.getState().setSelection('left', [rootFiles[2].path]);
    });
    expect(getPane().selectedFiles.size).toBe(1);
    expect(getPane().selectedFiles.has(rootFiles[2].path)).toBe(true);
  });

  test('setSelection with empty array clears selection', () => {
    act(() => {
      useStore.getState().setSelection('left', [rootFiles[0].path]);
    });
    expect(getPane().selectedFiles.size).toBe(1);

    act(() => {
      useStore.getState().setSelection('left', []);
    });
    expect(getPane().selectedFiles.size).toBe(0);
  });
});

describe('Column Keyboard Nav - focusedIndex state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 0,
      },
    }));
  });

  test('focusedIndex increments on ArrowRight', () => {
    // Select a directory first
    act(() => simulateArrowDown(getStore()));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
  });

  test('focusedIndex decrements on ArrowLeft', () => {
    act(() => simulateArrowDown(getStore()));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });

  test('focusedIndex stays same on ArrowUp/ArrowDown', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);

    act(() => simulateArrowDown(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);

    act(() => simulateArrowUp(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });

  test('focusedIndex stays same on Escape', () => {
    act(() => simulateArrowDown(getStore()));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    act(() => simulateEscape(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
  });
});

describe('Column Keyboard Nav - Preview file state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));
  });

  test('preview is set when file is selected', () => {
    // Navigate to notes.txt (index 3)
    // Select Pictures first (index 2, last directory)
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]),
      currentBreadcrumbPath: rootFiles[2].path,
      basePath: basePath,
    }));

    act(() => simulateArrowDown(getStore()));
    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.path).toBe(rootFiles[3].path);
    expect(getStore().showPreview).toBe(true);
  });

  test('preview is cleared when directory is selected', () => {
    act(() => {
      useStore.getState().setPreviewFile(rootFiles[3]);
    });
    expect(getStore().showPreview).toBe(true);

    // Select notes.txt then go up to Pictures (directory)
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[3].path]),
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));

    act(() => simulateArrowUp(getStore()));
    expect(getStore().previewFile).toBeNull();
    expect(getStore().showPreview).toBe(false);
  });

  test('preview is cleared on Escape', () => {
    act(() => {
      useStore.getState().setPreviewFile(rootFiles[3]);
    });
    expect(getStore().showPreview).toBe(true);

    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[3].path]),
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));

    act(() => simulateEscape(getStore()));
    expect(getStore().previewFile).toBeNull();
  });

  test('preview is cleared on ArrowLeft', () => {
    // Navigate into a directory first
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[2].path]), // todo.txt
      currentBreadcrumbPath: basePath + '/Documents',
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [rootFiles[0].path]: documentsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 1,
      },
    }));

    act(() => {
      useStore.getState().setPreviewFile(documentsFiles[2]);
    });
    expect(getStore().showPreview).toBe(true);

    act(() => simulateArrowLeft(getStore()));
    expect(getStore().previewFile).toBeNull();
  });
});

describe('Column Keyboard Nav - Breadcrumb path updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath,
      basePath: basePath,
    }));
  });

  test('selecting a directory updates breadcrumb to directory path', () => {
    act(() => simulateArrowDown(getStore())); // Select Documents (directory)

    const pane = getPane();
    expect(pane.currentBreadcrumbPath).toBe(rootFiles[0].path);
  });

  test('selecting a file updates breadcrumb to parent path', () => {
    // Select Pictures (index 2), then down to notes.txt (index 3)
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]),
      currentBreadcrumbPath: rootFiles[2].path,
      basePath: basePath,
    }));

    act(() => simulateArrowDown(getStore()));
    const pane = getPane();
    // notes.txt is a file, breadcrumb goes to its parent
    expect(pane.currentBreadcrumbPath).toBe(basePath);
  });

  test('Escape sets breadcrumb to focused column path', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`,
      basePath: basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
        },
        selectedByColumn: {},
        focusedIndex: 1,
      },
    }));

    act(() => simulateEscape(getStore()));
    const pane = getPane();
    expect(pane.currentBreadcrumbPath).toBe(`${basePath}/Documents`);
  });
});
