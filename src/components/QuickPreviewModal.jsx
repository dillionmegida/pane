import React, { useEffect, useRef, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { formatSize, formatDate, PREVIEW_TYPES, isTextContent } from '../store';
import CustomVideo from './CustomVideo';
import CustomAudio from './CustomAudio';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { FileIcon as FileIconComponent } from './FileIcons';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const getVideoMime = (filePath) => {
  const ext = (filePath || '').split('.').pop().toLowerCase();
  const map = { mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska', webm: 'video/webm', avi: 'video/x-msvideo' };
  return map[ext] || 'video/mp4';
};

// ── Animations ────────────────────────────────────────────────────────────────
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`;
const slideUp = keyframes`from{opacity:0;transform:translateY(24px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}`;

// ── Styled ────────────────────────────────────────────────────────────────────
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.15s ease;
`;

const Modal = styled.div`
  background: ${p => p.theme.bg.secondary};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  width: 90vw;
  height: 90vh;
  min-width: 600px;
  min-height: 400px;
  max-width: 1800px;
  max-height: 1200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.18s cubic-bezier(0.22, 1, 0.36, 1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const FileIconLarge = styled.span`
  font-size: 28px;
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FileMeta = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 4px;
  flex-wrap: wrap;
`;

const MetaChip = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  display: flex;
  align-items: center;
  gap: 3px;
`;

const MetaLabel = styled.span`
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 9px;
`;

const CloseBtn = styled.button`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary};
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.1s;
  &:hover {
    background: ${p => p.theme.bg.hover};
    color: ${p => p.theme.text.primary};
    border-color: ${p => p.theme.border.strong};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 0;
`;

const ImageEl = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: ${p => p.theme.bg.secondary};
  display: block;
`;

const UnsupportedState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: ${p => p.theme.text.tertiary};
  font-size: 13px;
`;

const BigIcon = styled.div`
  font-size: 56px;
`;

const PdfContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${p => p.theme.bg.elevated};
  padding: 16px;
  gap: 12px;

  .react-pdf__Document {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .react-pdf__Page {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    background: white;
  }

  canvas {
    max-width: 100%;
    height: auto !important;
  }
`;

const PdfControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${p => p.theme.bg.secondary};
  border-radius: ${p => p.theme.radius.md};
  position: sticky;
  top: 0;
  z-index: 10;
  margin-bottom: 8px;
`;

const PdfBtn = styled.button`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary};
  padding: 4px 10px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 11px;
  cursor: pointer;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const PdfPageInfo = styled.span`
  font-size: 11px;
  color: ${p => p.theme.text.secondary};
  font-family: ${p => p.theme.font.mono};
`;

const AudioWrapper = styled.div`
  width: 100%;
  max-width: 600px;
  align-self: center;
`;

const VideoWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > div {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const TextWrapper = styled.div`
  width: 100%;
  max-width: 900px;
  max-height: 100%;
  overflow: auto;
  background: ${p => p.theme.bg.elevated};
  border-radius: ${p => p.theme.radius.md};
  padding: 16px;
`;

const TextContent = styled.pre`
  font-family: ${p => p.theme.font.mono};
  font-size: 12px;
  line-height: 1.6;
  color: ${p => p.theme.text.primary};
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuickPreviewModal({ file, onClose }) {
  const mediaRef = useRef(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  const ext = file?.extension || '';
  const isImage = PREVIEW_TYPES.imageExts.includes(ext);
  const isVideo = PREVIEW_TYPES.videoExts.includes(ext);
  const isAudio = PREVIEW_TYPES.audioExts.includes(ext);
  const isPdf = ext === 'pdf';
  const [isText, setIsText] = useState(false);

  // Load PDF as binary data
  useEffect(() => {
    if (!isPdf || !file?.path) return;
    setPdfData(null);
    setPdfError(null);

    window.electronAPI.readFile(file.path, 'binary')
      .then(result => {
        if (result.success && result.content) {
          // Convert binary string to Uint8Array
          const binaryStr = result.content;
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          setPdfData(bytes);
        } else {
          setPdfError('Failed to load PDF file');
        }
      })
      .catch(err => {
        console.error('PDF read error:', err);
        setPdfError('Failed to read PDF file');
      });
  }, [isPdf, file?.path]);

  // Load text content for non-media files
  useEffect(() => {
    if (!file?.path || isImage || isVideo || isAudio || isPdf) {
      setTextContent('');
      setIsText(false);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setTextContent('File too large for preview');
      setIsText(false);
      return;
    }

    setLoadingText(true);
    setTextContent('');
    setIsText(false);

    window.electronAPI.readFile(file.path)
      .then(result => {
        if (result.success && isTextContent(result.content)) {
          setTextContent(result.content.slice(0, 8000) + (result.content.length > 8000 ? '\n\n... (truncated)' : ''));
          setIsText(true);
        } else if (result.success) {
          setTextContent('Preview not available for this file type');
        } else {
          setTextContent('Failed to load preview');
        }
        setLoadingText(false);
      })
      .catch(err => {
        console.error('Text read error:', err);
        setTextContent('Failed to load preview');
        setLoadingText(false);
      });
  }, [file?.path, isImage, isVideo, isAudio, isPdf, file?.size]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF');
  };

  // Stop media and close on Esc
  const handleClose = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.stop?.();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handleClose]);

  if (!file) return null;

  const modal = (
    <Overlay onClick={handleClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <FileIconLarge>
            {file.isDirectory ? (
              file.name && file.name.endsWith('.app') ? (
                <FileIconComponent ext="app" size={48} />
              ) : (
                '📁'
              )
            ) : (
              <FileIconComponent ext={file.extension} size={48} />
            )}
          </FileIconLarge>
          <HeaderInfo>
            <FileName title={file.name}>{file.name}</FileName>
            <FileMeta>
              {file.size != null && (
                <MetaChip><MetaLabel>Size</MetaLabel> {formatSize(file.size)}</MetaChip>
              )}
              {file.modified && (
                <MetaChip><MetaLabel>Modified</MetaLabel> {formatDate(file.modified)}</MetaChip>
              )}
              {ext && (
                <MetaChip><MetaLabel>Kind</MetaLabel> {ext.toUpperCase()}</MetaChip>
              )}
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
          {isImage && (
            <ImageEl src={`file://${file.path}`} alt={file.name} />
          )}

          {isVideo && (
            <VideoWrapper>
              <CustomVideo
                ref={mediaRef}
                src={`file://${file.path}`}
                type={getVideoMime(file.path)}
                autoPlay
              />
            </VideoWrapper>
          )}

          {isAudio && (
            <AudioWrapper>
              <CustomAudio
                ref={mediaRef}
                src={`file://${file.path}`}
                autoPlay
              />
            </AudioWrapper>
          )}

          {isPdf && (
            <PdfContainer>
              {pdfError ? (
                <div style={{ padding: '40px', color: '#ff4d4f', textAlign: 'center' }}>
                  {pdfError}
                </div>
              ) : (
                <>
                  <PdfControls>
                    <PdfBtn onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>
                      ← Prev
                    </PdfBtn>
                    <PdfPageInfo>
                      Page {pageNumber} {numPages ? `/ ${numPages}` : ''}
                    </PdfPageInfo>
                    <PdfBtn onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))} disabled={pageNumber >= (numPages || 1)}>
                      Next →
                    </PdfBtn>
                  </PdfControls>
                  {pdfData ? (
                    <Document
                      file={{ data: pdfData }}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
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

          {isText && (
            <TextWrapper>
              {loadingText ? (
                <div style={{ padding: '40px', color: '#4A9EFF', textAlign: 'center' }}>Loading text...</div>
              ) : (
                <TextContent>{textContent}</TextContent>
              )}
            </TextWrapper>
          )}

          {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <UnsupportedState>
              <BigIcon>
                {file.isDirectory ? (
                  file.name && file.name.endsWith('.app') ? (
                    <FileIconComponent ext="app" size={64} />
                  ) : (
                    '📁'
                  )
                ) : (
                  <FileIconComponent ext={file.extension} size={64} />
                )}
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
