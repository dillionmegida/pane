import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Tooltip } from 'react-tooltip';
import { useStore, formatSize, sortFiles, PREVIEW_TYPES, filterHiddenFiles } from '../../store';
import PreviewPane from '../PreviewPane';
import QuickPreviewModal from '../QuickPreviewModal';

import PaneBreadcrumb from './PaneBreadcrumb';
import FileListItem from './FileListItem';
import FileGridItem from './FileGridItem';
import Column from './Column';
import PaneContextMenu from './PaneContextMenu';
import InlineTagPicker from './InlineTagPicker';

const SymlinkTooltipStyles = createGlobalStyle`
  .symlink-tooltip {
    background-color: ${props => props.theme.bg.elevated} !important;
    color: ${props => props.theme.text.primary} !important;
    font-size: 11px !important;
    padding: 4px 8px !important;
    border-radius: ${props => props.theme.radius.sm} !important;
    border: 2px solid ${props => props.theme.border.strong} !important;
    box-shadow: ${props => props.theme.shadow.md} !important;
    z-index: 9999 !important;
  }
`;

const PaneContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.subtle};
  transition: border-color 0.15s;
  position: relative;

  &.active {
    border: 1px solid ${p => p.theme.border.focus + '40'};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
  height: 25px;
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-inline: 10px 2px;
  cursor: pointer;
  font-size: 10px;
  color: ${p => p.theme.text.secondary};
  background: transparent;
  border-right: 1px solid ${p => p.theme.border.subtle};
  border-bottom: 2px solid transparent;
  position: relative;
  transition: all 0.1s;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;

  &:hover { background: ${p => p.theme.bg.hover}; }

  &.active {
    color: ${p => p.theme.text.primary};
    background: ${p => p.theme.bg.primary};
    border-bottom: 1px solid ${p => p.theme.accent.blue};
  }

  .tab-name { overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .close-btn {
    opacity: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    flex-shrink: 0;
    color: ${p => p.theme.text.tertiary};
    transition: all 0.1s;
    &:hover { background: ${p => p.theme.bg.active}; color: ${p => p.theme.text.primary}; }
  }
  &:hover .close-btn { opacity: 1; }
`;

const NewTabBtn = styled.button`
  padding: 0 10px;
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  &:hover { color: ${p => p.theme.text.primary}; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: ${p => p.theme.toolbar};
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const NavBtn = styled.button`
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  &:disabled { opacity: 0.3; cursor: default; &:hover { background: none; } }
`;

const FileListArea = styled.div`
  flex: 1;
  overflow-y: auto;
  position: relative;
  height: 100%;
`;

const ColumnHeader = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 70px 100px 60px;
  padding: 0 8px;
  height: 22px;
  align-items: center;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const ColHead = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  padding: 2px 4px;
  &:hover { color: ${p => p.theme.text.secondary}; }
`;

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
`;

const ColumnsContainer = styled.div`
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  background: ${p => p.theme.bg.primary};
  height: 100%;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${p => p.theme.text.tertiary};
  font-size: 12px;
  gap: 8px;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${p => p.theme.statusBar};
  padding: 0 10px;
  background: ${p => p.theme.bg.secondary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  flex-shrink: 0;
`;

const InlineCreateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${p => p.theme.bg.secondary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
  input {
    flex: 1;
    background: ${p => p.theme.bg.elevated};
    border: 1px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.sm};
    color: ${p => p.theme.text.primary};
    font-size: 12px;
    padding: 4px 8px;
    outline: none;
  }
  button {
    background: none;
    border: 1px solid ${p => p.theme.border.normal};
    color: ${p => p.theme.text.secondary};
    border-radius: ${p => p.theme.radius.sm};
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
    &:hover { background: ${p => p.theme.bg.hover}; }
  }
  span {
    font-size: 11px;
    color: ${p => p.theme.text.tertiary};
    flex-shrink: 0;
  }
`;

export default function FilePane({ paneId }) {
  const {
    panes,
    activePane,
    setActivePane,
    navigateTo,
    refreshPane,
    setSelection,
    toggleSelection,
    setSortBy,
    switchTab,
    addTab,
    closeTab,
    setPreviewFile,
    addToClipboard, clipboardQueue, pasteClipboard,
    setCurrentBreadcrumbPath,
    updateColumnState,
    getBreadcrumbs,
    getColumnPaths,
    getActiveBookmark,
    activeModal,
    openModal,
    showSearch,
    showSidebar,
    bookmarks,
    setBookmarks,
    goBackInHistory,
    goForwardInHistory,
    pushNavHistory,
    closePreview,
    setDirectorySort,
    getDirSort,
    showHidden,
  } = useStore();

  const pane = panes.find(p => p.id === paneId);
  if (!pane) return null;

  const {
    path: currentPath, files: allFiles, loading, selectedFiles,
    sortBy, sortOrder, viewMode, tabs, activeTab,
    currentBreadcrumbPath, columnState,
  } = pane;

  const files = filterHiddenFiles(allFiles, showHidden);

  // ── Tag state ──────────────────────────────────────────────────────────────
  const [fileTags, setFileTags] = useState({});
  const [ctxAllTags, setCtxAllTags] = useState([]);
  const [ctxFileTags, setCtxFileTags] = useState(new Set());
  const [ctxTagHover, setCtxTagHover] = useState(null);
  const [ctxSortTarget, setCtxSortTarget] = useState(null);
  const [ctxSortHover, setCtxSortHover] = useState(null);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagMenuAllTags, setTagMenuAllTags] = useState([]);
  const [tagMenuFileTags, setTagMenuFileTags] = useState([]);
  const [tagMenuFile, setTagMenuFile] = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuFile, setContextMenuFile] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingName, setCreatingName] = useState(null);
  const [creatingNameValue, setCreatingNameValue] = useState('');
  const creatingInputRef = useRef(null);
  const [quickPreviewFile, setQuickPreviewFile] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState([]);
  const renameInputRef = useRef(null);
  const paneRef = useRef(null);
  const dragCounterRef = useRef(0);

  // ── Column view state ──────────────────────────────────────────────────────
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const resizeStartRef = useRef(null);
  const columnsContainerRef = useRef(null);

  const columnPaths = getColumnPaths(paneId);
  const columnFiles = columnState.filesByPath;

  // ── Load tags ──────────────────────────────────────────────────────────────
  const loadTagsForFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const entries = await Promise.all(
      fileList.map(async f => {
        const r = await window.electronAPI.getTags(f.path);
        return [f.path, r.success ? r.tags : []];
      })
    );
    setFileTags(prev => {
      const next = { ...prev };
      for (const [p, tags] of entries) next[p] = tags;
      return next;
    });
  }, []);

  const prevActiveModal = useRef(activeModal);
  useEffect(() => {
    if (prevActiveModal.current === 'tags' && activeModal === null) {
      loadTagsForFiles(files);
      const allColFiles = Object.values(columnFiles).flat();
      if (allColFiles.length > 0) loadTagsForFiles(allColFiles);
    }
    prevActiveModal.current = activeModal;
  }, [activeModal]);

  useEffect(() => { loadTagsForFiles(files); }, [files]);

  useEffect(() => {
    const allColFiles = Object.values(columnFiles).flat();
    if (allColFiles.length > 0) loadTagsForFiles(allColFiles);
  }, [columnFiles]);

  // ── Derived column selections ──────────────────────────────────────────────
  const getDerivedSelections = () => {
    const selections = {};
    if (viewMode === 'column' && currentBreadcrumbPath) {
      for (let i = 0; i < columnPaths.length; i++) {
        const columnPath = columnPaths[i];
        if (columnPath && currentBreadcrumbPath.startsWith(columnPath)) {
          if (i < columnPaths.length - 1) {
            selections[i] = columnPaths[i + 1];
          } else if (currentBreadcrumbPath === columnPath) {
            selections[i] = null;
          } else {
            selections[i] = null;
          }
        } else {
          selections[i] = null;
        }
      }
    }
    return selections;
  };

  const derivedSelections = getDerivedSelections();
  const focusedColumn = columnState.focusedIndex;

  // ── Auto-scroll columns ────────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'column' || !columnsContainerRef.current) return;
    columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth;
  }, [currentBreadcrumbPath, viewMode, showSidebar]);

  const isPreviewOpen = useStore(s => s.showPreview);
  useEffect(() => {
    if (viewMode !== 'column' || !columnsContainerRef.current) return;
    setTimeout(() => {
      if (columnsContainerRef.current)
        columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth;
    }, 50);
  }, [isPreviewOpen, viewMode]);

  // ── Column resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (resizingColumn === null || !resizeStartRef.current) return;

    const handleMouseMove = (e) => {
      const { startX, startWidth } = resizeStartRef.current;
      const zoom = useStore.getState().zoom || 1;
      const newWidth = startWidth + (e.clientX - startX) / zoom;
      if (newWidth >= 150 && newWidth <= 600) {
        setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
      }
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // ── Spacebar quick preview ─────────────────────────────────────────────────
  useEffect(() => {
    if (activePane !== paneId) return;
    const handler = (e) => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (useStore.getState().activeModal || useStore.getState().showSearch) return;
      if (useStore.getState().activePane !== paneId) return;
      const selArray = [...selectedFiles];
      if (selArray.length === 0) return;
      const filePath = selArray[0];
      let fileObj = files.find(f => f.path === filePath);
      if (!fileObj) {
        for (const colFiles of Object.values(columnFiles)) {
          const found = colFiles.find(f => f.path === filePath);
          if (found) { fileObj = found; break; }
        }
      }
      if (!fileObj || fileObj.isDirectory) return;
      const ext = fileObj.extension || '';
      const isPreviewable = PREVIEW_TYPES.imageExts.includes(ext) ||
        PREVIEW_TYPES.videoExts.includes(ext) ||
        PREVIEW_TYPES.audioExts.includes(ext) ||
        ext === 'pdf';
      if (!isPreviewable) return;
      e.preventDefault();
      setQuickPreviewFile(fileObj);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activePane, paneId, selectedFiles, files, columnFiles]);

  // ── Close context menu on outside click ───────────────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      if (e.target.closest('.context-menu')) return;
      setContextMenu(null);
      setContextMenuFile(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // ── Column item scroll helper ──────────────────────────────────────────────
  const scrollColumnItemIntoView = (colIdx, itemIdx) => {
    if (!columnsContainerRef.current) return;
    const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
    const col = columns[colIdx];
    if (!col) return;
    const list = col.querySelector('[data-column-list]');
    if (!list) return;
    if (list.children[itemIdx]) {
      list.children[itemIdx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // ── History restore scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pane._isRestoringHistory || viewMode !== 'column') return;
    setTimeout(() => {
      if (!columnsContainerRef.current) return;
      const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
      if (!columns.length) return;
      const lastCol = columns[columns.length - 1];
      const selected = lastCol?.querySelector('.selected');
      if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, 50);
  }, [pane._isRestoringHistory, pane.navigationIndex]);

  // ── Auto-scroll to selected on mount ──────────────────────────────────────
  useEffect(() => {
    if (loading || selectedFiles.size === 0) return;
    if (files.length === 0 && Object.keys(columnFiles).length === 0) return;
    setTimeout(() => {
      if (viewMode === 'column') {
        if (!columnsContainerRef.current) return;
        const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          const list = columns[colIdx].querySelector('[data-column-list]');
          if (!list) continue;
          const selectedItem = Array.from(list.children).find(
            item => item.className && item.className.includes('selected')
          );
          if (selectedItem) { selectedItem.scrollIntoView({ block: 'nearest', inline: 'nearest' }); break; }
        }
      } else if (viewMode === 'list' || viewMode === 'grid') {
        if (!paneRef.current) return;
        const allItems = paneRef.current.querySelectorAll('[draggable="true"]');
        for (const item of allItems) {
          const itemIndex = Array.from(allItems).indexOf(item);
          if (itemIndex >= 0 && itemIndex < files.length) {
            if (selectedFiles.has(files[itemIndex].path)) {
              item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              break;
            }
          }
        }
      }
    }, 100);
  }, [viewMode, loading, files.length, columnPaths.length]);

  // ── Column keyboard navigation ─────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== 'column') return;

    const handleKeyDown = (e) => {
      if (useStore.getState().activeModal || useStore.getState().showSearch) return;
      if (focusedColumn < 0 || focusedColumn >= columnPaths.length) return;

      const columnKey = columnPaths[focusedColumn];
      const columnFilesList = focusedColumn === 0
        ? files
        : filterHiddenFiles(columnFiles[columnKey] || [], showHidden);

      if (columnFilesList.length === 0 && e.key !== 'ArrowLeft' && e.key !== 'Escape') return;

      const currentIndex = columnFilesList.findIndex(f => selectedFiles.has(f.path));

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          const newIdx = currentIndex <= 0 ? columnFilesList.length - 1 : currentIndex - 1;
          const newFile = columnFilesList[newIdx];
          setSelection(paneId, [newFile.path]);
          handleColumnClick(newFile, focusedColumn);
          scrollColumnItemIntoView(focusedColumn, newIdx);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          const newIdx = currentIndex >= columnFilesList.length - 1 || currentIndex < 0 ? 0 : currentIndex + 1;
          const newFile = columnFilesList[newIdx];
          setSelection(paneId, [newFile.path]);
          handleColumnClick(newFile, focusedColumn);
          scrollColumnItemIntoView(focusedColumn, newIdx);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (currentIndex < 0) break;
          const selectedItem = columnFilesList[currentIndex];
          if (!selectedItem || !selectedItem.isDirectory) break;
          const nextColumnFiles = filterHiddenFiles(columnFiles[selectedItem.path] || [], showHidden);
          if (nextColumnFiles.length === 0) break;
          updateColumnState(paneId, { focusedIndex: focusedColumn + 1 });
          setSelection(paneId, [nextColumnFiles[0].path]);
          handleColumnClick(nextColumnFiles[0], focusedColumn + 1);
          setTimeout(() => scrollColumnItemIntoView(focusedColumn + 1, 0), 0);
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (focusedColumn > 0) {
            const prevColumn = focusedColumn - 1;
            const selectedDirPath = columnPaths[focusedColumn];
            if (columnPaths.length > focusedColumn + 1) {
              setCurrentBreadcrumbPath(paneId, columnPaths[focusedColumn]);
            }
            updateColumnState(paneId, { focusedIndex: prevColumn });
            if (selectedDirPath) setSelection(paneId, [selectedDirPath]);
            setPreviewFile(null);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setCurrentBreadcrumbPath(paneId, columnPaths[focusedColumn]);
          setSelection(paneId, []);
          setPreviewFile(null);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, columnPaths, columnFiles, currentPath, files, paneId, setSelection, setCurrentBreadcrumbPath, setPreviewFile, selectedFiles, derivedSelections, focusedColumn]);

  // ── Reveal target ──────────────────────────────────────────────────────────
  const revealTarget = useStore(s => s.revealTarget);
  useEffect(() => {
    if (!revealTarget || revealTarget.paneId !== paneId) return;
    const { filePath, fileDir, isDirectory } = revealTarget;
    useStore.getState().revealFileInTree(paneId, filePath, fileDir, isDirectory);
    useStore.getState().clearRevealTarget();
  }, [paneId, revealTarget]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const navigate = (p) => navigateTo(paneId, p);

  const handleColumnClick = (file, columnIndex) => {
    setContextMenu(null);
    setContextMenuFile(null);

    if (file.isDirectory) {
      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
      setCurrentBreadcrumbPath(paneId, file.path);
      pushNavHistory(paneId, {
        basePath: currentPane.basePath,
        currentBreadcrumbPath: file.path,
        selectedFiles: [file.path],
        previewFilePath: null,
      });
      if (!columnFiles[file.path]) {
        window.electronAPI.readdir(file.path).then(result => {
          if (result.success) {
            const dirSort = useStore.getState().getDirSort(file.path);
            const sorted = sortFiles(result.files, dirSort, 'asc');
            updateColumnState(paneId, { filesByPath: { ...columnFiles, [file.path]: sorted } });
          }
        });
      }
      setPreviewFile(null);
    } else {
      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
      const parentPath = file.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentBreadcrumbPath(paneId, parentPath);
      pushNavHistory(paneId, {
        basePath: currentPane.basePath,
        currentBreadcrumbPath: parentPath,
        selectedFiles: [file.path],
        previewFilePath: file.path,
      });
      setPreviewFile(file);
    }
  };

  const handleColumnEmptyClick = (columnIndex) => {
    setContextMenu(null);
    setContextMenuFile(null);
    setSelection(paneId, []);
    if (columnIndex === columnPaths.length - 1) {
      updateColumnState(paneId, { focusedIndex: columnIndex });
      setPreviewFile(null);
      return;
    }
    const breadcrumbPath = columnPaths[columnIndex];
    setCurrentBreadcrumbPath(paneId, breadcrumbPath);
    updateColumnState(paneId, { focusedIndex: columnIndex });
    setPreviewFile(null);
  };

  const handleFileClick = (e, file) => {
    e.stopPropagation();
    setActivePane(paneId);
    setContextMenu(null);
    setContextMenuFile(null);

    if (e.metaKey || e.ctrlKey) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey) {
      const fileIndex = files.findIndex(f => f.path === file.path);
      const selArray = [...selectedFiles];
      if (selArray.length > 0) {
        const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
        const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
        const range = files.slice(start, end + 1).map(f => f.path);
        setSelection(paneId, [...new Set([...selectedFiles, ...range])]);
      } else {
        toggleSelection(paneId, file.path, false);
      }
    } else {
      toggleSelection(paneId, file.path, false);
      setPreviewFile(file);
    }
  };

  const handleDoubleClick = (file) => {
    if (file.isDirectory) navigate(file.path);
    else window.electronAPI.openPath(file.path);
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePane(paneId);
    if (!selectedFiles.has(file.path)) setSelection(paneId, [file.path]);

    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    const fileRect = e.currentTarget.getBoundingClientRect();
    let menuY = (fileRect.bottom / zoom) - (rect.top / zoom) - 8;
    const menuX = (fileRect.right / zoom) - (rect.left / zoom) - 8;
    const estimatedMenuHeight = 250;
    const paneBottom = (window.innerHeight / zoom) - (rect.top / zoom);
    if (menuY + estimatedMenuHeight > paneBottom) {
      menuY = (fileRect.top / zoom) - (rect.top / zoom) - estimatedMenuHeight;
    }

    const sortTarget = file.isDirectory
      ? file.path
      : (file.path.split('/').slice(0, -1).join('/') || '/');

    setContextMenu({ x: menuX, y: menuY, file });
    setContextMenuFile(file);
    setCtxTagHover(null);
    setCtxSortHover(null);
    setCtxSortTarget(sortTarget);
    Promise.all([
      window.electronAPI.getAllTags(),
      window.electronAPI.getTags(file.path),
    ]).then(([all, mine]) => {
      setCtxAllTags(all.success ? all.tags : []);
      setCtxFileTags(new Set(mine.success ? mine.tags.map(t => t.tag_name) : []));
    });
  };

  const handleBackgroundContextMenu = (e) => {
    e.preventDefault();
    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    const currentPane = useStore.getState().panes.find(p => p.id === paneId);
    const bgSortTarget = currentPane?.currentBreadcrumbPath || currentPane?.basePath || currentPath;
    setCtxSortTarget(bgSortTarget);
    setCtxSortHover(null);
    setContextMenu({
      x: (e.clientX / zoom) - (rect.left / zoom),
      y: (e.clientY / zoom) - (rect.top / zoom),
      file: null,
      background: true,
    });
  };

  const handleDrop = async (e, destFile, destPath = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    setIsDragging(false);
    dragCounterRef.current = 0;

    const droppedPaths = e.dataTransfer.getData('file-paths');
    if (!droppedPaths) return;

    const paths = JSON.parse(droppedPaths);
    let destDir;
    if (destPath) destDir = destPath;
    else if (destFile?.isDirectory) destDir = destFile.path;
    else destDir = currentPath;

    const isSameDir = paths.some(src => {
      const srcDir = src.split('/').slice(0, -1).join('/') || '/';
      return srcDir === destDir;
    });
    if (isSameDir && !e.altKey) return;

    const isCopy = e.altKey;
    const affectedDirs = new Set();

    for (const src of paths) {
      const fileName = src.split('/').pop();
      const dest = `${destDir}/${fileName}`;
      if (src === dest) continue;
      try {
        if (isCopy) await window.electronAPI.copy(src, dest);
        else await window.electronAPI.move(src, dest);
        const srcDir = src.split('/').slice(0, -1).join('/') || '/';
        affectedDirs.add(srcDir);
        affectedDirs.add(destDir);
      } catch (err) {
        console.error(`Failed to ${isCopy ? 'copy' : 'move'} ${src}:`, err);
      }
    }

    const otherPane = paneId === 'left' ? 'right' : 'left';
    await Promise.all([refreshPane(paneId), refreshPane(otherPane)]);

    if (viewMode === 'column' && affectedDirs.size > 0) {
      const updatedFilesByPath = { ...columnFiles };
      for (const dir of affectedDirs) {
        try {
          const res = await window.electronAPI.readdir(dir);
          if (res.success) updatedFilesByPath[dir] = sortFiles(res.files, sortBy, sortOrder);
        } catch (err) {
          console.error('Failed to refresh column dir', dir, err);
        }
      }
      updateColumnState(paneId, { filesByPath: updatedFilesByPath });
    }
  };

  const startRename = (file) => {
    setRenameFile(file);
    setRenameValue(file.name);
    setContextMenu(null);
  };

  const commitRename = async () => {
    if (!renameFile || !renameValue || renameValue === renameFile.name) {
      setRenameFile(null);
      return;
    }
    const newPath = `${currentPath}/${renameValue}`;
    await window.electronAPI.rename(renameFile.path, newPath);
    setRenameFile(null);
    await refreshPane(paneId);
    if (viewMode === 'column' && columnFiles[currentPath]) {
      const res = await window.electronAPI.readdir(currentPath);
      if (res.success) {
        updateColumnState(paneId, {
          filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) }
        });
      }
    }
  };

  const deleteSelected = async () => {
    const affectedDirs = new Set();
    for (const fp of selectedFiles) {
      const parentDir = fp.split('/').slice(0, -1).join('/') || '/';
      affectedDirs.add(parentDir);
      await window.electronAPI.delete(fp);
    }
    setSelection(paneId, []);
    await refreshPane(paneId);
    if (viewMode === 'column' && affectedDirs.size > 0) {
      const updatedFilesByPath = { ...columnFiles };
      for (const dir of affectedDirs) {
        if (columnFiles[dir]) {
          const res = await window.electronAPI.readdir(dir);
          if (res.success) updatedFilesByPath[dir] = sortFiles(res.files, sortBy, sortOrder);
        }
      }
      updateColumnState(paneId, { filesByPath: updatedFilesByPath });
    }
  };

  const createFolder = () => {
    setCreatingName('folder');
    setCreatingNameValue('');
    setTimeout(() => creatingInputRef.current?.focus(), 50);
  };

  const createFile = () => {
    setCreatingName('file');
    setCreatingNameValue('');
    setTimeout(() => creatingInputRef.current?.focus(), 50);
  };

  const commitCreating = async () => {
    const name = creatingNameValue.trim();
    if (name) {
      if (creatingName === 'folder') await window.electronAPI.mkdir(`${currentBreadcrumbPath}/${name}`);
      else await window.electronAPI.writeFile(`${currentBreadcrumbPath}/${name}`, '');
      await refreshPane(paneId);
      if (viewMode === 'column' && columnFiles[currentBreadcrumbPath]) {
        const res = await window.electronAPI.readdir(currentBreadcrumbPath);
        if (res.success) {
          updateColumnState(paneId, {
            filesByPath: { ...columnFiles, [currentBreadcrumbPath]: sortFiles(res.files, sortBy, sortOrder) }
          });
        }
      }
    }
    setCreatingName(null);
    setCreatingNameValue('');
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedFileObjects = files.filter(f => selectedFiles.has(f.path));
  const crumbs = getBreadcrumbs(paneId);
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
  const previewFile = useStore(s => s.previewFile);
  const showPreview = useStore(s => s.showPreview);
  const previewWidth = useStore(s => s.previewWidth);

  // ── Column item shift-click handler ───────────────────────────────────────
  const handleColumnItemClick = (e, file, columnIndex, clickType) => {
    if (clickType === 'shift') {
      const colPath = columnPaths[columnIndex];
      const colFiles = columnIndex === 0 ? files : filterHiddenFiles(columnFiles[colPath] || [], showHidden);
      const fileIndex = colFiles.findIndex(f => f.path === file.path);
      const selArray = [...selectedFiles];
      if (selArray.length > 0) {
        const lastIdx = colFiles.findIndex(f => f.path === selArray[selArray.length - 1]);
        const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
        const range = colFiles.slice(start, end + 1).map(f => f.path);
        setSelection(paneId, [...new Set([...selectedFiles, ...range])]);
      } else {
        setSelection(paneId, [file.path]);
      }
    }
    handleColumnClick(file, columnIndex);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PaneContainer ref={paneRef} className={activePane === paneId ? 'active' : ''} onClick={() => setActivePane(paneId)}>
      <SymlinkTooltipStyles />

      {/* Tab Bar */}
      <TabBar style={!showSidebar && paneId === 'left' ? { paddingLeft: 80 } : undefined}>
        {tabs.map((tab, i) => (
          <Tab key={tab.id} className={i === activeTab ? 'active' : ''} onClick={() => switchTab(paneId, i)}>
            <span className="tab-name">{tab.label || '/'}</span>
            {tabs.length > 1 && (
              <span className="close-btn" onClick={e => { e.stopPropagation(); closeTab(paneId, i); }}>✕</span>
            )}
          </Tab>
        ))}
        <NewTabBtn onClick={() => addTab(paneId)} title="New Tab">+</NewTabBtn>
      </TabBar>

      {/* Toolbar */}
      <Toolbar>
        <NavBtn onClick={() => goBackInHistory(paneId)} disabled={pane.navigationIndex <= 0} title="Go back">←</NavBtn>
        <NavBtn onClick={() => goForwardInHistory(paneId)} disabled={pane.navigationIndex >= pane.navigationHistory.length - 1} title="Go forward">→</NavBtn>
        <PaneBreadcrumb
          paneId={paneId}
          crumbs={crumbs}
          viewMode={viewMode}
          closePreview={closePreview}
        />
      </Toolbar>

      {/* Content */}
      <ContentArea>
        <FileListArea
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move'; }}
          onDragEnter={e => { e.preventDefault(); dragCounterRef.current++; }}
          onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current === 0) setDragOver(null); }}
          onDrop={e => handleDrop(e, null)}
          onContextMenu={handleBackgroundContextMenu}
          onClick={() => { setSelection(paneId, []); setContextMenu(null); setContextMenuFile(null); }}
        >
          {loading && (
            <EmptyState><span style={{ color: '#4A9EFF' }}>Loading...</span></EmptyState>
          )}
          {!loading && files.length === 0 && (
            <EmptyState>
              <span style={{ fontSize: 32 }}>📭</span>
              <span>This folder is empty</span>
            </EmptyState>
          )}

          {/* List view */}
          {!loading && files.length > 0 && viewMode === 'list' && (
            <>
              <ColumnHeader>
                <span />
                <ColHead onClick={() => setSortBy(paneId, 'name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </ColHead>
                <ColHead onClick={() => setSortBy(paneId, 'size', sortBy === 'size' && sortOrder === 'asc' ? 'desc' : 'asc')} style={{ textAlign: 'right' }}>
                  Size {sortBy === 'size' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </ColHead>
                <ColHead onClick={() => setSortBy(paneId, 'modified', sortBy === 'modified' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Modified {sortBy === 'modified' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </ColHead>
                <ColHead onClick={() => setSortBy(paneId, 'extension', sortBy === 'extension' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                  Kind {sortBy === 'extension' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </ColHead>
              </ColumnHeader>
              {files.map(file => (
                <FileListItem
                  key={file.path}
                  file={file}
                  isSelected={selectedFiles.has(file.path)}
                  isRenaming={renameFile?.path === file.path}
                  isContextMenuSelected={contextMenuFile?.path === file.path}
                  isDragOver={dragOver === file.path}
                  selectedFiles={selectedFiles}
                  draggedFiles={draggedFiles}
                  paneId={paneId}
                  fileTags={fileTags}
                  renameValue={renameValue}
                  setRenameValue={setRenameValue}
                  onRenameCommit={commitRename}
                  onRenameCancel={() => setRenameFile(null)}
                  onClick={e => handleFileClick(e, file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  onContextMenu={e => handleContextMenu(e, file)}
                  onDrop={handleDrop}
                  setSelection={setSelection}
                  setDraggedFiles={setDraggedFiles}
                  setIsDragging={setIsDragging}
                  setDragOver={setDragOver}
                />
              ))}
            </>
          )}

          {/* Grid view */}
          {!loading && files.length > 0 && viewMode === 'grid' && (
            <GridWrap>
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
                  onDoubleClick={() => handleDoubleClick(file)}
                  onContextMenu={e => handleContextMenu(e, file)}
                  onDrop={handleDrop}
                  setSelection={setSelection}
                  setDraggedFiles={setDraggedFiles}
                  setIsDragging={setIsDragging}
                  setDragOver={setDragOver}
                />
              ))}
            </GridWrap>
          )}

          {/* Column view */}
          {!loading && viewMode === 'column' && (
            <ColumnsContainer ref={columnsContainerRef}>
              {columnPaths.map((colPath, idx) => {
                const isFirstColumn = idx === 0;
                const colFiles = isFirstColumn ? files : filterHiddenFiles(columnFiles[colPath] || [], showHidden);
                return (
                  <Column
                    key={colPath}
                    colPath={colPath}
                    columnIndex={idx}
                    colFiles={colFiles}
                    isFocused={focusedColumn === idx}
                    width={columnWidths[idx] ? `${columnWidths[idx]}px` : '200px'}
                    columnPaths={columnPaths}
                    derivedSelections={derivedSelections}
                    selectedFiles={selectedFiles}
                    draggedFiles={draggedFiles}
                    dragOver={dragOver}
                    contextMenuFile={contextMenuFile}
                    paneId={paneId}
                    fileTags={fileTags}
                    onItemClick={handleColumnItemClick}
                    onItemContextMenu={handleContextMenu}
                    onDrop={handleDrop}
                    onEmptyClick={handleColumnEmptyClick}
                    setSelection={setSelection}
                    setDraggedFiles={setDraggedFiles}
                    setIsDragging={setIsDragging}
                    setDragOver={setDragOver}
                    updateColumnState={updateColumnState}
                    toggleSelection={toggleSelection}
                    onResizerMouseDown={(e) => {
                      resizeStartRef.current = { startX: e.clientX, startWidth: columnWidths[idx] || 200 };
                      setResizingColumn(idx);
                    }}
                  />
                );
              })}
            </ColumnsContainer>
          )}
        </FileListArea>

        {/* Preview Pane */}
        {showPreview && activePane === paneId && previewFile && (
          <PreviewPane file={previewFile} width={`${previewWidth}px`} />
        )}
      </ContentArea>

      {/* Quick Preview Modal (Spacebar) */}
      {quickPreviewFile && (
        <QuickPreviewModal file={quickPreviewFile} onClose={() => setQuickPreviewFile(null)} />
      )}

      {/* Inline create input */}
      {creatingName && (
        <InlineCreateRow onClick={e => e.stopPropagation()}>
          <span>{creatingName === 'folder' ? '📁' : '📄'} New {creatingName} name:</span>
          <input
            ref={creatingInputRef}
            value={creatingNameValue}
            onChange={e => setCreatingNameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitCreating();
              if (e.key === 'Escape') { setCreatingName(null); setCreatingNameValue(''); }
            }}
            placeholder={`Enter ${creatingName} name...`}
            autoFocus
          />
          <button onClick={commitCreating}>Create</button>
          <button onClick={() => { setCreatingName(null); setCreatingNameValue(''); }}>Cancel</button>
        </InlineCreateRow>
      )}

      {/* Status Bar */}
      <StatusBar>
        <span>{files.length} items · {formatSize(totalSize)}</span>
        <span>{selectedFiles.size > 0 ? `${selectedFiles.size} selected` : ''}</span>
      </StatusBar>

      {/* Inline tag picker */}
      {tagMenuOpen && tagMenuFile && (
        <InlineTagPicker
          file={tagMenuFile}
          allTags={tagMenuAllTags}
          fileTags={tagMenuFileTags}
          onClose={() => { setTagMenuOpen(false); setTagMenuFile(null); }}
          onChanged={(newFileTags, newAllTags) => {
            setTagMenuFileTags(newFileTags);
            if (newAllTags) setTagMenuAllTags(newAllTags);
            window.electronAPI.getTags(tagMenuFile.path).then(r => {
              if (r.success) setFileTags(prev => ({ ...prev, [tagMenuFile.path]: r.tags }));
            });
            useStore.getState().loadAllTags();
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <PaneContextMenu
          contextMenu={contextMenu}
          contextMenuFile={contextMenuFile}
          selectedFiles={selectedFiles}
          selectedFileObjects={selectedFileObjects}
          currentPath={currentPath}
          currentBreadcrumbPath={currentBreadcrumbPath}
          clipboardQueue={clipboardQueue}
          ctxAllTags={ctxAllTags}
          ctxFileTags={ctxFileTags}
          ctxTagHover={ctxTagHover}
          ctxSortTarget={ctxSortTarget}
          ctxSortHover={ctxSortHover}
          viewMode={viewMode}
          columnFiles={columnFiles}
          sortBy={sortBy}
          sortOrder={sortOrder}
          bookmarks={bookmarks}
          paneId={paneId}
          getDirSort={getDirSort}
          setCtxTagHover={setCtxTagHover}
          setCtxSortHover={setCtxSortHover}
          setCtxFileTags={setCtxFileTags}
          setFileTags={setFileTags}
          setDirectorySort={setDirectorySort}
          setBookmarks={setBookmarks}
          createFolder={createFolder}
          createFile={createFile}
          refreshPane={refreshPane}
          updateColumnState={updateColumnState}
          sortFiles={sortFiles}
          pasteClipboard={pasteClipboard}
          startRename={startRename}
          deleteSelected={deleteSelected}
          addToClipboard={addToClipboard}
          openModal={openModal}
          setContextMenu={setContextMenu}
          setContextMenuFile={setContextMenuFile}
        />
      )}

      {/* Symlink Tooltip */}
      <Tooltip id="symlink-tooltip" place="top" delayShow={100} opacity={1} className="symlink-tooltip" />
    </PaneContainer>
  );
}
