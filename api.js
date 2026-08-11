(function createCatalogApi() {
  const config = window.CATALOG_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const sessionKey = 'yamaha_catalog_admin_session_v1';
  const isConfigured = /^https:\/\/.+\.supabase\.co$/i.test(baseUrl) && publishableKey.length > 20;

  function readSession() {
    try {
      const value = JSON.parse(sessionStorage.getItem(sessionKey));
      if (!value?.access_token || !value?.expires_at) return null;
      if (Date.now() >= value.expires_at * 1000) return null;
      return value;
    } catch {
      return null;
    }
  }

  function storeSession(value) {
    const expiresAt = value.expires_at || Math.floor(Date.now() / 1000) + Number(value.expires_in || 3600);
    const session = { ...value, expires_at: expiresAt };
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(sessionKey);
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = body?.message || body?.error_description || body?.hint || body?.details || body?.error || String(body || `Erro ${response.status}`);
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async function request(path, options = {}) {
    if (!isConfigured) throw new Error('Banco online ainda não configurado.');
    const session = readSession();
    const headers = new Headers(options.headers || {});
    headers.set('apikey', publishableKey);
    if (options.auth) {
      if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    if (options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      body: options.body && !(options.body instanceof Blob) && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
    });
    if (response.status === 401 && options.auth) clearSession();
    return parseResponse(response);
  }

  async function list(table, query = '', auth = false) {
    return request(`/rest/v1/${table}?${query}`, { auth });
  }

  async function insert(table, rows, auth = true) {
    return request(`/rest/v1/${table}`, {
      method: 'POST', auth, body: rows,
      headers: { Prefer: 'return=representation' },
    });
  }

  async function update(table, id, values) {
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', auth: true, body: values,
      headers: { Prefer: 'return=representation' },
    });
  }

  async function remove(table, id) {
    return request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', auth: true,
    });
  }

  async function removeWhere(table, column, value) {
    return request(`/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
      method: 'DELETE', auth: true,
    });
  }

  async function rpc(functionName, body) {
    return request(`/rest/v1/rpc/${functionName}`, {
      method: 'POST', auth: true, body,
      headers: { Prefer: 'return=representation' },
    });
  }

  async function getCatalog(admin = false) {
    if (!isConfigured) return structuredClone(window.CATALOG_SEED || { settings: {}, categories: [], motos: [], photos: [], plans: [], leads: [] });
    const visible = admin ? '' : '&active=eq.true';
    const [settings, categories, motos, photos, plans, leads] = await Promise.all([
      list('catalog_settings', 'select=id,seller_name,whatsapp&limit=1', admin),
      list('categories', `select=*&order=sort_order.asc,name.asc${visible}`, admin),
      list('motos', `select=*&order=sort_order.asc,name.asc${visible}`, admin),
      list('moto_photos', 'select=*&order=sort_order.asc', admin),
      list('plans', `select=*&order=sort_order.asc,installments.asc${visible}`, admin),
      admin ? list('leads', 'select=*&order=created_at.desc&limit=1000', true) : Promise.resolve([]),
    ]);
    return {
      settings: settings[0] || { seller_name: 'Samuel Yamaha', whatsapp: '' },
      categories,
      motos,
      photos,
      plans,
      leads,
    };
  }

  async function login(password) {
    const result = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: config.adminEmail, password },
    });
    return storeSession(result);
  }

  async function logout() {
    const session = readSession();
    if (session) {
      try {
        await request('/auth/v1/logout', { method: 'POST', auth: true });
      } catch {
        // A sessão local precisa ser encerrada mesmo se a rede falhar.
      }
    }
    clearSession();
  }

  async function changePassword(password) {
    const result = await request('/auth/v1/user', { method: 'PUT', auth: true, body: { password } });
    return result;
  }

  async function createLead(lead) {
    if (!isConfigured) return null;
    return request('/rest/v1/leads', {
      method: 'POST', auth: false, body: lead,
      headers: { Prefer: 'return=minimal' },
    });
  }

  function safeExtension(file) {
    const byName = String(file.name || '').split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(byName)) return byName === 'jpeg' ? 'jpg' : byName;
    const byType = String(file.type || '').split('/').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(byType) ? byType.replace('jpeg', 'jpg') : 'jpg';
  }

  async function uploadImage(file, folder) {
    if (!file?.type?.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Cada foto pode ter no máximo 8 MB.');
    const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
    const session = readSession();
    if (!session) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(`${baseUrl}/storage/v1/object/${config.storageBucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'false',
      },
      body: file,
    });
    await parseResponse(response);
    return {
      path,
      url: `${baseUrl}/storage/v1/object/public/${config.storageBucket}/${path}`,
    };
  }

  async function deleteImage(path) {
    if (!path) return;
    return request(`/storage/v1/object/${config.storageBucket}/${path}`, { method: 'DELETE', auth: true });
  }

  window.CatalogApi = Object.freeze({
    isConfigured,
    config,
    getSession: readSession,
    login,
    logout,
    changePassword,
    getCatalog,
    createLead,
    insert,
    update,
    remove,
    removeWhere,
    rpc,
    uploadImage,
    deleteImage,
  });
})();
