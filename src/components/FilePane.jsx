import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled, { useTheme, createGlobalStyle } from 'styled-components';
import { Tooltip } from 'react-tooltip';
import { useStore, formatSize, formatDate, getFileIcon, sortFiles, PREVIEW_TYPES, filterHiddenFiles } from '../store';
import { SORT_TYPES } from '../helpers/sort';
import { getTagColors } from '../theme';
import path from 'path-browserify';
import PreviewPane from './PreviewPane';
import QuickPreviewModal from './QuickPreviewModal';
import { FileIcon as FileIconComponent } from './FileIcons';

// ─── Global Styles ────────────────────────────────────────────────────────────
const SymlinkTooltipStyles = createGlobalStyle`
  .symlink-tooltip {
    background-color: ${props => props.theme.bg.elevated} !important;
    color: ${props => props.theme.text.primary} !important;
    font-size: 11px !important;
    padding: 4px 8px !important;
    border-radius: ${props => props.theme.radius.sm} !important;
    border: 2px solid ${props => props.theme.border.strong} !important;
    box-shadow: ${props => props.theme.shadow.md} !important;
    z-index: 9999 !important;
  }
`;

// ─── Styled Components ───────────────────────────────────────────────────────
const PaneContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border: 1px solid ${p => p.theme.border.subtle};
  transition: border-color 0.15s;
  position: relative;

  &.active {
    border: 1px solid ${p => p.theme.border.focus + '40'};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  height: ${p => p.theme.tabBar};
  flex-shrink: 0;
  height: 25px;
`;

const Tab = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding-inline: 10px 2px;
  cursor: pointer;
  font-size: 10px;
  color: ${p => p.theme.text.secondary};
  background: transparent;
  border-right: 1px solid ${p => p.theme.border.subtle};
  border-bottom: 2px solid transparent;
  position: relative;
  transition: all 0.1s;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;

  &:hover { background: ${p => p.theme.bg.hover}; }

  &.active {
    color: ${p => p.theme.text.primary};
    background: ${p => p.theme.bg.primary};
    border-bottom: 1px solid ${p => p.theme.accent.blue};
  }

  .tab-name { overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .close-btn {
    opacity: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    flex-shrink: 0;
    color: ${p => p.theme.text.tertiary};
    transition: all 0.1s;
    &:hover { background: ${p => p.theme.bg.active}; color: ${p => p.theme.text.primary}; }
  }
  &:hover .close-btn { opacity: 1; }
`;

const NewTabBtn = styled.button`
  padding: 0 10px;
  background: none;
  border: none;
  color: ${p => p.theme.text.tertiary};
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  &:hover { color: ${p => p.theme.text.primary}; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: ${p => p.theme.toolbar};
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
`;

const NavBtn = styled.button`
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  &:disabled { opacity: 0.3; cursor: default; &:hover { background: none; } }
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  gap: 2px;
  font-size: 11px;
`;

const BreadcrumbItem = styled.span`
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 2px 4px;
  border-radius: ${p => p.theme.radius.sm};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
  
  &.last {
    color: ${p => p.theme.text.primary};
    cursor: default;
    &:hover { background: transparent; }
  }
`;

const BreadSep = styled.span`
  color: ${p => p.theme.text.tertiary};
  font-size: 10px;
`;

const ViewBtns = styled.div`
  display: flex;
  gap: 2px;
  margin-left: 4px;
`;

const ViewBtn = styled.button`
  background: ${p => p.theme.bg.elevated};
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  font-size: 11px;
  &:hover { background: ${p => p.theme.bg.hover}; }

  &.active {
    background: ${p => p.theme.bg.active};
    color: ${p => p.theme.text.primary};
  }
`;

const SortBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.theme.text.secondary};
  cursor: pointer;
  font-size: 10px;
  padding: 3px 6px;
  border-radius: ${p => p.theme.radius.sm};
  white-space: nowrap;
  &:hover { background: ${p => p.theme.bg.hover}; color: ${p => p.theme.text.primary}; }
`;

const FileListArea = styled.div`
  flex: 1;
  overflow-y: auto;
  position: relative;
  height: 100%;
`;

const ColumnHeader = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 70px 100px 60px;
  padding: 0 8px;
  height: 22px;
  align-items: center;
  background: ${p => p.theme.bg.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const ColHead = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  padding: 2px 4px;
  &:hover { color: ${p => p.theme.text.secondary}; }
`;

const FileRow = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr 70px 100px 60px;
  padding: 0 8px;
  height: 28px;
  align-items: center;
  cursor: pointer;
  background: ${p => p.contextMenuSelected ? p.theme.bg.hover : p.selected ? p.theme.bg.selection : 'transparent'};
  border-radius: ${p => p.theme.radius.sm};
  margin: 0 2px;
  position: relative;
  transition: background 0.07s;
  scroll-margin-bottom: 72px;

  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }

  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 1.5px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.sm};
    pointer-events: none;
  }
`;

const FileIcon = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  text-align: center;
  vertical-align: middle;
`;

const FileName = styled.span`
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${p => p.theme.text.primary};
  padding: 0 4px;
`;

const FileMeta = styled.span`
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  font-family: ${p => p.theme.font.mono};
  text-align: right;
  padding-right: 4px;
`;

const FileDate = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  padding-right: 4px;
`;

const FileExt = styled.span`
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  text-transform: uppercase;
  padding: 1px 4px;
  border-radius: 3px;
  background: ${p => p.theme.bg.elevated};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${p => p.theme.text.tertiary};
  font-size: 12px;
  gap: 8px;
`;

const StatusBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${p => p.theme.statusBar};
  padding: 0 10px;
  background: ${p => p.theme.bg.secondary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  flex-shrink: 0;
`;

const InlineCreateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${p => p.theme.bg.secondary};
  border-top: 1px solid ${p => p.theme.border.subtle};
  flex-shrink: 0;
  input {
    flex: 1;
    background: ${p => p.theme.bg.elevated};
    border: 1px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.sm};
    color: ${p => p.theme.text.primary};
    font-size: 12px;
    padding: 4px 8px;
    outline: none;
  }
  button {
    background: none;
    border: 1px solid ${p => p.theme.border.normal};
    color: ${p => p.theme.text.secondary};
    border-radius: ${p => p.theme.radius.sm};
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
    &:hover { background: ${p => p.theme.bg.hover}; }
  }
  span {
    font-size: 11px;
    color: ${p => p.theme.text.tertiary};
    flex-shrink: 0;
  }
`;

const ColumnsContainer = styled.div`
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden; /* Prevent overall scrolling */
  background: ${p => p.theme.bg.primary};
  height: 100%;
`;

const Column = styled.div`
  width: ${p => p.width || '200px'};
  min-width: 150px;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${p => p.theme.bg.primary};
  border-right: 1px solid ${p => p.theme.border.subtle};
  position: relative;
  flex-shrink: 0;
  
  &.active {
    background: ${p => p.theme.bg.secondary};
  }
`;

const ColumnResizer = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
  
  &:hover {
    background: ${p => p.theme.accent.blue}40;
  }
  
  &.dragging {
    background: ${p => p.theme.accent.blue}60;
  }
`;

const ColViewHeader = styled.div`
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  background: ${p => p.theme.bg.secondary};
  flex-shrink: 0;
`;

const ColumnList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px 0; /* Extra padding at bottom */
  height: 100%; /* Use full available height */
  align-self: stretch;
`;

const ColumnItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: ${p => p.theme.text.primary};
  background: ${p => p.contextMenuSelected ? p.theme.bg.hover : 'transparent'};
  position: relative;
  scroll-margin-bottom: 72px;
  
  &:hover {
    background: ${p => p.theme.bg.hover};
  }
  
  &.selected {
    background: ${p => p.theme.bg.selection};
    color: ${p => p.theme.accent.blue};
  }

  &.selected-dim {
    background: ${p => p.theme.bg.active};
    color: ${p => p.theme.text.primary};
  }
  
  &.drag-over {
    background: ${p => p.theme.accent.blue}15;
    border-left: 3px solid ${p => p.theme.accent.blue};
    padding-left: 7px;
  }
  
  .icon {
    font-size: 14px;
    width: 20px;
    text-align: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
  }
  
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ContextMenu = styled.div`
  position: absolute;
  z-index: 1000;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.md};
  box-shadow: ${p => p.theme.shadow.lg};
  min-width: 180px;
  padding: 4px;
  user-select: none;
`;

const MenuItem = styled.div`
  padding: 6px 12px;
  font-size: 12px;
  color: ${p => p.danger ? p.theme.text.error : p.theme.text.primary};
  cursor: pointer;
  border-radius: ${p => p.theme.radius.sm};
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${p => p.theme.border.subtle};
  margin: 3px 0;
`;

const CtxTagRow = styled.div`
  padding: 5px 10px 4px;
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-height: 32px;
`;

const CtxTagDot = styled.div.withConfig({ shouldForwardProp: p => !['active','color','hovered'].includes(p) })`
display: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${p => p.color};
  border: 2px solid ${p => p.active ? 'white' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : 'none'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: white;
  font-weight: 700;
  transition: transform 0.1s;
  transform: ${p => p.hovered ? 'scale(1.2)' : 'scale(1)'};
  cursor: pointer;
`;

const CtxTagLabel = styled.div`
  padding: 0 10px 5px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  min-height: 16px;
`;

const CtxSortRow = styled.div`
  padding: 5px 8px 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const CtxSortBtn = styled.button.withConfig({ shouldForwardProp: p => p !== 'active' })`
  width: 34px;
  height: 34px;
  border-radius: ${p => p.theme.radius.sm};
  background: ${p => p.active ? p.theme.accent.blue + '22' : p.theme.bg.primary};
  border: 1.5px solid ${p => p.active ? p.theme.accent.blue : p.theme.border.subtle};
  color: ${p => p.active ? p.theme.accent.blue : p.theme.text.tertiary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
  flex-shrink: 0;
  &:hover {
    border-color: ${p => p.theme.accent.blue};
    color: ${p => p.theme.accent.blue};
    background: ${p => p.theme.accent.blue + '15'};
  }
  svg { width: 18px; height: 18px; display: block; }
`;

const CtxSortLabel = styled.div`
  padding: 0 10px 5px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  min-height: 16px;
`;

// Tag dots for file views
const FileTagDots = styled.span`
  display: inline-flex;
  margin-left: 5px;
  vertical-align: middle;
`;

const FileTagDot = styled.span.withConfig({ shouldForwardProp: p => p !== 'offset' })`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
`;

const GridTagDots = styled.span`
  display: flex;
  justify-content: center;
  margin-top: 2px;
`;

const GridTagDot = styled.span.withConfig({ shouldForwardProp: p => p !== 'offset' })`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
`;

const ColumnTagDots = styled.span`
  display: flex;
  flex-shrink: 0;
`;

const ColumnTagDot = styled.span.withConfig({ shouldForwardProp: p => p !== 'offset' })`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.color};
  display: inline-block;
  margin-left: ${p => p.offset}px;
  border: 1px solid white;
`;

const SymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  font-size: 11px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  vertical-align: middle;
  
  &:hover {
    opacity: 1;
    color: ${p => p.theme.accent.blue};
  }
`;

const GridSymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  
  &:hover {
    opacity: 1;
    color: ${p => p.theme.accent.blue};
  }
`;

const ColumnSymlinkIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  opacity: 0.7;
  cursor: help;
  flex-shrink: 0;
  
  &:hover {
    opacity: 1;
    color: ${p => p.theme.accent.blue};
  }
`;

const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
`;

const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: ${p => p.theme.radius.md};
  cursor: pointer;
  background: ${p => p.selected ? p.theme.bg.selection : 'transparent'};
  transition: background 0.07s;
  position: relative;
  scroll-margin-bottom: 72px;
  &:hover { background: ${p => p.selected ? p.theme.bg.selection : p.theme.bg.hover}; }
  
  &.drag-over::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid ${p => p.theme.accent.blue};
    border-radius: ${p => p.theme.radius.md};
    background: ${p => p.theme.accent.blue}15;
    pointer-events: none;
  }
`;

const GridIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
`;

const GridName = styled.span`
  font-size: 10px;
  text-align: center;
  color: ${p => p.theme.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  max-width: 72px;
`;

// ─── Inline Tag Picker (Finder-style floating panel) ────────────────────────
const TagPickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
`;

const TagPickerPanel = styled.div.withConfig({
  shouldForwardProp: p => !['top','left'].includes(p),
})`
  position: fixed;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.strong};
  border-radius: ${p => p.theme.radius.lg};
  box-shadow: ${p => p.theme.shadow.lg};
  width: 280px;
  padding: 10px 0 6px;
  z-index: 901;
  top: ${p => p.top}px;
  left: ${p => p.left}px;
`;

const TagPickerHeader = styled.div`
  padding: 4px 12px 8px;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.text.secondary};
  border-bottom: 1px solid ${p => p.theme.border.subtle};
  margin-bottom: 4px;
`;

const TagPickerColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
`;

const TagPickerDot = styled.button.withConfig({
  shouldForwardProp: p => !['active','noColor','color'].includes(p),
})`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${p => p.color || 'transparent'};
  border: 2px solid ${p => p.active ? 'white' : 'transparent'};
  box-shadow: ${p => p.active ? `0 0 0 2px ${p.color}` : p.noColor ? `inset 0 0 0 1.5px ${p.theme.border.normal}` : 'none'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: ${p => p.theme.text.tertiary};
  transition: transform 0.1s;
  &:hover { transform: scale(1.15); }
`;

const TagPickerInput = styled.input`
  width: 100%;
  background: ${p => p.theme.bg.elevated};
  border: 1px solid ${p => p.theme.border.normal};
  border-radius: ${p => p.theme.radius.sm};
  color: ${p => p.theme.text.primary};
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${p => p.theme.accent.blue}; }
`;

const TagPickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.07s;
  &:hover { background: ${p => p.theme.bg.hover}; }
`;

const TagPickerDotSmall = styled.span.withConfig({
  shouldForwardProp: p => p !== 'color',
})`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: ${p => p.color};
  flex-shrink: 0;
`;

const TagPickerCheck = styled.span.withConfig({
  shouldForwardProp: p => p !== 'visible',
})`
  margin-left: auto;
  font-size: 12px;
  color: ${p => p.theme.accent.blue};
  opacity: ${p => p.visible ? 1 : 0};
`;

function InlineTagPicker({ file, allTags, fileTags, onClose, onChanged }) {
  const { currentTheme } = useStore();
  const TAG_COLORS = getTagColors(currentTheme);

  const [localFileTags, setLocalFileTags] = useState(fileTags);
  const [localAllTags, setLocalAllTags] = useState(allTags);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [pos, setPos] = useState({ top: 200, left: 200 });
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    // Center in the screen by default, then adjust after mount
    setPos({ top: Math.round(window.innerHeight / 2 - 150), left: Math.round(window.innerWidth / 2 - 140) });
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  // Adjust if panel goes off-screen
  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    let { top, left } = pos;
    if (rect.bottom > window.innerHeight - 20) top = Math.max(20, window.innerHeight - rect.height - 20);
    if (rect.right > window.innerWidth - 20) left = Math.max(20, window.innerWidth - rect.width - 20);
    if (top !== pos.top || left !== pos.left) setPos({ top, left });
  }, [localAllTags]);

  const toggleTag = async (tag) => {
    const isOn = localFileTags.includes(tag.tag_name);
    if (isOn) {
      await window.electronAPI.removeTag({ filePath: file.path, tagName: tag.tag_name });
      const next = localFileTags.filter(t => t !== tag.tag_name);
      setLocalFileTags(next);
      onChanged(next);
    } else {
      await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name, color: tag.color });
      const next = [...localFileTags, tag.tag_name];
      setLocalFileTags(next);
      onChanged(next);
    }
  };

  const createAndAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await window.electronAPI.addTag({ filePath: file.path, tagName: name, color: selectedColor });
    const next = [...localFileTags, name];
    setLocalFileTags(next);
    // Refresh all tags
    const all = await window.electronAPI.getAllTags();
    const nextAll = all.success ? all.tags : localAllTags;
    setLocalAllTags(nextAll);
    onChanged(next, nextAll);
    setNewTagName('');
  };

  const COLOR_NAMES = ['Blue','Purple','Green','Orange','Red','Yellow','Pink','Teal'];

  // Filter tags by search
  const filtered = newTagName.trim()
    ? localAllTags.filter(t => t.tag_name.toLowerCase().includes(newTagName.toLowerCase()))
    : localAllTags;

  return ReactDOM.createPortal(
    <>
      <TagPickerOverlay onClick={onClose} />
      <TagPickerPanel ref={panelRef} top={pos.top} left={pos.left} onClick={e => e.stopPropagation()}>
        <TagPickerHeader>🏷️ Tags — {file.name}</TagPickerHeader>

        {/* Color row */}
        <TagPickerColorRow>
          <TagPickerDot noColor title="No color" onClick={() => setSelectedColor(null)}>✕</TagPickerDot>
          {TAG_COLORS.slice(0, 8).map((c, i) => (
            <TagPickerDot
              key={c}
              color={c}
              active={selectedColor === c}
              onClick={() => setSelectedColor(c)}
              title={COLOR_NAMES[i]}
            >
              {selectedColor === c && '✓'}
            </TagPickerDot>
          ))}
        </TagPickerColorRow>

        {/* Search/create input */}
        <div style={{ padding: '6px 12px 6px' }}>
          <TagPickerInput
            ref={inputRef}
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="Add or find a tag..."
            onKeyDown={e => {
              if (e.key === 'Enter') {
                // If exact match exists, toggle it; otherwise create
                const exact = localAllTags.find(t => t.tag_name.toLowerCase() === newTagName.trim().toLowerCase());
                if (exact) toggleTag(exact);
                else createAndAddTag();
              }
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        {/* Tag list */}
        <div style={{ maxHeight: 240, overflowY: 'auto' }}>
          {filtered.map(tag => (
            <TagPickerRow key={tag.tag_name} onClick={() => toggleTag(tag)}>
              <TagPickerDotSmall color={tag.color} />
              <span style={{ fontSize: 12, flex: 1, color: 'inherit' }}>{tag.tag_name}</span>
              <TagPickerCheck visible={localFileTags.includes(tag.tag_name)}>✓</TagPickerCheck>
            </TagPickerRow>
          ))}
          {newTagName.trim() && !localAllTags.find(t => t.tag_name.toLowerCase() === newTagName.trim().toLowerCase()) && (
            <TagPickerRow onClick={createAndAddTag}>
              <TagPickerDotSmall color={selectedColor || '#888'} />
              <span style={{ fontSize: 12, flex: 1, color: 'inherit' }}>Create "{newTagName.trim()}"</span>
            </TagPickerRow>
          )}
          {filtered.length === 0 && !newTagName.trim() && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: '#888' }}>No tags yet. Type to create one.</div>
          )}
        </div>
      </TagPickerPanel>
    </>,
    document.body
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FilePane({ paneId }) {
  const theme = useTheme();
  const {
    panes,
    activePane,
    setActivePane,
    navigateTo,
    navigateToReveal,
    refreshPane,
    setSelection,
    toggleSelection,
    setViewMode,
    setSortBy,
    switchTab,
    addTab,
    closeTab,
    navigateToBookmark,
    setPreviewFile,
    addToClipboard, clipboardQueue, pasteClipboard,
    undo,
    setCurrentBreadcrumbPath,
    updateColumnState,
    clearColumnState,
    getBreadcrumbs,
    getColumnPaths,
    getActiveBookmark,
    activeModal,
    openModal,
    showSearch,
    showSidebar,
    bookmarks,
    setBookmarks,
    goBackInHistory,
    goForwardInHistory,
    pushNavHistory,
    closePreview,
    setDirectorySort,
    getDirSort,
    directorySorts,
    showHidden,
  } = useStore();

  const pane = panes.find(p => p.id === paneId);

  if (!pane) return null;

  const { path: currentPath, files: allFiles, loading, selectedFiles, sortBy, sortOrder, viewMode, tabs, activeTab, currentBreadcrumbPath, columnState } = pane;
  
  // Filter files based on showHidden setting
  const files = filterHiddenFiles(allFiles, showHidden);

  // fileTags: { [filePath]: [{ tag_name, color }] }
  const [fileTags, setFileTags] = useState({});
  // Context menu inline tag state
  const [ctxAllTags, setCtxAllTags] = useState([]);
  const [ctxFileTags, setCtxFileTags] = useState(new Set());
  const [ctxTagHover, setCtxTagHover] = useState(null);
  // Context menu sort state
  const [ctxSortTarget, setCtxSortTarget] = useState(null); // dirPath the sort applies to
  const [ctxSortHover, setCtxSortHover] = useState(null);
  // Keep legacy tag menu state for InlineTagPicker (if still used)
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagMenuAllTags, setTagMenuAllTags] = useState([]);
  const [tagMenuFileTags, setTagMenuFileTags] = useState([]);
  const [tagMenuFile, setTagMenuFile] = useState(null);

  const [history, setHistory] = useState([pane?.path]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuFile, setContextMenuFile] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingName, setCreatingName] = useState(null); // 'folder' | 'file'
  const [creatingNameValue, setCreatingNameValue] = useState('');
  const creatingInputRef = useRef(null);
  const [quickPreviewFile, setQuickPreviewFile] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState([]);
  const renameInputRef = useRef(null);
  const paneRef = useRef(null);
  const dragCounterRef = useRef(0);
  
  // Local column view UI state (widths, resizing) - not persisted to store
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const resizeStartRef = useRef(null);
  const columnsContainerRef = useRef(null);

  // Derived from store column state for convenience (must be before tag effects)
  const columnPaths = getColumnPaths(paneId);
  const columnFiles = columnState.filesByPath;

  // Load tags for all visible files
  const loadTagsForFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const entries = await Promise.all(
      fileList.map(async f => {
        const r = await window.electronAPI.getTags(f.path);
        return [f.path, r.success ? r.tags : []];
      })
    );
    setFileTags(prev => {
      const next = { ...prev };
      for (const [p, tags] of entries) next[p] = tags;
      return next;
    });
  }, []);

  // Reload tag dots when tags modal closes
  const prevActiveModal = useRef(activeModal);
  useEffect(() => {
    if (prevActiveModal.current === 'tags' && activeModal === null) {
      loadTagsForFiles(files);
      const allColFiles = Object.values(columnFiles).flat();
      if (allColFiles.length > 0) loadTagsForFiles(allColFiles);
    }
    prevActiveModal.current = activeModal;
  }, [activeModal]);

  useEffect(() => {
    loadTagsForFiles(files);
  }, [files]);

  // Load tags for column files when they change
  useEffect(() => {
    const allColFiles = Object.values(columnFiles).flat();
    if (allColFiles.length > 0) loadTagsForFiles(allColFiles);
  }, [columnFiles]);

  // Derived selections based on breadcrumb path
  const getDerivedSelections = () => {
    const selections = {};
    if (viewMode === 'column' && currentBreadcrumbPath) {
      const parts = currentBreadcrumbPath.split('/').filter(Boolean);
      const baseParts = pane.basePath === '/' ? [] : pane.basePath.split('/').filter(Boolean);
      
      // For each column, the selected item is the path at that level
      for (let i = 0; i < columnPaths.length; i++) {
        const columnPath = columnPaths[i];
        if (columnPath && currentBreadcrumbPath.startsWith(columnPath)) {
          // Find the selected item in this column - it's the next segment in the breadcrumb
          const columnSegments = columnPath.split('/').filter(Boolean);
          if (i < columnPaths.length - 1) {
            // Not the last column, selected item is the path of the next column
            selections[i] = columnPaths[i + 1];
          } else if (currentBreadcrumbPath === columnPath) {
            // Last column and we're exactly at this path - no selection
            selections[i] = null;
          } else {
            // We're deeper, but this shouldn't happen with derived columns
            selections[i] = null;
          }
        } else {
          selections[i] = null;
        }
      }
    }
    return selections;
  };

  const derivedSelections = getDerivedSelections();
  const selectedItems = derivedSelections;
  const focusedColumn = columnState.focusedIndex;

  // Auto-scroll columns container to the right when breadcrumb or preview changes
  useEffect(() => {
    if (viewMode !== 'column') return;
    if (!columnsContainerRef.current) return;
    columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth;
  }, [currentBreadcrumbPath, viewMode, showSidebar]);

  // Also scroll when preview pane opens/closes
  const isPreviewOpen = useStore(s => s.showPreview);
  useEffect(() => {
    if (viewMode !== 'column') return;
    if (!columnsContainerRef.current) return;
    setTimeout(() => {
      if (columnsContainerRef.current)
        columnsContainerRef.current.scrollLeft = columnsContainerRef.current.scrollWidth;
    }, 50);
  }, [isPreviewOpen, viewMode]);

  // Handle column resize
  useEffect(() => {
    if (resizingColumn === null || !resizeStartRef.current) return;

    const handleMouseMove = (e) => {
      const { startX, startWidth } = resizeStartRef.current;
      const zoom = useStore.getState().zoom || 1;
      const newWidth = startWidth + (e.clientX - startX) / zoom;
      
      if (newWidth >= 150 && newWidth <= 600) {
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      }
    };

    const handleMouseUp = () => {
      resizeStartRef.current = null;
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // Spacebar → open QuickPreviewModal for the selected file
  useEffect(() => {
    if (activePane !== paneId) return;
    const handler = (e) => {
      if (e.code !== 'Space') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (useStore.getState().activeModal || useStore.getState().showSearch) return;
      // Only act when this pane is active
      if (useStore.getState().activePane !== paneId) return;
      const selArray = [...selectedFiles];
      if (selArray.length === 0) return;
      const filePath = selArray[0];
      // Find the file object
      let fileObj = files.find(f => f.path === filePath);
      if (!fileObj) {
        // Search in column files
        for (const colFiles of Object.values(columnFiles)) {
          const found = colFiles.find(f => f.path === filePath);
          if (found) { fileObj = found; break; }
        }
      }
      if (!fileObj || fileObj.isDirectory) return;
      const ext = fileObj.extension || '';
      const isPreviewable = PREVIEW_TYPES.imageExts.includes(ext) ||
        PREVIEW_TYPES.videoExts.includes(ext) ||
        PREVIEW_TYPES.audioExts.includes(ext) ||
        ext === 'pdf';
      if (!isPreviewable) return;
      e.preventDefault();
      setQuickPreviewFile(fileObj);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activePane, paneId, selectedFiles, files, columnFiles]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e) => {
      // Don't close if clicking inside the context menu
      if (e.target.closest('.context-menu')) return;
      setContextMenu(null);
      setContextMenuFile(null);
    };
    // Add to document to catch clicks outside the pane
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  // Scroll a specific item into view within a column
  const scrollColumnItemIntoView = (colIdx, itemIdx) => {
    if (!columnsContainerRef.current) return;
    const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
    const col = columns[colIdx];
    if (!col) return;
    const list = col.querySelector('[data-column-list]');
    if (!list) return;
    const items = list.children;
    if (items[itemIdx]) {
      items[itemIdx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  // After history navigation restores, scroll the active selection into view
  useEffect(() => {
    if (!pane._isRestoringHistory) return;
    if (viewMode !== 'column') return;
    // After the DOM updates, scroll to the selected file/dir in the last column
    setTimeout(() => {
      if (!columnsContainerRef.current) return;
      const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
      if (!columns.length) return;
      const lastColIdx = columns.length - 1;
      const lastCol = columns[lastColIdx];
      const selected = lastCol?.querySelector('.selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }, 50);
  }, [pane._isRestoringHistory, pane.navigationIndex]);

  // Auto-scroll to selected file on mount/session restore (all view modes)
  useEffect(() => {
    if (loading) return;
    if (selectedFiles.size === 0) return;
    if (files.length === 0 && Object.keys(columnFiles).length === 0) return;
    
    // Wait for DOM to update after files are loaded
    setTimeout(() => {
      if (viewMode === 'column') {
        if (!columnsContainerRef.current) return;
        const columns = columnsContainerRef.current.querySelectorAll('[data-column-index]');
        if (!columns.length) return;
        
        // Find which column contains the selected file by checking className
        for (let colIdx = 0; colIdx < columns.length; colIdx++) {
          const col = columns[colIdx];
          const list = col.querySelector('[data-column-list]');
          if (!list) continue;
          
          const items = Array.from(list.children);
          const selectedItem = items.find(item => 
            item.className && item.className.includes('selected')
          );
          
          if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            break;
          }
        }
      } else if (viewMode === 'list' || viewMode === 'grid') {
        // For list and grid views, find the first selected file in the DOM
        if (!paneRef.current) return;
        const firstSelectedPath = Array.from(selectedFiles)[0];
        
        // Find all file items and check which one matches
        const allItems = paneRef.current.querySelectorAll('[draggable="true"]');
        for (const item of allItems) {
          // Check if this item corresponds to a selected file by checking its position in the files array
          const itemIndex = Array.from(allItems).indexOf(item);
          if (itemIndex >= 0 && itemIndex < files.length) {
            const file = files[itemIndex];
            if (selectedFiles.has(file.path)) {
              item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              break;
            }
          }
        }
      }
    }, 100);
  }, [viewMode, loading, files.length, columnPaths.length]);

  // Keyboard navigation for column view
  useEffect(() => {
    if (viewMode !== 'column') return;

    const handleKeyDown = (e) => {
      // Don't handle keyboard nav when a modal or search overlay is open
      if (useStore.getState().activeModal || useStore.getState().showSearch) return;
      if (focusedColumn < 0 || focusedColumn >= columnPaths.length) return;

      const columnKey = columnPaths[focusedColumn];
      const columnFilesList = focusedColumn === 0 ? files : filterHiddenFiles(columnFiles[columnKey] || [], showHidden);

      if (columnFilesList.length === 0 && e.key !== 'ArrowLeft' && e.key !== 'Escape') return;

      const currentIndex = columnFilesList.findIndex(f => selectedFiles.has(f.path));

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          let newIdx;
          if (currentIndex <= 0) {
            newIdx = columnFilesList.length - 1;
          } else {
            newIdx = currentIndex - 1;
          }
          const newFile = columnFilesList[newIdx];
          setSelection(paneId, [newFile.path]);
          handleColumnClick(newFile, focusedColumn);
          scrollColumnItemIntoView(focusedColumn, newIdx);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          let newIdx;
          if (currentIndex >= columnFilesList.length - 1 || currentIndex < 0) {
            newIdx = 0;
          } else {
            newIdx = currentIndex + 1;
          }
          const newFile = columnFilesList[newIdx];
          setSelection(paneId, [newFile.path]);
          handleColumnClick(newFile, focusedColumn);
          scrollColumnItemIntoView(focusedColumn, newIdx);
          break;
        }

        case 'ArrowRight': {
          e.preventDefault();
          if (currentIndex < 0) break;
          const selectedItem = columnFilesList[currentIndex];
          if (!selectedItem || !selectedItem.isDirectory) break;

          const nextColumnFiles = filterHiddenFiles(columnFiles[selectedItem.path] || [], showHidden);
          if (nextColumnFiles.length === 0) break;

          updateColumnState(paneId, { focusedIndex: focusedColumn + 1 });
          setSelection(paneId, [nextColumnFiles[0].path]);
          handleColumnClick(nextColumnFiles[0], focusedColumn + 1);
          // Scroll to top of next column
          setTimeout(() => scrollColumnItemIntoView(focusedColumn + 1, 0), 0);
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          if (focusedColumn > 0) {
            const prevColumn = focusedColumn - 1;
            // The selected item in prevColumn is the directory whose contents are shown in focusedColumn
            const selectedDirPath = columnPaths[focusedColumn];
            // Keep the immediate next column (focusedColumn) visible, but trim anything deeper.
            // Set breadcrumb to columnPaths[focusedColumn] so columns beyond it are removed.
            if (columnPaths.length > focusedColumn + 1) {
              setCurrentBreadcrumbPath(paneId, columnPaths[focusedColumn]);
            }
            updateColumnState(paneId, { focusedIndex: prevColumn });
            if (selectedDirPath) {
              setSelection(paneId, [selectedDirPath]);
            }
            setPreviewFile(null);
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          // Deselect everything in the focused column and trim columns to the right
          setCurrentBreadcrumbPath(paneId, columnPaths[focusedColumn]);
          setSelection(paneId, []);
          setPreviewFile(null);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, columnPaths, columnFiles, currentPath, files, paneId, setSelection, setCurrentBreadcrumbPath, setPreviewFile, selectedFiles, derivedSelections, focusedColumn]);

  // Subscribe to revealTarget from store so we can react when it's set
  const revealTarget = useStore(s => s.revealTarget);

  // Handle reveal target from search or other sources
  useEffect(() => {
    if (!revealTarget || revealTarget.paneId !== paneId) return;

    const { filePath, fileDir, isDirectory } = revealTarget;

    // Call the store action to handle the reveal logic
    useStore.getState().revealFileInTree(paneId, filePath, fileDir, isDirectory);

    // Clear the reveal target so it doesn't re-trigger
    useStore.getState().clearRevealTarget();
  }, [paneId, revealTarget]);

  const navigate = (p) => {
    const newHistory = [...history.slice(0, historyIdx + 1), p];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    navigateTo(paneId, p);
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      navigateTo(paneId, history[historyIdx - 1]);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      navigateTo(paneId, history[historyIdx + 1]);
    }
  };

  const handleColumnClick = (file, columnIndex) => {
    // Clear context menu when clicking another file
    setContextMenu(null);
    setContextMenuFile(null);

    if (file.isDirectory) {
      // For directories, update breadcrumb path and load files if needed
      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
      setCurrentBreadcrumbPath(paneId, file.path);

      // Push to history for directory navigation
      pushNavHistory(paneId, {
        basePath: currentPane.basePath,
        currentBreadcrumbPath: file.path,
        selectedFiles: [file.path],
        previewFilePath: null,
      });

      // Load files for this directory if not already cached
      if (!columnFiles[file.path]) {
        window.electronAPI.readdir(file.path).then(result => {
          if (result.success) {
            const dirSort = useStore.getState().getDirSort(file.path);
            const sorted = sortFiles(result.files, dirSort, 'asc');
            updateColumnState(paneId, { filesByPath: { ...columnFiles, [file.path]: sorted } });
          }
        });
      }

      // Clear preview when directory is selected
      setPreviewFile(null);
    } else {
      // For files, preview and update breadcrumb to parent directory
      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
      const parentPath = file.path.split('/').slice(0, -1).join('/') || '/';
      setCurrentBreadcrumbPath(paneId, parentPath);

      // Push to history for file selection (includes preview)
      pushNavHistory(paneId, {
        basePath: currentPane.basePath,
        currentBreadcrumbPath: parentPath,
        selectedFiles: [file.path],
        previewFilePath: file.path,
      });

      setPreviewFile(file);
    }
  };

  const handleColumnEmptyClick = (columnIndex) => {
    // Clear context menu when clicking empty space
    setContextMenu(null);
    setContextMenuFile(null);
    
    // Clear global selection
    setSelection(paneId, []);
    
    // If clicking the last column, just focus it and clear preview
    if (columnIndex === columnPaths.length - 1) {
      updateColumnState(paneId, { focusedIndex: columnIndex });
      setPreviewFile(null);
      return;
    }
    
    // For earlier columns, navigate to that column's path
    const breadcrumbPath = columnPaths[columnIndex];
    setCurrentBreadcrumbPath(paneId, breadcrumbPath);
    updateColumnState(paneId, { focusedIndex: columnIndex });
    setPreviewFile(null);
  };

  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigate(parent);
  };

  const handleFileClick = (e, file) => {
    e.stopPropagation();
    setActivePane(paneId);
    // Clear context menu when clicking another file
    setContextMenu(null);
    setContextMenuFile(null);

    if (e.metaKey || e.ctrlKey) {
      toggleSelection(paneId, file.path, true);
    } else if (e.shiftKey) {
      // Range select - add range to existing selection
      const fileIndex = files.findIndex(f => f.path === file.path);
      const selArray = [...selectedFiles];
      if (selArray.length > 0) {
        const lastIdx = files.findIndex(f => f.path === selArray[selArray.length - 1]);
        const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
        const range = files.slice(start, end + 1).map(f => f.path);
        // Merge range with existing selection
        const mergedSelection = new Set([...selectedFiles, ...range]);
        setSelection(paneId, [...mergedSelection]);
      } else {
        toggleSelection(paneId, file.path, false);
      }
    } else {
      toggleSelection(paneId, file.path, false);
      setPreviewFile(file);
    }
  };

  const handleDoubleClick = (file) => {
    if (file.isDirectory) {
      navigate(file.path);
    } else {
      window.electronAPI.openPath(file.path);
    }
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePane(paneId);
    if (!selectedFiles.has(file.path)) {
      setSelection(paneId, [file.path]);
    }
    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    const fileElement = e.currentTarget;
    const fileRect = fileElement.getBoundingClientRect();
    let menuY = (fileRect.bottom / zoom) - (rect.top / zoom) - 8;
    const menuX = (fileRect.right / zoom) - (rect.left / zoom) - 8;
    
    // Check if menu would clip at bottom of screen
    const estimatedMenuHeight = 250;
    const paneBottom = (window.innerHeight / zoom) - (rect.top / zoom);
    if (menuY + estimatedMenuHeight > paneBottom) {
      menuY = (fileRect.top / zoom) - (rect.top / zoom) - estimatedMenuHeight;
    }
    
    // Determine sort target: if right-clicking a dir, sort applies to that dir.
    // If right-clicking a file, sort applies to its parent dir.
    const sortTarget = file.isDirectory
      ? file.path
      : (file.path.split('/').slice(0, -1).join('/') || '/');

    setContextMenu({ x: menuX, y: menuY, file });
    setContextMenuFile(file);
    setCtxTagHover(null);
    setCtxSortHover(null);
    setCtxSortTarget(sortTarget);
    // Load tags for the inline dot row
    Promise.all([
      window.electronAPI.getAllTags(),
      window.electronAPI.getTags(file.path),
    ]).then(([all, mine]) => {
      setCtxAllTags(all.success ? all.tags : []);
      setCtxFileTags(new Set(mine.success ? mine.tags.map(t => t.tag_name) : []));
    });
  };

  const handleBackgroundContextMenu = (e) => {
    e.preventDefault();
    const rect = paneRef.current.getBoundingClientRect();
    const zoom = useStore.getState().zoom;
    // Sort target for background click: currentBreadcrumbPath (active dir),
    // or fallback to basePath
    const currentPane = useStore.getState().panes.find(p => p.id === paneId);
    const bgSortTarget = currentPane?.currentBreadcrumbPath || currentPane?.basePath || currentPath;
    setCtxSortTarget(bgSortTarget);
    setCtxSortHover(null);
    setContextMenu({ x: (e.clientX / zoom) - (rect.left / zoom), y: (e.clientY / zoom) - (rect.top / zoom), file: null, background: true });
  };

  const handleDrop = async (e, destFile, destPath = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    setIsDragging(false);
    dragCounterRef.current = 0;
    
    const droppedPaths = e.dataTransfer.getData('file-paths');
    if (!droppedPaths) return;
    
    const paths = JSON.parse(droppedPaths);
    
    // Determine destination directory
    let destDir;
    if (destPath) {
      destDir = destPath;
    } else if (destFile?.isDirectory) {
      destDir = destFile.path;
    } else {
      destDir = currentPath;
    }
    
    // Prevent no-op moves within same directory (unless copying)
    const isSameDir = paths.some(src => {
      const srcDir = src.split('/').slice(0, -1).join('/') || '/';
      return srcDir === destDir;
    });
    if (isSameDir && !e.altKey) return;
    
    const isCopy = e.altKey;
    const affectedDirs = new Set();

    for (const src of paths) {
      const fileName = src.split('/').pop();
      const dest = `${destDir}/${fileName}`;
      if (src === dest) continue;
      try {
        if (isCopy) {
          await window.electronAPI.copy(src, dest);
        } else {
          await window.electronAPI.move(src, dest);
        }

        // Track directories that need refresh (source and destination)
        const srcDir = src.split('/').slice(0, -1).join('/') || '/';
        affectedDirs.add(srcDir);
        affectedDirs.add(destDir);
      } catch (err) {
        console.error(`Failed to ${isCopy ? 'copy' : 'move'} ${src}:`, err);
      }
    }
    
    // Refresh both panes and await to ensure UI updates immediately
    const otherPane = paneId === 'left' ? 'right' : 'left';
    await Promise.all([
      refreshPane(paneId),
      refreshPane(otherPane),
    ]);

    // In column view, also refresh cached column directories that were affected
    if (viewMode === 'column' && affectedDirs.size > 0) {
      const updatedFilesByPath = { ...columnFiles };
      for (const dir of affectedDirs) {
        try {
          const res = await window.electronAPI.readdir(dir);
          if (res.success) {
            updatedFilesByPath[dir] = sortFiles(res.files, sortBy, sortOrder);
          }
        } catch (err) {
          console.error('Failed to refresh column dir', dir, err);
        }
      }
      updateColumnState(paneId, { filesByPath: updatedFilesByPath });
    }
  };

  const startRename = (file) => {
    setRenameFile(file);
    setRenameValue(file.name);
    setContextMenu(null);
  };

  const commitRename = async () => {
    if (!renameFile || !renameValue || renameValue === renameFile.name) {
      setRenameFile(null);
      return;
    }
    const newPath = `${currentPath}/${renameValue}`;
    await window.electronAPI.rename(renameFile.path, newPath);
    setRenameFile(null);
    await refreshPane(paneId);

    // In column view, also refresh the current directory in cached columns
    if (viewMode === 'column' && columnFiles[currentPath]) {
      const res = await window.electronAPI.readdir(currentPath);
      if (res.success) {
        updateColumnState(paneId, { 
          filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) } 
        });
      }
    }
  };

  const deleteSelected = async () => {
    // Track which directories are affected by deletions
    const affectedDirs = new Set();
    for (const fp of selectedFiles) {
      const parentDir = fp.split('/').slice(0, -1).join('/') || '/';
      affectedDirs.add(parentDir);
      await window.electronAPI.delete(fp);
    }
    setSelection(paneId, []);
    await refreshPane(paneId);

    // In column view, also refresh all affected directories in cached columns
    if (viewMode === 'column' && affectedDirs.size > 0) {
      const updatedFilesByPath = { ...columnFiles };
      for (const dir of affectedDirs) {
        if (columnFiles[dir]) {
          const res = await window.electronAPI.readdir(dir);
          if (res.success) {
            updatedFilesByPath[dir] = sortFiles(res.files, sortBy, sortOrder);
          }
        }
      }
      updateColumnState(paneId, { filesByPath: updatedFilesByPath });
    }
  };

  const createFolder = () => {
    setCreatingName('folder');
    setCreatingNameValue('');
    setTimeout(() => creatingInputRef.current?.focus(), 50);
  };

  const createFile = () => {
    setCreatingName('file');
    setCreatingNameValue('');
    setTimeout(() => creatingInputRef.current?.focus(), 50);
  };

  const commitCreating = async () => {
    const name = creatingNameValue.trim();
    if (name) {
      if (creatingName === 'folder') {
        await window.electronAPI.mkdir(`${currentBreadcrumbPath}/${name}`);
      } else {
        await window.electronAPI.writeFile(`${currentBreadcrumbPath}/${name}`, '');
      }
      await refreshPane(paneId);

      // In column view, also refresh the current directory in cached columns
      if (viewMode === 'column' && columnFiles[currentBreadcrumbPath]) {
        const res = await window.electronAPI.readdir(currentBreadcrumbPath);
        if (res.success) {
          updateColumnState(paneId, { 
            filesByPath: { ...columnFiles, [currentBreadcrumbPath]: sortFiles(res.files, sortBy, sortOrder) } 
          });
        }
      }
    }
    setCreatingName(null);
    setCreatingNameValue('');
  };

  const selectedFileObjects = files.filter(f => selectedFiles.has(f.path));

  const renderFileRow = (file) => {
    const isSelected = selectedFiles.has(file.path);
    const isRenaming = renameFile?.path === file.path;
    const isContextMenuSelected = contextMenuFile?.path === file.path;

    return (
      <FileRow
        key={file.path}
        selected={isSelected}
        contextMenuSelected={isContextMenuSelected}
        className={dragOver === file.path ? 'drag-over' : ''}
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path)
            ? [...selectedFiles]
            : [file.path];
          if (!selectedFiles.has(file.path)) {
            setSelection(paneId, paths);
          }
          setDraggedFiles(paths);
          setIsDragging(true);
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
          e.dataTransfer.effectAllowed = 'copyMove';
          
          // Create custom drag image
          const dragImg = document.createElement('div');
          dragImg.style.cssText = `
            position: absolute;
            top: -1000px;
            padding: 6px 12px;
            background: rgba(74, 158, 255, 0.9);
            color: white;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 0, 0);
          setTimeout(() => document.body.removeChild(dragImg), 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setDraggedFiles([]);
          setDragOver(null);
        }}
        onDragOver={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
            setDragOver(file.path);
          }
        }}
        onDragEnter={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
          }
        }}
        onDragLeave={e => {
          // Only clear if we're actually leaving the element
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, file)}
      >
        <FileIcon>
          {file.isDirectory ? (
            file.name && file.name.endsWith('.app') ? (
              <FileIconComponent ext="app" size={16} />
            ) : (
              '📁'
            )
          ) : (
            <FileIconComponent ext={file.extension} size={16} />
          )}
        </FileIcon>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenameFile(null);
            }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'transparent', border: '1px solid #4A9EFF',
              color: '#e8e8ed', fontSize: 12, padding: '1px 4px',
              borderRadius: 3, outline: 'none', flex: 1,
            }}
          />
        ) : (
          <FileName>
            {file.name}
            {file.isSymlink && file.symlinkTarget && (
              <SymlinkIndicator 
                data-tooltip-id="symlink-tooltip"
                data-tooltip-content={`→ ${file.symlinkTarget}`}
              >
                ↗
              </SymlinkIndicator>
            )}
            {(fileTags[file.path] || []).length > 0 && (
              <FileTagDots>
                {(fileTags[file.path] || []).map((t, i) => (
                  <FileTagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3.5 : 0} />
                ))}
              </FileTagDots>
            )}
          </FileName>
        )}
        <FileMeta>{file.isDirectory ? '—' : formatSize(file.size)}</FileMeta>
        <FileDate>{formatDate(file.modified)}</FileDate>
        <FileExt>{file.isDirectory ? 'folder' : (file.extension || '—')}</FileExt>
      </FileRow>
    );
  };

  const renderGridItem = (file) => {
    const isSelected = selectedFiles.has(file.path);
    return (
      <GridItem
        key={file.path}
        selected={isSelected}
        className={dragOver === file.path ? 'drag-over' : ''}
        onClick={e => handleFileClick(e, file)}
        onDoubleClick={() => handleDoubleClick(file)}
        onContextMenu={e => handleContextMenu(e, file)}
        draggable
        onDragStart={e => {
          const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
          if (!selectedFiles.has(file.path)) {
            setSelection(paneId, paths);
          }
          setDraggedFiles(paths);
          setIsDragging(true);
          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
          e.dataTransfer.effectAllowed = 'copyMove';
          
          // Create custom drag image
          const dragImg = document.createElement('div');
          dragImg.style.cssText = `
            position: absolute;
            top: -1000px;
            padding: 6px 12px;
            background: rgba(74, 158, 255, 0.9);
            color: white;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          `;
          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 0, 0);
          setTimeout(() => document.body.removeChild(dragImg), 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          setDraggedFiles([]);
          setDragOver(null);
        }}
        onDragOver={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
            setDragOver(file.path);
          }
        }}
        onDragEnter={e => {
          if (file.isDirectory && !draggedFiles.includes(file.path)) {
            e.preventDefault();
          }
        }}
        onDragLeave={e => {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, file)}
      >
        <GridIcon>
          {file.isDirectory ? (
            file.name && file.name.endsWith('.app') ? (
              <FileIconComponent ext="app" size={24} />
            ) : (
              '📁'
            )
          ) : (
            <FileIconComponent ext={file.extension} size={24} />
          )}
        </GridIcon>
        <GridName>{file.name}</GridName>
        {file.isSymlink && file.symlinkTarget && (
          <GridSymlinkIndicator 
            data-tooltip-id="symlink-tooltip"
            data-tooltip-content={`→ ${file.symlinkTarget}`}
          >
            ↗
          </GridSymlinkIndicator>
        )}
        {(fileTags[file.path] || []).length > 0 && (
          <GridTagDots>
            {(fileTags[file.path] || []).map((t, i) => (
              <GridTagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3 : 0} />
            ))}
          </GridTagDots>
        )}
      </GridItem>
    );
  };

  const crumbs = getBreadcrumbs(paneId);
  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
  const previewFile = useStore(s => s.previewFile);
  const showPreview = useStore(s => s.showPreview);
  const previewWidth = useStore(s => s.previewWidth);

  return (
    <PaneContainer ref={paneRef} className={activePane === paneId ? 'active' : ''} onClick={() => setActivePane(paneId)}>
      {/* Tab Bar */}
      <TabBar style={!showSidebar && paneId === 'left' ? { paddingLeft: 80 } : undefined}>
        {tabs.map((tab, i) => (
          <Tab key={tab.id} className={i === activeTab ? 'active' : ''} onClick={() => switchTab(paneId, i)}>
            <span className="tab-name">{tab.label || '/'}</span>
            {tabs.length > 1 && (
              <span className="close-btn" onClick={e => { e.stopPropagation(); closeTab(paneId, i); }}>✕</span>
            )}
          </Tab>
        ))}
        <NewTabBtn onClick={() => addTab(paneId)} title="New Tab">+</NewTabBtn>
      </TabBar>

      {/* Toolbar */}
      <Toolbar>
        <NavBtn 
          onClick={() => goBackInHistory(paneId)} 
          disabled={pane.navigationIndex <= 0}
          title="Go back"
        >
          ←
        </NavBtn>
        <NavBtn 
          onClick={() => goForwardInHistory(paneId)} 
          disabled={pane.navigationIndex >= pane.navigationHistory.length - 1}
          title="Go forward"
        >
          →
        </NavBtn>
        <Breadcrumb>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <BreadSep>›</BreadSep>}
              <BreadcrumbItem 
                className={i === crumbs.length - 1 ? 'last' : ''} 
                onClick={() => {
                  if (i < crumbs.length - 1) {
                    // Hide preview pane when clicking breadcrumb
                    closePreview();

                    if (viewMode === 'column') {
                      // In column view, trim the breadcrumb path — keep basePath and columns intact
                      const currentPane = useStore.getState().panes.find(p => p.id === paneId);
                      setCurrentBreadcrumbPath(paneId, crumb.path);
                      pushNavHistory(paneId, {
                        basePath: currentPane.basePath,
                        currentBreadcrumbPath: crumb.path,
                        selectedFiles: [],
                        previewFilePath: null,
                      });
                    } else {
                      // Smart breadcrumb navigation with bookmark scope detection
                      const activeBookmark = getActiveBookmark(paneId);

                      // Check if clicked path is at or under active bookmark
                      const isUnderBookmark = activeBookmark &&
                        (crumb.path === activeBookmark.path || crumb.path.startsWith(activeBookmark.path + '/'));

                      if (!isUnderBookmark) {
                        // Reset basePath when navigating outside bookmark scope
                        useStore.getState().updatePane(paneId, { basePath: '/', activeBookmarkId: null });
                      }

                      // navigateTo pushes history itself
                      setCurrentBreadcrumbPath(paneId, crumb.path);
                      navigateTo(paneId, crumb.path);
                    }
                  }
                }}
              >
                {crumb.name}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </Breadcrumb>
      </Toolbar>

      {/* Content Area with File List and Preview */}
      <ContentArea>
      <FileListArea
        onDragOver={e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
        }}
        onDragEnter={e => {
          e.preventDefault();
          dragCounterRef.current++;
        }}
        onDragLeave={e => {
          dragCounterRef.current--;
          if (dragCounterRef.current === 0) {
            setDragOver(null);
          }
        }}
        onDrop={e => handleDrop(e, null)}
        onContextMenu={handleBackgroundContextMenu}
        onClick={() => {
          setSelection(paneId, []);
          setContextMenu(null);
          setContextMenuFile(null);
        }}
      >
        {loading && (
          <EmptyState>
            <span style={{ color: '#4A9EFF' }}>Loading...</span>
          </EmptyState>
        )}
        {!loading && files.length === 0 && (
          <EmptyState>
            <span style={{ fontSize: 32 }}>📭</span>
            <span>This folder is empty</span>
          </EmptyState>
        )}
        {!loading && files.length > 0 && viewMode === 'list' && (
          <>
            <ColumnHeader>
              <span />
              <ColHead onClick={() => setSortBy(paneId, 'name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </ColHead>
              <ColHead onClick={() => setSortBy(paneId, 'size', sortBy === 'size' && sortOrder === 'asc' ? 'desc' : 'asc')} style={{ textAlign: 'right' }}>
                Size {sortBy === 'size' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </ColHead>
              <ColHead onClick={() => setSortBy(paneId, 'modified', sortBy === 'modified' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                Modified {sortBy === 'modified' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </ColHead>
              <ColHead onClick={() => setSortBy(paneId, 'extension', sortBy === 'extension' && sortOrder === 'asc' ? 'desc' : 'asc')}>
                Kind {sortBy === 'extension' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </ColHead>
            </ColumnHeader>
            {files.map(renderFileRow)}
          </>
        )}
        {!loading && files.length > 0 && viewMode === 'grid' && (
          <GridWrap>{files.map(renderGridItem)}</GridWrap>
        )}
        {!loading && viewMode === 'column' && (
          <ColumnsContainer ref={columnsContainerRef}>
            {/* Render all columns from derived columnPaths */}
            {columnPaths.map((colPath, idx) => {
              const isFirstColumn = idx === 0;
              const colFiles = isFirstColumn ? files : filterHiddenFiles(columnFiles[colPath] || [], showHidden);
              return (
                <Column key={colPath} width={columnWidths[idx] ? `${columnWidths[idx]}px` : '200px'} className={focusedColumn === idx ? 'active' : ''} data-column-index={idx}>
                  <ColumnList 
                    data-column-list
                    onClick={() => handleColumnEmptyClick(idx)}
                    onDragOver={e => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
                    }}
                    onDrop={e => {
                      e.stopPropagation();
                      handleDrop(e, null, colPath);
                    }}
                  >
                    {colFiles.map(file => (
                      <ColumnItem
                        key={file.path}
                        className={`${selectedFiles.has(file.path) ? 'selected' : derivedSelections[idx] === file.path ? (idx < columnPaths.length - 1 ? 'selected-dim' : 'selected') : ''} ${dragOver === file.path ? 'drag-over' : ''}`}
                        contextMenuSelected={contextMenuFile?.path === file.path}
                        onClick={e => {
                          e.stopPropagation();
                          setActivePane(paneId);
                          updateColumnState(paneId, { focusedIndex: idx });
                          if (e.metaKey || e.ctrlKey) {
                            toggleSelection(paneId, file.path, true);
                          } else if (e.shiftKey) {
                            // Range select - add range to existing selection
                            const fileIndex = colFiles.findIndex(f => f.path === file.path);
                            const selArray = [...selectedFiles];
                            if (selArray.length > 0) {
                              const lastIdx = colFiles.findIndex(f => f.path === selArray[selArray.length - 1]);
                              const [start, end] = [Math.min(fileIndex, lastIdx), Math.max(fileIndex, lastIdx)];
                              const range = colFiles.slice(start, end + 1).map(f => f.path);
                              // Merge range with existing selection
                              const mergedSelection = new Set([...selectedFiles, ...range]);
                              setSelection(paneId, [...mergedSelection]);
                            } else {
                              setSelection(paneId, [file.path]);
                            }
                          } else {
                            setSelection(paneId, [file.path]);
                          }
                          handleColumnClick(file, idx);
                        }}
                        onContextMenu={e => handleContextMenu(e, file)}
                        draggable
                        onDragStart={e => {
                          const paths = selectedFiles.has(file.path) ? [...selectedFiles] : [file.path];
                          if (!selectedFiles.has(file.path)) {
                            setSelection(paneId, paths);
                          }
                          setDraggedFiles(paths);
                          setIsDragging(true);
                          e.dataTransfer.setData('file-paths', JSON.stringify(paths));
                          e.dataTransfer.effectAllowed = 'copyMove';
                          
                          // Create custom drag image
                          const dragImg = document.createElement('div');
                          dragImg.style.cssText = `
                            position: absolute;
                            top: -1000px;
                            padding: 6px 12px;
                            background: rgba(74, 158, 255, 0.9);
                            color: white;
                            border-radius: 6px;
                            font-size: 12px;
                            font-weight: 500;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                          `;
                          dragImg.textContent = paths.length === 1 ? file.name : `${paths.length} items`;
                          document.body.appendChild(dragImg);
                          e.dataTransfer.setDragImage(dragImg, 0, 0);
                          setTimeout(() => document.body.removeChild(dragImg), 0);
                        }}
                        onDragEnd={() => {
                          setIsDragging(false);
                          setDraggedFiles([]);
                          setDragOver(null);
                        }}
                        onDragOver={e => {
                          if (file.isDirectory && !draggedFiles.includes(file.path)) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
                            setDragOver(file.path);
                          }
                        }}
                        onDragEnter={e => {
                          if (file.isDirectory && !draggedFiles.includes(file.path)) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDragLeave={e => {
                          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
                            setDragOver(null);
                          }
                        }}
                        onDrop={e => {
                          e.stopPropagation();
                          handleDrop(e, file);
                        }}
                      >
                        <span className="icon">
                          {file.isDirectory ? (
                            file.name && file.name.endsWith('.app') ? (
                              <FileIconComponent ext="app" size={14} />
                            ) : (
                              '📁'
                            )
                          ) : (
                            <FileIconComponent ext={file.extension} size={14} />
                          )}
                        </span>
                        <span className="name">{file.name}</span>
                        {file.isSymlink && file.symlinkTarget && (
                          <ColumnSymlinkIndicator 
                            data-tooltip-id="symlink-tooltip"
                            data-tooltip-content={`→ ${file.symlinkTarget}`}
                          >
                            ↗
                          </ColumnSymlinkIndicator>
                        )}
                        {(fileTags[file.path] || []).length > 0 && (
                          <ColumnTagDots>
                            {(fileTags[file.path] || []).map((t, i) => (
                              <ColumnTagDot key={t.tag_name} color={t.color} offset={i > 0 ? -3.5 : 0} />
                            ))}
                          </ColumnTagDots>
                        )}
                      </ColumnItem>
                    ))}
                  </ColumnList>
                  <ColumnResizer onMouseDown={(e) => {
                    resizeStartRef.current = { startX: e.clientX, startWidth: columnWidths[idx] || 200 };
                    setResizingColumn(idx);
                  }} />
                </Column>
              );
            })}
          </ColumnsContainer>
        )}
      </FileListArea>

      {/* Preview Pane */}
      {showPreview && activePane === paneId && previewFile && (
        <PreviewPane file={previewFile} width={`${previewWidth}px`} />
      )}
      </ContentArea>

      {/* Quick Preview Modal (Spacebar) */}
      {quickPreviewFile && (
        <QuickPreviewModal
          file={quickPreviewFile}
          onClose={() => setQuickPreviewFile(null)}
        />
      )}

      {/* Inline create input */}
      {creatingName && (
        <InlineCreateRow onClick={e => e.stopPropagation()}>
          <span>{creatingName === 'folder' ? '📁' : '📄'} New {creatingName} name:</span>
          <input
            ref={creatingInputRef}
            value={creatingNameValue}
            onChange={e => setCreatingNameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitCreating();
              if (e.key === 'Escape') { setCreatingName(null); setCreatingNameValue(''); }
            }}
            placeholder={`Enter ${creatingName} name...`}
            autoFocus
          />
          <button onClick={commitCreating}>Create</button>
          <button onClick={() => { setCreatingName(null); setCreatingNameValue(''); }}>Cancel</button>
        </InlineCreateRow>
      )}

      {/* Status Bar */}
      <StatusBar>
        <span>{files.length} items · {formatSize(totalSize)}</span>
        <span>{selectedFiles.size > 0 ? `${selectedFiles.size} selected` : ''}</span>
      </StatusBar>

      {/* Inline Finder-style tag picker */}
      {tagMenuOpen && tagMenuFile && (
        <InlineTagPicker
          file={tagMenuFile}
          allTags={tagMenuAllTags}
          fileTags={tagMenuFileTags}
          onClose={() => { setTagMenuOpen(false); setTagMenuFile(null); }}
          onChanged={(newFileTags, newAllTags) => {
            setTagMenuFileTags(newFileTags);
            if (newAllTags) setTagMenuAllTags(newAllTags);
            // Refresh the tag dots for this file
            window.electronAPI.getTags(tagMenuFile.path).then(r => {
              if (r.success) {
                setFileTags(prev => ({ ...prev, [tagMenuFile.path]: r.tags }));
              }
            });
            useStore.getState().loadAllTags();
          }}
        />
      )}

      {contextMenu && (
        <ContextMenu className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          {contextMenu.background ? (
            <>
              <MenuItem onClick={() => { createFolder(); setContextMenu(null); setContextMenuFile(null); }}>📁 New Folder</MenuItem>
              <MenuItem onClick={() => { createFile(); setContextMenu(null); setContextMenuFile(null); }}>📄 New File</MenuItem>
              <MenuItem onClick={async () => { 
                await refreshPane(paneId); 
                // In column view, also refresh all cached column directories
                if (viewMode === 'column') {
                  const updatedFilesByPath = { ...columnFiles };
                  for (const colPath of Object.keys(columnFiles)) {
                    const res = await window.electronAPI.readdir(colPath);
                    if (res.success) {
                      updatedFilesByPath[colPath] = sortFiles(res.files, sortBy, sortOrder);
                    }
                  }
                  updateColumnState(paneId, { filesByPath: updatedFilesByPath });
                }
                setContextMenu(null); setContextMenuFile(null); 
              }}>↺ Refresh</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); setContextMenuFile(null); }}>
                  📋 Paste {clipboardQueue.length} item{clipboardQueue.length > 1 ? 's' : ''}
                </MenuItem>
              )}
              <MenuDivider />
              {/* Inline sort row for background context menu */}
              <CtxSortRow>
                {SORT_TYPES.map(st => {
                  const active = getDirSort(ctxSortTarget || currentBreadcrumbPath) === st.id;
                  return (
                    <CtxSortBtn
                      key={st.id}
                      active={active}
                      title={st.label}
                      onMouseEnter={() => setCtxSortHover(st.id)}
                      onMouseLeave={() => setCtxSortHover(null)}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await setDirectorySort(ctxSortTarget || currentBreadcrumbPath, st.id);
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
                    </CtxSortBtn>
                  );
                })}
              </CtxSortRow>
              <CtxSortLabel>
                {ctxSortHover
                  ? `Sort by ${SORT_TYPES.find(s => s.id === ctxSortHover)?.label}`
                  : `Sort: ${SORT_TYPES.find(s => s.id === getDirSort(ctxSortTarget || currentBreadcrumbPath))?.label || 'Name'}`
                }
              </CtxSortLabel>
              <MenuDivider />
              <MenuItem onClick={() => { openModal('sizeViz', { path: currentBreadcrumbPath, paneId }); setContextMenu(null); setContextMenuFile(null); }}>
                📊 Disk Usage Map
              </MenuItem>
            </>
          ) : (
            <>
              {contextMenu.file?.isDirectory && (
                <>
                  <MenuItem onClick={() => {
                    const file = contextMenu.file;
                    if (!bookmarks.find(bm => bm.path === file.path)) {
                      const name = file.name || file.path.split('/').pop() || file.path;
                      setBookmarks([...bookmarks, { id: `bm-${Date.now()}`, name, path: file.path, icon: 'default' }]);
                    }
                    setContextMenu(null); setContextMenuFile(null);
                  }}>🔖 Add to Bookmarks</MenuItem>
                  <MenuItem onClick={() => {
                    openModal('sizeViz', { path: contextMenu.file.path, paneId });
                    setContextMenu(null); setContextMenuFile(null);
                  }}>📊 Disk Usage Map</MenuItem>
                  <MenuDivider />
                  {/* Inline sort row — only shown on directory right-click */}
                  <CtxSortRow>
                    {SORT_TYPES.map(st => {
                      const active = getDirSort(ctxSortTarget) === st.id;
                      return (
                        <CtxSortBtn
                          key={st.id}
                          active={active}
                          title={st.label}
                          onMouseEnter={() => setCtxSortHover(st.id)}
                          onMouseLeave={() => setCtxSortHover(null)}
                          onClick={async (ev) => {
                            ev.stopPropagation();
                            await setDirectorySort(ctxSortTarget, st.id);
                          }}
                        >
                          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
                        </CtxSortBtn>
                      );
                    })}
                  </CtxSortRow>
                  <CtxSortLabel>
                    {ctxSortHover
                      ? `Sort by ${SORT_TYPES.find(s => s.id === ctxSortHover)?.label}`
                      : `Sort: ${SORT_TYPES.find(s => s.id === getDirSort(ctxSortTarget))?.label || 'Name'}`
                    }
                  </CtxSortLabel>
                  <MenuDivider />
                </>
              )}
              <MenuItem onClick={() => { startRename(contextMenu.file); setContextMenu(null); setContextMenuFile(null); }}>✏️ Rename</MenuItem>
              {selectedFiles.size > 1 && (
                <MenuItem onClick={() => {
                  openModal('batchRename', { files: selectedFileObjects, basePath: currentPath });
                  setContextMenu(null); setContextMenuFile(null);
                }}>✏️ Batch Rename...</MenuItem>
              )}
              <MenuDivider />
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'copy');
                setContextMenu(null); setContextMenuFile(null);
              }}>📋 Copy</MenuItem>
              <MenuItem onClick={() => {
                addToClipboard([...selectedFiles], 'cut');
                setContextMenu(null); setContextMenuFile(null);
              }}>✂️ Cut</MenuItem>
              {clipboardQueue.length > 0 && (
                <MenuItem onClick={() => { pasteClipboard(currentPath); setContextMenu(null); setContextMenuFile(null); }}>
                  📋 Paste
                </MenuItem>
              )}
              <MenuDivider />
              {/* Inline tag dot row */}
              <CtxTagRow>
                {ctxAllTags.map(tag => {
                  const active = ctxFileTags.has(tag.tag_name);
                  return (
                    <CtxTagDot
                      key={tag.tag_name}
                      color={tag.color}
                      active={active}
                      hovered={ctxTagHover === tag.tag_name}
                      onMouseEnter={() => setCtxTagHover(tag.tag_name)}
                      onMouseLeave={() => setCtxTagHover(null)}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const file = contextMenu.file;
                        if (active) {
                          await window.electronAPI.removeTag({ filePath: file.path, tagName: tag.tag_name });
                          setCtxFileTags(prev => { const n = new Set(prev); n.delete(tag.tag_name); return n; });
                        } else {
                          await window.electronAPI.addTag({ filePath: file.path, tagName: tag.tag_name });
                          setCtxFileTags(prev => new Set([...prev, tag.tag_name]));
                        }
                        // Refresh tag dots
                        window.electronAPI.getTags(file.path).then(r => {
                          if (r.success) setFileTags(prev => ({ ...prev, [file.path]: r.tags }));
                        });
                        useStore.getState().loadAllTags();
                      }}
                    >
                      {active ? '✓' : ''}
                    </CtxTagDot>
                  );
                })}
              </CtxTagRow>
              <CtxTagLabel>
                {ctxTagHover ? (
                  ctxFileTags.has(ctxTagHover)
                    ? `Remove "${ctxTagHover}"`
                    : `Add "${ctxTagHover}"`
                ) : "All tags"}
              </CtxTagLabel>
              <MenuDivider />
              {/* Inline sort row — applies to the containing directory */}
              <CtxSortRow>
                {SORT_TYPES.map(st => {
                  const active = getDirSort(ctxSortTarget) === st.id;
                  return (
                    <CtxSortBtn
                      key={st.id}
                      active={active}
                      title={st.label}
                      onMouseEnter={() => setCtxSortHover(st.id)}
                      onMouseLeave={() => setCtxSortHover(null)}
                      onClick={async (ev) => {
                        ev.stopPropagation();
                        await setDirectorySort(ctxSortTarget, st.id);
                      }}
                    >
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" dangerouslySetInnerHTML={{ __html: st.svgInner }} />
                    </CtxSortBtn>
                  );
                })}
              </CtxSortRow>
              <CtxSortLabel>
                {ctxSortHover
                  ? `Sort by ${SORT_TYPES.find(s => s.id === ctxSortHover)?.label}`
                  : `Sort: ${SORT_TYPES.find(s => s.id === getDirSort(ctxSortTarget))?.label || 'Name'}`
                }
              </CtxSortLabel>
              <MenuDivider />
              <MenuItem onClick={() => {
                openModal('permissions', { file: contextMenu.file });
                setContextMenu(null); setContextMenuFile(null);
              }}>🔒 Permissions...</MenuItem>
              {!contextMenu.file?.isDirectory && (
                <>
                  <MenuDivider />
                  <MenuItem onClick={async () => {
                    const sel = [...selectedFiles];
                    const dest = `${currentPath}/${sel.map(p => p.split('/').pop()).join('_')}.zip`;
                    await window.electronAPI.zip({ files: sel, destPath: dest });
                    await refreshPane(paneId);

                    // In column view, also refresh the current directory in cached columns
                    if (viewMode === 'column' && columnFiles[currentPath]) {
                      const res = await window.electronAPI.readdir(currentPath);
                      if (res.success) {
                        updateColumnState(paneId, { 
                          filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) } 
                        });
                      }
                    }
                    setContextMenu(null); setContextMenuFile(null);
                  }}>📦 Zip</MenuItem>
                  {contextMenu.file?.extension === 'zip' && (
                    <MenuItem onClick={async () => {
                      const zipFile = contextMenu.file;
                      const destDir = zipFile.path.replace('.zip', '');
                      await window.electronAPI.unzip({ filePath: zipFile.path, destDir });
                      await refreshPane(paneId);

                      // In column view, also refresh the current directory in cached columns
                      if (viewMode === 'column' && columnFiles[currentPath]) {
                        const res = await window.electronAPI.readdir(currentPath);
                        if (res.success) {
                          updateColumnState(paneId, { 
                            filesByPath: { ...columnFiles, [currentPath]: sortFiles(res.files, sortBy, sortOrder) } 
                          });
                        }
                      }
                      setContextMenu(null); setContextMenuFile(null);
                    }}>📂 Unzip Here</MenuItem>
                  )}
                </>
              )}
              <MenuDivider />
              <MenuItem danger onClick={() => {
                deleteSelected();
                setContextMenu(null); setContextMenuFile(null);
              }}>🗑️ Move to Trash</MenuItem>
            </>
          )}
        </ContextMenu>
      )}

      {/* Symlink Tooltip */}
      <Tooltip 
        id="symlink-tooltip"
        place="top"
        delayShow={100}
        opacity={1}
        className="symlink-tooltip"
      />
    </PaneContainer>
  );
}