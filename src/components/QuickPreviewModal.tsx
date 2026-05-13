import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { formatSize, formatDate, PREVIEW_TYPES } from '../store';

import CustomVideo from './CustomVideo';
import CustomAudio, { type MediaHandle } from './CustomAudio';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FileIcon as FileIconComponent } from './FileIcons';
import type { FileItem } from '../types';

const isTextContent = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  const sample = content.slice(0, 512);
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) return false;
  }
  return true;
};

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const getVideoMime = (filePath: string): string => {
  const ext = (filePath || '').split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo' };
  return map[ext] || 'video/mp4';
};

const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;
const slideUp = keyframes`from{opacity:0;transform:translateY(24px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}`;

const Overlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.72);
  backdrop-filter: blur(4px); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  animation: ${fadeIn} 0.15s ease;
`;
const Modal = styled.div`
  background: ${p => p.theme.bg.secondary}; border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.xl}; box-shadow: ${p => p.theme.shadow.lg};
  width: 90vw; height: 90vh; min-width: 600px; min-height: 400px; max-width: 1800px; max-height: 1200px;
  display: flex; flex-direction: column; overflow: hidden;
  animation: ${slideUp} 0.18s cubic-bezier(0.22, 1, 0.36, 1);
`;
const ModalHeader = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 14px 18px 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle}; flex-shrink: 0;
`;
const FileIconLarge = styled.span`font-size: 28px; flex-shrink: 0;`;
const HeaderInfo = styled.div`flex: 1; min-width: 0;`;
const FileName = styled.div`font-size: 14px; font-weight: 600; color: ${p => p.theme.text.primary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const FileMeta = styled.div`display: flex; gap: 16px; margin-top: 4px; flex-wrap: wrap;`;
const MetaChip = styled.span`font-size: 10px; color: ${p => p.theme.text.tertiary}; font-family: ${p => p.theme.font.mono}; display: flex; align-items: center; gap: 3px;`;
const MetaLabel = styled.span`color: ${p => p.theme.text.tertiary}; text-transform: uppercase; letter-spacing: 0.04em; font-size: 9px;`;
const CloseBtn = styled.button`
  background: ${p => p.theme.bg.elevated}; border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary}; width: 28px; height: 28px; border-radius: 50%;
  cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;
const ContentArea = styled.div`
  flex: 1; overflow: auto; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px; min-height: 0;
`;
const ImageEl = styled.img`max-width: 100%; max-height: 100%; object-fit: contain; display: block;`;
const UnsupportedState = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 20px; color: ${p => p.theme.text.tertiary}; font-size: 13px;
`;
const BigIcon = styled.div`font-size: 56px;`;
const PdfContainer = styled.div`
  width: 100%; height: 100%; overflow: auto;
  display: flex; flex-direction: column; align-items: center;
  background: ${p => p.theme.bg.elevated}; padding: 16px; gap: 12px;
  .react-pdf__Document { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .react-pdf__Page { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; background: white; }
  canvas { max-width: 100%; height: auto !important; }
`;
const PdfControls = styled.div`
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: ${p => p.theme.bg.secondary}; border-radius: ${p => p.theme.radius.md};
  position: sticky; top: 0; z-index: 10; margin-bottom: 8px;
`;
const PdfBtn = styled.button`
  background: ${p => p.theme.bg.elevated}; border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary}; padding: 4px 10px; border-radius: ${p => p.theme.radius.sm};
  font-size: 11px; cursor: pointer;
  &:hover { background: ${p => p.theme.bg.hover}; } &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
const PdfPageInfo = styled.span`font-size: 11px; color: ${p => p.theme.text.secondary}; font-family: ${p => p.theme.font.mono};`;
const AudioWrapper = styled.div`width: 100%; max-width: 600px; align-self: center;`;
const VideoWrapper = styled.div`
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  > div { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
`;
const TextWrapper = styled.div`
  width: 100%; max-width: 900px; max-height: 100%; overflow: auto;
  background: ${p => p.theme.bg.elevated}; border-radius: ${p => p.theme.radius.md}; padding: 16px;
`;
const TextContentEl = styled.pre`
  font-family: ${p => p.theme.font.mono}; font-size: 12px; line-height: 1.6;
  color: ${p => p.theme.text.primary}; white-space: pre-wrap; word-break: break-all; margin: 0;
`;

interface QuickPreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
}

type ReadFileAPI = { readFile: (p: string, enc?: string) => Promise<{ success: boolean; content: string }> };

export default function QuickPreviewModal({ file, onClose }: QuickPreviewModalProps) {
  const mediaRef = useRef<MediaHandle>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [isText, setIsText] = useState(false);

  const ext = file?.extension || '';
  const isImage = PREVIEW_TYPES.imageExts.includes(ext as typeof PREVIEW_TYPES.imageExts[number]);
  const isVideo = PREVIEW_TYPES.videoExts.includes(ext as typeof PREVIEW_TYPES.videoExts[number]);
  const isAudio = PREVIEW_TYPES.audioExts.includes(ext as typeof PREVIEW_TYPES.audioExts[number]);
  const isPdf = ext === 'pdf';

  useEffect(() => {
    if (!isPdf || !file?.path) return;
    setPdfData(null); setPdfError(null);
    (window.electronAPI as unknown as ReadFileAPI)
      .readFile(file.path, 'binary')
      .then(result => {
        if (result.success && result.content) {
          const bytes = new Uint8Array(result.content.length);
          for (let i = 0; i < result.content.length; i++) bytes[i] = result.content.charCodeAt(i);
          setPdfData(bytes);
        } else { setPdfError('Failed to load PDF file'); }
      })
      .catch(() => setPdfError('Failed to read PDF file'));
  }, [isPdf, file?.path]);

  useEffect(() => {
    if (!file?.path || isImage || isVideo || isAudio || isPdf) { setTextContent(''); setIsText(false); return; }
    if (file.size > 2 * 1024 * 1024) { setTextContent('File too large for preview'); setIsText(false); return; }
    setLoadingText(true); setTextContent(''); setIsText(false);
    (window.electronAPI as unknown as ReadFileAPI).readFile(file.path)
      .then(result => {
        if (result.success && isTextContent(result.content)) {
          setTextContent(result.content.slice(0, 8000) + (result.content.length > 8000 ? '\n\n... (truncated)' : ''));
          setIsText(true);
        } else { setTextContent(result.success ? 'Preview not available for this file type' : 'Failed to load preview'); }
        setLoadingText(false);
      })
      .catch(() => { setTextContent('Failed to load preview'); setLoadingText(false); });
  }, [file?.path, isImage, isVideo, isAudio, isPdf, file?.size]);

  const handleClose = useCallback(() => {
    mediaRef.current?.stop?.();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); handleClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handleClose]);

  if (!file) return null;

  const modal = (
    <Overlay onClick={handleClose}>
      <Modal onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <FileIconLarge>
            {file.isDirectory
              ? (file.name?.endsWith('.app') ? <FileIconComponent ext="app" size={48} /> : '📁')
              : <FileIconComponent ext={file.extension || ''} size={48} />}
          </FileIconLarge>
          <HeaderInfo>
            <FileName title={file.name}>{file.name}</FileName>
            <FileMeta>
              {file.size != null && <MetaChip><MetaLabel>Size</MetaLabel> {formatSize(file.size)}</MetaChip>}
              {file.modified && <MetaChip><MetaLabel>Modified</MetaLabel> {formatDate(file.modified)}</MetaChip>}
              {ext && <MetaChip><MetaLabel>Kind</MetaLabel> {ext.toUpperCase()}</MetaChip>}
              {file.path && (
                <MetaChip style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <MetaLabel>Path</MetaLabel> {file.path}
                </MetaChip>
              )}
            </FileMeta>
          </HeaderInfo>
          <CloseBtn onClick={handleClose} title="Close (Esc)">✕</CloseBtn>
        </ModalHeader>

        <ContentArea>
          {isImage && <ImageEl src={`file://${file.path}`} alt={file.name} />}

          {isVideo && (
            <VideoWrapper>
              <CustomVideo ref={mediaRef} src={`file://${file.path}`} type={getVideoMime(file.path)} autoPlay />
            </VideoWrapper>
          )}

          {isAudio && (
            <AudioWrapper>
              <CustomAudio ref={mediaRef} src={`file://${file.path}`} autoPlay />
            </AudioWrapper>
          )}

          {isPdf && (
            <PdfContainer>
              {pdfError ? (
                <div style={{ padding: '40px', color: '#ff4d4f', textAlign: 'center' }}>{pdfError}</div>
              ) : (
                <>
                  <PdfControls>
                    <PdfBtn onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>← Prev</PdfBtn>
                    <PdfPageInfo>Page {pageNumber} {numPages ? `/ ${numPages}` : ''}</PdfPageInfo>
                    <PdfBtn onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))} disabled={pageNumber >= (numPages || 1)}>Next →</PdfBtn>
                  </PdfControls>
                  {pdfData ? (
                    <Document
                      file={{ data: pdfData }}
                      onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPageNumber(1); setPdfError(null); }}
                      onLoadError={() => setPdfError('Failed to load PDF')}
                      loading={<div style={{ padding: '40px', color: '#4A9EFF' }}>Loading PDF...</div>}
                    >
                      <Page pageNumber={pageNumber} width={Math.min(900, window.innerWidth * 0.75)} />
                    </Document>
                  ) : (
                    <div style={{ padding: '40px', color: '#4A9EFF' }}>Loading PDF...</div>
                  )}
                </>
              )}
            </PdfContainer>
          )}

          {!isImage && !isVideo && !isAudio && !isPdf && loadingText && (
            <div style={{ padding: '40px', color: '#4A9EFF', textAlign: 'center' }}>Loading...</div>
          )}

          {isText && !loadingText && (
            <TextWrapper>
              <TextContentEl>{textContent}</TextContentEl>
            </TextWrapper>
          )}

          {!isImage && !isVideo && !isAudio && !isPdf && !isText && !loadingText && (
            <UnsupportedState>
              <BigIcon>
                {file.isDirectory
                  ? (file.name?.endsWith('.app') ? <FileIconComponent ext="app" size={64} /> : '📁')
                  : <FileIconComponent ext={file.extension || ''} size={64} />}
              </BigIcon>
              <span>No quick preview available for this file type</span>
            </UnsupportedState>
          )}
        </ContentArea>
      </Modal>
    </Overlay>
  );

  return ReactDOM.createPortal(modal, document.body);
}
