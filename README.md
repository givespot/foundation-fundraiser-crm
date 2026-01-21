# Foundation Fundraiser CRM

A self-hosted CRM system for managing fundraising activities, leads, members, and automated email sequences. Built with React, Node.js/Express, and PostgreSQL.

## Features

- **Lead Management**: Track leads through a visual Kanban pipeline
- **Member Management**: Convert leads to members and track donations
- **Email Sequences**: Create automated email campaigns with AI-generated content
- **Activity Tracking**: Log all interactions with leads and members
- **Team Collaboration**: Internal messaging and user management
- **Audit Logging**: Track all system actions
- **AI Integration**: Generate email content and follow-up suggestions using OpenAI

## Tech Stack

### Frontend
- React 18 with React Router
- Tailwind CSS
- Shadcn/UI components (Radix UI)
- TanStack React Query
- Recharts for data visualization

### Backend
- Node.js 20+ with Express
- TypeScript
- PostgreSQL database
- JWT authentication
- Nodemailer for email
- OpenAI API for AI features

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/givespot/foundation-fundraiser-crm.git
cd foundation-fundraiser-crm
```

### 2. Set up the backend
```bash
cd backend
cp .env.example .env
# Edit .env with your database and API credentials
npm install
npm run db:migrate
npm run dev
```

### 3. Set up the frontend
```bash
cd ..
cp .env.example .env.local
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## Production Deployment (IONOS VPS)

### Prerequisites
- IONOS VPS with Ubuntu 22.04
- Domain name pointing to your server
- SMTP credentials for email sending
- OpenAI API key (optional, for AI features)

### Deployment Steps

1. **SSH into your server**
```bash
ssh root@your-server-ip
```

2. **Download and run the deployment script**
```bash
curl -fsSL https://raw.githubusercontent.com/givespot/foundation-fundraiser-crm/main/deployment/deploy.sh -o deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

3. **Configure environment variables**
Edit `/opt/fundraiser-crm/.env` with your settings:
- `DB_PASSWORD`: Strong database password
- `JWT_SECRET`: Random 32+ character string
- `FRONTEND_URL`: Your domain (e.g., `https://crm.yourdomain.com`)
- `SMTP_*`: Your email server settings
- `OPENAI_API_KEY`: Your OpenAI API key

4. **Set up SSL (optional but recommended)**
```bash
cd /opt/fundraiser-crm
sudo ./deployment/ssl-setup.sh
```

### Docker Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Run database migrations
docker-compose exec backend node dist/utils/migrate.js
```

## API Documentation

### Authentication
All API endpoints (except `/api/auth/login` and `/api/auth/register`) require a Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints

#### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update current user

#### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/:id/convert` - Convert to member

#### Members
- `GET /api/members` - List members
- `POST /api/members` - Create member
- `GET /api/members/:id` - Get member
- `PUT /api/members/:id` - Update member
- `POST /api/members/:id/donation` - Record donation

#### Email Sequences
- `GET /api/email-sequences` - List sequences
- `POST /api/email-sequences` - Create sequence
- `PUT /api/email-sequences/:id` - Update sequence
- `POST /api/email-sequences/:id/toggle-active` - Toggle active status

#### AI
- `POST /api/ai/generate` - Generate content
- `POST /api/ai/generate-email` - Generate email content
- `POST /api/ai/suggest-followup` - Get follow-up suggestions

## Environment Variables

### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=fundraiser_crm
DB_USER=postgres
DB_PASSWORD=your-password

# Security
JWT_SECRET=your-32+-char-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
SMTP_FROM=Name <email@domain.com>

# AI (Optional)
OPENAI_API_KEY=sk-your-key
LLM_MODEL=gpt-4o-mini
```

### Frontend (.env)
```env
VITE_API_URL=/api
```

## Security Notes

- All passwords are hashed with bcrypt
- JWT tokens expire after 7 days
- Rate limiting is applied to prevent abuse
- Admin routes require admin role
- Email tracking uses unique tracking IDs

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.
