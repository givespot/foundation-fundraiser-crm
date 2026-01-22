"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSequences = processSequences;
exports.enrollMemberInOnboarding = enrollMemberInOnboarding;
exports.startSequenceProcessor = startSequenceProcessor;
const db_js_1 = require("../utils/db.js");
const emailService_js_1 = require("./emailService.js");
// Process active enrollments and send due emails
async function processSequences() {
    console.log('🔄 Processing email sequences...');
    try {
        // Get active enrollments that need processing
        const enrollmentsResult = await (0, db_js_1.query)(`
      SELECT
        me.id as enrollment_id,
        me.member_id,
        me.sequence_id,
        me.current_step,
        me.enrolled_date,
        m.email as member_email,
        m.full_name as member_name,
        m.organization as member_organization,
        es.name as sequence_name,
        es.steps as sequence_steps
      FROM member_enrollments me
      JOIN members m ON me.member_id = m.id
      JOIN email_sequences es ON me.sequence_id = es.id
      WHERE me.status = 'active'
        AND es.is_active = true
        AND m.email IS NOT NULL
    `);
        for (const enrollment of enrollmentsResult.rows) {
            await processEnrollment(enrollment);
        }
        console.log(`✅ Processed ${enrollmentsResult.rows.length} enrollments`);
    }
    catch (error) {
        console.error('Sequence processing error:', error);
    }
}
async function processEnrollment(enrollment) {
    const steps = enrollment.sequence_steps || [];
    const currentStep = enrollment.current_step;
    if (currentStep >= steps.length) {
        // Enrollment complete
        await (0, db_js_1.query)(`UPDATE member_enrollments
       SET status = 'completed', completed_date = CURRENT_TIMESTAMP, updated_date = CURRENT_TIMESTAMP
       WHERE id = $1`, [enrollment.enrollment_id]);
        return;
    }
    const step = steps[currentStep];
    const delayDays = step.delay_days || step.delayDays || 0;
    const enrolledDate = new Date(enrollment.enrolled_date);
    // Calculate when this step should be sent
    let sendDate;
    if (currentStep === 0) {
        sendDate = enrolledDate;
    }
    else {
        // Sum up delays from previous steps
        let totalDelay = 0;
        for (let i = 0; i <= currentStep; i++) {
            totalDelay += steps[i]?.delay_days || steps[i]?.delayDays || 0;
        }
        sendDate = new Date(enrolledDate.getTime() + totalDelay * 24 * 60 * 60 * 1000);
    }
    // Check if it's time to send
    if (sendDate > new Date()) {
        return; // Not yet time to send
    }
    // Check if email was already sent for this step
    const existingEmail = await (0, db_js_1.query)(`SELECT id FROM email_logs
     WHERE sequence_id = $1 AND member_id = $2 AND step_number = $3`, [enrollment.sequence_id, enrollment.member_id, currentStep]);
    if (existingEmail.rows.length > 0) {
        // Already sent, advance to next step
        await (0, db_js_1.query)(`UPDATE member_enrollments SET current_step = $1, updated_date = CURRENT_TIMESTAMP WHERE id = $2`, [currentStep + 1, enrollment.enrollment_id]);
        return;
    }
    // Send the email
    const result = await (0, emailService_js_1.sendSequenceEmail)(enrollment.sequence_id, enrollment.member_id, currentStep, {
        email: enrollment.member_email,
        full_name: enrollment.member_name,
        organization: enrollment.member_organization
    });
    if (result.success) {
        // Advance to next step
        const nextStep = currentStep + 1;
        if (nextStep >= steps.length) {
            await (0, db_js_1.query)(`UPDATE member_enrollments
         SET current_step = $1, status = 'completed', completed_date = CURRENT_TIMESTAMP, updated_date = CURRENT_TIMESTAMP
         WHERE id = $2`, [nextStep, enrollment.enrollment_id]);
        }
        else {
            await (0, db_js_1.query)(`UPDATE member_enrollments SET current_step = $1, updated_date = CURRENT_TIMESTAMP WHERE id = $2`, [nextStep, enrollment.enrollment_id]);
        }
        console.log(`📧 Sent step ${currentStep + 1} to ${enrollment.member_email}`);
    }
    else {
        console.error(`Failed to send email to ${enrollment.member_email}: ${result.error}`);
    }
}
// Enroll a new member in an onboarding sequence
async function enrollMemberInOnboarding(memberId) {
    try {
        // Get active onboarding sequences
        const sequencesResult = await (0, db_js_1.query)('SELECT id FROM email_sequences WHERE is_onboarding = true AND is_active = true');
        for (const sequence of sequencesResult.rows) {
            // Check if already enrolled
            const existing = await (0, db_js_1.query)(`SELECT id FROM member_enrollments
         WHERE member_id = $1 AND sequence_id = $2 AND status IN ('active', 'completed')`, [memberId, sequence.id]);
            if (existing.rows.length === 0) {
                // Enroll in sequence
                await (0, db_js_1.query)(`INSERT INTO member_enrollments (member_id, sequence_id, current_step, status)
           VALUES ($1, $2, 0, 'active')`, [memberId, sequence.id]);
                console.log(`📝 Enrolled member ${memberId} in onboarding sequence ${sequence.id}`);
            }
        }
    }
    catch (error) {
        console.error('Enroll in onboarding error:', error);
    }
}
// Start the sequence processor (run every 15 minutes)
function startSequenceProcessor() {
    // Run immediately
    processSequences();
    // Then run every 15 minutes
    setInterval(processSequences, 15 * 60 * 1000);
    console.log('📧 Sequence processor started (runs every 15 minutes)');
}
exports.default = {
    processSequences,
    enrollMemberInOnboarding,
    startSequenceProcessor
};
