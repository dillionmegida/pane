import React from 'react';
import styled from 'styled-components';
import { useStore } from '../store/index';

const Bar = styled.div`
  height: ${p => p.theme.titleBar};
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  display: flex;
  align-items: center;
  padding: 0 16px 0 80px;
  -webkit-app-region: drag;
  flex-shrink: 0;
  gap: 6px;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  -webkit-app-region: no-drag;
  margin-left: auto;
`;

const Btn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  &.active { color: ${p => p.theme.accent.blue}; }
`;

export default function TitleBar() {
  const { openModal } = useStore();

  return (
    <Bar>
      <Actions>
        <Btn onClick={() => openModal('settings')} title="Settings">
          ⚙️
        </Btn>
      </Actions>
    </Bar>
  );
}
