/**
 * Base44 Client Compatibility Layer
 * Re-exports the custom API client with the same interface as Base44 SDK
 * This allows existing code to work without changes
 */

export { api as base44, api as default } from './apiClient';
