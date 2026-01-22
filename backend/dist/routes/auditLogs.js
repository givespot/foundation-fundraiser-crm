"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list audit logs' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { action, entity_type, entity_id, details } = req.body;
        const result = await (0, db_js_1.query)(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, action, entity_type, entity_id, JSON.stringify(details || {})]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create audit log' });
    }
});

exports.default = router;
