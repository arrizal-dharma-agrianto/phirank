#!/bin/bash

set -e

PROJECT_DIR="/home/boiler/htdocs/boilerplate.crackincode.com/saas-nextjs-boilerplate"
BRANCH="development"
PM2_NAME="boilerplate"

echo "=================================="
echo "Deploy $(date)"
echo "=================================="

cd "$PROJECT_DIR"

# Load environment variables
if [ -f ".env" ]; then
  echo "Loading .env..."
  set -a
  source .env
  set +a
else
  echo "ERROR: .env not found!"
  exit 1
fi

echo "DATABASE_URL Loaded: ${DATABASE_URL:+YES}"

echo "Updating source..."
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "Installing dependencies..."
~/.bun/bin/bun install

echo "Generate Prisma..."
~/.bun/bin/bun x --bun prisma generate

echo "Build Next.js..."
~/.bun/bin/bun run build

echo "Restart PM2..."
/home/boiler/.nvm/versions/node/v22.22.3/bin/pm2 restart "$PM2_NAME"

echo "=================================="
echo "Deploy Success!"
echo "=================================="