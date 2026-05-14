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


- another one is that, when i do Cmd + F, at the bottom, I can see 0 results and the file directory path...now i'd like to be able to change the directory path to something else...so basically that directory path should be a button i can use to select another directory for Cmd + F to search
- same thing applies to Smart Folders...where the path is currently [path]:, i'd like the path to be a button i can click to select another path...changing this should not affect the current file tree columns by the way, that should stay the same

- when i'm on Cmd + F or smart folders, i'd like the same functionality where if i select a media file, spacebar should play/pause it

* when i delete item, i notice the file tree refreshes and changes the sort...i don't want that

* disk usage map should show folders first before files

@SearchOverlay.jsx#L520-521 if the search input was in focus at the time of clicking root, the focus should return back to the input


react window

High Impact
1. SearchOverlay results (line 592)

results.map() renders all search matches
Searching large directories can return thousands of files
Currently renders every result, causing performance issues with large result sets
2. FilePane list view (line 1687)

files.map(renderFileRow) renders all files in a directory
Directories like node_modules, vendor, or user folders can have 1000+ files
Each row has multiple styled components and event handlers
3. FilePane grid view (line 1691)

files.map(renderGridItem) renders grid items
Grid items are heavier (larger icons, more DOM per item)
Same scalability issue as list view
4. FilePane column view (line 1713)

colFiles.map(file => ...) renders each column's contents
Multiple columns with hundreds of files each compound the problem
Column view is the default, so this affects most users
Low Impact (skip for now)
Sidebar bookmarks/tags - Typically < 50 items, not worth the complexity
Tab bar - Usually < 10 tabs
Breadcrumbs - Short path segments
Recommendation
Start with SearchOverlay first—it's the easiest win (single list, simple item structure) and has the highest potential for large result sets. Then tackle FilePane list/grid views for directories with many files.



* show logos of apps in the applications directory
* double clicking an app should open the app
* i'm considering spacebar on directories to open disk usage modal
* there's a way finder does renaming files, where you wait a few seconds and click and a rename is activated...i want the same
* rename functionality seems broken...fix it, and rename should be inline in the filetree
* @index.js#L1313-1338  i'd like to create my own custom icons
* in filtree, diretories should come before files



* notice a bunch of jumps if i open two many columns and then click something on the second column (basically because the horizontal window becomes smaller so there's layout shift)...how finder does this is that it keeps the "maximum scroll width reached" so it doesn't jump around

so here's what i expect

when i click an item in a previous column, don't do scroll into view (scroll into view is only when i click an item that pops up a new column, or if the item i click on is not int the view at all)...

at the same time, don't resize the horizontal width yet...so if i open 7 columns, keep that same width and don't resize it...when i click an item in the first column, then now you can resize back to original

* i should be able to drag a folder to the bookmarks section in left sidebar (there should be a visual indication when i'm dragging in the bookmarks tab)

* reveal functionality is broken as well

* add support for in a file tree, being able to type to search for a file...so it debounces..and waits until i'm done so if i type "hello" it waits until i stop typing for a bit and then searches, and auto selects the first result