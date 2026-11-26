const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('voxsales_jwt') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('voxsales_jwt', token);
  } else {
    localStorage.removeItem('voxsales_jwt');
  }
}

export function authHeaders(extra = {}) {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  setAuthToken(data.access_token);
  return data;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  setAuthToken(data.access_token);
  return data;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) {
    setAuthToken('');
    return null;
  }
  if (!res.ok) return null;
  return res.json();
}

export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function registerCandidate(data) {
  const res = await fetch(`${API_BASE}/agent/register-candidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to register candidate');
  }
  return res.json();
}

export async function interactWithAgent(sessionId, message, mode = 'voice', language = 'en-IN', candidateData = {}) {
  const res = await fetch(`${API_BASE}/agent/interact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      mode,
      language,
      candidate_name: candidateData.name || null,
      candidate_email: candidateData.email || null,
      candidate_phone: candidateData.phone || null
    })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to interact with agent');
  }
  return res.json();
}

export async function getLeads({ search = '', category = '', course = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (course) params.append('course', course);
  const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function createLead(data) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create lead');
  return res.json();
}

export async function updateLead(id, data) {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update lead');
  return res.json();
}

export async function deleteLead(id) {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete lead');
  return res.json();
}

export async function getSlots() {
  const res = await fetch(`${API_BASE}/appointments/slots`);
  if (!res.ok) throw new Error('Failed to fetch appointment slots');
  return res.json();
}

export async function getAppointments() {
  const res = await fetch(`${API_BASE}/appointments`);
  if (!res.ok) throw new Error('Failed to fetch appointments');
  return res.json();
}

export async function bookAppointment(data) {
  const res = await fetch(`${API_BASE}/appointments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || 'Failed to book appointment');
  return json;
}

export async function getKnowledgeChunks() {
  const res = await fetch(`${API_BASE}/knowledge/chunks`);
  if (!res.ok) throw new Error('Failed to fetch knowledge base chunks');
  return res.json();
}

export async function searchKnowledge(query, top_k = 3) {
  const res = await fetch(`${API_BASE}/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k })
  });
  if (!res.ok) throw new Error('Failed to search knowledge base');
  return res.json();
}

export async function getSettingsStatus() {
  const res = await fetch(`${API_BASE}/settings/status`);
  if (!res.ok) throw new Error('Failed to fetch settings status');
  return res.json();
}

export async function saveGroqKey(key) {
  const res = await fetch(`${API_BASE}/settings/groq-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groq_api_key: key })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to save Groq API key');
  return data;
}

export async function saveGeminiKey(key) {
  const res = await fetch(`${API_BASE}/settings/gemini-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gemini_api_key: key })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to save Gemini API key');
  return data;
}

export async function getConversations(limit = 50, skip = 0) {
  const res = await fetch(`${API_BASE}/agent/conversations?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error('Failed to fetch conversation history');
  return res.json();
}

export async function getConversationDetail(sessionId) {
  const res = await fetch(`${API_BASE}/agent/conversations/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation details');
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function saveIntegrations(payload) {
  const res = await fetch(`${API_BASE}/settings/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to save integration credentials');
  return data;
}

export async function syncLeadToHubspot(leadId) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/sync-hubspot`, { method: 'POST' });
  return res.json();
}

export async function getLeadMemory(leadId) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/memory`);
  if (!res.ok) throw new Error('Failed to fetch lead memory');
  return res.json();
}

export function getAppointmentIcsUrl(appointmentId) {
  return `${API_BASE}/appointments/${appointmentId}/ics`;
}

export async function checkAppointmentConflict(slotDate, slotTime) {
  const params = new URLSearchParams({ slot_date: slotDate, slot_time: slotTime });
  const res = await fetch(`${API_BASE}/appointments/check-conflict?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to check conflict');
  return res.json();
}

export async function sendDeepgramVoiceTurn(formData) {
  const res = await fetch(`${API_BASE}/voice/turn`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Deepgram voice turn failed');
  return data;
}

export async function getLiveKitToken(roomName, identity) {
  const res = await fetch(`${API_BASE}/voice/livekit-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_name: roomName, identity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'LiveKit token request failed');
  return data;
}
