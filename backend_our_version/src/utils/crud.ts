import { query } from './db.js';

export interface FilterOptions {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export async function list<T>(
  table: string,
  options: FilterOptions = {},
  allowedFilters: string[] = []
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const sortBy = options.sort_by || 'created_date';
  const sortOrder = options.sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (allowedFilters.includes(key) && value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${paramIndex})`);
          params.push(value);
        } else {
          conditions.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM ${table} ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get data
  const dataResult = await query<T>(
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

export async function getById<T>(table: string, id: string): Promise<T | null> {
  const result = await query<T>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function create<T>(
  table: string,
  data: Record<string, any>,
  allowedFields: string[]
): Promise<T> {
  const fields: string[] = [];
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(key);
      values.push(value);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }
  }

  const result = await query<T>(
    `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );

  return result.rows[0];
}

export async function update<T>(
  table: string,
  id: string,
  data: Record<string, any>,
  allowedFields: string[]
): Promise<T | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getById<T>(table, id);
  }

  // Add updated_date if table has it
  updates.push(`updated_date = CURRENT_TIMESTAMP`);

  values.push(id);
  const result = await query<T>(
    `UPDATE ${table} SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function remove(table: string, id: string): Promise<boolean> {
  const result = await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return (result.rowCount || 0) > 0;
}
