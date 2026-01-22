"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
const db_js_1 = require("./db.js");

async function list(table, options = {}, allowedFilters = []) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order === 'asc' ? 'ASC' : 'DESC';
    
    // Build WHERE clause
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
            if (allowedFilters.includes(key) && value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    conditions.push(`${key} = ANY($${paramIndex})`);
                    params.push(value);
                }
                else {
                    conditions.push(`${key} = $${paramIndex}`);
                    params.push(value);
                }
                paramIndex++;
            }
        }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await (0, db_js_1.query)(`SELECT COUNT(*) as total FROM ${table} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get data
    const dataResult = await (0, db_js_1.query)(
        `SELECT * FROM ${table} ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, 
        [...params, limit, offset]
    );
    
    return {
        data: dataResult.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
    };
}

async function getById(table, id) {
    const result = await (0, db_js_1.query)(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

async function create(table, data, allowedFields) {
    const fields = [];
    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key) && value !== undefined) {
            fields.push(key);
            values.push(value);
            placeholders.push(`$${paramIndex}`);
            paramIndex++;
        }
    }
    
    const result = await (0, db_js_1.query)(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, 
        values
    );
    return result.rows[0];
}

async function update(table, id, data, allowedFields) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
        if (allowedFields.includes(key) && value !== undefined) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }
    
    if (updates.length === 0) {
        return getById(table, id);
    }
    
    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const result = await (0, db_js_1.query)(
        `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, 
        values
    );
    return result.rows[0] || null;
}

async function remove(table, id) {
    const result = await (0, db_js_1.query)(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
}
