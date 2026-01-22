import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create, update, remove } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['trigger_type', 'is_onboarding', 'is_active'];
const ALLOWED_FIELDS = [
  'name', 'description', 'trigger_type', 'trigger_stage',
  'inactivity_days', 'is_onboarding', 'is_active', 'steps'
];

// List email sequences
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort_by: req.query.sort_by as string || 'created_date',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      filters: {
        trigger_type: req.query.trigger_type,
        is_onboarding: req.query.is_onboarding === 'true' ? true : req.query.is_onboarding === 'false' ? false : undefined,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined
      }
    };

    const result = await list('email_sequences', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List sequences error:', error);
    res.status(500).json({ error: 'Failed to list email sequences' });
  }
});

// Get onboarding sequences
router.get('/onboarding', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM email_sequences WHERE is_onboarding = true AND is_active = true ORDER BY name`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get onboarding sequences error:', error);
    res.status(500).json({ error: 'Failed to get onboarding sequences' });
  }
});

// Get sequence by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sequence = await getById('email_sequences', req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Email sequence not found' });
    }
    res.json(sequence);
  } catch (error: any) {
    console.error('Get sequence error:', error);
    res.status(500).json({ error: 'Failed to get email sequence' });
  }
});

// Create email sequence
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Ensure steps is properly formatted as JSON
    const data = {
      ...req.body,
      steps: req.body.steps ? JSON.stringify(req.body.steps) : '[]'
    };

    const sequence = await create('email_sequences', data, ALLOWED_FIELDS);
    res.status(201).json(sequence);
  } catch (error: any) {
    console.error('Create sequence error:', error);
    res.status(500).json({ error: 'Failed to create email sequence' });
  }
});

// Update email sequence
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      ...(req.body.steps && { steps: JSON.stringify(req.body.steps) })
    };

    const sequence = await update('email_sequences', req.params.id, data, ALLOWED_FIELDS);
    if (!sequence) {
      return res.status(404).json({ error: 'Email sequence not found' });
    }
    res.json(sequence);
  } catch (error: any) {
    console.error('Update sequence error:', error);
    res.status(500).json({ error: 'Failed to update email sequence' });
  }
});

// Delete email sequence
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await remove('email_sequences', req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Email sequence not found' });
    }
    res.json({ message: 'Email sequence deleted successfully' });
  } catch (error: any) {
    console.error('Delete sequence error:', error);
    res.status(500).json({ error: 'Failed to delete email sequence' });
  }
});

// Toggle sequence active status
router.post('/:id/toggle-active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sequence = await getById<any>('email_sequences', req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Email sequence not found' });
    }

    const updated = await update('email_sequences', req.params.id, { is_active: !sequence.is_active }, ALLOWED_FIELDS);
    res.json(updated);
  } catch (error: any) {
    console.error('Toggle sequence error:', error);
    res.status(500).json({ error: 'Failed to toggle sequence' });
  }
});

// Get sequence stats
router.get('/:id/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sequence = await getById<any>('email_sequences', req.params.id);
    if (!sequence) {
      return res.status(404).json({ error: 'Email sequence not found' });
    }

    const statsResult = await query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened = true THEN 1 END) as total_opens,
        COUNT(CASE WHEN clicked = true THEN 1 END) as total_clicks
      FROM email_logs
      WHERE sequence_id = $1
    `, [req.params.id]);

    res.json({
      ...sequence,
      stats: statsResult.rows[0]
    });
  } catch (error: any) {
    console.error('Get sequence stats error:', error);
    res.status(500).json({ error: 'Failed to get sequence stats' });
  }
});

export default router;
