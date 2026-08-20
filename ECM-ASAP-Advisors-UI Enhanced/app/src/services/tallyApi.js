// Tally OS V3 API client — authenticates via the TallyAuth webhook,
// then executes templates via the Pucho Core API.
// For production, route through a server-side proxy (Supabase Edge Function
// or similar) to avoid exposing the webhook secret in the browser bundle.

const WEBHOOK_URL = import.meta.env.VITE_PUCHO_WEBHOOK_URL || '';
const WEBHOOK_SECRET = import.meta.env.VITE_PUCHO_WEBHOOK_SECRET || '';
const CORE_API_BASE = import.meta.env.VITE_PUCHO_CORE_API_BASE_URL || 'https://core-api.pucho.ai';

let cachedAuth = null;

// In-memory data cache — persists across client-side route changes (no page refresh).
// Keyed by templateNo.
const dataCache = {};

/** Retrieve cached template response data. */
export function getTemplateCache(templateNo) {
  return dataCache[templateNo] ?? null;
}

/** Store template response data in the cache. */
export function setTemplateCache(templateNo, data) {
  dataCache[templateNo] = data;
}

/**
 * Authenticate with the TallyAuth workflow.
 * Returns { accessToken, agentId } or throws on failure.
 * Caches the result — re-call when the token expires.
 */
export async function authenticate() {
  if (cachedAuth?.accessToken) return cachedAuth;

  if (!WEBHOOK_URL || !WEBHOOK_SECRET) {
    throw new Error('Tally webhook URL or secret not configured. Check VITE_PUCHO_WEBHOOK_URL and VITE_PUCHO_WEBHOOK_SECRET in .env.');
  }

  console.log('[TallyAuth] POST', WEBHOOK_URL, { token_key: WEBHOOK_SECRET });

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_key: WEBHOOK_SECRET }),
  });

  console.log('[TallyAuth] response status:', res.status);

  if (!res.ok) {
    throw new Error(`TallyAuth failed: HTTP ${res.status} — ${res.statusText}`);
  }

  const data = await res.json();
  console.log('[TallyAuth] response body:', data);

  const accessToken = data.accessToken || data.access_token || data.token || '';
  const agentId = data.agentId || data.agent_id || '';

  if (!accessToken || !agentId) {
    console.warn('[TallyAuth] Missing credentials in response. Raw keys:', Object.keys(data));
    throw new Error('TallyAuth returned empty credentials. Is the Tally agent running?');
  }

  cachedAuth = { accessToken, agentId };
  console.log('[TallyAuth] success — agentId:', agentId);
  return cachedAuth;
}

/**
 * Execute a Tally OS V3 template.
 * @param {number} templateNo — template question ID from the catalogue
 * @param {object} [variables={}] — key-value pairs for template placeholders
 * @returns {Promise<object>} the template's JSON response
 */
export async function executeTemplate(templateNo, variables = {}) {
  const auth = await authenticate();
  const body = { templateNo, agentId: auth.agentId, type: 'OS_RUN' };

  // Pass template placeholders in a nested variables object
  const vars = {};
  Object.entries(variables).forEach(([k, v]) => {
    if (v) vars[k] = v;
  });
  if (Object.keys(vars).length > 0) body.variables = vars;

  const url = `${CORE_API_BASE}/fapi/v1/pucho_piece/execute_tally_template_v3`;
  console.log('[Tally OS] POST', url, body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  console.log('[Tally OS] response status:', res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error('[Tally OS] error body:', text);
    throw new Error(`Template ${templateNo} failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  console.log('[Tally OS] response body:', json);
  return json;
}

/**
 * Clear the cached credentials (call when the token expires).
 */
export function clearAuth() {
  cachedAuth = null;
}