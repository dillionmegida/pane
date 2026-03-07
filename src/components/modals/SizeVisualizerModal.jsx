import React, { useState, useEffect } from 'react';
import { useStore, formatSize } from '../../store';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';

export function SizeVisualizerModal({ data, onClose }) {
  const { navigateTo, activePane } = useStore();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState(null);

  useEffect(() => {
    if (data?.path) loadTree(data.path);
  }, []);

  const loadTree = async (path) => {
    setLoading(true);
    const r = await window.electronAPI.folderSize(path);
    if (r.success) { setTree(r.tree); setCurrentNode(r.tree); }
    setLoading(false);
  };

  const renderTreemap = (node) => {
    if (!node || !node.children || node.children.length === 0) return null;
    const totalSize = node.children.reduce((s, c) => s + c.size, 0) || 1;
    const sorted = [...node.children].sort((a, b) => b.size - a.size).slice(0, 40);
    const colors = ['#4A9EFF', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#fbbf24', '#f472b6', '#22d3ee'];

    return (
      <div style={{ position: 'relative', width: '100%', height: 360, display: 'flex', flexWrap: 'wrap', gap: 2, alignContent: 'flex-start', padding: 2 }}>
        {sorted.map((child, i) => {
          const pct = child.size / totalSize;
          const minW = Math.max(pct * 100, 4);
          const color = colors[i % colors.length];
          return (
            <div
              key={child.path}
              onClick={() => {
                if (child.isDirectory) {
                  setCurrentNode(child);
                } else {
                  navigateTo(activePane, node.path);
                  onClose();
                }
              }}
              title={`${child.name}\n${formatSize(child.size)}\n${(pct * 100).toFixed(1)}%`}
              style={{
                width: `${minW}%`,
                height: Math.max(pct * 360, 24),
                background: color + '40',
                border: `1px solid ${color}60`,
                borderRadius: 3,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                overflow: 'hidden',
                transition: 'background 0.15s',
                minWidth: 40,
              }}
              onMouseEnter={e => e.currentTarget.style.background = color + '70'}
              onMouseLeave={e => e.currentTarget.style.background = color + '40'}
            >
              <span style={{ fontSize: Math.max(9, Math.min(12, pct * 100 * 0.8)), color, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{child.name}</span>
              <span style={{ fontSize: 9, color: color + 'cc' }}>{formatSize(child.size)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="700px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📊 Disk Usage: {currentNode?.name}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="12px">
          {currentNode && currentNode !== tree && (
            <Btn style={{ marginBottom: 10 }} onClick={() => setCurrentNode(tree)}>← Back to root</Btn>
          )}
          {loading && <div style={{ textAlign: 'center', padding: 40, color: '#4A9EFF' }}>Scanning folder sizes...</div>}
          {!loading && currentNode && (
            <>
              <div style={{ marginBottom: 8, fontSize: 11, color: '#9898a8' }}>
                Total: {formatSize(currentNode.size)} · {currentNode.children?.length || 0} items
                {currentNode.isDirectory && ' · Click a block to enter, or navigate in main view'}
              </div>
              {renderTreemap(currentNode)}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}
