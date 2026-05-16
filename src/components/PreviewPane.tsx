import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, PREVIEW_TYPES } from '../store/index';
import CustomVideo from './CustomVideo';
import CustomAudio from './CustomAudio';
import type { MediaHandle } from './CustomAudio';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const Pane = styled.div<{ width: number }>`
  width: ${p => p.width}px;
  min-width: 200px;
  max-width: 800px;
  background: ${p => p.theme.bg.secondary};
  border-left: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
`;

const ResizeHandle = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;
  &:hover, &.dragging {
    background: ${p => p.theme.accent.blue}40;
    border-left: 2px solid ${p => p.theme.accent.blue};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 14px;
  &:hover { color: ${p => p.theme.text.primary}; }
`;

const PreviewArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
`;

const ImagePreview = styled.img`
  width: 100%;
  object-fit: contain;
  background: ${p => p.theme.bg.primary};
  max-width: 600px;
`;

const TextPreviewWrap = styled.div`
  flex: 1;
  width: 100%;
  overflow: auto;
  position: relative;
`;

const TextContent = styled.pre`
  font-family: ${p => p.theme.font.mono};
  font-size: 10px;
  line-height: 1.5;
  color: ${p => p.theme.text.primary};
  padding: 10px 12px;
  white-space: pre-wrap;
  word-break: break-all;
  background: ${p => p.theme.bg.primary};
  min-height: 100%;
`;

const EditActions = styled.div`
  display: flex;
  gap: 6px;
  padding: 6px 12px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const ActionBtn = styled.button<{ primary?: boolean }>`
  flex: 1;
  padding: 5px;
  background: ${p => p.primary ? p.theme.accent.blue : p.theme.bg.elevated};
  border: 1px solid ${p => p.primary ? p.theme.accent.blue : p.theme.border.normal};
  color: ${p => p.primary ? '#fff' : p.theme.text.primary};
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  font-size: 11px;
  &:hover { opacity: 0.85; }
`;

const MetaSection = styled.div`
  width: 100%;
  padding: 10px 12px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 10px;
`;

const MetaKey = styled.span`
  color: ${p => p.theme.text.tertiary};
`;

const MetaVal = styled.span`
  color: ${p => p.theme.text.secondary};
  font-family: ${p => p.theme.font.mono};
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const IconPreview = styled.div`
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  background: ${p => p.theme.bg.primary};
`;

const FileName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  word-break: break-all;
  text-align: center;
`;

const PdfWrapper = styled.div`
  width: 100%;
  overflow: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${p => p.theme.bg.primary};
  padding: 12px;
  gap: 8px;

  .react-pdf__Document { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .react-pdf__Page { box-shadow: 0 1px 4px rgba(0,0,0,0.1); background: white; }
  canvas { max-width: 100%; height: auto !important; }
`;

const PdfNav = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  background: ${p => p.theme.bg.secondary};
  border-radius: ${p => p.theme.radius.sm};
  position: sticky;
  top: 0;
  z-index: 5;
`;

const PdfNavBtn = styled.button`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary};
  padding: 2px 8px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 10px;
  cursor: pointer;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const PdfInfo = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
`;

const EmptyPreview = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a5a6b;
  font-size: 12px;
`;

const VideoWrap = styled.div`
  width: 100%;
  padding: 0;
`;

const AudioWrap = styled.div`
  padding: 12px;
  width: 100%;
`;

const PdfLoading = styled.div`
  padding: 20px;
  color: #4A9EFF;
  font-size: 10px;
`;

const EditTextarea = styled.textarea`
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: #111;
  color: #e8e8ed;
  border: none;
  outline: none;
  resize: none;
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 10px;
  line-height: 1.6;
  padding: 10px 12px;
`;

const LoadingPreview = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a5a6b;
  font-size: 11px;
`;

const NoPreviewLabel = styled.div`
  font-size: 11px;
  color: #5a5a6b;
  padding: 4px 12px;
  text-align: center;
`;

function isTextContent(content: string): boolean {
  if (!content) return false;
  const sample = content.slice(0, 512);
  const nonPrintable = sample.split('').filter(c => {
    const code = c.charCodeAt(0);
    return code < 9 || (code > 13 && code < 32 && code !== 27);
  }).length;
  return nonPrintable / sample.length < 0.1;
}

export default function PreviewPane() {
  const { closePreview, previewWidth, setPreviewWidth, panes, activePane } = useStore();
  const mediaRef = useRef<MediaHandle>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);

  const activePaneState = panes.find(p => p.id === activePane);
  const previewFile = activePaneState?.tabs[activePaneState.activeTab]?.previewFile || null;

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = previewWidth;
    const currentZoom = useStore.getState().zoom;

    const onMove = (me: MouseEvent) => {
      const dx = (startX - me.clientX) / currentZoom;
      setPreviewWidth(startWidth + dx);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [previewWidth, setPreviewWidth]);

  const [textContent, setTextContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isText, setIsText] = useState(false);

  const ext = previewFile?.extension?.toLowerCase();
  const isImage = PREVIEW_TYPES.imageExts.includes(ext as typeof PREVIEW_TYPES.imageExts[number]);
  const isVideo = PREVIEW_TYPES.videoExts.includes(ext as typeof PREVIEW_TYPES.videoExts[number]);
  const isAudio = PREVIEW_TYPES.audioExts.includes(ext as typeof PREVIEW_TYPES.audioExts[number]);
  const isPdf = ext === 'pdf';

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.pause();
    }
    setTextContent('');
    setEditMode(false);
    setEditContent('');
    setIsText(false);
    setPdfNumPages(null);
    setPdfPage(1);
    setPdfData(null);

    if (previewFile && isPdf) {
      (window.electronAPI as unknown as { readBinaryFile: (p: string) => Promise<{ success: boolean; data: string }> })
        .readBinaryFile(previewFile.path)
        .then(result => {
          if (result.success && result.data) {
            const raw = atob(result.data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            setPdfData(bytes);
          }
        })
        .catch(err => console.error('PDF load error:', err));
    }

    if (previewFile && !isImage && !isVideo && !isAudio && !isPdf && previewFile.size < 2 * 1024 * 1024) {
      setLoading(true);
      (window.electronAPI as unknown as { readFile: (p: string, enc?: string) => Promise<{ success: boolean; content: string }> })
        .readFile(previewFile.path).then(r => {
          if (r.success && isTextContent(r.content)) {
            setTextContent(r.content);
            setEditContent(r.content);
            setIsText(true);
          }
          setLoading(false);
        });
    }

  }, [previewFile?.path, isImage, isVideo, isAudio, isPdf, previewFile?.size]);

  const saveEdits = async () => {
    if (!previewFile) return;
    const r = await window.electronAPI.writeFile(previewFile.path, editContent);
    if (r.success) {
      setTextContent(editContent);
      setEditMode(false);
    }
  };

  const getIconForFile = (): string => {
    const icons: Record<string, string> = {
      pdf: '📕', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
      zip: '📦', tar: '📦', gz: '📦',
    };
    return icons[previewFile?.extension ?? ''] || '📄';
  };

  if (!previewFile) {
    return (
      <Pane width={previewWidth}>
        <ResizeHandle onMouseDown={onResizeMouseDown} />
        <Header>
          <CloseBtn onClick={closePreview}>✕</CloseBtn>
        </Header>
        <EmptyPreview>
          Select a file to preview
        </EmptyPreview>
      </Pane>
    );
  }

  return (
    <Pane width={previewWidth}>
      <ResizeHandle onMouseDown={onResizeMouseDown} />
      <Header>
        <FileName>{previewFile.name}</FileName>
        <CloseBtn onClick={closePreview}>✕</CloseBtn>
      </Header>

      <PreviewArea>
        {isImage && (
          <ImagePreview src={`file://${previewFile.path}`} alt={previewFile.name} />
        )}
        {isVideo && (
          <VideoWrap>
            <CustomVideo
              ref={mediaRef}
              key={previewFile.path}
              src={`file://${previewFile.path}`}
              maxHeight="300px"
            />
          </VideoWrap>
        )}
        {isAudio && (
          <AudioWrap>
            <CustomAudio
              ref={mediaRef}
              key={previewFile.path}
              src={`file://${previewFile.path}`}
            />
          </AudioWrap>
        )}
        {isPdf && (
          <PdfWrapper>
            <PdfNav>
              <PdfNavBtn onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1}>←</PdfNavBtn>
              <PdfInfo>Page {pdfPage} {pdfNumPages ? `/ ${pdfNumPages}` : ''}</PdfInfo>
              <PdfNavBtn onClick={() => setPdfPage(p => Math.min(pdfNumPages ?? p, p + 1))} disabled={pdfPage >= (pdfNumPages ?? 1)}>→</PdfNavBtn>
            </PdfNav>
            {pdfData ? (
              <Document
                file={{ data: pdfData }}
                onLoadSuccess={({ numPages }) => { setPdfNumPages(numPages); setPdfPage(1); }}
                onLoadError={(err) => console.error('PDF render error:', err)}
                loading={<PdfLoading>Loading...</PdfLoading>}
              >
                <Page pageNumber={pdfPage} width={Math.min(280, previewWidth - 40)} />
              </Document>
            ) : (
              <PdfLoading>Loading PDF...</PdfLoading>
            )}
          </PdfWrapper>
        )}
        {isText && (
          <TextPreviewWrap>
            {editMode ? (
              <EditTextarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
            ) : (
              <TextContent>
                {textContent.slice(0, 8000) + (textContent.length > 8000 ? '\n\n... (truncated)' : '')}
              </TextContent>
            )}
          </TextPreviewWrap>
        )}
        {loading && !isImage && !isVideo && !isAudio && !isPdf && (
          <LoadingPreview>Loading...</LoadingPreview>
        )}
        {!loading && !isImage && !isText && !isVideo && !isAudio && !isPdf && (
          <>
            <IconPreview>{getIconForFile()}</IconPreview>
            <NoPreviewLabel>Preview not available</NoPreviewLabel>
          </>
        )}
      </PreviewArea>

      {isText && (
        <EditActions>
          {editMode ? (
            <>
              <ActionBtn onClick={() => { setEditMode(false); setEditContent(textContent); }}>Cancel</ActionBtn>
              <ActionBtn primary onClick={saveEdits}>Save</ActionBtn>
            </>
          ) : (
            <ActionBtn onClick={() => setEditMode(true)}>✏️ Edit</ActionBtn>
          )}
        </EditActions>
      )}

      <MetaSection>
        <MetaRow><MetaKey>Size</MetaKey><MetaVal>{formatSize(previewFile.size)}</MetaVal></MetaRow>
        <MetaRow><MetaKey>Modified</MetaKey><MetaVal>{formatDate(previewFile.modified)}</MetaVal></MetaRow>
        <MetaRow><MetaKey>Created</MetaKey><MetaVal>{formatDate((previewFile as unknown as Record<string, string>).created)}</MetaVal></MetaRow>
        {previewFile.extension && <MetaRow><MetaKey>Kind</MetaKey><MetaVal>{previewFile.extension.toUpperCase()}</MetaVal></MetaRow>}
        {previewFile.permissions && <MetaRow><MetaKey>Permissions</MetaKey><MetaVal>{typeof previewFile.permissions === 'object' ? (previewFile.permissions as Record<string, unknown>).octal as string : String(previewFile.permissions)}</MetaVal></MetaRow>}
      </MetaSection>
    </Pane>
  );
}
