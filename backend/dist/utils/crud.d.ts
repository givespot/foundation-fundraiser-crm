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
export declare function list<T extends QueryResultRow = any>(table: string, options?: FilterOptions, allowedFilters?: string[]): Promise<PaginatedResult<T>>;
export declare function getById<T extends QueryResultRow = any>(table: string, id: string): Promise<T | null>;
export declare function create<T extends QueryResultRow = any>(table: string, data: Record<string, any>, allowedFields: string[]): Promise<T>;
export declare function update<T extends QueryResultRow = any>(table: string, id: string, data: Record<string, any>, allowedFields: string[]): Promise<T | null>;
export declare function remove(table: string, id: string): Promise<boolean>;
//# sourceMappingURL=crud.d.ts.map