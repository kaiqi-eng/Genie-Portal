const API_BASE_URL = '';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw { response: { status: response.status, data: error } };
    }

    return { data: await response.json() };
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();

// Chat API
export const chatApi = {
  getConversations: () => api.get('/api/chat/conversations'),
  createConversation: (title) => api.post('/api/chat/conversations', { title }),
  getMessages: (conversationId) => api.get(`/api/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, message) => 
    api.post(`/api/chat/conversations/${conversationId}/messages`, { message }),
  deleteConversation: (conversationId) => api.delete(`/api/chat/conversations/${conversationId}`),
};

// Admin API
export const adminApi = {
  getUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/api/admin/users${queryString ? `?${queryString}` : ''}`);
  },
  approveUser: (userId) => api.patch(`/api/admin/users/${userId}/approve`),
  revokeUser: (userId) => api.patch(`/api/admin/users/${userId}/revoke`),
  promoteUser: (userId) => api.patch(`/api/admin/users/${userId}/promote`),
  demoteUser: (userId) => api.patch(`/api/admin/users/${userId}/demote`),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
};
