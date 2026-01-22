"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.connectDatabase = void 0;

// Load dotenv first
require('dotenv').config();

const pg_1 = require("pg");

const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fundraiser_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

exports.pool = pool;

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const connectDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

exports.connectDatabase = connectDatabase;
