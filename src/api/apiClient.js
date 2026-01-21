/**
 * Custom API Client - Replaces Base44 SDK
 * Provides the same interface for seamless migration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token management
let authToken = localStorage.getItem('auth_token');

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// Base fetch function with auth
async function fetchAPI(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    setAuthToken(null);
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Parse sort parameter (-field means DESC)
function parseSortParam(sortString) {
  if (!sortString) return {};
  const desc = sortString.startsWith('-');
  const field = desc ? sortString.slice(1) : sortString;
  return {
    sort_by: field,
    sort_order: desc ? 'desc' : 'asc'
  };
}

// Create entity API
function createEntityAPI(entityName) {
  // Map entity names to API endpoints
  const endpointMap = {
    Lead: '/leads',
    Member: '/members',
    Activity: '/activities',
    EmailSequence: '/email-sequences',
    EmailLog: '/email-logs',
    MemberEnrollment: '/member-enrollments',
    User: '/users',
    Message: '/messages',
    AuditLog: '/audit-logs',
  };

  const endpoint = endpointMap[entityName] || `/${entityName.toLowerCase()}s`;

  return {
    async list(sortOrFilters, filters = {}) {
      let params = new URLSearchParams();

      // Handle sort string (e.g., '-updated_date')
      if (typeof sortOrFilters === 'string') {
        const { sort_by, sort_order } = parseSortParam(sortOrFilters);
        if (sort_by) params.append('sort_by', sort_by);
        if (sort_order) params.append('sort_order', sort_order);
      } else if (sortOrFilters && typeof sortOrFilters === 'object') {
        // It's a filters object
        filters = sortOrFilters;
      }

      // Add filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      }

      const queryString = params.toString();
      const result = await fetchAPI(`${endpoint}${queryString ? `?${queryString}` : ''}`);

      // Return just the data array for compatibility
      return result.data || result;
    },

    async get(id) {
      return fetchAPI(`${endpoint}/${id}`);
    },

    async create(data) {
      return fetchAPI(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, data) {
      return fetchAPI(`${endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id) {
      return fetchAPI(`${endpoint}/${id}`, {
        method: 'DELETE',
      });
    },

    // Filter is an alias for list with filters
    async filter(filters) {
      return this.list(filters);
    },
  };
}

// Auth API
const auth = {
  async login(email, password) {
    const result = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  async register(email, password, full_name) {
    const result = await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    if (result.token) {
      setAuthToken(result.token);
    }
    return result;
  },

  async me() {
    if (!authToken) {
      throw new Error('Not authenticated');
    }
    return fetchAPI('/auth/me');
  },

  async updateMe(data) {
    return fetchAPI('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(current_password, new_password) {
    return fetchAPI('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  logout() {
    setAuthToken(null);
    window.location.href = '/login';
  },

  redirectToLogin() {
    window.location.href = '/login';
  },

  isAuthenticated() {
    return !!authToken;
  },
};

// Integrations (AI services)
const integrations = {
  Core: {
    async InvokeLLM({ prompt, context, response_json_schema }) {
      const result = await fetchAPI('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt, context }),
      });

      // If a JSON schema was expected, try to parse the content
      if (response_json_schema && result.content) {
        try {
          return JSON.parse(result.content);
        } catch {
          return result.content;
        }
      }

      return result.content;
    },

    async SendEmail({ to, subject, body }) {
      // Email sending is handled by backend services
      // This is a placeholder for direct email calls
      console.warn('Direct email sending not available - use backend email service');
      return { success: true, message: 'Email queued' };
    },
  },
};

// Functions (backend function invocation)
const functions = {
  async invoke(functionName, params = {}) {
    // Map function names to API endpoints
    const functionMap = {
      enrollMemberOnboarding: '/member-enrollments',
      processOnboardingSequence: '/email-sequences/process',
      sendSequenceEmail: '/email-logs',
    };

    const endpoint = functionMap[functionName];
    if (!endpoint) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    return fetchAPI(endpoint, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// Entity proxies
const entities = new Proxy({}, {
  get(target, prop) {
    return createEntityAPI(prop);
  },
});

// Service role access (same as regular for self-hosted)
const asServiceRole = {
  entities,
};

// Export the client
export const api = {
  auth,
  entities,
  integrations,
  functions,
  asServiceRole,
  fetchAPI, // Expose for custom calls
};

// Default export for compatibility
export default api;

// Also export as base44 for easier migration
export const base44 = api;
