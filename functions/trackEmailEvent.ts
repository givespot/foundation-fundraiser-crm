import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tracking_id, event_type } = await req.json();

    if (!tracking_id || !event_type) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Find the email log by tracking ID
    const logs = await base44.asServiceRole.entities.EmailLog.filter({ tracking_id });
    
    if (logs.length === 0) {
      return Response.json({ error: 'Email log not found' }, { status: 404 });
    }

    const log = logs[0];
    const updateData = {};

    if (event_type === 'open' && !log.opened) {
      updateData.opened = true;
      updateData.opened_date = new Date().toISOString();

      // Update sequence stats
      const sequence = await base44.asServiceRole.entities.EmailSequence.get(log.sequence_id);
      await base44.asServiceRole.entities.EmailSequence.update(log.sequence_id, {
        total_opens: (sequence.total_opens || 0) + 1
      });
    } else if (event_type === 'click' && !log.clicked) {
      updateData.clicked = true;
      updateData.clicked_date = new Date().toISOString();

      // Update sequence stats
      const sequence = await base44.asServiceRole.entities.EmailSequence.get(log.sequence_id);
      await base44.asServiceRole.entities.EmailSequence.update(log.sequence_id, {
        total_clicks: (sequence.total_clicks || 0) + 1
      });
    }

    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.EmailLog.update(log.id, updateData);
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});