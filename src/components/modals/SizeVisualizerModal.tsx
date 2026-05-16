import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useStore, formatSize } from '../../store';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import type { FolderSizeNode } from '../../types';

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const BreadcrumbPart = styled.span<{ $active?: boolean }>`
  cursor: pointer;
  color: ${p => p.$active ? p.theme.text.primary : p.theme.accent.blue};
  font-weight: ${p => p.$active ? 600 : 400};
  &:hover { text-decoration: ${p => p.$active ? 'none' : 'underline'}; }
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  background: ${p => p.theme.bg.elevated};
  border-radius: 3px;
  overflow: hidden;
`;

const BarFill = styled.div<{ pct: number; color: string }>`
  height: 100%;
  border-radius: 3px;
  background: ${p => p.color};
  width: ${p => p.pct}%;
  transition: width 0.2s;
`;

const ItemIcon = styled.span`font-size: 14px; flex-shrink: 0; width: 18px; text-align: center;`;
const ItemName = styled.span`font-size: 12px; color: ${p => p.theme.text.primary}; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const ItemSize = styled.span`font-size: 11px; color: ${p => p.theme.text.tertiary}; flex-shrink: 0; width: 60px; text-align: right;`;
const ItemPct = styled.span`font-size: 10px; color: ${p => p.theme.text.tertiary}; flex-shrink: 0; width: 36px; text-align: right;`;

const ScanningMsg = styled.div`
  text-align: center;
  padding: 60px;
  color: ${p => p.theme.accent.blue};
`;

const BreadcrumbSep = styled.span`
  opacity: 0.4;
`;

const SummaryRow = styled.div`
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  margin-bottom: 10px;
  display: flex;
  gap: 12px;
`;

const SummaryTotal = styled.strong`
  color: ${p => p.theme.text.secondary};
`;

const BackToRoot = styled.span`
  cursor: pointer;
  color: ${p => p.theme.accent.blue};
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const EmptyFolder = styled.div`
  text-align: center;
  padding: 30px;
  color: ${p => p.theme.text.tertiary};
  font-size: 12px;
`;

const COLORS = ['#4A9EFF', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#fbbf24', '#f472b6', '#22d3ee', '#6ee7b7', '#fca5a5'];

interface SizeVisualizerModalProps {
  data?: { path?: string; paneId?: string };
  onClose: () => void;
}

export function SizeVisualizerModal({ data, onClose }: SizeVisualizerModalProps) {
  const { setRevealTarget, activePane } = useStore();
  const paneId = data?.paneId || activePane;

  const [tree, setTree] = useState<FolderSizeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodeStack, setNodeStack] = useState<FolderSizeNode[]>([]);

  const currentNode = nodeStack[nodeStack.length - 1] ?? null;

  useEffect(() => {
    if (data?.path) loadTree(data.path);
  }, []);

  const loadTree = async (path: string) => {
    setLoading(true);
    const r = await window.electronAPI.folderSize(path);
    if (r.success) {
      setTree(r.tree);
      setNodeStack([r.tree]);
    }
    setLoading(false);
  };

  const enterDir = (child: FolderSizeNode) => setNodeStack(s => [...s, child]);
  const navigateToIndex = (idx: number) => setNodeStack(s => s.slice(0, idx + 1));

  const handleFileClick = (child: FolderSizeNode) => {
    const fileDir = child.path.split('/').slice(0, -1).join('/') || '/';
    setRevealTarget({ paneId, filePath: child.path, fileDir, isDirectory: false });
    onClose();
  };

  const sorted = currentNode?.children
    ? [...currentNode.children].sort((a, b) => b.size - a.size).slice(0, 50)
    : [];
  const totalSize = sorted.reduce((s, c) => s + c.size, 0) || 1;

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="640px" height="520px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📊 Disk Usage Map</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="14px">
          {loading && (
            <ScanningMsg>
              Scanning folder sizes...
            </ScanningMsg>
          )}
          {!loading && currentNode && (
            <>
              <Breadcrumb>
                {nodeStack.map((node, i) => (
                  <React.Fragment key={node.path}>
                    {i > 0 && <BreadcrumbSep>›</BreadcrumbSep>}
                    <BreadcrumbPart
                      $active={i === nodeStack.length - 1}
                      onClick={() => i < nodeStack.length - 1 && navigateToIndex(i)}
                    >
                      {node.name || node.path}
                    </BreadcrumbPart>
                  </React.Fragment>
                ))}
              </Breadcrumb>

              <SummaryRow>
                <span>Total: <SummaryTotal>{formatSize(currentNode.size)}</SummaryTotal></span>
                <span>{sorted.length} items shown{(currentNode.children?.length ?? 0) > 50 ? ` (of ${currentNode.children!.length})` : ''}</span>
                {currentNode !== tree && (
                  <BackToRoot onClick={() => tree && setNodeStack([tree])}>
                    ↑ Back to root
                  </BackToRoot>
                )}
              </SummaryRow>

              <ItemList>
                {sorted.map((child, i) => {
                  const pct = (child.size / totalSize) * 100;
                  const color = COLORS[i % COLORS.length];
                  return (
                    <ItemRow
                      key={child.path}
                      onClick={() => child.isDirectory ? enterDir(child) : handleFileClick(child)}
                      title={child.path}
                    >
                      <ItemIcon>{child.isDirectory ? '📁' : '📄'}</ItemIcon>
                      <ItemName>{child.name}</ItemName>
                      <BarTrack><BarFill pct={pct} color={color} /></BarTrack>
                      <ItemPct>{pct.toFixed(1)}%</ItemPct>
                      <ItemSize>{formatSize(child.size)}</ItemSize>
                    </ItemRow>
                  );
                })}
                {sorted.length === 0 && (
                  <EmptyFolder>
                    Empty folder
                  </EmptyFolder>
                )}
              </ItemList>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
