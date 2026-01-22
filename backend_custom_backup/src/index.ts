import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import memberRoutes from './routes/members.js';
import activityRoutes from './routes/activities.js';
import emailSequenceRoutes from './routes/emailSequences.js';
import emailLogRoutes from './routes/emailLogs.js';
import memberEnrollmentRoutes from './routes/memberEnrollments.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import auditLogRoutes from './routes/auditLogs.js';
import aiRoutes from './routes/ai.js';
import { startSequenceProcessor } from './services/sequenceProcessor.js';
import { verifyConnection as verifyEmailConnection } from './services/emailService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500 // limit each IP to 500 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/email-sequences', emailSequenceRoutes);
app.use('/api/email-logs', emailLogRoutes);
app.use('/api/member-enrollments', memberEnrollmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Foundation Fundraiser CRM API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Verify email service connection
  await verifyEmailConnection();

  // Start sequence processor if enabled
  if (process.env.ENABLE_SEQUENCE_PROCESSOR !== 'false') {
    startSequenceProcessor();
  }
});

export default app;
