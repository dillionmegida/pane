---
description: Analyze changes and generate meaningful conventional commits
---

# Generate Commit Skill

This skill analyzes working directory changes and creates meaningful conventional commits by grouping related files.

## Usage

Run when you have unstaged changes and want to create structured, conventional commits.

## Steps

1. **Analyze Changes**
   // turbo

   ```bash
   git status --short
   git diff --stat
   ```

2. **Review File Contents**

   - Examine each modified file to understand the nature of changes
   - Identify distinct features, fixes, or refactors

3. **Group by Feature**

   Group files into logical commits based on:

   - **feat**: New functionality (components, features)
   - **fix**: Bug fixes
   - **refactor**: Code restructuring without behavior change
   - **style**: Visual/CSS changes
   - **test**: Test additions/updates
   - **docs**: Documentation changes
   - **build**: Build system, dependencies
   - **chore**: Maintenance tasks

4. **Stage and Commit Each Group**

   ```bash
   git add <files-for-group-1>
   git commit -m "type(scope): description

   - Detailed change 1
   - Detailed change 2"
   ```

5. **Verify Commits**

   ```bash
   git log --oneline -N
   git show --stat HEAD~N..HEAD
   ```

## Commit Message Format

```text
type(scope): short description

- Change detail 1
- Change detail 2
```

Types: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `build`, `chore`

## Example Workflow

Given changes to:
- `Sidebar.jsx` (resize handle)
- `store/index.js` (sidebar state + other fixes)
- `FilePane.jsx` (selection UI)
- `store.test.js` (test updates)

Generate:
1. `feat(sidebar): add resizable sidebar...` (Sidebar.jsx + store sidebar parts)
2. `feat(ui): improve column view selection...` (FilePane.jsx)
3. `test(store): update preview width test...` (test file)

## Notes

- One logical change per commit
- Group files that work together for a single feature
- Include test changes with their related feature or as separate test commits
- Use body for multiple change details
- Scope should be the primary component/module affected
