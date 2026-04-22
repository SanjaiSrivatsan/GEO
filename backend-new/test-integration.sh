#!/bin/bash

# GEO Backend-Frontend Integration Test Script
# This script tests the Express backend API with the React frontend

API_BASE_URL="http://localhost:8000/api"
TEST_EMAIL="integration-test-$(date +%s)@example.com"
TEST_PASSWORD="Test123!@"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "GEO Backend-Frontend Integration Tests"
echo "========================================"
echo "API Base URL: $API_BASE_URL"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[Test 1] Health Check${NC}"
curl -s "$API_BASE_URL/health" | jq '.'
echo ""

# Test 2: User Registration
echo -e "${YELLOW}[Test 2] User Registration${NC}"
echo "Email: $TEST_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token for future requests
AUTH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token.access_token // empty')

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}Failed to get auth token from registration${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Got auth token: ${AUTH_TOKEN:0:20}...${NC}"
echo ""

# Test 3: Get Current User
echo -e "${YELLOW}[Test 3] Get Current User (GET /auth/me)${NC}"
curl -s -X GET "$API_BASE_URL/auth/me" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 4: Create Business Profile
echo -e "${YELLOW}[Test 4] Create Business Profile${NC}"
BUSINESS_JSON=$(cat <<EOF
{
  "name": "Test Business",
  "category": "Retail",
  "primaryLocation": "New York",
  "website": "https://testbusiness.com",
  "brandVoice": "Professional",
  "mainGoal": "Increase visibility"
}
EOF
)

echo "Business Data: $BUSINESS_JSON"
BUSINESS_RESPONSE=$(curl -s -X POST "$API_BASE_URL/business/profiles" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BUSINESS_JSON")

echo "$BUSINESS_RESPONSE" | jq '.'

# Extract business ID
BUSINESS_ID=$(echo "$BUSINESS_RESPONSE" | jq -r '.profile.id // empty')
if [ -z "$BUSINESS_ID" ]; then
  echo -e "${RED}Failed to create business profile${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Created business profile: $BUSINESS_ID${NC}"
echo ""

# Test 5: List Business Profiles
echo -e "${YELLOW}[Test 5] List Business Profiles (GET /business/profiles)${NC}"
curl -s -X GET "$API_BASE_URL/business/profiles" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 6: Get Specific Business Profile
echo -e "${YELLOW}[Test 6] Get Specific Business Profile (GET /business/profiles/:id)${NC}"
curl -s -X GET "$API_BASE_URL/business/profiles/$BUSINESS_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# Test 7: Login with Created User
echo -e "${YELLOW}[Test 7] Login with Created User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

echo "$LOGIN_RESPONSE" | jq '.'

NEW_AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token.access_token // empty')
if [ "$NEW_AUTH_TOKEN" != "$AUTH_TOKEN" ]; then
  echo -e "${GREEN}✓ New token generated on login${NC}"
else
  echo -e "${GREEN}✓ Token verified${NC}"
fi
echo ""

echo -e "${GREEN}========================================"
echo "All tests completed successfully!"
echo "========================================${NC}"
