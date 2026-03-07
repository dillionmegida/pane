import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Overlay, ModalBox, ModalHeader, ModalTitle, ModalBody, ModalFooter, Btn, CloseBtn, Input, Label, Row, Select } from './BatchRenameModal';
import { useStore, formatSize, formatDate } from '../../store';
import { TAG_COLORS } from '../../theme';

// ─── DUPLICATES MODAL ─────────────────────────────────────────────────────────
export function DuplicatesModal({ data, onClose }) {
  const { panes, activePane } = useStore();
  const pane = panes.find(p => p.id === activePane);
  const [scanPath, setScanPath] = useState(data?.path || pane?.path || '');
  const [results, setResults] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [moving, setMoving] = useState(false);

  const scan = async () => {
    if (!scanPath) return;
    setScanning(true);
    setResults(null);
    setSelected(new Set());
    const r = await window.electronAPI.findDuplicates(scanPath);
    setResults(r);
    setScanning(false);
  };

  const toggleSelect = (path) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  };

  const moveSelected = async () => {
    if (!selected.size) return;
    setMoving(true);
    await window.electronAPI.moveDuplicates({ files: [...selected], baseDir: scanPath });
    setMoving(false);
    await scan();
  };

  const allGroups = results ? [...(results.exact || []), ...(results.near || [])] : [];
  const totalFiles = allGroups.reduce((s, g) => s + g.files.length, 0);

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="680px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔁 Duplicate Detector</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <Row style={{ marginBottom: 12 }}>
            <Input value={scanPath} onChange={e => setScanPath(e.target.value)} placeholder="Folder to scan..." style={{ flex: 1 }} />
            <Btn onClick={async () => {
              const r = await window.electronAPI.showOpenDialog({ properties: ['openDirectory'] });
              if (!r.canceled) setScanPath(r.filePaths[0]);
            }}>Browse</Btn>
            <Btn primary onClick={scan} disabled={scanning || !scanPath}>
              {scanning ? '⏳ Scanning...' : '🔍 Scan'}
            </Btn>
          </Row>

          {results && (
            <>
              <div style={{ marginBottom: 8, fontSize: 11, color: '#9898a8' }}>
                Found {allGroups.length} duplicate group{allGroups.length !== 1 ? 's' : ''} ({totalFiles} files)
              </div>
              {allGroups.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 12, border: '1px solid #2e2e35', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', background: '#1e1e22', fontSize: 10, color: '#5a5a6b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{group.type === 'exact' ? '🔴 Exact duplicate' : '🟡 Near duplicate'} · {group.files.length} files</span>
                    <span style={{ color: '#4A9EFF', cursor: 'pointer' }} onClick={() => {
                      const paths = group.files.slice(1).map(f => f.path);
                      setSelected(s => {
                        const n = new Set(s);
                        paths.forEach(p => n.add(p));
                        return n;
                      });
                    }}>Select dupes</span>
                  </div>
                  {group.files.map((file, fi) => (
                    <div key={file.path} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 12px', fontSize: 11,
                      background: fi === 0 ? 'transparent' : (selected.has(file.path) ? '#1a3a5c' : 'transparent'),
                      borderTop: fi > 0 ? '1px solid #222' : 'none',
                    }}>
                      {fi > 0 && (
                        <input type="checkbox" checked={selected.has(file.path)} onChange={() => toggleSelect(file.path)} />
                      )}
                      {fi === 0 && <span style={{ width: 13, flexShrink: 0 }}>✅</span>}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: fi === 0 ? '#34d399' : '#e8e8ed', fontFamily: 'monospace' }}>{file.path}</span>
                      <span style={{ color: '#5a5a6b', fontFamily: 'monospace' }}>{formatSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {allGroups.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#34d399' }}>✅ No duplicates found!</div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {selected.size > 0 && (
            <span style={{ fontSize: 11, color: '#f5a623', marginRight: 'auto' }}>
              {selected.size} files selected → will move to /Duplicates (never deletes)
            </span>
          )}
          <Btn onClick={onClose}>Close</Btn>
          {selected.size > 0 && (
            <Btn primary disabled={moving} onClick={moveSelected}>
              {moving ? 'Moving...' : `Move ${selected.size} to /Duplicates`}
            </Btn>
          )}
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}

// ─── ACTIVITY LOG MODAL ───────────────────────────────────────────────────────
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
      <ModalBox width="700px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>📋 Activity Log</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="12px">
          <Row style={{ marginBottom: 10 }}>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search logs..." style={{ flex: 1 }} />
            <Select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">All actions</option>
              {Object.keys(ACTION_ICONS).map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Btn onClick={async () => { await window.electronAPI.clearLog(); loadLogs(); }}>Clear</Btn>
          </Row>
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
      </ModalBox>
    </Overlay>
  );
}

// ─── PERMISSIONS MODAL ────────────────────────────────────────────────────────
export function PermissionsModal({ data, onClose }) {
  const file = data?.file;
  const [perm, setPerm] = useState(file?.permissions?.octal || '644');
  const [saving, setSaving] = useState(false);

  if (!file) return null;

  const octalToRwx = (octal) => {
    const val = parseInt(octal, 8);
    const rwx = (n) => [(n & 4) ? 'r' : '-', (n & 2) ? 'w' : '-', (n & 1) ? 'x' : '-'].join('');
    return rwx((val >> 6) & 7) + rwx((val >> 3) & 7) + rwx(val & 7);
  };

  const toggleBit = (pos) => {
    const val = parseInt(perm, 8);
    const newVal = val ^ (1 << pos);
    setPerm(newVal.toString(8).padStart(3, '0'));
  };

  const save = async () => {
    setSaving(true);
    await window.electronAPI.chmod(file.path, perm);
    setSaving(false);
    onClose();
  };

  const bits = [
    { label: 'Owner Read', pos: 8 }, { label: 'Owner Write', pos: 7 }, { label: 'Owner Execute', pos: 6 },
    { label: 'Group Read', pos: 5 }, { label: 'Group Write', pos: 4 }, { label: 'Group Execute', pos: 3 },
    { label: 'Other Read', pos: 2 }, { label: 'Other Write', pos: 1 }, { label: 'Other Execute', pos: 0 },
  ];

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="400px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🔒 Permissions: {file.name}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <div style={{ fontFamily: 'monospace', fontSize: 24, textAlign: 'center', color: '#34d399', marginBottom: 16, letterSpacing: 4 }}>
            {octalToRwx(perm)} ({perm})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
            {bits.map(bit => {
              const val = parseInt(perm, 8);
              const on = !!(val & (1 << bit.pos));
              return (
                <label key={bit.label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: on ? '#e8e8ed' : '#5a5a6b' }}>
                  <input type="checkbox" checked={on} onChange={() => toggleBit(bit.pos)} />
                  {bit.label}
                </label>
              );
            })}
          </div>
          <Row>
            <Label style={{ margin: 0 }}>Octal:</Label>
            <Input value={perm} onChange={e => setPerm(e.target.value)} mono width="80px" />
          </Row>
        </ModalBody>
        <ModalFooter>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Apply chmod'}</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}

// ─── TAG MANAGER MODAL ────────────────────────────────────────────────────────
export function TagManagerModal({ data, onClose }) {
  const { loadAllTags } = useStore();
  const file = data?.file;
  const [existingTags, setExistingTags] = useState([]);
  const [fileTags, setFileTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [all, mine] = await Promise.all([
      window.electronAPI.getAllTags(),
      file ? window.electronAPI.getTags(file.path) : Promise.resolve({ tags: [] }),
    ]);
    if (all.success) setExistingTags(all.tags);
    if (mine.success) setFileTags(mine.tags.map(t => t.tag_name));
  };

  const addTag = async () => {
    if (!newTag.trim() || !file) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: newTag.trim(), color: selectedColor });
    setNewTag('');
    await loadData();
    loadAllTags();
  };

  const removeTag = async (tagName) => {
    if (!file) return;
    await window.electronAPI.removeTag({ filePath: file.path, tagName });
    await loadData();
    loadAllTags();
  };

  const quickAddTag = async (tag) => {
    if (!file || fileTags.includes(tag.tag_name)) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name, color: tag.color });
    await loadData();
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="420px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🏷️ Tags{file ? `: ${file.name}` : ''}</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          {file && (
            <>
              <Label>Current Tags</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, minHeight: 30 }}>
                {fileTags.length === 0 && <span style={{ color: '#5a5a6b', fontSize: 11 }}>No tags</span>}
                {fileTags.map(t => {
                  const tagInfo = existingTags.find(et => et.tag_name === t);
                  return (
                    <span key={t} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: (tagInfo?.color || '#4A9EFF') + '30',
                      border: `1px solid ${tagInfo?.color || '#4A9EFF'}`,
                      color: tagInfo?.color || '#4A9EFF',
                      borderRadius: 12, padding: '2px 8px', fontSize: 11,
                    }}>
                      {t}
                      <span style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => removeTag(t)}>✕</span>
                    </span>
                  );
                })}
              </div>

              <Label>Add Tag</Label>
              <Row style={{ marginBottom: 14 }}>
                <Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag name..." onKeyDown={e => e.key === 'Enter' && addTag()} style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: 3 }}>
                  {TAG_COLORS.slice(0, 6).map(c => (
                    <div key={c} onClick={() => setSelectedColor(c)} style={{
                      width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: selectedColor === c ? '2px solid white' : '2px solid transparent',
                    }} />
                  ))}
                </div>
                <Btn primary onClick={addTag} disabled={!newTag.trim()}>Add</Btn>
              </Row>
            </>
          )}

          {existingTags.length > 0 && (
            <>
              <Label>All Tags</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {existingTags.map(tag => (
                  <span key={tag.tag_name} onClick={() => file && quickAddTag(tag)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: tag.color + '20',
                    border: `1px solid ${tag.color}`,
                    color: tag.color,
                    borderRadius: 12, padding: '2px 8px', fontSize: 11,
                    cursor: file ? 'pointer' : 'default',
                    opacity: fileTags.includes(tag.tag_name) ? 0.4 : 1,
                  }}>
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}

// ─── SIZE VISUALIZER MODAL ────────────────────────────────────────────────────
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

// ─── SMART FOLDERS MODAL ──────────────────────────────────────────────────────
export function SmartFoldersModal({ data, onClose }) {
  const { panes, activePane, navigateTo, refreshPane } = useStore();
  const pane = panes.find(p => p.id === activePane);
  const [results, setResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState(data?.id || 'large');
  const [scanning, setScanning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewType, setPreviewType] = useState('text');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [largeFileSize, setLargeFileSize] = useState(100); // MB
  const [leftPaneWidth, setLeftPaneWidth] = useState(160);
  const [rightPaneWidth, setRightPaneWidth] = useState(300);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const containerRef = useRef(null);

  // Use breadcrumb path in column view, otherwise use regular path
  const currentPath = pane?.viewMode === 'column' ? pane?.currentBreadcrumbPath || pane?.path : pane?.path;

  const FILTERS = {
    large: { name: '⚖️ Large Files', icon: '⚖️', desc: `Files over ${largeFileSize}MB`, test: f => !f.isDirectory && f.size > largeFileSize * 1024 * 1024 },
    recent: { name: '⬇️ Recent Downloads', icon: '⬇️', desc: 'Modified in last 7 days', test: f => !f.isDirectory && Date.now() - new Date(f.modified).getTime() < 7 * 86400000 },
    empty: { name: '📭 Empty Folders', icon: '📭', desc: 'Folders with no files', test: f => f.isDirectory && f.size === 0 },
    old: { name: '🗓️ Old Files', icon: '🗓️', desc: 'Not accessed in over 1 year', test: f => !f.isDirectory && Date.now() - new Date(f.modified).getTime() > 365 * 86400000 },
  };

  const loadPreview = async (file) => {
    if (file.isDirectory) {
      setPreviewContent('');
      setPreviewType('text');
      return;
    }
    
    const textExts = ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'rb', 'sh', 'yaml', 'yml', 'xml', 'csv', 'log'];
    const videoExts = ['mp4', 'mov', 'webm'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    
    if (videoExts.includes(file.extension)) {
      setPreviewType('video');
      setPreviewContent(`file://${file.path}`);
      return;
    }
    
    if (audioExts.includes(file.extension)) {
      setPreviewType('audio');
      setPreviewContent(`file://${file.path}`);
      return;
    }
    
    if (imageExts.includes(file.extension)) {
      setPreviewType('image');
      setPreviewContent(`file://${file.path}`);
      return;
    }
    
    if (!textExts.includes(file.extension)) {
      setPreviewContent('Preview not available for this file type');
      setPreviewType('text');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPreviewContent('File too large for preview');
      setPreviewType('text');
      return;
    }
    setLoadingPreview(true);
    setPreviewType('text');
    try {
      const r = await window.electronAPI.readFile(file.path);
      if (r.success) {
        setPreviewContent(r.content.slice(0, 1000) + (r.content.length > 1000 ? '\n\n... (truncated)' : ''));
      } else {
        setPreviewContent('Failed to load preview');
      }
    } catch (err) {
      setPreviewContent('Failed to load preview');
    }
    setLoadingPreview(false);
  };

  // Handle left pane resize
  useEffect(() => {
    if (!isResizingLeft) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      if (newWidth >= 100 && newWidth <= 300) {
        setLeftPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft]);

  // Handle right pane resize
  useEffect(() => {
    if (!isResizingRight) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setRightPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingRight]);

  useEffect(() => { if (currentPath) runFilter(); }, [activeFilter, currentPath, largeFileSize]);

  useEffect(() => {
    if (selectedItem) {
      loadPreview(selectedItem);
    }
  }, [selectedItem]);

  const runFilter = async () => {
    if (!currentPath) return;
    setScanning(true);
    setResults([]);
    
    try {
      // Set up event listeners for search results
      const searchId = Date.now();
      const allResults = [];
      
      const handleComplete = (data) => {
        if (data.searchId === searchId) {
          const filter = FILTERS[activeFilter];
          let filteredResults = data.results.filter(filter.test);
          
          // Sort all results by size (largest to smallest)
          filteredResults.sort((a, b) => b.size - a.size);
          
          setResults(filteredResults);
          setScanning(false);
          
          // Clean up listeners
          window.electronAPI.offSearchComplete?.();
        }
      };
      
      window.electronAPI.onSearchComplete?.(handleComplete);
      
      // Start the search - search for all files with '.' pattern
      await window.electronAPI.search?.({ 
        rootPath: currentPath, 
        query: '.', 
        options: { maxResults: 1000 },
        searchId 
      });
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setScanning(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="900px" height="500px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>🗂️ Smart Folders</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody pad="0">
          <div style={{ display: 'flex', height: '100%' }} ref={containerRef}>
            <div style={{ width: leftPaneWidth, borderRight: '1px solid #2e2e35', padding: '8px 0', overflow: 'auto' }}>
              {Object.entries(FILTERS).map(([key, f]) => (
                <div key={key} onClick={() => setActiveFilter(key)} style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 12,
                  color: activeFilter === key ? '#4A9EFF' : '#9898a8',
                  background: activeFilter === key ? '#1a3a5c20' : 'transparent',
                  borderLeft: activeFilter === key ? '2px solid #4A9EFF' : '2px solid transparent',
                }}>
                  {f.name}
                </div>
              ))}
            </div>
            <div style={{ width: 4, background: '#2e2e35', cursor: 'col-resize', userSelect: 'none' }} onMouseDown={() => setIsResizingLeft(true)} />
            <div style={{ flex: 1, overflow: 'auto', padding: 12, borderRight: '1px solid #2e2e35' }}>
              <div style={{ fontSize: 11, color: '#5a5a6b', marginBottom: 8 }}>
                {FILTERS[activeFilter].desc} in <span style={{ color: '#9898a8' }}>{currentPath}</span>
              </div>
              {activeFilter === 'large' && (
                <div style={{ marginBottom: 12, padding: 8, background: '#1a1a1e', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: '#9898a8', whiteSpace: 'nowrap' }}>Size threshold:</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10000" 
                    value={largeFileSize} 
                    onChange={(e) => setLargeFileSize(Math.max(1, parseInt(e.target.value) || 100))}
                    style={{ 
                      flex: 1, 
                      padding: '4px 6px', 
                      background: '#2a2a2f', 
                      border: '1px solid #3a3a3f', 
                      borderRadius: 3, 
                      color: '#e8e8ed', 
                      fontSize: 11 
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#9898a8', whiteSpace: 'nowrap' }}>MB</span>
                </div>
              )}
              {scanning && <div style={{ color: '#4A9EFF', fontSize: 12 }}>⏳ Scanning...</div>}
              {!scanning && results.length === 0 && <div style={{ color: '#5a5a6b', fontSize: 12, padding: '20px 0' }}>No files match this filter</div>}
              {!scanning && results.slice(0, 200).map(f => (
                <div 
                  key={f.path} 
                  onClick={() => setSelectedItem(f)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
                    background: selectedItem?.path === f.path ? '#1a3a5c20' : 'transparent',
                    borderLeft: selectedItem?.path === f.path ? '2px solid #4A9EFF' : '2px solid transparent',
                    '&:hover': { background: '#2a2a2f' }
                  }}
                >
                  <span style={{ fontSize: 13 }}>{f.isDirectory ? '📁' : '📄'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e8e8ed' }}>{f.name}</span>
                  <span style={{ color: '#5a5a6b', fontFamily: 'monospace' }}>{formatSize(f.size)}</span>
                  <span style={{ color: '#5a5a6b', fontSize: 10 }}>{formatDate(f.modified)}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 4, background: '#2e2e35', cursor: 'col-resize', userSelect: 'none' }} onMouseDown={() => setIsResizingRight(true)} />
            <div style={{ width: rightPaneWidth, padding: 12, display: 'flex', flexDirection: 'column' }}>
              {selectedItem ? (
                <>
                  <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #2e2e35' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8ed', marginBottom: 8, wordBreak: 'break-all' }}>
                      {selectedItem.isDirectory ? '📁' : '📄'} {selectedItem.name}
                    </div>
                    <div style={{ fontSize: 11, marginBottom: 4 }}>
                      <div style={{ marginBottom: 4, color: '#4A9EFF' }}><strong style={{ color: '#9898a8' }}>Path:</strong> <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{selectedItem.path}</span></div>
                      <div style={{ marginBottom: 4, color: '#34d399' }}><strong style={{ color: '#9898a8' }}>Size:</strong> <span style={{ fontFamily: 'monospace' }}>{formatSize(selectedItem.size)}</span></div>
                      <div style={{ marginBottom: 4, color: '#fbbf24' }}><strong style={{ color: '#9898a8' }}>Modified:</strong> <span style={{ fontFamily: 'monospace' }}>{formatDate(selectedItem.modified)}</span></div>
                      {selectedItem.extension && <div style={{ marginBottom: 4, color: '#60a5fa' }}><strong style={{ color: '#9898a8' }}>Type:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedItem.extension.toUpperCase()}</span></div>}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#9898a8', marginBottom: 8 }}>Preview</div>
                    {loadingPreview ? (
                      <div style={{ color: '#4A9EFF', fontSize: 11 }}>Loading preview...</div>
                    ) : (
                      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {previewType === 'video' && (
                          <video 
                            src={previewContent}
                            controls
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 4 }}
                          />
                        )}
                        {previewType === 'audio' && (
                          <audio 
                            src={previewContent}
                            controls
                            style={{ width: '100%' }}
                          />
                        )}
                        {previewType === 'image' && (
                          <img 
                            src={previewContent}
                            alt={selectedItem.name}
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 4, objectFit: 'contain' }}
                          />
                        )}
                        {previewType === 'text' && (
                          <pre style={{
                            fontSize: 10, color: '#e8e8ed', background: '#1a1a1e',
                            padding: 8, borderRadius: 4, overflow: 'auto', flex: 1,
                            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                            width: '100%', maxHeight: '200px'
                          }}>
                            {previewContent || 'No preview available'}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2e2e35', display: 'flex', gap: 8 }}>
                    <Btn onClick={() => {
                      window.electronAPI.showInFinder(selectedItem.path);
                    }} style={{ fontSize: 11, padding: '4px 8px' }}>Reveal</Btn>
                    <Btn onClick={async () => {
                      const r = await window.electronAPI.delete(selectedItem.path);
                      if (r.success) {
                        setResults(prev => prev.filter(item => item.path !== selectedItem.path));
                        setSelectedItem(null);
                        refreshPane(activePane);
                      }
                    }} style={{ fontSize: 11, padding: '4px 8px' }}>Delete</Btn>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#5a5a6b', fontSize: 12 }}>
                  Select an item to view details
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <span style={{ fontSize: 11, color: '#5a5a6b', marginRight: 'auto' }}>{results.length} results</span>
          <Btn primary onClick={onClose}>Close</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}

// ─── SETTINGS MODAL ───────────────────────────────────────────────────────────
export function SettingsModal({ onClose }) {
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    window.electronAPI.storeGet('showHidden').then(v => setShowHidden(!!v));
  }, []);

  const toggle = async (key, val) => {
    await window.electronAPI.storeSet(key, val);
  };

  return (
    <Overlay onClick={onClose}>
      <ModalBox width="480px" onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>⚙️ Settings</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        <ModalBody>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9898a8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>General</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0', borderBottom: '1px solid #222' }}>
              <input type="checkbox" checked={showHidden} onChange={e => { setShowHidden(e.target.checked); toggle('showHidden', e.target.checked); }} />
              <div>
                <div style={{ fontSize: 12, color: '#e8e8ed' }}>Show hidden files</div>
                <div style={{ fontSize: 10, color: '#5a5a6b' }}>Show files beginning with a dot (.)</div>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9898a8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keyboard Shortcuts</div>
            {[
              { label: 'Toggle Terminal', shortcut: '⌘ + `' },
              { label: 'Search', shortcut: '⌘ + F' },
              { label: 'Undo', shortcut: '⌘ + Z' },
              { label: 'Show/Hide App', shortcut: '⌘ + ⇧ + Space' },
              { label: 'New Tab', shortcut: '⌘ + T (via +)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1e', fontSize: 12 }}>
                <span style={{ color: '#9898a8' }}>{s.label}</span>
                <span style={{ fontFamily: 'monospace', color: '#4A9EFF', background: '#1a2a3a', padding: '1px 8px', borderRadius: 4, fontSize: 11 }}>{s.shortcut}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#18181b', border: '1px solid #2e2e35', borderRadius: 8, padding: 12, fontSize: 11, color: '#5a5a6b' }}>
            <div style={{ color: '#9898a8', fontWeight: 600, marginBottom: 6 }}>About Finder Pro</div>
            Version 1.0.0 · Built with Electron + React · SQLite for tags & logs
          </div>
        </ModalBody>
        <ModalFooter>
          <Btn primary onClick={onClose}>Done</Btn>
        </ModalFooter>
      </ModalBox>
    </Overlay>
  );
}