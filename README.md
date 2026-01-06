# Fibidy Backend API

Backend API untuk platform multi-tenant UMKM Fibidy - memungkinkan UMKM membuat toko online dengan mudah.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Build aplikasi
npm run build

# Run migrations + seed + start
npm run start:migrate
```

## 🛠️ Development

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod
```

## 📦 Database Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (dev)
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Open Prisma Studio
npm run prisma:studio

# Reset database
npm run prisma:reset
```

## 🔑 Environment Variables

Buat file `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:6543/db?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/db"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# App
NODE_ENV="production"
PORT=8000

# CORS
FRONTEND_URL="https://www.fibidy.com"
ALLOWED_ORIGINS="https://www.fibidy.com"

# Redis
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

## 📚 Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Cache**: Upstash Redis
- **Auth**: JWT + Passport

## 🏗️ Project Structure

```
src/
├── auth/           # Authentication module
├── tenants/        # Tenant management
├── products/       # Product management
├── orders/         # Order management
├── customers/      # Customer management
└── common/         # Shared utilities
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

- Website: https://www.fibidy.com
- Email: support@fibidy.com