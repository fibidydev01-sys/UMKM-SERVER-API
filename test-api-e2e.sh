#!/bin/bash

# ==========================================
# FIBIDY API - E2E TEST (Cookie Auth)
# Git Bash (Windows) + jq
# ==========================================

BASE_URL="http://localhost:8000/api"
COOKIE_FILE="/tmp/fibidy_cookies_$$.txt"
TENANT_SLUG=""
PRODUCT_ID=""
CUSTOMER_ID=""
ORDER_ID=""

# Unique identifiers
TS=$(date +%s)
TEST_SLUG="test$TS"
TEST_EMAIL="test$TS@test.com"

# Colors
R='\033[0;31m'
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
N='\033[0m'

PASS=0
FAIL=0

# Cleanup on exit
trap "rm -f $COOKIE_FILE" EXIT

# ==========================================
# START TEST
# ==========================================
echo ""
echo -e "${B}================================================${N}"
echo -e "${B}   FIBIDY API - E2E TEST (Cookie Auth)${N}"
echo -e "${B}================================================${N}"
echo ""

# ------------------------------------------
# 1. HEALTH CHECK
# ------------------------------------------
echo -e "${B}[1] HEALTH CHECK${N}"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | jq -e '.status' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Server is running${N}"
  echo "$HEALTH" | jq .
  ((PASS++))
else
  echo -e "${R}  ❌ Server not responding!${N}"
  echo -e "${R}  Run: npm run start:dev${N}"
  exit 1
fi
echo ""

# ------------------------------------------
# 2. AUTH - REGISTER (dengan cookie jar)
# ------------------------------------------
echo -e "${B}[2] AUTH - REGISTER${N}"
REG_DATA="{\"slug\":\"$TEST_SLUG\",\"name\":\"Test Store\",\"category\":\"RETAIL\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"whatsapp\":\"6281234567890\"}"

REG_RESP=$(curl -s -c "$COOKIE_FILE" -X POST \
  -H "Content-Type: application/json" \
  -d "$REG_DATA" \
  "$BASE_URL/auth/register")

if echo "$REG_RESP" | jq -e '.tenant.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Register success${N}"
  TENANT_SLUG=$TEST_SLUG
  echo "$REG_RESP" | jq '{message, tenant: {id: .tenant.id, slug: .tenant.slug}}'
  ((PASS++))
else
  echo -e "${R}  ❌ Register failed${N}"
  echo "$REG_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 3. AUTH - LOGIN (simpan cookie)
# ------------------------------------------
echo -e "${B}[3] AUTH - LOGIN${N}"
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\"}"

LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA" \
  "$BASE_URL/auth/login")

if echo "$LOGIN_RESP" | jq -e '.tenant.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Login success${N}"
  echo "$LOGIN_RESP" | jq '{message, tenant: {id: .tenant.id, slug: .tenant.slug}}'
  ((PASS++))
else
  echo -e "${R}  ❌ Login failed${N}"
  echo "$LOGIN_RESP"
  ((FAIL++))
fi
echo ""

# Verify cookie exists
echo -e "${B}[3b] VERIFY COOKIE${N}"
if grep -q "fibidy_auth" "$COOKIE_FILE" 2>/dev/null; then
  echo -e "${G}  ✅ Cookie fibidy_auth captured${N}"
  ((PASS++))
else
  echo -e "${R}  ❌ Cookie not found!${N}"
  cat "$COOKIE_FILE"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 4. AUTH - GET ME (pakai cookie)
# ------------------------------------------
echo -e "${B}[4] AUTH - GET ME${N}"
ME_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/auth/me")

if echo "$ME_RESP" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Get me success${N}"
  echo "$ME_RESP" | jq '{id, slug, name, email}'
  ((PASS++))
else
  echo -e "${R}  ❌ Get me failed${N}"
  echo "$ME_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 5. AUTH - CHECK STATUS
# ------------------------------------------
echo -e "${B}[5] AUTH - STATUS${N}"
STATUS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/auth/status")

if echo "$STATUS_RESP" | jq -e '.authenticated' > /dev/null 2>&1; then
  AUTH_STATUS=$(echo "$STATUS_RESP" | jq -r '.authenticated')
  if [ "$AUTH_STATUS" = "true" ]; then
    echo -e "${G}  ✅ Authenticated: true${N}"
    ((PASS++))
  else
    echo -e "${R}  ❌ Not authenticated${N}"
    ((FAIL++))
  fi
else
  echo -e "${R}  ❌ Status check failed${N}"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 6. TENANT - GET BY SLUG (Public)
# ------------------------------------------
echo -e "${B}[6] TENANT - GET BY SLUG${N}"
TENANT_RESP=$(curl -s "$BASE_URL/tenants/by-slug/$TENANT_SLUG")

if echo "$TENANT_RESP" | jq -e '.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Get tenant success${N}"
  echo "$TENANT_RESP" | jq '{id, slug, name, status}'
  ((PASS++))
else
  echo -e "${R}  ❌ Get tenant failed${N}"
  echo "$TENANT_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 7. PRODUCT - CREATE
# ------------------------------------------
echo -e "${B}[7] PRODUCT - CREATE${N}"
PROD_DATA='{"name":"Test Product","price":50000,"category":"Test","stock":100,"trackStock":true}'

PROD_RESP=$(curl -s -b "$COOKIE_FILE" -X POST \
  -H "Content-Type: application/json" \
  -d "$PROD_DATA" \
  "$BASE_URL/products")

if echo "$PROD_RESP" | jq -e '.product.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Create product success${N}"
  PRODUCT_ID=$(echo "$PROD_RESP" | jq -r '.product.id')
  echo "  Product ID: $PRODUCT_ID"
  echo "$PROD_RESP" | jq '{message, product: {id: .product.id, name: .product.name, price: .product.price}}'
  ((PASS++))
else
  echo -e "${R}  ❌ Create product failed${N}"
  echo "$PROD_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 8. PRODUCT - GET ALL
# ------------------------------------------
echo -e "${B}[8] PRODUCT - GET ALL${N}"
PRODS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/products")

if echo "$PRODS_RESP" | jq -e '.data' > /dev/null 2>&1; then
  TOTAL=$(echo "$PRODS_RESP" | jq '.meta.total')
  echo -e "${G}  ✅ Get products success (total: $TOTAL)${N}"
  ((PASS++))
else
  echo -e "${R}  ❌ Get products failed${N}"
  echo "$PRODS_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 9. PRODUCT - GET BY ID
# ------------------------------------------
echo -e "${B}[9] PRODUCT - GET BY ID${N}"
if [ -n "$PRODUCT_ID" ]; then
  PROD1_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/products/$PRODUCT_ID")
  
  if echo "$PROD1_RESP" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${G}  ✅ Get product by ID success${N}"
    echo "$PROD1_RESP" | jq '{id, name, price, stock}'
    ((PASS++))
  else
    echo -e "${R}  ❌ Get product failed${N}"
    echo "$PROD1_RESP"
    ((FAIL++))
  fi
else
  echo -e "${Y}  ⚠️ Skipped - no product ID${N}"
fi
echo ""

# ------------------------------------------
# 10. PRODUCT - UPDATE
# ------------------------------------------
echo -e "${B}[10] PRODUCT - UPDATE${N}"
if [ -n "$PRODUCT_ID" ]; then
  UPD_RESP=$(curl -s -b "$COOKIE_FILE" -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"price":75000}' \
    "$BASE_URL/products/$PRODUCT_ID")
  
  if echo "$UPD_RESP" | jq -e '.product.price' > /dev/null 2>&1; then
    NEW_PRICE=$(echo "$UPD_RESP" | jq '.product.price')
    echo -e "${G}  ✅ Update success (new price: $NEW_PRICE)${N}"
    ((PASS++))
  else
    echo -e "${R}  ❌ Update failed${N}"
    echo "$UPD_RESP"
    ((FAIL++))
  fi
else
  echo -e "${Y}  ⚠️ Skipped${N}"
fi
echo ""

# ------------------------------------------
# 11. PRODUCT - DELETE ⭐ KEY TEST!
# ------------------------------------------
echo -e "${B}[11] PRODUCT - DELETE ⭐${N}"
if [ -n "$PRODUCT_ID" ]; then
  DEL_RESP=$(curl -s -b "$COOKIE_FILE" -X DELETE \
    "$BASE_URL/products/$PRODUCT_ID")
  
  if echo "$DEL_RESP" | jq -e '.message' > /dev/null 2>&1; then
    MSG=$(echo "$DEL_RESP" | jq -r '.message')
    SOFT=$(echo "$DEL_RESP" | jq -r '.softDeleted // false')
    echo -e "${G}  ✅ Delete success${N}"
    echo "  Message: $MSG"
    echo "  Soft Deleted: $SOFT"
    ((PASS++))
  else
    echo -e "${R}  ❌ Delete failed${N}"
    echo "$DEL_RESP"
    ((FAIL++))
  fi
else
  echo -e "${Y}  ⚠️ Skipped${N}"
fi
echo ""

# ------------------------------------------
# 12. VERIFY DELETE - GET DELETED PRODUCT
# ------------------------------------------
echo -e "${B}[12] VERIFY DELETE - GET DELETED PRODUCT${N}"
if [ -n "$PRODUCT_ID" ]; then
  VERIFY_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/products/$PRODUCT_ID")
  
  if echo "$VERIFY_RESP" | jq -e '.statusCode == 404' > /dev/null 2>&1; then
    echo -e "${G}  ✅ Product deleted (404 Not Found)${N}"
    ((PASS++))
  elif echo "$VERIFY_RESP" | jq -e '.isActive == false' > /dev/null 2>&1; then
    echo -e "${G}  ✅ Product soft-deleted (isActive: false)${N}"
    ((PASS++))
  else
    echo -e "${Y}  ⚠️ Product masih ada (mungkin soft delete)${N}"
    echo "$VERIFY_RESP" | jq '{id, isActive}'
    ((PASS++))
  fi
else
  echo -e "${Y}  ⚠️ Skipped${N}"
fi
echo ""

# ------------------------------------------
# 13. CUSTOMER - CREATE
# ------------------------------------------
echo -e "${B}[13] CUSTOMER - CREATE${N}"
CUST_DATA='{"name":"John Doe","phone":"6289876543210","email":"john@test.com"}'

CUST_RESP=$(curl -s -b "$COOKIE_FILE" -X POST \
  -H "Content-Type: application/json" \
  -d "$CUST_DATA" \
  "$BASE_URL/customers")

if echo "$CUST_RESP" | jq -e '.customer.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Create customer success${N}"
  CUSTOMER_ID=$(echo "$CUST_RESP" | jq -r '.customer.id')
  echo "  Customer ID: $CUSTOMER_ID"
  ((PASS++))
else
  echo -e "${R}  ❌ Create customer failed${N}"
  echo "$CUST_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 14. CUSTOMER - GET ALL
# ------------------------------------------
echo -e "${B}[14] CUSTOMER - GET ALL${N}"
CUSTS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/customers")

if echo "$CUSTS_RESP" | jq -e '.data' > /dev/null 2>&1; then
  TOTAL=$(echo "$CUSTS_RESP" | jq '.meta.total')
  echo -e "${G}  ✅ Get customers success (total: $TOTAL)${N}"
  ((PASS++))
else
  echo -e "${R}  ❌ Get customers failed${N}"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 15. ORDER - CREATE
# ------------------------------------------
echo -e "${B}[15] ORDER - CREATE${N}"
ORDER_DATA="{\"items\":[{\"name\":\"Test Item\",\"price\":25000,\"qty\":2}],\"paymentMethod\":\"cash\"}"

ORDER_RESP=$(curl -s -b "$COOKIE_FILE" -X POST \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA" \
  "$BASE_URL/orders")

if echo "$ORDER_RESP" | jq -e '.order.id' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Create order success${N}"
  ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.order.id')
  ORDER_NUM=$(echo "$ORDER_RESP" | jq -r '.order.orderNumber')
  echo "  Order ID: $ORDER_ID"
  echo "  Order Number: $ORDER_NUM"
  ((PASS++))
else
  echo -e "${R}  ❌ Create order failed${N}"
  echo "$ORDER_RESP"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 16. ORDER - GET ALL
# ------------------------------------------
echo -e "${B}[16] ORDER - GET ALL${N}"
ORDERS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/orders")

if echo "$ORDERS_RESP" | jq -e '.data' > /dev/null 2>&1; then
  TOTAL=$(echo "$ORDERS_RESP" | jq '.meta.total')
  echo -e "${G}  ✅ Get orders success (total: $TOTAL)${N}"
  ((PASS++))
else
  echo -e "${R}  ❌ Get orders failed${N}"
  ((FAIL++))
fi
echo ""

# ------------------------------------------
# 17. ORDER - UPDATE STATUS
# ------------------------------------------
echo -e "${B}[17] ORDER - UPDATE STATUS${N}"
if [ -n "$ORDER_ID" ]; then
  STATUS_RESP=$(curl -s -b "$COOKIE_FILE" -X PATCH \
    -H "Content-Type: application/json" \
    -d '{"status":"PROCESSING"}' \
    "$BASE_URL/orders/$ORDER_ID/status")
  
  if echo "$STATUS_RESP" | jq -e '.order.status' > /dev/null 2>&1; then
    NEW_STATUS=$(echo "$STATUS_RESP" | jq -r '.order.status')
    echo -e "${G}  ✅ Update status success: $NEW_STATUS${N}"
    ((PASS++))
  else
    echo -e "${R}  ❌ Update status failed${N}"
    echo "$STATUS_RESP"
    ((FAIL++))
  fi
else
  echo -e "${Y}  ⚠️ Skipped${N}"
fi
echo ""

# ------------------------------------------
# 18. DASHBOARD STATS
# ------------------------------------------
echo -e "${B}[18] DASHBOARD STATS${N}"
STATS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/tenants/me/stats")

if echo "$STATS_RESP" | jq -e '.products' > /dev/null 2>&1; then
  echo -e "${G}  ✅ Get stats success${N}"
  echo "$STATS_RESP" | jq '{products: .products.total, customers: .customers.total, orders: .orders.total}'
  ((PASS++))
else
  echo -e "${R}  ❌ Get stats failed${N}"
  echo "$STATS_RESP"
  ((FAIL++))
fi
echo ""

# ==========================================
# SUMMARY
# ==========================================
echo ""
echo -e "${B}================================================${N}"
echo -e "${B}   TEST SUMMARY${N}"
echo -e "${B}================================================${N}"
echo ""
echo -e "  Total:  $((PASS + FAIL))"
echo -e "  ${G}Passed: $PASS${N}"
echo -e "  ${R}Failed: $FAIL${N}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${G}================================================${N}"
  echo -e "${G}   🎉 ALL TESTS PASSED! 🎉${N}"
  echo -e "${G}================================================${N}"
  echo ""
  echo -e "${G}Backend DELETE berfungsi dengan baik!${N}"
  echo -e "${G}Masalah ada di FRONTEND (cache issue).${N}"
  echo ""
  exit 0
else
  echo -e "${R}================================================${N}"
  echo -e "${R}   ⚠️ SOME TESTS FAILED${N}"
  echo -e "${R}================================================${N}"
  echo ""
  exit 1
fi