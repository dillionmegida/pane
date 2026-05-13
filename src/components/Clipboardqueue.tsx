import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store';

const Bar = styled.div`
  background: ${p => p.theme.bg.elevated};
  border-top: 1px solid ${p => p.theme.border.subtle};
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  flex-shrink: 0;
`;

const FileChip = styled.span<{ cut: boolean }>`
  background: ${p => p.cut ? p.theme.accent.orange + '20' : p.theme.accent.blue + '20'};
  border: 1px solid ${p => p.cut ? p.theme.accent.orange + '60' : p.theme.accent.blue + '60'};
  color: ${p => p.cut ? p.theme.accent.orange : p.theme.accent.blue};
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover { opacity: 0.7; }
`;

const Btn = styled.button`
  background: none;
  border: 1px solid ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary};
  border-radius: ${p => p.theme.radius.sm};
  padding: 3px 8px;
  font-size: 10px;
  cursor: pointer;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const QueueLabel = styled.span`
  color: ${p => p.theme.text.tertiary};
  flex-shrink: 0;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 4px;
  flex: 1;
  overflow: hidden;
`;

const MoreLabel = styled.span`
  opacity: 0.6;
  font-size: 10px;
  padding: 1px 4px;
`;

export default function ClipboardQueue() {
  const { clipboardQueue, clipboardMode, removeFromClipboard, clearClipboard, pasteClipboard, activePane, getActivePath } = useStore();

  if (clipboardQueue.length === 0) return null;

  const activePanePath = activePane ? getActivePath(activePane) : null;

  return (
    <Bar>
      <QueueLabel>
        {clipboardMode === 'cut' ? '✂️' : '📋'} Queue ({clipboardQueue.length}):
      </QueueLabel>
      <ChipRow>
        {clipboardQueue.slice(0, 6).map(fp => (
          <FileChip key={fp} cut={clipboardMode === 'cut'} onClick={() => removeFromClipboard(fp)} title={fp}>
            {fp.split('/').pop()}
          </FileChip>
        ))}
        {clipboardQueue.length > 6 && (
          <MoreLabel>+{clipboardQueue.length - 6} more</MoreLabel>
        )}
      </ChipRow>
      {activePanePath && (
        <Btn onClick={() => pasteClipboard(activePanePath)}>
          Paste here
        </Btn>
      )}
      <Btn onClick={clearClipboard}>Clear</Btn>
    </Bar>
  );
}
