import React, { useRef } from 'react';
import styled from 'styled-components';
import { formatSize, formatDate } from '../../store';
import { FileIcon as FileIconComponent } from '../FileIcons';
import { startDrag, endDrag } from './dragUtils';
import type { FileItem, Tag } from '../../types';

const FileRow = styled.div<{ selected: boolean; contextMenuSelected: boolean }>`
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
  scroll-margin-bottom: 72px;

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

const FileIconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  text-align: center;
  vertical-align: middle;
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

const SymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  vertical-align: middle;
  &:hover { opacity: 1; color: ${p => p.theme.accent.blue}; }
`;

const TagDots = styled.span`
  display: inline-flex;
  margin-left: 5px;
  vertical-align: middle;
`;

const TagDot = styled.span<{ color: string; offset: number }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
`;

const ListRenameInput = styled.input`
  background: transparent;
  border: 1px solid #4A9EFF;
  color: #e8e8ed;
  font-size: 12px;
  padding: 1px 4px;
  border-radius: 3px;
  outline: none;
  flex: 1;
`;

interface FileListItemProps {
  file: FileItem;
  isSelected: boolean;
  isRenaming: boolean;
  isContextMenuSelected: boolean;
  isDragOver: boolean;
  selectedFiles: Set<string>;
  draggedFiles: string[];
  paneId: string;
  fileTags: Record<string, Tag[]>;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDrop: (e: React.DragEvent, file: FileItem) => void;
  setSelection: (paneId: string, files: string[]) => void;
  setDraggedFiles: (files: string[]) => void;
  setIsDragging: (dragging: boolean) => void;
  setDragOver: (path: string | null) => void;
}

export default function FileListItem({
  file,
  isSelected,
  isRenaming,
  isContextMenuSelected,
  isDragOver,
  selectedFiles,
  draggedFiles,
  paneId,
  fileTags,
  renameValue,
  setRenameValue,
  onRenameCommit,
  onRenameCancel,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDrop,
  setSelection,
  setDraggedFiles,
  setIsDragging,
  setDragOver,
}: FileListItemProps) {
  const renameInputRef = useRef<HTMLInputElement>(null);

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
    <FileRow
      selected={isSelected}
      contextMenuSelected={isContextMenuSelected}
      className={isDragOver ? 'drag-over' : ''}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={e => onDrop(e, file)}
    >
      <FileIconWrap>
        {file.isDirectory ? (
          file.name && file.name.endsWith('.app') ? (
            <FileIconComponent ext="app" size={16} />
          ) : (
            '📁'
          )
        ) : (
          <FileIconComponent ext={file.extension ?? ''} size={16} />
        )}
      </FileIconWrap>

      {isRenaming ? (
        <ListRenameInput
          ref={renameInputRef}
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameCommit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <FileName>
          {file.name}
          {file.isSymlink && file.symlinkTarget && (
            <SymlinkIndicator
              data-tooltip-id="symlink-tooltip"
              data-tooltip-content={`→ ${file.symlinkTarget}`}
            >
              ↗
            </SymlinkIndicator>
          )}
          {tags.length > 0 && (
            <TagDots>
              {tags.map((t, i) => (
                <TagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3.5 : 0} />
              ))}
            </TagDots>
          )}
        </FileName>
      )}

      <FileMeta>{file.isDirectory ? '—' : formatSize(file.size)}</FileMeta>
      <FileDate>{formatDate(file.modified)}</FileDate>
      <FileExt>{file.isDirectory ? 'folder' : (file.extension || '—')}</FileExt>
    </FileRow>
  );
}
