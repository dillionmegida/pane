import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { useStore, formatSize, formatDate } from '../../store';
import ModalPreviewPane from '../ModalPreviewPane';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import { DEFAULT_EXCLUDED_DIRECTORIES, createFilterDefinitions, parseFileSizeInput } from '../../helpers/smartFolders';
import { useConcurrentDirectoryScanner } from '../../hooks/useDirectoryScanner';

const ModalContent = styled.div`
  display: flex;
  height: 100%;
`;

const LeftPane = styled.div`
  width: ${({ width }) => `${width}px`};
  border-right: 1px solid #2e2e35;
  padding: 8px 0;
  overflow: auto;
`;

const FilterItem = styled.div`
  padding: 8px 14px;
  cursor: pointer;
  font-size: 12px;
  color: ${({ active }) => (active ? '#4A9EFF' : '#9898a8')};
  background: ${({ active }) => (active ? '#1a3a5c20' : 'transparent')};
  border-left: ${({ active }) => (active ? '2px solid #4A9EFF' : '2px solid transparent')};
`;

const Divider = styled.div`
  width: 4px;
  background: #2e2e35;
  cursor: col-resize;
  user-select: none;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: auto;
  padding: 12px;
  border-right: 1px solid #2e2e35;
`;

const FilterInfo = styled.div`
  font-size: 11px;
  color: #5a5a6b;
  margin-bottom: 8px;
`;

const Options = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
`;

const OptBtnWrapper = styled.div`
  padding: 6px 10px;
  background: ${({ active }) => (active ? '#2a2a2f' : '#1a1a1e')};
  border: 1px solid ${({ active }) => (active ? '#3a3a45' : '#2e2e35')};
  border-radius: 6px;
  font-size: 11px;
  color: ${({ active }) => (active ? '#e8e8ed' : '#9898a8')};
  cursor: pointer;
  user-select: none;
`;

const ExcludePill = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  background: #2a2a2f;
  border: 1px solid #3a3a45;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: #9898a8;
`;

const ExcludeInput = styled.input`
  flex: 1;
  background: #2a2a2f;
  border: 1px solid #3a3a45;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  color: #e8e8ed;
  outline: none;
`;

const ExcludeAddBtn = styled.button`
  background: #3a3a45;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  color: #e8e8ed;
  cursor: pointer;
`;

const PathText = styled.span`
  color: #9898a8;
`;

const LargeFilterBox = styled.div`
  margin-bottom: 12px;
  padding: 8px;
  background: #1a1a1e;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-size: 11px;
  color: #9898a8;
  white-space: nowrap;
`;

const SizeInput = styled.input`
  flex: 1;
  padding: 4px 6px;
  background: #2a2a2f;
  border: 1px solid #3a3a3f;
  border-radius: 3px;
  color: #e8e8ed;
  font-size: 11px;
`;

const Unit = styled.span`
  font-size: 11px;
  color: #9898a8;
  white-space: nowrap;
`;

const ScanningText = styled.div`
  color: #4A9EFF;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StopBtn = styled.button`
  background: #d9534f;
  border: none;
  border-radius: 4px;
  padding: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: #c9302c;
    transform: scale(1.1);
  }
  svg {
    width: 10px;
    height: 10px;
  }
`;

const InfoMessage = styled.div`
  color: #9898a8;
  font-size: 11px;
  padding: 8px 0;
  font-style: italic;
`;

const EmptyState = styled.div`
  color: #5a5a6b;
  font-size: 12px;
  padding: 20px 0;
`;

const ResultRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
  border-radius: 4px;
  background: ${({ selected }) => (selected ? '#1a3a5c20' : 'transparent')};
  border-left: ${({ selected }) => (selected ? '2px solid #4A9EFF' : '2px solid transparent')};

  &:hover {
    background: #2a2a2f;
  }
`;

const ResultIcon = styled.span`
  font-size: 13px;
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e8e8ed;
`;

const SizeText = styled.span`
  color: #5a5a6b;
  font-family: monospace;
`;

const ModifiedText = styled.span`
  color: #5a5a6b;
  font-size: 10px;
`;

const FooterInfo = styled.span`
  font-size: 11px;
  color: #5a5a6b;
  margin-right: auto;
  display: flex;
  gap: 8px;
`;

export function SmartFoldersModal({ data, onClose }) {
  const { panes, activePane, navigateTo } = useStore();
  const currentPane = panes.find(p => p.id === activePane);
  
  const [selectedFilterType, setSelectedFilterType] = useState(data?.id || 'large');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileSizeInputMB, setFileSizeInputMB] = useState('1000');
  const [leftPaneWidthPx, setLeftPaneWidthPx] = useState(160);
  const [rightPaneWidthPx, setRightPaneWidthPx] = useState(300);
  const [isResizingLeftPane, setIsResizingLeftPane] = useState(false);
  const [isResizingRightPane, setIsResizingRightPane] = useState(false);
  const [showExclusionInput, setShowExclusionInput] = useState(false);
  const [excludedDirectories, setExcludedDirectories] = useState(DEFAULT_EXCLUDED_DIRECTORIES);
  const [exclusionInputValue, setExclusionInputValue] = useState('');
  const modalContainerRef = useRef(null);

  const { isScanning, scanResults, scanForLargeFiles, scanWithGenericSearch, abortScan } = useConcurrentDirectoryScanner();

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

  const stopEventPropagation = (e) => {
    e.stopPropagation();
  };

  const handleFileSizeInputChange = (inputValue) => {
    setFileSizeInputMB(inputValue);
  };

  useEffect(() => {
    if (!isResizingLeftPane) return;

    const handleMouseMove = (e) => {
      if (!modalContainerRef.current) return;
      const containerRect = modalContainerRef.current.getBoundingClientRect();
      const newWidthPx = e.clientX - containerRect.left;
      if (newWidthPx >= 100 && newWidthPx <= 300) {
        setLeftPaneWidthPx(newWidthPx);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeftPane(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeftPane]);

  useEffect(() => {
    if (!isResizingRightPane) return;

    const handleMouseMove = (e) => {
      if (!modalContainerRef.current) return;
      const containerRect = modalContainerRef.current.getBoundingClientRect();
      const newWidthPx = containerRect.right - e.clientX;
      if (newWidthPx >= 200 && newWidthPx <= 600) {
        setRightPaneWidthPx(newWidthPx);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRightPane(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRightPane]);

  useEffect(() => {
    if (!currentDirectoryPath) return;

    const runScan = () => {
      if (selectedFilterType === 'large') {
        if (parsedSizeMB > 0) {
          executeFilterScan(parsedSizeMB);
        }
      } else {
        executeFilterScan();
      }
    };

    if (selectedFilterType === 'large') {
      const handle = setTimeout(runScan, 500);
      return () => clearTimeout(handle);
    }

    runScan();
  }, [selectedFilterType, currentDirectoryPath, parsedSizeMB, excludedDirectories]);

  const handleFileAction = async (actionKey, file) => {
    switch (actionKey) {
      case 'open':
        if (file.isDirectory) {
          navigateTo(activePane, file.path);
        } else {
          console.log('Open file:', file.path);
        }
        onClose();
        break;
      case 'delete':
        const deleteResponse = await window.electronAPI.delete(file.path);
        if (deleteResponse.success) {
          setSelectedFile(null);
        }
        break;
    }
  };

  const executeFilterScan = async (sizeThresholdMB = parsedSizeMB) => {
    if (!currentDirectoryPath) return;

    if (selectedFilterType === 'large') {
      if (sizeThresholdMB <= 0) return;
      await scanForLargeFiles({
        rootPath: currentDirectoryPath,
        fileSizeThresholdBytes: sizeThresholdMB * 1024 * 1024,
        excludedDirectories,
        maxConcurrentScans: 3
      });
    } else {
      const currentFilter = filterDefinitions[selectedFilterType];
      await scanWithGenericSearch({
        rootPath: currentDirectoryPath,
        excludedDirectories,
        filterTest: currentFilter.test
      });
    }
  };

  return (
    <Overlay
      onClick={(e) => { stopEventPropagation(e); onClose(); }}
      onMouseDown={stopEventPropagation}
      onKeyDown={stopEventPropagation}
      onKeyUp={stopEventPropagation}
      onWheel={stopEventPropagation}
    >
      <ResizableModalBox
        width="900px"
        height="500px"
        onClick={stopEventPropagation}
        onMouseDown={stopEventPropagation}
        onKeyDown={stopEventPropagation}
        onKeyUp={stopEventPropagation}
        onWheel={stopEventPropagation}
        tabIndex={-1}
      >
        <ModalHeader>
          <ModalTitle>🗂️ Smart Folders</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="0">
          <ModalContent ref={modalContainerRef}>
            <LeftPane width={leftPaneWidthPx}>
              {Object.entries(filterDefinitions).map(([filterKey, filterConfig]) => (
                <FilterItem 
                  key={filterKey} 
                  active={selectedFilterType === filterKey} 
                  onClick={() => setSelectedFilterType(filterKey)}
                >
                  {filterConfig.name}
                </FilterItem>
              ))}
            </LeftPane>
            <Divider onMouseDown={() => setIsResizingLeftPane(true)} />
            <ContentArea>
              <FilterInfo>
                {filterDefinitions[selectedFilterType].desc} in <PathText>{currentDirectoryPath}</PathText>
              </FilterInfo>
              <Options>
                <OptBtnWrapper active={excludedDirectories.length > 0} onClick={() => setShowExclusionInput(prev => !prev)}>
                  {showExclusionInput ? '▼' : '▶'} Excluded ({excludedDirectories.length})
                </OptBtnWrapper>
              </Options>
              {showExclusionInput && (
                <div style={{ padding: '8px 10px', border: '1px solid #2e2e35', borderRadius: 6, background: '#1a1a1e', marginBottom: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {excludedDirectories.map(directoryName => (
                      <ExcludePill key={directoryName}>
                        {directoryName}
                        <span 
                          style={{ cursor: 'pointer', color: '#5a5a6b' }} 
                          onClick={() => setExcludedDirectories(prev => prev.filter(name => name !== directoryName))}
                        >
                          ✕
                        </span>
                      </ExcludePill>
                    ))}
                    {excludedDirectories.length === 0 && (
                      <span style={{ fontSize: '11px', color: '#5a5a6b' }}>No exclusions</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ExcludeInput
                      value={exclusionInputValue}
                      onChange={e => setExclusionInputValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && exclusionInputValue.trim()) {
                          setExcludedDirectories(prev => [...prev, exclusionInputValue.trim()]);
                          setExclusionInputValue('');
                        }
                      }}
                      placeholder="Add directory to exclude..."
                    />
                    <ExcludeAddBtn
                      onClick={() => {
                        if (exclusionInputValue.trim()) {
                          setExcludedDirectories(prev => [...prev, exclusionInputValue.trim()]);
                          setExclusionInputValue('');
                        }
                      }}
                    >
                      Add
                    </ExcludeAddBtn>
                  </div>
                </div>
              )}
              {selectedFilterType === 'large' && (
                <LargeFilterBox>
                  <FilterLabel>Size threshold:</FilterLabel>
                  <SizeInput
                    type="text"
                    inputMode="decimal"
                    value={fileSizeInputMB}
                    onChange={(e) => handleFileSizeInputChange(e.target.value)}
                    onBlur={() => {
                      if (fileSizeInputMB.trim() === '') {
                        setFileSizeInputMB('0');
                      }
                    }}
                    aria-label="Minimum file size in megabytes"
                    placeholder="e.g. 0.5"
                  />
                  <Unit>MB</Unit>
                </LargeFilterBox>
              )}
              {selectedFilterType === 'large' && parsedSizeMB === 0 && (
                <InfoMessage>Enter a size threshold to begin search</InfoMessage>
              )}
              {!isScanning && scanResults.length === 0 && !(selectedFilterType === 'large' && parsedSizeMB === 0) && (
                <EmptyState>No files match this filter</EmptyState>
              )}
              {visibleResults.map(file => (
                <ResultRow
                  key={file.path}
                  selected={selectedFile?.path === file.path}
                  onClick={() => setSelectedFile(file)}
                >
                  <ResultIcon>{file.isDirectory ? '📁' : '📄'}</ResultIcon>
                  <FileName>{file.name}</FileName>
                  <SizeText>{formatSize(file.size)}</SizeText>
                  <ModifiedText>{formatDate(file.modified)}</ModifiedText>
                </ResultRow>
              ))}
            </ContentArea>
            <Divider onMouseDown={() => setIsResizingRightPane(true)} />
            <ModalPreviewPane
              file={selectedFile}
              width={`${rightPaneWidthPx}px`}
              actions={[
                { key: 'open', label: 'Open' },
                { key: 'delete', label: 'Delete' }
              ]}
              onActionClick={handleFileAction}
            />
          </ModalContent>
        </ModalBody>
        <ModalFooter>
          <FooterInfo>
            {isScanning && (
              <StopBtn onClick={abortScan} title="Stop scanning">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </StopBtn>
            )}
            {isScanning ? (
              <>
                ⏳ Scanning{scanResults.length > 0 ? ` (${scanResults.length} found so far)` : ''}...
              </>
            ) : (
              `${scanResults.length} results`
            )}
          </FooterInfo>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
