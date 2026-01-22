"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)(
            'SELECT * FROM activities ORDER BY created_at DESC LIMIT 100'
        );
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        console.error('List activities error:', error);
        res.status(500).json({ error: 'Failed to list activities' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { lead_id, type, description } = req.body;
        const result = await (0, db_js_1.query)(
            'INSERT INTO activities (lead_id, user_id, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
            [lead_id, req.user.id, type, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

exports.default = router;
