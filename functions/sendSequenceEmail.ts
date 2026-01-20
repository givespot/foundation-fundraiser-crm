import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sequence_id, lead_id, step_number } = await req.json();

    // Get sequence and lead details
    const sequence = await base44.entities.EmailSequence.get(sequence_id);
    const lead = await base44.entities.Lead.get(lead_id);

    if (!sequence || !lead) {
      return Response.json({ error: 'Sequence or lead not found' }, { status: 404 });
    }

    const step = sequence.steps[step_number];
    if (!step) {
      return Response.json({ error: 'Step not found' }, { status: 404 });
    }

    // Generate AI-enhanced email content
    const aiPrompt = `Personalize this email for a lead named ${lead.full_name} from ${lead.organization || 'their organization'}. 
    Interest level: ${lead.interest_level}. 
    Subject: ${step.subject}
    Body: ${step.body}
    
    Make it friendly, professional, and compelling. Keep the same structure but add personal touches.`;

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

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID();

    // Send email
    await base44.integrations.Core.SendEmail({
      to: lead.email,
      subject: aiResponse.subject,
      body: `${aiResponse.body}\n\n---\nTracking ID: ${trackingId}`
    });

    // Log the email
    await base44.asServiceRole.entities.EmailLog.create({
      sequence_id,
      lead_id,
      step_number,
      subject: aiResponse.subject,
      sent_date: new Date().toISOString(),
      tracking_id: trackingId,
      opened: false,
      clicked: false
    });

    // Update sequence stats
    await base44.asServiceRole.entities.EmailSequence.update(sequence_id, {
      total_sent: (sequence.total_sent || 0) + 1
    });

    return Response.json({ success: true, tracking_id: trackingId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});