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


-- done
- convert all scroll lines to have less width....i want it as subtle as possible
- in the breadcrumbs bar, remove all the buttons and the reload button as well..just keep the breadcrumbs
- when i Cmd + F, and i click on a folder or file, reveal is not working...reveal should basically open the directory of that directory/file as the first column, with the directory/file selected. in the case that a directory is selected, then the content of the directory should be shown in the second column and in the case that a file is selected, then the file should be shown in the preview area (this works now, but i'm thinking that reveal can show its own tab)
- also in the search modal, ensure that delete asks for confirmation modal

- new tabs are not working as expected as well...ensure that all tabs have their own settings and state...and very important, when i close the app and open the app, each tab and their own state should persist
- another one is that, when i do Cmd + F, at the bottom, I can see 0 results and the file directory path...now i'd like to be able to change the directory path to something else...so basically that directory path should be a button i can use to select another directory for Cmd + F to search
- same thing applies to Smart Folders...where the path is currently [path]:, i'd like the path to be a button i can click to select another path...changing this should not affect the current file tree columns by the way, that should stay the same
- i think we should be using react window or something