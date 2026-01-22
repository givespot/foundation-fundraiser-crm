"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("../utils/db.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();

// List users
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const result = await (0, db_js_1.query)(
            `SELECT id, email, first_name, last_name, role, is_active, "createdAt", "updatedAt"
             FROM users
             ORDER BY "createdAt" DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await (0, db_js_1.query)('SELECT COUNT(*) as total FROM users');

        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: page,
            limit: limit,
            total_pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

// Get user by ID
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)(
            `SELECT id, email, first_name, last_name, role, is_active, "createdAt", "updatedAt"
             FROM users WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Update user (admin only) - NOW INCLUDES EMAIL
router.put('/:id', auth_js_1.authenticate, auth_js_1.requireAdmin, async (req, res) => {
    try {
        const { email, first_name, last_name, role, is_active } = req.body;
        
        // If email is being changed, check it's not already taken
        if (email) {
            const existingUser = await (0, db_js_1.query)(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email.toLowerCase(), req.params.id]
            );
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use by another user' });
            }
        }
        
        const result = await (0, db_js_1.query)(
            `UPDATE users SET
                email = COALESCE($1, email),
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                role = COALESCE($4, role),
                is_active = COALESCE($5, is_active),
                "updatedAt" = NOW()
             WHERE id = $6
             RETURNING id, email, first_name, last_name, role, is_active`,
            [email ? email.toLowerCase() : null, first_name, last_name, role, is_active, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

exports.default = router;
