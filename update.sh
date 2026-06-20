#!/bin/bash

# ==============================================================================
# ONCE HUMAN CRAFTING TRACKER - SERVER-SIDE UPDATE SCRIPT
# ==============================================================================
# Run this script on your remote server to pull the latest changes from Git
# and rebuild/restart the Docker containers.
# ==============================================================================

echo "=========================================================="
echo "⚡ Step 1: Pulling latest changes from Git..."
echo "=========================================================="

# Pull the latest commit
git pull

if [ $? -ne 0 ]; then
  echo "❌ Error: Git pull failed. Verify your connection or credentials."
  exit 1
fi

echo "=========================================================="
echo "⚡ Step 2: Rebuilding and restarting Docker containers..."
echo "=========================================================="

# Rebuild the Docker image and restart services in detached mode
docker compose up --build -d

if [ $? -ne 0 ]; then
  echo "❌ Error: Docker Compose failed to restart containers."
  exit 1
fi

echo "=========================================================="
echo "🎉 Update completed successfully!"
echo "🌐 Tracker is live on port 6660."
echo "=========================================================="
