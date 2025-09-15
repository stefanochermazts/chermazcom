#!/bin/bash

# Setup Neon Local per sviluppo Ask Stefano

echo "🚀 Setting up Neon Local for Ask Stefano development..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check for required environment variables
if [ -z "$NEON_API_KEY" ]; then
    echo "❌ NEON_API_KEY not set. Please add it to your .env file."
    exit 1
fi

if [ -z "$NEON_PROJECT_ID" ]; then
    echo "❌ NEON_PROJECT_ID not set. Please add it to your .env file."
    exit 1
fi

echo "✅ Environment variables found"

# Stop existing container if running
echo "🛑 Stopping existing Neon Local container..."
docker stop neon-local-ask-stefano 2>/dev/null || true
docker rm neon-local-ask-stefano 2>/dev/null || true

# Start Neon Local container
echo "🐳 Starting Neon Local container..."
docker run \
  --name neon-local-ask-stefano \
  -p 5432:5432 \
  -e NEON_API_KEY=$NEON_API_KEY \
  -e NEON_PROJECT_ID=$NEON_PROJECT_ID \
  -d \
  neondatabase/neon_local:latest

# Wait for container to start
echo "⏳ Waiting for database to be ready..."
sleep 5

# Test connection
echo "🔍 Testing database connection..."
if docker exec neon-local-ask-stefano psql "postgres://neon:npg@localhost:5432/ask_stefano" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Database connection successful!"
    echo ""
    echo "📋 Connection details:"
    echo "   URL: postgres://neon:npg@localhost:5432/ask_stefano?sslmode=require"
    echo "   Port: 5432"
    echo "   Database: ask_stefano"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Set USE_LOCAL_DB=true in your .env file"
    echo "   2. Run: npm run db:init"
    echo "   3. Run: npm run content:extract"
    echo ""
else
    echo "❌ Database connection failed. Check your Neon credentials."
    exit 1
fi
