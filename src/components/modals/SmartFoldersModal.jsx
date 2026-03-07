import React, { useState, useEffect, useRef } from 'react';
import { useStore, formatSize, formatDate } from '../../store';
import ModalPreviewPane from '../ModalPreviewPane';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';

export function SmartFoldersModal({ data, onClose }) {
  const { panes, activePane, navigateTo, refreshPane } = useStore();
  const pane = panes.find(p => p.id === activePane);
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState(data?.id || 'large');
  const [scanning, setScanning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [largeFileSize, setLargeFileSize] = useState(100); // MB
  const [leftPaneWidth, setLeftPaneWidth] = useState(160);
  const [rightPaneWidth, setRightPaneWidth] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef(null);

  // Use breadcrumb path in column view, otherwise use regular path
  const currentPath = pane?.viewMode === 'column' ? pane?.currentBreadcrumbPath || pane?.path : pane?.path;

  const FILTERS = {
    large: { name: '⚖️ Large Files', icon: '⚖️', desc: `Files over ${largeFileSize}MB`, test: f => !f.isDirectory && f.size > largeFileSize * 1024 * 1024 },
    recent: { name: '⬇️ Recent Downloads', icon: '⬇️', desc: 'Modified in last 7 days', test: f => !f.isDirectory && Date.now() - new Date(f.modified).getTime() < 7 * 86400000 },
    empty: { name: '📭 Empty Folders', icon: '📭', desc: 'Folders with no files', test: f => f.isDirectory && f.size === 0 },
    old: { name: '🗓️ Old Files', icon: '🗓️', desc: 'Not accessed in over 1 year', test: f => !f.isDirectory && Date.now() - new Date(f.modified).getTime() > 365 * 86400000 },
  };

  // Handle left pane resize
  useEffect(() => {
    if (!isResizingLeft) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 100 && newWidth <= 300) {
        setLeftPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft]);

  // Handle right pane resize
  useEffect(() => {
    if (!isResizingRight) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setRightPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight]);

  useEffect(() => { if (currentPath) runFilter(); }, [activeFilter, currentPath, largeFileSize]);

  const handlePreviewAction = async (actionKey, file) => {
    switch (actionKey) {
      case 'open':
        if (file.isDirectory) {
          navigateTo(activePane, file.path);
        } else {
          // Open file (you might want to add a navigateToFile function or handle differently)
          console.log('Open file:', file.path);
        }
        onClose();
        break;
      case 'delete':
        const r = await window.electronAPI.delete(file.path);
        if (r.success) {
          setResults(prev => prev.filter(item => item.path !== file.path));
          setSelectedItem(null);
        }
        break;
    }
  };

  const runFilter = async () => {
    if (!currentPath) return;
    setScanning(true);
    setResults([]);

    try {
      // Set up event listeners for search results
      const searchId = Date.now();
      const allResults = [];

      const handleComplete = (data) => {
        if (data.searchId === searchId) {
          const filter = FILTERS[activeFilter];
          let filteredResults = data.results.filter(filter.test);

          // Sort all results by size (largest to smallest)
          filteredResults.sort((a, b) => b.size - a.size);

          setResults(filteredResults);
          setScanning(false);

          // Clean up listeners
          window.electronAPI.offSearchComplete?.();
        }
      };

      window.electronAPI.onSearchComplete?.(handleComplete);

      // Start the search - search for all files with '.' pattern
      await window.electronAPI.search?.({
        rootPath: currentPath,
        query: '.',
        options: { maxResults: 1000 },
        searchId
      });
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setScanning(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="900px" height="500px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🗂️ Smart Folders</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="0">
          <div style={{ display: 'flex', height: '100%' }} ref={containerRef}>
            <div style={{ width: leftPaneWidth, borderRight: '1px solid #2e2e35', padding: '8px 0', overflow: 'auto' }}>
              {Object.entries(FILTERS).map(([key, f]) => (
                <div key={key} onClick={() => setActiveFilter(key)} style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 12,
                  color: activeFilter === key ? '#4A9EFF' : '#9898a8',
                  background: activeFilter === key ? '#1a3a5c20' : 'transparent',
                  borderLeft: activeFilter === key ? '2px solid #4A9EFF' : '2px solid transparent',
                }}>
                  {f.name}
                </div>
              ))}
            </div>
            <div style={{ width: 4, background: '#2e2e35', cursor: 'col-resize', userSelect: 'none' }} onMouseDown={() => setIsResizingLeft(true)} />
            <div style={{ flex: 1, overflow: 'auto', padding: 12, borderRight: '1px solid #2e2e35' }}>
              <div style={{ fontSize: 11, color: '#5a5a6b', marginBottom: 8 }}>
                {FILTERS[activeFilter].desc} in <span style={{ color: '#9898a8' }}>{currentPath}</span>
              </div>
              {activeFilter === 'large' && (
                <div style={{ marginBottom: 12, padding: 8, background: '#1a1a1e', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: '#9898a8', whiteSpace: 'nowrap' }}>Size threshold:</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={largeFileSize}
                    onChange={(e) => setLargeFileSize(Math.max(1, parseInt(e.target.value) || 100))}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      background: '#2a2a2f',
                      border: '1px solid #3a3a3f',
                      borderRadius: 3,
                      color: '#e8e8ed',
                      fontSize: 11
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#9898a8', whiteSpace: 'nowrap' }}>MB</span>
                </div>
              )}
              {scanning && <div style={{ color: '#4A9EFF', fontSize: 12 }}>⏳ Scanning...</div>}
              {!scanning && results.length === 0 && <div style={{ color: '#5a5a6b', fontSize: 12, padding: '20px 0' }}>No files match this filter</div>}
              {!scanning && results.slice(0, 200).map(f => (
                <div
                  key={f.path}
                  onClick={() => setSelectedItem(f)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
                    background: selectedItem?.path === f.path ? '#1a3a5c20' : 'transparent',
                    borderLeft: selectedItem?.path === f.path ? '2px solid #4A9EFF' : '2px solid transparent',
                    '&:hover': { background: '#2a2a2f' }
                  }}
                >
                  <span style={{ fontSize: 13 }}>{f.isDirectory ? '📁' : '📄'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e8e8ed' }}>{f.name}</span>
                  <span style={{ color: '#5a5a6b', fontFamily: 'monospace' }}>{formatSize(f.size)}</span>
                  <span style={{ color: '#5a5a6b', fontSize: 10 }}>{formatDate(f.modified)}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 4, background: '#2e2e35', cursor: 'col-resize', userSelect: 'none' }} onMouseDown={() => setIsResizingRight(true)} />
            <ModalPreviewPane
              file={selectedItem}
              width={`${rightPaneWidth}px`}
              actions={[
                { key: 'open', label: 'Open' },
                { key: 'delete', label: 'Delete' }
              ]}
              onActionClick={handlePreviewAction}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <span style={{ fontSize: 11, color: '#5a5a6b', marginRight: 'auto' }}>{results.length} results</span>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
