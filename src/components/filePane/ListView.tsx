import React from 'react';
import styled from 'styled-components';
import FileListItem from './FileListItem';
import type { FileItem } from '../../types';

const FileListArea = styled.div`
  flex: 1;
  overflow: auto;
  padding: 4px 0;
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

const SizeHeaderCell = styled(ListHeaderCell)`
  text-align: right;
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

const EmptyFolderIcon = styled.span`
  font-size: 28px;
`;

const NewItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  height: 28px;
`;

const NewItemInput = styled.input`
  flex: 1;
  background: transparent;
  border: 1px solid #4A9EFF;
  color: inherit;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  outline: none;
`;

interface ListViewProps {
  paneId: string;
  files: FileItem[];
  newItemMode: 'folder' | 'file' | null;
  newItemName: string;
  newItemInputRef: React.RefObject<HTMLInputElement | null>;
  setNewItemName: (v: string) => void;
  setNewItemMode: (mode: 'folder' | 'file' | null) => void;
  commitNewItem: () => void;
  selectedFiles: Set<string>;
  renaming: string | null;
  contextMenuFilePath: string | null;
  dragOver: string | null;
  draggedFiles: string[];
  fileTags: Record<string, any[]>;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  setRenaming: (path: string | null) => void;
  handleFileClick: (e: React.MouseEvent, file: FileItem) => void;
  handleFileDoubleClick: (file: FileItem) => void;
  handleContextMenu: (e: React.MouseEvent, file: FileItem | null) => void;
  handleDrop: (e: React.DragEvent, file: FileItem | null) => void;
  setSelection: (paneId: string, files: string[], colIdx?: number | null) => void;
  setDraggedFiles: (f: string[]) => void;
  setIsDragging: (v: boolean) => void;
  setDragOver: (v: string | null) => void;
}

export default function ListView({
  paneId, files,
  newItemMode, newItemName, newItemInputRef, setNewItemName, setNewItemMode, commitNewItem,
  selectedFiles, renaming, contextMenuFilePath, dragOver, draggedFiles, fileTags,
  renameValue, setRenameValue, commitRename, setRenaming,
  handleFileClick, handleFileDoubleClick, handleContextMenu, handleDrop,
  setSelection, setDraggedFiles, setIsDragging, setDragOver,
}: ListViewProps) {
  return (
    <>
      <ListHeader>
        <ListHeaderCell />
        <ListHeaderCell>Name</ListHeaderCell>
        <SizeHeaderCell>Size</SizeHeaderCell>
        <ListHeaderCell>Modified</ListHeaderCell>
        <ListHeaderCell>Kind</ListHeaderCell>
      </ListHeader>
      <FileListArea onClick={() => setSelection(paneId, [])}>
        {newItemMode && (
          <NewItemRow>
            <span>{newItemMode === 'folder' ? '📁' : '📄'}</span>
            <NewItemInput
              ref={newItemInputRef}
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onBlur={commitNewItem}
              onKeyDown={e => {
                if (e.key === 'Enter') commitNewItem();
                if (e.key === 'Escape') { setNewItemMode(null); setNewItemName(''); }
              }}
              placeholder={newItemMode === 'folder' ? 'Folder name' : 'File name'}
            />
          </NewItemRow>
        )}
        {files.length === 0 && !newItemMode ? (
          <EmptyState>
            <EmptyFolderIcon>📂</EmptyFolderIcon>
            <span>Empty folder</span>
          </EmptyState>
        ) : (
          files.map(file => (
            <FileListItem
              key={file.path}
              file={file}
              isSelected={selectedFiles.has(file.path)}
              isRenaming={renaming === file.path}
              isContextMenuSelected={contextMenuFilePath === file.path}
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
              onDoubleClick={handleFileDoubleClick}
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
}
