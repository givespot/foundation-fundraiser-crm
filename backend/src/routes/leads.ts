import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create, update, remove } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['status', 'stage', 'interest_level', 'source', 'assigned_to'];
const ALLOWED_FIELDS = [
  'full_name', 'email', 'phone', 'organization', 'status', 'stage',
  'interest_level', 'source', 'pledge_amount', 'pledge_currency',
  'pledge_frequency', 'next_follow_up', 'assigned_to', 'notes', 'tags'
];

// List leads
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      filters: {
        status: req.query.status,
        stage: req.query.stage,
        interest_level: req.query.interest_level,
        source: req.query.source,
        assigned_to: req.query.assigned_to
      }
    };

    const result = await list('leads', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List leads error:', error);
    res.status(500).json({ error: 'Failed to list leads' });
  }
});

// Get lead by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await getById('leads', req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error: any) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// Create lead
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await create('leads', req.body, ALLOWED_FIELDS);

    // Create activity for new lead
    await query(
      `INSERT INTO activities (lead_id, activity_type, description, performed_by)
       VALUES ($1, $2, $3, $4)`,
      [lead.id, 'created', 'Lead created', req.user!.id]
    );

    res.status(201).json(lead);
  } catch (error: any) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existingLead = await getById<any>('leads', req.params.id);
    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = await update('leads', req.params.id, req.body, ALLOWED_FIELDS);

    // Log stage change as activity
    if (req.body.stage && req.body.stage !== existingLead.stage) {
      await query(
        `INSERT INTO activities (lead_id, activity_type, description, performed_by)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, 'stage_change', `Stage changed from ${existingLead.stage} to ${req.body.stage}`, req.user!.id]
      );
    }

    res.json(lead);
  } catch (error: any) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await remove('leads', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Convert lead to member
router.post('/:id/convert', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await getById<any>('leads', req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create member from lead
    const memberResult = await query(
      `INSERT INTO members (lead_id, full_name, email, phone, organization, pledge_amount, pledge_currency, pledge_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [lead.id, lead.full_name, lead.email, lead.phone, lead.organization,
       lead.pledge_amount, lead.pledge_currency, lead.pledge_frequency]
    );

    // Update lead status
    await update('leads', req.params.id, { status: 'converted', stage: 'converted' }, ALLOWED_FIELDS);

    // Create activity
    await query(
      `INSERT INTO activities (lead_id, member_id, activity_type, description, performed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [lead.id, memberResult.rows[0].id, 'converted', 'Lead converted to member', req.user!.id]
    );

    res.status(201).json(memberResult.rows[0]);
  } catch (error: any) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Get pipeline stats
router.get('/stats/pipeline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        stage,
        COUNT(*) as count,
        SUM(pledge_amount) as total_pledge
      FROM leads
      WHERE status != 'converted'
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'prospect' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal' THEN 4
          WHEN 'negotiation' THEN 5
          ELSE 6
        END
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Pipeline stats error:', error);
    res.status(500).json({ error: 'Failed to get pipeline stats' });
  }
});

export default router;
