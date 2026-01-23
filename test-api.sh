#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:8000"
EMAIL="burgerchina@fibidy.com"
PASSWORD="password123"
COOKIE_FILE="/tmp/fibidy_cookies.txt"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🍪 TESTING API TENANT (COOKIES)${NC}"
echo -e "${BLUE}================================${NC}\n"

# 1. LOGIN (Simpan cookies)
echo -e "${YELLOW}📍 Step 1: LOGIN${NC}"
echo -e "${YELLOW}POST ${BASE_URL}/api/auth/login${NC}\n"

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_FILE}" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

echo -e "${GREEN}Response:${NC}"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Check cookies
if [ -f "${COOKIE_FILE}" ]; then
  echo -e "${GREEN}✅ Cookies tersimpan di: ${COOKIE_FILE}${NC}"
  cat "${COOKIE_FILE}"
  echo ""
else
  echo -e "${RED}❌ Cookies tidak tersimpan!${NC}"
  exit 1
fi

# 2. GET TENANT (Pakai cookies)
echo -e "${YELLOW}📍 Step 2: GET CURRENT TENANT${NC}"
echo -e "${YELLOW}GET ${BASE_URL}/api/tenants/me${NC}\n"

GET_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/tenants/me" \
  -b "${COOKIE_FILE}")

echo -e "${GREEN}Response:${NC}"
echo "$GET_RESPONSE" | jq '.' 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# 3. PATCH TENANT (Pakai cookies)
echo -e "${YELLOW}📍 Step 3: UPDATE TENANT (PATCH)${NC}"
echo -e "${YELLOW}PATCH ${BASE_URL}/api/tenants/me${NC}\n"

PATCH_RESPONSE=$(curl -s -X PATCH "${BASE_URL}/api/tenants/me" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "name": "Test Store UPDATED",
    "description": "Test Description UPDATED",
    "phone": "+6281234567890",
    "address": "Test Address UPDATED",
    "contactTitle": "TEST CONTACT TITLE UPDATED",
    "contactSubtitle": "TEST CONTACT SUBTITLE UPDATED",
    "ctaTitle": "TEST CTA TITLE UPDATED",
    "ctaSubtitle": "TEST CTA SUBTITLE UPDATED"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$PATCH_RESPONSE" | jq '.' 2>/dev/null || echo "$PATCH_RESPONSE"
echo ""

# 4. VERIFY UPDATE
echo -e "${YELLOW}📍 Step 4: VERIFY UPDATE${NC}"
echo -e "${YELLOW}GET ${BASE_URL}/api/tenants/me${NC}\n"

VERIFY_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/tenants/me" \
  -b "${COOKIE_FILE}")

echo -e "${GREEN}Response (Fields yang diupdate):${NC}"
echo "$VERIFY_RESPONSE" | jq '{
  name,
  description,
  phone,
  address,
  contactTitle,
  contactSubtitle,
  ctaTitle,
  ctaSubtitle
}' 2>/dev/null || echo "$VERIFY_RESPONSE"

echo -e "\n${BLUE}================================${NC}"
echo -e "${GREEN}✅ TEST SELESAI${NC}"
echo -e "${BLUE}================================${NC}"

# Cleanup
rm -f "${COOKIE_FILE}"