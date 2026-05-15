import path from 'path-browserify';
import { buildColumnState } from './columnState';
import type { FileItem, SortBy } from '../types';

export interface RevealFileInTreeDeps {
  getPane: (paneId: string) => any;
  navigateTo: (paneId: string, path: string, options?: any) => Promise<void>;
  updateColumnState: (paneId: string, columnState: any) => void;
  setCurrentBreadcrumbPath: (paneId: string, path: string) => void;
  setSelection: (paneId: string, filePaths: string[]) => void;
  setPreview: (previewFile: any, showPreview: boolean) => void;
  pushNavHistory: (paneId: string, historyEntry: any) => void;
  getDirSort: (dirPath: string) => SortBy;
  readdir: (path: string) => Promise<{ success: boolean; files: FileItem[]; error?: string }>;
  stat: (path: string) => Promise<{ success: boolean; stat?: any; error?: string }>;
}

/**
 * Reveal a file in the column view tree.
 * This navigates to the file's directory and selects the file.
 * 
 * @param paneId - The pane ID
 * @param filePath - The full path to the file to reveal
 * @param fileDir - The directory containing the file
 * @param isDirectory - Whether the target is a directory
 * @param deps - Dependencies (store methods and electronAPI)
 */
export async function revealFileInTree(
  paneId: string,
  filePath: string,
  fileDir: string,
  isDirectory = false,
  deps: RevealFileInTreeDeps
): Promise<void> {
  const currentPane = deps.getPane(paneId);
  if (!currentPane) return;

  const existingBase = currentPane.basePath;

  const isUnderBase = existingBase && (
    fileDir === existingBase ||
    fileDir.startsWith(path.resolve(existingBase) + '/')
  );

  const revealBase = isUnderBase ? existingBase : fileDir;

  await deps.navigateTo(paneId, revealBase, { skipHistory: true });

  if (fileDir !== revealBase) {
    const { paths: columnPaths, filesByPath, selectedByColumn, focusedIndex } = await buildColumnState(revealBase, fileDir, {
      readdir: deps.readdir,
      getDirSort: deps.getDirSort,
    });

    deps.updateColumnState(paneId, {
      paths: columnPaths,
      filesByPath,
      selectedByColumn,
      focusedIndex
    });

    deps.setCurrentBreadcrumbPath(paneId, fileDir);
  }

  deps.setSelection(paneId, [filePath]);

  let previewFilePath: string | null = null;
  if (!isDirectory) {
    const file = await deps.stat(filePath);
    if (file.success && file.stat) {
      const name = filePath.split('/').pop() ?? '';
      const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
      deps.setPreview({ ...file.stat, path: filePath, name, extension: ext, isDirectory: false }, true);
      previewFilePath = filePath;
    }
  }

  deps.pushNavHistory(paneId, {
    basePath: revealBase,
    currentBreadcrumbPath: fileDir,
    selectedFiles: [filePath],
    previewFilePath,
  });
}
