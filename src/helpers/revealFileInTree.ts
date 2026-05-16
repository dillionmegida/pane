import path from 'path';
import { buildColumnState } from './columnState';
import { getDir } from './fileHelpers';
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
  // Derive fileDir from filePath if not provided
  const derivedFileDir = fileDir || getDir(filePath);
  const currentPane = deps.getPane(paneId);
  if (!currentPane) return;

  const existingBase = currentPane.basePath;

  const isUnderBase = existingBase && (
    derivedFileDir === existingBase ||
    derivedFileDir.startsWith(path.resolve(existingBase) + '/')
  );

  const revealBase = isUnderBase ? existingBase : derivedFileDir;

  await deps.navigateTo(paneId, revealBase, { skipHistory: true });

  // For directories, build column state to include the directory as a column
  // For files in base directory, clear column state to avoid stale columns
  if (derivedFileDir !== revealBase || isDirectory) {
    const targetPath = isDirectory ? filePath : derivedFileDir;
    const { paths: columnPaths, filesByPath, selectedByColumn, focusedIndex } = await buildColumnState(revealBase, targetPath, {
      readdir: deps.readdir,
      getDirSort: deps.getDirSort,
    });

    deps.updateColumnState(paneId, {
      paths: columnPaths,
      filesByPath,
      selectedByColumn,
      focusedIndex
    });

    deps.setCurrentBreadcrumbPath(paneId, targetPath);
  } else {
    // Clear column state when revealing a file directly in the base directory
    deps.updateColumnState(paneId, {
      paths: [revealBase],
      filesByPath: {},
      selectedByColumn: {},
      focusedIndex: 0
    });
    deps.setCurrentBreadcrumbPath(paneId, revealBase);
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
  } else {
    // Close preview pane when revealing a directory
    deps.setPreview(null, false);
  }

  deps.pushNavHistory(paneId, {
    basePath: revealBase,
    currentBreadcrumbPath: derivedFileDir,
    selectedFiles: [filePath],
    previewFilePath,
  });
}
