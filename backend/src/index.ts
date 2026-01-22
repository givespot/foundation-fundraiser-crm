import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { sequelize } from './config/database';
import authRoutes from './routes/auth.routes';
import donorRoutes from './routes/donor.routes';
import donationRoutes from './routes/donation.routes';
import memberRoutes from './routes/member.routes';
import leadRoutes from './routes/lead.routes';
import sequenceRoutes from './routes/sequence.routes';
import { errorHandler } from './middleware/errorHandler';
import { startSequenceProcessor } from './services/sequenceProcessor';

dotenv.config();

const app = express();

// CRITICAL: Trust proxy for rate limiting behind nginx
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/sequences', sequenceRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Database connection and server start
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected');
    
    // Start sequence processor if enabled
    if (process.env.ENABLE_SEQUENCE_PROCESSOR === 'true') {
      startSequenceProcessor();
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Foundation Fundraiser CRM API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

export default app;
