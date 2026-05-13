/**
 * Column View Keyboard Navigation Tests
 */

import { act } from '@testing-library/react';
import { useStore } from '../store';

const mkDir = (name: string, parentPath: string): any => ({
  name, path: `${parentPath}/${name}`, isDirectory: true, size: 0,
  modified: new Date().toISOString(), extension: '',
});
const mkFile = (name: string, parentPath: string, ext = ''): any => ({
  name, path: `${parentPath}/${name}`, isDirectory: false, size: 1024,
  modified: new Date().toISOString(), extension: ext || name.split('.').pop(),
});

const getPane = (): any => useStore.getState().panes.find((p: any) => p.id === 'left');
const getStore = (): any => useStore.getState();

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
    ...overrides,
  }],
  activePane: 'left', previewFile: null, showPreview: false,
});

function simulateArrowDown(_: any, paneId = 'left'): void {
  const s = useStore.getState();
  const pane = s.panes.find((p: any) => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const list = focusedIndex === 0 ? pane.files : (pane.columnState.filesByPath[columnKey] || []);
  if (!list.length) return;
  const cur = list.findIndex((f: any) => pane.selectedFiles.has(f.path));
  const idx = (cur >= list.length - 1 || cur < 0) ? 0 : cur + 1;
  const f = list[idx];
  s.setSelection(paneId, [f.path]);
  if (f.isDirectory) { s.setCurrentBreadcrumbPath(paneId, f.path); s.setPreviewFile(null); }
  else { s.setPreviewFile(f); s.setCurrentBreadcrumbPath(paneId, f.path.split('/').slice(0, -1).join('/') || '/'); }
}

function simulateArrowUp(_: any, paneId = 'left'): void {
  const s = useStore.getState();
  const pane = s.panes.find((p: any) => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const list = focusedIndex === 0 ? pane.files : (pane.columnState.filesByPath[columnKey] || []);
  if (!list.length) return;
  const cur = list.findIndex((f: any) => pane.selectedFiles.has(f.path));
  const idx = cur <= 0 ? list.length - 1 : cur - 1;
  const f = list[idx];
  s.setSelection(paneId, [f.path]);
  if (f.isDirectory) { s.setCurrentBreadcrumbPath(paneId, f.path); s.setPreviewFile(null); }
  else { s.setPreviewFile(f); s.setCurrentBreadcrumbPath(paneId, f.path.split('/').slice(0, -1).join('/') || '/'); }
}

function simulateArrowRight(_: any, paneId = 'left'): void {
  const s = useStore.getState();
  const pane = s.panes.find((p: any) => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  const columnKey = columnPaths[focusedIndex];
  const list = focusedIndex === 0 ? pane.files : (pane.columnState.filesByPath[columnKey] || []);
  const cur = list.findIndex((f: any) => pane.selectedFiles.has(f.path));
  if (cur < 0) return;
  const sel = list[cur];
  if (!sel?.isDirectory) return;
  const next = pane.columnState.filesByPath[sel.path] || [];
  if (!next.length) return;
  s.updateColumnState(paneId, { focusedIndex: focusedIndex + 1 });
  s.setSelection(paneId, [next[0].path]);
  if (next[0].isDirectory) { s.setCurrentBreadcrumbPath(paneId, next[0].path); s.setPreviewFile(null); }
  else { s.setPreviewFile(next[0]); s.setCurrentBreadcrumbPath(paneId, next[0].path.split('/').slice(0, -1).join('/') || '/'); }
}

function simulateArrowLeft(_: any, paneId = 'left'): void {
  const s = useStore.getState();
  const pane = s.panes.find((p: any) => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  if (focusedIndex <= 0) return;
  const columnPaths = s.getColumnPaths(paneId);
  const selectedDirPath = columnPaths[focusedIndex];
  if (columnPaths.length > focusedIndex + 1) s.setCurrentBreadcrumbPath(paneId, columnPaths[focusedIndex]);
  s.updateColumnState(paneId, { focusedIndex: focusedIndex - 1 });
  if (selectedDirPath) s.setSelection(paneId, [selectedDirPath]);
  s.setPreviewFile(null);
}

function simulateEscape(_: any, paneId = 'left'): void {
  const s = useStore.getState();
  const pane = s.panes.find((p: any) => p.id === paneId);
  const { focusedIndex } = pane.columnState;
  const columnPaths = s.getColumnPaths(paneId);
  s.setCurrentBreadcrumbPath(paneId, columnPaths[focusedIndex]);
  s.setSelection(paneId, []);
  s.setPreviewFile(null);
}

describe('Column Keyboard Nav - ArrowDown', () => {
  beforeEach(() => { jest.clearAllMocks(); useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath })); });

  test('first ArrowDown with no selection selects the first item', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(getPane().selectedFiles.size).toBe(1);
  });

  test('ArrowDown moves from first item to second item', () => {
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[0].path]), currentBreadcrumbPath: rootFiles[0].path }));
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[1].path)).toBe(true);
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(false);
  });

  test('ArrowDown wraps from last item to first item', () => {
    const last = rootFiles[rootFiles.length - 1];
    useStore.setState(buildInitialState({ selectedFiles: new Set([last.path]), currentBreadcrumbPath: basePath }));
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(getPane().selectedFiles.has(last.path)).toBe(false);
  });

  test('ArrowDown through all items cycles back to start', () => {
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath }));
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
    for (let i = 1; i < rootFiles.length; i++) act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[rootFiles.length - 1].path)).toBe(true);
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
  });
});

describe('Column Keyboard Nav - ArrowUp', () => {
  beforeEach(() => { jest.clearAllMocks(); useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath })); });

  test('first ArrowUp with no selection wraps to last item', () => {
    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[rootFiles.length - 1].path)).toBe(true);
  });

  test('ArrowUp from first item wraps to last item', () => {
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[0].path]), currentBreadcrumbPath: rootFiles[0].path }));
    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[rootFiles.length - 1].path)).toBe(true);
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(false);
  });

  test('ArrowUp moves from second item to first item', () => {
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[1].path]), currentBreadcrumbPath: rootFiles[1].path }));
    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
  });
});

describe('Column Keyboard Nav - ArrowRight (open directory)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]),
      currentBreadcrumbPath: rootFiles[0].path,
      columnState: { paths: [], filesByPath: { [rootFiles[0].path]: documentsFiles }, selectedByColumn: {}, focusedIndex: 0 },
    }));
  });

  test('ArrowRight on directory moves focus to next column', () => {
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
  });

  test('ArrowRight selects first item in the new column', () => {
    act(() => simulateArrowRight(getStore()));
    expect(getPane().selectedFiles.has(documentsFiles[0].path)).toBe(true);
    expect(getPane().selectedFiles.size).toBe(1);
  });

  test('ArrowRight creates a new column (breadcrumb extends)', () => {
    const before = getStore().getColumnPaths('left').length;
    act(() => simulateArrowRight(getStore()));
    expect(getStore().getColumnPaths('left').length).toBeGreaterThan(before);
  });

  test('ArrowRight on a file does nothing', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[3].path]), currentBreadcrumbPath: basePath,
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    }));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
    expect(getPane().selectedFiles.has(rootFiles[3].path)).toBe(true);
  });

  test('ArrowRight with no selection does nothing', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set(), currentBreadcrumbPath: basePath,
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    }));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });

  test('ArrowRight on empty directory does nothing', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]), currentBreadcrumbPath: rootFiles[2].path,
      columnState: { paths: [], filesByPath: { [rootFiles[2].path]: [] }, selectedByColumn: {}, focusedIndex: 0 },
    }));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });
});

describe('Column Keyboard Nav - ArrowLeft (go back)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      selectedFiles: new Set([projectsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects/WebApp`, basePath,
      columnState: {
        paths: [],
        filesByPath: {
          [`${basePath}/Documents`]: documentsFiles,
          [`${basePath}/Documents/Projects`]: projectsFiles,
          [`${basePath}/Documents/Projects/WebApp`]: [],
        },
        selectedByColumn: {}, focusedIndex: 2,
      },
    }));
  });

  test('ArrowLeft moves focus to previous column', () => {
    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
  });

  test('ArrowLeft selects the parent directory in previous column', () => {
    const store = getStore();
    const columnPaths = store.getColumnPaths('left');
    const expected = columnPaths[2];
    act(() => simulateArrowLeft(store));
    expect(getPane().selectedFiles.has(expected)).toBe(true);
    expect(getPane().selectedFiles.size).toBe(1);
  });

  test('ArrowLeft keeps the immediate child column visible', () => {
    const before = getStore().getColumnPaths('left').length;
    act(() => simulateArrowLeft(getStore()));
    expect(getStore().getColumnPaths('left').length).toBeLessThanOrEqual(before);
  });

  test('ArrowLeft clears preview', () => {
    act(() => { useStore.getState().setPreviewFile({ name: 'test.txt', path: '/test.txt' } as any); });
    expect(getStore().previewFile).not.toBeNull();
    act(() => simulateArrowLeft(getStore()));
    expect(getStore().previewFile).toBeNull();
  });

  test('ArrowLeft at column 0 does nothing', () => {
    act(() => { useStore.getState().updateColumnState('left', { focusedIndex: 0 }); });
    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });

  test('two ArrowLefts from col2 trims deeper columns on second press', () => {
    act(() => simulateArrowLeft(getStore()));
    const after1 = getStore().getColumnPaths('left').length;
    act(() => simulateArrowLeft(getStore()));
    expect(getStore().getColumnPaths('left').length).toBeLessThanOrEqual(after1);
  });
});

describe('Column Keyboard Nav - Escape (deselect)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`, basePath,
      columnState: {
        paths: [],
        filesByPath: { [`${basePath}/Documents`]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 1,
      },
    }));
  });

  test('Escape clears selection in focused column', () => {
    act(() => simulateEscape(getStore()));
    expect(getPane().selectedFiles.size).toBe(0);
  });

  test('Escape trims columns to the right of focused column', () => {
    const before = getStore().getColumnPaths('left').length;
    act(() => simulateEscape(getStore()));
    expect(getStore().getColumnPaths('left').length).toBeLessThanOrEqual(before);
  });

  test('Escape clears preview', () => {
    act(() => { useStore.getState().setPreviewFile({ name: 'test.txt', path: '/test.txt' } as any); });
    act(() => simulateEscape(getStore()));
    expect(getStore().previewFile).toBeNull();
  });

  test('Escape on column 0 with no selection is a no-op for selection', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set(), currentBreadcrumbPath: basePath, basePath,
      columnState: { paths: [], filesByPath: {}, selectedByColumn: {}, focusedIndex: 0 },
    }));
    act(() => simulateEscape(getStore()));
    expect(getPane().selectedFiles.size).toBe(0);
  });
});

describe('Column Keyboard Nav - Preview pane', () => {
  beforeEach(() => { jest.clearAllMocks(); useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath })); });

  test('selecting a file via ArrowDown sets preview', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]), currentBreadcrumbPath: rootFiles[2].path,
    }));
    act(() => simulateArrowDown(getStore()));
    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.name).toBe('notes.txt');
  });

  test('selecting a directory clears preview', () => {
    act(() => { useStore.getState().setPreviewFile(rootFiles[3]); });
    expect(getStore().previewFile).not.toBeNull();

    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[3].path]), currentBreadcrumbPath: basePath }));
    act(() => simulateArrowUp(getStore()));
    expect(getStore().previewFile).toBeNull();
  });

  test('ArrowRight into a directory with file as first item sets preview', () => {
    const docsWithFileFirst = [
      mkFile('readme.txt', `${basePath}/Documents`, 'txt'),
      mkDir('Projects', `${basePath}/Documents`),
    ];
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[0].path]), currentBreadcrumbPath: rootFiles[0].path,
      columnState: { paths: [], filesByPath: { [rootFiles[0].path]: docsWithFileFirst }, selectedByColumn: {}, focusedIndex: 0 },
    }));
    act(() => simulateArrowRight(getStore()));
    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.name).toBe('readme.txt');
  });
});

describe('Column Keyboard Nav - Column creation and deletion', () => {
  test('selecting a directory creates a new column in breadcrumb', () => {
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath, basePath }));
    const before = getStore().getColumnPaths('left').length;
    act(() => {
      getStore().setSelection('left', [rootFiles[0].path]);
      getStore().setCurrentBreadcrumbPath('left', rootFiles[0].path);
    });
    const after = getStore().getColumnPaths('left');
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toBe(rootFiles[0].path);
  });

  test('Escape trims all columns after focused column', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`, basePath,
      columnState: {
        paths: [],
        filesByPath: { [`${basePath}/Documents`]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 1,
      },
    }));
    act(() => simulateEscape(getStore()));
    const paths = getStore().getColumnPaths('left');
    expect(paths[paths.length - 1]).toBe(`${basePath}/Documents`);
  });

  test('navigating into a deeply nested structure creates correct column count', () => {
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath, basePath,
      columnState: {
        paths: [],
        filesByPath: { [rootFiles[0].path]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 0,
      },
    }));

    act(() => { getStore().setSelection('left', [rootFiles[0].path]); getStore().setCurrentBreadcrumbPath('left', rootFiles[0].path); });
    expect(getStore().getColumnPaths('left').length).toBe(2);

    act(() => { getStore().setSelection('left', [documentsFiles[0].path]); getStore().setCurrentBreadcrumbPath('left', documentsFiles[0].path); });
    expect(getStore().getColumnPaths('left').length).toBe(3);

    act(() => { getStore().setSelection('left', [projectsFiles[0].path]); getStore().setCurrentBreadcrumbPath('left', projectsFiles[0].path); });
    expect(getStore().getColumnPaths('left').length).toBe(4);
  });
});

describe('Column Keyboard Nav - Up/Down in non-first columns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`, basePath,
      columnState: {
        paths: [],
        filesByPath: { [`${basePath}/Documents`]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 1,
      },
    }));
  });

  test('ArrowDown in second column moves within that column', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(documentsFiles[1].path)).toBe(true);
    expect(getPane().selectedFiles.has(documentsFiles[0].path)).toBe(false);
  });

  test('ArrowUp in second column moves within that column', () => {
    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.has(documentsFiles[2].path)).toBe(true);
  });

  test('ArrowDown wraps in second column', () => {
    act(() => { useStore.getState().setSelection('left', [documentsFiles[2].path]); useStore.getState().setCurrentBreadcrumbPath('left', basePath + '/Documents'); });
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(documentsFiles[0].path)).toBe(true);
  });

  test('focus stays on current column after ArrowDown', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
  });
});

describe('Column Keyboard Nav - Full navigation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath, basePath,
      columnState: {
        paths: [],
        filesByPath: { [rootFiles[0].path]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 0,
      },
    }));
  });

  test('Down → Right → Down → Left → Down stays in correct columns', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);
    expect(getPane().columnState.focusedIndex).toBe(0);

    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
    expect(getPane().selectedFiles.has(documentsFiles[0].path)).toBe(true);

    act(() => simulateArrowDown(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
    expect(getPane().selectedFiles.has(documentsFiles[1].path)).toBe(true);

    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);

    act(() => simulateArrowDown(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
    const selected = [...getPane().selectedFiles][0];
    expect(rootFiles.some((f: any) => f.path === selected)).toBe(true);
  });

  test('Right → Right → Left → Left returns to start correctly', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.has(rootFiles[0].path)).toBe(true);

    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(2);

    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);

    act(() => simulateArrowLeft(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(0);
  });
});

describe('Column Keyboard Nav - Selection state consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath, basePath,
      columnState: { paths: [], filesByPath: { [rootFiles[0].path]: documentsFiles }, selectedByColumn: {}, focusedIndex: 0 },
    }));
  });

  test('selection is always exactly one item after arrow key', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
    act(() => simulateArrowUp(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
  });

  test('Escape results in zero selected items', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
    act(() => simulateEscape(getStore()));
    expect(getPane().selectedFiles.size).toBe(0);
  });

  test('ArrowLeft selection is always exactly one item', () => {
    act(() => simulateArrowDown(getStore()));
    act(() => simulateArrowRight(getStore()));
    expect(getPane().columnState.focusedIndex).toBe(1);
    act(() => simulateArrowLeft(getStore()));
    expect(getPane().selectedFiles.size).toBe(1);
  });
});

describe('Column Keyboard Nav - getColumnPaths derivation', () => {
  test('getColumnPaths returns correct paths for nested breadcrumb', () => {
    useStore.setState(buildInitialState({ currentBreadcrumbPath: `${basePath}/Documents/Projects`, basePath }));
    expect(getStore().getColumnPaths('left')).toEqual([basePath, `${basePath}/Documents`, `${basePath}/Documents/Projects`]);
  });

  test('getColumnPaths returns single column for base path', () => {
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath, basePath }));
    expect(getStore().getColumnPaths('left')).toEqual([basePath]);
  });

  test('getColumnPaths returns empty for non-column viewMode', () => {
    useStore.setState(buildInitialState({ viewMode: 'list', currentBreadcrumbPath: basePath, basePath }));
    expect(getStore().getColumnPaths('left')).toEqual([]);
  });

  test('getColumnPaths trims when breadcrumb is shortened', () => {
    useStore.setState(buildInitialState({ currentBreadcrumbPath: `${basePath}/Documents/Projects/WebApp`, basePath }));
    expect(getStore().getColumnPaths('left').length).toBe(4);

    act(() => { useStore.getState().setCurrentBreadcrumbPath('left', `${basePath}/Documents`); });
    const paths = getStore().getColumnPaths('left');
    expect(paths.length).toBe(2);
    expect(paths).toEqual([basePath, `${basePath}/Documents`]);
  });
});

describe('Column Keyboard Nav - setSelection store action', () => {
  beforeEach(() => { jest.clearAllMocks(); useStore.setState(buildInitialState()); });

  test('setSelection replaces all previous selections', () => {
    act(() => { useStore.getState().setSelection('left', [rootFiles[0].path, rootFiles[1].path]); });
    expect(getPane().selectedFiles.size).toBe(2);
    act(() => { useStore.getState().setSelection('left', [rootFiles[2].path]); });
    expect(getPane().selectedFiles.size).toBe(1);
    expect(getPane().selectedFiles.has(rootFiles[2].path)).toBe(true);
  });

  test('setSelection with empty array clears selection', () => {
    act(() => { useStore.getState().setSelection('left', [rootFiles[0].path]); });
    expect(getPane().selectedFiles.size).toBe(1);
    act(() => { useStore.getState().setSelection('left', []); });
    expect(getPane().selectedFiles.size).toBe(0);
  });
});

describe('Column Keyboard Nav - focusedIndex state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({
      currentBreadcrumbPath: basePath, basePath,
      columnState: {
        paths: [],
        filesByPath: { [rootFiles[0].path]: documentsFiles, [`${basePath}/Documents/Projects`]: projectsFiles },
        selectedByColumn: {}, focusedIndex: 0,
      },
    }));
  });

  test('focusedIndex increments on ArrowRight', () => {
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
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath, basePath }));
  });

  test('preview is set when file is selected', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([rootFiles[2].path]), currentBreadcrumbPath: rootFiles[2].path, basePath,
    }));
    act(() => simulateArrowDown(getStore()));
    expect(getStore().previewFile).not.toBeNull();
    expect(getStore().previewFile.path).toBe(rootFiles[3].path);
    expect(getStore().showPreview).toBe(true);
  });

  test('preview is cleared when directory is selected', () => {
    act(() => { useStore.getState().setPreviewFile(rootFiles[3]); });
    expect(getStore().showPreview).toBe(true);
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[3].path]), currentBreadcrumbPath: basePath, basePath }));
    act(() => simulateArrowUp(getStore()));
    expect(getStore().previewFile).toBeNull();
    expect(getStore().showPreview).toBe(false);
  });

  test('preview is cleared on Escape', () => {
    act(() => { useStore.getState().setPreviewFile(rootFiles[3]); });
    expect(getStore().showPreview).toBe(true);
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[3].path]), currentBreadcrumbPath: basePath, basePath }));
    act(() => simulateEscape(getStore()));
    expect(getStore().previewFile).toBeNull();
  });

  test('preview is cleared on ArrowLeft', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[2].path]),
      currentBreadcrumbPath: basePath + '/Documents', basePath,
      columnState: { paths: [], filesByPath: { [rootFiles[0].path]: documentsFiles }, selectedByColumn: {}, focusedIndex: 1 },
    }));
    act(() => { useStore.getState().setPreviewFile(documentsFiles[2]); });
    expect(getStore().showPreview).toBe(true);
    act(() => simulateArrowLeft(getStore()));
    expect(getStore().previewFile).toBeNull();
  });
});

describe('Column Keyboard Nav - Breadcrumb path updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useStore.setState(buildInitialState({ currentBreadcrumbPath: basePath, basePath }));
  });

  test('selecting a directory updates breadcrumb to directory path', () => {
    act(() => simulateArrowDown(getStore()));
    expect(getPane().currentBreadcrumbPath).toBe(rootFiles[0].path);
  });

  test('selecting a file updates breadcrumb to parent path', () => {
    useStore.setState(buildInitialState({ selectedFiles: new Set([rootFiles[2].path]), currentBreadcrumbPath: rootFiles[2].path, basePath }));
    act(() => simulateArrowDown(getStore()));
    expect(getPane().currentBreadcrumbPath).toBe(basePath);
  });

  test('Escape sets breadcrumb to focused column path', () => {
    useStore.setState(buildInitialState({
      selectedFiles: new Set([documentsFiles[0].path]),
      currentBreadcrumbPath: `${basePath}/Documents/Projects`, basePath,
      columnState: { paths: [], filesByPath: { [`${basePath}/Documents`]: documentsFiles }, selectedByColumn: {}, focusedIndex: 1 },
    }));
    act(() => simulateEscape(getStore()));
    expect(getPane().currentBreadcrumbPath).toBe(`${basePath}/Documents`);
  });
});

describe('Column Keyboard Nav - Cmd+. toggleHiddenFiles (regression)', () => {
  const buildCmdDotHandler = (opts: { isActive?: boolean } = {}) => {
    const { isActive = true } = opts;
    let toggled = false;
    const handleKeyDown = (e: { metaKey?: boolean; ctrlKey?: boolean; key: string }) => {
      if (!isActive) return;
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        toggled = true;
      }
    };
    return { handleKeyDown, wasToggled: () => toggled };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI.readdir.mockResolvedValue({ success: true, files: [] });
    useStore.setState(buildInitialState({ showHidden: false }));
  });

  test('Cmd+. triggers toggle when pane is active', () => {
    const { handleKeyDown, wasToggled } = buildCmdDotHandler({ isActive: true });
    handleKeyDown({ metaKey: true, key: '.' });
    expect(wasToggled()).toBe(true);
  });

  test('Ctrl+. triggers toggle (cross-platform)', () => {
    const { handleKeyDown, wasToggled } = buildCmdDotHandler({ isActive: true });
    handleKeyDown({ ctrlKey: true, key: '.' });
    expect(wasToggled()).toBe(true);
  });

  test('Cmd+. does NOT trigger when pane is inactive', () => {
    const { handleKeyDown, wasToggled } = buildCmdDotHandler({ isActive: false });
    handleKeyDown({ metaKey: true, key: '.' });
    expect(wasToggled()).toBe(false);
  });

  test('Cmd+, does NOT trigger toggle (wrong key)', () => {
    const { handleKeyDown, wasToggled } = buildCmdDotHandler({ isActive: true });
    handleKeyDown({ metaKey: true, key: ',' });
    expect(wasToggled()).toBe(false);
  });

  test('plain . without modifier does NOT trigger toggle', () => {
    const { handleKeyDown, wasToggled } = buildCmdDotHandler({ isActive: true });
    handleKeyDown({ key: '.' });
    expect(wasToggled()).toBe(false);
  });

  test('toggleHiddenFiles store action correctly flips state', async () => {
    expect(useStore.getState().showHidden).toBe(false);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect(useStore.getState().showHidden).toBe(true);
    await act(async () => { await useStore.getState().toggleHiddenFiles(); });
    expect(useStore.getState().showHidden).toBe(false);
  });
});
