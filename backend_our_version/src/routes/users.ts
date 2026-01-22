import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../utils/db.js';
import { list, getById, update } from '../utils/crud.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['role', 'is_active'];
const ALLOWED_FIELDS = ['full_name', 'role', 'is_active', 'notification_email', 'notification_follow_ups', 'preferred_currency'];

// List users
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: req.query.sort_by as string || 'full_name',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'asc',
      filters: {
        role: req.query.role,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined
      }
    };

    // Only return non-sensitive fields
    const result = await query(`
      SELECT id, email, full_name, role, is_active, created_date
      FROM users
      WHERE ($1::text IS NULL OR role = $1)
        AND ($2::boolean IS NULL OR is_active = $2)
      ORDER BY ${options.sort_by} ${options.sort_order === 'asc' ? 'ASC' : 'DESC'}
      LIMIT $3 OFFSET $4
    `, [
      options.filters.role || null,
      options.filters.is_active ?? null,
      options.limit,
      (options.page - 1) * options.limit
    ]);

    const countResult = await query('SELECT COUNT(*) as total FROM users');

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: options.page,
      limit: options.limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / options.limit)
    });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Get active users for assignment
router.get('/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, full_name, email FROM users WHERE is_active = true ORDER BY full_name`
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get active users error:', error);
    res.status(500).json({ error: 'Failed to get active users' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, notification_email,
              notification_follow_ups, preferred_currency, created_date, updated_date
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user (admin only for role changes)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only admin can change roles or deactivate users
    if ((req.body.role || req.body.is_active !== undefined) && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to change roles' });
    }

    // Users can only update themselves unless admin
    if (req.params.id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot update other users' });
    }

    const user = await update('users', req.params.id, req.body, ALLOWED_FIELDS);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Invite user (admin only)
router.post('/invite', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { email, full_name, role = 'user' } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and full name are required' });
    }

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_date`,
      [email.toLowerCase(), password_hash, full_name, role]
    );

    // In production, send invitation email with temp password or reset link
    res.status(201).json({
      user: result.rows[0],
      temporary_password: tempPassword, // Remove in production - send via email
      message: 'User invited successfully. They should change their password on first login.'
    });
  } catch (error: any) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Deactivate user (admin only)
router.post('/:id/deactivate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Cannot deactivate yourself
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = await update('users', req.params.id, { is_active: false }, ALLOWED_FIELDS);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error: any) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate user (admin only)
router.post('/:id/reactivate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await update('users', req.params.id, { is_active: true }, ALLOWED_FIELDS);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User reactivated successfully' });
  } catch (error: any) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

export default router;
