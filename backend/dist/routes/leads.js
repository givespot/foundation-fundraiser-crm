"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

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

router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM leads WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get lead' });
    }
});

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

router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('DELETE FROM leads WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

exports.default = router;
