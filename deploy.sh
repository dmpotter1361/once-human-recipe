#!/bin/bash

# ==============================================================================
# ONCE HUMAN CRAFTING TRACKER - LIVE DEPLOYMENT SCRIPT
# ==============================================================================
# This script uses rsync over SSH to copy the necessary project files to your
# remote server and restarts the Docker containers live.
# ==============================================================================

# --- Remote Server Details (Tweak these as needed) ---
SERVER_USER="your-ssh-username"                         # Your server username
SERVER_HOST="your-server-ip-or-domain"       # Your server IP or domain name
DEPLOY_DIR="~/OnceHuman-Recipe"             # Path on remote server where app will live

# --- Sync Configuration ---
# We exclude node_modules, local database states, and git folders to keep sync fast.
EXCLUDES=(
  --exclude="node_modules"
  --exclude="data"
  --exclude="tracker.db"
  --exclude=".git"
  --exclude=".gitignore"
  --exclude="deploy.sh"
)

echo "=========================================================="
echo "🚀 Deploying Once Human Crafting Tracker to $SERVER_HOST..."
echo "=========================================================="

# 1. Sync files to the server
echo "⚡ Step 1: Uploading files to remote server..."
rsync -avz "${EXCLUDES[@]}" ./ "$SERVER_USER@$SERVER_HOST:$DEPLOY_DIR"

if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to sync files to server."
  exit 1
fi

# 2. Rebuild and run containers on the server
echo "⚡ Step 2: Rebuilding & restarting Docker container remotely..."
ssh "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_DIR && docker compose down && docker compose up --build -d"

if [ $? -ne 0 ]; then
  echo "❌ Error: Docker commands failed on remote server."
  exit 1
fi

echo "=========================================================="
echo "🎉 Live deployment successful!"
echo "🌐 Your tracker is live on http://$SERVER_HOST:6660"
echo "=========================================================="
