import { useCallback } from 'react';
import { isPreviewable } from '../../store';
import type { FileItem } from '../../types';

interface UseColumnItemClickParams {
  paneId: string;
  pane: any;
  files: FileItem[];
  columnState: any;
  selectedFiles: Set<string>;
  previewFile: any;
  isActive: boolean;
  clearShiftState: () => void;
  setActivePane: (paneId: string) => void;
  setSelection: (paneId: string, files: string[], columnIndex?: number | null) => void;
  toggleSelection: (paneId: string, path: string, multi?: boolean, columnIndex?: number) => void;
  setColumnState: (paneId: string, state: any) => void;
  updateColumnState: (paneId: string, update: any) => void;
  setCurrentBreadcrumbPath: (paneId: string, path: string) => void;
  setPreviewFile: (file: FileItem | null) => void;
  pushNavHistory: (paneId: string, entry: any) => void;
  readDirSorted: (dirPath: string, paneId: string) => Promise<any>;
  getColumnPaths: (paneId: string) => string[];
}

export function useColumnItemClick({
  paneId,
  pane,
  files,
  columnState,
  selectedFiles,
  previewFile,
  isActive,
  clearShiftState,
  setActivePane,
  setSelection,
  toggleSelection,
  setColumnState,
  updateColumnState,
  setCurrentBreadcrumbPath,
  setPreviewFile,
  pushNavHistory,
  readDirSorted,
  getColumnPaths,
}: UseColumnItemClickParams) {
  const handleColumnItemClick = useCallback(async (
    e: React.MouseEvent,
    file: FileItem,
    columnIndex: number,
    clickType: string,
  ) => {
    if (!isActive) setActivePane(paneId);

    if (clickType !== 'shift') {
      clearShiftState();
    }

    // Check if clicking in a different column - if so, clear existing selections
    const isDifferentColumn = pane.selectionColumnIndex !== null && pane.selectionColumnIndex !== columnIndex;

    if (clickType === 'meta') {
      // If clicking in a different column with Cmd, treat as single click
      if (isDifferentColumn) {
        setSelection(paneId, [file.path], columnIndex);
      } else {
        toggleSelection(paneId, file.path, true, columnIndex);
      }
      return;
    }

    if (clickType === 'shift' && pane.lastSelectedFile && !isDifferentColumn) {
      const columnPaths = getColumnPaths(paneId);
      const base = pane.basePath || pane.path;
      const colPath = columnPaths[columnIndex] ?? base;
      const colFiles = columnIndex === 0 
        ? files 
        : (columnState.filesByPath?.[colPath] || []);
      
      const lastIdx = colFiles.findIndex((f: FileItem) => f.path === pane.lastSelectedFile);
      const curIdx = colFiles.findIndex((f: FileItem) => f.path === file.path);
      
      if (lastIdx !== -1 && curIdx !== -1) {
        const [lo, hi] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
        const rangeFiles = colFiles.slice(lo, hi + 1).map((f: FileItem) => f.path);
        const newSelection = new Set([...selectedFiles, ...rangeFiles]);
        setSelection(paneId, Array.from(newSelection), columnIndex);
        return;
      }
    }

    setSelection(paneId, [file.path], columnIndex);
    updateColumnState(paneId, {
      selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
      focusedIndex: columnIndex,
    });

    if (file.isDirectory) {
      // paths holds child columns (index 1+). Clicking at columnIndex opens a new
      // child at columnIndex+1, so keep only paths[0..columnIndex-1] then append.
      const keptPaths = (columnState.paths || []).slice(0, columnIndex);
      const base = pane.basePath || pane.path;
      const newPaths = [...keptPaths, file.path];
      // Immediately clear stale child columns so old content doesn't linger while loading.
      const immediateKeepSet = new Set([base, ...keptPaths]);
      const immediateFbp: Record<string, FileItem[]> = {};
      for (const [k, v] of Object.entries(columnState.filesByPath || {})) {
        if (immediateKeepSet.has(k)) immediateFbp[k] = v as FileItem[];
      }
      setColumnState(paneId, {
        paths: newPaths,
        filesByPath: immediateFbp,
        selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
        focusedIndex: columnIndex,
        loadingPath: file.path,
      });
      const result = await readDirSorted(file.path, paneId);
      if (result.success) {
        const newFbp = { ...immediateFbp, [file.path]: result.files };
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: newFbp,
          selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
          focusedIndex: columnIndex,
          loadingPath: null,
        });
        setCurrentBreadcrumbPath(paneId, file.path);
        setPreviewFile(null);
        const newSelByCol = { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path };
        pushNavHistory(paneId, {
          basePath: pane.basePath || pane.path,
          currentBreadcrumbPath: file.path,
          selectedFiles: [file.path],
          previewFilePath: null,
          selectedByColumn: newSelByCol,
        });
      } else {
        setColumnState(paneId, {
          paths: keptPaths,
          filesByPath: immediateFbp,
          selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
          focusedIndex: columnIndex,
          loadingPath: null,
        });
      }
    } else {
      // File click: truncate paths to only what's needed up to this column
      const keptPaths = (columnState.paths || []).slice(0, columnIndex);
      const base = pane.basePath || pane.path;
      const keepSet = new Set([base, ...keptPaths]);
      const newFbp: Record<string, FileItem[]> = {};
      for (const [k, v] of Object.entries(columnState.filesByPath || {})) {
        if (keepSet.has(k)) newFbp[k] = v as FileItem[];
      }
      const parentPath = file.path.split('/').slice(0, -1).join('/') || '/';
      setColumnState(paneId, {
        paths: keptPaths,
        filesByPath: newFbp,
        selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
        focusedIndex: columnIndex,
        loadingPath: null,
      });
      setCurrentBreadcrumbPath(paneId, parentPath);
      if (isPreviewable(file)) {
        setPreviewFile(file);
      } else {
        setPreviewFile(null);
      }
      pushNavHistory(paneId, {
        basePath: pane.basePath || pane.path,
        currentBreadcrumbPath: parentPath,
        selectedFiles: [file.path],
        previewFilePath: isPreviewable(file) ? file.path : null,
        selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
      });
    }
  }, [paneId, columnState, pane, selectedFiles, previewFile, isActive]);

  return handleColumnItemClick;
}
