import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store';
import { SORT_TYPES } from '../../helpers/sort';
import type { FileItem, SortBy } from '../../types';

const Menu = styled.div`
  position: fixed;
  z-index: 9000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 4px;
  min-width: 200px;
  max-width: 280px;
  font-size: 12px;
  user-select: none;
`;

const MenuItem = styled.div<{ danger?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  color: ${p => p.danger ? p.theme.text.error : p.disabled ? p.theme.text.tertiary : p.theme.text.primary};
  opacity: ${p => p.disabled ? 0.5 : 1};
  transition: background 0.08s;
  &:hover { background: ${p => !p.disabled && p.theme.bg.hover}; }
`;

const MenuIcon = styled.span`
  font-size: 13px;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
`;

const MenuLabel = styled.span`
  flex: 1;
`;

const Shortcut = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
`;

const Divider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 3px 4px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 10px 2px;
`;

const SortRow = styled.div`
  display: flex;
  gap: 3px;
  padding: 4px 6px;
`;

const SortBtn = styled.button<{ active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: ${p => p.theme.radius.sm};
  background: ${p => p.active ? p.theme.bg.selection : p.theme.bg.primary};
  border: 1px solid ${p => p.active ? p.theme.border.focus : p.theme.border.subtle};
  color: ${p => p.active ? p.theme.text.accent : p.theme.text.secondary};
  cursor: pointer;
  font-size: 10px;
  transition: all 0.12s;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

interface PaneContextMenuProps {
  x: number;
  y: number;
  file: FileItem | null;
  paneId: string;
  currentPath: string;
  selectedFiles: Set<string>;
  onClose: () => void;
  onRename: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onDelete: (files?: string[]) => void;
  onRefresh: () => void;
  onBatchRename: () => void;
}

export default function PaneContextMenu({
  x,
  y,
  file,
  paneId,
  currentPath,
  selectedFiles,
  onClose,
  onRename,
  onNewFolder,
  onNewFile,
  onDelete,
  onRefresh,
  onBatchRename,
}: PaneContextMenuProps) {
  const {
    addToClipboard,
    clipboardQueue,
    clipboardMode,
    pasteClipboard,
    openModal,
    getDirSort,
    setDirectorySort,
  } = useStore();

  const menuRef = useRef<HTMLDivElement>(null);

  const targetDir = file
    ? (file.isDirectory ? file.path : (currentPath || '/'))
    : (currentPath || '/');

  const currentSort = getDirSort(targetDir);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose]);

  const handleCopy = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    addToClipboard(files, 'copy');
    onClose();
  };

  const handleCut = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    addToClipboard(files, 'cut');
    onClose();
  };

  const handlePaste = async () => {
    await pasteClipboard(targetDir);
    onClose();
  };

  const handleDelete = () => {
    const files = selectedFiles.size > 0 ? [...selectedFiles] : file ? [file.path] : [];
    onDelete(files);
    onClose();
  };

  const handleSortChange = async (sortBy: SortBy) => {
    await setDirectorySort(targetDir, sortBy);
    onClose();
  };

  const multiSelected = selectedFiles.size > 1;
  const hasPaste = clipboardQueue.length > 0;
  const label = file
    ? (multiSelected ? `${selectedFiles.size} items` : file.name)
    : 'Background';

  return (
    <Menu ref={menuRef} style={{ top: y, left: x }} onClick={e => e.stopPropagation()}>
      {!file && (
        <>
          <MenuItem onClick={() => { onNewFolder(); onClose(); }}>
            <MenuIcon>📁</MenuIcon>
            <MenuLabel>New Folder</MenuLabel>
          </MenuItem>
          <MenuItem onClick={() => { onNewFile(); onClose(); }}>
            <MenuIcon>📄</MenuIcon>
            <MenuLabel>New File</MenuLabel>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handlePaste} disabled={!hasPaste}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Paste {hasPaste ? `(${clipboardQueue.length})` : ''}</MenuLabel>
            <Shortcut>⌘V</Shortcut>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { onRefresh(); onClose(); }}>
            <MenuIcon>🔄</MenuIcon>
            <MenuLabel>Refresh</MenuLabel>
            <Shortcut>⌘R</Shortcut>
          </MenuItem>
        </>
      )}

      {file && (
        <>
          <MenuItem onClick={() => { onRename(); onClose(); }} disabled={multiSelected}>
            <MenuIcon>✏️</MenuIcon>
            <MenuLabel>Rename</MenuLabel>
            <Shortcut>↩</Shortcut>
          </MenuItem>
          {multiSelected && (
            <MenuItem onClick={() => { onBatchRename(); onClose(); }}>
              <MenuIcon>✏️</MenuIcon>
              <MenuLabel>Batch Rename…</MenuLabel>
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleCopy}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Copy</MenuLabel>
            <Shortcut>⌘C</Shortcut>
          </MenuItem>
          <MenuItem onClick={handleCut}>
            <MenuIcon>✂️</MenuIcon>
            <MenuLabel>Cut</MenuLabel>
            <Shortcut>⌘X</Shortcut>
          </MenuItem>
          <MenuItem onClick={handlePaste} disabled={!hasPaste}>
            <MenuIcon>📋</MenuIcon>
            <MenuLabel>Paste {hasPaste ? `(${clipboardQueue.length})` : ''}</MenuLabel>
            <Shortcut>⌘V</Shortcut>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            openModal('tagManager', { filePath: file.path });
            onClose();
          }}>
            <MenuIcon>🏷️</MenuIcon>
            <MenuLabel>Tags…</MenuLabel>
          </MenuItem>
          {file.isDirectory && (
            <MenuItem onClick={() => {
              openModal('sizeVisualizer', { rootPath: file.path });
              onClose();
            }}>
              <MenuIcon>📊</MenuIcon>
              <MenuLabel>Disk Usage…</MenuLabel>
            </MenuItem>
          )}
          {!file.isDirectory && (
            <>
              <MenuItem onClick={() => {
                openModal('permissions', { filePath: file.path });
                onClose();
              }}>
                <MenuIcon>🔒</MenuIcon>
                <MenuLabel>Permissions…</MenuLabel>
              </MenuItem>
            </>
          )}
          <Divider />
          {file.isDirectory ? (
            <>
              <MenuItem onClick={() => {
                openModal('zip', { files: selectedFiles.size > 0 ? [...selectedFiles] : [file.path] });
                onClose();
              }}>
                <MenuIcon>📦</MenuIcon>
                <MenuLabel>Compress…</MenuLabel>
              </MenuItem>
            </>
          ) : (
            file.extension === 'zip' || file.extension === 'gz' || file.extension === 'tar' ? (
              <MenuItem onClick={() => {
                openModal('unzip', { filePath: file.path });
                onClose();
              }}>
                <MenuIcon>📂</MenuIcon>
                <MenuLabel>Extract…</MenuLabel>
              </MenuItem>
            ) : null
          )}
          <Divider />
          <MenuItem danger onClick={handleDelete}>
            <MenuIcon>🗑️</MenuIcon>
            <MenuLabel>Delete {multiSelected ? `(${selectedFiles.size})` : ''}</MenuLabel>
            <Shortcut>⌫</Shortcut>
          </MenuItem>
        </>
      )}

      <Divider />
      <SectionLabel>Sort by</SectionLabel>
      <SortRow>
        {SORT_TYPES.map(st => (
          <SortBtn
            key={st.id}
            active={currentSort === st.id}
            onClick={() => handleSortChange(st.id)}
            title={st.description}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
          </SortBtn>
        ))}
      </SortRow>
    </Menu>
  );
}
