import { useState, useEffect, useRef } from 'react';
import path from 'path-browserify';
import { toast } from 'react-toastify';
import type { FileItem } from '../../types';

interface UseFileActionsParams {
  paneId: string;
  pane: any;
  files: FileItem[];
  columnState: any;
  selectedFiles: Set<string>;
  readDirSorted: (dirPath: string, paneId: string) => Promise<any>;
  updateColumnState: (paneId: string, update: any) => void;
  setColumnState: (paneId: string, state: any) => void;
  setCurrentBreadcrumbPath: (paneId: string, path: string) => void;
  setSelection: (paneId: string, files: string[], columnIndex?: number | null) => void;
  setPreviewFile: (file: FileItem | null) => void;
  refreshPane: (paneId: string) => void;
  openModal: (id: string, props: any) => void;
}

export function useFileActions({
  paneId,
  pane,
  files,
  columnState,
  selectedFiles,
  readDirSorted,
  updateColumnState,
  setColumnState,
  setCurrentBreadcrumbPath,
  setSelection,
  setPreviewFile,
  refreshPane,
  openModal,
}: UseFileActionsParams) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newItemMode, setNewItemMode] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((newItemMode || renaming) && newItemInputRef.current) {
      newItemInputRef.current.focus();
      newItemInputRef.current.select();
    }
  }, [newItemMode, renaming]);

  const startRename = (file: FileItem) => {
    setRenaming(file.path);
    setRenameValue(file.name);
  };

  const commitRename = async () => {
    if (!renaming) return;
    const file = files.find(f => f.path === renaming)
      || (Object.values(columnState?.filesByPath || {}).flat() as FileItem[]).find(f => f.path === renaming);
    if (!file) { setRenaming(null); return; }

    const newName = renameValue.trim();
    if (!newName || newName === file.name) { setRenaming(null); return; }

    const dir = file.path.substring(0, file.path.lastIndexOf('/'));
    const newPath = `${dir}/${newName}`;
    await window.electronAPI.rename(file.path, newPath);
    setRenaming(null);
    refreshPane(paneId);
    setSelection(paneId, [newPath]);
    const result = await readDirSorted(dir, paneId);
    if (result.success) {
      const currentPaths: string[] = columnState?.paths || [];
      const openedIdx = currentPaths.indexOf(file.path);
      if (openedIdx !== -1) {
        // The renamed item is a currently-open column folder — update paths and filesByPath key
        const newPaths = currentPaths.map((p: string) => p === file.path ? newPath : p);
        const oldFbp = columnState?.filesByPath || {};
        const newFbp: Record<string, FileItem[]> = {};
        for (const [k, v] of Object.entries(oldFbp)) {
          newFbp[k === file.path ? newPath : k] = v as FileItem[];
        }
        newFbp[dir] = result.files;
        const oldSelByCol = columnState?.selectedByColumn || {};
        const newSelByCol: Record<string, string> = {};
        for (const [k, v] of Object.entries(oldSelByCol)) {
          newSelByCol[k] = v === file.path ? newPath : v as string;
        }
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: newFbp,
          selectedByColumn: newSelByCol,
          focusedIndex: columnState?.focusedIndex ?? 0,
          loadingPath: null,
        });
        setCurrentBreadcrumbPath(paneId, newPath);
      } else {
        updateColumnState(paneId, {
          filesByPath: { ...(columnState?.filesByPath || {}), [dir]: result.files },
        });
      }
    }
  };

  const createFolder = async () => {
    const dir = pane.currentBreadcrumbPath || pane.path;
    let untitledPath = `${dir}/untitled folder`;
    let counter = 1;
    while (true) {
      const statResult = await window.electronAPI.stat(untitledPath);
      if (!statResult.success) break;
      untitledPath = `${dir}/untitled folder ${counter++}`;
    }
    await window.electronAPI.mkdir(untitledPath);
    const result0 = await readDirSorted(dir, paneId);
    if (result0.success) {
      updateColumnState(paneId, { filesByPath: { ...(columnState.filesByPath || {}), [dir]: result0.files } });
    }
    refreshPane(paneId);
    const newFolder: FileItem = { path: untitledPath, name: untitledPath.split('/').pop()!, extension: '', size: 0, modified: Date.now().toString(), isDirectory: true };
    startRename(newFolder);
  };

  const commitNewItem = async () => {
    const name = newItemName.trim();
    if (!name) { setNewItemMode(null); setNewItemName(''); return; }

    const dir = pane.currentBreadcrumbPath || pane.path;
    const newPath = `${dir}/${name}`;
    if (newItemMode === 'folder') {
      await window.electronAPI.mkdir(newPath);
    } else {
      await window.electronAPI.writeFile(newPath, '');
    }
    setNewItemMode(null);
    setNewItemName('');
    refreshPane(paneId);
    const resultNew = await readDirSorted(dir, paneId);
    if (resultNew.success) {
      updateColumnState(paneId, { filesByPath: { ...(columnState.filesByPath || {}), [dir]: resultNew.files } });
    }
  };

  const handleDelete = async (filesToDelete?: string[]) => {
    const targets = filesToDelete || [...selectedFiles];
    if (targets.length === 0) return;

    const performDelete = async () => {
      const errors: string[] = [];
      for (const fp of targets) {
        const result = await window.electronAPI.delete(fp);
        if (!result.success) {
          errors.push(`${path.basename(fp)}: ${result.error}`);
        }
      }
      
      if (errors.length > 0) {
        console.error('Failed to delete some files:\n' + errors.join('\n'));
        toast.error(`Failed to delete ${errors.length} file(s):\n\n${errors.join('\n')}`);
      }
      
      setSelection(paneId, []);
      refreshPane(paneId);
      {
        // Re-read every parent dir that had a deleted file so the list updates immediately
        const affectedDirs = [...new Set(targets.map(fp => fp.substring(0, fp.lastIndexOf('/'))))];
        const newFbp = { ...(columnState.filesByPath || {}) };
        await Promise.all(affectedDirs.map(async dir => {
          const result = await readDirSorted(dir, paneId);
          if (result.success) newFbp[dir] = result.files;
        }));
      
      // If any deleted item is a directory with an open column, trim that column and all to its right
      const deletedDirs = targets.filter(fp => columnState.paths?.includes(fp));
      if (deletedDirs.length > 0) {
        const firstDeletedIdx = Math.min(...deletedDirs.map(d => columnState.paths.indexOf(d)));
        const newPaths = columnState.paths.slice(0, firstDeletedIdx);
        const base = pane.basePath || pane.path;
        const keepSet = new Set([base, ...newPaths]);
        const trimmedFbp: Record<string, FileItem[]> = {};
        for (const [k, v] of Object.entries(newFbp)) {
          if (keepSet.has(k)) trimmedFbp[k] = v as FileItem[];
        }
        const newBreadcrumb = newPaths.length > 0 ? newPaths[newPaths.length - 1] : base;
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: trimmedFbp,
          selectedByColumn: {},
          focusedIndex: Math.max(0, firstDeletedIdx - 1),
          loadingPath: null,
        });
        setCurrentBreadcrumbPath(paneId, newBreadcrumb);
      } else {
        updateColumnState(paneId, { filesByPath: newFbp });
      }
    }
    };

    openModal('confirmDelete', {
      files: targets,
      onConfirm: performDelete,
    });
  };

  const groupInFolder = async (filePaths: string[]) => {
    if (filePaths.length === 0) return;

    const parentDir = filePaths[0].substring(0, filePaths[0].lastIndexOf('/'));
    let newFolderPath = `${parentDir}/New Folder`;
    let counter = 1;
    while (true) {
      const statResult = await window.electronAPI.stat(newFolderPath);
      if (!statResult.success) break;
      newFolderPath = `${parentDir}/New Folder ${counter++}`;
    }

    await window.electronAPI.mkdir(newFolderPath);

    for (const fp of filePaths) {
      const name = fp.substring(fp.lastIndexOf('/') + 1);
      await window.electronAPI.move(fp, `${newFolderPath}/${name}`);
    }

    const [parentResult, folderResult] = await Promise.all([
      readDirSorted(parentDir, paneId),
      readDirSorted(newFolderPath, paneId),
    ]);

    const base = pane.basePath || pane.path;
    const currentPaths: string[] = columnState.paths || [];
    const parentColIndex = currentPaths.indexOf(parentDir) + 1;
    const keptPaths = currentPaths.slice(0, parentColIndex);
    const newPaths = [...keptPaths, newFolderPath];
    const keepSet = new Set([base, ...keptPaths]);
    const newFbp: Record<string, FileItem[]> = {};
    for (const [k, v] of Object.entries(columnState.filesByPath || {})) {
      if (keepSet.has(k)) newFbp[k] = v as FileItem[];
    }
    if (parentResult.success) newFbp[parentDir] = parentResult.files;
    if (folderResult.success) newFbp[newFolderPath] = folderResult.files;

    setPreviewFile(null);
    setColumnState(paneId, {
      paths: newPaths,
      filesByPath: newFbp,
      selectedByColumn: { ...(columnState.selectedByColumn || {}), [parentColIndex]: newFolderPath },
      focusedIndex: parentColIndex,
      loadingPath: null,
    });
    setCurrentBreadcrumbPath(paneId, newFolderPath);
    setSelection(paneId, [newFolderPath], parentColIndex);
    refreshPane(paneId);

    const newFolder: FileItem = { path: newFolderPath, name: newFolderPath.split('/').pop()!, extension: '', size: 0, modified: Date.now().toString(), isDirectory: true };
    startRename(newFolder);
  };

  const createNewFile = async () => {
    const dir = pane.currentBreadcrumbPath || pane.path;
    let untitledPath = `${dir}/untitled`;
    let counter = 1;
    while (true) {
      const statResult = await window.electronAPI.stat(untitledPath);
      if (!statResult.success) break;
      untitledPath = `${dir}/untitled ${counter++}`;
    }
    await window.electronAPI.writeFile(untitledPath, '');
    const resultFile = await readDirSorted(dir, paneId);
    if (resultFile.success) {
      updateColumnState(paneId, { filesByPath: { ...(columnState.filesByPath || {}), [dir]: resultFile.files } });
    }
    refreshPane(paneId);
    const newFile: FileItem = { path: untitledPath, name: untitledPath.split('/').pop()!, extension: '', size: 0, modified: Date.now().toString(), isDirectory: false };
    startRename(newFile);
  };

  return {
    renaming,
    setRenaming,
    renameValue,
    setRenameValue,
    newItemMode,
    setNewItemMode,
    newItemName,
    setNewItemName,
    newItemInputRef,
    startRename,
    commitRename,
    createFolder,
    commitNewItem,
    handleDelete,
    createNewFile,
    groupInFolder,
  };
}
