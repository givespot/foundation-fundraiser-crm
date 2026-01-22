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

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
        }
        const existingUser = await (0, db_js_1.query)('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const result = await (0, db_js_1.query)(
            `INSERT INTO users (id, email, password, first_name, last_name, role, is_active, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'staff', true, NOW(), NOW())
             RETURNING id, email, first_name, last_name, role`,
            [email.toLowerCase(), passwordHash, first_name, last_name]
        );
        const user = result.rows[0];
        const token = (0, auth_js_1.generateToken)(user);
        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await (0, db_js_1.query)(
            `SELECT id, email, password, first_name, last_name, role, is_active,
                    notification_email, notification_follow_ups, preferred_currency
             FROM users WHERE email = $1`,
            [email.toLowerCase()]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const token = (0, auth_js_1.generateToken)(user);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get current user
router.get('/me', auth_js_1.authenticate, async (req, res) => {
    try {
        const result = await (0, db_js_1.query)(
            `SELECT id, email, first_name, last_name, role, is_active,
                    notification_email, notification_follow_ups, preferred_currency,
                    "createdAt", "updatedAt"
             FROM users WHERE id = $1`,
            [req.user.id]
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

// Update current user profile and settings
router.put('/me', auth_js_1.authenticate, async (req, res) => {
    try {
        const { first_name, last_name, email, notification_email, notification_follow_ups, preferred_currency } = req.body;
        
        // If email is being changed, check it's not already taken
        if (email && email.toLowerCase() !== req.user.email) {
            const existingUser = await (0, db_js_1.query)(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email.toLowerCase(), req.user.id]
            );
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        
        const result = await (0, db_js_1.query)(
            `UPDATE users SET
                first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                email = COALESCE($3, email),
                notification_email = COALESCE($4, notification_email),
                notification_follow_ups = COALESCE($5, notification_follow_ups),
                preferred_currency = COALESCE($6, preferred_currency),
                "updatedAt" = NOW()
             WHERE id = $7
             RETURNING id, email, first_name, last_name, role, is_active,
                       notification_email, notification_follow_ups, preferred_currency,
                       "createdAt", "updatedAt"`,
            [first_name, last_name, email ? email.toLowerCase() : null, 
             notification_email, notification_follow_ups, preferred_currency, req.user.id]
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

// Change password
router.post('/change-password', auth_js_1.authenticate, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        const result = await (0, db_js_1.query)('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const validPassword = await bcryptjs_1.default.compare(current_password, result.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const passwordHash = await bcryptjs_1.default.hash(new_password, 12);
        await (0, db_js_1.query)('UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2', [passwordHash, req.user.id]);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Change password (alternative endpoint)
router.put('/password', auth_js_1.authenticate, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        const result = await (0, db_js_1.query)('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const validPassword = await bcryptjs_1.default.compare(current_password, result.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const passwordHash = await bcryptjs_1.default.hash(new_password, 12);
        await (0, db_js_1.query)('UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2', [passwordHash, req.user.id]);
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

exports.default = router;
