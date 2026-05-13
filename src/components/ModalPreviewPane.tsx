import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { formatSize, formatDate, isPreviewable, useStore } from '../store';
import CustomVideo from './CustomVideo';
import CustomAudio from './CustomAudio';
import { FileIcon as FileIconComponent } from './FileIcons';
import type { FileItem } from '../types';

interface ModalAction {
  key: string;
  label: string;
}

interface ModalPreviewPaneProps {
  file: FileItem | null;
  width?: string;
  actions?: ModalAction[];
  onActionClick?: (key: string, file: FileItem) => void;
}

const getVideoMime = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo' };
  return map[ext] || 'video/mp4';
};

const PreviewPane = styled.div<{ width?: string }>`
  width: ${p => p.width || '320px'};
  display: flex; flex-direction: column;
  background: ${p => p.theme.bg.elevated};
  border-left: 1px solid ${p => p.theme.border.normal};
  position: relative; height: 100%; flex-shrink: 0;
`;
const PreviewWrapper = styled.div`overflow-y: auto;`;
const PreviewHeader = styled.div`padding: 16px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid ${p => p.theme.border.subtle};`;
const PreviewTitle = styled.div`font-size: 0.875rem; font-weight: 600; color: ${p => p.theme.text.primary}; margin-bottom: 8px; word-break: break-all;`;
const PreviewDetail = styled.div`
  font-size: 0.6875rem; margin-bottom: 4px; display: flex; gap: 6px;
  strong { color: ${p => p.theme.text.secondary}; }
  span { font-family: ${p => p.theme.font.mono}; }
`;
const PreviewContent = styled.div`flex: 1; display: flex; flex-direction: column; border-top: 1px solid ${p => p.theme.border.normal};`;
const PreviewLabel = styled.div`
  font-size: 0.75rem; font-weight: 600; color: ${p => p.theme.text.secondary}; padding: 16px;
  span { display: inline-block; border: 1px solid ${p => p.theme.border.normal}; padding: 2px 5px; }
`;
const PreviewMedia = styled.div`img, video { width: 100%; } audio { width: 100%; }`;
const ActionBar = styled.div`
  display: flex; gap: 6px; padding: 10px 16px; border-top: 1px solid ${p => p.theme.border.subtle};
`;
const ActionButton = styled.button<{ danger?: boolean }>`
  padding: 5px 12px; font-size: 11px; border-radius: ${p => p.theme.radius.sm}; cursor: pointer;
  background: ${p => p.danger ? '#c0392b20' : p.theme.bg.hover};
  border: 1px solid ${p => p.danger ? '#c0392b40' : p.theme.border.normal};
  color: ${p => p.danger ? '#e74c3c' : p.theme.text.primary};
  &:hover { opacity: 0.8; }
`;
const EmptyPreview = styled.div`
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: ${p => p.theme.text.tertiary}; font-size: 0.75rem;
`;
const TextContent = styled.pre`
  font-family: ${p => p.theme.font.mono}; font-size: 10px; line-height: 1.5;
  color: ${p => p.theme.text.primary}; padding: 10px 16px; white-space: pre-wrap; word-break: break-all;
  overflow-y: auto; flex: 1; background: ${p => p.theme.bg.primary};
`;

const LoadingLabel = styled.span`
  color: #5a5a6b;
  font-size: 11px;
`;

const NoPreviewLabel = styled.div`
  font-size: 11px;
  color: #5a5a6b;
  margin-top: 8px;
`;

const isTextContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  if (content.includes('\0')) return false;
  const sample = content.slice(0, 4096);
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code < 9 || (code > 13 && code < 32) || code === 127) nonPrintable++;
  }
  return nonPrintable / sample.length < 0.01;
};

export default function ModalPreviewPane({ file, width, actions = [], onActionClick }: ModalPreviewPaneProps) {
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [isText, setIsText] = useState(false);

  useEffect(() => {
    setTextContent('');
    setIsText(false);
    if (!file || file.isDirectory) return;
    const ext = file.extension?.toLowerCase() || '';
    const isImgExt = ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext);
    const isVidExt = ['mp4','mov','mkv','webm','avi'].includes(ext);
    const isAudExt = ['mp3','wav','ogg','flac','aac','m4a'].includes(ext);
    const isPdf = ext === 'pdf';
    if (!isImgExt && !isVidExt && !isAudExt && !isPdf && file.size < 2 * 1024 * 1024) {
      setLoadingText(true);
      (window.electronAPI as unknown as { readFile: (p: string) => Promise<{ success: boolean; content: string }> })
        .readFile(file.path).then(r => {
          if (r.success && isTextContent(r.content)) {
            setTextContent(r.content.slice(0, 4000));
            setIsText(true);
          }
          setLoadingText(false);
        });
    }
  }, [file?.path]);

  if (!file) return <PreviewPane width={width}><EmptyPreview>Select a file to preview</EmptyPreview></PreviewPane>;

  const ext = file.extension?.toLowerCase() || '';
  const isImage = ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext);
  const isVideo = ['mp4','mov','mkv','webm','avi'].includes(ext);
  const isAudio = ['mp3','wav','ogg','flac','aac','m4a'].includes(ext);

  return (
    <PreviewPane width={width}>
      <PreviewWrapper>
        <PreviewHeader>
          <PreviewTitle>{file.name}</PreviewTitle>
          {!file.isDirectory && <PreviewDetail><strong>Size</strong><span>{formatSize(file.size)}</span></PreviewDetail>}
          {file.modified && <PreviewDetail><strong>Modified</strong><span>{formatDate(file.modified)}</span></PreviewDetail>}
          {file.extension && <PreviewDetail><strong>Kind</strong><span>{file.extension.toUpperCase()}</span></PreviewDetail>}
        </PreviewHeader>
      </PreviewWrapper>

      <PreviewContent>
        {isImage && (
          <PreviewMedia>
            <img src={`file://${file.path}`} alt={file.name} />
          </PreviewMedia>
        )}
        {isVideo && (
          <PreviewMedia>
            <CustomVideo src={`file://${file.path}`} maxHeight="200px" />
          </PreviewMedia>
        )}
        {isAudio && (
          <PreviewMedia>
            <CustomAudio src={`file://${file.path}`} />
          </PreviewMedia>
        )}
        {loadingText && (
          <PreviewLabel><LoadingLabel>Loading...</LoadingLabel></PreviewLabel>
        )}
        {!loadingText && !isImage && !isVideo && !isAudio && isText && (
          <TextContent>{textContent}</TextContent>
        )}
        {!loadingText && !isImage && !isVideo && !isAudio && !isText && (
          <PreviewLabel>
            <FileIconComponent ext={file.extension || ''} size={48} />
            <NoPreviewLabel>Preview not available</NoPreviewLabel>
          </PreviewLabel>
        )}
      </PreviewContent>

      {actions.length > 0 && file && (
        <ActionBar>
          {actions.map(action => (
            <ActionButton
              key={action.key}
              danger={action.key === 'delete'}
              onClick={() => onActionClick?.(action.key, file)}
            >
              {action.label}
            </ActionButton>
          ))}
        </ActionBar>
      )}
    </PreviewPane>
  );
}
