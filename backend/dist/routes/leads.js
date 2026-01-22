"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

// List all leads
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const result = await (0, db_js_1.query)(
            'SELECT * FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        const countResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM leads');

        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            page, limit,
            total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        });
    } catch (error) {
        console.error('List leads error:', error);
        res.status(500).json({ error: 'Failed to list leads' });
    }
});

// Get lead statistics (MUST be before /:id route)
router.get('/stats', auth_js_1.authenticate, async (req, res) => {
    try {
        // Total leads
        const totalResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM leads');
        
        // Leads by stage
        const byStageResult = await (0, db_js_1.query)(`
            SELECT stage, COUNT(*) as count 
            FROM leads 
            GROUP BY stage 
            ORDER BY count DESC
        `);
        
        // Leads by source
        const bySourceResult = await (0, db_js_1.query)(`
            SELECT source, COUNT(*) as count 
            FROM leads 
            WHERE source IS NOT NULL 
            GROUP BY source 
            ORDER BY count DESC
        `);
        
        // Recent leads (last 7 days)
        const recentResult = await (0, db_js_1.query)(`
            SELECT COUNT(*) as count 
            FROM leads 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        
        // Leads created per day (last 30 days)
        const dailyResult = await (0, db_js_1.query)(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM leads 
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at) 
            ORDER BY date DESC
        `);

        res.json({
            total: parseInt(totalResult.rows[0].total),
            by_stage: byStageResult.rows,
            by_source: bySourceResult.rows,
            recent_7_days: parseInt(recentResult.rows[0].count),
            daily_counts: dailyResult.rows
        });
    } catch (error) {
        console.error('Get lead stats error:', error);
        res.status(500).json({ error: 'Failed to get lead statistics' });
    }
});

// Get single lead by ID
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM leads WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get lead' });
    }
});

// Create new lead
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, company, stage, source, notes } = req.body;
        const result = await (0, db_js_1.query)(
            `INSERT INTO leads (first_name, last_name, email, phone, company, stage, source, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [first_name, last_name, email, phone, company, stage || 'new', source, notes, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

// Update lead
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, company, stage, source, notes } = req.body;
        const result = await (0, db_js_1.query)(
            `UPDATE leads SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
             email = COALESCE($3, email), phone = COALESCE($4, phone), company = COALESCE($5, company),
             stage = COALESCE($6, stage), source = COALESCE($7, source), notes = COALESCE($8, notes),
             updated_at = NOW() WHERE id = $9 RETURNING *`,
            [first_name, last_name, email, phone, company, stage, source, notes, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update lead' });
    }
});

// Delete lead (admin only)
router.delete('/:id', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('DELETE FROM leads WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

exports.default = router;
