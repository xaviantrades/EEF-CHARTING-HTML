'use strict';

/* =====================================================================
   KILELE TRADER  -  CORE  (shared/core.js)
   =====================================================================
   Loaded by EVERY page, FIRST (before shell.js and the page's own js).

   This file is the "engine" that all pages share. Read it in order:

     0) SMALL HELPERS        $, money(), Store ...
     1) ICONS                inline SVG icons + hydrateIcons()
     2) STATE + FEED         the data: symbols, account, TradingView live feed
     2e) SESSION             NEW: keeps the data alive between pages
     2f) TRADING MATHS       profit / margin / totals
     3) THEME                light / dark / system
     4) UI HELPERS           toast, bottom sheet, dialog, drawer
     5) PRICE RENDERING      pxHTML()
     6) ACCOUNT GATING       emptyAccount(), gated()

   IMPORTANT DIFFERENCE FROM THE ORIGINAL SINGLE-PAGE APP
   ------------------------------------------------------
   Originally the whole app was ONE html page. Moving between "pages" only
   swapped content with JavaScript, so the State object (account, open
   positions, prices ...) simply stayed in memory.

   Now every page is a REAL separate .html file. When you go to another page
   the browser throws away all JavaScript memory and loads the new page.
   To make the app behave exactly the same, State is saved into the browser's
   sessionStorage right before leaving a page and loaded again when the next
   page starts (see section 2e).
   ===================================================================== */


/* =====================================================================
   0) SMALL HELPERS
   ===================================================================== */
const $  = (sel, root = document) => root.querySelector(sel);        // find one element
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]; // find many (as a real array)
const pad = n => String(n).padStart(2, '0');                          // 5 -> "05"
const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;                   // 14:05:09
const stamp = d => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${clock(d)}`;          // 2026.10.23 14:05:09

// Money like 100 000.00 (space as thousands separator)
function money(n) {
  const [i, d] = Math.abs(n).toFixed(2).split('.');                   // split "100000.00" into "100000" and "00"
  return (n < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+$)/g, ' ') + '.' + d; // insert a space every 3 digits
}
// 100000 -> "100K" (shown in the bottom nav pill)
const compact = n => n >= 1000 ? Math.round(n / 1000) + 'K' : Math.round(n) + '';

// Safe wrapper around localStorage (it can be blocked in some previews).
// This is the LONG-TERM store: it survives closing the browser.
// Used for: theme/settings and the "I accepted the terms" flag.
const Store = {
  get(k, fallback) { try { const v = localStorage.getItem('kt_' + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v)        { try { localStorage.setItem('kt_' + k, JSON.stringify(v)); } catch { /* ignore */ } }
};


/* =====================================================================
   1) ICONS  (original inline SVGs, drawn with currentColor so they
      follow the theme automatically)
   ===================================================================== */
const ICONS = {
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  edit:'<path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z"/>',
  back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  quotes:'<path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4"/>',
  charts:'<path d="M7 3v18M17 3v18"/><rect x="4.5" y="8" width="5" height="7" rx=".6"/><rect x="14.5" y="6" width="5" height="9" rx=".6"/>',
  trade:'<path d="M4 18l5-6 4 3 7-9"/><circle cx="4" cy="18" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="13" cy="15" r="1.7"/><circle cx="20" cy="6" r="1.7"/>',
  history:'<path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4M12 8v4l3 2"/>',
  messages:'<path d="M4 5h12a1 1 0 011 1v7a1 1 0 01-1 1H9l-4 3v-3H4a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M20 9v8h-2"/>',
  crosshair:'<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
  indicator:'<path d="M3 16c3-8 5 2 8-4s5 4 9-6"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  news:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  mail:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 8l9 6 9-6"/>',
  journal:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M7 9h2M7 13h2M15 9h2M15 13h2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  community:'<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><path d="M3 20v-4a3 3 0 013-3h2M21 20v-4a3 3 0 00-3-3h-2M9 20v-3a3 3 0 016 0v3"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 01-8 0V4zM8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M12 13v4M8 20h8"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  filePlus:'<path d="M6 3h8l5 5v13H6z"/><path d="M12 11v6M9 14h6"/>',
  refresh:'<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5"/>',
  chevron:'<path d="M9 6l6 6-6 6"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  grad:'<path d="M2 9l10-5 10 5-10 5-10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  mountain:'<path d="M3 20L10 7l4 7 3-4 4 10z" fill="currentColor"/>',
  chat:'<path d="M5 6h14a2 2 0 012 2v7a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V8a2 2 0 012-2z"/><path d="M8 11h.01M12 11h.01M16 11h.01" stroke-width="3"/>',
  spread:'<path d="M5 8v8M19 8v8M5 12h14"/>'
};
// icon('menu') -> a ready <svg> string. size and stroke are optional.
const icon = (name, size = 24, stroke = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// NEW: lets plain HTML files use icons without copy-pasting SVG code.
// In an .html file write:   <i data-icon="chevron" data-size="24" data-stroke="2"></i>
// and this function swaps that tag for the real <svg>. size/stroke are optional.
// Called once at startup by App.start() in shell.js.
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach(el => {
    el.outerHTML = icon(el.dataset.icon, +el.dataset.size || 24, +el.dataset.stroke || 2);
  });
}


/* =====================================================================
   2) STATE + FEED  (the data layer)
   ===================================================================== */

// ---- 2a) The symbols we offer. EDIT to add instruments. ----
// digits  = decimals in the price      spread = in "points" (smallest price step)
// contract= units per 1.00 lot         usdBase= true when USD is the FIRST currency (USDJPY...)
// exchange+sym = the TradingView live symbol ("FX:EURUSD"); candle HISTORY comes
//                from Yahoo Finance as "<sym>=X" ("EURUSD=X", gold: see below).
// price   = fallback seed, painted only until the first live TradingView tick
//           arrives (spread is likewise only a fallback: live bid/ask replace it)
const MARKET = [
  {
    sym: "EURUSD",
    price: 1.16000,
    exchange: "FX",
    name: "Euro vs US Dollar",
    digits: 5,
    spread: 1,
    contract: 100000,
    usdBase: false
  },
  {
    sym: "GBPUSD",
    price: 1.34000,
    exchange: "FX",
    name: "Great Britain Pound vs US Dollar",
    digits: 5,
    spread: 0,
    contract: 100000,
    usdBase: false
  },
  {
    sym: "USDJPY",
    price: 150.000,
    exchange: "FX",
    name: "US Dollar vs Japanese Yen",
    digits: 3,
    spread: 2,
    contract: 100000,
    usdBase: true
  },
  {
    sym: "USDCHF",
    price: 0.80000,
    exchange: "FX",
    name: "US Dollar vs Swiss Franc",
    digits: 5,
    spread: 2,
    contract: 100000,
    usdBase: true
  },
  {
    sym: "USDCAD",
    price: 1.40000,
    exchange: "FX",
    name: "US Dollar vs Canadian Dollar",
    digits: 5,
    spread: 1,
    contract: 100000,
    usdBase: true
  },
  {
    sym: "AUDUSD",
    price: 0.65000,
    exchange: "FX",
    name: "Australian Dollar vs US Dollar",
    digits: 5,
    spread: 1,
    contract: 100000,
    usdBase: false
  },
  {
    sym: "NZDUSD",
    price: 0.58000,
    exchange: "FX",
    name: "New Zealand Dollar vs US Dollar",
    digits: 5,
    spread: 1,
    contract: 100000,
    usdBase: false
  },
  {
    sym: "XAUUSD",
    price: 4000.00,
    exchange: "OANDA",
    name: "Gold vs US Dollar",
    digits: 2,
    spread: 25,
    contract: 100,
    usdBase: false
  }
];

const MAP = {};    // MAP['EURUSD']    -> its definition (fast lookup)
const Q   = {};    // Q['EURUSD']      -> its LIVE quote {bid, ask, open, lo, hi, dir, time, ch, chp, spread, live}
const TV2SYM = {}; // TV2SYM['FX:EURUSD'] -> 'EURUSD' (translate TradingView names back to ours)
MARKET.forEach(m => {
  m.point = Math.pow(10, -m.digits);   // smallest step, e.g. 0.00001
  m.tv = `${m.exchange}:${m.sym}`;     // TradingView live-feed name, e.g. "FX:EURUSD", "OANDA:XAUUSD"
  // Yahoo Finance history name(s), tried in order by the Charts page.
  // Spot gold (XAUUSD=X) often returns no data on Yahoo, so gold falls back to COMEX futures (GC=F).
  m.yahoo = m.sym === 'XAUUSD' ? ['XAUUSD=X', 'GC=F'] : [`${m.sym}=X`];
  MAP[m.sym] = m;
  TV2SYM[m.tv] = m.sym;
  // Seed from m.price so every page can paint immediately. These values are
  // replaced by the first real TradingView tick (section 2d) - live stays
  // false until then, so nothing can trade on the seed prices.
  Q[m.sym] = {
    bid: m.price,
    ask: +(m.price + m.spread * m.point).toFixed(m.digits),
    open: m.price,              // day reference price (open / prev close) - set from TradingView on first tick
    lo: m.price, hi: m.price,   // day low / high - reset on first tick, then tracked / taken from TradingView
    ch: null, chp: null,        // TradingView day change / change % (null until the feed sends them)
    spread: m.spread,           // live spread in points - recomputed from ask-bid on every tick
    dir: 1, time: new Date(), live: false
  };
});

// ---- 2b) App state: everything the UI needs lives here ----
const State = {
  account: null,   // null = logged out. Otherwise { name, login, server, demo, balance, positions[], closed[], orders[], deals[] }
  settings: Object.assign({ theme: 'dark', showHL: true, showSpread: true }, Store.get('settings', {})),
  watchlist: MARKET.map(m => m.sym),    // which symbols appear on the Quotes page
  chart: { sym: 'EURUSD', tf: 'M5' },   // what the Charts page is showing
  journal: [],                          // log lines for the Journal page
  unread: 2,                            // mailbox badge
  nextId: 1000001,                      // ticket numbers for orders
  // ---- NEW fields, needed because pages are now separate html files ----
  histTab: 'positions',                 // which tab the History page shows (used to be a variable inside the page)
  consent: false,                       // "accepted terms" remembered for this tab even if localStorage is blocked
  pendingToast: null                    // a toast { msg, left } that must appear on the NEXT page, "left" = ms still to show (see go() in shell.js)
};
const log = msg => State.journal.unshift({ t: new Date(), msg });

// ---- 2c) The FEED: pages subscribe to be told when prices change ----
const Feed = {
  subs: new Set(),
  status: 'connecting',   // TradingView socket state: 'connecting' | 'live' | 'closed'
  on(fn)  { this.subs.add(fn); return () => this.subs.delete(fn); }, // returns an "unsubscribe" function
  emit()  { this.subs.forEach(fn => fn()); }
};

/* ---------------------------------------------------------------------
   2d) LIVE FEED: TradingView WebSocket (adapted from feedPrice.js)
   ---------------------------------------------------------------------
   wss://data.tradingview.com/socket.io/websocket speaks a simple framed
   protocol: every message is "~m~<length>~m~<JSON>". We open one
   anonymous quote session, ask for lp / bid / ask / ch / chp for every
   symbol in MARKET, and copy each "qsd" update into Q - the same Q the
   Quotes watchlist, Charts, Trade and the order ticket already read.
   Subscribers are then woken with Feed.emit() (batched, see below).
   If the socket drops it reconnects with back-off (1s, 2s, ... 30s).

   These are indicative quotes from TradingView's public feed, not an
   executable broker feed.
   --------------------------------------------------------------------- */
const TV = {
  URL: 'wss://data.tradingview.com/socket.io/websocket',
  // lp=last price, bid/ask, ch=day change, chp=day change % (as in feedPrice.js).
  // lp_time + day open/high/low are used when TradingView sends them; anything
  // it does not send for a symbol is derived / tracked in tvApplyQuote() instead.
  FIELDS: ['lp', 'bid', 'ask', 'ch', 'chp', 'lp_time', 'open_price', 'high_price', 'low_price', 'prev_close_price'],
  ws: null, session: null, latest: {}, buffer: '', retryMs: 1000
};
// "finite number or null" (note: Number(null) is 0, so null/undefined are rejected first)
const num = v => { if (v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

// "qs_" + 12 random letters/digits (a TradingView quote session id)
function tvSession(prefix) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = prefix;
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
const tvFrame = payload => `~m~${payload.length}~m~${payload}`;
function tvSend(method, params) {
  if (TV.ws && TV.ws.readyState === WebSocket.OPEN) TV.ws.send(tvFrame(JSON.stringify({ m: method, p: params })));
}
// Pull every complete "~m~<len>~m~..." frame out of the receive buffer
// (a frame can be split across WebSocket messages, so leftovers are kept).
function tvTakeFrames() {
  const out = [];
  for (;;) {
    if (!TV.buffer.startsWith('~m~')) {                                      // not at a frame start: resync to the next one
      const at = TV.buffer.indexOf('~m~', 1);
      if (at === -1) { TV.buffer = TV.buffer.endsWith('~m') ? '~m' : TV.buffer.endsWith('~') ? '~' : ''; break; } // keep only a possible partial header
      TV.buffer = TV.buffer.slice(at);
    }
    const head = TV.buffer.match(/^~m~(\d+)~m~/);
    if (!head) break;                                                        // partial header: wait for more data
    const start = head[0].length, end = start + Number(head[1]);
    if (end > TV.buffer.length) break;                                       // incomplete frame: wait for the rest
    out.push(TV.buffer.slice(start, end));
    TV.buffer = TV.buffer.slice(end);
  }
  return out;
}

// TradingView can send many messages a second. Q is updated at once, but
// pages are repainted at most every 200ms so nothing flickers or janks,
// and the session copy is saved at most once a second (pagehide also saves).
let tvEmitTimer = null, tvSavedAt = 0;
function tvScheduleEmit() {
  if (tvEmitTimer !== null) return;
  tvEmitTimer = setTimeout(() => {
    tvEmitTimer = null;
    Feed.emit();                                   // repaint the watchlist / chart / trade page
    const now = Date.now();
    if (now - tvSavedAt >= 1000) { tvSavedAt = now; Session.save(); }
  }, 200);
}

// Copy one merged TradingView quote (v = its values object) into Q[sym].
function tvApplyQuote(sym, v) {
  const m = MAP[sym], q = Q[sym], r = x => +x.toFixed(m.digits);
  let lp = num(v.lp), bid = num(v.bid), ask = num(v.ask);
  if (lp !== null && lp <= 0) lp = null;                                       // a price of 0 / negative is "no price"
  if (bid !== null && bid <= 0) bid = null;
  if (ask !== null && ask <= 0) ask = null;
  if (bid === null && ask === null && lp === null) return;                     // nothing usable yet
  if (bid === null) bid = lp !== null ? lp : ask;                              // some symbols send "lp" only
  if (ask === null) ask = (lp !== null ? lp : bid) + m.spread * m.point;       // fall back to the configured spread
  bid = r(bid); ask = r(Math.max(ask, bid));
  const first = !q.live;                                                       // first REAL tick (replacing the seed)?
  if (!first && bid !== q.bid) q.dir = bid > q.bid ? 1 : -1;                   // direction, for price colours
  q.bid = bid; q.ask = ask;
  q.spread = Math.round((ask - bid) / m.point);                                // live spread, in points
  // Day reference: TradingView's open_price if sent, else open = last - change.
  const open = num(v.open_price), ch = num(v.ch), chp = num(v.chp);
  if (open !== null) q.open = r(open);
  else if (ch !== null && lp !== null) q.open = r(lp - ch);
  else if (first) q.open = bid;
  if (ch !== null) q.ch = ch;
  if (chp !== null) q.chp = chp;
  // Day range: TradingView's high/low when sent, otherwise tracked from live prices.
  const hi = num(v.high_price), lo = num(v.low_price);
  q.hi = hi !== null ? r(Math.max(hi, ask)) : (first ? ask : Math.max(q.hi, ask));
  q.lo = lo !== null ? r(Math.min(lo, bid)) : (first ? bid : Math.min(q.lo, bid));
  const t = num(v.lp_time);                                                    // exchange tick time, when sent
  q.time = t !== null && t > 0 ? new Date(t * 1000) : new Date();
  q.live = true;
  tvScheduleEmit();
}

function tvHandleQuote(params) {
  if (!Array.isArray(params) || !params[1]) return;
  const quote = params[1], sym = TV2SYM[quote.n];
  if (!sym || quote.s !== 'ok') return;                                        // unknown symbol / error status
  TV.latest[quote.n] = { ...(TV.latest[quote.n] || {}), ...(quote.v || {}) };  // merge partial updates
  tvApplyQuote(sym, TV.latest[quote.n]);
}
function tvHandleMessage(raw) {
  TV.buffer += String(raw);
  for (const payload of tvTakeFrames()) {
    if (payload.startsWith('~h~')) {                                           // heartbeat: echo it back
      if (TV.ws && TV.ws.readyState === WebSocket.OPEN) TV.ws.send(tvFrame(payload));
      continue;
    }
    let data;
    try { data = JSON.parse(payload); } catch { continue; }
    if (data && data.m === 'qsd') tvHandleQuote(data.p);
  }
}
function tvReconnect() {
  Feed.status = 'closed';
  setTimeout(tvConnect, TV.retryMs);
  TV.retryMs = Math.min(TV.retryMs * 2, 30000);                                 // back off: 1s, 2s, 4s ... 30s max
}
function tvConnect() {
  if (TV.ws && (TV.ws.readyState === WebSocket.OPEN || TV.ws.readyState === WebSocket.CONNECTING)) return;
  Feed.status = 'connecting';
  TV.session = tvSession('qs_');
  let ws;
  try { ws = TV.ws = new WebSocket(TV.URL); } catch { tvReconnect(); return; }
  ws.addEventListener('open', () => {
    TV.retryMs = 1000; Feed.status = 'live';
    tvSend('set_auth_token', ['unauthorized_user_token']);                     // anonymous (public) access
    tvSend('quote_create_session', [TV.session]);
    tvSend('quote_set_fields', [TV.session, ...TV.FIELDS]);
    tvSend('quote_add_symbols', [TV.session, ...MARKET.map(m => m.tv)]);       // subscribe to the whole watchlist universe
    if (!State.journal.length || State.journal[0].msg !== 'Connected to TradingView live feed')
      log('Connected to TradingView live feed');
  });
  ws.addEventListener('message', e => tvHandleMessage(e.data));
  ws.addEventListener('error', () => { try { ws.close(); } catch { /* already closed */ } });
  ws.addEventListener('close', () => {
    if (TV.ws !== ws) return;                                                  // an older socket: ignore it
    TV.ws = null; TV.buffer = '';
    tvReconnect();
  });
}
tvConnect();   // start the live feed on every page (each page is a separate html file)


/* ---------------------------------------------------------------------
   2e) SESSION  (NEW - keeps State alive when moving between html pages)
   ---------------------------------------------------------------------
   Store (above)   = localStorage   -> survives closing the browser.
   Session (here)  = sessionStorage -> lives only in THIS browser tab,
                     exactly like the original app whose data lived in
                     memory until you closed the tab.

   What is saved: the account (balance, positions, history), the watchlist,
   the chart choice, the journal, the unread badge, ticket counter, the
   History tab, and the live quotes (so prices don't jump when a new page
   loads).

   Dates: JSON cannot store Date objects, so each Date is saved as
   { "$date": milliseconds } and turned back into a real Date on load.

   Fallback: if sessionStorage is blocked, the same text is kept in
   window.name, which the browser also keeps across pages in one tab.
   --------------------------------------------------------------------- */
const Session = {
  KEY: 'kt_session',              // sessionStorage key
  NAME_PREFIX: 'KT_SESSION:',     // marker so we never read somebody else's window.name

  // --- low level: read / write the saved text ---
  read() {
    try { const raw = sessionStorage.getItem(this.KEY); if (raw !== null) return raw; } catch { /* blocked */ }
    if (typeof window.name === 'string' && window.name.startsWith(this.NAME_PREFIX)) return window.name.slice(this.NAME_PREFIX.length);
    return null;
  },
  write(text) {
    try { sessionStorage.setItem(this.KEY, text); return; } catch { /* blocked, use fallback */ }
    window.name = this.NAME_PREFIX + text;
  },

  // --- JSON with Date support ---
  encode(obj) {
    // "this[k]" is the ORIGINAL value (a Date), before JSON turned it into a string
    return JSON.stringify(obj, function (k, v) { return this[k] instanceof Date ? { $date: this[k].getTime() } : v; });
  },
  decode(text) {
    return JSON.parse(text, (k, v) => (v && typeof v === 'object' && '$date' in v) ? new Date(v.$date) : v);
  },

  // --- save: copy the important parts of State (and the quotes) into storage ---
  save() {
    try {
      this.write(this.encode({
        account: State.account, watchlist: State.watchlist, chart: State.chart, journal: State.journal,
        unread: State.unread, nextId: State.nextId, histTab: State.histTab, consent: State.consent,
        pendingToast: State.pendingToast, quotes: Q
      }));
    } catch { /* never let saving break the app */ }
  },

  // --- load: put saved values back into State and Q. Returns true if something was restored ---
  load() {
    const raw = this.read();
    if (!raw) return false;                                   // first page of a new session
    let s;
    try { s = this.decode(raw); } catch { return false; }     // damaged data: start fresh
    if (!s || typeof s !== 'object') return false;
    State.account   = s.account || null;
    State.watchlist = Array.isArray(s.watchlist) ? s.watchlist : State.watchlist;
    State.chart     = s.chart || State.chart;
    State.journal   = Array.isArray(s.journal) ? s.journal : State.journal;
    State.unread    = typeof s.unread === 'number' ? s.unread : State.unread;
    State.nextId    = s.nextId || State.nextId;
    State.histTab   = s.histTab || State.histTab;
    State.consent   = !!s.consent;
    State.pendingToast = s.pendingToast || null;
    // restore the live quotes so prices continue instead of resetting
    Object.keys(s.quotes || {}).forEach(sym => { if (Q[sym]) Object.assign(Q[sym], s.quotes[sym]); });
    return true;
  }
};

// Runs once per page load: bring back the data saved by the previous page.
// If there was nothing saved, this is a brand-new session, so write the first journal line
// (the original app wrote "Terminal started" once when it started).
if (!Session.load()) log('Terminal started');

// Safety nets: save whenever the page is being left (link click, back button, reload, tab close).
window.addEventListener('pagehide', () => Session.save());
// If the browser restores this page from its back/forward cache, our in-memory State is stale
// (another page may have changed the saved data), so reload to read the fresh copy.
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });


/* ---------------------------------------------------------------------
   2f) TRADING MATHS (simplified for a demo: leverage 1:100, USD account)
   --------------------------------------------------------------------- */
const profitOf = p => {
  const m = MAP[p.sym], q = Q[p.sym];
  const closePx = p.side === 'buy' ? q.bid : q.ask;           // buys close at bid, sells at ask
  const diff = p.side === 'buy' ? closePx - p.price : p.price - closePx;
  const raw = diff * p.vol * m.contract;
  return m.usdBase ? raw / q.bid : raw;                       // convert to USD for USD-base pairs
};
const marginOf = p => {
  const m = MAP[p.sym], q = Q[p.sym];
  return (m.usdBase ? p.vol * m.contract : p.vol * m.contract * q.bid) / 100;
};
function totals() {
  const a = State.account;
  const profit = a.positions.reduce((s, p) => s + profitOf(p), 0);
  const margin = a.positions.reduce((s, p) => s + marginOf(p), 0);
  const equity = a.balance + profit;
  return { profit, margin, equity, free: equity - margin };
}


/* =====================================================================
   3) THEME  (light / dark / system)
   ===================================================================== */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const mode = State.settings.theme;                          // 'dark' | 'light' | 'system'
  const dark = mode === 'system' ? mq.matches : mode === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'; // CSS variables react to this
  $('meta[name=theme-color]').content = dark ? '#000000' : '#ffffff'; // colours the phone's browser bar
}
mq.addEventListener('change', () => { if (State.settings.theme === 'system') applyTheme(); });
const saveSettings = () => Store.set('settings', State.settings);
applyTheme(); // run immediately so there is no flash of the wrong theme


/* =====================================================================
   4) UI HELPERS: toast, bottom sheet, dialog, drawer
   ===================================================================== */
const UI = {
  live: null,   // optional function run on every price tick while a sheet is open

  TOAST_MS: 2200,   // how long a toast stays visible
  // ms = how long to show it. Normally the default; only App.start() passes a shorter time
  // when it re-shows a toast that was already on screen for a while on the previous page.
  toast(msg, ms = UI.TOAST_MS) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    UI._msg = msg; UI._at = Date.now() - (UI.TOAST_MS - ms);  // NEW: remember it (and when it began) so go() can carry it to the next page
    clearTimeout(UI._t); UI._t = setTimeout(() => t.classList.remove('show'), ms);
  },
  // Bottom sheet (menus, order ticket)
  sheet(html) {
    const o = $('#overlay');
    o.innerHTML = `<div class="scrim" data-action="closeOverlay"></div><div class="sheet">${html}</div>`;
    o.classList.add('open');
  },
  // Centered dialog. dismiss:false means tapping outside does nothing.
  modal(html, dismiss = true) {
    const o = $('#overlay');
    o.innerHTML = `<div class="scrim" ${dismiss ? 'data-action="closeOverlay"' : ''}></div><div class="modal">${html}</div>`;
    o.classList.add('open');
  },
  close() { const o = $('#overlay'); o.classList.remove('open'); o.innerHTML = ''; UI.live = null; }
};

// The side menu. The list of entries below links to the other pages.
const Drawer = {
  open() {
    const a = State.account;
    $('#drawer').innerHTML = `
      <div class="scrim" data-action="closeDrawer"></div>
      <div class="panel">
        <div class="d-head">
          <div class="d-user">
            <div class="logo">${icon('mountain', 34)}</div>
            <div>
              <div class="d-name">${a ? a.name : 'Kilele Trader'}</div>
              <small class="muted">${a ? a.login + ' - ' + a.server : 'No account connected'}</small>
            </div>
          </div>
          <button class="link d-manage" data-action="go" data-to="login">Manage accounts</button>
          ${a && a.demo ? '<div class="ribbon">Demo</div>' : ''}
        </div>
        ${[
          // [page id, label, icon name, optional red badge number]
          ['trade','Trade','trade'], ['news','News','news'], ['messages','Mailbox','mail', State.unread],
          ['journal','Journal','journal'], ['settings','Settings','settings'],
          ['calendar','Economic calendar','calendar'], ['community','Traders Community','community'],
          ['challenges','My Challenges','trophy'], ['help','User guide','help'], ['about','About','info']
        ].map(([to, label, ic, badge]) => `
          <button class="d-item" data-action="go" data-to="${to}">
            ${icon(ic, 26, 1.7)} ${label}
            ${badge ? `<span class="badge">${badge}</span>` : ''}
          </button>`).join('')}
      </div>`;
    requestAnimationFrame(() => $('#drawer').classList.add('open')); // next frame so the slide animates
  },
  close() { $('#drawer').classList.remove('open'); }
};


/* =====================================================================
   5) PRICE RENDERING HELPERS
   ===================================================================== */
// 1.11990 -> small "1.11", big "99", tiny raised "0"  (like pro terminals)
function pxHTML(v, d) {
  const s = v.toFixed(d);
  if (d < 3) return `<span class="pre">${s.slice(0, -2)}</span><span class="big">${s.slice(-2)}</span>`;
  return `<span class="pre">${s.slice(0, -3)}</span><span class="big">${s.slice(-3, -1)}</span><sup>${s.slice(-1)}</sup>`;
}


/* =====================================================================
   6) ACCOUNT GATING
   Some pages (Quotes, Charts, Trade, History) need a logged-in account.
   ===================================================================== */

// Shown by pages that need a logged-in account
const emptyAccount = () => `
  <div class="empty">
    <div class="circle-plus">${icon('plus', 40, 1.6)}</div>
    <p>No trading accounts to show</p>
    <button class="btn plain" data-action="go" data-to="login">Add Trading Account</button>
  </div>`;

// Wrap a page so it shows emptyAccount() until the user logs in.
// Usage in a page file:   App.start(gated(PAGE));
function gated(p) {
  return { ...p,
    render: () => State.account ? p.render() : emptyAccount(),
    mount:  r  => { if (State.account && p.mount) p.mount(r); },
    unmount: () => { if (p.unmount) p.unmount(); }
  };
}
