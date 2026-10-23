'use strict';

/* =====================================================================
   KILELE TRADER  -  SHELL  (shared/shell.js)
   =====================================================================
   Loaded by EVERY page, SECOND (after core.js, before the page's own js).

   The "shell" is the frame around every page: top bar, bottom nav,
   side drawer, order ticket. This file builds and controls it.

   Sections:
     1) ACTIONS          what happens when you tap something (shared ones)
     2) ORDER TICKET     the "New order" bottom sheet (used by 3 pages)
     3) CLICK LISTENERS  one listener for the whole page
     4) HEADER + NAV     built from each page's description
     5) NAVIGATION       go(), renderRoute(), App.start()
     6) CONSENT DIALOG   first-run "Accept" popup

   HOW A PAGE USES THIS FILE
   -------------------------
   Every page file (pages/xxx/xxx.js) does three things:
     a) describes itself as a PAGE object { id, parent, nav, header(), render(), mount(), unmount() }
     b) adds its own tap-handlers:      Object.assign(Actions, { ... })
     c) starts:                         App.start(PAGE)     (or App.start(gated(PAGE)))

   ORIGINAL vs NOW (routing)
   -------------------------
   Original: a "router" listened to the URL hash (#/quotes) and swapped
             pages inside one html file.
   Now:      each page is its own html file, so "going to a page" simply means
             opening that file. go('quotes') -> pages/quotes/quotes.html
             The hashchange router is gone; renderRoute() is kept because pages
             still need a way to REDRAW THEMSELVES after data changes.
   ===================================================================== */

let current = null;   // the PAGE object of the page being shown right now (set by App.start)


/* =====================================================================
   1) ACTIONS  (what happens when you tap something)
   Any element with data-action="foo" calls Actions.foo(element, event).
   Extra info travels in data- attributes (data-to, data-sym, data-id...).

   Only actions used by SEVERAL pages live here. Page-only actions are
   added by that page's own js (e.g. addSymbol is in quotes.js).
   ===================================================================== */
const Actions = {
  // ---- navigation ----
  go(el)         { Drawer.close(); go(el.dataset.to); },                       // <button data-action="go" data-to="settings">
  back()         { go(current.parent || 'quotes'); },                           // the arrow in the header: go to this page's "parent"
  openDrawer()   { Drawer.open(); },
  closeDrawer()  { Drawer.close(); },
  closeOverlay() { UI.close(); },                                               // closes any sheet / dialog
  toast(el)      { UI.toast(el.dataset.msg); },                                 // show data-msg in the toast

  // ---- used by Quotes, Charts and Trade ----
  chartFor(el)   { UI.close(); State.chart.sym = el.dataset.sym; go('charts'); },

  // ---- the order ticket (opened from Quotes, Charts and Trade) ----
  newOrder() { openOrder(); },
  vol(el) {                                                                      // the − / + buttons next to the volume box
    const input = $('#o-vol'), v = Math.max(0.01, Math.min(100, (parseFloat(input.value) || 0.01) + parseFloat(el.dataset.d)));
    UI.order.vol = v; input.value = v.toFixed(2);
  },
  placeOrder(el) {                                                               // the SELL / BUY buttons
    const a = State.account, o = UI.order, m = MAP[o.sym], q = Q[o.sym];
    const vol = Math.max(0.01, parseFloat($('#o-vol').value) || 0.01);
    // a "position" = one open trade. buys fill at the ask price, sells at the bid price.
    const p = { id: State.nextId++, sym: o.sym, side: el.dataset.side, vol, price: el.dataset.side === 'buy' ? q.ask : q.bid, time: new Date() };
    if (marginOf(p) > totals().free) return UI.toast('Not enough free margin');
    a.positions.push(p); a.orders.push(p);
    a.deals.push({ type: 'trade', sym: p.sym, side: p.side, dir: 'in', vol, price: p.price, time: p.time, profit: 0 });
    log(`'${a.login}': market ${p.side} ${vol.toFixed(2)} ${p.sym} at ${p.price.toFixed(m.digits)}`);
    UI.close(); UI.toast(`Order #${p.id} executed`);
    renderRoute();                                                               // redraw the current page so it shows the new data
  },

  // ---- first-run consent dialog ----
  accept()  { Store.set('consent', true); State.consent = true; Session.save(); UI.close(); },
  decline() { UI.toast('You need to accept to use the app'); }
};


/* =====================================================================
   2) ORDER TICKET (bottom sheet)
   ===================================================================== */
// Builds the HTML of the ticket for the symbol stored in UI.order
function orderHTML() {
  const o = UI.order, m = MAP[o.sym], q = Q[o.sym];
  return `
    <h3>New order</h3>
    <div class="o-row"><span class="muted">Symbol</span>
      <select id="o-sym" data-change="orderSymbol">${MARKET.map(x => `<option ${x.sym === o.sym ? 'selected' : ''}>${x.sym}</option>`).join('')}</select></div>
    <div class="o-row"><span class="muted">Volume (lots)</span>
      <div class="stepper"><button data-action="vol" data-d="-0.01">−</button><input id="o-vol" inputmode="decimal" value="${o.vol.toFixed(2)}"><button data-action="vol" data-d="0.01">+</button></div></div>
    <div class="trade-btns">
      <button class="tb sell" data-action="placeOrder" data-side="sell"><small>SELL</small><span id="o-bid">${q.bid.toFixed(m.digits)}</span></button>
      <button class="tb buy"  data-action="placeOrder" data-side="buy"><small>BUY</small><span id="o-ask">${q.ask.toFixed(m.digits)}</span></button>
    </div>`;
}
// Opens the ticket. Needs a logged-in account, otherwise sends the user to the login page.
function openOrder(sym) {
  if (!State.account) { UI.toast('Add a trading account first'); return go('login'); }
  UI.order = { sym: sym || State.chart.sym, vol: 0.10 };
  UI.sheet(orderHTML());
  UI.live = () => {                     // keep the buy/sell prices live while the sheet is open
    const m = MAP[UI.order.sym], q = Q[UI.order.sym];
    const b = $('#o-bid'), a = $('#o-ask');
    if (b) b.textContent = q.bid.toFixed(m.digits);
    if (a) a.textContent = q.ask.toFixed(m.digits);
  };
}
Feed.on(() => UI.live && UI.live());    // run the sheet's live function on every tick


/* =====================================================================
   3) CLICK LISTENERS
   ===================================================================== */
// ONE click listener for the whole page (event delegation).
// closest() walks up from the tapped element to find the nearest data-action.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && Actions[el.dataset.action]) Actions[el.dataset.action](el, e);
});
// Inputs that use data-change (e.g. the symbol dropdown in the order sheet)
document.addEventListener('change', e => {
  if (e.target.dataset.change === 'orderSymbol') {
    UI.order.vol = parseFloat($('#o-vol').value) || UI.order.vol;
    UI.order.sym = e.target.value;
    $('#overlay .sheet').innerHTML = orderHTML();      // redraw the ticket for the new symbol
  }
});


/* =====================================================================
   4) HEADER + NAV
   The empty <header id="hdr"> and <nav id="nav"> are in every html file.
   These functions fill them in.
   ===================================================================== */

// Top bar: built from the page's header() description
function renderHeader(page) {
  const h = page.header();
  $('#hdr').innerHTML = `
    <button class="hbtn" data-action="${h.left === 'back' ? 'back' : 'openDrawer'}" aria-label="${h.left === 'back' ? 'Back' : 'Menu'}">${icon(h.left === 'back' ? 'back' : 'menu')}</button>
    <div class="title ${h.sub ? 'two' : ''}">${h.sub ? `<small>${h.title}</small><span>${h.sub}</span>` : h.title}</div>
    <div class="actions">${(h.actions || []).map(a => a.text
      ? `<button class="hbtn txt" data-action="${a.action}">${a.text}</button>`
      : `<button class="hbtn" data-action="${a.action}" ${a.msg ? `data-msg="${a.msg}"` : ''} aria-label="${a.label || ''}">${icon(a.icon)}</button>`).join('')}</div>`;
}

// Bottom navigation (hidden on sub-pages like Settings)
function renderNav() {
  const nav = $('#nav');
  nav.style.display = current.nav ? 'flex' : 'none';
  const a = State.account;
  nav.innerHTML = [
    // [page id, label, icon]   (the Trade tab shows the balance as a small pill once logged in)
    ['quotes', 'Quotes', 'quotes'], ['charts', 'Charts', 'charts'],
    ['trade', a ? `<span class="pill">${compact(a.balance)}</span>` : 'Trade', 'trade'],
    ['history', 'History', 'history'], ['messages', 'Messages', 'messages']
  ].map(([id, label, ic]) => `
    <button class="nav-item ${current.id === id ? 'active' : ''}" data-action="go" data-to="${id}">${icon(ic, 26, 1.8)}<span>${label}</span></button>`).join('');
}


/* =====================================================================
   5) NAVIGATION
   ===================================================================== */

// Where a page lives. All pages are siblings: pages/<id>/<id>.html
// so from any page the address of another one is ../<id>/<id>.html
const pageUrl = id => `../${id}/${id}.html`;

// Draw (or REDRAW) the current page. Called at startup and whenever a page's data changes.
function renderRoute() {
  if (current.unmount) current.unmount();                              // let the page clean up (timers, subscriptions)
  renderHeader(current);                                               // top bar
  const main = $('#main');
  if (current.render) main.innerHTML = current.render();               // 1) draw the HTML (pages with a static html body have no render())
  if (current.mount) current.mount(main);                              // 2) then start timers / subscriptions
  renderNav();                                                         // bottom bar (balance pill may have changed)
}

// go('settings') -> opens pages/settings/settings.html
// Going to the page you are already on just redraws it (same as the original).
function go(id) {
  if (current && current.id === id) return renderRoute();
  // If a toast is still visible, carry it to the next page so the user still sees it
  // (e.g. "Connected to Kilele-Demo" is shown at the same moment we leave the login page).
  // We also pass how many milliseconds it still has left, so it disappears at the same moment as before.
  const left = UI.TOAST_MS - (Date.now() - UI._at);
  if (UI._msg && left > 0) State.pendingToast = { msg: UI._msg, left };
  Session.save();                                                      // save the data for the next page
  location.href = pageUrl(id);                                         // the browser loads the other html file
}

// The one function every page calls last. Starts the page.
const App = {
  start(page) {
    current = page;
    hydrateIcons();                       // turn <i data-icon="..."> tags in the html into real SVGs
    renderRoute();                        // draw header, content and nav
    maybeWelcome();                       // first-run consent dialog (only if not accepted yet)
    if (State.pendingToast) {             // a toast sent to us by the previous page?
      UI.toast(State.pendingToast.msg, State.pendingToast.left);   // show it for the time it had left
      State.pendingToast = null;
    }
  }
};


/* =====================================================================
   6) FIRST RUN CONSENT DIALOG
   Shown on whatever page the user opens first, until they press Accept.
   "Accepted" is remembered long-term (localStorage) and for this tab.
   ===================================================================== */
function maybeWelcome() {
  if (Store.get('consent', false) || State.consent) return;
  UI.modal(`
    <h3>Welcome to Kilele Trader!</h3>
    <p>To operate and provide services through the application, we ask for your consent to collect certain data, such as app performance information and device identifiers, as described in the Privacy Policy. <b>(EDIT with your real legal text)</b></p>
    <p><b>By pressing ACCEPT you agree to the Terms and the Privacy Policy.</b></p>
    <div class="btns"><button class="btn" data-action="accept">Accept</button><button class="btn out" data-action="decline">Decline</button></div>
    <p class="muted fine-print">Demo accounts use simulated money. To trade real money you need a separate agreement with a financial services company.</p>`, false);
}
