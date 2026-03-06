import React, { useState, useEffect } from 'react';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Select, Label, Row } from './BatchRenameModal';
import styled from 'styled-components';

const RuleCard = styled.div`
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  padding: 12px 14px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: ${p => p.theme.border.strong}; }
`;

const Toggle = styled.label`
  position: relative;
  width: 30px;
  height: 16px;
  display: inline-block;
  flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
  span {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: ${p => p.checked ? p.theme.accent.blue : p.theme.bg.active};
    border-radius: 8px;
    transition: 0.2s;
    &:before {
      content: '';
      position: absolute;
      height: 12px; width: 12px;
      left: ${p => p.checked ? '16px' : '2px'};
      bottom: 2px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }
  }
`;

const ConditionRow = styled.div`
  display: grid;
  grid-template-columns: 140px 120px 1fr 28px;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
`;

const ActionRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr 28px;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
`;

const DelBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 13px;
  width: 24px; height: 24px;
  border-radius: 4px;
  &:hover { color: ${p => p.theme.text.error}; background: ${p => p.theme.bg.hover}; }
`;

const AddBtn = styled.button`
  background: none;
  border: 1px dashed ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary};
  font-size: 11px;
  padding: 4px 10px;
  border-radius: ${p => p.theme.radius.sm};
  cursor: pointer;
  &:hover { border-color: ${p => p.theme.accent.blue}; color: ${p => p.theme.accent.blue}; }
`;

const CONDITION_FIELDS = ['filename_contains', 'extension_is', 'size_gt', 'size_lt', 'date_before', 'date_after', 'name_starts_with', 'name_ends_with'];
const ACTION_TYPES = ['move_to', 'rename', 'tag', 'zip'];

const defaultRule = () => ({
  id: null,
  name: 'New Rule',
  enabled: true,
  conditions: [{ field: 'extension_is', operator: 'is', value: '' }],
  actions: [{ type: 'move_to', value: '' }],
  watchPath: '',
  scheduleInterval: 0,
});

export default function RulesModal({ onClose }) {
  const [rules, setRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(null);

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    const r = await window.electronAPI.getRules();
    if (r.success) setRules(r.rules);
  };

  const saveRule = async (rule) => {
    setLoading(true);
    const r = await window.electronAPI.saveRule(rule);
    if (r.success) {
      await loadRules();
      setEditingRule(null);
    }
    setLoading(false);
  };

  const deleteRule = async (id) => {
    await window.electronAPI.deleteRule(id);
    await loadRules();
    setEditingRule(null);
  };

  const runRule = async (id) => {
    setRunning(id);
    await window.electronAPI.runRule(id);
    setRunning(null);
  };

  const addCondition = () => {
    setEditingRule(r => ({ ...r, conditions: [...r.conditions, { field: 'extension_is', operator: 'is', value: '' }] }));
  };

  const addAction = () => {
    setEditingRule(r => ({ ...r, actions: [...r.actions, { type: 'move_to', value: '' }] }));
  };

  const updateCondition = (i, key, val) => {
    setEditingRule(r => {
      const c = [...r.conditions];
      c[i] = { ...c[i], [key]: val };
      return { ...r, conditions: c };
    });
  };

  const updateAction = (i, key, val) => {
    setEditingRule(r => {
      const a = [...r.actions];
      a[i] = { ...a[i], [key]: val };
      return { ...r, actions: a };
    });
  };

  const removeCondition = (i) => setEditingRule(r => ({ ...r, conditions: r.conditions.filter((_, ci) => ci !== i) }));
  const removeAction = (i) => setEditingRule(r => ({ ...r, actions: r.actions.filter((_, ai) => ai !== i) }));

  const choosePath = async (field) => {
    const r = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
    if (!r.canceled && r.filePaths[0]) {
      setEditingRule(prev => ({ ...prev, [field]: r.filePaths[0] }));
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="720px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>⚡ Auto-Organisation Rules</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        {!editingRule ? (
          <>
            <ModalBody>
              {rules.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a5a6b', fontSize: 12 }}>
                  No rules yet. Create one to auto-organise files.
                </div>
              )}
              {rules.map(rule => (
                <RuleCard key={rule.id} onClick={() => setEditingRule({ ...rule })}>
                  <Toggle checked={rule.enabled} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={rule.enabled} onChange={async e => {
                      await window.electronAPI.saveRule({ ...rule, enabled: e.target.checked });
                      await loadRules();
                    }} />
                    <span />
                  </Toggle>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e8e8ed', marginBottom: 2 }}>{rule.name}</div>
                    <div style={{ fontSize: 10, color: '#5a5a6b' }}>
                      {rule.conditions?.length || 0} condition{rule.conditions?.length !== 1 ? 's' : ''} · {rule.actions?.length || 0} action{rule.actions?.length !== 1 ? 's' : ''}
                      {rule.watch_path && ` · watching ${rule.watch_path.split('/').pop()}`}
                    </div>
                  </div>
                  <Btn onClick={e => { e.stopPropagation(); runRule(rule.id); }} disabled={running === rule.id}>
                    {running === rule.id ? '⏳' : '▶ Run'}
                  </Btn>
                  <Btn onClick={e => { e.stopPropagation(); deleteRule(rule.id); }}>🗑️</Btn>
                </RuleCard>
              ))}
            </ModalBody>
            <ModalFooter>
              <Btn onClick={onClose}>Close</Btn>
              <Btn primary onClick={() => setEditingRule(defaultRule())}>+ New Rule</Btn>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalBody>
              <div style={{ marginBottom: 14 }}>
                <Label>Rule Name</Label>
                <Input value={editingRule.name} onChange={e => setEditingRule(r => ({ ...r, name: e.target.value }))} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5a5a6b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  CONDITIONS (IF)
                </div>
                {editingRule.conditions.map((cond, i) => (
                  <ConditionRow key={i}>
                    <Select value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)}>
                      {CONDITION_FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                    </Select>
                    <Input value={cond.operator || 'is'} onChange={e => updateCondition(i, 'operator', e.target.value)} placeholder="is" />
                    <Input value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="value..." />
                    <DelBtn onClick={() => removeCondition(i)}>✕</DelBtn>
                  </ConditionRow>
                ))}
                <AddBtn onClick={addCondition}>+ Add Condition</AddBtn>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5a5a6b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  ACTIONS (THEN)
                </div>
                {editingRule.actions.map((action, i) => (
                  <ActionRow key={i}>
                    <Select value={action.type} onChange={e => updateAction(i, 'type', e.target.value)}>
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </Select>
                    <Row>
                      <Input value={action.value} onChange={e => updateAction(i, 'value', e.target.value)} placeholder={action.type === 'move_to' ? 'Destination folder...' : 'Value...'} />
                      {action.type === 'move_to' && (
                        <Btn onClick={async () => {
                          const r = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
                          if (!r.canceled && r.filePaths[0]) updateAction(i, 'value', r.filePaths[0]);
                        }}>Browse</Btn>
                      )}
                    </Row>
                    <DelBtn onClick={() => removeAction(i)}>✕</DelBtn>
                  </ActionRow>
                ))}
                <AddBtn onClick={addAction}>+ Add Action</AddBtn>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5a5a6b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  WATCH SETTINGS
                </div>
                <Row align="flex-end">
                  <div style={{ flex: 1 }}>
                    <Label>Watch Folder (optional)</Label>
                    <Row>
                      <Input value={editingRule.watchPath || ''} onChange={e => setEditingRule(r => ({ ...r, watchPath: e.target.value }))} placeholder="Folder to monitor..." />
                      <Btn onClick={() => choosePath('watchPath')}>Browse</Btn>
                    </Row>
                  </div>
                  <div>
                    <Label>Run every (minutes, 0=manual)</Label>
                    <Input type="number" min={0} value={editingRule.scheduleInterval || 0} onChange={e => setEditingRule(r => ({ ...r, scheduleInterval: +e.target.value }))} width="80px" />
                  </div>
                </Row>
              </div>
            </ModalBody>
            <ModalFooter>
              {editingRule.id && (
                <Btn onClick={() => deleteRule(editingRule.id)} style={{ marginRight: 'auto', color: '#f87171' }}>
                  Delete Rule
                </Btn>
              )}
              <Btn onClick={() => setEditingRule(null)}>Back</Btn>
              <Btn primary disabled={loading} onClick={() => saveRule(editingRule)}>
                {loading ? 'Saving...' : 'Save Rule'}
              </Btn>
            </ModalFooter>
          </>
        )}
      </ModalBox>
    </Overlay>
  );
}