#!/bin/bash

# GEO Platform - Deployment Verification Script
# Run this before deploying to production

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNING=0

# Helper functions
check_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED++))
}

check_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  ((WARNING++))
}

check_info() {
  echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Header
clear
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         GEO Platform - Deployment Verification Script         ║"
echo "║                    Version 1.0 - Pre-Deploy QA                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# SECTION 1: Environment Checks
# ============================================================================
echo -e "${BLUE}[1.0] ENVIRONMENT VERIFICATION${NC}"
echo "─────────────────────────────────────────────────────────────────"

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  check_pass "Node.js installed: $NODE_VERSION"
else
  check_fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  check_pass "npm installed: $NPM_VERSION"
else
  check_fail "npm not found"
fi

# Check MongoDB (optional in dev, required for prod)
if command -v mongod &> /dev/null; then
  check_pass "MongoDB installed and available"
elif ping -c 1 localhost -W 1 &>/dev/null && nc -z localhost 27017 &>/dev/null; then
  check_pass "MongoDB is accessible on localhost:27017"
else
  check_warn "MongoDB not found/accessible (required for production)"
fi

echo ""

# ============================================================================
# SECTION 2: Backend Code Quality
# ============================================================================
echo -e "${BLUE}[2.0] BACKEND CODE QUALITY${NC}"
echo "─────────────────────────────────────────────────────────────────"

cd "$SCRIPT_DIR/backend-new" || {
  check_fail "Cannot navigate to backend-new directory"
  exit 1
}

# Check npm dependencies
if [ -d "node_modules" ]; then
  check_pass "Backend dependencies installed"
else
  check_warn "Backend node_modules not found, run: npm install"
fi

# Check TypeScript compilation
if npm run build > /dev/null 2>&1; then
  check_pass "TypeScript compiles without errors"
else
  check_fail "TypeScript compilation failed - see above"
  npm run build
fi

# Check for .env file
if [ -f ".env" ]; then
  check_pass "Backend .env file exists"

  # Check required env vars
  if grep -q "MONGODB_URL" .env; then
    check_pass "MONGODB_URL configured"
  else
    check_warn "MONGODB_URL not set in .env"
  fi

  if grep -q "JWT_SECRET" .env; then
    check_pass "JWT_SECRET configured"
  else
    check_fail "JWT_SECRET not configured (CRITICAL)"
  fi
else
  check_warn "Backend .env not found, copy from .env.example"
fi

# Check required directories
dirs_to_check=("src" "dist"  "src/models" "src/services" "src/controllers" "src/routes")
for dir in "${dirs_to_check[@]}"; do
  if [ -d "$dir" ]; then
    check_pass "Directory exists: $dir"
  else
    check_fail "Missing directory: $dir"
  fi
done

echo ""

# ============================================================================
# SECTION 3: Frontend Code Quality
# ============================================================================
echo -e "${BLUE}[3.0] FRONTEND CODE QUALITY${NC}"
echo "─────────────────────────────────────────────────────────────────"

cd "$SCRIPT_DIR/GEO" || {
  check_fail "Cannot navigate to GEO directory"
  exit 1
}

# Check npm dependencies
if [ -d "node_modules" ]; then
  check_pass "Frontend dependencies installed"
else
  check_warn "Frontend node_modules not found, run: npm install"
fi

# Check TypeScript compilation
if npm run build > /dev/null 2>&1; then
  check_pass "Frontend builds without errors"
else
  check_fail "Frontend build failed"
  npm run build
fi

# Check dist folder
if [ -d "dist" ]; then
  FILE_COUNT=$(find dist -type f | wc -l)
  check_pass "Frontend dist folder exists with $FILE_COUNT files"
else
  check_warn "Frontend dist folder not found, run: npm run build"
fi

# Check API configuration
if grep -q "http://localhost:8000" src/utils/api.ts; then
  check_info "Frontend API URL: localhost:8000 (dev mode)"
  check_warn "Update to production URL before deploying"
elif grep -q "API_BASE_URL" src/utils/api.ts; then
  check_pass "Frontend API configuration found"
else
  check_fail "API configuration not found in src/utils/api.ts"
fi

echo ""

# ============================================================================
# SECTION 4: Database Configuration
# ============================================================================
echo -e "${BLUE}[4.0] DATABASE CONFIGURATION${NC}"
echo "─────────────────────────────────────────────────────────────────"

cd "$SCRIPT_DIR/backend-new" || exit 1

if [ -f ".env" ]; then
  MONGO_URL=$(grep "MONGODB_URL" .env | cut -d'=' -f2-)

  if [ -n "$MONGO_URL" ]; then
    check_pass "MongoDB URL configured: ${MONGO_URL:0:30}..."

    # Try to connect (optional)
    if command -v mongo &> /dev/null; then
      if mongo "$MONGO_URL" --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        check_pass "MongoDB connection successful"
      else
        check_warn "Cannot connect to MongoDB (expected if offline in dev)"
      fi
    fi
  else
    check_fail "MONGODB_URL is empty"
  fi
else
  check_fail "No .env file found"
fi

echo ""

# ============================================================================
# SECTION 5: Security Checks
# ============================================================================
echo -e "${BLUE}[5.0] SECURITY VERIFICATION${NC}"
echo "─────────────────────────────────────────────────────────────────"

cd "$SCRIPT_DIR/backend-new" || exit 1

# Check for sensitive data in code
if grep -r "password.*=" src/ --include="*.ts" | grep -v "Password" | grep -v "password)" > /dev/null; then
  check_warn "Possible hardcoded credentials found"
else
  check_pass "No obvious hardcoded credentials"
fi

# Check .gitignore
if [ -f ".gitignore" ] && grep -q "\.env" .gitignore; then
  check_pass ".env files are gitignored"
else
  check_warn ".env files may not be properly gitignored"
fi

# Check for console.log in production
if grep -r "console\.log\|console\.error" src/ --include="*.ts" > /dev/null 2>&1; then
  check_warn "console.log/error statements found in code"
else
  check_pass "No console debug statements"
fi

# Check dependencies for vulnerabilities
if npm audit --production 2>&1 | grep -q "vulnerabilities"; then
  check_warn "npm audit found vulnerabilities - run 'npm audit' to review"
else
  check_pass "No known vulnerabilities in dependencies"
fi

echo ""

# ============================================================================
# SECTION 6: API Endpoint Verification
# ============================================================================
echo -e "${BLUE}[6.0] API ENDPOINT VERIFICATION${NC}"
echo "─────────────────────────────────────────────────────────────────"

# Check if servers are running
if nc -z localhost 8000 > /dev/null 2>&1; then
  check_pass "Backend server is running on port 8000"

  # Test health endpoint
  if curl -s http://localhost:8000/api/health > /dev/null; then
    check_pass "Health endpoint accessible"
  else
    check_fail "Health endpoint not responding"
  fi
else
  check_warn "Backend server not running on port 8000"
  check_info "Run: cd backend-new && node dist/server.js"
fi

if nc -z localhost 5173 > /dev/null 2>&1; then
  check_pass "Frontend server is running on port 5173"
else
  check_warn "Frontend server not running on port 5173"
  check_info "Run: cd GEO && npm run dev"
fi

echo ""

# ============================================================================
# SECTION 7: File Permission Checks
# ============================================================================
echo -e "${BLUE}[7.0] FILE PERMISSION CHECKS${NC}"
echo "─────────────────────────────────────────────────────────────────"

cd "$SCRIPT_DIR/backend-new" || exit 1

# Check if dist files are readable
if [ -f "dist/server.js" ] && [ -r "dist/server.js" ]; then
  check_pass "dist/server.js is readable"
else
  check_fail "dist/server.js is not readable"
fi

echo ""

# ============================================================================
# SECTION 8: Deployment Readiness Summary
# ============================================================================
echo -e "${BLUE}[8.0] DEPLOYMENT READINESS SUMMARY${NC}"
echo "─────────────────────────────────────────────────────────────────"

TOTAL=$((PASSED + FAILED + WARNING))

echo ""
echo "Results Summary:"
echo "  ${GREEN}Passed:  $PASSED${NC}"
echo "  ${YELLOW}Warnings: $WARNING${NC}"
echo "  ${RED}Failed:  $FAILED${NC}"
echo "  ────────────────"
echo "  Total:   $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
  if [ $WARNING -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ DEPLOYMENT READY - ALL CHECKS PASSED       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    exit 0
  else
    echo -e "${YELLOW}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠ DEPLOYMENT READY - WITH WARNINGS          ║${NC}"
    echo -e "${YELLOW}║  Review the warnings above before deploying   ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════╝${NC}"
    exit 0
  fi
else
  echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ✗ DEPLOYMENT NOT READY - FIX FAILURES        ║${NC}"
  echo -e "${RED}║  Address the red FAIL items above              ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
  exit 1
fi
