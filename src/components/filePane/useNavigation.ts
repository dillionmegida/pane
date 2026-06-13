import { useCallback } from 'react';
import { isPreviewable } from '../../store';
import type { FileItem, ViewMode } from '../../types';

interface UseNavigationParams {
  paneId: string;
  pane: any;
  viewMode: ViewMode;
  columnState: any;
  selectedFiles: Set<string>;
  previewFile: FileItem | null;
  navigateTo: (paneId: string, dirPath: string, opts?: { skipHistory?: boolean }) => Promise<void>;
  readDirSorted: (dirPath: string, paneId: string) => Promise<any>;
  setColumnState: (paneId: string, state: any) => void;
  setCurrentBreadcrumbPath: (paneId: string, path: string) => void;
  setPreviewFile: (file: FileItem | null) => void;
  pushNavHistory: (paneId: string, entry: any) => void;
}

export function useNavigation({
  paneId, pane, viewMode, columnState, selectedFiles, previewFile,
  navigateTo, readDirSorted,
  setColumnState, setCurrentBreadcrumbPath, setPreviewFile, pushNavHistory,
}: UseNavigationParams) {
  const navigate = useCallback(async (dirPath: string, opts?: { skipHistory?: boolean }) => {
    if (viewMode === 'column') {
      const result = await readDirSorted(dirPath, paneId);
      if (!result.success) return;

      const base = pane.basePath || pane.path;
      let newPaths: string[] = [];

      if (dirPath === base || !dirPath.startsWith(base)) {
        newPaths = [dirPath];
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: { [dirPath]: result.files },
          selectedByColumn: {},
          focusedIndex: 0,
        });
        setCurrentBreadcrumbPath(paneId, dirPath);
      } else {
        const existingIdx = columnState.paths.indexOf(dirPath);
        if (existingIdx >= 0) {
          newPaths = columnState.paths.slice(0, existingIdx + 1);
        } else {
          newPaths = [...(columnState.paths || []), dirPath];
        }
        const newFbp = { ...(columnState.filesByPath || {}), [dirPath]: result.files };
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: newFbp,
          selectedByColumn: { ...(columnState.selectedByColumn || {}) },
          focusedIndex: newPaths.length - 1,
        });
        setCurrentBreadcrumbPath(paneId, dirPath);
      }

      if (!opts?.skipHistory) {
        pushNavHistory(paneId, {
          basePath: base,
          currentBreadcrumbPath: dirPath,
          selectedFiles: [...selectedFiles],
          previewFilePath: previewFile?.path || null,
          selectedByColumn: { ...(columnState.selectedByColumn || {}) },
        });
      }
    } else {
      await navigateTo(paneId, dirPath, opts);
    }
  }, [viewMode, paneId, pane, columnState, selectedFiles, previewFile]);

  const activateFile = useCallback(async (file: FileItem) => {
    if (file.isDirectory) {
      await navigate(file.path);
    } else {
      if (isPreviewable(file)) {
        setPreviewFile(file);
        pushNavHistory(paneId, {
          basePath: pane.basePath || pane.path,
          currentBreadcrumbPath: pane.currentBreadcrumbPath,
          selectedFiles: [file.path],
          previewFilePath: file.path,
          selectedByColumn: { ...(columnState.selectedByColumn || {}) },
        });
      }
    }
  }, [navigate, pane, paneId, previewFile]);

  const handleBreadcrumbNavigate = (crumbPath: string) => {
    if (viewMode === 'column') {
      navigate(crumbPath);
    } else {
      navigateTo(paneId, crumbPath);
    }
  };

  return { navigate, activateFile, handleBreadcrumbNavigate };
}
