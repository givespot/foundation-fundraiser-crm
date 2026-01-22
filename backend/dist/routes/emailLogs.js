"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        let query = 'SELECT * FROM email_logs';
        const params = [];
        if (req.query.sequence_id) {
            query += ' WHERE sequence_id = $1';
            params.push(req.query.sequence_id);
        }
        query += ' ORDER BY created_at DESC LIMIT 100';
        const result = await (0, db_js_1.query)(query, params);
        res.json({ data: result.rows, total: result.rows.length, page: 1, limit: 100, total_pages: 1 });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list email logs' });
    }
});

exports.default = router;
