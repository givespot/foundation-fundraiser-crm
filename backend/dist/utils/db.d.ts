import { Pool, QueryResult, QueryResultRow } from 'pg';
declare const pool: Pool;
export declare function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
export default pool;
//# sourceMappingURL=db.d.ts.map