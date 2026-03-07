import React, { useState } from 'react';
import { useStore, formatSize } from '../../store';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Row } from './ModalPrimitives';

export function DuplicatesModal({ data, onClose }) {
  const { panes, activePane } = useStore();
  const pane = panes.find(p => p.id === activePane);
  const [scanPath, setScanPath] = useState(data?.path || pane?.path || '');
  const [results, setResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [moving, setMoving] = useState(false);

  const scan = async () => {
    if (!scanPath) return;
    setScanning(true);
    setResults(null);
    setSelected(new Set());
    const r = await window.electronAPI.findDuplicates(scanPath);
    setResults(r);
    setScanning(false);
  };

  const toggleSelect = (path) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  };

  const moveSelected = async () => {
    if (!selected.size) return;
    setMoving(true);
    await window.electronAPI.moveDuplicates({ files: [...selected], baseDir: scanPath });
    setMoving(false);
    await scan();
  };

  const allGroups = results ? [...(results.exact || []), ...(results.near || [])] : [];
  const totalFiles = allGroups.reduce((s, g) => s + g.files.length, 0);

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="680px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔁 Duplicate Detector</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <Row style={{ marginBottom: 12 }}>
            <Input value={scanPath} onChange={e => setScanPath(e.target.value)} placeholder="Folder to scan..." style={{ flex: 1 }} />
            <Btn onClick={async () => {
              const r = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
              if (!r.canceled) setScanPath(r.filePaths[0]);
            }}>Browse</Btn>
            <Btn primary onClick={scan} disabled={scanning || !scanPath}>
              {scanning ? '⏳ Scanning...' : '🔍 Scan'}
            </Btn>
          </Row>

          {results && (
            <>
              <div style={{ marginBottom: 8, fontSize: 11, color: '#9898a8' }}>
                Found {allGroups.length} duplicate group{allGroups.length !== 1 ? 's' : ''} ({totalFiles} files)
              </div>
              {allGroups.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 12, border: '1px solid #2e2e35', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', background: '#1e1e22', fontSize: 10, color: '#5a5a6b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{group.type === 'exact' ? '🔴 Exact duplicate' : '🟡 Near duplicate'} · {group.files.length} files</span>
                    <span style={{ color: '#4A9EFF', cursor: 'pointer' }} onClick={() => {
                      const paths = group.files.slice(1).map(f => f.path);
                      setSelected(s => {
                        const n = new Set(s);
                        paths.forEach(p => n.add(p));
                        return n;
                      });
                    }}>Select dupes</span>
                  </div>
                  {group.files.map((file, fi) => (
                    <div key={file.path} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 12px', fontSize: 11,
                      background: fi === 0 ? 'transparent' : (selected.has(file.path) ? '#1a3a5c' : 'transparent'),
                      borderTop: fi > 0 ? '1px solid #222' : 'none',
                    }}>
                      {fi > 0 && (
                        <input type="checkbox" checked={selected.has(file.path)} onChange={() => toggleSelect(file.path)} />
                      )}
                      {fi === 0 && <span style={{ width: 13, flexShrink: 0 }}>✅</span>}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: fi === 0 ? '#34d399' : '#e8e8ed', fontFamily: 'monospace' }}>{file.path}</span>
                      <span style={{ color: '#5a5a6b', fontFamily: 'monospace' }}>{formatSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {allGroups.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#34d399' }}>✅ No duplicates found!</div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {selected.size > 0 && (
            <span style={{ fontSize: 11, color: '#f5a623', marginRight: 'auto' }}>
              {selected.size} files selected → will move to /Duplicates (never deletes)
            </span>
          )}
          <Btn onClick={onClose}>Close</Btn>
          {selected.size > 0 && (
            <Btn primary disabled={moving} onClick={moveSelected}>
              {moving ? 'Moving...' : `Move ${selected.size} to /Duplicates`}
            </Btn>
          )}
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
