"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("./db.js");
const migrations = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    notification_email BOOLEAN DEFAULT true,
    notification_follow_ups BOOLEAN DEFAULT true,
    preferred_currency VARCHAR(10) DEFAULT 'GBP',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Leads table
    `CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    organization VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    stage VARCHAR(50) DEFAULT 'prospect',
    interest_level VARCHAR(50) DEFAULT 'medium',
    source VARCHAR(100),
    pledge_amount DECIMAL(12, 2),
    pledge_currency VARCHAR(10) DEFAULT 'GBP',
    pledge_frequency VARCHAR(50),
    next_follow_up TIMESTAMP,
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    tags TEXT[],
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Members table
    `CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    organization VARCHAR(255),
    membership_tier VARCHAR(50) DEFAULT 'standard',
    membership_status VARCHAR(50) DEFAULT 'active',
    pledge_amount DECIMAL(12, 2),
    pledge_currency VARCHAR(10) DEFAULT 'GBP',
    pledge_frequency VARCHAR(50),
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_donated DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Activities table
    `CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    performed_by UUID REFERENCES users(id),
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Email Sequences table
    `CREATE TABLE IF NOT EXISTS email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50),
    trigger_stage VARCHAR(50),
    inactivity_days INTEGER,
    is_onboarding BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    steps JSONB DEFAULT '[]',
    total_sent INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Email Logs table
    `CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES email_sequences(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    step_number INTEGER,
    subject VARCHAR(500),
    body TEXT,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tracking_id UUID DEFAULT gen_random_uuid(),
    opened BOOLEAN DEFAULT false,
    opened_date TIMESTAMP,
    clicked BOOLEAN DEFAULT false,
    clicked_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Member Enrollments table
    `CREATE TABLE IF NOT EXISTS member_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(500),
    body TEXT,
    read BOOLEAN DEFAULT false,
    read_date TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Audit Logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    changes JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    // Create indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_created_date ON leads(created_date)`,
    `CREATE INDEX IF NOT EXISTS idx_members_membership_status ON members(membership_status)`,
    `CREATE INDEX IF NOT EXISTS idx_members_lead_id ON members(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_member_id ON activities(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_email_logs_sequence_id ON email_logs(sequence_id)`,
    `CREATE INDEX IF NOT EXISTS idx_email_logs_tracking_id ON email_logs(tracking_id)`,
    `CREATE INDEX IF NOT EXISTS idx_member_enrollments_member_id ON member_enrollments(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
];
async function runMigrations() {
    console.log('🔄 Running database migrations...');
    for (const migration of migrations) {
        try {
            await (0, db_js_1.query)(migration);
            console.log('✅ Migration executed successfully');
        }
        catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    }
    console.log('✅ All migrations completed successfully');
    process.exit(0);
}
runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
