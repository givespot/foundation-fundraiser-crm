#!/bin/bash

# Foundation Fundraiser CRM - Deployment Script for IONOS VPS
# This script sets up and deploys the application on a fresh Ubuntu server

set -e

echo "🚀 Foundation Fundraiser CRM - Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Configuration
APP_DIR="/opt/fundraiser-crm"
REPO_URL="https://github.com/givespot/foundation-fundraiser-crm.git"

echo ""
echo -e "${YELLOW}Step 1: Installing system dependencies...${NC}"
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Install Docker
echo ""
echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker already installed"
fi

# Install Docker Compose
echo ""
echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Clone or update repository
echo ""
echo -e "${YELLOW}Step 4: Setting up application directory...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd "$APP_DIR"
    git pull
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Check for .env file
echo ""
echo -e "${YELLOW}Step 5: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}No .env file found!${NC}"
    echo "Creating from template..."
    cp deployment/.env.production .env
    echo ""
    echo -e "${RED}IMPORTANT: Please edit /opt/fundraiser-crm/.env with your actual values:${NC}"
    echo "  - DB_PASSWORD: Strong database password"
    echo "  - JWT_SECRET: Random 32+ character string"
    echo "  - FRONTEND_URL: Your domain (e.g., https://crm.yourdomain.com)"
    echo "  - SMTP settings: Your email configuration"
    echo "  - OPENAI_API_KEY: Your OpenAI API key"
    echo ""
    read -p "Press Enter after editing .env to continue..."
fi

# Configure firewall
echo ""
echo -e "${YELLOW}Step 6: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Build and start containers
echo ""
echo -e "${YELLOW}Step 7: Building and starting Docker containers...${NC}"
docker-compose build --no-cache
docker-compose up -d

# Wait for database to be ready
echo ""
echo -e "${YELLOW}Step 8: Waiting for database to be ready...${NC}"
sleep 10

# Run database migrations
echo ""
echo -e "${YELLOW}Step 9: Running database migrations...${NC}"
docker-compose exec -T backend node dist/utils/migrate.js

# Show status
echo ""
echo -e "${YELLOW}Step 10: Checking container status...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Your application should be accessible at:"
echo "  - HTTP:  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Next steps:"
echo "  1. Configure your domain's DNS to point to this server"
echo "  2. Set up SSL certificates (see deployment/ssl-setup.sh)"
echo "  3. Update FRONTEND_URL in .env with your domain"
echo ""
echo "Useful commands:"
echo "  - View logs:     docker-compose logs -f"
echo "  - Restart:       docker-compose restart"
echo "  - Stop:          docker-compose down"
echo "  - Update:        git pull && docker-compose up -d --build"
