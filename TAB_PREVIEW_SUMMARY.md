# Tab Preview File Implementation Summary

## Problem

The preview pane was global, so switching tabs would show the wrong file's preview. Tab A might be previewing `doc.txt`, but when you switch to Tab B, the preview pane still shows `doc.txt` instead of Tab B's active file.

## Solution

Made `previewFile` per-tab instead of global:

### Store Changes (`src/store/index.js`)

1. **Added `previewFile` to tab state**
   - `createTabState()` now includes `previewFile: null`
   - Each tab independently tracks its preview file

2. **Updated `snapshotTab()` helper**
   - Now accepts `globalPreviewFile` parameter
   - Snapshots current preview into the active tab

3. **Updated `switchTab()`**
   - Saves current preview to current tab
   - Restores preview from target tab
   - Sets global `previewFile` and `showPreview` from target tab

4. **Updated `closeTab()`**
   - Restores preview from the new active tab after closing

5. **Updated `addTab()`**
   - Clears preview when creating new tab (new tabs start with no preview)

6. **Updated `setPreviewFile()` and `closePreview()`**
   - Now snapshot preview into active tab of active pane
   - Maintains both global state (for UI) and per-tab state (for persistence)

7. **Updated all state-mutating actions**
   - `navigateTo`, `navigateToReveal`, `navigateToBookmark`
   - `setCurrentBreadcrumbPath`, `setViewMode`
   - `updateColumnState`, `clearColumnState`, `setColumnState`
   - All now pass `previewFile` to `snapshotTab()`

8. **Session persistence**
   - `saveSession()` serializes each tab's `previewFilePath`
   - `init()` hydrates each tab's preview file from disk
   - Active pane's active tab's preview becomes the global preview

### Behavior

✅ **Each tab independently tracks its preview file**

- Tab 1 can preview `doc.txt`
- Tab 2 can preview `image.png`
- Tab 3 can have no preview (closed)

✅ **Switching tabs restores correct preview**

- Switch to Tab 1 → preview shows `doc.txt`
- Switch to Tab 2 → preview shows `image.png`
- Switch to Tab 3 → preview pane closes

✅ **Creating new tab clears preview**

- New tabs start with no preview file
- Preview pane closes when switching to new tab

✅ **Closing tab restores adjacent tab's preview**

- If Tab 2 (active) is closed, Tab 3 becomes active
- Preview pane shows Tab 3's preview file (or closes if none)

✅ **Session persistence**

- Each tab's preview is saved to localStorage
- On app restart, tabs restore with their preview files
- Active pane's active tab's preview is shown globally

### Tests (`src/__tests__/tabs.test.js`)

Added 8 new tests in "Tabs - Preview File Per Tab" suite:

1. ✅ Switching tabs restores preview from target tab
2. ✅ Switching to tab with no preview closes preview pane
3. ✅ `setPreviewFile` saves to active tab
4. ✅ `closePreview` clears preview in active tab
5. ✅ Switching back to tab1 restores its preview
6. ✅ Creating new tab clears preview
7. ✅ Closing active tab restores preview from new active tab
8. ✅ Session persistence saves per-tab preview

**Total: 184 tests passing** (176 existing + 8 new)

## Technical Details

### Global vs Per-Tab State

- **Global state** (`previewFile`, `showPreview`): What the UI currently displays
- **Per-tab state** (`tab.previewFile`): What each tab remembers

When switching tabs:
1. Current tab's preview is saved: `tab.previewFile = globalPreviewFile`
2. Target tab's preview is restored: `globalPreviewFile = tab.previewFile`
3. UI updates to show the restored preview

### Snapshot Pattern

All state mutations follow this pattern:
```javascript
const newTabs = pane.tabs.map((t, i) =>
  i === pane.activeTab ? snapshotTab(pane, globalPreviewFile) : t
);
```

This ensures the active tab always has the latest state before any changes.
