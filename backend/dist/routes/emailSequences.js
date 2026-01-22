"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        let query = 'SELECT * FROM email_sequences';
        const params = [];
        if (req.query.is_onboarding === 'true') {
            query += ' WHERE is_onboarding = true';
        }
        query += ' ORDER BY created_at DESC';
        const result = await (0, db_js_1.query)(query, params);
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        console.error('List sequences error:', error);
        res.status(500).json({ error: 'Failed to list email sequences' });
    }
});

router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM email_sequences WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get sequence' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { name, description, is_active, is_onboarding, steps } = req.body;
        const result = await (0, db_js_1.query)(
            'INSERT INTO email_sequences (name, description, is_active, is_onboarding, steps) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, is_active ?? true, is_onboarding ?? false, JSON.stringify(steps || [])]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create sequence error:', error);
        res.status(500).json({ error: 'Failed to create sequence' });
    }
});

router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { name, description, is_active, is_onboarding, steps } = req.body;
        const result = await (0, db_js_1.query)(
            `UPDATE email_sequences SET name = COALESCE($1, name), description = COALESCE($2, description), 
             is_active = COALESCE($3, is_active), is_onboarding = COALESCE($4, is_onboarding), 
             steps = COALESCE($5, steps), updated_at = NOW() WHERE id = $6 RETURNING *`,
            [name, description, is_active, is_onboarding, steps ? JSON.stringify(steps) : null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sequence' });
    }
});

exports.default = router;
