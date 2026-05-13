import React, { useState } from 'react';
import styled from 'styled-components';
import { useStore, formatSize } from '../../store';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Row } from './ModalPrimitives';
import type { DuplicateGroup } from '../../types';

const ScanRow = styled(Row)`
  margin-bottom: 12px;
`;

const ScanInput = styled(Input)`
  flex: 1;
`;

const SummaryText = styled.div`
  margin-bottom: 8px;
  font-size: 11px;
  color: #9898a8;
`;

const GroupCard = styled.div`
  margin-bottom: 12px;
  border: 1px solid #2e2e35;
  border-radius: 6px;
  overflow: hidden;
`;

const GroupHeader = styled.div`
  padding: 6px 12px;
  background: #1e1e22;
  font-size: 10px;
  color: #5a5a6b;
  display: flex;
  justify-content: space-between;
`;

const SelectDupesBtn = styled.span`
  color: #4A9EFF;
  cursor: pointer;
`;

const FileRow = styled.div<{ isFirst: boolean; isSelected: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  font-size: 11px;
  background: ${p => p.isFirst ? 'transparent' : (p.isSelected ? '#1a3a5c' : 'transparent')};
  border-top: ${p => p.isFirst ? 'none' : '1px solid #222'};
`;

const OriginalIcon = styled.span`
  width: 13px;
  flex-shrink: 0;
`;

const FilePath = styled.span<{ isOriginal: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.isOriginal ? '#34d399' : '#e8e8ed'};
  font-family: monospace;
`;

const FileSize = styled.span`
  color: #5a5a6b;
  font-family: monospace;
`;

const NoDupes = styled.div`
  text-align: center;
  padding: 30px;
  color: #34d399;
`;

const SelectionInfo = styled.span`
  font-size: 11px;
  color: #f5a623;
  margin-right: auto;
`;

interface DuplicatesModalProps {
  data?: { path?: string };
  onClose: () => void;
}

export function DuplicatesModal({ data, onClose }: DuplicatesModalProps) {
  const { panes, activePane } = useStore();
  const pane = panes.find(p => p.id === activePane);
  const [scanPath, setScanPath] = useState(data?.path || pane?.path || '');
  const [results, setResults] = useState<{ exact?: DuplicateGroup[]; near?: DuplicateGroup[] } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  const toggleSelect = (path: string) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path); else n.add(path);
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

  const allGroups: DuplicateGroup[] = results ? [...(results.exact || []), ...(results.near || [])] : [];
  const totalFiles = allGroups.reduce((s, g) => s + g.files.length, 0);

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="680px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔁 Duplicate Detector</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <ScanRow>
            <ScanInput value={scanPath} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScanPath(e.target.value)} placeholder="Folder to scan..." />
            <Btn onClick={async () => {
              const r = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
              if (!r.canceled) setScanPath(r.filePaths[0]);
            }}>Browse</Btn>
            <Btn primary onClick={scan} disabled={scanning || !scanPath}>
              {scanning ? '⏳ Scanning...' : '🔍 Scan'}
            </Btn>
          </ScanRow>

          {results && (
            <>
              <SummaryText>
                Found {allGroups.length} duplicate group{allGroups.length !== 1 ? 's' : ''} ({totalFiles} files)
              </SummaryText>
              {allGroups.map((group, gi) => (
                <GroupCard key={gi}>
                  <GroupHeader>
                    <span>{group.type === 'exact' ? '🔴 Exact duplicate' : '🟡 Near duplicate'} · {group.files.length} files</span>
                    <SelectDupesBtn onClick={() => {
                      const paths = group.files.slice(1).map(f => f.path);
                      setSelected(s => {
                        const n = new Set(s);
                        paths.forEach(p => n.add(p));
                        return n;
                      });
                    }}>Select dupes</SelectDupesBtn>
                  </GroupHeader>
                  {group.files.map((file, fi) => (
                    <FileRow key={file.path} isFirst={fi === 0} isSelected={selected.has(file.path)}>
                      {fi > 0 && <input type="checkbox" checked={selected.has(file.path)} onChange={() => toggleSelect(file.path)} />}
                      {fi === 0 && <OriginalIcon>✅</OriginalIcon>}
                      <FilePath isOriginal={fi === 0}>{file.path}</FilePath>
                      <FileSize>{formatSize(file.size)}</FileSize>
                    </FileRow>
                  ))}
                </GroupCard>
              ))}
              {allGroups.length === 0 && (
                <NoDupes>✅ No duplicates found!</NoDupes>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {selected.size > 0 && (
            <SelectionInfo>
              {selected.size} files selected → will move to /Duplicates (never deletes)
            </SelectionInfo>
          )}
          <Btn onClick={onClose}>Close</Btn>
          {selected.size > 0 && (
            <Btn primary disabled={moving} onClick={moveSelected}>
              {moving ? 'Moving...' : `Move ${selected.size} to /Duplicates`}
            </Btn>
          )}
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
