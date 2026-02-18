#!/bin/bash

# GitHub Repository Setup Script for PillMinder
# Run this after creating a GitHub repository

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
    echo "Usage: ./push-to-github.sh <repository-url>"
    echo "Example: ./push-to-github.sh https://github.com/yourusername/pillminder.git"
    exit 1
fi

echo "🔗 Setting up PillMinder repository..."

# Initialize git if not already
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: PillMinder medication management app

Features:
- Resident dashboard with large, accessible UI
- Caregiver dashboard for family members
- Nurse dashboard for professional caregivers
- Real-time updates via WebSocket
- Role-based access control
- PostgreSQL database with Sequelize ORM
- React frontend with Tailwind CSS
- HCI-focused design for elderly users

Design Principles:
- Large touch targets (64x64dp minimum)
- High contrast visuals
- Instant feedback for actions
- No complex navigation
- Recognition over recall"

# Add remote and push
git remote add origin "$REPO_URL"
git branch -M main
git push -u origin main

echo "✅ Successfully pushed to $REPO_URL"
