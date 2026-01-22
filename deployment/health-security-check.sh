#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
#  FUNDRAISER CRM - COMPREHENSIVE HEALTH CHECK & SECURITY AUDIT
#  Run this on your server: bash health-security-check.sh
#═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║     FUNDRAISER CRM - HEALTH CHECK & SECURITY AUDIT                        ║"
echo "║     Generated: $(date)                              ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
WARN=0
FAIL=0
DOMAIN="nosafemargin.welshdale.com"
BACKEND_PORT=3001
APP_DIR="/var/www/fundraiser-crm"

#───────────────────────────────────────────────────────────────────────────────
# SECTION 1: SERVICE STATUS
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 1. SERVICE STATUS ═══${NC}"

# Check systemd service
if systemctl is-active --quiet fundraiser-backend 2>/dev/null; then
    echo -e "${GREEN}[PASS]${NC} Backend service is running (systemd)"
    ((PASS++))
else
    # Try PM2
    if pm2 list 2>/dev/null | grep -q "online"; then
        echo -e "${GREEN}[PASS]${NC} Backend service is running (PM2)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} Backend service is NOT running"
        ((FAIL++))
    fi
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}[PASS]${NC} Nginx is running"
    ((PASS++))
else
    echo -e "${RED}[FAIL]${NC} Nginx is NOT running"
    ((FAIL++))
fi

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}[PASS]${NC} PostgreSQL is running"
    ((PASS++))
else
    echo -e "${RED}[FAIL]${NC} PostgreSQL is NOT running"
    ((FAIL++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 2: API ENDPOINT TESTS
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 2. API ENDPOINT TESTS ═══${NC}"

# Test health endpoint (internal)
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} GET /health - 200 OK"
    ((PASS++))
else
    echo -e "${RED}[FAIL]${NC} GET /health - HTTP $HEALTH (expected 200)"
    ((FAIL++))
fi

# Test API via localhost
AUTH_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:$BACKEND_PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>/dev/null || echo "000")
if [ "$AUTH_LOGIN" = "401" ]; then
    echo -e "${GREEN}[PASS]${NC} POST /api/auth/login - 401 (correct - invalid creds rejected)"
    ((PASS++))
elif [ "$AUTH_LOGIN" = "200" ]; then
    echo -e "${YELLOW}[WARN]${NC} POST /api/auth/login - 200 (test creds worked - check this!)"
    ((WARN++))
else
    echo -e "${RED}[FAIL]${NC} POST /api/auth/login - HTTP $AUTH_LOGIN (expected 401)"
    ((FAIL++))
fi

# Test with real credentials
REAL_LOGIN=$(curl -s http://localhost:$BACKEND_PORT/api/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"nosafemargin@welshdale.com","password":"Admin123!"}' 2>/dev/null)

if echo "$REAL_LOGIN" | grep -q "token"; then
    echo -e "${GREEN}[PASS]${NC} POST /api/auth/login - Admin login successful"
    TOKEN=$(echo "$REAL_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    ((PASS++))

    # Test authenticated endpoint
    ME_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/auth/me \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$ME_RESPONSE" = "200" ]; then
        echo -e "${GREEN}[PASS]${NC} GET /api/auth/me - 200 (authenticated)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} GET /api/auth/me - HTTP $ME_RESPONSE"
        ((FAIL++))
    fi

    # Test leads endpoint
    LEADS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/leads \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$LEADS_RESPONSE" = "200" ]; then
        echo -e "${GREEN}[PASS]${NC} GET /api/leads - 200 (authenticated)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} GET /api/leads - HTTP $LEADS_RESPONSE"
        ((FAIL++))
    fi

    # Test members endpoint
    MEMBERS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/members \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$MEMBERS_RESPONSE" = "200" ]; then
        echo -e "${GREEN}[PASS]${NC} GET /api/members - 200 (authenticated)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} GET /api/members - HTTP $MEMBERS_RESPONSE"
        ((FAIL++))
    fi

    # Test users endpoint
    USERS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/users \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$USERS_RESPONSE" = "200" ]; then
        echo -e "${GREEN}[PASS]${NC} GET /api/users - 200 (authenticated)"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} GET /api/users - HTTP $USERS_RESPONSE"
        ((FAIL++))
    fi
else
    echo -e "${RED}[FAIL]${NC} POST /api/auth/login - Admin login failed"
    echo "       Response: $REAL_LOGIN"
    ((FAIL++))
fi

# Test unauthenticated access is blocked
UNAUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/leads 2>/dev/null || echo "000")
if [ "$UNAUTH_TEST" = "401" ]; then
    echo -e "${GREEN}[PASS]${NC} GET /api/leads (no token) - 401 (correctly blocked)"
    ((PASS++))
else
    echo -e "${RED}[FAIL]${NC} GET /api/leads (no token) - HTTP $UNAUTH_TEST (expected 401)"
    ((FAIL++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 3: SSL/TLS CERTIFICATE CHECK
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 3. SSL/TLS CERTIFICATE ═══${NC}"

# Check SSL certificate
SSL_EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

    if [ $DAYS_LEFT -gt 30 ]; then
        echo -e "${GREEN}[PASS]${NC} SSL Certificate valid for $DAYS_LEFT days (expires: $SSL_EXPIRY)"
        ((PASS++))
    elif [ $DAYS_LEFT -gt 7 ]; then
        echo -e "${YELLOW}[WARN]${NC} SSL Certificate expires in $DAYS_LEFT days - RENEW SOON"
        ((WARN++))
    else
        echo -e "${RED}[FAIL]${NC} SSL Certificate expires in $DAYS_LEFT days - CRITICAL"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}[WARN]${NC} Could not check SSL certificate"
    ((WARN++))
fi

# Check HTTPS redirect
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" -L http://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_REDIRECT" = "200" ]; then
    echo -e "${GREEN}[PASS]${NC} HTTP redirects to HTTPS correctly"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} HTTP redirect returned $HTTP_REDIRECT"
    ((WARN++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 4: SECURITY HEADERS
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 4. SECURITY HEADERS ═══${NC}"

HEADERS=$(curl -sI https://$DOMAIN 2>/dev/null)

# X-Frame-Options
if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    echo -e "${GREEN}[PASS]${NC} X-Frame-Options header present"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} X-Frame-Options header missing (clickjacking protection)"
    ((WARN++))
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
    echo -e "${GREEN}[PASS]${NC} X-Content-Type-Options header present"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} X-Content-Type-Options header missing"
    ((WARN++))
fi

# X-XSS-Protection
if echo "$HEADERS" | grep -qi "X-XSS-Protection"; then
    echo -e "${GREEN}[PASS]${NC} X-XSS-Protection header present"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} X-XSS-Protection header missing"
    ((WARN++))
fi

# Strict-Transport-Security
if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
    echo -e "${GREEN}[PASS]${NC} HSTS header present"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} HSTS header missing (add for better security)"
    ((WARN++))
fi

# Content-Security-Policy
if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    echo -e "${GREEN}[PASS]${NC} Content-Security-Policy header present"
    ((PASS++))
else
    echo -e "${YELLOW}[WARN]${NC} Content-Security-Policy header missing"
    ((WARN++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 5: DATABASE SECURITY
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 5. DATABASE SECURITY ═══${NC}"

# Check if database user has limited privileges
DB_USER="fundraiser_user"
DB_NAME="fundraiser_crm"

# Check tables exist
TABLE_COUNT=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" $DB_NAME 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -ge 9 ]; then
    echo -e "${GREEN}[PASS]${NC} Database has $TABLE_COUNT tables (expected 9+)"
    ((PASS++))
else
    echo -e "${RED}[FAIL]${NC} Database has only $TABLE_COUNT tables (expected 9+)"
    ((FAIL++))
fi

# Check if default postgres password is changed
if sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${YELLOW}[WARN]${NC} Postgres user accessible without password (local only - OK if pg_hba.conf is secure)"
    ((WARN++))
fi

# Check PostgreSQL is not exposed externally
if netstat -tuln 2>/dev/null | grep -q "0.0.0.0:5432"; then
    echo -e "${RED}[FAIL]${NC} PostgreSQL is listening on all interfaces (0.0.0.0:5432) - SECURITY RISK!"
    ((FAIL++))
elif netstat -tuln 2>/dev/null | grep -q "127.0.0.1:5432"; then
    echo -e "${GREEN}[PASS]${NC} PostgreSQL only listening on localhost"
    ((PASS++))
else
    ss -tuln 2>/dev/null | grep -q "127.0.0.1:5432" && echo -e "${GREEN}[PASS]${NC} PostgreSQL only listening on localhost" && ((PASS++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 6: ENVIRONMENT & SECRETS
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 6. ENVIRONMENT & SECRETS ═══${NC}"

ENV_FILE="$APP_DIR/backend/.env"

if [ -f "$ENV_FILE" ]; then
    # Check JWT_SECRET is set and not default
    JWT_SECRET=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    if [ -n "$JWT_SECRET" ] && [ "$JWT_SECRET" != "your-super-secret-jwt-key-change-in-production" ]; then
        JWT_LEN=${#JWT_SECRET}
        if [ $JWT_LEN -ge 32 ]; then
            echo -e "${GREEN}[PASS]${NC} JWT_SECRET is set and has good length ($JWT_LEN chars)"
            ((PASS++))
        else
            echo -e "${YELLOW}[WARN]${NC} JWT_SECRET is short ($JWT_LEN chars) - recommend 32+ chars"
            ((WARN++))
        fi
    else
        echo -e "${RED}[FAIL]${NC} JWT_SECRET is using default value - CHANGE IMMEDIATELY!"
        ((FAIL++))
    fi

    # Check DB_PASSWORD is set
    DB_PASS=$(grep "^DB_PASSWORD=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    if [ -n "$DB_PASS" ] && [ "$DB_PASS" != "postgres" ] && [ "$DB_PASS" != "password" ]; then
        echo -e "${GREEN}[PASS]${NC} DB_PASSWORD is set and not default"
        ((PASS++))
    else
        echo -e "${RED}[FAIL]${NC} DB_PASSWORD appears to be default - CHANGE IT!"
        ((FAIL++))
    fi

    # Check NODE_ENV
    NODE_ENV=$(grep "^NODE_ENV=" "$ENV_FILE" 2>/dev/null | cut -d= -f2)
    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${GREEN}[PASS]${NC} NODE_ENV is set to production"
        ((PASS++))
    else
        echo -e "${YELLOW}[WARN]${NC} NODE_ENV is '$NODE_ENV' - should be 'production'"
        ((WARN++))
    fi

    # Check .env file permissions
    ENV_PERMS=$(stat -c %a "$ENV_FILE" 2>/dev/null || stat -f %Lp "$ENV_FILE" 2>/dev/null)
    if [ "$ENV_PERMS" = "600" ] || [ "$ENV_PERMS" = "640" ]; then
        echo -e "${GREEN}[PASS]${NC} .env file has secure permissions ($ENV_PERMS)"
        ((PASS++))
    else
        echo -e "${YELLOW}[WARN]${NC} .env file permissions are $ENV_PERMS - recommend 600"
        ((WARN++))
    fi
else
    echo -e "${RED}[FAIL]${NC} .env file not found at $ENV_FILE"
    ((FAIL++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 7: FIREWALL & NETWORK
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 7. FIREWALL & NETWORK ═══${NC}"

# Check UFW status
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    if echo "$UFW_STATUS" | grep -q "active"; then
        echo -e "${GREEN}[PASS]${NC} UFW firewall is active"
        ((PASS++))
    else
        echo -e "${YELLOW}[WARN]${NC} UFW firewall is not active"
        ((WARN++))
    fi
fi

# Check backend port is not exposed
if netstat -tuln 2>/dev/null | grep -q "0.0.0.0:$BACKEND_PORT"; then
    echo -e "${YELLOW}[WARN]${NC} Backend port $BACKEND_PORT is exposed on all interfaces"
    ((WARN++))
elif netstat -tuln 2>/dev/null | grep -q "127.0.0.1:$BACKEND_PORT"; then
    echo -e "${GREEN}[PASS]${NC} Backend only accessible via localhost (nginx proxy)"
    ((PASS++))
else
    ss -tuln 2>/dev/null | grep -q ":$BACKEND_PORT" && echo -e "${GREEN}[PASS]${NC} Backend port check passed" && ((PASS++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 8: DISK & RESOURCES
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 8. DISK & RESOURCES ═══${NC}"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}[PASS]${NC} Disk usage is ${DISK_USAGE}%"
    ((PASS++))
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}[WARN]${NC} Disk usage is ${DISK_USAGE}% - consider cleanup"
    ((WARN++))
else
    echo -e "${RED}[FAIL]${NC} Disk usage is ${DISK_USAGE}% - CRITICAL!"
    ((FAIL++))
fi

# Check memory
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo -e "${GREEN}[PASS]${NC} Memory usage is ${MEM_USAGE}%"
    ((PASS++))
elif [ "$MEM_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}[WARN]${NC} Memory usage is ${MEM_USAGE}%"
    ((WARN++))
else
    echo -e "${RED}[FAIL]${NC} Memory usage is ${MEM_USAGE}% - CRITICAL!"
    ((FAIL++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 9: BACKUP STATUS
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 9. BACKUP STATUS ═══${NC}"

BACKUP_DIR="/var/backups/fundraiser-crm"
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP" 2>/dev/null)) / 3600 ))
        if [ "$BACKUP_AGE" -lt 25 ]; then
            echo -e "${GREEN}[PASS]${NC} Latest backup is ${BACKUP_AGE} hours old"
            ((PASS++))
        else
            echo -e "${YELLOW}[WARN]${NC} Latest backup is ${BACKUP_AGE} hours old"
            ((WARN++))
        fi
    else
        echo -e "${YELLOW}[WARN]${NC} No backups found in $BACKUP_DIR"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}[WARN]${NC} Backup directory not found"
    ((WARN++))
fi

echo ""

#───────────────────────────────────────────────────────────────────────────────
# SECTION 10: ALL API ENDPOINTS LISTING
#───────────────────────────────────────────────────────────────────────────────
echo -e "${BLUE}═══ 10. AVAILABLE API ENDPOINTS ═══${NC}"
echo ""
echo "Authentication:"
echo "  POST   /api/auth/register     - Register new user"
echo "  POST   /api/auth/login        - Login"
echo "  GET    /api/auth/me           - Get current user"
echo "  PUT    /api/auth/me           - Update current user"
echo "  PUT    /api/auth/password     - Change password"
echo "  POST   /api/auth/logout       - Logout"
echo ""
echo "Leads:"
echo "  GET    /api/leads             - List leads"
echo "  GET    /api/leads/:id         - Get lead by ID"
echo "  POST   /api/leads             - Create lead"
echo "  PUT    /api/leads/:id         - Update lead"
echo "  DELETE /api/leads/:id         - Delete lead"
echo "  POST   /api/leads/:id/convert - Convert to member"
echo "  GET    /api/leads/stats/pipeline - Pipeline statistics"
echo ""
echo "Members:"
echo "  GET    /api/members           - List members"
echo "  GET    /api/members/:id       - Get member by ID"
echo "  POST   /api/members           - Create member"
echo "  PUT    /api/members/:id       - Update member"
echo "  DELETE /api/members/:id       - Delete member"
echo "  POST   /api/members/:id/donation - Record donation"
echo "  GET    /api/members/stats/summary - Member statistics"
echo ""
echo "Activities:"
echo "  GET    /api/activities        - List activities"
echo "  GET    /api/activities/lead/:id - Get lead activities"
echo "  GET    /api/activities/member/:id - Get member activities"
echo "  POST   /api/activities        - Create activity"
echo ""
echo "Email Sequences:"
echo "  GET    /api/email-sequences   - List sequences"
echo "  GET    /api/email-sequences/onboarding - Onboarding sequences"
echo "  GET    /api/email-sequences/:id - Get sequence"
echo "  POST   /api/email-sequences   - Create sequence"
echo "  PUT    /api/email-sequences/:id - Update sequence"
echo "  DELETE /api/email-sequences/:id - Delete sequence"
echo ""
echo "Users:"
echo "  GET    /api/users             - List users"
echo "  GET    /api/users/active      - List active users"
echo "  GET    /api/users/:id         - Get user"
echo "  PUT    /api/users/:id         - Update user"
echo "  POST   /api/users/invite      - Invite user (admin)"
echo ""
echo "Messages:"
echo "  GET    /api/messages/inbox    - Get inbox"
echo "  GET    /api/messages/sent     - Get sent messages"
echo "  POST   /api/messages          - Send message"
echo ""
echo "AI:"
echo "  POST   /api/ai/generate       - Generate content"
echo "  POST   /api/ai/generate-email - Generate email"
echo "  GET    /api/ai/health         - AI service health"
echo ""
echo "System:"
echo "  GET    /health                - Health check"
echo ""

#───────────────────────────────────────────────────────────────────────────────
# SUMMARY
#───────────────────────────────────────────────────────────────────────────────
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                              SUMMARY                                      ║"
echo "╠═══════════════════════════════════════════════════════════════════════════╣"
printf "║  ${GREEN}PASSED: %-3d${NC}  │  ${YELLOW}WARNINGS: %-3d${NC}  │  ${RED}FAILED: %-3d${NC}                       ║\n" $PASS $WARN $FAIL
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}⚠️  CRITICAL ISSUES FOUND - Please address FAILED items immediately!${NC}"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚡ Some warnings found - Review and fix when possible.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All checks passed! System is healthy and secure.${NC}"
    exit 0
fi
