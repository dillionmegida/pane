# TODO List

## Test Suite Issues
- There are still some failing tests in the test suite
  - Need to debug and fix the remaining failing tests
  - Tests are exiting with code 1 indicating failures
  - Need to identify which specific tests are failing and why

## Search Reveal Functionality
- The search reveal functionality doesn't work well yet
  - Visual selection indicators are not showing correctly for all columns
  - Only the first column shows selection, subsequent columns don't
  - Need to debug why selectedItems state isn't being applied correctly

## Smart Folders
- Smart folders don't take account of the breadcrumb
- There are inconsistencies with breadcrumb and "where am I currently at" indicators
- Need to fix smart folder navigation to properly track and display current location

- arrow navigation for files and folders is broken

## ✅ Drag and Drop Functionality (COMPLETED)
- ✅ Implemented drag and drop for files between folders (exactly like Finder behavior)
  - ✅ Dragging files into folders works in all view modes (list, grid, column)
  - ✅ Drag files to folder names/icons with visual feedback
  - ✅ Custom drag image showing file name or item count
  - ✅ Blue highlight on drag-over for target folders
  - ✅ Option/Alt key to copy instead of move (Finder behavior)
  - ✅ Prevents dropping into same directory
  - ✅ Proper file system operations (move/copy) with error handling
  - ✅ Auto-refresh both panes after drop

## Modal Navigation Controls
- Lock up and down arrow keys when modals are open
  - Prevent arrow key navigation in background when file finder modal is open
  - Prevent arrow key navigation in background when smart folder modal is open
  - Arrow keys should only control modal content/navigation when modal is active
  - Need to capture and prevent default arrow key behavior
  - Restore normal arrow key functionality when modal closes
  - Ensure focus management for accessibility



- after deleting from large files, the item still there
- reuse large files logic for other smart folders
- make some files in the list undeletable..for example files that appear under certain directories like System or something
