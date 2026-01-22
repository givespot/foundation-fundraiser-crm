import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create } from '../utils/crud.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['sequence_id', 'lead_id', 'member_id'];
const ALLOWED_FIELDS = [
  'sequence_id', 'lead_id', 'member_id', 'step_number',
  'subject', 'body', 'sent_date', 'tracking_id',
  'opened', 'opened_date', 'clicked', 'clicked_date'
];

// List email logs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: req.query.sort_by as string || 'sent_date',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      filters: {
        sequence_id: req.query.sequence_id,
        lead_id: req.query.lead_id,
        member_id: req.query.member_id
      }
    };

    const result = await list('email_logs', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List email logs error:', error);
    res.status(500).json({ error: 'Failed to list email logs' });
  }
});

// Get email log by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const log = await getById('email_logs', req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Email log not found' });
    }
    res.json(log);
  } catch (error: any) {
    console.error('Get email log error:', error);
    res.status(500).json({ error: 'Failed to get email log' });
  }
});

// Track email open (public endpoint with tracking ID)
router.get('/track/open/:trackingId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE email_logs
       SET opened = true, opened_date = CURRENT_TIMESTAMP
       WHERE tracking_id = $1 AND opened = false`,
      [req.params.trackingId]
    );

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.send(pixel);
  } catch (error: any) {
    console.error('Track open error:', error);
    // Still return pixel even on error
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

// Track email click (public endpoint with tracking ID)
router.get('/track/click/:trackingId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.query;

    await query(
      `UPDATE email_logs
       SET clicked = true, clicked_date = CURRENT_TIMESTAMP
       WHERE tracking_id = $1 AND clicked = false`,
      [req.params.trackingId]
    );

    // Redirect to the original URL
    if (url && typeof url === 'string') {
      res.redirect(url);
    } else {
      res.json({ message: 'Click tracked' });
    }
  } catch (error: any) {
    console.error('Track click error:', error);
    // Redirect anyway
    const { url } = req.query;
    if (url && typeof url === 'string') {
      res.redirect(url);
    } else {
      res.status(200).json({ message: 'Tracked' });
    }
  }
});

// Create email log (usually called by email sending service)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const log = await create('email_logs', req.body, ALLOWED_FIELDS);
    res.status(201).json(log);
  } catch (error: any) {
    console.error('Create email log error:', error);
    res.status(500).json({ error: 'Failed to create email log' });
  }
});

// Get email stats summary
router.get('/stats/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened = true THEN 1 END) as total_opens,
        COUNT(CASE WHEN clicked = true THEN 1 END) as total_clicks,
        ROUND(COUNT(CASE WHEN opened = true THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100, 2) as open_rate,
        ROUND(COUNT(CASE WHEN clicked = true THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100, 2) as click_rate
      FROM email_logs
      WHERE sent_date > NOW() - INTERVAL '30 days'
    `);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Email stats error:', error);
    res.status(500).json({ error: 'Failed to get email stats' });
  }
});

export default router;
