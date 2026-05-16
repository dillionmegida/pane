import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate, PREVIEW_TYPES, getPreviewType } from '../store';
import ModalPreviewPane from './ModalPreviewPane';
import { useConcurrentDirectoryScanner } from '../hooks/useDirectoryScanner';
import { FileIcon as FileIconComponent } from './FileIcons';
import { revealInColumns } from '../helpers/revealInColumns';

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

const OptBtn = styled.button<{ $active?: boolean }>`
  background: ${p => p.$active ? p.theme.accent.blue + '30' : 'none'};
  border: 1px solid ${p => p.$active ? p.theme.accent.blue : p.theme.border.normal};
  color: ${p => p.$active ? p.theme.accent.blue : p.theme.text.secondary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 3px 8px;
  font-size: 0.625rem;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const OptBtnWrapper = ({ active, children, ...props }: { active?: boolean; children: React.ReactNode; [key: string]: any }) => (
  <OptBtn $active={active} {...props}>{children}</OptBtn>
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

const ContentFileHeader = styled.div<{ collapsed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 1;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const ContentFileIcon = styled.span`
  font-size: 0.8125rem;
  flex-shrink: 0;
`;

const ContentFileName = styled.span`
  font-size: 0.6875rem;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ContentFilePath = styled.span`
  font-size: 0.5625rem;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

const ContentMatchCount = styled.span`
  font-size: 0.5625rem;
  color: ${p => p.theme.text.tertiary};
  background: ${p => p.theme.bg.hover};
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
`;

const CollapseArrow = styled.span<{ collapsed?: boolean }>`
  font-size: 0.625rem;
  color: ${p => p.theme.text.tertiary};
  transition: transform 0.15s;
  transform: rotate(${p => p.collapsed ? '-90deg' : '0deg'});
  flex-shrink: 0;
`;

const ContentMatchRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 3px 16px 3px 36px;
  cursor: pointer;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6875rem;
  line-height: 1.5;
  border-left: 2px solid transparent;
  transition: background 0.07s;
  &:hover { background: ${p => p.theme.bg.hover}; }
  &.selected {
    background: ${p => p.theme.accent.blue}15;
    border-left-color: ${p => p.theme.accent.blue};
  }
`;

const LineNumber = styled.span`
  color: ${p => p.theme.text.tertiary};
  min-width: 40px;
  text-align: right;
  padding-right: 10px;
  flex-shrink: 0;
  user-select: none;
  font-size: 0.625rem;
`;

const MatchedLineText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.theme.text.secondary};
`;

const MatchHighlight = styled.span`
  background: ${p => p.theme.accent.blue}30;
  color: ${p => p.theme.accent.blue};
  border-radius: 2px;
  padding: 0 1px;
`;

export default function SearchOverlay(): React.ReactElement {
  const { panes, activePane, navigateTo, navigateToFile, toggleSearch, setViewMode, setSelection, getActivePath, getBreadcrumbs, homeDir, searchInitContentMode } = useStore() as any;
  const pane = panes.find((p: any) => p.id === activePane);

  const [query, setQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [contentSearch, setContentSearch] = useState(!!searchInitContentMode);
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
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const { isScanning, scanResults, setScanResults, scanWithConcurrentWalking, abortScan } = useConcurrentDirectoryScanner() as any;

  const results: any[] = contentSearch ? contentResults : scanResults;
  const loading: boolean = contentSearch ? contentLoading : isScanning;
  const searchComplete: boolean = contentSearch ? contentComplete : hasSearched && !isScanning;

  // Group content results by file for display
  const contentFileGroups = useMemo(() => {
    if (!contentSearch) return [];
    const groups: { filePath: string; name: string; extension: string; matches: any[] }[] = [];
    const groupMap = new Map<string, typeof groups[0]>();
    for (const r of contentResults) {
      let group = groupMap.get(r.path);
      if (!group) {
        group = { filePath: r.path, name: r.name, extension: r.extension, matches: [] };
        groupMap.set(r.path, group);
        groups.push(group);
      }
      group.matches.push(r);
    }
    return groups;
  }, [contentSearch, contentResults]);

  // Build a flat list of selectable items for keyboard nav in content mode
  const contentFlatList = useMemo(() => {
    if (!contentSearch) return [];
    const flat: any[] = [];
    for (const group of contentFileGroups) {
      if (collapsedFiles.has(group.filePath)) continue;
      for (const match of group.matches) {
        flat.push(match);
      }
    }
    return flat;
  }, [contentSearch, contentFileGroups, collapsedFiles]);

  // Highlight query matches within a line of text
  const highlightMatch = useCallback((text: string, q: string, isRegex: boolean): React.ReactNode => {
    if (!q) return text;
    try {
      const pattern = isRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const splitRegex = new RegExp(`(${pattern})`, 'gi');
      const testRegex = new RegExp(`^${pattern}$`, 'i');
      const parts = text.split(splitRegex);
      if (parts.length <= 1) return text;
      return parts.map((part, i) =>
        testRegex.test(part) ? <MatchHighlight key={i}>{part}</MatchHighlight> : part
      );
    } catch {
      return text;
    }
  }, []);

  const toggleFileCollapse = useCallback((filePath: string) => {
    setCollapsedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

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
      setCollapsedFiles(new Set());
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
      setCollapsedFiles(new Set());
      await (window as any).electronAPI.search({
        rootPath: searchRoot, query,
        options: { useRegex, contentSearch: true, maxResults: 1000, excludeDirs: excludedDirs },
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
    if (actionKey === 'reveal') handleRevealInColumns(file.path);
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

  const handleRevealInColumns = async (filePath: string) => {
    await revealInColumns(filePath, activePane, toggleSearch);
  };

  const navList = contentSearch ? contentFlatList : results;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { toggleSearch(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.min(selectedIdx + 1, navList.length - 1);
      setSelectedIdx(newIdx); setSelectedItem(navList[newIdx]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.max(selectedIdx - 1, 0);
      setSelectedIdx(newIdx); setSelectedItem(navList[newIdx]);
    }
    if (e.key === 'Enter' && navList[selectedIdx]) { e.preventDefault(); openResult(navList[selectedIdx]); }
    if (e.key === 'r' && e.metaKey && navList[selectedIdx]) { e.preventDefault(); handleRevealInColumns(navList[selectedIdx].path); }
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
              {contentSearch && contentLoading && (
                <StopBtn onClick={() => { (window as any).electronAPI.searchCancel?.(); setContentLoading(false); setContentComplete(true); contentSearchIdRef.current = null; }} title="Stop search">■</StopBtn>
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
              {contentSearch ? (
                <>
                  {contentFileGroups.map((group) => {
                    const isCollapsed = collapsedFiles.has(group.filePath);
                    return (
                      <div key={group.filePath}>
                        <ContentFileHeader onClick={() => toggleFileCollapse(group.filePath)}>
                          <CollapseArrow collapsed={isCollapsed}>▼</CollapseArrow>
                          <ContentFileIcon>
                            <FileIconComponent ext={group.extension} size={14} />
                          </ContentFileIcon>
                          <ContentFileName>{group.name}</ContentFileName>
                          <ContentFilePath>{group.filePath}</ContentFilePath>
                          <ContentMatchCount>{group.matches.length}</ContentMatchCount>
                        </ContentFileHeader>
                        {!isCollapsed && group.matches.map((match: any) => {
                          const flatIdx = contentFlatList.indexOf(match);
                          return (
                            <ContentMatchRow
                              key={`${match.path}:${match.lineNumber}`}
                              className={flatIdx === selectedIdx ? 'selected' : ''}
                              onClick={() => { setSelectedIdx(flatIdx); setSelectedItem(match); }}
                              onDoubleClick={() => handleRevealInColumns(match.path)}
                            >
                              <LineNumber>{match.lineNumber}</LineNumber>
                              <MatchedLineText>{highlightMatch(match.matchedLine, query, useRegex)}</MatchedLineText>
                            </ContentMatchRow>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  {results.map((file: any, i: number) => (
                    <ResultItem
                      key={file.path}
                      className={i === selectedIdx ? 'selected' : ''}
                      onClick={() => { setSelectedIdx(i); setSelectedItem(file); }}
                      onDoubleClick={() => handleRevealInColumns(file.path)}
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
                </>
              )}
              {!loading && !searchComplete && query && results.length === 0 && (
                <EmptyMsg>Type to search...</EmptyMsg>
              )}
              {!loading && searchComplete && query && results.length === 0 && (
                <EmptyMsg>No results for "{query}"</EmptyMsg>
              )}
            </Results>
            <StatusBar>
              <span>
                {contentSearch
                  ? `${contentResults.length} matches in ${contentFileGroups.length} files`
                  : `${results.length} results`
                }
                {loading ? ' (searching...)' : ''}
              </span>
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
