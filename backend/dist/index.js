"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./config/database");

// Import actual route files (without .routes suffix)
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const leads_1 = __importDefault(require("./routes/leads"));
const members_1 = __importDefault(require("./routes/members"));
const activities_1 = __importDefault(require("./routes/activities"));
const messages_1 = __importDefault(require("./routes/messages"));
const emailSequences_1 = __importDefault(require("./routes/emailSequences"));
const emailLogs_1 = __importDefault(require("./routes/emailLogs"));
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
const memberEnrollments_1 = __importDefault(require("./routes/memberEnrollments"));
const ai_1 = __importDefault(require("./routes/ai"));

dotenv_1.default.config();
const app = (0, express_1.default)();
app.set("trust proxy", true);

// Security middleware
app.use((0, helmet_1.default)());

// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/leads', leads_1.default);
app.use('/api/members', members_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/email-sequences', emailSequences_1.default);
app.use('/api/email-logs', emailLogs_1.default);
app.use('/api/audit-logs', auditLogs_1.default);
app.use('/api/member-enrollments', memberEnrollments_1.default);
app.use('/api/ai', ai_1.default);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 3001;

// Database connection and server start
database_1.connectDatabase()
    .then((connected) => {
        if (connected) {
            app.listen(PORT, () => {
                console.log(`🚀 Foundation Fundraiser CRM API running on port ${PORT}`);
                console.log(`📍 Environment: ${process.env.NODE_ENV}`);
            });
        } else {
            console.error('❌ Could not connect to database');
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    });

exports.default = app;
