# ============================================================================
# Justfile - UMKM Multi-Tenant Backend
# SIMPLIFIED - Only Commands You Actually Use!
# ============================================================================

default:
    @just --list

# ====================
# 🚀 DEVELOPMENT
# ====================

# Start local development (NO DOCKER - Fast & Light)
dev:
    @echo "🚀 Starting local development..."
    @echo "📊 API: http://localhost:8000"
    @echo "🏥 Health: http://localhost:8000/api/health"
    @echo ""
    pnpm run start:dev

# Start production build locally
start:
    @echo "🚀 Starting production server..."
    pnpm run build
    pnpm run start:prod

# ====================
# 📦 DEPENDENCIES
# ====================

# Install dependencies
install:
    @echo "📦 Installing dependencies..."
    pnpm install
    @echo "✅ Done!"

# Add package
add package:
    @echo "➕ Adding {{package}}..."
    pnpm add {{package}}

# ====================
# 🗄️ DATABASE
# ====================

# Generate Prisma Client
db-generate:
    @echo "🔄 Generating Prisma Client..."
    pnpm exec prisma generate
    @echo "✅ Done!"

# Push schema to Supabase
db-push:
    @echo "🔄 Pushing schema to Supabase..."
    pnpm exec prisma db push --skip-generate
    @echo "✅ Done!"

# Seed database
db-seed:
    @echo "🌱 Seeding database..."
    pnpm run prisma:seed
    @echo "✅ Done!"

# Open Prisma Studio
db-studio:
    @echo "🎨 Opening Prisma Studio..."
    pnpm exec prisma studio

# Complete DB setup
db-setup:
    @just db-generate
    @just db-push
    @just db-seed
    @echo "✅ Database ready!"

# ====================
# 🔧 UTILITIES
# ====================

# Format code
format:
    @echo "✨ Formatting code..."
    pnpm exec prettier --write "src/**/*.ts"
    @echo "✅ Done!"

# Lint code
lint:
    @echo "🔍 Linting & fixing..."
    pnpm run lint --fix
    @echo "✅ Done!"

# Check API health
health:
    @curl -s http://localhost:8000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:8000/api/health || echo "❌ API not responding"

# ====================
# ☢️ NUCLEAR OPTIONS
# ====================

# Nuclear: Clean EVERYTHING (node_modules, dist, pnpm-lock)
nuclear:
    @echo "☢️  NUCLEAR: Removing EVERYTHING..."
    @echo "⚠️  This will delete:"
    @echo "    - node_modules/"
    @echo "    - dist/"
    @echo "    - pnpm-lock.yaml"
    @echo "    - .turbo/"
    @echo "    - .cache/"
    @echo ""
    @echo "Press Ctrl+C in 5 seconds to cancel..."
    @sleep 5
    @echo "💥 Deleting node_modules..."
    rm -rf node_modules
    @echo "💥 Deleting dist..."
    rm -rf dist
    @echo "💥 Deleting pnpm-lock.yaml..."
    rm -f pnpm-lock.yaml
    @echo "💥 Deleting cache..."
    rm -rf .turbo node_modules/.cache .cache
    @echo ""
    @echo "✅ NUKED! Now run: just install"

# Nuclear Docker: Stop & remove containers + WSL shutdown
nuclear-docker:
    @echo "☢️  NUCLEAR DOCKER: Destroying containers..."
    @echo "Press Ctrl+C in 3 seconds to cancel..."
    @sleep 3
    docker compose down -v --remove-orphans
    wsl --shutdown
    @echo "💥 Containers destroyed! WSL2 shutdown."

# Ultimate Nuclear: Everything + Docker
nuclear-all:
    @echo "☢️☢️☢️ ULTIMATE NUCLEAR: EVERYTHING WILL BE DELETED! ☢️☢️☢️"
    @echo "Press Ctrl+C in 5 seconds to cancel..."
    @sleep 5
    @just nuclear-docker
    @just nuclear
    @echo "💥💥💥 EVERYTHING NUKED!"

# ====================
# 🐳 DOCKER (When Needed)
# ====================

# Start with Docker
docker-up:
    @echo "🐳 Starting Docker..."
    docker compose up -d
    @sleep 5
    @echo "✅ Docker started!"
    @echo "📊 API: http://localhost:8000"
    docker compose logs -f api

# Stop Docker
docker-down:
    @echo "🐳 Stopping Docker..."
    docker compose down
    wsl --shutdown
    @echo "✅ Stopped! WSL2 shutdown."

# ====================
# 🚀 QUICKSTART
# ====================

# Quickstart - LOCAL (No Docker - Recommended)
quickstart:
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║         🚀 QUICKSTART - LOCAL (No Docker)                 ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "📦 Installing dependencies..."
    @just install
    @echo ""
    @echo "🗄️  Setting up database..."
    @just db-setup
    @echo ""
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║                    🎉 READY! 🎉                           ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "🚀 Start Development:"
    @echo "   just dev               - Start local dev"
    @echo ""
    @echo "🗄️  Database:"
    @echo "   just db-studio         - Open database GUI"
    @echo ""
    @echo "☢️  Nuclear:"
    @echo "   just nuclear           - Clean everything"
    @echo ""
    @echo "📊 API will run on: http://localhost:8000"
    @echo ""
    @echo "✨ GO! → just dev"

# Quickstart - DOCKER (Production testing)
quickstart-docker:
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║         🐳 QUICKSTART - DOCKER (Production)               ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "🐳 Building Docker image..."
    docker compose build
    @echo ""
    @echo "🗄️  Setting up database (in container)..."
    docker compose run --rm api pnpm exec prisma generate
    docker compose run --rm api pnpm exec prisma db push --skip-generate
    docker compose run --rm api pnpm run prisma:seed
    @echo ""
    @echo "🚀 Starting containers..."
    docker compose up -d
    @echo ""
    @echo "╔════════════════════════════════════════════════════════════╗"
    @echo "║                    🎉 READY! 🎉                           ║"
    @echo "╚════════════════════════════════════════════════════════════╝"
    @echo ""
    @echo "📊 API: http://localhost:8000"
    @echo "🏥 Health: http://localhost:8000/api/health"
    @echo ""
    @echo "🐳 Docker Commands:"
    @echo "   docker compose logs -f     - View logs"
    @echo "   just docker-down           - Stop (+ shutdown WSL2)"
    @echo "   just nuclear-docker        - Destroy containers"
    @echo ""
    @echo "✨ Containers running!"

# ====================
# 📚 ALIASES
# ====================

alias up := dev
alias down := docker-down
alias studio := db-studio
alias nuke := nuclear
alias clean := nuclear
alias d-up := docker-up
alias d-down := docker-down
alias qs := quickstart
alias qsd := quickstart-docker
