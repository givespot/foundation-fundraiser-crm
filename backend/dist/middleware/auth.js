"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = require("../utils/db.js");
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function generateToken(user) {
    return jsonwebtoken_1.default.sign({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
    }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}

async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        // Verify user still exists and is active
        const result = await (0, db_js_1.query)(
            'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1', 
            [decoded.id]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'User account is deactivated' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Authentication error' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    try {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        req.user = decoded;
    }
    catch (error) {
        // Token invalid, but that's okay for optional auth
    }
    next();
}
