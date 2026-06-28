import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, getFileIcon, isPreviewable } from '../../store';
import PaneBreadcrumb from './PaneBreadcrumb';
import PaneContextMenu from './PaneContextMenu';
import InlineTagPicker from './InlineTagPicker';
import PreviewPane from '../PreviewPane';
import QuickPreviewModal from '../QuickPreviewModal';
import type { FileItem, Tag } from '../../types';
import { KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME } from '../../constants';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import { useFileActions } from './useFileActions';
import { useColumnItemClick } from './useColumnItemClick';
import { useNavigation } from './useNavigation';
import { useDragDrop } from './useDragDrop';
import { useQuickPreview } from './useQuickPreview';
import ColumnView from './ColumnView';

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
  height: 26px;
  overflow: hidden;
  flex-shrink: 0;
  /* gap: 2px; */
  `;

const Tab = styled.div<{ $active: boolean }>`
  border-bottom: ${p => p.$active ? 'none' : `1px solid ${p.theme.border.subtle}`};
  border-right: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  height: 100%;
  cursor: pointer;
  font-size: 11px;
  background: ${p => p.$active ? p.theme.bg.secondary : p.theme.bg.tertiary};
  color: ${p => p.$active ? p.theme.text.primary : p.theme.text.tertiary};
  transition: all 0.1s;
  white-space: nowrap;
  overflow: hidden;
  flex: 1 1 0;
  min-width: 60px;
  &:not($active):hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
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
  padding: 6px;
  border-radius: ${p => p.theme.radius.sm};
  flex-shrink: 0;
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
  opacity: ${p => p.disabled ? 0.35 : 1};
  transition: all 0.1s;
  &:hover:not(:disabled) { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
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

const TabLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const InlineSearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.accent.blue};
  border-radius: ${p => p.theme.radius.sm};
  padding: 0 6px;
  height: 22px;
`;

const InlineSearchInput = styled.input`
  background: transparent;
  border: none;
  outline: none;
  color: ${p => p.theme.text.primary};
  font-size: 11px;
  width: 160px;
  &::placeholder { color: ${p => p.theme.text.tertiary}; }
`;

const InlineSearchNavBtn = styled.button<{ disabled?: boolean }>`
  background: none;
  border: none;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  color: ${p => p.disabled ? p.theme.text.tertiary : p.theme.text.secondary};
  opacity: ${p => p.disabled ? 0.35 : 1};
  padding: 0 2px;
  font-size: 10px;
  line-height: 1;
  display: flex;
  align-items: center;
  &:hover:not(:disabled) { color: ${p => p.theme.text.primary}; }
`;

const InlineSearchCount = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  white-space: nowrap;
  min-width: 28px;
  text-align: center;
`;

const InlineSearchClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${p => p.theme.text.tertiary};
  padding: 0;
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  &:hover { color: ${p => p.theme.text.primary}; }
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
  const showInlineSearch = store.showInlineSearch;
  const toggleInlineSearch = store.toggleInlineSearch;

  const {
    navigateTo,
    setCurrentBreadcrumbPath,
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
    panes,
    revealTarget,
    clearRevealTarget,
    revealFileInTree,
    showHidden,
    openModal,
    toggleHiddenFiles,
    activeModal,
    showSearch,
    getColumnPaths,
  } = store;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null } | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [fileTags, setFileTags] = useState<Record<string, Tag[]>>({});
  const [tagPickerState, setTagPickerState] = useState<{ filePath: string; position: { x: number; y: number } } | null>(null);
  const [typingBuffer, setTypingBuffer] = useState('');
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const [inlineMatchIndex, setInlineMatchIndex] = useState(0);
  const inlineSearchInputRef = useRef<HTMLInputElement>(null);
  const inlineSearchLoadRef = useRef<string | null>(null);

  // Get preview state from active tab
  const activePaneState = panes.find(p => p.id === activePane);
  const previewFile = activePaneState?.tabs[activePaneState?.activeTab || 0]?.previewFile || null;
  const showPreview = previewFile !== null;
  const [folderSizes, setFolderSizes] = useState<Record<string, number>>({});
  const columnViewRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingBufferRef = useRef('');
  const selectedFilesRef = useRef<Set<string>>(new Set());
  const paneRefForSearch = useRef<any>(null);
  const columnStateRef = useRef<any>(null);
  const filesRef = useRef<FileItem[]>([]);
  const getColumnPathsRef = useRef<any>(() => []);
  const shiftAnchorPathRef = useRef<string | null>(null);
  const shiftCursorPathRef = useRef<string | null>(null);

  const clearShiftState = () => {
    shiftAnchorPathRef.current = null;
    shiftCursorPathRef.current = null;
  };

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

  // Update refs when values change
  typingBufferRef.current = typingBuffer;
  selectedFilesRef.current = selectedFiles;
  paneRefForSearch.current = pane;
  columnStateRef.current = columnState;
  filesRef.current = files;
  getColumnPathsRef.current = getColumnPaths;

  const breadcrumbs = getBreadcrumbs(paneId);
  const isActive = activePane === paneId;

  // ── Column widths init ─────────────────────────────────────────────────────
  useEffect(() => {
    const paths = columnState?.paths || [];
    if (columnWidths.length !== paths.length + 1) {
      setColumnWidths(Array(paths.length + 1).fill(DEFAULT_COLUMN_WIDTH));
    }
  }, [columnState?.paths?.length]);

  // ── Scroll column view to end on path change, preview open/close, or file change
  useEffect(() => {
    if (columnViewRef.current) {
      columnViewRef.current.scrollLeft = columnViewRef.current.scrollWidth;
    }
    // Clear typing buffer on navigation or view change
    setTypingBuffer('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [columnState?.paths?.join(','), showPreview, previewFile?.path]);

  // ── Inline search: focus input when opened, clear query when closed ────────
  useEffect(() => {
    if (showInlineSearch && isActive) {
      setInlineSearchQuery('');
      setTimeout(() => inlineSearchInputRef.current?.focus(), 0);
    }
  }, [showInlineSearch, isActive]);

  // ── Inline search: auto-select match, open folder column, trigger preview ───
  useEffect(() => {
    if (!showInlineSearch || !isActive) return;
    const q = inlineSearchQuery.toLowerCase();
    if (!q) return;
    const focusedIdx = columnState?.focusedIndex ?? 0;
    const base = pane?.basePath || pane?.path || '';
    const columnPaths = getColumnPaths(paneId);
    const focusedColPath = columnPaths[focusedIdx] ?? base;
    const allFiles: FileItem[] = columnState?.filesByPath?.[focusedColPath] || (focusedIdx === 0 ? files : []);
    const searchFiles = (showHidden ? allFiles : allFiles.filter((f: FileItem) => !f.name.startsWith('.')));
    const matches = searchFiles.filter((f: FileItem) => f.name.toLowerCase().includes(q));
    if (matches.length === 0) return;
    const safeIdx = Math.max(0, Math.min(inlineMatchIndex, matches.length - 1));
    const match = matches[safeIdx];

    setSelection(paneId, [match.path], focusedIdx);
    updateColumnState(paneId, {
      selectedByColumn: { ...(columnState?.selectedByColumn || {}), [focusedIdx]: match.path },
      focusedIndex: focusedIdx,
    });

    if (match.isDirectory) {
      setPreviewFile(null);
      const keptPaths = (columnState?.paths || []).slice(0, focusedIdx);
      const newPaths = [...keptPaths, match.path];
      const keepSet = new Set([base, ...keptPaths]);
      const immediateFbp: Record<string, FileItem[]> = {};
      for (const [k, v] of Object.entries(columnState?.filesByPath || {})) {
        if (keepSet.has(k)) immediateFbp[k] = v as FileItem[];
      }
      setColumnState(paneId, {
        paths: newPaths,
        filesByPath: immediateFbp,
        selectedByColumn: { ...(columnState?.selectedByColumn || {}), [focusedIdx]: match.path },
        focusedIndex: focusedIdx,
        loadingPath: match.path,
      });
      const loadKey = match.path;
      inlineSearchLoadRef.current = loadKey;
      readDirSorted(match.path, paneId).then(result => {
        if (inlineSearchLoadRef.current !== loadKey) return;
        if (result.success) {
          setColumnState(paneId, {
            paths: newPaths,
            filesByPath: { ...immediateFbp, [match.path]: result.files },
            selectedByColumn: { ...(columnState?.selectedByColumn || {}), [focusedIdx]: match.path },
            focusedIndex: focusedIdx,
            loadingPath: null,
          });
        }
      });
    } else {
      if (isPreviewable(match)) {
        setPreviewFile(match);
      } else {
        setPreviewFile(null);
      }
    }
  }, [inlineSearchQuery, inlineMatchIndex, showInlineSearch, isActive]);

  // ── Reveal target (from search/tag browser) ───────────────────────────────
  useEffect(() => {
    if (!revealTarget || revealTarget.paneId !== paneId) return;
    revealFileInTree(revealTarget.paneId, revealTarget.filePath, revealTarget.fileDir, revealTarget.isDirectory);
    clearRevealTarget();
  }, [revealTarget, revealFileInTree]);

  // ── Load tags for visible files ────────────────────────────────────────────
  useEffect(() => {
    const visibleFiles = Object.values(columnState?.filesByPath || {}).flat();

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
  }, [files.length, columnState?.paths?.join(',')]);

  // ── Calculate folder size when a folder is selected ───────────────────────
  useEffect(() => {
    if (selectedFiles.size !== 1) return;

    const selectedPath = Array.from(selectedFiles)[0];
    const selectedFile = files.find(f => f.path === selectedPath)
      || Object.values(columnState?.filesByPath || {}).flat().find(f => f.path === selectedPath);

    if (selectedFile?.isDirectory && !folderSizes[selectedPath]) {
      window.electronAPI.folderSize(selectedPath).then(r => {
        if (r.success) {
          setFolderSizes(prev => ({ ...prev, [selectedPath]: r.tree.size }));
        }
      });
    }
  }, [selectedFiles, files, columnState?.filesByPath]);

  // ── Focus pane on click ────────────────────────────────────────────────────
  const handlePaneClick = () => {
    if (!isActive) setActivePane(paneId);
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const { navigate, handleBreadcrumbNavigate } = useNavigation({
    paneId, pane, columnState, selectedFiles, previewFile,
    navigateTo, readDirSorted, setColumnState, setCurrentBreadcrumbPath,
    setPreviewFile, pushNavHistory,
  });

  // ── Click handling ─────────────────────────────────────────────────────────
  const handleFileClick = (e: React.MouseEvent, file: FileItem) => {
    if (!isActive) setActivePane(paneId);
    e.stopPropagation();
    if (!e.shiftKey) {
      clearShiftState();
    }
    const multi = e.metaKey || e.ctrlKey;
    if (multi) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey && pane.lastSelectedFile) {
      const lastIdx = files.findIndex(f => f.path === pane.lastSelectedFile);
      const curIdx = files.findIndex(f => f.path === file.path);
      const [lo, hi] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
      const rangeFiles = files.slice(lo, hi + 1).map(f => f.path);
      const newSelection = new Set([...selectedFiles, ...rangeFiles]);
      setSelection(paneId, Array.from(newSelection));
    } else {
      setSelection(paneId, [file.path]);
    }
  };

  // ── Double-click handling ──────────────────────────────────────────────────
  const handleFileDoubleClick = useCallback(async (file: FileItem) => {
    if (file.isDirectory) {
      await navigate(file.path);
    } else {
      const ext = file.extension || '';
      const r = await window.electronAPI.getDefaultApp(ext);
      if (r.success && r.app) {
        window.electronAPI.openWith(file.path, r.app.path);
      } else {
        window.electronAPI.openPath(file.path);
      }
    }
  }, [navigate]);

  // ── Column item click ──────────────────────────────────────────────────────
  const handleColumnItemClick = useColumnItemClick({
    paneId, pane, files, columnState, selectedFiles, previewFile, isActive,
    clearShiftState, setActivePane, setSelection, toggleSelection,
    setColumnState, updateColumnState, setCurrentBreadcrumbPath,
    setPreviewFile, pushNavHistory, readDirSorted, getColumnPaths,
  });

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

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const { draggedFiles, setDraggedFiles, setIsDragging, dragOver, setDragOver, handleDrop } = useDragDrop({
    paneId, pane, columnState, refreshPane, readDirSorted, updateColumnState,
  });

  // ── File actions (rename, create, delete) ─────────────────────────────────
  const {
    renaming, setRenaming, renameValue, setRenameValue,
    newItemMode, setNewItemMode, newItemName, setNewItemName,
    newItemInputRef, startRename, commitRename, createFolder,
    commitNewItem, handleDelete, createNewFile, groupInFolder,
  } = useFileActions({
    paneId, pane, files, columnState, selectedFiles,
    readDirSorted, updateColumnState, setColumnState,
    setCurrentBreadcrumbPath, setSelection, setPreviewFile,
    refreshPane, openModal,
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useKeyboardNavigation({
    isActive, paneId, selectedFiles, files, columnState, pane,
    showHidden, getColumnPaths, toggleHiddenFiles, setSelection,
    handleColumnItemClick, startRename, createFolder, handleDelete,
    goBackInHistory, goForwardInHistory, typingBufferRef, setTypingBuffer,
    shiftAnchorPathRef, shiftCursorPathRef,
  });

  // ── Type-to-search debounce ─────────────────────────────────────────────────
  useEffect(() => {
    const buffer = typingBufferRef.current;
    if (!buffer) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      const currentColumnState = columnStateRef.current;
      const currentPane = paneRefForSearch.current;
      const currentFiles = filesRef.current;
      const currentGetColumnPaths = getColumnPathsRef.current;

      // Determine which files to search in the focused column
      const focusedIdx = currentColumnState?.focusedIndex ?? 0;
      const base = currentPane?.basePath || currentPane?.path || '';
      const columnPaths = currentGetColumnPaths(paneId);
      const focusedColPath = columnPaths[focusedIdx] ?? base;
      const searchFiles: FileItem[] = currentColumnState?.filesByPath?.[focusedColPath] || (focusedIdx === 0 ? currentFiles : []);

      // Find first match
      const match = searchFiles.find(f => f.name.toLowerCase().startsWith(buffer));
      if (match) {
        const focusedIdx2 = currentColumnState?.focusedIndex ?? 0;
        handleColumnItemClick({ stopPropagation: () => {} } as React.MouseEvent, match, focusedIdx2, 'keyboard');
      }
      // Clear buffer after search attempt
      typingBufferRef.current = '';
      setTypingBuffer('');
    }, KEYBOARD_SEARCH_IN_FILE_TREE_DEBOUNCE_TIME);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [typingBuffer, paneId]);

  // ── Quick preview (spacebar) ──────────────────────────────────────────────
  const { quickPreviewFile, setQuickPreviewFile } = useQuickPreview({
    paneId, activePane, selectedFiles, files, columnState, activeModal, showSearch,
  });

  // ── Column resizer ─────────────────────────────────────────────────────────
  const handleColumnResizerMouseDown = (columnIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[columnIndex] ?? DEFAULT_COLUMN_WIDTH;
    let currentWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (me: MouseEvent) => {
      currentWidth = Math.max(120, Math.min(500, startWidth + me.clientX - startX));
      const colEl = columnViewRef.current?.querySelector<HTMLElement>(
        `[data-column-index="${columnIndex}"]`
      );
      if (colEl) {
        colEl.style.width = `${currentWidth}px`;
        colEl.style.minWidth = `${currentWidth}px`;
      }
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setColumnWidths(prev => {
        const next = [...prev];
        next[columnIndex] = currentWidth;
        return next;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Derived column selections ──────────────────────────────────────────────
  const derivedSelections: Record<number, string | null> = {};
  if (columnState?.paths) {
    columnState.paths.forEach((p, i) => {
      derivedSelections[i] = columnState.selectedByColumn?.[i] ?? null;
    });
  }

  // ── Column empty-click handlers ───────────────────────────────────────────
  const handleBaseColumnEmptyClick = () => {
    const base = pane.basePath || pane.path;
    setSelection(paneId, []);
    setColumnState(paneId, {
      paths: [],
      filesByPath: { [base]: columnState.filesByPath?.[base] || files },
      selectedByColumn: {},
      focusedIndex: 0,
      loadingPath: null,
    });
    setCurrentBreadcrumbPath(paneId, base);
    setPreviewFile(null);
    pushNavHistory(paneId, { basePath: base, currentBreadcrumbPath: base, selectedFiles: [], previewFilePath: null });
  };

  const handleColumnEmptyClick = (colIndex: number) => {
    // Keep paths up to and including this column, remove only columns to the right.
    const keptPaths = (columnState.paths || []).slice(0, colIndex);
    const base = pane.basePath || pane.path;
    const keepSet = new Set([base, ...keptPaths]);
    const newFbp: Record<string, FileItem[]> = {};
    for (const [k, v] of Object.entries(columnState.filesByPath || {})) {
      if (keepSet.has(k)) newFbp[k] = v as FileItem[];
    }
    const newSelByCol: Record<number, string> = {};
    for (let i = 0; i < colIndex; i++) {
      if (columnState.selectedByColumn?.[i]) newSelByCol[i] = columnState.selectedByColumn[i];
    }
    delete newSelByCol[colIndex];
    const newBreadcrumb = keptPaths.length > 0 ? keptPaths[keptPaths.length - 1] : base;
    setSelection(paneId, []);
    setColumnState(paneId, { paths: keptPaths, filesByPath: newFbp, selectedByColumn: newSelByCol, focusedIndex: colIndex, loadingPath: null });
    setCurrentBreadcrumbPath(paneId, newBreadcrumb);
    setPreviewFile(null);
    pushNavHistory(paneId, { basePath: base, currentBreadcrumbPath: newBreadcrumb, selectedFiles: [], previewFilePath: null });
  };

  const _focusedIdx = columnState?.focusedIndex ?? 0;
  const _base = pane?.basePath || pane?.path || '';
  const _focusedPath = _focusedIdx === 0 ? _base : (columnState?.paths?.[((_focusedIdx) - 1)] ?? '');
  const totalFiles = _focusedIdx === 0 ? files.length : (showHidden ? columnState?.filesByPath?.[_focusedPath] || [] : (columnState?.filesByPath?.[_focusedPath] || []).filter((f: FileItem) => !f.name.startsWith('.'))).length;
  const selCount = selectedFiles.size;

  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex < (navigationHistory?.length ?? 0) - 1;

  // Compute inline search matches for nav button state
  const _inlineMatches: FileItem[] = (() => {
    if (!showInlineSearch || !isActive || !inlineSearchQuery) return [];
    const q = inlineSearchQuery.toLowerCase();
    const focusedIdx = columnState?.focusedIndex ?? 0;
    const base = pane?.basePath || pane?.path || '';
    const columnPaths = getColumnPaths(paneId);
    const focusedColPath = columnPaths[focusedIdx] ?? base;
    const allFiles: FileItem[] = columnState?.filesByPath?.[focusedColPath] || (focusedIdx === 0 ? files : []);
    const searchFiles = showHidden ? allFiles : allFiles.filter(f => !f.name.startsWith('.'));
    return searchFiles.filter(f => f.name.toLowerCase().includes(q));
  })();
  const _safeInlineIdx = Math.max(0, Math.min(inlineMatchIndex, _inlineMatches.length - 1));

  return (
    <PaneWrap ref={paneRef} onClick={handlePaneClick} onContextMenu={e => handleContextMenu(e, null)}>
      {/* Tab bar */}
      <TabBar>
        {tabs.map((tab, i) => (
          <Tab
            key={tab.id}
            $active={i === activeTab}
            onClick={e => { e.stopPropagation(); switchTab(paneId, i); }}
          >
            <TabLabel>{tab.label}</TabLabel>
            {tabs.length > 1 && (
              <TabClose onClick={e => { e.stopPropagation(); closeTab(paneId, i); }}>✕</TabClose>
            )}
          </Tab>
        ))}
        <AddTabBtn onClick={e => { e.stopPropagation(); addTab(paneId); }} title="New Tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </AddTabBtn>
      </TabBar>

      {/* Toolbar */}
      <Toolbar>
        <NavBtn disabled={!canGoBack} onClick={() => goBackInHistory(paneId)} title="Back">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </NavBtn>
        <NavBtn disabled={!canGoForward} onClick={() => goForwardInHistory(paneId)} title="Forward">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </NavBtn>
        <PaneBreadcrumb breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
        {showInlineSearch && isActive && (
          <InlineSearchWrap>
            <InlineSearchInput
              ref={inlineSearchInputRef}
              value={inlineSearchQuery}
              onChange={e => { setInlineSearchQuery(e.target.value); setInlineMatchIndex(0); }}
              onKeyDown={e => {
                if (e.key === 'Escape') { toggleInlineSearch(); setInlineSearchQuery(''); setInlineMatchIndex(0); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setInlineMatchIndex(i => Math.max(0, i - 1)); }
                if (e.key === 'ArrowDown') { e.preventDefault(); setInlineMatchIndex(i => Math.min(_inlineMatches.length - 1, i + 1)); }
                e.stopPropagation();
              }}
              placeholder="Search"
            />
            {_inlineMatches.length > 0 && (
              <InlineSearchCount>{_safeInlineIdx + 1}/{_inlineMatches.length}</InlineSearchCount>
            )}
            <InlineSearchNavBtn
              disabled={_safeInlineIdx <= 0}
              onClick={() => setInlineMatchIndex(i => Math.max(0, i - 1))}
              title="Previous match (↑)"
            >
              ∧
            </InlineSearchNavBtn>
            <InlineSearchNavBtn
              disabled={_safeInlineIdx >= _inlineMatches.length - 1 || _inlineMatches.length === 0}
              onClick={() => setInlineMatchIndex(i => Math.min(_inlineMatches.length - 1, i + 1))}
              title="Next match (↓)"
            >
              ∨
            </InlineSearchNavBtn>
            <InlineSearchClose
              onClick={() => { toggleInlineSearch(); setInlineSearchQuery(''); setInlineMatchIndex(0); }}
              title="Close search"
            >
              ✕
            </InlineSearchClose>
          </InlineSearchWrap>
        )}
      </Toolbar>

      {/* File area + Preview Pane (side by side) */}
      <ContentArea>
        <ColumnView
            paneId={paneId} pane={pane} files={files} columnState={columnState}
            showHidden={showHidden} columnViewRef={columnViewRef}
            columnWidths={columnWidths} defaultColumnWidth={DEFAULT_COLUMN_WIDTH}
            derivedSelections={derivedSelections} selectedFiles={selectedFiles}
            draggedFiles={draggedFiles} dragOver={dragOver}
            contextMenuFile={contextMenu?.file ?? null}
            fileTags={fileTags} renaming={renaming} renameValue={renameValue}
            setRenameValue={setRenameValue} commitRename={commitRename} setRenaming={setRenaming}
            handleColumnItemClick={handleColumnItemClick}
            handleFileDoubleClick={handleFileDoubleClick}
            handleContextMenu={handleContextMenu} handleDrop={handleDrop}
            handleColumnResizerMouseDown={handleColumnResizerMouseDown}
            setSelection={setSelection} setDraggedFiles={setDraggedFiles}
            setIsDragging={setIsDragging} setDragOver={setDragOver}
            updateColumnState={updateColumnState} toggleSelection={toggleSelection}
            onBaseEmptyClick={handleBaseColumnEmptyClick}
            onColumnEmptyClick={handleColumnEmptyClick}
            searchHighlight={showInlineSearch && isActive ? inlineSearchQuery : undefined}
          />
        {showPreview && activePane === paneId && previewFile && (
          <PreviewPane />
        )}
      </ContentArea>

      {/* Status bar */}
      <StatusBar>
        <span>{totalFiles} item{totalFiles !== 1 ? 's' : ''}{selCount > 0 ? `, ${selCount} selected` : ''}</span>
        {typingBuffer && <span style={{ color: '#4A9EFF', marginLeft: '10px' }}>Searching: {typingBuffer}</span>}
        {!typingBuffer && selCount === 1 && (() => {
          const f = files.find(fi => selectedFiles.has(fi.path))
            || Object.values(columnState?.filesByPath || {}).flat().find(fi => selectedFiles.has(fi.path));
          return f ? <span>{f.isDirectory ? (folderSizes[f.path] !== undefined ? formatSize(folderSizes[f.path]) : 'Calculating...') : formatSize(f.size)}</span> : null;
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
          onNewFolder={createFolder}
          onNewFile={createNewFile}
          onDelete={handleDelete}
          onRefresh={() => refreshPane(paneId)}
          onBatchRename={() => openModal('batchRename', { files: [...selectedFiles] })}
          onGroupInFolder={groupInFolder}
          onTagsChanged={(filePath, tags) => setFileTags(prev => ({ ...prev, [filePath]: tags }))}
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

      {/* Quick Preview Modal (Spacebar) */}
      {quickPreviewFile && (
        <QuickPreviewModal file={quickPreviewFile} onClose={() => setQuickPreviewFile(null)} />
      )}
    </PaneWrap>
  );
}
