// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: wallet;

// ════════════════════════════════════════════════════════════════
//  Nuestro Patrimonio — Widgets para iPhone (Scriptable)
// ────────────────────────────────────────────────────────────────
//  Un solo script, 7 widgets. Elige cuál mostrar escribiendo en
//  "Parameter" al configurar el widget:
//
//    patrimonio    → patrimonio pareja / tuyo / suyo, flujo del mes
//    tarjetas      → cuánto pagar, antes de cuándo, % de uso
//    agenda        → próximos 14 días: quincenas, pagos, cortes,
//                    suscripciones, recurrentes y MSI
//    presupuestos  → cuánto te queda en cada presupuesto
//    negocio       → ventas y ganancia del mes, capital, stock,
//                    clientes por cobrar, lotes en camino
//    metas         → avance de metas de ahorro
//    personas      → quién te debe y a quién le debes
//
//  Funciona en Inicio (chico / mediano / grande) y en la pantalla
//  de bloqueo (rectangular / en línea / circular).
//
//  Primera vez: abre el script DENTRO de Scriptable (botón ▶︎) para
//  iniciar sesión. Se guarda en el Llavero del iPhone, no en el código.
// ════════════════════════════════════════════════════════════════

// ── Configuración ───────────────────────────────────────────────
const SUPABASE_URL = 'https://kdznaswrbchosmbttskw.supabase.co'
// Pega aquí VITE_SUPABASE_ANON_KEY (Vercel → Settings → Environment
// Variables). Si lo dejas vacío, el script te la pide al iniciar sesión.
const ANON_KEY = ''
// URL de la app en Vercel: al tocar el widget se abre la app.
const APP_URL = ''
const REFRESH_MIN = 30      // cada cuánto pedir actualizar (iOS decide al final)
const DIAS_AGENDA = 14

// ── Llavero ─────────────────────────────────────────────────────
const KC = {
  anon: 'np_w_anon', rt: 'np_w_rt', at: 'np_w_at', exp: 'np_w_exp', uid: 'np_w_uid',
}
const kget = (k) => (Keychain.contains(k) ? Keychain.get(k) : null)
const kset = (k, v) => Keychain.set(k, String(v))
const kdel = (k) => { if (Keychain.contains(k)) Keychain.remove(k) }
const anonKey = () => ANON_KEY || kget(KC.anon)

// ── Colores (mismos tokens que la app) ──────────────────────────
const TEMAS = { violet: '#7C6EFA', emerald: '#10B981', rose: '#F43F5E', amber: '#F59E0B' }
const C = {
  bg: new Color('#0F0F14'),
  card: new Color('#1C1C26'),
  white: new Color('#FFFFFF'),
  text: new Color('#E5E7EB'),
  muted: new Color('#9CA3AF'),
  dim: new Color('#6B7280'),
  ok: new Color('#22C55E'),
  warn: new Color('#F59E0B'),
  bad: new Color('#EF4444'),
  info: new Color('#3B82F6'),
  accent: new Color(TEMAS.violet),
}

// ── Formato ─────────────────────────────────────────────────────
function miles(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
function fmt(amount, dec = 2) {
  const n = Number(amount) || 0
  const [ent, frac] = Math.abs(n).toFixed(dec).split('.')
  return `${n < 0 ? '-' : ''}$${miles(ent)}${frac ? '.' + frac : ''}`
}
function fmtK(amount) {
  const n = Number(amount) || 0
  const a = Math.abs(n), s = n < 0 ? '-' : ''
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`
  if (a >= 1e4) return `${s}$${(a / 1e3).toFixed(1)}K`
  return fmt(n, 0)
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

// Fechas LOCALES (igual que today() en utils.js — no usar toISOString)
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parse(s) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
function hoy0() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function addDias(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function diasHasta(s) { return Math.round((parse(s) - hoy0()) / 86400000) }
function fechaCorta(s) { const d = parse(s); return `${d.getDate()} ${MESES[d.getMonth()]}` }
function cuando(s) {
  const n = diasHasta(s)
  if (n < 0) return `hace ${-n}d`
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  if (n < 7) return DIAS[parse(s).getDay()]
  return fechaCorta(s)
}

// ── Reglas de negocio (portadas de src/shared/lib/utils.js) ─────
const FESTIVOS_MX = ['01-01', '02-05', '03-21', '05-01', '09-16', '11-20', '12-25']
function quincenasDelMes(año, mes) {
  const ultimo = new Date(año, mes + 1, 0).getDate()
  return [15, 30].map((dia) => {
    const d = new Date(año, mes, Math.min(dia, ultimo))
    while (d.getDay() === 0 || d.getDay() === 6 || FESTIVOS_MX.includes(iso(d).slice(5))) {
      d.setDate(d.getDate() - 1)
    }
    return iso(d)
  })
}

function montoParaPersona(tx, persona) {
  if (!persona || persona === 'ambos') return Number(tx.monto)
  if (tx.persona === 'ambos') return Number(tx.monto) * 0.5
  return Number(tx.monto)
}

// cards/hooks/useTarjetas.js → calcularFechasCorte
function fechasCorte(diaCorte, diaLimite) {
  if (!diaCorte) return { corte: null, limite: null }
  const hoy = hoy0(), a = hoy.getFullYear(), m = hoy.getMonth()
  let corte = new Date(a, m, diaCorte)
  if (corte < hoy) corte = new Date(a, m + 1, diaCorte)
  let limite = null
  if (diaLimite) {
    let ultimo = new Date(a, m, diaCorte)
    if (ultimo > hoy) ultimo = new Date(a, m - 1, diaCorte)
    const sig = diaLimite <= diaCorte ? 1 : 0
    limite = new Date(ultimo.getFullYear(), ultimo.getMonth() + sig, diaLimite)
    if (limite < hoy) limite = new Date(corte.getFullYear(), corte.getMonth() + sig, diaLimite)
  }
  return { corte: iso(corte), limite: limite ? iso(limite) : null }
}

// presupuestos/hooks/usePresupuestos.js → calcularDisponible (personales)
function cubreEtiqueta(p, t) {
  if (!Array.isArray(p.categorias) || p.categorias.length === 0) return true
  return p.categorias.includes(t.categoria) ||
    (!!t.subcategoria && p.categorias.includes(`${t.categoria}:${t.subcategoria}`))
}
function calcularPresupuesto(p, txs) {
  const inicio = parse(p.fecha_inicio), hoy = hoy0()
  const dias = Math.floor((hoy - inicio) / 86400000)
  let periodos = 1
  if (p.tipo === 'diario') periodos = dias + 1
  if (p.tipo === 'semanal') periodos = Math.floor(dias / 7) + 1
  if (p.tipo === 'mensual') {
    periodos = (hoy.getFullYear() - inicio.getFullYear()) * 12 + hoy.getMonth() - inicio.getMonth() + 1
  }
  const acumulado = Number(p.monto_base) * Math.max(1, periodos)
  const gastado = txs
    .filter((t) => t.tipo === 'gasto' && t.contexto !== 'negocio' && t.fecha >= p.fecha_inicio)
    .filter((t) => p.persona === 'ambos' || t.persona === p.persona || t.persona === 'ambos')
    .filter((t) => cubreEtiqueta(p, t))
    .reduce((s, t) => s + montoParaPersona(t, p.persona === 'ambos' ? null : p.persona), 0)
  return { acumulado, gastado, disponible: acumulado - gastado }
}

// ── HTTP + Auth (mismo flujo que src/shared/lib/supabase.js) ────
class SinSesion extends Error {}

async function http(method, path, { body, token } = {}) {
  const r = new Request(SUPABASE_URL + path)
  r.method = method
  r.timeoutInterval = 20
  // OJO: en Scriptable `r.headers` devuelve una COPIA — mutarlo después de
  // asignarlo no hace nada. Hay que armar el objeto completo y asignarlo una vez.
  const headers = { apikey: anonKey(), 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  r.headers = headers
  if (body) r.body = JSON.stringify(body)
  let json = null
  try { json = await r.loadJSON() } catch (e) { json = null }
  const status = r.response ? r.response.statusCode : 0
  return { status, json }
}

function guardarSesion(j) {
  if (!j || !j.access_token || j.access_token.split('.').length !== 3) throw new Error('Respuesta de login inválida')
  kset(KC.at, j.access_token)
  kset(KC.rt, j.refresh_token)
  kset(KC.exp, j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600))
  if (j.user && j.user.id) kset(KC.uid, j.user.id)
}

async function login(email, password) {
  const { status, json } = await http('POST', '/auth/v1/token?grant_type=password', { body: { email, password } })
  if (status >= 300) throw new Error((json && (json.error_description || json.msg)) || 'Credenciales incorrectas')
  guardarSesion(json)
}

async function token() {
  if (!anonKey() || !kget(KC.rt)) throw new SinSesion('Sin sesión')
  const at = kget(KC.at), exp = Number(kget(KC.exp) || 0)
  if (at && exp - 120 > Date.now() / 1000) return at
  const { status, json } = await http('POST', '/auth/v1/token?grant_type=refresh_token', {
    body: { refresh_token: kget(KC.rt) },
  })
  if (status === 0) throw new Error('Sin conexión')
  if (status >= 300) { [KC.at, KC.rt, KC.exp].forEach(kdel); throw new SinSesion('Sesión expirada') }
  guardarSesion(json)
  return json.access_token
}

function cerrarSesion() { Object.values(KC).forEach(kdel) }

async function q(tabla, params) {
  const t = await token()
  const { status, json } = await http('GET', `/rest/v1/${tabla}?${params}`, { token: t })
  if (status === 401) { kdel(KC.at); throw new SinSesion('Sesión expirada') }
  if (status >= 300 || !Array.isArray(json)) throw new Error((json && json.message) || `Error ${status} en ${tabla}`)
  return json
}
// Para tablas de migraciones opcionales: si no existen, lista vacía
async function qOpc(tabla, params) { try { return await q(tabla, params) } catch (e) { if (e instanceof SinSesion) throw e; return [] } }

async function cargarPareja() {
  const uid = kget(KC.uid)
  const [p] = await q('parejas', `or=(user1_id.eq.${uid},user2_id.eq.${uid})&limit=1`)
  if (!p) throw new Error('No hay pareja configurada')
  const yo = p.user2_id === uid ? 'p2' : 'p1'
  return {
    id: p.id, yo, otro: yo === 'p1' ? 'p2' : 'p1',
    nombres: { p1: p.nombre1 || 'P1', p2: p.nombre2 || 'P2' },
    accent: p.accent_hex || TEMAS[p.tema] || TEMAS.violet,
  }
}

// ════════════════════════════════════════════════════════════════
//  Datos por widget — cada loader devuelve un objeto serializable
// ════════════════════════════════════════════════════════════════
function sumaApartadosPersonales(apartados, cuentas, pred) {
  return apartados.filter((a) => !a.es_negocio).reduce((s, a) => {
    const c = cuentas.find((x) => x.id === a.cuenta_id)
    return c && pred(c) ? s + Number(a.monto) : s
  }, 0)
}

const LOADERS = {
  async patrimonio(P) {
    const mesIni = iso(new Date(hoy0().getFullYear(), hoy0().getMonth(), 1))
    const [cuentas, apartados, tarjetas, txs] = await Promise.all([
      q('cuentas', `pareja_id=eq.${P.id}&activa=eq.true&select=id,nombre,persona,saldo,tipo&order=saldo.desc`),
      q('cuenta_apartados', `pareja_id=eq.${P.id}&activo=eq.true&select=cuenta_id,monto,es_negocio`),
      q('tarjetas', `pareja_id=eq.${P.id}&activa=eq.true&select=persona,saldo_total`),
      q('transacciones', `pareja_id=eq.${P.id}&fecha=gte.${mesIni}&select=tipo,monto,contexto`),
    ])
    const patr = (pred) =>
      cuentas.filter(pred).reduce((s, c) => s + Number(c.saldo), 0) +
      sumaApartadosPersonales(apartados, cuentas, pred) -
      tarjetas.filter(pred).reduce((s, t) => s + Number(t.saldo_total), 0)
    const pers = txs.filter((t) => t.contexto !== 'negocio')
    return {
      pareja: patr((x) => x.persona !== 'negocio'),
      yo: patr((x) => x.persona === P.yo),
      otro: patr((x) => x.persona === P.otro),
      deuda: tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0),
      negocio: cuentas.filter((c) => c.persona === 'negocio').reduce((s, c) => s + Number(c.saldo), 0) +
        apartados.filter((a) => a.es_negocio).reduce((s, a) => s + Number(a.monto), 0),
      ingresos: pers.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0),
      gastos: pers.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0),
      cuentas: cuentas.filter((c) => c.persona !== 'negocio').slice(0, 6)
        .map((c) => ({ nombre: c.nombre, saldo: Number(c.saldo), persona: c.persona })),
    }
  },

  async tarjetas(P) {
    const ts = await q('tarjetas', `pareja_id=eq.${P.id}&activa=eq.true&order=orden.asc,created_at.asc`)
    return {
      items: ts.map((t) => {
        const f = fechasCorte(Number(t.dia_corte), Number(t.dia_limite_pago))
        return {
          nombre: t.nombre, color: t.color || '#7C6EFA', persona: t.persona,
          deuda: Number(t.saldo_total) || 0,
          pagar: Number(t.pago_sin_intereses) || 0,
          minimo: Number(t.pago_minimo) || 0,
          limite: Number(t.limite) || 0,
          corte: f.corte, fechaLimite: f.limite,
        }
      }).sort((a, b) => (a.fechaLimite || '9').localeCompare(b.fechaLimite || '9')),
    }
  },

  async agenda(P) {
    const hoy = hoy0(), fin = iso(addDias(hoy, DIAS_AGENDA)), h = iso(hoy)
    const [tarjetas, subs, recs, msi] = await Promise.all([
      q('tarjetas', `pareja_id=eq.${P.id}&activa=eq.true&select=nombre,dia_corte,dia_limite_pago,pago_sin_intereses`),
      q('suscripciones', `pareja_id=eq.${P.id}&estado=eq.activa&proxima_fecha=lte.${fin}&select=nombre,emoji,monto,proxima_fecha,domiciliada`),
      qOpc('transacciones_recurrentes', `pareja_id=eq.${P.id}&activa=eq.true&proxima_fecha=lte.${fin}&select=nombre,emoji,monto,tipo,proxima_fecha`),
      qOpc('compras_msi', `pareja_id=eq.${P.id}&activa=eq.true&proxima_fecha=lte.${fin}&select=descripcion,monto_mensual,meses_pagados,meses_total,proxima_fecha`),
    ])
    const ev = []
    for (let i = 0; i < 2; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
      quincenasDelMes(d.getFullYear(), d.getMonth())
        .filter((f) => f >= h && f <= fin)
        .forEach((f) => ev.push({ fecha: f, emoji: '💰', titulo: 'Quincena', tipo: 'ingreso' }))
    }
    tarjetas.forEach((t) => {
      const f = fechasCorte(Number(t.dia_corte), Number(t.dia_limite_pago))
      if (f.limite && f.limite <= fin) {
        ev.push({ fecha: f.limite, emoji: '💳', titulo: `Pago ${t.nombre}`, monto: Number(t.pago_sin_intereses) || null, tipo: 'pago' })
      }
      if (f.corte && f.corte <= fin) ev.push({ fecha: f.corte, emoji: '✂️', titulo: `Corte ${t.nombre}`, tipo: 'info' })
    })
    subs.forEach((s) => ev.push({
      fecha: s.proxima_fecha, emoji: s.emoji || '🔄', titulo: s.nombre, monto: Number(s.monto),
      tipo: 'gasto', vencido: s.proxima_fecha < h && !s.domiciliada,
    }))
    recs.forEach((r) => ev.push({
      fecha: r.proxima_fecha, emoji: r.emoji || '🔁', titulo: r.nombre, monto: Number(r.monto),
      tipo: r.tipo === 'ingreso' ? 'ingreso' : 'gasto', vencido: r.proxima_fecha < h,
    }))
    msi.forEach((m) => ev.push({
      fecha: m.proxima_fecha, emoji: '🗓️', titulo: `${m.descripcion} ${m.meses_pagados + 1}/${m.meses_total}`,
      monto: Number(m.monto_mensual), tipo: 'gasto', vencido: m.proxima_fecha < h,
    }))
    ev.sort((a, b) => a.fecha.localeCompare(b.fecha))
    const salida = ev.filter((e) => e.tipo === 'gasto' || e.tipo === 'pago')
      .filter((e) => e.fecha <= iso(addDias(hoy, 7))).reduce((s, e) => s + (e.monto || 0), 0)
    return { eventos: ev, salidaSemana: salida }
  },

  async presupuestos(P) {
    const ps = (await q('presupuestos', `pareja_id=eq.${P.id}&activo=eq.true&order=created_at.asc`))
      .filter((p) => !p.contexto || p.contexto === 'personal')
    if (!ps.length) return { items: [] }
    const desde = ps.map((p) => p.fecha_inicio).sort()[0]
    const txs = await q('transacciones',
      `pareja_id=eq.${P.id}&tipo=eq.gasto&fecha=gte.${desde}&select=tipo,monto,persona,contexto,categoria,subcategoria,fecha`)
    return {
      items: ps.map((p) => {
        const r = calcularPresupuesto(p, txs)
        return { nombre: p.nombre, emoji: p.emoji || '💰', tipo: p.tipo, persona: p.persona, ...r }
      }),
    }
  },

  async negocio(P) {
    const hoy = hoy0(), mesIni = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
    const [cuentas, apartados, ventas, productos, clientes, lotes] = await Promise.all([
      q('cuentas', `pareja_id=eq.${P.id}&activa=eq.true&persona=eq.negocio&select=saldo`),
      q('cuenta_apartados', `pareja_id=eq.${P.id}&activo=eq.true&es_negocio=eq.true&select=monto`),
      qOpc('ventas', `pareja_id=eq.${P.id}&fecha=gte.${mesIni}&estado=neq.cancelada&select=total_venta,ganancia`),
      qOpc('productos', `pareja_id=eq.${P.id}&activo=eq.true&cantidad_stock=gt.0&select=cantidad_stock,precio_unitario_compra,costo_extra_prorrateado,precio_venta,estado`),
      qOpc('clientes', `pareja_id=eq.${P.id}&activo=eq.true&saldo_pendiente=gt.0&select=nombre,saldo_pendiente&order=saldo_pendiente.desc`),
      qOpc('lotes_compra', `pareja_id=eq.${P.id}&estado=not.in.(recibido,cancelado)&select=nombre,estado`),
    ])
    const n = (x) => Number(x) || 0
    return {
      capital: cuentas.reduce((s, c) => s + n(c.saldo), 0) + apartados.reduce((s, a) => s + n(a.monto), 0),
      ventasMes: ventas.reduce((s, v) => s + n(v.total_venta), 0),
      gananciaMes: ventas.reduce((s, v) => s + n(v.ganancia), 0),
      numVentas: ventas.length,
      cartas: productos.reduce((s, p) => s + n(p.cantidad_stock), 0),
      costoStock: productos.reduce((s, p) => s + n(p.cantidad_stock) * (n(p.precio_unitario_compra) + n(p.costo_extra_prorrateado)), 0),
      valorVenta: productos.reduce((s, p) => s + n(p.cantidad_stock) * n(p.precio_venta), 0),
      porCobrar: clientes.reduce((s, c) => s + n(c.saldo_pendiente), 0),
      deudores: clientes.slice(0, 4).map((c) => ({ nombre: c.nombre, monto: n(c.saldo_pendiente) })),
      lotesEnCamino: lotes.length,
    }
  },

  async metas(P) {
    const ms = await q('metas', `pareja_id=eq.${P.id}&activa=eq.true&completada=eq.false&order=created_at.asc`)
    return {
      items: ms.map((m) => ({
        nombre: m.nombre, emoji: m.emoji || '🎯', color: m.color || P.accent,
        actual: Number(m.monto_actual) || 0, objetivo: Number(m.monto_objetivo) || 0,
        fecha: m.fecha_objetivo,
      })),
    }
  },

  async personas(P) {
    const ps = await q('personas_externas', `pareja_id=eq.${P.id}&saldo=neq.0&select=nombre,saldo&order=saldo.desc`)
    const items = ps.map((p) => ({ nombre: p.nombre, saldo: Number(p.saldo) }))
    return {
      items,
      meDeben: items.filter((p) => p.saldo > 0).reduce((s, p) => s + p.saldo, 0),
      debo: -items.filter((p) => p.saldo < 0).reduce((s, p) => s + p.saldo, 0),
    }
  },
}

// ════════════════════════════════════════════════════════════════
//  UI helpers
// ════════════════════════════════════════════════════════════════
function font(size, peso = 'regular', mono = false) {
  const m = mono
    ? { regular: 'regularMonospacedSystemFont', medium: 'mediumMonospacedSystemFont', semibold: 'semiboldMonospacedSystemFont', bold: 'boldMonospacedSystemFont' }
    : { regular: 'systemFont', medium: 'mediumSystemFont', semibold: 'semiboldSystemFont', bold: 'boldSystemFont' }
  return Font[m[peso]](size)
}
function txt(stack, str, size, color = C.text, peso = 'regular', mono = false) {
  const t = stack.addText(String(str))
  t.font = font(size, peso, mono)
  t.textColor = color
  t.lineLimit = 1
  t.minimumScaleFactor = 0.6
  return t
}
function hstack(parent, spacing = 0) {
  const s = parent.addStack(); s.layoutHorizontally(); s.centerAlignContent(); s.spacing = spacing; return s
}
function vstack(parent, spacing = 0) {
  const s = parent.addStack(); s.layoutVertically(); s.spacing = spacing; return s
}
function colorMonto(n) { return n < 0 ? C.bad : C.white }

function barra(pct, ancho, alto, color) {
  const dc = new DrawContext()
  dc.size = new Size(ancho, alto)
  dc.opaque = false
  dc.respectScreenScale = true
  const fondo = new Path()
  fondo.addRoundedRect(new Rect(0, 0, ancho, alto), alto / 2, alto / 2)
  dc.addPath(fondo); dc.setFillColor(C.card); dc.fillPath()
  const p = Math.max(0, Math.min(1, pct))
  if (p > 0) {
    const w = Math.max(alto, ancho * p)
    const lleno = new Path()
    lleno.addRoundedRect(new Rect(0, 0, w, alto), alto / 2, alto / 2)
    dc.addPath(lleno); dc.setFillColor(color); dc.fillPath()
  }
  return dc.getImage()
}
function addBarra(stack, pct, ancho, color, alto = 5) {
  const img = stack.addImage(barra(pct, ancho, alto, color))
  img.imageSize = new Size(ancho, alto)
  return img
}

function base() {
  const w = new ListWidget()
  w.backgroundColor = C.bg
  w.setPadding(14, 14, 12, 14)
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60000)
  if (APP_URL) w.url = APP_URL
  return w
}
function encabezado(w, emoji, titulo, extra) {
  const s = hstack(w)
  txt(s, `${emoji} ${titulo.toUpperCase()}`, 10, C.accent, 'bold')
  s.addSpacer()
  txt(s, extra || hora(), 9, C.dim, 'medium')
  w.addSpacer(6)
}
function hora() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function filaMonto(w, izq, monto, color, size = 12, sub) {
  const s = hstack(w, 6)
  const l = vstack(s)
  txt(l, izq, size, C.text, 'medium')
  if (sub) txt(l, sub, size - 3, C.dim)
  s.addSpacer()
  txt(s, typeof monto === 'string' ? monto : fmt(monto), size, color || colorMonto(monto), 'semibold', true)
  return s
}
function vacio(w, emoji, msg) {
  w.addSpacer()
  const s = hstack(w); s.addSpacer(); txt(s, emoji, 26); s.addSpacer()
  w.addSpacer(4)
  const t = hstack(w); t.addSpacer(); txt(t, msg, 11, C.muted, 'medium'); t.addSpacer()
  w.addSpacer()
}
function maxFilas(fam, chico, med, grande) { return fam === 'small' ? chico : fam === 'large' || fam === 'extraLarge' ? grande : med }

// ════════════════════════════════════════════════════════════════
//  Render por widget
// ════════════════════════════════════════════════════════════════
const RENDER = {
  patrimonio(d, P, fam) {
    const w = base()
    encabezado(w, '🏦', 'Patrimonio')
    const flujo = d.ingresos - d.gastos
    if (fam === 'small') {
      txt(w, 'Pareja', 10, C.muted, 'medium')
      txt(w, fmtK(d.pareja), 24, colorMonto(d.pareja), 'bold', true)
      w.addSpacer()
      filaMonto(w, P.nombres[P.yo], fmtK(d.yo), colorMonto(d.yo), 10)
      filaMonto(w, 'Negocio', fmtK(d.negocio), C.white, 10)
      filaMonto(w, 'Flujo mes', fmtK(flujo), flujo >= 0 ? C.ok : C.bad, 10)
      return w
    }
    const top = hstack(w, 12)
    const izq = vstack(top, 2)
    txt(izq, 'Pareja', 10, C.muted, 'medium')
    txt(izq, fmt(d.pareja, 0), 26, colorMonto(d.pareja), 'bold', true)
    txt(izq, `Deuda tarjetas ${fmtK(d.deuda)}`, 10, C.bad, 'medium')
    top.addSpacer()
    const der = vstack(top, 3)
    ;[[P.nombres[P.yo], d.yo], [P.nombres[P.otro], d.otro], ['Negocio', d.negocio]].forEach(([n, v]) => {
      const r = hstack(der, 6); txt(r, n, 10, C.muted); r.addSpacer(); txt(r, fmtK(v), 11, colorMonto(v), 'semibold', true)
    })
    der.size = new Size(120, 0)
    w.addSpacer()
    const mes = hstack(w, 10)
    ;[['Ingresos', d.ingresos, C.ok], ['Gastos', d.gastos, C.bad], ['Flujo', flujo, flujo >= 0 ? C.ok : C.bad]].forEach(([n, v, c]) => {
      const col = vstack(mes, 1)
      txt(col, `${n} ${MESES[new Date().getMonth()]}`, 9, C.dim, 'medium')
      txt(col, fmtK(v), 13, c, 'semibold', true)
      mes.addSpacer()
    })
    if (fam === 'large' || fam === 'extraLarge') {
      w.addSpacer(10)
      txt(w, 'CUENTAS', 9, C.dim, 'bold')
      w.addSpacer(4)
      d.cuentas.forEach((c) => { filaMonto(w, c.nombre, c.saldo, null, 12, P.nombres[c.persona] || 'Ambos'); w.addSpacer(4) })
    }
    return w
  },

  tarjetas(d, P, fam) {
    const w = base()
    const total = d.items.reduce((s, t) => s + t.pagar, 0)
    encabezado(w, '💳', 'Tarjetas', `Pagar ${fmtK(total)}`)
    if (!d.items.length) return vacio(w, '💳', 'Sin tarjetas'), w
    const n = maxFilas(fam, 2, 3, 7)
    d.items.slice(0, n).forEach((t, i) => {
      const dias = t.fechaLimite ? diasHasta(t.fechaLimite) : null
      const urg = dias != null && dias <= 3 && t.pagar > 0 ? C.bad : dias != null && dias <= 7 ? C.warn : C.muted
      const fila = hstack(w, 6)
      const punto = fila.addStack(); punto.size = new Size(4, fam === 'small' ? 26 : 30); punto.cornerRadius = 2
      punto.backgroundColor = new Color(t.color)
      const col = vstack(fila, 2)
      const r1 = hstack(col, 4)
      txt(r1, t.nombre, 12, C.white, 'semibold'); r1.addSpacer()
      txt(r1, fam === 'small' ? fmtK(t.pagar) : fmt(t.pagar), 12, t.pagar > 0 ? C.white : C.ok, 'semibold', true)
      const r2 = hstack(col, 4)
      txt(r2, t.fechaLimite ? `Límite ${cuando(t.fechaLimite)}${dias > 1 ? ` · ${dias}d` : ''}` : 'Sin fecha', 9, urg, 'medium')
      r2.addSpacer()
      if (fam !== 'small') {
        txt(r2, `Deuda ${fmtK(t.deuda)}`, 9, C.dim)
        if (t.limite > 0) {
          const pct = t.deuda / t.limite
          r2.addSpacer(4)
          addBarra(r2, pct, 40, pct > 0.7 ? C.bad : pct > 0.3 ? C.warn : C.ok, 4)
        }
      }
      if (i < n - 1) w.addSpacer(fam === 'large' ? 8 : 5)
    })
    w.addSpacer()
    return w
  },

  agenda(d, P, fam) {
    const w = base()
    encabezado(w, '📅', `Próximos ${DIAS_AGENDA} días`, fam === 'small' ? '' : `Sale 7d ${fmtK(d.salidaSemana)}`)
    if (!d.eventos.length) return vacio(w, '🌴', 'Nada pendiente'), w
    const n = maxFilas(fam, 4, 5, 13)
    d.eventos.slice(0, n).forEach((e) => {
      const s = hstack(w, 6)
      const col = s.addStack()
      col.size = new Size(fam === 'small' ? 38 : 50, 0)
      txt(col, cuando(e.fecha), fam === 'small' ? 9 : 10,
        e.vencido ? C.bad : diasHasta(e.fecha) <= 1 ? C.warn : C.dim, 'semibold')
      col.addSpacer()
      txt(s, `${e.emoji} ${e.titulo}`, fam === 'small' ? 10 : 11, C.text, 'medium')
      s.addSpacer()
      if (e.monto && fam !== 'small') {
        txt(s, (e.tipo === 'ingreso' ? '+' : '') + fmt(e.monto, 0), 11, e.tipo === 'ingreso' ? C.ok : C.white, 'semibold', true)
      }
      w.addSpacer(fam === 'large' ? 5 : 3)
    })
    w.addSpacer()
    return w
  },

  presupuestos(d, P, fam) {
    const w = base()
    encabezado(w, '🎯', 'Presupuestos')
    if (!d.items.length) return vacio(w, '🎯', 'Sin presupuestos'), w
    const n = maxFilas(fam, 3, 3, 8)
    const ancho = fam === 'small' ? 120 : 290
    d.items.slice(0, n).forEach((p) => {
      const usado = p.acumulado > 0 ? p.gastado / p.acumulado : 0
      const color = p.disponible < 0 ? C.bad : usado > 0.8 ? C.warn : C.ok
      const r = hstack(w, 4)
      txt(r, `${p.emoji} ${p.nombre}`, fam === 'small' ? 10 : 12, C.text, 'medium')
      r.addSpacer()
      txt(r, fam === 'small' ? fmtK(p.disponible) : fmt(p.disponible), fam === 'small' ? 10 : 12, color, 'semibold', true)
      w.addSpacer(3)
      addBarra(w, usado, ancho, color)
      if (fam !== 'small') {
        w.addSpacer(2)
        txt(w, `${p.tipo} · ${p.persona === 'ambos' ? 'Ambos' : P.nombres[p.persona]} · gastado ${fmtK(p.gastado)} de ${fmtK(p.acumulado)}`, 9, C.dim)
      }
      w.addSpacer(fam === 'large' ? 10 : 6)
    })
    w.addSpacer()
    return w
  },

  negocio(d, P, fam) {
    const w = base()
    encabezado(w, '🃏', 'Negocio')
    if (fam === 'small') {
      txt(w, `Ganancia ${MESES[new Date().getMonth()]}`, 10, C.muted, 'medium')
      txt(w, fmtK(d.gananciaMes), 24, d.gananciaMes >= 0 ? C.ok : C.bad, 'bold', true)
      w.addSpacer()
      filaMonto(w, 'Ventas', fmtK(d.ventasMes), C.white, 10)
      filaMonto(w, 'Capital', fmtK(d.capital), C.white, 10)
      filaMonto(w, 'Por cobrar', fmtK(d.porCobrar), d.porCobrar > 0 ? C.warn : C.dim, 10)
      return w
    }
    const top = hstack(w, 10)
    const kpi = (titulo, valor, color, sub) => {
      const c = vstack(top, 1)
      txt(c, titulo, 9, C.dim, 'medium')
      txt(c, valor, 15, color, 'bold', true)
      if (sub) txt(c, sub, 9, C.dim)
      top.addSpacer()
    }
    kpi(`Ventas ${MESES[new Date().getMonth()]}`, fmtK(d.ventasMes), C.white, `${d.numVentas} ventas`)
    kpi('Ganancia', fmtK(d.gananciaMes), d.gananciaMes >= 0 ? C.ok : C.bad,
      d.ventasMes > 0 ? `${Math.round((d.gananciaMes / d.ventasMes) * 100)}% margen` : ' ')
    kpi('Capital', fmtK(d.capital), C.white, ' ')
    w.addSpacer()
    filaMonto(w, `📦 ${d.cartas} cartas en stock`, `costo ${fmtK(d.costoStock)}`, C.muted, 11)
    w.addSpacer(3)
    filaMonto(w, `💸 Por cobrar`, fmt(d.porCobrar, 0), d.porCobrar > 0 ? C.warn : C.dim, 11)
    w.addSpacer(3)
    filaMonto(w, `🚚 Lotes en camino`, String(d.lotesEnCamino), C.text, 11)
    if (fam === 'large' || fam === 'extraLarge') {
      w.addSpacer(3)
      filaMonto(w, '🏷️ Valor de venta del stock', fmt(d.valorVenta, 0), C.ok, 11)
      if (d.deudores.length) {
        w.addSpacer(10)
        txt(w, 'CLIENTES CON ADEUDO', 9, C.dim, 'bold')
        w.addSpacer(4)
        d.deudores.forEach((c) => { filaMonto(w, c.nombre, c.monto, C.warn, 12); w.addSpacer(3) })
      }
      w.addSpacer()
    }
    return w
  },

  metas(d, P, fam) {
    const w = base()
    encabezado(w, '⭐', 'Metas')
    if (!d.items.length) return vacio(w, '⭐', 'Sin metas activas'), w
    const n = maxFilas(fam, 2, 3, 7)
    const ancho = fam === 'small' ? 120 : 290
    d.items.slice(0, n).forEach((m) => {
      const pct = m.objetivo > 0 ? m.actual / m.objetivo : 0
      const r = hstack(w, 4)
      txt(r, `${m.emoji} ${m.nombre}`, fam === 'small' ? 10 : 12, C.text, 'medium')
      r.addSpacer()
      txt(r, `${Math.round(pct * 100)}%`, fam === 'small' ? 10 : 12, C.white, 'semibold', true)
      w.addSpacer(3)
      addBarra(w, pct, ancho, new Color(m.color))
      if (fam !== 'small') {
        w.addSpacer(2)
        const falta = Math.max(0, m.objetivo - m.actual)
        txt(w, `${fmt(m.actual, 0)} de ${fmt(m.objetivo, 0)} · faltan ${fmtK(falta)}${m.fecha ? ` · ${fechaCorta(m.fecha)}` : ''}`, 9, C.dim)
      }
      w.addSpacer(fam === 'large' ? 10 : 6)
    })
    w.addSpacer()
    return w
  },

  personas(d, P, fam) {
    const w = base()
    encabezado(w, '👥', 'Personas')
    const top = hstack(w, 10)
    const a = vstack(top, 1); txt(a, 'Me deben', 9, C.dim, 'medium'); txt(a, fmtK(d.meDeben), fam === 'small' ? 15 : 18, C.ok, 'bold', true)
    top.addSpacer()
    const b = vstack(top, 1); txt(b, 'Debo', 9, C.dim, 'medium'); txt(b, fmtK(d.debo), fam === 'small' ? 15 : 18, C.bad, 'bold', true)
    if (fam !== 'small') top.addSpacer()
    w.addSpacer(8)
    if (!d.items.length) { txt(w, '✨ Todo saldado', 11, C.muted, 'medium'); w.addSpacer(); return w }
    const n = maxFilas(fam, 2, 3, 10)
    d.items.slice().sort((x, y) => Math.abs(y.saldo) - Math.abs(x.saldo)).slice(0, n).forEach((p) => {
      filaMonto(w, p.nombre, fam === 'small' ? fmtK(Math.abs(p.saldo)) : fmt(Math.abs(p.saldo)), p.saldo > 0 ? C.ok : C.bad, 11,
        fam === 'small' ? null : p.saldo > 0 ? 'te debe' : 'le debes')
      w.addSpacer(3)
    })
    w.addSpacer()
    return w
  },
}

// Pantalla de bloqueo: { titulo, lineas[] } por widget
const RESUMEN = {
  patrimonio: (d, P) => ({ titulo: '🏦 Patrimonio', valor: d.pareja, lineas: [fmt(d.pareja, 0), `Flujo mes ${fmtK(d.ingresos - d.gastos)}`] }),
  tarjetas: (d) => {
    const t = d.items.find((x) => x.pagar > 0) || d.items[0]
    return t ? { titulo: `💳 ${t.nombre}`, valor: t.pagar, lineas: [fmt(t.pagar, 0), t.fechaLimite ? `Límite ${cuando(t.fechaLimite)}` : ''] }
      : { titulo: '💳 Tarjetas', lineas: ['Sin tarjetas'] }
  },
  agenda: (d) => ({ titulo: '📅 Próximo', corto: d.eventos[0] ? cuando(d.eventos[0].fecha) : '—', lineas: d.eventos.slice(0, 2).map((e) => `${cuando(e.fecha)} ${e.emoji} ${e.titulo}`) }),
  presupuestos: (d) => {
    const p = d.items[0]
    return p ? { titulo: `${p.emoji} ${p.nombre}`, lineas: [`Quedan ${fmt(p.disponible, 0)}`, `de ${fmtK(p.acumulado)}`], pct: p.acumulado ? p.gastado / p.acumulado : 0 }
      : { titulo: '🎯 Presupuestos', lineas: ['Sin presupuestos'] }
  },
  negocio: (d) => ({ titulo: '🃏 Negocio', valor: d.gananciaMes, lineas: [`Ganancia ${fmtK(d.gananciaMes)}`, `Capital ${fmtK(d.capital)}`] }),
  metas: (d) => {
    const m = d.items[0]
    return m ? { titulo: `${m.emoji} ${m.nombre}`, lineas: [`${Math.round((m.actual / (m.objetivo || 1)) * 100)}% · ${fmtK(m.actual)}`, `Meta ${fmtK(m.objetivo)}`], pct: m.actual / (m.objetivo || 1) }
      : { titulo: '⭐ Metas', lineas: ['Sin metas'] }
  },
  personas: (d) => ({ titulo: '👥 Personas', valor: d.meDeben - d.debo, lineas: [`Me deben ${fmtK(d.meDeben)}`, `Debo ${fmtK(d.debo)}`] }),
}

function renderAccesorio(vista, d, P, fam) {
  const r = RESUMEN[vista](d, P)
  const w = new ListWidget()
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60000)
  if (APP_URL) w.url = APP_URL
  if (fam === 'accessoryInline') { txt(w, `${r.titulo} ${r.lineas[0] || ''}`, 12); return w }
  if (fam === 'accessoryCircular') {
    w.addAccessoryWidgetBackground = true
    const s = hstack(w); s.addSpacer()
    const c = vstack(s); c.centerAlignContent()
    txt(c, r.titulo.split(' ')[0], 12)
    txt(c, r.corto != null ? r.corto : r.pct != null ? `${Math.round(r.pct * 100)}%` : fmtK(r.valor ?? 0), 11, C.white, 'bold')
    s.addSpacer()
    return w
  }
  txt(w, r.titulo, 12, C.white, 'bold')
  r.lineas.filter(Boolean).forEach((l, i) => txt(w, l, i === 0 ? 15 : 11, C.white, i === 0 ? 'bold' : 'regular', i === 0))
  return w
}

// ════════════════════════════════════════════════════════════════
//  Cache local (para mostrar algo si no hay internet)
// ════════════════════════════════════════════════════════════════
const fm = FileManager.local()
const cachePath = (v) => fm.joinPath(fm.documentsDirectory(), `np-widget-${v}.json`)
function guardarCache(v, payload) { try { fm.writeString(cachePath(v), JSON.stringify({ t: Date.now(), ...payload })) } catch (e) {} }
function leerCache(v) { try { return fm.fileExists(cachePath(v)) ? JSON.parse(fm.readString(cachePath(v))) : null } catch (e) { return null } }

function widgetMensaje(emoji, titulo, detalle) {
  const w = base()
  w.addSpacer()
  txt(w, emoji, 22)
  w.addSpacer(4)
  txt(w, titulo, 13, C.white, 'bold')
  if (detalle) { const t = w.addText(detalle); t.font = font(10); t.textColor = C.muted; t.lineLimit = 3 }
  w.addSpacer()
  return w
}

async function construir(vista, fam) {
  if (!LOADERS[vista]) {
    return widgetMensaje('🤔', `"${vista}" no existe`, `Usa: ${Object.keys(LOADERS).join(', ')}`)
  }
  let P, data, offline = false
  try {
    P = await cargarPareja()
    data = await LOADERS[vista](P)
    guardarCache(vista, { P, data })
  } catch (e) {
    if (e instanceof SinSesion) return widgetMensaje('🔒', 'Inicia sesión', 'Abre este script en Scriptable para conectarte.')
    const c = leerCache(vista)
    if (!c) return widgetMensaje('⚠️', 'No se pudo cargar', String(e.message || e))
    ;({ P, data } = c)
    offline = true
  }
  C.accent = new Color(P.accent)
  const w = fam && fam.startsWith('accessory') ? renderAccesorio(vista, data, P, fam) : RENDER[vista](data, P, fam || 'medium')
  if (offline && !(fam || '').startsWith('accessory')) {
    const t = w.addText('sin conexión · datos guardados'); t.font = font(8); t.textColor = C.warn
  }
  return w
}

// ════════════════════════════════════════════════════════════════
//  Ejecución
// ════════════════════════════════════════════════════════════════
async function pedirLogin() {
  const a = new Alert()
  a.title = 'Nuestro Patrimonio'
  a.message = 'Inicia sesión con la misma cuenta de la app. Se guarda en el Llavero del iPhone.'
  a.addTextField('correo', '')
  a.addSecureTextField('contraseña', '')
  const pideKey = !ANON_KEY
  if (pideKey) a.addTextField('anon key de Supabase', kget(KC.anon) || '')
  a.addAction('Entrar')
  a.addCancelAction('Cancelar')
  if ((await a.present()) === -1) return false
  if (pideKey) kset(KC.anon, a.textFieldValue(2).trim())
  try {
    await login(a.textFieldValue(0).trim(), a.textFieldValue(1))
    return true
  } catch (e) {
    const err = new Alert(); err.title = 'No se pudo entrar'; err.message = String(e.message || e); err.addAction('OK'); await err.present()
    return false
  }
}

async function menu() {
  const vistas = Object.keys(LOADERS)
  const a = new Alert()
  a.title = 'Vista previa'
  a.message = 'Elige un widget para verlo. En el widget real escribe el nombre en "Parameter".'
  vistas.forEach((v) => a.addAction(v))
  a.addDestructiveAction('Cerrar sesión')
  a.addCancelAction('Salir')
  const i = await a.present()
  if (i === -1) return
  if (i === vistas.length) { cerrarSesion(); return }
  const t = new Alert(); t.title = 'Tamaño'
  ;['small', 'medium', 'large'].forEach((s) => t.addAction(s))
  const j = await t.present()
  const fam = ['small', 'medium', 'large'][j] || 'medium'
  const w = await construir(vistas[i], fam)
  if (fam === 'small') await w.presentSmall()
  else if (fam === 'large') await w.presentLarge()
  else await w.presentMedium()
}

const vista = ((args.widgetParameter || 'patrimonio') + '').trim().toLowerCase()

if (config.runsInWidget) {
  Script.setWidget(await construir(vista, config.widgetFamily))
} else {
  if (!anonKey() || !kget(KC.rt)) {
    if (await pedirLogin()) await menu()
  } else {
    await menu()
  }
}
Script.complete()
