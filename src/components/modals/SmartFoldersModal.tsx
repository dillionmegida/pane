import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate } from '../../store';
import ModalPreviewPane from '../ModalPreviewPane';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import { DEFAULT_EXCLUDED_DIRECTORIES, createFilterDefinitions, parseFileSizeInput } from '../../helpers/smartFolders';
import { useConcurrentDirectoryScanner } from '../../hooks/useDirectoryScanner';
import type { FileItem } from '../../types';

const ModalContent = styled.div`display: flex; height: 100%;`;
const LeftPane = styled.div<{ width: number }>`
  width: ${p => `${p.width}px`}; border-right: 1px solid ${p => p.theme.border.normal}; padding: 8px 0; overflow: auto;
`;
const FilterItem = styled.div<{ $active?: boolean }>`
  padding: 8px 14px; cursor: pointer; font-size: 12px;
  color: ${p => p.$active ? p.theme.text.accent : p.theme.text.secondary};
  background: ${p => p.$active ? p.theme.bg.selection : 'transparent'};
  border-left: ${p => p.$active ? `2px solid ${p.theme.text.accent}` : '2px solid transparent'};
`;
const Divider = styled.div`width: 1px; background: ${p => p.theme.border.normal}; cursor: col-resize; user-select: none;`;
const ContentArea = styled.div`flex: 1; overflow: auto; padding: 12px; border-right: 1px solid ${p => p.theme.border.normal};`;
const FilterInfo = styled.div`font-size: 11px; color: ${p => p.theme.text.tertiary}; margin-left: 12px; flex: 1;`;
const Options = styled.div`display: flex; gap: 6px; margin-bottom: 8px; align-items: center;`;
const OptBtnWrapper = styled.div<{ $active?: boolean }>`
  padding: 6px 10px;
  background: ${p => p.$active ? p.theme.bg.hover : p.theme.bg.secondary};
  border: 1px solid ${p => p.$active ? p.theme.border.strong : p.theme.border.normal};
  border-radius: 6px; font-size: 11px;
  color: ${p => p.$active ? p.theme.text.primary : p.theme.text.secondary};
  cursor: pointer; user-select: none;
`;
const ExcludePill = styled.span`
  display: flex; align-items: center; gap: 4px;
  background: ${p => p.theme.bg.hover}; border: 1px solid ${p => p.theme.border.strong};
  border-radius: 4px; padding: 2px 6px; font-size: 11px; color: ${p => p.theme.text.secondary};
`;
const ExcludeInput = styled.input`
  flex: 1; background: ${p => p.theme.bg.hover}; border: 1px solid ${p => p.theme.border.strong};
  border-radius: 4px; padding: 4px 8px; font-size: 11px; color: ${p => p.theme.text.primary}; outline: none;
`;
const ExcludeAddBtn = styled.button`
  background: ${p => p.theme.border.strong}; border: none; border-radius: 4px;
  padding: 4px 10px; font-size: 11px; color: ${p => p.theme.text.primary}; cursor: pointer;
`;
const PathText = styled.span`color: ${p => p.theme.text.secondary};`;
const LargeFilterBox = styled.div`
  margin-bottom: 12px; padding: 8px; background: ${p => p.theme.bg.secondary};
  border-radius: 4px; display: flex; align-items: center; gap: 8px;
`;
const FilterLabel = styled.label`font-size: 11px; color: ${p => p.theme.text.secondary}; white-space: nowrap;`;
const SizeInput = styled.input`
  flex: 1; padding: 4px 6px; background: ${p => p.theme.bg.hover};
  border: 1px solid ${p => p.theme.border.strong}; border-radius: 3px; color: ${p => p.theme.text.primary}; font-size: 11px;
`;
const Unit = styled.span`font-size: 11px; color: ${p => p.theme.text.secondary}; white-space: nowrap;`;
const StopBtn = styled.button`
  background: ${p => p.theme.text.error}; border: none; border-radius: 4px;
  padding: 2px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer;
  &:hover { opacity: 0.8; }
  svg { width: 10px; height: 10px; }
`;
const InfoMessage = styled.div`color: ${p => p.theme.text.secondary}; font-size: 11px; padding: 8px 0; font-style: italic;`;
const EmptyState = styled.div`color: ${p => p.theme.text.tertiary}; font-size: 12px; padding: 20px 0;`;
const ResultRow = styled.div<{ selected?: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 5px 8px; font-size: 11px; cursor: pointer; border-radius: 4px;
  background: ${p => p.selected ? p.theme.bg.selection : 'transparent'};
  border-left: ${p => p.selected ? `2px solid ${p.theme.text.accent}` : '2px solid transparent'};
  &:hover { background: ${p => p.theme.bg.hover}; }
`;
const ResultIcon = styled.span`font-size: 13px;`;
const FileName = styled.span`flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${p => p.theme.text.primary};`;
const SizeText = styled.span`color: ${p => p.theme.text.tertiary}; font-family: monospace;`;
const ModifiedText = styled.span`color: ${p => p.theme.text.tertiary}; font-size: 10px;`;
const HeaderInfo = styled.div`display: flex; align-items: center; gap: 12px; font-size: 11px; color: ${p => p.theme.text.tertiary};`;

const ScanStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusText = styled.span`
  white-space: nowrap;
`;

const ExcludePanel = styled.div`
  padding: 8px 10px;
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: 6px;
  background: ${p => p.theme.bg.secondary};
  margin-bottom: 10px;
`;

const ExcludeChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
`;

const ExcludeRemoveBtn = styled.span`
  cursor: pointer;
  opacity: 0.6;
`;

const NoExclusions = styled.span`
  font-size: 11px;
  opacity: 0.6;
`;

const ExcludeInputRow = styled.div`
  display: flex;
  gap: 6px;
`;

interface SmartFoldersModalProps {
  data?: { id?: string };
  onClose: () => void;
}

export function SmartFoldersModal({ data, onClose }: SmartFoldersModalProps) {
  const { panes, activePane, setRevealTarget, setViewMode, zoom } = useStore();
  const currentPane = panes.find(p => p.id === activePane);

  const [selectedFilterType, setSelectedFilterType] = useState(data?.id || 'large');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileSizeInputMB, setFileSizeInputMB] = useState('1000');
  const [leftPaneWidthPx, setLeftPaneWidthPx] = useState(160);
  const [rightPaneWidthPx, setRightPaneWidthPx] = useState(300);
  const [isResizingLeftPane, setIsResizingLeftPane] = useState(false);
  const [isResizingRightPane, setIsResizingRightPane] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [showExclusionInput, setShowExclusionInput] = useState(false);
  const [excludedDirectories, setExcludedDirectories] = useState<string[]>(DEFAULT_EXCLUDED_DIRECTORIES);
  const [exclusionInputValue, setExclusionInputValue] = useState('');
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const cachedResultsRef = useRef<Record<string, FileItem[]>>({});
  const lastCacheKeyRef = useRef('');

  const { isScanning, scanResults, setScanResults, scanForLargeFiles, scanWithConcurrentWalking, scanWithGenericSearch, abortScan } = useConcurrentDirectoryScanner();

  const displaySizeLabel = fileSizeInputMB.trim() === '' ? '0' : fileSizeInputMB;
  const parsedSizeMB = useMemo(() => {
    const parsed = parseFileSizeInput(fileSizeInputMB);
    return parsed === null ? 0 : parsed;
  }, [fileSizeInputMB]);

  const currentDirectoryPath = currentPane?.viewMode === 'column'
    ? currentPane?.currentBreadcrumbPath || currentPane?.path
    : currentPane?.path;

  const filterDefinitions = createFilterDefinitions(displaySizeLabel);
  const visibleResults = useMemo(() => scanResults.slice(0, 200), [scanResults]);

  const getCacheKey = () =>
    `${selectedFilterType}-${currentDirectoryPath}-${selectedFilterType === 'large' ? parsedSizeMB : ''}-${excludedDirectories.join(',')}`;

  const stopEventPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

  useEffect(() => {
    if (!isResizingLeftPane) return;
    document.body.style.cursor = 'col-resize';
    const handleMouseMove = (e: MouseEvent) => {
      const delta = (e.clientX - resizeStartX) / zoom;
      const newW = resizeStartWidth + delta;
      if (newW >= 100 && newW <= 300) setLeftPaneWidthPx(newW);
    };
    const handleMouseUp = () => {
      document.body.style.cursor = '';
      setIsResizingLeftPane(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingLeftPane, resizeStartX, resizeStartWidth, zoom]);

  useEffect(() => {
    if (!isResizingRightPane) return;
    document.body.style.cursor = 'col-resize';
    const handleMouseMove = (e: MouseEvent) => {
      const delta = (resizeStartX - e.clientX) / zoom;
      const newW = resizeStartWidth + delta;
      if (newW >= 200 && newW <= 600) setRightPaneWidthPx(newW);
    };
    const handleMouseUp = () => {
      document.body.style.cursor = '';
      setIsResizingRightPane(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizingRightPane, resizeStartX, resizeStartWidth, zoom]);

  useEffect(() => {
    if (!isScanning && hasScannedOnce) {
      cachedResultsRef.current[getCacheKey()] = scanResults;
    }
  }, [isScanning, scanResults, hasScannedOnce]);

  const executeFilterScan = async (sizeThresholdMB = parsedSizeMB) => {
    if (!currentDirectoryPath) return;
    if (selectedFilterType === 'large') {
      if (sizeThresholdMB <= 0) return;
      await scanForLargeFiles({ rootPath: currentDirectoryPath, fileSizeThresholdBytes: sizeThresholdMB * 1024 * 1024, excludedDirectories, maxConcurrentScans: 3 });
    } else if (selectedFilterType === 'empty' || selectedFilterType === 'old') {
      const f = filterDefinitions[selectedFilterType];
      await scanWithConcurrentWalking({ rootPath: currentDirectoryPath, excludedDirectories, maxConcurrentScans: 3, filterTest: f.test });
    } else {
      const f = filterDefinitions[selectedFilterType];
      await scanWithGenericSearch({ rootPath: currentDirectoryPath, excludedDirectories, filterTest: f.test });
    }
  };

  useEffect(() => {
    if (!currentDirectoryPath) return;
    const newCacheKey = getCacheKey();
    const prevCacheKey = lastCacheKeyRef.current;
    if (prevCacheKey && prevCacheKey !== newCacheKey) cachedResultsRef.current[prevCacheKey] = scanResults;
    if (prevCacheKey !== newCacheKey) abortScan();
    lastCacheKeyRef.current = newCacheKey;
    const cached = cachedResultsRef.current[newCacheKey];
    if (cached !== undefined) { setScanResults(cached); setHasScannedOnce(true); return; }
    setHasScannedOnce(false);
    const runScan = async () => {
      if (selectedFilterType === 'large') {
        if (parsedSizeMB > 0) { await executeFilterScan(parsedSizeMB); setHasScannedOnce(true); }
      } else {
        await executeFilterScan(); setHasScannedOnce(true);
      }
    };
    if (selectedFilterType === 'large') {
      const handle = setTimeout(runScan, 500);
      return () => clearTimeout(handle);
    }
    runScan();
  }, [selectedFilterType, currentDirectoryPath, parsedSizeMB, excludedDirectories]);

  const handleFileAction = async (actionKey: string, file: FileItem) => {
    if (actionKey === 'reveal') {
      const isDirectory = file.isDirectory;
      const parentDir = file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '/';
      const paneId = activePane;
      if (panes.find(p => p.id === paneId)?.viewMode !== 'column') {
        setViewMode(paneId, 'column');
      }
      setRevealTarget({ paneId, filePath: file.path, fileDir: parentDir, isDirectory, triggerPreview: !isDirectory });
      onClose();
    } else if (actionKey === 'delete') {
      const r = await window.electronAPI.delete(file.path);
      if (r.success) { setSelectedFile(null); await executeFilterScan(); }
    }
  };

  return (
    <Overlay
      onClick={e => { stopEventPropagation(e); onClose(); }}
      onMouseDown={stopEventPropagation}
      onKeyDown={stopEventPropagation}
      onKeyUp={stopEventPropagation}
      onWheel={stopEventPropagation}
    >
      <ResizableModalBox
        width="900px" height="500px"
        onClick={stopEventPropagation}
        onMouseDown={stopEventPropagation}
        onKeyDown={stopEventPropagation}
        onKeyUp={stopEventPropagation}
        onWheel={stopEventPropagation}
      >
        <ModalHeader>
          <ModalTitle>🗂️ Smart Folders</ModalTitle>
          <HeaderInfo>
            <FilterInfo>
              <PathText>{currentDirectoryPath}</PathText>: {filterDefinitions[selectedFilterType]?.desc}
            </FilterInfo>
          </HeaderInfo>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="0">
          <ModalContent ref={modalContainerRef}>
            <LeftPane width={leftPaneWidthPx}>
              {Object.entries(filterDefinitions).map(([filterKey, filterConfig]) => (
                <FilterItem key={filterKey} $active={selectedFilterType === filterKey} onClick={() => setSelectedFilterType(filterKey)}>
                  {filterConfig.name}
                </FilterItem>
              ))}
            </LeftPane>
            <Divider onMouseDown={(e) => { setResizeStartX(e.clientX); setResizeStartWidth(leftPaneWidthPx); setIsResizingLeftPane(true); }} />
            <ContentArea>
              <Options>
                <OptBtnWrapper $active={excludedDirectories.length > 0} onClick={() => setShowExclusionInput(p => !p)}>
                  {showExclusionInput ? '▼' : '▶'} Excluded ({excludedDirectories.length})
                </OptBtnWrapper>
                <ScanStatusRow>
                  {isScanning && (
                    <StopBtn onClick={abortScan} title="Stop scanning">
                      <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    </StopBtn>
                  )}
                  <StatusText>
                    {isScanning
                      ? <>⏳ Scanning{scanResults.length > 0 ? ` (${scanResults.length} found so far)` : ''}...</>
                      : hasScannedOnce ? `${scanResults.length} results` : '—'}
                  </StatusText>
                </ScanStatusRow>
              </Options>
              {showExclusionInput && (
                <ExcludePanel>
                  <ExcludeChipsRow>
                    {excludedDirectories.map(name => (
                      <ExcludePill key={name}>
                        {name}
                        <ExcludeRemoveBtn onClick={() => setExcludedDirectories(p => p.filter(n => n !== name))}>✕</ExcludeRemoveBtn>
                      </ExcludePill>
                    ))}
                    {excludedDirectories.length === 0 && <NoExclusions>No exclusions</NoExclusions>}
                  </ExcludeChipsRow>
                  <ExcludeInputRow>
                    <ExcludeInput
                      value={exclusionInputValue}
                      onChange={e => setExclusionInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && exclusionInputValue.trim()) {
                          setExcludedDirectories(p => [...p, exclusionInputValue.trim()]);
                          setExclusionInputValue('');
                        }
                      }}
                      placeholder="Add directory to exclude..."
                    />
                    <ExcludeAddBtn onClick={() => {
                      if (exclusionInputValue.trim()) {
                        setExcludedDirectories(p => [...p, exclusionInputValue.trim()]);
                        setExclusionInputValue('');
                      }
                    }}>Add</ExcludeAddBtn>
                  </ExcludeInputRow>
                </ExcludePanel>
              )}
              {selectedFilterType === 'large' && (
                <LargeFilterBox>
                  <FilterLabel>Size threshold:</FilterLabel>
                  <SizeInput type="text" inputMode="decimal" value={fileSizeInputMB}
                    onChange={e => setFileSizeInputMB(e.target.value)}
                    onBlur={() => { if (fileSizeInputMB.trim() === '') setFileSizeInputMB('0'); }}
                    placeholder="e.g. 0.5" />
                  <Unit>MB</Unit>
                </LargeFilterBox>
              )}
              {selectedFilterType === 'large' && parsedSizeMB === 0 && <InfoMessage>Enter a size threshold to begin search</InfoMessage>}
              {!isScanning && hasScannedOnce && scanResults.length === 0 && !(selectedFilterType === 'large' && parsedSizeMB === 0) && (
                <EmptyState>No files match this filter</EmptyState>
              )}
              {visibleResults.map(file => (
                <ResultRow key={file.path} selected={selectedFile?.path === file.path} onClick={() => setSelectedFile(file)}>
                  <ResultIcon>{file.isDirectory ? '📁' : '📄'}</ResultIcon>
                  <FileName>{file.name}</FileName>
                  <SizeText>{formatSize(file.size)}</SizeText>
                  <ModifiedText>{formatDate(file.modified)}</ModifiedText>
                </ResultRow>
              ))}
            </ContentArea>
            <Divider onMouseDown={(e) => { setResizeStartX(e.clientX); setResizeStartWidth(rightPaneWidthPx); setIsResizingRightPane(true); }} />
            <ModalPreviewPane
              file={selectedFile}
              width={`${rightPaneWidthPx}px`}
              actions={[{ key: 'reveal', label: 'Reveal' }, { key: 'delete', label: 'Delete' }]}
              onActionClick={handleFileAction}
            />
          </ModalContent>
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
