import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['lead_id', 'member_id', 'activity_type', 'performed_by'];
const ALLOWED_FIELDS = ['lead_id', 'member_id', 'activity_type', 'description', 'performed_by', 'activity_date'];

// List activities
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: req.query.sort_by as string || 'activity_date',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      filters: {
        lead_id: req.query.lead_id,
        member_id: req.query.member_id,
        activity_type: req.query.activity_type,
        performed_by: req.query.performed_by
      }
    };

    const result = await list('activities', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List activities error:', error);
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

// Get activities for a lead
router.get('/lead/:leadId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name as performed_by_name
       FROM activities a
       LEFT JOIN users u ON a.performed_by = u.id
       WHERE a.lead_id = $1
       ORDER BY a.activity_date DESC
       LIMIT 100`,
      [req.params.leadId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get lead activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Get activities for a member
router.get('/member/:memberId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name as performed_by_name
       FROM activities a
       LEFT JOIN users u ON a.performed_by = u.id
       WHERE a.member_id = $1
       ORDER BY a.activity_date DESC
       LIMIT 100`,
      [req.params.memberId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get member activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Create activity
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      performed_by: req.body.performed_by || req.user!.id,
      activity_date: req.body.activity_date || new Date().toISOString()
    };

    const activity = await create('activities', data, ALLOWED_FIELDS);
    res.status(201).json(activity);
  } catch (error: any) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Add note to lead
router.post('/lead/:leadId/note', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Note description is required' });
    }

    const activity = await create('activities', {
      lead_id: req.params.leadId,
      activity_type: 'note',
      description,
      performed_by: req.user!.id
    }, ALLOWED_FIELDS);

    res.status(201).json(activity);
  } catch (error: any) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Log call for lead
router.post('/lead/:leadId/call', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { description, outcome } = req.body;

    const activity = await create('activities', {
      lead_id: req.params.leadId,
      activity_type: 'call',
      description: description || `Call logged${outcome ? ': ' + outcome : ''}`,
      performed_by: req.user!.id
    }, ALLOWED_FIELDS);

    res.status(201).json(activity);
  } catch (error: any) {
    console.error('Log call error:', error);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

// Log meeting for lead
router.post('/lead/:leadId/meeting', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { description, outcome } = req.body;

    const activity = await create('activities', {
      lead_id: req.params.leadId,
      activity_type: 'meeting',
      description: description || `Meeting logged${outcome ? ': ' + outcome : ''}`,
      performed_by: req.user!.id
    }, ALLOWED_FIELDS);

    res.status(201).json(activity);
  } catch (error: any) {
    console.error('Log meeting error:', error);
    res.status(500).json({ error: 'Failed to log meeting' });
  }
});

export default router;
