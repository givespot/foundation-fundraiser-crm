import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { member_id } = await req.json();

    if (!member_id) {
      return Response.json({ error: 'member_id is required' }, { status: 400 });
    }

    // Get the member
    const member = await base44.asServiceRole.entities.Member.get(member_id);
    if (!member) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find active onboarding sequences
    const sequences = await base44.asServiceRole.entities.EmailSequence.filter({
      is_onboarding: true,
      is_active: true
    });

    if (sequences.length === 0) {
      return Response.json({ message: 'No active onboarding sequences found' });
    }

    // Enroll in the first active onboarding sequence
    const sequence = sequences[0];

    // Check if already enrolled
    const existing = await base44.asServiceRole.entities.MemberEnrollment.filter({
      member_id,
      sequence_id: sequence.id,
      status: 'active'
    });

    if (existing.length > 0) {
      return Response.json({ message: 'Already enrolled in onboarding' });
    }

    // Create enrollment
    await base44.asServiceRole.entities.MemberEnrollment.create({
      member_id,
      sequence_id: sequence.id,
      current_step: 0,
      status: 'active',
      enrolled_date: new Date().toISOString()
    });

    // Send first email immediately (step 0)
    if (sequence.steps && sequence.steps.length > 0) {
      const step = sequence.steps[0];

      // Generate AI-personalized content
      const aiPrompt = `Create a warm, personalized welcome email for a new foundation member.
      Member name: ${member.full_name}
      Organization: ${member.organization || 'N/A'}
      Membership tier: ${member.membership_tier}
      
      Base subject: ${step.subject}
      Base body: ${step.body}
      
      Make it personal, welcoming, and express gratitude for their support.`;

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

      // Send welcome email
      await base44.integrations.Core.SendEmail({
        to: member.email,
        subject: aiResponse.subject,
        body: aiResponse.body
      });

      // Log the email
      const trackingId = crypto.randomUUID();
      await base44.asServiceRole.entities.EmailLog.create({
        sequence_id: sequence.id,
        lead_id: member.lead_id || member.id,
        step_number: 0,
        subject: aiResponse.subject,
        sent_date: new Date().toISOString(),
        tracking_id: trackingId,
        opened: false,
        clicked: false
      });

      // Update sequence stats
      await base44.asServiceRole.entities.EmailSequence.update(sequence.id, {
        total_sent: (sequence.total_sent || 0) + 1
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Member enrolled in onboarding sequence',
      sequence_name: sequence.name
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});