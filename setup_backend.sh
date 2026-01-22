#!/bin/bash

echo "🚀 Setting up Foundation Fundraiser CRM Backend..."

cd /var/www/fundraiser-crm/backend

# Generate JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

echo "📝 Creating environment file..."
cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
CLIENT_URL=http://217.154.36.97

DB_HOST=localhost
DB_PORT=5432
DB_NAME=fundraiser_crm
DB_USER=fundraiser_user
DB_PASSWORD=ChangeMeToSecurePassword123!
DB_DIALECT=postgres

JWT_SECRET=$JWT_SECRET
ENV_EOF

echo "📦 Creating package.json..."
cat > package.json << 'PKG_EOF'
{
  "name": "foundation-fundraiser-crm-backend",
  "version": "1.0.0",
  "description": "Backend API for Foundation Fundraiser CRM",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
PKG_EOF

echo "⚙️ Installing backend dependencies..."
npm install

echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit /var/www/fundraiser-crm/backend/.env with your database password"
echo "2. I'll provide the remaining backend files"

