import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { create } from '../utils/crud.js';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FIELDS = ['action', 'entity_type', 'entity_id', 'user_id', 'changes', 'ip_address', 'user_agent'];

// List audit logs (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.query.action) {
      conditions.push(`al.action = $${paramIndex}`);
      params.push(req.query.action);
      paramIndex++;
    }

    if (req.query.entity_type) {
      conditions.push(`al.entity_type = $${paramIndex}`);
      params.push(req.query.entity_type);
      paramIndex++;
    }

    if (req.query.user_id) {
      conditions.push(`al.user_id = $${paramIndex}`);
      params.push(req.query.user_id);
      paramIndex++;
    }

    if (req.query.from_date) {
      conditions.push(`al.timestamp >= $${paramIndex}`);
      params.push(req.query.from_date);
      paramIndex++;
    }

    if (req.query.to_date) {
      conditions.push(`al.timestamp <= $${paramIndex}`);
      params.push(req.query.to_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(`
      SELECT al.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
      params
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    });
  } catch (error: any) {
    console.error('List audit logs error:', error);
    res.status(500).json({ error: 'Failed to list audit logs' });
  }
});

// Get audit logs for specific entity
router.get('/entity/:entityType/:entityId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT al.*, u.full_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = $1 AND al.entity_id = $2
      ORDER BY al.timestamp DESC
      LIMIT 100
    `, [req.params.entityType, req.params.entityId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Get audit logs for specific user
router.get('/user/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT al.*, u.full_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.timestamp DESC
      LIMIT $2 OFFSET $3
    `, [req.params.userId, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = $1',
      [req.params.userId]
    );

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    });
  } catch (error: any) {
    console.error('Get user audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// Get recent activity summary
router.get('/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        action,
        entity_type,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY action, entity_type
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get audit summary error:', error);
    res.status(500).json({ error: 'Failed to get audit summary' });
  }
});

// Create audit log entry (internal use, but exposed for flexibility)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const log = await create('audit_logs', {
      ...req.body,
      user_id: req.user!.id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }, ALLOWED_FIELDS);

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Export audit logs to CSV
router.get('/export', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const fromDate = req.query.from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = req.query.to_date || new Date().toISOString();

    const result = await query(`
      SELECT
        al.timestamp,
        al.action,
        al.entity_type,
        al.entity_id,
        u.full_name as user_name,
        u.email as user_email,
        al.ip_address,
        al.changes
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.timestamp BETWEEN $1 AND $2
      ORDER BY al.timestamp DESC
    `, [fromDate, toDate]);

    // Convert to CSV
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User Name', 'User Email', 'IP Address', 'Changes'];
    const rows = result.rows.map(row => [
      row.timestamp,
      row.action,
      row.entity_type,
      row.entity_id,
      row.user_name || '',
      row.user_email || '',
      row.ip_address || '',
      JSON.stringify(row.changes || {})
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

export default router;
