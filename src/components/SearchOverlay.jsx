import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, getFileIcon } from '../store';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 80px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
`;

const SearchBox = styled.div`
  width: 900px;
  max-width: 95vw;
  height: 600px;
  max-height: 85vh;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 16px;
  color: ${p => p.theme.text.primary};
  font-family: ${p => p.theme.font.sans};
  &::placeholder { color: ${p => p.theme.text.tertiary}; }
`;

const Options = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  align-items: center;
`;

const OptBtn = styled.button`
  background: ${p => p.active ? p.theme.accent.blue + '30' : 'none'};
  border: 1px solid ${p => p.active ? p.theme.accent.blue : p.theme.border.normal};
  color: ${p => p.active ? p.theme.accent.blue : p.theme.text.secondary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 3px 8px;
  font-size: 10px;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const OptBtnWrapper = ({ active, children, ...props }) => (
  <OptBtn {...props} className={active ? 'active' : ''}>{children}</OptBtn>
);

const MainContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  border-top: 1px solid ${p => p.theme.border.normal};
`;

const ResultsPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid ${p => p.theme.border.subtle};
`;

const Results = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const SearchingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(90deg, #ff6b35 0%, #f7931e 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.07s;
  border-left: 2px solid transparent;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &.selected {
    background: ${p => p.theme.accent.blue}15;
    border-left-color: ${p => p.theme.accent.blue};
  }
`;

const ResultIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultName = styled.div`
  font-size: 12px;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ResultPath = styled.div`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${p => p.theme.font.mono};
`;

const ResultMeta = styled.div`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  text-align: right;
  flex-shrink: 0;
`;

const PreviewPane = styled.div`
  width: 320px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: ${p => p.theme.bg.elevated};
  border-left: 1px solid ${p => p.theme.border.normal};
`;


const PreviewHeader = styled.div`
  padding: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
`;

const PreviewTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  margin-bottom: 8px;
  word-break: break-all;
`;

const PreviewDetail = styled.div`
  font-size: 11px;
  margin-bottom: 4px;
  display: flex;
  gap: 6px;
  strong { color: ${p => p.theme.text.secondary}; }
  span { font-family: ${p => p.theme.font.mono}; }
`;

const PreviewContent = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${p => p.theme.border.normal}; 
`;

const PreviewLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  padding: 16px;
  
  span {
    display: inline-block;
    border: 1px solid ${p => p.theme.border.normal};
    padding: 8px;
  }
`;

const PreviewMedia = styled.div`
  img, video {
    max-width: 100%;
    max-height: 200px;
  }
  audio {
    width: 100%;
  }
`;

const PreviewText = styled.pre`
  font-size: 10px;
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
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button`
  background: ${p => p.theme.bg.secondary};
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.primary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 6px 12px;
  font-size: 11px;
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
  font-size: 12px;
`;

const StatusBar = styled.div`
  padding: 8px 16px;
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  justify-content: space-between;
`;

export default function SearchOverlay() {
  const { panes, activePane, navigateTo, navigateToFile, toggleSearch, setViewMode, setSelection } = useStore();
  const pane = panes.find(p => p.id === activePane);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [contentSearch, setContentSearch] = useState(false);
  const [excludedDirs, setExcludedDirs] = useState(['node_modules', '.git', 'venv', '.venv', '__pycache__', '.pytest_cache']);
  const [showExcludeInput, setShowExcludeInput] = useState(false);
  const [excludeInput, setExcludeInput] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);

  // Preview state
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewType, setPreviewType] = useState('text');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const searchIdRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load preview when selected item changes
  useEffect(() => {
    if (selectedItem) {
      loadPreview(selectedItem);
    }
  }, [selectedItem]);

  const loadPreview = async (file) => {
    if (file.isDirectory) {
      setPreviewContent('');
      setPreviewType('text');
      return;
    }

    const textExts = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log'];
    const videoExts = ['mp4', 'mov', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

    if (videoExts.includes(file.extension)) {
      setPreviewType('video');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (audioExts.includes(file.extension)) {
      setPreviewType('audio');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (imageExts.includes(file.extension)) {
      setPreviewType('image');
      setPreviewContent(`file://${file.path}`);
      return;
    }

    if (!textExts.includes(file.extension)) {
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

  const cancelCurrentSearch = useCallback(() => {
    if (searchIdRef.current) {
      window.electronAPI.searchCancel();
      searchIdRef.current = null;
      setSearchCancelled(true);
      setTimeout(() => setSearchCancelled(false), 100);
    }
  }, []);

  // Handle streaming search progress
  useEffect(() => {
    const handleProgress = ({ result, total, searchId }) => {
      if (searchId === searchIdRef.current) {
        setResults(prev => {
          const newResults = [...prev, result];
          // Select first item if this is the first result and nothing is selected
          if (newResults.length === 1 && !selectedItem) {
            setSelectedIdx(0);
            setSelectedItem(result);
          }
          return newResults;
        });
      }
    };

    const handleComplete = ({ searchId }) => {
      if (searchId === searchIdRef.current) {
        setLoading(false);
        setSearchComplete(true);
        searchIdRef.current = null;
        // Select first item if search completed with results but nothing selected
        if (results.length > 0 && !selectedItem) {
          setSelectedIdx(0);
          setSelectedItem(results[0]);
        }
      }
    };

    window.electronAPI.onSearchProgress(handleProgress);
    window.electronAPI.onSearchComplete(handleComplete);

    return () => {
      window.electronAPI.offSearchProgress();
      window.electronAPI.offSearchComplete();
    };
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    cancelCurrentSearch();
    setSelectedItem(null);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setSearchComplete(false);
      return;
    }

    setLoading(true);
    setSearchComplete(false);
    setSelectedIdx(0);
    timerRef.current = setTimeout(() => doSearch(), 400);
    return () => {
      clearTimeout(timerRef.current);
      cancelCurrentSearch();
    };
  }, [query, useRegex, contentSearch, excludedDirs, cancelCurrentSearch]);

  const doSearch = async () => {
    if (!pane || !query.trim()) return;

    searchIdRef.current = Date.now();
    setResults([]);
    setSelectedIdx(0);

    await window.electronAPI.search({
      rootPath: pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path,
      query,
      options: { useRegex, contentSearch, maxResults: 300, excludeDirs: excludedDirs },
      searchId: searchIdRef.current,
    });
  };

  const getBreadcrumbDisplay = () => {
    const path = pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path;
    if (!path) return '/';
    if (path === '/') return '/';
    const parts = path.split('/').filter(Boolean);
    return parts.length > 0 ? parts.join(' › ') : '/';
  };

  const openResult = (file) => {
    // Always show preview, don't navigate to directory
    if (file.isDirectory) {
      // For directories, navigate to the directory and close search
      navigateTo(activePane, file.path);
    } else {
      // For files, show preview and close search
      navigateToFile(activePane, file.path);
    }
    toggleSearch();
  };

  const revealInColumns = async (filePath) => {
    // Split path into components
    const parts = filePath.split('/').filter(Boolean);
    const fileName = parts.pop(); // Remove filename, keep directories

    if (parts.length === 0) {
      await navigateTo(activePane, '/');
      // Select the file in root
      setSelection(activePane, [filePath]);
      toggleSearch();
      return;
    }

    const targetPath = '/' + parts.join('/');

    if (pane.viewMode !== 'column') {
      setViewMode(activePane, 'column');
    }

    await navigateTo(activePane, targetPath);
    // Select the file in the directory
    setSelection(activePane, [filePath]);
    toggleSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { toggleSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.min(selectedIdx + 1, results.length - 1);
      setSelectedIdx(newIdx);
      setSelectedItem(results[newIdx]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.max(selectedIdx - 1, 0);
      setSelectedIdx(newIdx);
      setSelectedItem(results[newIdx]);
    }
    if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      openResult(results[selectedIdx]);
    }
    if (e.key === 'r' && e.metaKey && results[selectedIdx]) {
      e.preventDefault();
      revealInColumns(results[selectedIdx].path);
    }
  };

  return (
    <Overlay onClick={toggleSearch}>
      <SearchBox onClick={e => e.stopPropagation()}>
        <InputWrap>
          <span style={{ fontSize: 16, color: '#5a5a6b' }}>🔍</span>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search in ${getBreadcrumbDisplay()}`}
          />
          {loading && <span style={{ fontSize: 12, color: '#4A9EFF' }}>{searchCancelled ? '⏹️' : '⏳'}</span>}
          <span style={{ fontSize: 12, color: '#5a5a6b', cursor: 'pointer' }} onClick={toggleSearch}>✕</span>
        </InputWrap>

        <Options>
          <OptBtnWrapper active={useRegex} onClick={() => setUseRegex(v => !v)}>Regex</OptBtnWrapper>
          <OptBtnWrapper active={contentSearch} onClick={() => setContentSearch(v => !v)}>Content Search</OptBtnWrapper>
          <OptBtnWrapper active={excludedDirs.length > 0} onClick={() => setShowExcludeInput(v => !v)}>
            Excluded ({excludedDirs.length})
          </OptBtnWrapper>
        </Options>

        {showExcludeInput && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #2e2e35', background: '#1a1a1e' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {excludedDirs.map(dir => (
                <span key={dir} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: '#2a2a2f', border: '1px solid #3a3a45',
                  borderRadius: 4, padding: '2px 6px', fontSize: 11,
                  color: '#9898a8'
                }}>
                  {dir}
                  <span style={{ cursor: 'pointer', color: '#5a5a6b' }} onClick={() => setExcludedDirs(d => d.filter(x => x !== dir))}>✕</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={excludeInput}
                onChange={e => setExcludeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && excludeInput.trim()) {
                    setExcludedDirs(d => [...d, excludeInput.trim()]);
                    setExcludeInput('');
                  }
                }}
                placeholder="Add directory to exclude..."
                style={{
                  flex: 1, background: '#2a2a2f', border: '1px solid #3a3a45',
                  borderRadius: 4, padding: '4px 8px', fontSize: 11,
                  color: '#e8e8ed', outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  if (excludeInput.trim()) {
                    setExcludedDirs(d => [...d, excludeInput.trim()]);
                    setExcludeInput('');
                  }
                }}
                style={{
                  background: '#3a3a45', border: 'none', borderRadius: 4,
                  padding: '4px 10px', fontSize: 11, color: '#e8e8ed',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Prominent searching indicator */}
        {loading && !searchComplete && (
          <SearchingIndicator>
            <span>⏳</span>
            <span>Searching...</span>
            <span>{results.length} found so far</span>
          </SearchingIndicator>
        )}

        <MainContent>
          <ResultsPane>
            <Results>
              {results.map((file, i) => (
                <ResultItem
                  key={file.path}
                  className={i === selectedIdx ? 'selected' : ''}
                  onClick={() => { setSelectedIdx(i); setSelectedItem(file); }}
                  onDoubleClick={() => openResult(file)}
                >
                  <ResultIcon>{getFileIcon(file)}</ResultIcon>
                  <ResultInfo>
                    <ResultName>{file.name}</ResultName>
                    <ResultPath>{file.path}</ResultPath>
                  </ResultInfo>
                  <ResultMeta>
                    <div>{file.isDirectory ? 'folder' : file.extension}</div>
                    <div>{formatSize(file.size)}</div>
                    <div>{formatDate(file.modified)}</div>
                  </ResultMeta>
                </ResultItem>
              ))}
              {!loading && !searchComplete && query && results.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#5a5a6b', fontSize: 12 }}>
                  Type to search...
                </div>
              )}
              {!loading && searchComplete && query && results.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#5a5a6b', fontSize: 12 }}>
                  No results for "{query}"
                </div>
              )}
            </Results>

            <StatusBar>
              <span>
                {results.length} results
                {!loading && searchComplete && results.length === 300 ? ' (limit reached)' : ''}
              </span>
              <span>📁 {pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path || '/'}</span>
            </StatusBar>
          </ResultsPane>

          {/* Preview Pane */}
          <PreviewPane>
            {selectedItem ? (
              <>
                <PreviewHeader>
                  <PreviewTitle>
                    {selectedItem.isDirectory ? '📁' : getFileIcon(selectedItem)} {selectedItem.name}
                  </PreviewTitle>
                  <PreviewDetail>
                    <strong>Path:</strong>
                    <span style={{ wordBreak: 'break-all' }}>{selectedItem.path}</span>
                  </PreviewDetail>
                  <PreviewDetail>
                    <strong>Size:</strong>
                    <span>{formatSize(selectedItem.size)}</span>
                  </PreviewDetail>
                  <PreviewDetail>
                    <strong>Modified:</strong>
                    <span>{formatDate(selectedItem.modified)}</span>
                  </PreviewDetail>
                  {selectedItem.extension && (
                    <PreviewDetail>
                      <strong>Type:</strong>
                      <span>{selectedItem.extension.toUpperCase()}</span>
                    </PreviewDetail>
                  )}
                </PreviewHeader>

                <PreviewContent>
                  <PreviewLabel><span>Preview</span></PreviewLabel>
                  {loadingPreview ? (
                    <div style={{ color: '#4A9EFF', fontSize: 11 }}>Loading preview...</div>
                  ) : (
                    <PreviewMedia>
                      {previewType === 'video' && (
                        <video src={previewContent} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 4 }} />
                      )}
                      {previewType === 'audio' && (
                        <audio src={previewContent} controls style={{ width: '100%' }} />
                      )}
                      {previewType === 'image' && (
                        <img src={previewContent} alt={selectedItem.name} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 4, objectFit: 'contain' }} />
                      )}
                      {previewType === 'text' && (
                        <PreviewText>{previewContent || 'No preview available'}</PreviewText>
                      )}
                    </PreviewMedia>
                  )}
                </PreviewContent>

                <PreviewActions>
                  <ActionBtn onClick={() => revealInColumns(selectedItem.path)}>📂 Reveal</ActionBtn>
                  <ActionBtn onClick={async () => {
                    const r = await window.electronAPI.delete(selectedItem.path);
                    if (r.success) {
                      setResults(prev => prev.filter(item => item.path !== selectedItem.path));
                      setSelectedItem(null);
                    }
                  }}>🗑️ Delete</ActionBtn>
                </PreviewActions>
              </>
            ) : (
              <EmptyState>
                Click a file to view details and preview
              </EmptyState>
            )}
          </PreviewPane>
        </MainContent>
      </SearchBox>
    </Overlay>
  );
}