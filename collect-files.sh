#!/bin/bash

# ============================================
# FILE COLLECTOR FOR UMKM MULTI-TENANT SERVER
# ============================================
# Simple version - Output TXT format
# Run from: server/
# ============================================

OUTPUT_FILE="collected-server-files-$(date +%Y%m%d-%H%M%S).txt"

echo "🚀 UMKM Multi-Tenant Server - File Collector"
echo "============================================="
echo ""
echo "📍 Working directory: $(pwd)"
echo "📄 Output file: $OUTPUT_FILE"
echo ""

# Header
cat > "$OUTPUT_FILE" << 'EOF'
================================================================================
UMKM MULTI-TENANT - SERVER SOURCE CODE COLLECTION
================================================================================
Generated on: $(date)

Project: UMKM Multi-Tenant Server
Location: /d/PRODUK-LPPM-FINAL/UMKM-MULTI-TENANT/server

================================================================================

EOF

# Fungsi collect file
collect_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo "✓ $file"
        cat >> "$OUTPUT_FILE" << EOF

================================================================================
FILE: $file
================================================================================

$(cat "$file")


EOF
    fi
}

echo "📦 Collecting files..."
echo ""

# ============================================
# ROOT CONFIG FILES
# ============================================
echo "📁 Root configuration..."
collect_file ".env.example"
collect_file ".eslintrc.js"
collect_file ".prettierrc"
collect_file "nest-cli.json"
collect_file "package.json"
collect_file "tsconfig.json"
collect_file "tsconfig.build.json"
collect_file "README.md"
collect_file ".gitignore"

# ============================================
# PRISMA
# ============================================
echo "📁 Prisma..."
collect_file "prisma/schema.prisma"

# ============================================
# SRC ROOT
# ============================================
echo "📁 src/ root..."
collect_file "src/main.ts"
collect_file "src/app.module.ts"
collect_file "src/app.controller.ts"
collect_file "src/app.service.ts"
collect_file "src/app.controller.spec.ts"

# ============================================
# AUTH MODULE
# ============================================
echo "📁 src/auth/..."
collect_file "src/auth/auth.module.ts"
collect_file "src/auth/auth.controller.ts"
collect_file "src/auth/auth.service.ts"

echo "  → dto/"
collect_file "src/auth/dto/index.ts"
collect_file "src/auth/dto/login.dto.ts"
collect_file "src/auth/dto/register.dto.ts"

echo "  → strategies/"
collect_file "src/auth/strategies/index.ts"
collect_file "src/auth/strategies/jwt.strategy.ts"

# ============================================
# COMMON MODULE
# ============================================
echo "📁 src/common/..."

echo "  → decorators/"
collect_file "src/common/decorators/index.ts"
collect_file "src/common/decorators/tenant.decorator.ts"

echo "  → filters/"
collect_file "src/common/filters/index.ts"
collect_file "src/common/filters/all-exceptions.filter.ts"

echo "  → guards/"
collect_file "src/common/guards/index.ts"
collect_file "src/common/guards/jwt-auth.guard.ts"

echo "  → interceptors/"
collect_file "src/common/interceptors/index.ts"
collect_file "src/common/interceptors/logging.interceptor.ts"

echo "  → pipes/"
collect_file "src/common/pipes/index.ts"
collect_file "src/common/pipes/sanitize.pipe.ts"

echo "  → utils/"
collect_file "src/common/utils/index.ts"
collect_file "src/common/utils/helpers.ts"

# ============================================
# CUSTOMERS MODULE
# ============================================
echo "📁 src/customers/..."
collect_file "src/customers/customers.module.ts"
collect_file "src/customers/customers.controller.ts"
collect_file "src/customers/customers.service.ts"

echo "  → dto/"
collect_file "src/customers/dto/index.ts"
collect_file "src/customers/dto/create-customer.dto.ts"
collect_file "src/customers/dto/update-customer.dto.ts"
collect_file "src/customers/dto/query-customer.dto.ts"

# ============================================
# DATABASE MODULE
# ============================================
echo "📁 src/database/..."
collect_file "src/database/database.module.ts"
collect_file "src/database/prisma.service.ts"
collect_file "src/database/index.ts"

# ============================================
# ORDERS MODULE
# ============================================
echo "📁 src/orders/..."
collect_file "src/orders/orders.module.ts"
collect_file "src/orders/orders.controller.ts"
collect_file "src/orders/orders.service.ts"

echo "  → dto/"
collect_file "src/orders/dto/index.ts"
collect_file "src/orders/dto/create-order.dto.ts"
collect_file "src/orders/dto/create-order-item.dto.ts"
collect_file "src/orders/dto/update-order.dto.ts"
collect_file "src/orders/dto/update-status.dto.ts"
collect_file "src/orders/dto/query-order.dto.ts"

# ============================================
# PRISMA MODULE
# ============================================
echo "📁 src/prisma/..."
collect_file "src/prisma/prisma.module.ts"
collect_file "src/prisma/prisma.service.ts"

# ============================================
# PRODUCTS MODULE
# ============================================
echo "📁 src/products/..."
collect_file "src/products/products.module.ts"
collect_file "src/products/products.controller.ts"
collect_file "src/products/products.service.ts"

echo "  → dto/"
collect_file "src/products/dto/index.ts"
collect_file "src/products/dto/create-product.dto.ts"
collect_file "src/products/dto/update-product.dto.ts"
collect_file "src/products/dto/update-stock.dto.ts"
collect_file "src/products/dto/bulk-delete.dto.ts"
collect_file "src/products/dto/query-product.dto.ts"

# ============================================
# REDIS MODULE
# ============================================
echo "📁 src/redis/..."
collect_file "src/redis/redis.module.ts"
collect_file "src/redis/redis.service.ts"
collect_file "src/redis/index.ts"

# ============================================
# SEO MODULE (NEW!)
# ============================================
echo "📁 src/seo/..."
collect_file "src/seo/seo.module.ts"
collect_file "src/seo/seo.controller.ts"
collect_file "src/seo/seo.service.ts"
collect_file "src/seo/index.ts"

echo "  → dto/"
collect_file "src/seo/dto/index.ts"
collect_file "src/seo/dto/index-url.dto.ts"
collect_file "src/seo/dto/batch-index.dto.ts"

echo "  → interfaces/"
collect_file "src/seo/interfaces/index.ts"
collect_file "src/seo/interfaces/api-key.interface.ts"
collect_file "src/seo/interfaces/seo-result.interface.ts"

echo "  → managers/"
collect_file "src/seo/managers/index.ts"
collect_file "src/seo/managers/key-manager.service.ts"
collect_file "src/seo/managers/quota-tracker.service.ts"

echo "  → services/"
collect_file "src/seo/services/index.ts"
collect_file "src/seo/services/index-now.service.ts"
collect_file "src/seo/services/google-indexing.service.ts"
collect_file "src/seo/services/google-ping.service.ts"

# ============================================
# SITEMAP MODULE
# ============================================
echo "📁 src/sitemap/..."
collect_file "src/sitemap/sitemap.module.ts"
collect_file "src/sitemap/sitemap.controller.ts"
collect_file "src/sitemap/sitemap.service.ts"

# ============================================
# TENANTS MODULE
# ============================================
echo "📁 src/tenants/..."
collect_file "src/tenants/tenants.module.ts"
collect_file "src/tenants/tenants.controller.ts"
collect_file "src/tenants/tenants.service.ts"

echo "  → dto/"
collect_file "src/tenants/dto/index.ts"
collect_file "src/tenants/dto/update-tenant.dto.ts"
collect_file "src/tenants/dto/change-password.dto.ts"

# ============================================
# VALIDATORS MODULE
# ============================================
echo "📁 src/validators/..."
collect_file "src/validators/index.ts"
collect_file "src/validators/landing-config.validator.ts"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "================================================================================
COLLECTION SUMMARY
================================================================================" >> "$OUTPUT_FILE"

echo "
✅ Root Config (9 files)
✅ Prisma Schema
✅ src/ Root (5 files)
✅ Auth Module (6 files)
✅ Common Module (14 files) - Updated with pipes/
✅ Customers Module (7 files)
✅ Database Module (3 files)
✅ Orders Module (9 files)
✅ Prisma Module (2 files)
✅ Products Module (9 files)
✅ Redis Module (3 files)
✅ SEO Module (17 files) - NEW! Complete with managers & services
✅ Sitemap Module (3 files)
✅ Tenants Module (6 files)
✅ Validators Module (2 files)

Total Modules: 14
Total Files: ~95 files
Generated: $(date)
" >> "$OUTPUT_FILE"

echo ""
echo "✅ DONE!"
echo ""
echo "📄 File: $OUTPUT_FILE"
echo "📊 Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "🎉 All files collected successfully!"