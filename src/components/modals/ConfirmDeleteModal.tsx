import React from 'react';
import { ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn } from './ModalPrimitives';
import styled from 'styled-components';

const SubtleOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(2px);
`;

const WarningIcon = styled.div`
  font-size: 36px;
  text-align: center;
  margin-bottom: 12px;
`;

const Message = styled.p`
  font-size: 12px;
  color: ${p => p.theme.text.primary};
  text-align: center;
  margin-bottom: 8px;
  line-height: 1.5;
`;

const FileList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.subtle};
  border-radius: ${p => p.theme.radius.sm};
  padding: 8px;
  margin-top: 12px;
`;

const FileItem = styled.div`
  font-size: 11px;
  color: ${p => p.theme.text.secondary};
  font-family: ${p => p.theme.font.mono};
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const DangerBtn = styled(Btn)`
  background: ${p => p.theme.accent.red || '#e74c3c'};
  border-color: ${p => p.theme.accent.red || '#e74c3c'};
  color: #fff;
  &:hover {
    opacity: 0.85;
  }
`;

interface ConfirmDeleteModalProps {
  data: {
    files: string[];
    onConfirm: () => void;
  };
  onClose: () => void;
}

export default function ConfirmDeleteModal({ data, onClose }: ConfirmDeleteModalProps) {
  const { files, onConfirm } = data;
  const count = files.length;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <SubtleOverlay onClick={handleOverlayClick}>
      <ModalBox width="400px">
        <ModalHeader>
          <ModalTitle>Confirm Delete</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <WarningIcon>⚠️</WarningIcon>
          <Message>
            {count === 1
              ? 'Are you sure you want to delete this item?'
              : `Are you sure you want to delete ${count} items?`}
          </Message>
          <Message style={{ fontSize: '10px', color: '#888', marginBottom: '12px' }}>
            This action cannot be undone.
          </Message>
          {files.length <= 10 && (
            <FileList>
              {files.map((file, idx) => (
                <FileItem key={idx}>{file.split('/').pop()}</FileItem>
              ))}
            </FileList>
          )}
          {files.length > 10 && (
            <FileList>
              {files.slice(0, 10).map((file, idx) => (
                <FileItem key={idx}>{file.split('/').pop()}</FileItem>
              ))}
              <FileItem style={{ fontStyle: 'italic', color: '#666' }}>
                ... and {files.length - 10} more
              </FileItem>
            </FileList>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn onClick={onClose}>Cancel</Btn>
          <DangerBtn onClick={handleConfirm}>Delete</DangerBtn>
        </ModalFooter>
      </ModalBox>
    </SubtleOverlay>
  );
}
