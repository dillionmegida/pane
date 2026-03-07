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
  width: 640px;
  max-width: 90vw;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  overflow: hidden;
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

const Results = styled.div`
  max-height: 480px;
  overflow-y: auto;
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.07s;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &:hover .reveal-btn { opacity: 1; }
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

const RevealBtn = styled.button`
  background: none;
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 2px 6px;
  font-size: 10px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
  &:hover { 
    background: ${p => p.theme.bg.hover}; 
    color: ${p => p.theme.text.primary};
    border-color: ${p => p.theme.border.strong};
  }
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
  const { panes, activePane, navigateTo, navigateToFile, revealInTree, toggleSearch, setPreviewFile } = useStore();
  const pane = panes.find(p => p.id === activePane);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [contentSearch, setContentSearch] = useState(false);
  const [excludedDirs, setExcludedDirs] = useState(['node_modules', '.git']);
  const [showExcludeInput, setShowExcludeInput] = useState(false);
  const [excludeInput, setExcludeInput] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const searchIdRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const cancelCurrentSearch = useCallback(() => {
    if (searchIdRef.current) {
      console.log('Cancelling previous search:', searchIdRef.current);
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
          // Avoid duplicates
          if (prev.find(r => r.path === result.path)) return prev;
          return [...prev, result];
        });
        setSelectedIdx(0); // Reset selection to first item
      }
    };

    const handleComplete = ({ searchId }) => {
      if (searchId === searchIdRef.current) {
        setLoading(false);
        setSearchComplete(true);
        searchIdRef.current = null;
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
    
    if (!query.trim()) { 
      setResults([]); 
      setLoading(false);
      setSearchComplete(false);
      return; 
    }
    
    setLoading(true);
    setSearchComplete(false);
    timerRef.current = setTimeout(() => doSearch(), 400);
    return () => {
      clearTimeout(timerRef.current);
      cancelCurrentSearch();
    };
  }, [query, useRegex, contentSearch, excludedDirs, cancelCurrentSearch]);

  const doSearch = async () => {
    if (!pane || !query.trim()) return;
    
    searchIdRef.current = Date.now();
    console.log('Starting new search:', searchIdRef.current, 'for query:', query);
    setResults([]); // Clear previous results immediately
    setSelectedIdx(0);
    
    // Start the search - results will come in via events
    await window.electronAPI.search({
      rootPath: pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path,
      query,
      options: { useRegex, contentSearch, maxResults: 300, excludeDirs: excludedDirs },
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

  const revealResult = (file) => {
    // Reveal in tree view and close search
    revealInTree(activePane, file.path);
    toggleSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { toggleSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIdx]) openResult(results[selectedIdx]);
    if (e.key === 'r' && e.metaKey && results[selectedIdx]) { // Cmd+R to reveal
      e.preventDefault();
      revealResult(results[selectedIdx]);
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
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#5a5a6b' }}>↑↓ navigate · ↵ preview · ⌘R reveal · esc close</span>
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

        <Results>
          {results.map((file, i) => (
            <ResultItem
              key={file.path}
              onClick={() => openResult(file)}
              style={{ background: i === selectedIdx ? '#2a2a2f' : undefined }}
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
              <RevealBtn 
                className="reveal-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  revealResult(file);
                }}
                title="Reveal in tree (⌘R)"
              >
                Reveal
              </RevealBtn>
            </ResultItem>
          ))}
          {!loading && !searchComplete && query && results.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#5a5a6b', fontSize: 12 }}>
              Searching...
            </div>
          )}
          {!loading && searchComplete && query && results.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#5a5a6b', fontSize: 12 }}>
              No results for "{query}"
            </div>
          )}
        </Results>

        {(results.length > 0 || query) && (
          <StatusBar>
            <span>{results.length} results{!loading && searchComplete && results.length === 300 ? ' (limit reached)' : ''}{loading && !searchComplete ? ' (searching...)' : ''}</span>
            <span>📁 {pane.viewMode === 'column' ? pane.currentBreadcrumbPath : pane.path || '/'}</span>
          </StatusBar>
        )}
      </SearchBox>
    </Overlay>
  );
}