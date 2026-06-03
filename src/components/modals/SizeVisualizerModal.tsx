import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const ScanningBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${p => p.theme.accent.blue};
  padding: 2px 8px;
  background: ${p => p.theme.accent.blue}18;
  border-radius: 10px;
`;

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
  align-items: center;
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

const CtxMenu = styled.div`
  position: fixed;
  z-index: 99999;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  padding: 4px;
  min-width: 190px;
  font-size: 12px;
  user-select: none;
`;

const CtxItem = styled.div<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  color: ${p => p.$danger ? p.theme.text.error : p.theme.text.primary};
  &:hover { background: ${p => p.theme.bg.active}; }
`;

const CtxIcon = styled.span`font-size: 13px; width: 16px; text-align: center; flex-shrink: 0;`;
const CtxLabel = styled.span`flex: 1;`;
const CtxDivider = styled.div`height: 1px; background: ${p => p.theme.border.normal}; margin: 3px 0;`;

const ReloadBtn = styled.button`
  background: transparent;
  border: none;
  color: ${p => p.theme.text.secondary};
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${p => p.theme.radius.sm};
  transition: all 0.1s;
  margin-right: 8px;
  &:hover {
    background: ${p => p.theme.bg.hover};
    color: ${p => p.theme.text.primary};
  }
  &:active {
    transform: rotate(180deg);
  }
`;

interface CtxState {
  node: FolderSizeNode;
  x: number;
  y: number;
}

interface SizeVisualizerModalProps {
  data?: { path?: string; paneId?: string };
  onClose: () => void;
}

export function SizeVisualizerModal({ data, onClose }: SizeVisualizerModalProps) {
  const { setRevealTarget, activePane } = useStore();
  const paneId = data?.paneId || activePane;

  const [tree, setTree] = useState<FolderSizeNode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [streamedChildren, setStreamedChildren] = useState<FolderSizeNode[]>([]);
  const [streamRootPath, setStreamRootPath] = useState<string | null>(null);
  const [streamRootName, setStreamRootName] = useState<string>('');
  const [nodeStack, setNodeStack] = useState<FolderSizeNode[]>([]);
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  const currentNode = nodeStack[nodeStack.length - 1] ?? null;

  useEffect(() => {
    if (data?.path) loadTree(data.path);
  }, []);

  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
    };
  }, [ctx]);

  const loadTree = (rootPath: string) => {
    setScanning(true);
    setTree(null);
    setStreamedChildren([]);
    setStreamRootPath(rootPath);
    setStreamRootName(rootPath.split('/').filter(Boolean).pop() || rootPath);
    setNodeStack([]);

    window.electronAPI.offFolderSizeProgress?.();
    window.electronAPI.onFolderSizeProgress?.((msg: { type: string; child?: FolderSizeNode; rootName?: string }) => {
      if (msg.type === 'init' && msg.rootName) {
        setStreamRootName(msg.rootName);
      } else if (msg.type === 'child' && msg.child) {
        setStreamedChildren(prev => [...prev, msg.child!]);
      }
    });

    window.electronAPI.folderSize(rootPath).then((r: { success: boolean; tree: FolderSizeNode }) => {
      window.electronAPI.offFolderSizeProgress?.();
      setScanning(false);
      if (r.success) {
        setTree(r.tree);
        setStreamedChildren([]);
        setNodeStack([r.tree]);
      }
    });
  };

  const enterDir = (child: FolderSizeNode) => setNodeStack(s => [...s, child]);
  const navigateToIndex = (idx: number) => setNodeStack(s => s.slice(0, idx + 1));

  const handleFileClick = (child: FolderSizeNode) => {
    setRevealTarget({ paneId, filePath: child.path, isDirectory: false });
    onClose();
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, child: FolderSizeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ node: child, x: e.clientX, y: e.clientY });
  }, []);

  const ctxReveal = () => {
    if (!ctx) return;
    setRevealTarget({ paneId, filePath: ctx.node.path, isDirectory: ctx.node.isDirectory });
    onClose();
  };

  const ctxNavigate = () => {
    if (!ctx) return;
    setRevealTarget({ paneId, filePath: ctx.node.path, isDirectory: true });
    onClose();
  };

  const ctxDrillInto = () => {
    if (!ctx) return;
    enterDir(ctx.node);
    setCtx(null);
  };

  const ctxRescan = () => {
    if (!ctx) return;
    setCtx(null);
    loadTree(ctx.node.path);
  };

  const handleReload = () => {
    const rootPath = tree?.path ?? streamRootPath;
    if (rootPath) loadTree(rootPath);
  };

  // While streaming, show streamed children; once complete, use the final tree node
  const displayChildren: FolderSizeNode[] = currentNode
    ? [...(currentNode.children ?? [])].sort((a, b) => b.size - a.size).slice(0, 50)
    : [...streamedChildren].sort((a, b) => b.size - a.size);

  const sorted = displayChildren;
  const totalSize = sorted.reduce((s, c) => s + c.size, 0) || 1;
  const isStreaming = scanning && streamedChildren.length > 0;

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="640px" height="520px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📊 Disk Usage Map</ModalTitle>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ReloadBtn onClick={handleReload} title="Reload">
              🔄
            </ReloadBtn>
            <CloseBtn onClick={onClose}>✕</CloseBtn>
          </div>
        </ModalHeader>
        <ModalBody pad="14px">
          {scanning && streamedChildren.length === 0 && (
            <ScanningMsg>
              Scanning folder sizes...
            </ScanningMsg>
          )}
          {(currentNode || isStreaming) && (
            <>
              <Breadcrumb>
                {nodeStack.length > 0 ? nodeStack.map((node, i) => (
                  <React.Fragment key={node.path}>
                    {i > 0 && <BreadcrumbSep>›</BreadcrumbSep>}
                    <BreadcrumbPart
                      $active={i === nodeStack.length - 1}
                      onClick={() => i < nodeStack.length - 1 && navigateToIndex(i)}
                    >
                      {node.name || node.path}
                    </BreadcrumbPart>
                  </React.Fragment>
                )) : (
                  <BreadcrumbPart $active>{streamRootName || streamRootPath}</BreadcrumbPart>
                )}
              </Breadcrumb>

              <SummaryRow>
                {currentNode
                  ? <span>Total: <SummaryTotal>{formatSize(currentNode.size)}</SummaryTotal></span>
                  : <span><SummaryTotal>{formatSize(totalSize)}</SummaryTotal> so far…</span>
                }
                <span>{sorted.length} items shown{(currentNode?.children?.length ?? 0) > 50 ? ` (of ${currentNode!.children!.length})` : ''}</span>
                {isStreaming && <ScanningBadge>⏳ Scanning...</ScanningBadge>}
                {currentNode && currentNode !== tree && (
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
                      onContextMenu={(e) => handleContextMenu(e, child)}
                      title={child.path}
                    >
                      <ItemIcon>{child.isDirectory ? '📁' : '📄'}</ItemIcon>
                      <ItemName>{child.name}</ItemName>
                      <BarTrack><BarFill pct={pct} color={color} /></BarTrack>
                      <ItemPct>{pct.toFixed(1)}%</ItemPct>
                      <ItemSize>{child.size > 0 ? formatSize(child.size) : '—'}</ItemSize>
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

      {ctx && (
        <CtxMenu
          ref={ctxRef}
          style={{ top: ctx.y, left: ctx.x }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          {ctx.node.isDirectory && (
            <CtxItem onClick={ctxDrillInto}>
              <CtxIcon>🔍</CtxIcon>
              <CtxLabel>Drill Into</CtxLabel>
            </CtxItem>
          )}
          {ctx.node.isDirectory && (
            <CtxItem onClick={ctxRescan}>
              <CtxIcon>🔄</CtxIcon>
              <CtxLabel>Scan This Folder</CtxLabel>
            </CtxItem>
          )}
          {ctx.node.isDirectory && <CtxDivider />}
          <CtxItem onClick={ctxReveal}>
            <CtxIcon>📍</CtxIcon>
            <CtxLabel>Reveal in Pane</CtxLabel>
          </CtxItem>
          {ctx.node.isDirectory && (
            <CtxItem onClick={ctxNavigate}>
              <CtxIcon>📂</CtxIcon>
              <CtxLabel>Navigate Here</CtxLabel>
            </CtxItem>
          )}
        </CtxMenu>
      )}
    </Overlay>
  );
}
