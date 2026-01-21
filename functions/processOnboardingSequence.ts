import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active enrollments
    const enrollments = await base44.asServiceRole.entities.MemberEnrollment.filter({
      status: 'active'
    });

    let processed = 0;

    for (const enrollment of enrollments) {
      const sequence = await base44.asServiceRole.entities.EmailSequence.get(enrollment.sequence_id);
      const member = await base44.asServiceRole.entities.Member.get(enrollment.member_id);

      if (!sequence || !member || !sequence.steps) continue;

      const nextStep = enrollment.current_step + 1;

      if (nextStep >= sequence.steps.length) {
        // Sequence completed
        await base44.asServiceRole.entities.MemberEnrollment.update(enrollment.id, {
          status: 'completed',
          completed_date: new Date().toISOString()
        });
        continue;
      }

      const step = sequence.steps[nextStep];
      const enrolledDate = new Date(enrollment.enrolled_date);
      const daysSinceEnrolled = Math.floor((Date.now() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate when this step should be sent
      let totalDelayDays = 0;
      for (let i = 0; i <= nextStep; i++) {
        totalDelayDays += sequence.steps[i].delay_days || 0;
      }

      if (daysSinceEnrolled >= totalDelayDays) {
        // Time to send this step
        const aiPrompt = `Create a personalized follow-up email for member ${member.full_name}.
        This is step ${nextStep + 1} of their onboarding sequence.
        Membership tier: ${member.membership_tier}
        
        Base subject: ${step.subject}
        Base body: ${step.body}
        
        Keep the tone warm and engaging.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: aiPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" }
            }
          }
        });

        await base44.integrations.Core.SendEmail({
          to: member.email,
          subject: aiResponse.subject,
          body: aiResponse.body
        });

        const trackingId = crypto.randomUUID();
        await base44.asServiceRole.entities.EmailLog.create({
          sequence_id: sequence.id,
          lead_id: member.lead_id || member.id,
          step_number: nextStep,
          subject: aiResponse.subject,
          sent_date: new Date().toISOString(),
          tracking_id: trackingId,
          opened: false,
          clicked: false
        });

        await base44.asServiceRole.entities.MemberEnrollment.update(enrollment.id, {
          current_step: nextStep
        });

        await base44.asServiceRole.entities.EmailSequence.update(sequence.id, {
          total_sent: (sequence.total_sent || 0) + 1
        });

        processed++;
      }
    }

    return Response.json({ 
      success: true, 
      processed,
      message: `Processed ${processed} onboarding emails`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});