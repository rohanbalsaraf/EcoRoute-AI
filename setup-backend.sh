#!/bin/bash
# EcoRoute Backend Setup Script
# Run this script to automatically install all required tools and dependencies for deployment.

set -e

echo "🚀 Starting EcoRoute backend setup..."

# 1. Check/Install Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.10+ first."
    exit 1
fi

# 2. Check/Install Rust (required for ecoroute-core)
if ! command -v cargo &> /dev/null; then
    echo "⚙️  Rust is not installed. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo "✅ Rust is already installed."
fi

# 3. Build the ecoroute-core (Rust engine)
echo "🦀 Building ecoroute-core (Rust)..."
cd packages/ecoroute-core
cargo build --release
cd ../..

# 4. Install Python dependencies for ecoroute-api
echo "🐍 Installing Python dependencies for ecoroute-api..."
cd packages/ecoroute-api

# Create a virtual environment and install from the generated requirements.txt
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 5. Run Database Migrations
echo "🗄️  Running Database Migrations..."
alembic upgrade head

echo "✅ Setup complete! You can now start the server by running:"
echo "cd packages/ecoroute-api && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
