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
            'SELECT * FROM members ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        const countResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM members');
        
        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            page, limit,
            total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        });
    } catch (error) {
        console.error('List members error:', error);
        res.status(500).json({ error: 'Failed to list members' });
    }
});

router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM members WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get member' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, total_donated } = req.body;
        const result = await (0, db_js_1.query)(
            `INSERT INTO members (first_name, last_name, email, phone, total_donated)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [first_name, last_name, email, phone, total_donated || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, total_donated } = req.body;
        const result = await (0, db_js_1.query)(
            `UPDATE members SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
             email = COALESCE($3, email), phone = COALESCE($4, phone), total_donated = COALESCE($5, total_donated),
             updated_at = NOW() WHERE id = $6 RETURNING *`,
            [first_name, last_name, email, phone, total_donated, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

exports.default = router;
