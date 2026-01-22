import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create, update, remove } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['membership_tier', 'membership_status'];
const ALLOWED_FIELDS = [
  'lead_id', 'full_name', 'email', 'phone', 'organization',
  'membership_tier', 'membership_status', 'pledge_amount',
  'pledge_currency', 'pledge_frequency', 'join_date', 'total_donated', 'notes'
];

// List members
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      filters: {
        membership_tier: req.query.membership_tier,
        membership_status: req.query.membership_status
      }
    };

    const result = await list('members', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// Get member by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const member = await getById('members', req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error: any) {
    console.error('Get member error:', error);
    res.status(500).json({ error: 'Failed to get member' });
  }
});

// Create member
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const member = await create('members', req.body, ALLOWED_FIELDS);

    // Create activity
    await query(
      `INSERT INTO activities (member_id, activity_type, description, performed_by)
       VALUES ($1, $2, $3, $4)`,
      [member.id, 'created', 'Member created', req.user!.id]
    );

    res.status(201).json(member);
  } catch (error: any) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Update member
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const member = await update('members', req.params.id, req.body, ALLOWED_FIELDS);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error: any) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Delete member
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await remove('members', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully' });
  } catch (error: any) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// Record donation
router.post('/:id/donation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency = 'GBP', notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid donation amount is required' });
    }

    const member = await getById<any>('members', req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Update total donated
    const newTotal = parseFloat(member.total_donated || 0) + parseFloat(amount);
    await update('members', req.params.id, { total_donated: newTotal }, ALLOWED_FIELDS);

    // Create activity
    await query(
      `INSERT INTO activities (member_id, activity_type, description, performed_by)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, 'donation', `Donation of ${currency} ${amount} recorded${notes ? ': ' + notes : ''}`, req.user!.id]
    );

    res.json({ message: 'Donation recorded', total_donated: newTotal });
  } catch (error: any) {
    console.error('Record donation error:', error);
    res.status(500).json({ error: 'Failed to record donation' });
  }
});

// Get member stats
router.get('/stats/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_members,
        COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
        SUM(total_donated) as total_donations,
        AVG(total_donated) as avg_donation
      FROM members
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Member stats error:', error);
    res.status(500).json({ error: 'Failed to get member stats' });
  }
});

export default router;
