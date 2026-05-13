import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Select } from './ModalPrimitives';
import type { LogEntry } from '../../types';

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
`;

const SearchInput = styled(Input)`
  flex: 1;
`;

const EmptyLogs = styled.div`
  text-align: center;
  padding: 40px;
  color: #5a5a6b;
  font-size: 12px;
`;

const LogRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid #222;
  font-size: 11px;
`;

const LogIcon = styled.span`
  flex-shrink: 0;
  font-size: 14px;
`;

const LogContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const LogDesc = styled.div`
  color: #e8e8ed;
  margin-bottom: 2px;
`;

const LogSource = styled.div`
  color: #5a5a6b;
  font-family: monospace;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LogFileCount = styled.div`
  color: #5a5a6b;
  font-size: 10px;
`;

const LogTimestamp = styled.div`
  color: #5a5a6b;
  font-size: 10px;
  flex-shrink: 0;
  white-space: nowrap;
`;

const FooterCount = styled.span`
  font-size: 11px;
  color: #5a5a6b;
  margin-right: auto;
`;

interface ActivityLogModalProps {
  onClose: () => void;
}

const ACTION_ICONS: Record<string, string> = {
  rename: '✏️', move: '📦', copy: '📋', delete: '🗑️', edit: '📝',
  mkdir: '📁', batch_rename: '✏️✏️', chmod: '🔒', zip: '📦', unzip: '📂',
  move_duplicates: '🔁', undo: '↩️', rule_trigger: '⚡',
};

export function ActivityLogModal({ onClose }: ActivityLogModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const loadLogs = async () => {
    const r = await window.electronAPI.getLog({ search, actionType: filter });
    if (r.success) setLogs(r.logs as LogEntry[]);
  };

  useEffect(() => { loadLogs(); }, []);
  useEffect(() => { loadLogs(); }, [search, filter]);

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="700px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📋 Activity Log</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="12px">
          <FilterRow>
            <SearchInput value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="🔍 Search logs..." />
            <Select value={filter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}>
              <option value="">All actions</option>
              {Object.keys(ACTION_ICONS).map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Btn onClick={async () => { await window.electronAPI.clearLog(); loadLogs(); }}>Clear</Btn>
          </FilterRow>
          {logs.length === 0 && (
            <EmptyLogs>No log entries</EmptyLogs>
          )}
          {logs.map(log => {
            const files: string[] = log.files_json ? JSON.parse(log.files_json) : [];
            return (
              <LogRow key={log.id}>
                <LogIcon>{ACTION_ICONS[log.action] || '•'}</LogIcon>
                <LogContent>
                  <LogDesc>{log.description}</LogDesc>
                  {log.source && (
                    <LogSource>
                      {log.source}{log.destination ? ` → ${log.destination}` : ''}
                    </LogSource>
                  )}
                  {files.length > 0 && <LogFileCount>{files.length} file{files.length > 1 ? 's' : ''}</LogFileCount>}
                </LogContent>
                <LogTimestamp>
                  {new Date(log.timestamp).toLocaleString()}
                </LogTimestamp>
              </LogRow>
            );
          })}
        </ModalBody>
        <ModalFooter>
          <FooterCount>{logs.length} entries</FooterCount>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
