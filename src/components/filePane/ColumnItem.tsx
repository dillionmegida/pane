import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FileIcon as FileIconComponent } from '../FileIcons';
import { startDrag, endDrag } from './dragUtils';
import type { FileItem, ColumnState } from '../../types';

const Item = styled.div<{ selected: boolean; $derived: boolean; $dragOver: boolean; $contextMenuSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
  color: ${p => p.theme.text.secondary};
  background: ${p =>
    p.$contextMenuSelected ? p.theme.bg.hover :
    p.selected ? p.theme.bg.selection :
    p.$derived ? p.theme.bg.hover :
    'transparent'};
  border-radius: ${p => p.theme.radius.sm};
  margin: 0 3px;
  position: relative;
  scroll-margin-bottom: 72px;
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

const ItemIcon = styled.span`
  font-size: 13px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
`;

const ItemName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.theme.text.primary};
`;

const ItemArrow = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
  flex-shrink: 0;
`;

const SymlinkIndicator = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  flex-shrink: 0;
  position: relative;
  cursor: help;

  &::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: ${p => p.theme.bg.elevated};
    color: ${p => p.theme.text.primary};
    border: 1px solid ${p => p.theme.border.normal};
    border-radius: ${p => p.theme.radius.sm};
    padding: 3px 8px;
    font-size: 11px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 9999;
    box-shadow: ${p => p.theme.shadow.md};
  }

  &:hover::after {
    opacity: 1;
  }
`;

const TagDots = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`;

const TagDot = styled.span<{ color: string; offset: number }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset === 0 ? 0 : -3}px;
  border: 1px solid white;
`;

const ColumnRenameInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: inherit;
  border-radius: 3px;
  outline: none;
  min-width: 0;
`;

interface ColumnItemProps {
  file: FileItem;
  isSelected: boolean;
  isDerived: boolean;
  isDragOver: boolean;
  isContextMenuSelected: boolean;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  paneId: string;
  fileTags: Record<string, Array<{ tag_name: string; color: string }>>;
  columnIndex: number;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameValueChange?: (v: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  onItemClick: (e: React.MouseEvent, file: FileItem, columnIndex: number, clickType: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
  onDrop: (e: React.DragEvent, file: FileItem | null, path?: string) => void;
  setSelection: (paneId: string, files: string[]) => void;
  setDraggedFiles: (files: string[]) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragOver: (path: string | null) => void;
  updateColumnState: (paneId: string, updates: Partial<ColumnState>) => void;
  toggleSelection: (paneId: string, filePath: string, multi?: boolean) => void;
}

export default function ColumnItem({
  file,
  isSelected,
  isDerived,
  isDragOver,
  isContextMenuSelected,
  selectedFiles,
  draggedFiles,
  paneId,
  fileTags,
  columnIndex,
  isRenaming = false,
  renameValue = '',
  onRenameValueChange,
  onRenameCommit,
  onRenameCancel,
  onItemClick,
  onContextMenu,
  onDrop,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
  updateColumnState,
  toggleSelection,
}: ColumnItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clickType = e.shiftKey ? 'shift' : e.metaKey || e.ctrlKey ? 'meta' : 'normal';
    if (clickType === 'meta') {
      toggleSelection(paneId, file.path, true);
    } else {
      updateColumnState(paneId, { focusedIndex: columnIndex });
      onItemClick(e, file, columnIndex, clickType);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    startDrag(e, file, selectedFiles, setSelection, setDraggedFiles, setIsDragging, paneId);
  };

  const handleDragEnd = () => endDrag(setIsDragging, setDraggedFiles, setDragOver);

  const handleDragOver = (e: React.DragEvent) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
      setDragOver(file.path);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (file.isDirectory && !draggedFiles.includes(file.path)) {
      e.preventDefault();
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target || !(e.currentTarget as Node).contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  };

  const tags = fileTags[file.path] || [];

  return (
    <Item
      ref={itemRef}
      selected={isSelected}
      $derived={isDerived}
      $dragOver={isDragOver}
      $contextMenuSelected={isContextMenuSelected}
      className={`${isSelected ? 'selected' : ''} ${isDerived ? 'derived' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onClick={handleClick}
      onContextMenu={e => onContextMenu(e, file)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={e => onDrop(e, file)}
    >
      <ItemIcon>
        {file.isDirectory ? (
          file.name && file.name.endsWith('.app') ? (
            <FileIconComponent ext="app" size={16} />
          ) : (
            '📁'
          )
        ) : (
          <FileIconComponent ext={file.extension ?? ''} size={16} />
        )}
      </ItemIcon>
      {isRenaming ? (
        <ColumnRenameInput
          ref={renameInputRef}
          value={renameValue}
          onChange={e => onRenameValueChange?.(e.target.value)}
          onBlur={() => onRenameCommit?.()}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); onRenameCommit?.(); }
            if (e.key === 'Escape') { e.preventDefault(); onRenameCancel?.(); }
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <ItemName>{file.name}</ItemName>
      )}
      {file.isSymlink && (
        <SymlinkIndicator data-tip={file.symlinkTarget ? `→ ${file.symlinkTarget}` : 'Symlink'}>
          ↗
        </SymlinkIndicator>
      )}
      {tags.length > 0 && (
        <TagDots>
          {tags.map((t, i) => (
            <TagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3 : 0} />
          ))}
        </TagDots>
      )}
      {file.isDirectory && <ItemArrow>›</ItemArrow>}
    </Item>
  );
}
