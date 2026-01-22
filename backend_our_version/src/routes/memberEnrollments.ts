import { Router, Response } from 'express';
import { query } from '../utils/db.js';
import { list, getById, create, update } from '../utils/crud.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const ALLOWED_FILTERS = ['member_id', 'sequence_id', 'status'];
const ALLOWED_FIELDS = ['member_id', 'sequence_id', 'current_step', 'status', 'enrolled_date', 'completed_date'];

// List enrollments
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sort_by: req.query.sort_by as string || 'enrolled_date',
      sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc',
      filters: {
        member_id: req.query.member_id,
        sequence_id: req.query.sequence_id,
        status: req.query.status
      }
    };

    const result = await list('member_enrollments', options, ALLOWED_FILTERS);
    res.json(result);
  } catch (error: any) {
    console.error('List enrollments error:', error);
    res.status(500).json({ error: 'Failed to list enrollments' });
  }
});

// Get enrollments with member and sequence details
router.get('/detailed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        me.*,
        m.full_name as member_name,
        m.email as member_email,
        es.name as sequence_name,
        es.steps as sequence_steps
      FROM member_enrollments me
      JOIN members m ON me.member_id = m.id
      JOIN email_sequences es ON me.sequence_id = es.id
      WHERE me.status = 'active'
      ORDER BY me.enrolled_date DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get detailed enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Get enrollment by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await getById('member_enrollments', req.params.id);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(enrollment);
  } catch (error: any) {
    console.error('Get enrollment error:', error);
    res.status(500).json({ error: 'Failed to get enrollment' });
  }
});

// Enroll member in sequence
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { member_id, sequence_id } = req.body;

    if (!member_id || !sequence_id) {
      return res.status(400).json({ error: 'Member ID and sequence ID are required' });
    }

    // Check if already enrolled
    const existing = await query(
      `SELECT id FROM member_enrollments
       WHERE member_id = $1 AND sequence_id = $2 AND status = 'active'`,
      [member_id, sequence_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Member already enrolled in this sequence' });
    }

    const enrollment = await create('member_enrollments', {
      member_id,
      sequence_id,
      current_step: 0,
      status: 'active'
    }, ALLOWED_FIELDS);

    res.status(201).json(enrollment);
  } catch (error: any) {
    console.error('Enroll member error:', error);
    res.status(500).json({ error: 'Failed to enroll member' });
  }
});

// Update enrollment (advance step, change status)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await update('member_enrollments', req.params.id, req.body, ALLOWED_FIELDS);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json(enrollment);
  } catch (error: any) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

// Advance to next step
router.post('/:id/advance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await getById<any>('member_enrollments', req.params.id);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Get sequence to check total steps
    const sequenceResult = await query(
      'SELECT steps FROM email_sequences WHERE id = $1',
      [enrollment.sequence_id]
    );

    const steps = sequenceResult.rows[0]?.steps || [];
    const nextStep = enrollment.current_step + 1;

    if (nextStep >= steps.length) {
      // Complete the enrollment
      const completed = await update('member_enrollments', req.params.id, {
        status: 'completed',
        completed_date: new Date().toISOString()
      }, ALLOWED_FIELDS);
      res.json(completed);
    } else {
      // Advance to next step
      const updated = await update('member_enrollments', req.params.id, {
        current_step: nextStep
      }, ALLOWED_FIELDS);
      res.json(updated);
    }
  } catch (error: any) {
    console.error('Advance enrollment error:', error);
    res.status(500).json({ error: 'Failed to advance enrollment' });
  }
});

// Pause enrollment
router.post('/:id/pause', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await update('member_enrollments', req.params.id, {
      status: 'paused'
    }, ALLOWED_FIELDS);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error: any) {
    console.error('Pause enrollment error:', error);
    res.status(500).json({ error: 'Failed to pause enrollment' });
  }
});

// Resume enrollment
router.post('/:id/resume', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment = await update('member_enrollments', req.params.id, {
      status: 'active'
    }, ALLOWED_FIELDS);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error: any) {
    console.error('Resume enrollment error:', error);
    res.status(500).json({ error: 'Failed to resume enrollment' });
  }
});

export default router;
