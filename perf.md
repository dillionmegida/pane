Things to Cache
<!-- 1. Directory Contents (readdir results)

window.electronAPI.readdir() is called repeatedly for the same paths
Cache key: dirPath + showHidden flag
Invalidate on file watcher events or manual refresh
Lines 315, 366, 410, 482, 720, 794, 834, 1271, 1385, 1415 in store/index.ts -->
<!-- 2. Sorted File Lists

sortFiles() creates new arrays every call (line 324, 375, 419, 484, 503, 553, 729, 803, 837)
Cache key: files array checksum + sortBy + sortOrder
Invalidation: when files change or sort settings change -->
<!-- 3. Column State

buildColumnState() makes multiple sequential readdir calls (columnState.ts lines 49-55)
Cache key: basePath + targetPath + showHidden
Used in history restoration and file reveal -->
4. File Stats

window.electronAPI.stat() called repeatedly for same files (revealFileInTree.ts line 81, store/index.ts line 738)
Cache with short TTL (1-5 seconds) since files can change
<!-- 5. Icon Resolution

resolveIcon() called on every file render (FileIcons.tsx line 476)
Memoize the resolved icon objects since iconDefs is static -->
6. Tab Labels

getTabLabel() called in snapshotTab() which runs on every navigation (store/index.ts line 53)
Cache per tab since label only changes when breadcrumb/preview/basePath changes
Other Optimizations
7. Batch State Updates

Multiple set() calls in sequence (e.g., setDirectorySort lines 480, 486)
Use Zustand's batch updates or combine into single set()
8. Reduce Object/Array Spreading

Excessive { ...object } and [ ...array ] creating new objects
Lines 45-66, 302-304, 311-313, 326-335, etc. in store/index.ts
Use Immer for immutable updates or selective spreading
9. Debounce Session Persistence

saveSession() called after every navigation (lines 347, 389, 449, 547, 570, 781, 912, 935)
Debounce to 500ms-1s to avoid excessive localStorage writes
10. Memoize Component Renders

FilePane.tsx has many computed values (line 307: files filter)
Components like FileIcons.tsx, ColumnItem, FileListItem lack memoization
Add useMemo for expensive computations
<!-- 11. Virtualize Long Lists

FilePane renders all files in list/grid view
Use react-window or react-virtualized for directories with 1000+ files -->

13. Optimize History Management

Navigation history sliced/copied frequently (lines 645-647, 651-653)
Consider using immutable data structures or limit history size more aggressively
14. Reduce Set Operations

new Set() created frequently (lines 55, 328, 453, 459, 759)
Reuse Set objects when possible or use arrays for small selections
15. Lazy Load Column Data

Column view loads all directories upfront (buildColumnState)
Load columns on-demand as user navigates deeper
Would you like me to implement any of these optimizations? I'd recommend starting with caching directory contents and debouncing session persistence as they'll have the biggest impact.