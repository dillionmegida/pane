import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
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

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.7);
`;

const ConfirmDialog = styled.div`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: 10px;
  padding: 24px 28px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: ${p => p.theme.shadow.lg};
`;

const ConfirmTitle = styled.div`
  font-size: 0.875rem;
  color: ${p => p.theme.text.primary};
  margin-bottom: 8px;
  font-weight: 600;
`;

const ConfirmMsg = styled.div`
  font-size: 0.75rem;
  color: ${p => p.theme.text.secondary};
  margin-bottom: 20px;
  word-break: break-all;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const CancelBtn = styled.button`
  background: ${p => p.theme.bg.hover};
  border: 1px solid ${p => p.theme.border.strong};
  color: ${p => p.theme.text.primary};
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 0.75rem;
  cursor: pointer;
`;

const DangerBtn = styled.button`
  background: ${p => p.theme.text.error};
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 0.75rem;
  cursor: pointer;
`;

const SearchIcon = styled.span`
  font-size: 1rem;
  color: ${p => p.theme.text.tertiary};
`;

const SearchingLabel = styled.span`
  font-size: 0.75rem;
  color: orange;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StopBtn = styled.span`
  cursor: pointer;
  color: ${p => p.theme.accent.red};
  font-size: 0.625rem;
  padding: 1px 4px;
  background: ${p => p.theme.bg.tertiary};
  border-radius: ${p => p.theme.radius.sm};
`;

const CloseSearchBtn = styled.span`
  font-size: 0.75rem;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
`;

const ExcludePanel = styled.div`
  padding: 8px 14px;
  border-bottom: 1px solid ${p => p.theme.border.normal};
  background: ${p => p.theme.bg.secondary};
`;

const ExcludeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
`;

const ExcludeChip = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${p => p.theme.bg.hover};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.6875rem;
  color: ${p => p.theme.text.secondary};
`;

const ExcludeRemove = styled.span`
  cursor: pointer;
  opacity: 0.6;
`;

const ExcludeInputRow = styled.div`
  display: flex;
  gap: 6px;
`;

const ExcludeInput = styled.input`
  flex: 1;
  background: ${p => p.theme.bg.hover};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.6875rem;
  color: ${p => p.theme.text.primary};
  outline: none;
`;

const ExcludeAddBtn = styled.button`
  background: ${p => p.theme.border.strong};
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.6875rem;
  color: ${p => p.theme.text.primary};
  cursor: pointer;
`;

const EmptyMsg = styled.div`
  padding: 40px 16px;
  text-align: center;
  color: ${p => p.theme.text.tertiary};
  font-size: 0.75rem;
`;

export default function SearchOverlay(): React.ReactElement {
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
        <ConfirmOverlay onClick={() => setConfirmDelete(null)}>
          <ConfirmDialog onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <ConfirmTitle>Move to Trash?</ConfirmTitle>
            <ConfirmMsg>
              "{confirmDelete.name}" will be moved to Trash.
            </ConfirmMsg>
            <ConfirmActions>
              <CancelBtn onClick={() => setConfirmDelete(null)}>Cancel</CancelBtn>
              <DangerBtn onClick={doDelete}>Move to Trash</DangerBtn>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmOverlay>
      )}
      <SearchBox onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <InputWrap>
          <SearchIcon>🔍</SearchIcon>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search in ${rootSearch ? (homeDir || '/') : (getActivePath(activePane) || '/')}`}
          />
          {loading && (
            <SearchingLabel>
              Searching...
              {!contentSearch && isScanning && (
                <StopBtn onClick={abortScan} title="Stop search">■</StopBtn>
              )}
            </SearchingLabel>
          )}
          <CloseSearchBtn onClick={toggleSearch}>✕</CloseSearchBtn>
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
          <ExcludePanel>
            <ExcludeChips>
              {excludedDirs.map((dir: string) => (
                <ExcludeChip key={dir}>
                  {dir}
                  <ExcludeRemove onClick={() => setExcludedDirs((d: string[]) => d.filter(x => x !== dir))}>✕</ExcludeRemove>
                </ExcludeChip>
              ))}
            </ExcludeChips>
            <ExcludeInputRow>
              <ExcludeInput
                value={excludeInput}
                onChange={e => setExcludeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && excludeInput.trim()) { setExcludedDirs((d: string[]) => [...d, excludeInput.trim()]); setExcludeInput(''); } }}
                placeholder="Add directory to exclude..."
              />
              <ExcludeAddBtn onClick={() => { if (excludeInput.trim()) { setExcludedDirs((d: string[]) => [...d, excludeInput.trim()]); setExcludeInput(''); } }}>
                Add
              </ExcludeAddBtn>
            </ExcludeInputRow>
          </ExcludePanel>
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
                <EmptyMsg>Type to search...</EmptyMsg>
              )}
              {!loading && searchComplete && query && results.length === 0 && (
                <EmptyMsg>No results for "{query}"</EmptyMsg>
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
