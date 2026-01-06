# ============================================================================
# Justfile - UMKM Multi-Tenant Backend
# API Only with Supabase - Docker Development
# ============================================================================

default:
    @just --list

# ====================
# 🚀 DEVELOPMENT
# ====================

# Start development environment
dev:
    @echo "🚀 Starting API container..."
    docker compose up -d
    @echo "✅ API started!"
    @echo ""
    @echo "📊 API: http://localhost:8000"
    @echo "🏥 Health: http://localhost:8000/health"
    @echo ""
    @just logs

# Start with build (rebuild container)
dev-build:
    @echo "🔨 Building and starting API..."
    docker compose up -d --build
    @just logs

# Rebuild API (fast restart for code changes)
api-rebuild:
    @echo "🔨 Rebuilding API container..."
    docker compose up -d --build --no-deps api
    @echo "✅ API rebuilt!"
    @just logs

# Restart API (without rebuild)
api-restart:
    @echo "🔄 Restarting API..."
    docker compose restart api
    @echo "⏳ Waiting for API to be ready..."
    @sleep 3
    @just logs

# Stop development environment
dev-stop:
    @echo "⏹️  Stopping API..."
    docker compose stop
    @echo "✅ API stopped!"

# Restart development environment
dev-restart:
    @echo "🔄 Restarting API..."
    docker compose restart
    @just logs

# ====================
# 📦 PNPM COMMANDS
# ====================

# Install dependencies in container
pnpm-install:
    @echo "📦 Installing dependencies with pnpm..."
    docker compose exec api pnpm install
    @echo "✅ Dependencies installed!"

# Add new dependency
pnpm-add package:
    @echo "➕ Adding {{package}} with pnpm..."
    docker compose exec api pnpm add {{package}}
    @echo "✅ Package added! Rebuild: just api-rebuild"

# Add dev dependency
pnpm-add-dev package:
    @echo "➕ Adding {{package}} as dev dependency..."
    docker compose exec api pnpm add -D {{package}}
    @echo "✅ Dev package added! Rebuild: just api-rebuild"

# Remove dependency
pnpm-remove package:
    @echo "➖ Removing {{package}}..."
    docker compose exec api pnpm remove {{package}}
    @echo "✅ Package removed! Rebuild: just api-rebuild"

# Update dependencies
pnpm-update:
    @echo "🔄 Updating dependencies..."
    docker compose exec api pnpm update
    @echo "✅ Dependencies updated! Rebuild: just api-rebuild"

# Check outdated packages
pnpm-outdated:
    @echo "📊 Checking outdated packages..."
    docker compose exec api pnpm outdated

# ====================
# 🗄️ DATABASE (Supabase)
# ====================

# Generate Prisma Client (in container)
db-generate:
    @echo "🔄 Generating Prisma Client in container..."
    docker compose exec api pnpm exec prisma generate
    @echo "✅ Prisma Client generated!"

# Push database schema to Supabase
db-push:
    @echo "🔄 Pushing database schema to Supabase..."
    docker compose exec api pnpm exec prisma db push --skip-generate
    @echo "✅ Database schema pushed to Supabase!"

# Run Prisma migrations (production)
db-migrate:
    @echo "🔄 Running Prisma migrations on Supabase..."
    docker compose exec api pnpm exec prisma migrate deploy
    @echo "✅ Migrations completed!"

# Create new migration
db-migrate-create name:
    @echo "📝 Creating new migration: {{name}}"
    docker compose exec api pnpm exec prisma migrate dev --name {{name}}
    @echo "✅ Migration created!"

# Open Prisma Studio (connect to Supabase)
db-studio:
    @echo "🎨 Opening Prisma Studio (Supabase)..."
    docker compose exec api pnpm exec prisma studio

# Seed database with sample data
db-seed:
    @echo "🌱 Seeding Supabase database..."
    docker compose exec api pnpm run prisma:seed
    @echo "✅ Database seeded successfully!"

# Complete setup: Push schema + Seed
db-setup:
    @echo "🚀 Complete database setup on Supabase..."
    @just db-push
    @just db-seed
    @echo "✅ Database setup complete!"

# Reset database (⚠️ DELETES ALL DATA on Supabase)
db-reset:
    @echo "⚠️  Resetting Supabase database (all data will be lost)..."
    @echo "Press Ctrl+C in 5 seconds to cancel..."
    @sleep 5
    docker compose exec api pnpm exec prisma migrate reset --force
    @echo "✅ Database reset complete!"

# ====================
# 📝 LOGS & MONITORING
# ====================

# Show logs for API
logs:
    docker compose logs -f api

# Show last 50 lines of API logs
logs-tail:
    docker compose logs --tail=50 api

# Show all logs
logs-all:
    docker compose logs -f

# ====================
# 🧪 TESTING
# ====================

# Run all tests in container
test:
    @echo "🧪 Running tests in container..."
    docker compose exec api pnpm run test

# Run tests in watch mode
test-watch:
    @echo "🧪 Running tests in watch mode..."
    docker compose exec api pnpm run test:watch

# Run e2e tests
test-e2e:
    @echo "🧪 Running e2e tests..."
    docker compose exec api pnpm run test:e2e

# Run test coverage
test-cov:
    @echo "🧪 Running test coverage..."
    docker compose exec api pnpm run test:cov

# Test Auth module with bash script (from host)
test-auth:
    @echo "🧪 Testing Auth module..."
    @chmod +x test-auth.sh
    ./test-auth.sh

# ====================
# ☢️ NUCLEAR OPTIONS
# ====================

# Nuclear: Stop container and remove volumes (⚠️ DELETES uploads/logs)
nuclear:
    @echo "☢️  NUCLEAR: Destroying API container..."
    @echo "⚠️  This will delete container data (uploads, logs)!"
    @echo "⚠️  Database on Supabase will NOT be affected."
    @echo "Press Ctrl+C in 5 seconds to cancel..."
    @sleep 5
    docker compose down -v --remove-orphans
    @echo "💥 Container destroyed!"

# Nuclear clean: Remove everything including images
nuclear-clean:
    @echo "☢️  NUCLEAR CLEAN: Removing everything..."
    @echo "⚠️  This will delete containers, volumes, and images!"
    @echo "⚠️  Database on Supabase will NOT be affected."
    @echo "Press Ctrl+C in 5 seconds to cancel..."
    @sleep 5
    docker compose down -v --rmi all --remove-orphans
    @echo "💥 Everything cleaned!"

# Reset: Stop, clean, and restart fresh
reset:
    @echo "🔄 Resetting environment..."
    @just nuclear
    @just quickstart
    @echo "✅ Environment reset complete!"

# ====================
# 🐳 CONTAINER MANAGEMENT
# ====================

# Show status of containers
status:
    @echo "📊 Container Status:"
    @docker compose ps

# Show resource usage
stats:
    docker stats umkm-api

# Execute shell in API container
shell:
    @echo "🐚 Entering API container shell..."
    docker compose exec api sh

# Execute bash in API container
bash:
    @echo "🐚 Entering API container bash..."
    docker compose exec api /bin/bash

# ====================
# 🏥 HEALTH CHECKS
# ====================

# Check health of API
health:
    @echo "🏥 Checking API health..."
    @curl -s http://localhost:8000/health | jq '.' 2>/dev/null || curl -s http://localhost:8000/health || echo "❌ API not responding"

# Quick health check
ping:
    @curl -s http://localhost:8000/health | jq '.' 2>/dev/null || curl -s http://localhost:8000/health || echo "❌ API not responding"

# ====================
# 🔧 UTILITIES
# ====================

# Format code with Prettier (in container)
format:
    @echo "✨ Formatting code..."
    docker compose exec api pnpm exec prettier --write "src/**/*.ts"
    @echo "✅ Code formatted!"

# Lint code (in container)
lint:
    @echo "🔍 Linting code..."
    docker compose exec api pnpm run lint
    @echo "✅ Lint complete!"

# Fix linting issues
lint-fix:
    @echo "🔧 Fixing linting issues..."
    docker compose exec api pnpm run lint --fix
    @echo "✅ Linting fixed!"

# ====================
# 🚀 QUICKSTART
# ====================

# Complete quickstart with Docker
quickstart:
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║          🚀 UMKM MULTI-TENANT - QUICKSTART                ║"
    @echo "║         API Only + Supabase Database                      ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "🔨 Building and starting API container..."
    docker compose up -d --build
    @echo ""
    @echo "⏳ Waiting for API to be ready (30 seconds)..."
    @sleep 30
    @curl -sf http://localhost:8000/health > /dev/null 2>&1 && echo "✅ API is healthy!" || echo "⚠️  API may need more time, check: just logs"
    @echo ""
    @echo "🗄️  Setting up Supabase database..."
    @just db-setup
    @echo ""
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║          🎉 SETUP COMPLETE! 🎉                            ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "📧 Test Login Credentials:"
    @echo "   Email:    tokosari@fibidy.com"
    @echo "   Password: password123"
    @echo ""
    @echo "🌐 Service URLs:"
    @echo "   API:        http://localhost:8000"
    @echo "   Health:     http://localhost:8000/health"
    @echo "   Docs:       http://localhost:8000/api"
    @echo ""
    @echo "🗄️  Database:"
    @echo "   Provider:   Supabase (PostgreSQL)"
    @echo "   Type:       Cloud Hosted"
    @echo "   Pooling:    Enabled"
    @echo ""
    @echo "🔥 Quick Commands:"
    @echo "   just logs          - View API logs"
    @echo "   just shell         - Enter API container"
    @echo "   just test-auth     - Test auth endpoints"
    @echo "   just health        - Check API health"
    @echo "   just db-studio     - Open Prisma Studio"
    @echo ""
    @echo "🐳 Docker Commands:"
    @echo "   just api-restart   - Restart API container"
    @echo "   just api-rebuild   - Rebuild API container"
    @echo "   just dev-stop      - Stop API"
    @echo "   just nuclear       - Destroy container"
    @echo ""
    @echo "📚 More Commands:"
    @echo "   just --list        - Show all commands"
    @echo ""
    @echo "✨ Happy Coding! Container is running..."

# ====================
# 📚 INFO
# ====================

# Show environment info
info:
    @echo "📊 Environment Information:"
    @echo ""
    @echo "Docker Container:"
    @docker compose exec api node --version
    @docker compose exec api pnpm --version
    @echo ""
    @echo "Database:"
    @echo "  Provider: Supabase (PostgreSQL)"
    @echo "  Status: Cloud Hosted"
    @echo "  Pooling: Enabled"
    @echo ""
    @echo "API:"
    @echo "  Port: 8000"
    @echo "  URL: http://localhost:8000"
    @echo ""
    @echo "Container:"
    @docker compose ps

# Check if Docker is running and files exist
check:
    @echo "🔍 Checking Docker setup..."
    @docker --version || echo "❌ Docker not found"
    @docker compose version || echo "❌ Docker Compose not found"
    @echo ""
    @test -f .env && echo "✅ .env file exists" || echo "❌ .env file not found"
    @test -f Dockerfile && echo "✅ Dockerfile exists" || echo "❌ Dockerfile not found"
    @test -f docker-compose.yml && echo "✅ docker-compose.yml exists" || echo "❌ docker-compose.yml not found"
    @test -f prisma/schema.prisma && echo "✅ Prisma schema exists" || echo "❌ Prisma schema not found"
    @echo ""
    @echo "🗄️  Database Connection:"
    @grep -q "supabase.com" .env && echo "✅ Supabase configured" || echo "⚠️  Check DATABASE_URL in .env"

# ====================
# 📚 ALIASES
# ====================

# Development aliases
alias up := dev
alias down := dev-stop
alias restart := dev-restart
alias rebuild := api-rebuild

# Log aliases
alias log := logs
alias tail := logs-tail

# Container aliases
alias sh := shell
alias ps := status

# Database aliases
alias migrate := db-migrate
alias seed := db-seed
alias setup := db-setup
alias studio := db-studio

# Testing aliases
alias t := test
alias tw := test-watch
alias te := test-e2e

# pnpm aliases
alias install := pnpm-install
alias add := pnpm-add
alias remove := pnpm-remove
alias update := pnpm-update

# Utility aliases
alias f := format
alias l := lint
alias lf := lint-fix

# Quick start alias
alias start := quickstart
alias qs := quickstart