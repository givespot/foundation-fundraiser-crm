"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)(
            'SELECT * FROM messages WHERE to_user_id = $1 OR from_user_id = $1 ORDER BY created_at DESC LIMIT 100',
            [req.user.id]
        );
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list messages' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { to_user_id, subject, body } = req.body;
        const result = await (0, db_js_1.query)(
            'INSERT INTO messages (from_user_id, to_user_id, subject, body) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, to_user_id, subject, body]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create message' });
    }
});

exports.default = router;
