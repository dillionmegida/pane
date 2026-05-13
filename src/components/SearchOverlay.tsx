import React, { useState, useEffect, useRef } from 'react';
import styled, { useTheme } from 'styled-components';
import { useStore, formatSize, formatDate, PREVIEW_TYPES, getPreviewType } from '../store';
import ModalPreviewPane from './ModalPreviewPane';
import { useConcurrentDirectoryScanner } from '../hooks/useDirectoryScanner';
import { FileIcon as FileIconComponent } from './FileIcons';

const ResizableDivider = styled.div`
  width: 4px;
  background: ${p => p.theme.border.normal};
  cursor: col-resize;
  user-select: none;
  transition: background 0.2s;
  &:hover { background: ${p => p.theme.accent.blue}; }
`;

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
  overflow: auto;
  display: flex;
  flex-direction: column;
  resize: both;
  min-width: 400px;
  min-height: 300px;
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
  font-size: 1rem;
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

const OptBtn = styled.button<{ active?: boolean }>`
  background: ${p => p.active ? p.theme.accent.blue + '30' : 'none'};
  border: 1px solid ${p => p.active ? p.theme.accent.blue : p.theme.border.normal};
  color: ${p => p.active ? p.theme.accent.blue : p.theme.text.secondary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 3px 8px;
  font-size: 0.625rem;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const OptBtnWrapper = ({ active, children, ...props }: { active?: boolean; children: React.ReactNode; [key: string]: any }) => (
  <OptBtn active={active} {...props}>{children}</OptBtn>
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
  font-size: 1rem;
  flex-shrink: 0;
`;

const ResultInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ResultName = styled.div`
  font-size: 0.75rem;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ResultPath = styled.div`
  font-size: 0.625rem;
  color: ${p => p.theme.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${p => p.theme.font.mono};
`;

const ResultMeta = styled.div`
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
`;

export default function SearchOverlay(): React.ReactElement {
  const theme = useTheme() as any;
  const { panes, activePane, navigateTo, navigateToFile, toggleSearch, setViewMode, setSelection, getActivePath, getBreadcrumbs, homeDir } = useStore() as any;
  const pane = panes.find((p: any) => p.id === activePane);

  const [query, setQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [contentSearch, setContentSearch] = useState(false);
  const [rootSearch, setRootSearch] = useState(false);
  const [excludedDirs, setExcludedDirs] = useState(['node_modules', '.git', 'venv', '.venv', '__pycache__', '.pytest_cache']);
  const [showExcludeInput, setShowExcludeInput] = useState(false);
  const [excludeInput, setExcludeInput] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [previewWidth, setPreviewWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const [contentResults, setContentResults] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentComplete, setContentComplete] = useState(false);
  const contentSearchIdRef = useRef<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { isScanning, scanResults, setScanResults, scanWithConcurrentWalking, abortScan } = useConcurrentDirectoryScanner() as any;

  const results: any[] = contentSearch ? contentResults : scanResults;
  const loading: boolean = contentSearch ? contentLoading : isScanning;
  const searchComplete: boolean = contentSearch ? contentComplete : hasSearched && !isScanning;

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    (window as any).electronAPI.storeGet('searchRoot').then((v: any) => setRootSearch(!!v));
  }, []);

  useEffect(() => {
    (window as any).electronAPI.storeSet('searchRoot', rootSearch);
  }, [rootSearch]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainContentRef.current) return;
      const rect = mainContentRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      if (newWidth >= 200 && newWidth <= 600) setPreviewWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const handleProgress = ({ result, total, searchId }: any) => {
      if (searchId === contentSearchIdRef.current) {
        setContentResults(prev => {
          const newResults = [...prev, result];
          if (newResults.length === 1 && !selectedItem) { setSelectedIdx(0); setSelectedItem(result); }
          return newResults;
        });
      }
    };
    const handleComplete = ({ searchId }: any) => {
      if (searchId === contentSearchIdRef.current) {
        setContentLoading(false);
        setContentComplete(true);
        contentSearchIdRef.current = null;
      }
    };
    (window as any).electronAPI.onSearchProgress(handleProgress);
    (window as any).electronAPI.onSearchComplete(handleComplete);
    return () => {
      (window as any).electronAPI.offSearchProgress();
      (window as any).electronAPI.offSearchComplete();
    };
  }, []);

  useEffect(() => {
    if (!contentSearch && scanResults.length > 0 && !selectedItem) {
      setSelectedIdx(0);
      setSelectedItem(scanResults[0]);
    }
  }, [scanResults, contentSearch, selectedItem]);

  const cancelCurrentSearchRef = useRef<() => void>(() => {});
  cancelCurrentSearchRef.current = () => {
    abortScan();
    if (contentSearchIdRef.current) {
      (window as any).electronAPI.searchCancel?.();
      contentSearchIdRef.current = null;
    }
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelCurrentSearchRef.current();
    setSelectedItem(null);
    setHasSearched(false);
    if (!query.trim()) {
      setScanResults([]);
      setContentResults([]);
      setContentLoading(false);
      setContentComplete(false);
      return;
    }
    setSelectedIdx(0);
    timerRef.current = setTimeout(() => doSearch(), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cancelCurrentSearchRef.current();
    };
  }, [query, useRegex, contentSearch, excludedDirs, rootSearch]);

  const doSearch = async () => {
    if (!pane || !query.trim()) return;
    const searchRoot = rootSearch ? (homeDir || '/') : getActivePath(activePane);
    if (contentSearch) {
      contentSearchIdRef.current = Date.now();
      setContentResults([]);
      setContentLoading(true);
      setContentComplete(false);
      setSelectedIdx(0);
      await (window as any).electronAPI.search({
        rootPath: searchRoot, query,
        options: { useRegex, contentSearch: true, maxResults: 300, excludeDirs: excludedDirs },
        searchId: contentSearchIdRef.current,
      });
    } else {
      setHasSearched(true);
      const q = query.toLowerCase();
      const filterTest = (file: any) => {
        if (useRegex) {
          try { return new RegExp(query, 'i').test(file.name); } catch { return false; }
        }
        return file.name.toLowerCase().includes(q);
      };
      await scanWithConcurrentWalking({
        rootPath: searchRoot, excludedDirectories: excludedDirs,
        maxConcurrentScans: 5, filterTest,
      });
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const handlePreviewAction = async (actionKey: string, file: any) => {
    if (actionKey === 'reveal') revealInColumns(file.path);
    else if (actionKey === 'delete') setConfirmDelete(file);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const file = confirmDelete;
    setConfirmDelete(null);
    const r = await (window as any).electronAPI.delete(file.path);
    if (r.success) {
      if (contentSearch) setContentResults(prev => prev.filter((item: any) => item.path !== file.path));
      else setScanResults((prev: any[]) => prev.filter((item: any) => item.path !== file.path));
      setSelectedItem(null);
    }
  };

  const openResult = (file: any) => {
    if (file.isDirectory) navigateTo(activePane, file.path);
    else navigateToFile(activePane, file.path);
    toggleSearch();
  };

  const revealInColumns = async (filePath: string) => {
    const parentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '/';
    if (pane.viewMode !== 'column') setViewMode(activePane, 'column');
    const targetItem = results.find((r: any) => r.path === filePath) || selectedItem;
    const isDirectory = targetItem ? targetItem.isDirectory : filePath.endsWith('/');
    useStore.getState().setRevealTarget({
      paneId: activePane, filePath, fileDir: parentDir, isDirectory, triggerPreview: !isDirectory,
    });
    toggleSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { toggleSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.min(selectedIdx + 1, results.length - 1);
      setSelectedIdx(newIdx); setSelectedItem(results[newIdx]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.max(selectedIdx - 1, 0);
      setSelectedIdx(newIdx); setSelectedItem(results[newIdx]);
    }
    if (e.key === 'Enter' && results[selectedIdx]) { e.preventDefault(); openResult(results[selectedIdx]); }
    if (e.key === 'r' && e.metaKey && results[selectedIdx]) { e.preventDefault(); revealInColumns(results[selectedIdx].path); }
  };

  return (
    <Overlay onKeyDown={e => e.stopPropagation()} onKeyUp={e => e.stopPropagation()}>
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: theme.bg.elevated, border: `1px solid ${theme.border.strong}`, borderRadius: 10, padding: '24px 28px', minWidth: 320, maxWidth: 480, boxShadow: theme.shadow.lg }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div style={{ fontSize: '0.875rem', color: theme.text.primary, marginBottom: 8, fontWeight: 600 }}>Move to Trash?</div>
            <div style={{ fontSize: '0.75rem', color: theme.text.secondary, marginBottom: 20, wordBreak: 'break-all' }}>
              "{confirmDelete.name}" will be moved to Trash.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background: theme.bg.hover, border: `1px solid ${theme.border.strong}`, color: theme.text.primary, borderRadius: 6, padding: '6px 16px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={doDelete} style={{ background: theme.text.error, border: 'none', color: '#fff', borderRadius: 6, padding: '6px 16px', fontSize: '0.75rem', cursor: 'pointer' }}>Move to Trash</button>
            </div>
          </div>
        </div>
      )}
      <SearchBox onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <InputWrap>
          <span style={{ fontSize: '1rem', color: theme.text.tertiary }}>🔍</span>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search in ${rootSearch ? (homeDir || '/') : (getActivePath(activePane) || '/')}`}
          />
          {loading && (
            <span style={{ fontSize: '0.75rem', color: 'orange', display: 'flex', alignItems: 'center', gap: 4 }}>
              Searching...
              {!contentSearch && isScanning && (
                <span onClick={abortScan} style={{ cursor: 'pointer', color: theme.accent.red, fontSize: '0.625rem', padding: '1px 4px', background: theme.bg.tertiary, borderRadius: theme.radius.sm }} title="Stop search">■</span>
              )}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: theme.text.tertiary, cursor: 'pointer' }} onClick={toggleSearch}>✕</span>
        </InputWrap>

        <Options>
          <OptBtnWrapper active={useRegex} onClick={() => setUseRegex((v: boolean) => !v)}>Regex</OptBtnWrapper>
          <OptBtnWrapper active={contentSearch} onClick={() => setContentSearch((v: boolean) => !v)}>Content Search</OptBtnWrapper>
          <OptBtnWrapper active={excludedDirs.length > 0} onClick={() => setShowExcludeInput((v: boolean) => !v)}>
            Excluded ({excludedDirs.length})
          </OptBtnWrapper>
          <OptBtnWrapper active={rootSearch} onClick={() => setRootSearch((v: boolean) => !v)}>Root</OptBtnWrapper>
        </Options>

        {showExcludeInput && (
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${theme.border.normal}`, background: theme.bg.secondary }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {excludedDirs.map((dir: string) => (
                <span key={dir} style={{ display: 'flex', alignItems: 'center', gap: 4, background: theme.bg.hover, border: `1px solid ${theme.border.strong}`, borderRadius: 4, padding: '2px 6px', fontSize: '0.6875rem', color: theme.text.secondary }}>
                  {dir}
                  <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => setExcludedDirs((d: string[]) => d.filter(x => x !== dir))}>✕</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={excludeInput}
                onChange={e => setExcludeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && excludeInput.trim()) { setExcludedDirs((d: string[]) => [...d, excludeInput.trim()]); setExcludeInput(''); } }}
                placeholder="Add directory to exclude..."
                style={{ flex: 1, background: theme.bg.hover, border: `1px solid ${theme.border.strong}`, borderRadius: 4, padding: '4px 8px', fontSize: '0.6875rem', color: theme.text.primary, outline: 'none' }}
              />
              <button onClick={() => { if (excludeInput.trim()) { setExcludedDirs((d: string[]) => [...d, excludeInput.trim()]); setExcludeInput(''); } }}
                style={{ background: theme.border.strong, border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: '0.6875rem', color: theme.text.primary, cursor: 'pointer' }}>
                Add
              </button>
            </div>
          </div>
        )}

        <MainContent ref={mainContentRef}>
          <ResultsPane>
            <Results>
              {results.map((file: any, i: number) => (
                <ResultItem
                  key={file.path}
                  className={i === selectedIdx ? 'selected' : ''}
                  onClick={() => { setSelectedIdx(i); setSelectedItem(file); }}
                  onDoubleClick={() => revealInColumns(file.path)}
                >
                  <ResultIcon>
                    {file.isDirectory ? (
                      file.name?.endsWith('.app') ? <FileIconComponent ext="app" size={16} /> : '📁'
                    ) : (
                      <FileIconComponent ext={file.extension} size={16} />
                    )}
                  </ResultIcon>
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
                <div style={{ padding: '40px 16px', textAlign: 'center', color: theme.text.tertiary, fontSize: '0.75rem' }}>Type to search...</div>
              )}
              {!loading && searchComplete && query && results.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: theme.text.tertiary, fontSize: '0.75rem' }}>No results for "{query}"</div>
              )}
            </Results>
            <StatusBar>
              <span>{results.length} results{loading && !contentSearch ? ' (scanning...)' : ''}</span>
              <span>📁 {rootSearch ? (homeDir || '/') : (getActivePath(activePane) || '/')}</span>
            </StatusBar>
          </ResultsPane>

          <ResizableDivider onMouseDown={() => setIsResizing(true)} />

          <ModalPreviewPane
            file={selectedItem}
            width={`${previewWidth}px`}
            actions={[{ key: 'reveal', label: '📂 Reveal' }, { key: 'delete', label: '🗑️ Delete' }]}
            onActionClick={handlePreviewAction}
          />
        </MainContent>
      </SearchBox>
    </Overlay>
  );
}
