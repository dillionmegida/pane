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

## Drag and Drop Functionality
- Implement drag and drop for files between folders (like Finder behavior)
  - When a folder is open, allow dragging files into other folders
  - User should be able to drag files to the filename box of target folders
  - Need to implement visual feedback during drag operations
  - Handle file movement logic and update folder contents
  - Add drag-over states for target folders
  - Implement proper file system operations for moving files

## Modal Navigation Controls
- Lock up and down arrow keys when modals are open
  - Prevent arrow key navigation in background when file finder modal is open
  - Prevent arrow key navigation in background when smart folder modal is open
  - Arrow keys should only control modal content/navigation when modal is active
  - Need to capture and prevent default arrow key behavior
  - Restore normal arrow key functionality when modal closes
  - Ensure focus management for accessibility
