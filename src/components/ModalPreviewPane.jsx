import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { formatSize, formatDate, getFileIcon, PREVIEW_TYPES, getPreviewType } from '../store';

const PreviewPane = styled.div`
  width: ${p => p.width || '320px'};
  display: flex;
  flex-direction: column;
  background: ${p => p.theme.bg.elevated};
  border-left: 1px solid ${p => p.theme.border.normal};
  position: relative;
  height: 100%;
  flex-shrink: 0;
`;

const PreviewWrapper = styled.div`
  overflow-y: auto;
`;

const PreviewHeader = styled.div`
  padding: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;

const PreviewTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  margin-bottom: 8px;
  word-break: break-all;
`;

const PreviewDetail = styled.div`
  font-size: 0.6875rem;
  margin-bottom: 4px;
  display: flex;
  gap: 6px;
  strong { color: ${p => p.theme.text.secondary}; }
  span { font-family: ${p => p.theme.font.mono}; }
`;

const PreviewContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${p => p.theme.border.normal};
`;

const PreviewLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  padding: 16px;

  span {
    display: inline-block;
    border: 1px solid ${p => p.theme.border.normal};
    padding: 2px 5px;
  }
`;

const PreviewMedia = styled.div`
  img, video {
    width: 100%;
  }
  audio {
    width: 100%;
  }
`;

const PreviewText = styled.pre`
  font-size: 0.625rem;
  color: ${p => p.theme.text.primary};
  border-bottom: 1px solid ${p => p.theme.border.normal};
  padding: 16px 16px 30px;
  overflow: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
`;

const PreviewActions = styled.div`
  padding-top: 12px;
  border-top: 1px solid ${p => p.theme.border.normal};
  display: flex;
  gap: 8px;
  padding: 8px;
  position: absolute;
  width: 100%;
  bottom: 0;
  left: 0;
  background: ${p => p.theme.bg.elevated};
`;

const ActionBtn = styled.button`
  background: ${p => p.theme.bg.secondary};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 6px 12px;
  font-size: 0.6875rem;
  cursor: pointer;
  &:hover {
    background: ${p => p.theme.bg.hover};
    border-color: ${p => p.theme.border.strong};
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${p => p.theme.text.tertiary};
  font-size: 0.75rem;
`;

export default function ModalPreviewPane({
  file,
  width = '320px',
  actions = [],
  onActionClick
}) {
  const [previewContent, setPreviewContent] = useState('');
  const [previewType, setPreviewType] = useState('text');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (file) {
      loadPreview(file);
    } else {
      setPreviewContent('');
      setPreviewType('text');
    }
  }, [file]);

  const loadPreview = async (file) => {
    const type = getPreviewType(file);

    if (type === 'directory') {
      setPreviewContent('');
      setPreviewType('text');
      return;
    }

    if (type === 'video') {
      setPreviewType('video');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (type === 'audio') {
      setPreviewType('audio');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (type === 'image') {
      setPreviewType('image');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (type === 'unknown') {
      setPreviewContent('Preview not available for this file type');
      setPreviewType('text');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPreviewContent('File too large for preview');
      setPreviewType('text');
      return;
    }

    setLoadingPreview(true);
    setPreviewType('text');
    try {
      const r = await window.electronAPI.readFile(file.path);
      if (r.success) {
        setPreviewContent(r.content.slice(0, 1000) + (r.content.length > 1000 ? '\n\n... (truncated)' : ''));
      } else {
        setPreviewContent('Failed to load preview');
      }
    } catch (err) {
      setPreviewContent('Failed to load preview');
    }
    setLoadingPreview(false);
  };

  return (
    <PreviewPane width={width}>
      {file ? (
        <PreviewWrapper>
          <PreviewHeader>
            <PreviewTitle>
              {file.isDirectory ? '📁' : getFileIcon(file)} {file.name}
            </PreviewTitle>
            <PreviewDetail>
              <strong>Path:</strong>
              <span style={{ wordBreak: 'break-all' }}>{file.path}</span>
            </PreviewDetail>
            <PreviewDetail>
              <strong>Size:</strong>
              <span>{formatSize(file.size)}</span>
            </PreviewDetail>
            <PreviewDetail>
              <strong>Modified:</strong>
              <span>{formatDate(file.modified)}</span>
            </PreviewDetail>
            {file.extension && (
              <PreviewDetail>
                <strong>Type:</strong>
                <span>{file.extension.toUpperCase()}</span>
              </PreviewDetail>
            )}
          </PreviewHeader>

          <PreviewContent>
            <PreviewLabel><span>Preview</span></PreviewLabel>
            {loadingPreview ? (
              <div style={{ color: '#4A9EFF', fontSize: '0.6875rem', padding: '16px' }}>Loading preview...</div>
            ) : (
              <PreviewMedia>
                {previewType === 'video' && (
                  <video src={previewContent} controls style={{ maxWidth: '100%' }} />
                )}
                {previewType === 'audio' && (
                  <audio src={previewContent} controls style={{ width: '100%' }} />
                )}
                {previewType === 'image' && (
                  <img src={previewContent} alt={file.name} style={{ maxWidth: '100%', objectFit: 'contain' }} />
                )}
                {previewType === 'text' && (
                  <PreviewText>{previewContent || 'No preview available'}</PreviewText>
                )}
              </PreviewMedia>
            )}
          </PreviewContent>

          {actions.length > 0 && (
            <PreviewActions>
              {actions.map((action, index) => (
                <ActionBtn
                  key={index}
                  onClick={() => onActionClick && onActionClick(action.key, file)}
                >
                  {action.label}
                </ActionBtn>
              ))}
            </PreviewActions>
          )}
        </PreviewWrapper>
      ) : (
        <EmptyState>
          Click a file to view details and preview
        </EmptyState>
      )}
    </PreviewPane>
  );
}
