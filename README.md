# Pane

A powerful custom file manager for macOS built with Electron and React. Pane provides an intuitive column-based file browsing experience similar to macOS Finder, with additional features for power users.

## Getting Started

### Prerequisites

- macOS 10.14 or later
- Node.js 16 or later
- npm

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/dillionmegida/pane.git
cd pane
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start webpack dev server and launch the Electron app with hot reloading enabled.

### Building for Production

To create a distributable application:

```bash
npm run build
```

This will:
- Clean previous builds
- Build the renderer process with webpack
- Create a DMG and ZIP file in the `dist/` directory

## Troubleshooting

**Application doesn't start:**
- Ensure all dependencies are installed: `npm install`
- Check that Node.js version is 16 or later

**Build fails:**
- Clean the build directory: `npm run clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Terminal not working:**
- Ensure node-pty is properly installed during `npm install`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit them: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
