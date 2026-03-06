import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  background: ${p => p.selected ? p.theme.bg.selection : 'transparent'};
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
  width: 200px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  
  &.active {
    background: ${p => p.theme.bg.secondary};
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
  
  &:hover {
    background: ${p => p.theme.bg.hover};
  }
  
  &.selected {
    background: ${p => p.theme.bg.selection};
    color: ${p => p.theme.accent.blue};
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
  position: fixed;
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
  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }
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
    panes, activePane, setActivePane,
    navigateTo, refreshPane,
    setSelection, toggleSelection,
    setSortBy, setViewMode,
    addTab, closeTab, switchTab,
    setPreviewFile,
    openModal,
    addToClipboard, clipboardQueue, pasteClipboard,
    undo,
  } = useStore();

  const pane = panes.find(p => p.id === paneId);
  const isActive = activePane === paneId;

  if (!pane) return null;

  const { path: currentPath, files, loading, selectedFiles, sortBy, sortOrder, viewMode, tabs, activeTab } = pane;

  const [history, setHistory] = useState([pane?.path]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const renameInputRef = useRef(null);
  
  // Column view state
  const [columnPaths, setColumnPaths] = useState([]);
  const [columnFiles, setColumnFiles] = useState({});
  const [selectedColumnPath, setSelectedColumnPath] = useState(null);
  const [currentBreadcrumbPath, setCurrentBreadcrumbPath] = useState(currentPath);
  const [selectedItems, setSelectedItems] = useState({}); // Track selected items per column
  const [focusedColumn, setFocusedColumn] = useState(0); // Track which column has focus

  useEffect(() => {
    if (renameFile && renameInputRef.current) renameInputRef.current.focus();
  }, [renameFile]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Keyboard navigation for column view
  useEffect(() => {
    if (viewMode !== 'column') return;

    const handleKeyDown = (e) => {
      const columnKey = focusedColumn === 0 ? currentPath : columnPaths[focusedColumn - 1];
      const columnFilesList = focusedColumn === 0 ? files : (columnFiles[columnKey] || []);
      const currentSelection = selectedItems[focusedColumn] || '';
      const currentIndex = columnFilesList.findIndex(f => f.path === currentSelection);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            const newSelection = columnFilesList[currentIndex - 1];
            setSelectedItems(prev => ({ ...prev, [focusedColumn]: newSelection.path }));
            setSelection(paneId, [newSelection.path]);
            
            if (newSelection.isDirectory) {
              setSelectedColumnPath(newSelection.path);
              setCurrentBreadcrumbPath(newSelection.path);
              // Directories auto-open on selection
              handleColumnClick(newSelection, focusedColumn);
            } else {
              setPreviewFile(newSelection);
              // For files, remove the next column since we're not showing directory contents
              const newPaths = focusedColumn === 0 ? [] : columnPaths.slice(0, focusedColumn);
              setColumnPaths(newPaths);
            }
          }
          break;
        
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < columnFilesList.length - 1) {
            const newSelection = columnFilesList[currentIndex + 1];
            setSelectedItems(prev => ({ ...prev, [focusedColumn]: newSelection.path }));
            setSelection(paneId, [newSelection.path]);
            
            if (newSelection.isDirectory) {
              setSelectedColumnPath(newSelection.path);
              setCurrentBreadcrumbPath(newSelection.path);
              // Directories auto-open on selection
              handleColumnClick(newSelection, focusedColumn);
            } else {
              setPreviewFile(newSelection);
              // For files, remove the next column since we're not showing directory contents
              const newPaths = focusedColumn === 0 ? [] : columnPaths.slice(0, focusedColumn);
              setColumnPaths(newPaths);
            }
          }
          break;
        
        case 'ArrowRight':
          e.preventDefault();
          if (currentSelection) {
            const selectedItem = columnFilesList[currentIndex];
            if (selectedItem.isDirectory) {
              // For directories, just select first item in the next column (if it exists)
              const nextColumnKey = selectedItem.path;
              const nextColumnFiles = columnFiles[nextColumnKey] || [];
              if (nextColumnFiles.length > 0) {
                setSelectedItems(prev => ({ ...prev, [focusedColumn + 1]: nextColumnFiles[0].path }));
                setFocusedColumn(focusedColumn + 1);
                setSelection(paneId, [nextColumnFiles[0].path]);
                if (nextColumnFiles[0].isDirectory) {
                  setSelectedColumnPath(nextColumnFiles[0].path);
                  setCurrentBreadcrumbPath(nextColumnFiles[0].path);
                } else {
                  setPreviewFile(nextColumnFiles[0]);
                }
              }
            } else {
              // For files, just preview
              setPreviewFile(selectedItem);
            }
          }
          break;
        
        case 'ArrowLeft':
          e.preventDefault();
          if (focusedColumn > 0) {
            // Unselect current column before moving left
            setSelectedItems(prev => ({ ...prev, [focusedColumn]: null }));
            setFocusedColumn(focusedColumn - 1);
            // Clear preview when moving left
            setPreviewFile(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, focusedColumn, columnPaths, currentPath, files, columnFiles, selectedItems]);

  // Load column view data
  useEffect(() => {
    if (viewMode === 'column') {
      const loadColumns = async () => {
        const paths = [currentPath, ...columnPaths];
        const filesMap = { [currentPath]: files };
        
        for (const path of columnPaths) {
          if (!filesMap[path]) {
            const result = await window.electronAPI.readdir(path);
            if (result.success) {
              filesMap[path] = result.files;
            }
          }
        }
        setColumnFiles(filesMap);
      };
      loadColumns();
    } else {
      // Reset breadcrumb when leaving column view
      setCurrentBreadcrumbPath(currentPath);
    }
  }, [viewMode, currentPath, files, columnPaths]);

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
    // Update focus to clicked column
    setFocusedColumn(columnIndex);
    
    // Update selection for this column
    setSelectedItems(prev => ({ ...prev, [columnIndex]: file.path }));
    
    // Always remove columns after this one when selecting
    let newPaths;
    if (columnIndex === 0) {
      newPaths = [];
    } else {
      // For columns beyond the first, keep paths up to this column (inclusive)
      newPaths = columnPaths.slice(0, columnIndex);
    }
    
    if (file.isDirectory) {
      // Add this directory's path to create the next column
      newPaths.push(file.path);
      setColumnPaths(newPaths);
      setSelectedColumnPath(file.path);
      setCurrentBreadcrumbPath(file.path);
      // Clear preview when directory is selected
      setPreviewFile(null);
      
      // Immediately load files for the new directory
      window.electronAPI.readdir(file.path).then(result => {
        if (result.success) {
          setColumnFiles(prev => ({ ...prev, [file.path]: result.files }));
        }
      });
    } else {
      // For files, just update paths without adding new column
      setColumnPaths(newPaths);
      setSelectedColumnPath(file.path);
      setPreviewFile(file);
      // Update breadcrumb to show parent directory of selected file
      const parentPath = file.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentBreadcrumbPath(parentPath);
    }
    
    // Clear files data for columns that were removed
    setColumnFiles(prev => {
      const newFiles = { ...prev };
      // Only clear files for columns that were actually removed
      const oldLength = columnPaths.length;
      const newLength = newPaths.length;
      for (let i = newLength; i < oldLength; i++) {
        const removedPath = columnPaths[i];
        if (removedPath) {
          delete newFiles[removedPath];
        }
      }
      return newFiles;
    });
  };

  const handleColumnEmptyClick = (columnIndex) => {
    // Clear selection in this column
    setSelectedItems(prev => ({ ...prev, [columnIndex]: null }));
    
    // Remove all columns after this one
    const newPaths = columnIndex === 0 ? [] : columnPaths.slice(0, columnIndex - 1);
    setColumnPaths(newPaths);
    
    // Clear files data for removed columns
    setColumnFiles(prev => {
      const newFiles = { ...prev };
      for (let i = columnIndex; i < columnPaths.length; i++) {
        delete newFiles[columnPaths[i]];
      }
      return newFiles;
    });
    
    // Update focus to clicked column
    setFocusedColumn(columnIndex);
    
    // Clear preview
    setPreviewFile(null);
  };

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigate(parent);
  };

  const getBreadcrumbs = () => {
    const path = viewMode === 'column' ? currentBreadcrumbPath : currentPath;
    if (path === '/') return [{ name: '/', path: '/' }];
    const parts = path.split('/').filter(Boolean);
    return [
      { name: '/', path: '/' },
      ...parts.map((part, i) => ({
        name: part,
        path: '/' + parts.slice(0, i + 1).join('/'),
      })),
    ];
  };

  const handleFileClick = (e, file) => {
    e.stopPropagation();
    setActivePane(paneId);

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
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleBackgroundContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file: null, background: true });
  };

  const handleDrop = async (e, destFile) => {
    e.preventDefault();
    setDragOver(null);
    const droppedPaths = e.dataTransfer.getData('file-paths');
    if (!droppedPaths) return;
    const paths = JSON.parse(droppedPaths);
    const destDir = destFile?.isDirectory ? destFile.path : currentPath;
    for (const src of paths) {
      const dest = `${destDir}/${src.split('/').pop()}`;
      if (e.altKey) await window.electronAPI.copy(src, dest);
      else await window.electronAPI.move(src, dest);
    }
    refreshPane(paneId);
    // Refresh other pane too
    const otherPane = paneId === 'left' ? 'right' : 'left';
    refreshPane(otherPane);
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

    return (
      <FileRow
        key={file.path}
        selected={isSelected}
        className={dragOver === file.path ? 'drag-over' : ''}
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path)
            ? [...selectedFiles]
            : [file.path];
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
          e.dataTransfer.effectAllowed = 'copyMove';
        }}
        onDragOver={e => {
          if (file.isDirectory) {
            e.preventDefault();
            setDragOver(file.path);
          }
        }}
        onDragLeave={() => setDragOver(null)}
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
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
        }}
      >
        <GridIcon>{getFileIcon(file)}</GridIcon>
        <GridName>{file.name}</GridName>
      </GridItem>
    );
  };

  const crumbs = getBreadcrumbs();
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <PaneContainer className={isActive ? 'active' : ''} onClick={() => setActivePane(paneId)}>
      {/* Tab Bar */}
      <TabBar>
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
              <BreadcrumbItem className={i === crumbs.length - 1 ? 'last' : ''} onClick={() => i < crumbs.length - 1 && navigate(crumb.path)}>
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
        onDragOver={e => e.preventDefault()}
        onDrop={e => handleDrop(e, null)}
        onContextMenu={handleBackgroundContextMenu}
        onClick={() => setSelection(paneId, [])}
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
          <ColumnsContainer>
            {/* First column - current path */}
            <Column className={focusedColumn === 0 ? 'active' : ''}>
              <ColViewHeader>{currentPath === '/' ? 'Root' : currentPath.split('/').pop()}</ColViewHeader>
              <ColumnList onClick={() => handleColumnEmptyClick(0)}>
                {files.map(file => (
                  <ColumnItem
                    key={file.path}
                    className={selectedItems[0] === file.path ? 'selected' : ''}
                    onClick={e => {
                      e.stopPropagation();
                      handleColumnClick(file, 0);
                    }}
                  >
                    <span className="icon">{getFileIcon(file)}</span>
                    <span className="name">{file.name}</span>
                  </ColumnItem>
                ))}
              </ColumnList>
            </Column>
            
            {/* Additional columns for nested selections */}
            {columnPaths.map((colPath, idx) => {
              const colFiles = columnFiles[colPath] || [];
              return (
                <Column key={colPath} className={focusedColumn === idx + 1 ? 'active' : ''}>
                  <ColViewHeader>{colPath.split('/').pop() || 'Root'}</ColViewHeader>
                  <ColumnList onClick={() => handleColumnEmptyClick(idx + 1)}>
                    {colFiles.map(file => (
                      <ColumnItem
                        key={file.path}
                        className={selectedItems[idx + 1] === file.path ? 'selected' : ''}
                        onClick={e => {
                          e.stopPropagation();
                          handleColumnClick(file, idx + 1);
                        }}
                      >
                        <span className="icon">{getFileIcon(file)}</span>
                        <span className="name">{file.name}</span>
                      </ColumnItem>
                    ))}
                  </ColumnList>
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
        <ContextMenu style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          {contextMenu.background ? (
            <>
              <MenuItem onClick={() => { createFolder(); setContextMenu(null); }}>📁 New Folder</MenuItem>
              <MenuItem onClick={() => { refreshPane(paneId); setContextMenu(null); }}>↺ Refresh</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); }}>
                  📋 Paste {clipboardQueue.length} item{clipboardQueue.length > 1 ? 's' : ''}
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => { openModal('sizeViz', { path: currentPath }); setContextMenu(null); }}>
                📊 Disk Usage Map
              </MenuItem>
            </>
          ) : (
            <>
              <MenuItem onClick={() => { handleDoubleClick(contextMenu.file); setContextMenu(null); }}>
                {contextMenu.file?.isDirectory ? '📂 Open' : '⬆️ Open'}
              </MenuItem>
              <MenuItem onClick={() => { window.electronAPI.showInFinder(contextMenu.file.path); setContextMenu(null); }}>
                🔍 Reveal in Finder
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={() => { startRename(contextMenu.file); }}>✏️ Rename</MenuItem>
              {selectedFiles.size > 1 && (
                <MenuItem onClick={() => {
                  openModal('batchRename', { files: selectedFileObjects, basePath: currentPath });
                  setContextMenu(null);
                }}>✏️ Batch Rename...</MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'copy');
                setContextMenu(null);
              }}>📋 Copy</MenuItem>
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'cut');
                setContextMenu(null);
              }}>✂️ Cut</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); }}>
                  📋 Paste
                </MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => {
                openModal('tags', { file: contextMenu.file });
                setContextMenu(null);
              }}>🏷️ Tags...</MenuItem>
              <MenuItem onClick={() => {
                openModal('permissions', { file: contextMenu.file });
                setContextMenu(null);
              }}>🔒 Permissions...</MenuItem>
              {!contextMenu.file?.isDirectory && (
                <>
                  <MenuDivider />
                  <MenuItem onClick={async () => {
                    const sel = [...selectedFiles];
                    const dest = `${currentPath}/${sel.map(p => p.split('/').pop()).join('_')}.zip`;
                    await window.electronAPI.zip({ files: sel, destPath: dest });
                    refreshPane(paneId);
                    setContextMenu(null);
                  }}>📦 Zip</MenuItem>
                  {contextMenu.file?.extension === 'zip' && (
                    <MenuItem onClick={async () => {
                      const zipFile = contextMenu.file;
                      const destDir = zipFile.path.replace('.zip', '');
                      await window.electronAPI.unzip({ filePath: zipFile.path, destDir });
                      refreshPane(paneId);
                      setContextMenu(null);
                    }}>📂 Unzip Here</MenuItem>
                  )}
                </>
              )}
              <MenuDivider />
              <MenuItem danger onClick={() => {
                deleteSelected();
                setContextMenu(null);
              }}>🗑️ Move to Trash</MenuItem>
            </>
          )}
        </ContextMenu>
      )}
    </PaneContainer>
  );
}