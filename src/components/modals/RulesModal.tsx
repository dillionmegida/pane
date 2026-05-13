import React, { useState, useEffect } from 'react';
import { Overlay, ResizableModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Select, Label, Row } from './ModalPrimitives';
import styled from 'styled-components';

const RuleCard = styled.div`
  background: ${p => p.theme.bg.elevated}; border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md}; padding: 12px 14px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 10px; cursor: pointer; transition: border-color 0.15s;
  &:hover { border-color: ${p => p.theme.border.strong}; }
`;

const Toggle = styled.label<{ checked?: boolean }>`
  position: relative; width: 30px; height: 16px; display: inline-block; flex-shrink: 0;
  input { opacity: 0; width: 0; height: 0; }
  span {
    position: absolute; cursor: pointer; inset: 0;
    background: ${p => p.checked ? p.theme.accent.blue : p.theme.bg.active};
    border-radius: 8px; transition: 0.2s;
    &:before {
      content: ''; position: absolute; height: 12px; width: 12px;
      left: ${p => p.checked ? '16px' : '2px'}; bottom: 2px;
      background: white; border-radius: 50%; transition: 0.2s;
    }
  }
`;

const ConditionRow = styled.div`
  display: grid; grid-template-columns: 140px 120px 1fr 28px;
  gap: 6px; align-items: center; margin-bottom: 6px;
`;

const ActionRow = styled.div`
  display: grid; grid-template-columns: 140px 1fr 28px;
  gap: 6px; align-items: center; margin-bottom: 6px;
`;

const DelBtn = styled.button`
  background: none; border: none; color: ${p => p.theme.text.tertiary}; cursor: pointer;
  font-size: 13px; width: 24px; height: 24px; border-radius: 4px;
  &:hover { color: ${p => p.theme.text.error}; background: ${p => p.theme.bg.hover}; }
`;

const AddBtn = styled.button`
  background: none; border: 1px dashed ${p => p.theme.border.normal};
  color: ${p => p.theme.text.secondary}; font-size: 11px;
  padding: 4px 10px; border-radius: ${p => p.theme.radius.sm}; cursor: pointer;
  &:hover { border-color: ${p => p.theme.accent.blue}; color: ${p => p.theme.accent.blue}; }
`;

const EmptyRules = styled.div`
  text-align: center;
  padding: 40px 0;
  color: #5a5a6b;
  font-size: 12px;
`;

const RuleInfo = styled.div`
  flex: 1;
`;

const RuleName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #e8e8ed;
  margin-bottom: 2px;
`;

const RuleMeta = styled.div`
  font-size: 10px;
  color: #5a5a6b;
`;

const FormSection = styled.div`
  margin-bottom: 14px;
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #5a5a6b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
`;

const WatchField = styled.div`
  flex: 1;
`;

const DeleteRuleBtn = styled(Btn)`
  margin-right: auto;
  color: #f87171;
`;

const CONDITION_FIELDS = ['filename_contains', 'extension_is', 'size_gt', 'size_lt', 'date_before', 'date_after', 'name_starts_with', 'name_ends_with'];
const ACTION_TYPES = ['move_to', 'rename', 'tag', 'zip'];

interface RuleCondition {
  field: string;
  operator: string;
  value: string;
}

interface RuleAction {
  type: string;
  value: string;
}

interface Rule {
  id: number | null;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  watchPath: string;
  watch_path?: string;
  scheduleInterval: number;
}

const defaultRule = (): Rule => ({
  id: null,
  name: 'New Rule',
  enabled: true,
  conditions: [{ field: 'extension_is', operator: 'is', value: '' }],
  actions: [{ type: 'move_to', value: '' }],
  watchPath: '',
  scheduleInterval: 0,
});

interface RulesModalProps {
  onClose: () => void;
}

export default function RulesModal({ onClose }: RulesModalProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<number | null>(null);

  useEffect(() => { loadRules(); }, []);

  const loadRules = async () => {
    const r = await (window.electronAPI as unknown as { getRules: () => Promise<{ success: boolean; rules: Rule[] }> }).getRules();
    if (r.success) setRules(r.rules);
  };

  const saveRule = async (rule: Rule) => {
    setLoading(true);
    const r = await (window.electronAPI as unknown as { saveRule: (rule: Rule) => Promise<{ success: boolean }> }).saveRule(rule);
    if (r.success) { await loadRules(); setEditingRule(null); }
    setLoading(false);
  };

  const deleteRule = async (id: number | null) => {
    if (id == null) return;
    await (window.electronAPI as unknown as { deleteRule: (id: number) => Promise<void> }).deleteRule(id);
    await loadRules();
    setEditingRule(null);
  };

  const runRule = async (id: number | null) => {
    if (id == null) return;
    setRunning(id);
    await (window.electronAPI as unknown as { runRule: (id: number) => Promise<void> }).runRule(id);
    setRunning(null);
  };

  const addCondition = () => {
    setEditingRule(r => r ? { ...r, conditions: [...r.conditions, { field: 'extension_is', operator: 'is', value: '' }] } : r);
  };

  const addAction = () => {
    setEditingRule(r => r ? { ...r, actions: [...r.actions, { type: 'move_to', value: '' }] } : r);
  };

  const updateCondition = (i: number, key: string, val: string) => {
    setEditingRule(r => {
      if (!r) return r;
      const c = [...r.conditions];
      c[i] = { ...c[i], [key]: val };
      return { ...r, conditions: c };
    });
  };

  const updateAction = (i: number, key: string, val: string) => {
    setEditingRule(r => {
      if (!r) return r;
      const a = [...r.actions];
      a[i] = { ...a[i], [key]: val };
      return { ...r, actions: a };
    });
  };

  const removeCondition = (i: number) => setEditingRule(r => r ? { ...r, conditions: r.conditions.filter((_, ci) => ci !== i) } : r);
  const removeAction = (i: number) => setEditingRule(r => r ? { ...r, actions: r.actions.filter((_, ai) => ai !== i) } : r);

  const choosePath = async (field: keyof Rule) => {
    const r = await (window.electronAPI as unknown as { showOpenDialog: (opts: object) => Promise<{ canceled: boolean; filePaths: string[] }> })
      .showOpenDialog({ properties: ['openDirectory'] });
    if (!r.canceled && r.filePaths[0]) {
      setEditingRule(prev => prev ? { ...prev, [field]: r.filePaths[0] } : prev);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ResizableModalBox width="720px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Auto-Organisation Rules</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        {!editingRule ? (
          <>
            <ModalBody>
              {rules.length === 0 && (
                <EmptyRules>
                  No rules yet. Create one to auto-organise files.
                </EmptyRules>
              )}
              {rules.map(rule => (
                <RuleCard key={rule.id} onClick={() => setEditingRule({ ...rule })}>
                  <Toggle checked={rule.enabled} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <input type="checkbox" checked={rule.enabled} onChange={async e => {
                      await (window.electronAPI as unknown as { saveRule: (r: Rule) => Promise<void> }).saveRule({ ...rule, enabled: e.target.checked });
                      await loadRules();
                    }} />
                    <span />
                  </Toggle>
                  <RuleInfo>
                    <RuleName>{rule.name}</RuleName>
                    <RuleMeta>
                      {rule.conditions?.length || 0} condition{rule.conditions?.length !== 1 ? 's' : ''} · {rule.actions?.length || 0} action{rule.actions?.length !== 1 ? 's' : ''}
                      {rule.watch_path && ` · watching ${rule.watch_path.split('/').pop()}`}
                    </RuleMeta>
                  </RuleInfo>
                  <Btn onClick={(e: React.MouseEvent) => { e.stopPropagation(); runRule(rule.id); }} disabled={running === rule.id}>
                    {running === rule.id ? '⏳' : '▶ Run'}
                  </Btn>
                  <Btn onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteRule(rule.id); }}>🗑️</Btn>
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
              <FormSection>
                <Label>Rule Name</Label>
                <Input value={editingRule.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRule(r => r ? { ...r, name: e.target.value } : r)} />
              </FormSection>

              <FormSection>
                <SectionLabel>CONDITIONS (IF)</SectionLabel>
                {editingRule.conditions.map((cond, i) => (
                  <ConditionRow key={i}>
                    <Select value={cond.field} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateCondition(i, 'field', e.target.value)}>
                      {CONDITION_FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                    </Select>
                    <Input value={cond.operator || 'is'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(i, 'operator', e.target.value)} placeholder="is" />
                    <Input value={cond.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(i, 'value', e.target.value)} placeholder="value..." />
                    <DelBtn onClick={() => removeCondition(i)}>✕</DelBtn>
                  </ConditionRow>
                ))}
                <AddBtn onClick={addCondition}>+ Add Condition</AddBtn>
              </FormSection>

              <FormSection>
                <SectionLabel>ACTIONS (THEN)</SectionLabel>
                {editingRule.actions.map((action, i) => (
                  <ActionRow key={i}>
                    <Select value={action.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateAction(i, 'type', e.target.value)}>
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </Select>
                    <Row>
                      <Input value={action.value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAction(i, 'value', e.target.value)} placeholder={action.type === 'move_to' ? 'Destination folder...' : 'Value...'} />
                      {action.type === 'move_to' && (
                        <Btn onClick={async () => {
                          const r = await (window.electronAPI as unknown as { showOpenDialog: (o: object) => Promise<{ canceled: boolean; filePaths: string[] }> }).showOpenDialog({ properties: ['openDirectory'] });
                          if (!r.canceled && r.filePaths[0]) updateAction(i, 'value', r.filePaths[0]);
                        }}>Browse</Btn>
                      )}
                    </Row>
                    <DelBtn onClick={() => removeAction(i)}>✕</DelBtn>
                  </ActionRow>
                ))}
                <AddBtn onClick={addAction}>+ Add Action</AddBtn>
              </FormSection>

              <div>
                <SectionLabel>WATCH SETTINGS</SectionLabel>
                <Row align="flex-end">
                  <WatchField>
                    <Label>Watch Folder (optional)</Label>
                    <Row>
                      <Input value={editingRule.watchPath || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRule(r => r ? { ...r, watchPath: e.target.value } : r)} placeholder="Folder to monitor..." />
                      <Btn onClick={() => choosePath('watchPath')}>Browse</Btn>
                    </Row>
                  </WatchField>
                  <div>
                    <Label>Run every (minutes, 0=manual)</Label>
                    <Input type="number" min={0} value={editingRule.scheduleInterval || 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingRule(r => r ? { ...r, scheduleInterval: +e.target.value } : r)} width="80px" />
                  </div>
                </Row>
              </div>
            </ModalBody>
            <ModalFooter>
              {editingRule.id && (
                <DeleteRuleBtn onClick={() => deleteRule(editingRule.id)}>
                  Delete Rule
                </DeleteRuleBtn>
              )}
              <Btn onClick={() => setEditingRule(null)}>Back</Btn>
              <Btn primary disabled={loading} onClick={() => saveRule(editingRule)}>
                {loading ? 'Saving...' : 'Save Rule'}
              </Btn>
            </ModalFooter>
          </>
        )}
      </ResizableModalBox>
    </Overlay>
  );
}
