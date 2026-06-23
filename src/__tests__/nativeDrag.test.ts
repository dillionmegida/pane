import { renderHook, act } from '@testing-library/react';
import { getDraggedPaths, startDrag, endDrag } from '../components/filePane/dragUtils';
import { useDragDrop } from '../components/filePane/useDragDrop';
import type { FileItem } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(path: string, isDirectory = false): FileItem {
  return {
    name: path.split('/').pop() || '',
    path,
    isDirectory,
    size: 100,
    modified: new Date().toISOString(),
    extension: isDirectory ? '' : path.split('.').pop() || '',
  };
}

/**
 * Build a minimal React.DragEvent-like object for tests.
 * - `filePaths` sets the 'file-paths' dataTransfer entry (internal drag)
 * - `nativeFiles` simulates OS-dropped files via dataTransfer.files (native drag)
 */
function makeDragEvent(options: {
  filePaths?: string[];
  nativeFiles?: Array<{ path: string }>;
  altKey?: boolean;
} = {}): React.DragEvent {
  const store: Record<string, string> = {};
  if (options.filePaths) {
    store['file-paths'] = JSON.stringify(options.filePaths);
  }

  const fileList = options.nativeFiles
    ? Object.assign(
        options.nativeFiles.map(f => ({ ...f, name: f.path.split('/').pop() || '' })),
        { length: options.nativeFiles.length, item: (i: number) => options.nativeFiles![i] },
      )
    : { length: 0 };

  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    altKey: options.altKey ?? false,
    dataTransfer: {
      getData: (key: string) => store[key] || '',
      setData: jest.fn(),
      setDragImage: jest.fn(),
      files: fileList,
      types: Object.keys(store),
      effectAllowed: 'copyMove',
      dropEffect: 'move',
    },
  } as unknown as React.DragEvent;
}

// ─── getDraggedPaths ──────────────────────────────────────────────────────────

describe('getDraggedPaths', () => {
  test('reads paths from internal file-paths payload', () => {
    const e = makeDragEvent({ filePaths: ['/a/b.txt', '/a/c.txt'] });
    expect(getDraggedPaths(e)).toEqual(['/a/b.txt', '/a/c.txt']);
  });

  test('falls back to dataTransfer.files when no file-paths payload', () => {
    const e = makeDragEvent({ nativeFiles: [{ path: '/x/y.pdf' }, { path: '/x/z.png' }] });
    expect(getDraggedPaths(e)).toEqual(['/x/y.pdf', '/x/z.png']);
  });

  test('prefers internal file-paths payload over dataTransfer.files', () => {
    const e = makeDragEvent({
      filePaths: ['/internal/file.txt'],
      nativeFiles: [{ path: '/native/file.txt' }],
    });
    expect(getDraggedPaths(e)).toEqual(['/internal/file.txt']);
  });

  test('returns empty array when both sources are empty', () => {
    const e = makeDragEvent();
    expect(getDraggedPaths(e)).toEqual([]);
  });

  test('filters out native files with empty paths', () => {
    const e = makeDragEvent({ nativeFiles: [{ path: '' }, { path: '/valid/file.txt' }] });
    expect(getDraggedPaths(e)).toEqual(['/valid/file.txt']);
  });

  test('handles corrupted file-paths JSON by falling back to native files', () => {
    const e = {
      ...makeDragEvent({ nativeFiles: [{ path: '/fallback.txt' }] }),
      dataTransfer: {
        ...makeDragEvent().dataTransfer,
        getData: () => 'NOT VALID JSON',
        files: [{ path: '/fallback.txt', name: 'fallback.txt' }],
      },
    } as unknown as React.DragEvent;
    expect(getDraggedPaths(e)).toEqual(['/fallback.txt']);
  });
});

// ─── startDrag ────────────────────────────────────────────────────────────────

describe('startDrag', () => {
  const setSelection = jest.fn();
  const setDraggedFiles = jest.fn();
  const setIsDragging = jest.fn();

  const file = makeFile('/home/user/doc.txt');
  const paneId = 'pane-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI = {
      ...(window as any).electronAPI,
      startDrag: jest.fn(),
    };
  });

  test('calls e.preventDefault to suppress HTML5 drag', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  test('calls electronAPI.startDrag with the file paths', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect((window as any).electronAPI.startDrag).toHaveBeenCalledWith([file.path]);
  });

  test('calls electronAPI.startDrag with all selected files when multiple selected', () => {
    const e = makeDragEvent();
    const selected = new Set(['/a/1.txt', '/a/2.txt', file.path]);
    startDrag(e, file, selected, setSelection, setDraggedFiles, setIsDragging, paneId);
    expect((window as any).electronAPI.startDrag).toHaveBeenCalledWith([...selected]);
  });

  test('sets isDragging to true', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect(setIsDragging).toHaveBeenCalledWith(true);
  });

  test('sets draggedFiles to the dragged paths', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect(setDraggedFiles).toHaveBeenCalledWith([file.path]);
  });

  test('updates selection when dragging an unselected file', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set(['/other/file.txt']), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect(setSelection).toHaveBeenCalledWith(paneId, [file.path]);
  });

  test('does not update selection when dragging an already-selected file', () => {
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    expect(setSelection).not.toHaveBeenCalled();
  });

  test('registers mouseup and dragend cleanup listeners', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    const types = addSpy.mock.calls.map(([t]) => t);
    expect(types).toContain('mouseup');
    expect(types).toContain('dragend');
    addSpy.mockRestore();
  });

  test('cleanup on mouseup resets isDragging and draggedFiles', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);

    // Find and invoke the mouseup listener
    const mouseupCall = addSpy.mock.calls.find(([t]) => t === 'mouseup');
    expect(mouseupCall).toBeDefined();
    const mouseupHandler = mouseupCall![1] as EventListener;
    mouseupHandler(new Event('mouseup'));

    expect(setIsDragging).toHaveBeenCalledWith(false);
    expect(setDraggedFiles).toHaveBeenCalledWith([]);
    addSpy.mockRestore();
  });

  test('cleanup on dragend resets isDragging and draggedFiles', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);

    const dragendCall = addSpy.mock.calls.find(([t]) => t === 'dragend');
    expect(dragendCall).toBeDefined();
    const dragendHandler = dragendCall![1] as EventListener;
    dragendHandler(new Event('dragend'));

    expect(setIsDragging).toHaveBeenCalledWith(false);
    expect(setDraggedFiles).toHaveBeenCalledWith([]);
    addSpy.mockRestore();
  });

  test('cleanup removes its own listeners after firing', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const addSpy = jest.spyOn(window, 'addEventListener');
    const e = makeDragEvent();
    startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);

    const mouseupHandler = addSpy.mock.calls.find(([t]) => t === 'mouseup')![1] as EventListener;
    mouseupHandler(new Event('mouseup'));

    const removed = removeSpy.mock.calls.map(([t]) => t);
    expect(removed).toContain('mouseup');
    expect(removed).toContain('dragend');
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  test('handles missing electronAPI.startDrag gracefully', () => {
    (window as any).electronAPI = { ...((window as any).electronAPI) };
    delete (window as any).electronAPI.startDrag;
    const e = makeDragEvent();
    expect(() => {
      startDrag(e, file, new Set([file.path]), setSelection, setDraggedFiles, setIsDragging, paneId);
    }).not.toThrow();
  });
});

// ─── endDrag ──────────────────────────────────────────────────────────────────

describe('endDrag', () => {
  test('resets isDragging, draggedFiles, and dragOver', () => {
    const setIsDragging = jest.fn();
    const setDraggedFiles = jest.fn();
    const setDragOver = jest.fn();
    endDrag(setIsDragging, setDraggedFiles, setDragOver);
    expect(setIsDragging).toHaveBeenCalledWith(false);
    expect(setDraggedFiles).toHaveBeenCalledWith([]);
    expect(setDragOver).toHaveBeenCalledWith(null);
  });
});

// ─── useDragDrop.handleDrop ───────────────────────────────────────────────────

describe('useDragDrop - handleDrop', () => {
  const paneId = 'pane-1';
  const panePath = '/Users/alice';

  const pane = { id: paneId, path: panePath };
  const columnState = { filesByPath: {} };
  const refreshPane = jest.fn();
  const readDirSorted = jest.fn();
  const updateColumnState = jest.fn();

  function setup() {
    return renderHook(() =>
      useDragDrop({ paneId, pane, columnState, refreshPane, readDirSorted, updateColumnState })
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).electronAPI = {
      ...(window as any).electronAPI,
      move: jest.fn().mockResolvedValue({ success: true }),
      copy: jest.fn().mockResolvedValue({ success: true }),
    };
    readDirSorted.mockResolvedValue({ success: true, files: [] });
  });

  test('moves file via internal file-paths payload (move)', async () => {
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/Users/alice/Downloads/report.pdf'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).toHaveBeenCalledWith(
      '/Users/alice/Downloads/report.pdf',
      '/Users/alice/report.pdf'
    );
    expect((window as any).electronAPI.copy).not.toHaveBeenCalled();
  });

  test('copies file when altKey is held (copy)', async () => {
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/Users/alice/Downloads/report.pdf'], altKey: true });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.copy).toHaveBeenCalledWith(
      '/Users/alice/Downloads/report.pdf',
      '/Users/alice/report.pdf'
    );
    expect((window as any).electronAPI.move).not.toHaveBeenCalled();
  });

  test('drops onto a directory target uses that directory as destination', async () => {
    const { result } = setup();
    const destDir = makeFile('/Users/alice/Documents', true);
    const e = makeDragEvent({ filePaths: ['/Users/alice/Downloads/notes.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, destDir);
    });

    expect((window as any).electronAPI.move).toHaveBeenCalledWith(
      '/Users/alice/Downloads/notes.txt',
      '/Users/alice/Documents/notes.txt'
    );
  });

  test('moves file from native dataTransfer.files (native drag path)', async () => {
    const { result } = setup();
    const e = makeDragEvent({ nativeFiles: [{ path: '/Users/bob/Desktop/photo.jpg' }] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).toHaveBeenCalledWith(
      '/Users/bob/Desktop/photo.jpg',
      '/Users/alice/photo.jpg'
    );
  });

  test('ignores drop when source file is already in the destination directory', async () => {
    const { result } = setup();
    // Source is already in panePath (/Users/alice)
    const e = makeDragEvent({ filePaths: ['/Users/alice/existing.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).not.toHaveBeenCalled();
    expect((window as any).electronAPI.copy).not.toHaveBeenCalled();
  });

  test('filters same-dir files but still moves files from other dirs', async () => {
    const { result } = setup();
    const e = makeDragEvent({
      filePaths: [
        '/Users/alice/already-here.txt',   // same dir — filtered
        '/Users/alice/Downloads/new.txt',   // different dir — moved
      ],
    });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).toHaveBeenCalledTimes(1);
    expect((window as any).electronAPI.move).toHaveBeenCalledWith(
      '/Users/alice/Downloads/new.txt',
      '/Users/alice/new.txt'
    );
  });

  test('moves multiple files in a single drop', async () => {
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/tmp/a.txt', '/tmp/b.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).toHaveBeenCalledTimes(2);
  });

  test('calls refreshPane after a successful drop', async () => {
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/tmp/file.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect(refreshPane).toHaveBeenCalledWith(paneId);
  });

  test('calls readDirSorted on destination after drop', async () => {
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/tmp/file.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect(readDirSorted).toHaveBeenCalledWith(panePath, paneId);
  });

  test('calls updateColumnState with refreshed files on success', async () => {
    const freshFiles = [makeFile('/Users/alice/file.txt')];
    readDirSorted.mockResolvedValue({ success: true, files: freshFiles });
    const { result } = setup();
    const e = makeDragEvent({ filePaths: ['/tmp/file.txt'] });

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect(updateColumnState).toHaveBeenCalledWith(paneId, expect.objectContaining({
      filesByPath: expect.objectContaining({ [panePath]: freshFiles }),
    }));
  });

  test('does nothing when no paths are provided', async () => {
    const { result } = setup();
    const e = makeDragEvent(); // no filePaths, no nativeFiles

    await act(async () => {
      await result.current.handleDrop(e, null);
    });

    expect((window as any).electronAPI.move).not.toHaveBeenCalled();
    expect(refreshPane).not.toHaveBeenCalled();
  });
});
