"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)('SELECT * FROM member_enrollments ORDER BY created_at DESC LIMIT 100');
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list enrollments' });
    }
});

router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { member_id, sequence_id } = req.body;
        const result = await (0, db_js_1.query)(
            'INSERT INTO member_enrollments (member_id, sequence_id) VALUES ($1, $2) RETURNING *',
            [member_id, sequence_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create enrollment' });
    }
});

exports.default = router;
