# Pane

A powerful custom file manager for macOS built with Electron and React. Pane provides an intuitive column-based file browsing experience similar to macOS Finder, with additional features for power users.

## Features

- **Column View Navigation**: Browse files and directories in a column-based interface
- **Keyboard Navigation**: Full keyboard support with arrow keys for efficient navigation
- **File Preview**: Quick preview of file contents
- **Terminal Integration**: Built-in terminal for command-line operations
- **Dark Mode Support**: Automatic system theme detection and support
- **Search Functionality**: Quick file and directory search
- **Context Menu**: Right-click actions for file operations
- **Multi-pane Support**: Work with multiple directory views simultaneously

## Screenshots

*(Add screenshots here when available)*

## Installation

### Prerequisites

- macOS 10.14 or later
- Node.js 16 or later
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/dillionmegida/pane.git
cd pane
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

## Development

### Development Mode

Start the application in development mode with hot reloading:

```bash
npm run dev
```

This will:
- Start webpack in watch mode to bundle the renderer process
- Launch Electron with the bundled code
- Enable hot reloading for React components

### Building

Build the application for production:

```bash
# Build renderer process only
npm run build:renderer

# Build complete Electron app
npm run build
```

### Packaging

Create distributable packages:

```bash
# Create directory structure (for testing)
npm run pack

# Create DMG and ZIP files for distribution
npm run build:electron
```

## Usage

### Navigation

- **Arrow Keys**: Navigate between files and directories
- **Enter**: Open selected file or directory
- **Tab**: Switch between panes
- **Cmd+F**: Open search overlay
- **Cmd+T**: Open new pane
- **Cmd+W**: Close current pane

### Column View

- **Click**: Select and navigate through directories
- **Arrow Up/Down**: Move between items in current column
- **Arrow Left/Right**: Navigate between columns
- **Click on empty space**: Clear selection and remove subsequent columns

### File Operations

- **Right-click**: Open context menu with file operations
- **Double-click**: Open files with default application
- **Drag & Drop**: (Coming soon) Move files between directories

## Architecture

### Project Structure

```
pane/
├── src/
│   ├── components/          # React components
│   │   ├── FilePane.jsx    # Main file browser component
│   │   ├── PreviewPane.jsx # File preview component
│   │   ├── TerminalPane.jsx # Terminal integration
│   │   └── ...
│   ├── main/               # Electron main process
│   │   ├── index.js        # Main entry point
│   │   └── preload.js      # Preload script
│   ├── store/              # State management
│   │   └── index.js        # Zustand store
│   └── App.jsx             # Main React app
├── dist/                   # Built files (generated)
├── package.json            # Dependencies and scripts
└── webpack-renderer.js     # Webpack configuration
```

### Technology Stack

- **Electron**: Desktop application framework
- **React 18**: UI framework
- **Zustand**: State management
- **Styled Components**: CSS-in-JS styling
- **Webpack**: Module bundler
- **xterm.js**: Terminal emulation
- **better-sqlite3**: Database for file indexing

### Key Components

- **FilePane**: Main file browser with column view
- **PreviewPane**: File content preview
- **TerminalPane**: Integrated terminal
- **SearchOverlay**: Global search interface
- **Store**: Global state management

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit them: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

### Development Guidelines

- Follow existing code style and conventions
- Use functional components with hooks
- Implement proper error handling
- Add keyboard accessibility to new features
- Test on different macOS versions

## Roadmap

- [ ] File drag and drop support
- [ ] File operations (copy, move, delete, rename)
- [ ] Bookmarks and favorites
- [ ] File tagging and metadata
- [ ] Advanced search with filters
- [ ] Plugin system
- [ ] Cross-platform support (Windows, Linux)

## Troubleshooting

### Common Issues

**Application doesn't start:**
- Ensure all dependencies are installed: `npm install`
- Check that Node.js version is 16 or later

**Build fails:**
- Clean the build directory: `rm -rf dist`
- Rebuild: `npm run build`

**Terminal not working:**
- Check system permissions for terminal access
- Ensure node-pty is properly installed

### Getting Help

- Open an issue on GitHub for bug reports
- Check existing issues for solutions
- Review the code comments for implementation details

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Terminal emulation by [xterm.js](https://xtermjs.org/)
- Icons from [Lucide](https://lucide.dev/)

---

**Finder Pro** - Enhance your file management experience on macOS.
