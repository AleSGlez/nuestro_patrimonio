// src/shared/lib/supabase.js

const URL  = import.meta.env.VITE_SUPABASE_URL
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  console.error(
    '%c[Supabase] Faltan variables de entorno.\n' +
    'Crea .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY',
    'color:#F43F5E;font-weight:bold'
  )
}

// ── Tokens ───────────────────────────────────────────────────
const K = { access: 'np_at', refresh: 'np_rt', user: 'np_user' }

function isJWT(t) {
  return typeof t === 'string' && t.split('.').length === 3 && t !== 'undefined'
}

export const tokens = {
  get access()  { const t = localStorage.getItem(K.access);  return isJWT(t) ? t : null },
  get refresh() { return localStorage.getItem(K.refresh) },
  get user()    { try { return JSON.parse(localStorage.getItem(K.user)) } catch { return null } },
  save(access, refresh, user) {
    if (isJWT(access)) localStorage.setItem(K.access, access)
    if (refresh)        localStorage.setItem(K.refresh, refresh)
    if (user)           localStorage.setItem(K.user, JSON.stringify(user))
  },
  clear() { Object.values(K).forEach((k) => localStorage.removeItem(k)) },
}

// ── Auth ─────────────────────────────────────────────────────
export const auth = {
  async signUp(email, password, meta = {}) {
    const r = await fetch(`${URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ email, password, data: meta }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.msg || j.error_description || 'Error al registrarse')
    if (j.access_token) tokens.save(j.access_token, j.refresh_token, j.user)
    return j
  },

  async signIn(email, password) {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ email, password }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(j.error_description || 'Credenciales incorrectas')
    tokens.save(j.access_token, j.refresh_token, j.user)
    return j
  },

  async signOut() {
    const t = tokens.access
    if (t) {
      await fetch(`${URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: `Bearer ${t}` },
      }).catch(() => {})
    }
    tokens.clear()
  },

  async refresh() {
    const rt = tokens.refresh
    if (!rt) throw new Error('Sin refresh token')
    const r = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ refresh_token: rt }),
    })
    const j = await r.json()
    if (!r.ok) { tokens.clear(); throw new Error('Sesión expirada') }
    tokens.save(j.access_token, j.refresh_token, j.user)
    return j
  },

  async resetPassword(email) {
    const r = await fetch(`${URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify({ email }),
    })
    if (!r.ok) throw new Error('Error al enviar correo')
  },
}

// ── REST fetch ────────────────────────────────────────────────
async function apiFetch(path, opts = {}, retry = true) {
  const token = tokens.access

  const res = await fetch(`${URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey:        KEY,
      Authorization: `Bearer ${token || KEY}`,
      'Content-Type': 'application/json',
      Prefer:        opts.prefer || 'return=representation',
      ...opts.headers,
    },
  })

  // Auto-refresh 401
  if (res.status === 401 && retry) {
    try {
      await auth.refresh()
      return apiFetch(path, opts, false)
    } catch {
      tokens.clear()
      window.dispatchEvent(new Event('np:logout'))
      throw new Error('Sesión expirada')
    }
  }

  if (res.status === 204) return []

  const text = await res.text()
  if (!text) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return []
  }

  let json
  try { json = JSON.parse(text) }
  catch { throw new Error(`Respuesta inválida del servidor (${res.status})`) }

  if (!res.ok) {
    const msg = json.message || json.error || json.hint || json.details || `Error ${res.status}`
    throw new Error(msg)
  }

  return json
}

// ── Query string builder ──────────────────────────────────────
// Acepta objeto { col: 'eq.val', order: 'col.desc' }
// o string raw 'or=col.eq.x,col.eq.y&limit=1'
function toQS(params) {
  if (typeof params === 'string') return params
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

// ── db API ────────────────────────────────────────────────────
export const db = {
  from: (table) => ({

    // SELECT con filtros
    // query({ pareja_id: 'eq.UUID', order: 'fecha.desc', limit: 100 })
    // query('or=col.eq.x,col.eq.y&limit=1')   ← string raw para filtros complejos
    query(params = {}) {
      const qs = toQS(params)
      return apiFetch(`/${table}${qs ? '?' + qs : ''}`)
    },

    // INSERT — objeto o array
    insert(data) {
      return apiFetch(`/${table}`, {
        method: 'POST',
        body: JSON.stringify(data),
        prefer: 'return=representation',
      })
    },

    // UPDATE — data + match { id: 'uuid' }
    update(data, match) {
      const qs = toQS(
        Object.fromEntries(Object.entries(match).map(([k, v]) => [k, `eq.${v}`]))
      )
      return apiFetch(`/${table}?${qs}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        prefer: 'return=representation',
      })
    },

    // UPSERT
    upsert(data) {
      return apiFetch(`/${table}`, {
        method: 'POST',
        body: JSON.stringify(data),
        prefer: 'return=representation,resolution=merge-duplicates',
      })
    },

    // DELETE — match { id: 'uuid' }
    delete(match) {
      const qs = toQS(
        Object.fromEntries(Object.entries(match).map(([k, v]) => [k, `eq.${v}`]))
      )
      return apiFetch(`/${table}?${qs}`, {
        method: 'DELETE',
        prefer: 'return=representation',
      })
    },
  }),

  // RPC
  rpc(fn, params = {}) {
    return apiFetch(`/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
}
