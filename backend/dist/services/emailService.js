"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyConnection = verifyConnection;
exports.sendEmail = sendEmail;
exports.sendSequenceEmail = sendSequenceEmail;
exports.sendNotificationEmail = sendNotificationEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const db_js_1 = require("../utils/db.js");
const uuid_1 = require("uuid");
// Create transporter
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// Verify connection
async function verifyConnection() {
    try {
        await transporter.verify();
        console.log('📧 Email service connected');
        return true;
    }
    catch (error) {
        console.error('Email service connection failed:', error);
        return false;
    }
}
// Send email with tracking
async function sendEmail(options) {
    try {
        const trackingId = (0, uuid_1.v4)();
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
        // Add tracking pixel and wrap links for click tracking
        let emailBody = options.body;
        if (options.html !== false) {
            // Add open tracking pixel
            const trackingPixel = `<img src="${baseUrl}/api/email-logs/track/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
            // Wrap links for click tracking
            emailBody = emailBody.replace(/<a\s+href="([^"]+)"/gi, (match, url) => `<a href="${baseUrl}/api/email-logs/track/click/${trackingId}?url=${encodeURIComponent(url)}"`);
            // Add tracking pixel at the end
            emailBody += trackingPixel;
        }
        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: options.to,
            subject: options.subject,
            [options.html !== false ? 'html' : 'text']: emailBody,
        });
        // Log email
        await (0, db_js_1.query)(`INSERT INTO email_logs (sequence_id, lead_id, member_id, step_number, subject, body, tracking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            options.sequenceId || null,
            options.leadId || null,
            options.memberId || null,
            options.stepNumber || null,
            options.subject,
            options.body,
            trackingId
        ]);
        // Update sequence stats if applicable
        if (options.sequenceId) {
            await (0, db_js_1.query)('UPDATE email_sequences SET total_sent = total_sent + 1, updated_date = CURRENT_TIMESTAMP WHERE id = $1', [options.sequenceId]);
        }
        return {
            success: true,
            messageId: info.messageId,
            trackingId
        };
    }
    catch (error) {
        console.error('Send email error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
// Send sequence email with personalization
async function sendSequenceEmail(sequenceId, memberId, stepNumber, memberData) {
    try {
        // Get sequence and step
        const sequenceResult = await (0, db_js_1.query)('SELECT * FROM email_sequences WHERE id = $1', [sequenceId]);
        if (sequenceResult.rows.length === 0) {
            return { success: false, error: 'Sequence not found' };
        }
        const sequence = sequenceResult.rows[0];
        const steps = sequence.steps || [];
        if (stepNumber >= steps.length) {
            return { success: false, error: 'Step number out of range' };
        }
        const step = steps[stepNumber];
        // Personalize content
        let subject = step.subject || `Step ${stepNumber + 1} from ${sequence.name}`;
        let body = step.body || step.content || '';
        // Replace placeholders
        const replacements = {
            '{{first_name}}': memberData.full_name.split(' ')[0],
            '{{full_name}}': memberData.full_name,
            '{{organization}}': memberData.organization || '',
            '{{sequence_name}}': sequence.name,
            '{{step_number}}': String(stepNumber + 1),
        };
        for (const [placeholder, value] of Object.entries(replacements)) {
            subject = subject.replace(new RegExp(placeholder, 'g'), value);
            body = body.replace(new RegExp(placeholder, 'g'), value);
        }
        return await sendEmail({
            to: memberData.email,
            subject,
            body,
            sequenceId,
            memberId,
            stepNumber,
            html: true
        });
    }
    catch (error) {
        console.error('Send sequence email error:', error);
        return { success: false, error: error.message };
    }
}
// Send notification email
async function sendNotificationEmail(to, subject, message) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${subject}</h2>
      <div style="color: #666; line-height: 1.6;">
        ${message}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        This is an automated message from Foundation Fundraiser CRM.
      </p>
    </div>
  `;
    return await sendEmail({
        to,
        subject,
        body: html,
        html: true
    });
}
exports.default = {
    sendEmail,
    sendSequenceEmail,
    sendNotificationEmail,
    verifyConnection
};
