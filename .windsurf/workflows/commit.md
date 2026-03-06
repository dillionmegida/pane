---
description: Group related files and create meaningful commits
---

# Commit Skill

This skill helps you create meaningful commits by grouping related files and generating appropriate commit messages.

## Usage

Run this skill when you have made changes to multiple files and want to create a structured commit.

## Steps

1. **Analyze Changes**: The skill will first analyze all modified files to understand what has been changed
2. **Group Related Files**: Files will be grouped based on their functionality and the nature of changes
3. **Generate Commit Message**: A meaningful commit message will be generated based on the grouped changes
4. **Create Commit**: The commit will be created with the generated message and grouped files

## File Grouping Logic

Files are grouped based on:
- **Component changes**: React components, UI elements
- **Configuration changes**: package.json, webpack configs, build files
- **Documentation changes**: README, docs, comments
- **Style changes**: CSS, styled components, themes
- **Core functionality**: Main process, store, IPC handlers
- **Infrastructure**: Git ignore, build scripts, CI/CD

## Commit Message Format

Commits follow conventional commit format:
```
type(scope): description

[optional detailed body]
```

Types used:
- `feat`: New features
- `fix`: Bug fixes
- `refactor`: Code refactoring
- `style`: Styling changes
- `docs`: Documentation changes
- `build`: Build and dependency changes
- `chore`: Maintenance tasks

## Example Output

```
feat(ui): add column view keyboard navigation

- Implement arrow key navigation for column view
- Add focus management between columns
- Improve accessibility with keyboard shortcuts
- Update FilePane component with new event handlers

Files changed:
- src/components/FilePane.jsx
- src/store/index.js
```

## Automation

This skill can be run automatically when you have staged changes and want to create a commit with proper grouping and messaging.

## Notes

- The skill will respect any existing .gitignore patterns
- Large changes may be split into multiple logical commits
- Conflicts will be highlighted for manual resolution
- The skill will not push commits automatically - you'll need to push manually
