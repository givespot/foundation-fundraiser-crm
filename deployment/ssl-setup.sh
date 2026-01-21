#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# Run this after deployment to enable HTTPS

set -e

echo "🔐 SSL Certificate Setup"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./ssl-setup.sh)${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain (e.g., crm.yourdomain.com): " DOMAIN
read -p "Enter your email for Let's Encrypt notifications: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}Domain and email are required${NC}"
    exit 1
fi

# Install certbot
echo ""
echo -e "${YELLOW}Installing Certbot...${NC}"
apt-get update
apt-get install -y certbot

# Create webroot directory
mkdir -p /var/www/certbot

# Get certificate
echo ""
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Copy certificates to deployment directory
echo ""
echo -e "${YELLOW}Setting up certificates...${NC}"
mkdir -p /opt/fundraiser-crm/deployment/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/fundraiser-crm/deployment/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/fundraiser-crm/deployment/ssl/

# Update nginx configuration
echo ""
echo -e "${YELLOW}Please update your nginx configuration to enable HTTPS.${NC}"
echo "Uncomment the HTTPS server block in deployment/nginx.conf"
echo "Update 'your-domain.com' with '$DOMAIN'"
echo ""

# Setup auto-renewal
echo ""
echo -e "${YELLOW}Setting up automatic certificate renewal...${NC}"
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/fundraiser-crm/docker-compose.yml restart frontend") | crontab -

# Restart containers
echo ""
echo -e "${YELLOW}Restarting containers...${NC}"
cd /opt/fundraiser-crm
docker-compose restart frontend

echo ""
echo -e "${GREEN}SSL setup complete!${NC}"
echo ""
echo "Your site should now be accessible at: https://$DOMAIN"
echo ""
echo "Remember to:"
echo "  1. Update FRONTEND_URL in .env to https://$DOMAIN"
echo "  2. Update API_BASE_URL in .env to https://$DOMAIN/api"
echo "  3. Restart containers: docker-compose restart"
