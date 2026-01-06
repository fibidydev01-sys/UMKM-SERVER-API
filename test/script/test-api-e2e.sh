#!/bin/bash

# ============================================
# FIBIDY API TEST - GENTLE VERSION
# ============================================
# This version adds delays between requests
# to prevent server overload
# ============================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8000/api"
TOKEN=""
PASSED=0
FAILED=0
DELAY=0.3  # 300ms delay between tests

# Simple test function with delay
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expect="$5"
    local auth="$6"
    
    sleep $DELAY  # Prevent server overload
    
    echo -n "🧪 $name ... "
    
    local cmd="curl -s -w '%{http_code}' -o /tmp/resp.txt -X $method '$BASE_URL$endpoint'"
    cmd+=" -H 'Content-Type: application/json'"
    
    if [ "$auth" = "yes" ] && [ -n "$TOKEN" ]; then
        cmd+=" -H 'Authorization: Bearer $TOKEN'"
    fi
    
    if [ -n "$data" ]; then
        cmd+=" -d '$data'"
    fi
    
    local code=$(eval $cmd 2>/dev/null)
    
    # Check if code matches expected (can be comma-separated list)
    if echo "$expect" | grep -q "$code"; then
        echo -e "${GREEN}✅ OK ($code)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL ($code, expected $expect)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Extract ID from response
get_id() {
    cat /tmp/resp.txt 2>/dev/null | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

# ============================================
# START
# ============================================

clear
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 FIBIDY API TEST (Gentle Mode)                ║${NC}"
echo -e "${BLUE}║  Delay: ${DELAY}s between requests                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check server
echo -n "Checking server... "
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" | grep -q "200"; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NOT RUNNING${NC}"
    echo "Start server: just dev"
    exit 1
fi
echo ""

# ============================================
# AUTH
# ============================================
echo -e "${BLUE}═══ AUTH ═══${NC}"

# Login first
echo -n "🔐 Login... "
sleep $DELAY
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"tokosari@fibidy.com","password":"password123"}' 2>/dev/null)
TOKEN=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    ((FAILED++))
    echo "Cannot continue without token"
    exit 1
fi

test_endpoint "Wrong password" "POST" "/auth/login" \
    '{"email":"tokosari@fibidy.com","password":"wrong"}' "401" "no"

test_endpoint "Get /auth/me" "GET" "/auth/me" "" "200" "yes"

test_endpoint "No token" "GET" "/auth/me" "" "401" "no"

echo ""

# ============================================
# TENANTS
# ============================================
echo -e "${BLUE}═══ TENANTS ═══${NC}"

test_endpoint "Get profile" "GET" "/tenants/me" "" "200" "yes"

test_endpoint "Get stats" "GET" "/tenants/me/stats" "" "200" "yes"

test_endpoint "Public tenant" "GET" "/tenants/by-slug/tokosari" "" "200" "no"

test_endpoint "Check slug" "GET" "/tenants/check-slug/newslug123" "" "200" "no"

echo ""

# ============================================
# PRODUCTS
# ============================================
echo -e "${BLUE}═══ PRODUCTS ═══${NC}"

# Create product
echo -n "🧪 Create product... "
sleep $DELAY
curl -s -o /tmp/resp.txt -w "%{http_code}" -X POST "$BASE_URL/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Product","price":25000,"stock":100}' > /tmp/code.txt 2>/dev/null
CODE=$(cat /tmp/code.txt)
PRODUCT_ID=$(get_id)

if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    echo -e "${GREEN}✅ OK ($CODE)${NC}"
    ((PASSED++))
    if [ -n "$PRODUCT_ID" ]; then
        echo "   Product ID: $PRODUCT_ID"
    fi
else
    echo -e "${RED}❌ FAIL ($CODE)${NC}"
    ((FAILED++))
fi

test_endpoint "Get products" "GET" "/products" "" "200" "yes"

test_endpoint "Get categories" "GET" "/products/categories" "" "200" "yes"

if [ -n "$PRODUCT_ID" ]; then
    test_endpoint "Get single" "GET" "/products/$PRODUCT_ID" "" "200" "yes"
    test_endpoint "Update" "PATCH" "/products/$PRODUCT_ID" '{"name":"Updated"}' "200" "yes"
fi

test_endpoint "Public products" "GET" "/tenants/by-slug/tokosari/products" "" "200" "no"

echo ""

# ============================================
# CUSTOMERS
# ============================================
echo -e "${BLUE}═══ CUSTOMERS ═══${NC}"

# Create customer
echo -n "🧪 Create customer... "
sleep $DELAY
curl -s -o /tmp/resp.txt -w "%{http_code}" -X POST "$BASE_URL/customers" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Customer","phone":"081999888777"}' > /tmp/code.txt 2>/dev/null
CODE=$(cat /tmp/code.txt)
CUSTOMER_ID=$(get_id)

if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
    echo -e "${GREEN}✅ OK ($CODE)${NC}"
    ((PASSED++))
    if [ -n "$CUSTOMER_ID" ]; then
        echo "   Customer ID: $CUSTOMER_ID"
    fi
else
    echo -e "${RED}❌ FAIL ($CODE)${NC}"
    ((FAILED++))
fi

test_endpoint "Get customers" "GET" "/customers" "" "200" "yes"

if [ -n "$CUSTOMER_ID" ]; then
    test_endpoint "Get single" "GET" "/customers/$CUSTOMER_ID" "" "200" "yes"
fi

echo ""

# ============================================
# ORDERS
# ============================================
echo -e "${BLUE}═══ ORDERS ═══${NC}"

# Create order
if [ -n "$PRODUCT_ID" ] && [ -n "$CUSTOMER_ID" ]; then
    echo -n "🧪 Create order... "
    sleep $DELAY
    curl -s -o /tmp/resp.txt -w "%{http_code}" -X POST "$BASE_URL/orders" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"customerId\":\"$CUSTOMER_ID\",\"items\":[{\"productId\":\"$PRODUCT_ID\",\"name\":\"Test Product\",\"qty\":2,\"price\":25000}]}" > /tmp/code.txt 2>/dev/null
    CODE=$(cat /tmp/code.txt)
    ORDER_ID=$(get_id)

    if [ "$CODE" = "201" ] || [ "$CODE" = "200" ]; then
        echo -e "${GREEN}✅ OK ($CODE)${NC}"
        ((PASSED++))
        if [ -n "$ORDER_ID" ]; then
            echo "   Order ID: $ORDER_ID"
        fi
    else
        echo -e "${RED}❌ FAIL ($CODE)${NC}"
        ((FAILED++))
    fi
else
    echo "⏭️  Skip create order (no product/customer)"
fi

test_endpoint "Get orders" "GET" "/orders" "" "200" "yes"

if [ -n "$ORDER_ID" ]; then
    test_endpoint "Get single" "GET" "/orders/$ORDER_ID" "" "200" "yes"
    test_endpoint "Update status" "PATCH" "/orders/$ORDER_ID/status" '{"status":"PROCESSING"}' "200" "yes"
fi

echo ""

# ============================================
# CLEANUP
# ============================================
echo -e "${BLUE}═══ CLEANUP ═══${NC}"

if [ -n "$ORDER_ID" ]; then
    test_endpoint "Delete order" "DELETE" "/orders/$ORDER_ID" "" "200,204" "yes"
fi

if [ -n "$PRODUCT_ID" ]; then
    test_endpoint "Delete product" "DELETE" "/products/$PRODUCT_ID" "" "200,204" "yes"
fi

if [ -n "$CUSTOMER_ID" ]; then
    test_endpoint "Delete customer" "DELETE" "/customers/$CUSTOMER_ID" "" "200,204" "yes"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
TOTAL=$((PASSED + FAILED))
RATE=$((PASSED * 100 / TOTAL))

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo "  Total:  $TOTAL"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $RATE -ge 90 ]; then
    echo -e "  Rate:   ${GREEN}$RATE%${NC} ✨"
elif [ $RATE -ge 70 ]; then
    echo -e "  Rate:   ${YELLOW}$RATE%${NC} ⚠️"
else
    echo -e "  Rate:   ${RED}$RATE%${NC} ❌"
fi

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
fi

echo ""
echo "Completed: $(date '+%H:%M:%S')"
echo ""

# Cleanup temp files
rm -f /tmp/resp.txt /tmp/code.txt 2>/dev/null

exit $FAILED