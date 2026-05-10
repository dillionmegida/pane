import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme } from 'styled-components';
import { useStore, formatSize, formatDate, getFileIcon } from '../../store';
import ModalPreviewPane from '../ModalPreviewPane';
import { getTagColors } from '../../theme';

// ─── Styled ───────────────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
`;

const ModalBox = styled.div`
  width: 860px;
  max-width: 95vw;
  height: 580px;
  max-height: 88vh;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  resize: both;
  min-width: 400px;
  min-height: 300px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: ${p => p.color}22;
  border: 1px solid ${p => p.color};
  color: ${p => p.color};
  border-radius: 99px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
`;

const TagDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
`;

const Title = styled.h2`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  flex: 1;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 16px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${p => p.theme.radius.sm};
  &:hover { color: ${p => p.theme.text.primary}; background: ${p => p.theme.bg.hover}; }
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const ResultsPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid ${p => p.theme.border.subtle};
`;

const ResultList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background 0.07s;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &.selected {
    background: ${p => p.theme.accent.blue}15;
    border-left-color: ${p => p.theme.accent.blue};
  }
`;

const FileIcon = styled.span`
  font-size: 1rem;
  flex-shrink: 0;
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-size: 0.75rem;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FilePath = styled.div`
  font-size: 0.625rem;
  color: ${p => p.theme.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${p => p.theme.font.mono};
`;

const FileMeta = styled.div`
  font-size: 0.625rem;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  text-align: right;
  flex-shrink: 0;
`;

const StatusBar = styled.div`
  padding: 8px 16px;
  font-size: 0.6875rem;
  color: ${p => p.theme.text.tertiary};
  border-top: 1px solid ${p => p.theme.border.normal};
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${p => p.theme.text.tertiary};
  font-size: 0.75rem;
`;

const ResizeDivider = styled.div`
  width: 4px;
  background: ${p => p.theme.border.normal};
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.2s;
  &:hover { background: ${p => p.theme.accent.blue}; }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export function TagBrowserModal({ data, onClose }) {
  const theme = useTheme();
  const { currentTheme } = useStore();
  const TAG_COLORS = getTagColors(currentTheme);

  const filterTag = data?.filterTag;
  const tagColor = data?.color || TAG_COLORS[0];

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewWidth, setPreviewWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const bodyRef = useRef(null);

  // Load file metadata for paths
  useEffect(() => {
    const loadFiles = async () => {
      const paths = data?.files || [];
      if (paths.length === 0) { setLoading(false); return; }
      
      const fileObjs = await Promise.all(
        paths.map(async p => {
          const stat = await window.electronAPI.stat(p);
          if (!stat.success) return null;
          return {
            path: p,
            name: p.split('/').pop(),
            size: stat.size,
            modified: stat.modified,
            isDirectory: stat.isDirectory,
            extension: stat.isDirectory ? null : (p.split('.').pop() || null),
          };
        })
      );
      const valid = fileObjs.filter(f => f !== null);
      setFiles(valid);
      if (valid.length > 0) {
        setSelectedIdx(0);
        setSelectedItem(valid[0]);
      }
      setLoading(false);
    };
    loadFiles();
  }, []);

  // Handle preview resize
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      if (!bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const newW = rect.right - e.clientX;
      if (newW >= 180 && newW <= 560) setPreviewWidth(newW);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const revealInColumns = (fileOrPath) => {
    // Handle both file objects and string paths
    const filePath = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.path;
    const targetFile = files.find(f => f.path === filePath);
    const isDirectory = targetFile?.isDirectory ?? false;
    const parentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
    const paneId = useStore.getState().activePane;

    if (useStore.getState().panes.find(p => p.id === paneId)?.viewMode !== 'column') {
      useStore.getState().setViewMode(paneId, 'column');
    }

    useStore.getState().setRevealTarget({
      paneId,
      filePath,
      fileDir: parentDir,
      isDirectory,
      triggerPreview: !isDirectory,
    });

    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.min(selectedIdx + 1, files.length - 1);
      setSelectedIdx(newIdx);
      setSelectedItem(files[newIdx]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.max(selectedIdx - 1, 0);
      setSelectedIdx(newIdx);
      setSelectedItem(files[newIdx]);
    }
    if (e.key === 'Enter' && files[selectedIdx]) {
      e.preventDefault();
      revealInColumns(files[selectedIdx]);
    }
  };

  return (
    <Overlay onKeyDown={e => { e.stopPropagation(); handleKeyDown(e); }} onKeyUp={e => e.stopPropagation()} onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()}>
        <Header>
          <Title>
            <TagChip color={tagColor}>
              <TagDot color={tagColor} />
              {filterTag}
            </TagChip>
            <span style={{ marginLeft: 8, fontWeight: 400, color: theme.text.secondary, fontSize: 13 }}>
              {files.length} item{files.length !== 1 ? 's' : ''}
            </span>
          </Title>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </Header>

        <Body ref={bodyRef}>
          <ResultsPane>
            {loading ? (
              <EmptyState>Loading files...</EmptyState>
            ) : files.length === 0 ? (
              <EmptyState>No files with tag "{filterTag}"</EmptyState>
            ) : (
              <ResultList>
                {files.map((file, i) => (
                  <ResultItem
                    key={file.path}
                    className={i === selectedIdx ? 'selected' : ''}
                    onClick={() => { setSelectedIdx(i); setSelectedItem(file); }}
                    onDoubleClick={() => revealInColumns(file.path)}
                  >
                    <FileIcon>{getFileIcon(file)}</FileIcon>
                    <FileInfo>
                      <FileName>{file.name}</FileName>
                      <FilePath>{file.path}</FilePath>
                    </FileInfo>
                    <FileMeta>
                      <div>{file.isDirectory ? 'folder' : (file.extension || '—')}</div>
                      <div>{file.isDirectory ? '—' : formatSize(file.size || 0)}</div>
                      <div>{formatDate(file.modified) || '—'}</div>
                    </FileMeta>
                  </ResultItem>
                ))}
              </ResultList>
            )}
            <StatusBar>
              <span>{files.length} tagged items</span>
              <span style={{ color: theme.text.tertiary, fontSize: '0.6rem' }}>Double-click to reveal · Enter to reveal selected</span>
            </StatusBar>
          </ResultsPane>

          <ResizeDivider onMouseDown={() => setIsResizing(true)} />

          <ModalPreviewPane
            file={selectedItem}
            width={`${previewWidth}px`}
            actions={[
              { key: 'reveal', label: '📂 Reveal' },
            ]}
            onActionClick={(actionKey, file) => {
              if (actionKey === 'reveal') revealInColumns(file.path);
            }}
          />
        </Body>
      </ModalBox>
    </Overlay>
  );
}
