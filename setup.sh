#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        Finder Pro — Setup            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo ""

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Rebuilding native modules for Electron..."
npx electron-rebuild -f -w better-sqlite3 node-pty

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start in development mode:"
echo "  npm start"
echo ""
echo "To build the macOS .dmg:"
echo "  npm run build"
echo ""