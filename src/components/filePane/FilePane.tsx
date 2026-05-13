import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, getFileIcon, isPreviewable } from '../../store';
import Column from './Column';
import FileListItem from './FileListItem';
import FileGridItem from './FileGridItem';
import PaneBreadcrumb from './PaneBreadcrumb';
import PaneContextMenu from './PaneContextMenu';
import InlineTagPicker from './InlineTagPicker';
import type { FileItem, ColumnState, Tag, SortBy, ViewMode } from '../../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const PaneWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  position: relative;
`;

const TabBar = styled.div`
  display: flex;
  align-items: center;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  height: 32px;
  overflow: hidden;
  flex-shrink: 0;
  padding: 0 4px;
  gap: 2px;
`;

const Tab = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  height: 26px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  font-size: 11px;
  background: ${p => p.active ? p.theme.bg.primary : 'transparent'};
  color: ${p => p.active ? p.theme.text.primary : p.theme.text.tertiary};
  border: 1px solid ${p => p.active ? p.theme.border.normal : 'transparent'};
  transition: all 0.1s;
  white-space: nowrap;
  overflow: hidden;
  max-width: 140px;
  flex-shrink: 0;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const TabClose = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  margin-left: 2px;
  &:hover { color: ${p => p.theme.text.error}; }
`;

const AddTabBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: ${p => p.theme.radius.sm};
  flex-shrink: 0;
  line-height: 1;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  padding: 0 6px;
  height: 30px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  background: ${p => p.theme.bg.secondary};
  gap: 4px;
  flex-shrink: 0;
`;

const NavBtn = styled.button<{ disabled?: boolean }>`
  background: none;
  border: none;
  color: ${p => p.disabled ? p.theme.text.tertiary : p.theme.text.secondary};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 13px;
  opacity: ${p => p.disabled ? 0.35 : 1};
  transition: all 0.1s;
  &:hover:not(:disabled) { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const ToolbarSep = styled.div`
  width: 1px;
  height: 14px;
  background: ${p => p.theme.border.subtle};
  margin: 0 2px;
`;

const ViewBtn = styled.button<{ active: boolean }>`
  background: ${p => p.active ? p.theme.bg.hover : 'none'};
  border: none;
  color: ${p => p.active ? p.theme.text.primary : p.theme.text.tertiary};
  cursor: pointer;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 12px;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const FileListArea = styled.div`
  flex: 1;
  overflow: auto;
  padding: 4px 0;
`;

const ColumnViewArea = styled.div`
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  position: relative;
`;

const GridArea = styled.div`
  flex: 1;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
  padding: 8px;
  align-content: start;
`;

const ListHeader = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 70px 100px 60px;
  padding: 2px 8px;
  height: 22px;
  align-items: center;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const ListHeaderCell = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${p => p.theme.text.tertiary};
  font-size: 12px;
  gap: 8px;
  pointer-events: none;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  height: 20px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  background: ${p => p.theme.bg.secondary};
  flex-shrink: 0;
`;

const RenameInput = styled.input`
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.focus};
  color: ${p => p.theme.text.primary};
  font-size: 12px;
  padding: 2px 6px;
  border-radius: ${p => p.theme.radius.sm};
  outline: none;
  width: 100%;
`;

const NewItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  height: 28px;
`;

// ─── Column widths state (per pane) ───────────────────────────────────────────
const DEFAULT_COLUMN_WIDTH = 220;

// ─── Component ────────────────────────────────────────────────────────────────

interface FilePaneProps {
  paneId: string;
}

export default function FilePane({ paneId }: FilePaneProps) {
  const store = useStore();
  const pane = store.panes.find(p => p.id === paneId);

  const {
    navigateTo,
    setCurrentBreadcrumbPath,
    setViewMode,
    setColumnState,
    updateColumnState,
    clearColumnState,
    setSelection,
    toggleSelection,
    readDirSorted,
    refreshPane,
    setPreviewFile,
    closePreview,
    addTab,
    closeTab,
    switchTab,
    getBreadcrumbs,
    goBackInHistory,
    goForwardInHistory,
    pushNavHistory,
    setActivePane,
    activePane,
    showPreview,
    previewFile,
    revealTarget,
    clearRevealTarget,
    showHidden,
    openModal,
  } = store;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newItemMode, setNewItemMode] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [draggedFiles, setDraggedFiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [fileTags, setFileTags] = useState<Record<string, Tag[]>>({});
  const [tagPickerState, setTagPickerState] = useState<{ filePath: string; position: { x: number; y: number } } | null>(null);
  const columnViewRef = useRef<HTMLDivElement>(null);
  const newItemInputRef = useRef<HTMLInputElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  if (!pane) return null;

  const {
    files: rawFiles,
    viewMode,
    tabs,
    activeTab,
    columnState,
    selectedFiles,
    navigationIndex,
    navigationHistory,
  } = pane;

  const files = showHidden ? rawFiles : rawFiles.filter(f => !f.name.startsWith('.'));

  const breadcrumbs = getBreadcrumbs(paneId);
  const isActive = activePane === paneId;

  // ── Column widths init ─────────────────────────────────────────────────────
  useEffect(() => {
    const paths = columnState?.paths || [];
    if (columnWidths.length !== paths.length + 1) {
      setColumnWidths(Array(paths.length + 1).fill(DEFAULT_COLUMN_WIDTH));
    }
  }, [columnState?.paths?.length]);

  // ── Scroll column view to end on path change ──────────────────────────────
  useEffect(() => {
    if (viewMode === 'column' && columnViewRef.current) {
      setTimeout(() => {
        if (columnViewRef.current) {
          columnViewRef.current.scrollLeft = columnViewRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [columnState?.paths?.join(','), viewMode]);

  // ── Reveal target (from search/tag browser) ───────────────────────────────
  useEffect(() => {
    if (!revealTarget || revealTarget.paneId !== paneId) return;
    clearRevealTarget();
  }, [revealTarget]);

  // ── Load tags for visible files ────────────────────────────────────────────
  useEffect(() => {
    const visibleFiles = viewMode === 'column'
      ? Object.values(columnState?.filesByPath || {}).flat()
      : files;

    const toLoad = visibleFiles.filter(f => !fileTags[f.path]);
    if (toLoad.length === 0) return;

    const loadBatch = async () => {
      const results = await Promise.all(
        toLoad.slice(0, 50).map(async f => {
          const r = await window.electronAPI.getTags(f.path);
          return [f.path, r.success ? r.tags : []] as [string, Tag[]];
        })
      );
      setFileTags(prev => ({ ...prev, ...Object.fromEntries(results) }));
    };
    loadBatch();
  }, [files.length, columnState?.paths?.join(','), viewMode]);

  // ── Focus pane on click ────────────────────────────────────────────────────
  const handlePaneClick = () => {
    if (!isActive) setActivePane(paneId);
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = useCallback(async (dirPath: string, opts?: { skipHistory?: boolean }) => {
    if (viewMode === 'column') {
      const result = await readDirSorted(dirPath, paneId);
      if (!result.success) return;

      const base = pane.basePath || pane.path;
      let newPaths: string[] = [];

      if (dirPath === base || !dirPath.startsWith(base)) {
        newPaths = [dirPath];
        const newBase = dirPath;
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: { [dirPath]: result.files },
          selectedByColumn: {},
          focusedIndex: 0,
        });
        setCurrentBreadcrumbPath(paneId, newBase);
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
        });
      }
    } else {
      await navigateTo(paneId, dirPath, opts);
    }
  }, [viewMode, paneId, pane, columnState, selectedFiles, previewFile]);

  const handleBreadcrumbNavigate = (crumbPath: string) => {
    if (viewMode === 'column') {
      navigate(crumbPath);
    } else {
      navigateTo(paneId, crumbPath);
    }
  };

  // ── Item activation ────────────────────────────────────────────────────────
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
        });
      }
    }
  }, [navigate, pane, paneId, previewFile]);

  // ── Click handling ─────────────────────────────────────────────────────────
  const handleFileClick = (e: React.MouseEvent, file: FileItem) => {
    if (!isActive) setActivePane(paneId);
    e.stopPropagation();
    const multi = e.metaKey || e.ctrlKey;
    if (multi) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey && selectedFiles.size > 0) {
      const lastSel = [...selectedFiles].pop()!;
      const lastIdx = files.findIndex(f => f.path === lastSel);
      const curIdx = files.findIndex(f => f.path === file.path);
      const [lo, hi] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
      setSelection(paneId, files.slice(lo, hi + 1).map(f => f.path));
    } else {
      setSelection(paneId, [file.path]);
    }
  };

  const handleFileDoubleClick = (file: FileItem) => {
    activateFile(file);
  };

  // ── Column item click ──────────────────────────────────────────────────────
  const handleColumnItemClick = useCallback(async (
    e: React.MouseEvent,
    file: FileItem,
    columnIndex: number,
    clickType: string,
  ) => {
    if (!isActive) setActivePane(paneId);

    if (clickType === 'meta') {
      toggleSelection(paneId, file.path, true);
      return;
    }

    setSelection(paneId, [file.path]);
    updateColumnState(paneId, {
      selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
      focusedIndex: columnIndex,
    });

    if (file.isDirectory) {
      const truncatedPaths = (columnState.paths || []).slice(0, columnIndex + 1);
      const result = await readDirSorted(file.path, paneId);
      if (result.success) {
        const newPaths = [...truncatedPaths, file.path];
        const newFbp = {
          ...(columnState.filesByPath || {}),
          [file.path]: result.files,
        };
        // Remove filesByPath entries for paths after this one
        const keepPaths = new Set(newPaths);
        for (const key of Object.keys(newFbp)) {
          if (!keepPaths.has(key)) delete newFbp[key];
        }
        setColumnState(paneId, {
          paths: newPaths,
          filesByPath: newFbp,
          selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
          focusedIndex: columnIndex + 1,
        });
        setCurrentBreadcrumbPath(paneId, file.path);
        pushNavHistory(paneId, {
          basePath: pane.basePath || pane.path,
          currentBreadcrumbPath: file.path,
          selectedFiles: [file.path],
          previewFilePath: previewFile?.path || null,
        });
      }
    } else {
      const truncatedPaths = (columnState.paths || []).slice(0, columnIndex + 1);
      const newFbp = { ...(columnState.filesByPath || {}) };
      for (const key of Object.keys(newFbp)) {
        if (!truncatedPaths.includes(key)) delete newFbp[key];
      }
      setColumnState(paneId, {
        paths: truncatedPaths,
        filesByPath: newFbp,
        selectedByColumn: { ...(columnState.selectedByColumn || {}), [columnIndex]: file.path },
        focusedIndex: columnIndex,
      });
      setCurrentBreadcrumbPath(paneId, file.path);
      if (isPreviewable(file)) {
        setPreviewFile(file);
      }
      pushNavHistory(paneId, {
        basePath: pane.basePath || pane.path,
        currentBreadcrumbPath: file.path,
        selectedFiles: [file.path],
        previewFilePath: isPreviewable(file) ? file.path : (previewFile?.path || null),
      });
    }
  }, [paneId, columnState, pane, selectedFiles, previewFile, isActive]);

  // ── Context menu ───────────────────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, file: FileItem | null = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isActive) setActivePane(paneId);
    if (file && !selectedFiles.has(file.path)) {
      setSelection(paneId, [file.path]);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // ── Drop ───────────────────────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent, file: FileItem | null, path?: string) => {
    e.preventDefault();
    setDragOver(null);
    const rawPaths = e.dataTransfer.getData('file-paths');
    if (!rawPaths) return;
    const srcPaths: string[] = JSON.parse(rawPaths);
    const destDir = file?.isDirectory ? file.path : (path || pane.path);

    const isCopy = e.altKey;
    const ops = srcPaths.map(src => {
      const dest = `${destDir}/${src.split('/').pop()}`;
      return isCopy
        ? window.electronAPI.copy(src, dest)
        : window.electronAPI.move(src, dest);
    });
    await Promise.all(ops);
    refreshPane(paneId);
    if (viewMode === 'column') {
      const result = await readDirSorted(destDir, paneId);
      if (result.success) {
        updateColumnState(paneId, {
          filesByPath: { ...(columnState.filesByPath || {}), [destDir]: result.files },
        });
      }
    }
  }, [pane, paneId, columnState, viewMode]);

  // ── Rename ─────────────────────────────────────────────────────────────────
  const startRename = (file: FileItem) => {
    setRenaming(file.path);
    const nameParts = file.name.split('.');
    const baseName = file.isDirectory || nameParts.length === 1
      ? file.name
      : nameParts.slice(0, -1).join('.');
    setRenameValue(baseName);
  };

  const commitRename = async () => {
    if (!renaming) return;
    const file = files.find(f => f.path === renaming)
      || Object.values(columnState?.filesByPath || {}).flat().find(f => f.path === renaming);
    if (!file) { setRenaming(null); return; }

    const ext = file.name.includes('.') && !file.isDirectory ? '.' + file.name.split('.').pop() : '';
    const newName = renameValue + ext;
    if (newName === file.name) { setRenaming(null); return; }

    const dir = file.path.substring(0, file.path.lastIndexOf('/'));
    const newPath = `${dir}/${newName}`;
    await window.electronAPI.rename(file.path, newPath);
    setRenaming(null);
    refreshPane(paneId);
  };

  // ── New item ───────────────────────────────────────────────────────────────
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
    if (viewMode === 'column') {
      const result = await readDirSorted(dir, paneId);
      if (result.success) {
        updateColumnState(paneId, { filesByPath: { ...(columnState.filesByPath || {}), [dir]: result.files } });
      }
    }
  };

  useEffect(() => {
    if ((newItemMode || renaming) && newItemInputRef.current) {
      newItemInputRef.current.focus();
      newItemInputRef.current.select();
    }
  }, [newItemMode, renaming]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (filesToDelete?: string[]) => {
    const targets = filesToDelete || [...selectedFiles];
    if (targets.length === 0) return;
    for (const fp of targets) {
      await window.electronAPI.delete(fp);
    }
    setSelection(paneId, []);
    refreshPane(paneId);
    if (viewMode === 'column') {
      const dir = pane.currentBreadcrumbPath || pane.path;
      const result = await readDirSorted(dir, paneId);
      if (result.success) {
        updateColumnState(paneId, { filesByPath: { ...(columnState.filesByPath || {}), [dir]: result.files } });
      }
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        goBackInHistory(paneId);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        goForwardInHistory(paneId);
        return;
      }

      if (e.key === 'Escape') {
        setSelection(paneId, []);
        setContextMenu(null);
        closePreview();
        return;
      }

      if (e.key === 'Enter' && selectedFiles.size === 1) {
        const file = files.find(f => selectedFiles.has(f.path));
        if (file) activateFile(file);
        return;
      }

      if (e.key === 'Backspace' && !e.metaKey) {
        const parentDir = (pane.basePath || pane.path).split('/').slice(0, -1).join('/') || '/';
        navigate(parentDir);
        return;
      }

      const displayFiles = viewMode === 'column'
        ? (columnState.filesByPath?.[columnState.paths?.[columnState.focusedIndex ?? 0] ?? ''] || [])
        : files;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (displayFiles.length === 0) return;
        const selArr = [...selectedFiles];
        const curPath = selArr[selArr.length - 1];
        const curIdx = displayFiles.findIndex(f => f.path === curPath);
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(displayFiles.length - 1, curIdx + 1)
          : Math.max(0, curIdx - 1);
        const nextFile = displayFiles[nextIdx];
        if (nextFile) setSelection(paneId, [nextFile.path]);
        return;
      }

      if (e.key === 'ArrowRight' && viewMode === 'column') {
        e.preventDefault();
        const focusedPath = columnState.paths?.[columnState.focusedIndex ?? 0];
        const selectedInCol = columnState.selectedByColumn?.[columnState.focusedIndex ?? 0];
        const colFiles = focusedPath ? (columnState.filesByPath?.[focusedPath] || []) : [];
        const sel = colFiles.find(f => f.path === selectedInCol);
        if (sel?.isDirectory) {
          handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, sel, columnState.focusedIndex ?? 0, 'normal');
        }
        return;
      }

      if (e.key === 'ArrowLeft' && viewMode === 'column') {
        e.preventDefault();
        const newFocused = Math.max(0, (columnState.focusedIndex ?? 1) - 1);
        updateColumnState(paneId, { focusedIndex: newFocused });
        return;
      }

      if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) {
        e.preventDefault();
        handleDelete();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, paneId, selectedFiles, files, viewMode, columnState, pane]);

  // ── Column resizer ─────────────────────────────────────────────────────────
  const handleColumnResizerMouseDown = (columnIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[columnIndex] ?? DEFAULT_COLUMN_WIDTH;

    const onMove = (me: MouseEvent) => {
      const newWidth = Math.max(120, Math.min(500, startWidth + me.clientX - startX));
      setColumnWidths(prev => {
        const next = [...prev];
        next[columnIndex] = newWidth;
        return next;
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Derived column selections ──────────────────────────────────────────────
  const derivedSelections: Record<number, string | null> = {};
  if (viewMode === 'column' && columnState?.paths) {
    columnState.paths.forEach((p, i) => {
      derivedSelections[i] = columnState.selectedByColumn?.[i] ?? null;
    });
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  const renderListView = () => (
    <>
      <ListHeader>
        <ListHeaderCell />
        <ListHeaderCell>Name</ListHeaderCell>
        <ListHeaderCell style={{ textAlign: 'right' }}>Size</ListHeaderCell>
        <ListHeaderCell>Modified</ListHeaderCell>
        <ListHeaderCell>Kind</ListHeaderCell>
      </ListHeader>
      <FileListArea onClick={() => setSelection(paneId, [])}>
        {newItemMode && (
          <NewItemRow>
            <span>{newItemMode === 'folder' ? '📁' : '📄'}</span>
            <input
              ref={newItemInputRef}
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onBlur={commitNewItem}
              onKeyDown={e => {
                if (e.key === 'Enter') commitNewItem();
                if (e.key === 'Escape') { setNewItemMode(null); setNewItemName(''); }
              }}
              placeholder={newItemMode === 'folder' ? 'Folder name' : 'File name'}
              style={{ flex: 1, background: 'transparent', border: '1px solid #4A9EFF', color: 'inherit', fontSize: 12, padding: '2px 6px', borderRadius: 3, outline: 'none' }}
            />
          </NewItemRow>
        )}
        {files.length === 0 && !newItemMode ? (
          <EmptyState>
            <span style={{ fontSize: 28 }}>📂</span>
            <span>Empty folder</span>
          </EmptyState>
        ) : (
          files.map(file => (
            <FileListItem
              key={file.path}
              file={file}
              isSelected={selectedFiles.has(file.path)}
              isRenaming={renaming === file.path}
              isContextMenuSelected={contextMenu?.file?.path === file.path}
              isDragOver={dragOver === file.path}
              selectedFiles={selectedFiles}
              draggedFiles={draggedFiles}
              paneId={paneId}
              fileTags={fileTags}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onRenameCommit={commitRename}
              onRenameCancel={() => setRenaming(null)}
              onClick={e => handleFileClick(e, file)}
              onDoubleClick={() => handleFileDoubleClick(file)}
              onContextMenu={e => handleContextMenu(e, file)}
              onDrop={(e, f) => handleDrop(e, f)}
              setSelection={setSelection}
              setDraggedFiles={setDraggedFiles}
              setIsDragging={setIsDragging}
              setDragOver={setDragOver}
            />
          ))
        )}
      </FileListArea>
    </>
  );

  const renderGridView = () => (
    <GridArea onClick={() => setSelection(paneId, [])}>
      {files.map(file => (
        <FileGridItem
          key={file.path}
          file={file}
          isSelected={selectedFiles.has(file.path)}
          isDragOver={dragOver === file.path}
          selectedFiles={selectedFiles}
          draggedFiles={draggedFiles}
          paneId={paneId}
          fileTags={fileTags}
          onClick={e => handleFileClick(e, file)}
          onDoubleClick={() => handleFileDoubleClick(file)}
          onContextMenu={e => handleContextMenu(e, file)}
          onDrop={(e, f) => handleDrop(e, f)}
          setSelection={setSelection}
          setDraggedFiles={setDraggedFiles}
          setIsDragging={setIsDragging}
          setDragOver={setDragOver}
        />
      ))}
    </GridArea>
  );

  const renderColumnView = () => {
    const paths = columnState?.paths || [];
    const filesByPath = columnState?.filesByPath || {};
    const base = pane.basePath || pane.path;
    const baseDirFiles = filesByPath[base] || files;

    return (
      <ColumnViewArea ref={columnViewRef} onClick={() => setSelection(paneId, [])}>
        <Column
          key={base}
          colPath={base}
          columnIndex={0}
          colFiles={baseDirFiles}
          isFocused={(columnState?.focusedIndex ?? 0) === 0}
          width={`${columnWidths[0] ?? DEFAULT_COLUMN_WIDTH}px`}
          columnPaths={paths}
          derivedSelections={derivedSelections}
          selectedFiles={selectedFiles}
          draggedFiles={draggedFiles}
          dragOver={dragOver}
          contextMenuFile={contextMenu?.file ?? null}
          paneId={paneId}
          fileTags={fileTags}
          onItemClick={handleColumnItemClick}
          onItemContextMenu={(e, f) => handleContextMenu(e, f)}
          onDrop={handleDrop}
          onEmptyClick={() => updateColumnState(paneId, { focusedIndex: 0 })}
          setSelection={setSelection}
          setDraggedFiles={setDraggedFiles}
          setIsDragging={setIsDragging}
          setDragOver={setDragOver}
          updateColumnState={updateColumnState}
          toggleSelection={toggleSelection}
          onResizerMouseDown={handleColumnResizerMouseDown(0)}
        />
        {paths.map((colPath, idx) => {
          const colFiles = filesByPath[colPath] || [];
          const colIndex = idx + 1;
          return (
            <Column
              key={colPath}
              colPath={colPath}
              columnIndex={colIndex}
              colFiles={colFiles}
              isFocused={(columnState?.focusedIndex ?? 0) === colIndex}
              width={`${columnWidths[colIndex] ?? DEFAULT_COLUMN_WIDTH}px`}
              columnPaths={paths}
              derivedSelections={derivedSelections}
              selectedFiles={selectedFiles}
              draggedFiles={draggedFiles}
              dragOver={dragOver}
              contextMenuFile={contextMenu?.file ?? null}
              paneId={paneId}
              fileTags={fileTags}
              onItemClick={handleColumnItemClick}
              onItemContextMenu={(e, f) => handleContextMenu(e, f)}
              onDrop={handleDrop}
              onEmptyClick={() => updateColumnState(paneId, { focusedIndex: colIndex })}
              setSelection={setSelection}
              setDraggedFiles={setDraggedFiles}
              setIsDragging={setIsDragging}
              setDragOver={setDragOver}
              updateColumnState={updateColumnState}
              toggleSelection={toggleSelection}
              onResizerMouseDown={handleColumnResizerMouseDown(colIndex)}
            />
          );
        })}
      </ColumnViewArea>
    );
  };

  const totalFiles = viewMode === 'column'
    ? (columnState?.filesByPath?.[columnState?.paths?.[columnState?.focusedIndex ?? 0] ?? ''] || []).length
    : files.length;
  const selCount = selectedFiles.size;

  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex < (navigationHistory?.length ?? 0) - 1;

  return (
    <PaneWrap ref={paneRef} onClick={handlePaneClick} onContextMenu={e => handleContextMenu(e, null)}>
      {/* Tab bar */}
      <TabBar>
        {tabs.map((tab, i) => (
          <Tab
            key={tab.id}
            active={i === activeTab}
            onClick={e => { e.stopPropagation(); switchTab(paneId, i); }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
            {tabs.length > 1 && (
              <TabClose onClick={e => { e.stopPropagation(); closeTab(paneId, i); }}>✕</TabClose>
            )}
          </Tab>
        ))}
        <AddTabBtn onClick={e => { e.stopPropagation(); addTab(paneId); }} title="New Tab">+</AddTabBtn>
      </TabBar>

      {/* Toolbar */}
      <Toolbar>
        <NavBtn disabled={!canGoBack} onClick={() => goBackInHistory(paneId)} title="Back">‹</NavBtn>
        <NavBtn disabled={!canGoForward} onClick={() => goForwardInHistory(paneId)} title="Forward">›</NavBtn>
        <ToolbarSep />
        <PaneBreadcrumb breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
        <ToolbarSep />
        <ViewBtn active={viewMode === 'column'} onClick={() => setViewMode(paneId, 'column')} title="Column view">⊟</ViewBtn>
        <ViewBtn active={viewMode === 'list'} onClick={() => setViewMode(paneId, 'list')} title="List view">☰</ViewBtn>
        <ViewBtn active={viewMode === 'grid'} onClick={() => setViewMode(paneId, 'grid')} title="Grid view">⊞</ViewBtn>
        <ToolbarSep />
        <NavBtn onClick={() => refreshPane(paneId)} title="Refresh">↺</NavBtn>
      </Toolbar>

      {/* File area */}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'column' && renderColumnView()}

      {/* Status bar */}
      <StatusBar>
        <span>{totalFiles} item{totalFiles !== 1 ? 's' : ''}{selCount > 0 ? `, ${selCount} selected` : ''}</span>
        {selCount === 1 && (() => {
          const f = files.find(fi => selectedFiles.has(fi.path))
            || Object.values(columnState?.filesByPath || {}).flat().find(fi => selectedFiles.has(fi.path));
          return f ? <span>{f.isDirectory ? 'Folder' : formatSize(f.size)}</span> : null;
        })()}
      </StatusBar>

      {/* Context menu */}
      {contextMenu && (
        <PaneContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          paneId={paneId}
          currentPath={pane.currentBreadcrumbPath || pane.path}
          selectedFiles={selectedFiles}
          onClose={() => setContextMenu(null)}
          onRename={() => contextMenu.file && startRename(contextMenu.file)}
          onNewFolder={() => { setNewItemMode('folder'); setNewItemName(''); }}
          onNewFile={() => { setNewItemMode('file'); setNewItemName(''); }}
          onDelete={handleDelete}
          onRefresh={() => refreshPane(paneId)}
          onBatchRename={() => openModal('batchRename', { files: [...selectedFiles] })}
        />
      )}

      {/* Inline tag picker */}
      {tagPickerState && (
        <InlineTagPicker
          filePath={tagPickerState.filePath}
          currentTags={fileTags[tagPickerState.filePath] || []}
          position={tagPickerState.position}
          onClose={() => setTagPickerState(null)}
          onTagsChanged={tags => setFileTags(prev => ({ ...prev, [tagPickerState.filePath]: tags }))}
        />
      )}
    </PaneWrap>
  );
}
