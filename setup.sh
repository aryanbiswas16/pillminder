#!/bin/bash

echo "🚀 PillMinder Setup Script"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Found: $(node --version)"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Setup Backend
echo ""
echo "📦 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env file from template"
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

echo "Installing backend dependencies..."
npm install

cd ..

# Setup Frontend
echo ""
echo "📦 Setting up Frontend..."
cd frontend

echo "Installing frontend dependencies..."
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your database in backend/.env"
echo "2. Run database migrations: cd backend && npm run migrate"
echo "3. Start the backend: cd backend && npm run dev"
echo "4. Start the frontend: cd frontend && npm start"
echo ""
echo "Default login (after migration):"
echo "  Email: demo@pillminder.com"
echo "  Password: demo123"
