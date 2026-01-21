import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { create } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FIELDS = ['from_user_id', 'to_user_id', 'subject', 'body'];

// Get inbox (messages received by current user)
router.get('/inbox', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT m.*, u.full_name as from_user_name, u.email as from_user_email
      FROM messages m
      LEFT JOIN users u ON m.from_user_id = u.id
      WHERE m.to_user_id = $1
      ORDER BY m.created_date DESC
      LIMIT $2 OFFSET $3
    `, [req.user!.id, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM messages WHERE to_user_id = $1',
      [req.user!.id]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    });
  } catch (error: any) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
});

// Get sent messages
router.get('/sent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT m.*, u.full_name as to_user_name, u.email as to_user_email
      FROM messages m
      LEFT JOIN users u ON m.to_user_id = u.id
      WHERE m.from_user_id = $1
      ORDER BY m.created_date DESC
      LIMIT $2 OFFSET $3
    `, [req.user!.id, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM messages WHERE from_user_id = $1',
      [req.user!.id]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    });
  } catch (error: any) {
    console.error('Get sent messages error:', error);
    res.status(500).json({ error: 'Failed to get sent messages' });
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM messages WHERE to_user_id = $1 AND read = false',
      [req.user!.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get message by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT m.*,
             fu.full_name as from_user_name, fu.email as from_user_email,
             tu.full_name as to_user_name, tu.email as to_user_email
      FROM messages m
      LEFT JOIN users fu ON m.from_user_id = fu.id
      LEFT JOIN users tu ON m.to_user_id = tu.id
      WHERE m.id = $1 AND (m.from_user_id = $2 OR m.to_user_id = $2)
    `, [req.params.id, req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if recipient
    if (result.rows[0].to_user_id === req.user!.id && !result.rows[0].read) {
      await query(
        'UPDATE messages SET read = true, read_date = CURRENT_TIMESTAMP WHERE id = $1',
        [req.params.id]
      );
      result.rows[0].read = true;
      result.rows[0].read_date = new Date().toISOString();
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

// Send message
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { to_user_id, subject, body } = req.body;

    if (!to_user_id || !body) {
      return res.status(400).json({ error: 'Recipient and message body are required' });
    }

    // Verify recipient exists
    const recipientResult = await query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [to_user_id]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    const message = await create('messages', {
      from_user_id: req.user!.id,
      to_user_id,
      subject: subject || '(No subject)',
      body
    }, ALLOWED_FIELDS);

    res.status(201).json(message);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE messages SET read = true, read_date = CURRENT_TIMESTAMP
       WHERE id = $1 AND to_user_id = $2 AND read = false
       RETURNING *`,
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or already read' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE messages SET read = true, read_date = CURRENT_TIMESTAMP
       WHERE to_user_id = $1 AND read = false`,
      [req.user!.id]
    );
    res.json({ message: 'All messages marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all messages as read' });
  }
});

// Delete message
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2) RETURNING id',
      [req.params.id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
