import React from 'react';
import styled from 'styled-components';

// ─── Shared Modal Primitives ─────────────────────────────────────────────────
const OverlayBase = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
`;

export const Overlay = React.forwardRef(({ children, ...props }, ref) => (
  <OverlayBase
    ref={ref}
    onKeyDown={e => e.stopPropagation()}
    onKeyUp={e => e.stopPropagation()}
    {...props}
  >
    {children}
  </OverlayBase>
));

export const ModalBox = styled.div`
  background: ${p => p.theme.bg.secondary};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.xl};
  box-shadow: ${p => p.theme.shadow.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: ${p => p.width || '700px'};
  height: ${p => p.height || 'auto'};
  max-width: 90vw;
  max-height: 80vh;
`;

export const ResizableModalBox = ({ children, width: initialWidth = '700px', height: initialHeight = 'auto', minWidth = 300, minHeight = 200, ...props }) => {
  return (
    <ModalBox
      width={initialWidth}
      height={initialHeight}
      style={{
        resize: 'both',
        overflow: 'auto',
        minWidth: `${minWidth}px`,
        minHeight: `${minHeight}px`
      }}
      {...props}
    >
      {children}
    </ModalBox>
  );
};

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

export const ModalTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.text.primary};
`;

export const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${p => p.pad || '16px'};
`;

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

export const Btn = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'primary'
})`
  padding: 6px 16px;
  border-radius: ${p => p.theme.radius.md};
  border: 1px solid ${p => p.primary ? p.theme.accent.blue : p.theme.border.normal};
  background: ${p => p.primary ? p.theme.accent.blue : p.theme.bg.elevated};
  color: ${p => p.primary ? '#fff' : p.theme.text.primary};
  cursor: pointer;
  font-size: 12px;
  font-weight: ${p => p.primary ? 600 : 400};
  transition: all 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: default; }
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 16px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  margin-left: auto;
  justify-content: center;
  border-radius: ${p => p.theme.radius.sm};
  &:hover { color: ${p => p.theme.text.primary}; background: ${p => p.theme.bg.hover}; }
`;

export const Input = styled.input`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary};
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;

export const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  margin-bottom: 4px;
`;

export const Row = styled.div`
  display: flex;
  gap: ${p => p.gap || '8px'};
  align-items: ${p => p.align || 'center'};
  margin-bottom: ${p => p.mb || '12px'};
`;

export const Select = styled.select`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary};
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;
