import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, getFileIcon, sortFiles } from '../store';
import path from 'path-browserify';

// ─── Styled Components ───────────────────────────────────────────────────────
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

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  height: ${p => p.theme.tabBar};
  overflow-x: auto;
  flex-shrink: 0;
  &::-webkit-scrollbar { height: 0; }
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 0 14px;
  min-width: 80px;
  max-width: 180px;
  cursor: pointer;
  font-size: 11px;
  color: ${p => p.theme.text.secondary};
  background: transparent;
  border-right: 1px solid ${p => p.theme.border.subtle};
  border-bottom: 2px solid transparent;
  position: relative;
  transition: all 0.1s;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;

  &:hover { background: ${p => p.theme.bg.hover}; }

  &.active {
    color: ${p => p.theme.text.primary};
    background: ${p => p.theme.bg.primary};
    border-bottom: 2px solid ${p => p.theme.accent.blue};
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
  font-size: 16px;
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

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  gap: 2px;
  font-size: 11px;
`;

const BreadcrumbItem = styled.span`
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 2px 4px;
  border-radius: ${p => p.theme.radius.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  
  &.last {
    color: ${p => p.theme.text.primary};
    cursor: default;
    &:hover { background: transparent; }
  }
`;

const BreadSep = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
`;

const ViewBtns = styled.div`
  display: flex;
  gap: 2px;
  margin-left: 4px;
`;

const ViewBtn = styled.button`
  background: ${p => p.theme.bg.elevated};
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 11px;
  &:hover { background: ${p => p.theme.bg.hover}; }

  &.active {
    background: ${p => p.theme.bg.active};
    color: ${p => p.theme.text.primary};
  }
`;

const SortBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  white-space: nowrap;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
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

const FileRow = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 70px 100px 60px;
  padding: 0 8px;
  height: 28px;
  align-items: center;
  cursor: pointer;
  background: ${p => p.contextMenuSelected ? p.theme.bg.hover : p.selected ? p.theme.bg.selection : 'transparent'};
  border-radius: ${p => p.theme.radius.sm};
  margin: 0 2px;
  position: relative;
  transition: background 0.07s;

  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }

  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1.5px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.sm};
    pointer-events: none;
  }
`;

const FileIcon = styled.span`
  font-size: 13px;
  text-align: center;
`;

const FileName = styled.span`
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.theme.text.primary};
  padding: 0 4px;
`;

const FileMeta = styled.span`
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  text-align: right;
  padding-right: 4px;
`;

const FileDate = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  padding-right: 4px;
`;

const FileExt = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 3px;
  background: ${p => p.theme.bg.elevated};
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

const ColumnsContainer = styled.div`
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden; /* Prevent overall scrolling */
  background: ${p => p.theme.bg.primary};
  height: 100%;
`;

const Column = styled.div`
  width: ${p => p.width || '200px'};
  min-width: 150px;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  position: relative;
  flex-shrink: 0;
  
  &.active {
    background: ${p => p.theme.bg.secondary};
  }
`;

const ColumnResizer = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
  
  &:hover {
    background: ${p => p.theme.accent.blue}40;
  }
  
  &.dragging {
    background: ${p => p.theme.accent.blue}60;
  }
`;

const ColViewHeader = styled.div`
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  background: ${p => p.theme.bg.secondary};
  flex-shrink: 0;
`;

const ColumnList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px 0; /* Extra padding at bottom */
  height: 100%; /* Use full available height */
  align-self: stretch;
`;

const ColumnItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: ${p => p.theme.text.primary};
  background: ${p => p.contextMenuSelected ? p.theme.bg.hover : 'transparent'};
  position: relative;
  
  &:hover {
    background: ${p => p.theme.bg.hover};
  }
  
  &.selected {
    background: ${p => p.theme.bg.selection};
    color: ${p => p.theme.accent.blue};
  }
  
  &.drag-over {
    background: ${p => p.theme.accent.blue}15;
    border-left: 3px solid ${p => p.theme.accent.blue};
    padding-left: 7px;
  }
  
  .icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
  }
  
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ContextMenu = styled.div`
  position: absolute;
  z-index: 1000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  min-width: 180px;
  padding: 4px;
  user-select: none;
`;

const MenuItem = styled.div`
  padding: 6px 12px;
  font-size: 12px;
  color: ${p => p.danger ? p.theme.text.error : p.theme.text.primary};
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 3px 0;
`;

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
`;

const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: ${p => p.theme.radius.md};
  cursor: pointer;
  background: ${p => p.selected ? p.theme.bg.selection : 'transparent'};
  transition: background 0.07s;
  position: relative;
  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }
  
  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.md};
    background: ${p => p.theme.accent.blue}15;
    pointer-events: none;
  }
`;

const GridIcon = styled.span`
  font-size: 28px;
`;

const GridName = styled.span`
  font-size: 10px;
  text-align: center;
  color: ${p => p.theme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 72px;
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function FilePane({ paneId }) {
  const {
    panes,
    activePane,
    setActivePane,
    navigateTo,
    refreshPane,
    setSelection,
    toggleSelection,
    setViewMode,
    setSortBy,
    switchTab,
    addTab,
    closeTab,
    navigateToBookmark,
    setPreviewFile,
    addToClipboard, clipboardQueue, pasteClipboard,
    undo,
    setCurrentBreadcrumbPath,
    updateColumnState,
    clearColumnState,
    getBreadcrumbs,
    getColumnPaths,
    getActiveBookmark,
    activeModal,
    showSearch,
    showSidebar,
    bookmarks,
    setBookmarks,
  } = useStore();

  const pane = panes.find(p => p.id === paneId);

  if (!pane) return null;

  const { path: currentPath, files, loading, selectedFiles, sortBy, sortOrder, viewMode, tabs, activeTab, currentBreadcrumbPath, columnState } = pane;

  const [history, setHistory] = useState([pane?.path]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuFile, setContextMenuFile] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState([]);
  const renameInputRef = useRef(null);
  const paneRef = useRef(null);
  const dragCounterRef = useRef(0);
  
  // Local column view UI state (widths, resizing) - not persisted to store
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const columnsContainerRef = useRef(null);
  
  // Derived from store column state for convenience
  const columnPaths = getColumnPaths(paneId);
  const columnFiles = columnState.filesByPath;

  // Derived selections based on breadcrumb path
  const getDerivedSelections = () => {
    const selections = {};
    if (viewMode === 'column' && currentBreadcrumbPath) {
      const parts = currentBreadcrumbPath.split('/').filter(Boolean);
      const baseParts = pane.basePath === '/' ? [] : pane.basePath.split('/').filter(Boolean);
      
      // For each column, the selected item is the path at that level
      for (let i = 0; i < columnPaths.length; i++) {
        const columnPath = columnPaths[i];
        if (columnPath && currentBreadcrumbPath.startsWith(columnPath)) {
          // Find the selected item in this column - it's the next segment in the breadcrumb
          const columnSegments = columnPath.split('/').filter(Boolean);
          if (i < columnPaths.length - 1) {
            // Not the last column, selected item is the path of the next column
            selections[i] = columnPaths[i + 1];
          } else if (currentBreadcrumbPath === columnPath) {
            // Last column and we're exactly at this path - no selection
            selections[i] = null;
          } else {
            // We're deeper, but this shouldn't happen with derived columns
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
  const selectedItems = derivedSelections;
  const focusedColumn = columnState.focusedIndex;

  // Auto-scroll columns container to the right when a new column is added
  useEffect(() => {
    if (viewMode !== 'column') return;
    if (!columnsContainerRef.current) return;
    columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth;
  }, [columnPaths.length, viewMode]);

  // Handle column resize
  useEffect(() => {
    if (resizingColumn === null) return;

    const handleMouseMove = (e) => {
      if (!columnsContainerRef.current) return;
      const container = columnsContainerRef.current;
      const rect = container.getBoundingClientRect();
      const newWidth = e.clientX - rect.left - (resizingColumn * 200); // Approximate position
      
      if (newWidth >= 150 && newWidth <= 600) {
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      // Don't close if clicking inside the context menu
      if (e.target.closest('.context-menu')) return;
      setContextMenu(null);
      setContextMenuFile(null);
    };
    // Add to document to catch clicks outside the pane
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // Scroll a specific item into view within a column
  const scrollColumnItemIntoView = (colIdx, itemIdx) => {
    if (!columnsContainerRef.current) return;
    const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
    const col = columns[colIdx];
    if (!col) return;
    const list = col.querySelector('[data-column-list]');
    if (!list) return;
    const items = list.children;
    if (items[itemIdx]) {
      items[itemIdx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // Keyboard navigation for column view
  useEffect(() => {
    if (viewMode !== 'column') return;

    const handleKeyDown = (e) => {
      // Don't handle keyboard nav when a modal or search overlay is open
      if (useStore.getState().activeModal || useStore.getState().showSearch) return;
      if (focusedColumn < 0 || focusedColumn >= columnPaths.length) return;

      const columnKey = columnPaths[focusedColumn];
      const columnFilesList = focusedColumn === 0 ? files : (columnFiles[columnKey] || []);

      if (columnFilesList.length === 0 && e.key !== 'ArrowLeft' && e.key !== 'Escape') return;

      const currentIndex = columnFilesList.findIndex(f => selectedFiles.has(f.path));

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          let newIdx;
          if (currentIndex <= 0) {
            newIdx = columnFilesList.length - 1;
          } else {
            newIdx = currentIndex - 1;
          }
          const newFile = columnFilesList[newIdx];
          setSelection(paneId, [newFile.path]);
          handleColumnClick(newFile, focusedColumn);
          scrollColumnItemIntoView(focusedColumn, newIdx);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          let newIdx;
          if (currentIndex >= columnFilesList.length - 1 || currentIndex < 0) {
            newIdx = 0;
          } else {
            newIdx = currentIndex + 1;
          }
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

          const nextColumnFiles = columnFiles[selectedItem.path] || [];
          if (nextColumnFiles.length === 0) break;

          updateColumnState(paneId, { focusedIndex: focusedColumn + 1 });
          setSelection(paneId, [nextColumnFiles[0].path]);
          handleColumnClick(nextColumnFiles[0], focusedColumn + 1);
          // Scroll to top of next column
          setTimeout(() => scrollColumnItemIntoView(focusedColumn + 1, 0), 0);
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          if (focusedColumn > 0) {
            const prevColumn = focusedColumn - 1;
            // The selected item in prevColumn is the directory whose contents are shown in focusedColumn
            const selectedDirPath = columnPaths[focusedColumn];
            // Keep the immediate next column (focusedColumn) visible, but trim anything deeper.
            // Set breadcrumb to columnPaths[focusedColumn] so columns beyond it are removed.
            if (columnPaths.length > focusedColumn + 1) {
              setCurrentBreadcrumbPath(paneId, columnPaths[focusedColumn]);
            }
            updateColumnState(paneId, { focusedIndex: prevColumn });
            if (selectedDirPath) {
              setSelection(paneId, [selectedDirPath]);
            }
            setPreviewFile(null);
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          // Deselect everything in the focused column and trim columns to the right
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

  // Handle reveal target from search or other sources
  useEffect(() => {
    const { revealTarget, clearRevealTarget } = useStore.getState();
    if (!revealTarget || revealTarget.paneId !== paneId) return;

    const { filePath, fileDir, triggerPreview } = revealTarget;

    // For search reveal, set basePath to the revealed file's directory
    // and navigate to that directory
    useStore.getState().updatePane(paneId, { basePath: fileDir, activeBookmarkId: null });
    setCurrentBreadcrumbPath(paneId, fileDir);
    navigateTo(paneId, fileDir);

    // Set the file as preview if requested
    if (triggerPreview && !filePath.endsWith('/')) {
      // Find the file object
      const file = files.find(f => f.path === filePath);
      if (file && !file.isDirectory) {
        setPreviewFile(file);
      }
    }

    // Clear the reveal target
    clearRevealTarget();
  }, [paneId, currentPath, files]);

  const navigate = (p) => {
    const newHistory = [...history.slice(0, historyIdx + 1), p];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    navigateTo(paneId, p);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      navigateTo(paneId, history[historyIdx - 1]);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      navigateTo(paneId, history[historyIdx + 1]);
    }
  };

  const handleColumnClick = (file, columnIndex) => {
    // Clear context menu when clicking another file
    setContextMenu(null);
    setContextMenuFile(null);
    
    if (file.isDirectory) {
      // For directories, update breadcrumb path and load files if needed
      setCurrentBreadcrumbPath(paneId, file.path);
      
      // Load files for this directory if not already cached
      if (!columnFiles[file.path]) {
        window.electronAPI.readdir(file.path).then(result => {
          if (result.success) {
            updateColumnState(paneId, { filesByPath: { ...columnFiles, [file.path]: result.files } });
          }
        });
      }
      
      // Clear preview when directory is selected
      setPreviewFile(null);
    } else {
      // For files, just preview and update breadcrumb to parent directory
      setPreviewFile(file);
      const parentPath = file.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentBreadcrumbPath(paneId, parentPath);
    }
  };

  const handleColumnEmptyClick = (columnIndex) => {
    // Clear context menu when clicking empty space
    setContextMenu(null);
    setContextMenuFile(null);
    
    // Clear global selection
    setSelection(paneId, []);
    
    // If clicking the last column, just focus it and clear preview
    if (columnIndex === columnPaths.length - 1) {
      updateColumnState(paneId, { focusedIndex: columnIndex });
      setPreviewFile(null);
      return;
    }
    
    // For earlier columns, navigate to that column's path
    const breadcrumbPath = columnPaths[columnIndex];
    setCurrentBreadcrumbPath(paneId, breadcrumbPath);
    updateColumnState(paneId, { focusedIndex: columnIndex });
    setPreviewFile(null);
  };

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigate(parent);
  };

  const handleFileClick = (e, file) => {
    e.stopPropagation();
    setActivePane(paneId);
    // Clear context menu when clicking another file
    setContextMenu(null);
    setContextMenuFile(null);

    if (e.metaKey || e.ctrlKey) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey) {
      // Range select
      const fileIndex = files.findIndex(f => f.path === file.path);
      const selArray = [...selectedFiles];
      if (selArray.length > 0) {
        const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
        const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
        const range = files.slice(start, end + 1).map(f => f.path);
        setSelection(paneId, range);
      } else {
        toggleSelection(paneId, file.path, false);
      }
    } else {
      toggleSelection(paneId, file.path, false);
      setPreviewFile(file);
    }
  };

  const handleDoubleClick = (file) => {
    if (file.isDirectory) {
      navigate(file.path);
    } else {
      window.electronAPI.openPath(file.path);
    }
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePane(paneId);
    if (!selectedFiles.has(file.path)) {
      setSelection(paneId, [file.path]);
    }
    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    const fileElement = e.currentTarget;
    const fileRect = fileElement.getBoundingClientRect();
    let menuY = (fileRect.bottom / zoom) - (rect.top / zoom) - 8;
    const menuX = (fileRect.right / zoom) - (rect.left / zoom) - 8;
    
    // Check if menu would clip at bottom of screen
    const estimatedMenuHeight = 200; // approximate height in pixels
    const paneBottom = (window.innerHeight / zoom) - (rect.top / zoom);
    if (menuY + estimatedMenuHeight > paneBottom) {
      // Position above: bottom of menu at top of file
      menuY = (fileRect.top / zoom) - (rect.top / zoom) - estimatedMenuHeight;
    }
    
    setContextMenu({ x: menuX, y: menuY, file });
    setContextMenuFile(file);
  };

  const handleBackgroundContextMenu = (e) => {
    e.preventDefault();
    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    setContextMenu({ x: (e.clientX / zoom) - (rect.left / zoom), y: (e.clientY / zoom) - (rect.top / zoom), file: null, background: true });
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
    
    // Determine destination directory
    let destDir;
    if (destPath) {
      destDir = destPath;
    } else if (destFile?.isDirectory) {
      destDir = destFile.path;
    } else {
      destDir = currentPath;
    }
    
    // Prevent no-op moves within same directory (unless copying)
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
        if (isCopy) {
          await window.electronAPI.copy(src, dest);
        } else {
          await window.electronAPI.move(src, dest);
        }

        // Track directories that need refresh (source and destination)
        const srcDir = src.split('/').slice(0, -1).join('/') || '/';
        affectedDirs.add(srcDir);
        affectedDirs.add(destDir);
      } catch (err) {
        console.error(`Failed to ${isCopy ? 'copy' : 'move'} ${src}:`, err);
      }
    }
    
    // Refresh both panes and await to ensure UI updates immediately
    const otherPane = paneId === 'left' ? 'right' : 'left';
    await Promise.all([
      refreshPane(paneId),
      refreshPane(otherPane),
    ]);

    // In column view, also refresh cached column directories that were affected
    if (viewMode === 'column' && affectedDirs.size > 0) {
      const updatedFilesByPath = { ...columnFiles };
      for (const dir of affectedDirs) {
        try {
          const res = await window.electronAPI.readdir(dir);
          if (res.success) {
            updatedFilesByPath[dir] = sortFiles(res.files, sortBy, sortOrder);
          }
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
    refreshPane(paneId);
  };

  const deleteSelected = async () => {
    for (const fp of selectedFiles) {
      await window.electronAPI.delete(fp);
    }
    setSelection(paneId, []);
    refreshPane(paneId);
  };

  const createFolder = async () => {
    const name = prompt('New folder name:');
    if (name) {
      await window.electronAPI.mkdir(`${currentPath}/${name}`);
      refreshPane(paneId);
    }
  };

  const selectedFileObjects = files.filter(f => selectedFiles.has(f.path));

  const renderFileRow = (file) => {
    const isSelected = selectedFiles.has(file.path);
    const isRenaming = renameFile?.path === file.path;
    const isContextMenuSelected = contextMenuFile?.path === file.path;

    return (
      <FileRow
        key={file.path}
        selected={isSelected}
        contextMenuSelected={isContextMenuSelected}
        className={dragOver === file.path ? 'drag-over' : ''}
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path)
            ? [...selectedFiles]
            : [file.path];
          if (!selectedFiles.has(file.path)) {
            setSelection(paneId, paths);
          }
          setDraggedFiles(paths);
          setIsDragging(true);
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
          e.dataTransfer.effectAllowed = 'copyMove';
          
          // Create custom drag image
          const dragImg = document.createElement('div');
          dragImg.style.cssText = `
            position: absolute;
            top: -1000px;
            padding: 6px 12px;
            background: rgba(74, 158, 255, 0.9);
            color: white;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 0, 0);
          setTimeout(() => document.body.removeChild(dragImg), 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setDraggedFiles([]);
          setDragOver(null);
        }}
        onDragOver={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
            setDragOver(file.path);
          }
        }}
        onDragEnter={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
          }
        }}
        onDragLeave={e => {
          // Only clear if we're actually leaving the element
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, file)}
      >
        <FileIcon>{getFileIcon(file)}</FileIcon>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenameFile(null);
            }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'transparent', border: '1px solid #4A9EFF',
              color: '#e8e8ed', fontSize: 12, padding: '1px 4px',
              borderRadius: 3, outline: 'none', flex: 1,
            }}
          />
        ) : (
          <FileName>{file.name}</FileName>
        )}
        <FileMeta>{file.isDirectory ? '—' : formatSize(file.size)}</FileMeta>
        <FileDate>{formatDate(file.modified)}</FileDate>
        <FileExt>{file.isDirectory ? 'folder' : (file.extension || '—')}</FileExt>
      </FileRow>
    );
  };

  const renderGridItem = (file) => {
    const isSelected = selectedFiles.has(file.path);
    return (
      <GridItem
        key={file.path}
        selected={isSelected}
        className={dragOver === file.path ? 'drag-over' : ''}
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
          if (!selectedFiles.has(file.path)) {
            setSelection(paneId, paths);
          }
          setDraggedFiles(paths);
          setIsDragging(true);
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
          e.dataTransfer.effectAllowed = 'copyMove';
          
          // Create custom drag image
          const dragImg = document.createElement('div');
          dragImg.style.cssText = `
            position: absolute;
            top: -1000px;
            padding: 6px 12px;
            background: rgba(74, 158, 255, 0.9);
            color: white;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 0, 0);
          setTimeout(() => document.body.removeChild(dragImg), 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setDraggedFiles([]);
          setDragOver(null);
        }}
        onDragOver={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
            setDragOver(file.path);
          }
        }}
        onDragEnter={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
          }
        }}
        onDragLeave={e => {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, file)}
      >
        <GridIcon>{getFileIcon(file)}</GridIcon>
        <GridName>{file.name}</GridName>
      </GridItem>
    );
  };

  const crumbs = getBreadcrumbs(paneId);
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <PaneContainer ref={paneRef} className={activePane === paneId ? 'active' : ''} onClick={() => setActivePane(paneId)}>
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
        <NavBtn onClick={goBack} disabled={historyIdx === 0} title="Back">←</NavBtn>
        <NavBtn onClick={goForward} disabled={historyIdx >= history.length - 1} title="Forward">→</NavBtn>
        <NavBtn onClick={goUp} disabled={currentPath === '/'} title="Up">↑</NavBtn>
        <NavBtn onClick={() => refreshPane(paneId)} title="Refresh">↺</NavBtn>

        <Breadcrumb>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <BreadSep>›</BreadSep>}
              <BreadcrumbItem 
                className={i === crumbs.length - 1 ? 'last' : ''} 
                onClick={() => {
                  if (i < crumbs.length - 1) {
                    // Smart breadcrumb navigation with bookmark scope detection
                    const activeBookmark = getActiveBookmark(paneId);
                    
                    // Check if clicked path is at or under active bookmark
                    const isUnderBookmark = activeBookmark && 
                      (crumb.path === activeBookmark.path || crumb.path.startsWith(activeBookmark.path + '/'));
                    
                    if (!isUnderBookmark) {
                      // Reset basePath when navigating outside bookmark scope
                      useStore.getState().updatePane(paneId, { basePath: '/', activeBookmarkId: null });
                    }
                    
                    // Always update current path
                    setCurrentBreadcrumbPath(paneId, crumb.path);
                    navigateTo(paneId, crumb.path);
                  }
                }}
              >
                {crumb.name}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </Breadcrumb>

        <SortBtn onClick={() => {
          const sorts = ['name', 'size', 'modified', 'extension'];
          const nextSort = sorts[(sorts.indexOf(sortBy) + 1) % sorts.length];
          setSortBy(paneId, nextSort, sortOrder);
        }}>
          ↕ {sortBy}
        </SortBtn>

        <ViewBtns>
          <ViewBtn className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode(paneId, 'list')} title="List view">☰</ViewBtn>
          <ViewBtn className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode(paneId, 'grid')} title="Grid view">⊞</ViewBtn>
          <ViewBtn className={viewMode === 'column' ? 'active' : ''} onClick={() => setViewMode(paneId, 'column')} title="Column view">▤</ViewBtn>
        </ViewBtns>
      </Toolbar>

      {/* File List */}
      <FileListArea
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
        }}
        onDragEnter={e => {
          e.preventDefault();
          dragCounterRef.current++;
        }}
        onDragLeave={e => {
          dragCounterRef.current--;
          if (dragCounterRef.current === 0) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, null)}
        onContextMenu={handleBackgroundContextMenu}
        onClick={() => {
          setSelection(paneId, []);
          setContextMenu(null);
          setContextMenuFile(null);
        }}
      >
        {loading && (
          <EmptyState>
            <span style={{ color: '#4A9EFF' }}>Loading...</span>
          </EmptyState>
        )}
        {!loading && files.length === 0 && (
          <EmptyState>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>This folder is empty</span>
          </EmptyState>
        )}
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
            {files.map(renderFileRow)}
          </>
        )}
        {!loading && files.length > 0 && viewMode === 'grid' && (
          <GridWrap>{files.map(renderGridItem)}</GridWrap>
        )}
        {!loading && viewMode === 'column' && (
          <ColumnsContainer ref={columnsContainerRef}>
            {/* Render all columns from derived columnPaths */}
            {columnPaths.map((colPath, idx) => {
              const isFirstColumn = idx === 0;
              const colFiles = isFirstColumn ? files : (columnFiles[colPath] || []);
              return (
                <Column key={colPath} width={columnWidths[idx] ? `${columnWidths[idx]}px` : '200px'} className={focusedColumn === idx ? 'active' : ''} data-column-index={idx}>
                  <ColViewHeader>{colPath === '/' ? 'Root' : colPath.split('/').pop()}</ColViewHeader>
                  <ColumnList 
                    data-column-list
                    onClick={() => handleColumnEmptyClick(idx)}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
                    }}
                    onDrop={e => {
                      e.stopPropagation();
                      handleDrop(e, null, colPath);
                    }}
                  >
                    {colFiles.map(file => (
                      <ColumnItem
                        key={file.path}
                        className={`${(selectedFiles.has(file.path) || (idx < focusedColumn && derivedSelections[idx] === file.path)) ? 'selected' : ''} ${dragOver === file.path ? 'drag-over' : ''}`}
                        contextMenuSelected={contextMenuFile?.path === file.path}
                        onClick={e => {
                          e.stopPropagation();
                          setActivePane(paneId);
                          updateColumnState(paneId, { focusedIndex: idx });
                          if (e.metaKey || e.ctrlKey) {
                            toggleSelection(paneId, file.path, true);
                          } else {
                            setSelection(paneId, [file.path]);
                          }
                          handleColumnClick(file, idx);
                        }}
                        onContextMenu={e => handleContextMenu(e, file)}
                        draggable
                        onDragStart={e => {
                          const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
                          if (!selectedFiles.has(file.path)) {
                            setSelection(paneId, paths);
                          }
                          setDraggedFiles(paths);
                          setIsDragging(true);
                          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
                          e.dataTransfer.effectAllowed = 'copyMove';
                          
                          // Create custom drag image
                          const dragImg = document.createElement('div');
                          dragImg.style.cssText = `
                            position: absolute;
                            top: -1000px;
                            padding: 6px 12px;
                            background: rgba(74, 158, 255, 0.9);
                            color: white;
                            border-radius: 6px;
                            font-size: 12px;
                            font-weight: 500;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                          `;
                          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
                          document.body.appendChild(dragImg);
                          e.dataTransfer.setDragImage(dragImg, 0, 0);
                          setTimeout(() => document.body.removeChild(dragImg), 0);
                        }}
                        onDragEnd={() => {
                          setIsDragging(false);
                          setDraggedFiles([]);
                          setDragOver(null);
                        }}
                        onDragOver={e => {
                          if (file.isDirectory && !draggedFiles.includes(file.path)) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
                            setDragOver(file.path);
                          }
                        }}
                        onDragEnter={e => {
                          if (file.isDirectory && !draggedFiles.includes(file.path)) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDragLeave={e => {
                          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
                            setDragOver(null);
                          }
                        }}
                        onDrop={e => {
                          e.stopPropagation();
                          handleDrop(e, file);
                        }}
                      >
                        <span className="icon">{getFileIcon(file)}</span>
                        <span className="name">{file.name}</span>
                      </ColumnItem>
                    ))}
                  </ColumnList>
                  <ColumnResizer onMouseDown={() => setResizingColumn(idx)} />
                </Column>
              );
            })}
          </ColumnsContainer>
        )}
      </FileListArea>

      {/* Status Bar */}
      <StatusBar>
        <span>{files.length} items · {formatSize(totalSize)}</span>
        <span>{selectedFiles.size > 0 ? `${selectedFiles.size} selected` : ''}</span>
      </StatusBar>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          {contextMenu.background ? (
            <>
              <MenuItem onClick={() => { createFolder(); setContextMenu(null); setContextMenuFile(null); }}>📁 New Folder</MenuItem>
              <MenuItem onClick={() => { refreshPane(paneId); setContextMenu(null); setContextMenuFile(null); }}>↺ Refresh</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); setContextMenuFile(null); }}>
                  📋 Paste {clipboardQueue.length} item{clipboardQueue.length > 1 ? 's' : ''}
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => { openModal('sizeViz', { path: currentPath }); setContextMenu(null); setContextMenuFile(null); }}>
                📊 Disk Usage Map
              </MenuItem>
            </>
          ) : (
            <>
              {contextMenu.file?.isDirectory && (
                <MenuItem onClick={() => {
                  const file = contextMenu.file;
                  if (!bookmarks.find(bm => bm.path === file.path)) {
                    const name = file.name || file.path.split('/').pop() || file.path;
                    setBookmarks([...bookmarks, { id: `bm-${Date.now()}`, name, path: file.path, icon: 'default' }]);
                  }
                  setContextMenu(null); setContextMenuFile(null);
                }}>🔖 Add to Bookmarks</MenuItem>
              )}
              <MenuItem onClick={() => { startRename(contextMenu.file); setContextMenu(null); setContextMenuFile(null); }}>✏️ Rename</MenuItem>
              {selectedFiles.size > 1 && (
                <MenuItem onClick={() => {
                  openModal('batchRename', { files: selectedFileObjects, basePath: currentPath });
                  setContextMenu(null); setContextMenuFile(null);
                }}>✏️ Batch Rename...</MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'copy');
                setContextMenu(null); setContextMenuFile(null);
              }}>📋 Copy</MenuItem>
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'cut');
                setContextMenu(null); setContextMenuFile(null);
              }}>✂️ Cut</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); setContextMenuFile(null); }}>
                  📋 Paste
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => {
                openModal('tags', { file: contextMenu.file });
                setContextMenu(null); setContextMenuFile(null);
              }}>🏷️ Tags...</MenuItem>
              <MenuItem onClick={() => {
                openModal('permissions', { file: contextMenu.file });
                setContextMenu(null); setContextMenuFile(null);
              }}>🔒 Permissions...</MenuItem>
              {!contextMenu.file?.isDirectory && (
                <>
                  <MenuDivider />
                  <MenuItem onClick={async () => {
                    const sel = [...selectedFiles];
                    const dest = `${currentPath}/${sel.map(p => p.split('/').pop()).join('_')}.zip`;
                    await window.electronAPI.zip({ files: sel, destPath: dest });
                    refreshPane(paneId);
                    setContextMenu(null); setContextMenuFile(null);
                  }}>📦 Zip</MenuItem>
                  {contextMenu.file?.extension === 'zip' && (
                    <MenuItem onClick={async () => {
                      const zipFile = contextMenu.file;
                      const destDir = zipFile.path.replace('.zip', '');
                      await window.electronAPI.unzip({ filePath: zipFile.path, destDir });
                      refreshPane(paneId);
                      setContextMenu(null); setContextMenuFile(null);
                    }}>📂 Unzip Here</MenuItem>
                  )}
                </>
              )}
              <MenuDivider />
              <MenuItem danger onClick={() => {
                deleteSelected();
                setContextMenu(null); setContextMenuFile(null);
              }}>🗑️ Move to Trash</MenuItem>
            </>
          )}
        </ContextMenu>
      )}
    </PaneContainer>
  );
}