import React, { useState, useEffect } from 'react';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Select } from './ModalPrimitives';

export function ActivityLogModal({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { loadLogs(); }, []);
  useEffect(() => { loadLogs(); }, [search, filter]);

  const loadLogs = async () => {
    const r = await window.electronAPI.getLog({ search, actionType: filter });
    if (r.success) setLogs(r.logs);
  };

  const ACTION_ICONS = {
    rename: '✏️', move: '📦', copy: '📋', delete: '🗑️', edit: '📝',
    mkdir: '📁', batch_rename: '✏️✏️', chmod: '🔒', zip: '📦', unzip: '📂',
    move_duplicates: '🔁', undo: '↩️', rule_trigger: '⚡',
  };

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="700px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📋 Activity Log</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="12px">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search logs..." style={{ flex: 1 }} />
            <Select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All actions</option>
              {Object.keys(ACTION_ICONS).map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Btn onClick={async () => { await window.electronAPI.clearLog(); loadLogs(); }}>Clear</Btn>
          </div>
          {logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#5a5a6b', fontSize: 12 }}>No log entries</div>
          )}
          {logs.map(log => {
            const files = log.files_json ? JSON.parse(log.files_json) : [];
            return (
              <div key={log.id} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid #222', fontSize: 11 }}>
                <span style={{ flexShrink: 0, fontSize: 14 }}>{ACTION_ICONS[log.action_type] || '•'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e8e8ed', marginBottom: 2 }}>{log.description}</div>
                  {log.source && <div style={{ color: '#5a5a6b', fontFamily: 'monospace', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.source}{log.destination ? ` → ${log.destination}` : ''}
                  </div>}
                  {files.length > 0 && <div style={{ color: '#5a5a6b', fontSize: 10 }}>{files.length} file{files.length > 1 ? 's' : ''}</div>}
                </div>
                <div style={{ color: '#5a5a6b', fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            );
          })}
        </ModalBody>
        <ModalFooter>
          <span style={{ fontSize: 11, color: '#5a5a6b', marginRight: 'auto' }}>{logs.length} entries</span>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ResizableModalBox>
    </Overlay>
  );
}
